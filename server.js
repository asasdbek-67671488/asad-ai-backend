const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.disable("x-powered-by");

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN
    ? process.env.FRONTEND_ORIGIN.split(",").map(x => x.trim())
    : true,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json({ limit: "10mb" }));

const MODELS = [
  {
    id: "asad-ai-5-generator",
    name: "AsadAI 5.0 Generator",
    providerModelId: "tikdek-sora-2-pro",
    enabled: false,
    modes: [
      "text-to-video",
      "image-to-video",
      "video-to-video"
    ]
  }
];

app.get("/", (req, res) => {
  res.json({
    name: "AsadAI Backend",
    status: "running",
    endpoints: [
      "/health",
      "/api/models",
      "/api/generate"
    ]
  });
});

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "asad-ai-backend"
  });
});

app.get("/api/models", (req, res) => {
  res.json({
    models: MODELS.map(model => ({
      id: model.id,
      name: model.name,
      enabled: model.enabled,
      modes: model.modes
    }))
  });
});

app.post("/api/generate", async (req, res) => {
  const { model, prompt, mode } = req.body || {};

  if (
    typeof model !== "string" ||
    typeof prompt !== "string" ||
    !prompt.trim()
  ) {
    return res.status(400).json({
      error: "Укажи model и непустой prompt."
    });
  }

  const selected = MODELS.find(item => item.id === model);

  if (!selected) {
    return res.status(400).json({
      error: "Неизвестная модель."
    });
  }

  const selectedMode = mode || "text-to-video";

  if (!selected.modes.includes(selectedMode)) {
    return res.status(400).json({
      error: "Этот режим не поддерживается выбранной моделью."
    });
  }

  if (!selected.enabled) {
    return res.status(503).json({
      error: "Генерация пока не подключена.",
      message: "Сначала настрой настоящий API провайдера."
    });
  }

  // Здесь будет запрос к настоящему API генерации.
  // Не вызываем неизвестный URL и не выдумываем формат API.
  return res.status(501).json({
    error: "API-адаптер генерации ещё не настроен."
  });
});

app.use((req, res) => {
  res.status(404).json({
    error: "Endpoint не найден."
  });
});

app.use((err, req, res, next) => {
  console.error("Backend error:", err.message);

  if (res.headersSent) {
    return next(err);
  }

  res.status(500).json({
    error: "Внутренняя ошибка сервера."
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`AsadAI backend started on port ${PORT}`);
});