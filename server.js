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
  limits: {
    fileSize: 25 * 1024 * 1024,
    files: 10
  }
});

const MODELS = {
  asad5: null,
  seedance25: "bytedance/seedance-2.0/fast",
  seedance20fast: "bytedance/seedance-2.0/fast",
  seedance20: "bytedance/seedance-2.0",
  omni11: null,
  sora3: null,
  veo31fast: null,
  veo31: null
};

const tasks = new Map();

app.get("/", (req, res) => {
  res.json({ name: "AsadAI Backend", status: "running" });
});

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/api/models", (req, res) => {
  res.json({
    models: Object.entries(MODELS).map(([id, endpoint]) => ({
      id,
      enabled: Boolean(endpoint && process.env.FAL_KEY)
    }))
  });
});

app.post(
  "/api/generate",
  upload.fields([
    { name: "images", maxCount: 9 },
    { name: "video", maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const { model, prompt, mode, ratio, duration } = req.body;
      const base = MODELS[model];

      if (!process.env.FAL_KEY) {
        return res.status(503).json({
          error: "На Render не настроен FAL_KEY"
        });
      }

      if (!base) {
        return res.status(503).json({
          error: "Для этой модели API ещё не подключён",
          model
        });
      }

      if (!prompt || !prompt.trim()) {
        return res.status(400).json({
          error: "Напиши описание видео"
        });
      }

      if (!["image", "video"].includes(mode)) {
        return res.status(400).json({
          error: "Неизвестный режим создания"
        });
      }

      const images = req.files?.images || [];
      const videos = req.files?.video || [];

      if (mode === "image" && !images.length) {
        return res.status(400).json({
          error: "Выбери изображение"
        });
      }

      if (mode === "video") {
        return res.status(400).json({
          error: "Преобразование исходного видео пока не подключено"
        });
      }

      const { fal } = await import("@fal-ai/client");

      fal.config({
        credentials: process.env.FAL_KEY
      });

      const uploaded = [];

      for (const file of images) {
        const imageFile = new File(
          [file.buffer],
          file.originalname,
          { type: file.mimetype }
        );

        uploaded.push(await fal.storage.upload(imageFile));
      }

      const endpoint =
        uploaded.length > 1
          ? `${base}/reference-to-video`
          : `${base}/image-to-video`;

      const input = {
        prompt: prompt.trim(),
        aspect_ratio: ratio || "9:16",
        image_url: uploaded[0]
      };

      if (uploaded.length > 1) {
        delete input.image_url;
        input.image_urls = uploaded;
      }

      input.duration = String(
        Math.min(15, Math.max(4, Number(duration) || 5))
      );
      input.resolution = "720p";
      input.generate_audio = true;

      const submitted = await fal.queue.submit(endpoint, { input });

      tasks.set(submitted.request_id, endpoint);

      return res.json({
        ok: true,
        status: "queued",
        taskId: submitted.request_id
      });
    } catch (error) {
      console.error("Generation error:", error);

      return res.status(500).json({
        error: "Не удалось отправить задачу генерации",
        details: error.message
      });
    }
  }
);

app.get("/api/status/:taskId", async (req, res) => {
  try {
    const endpoint = tasks.get(req.params.taskId);

    if (!endpoint) {
      return res.status(404).json({
        error: "Задача не найдена. Возможно, сервер перезапускался."
      });
    }

    const { fal } = await import("@fal-ai/client");

    fal.config({
      credentials: process.env.FAL_KEY
    });

    const status = await fal.queue.status(endpoint, {
      requestId: req.params.taskId
    });

    if (status.status !== "COMPLETED") {
      return res.json({
        status: status.status.toLowerCase()
      });
    }

    const result = await fal.queue.result(endpoint, {
      requestId: req.params.taskId
    });

    tasks.delete(req.params.taskId);

    return res.json({
      status: "completed",
      videoUrl: result.data.video?.url
    });
  } catch (error) {
    console.error("Status error:", error);

    return res.status(500).json({
      error: "Не удалось проверить результат генерации"
    });
  }
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