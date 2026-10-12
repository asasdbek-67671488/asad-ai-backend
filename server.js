const express = require("express");
const multer = require("multer");

const app = express();

// ВСТАВЬ CORS-КОД ЗДЕСЬ
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "https://asasdbek-67671488.github.io");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Telegram-Init-Data");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

// Дальше остальной код сервера

const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json());

const PORT = process.env.PORT || 10000;
const API_KEY = process.env.SORA2_PRO_KEY;
const API_URL = "https://tikdek.com/api/ai-studio";

app.get("/", (req, res) => {
  res.json({ status: "ok", service: "Asad AI Backend" });
});

app.post(
  "/api/generate",
  upload.fields([
    { name: "images", maxCount: 10 },
    { name: "video", maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      if (!API_KEY) {
        return res.status(500).json({
          error: "TIKDEK_API_KEY is missing in Render environment"
        });
      }

      const { model, mode, prompt, ratio, duration } = req.body;

      const modelId = process.env["TIKDEK_MODEL_" + String(model).toUpperCase()];

      if (!modelId) {
        return res.status(400).json({
          error: `Tikdek model ID is not configured for: ${model}`
        });
      }

      const payload = {
        prompt: prompt || "",
        aspectRatio: ratio || "9:16"
      };

      if (duration) payload.duration = Number(duration);

      const images = req.files?.images || [];
      const videos = req.files?.video || [];

      if (images.length || videos.length) {
        return res.status(400).json({
          error: "This model integration needs its documented file-upload format before media can be sent."
        });
      }

      const upstream = await fetch(`${API_URL}/execute`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          modelId,
          isPublic: false,
          payload
        })
      });

      const data = await upstream.json();

      if (!upstream.ok) {
        return res.status(upstream.status).json({
          error: "Tikdek generation request failed",
          details: data
        });
      }

      const taskId = data?.data?.taskId || data?.taskId;

      if (!taskId) {
        return res.status(502).json({
          error: "Tikdek did not return a task ID",
          details: data
        });
      }

      for (let i = 0; i < 60; i++) {
        await new Promise(resolve => setTimeout(resolve, 3000));

        const statusResponse = await fetch(
          `${API_URL}/tasks/${encodeURIComponent(taskId)}?modelId=${encodeURIComponent(modelId)}`,
          {
            headers: {
              Authorization: `Bearer ${API_KEY}`
            }
          }
        );

        const statusData = await statusResponse.json();

        if (!statusResponse.ok) {
          return res.status(502).json({
            error: "Could not check Tikdek task status",
            details: statusData
          });
        }

        const task = statusData?.data || statusData;
        const state = String(task?.state || task?.status || "").toLowerCase();

        const urls =
          task?.mediaUrls ||
          task?.result?.mediaUrls ||
          task?.output?.mediaUrls ||
          [];

        const videoUrl =
          task?.videoUrl ||
          task?.result?.videoUrl ||
          task?.output?.videoUrl ||
          (Array.isArray(urls) ? urls[0] : null);

        if (videoUrl) {
          return res.json({ videoUrl, taskId });
        }

        if (["failed", "error", "cancelled", "canceled"].includes(state)) {
          return res.status(502).json({
            error: "Tikdek generation failed",
            details: task
          });
        }
      }

      return res.status(202).json({
        taskId,
        status: "processing",
        message: "Generation is still processing; check task status again."
      });
    } catch (error) {
      console.error("Generation error:", error);
      return res.status(500).json({
        error: error.message || "Internal server error"
      });
    }
  }
);

app.listen(PORT, () => {
  console.log(`Asad AI backend listening on port ${PORT}`);
});
