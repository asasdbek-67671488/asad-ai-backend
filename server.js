
const express = require("express");
const cors = require("cors");
const multer = require("multer");

const app = express();
const PORT = process.env.PORT || 3000;

app.disable("x-powered-by");
app.use(cors());
app.use(express.json({ limit: "20mb" }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 10 }
});

const MODELS = [
  { id: "asad5", name: "Asad AI 5.0 Generator", env: "SORA2_PRO" },
  { id: "seedance25", name: "Seedance 2.5 Fast", env: "SEEDANCE25" },
  { id: "seedance20fast", name: "Seedance 2.0 Fast", env: "SEEDANCE_FAST" },
  { id: "seedance20", name: "Seedance 2.0", env: "SEEDANCE" },
  { id: "omni11", name: "Omni Flash 1.1", env: "OMNI_FLASH" },
  { id: "veo31fast", name: "Veo 3.1 Fast", env: "VEO_FAST" },
  { id: "veo31", name: "Veo 3.1", env: "VEO" },
  { id: "sora3", name: "Sora 3 Beta", env: "OMNI_FLASH" }
];

app.get("/", (req, res) => {
  res.json({ name: "AsadAI Backend", status: "running" });
});

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/api/models", (req, res) => {
  res.json({
    models: MODELS.map(model => ({
      id: model.id,
      name: model.name,
      enabled: Boolean(
        process.env[`${model.env}_URL`] &&
        process.env[`${model.env}_KEY`] &&
        process.env[`${model.env}_MODEL`]
      )
    }))
  });
});


      if (selected.id !== "asad5") {
        return res.status(503).json({
          error: "Эта модель пока не подключена"
        });
      }

      const apiKey = process.env.TIKDEK_API_KEY;

      if (!apiKey) {
        return res.status(503).json({
          error: "Не задан TIKDEK_API_KEY в Render"
        });
      }

      const modelId = "video:sora2-pro-text-to-video";

      const upstream = await fetch(
        "https://tikdek.com/api/ai-studio/execute",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            modelId,
            isPublic: false,
            payload: {
              model: modelId,
              input: {
                prompt: prompt.trim()
              }
            }
          })
        }
      );

      const raw = await upstream.text();
      let data;

      try {
        data = JSON.parse(raw);
      } catch {
        console.error("Tikdek returned non-JSON:", raw.slice(0, 300));
        return res.status(502).json({
          error: "Tikdek вернул не JSON",
          httpStatus: upstream.status
        });
      }

      if (!upstream.ok || data.success === false) {
        console.error("Tikdek API error:", data);
        return res.status(502).json({
          error: data.error || "Tikdek отклонил запрос"
        });
      }

      return res.json({
        ok: true,
        status: data.data?.state || "queued",
        taskId: data.data?.taskId,
        generationId: data.data?.generationId,
        message: "Задача отправлена в Tikdek"
      });



app.use((err, req, res, next) => {
  console.error("Request error:", err.message);
  res.status(err.status || 500).json({
    error: err.message || "Ошибка обработки запроса"
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`AsadAI backend listening on port ${PORT}`);
});

