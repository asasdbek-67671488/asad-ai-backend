
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

app.post(
  "/api/generate",
  upload.fields([
    { name: "images", maxCount: 9 },
    { name: "video", maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const { model, prompt, mode, ratio, duration } = req.body;
      const selected = MODELS.find(item => item.id === model);

      if (!selected) {
        return res.status(400).json({ error: "Неизвестная модель" });
      }

      if (!prompt || !prompt.trim()) {
        return res.status(400).json({ error: "Напиши описание видео" });
      }

      const prefix = selected.env;
      const url = process.env[`${prefix}_URL`];
      const key = process.env[`${prefix}_KEY`];
      const providerModel = process.env[`${prefix}_MODEL`];

      if (!url || !key || !providerModel) {
        return res.status(503).json({
          error: `API модели «${selected.name}» ещё не настроен`
        });
      }

      return res.status(501).json({
        error: `Настройки найдены для «${selected.name}», но адаптер API провайдера ещё не реализован. Нужен формат запросов этого API.`,
        model: selected.id,
        mode: mode || "image"
      });
    } catch (error) {
      console.error("Generation error:", error.message);
      return res.status(500).json({
        error: "Ошибка backend"
      });
    }
  }
);

app.use((err, req, res, next) => {
  console.error("Request error:", err.message);
  res.status(err.status || 500).json({
    error: err.message || "Ошибка обработки запроса"
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`AsadAI backend listening on port ${PORT}`);
});

