
const express = require("express");

const app = express();
app.use((req, res, next) => {
  const allowedOrigins = [
    "https://asasdbek-67671488.github.io",
    "https://asad-ai-backend.onrender.com"
  ];

  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.use(express.json({ limit: "20mb" }));

const PORT = process.env.PORT || 3000;

// Все настройки читаются из Render Environment Variables.
const PROVIDERS = {
  sora2pro: {
    url: process.env.SORA2_PRO_URL,
    key: process.env.SORA2_PRO_KEY,
    model: process.env.SORA2_PRO_MODEL,
  },
  seedanceFast: {
    url: process.env.SEEDANCE_FAST_URL,
    key: process.env.SEEDANCE_FAST_KEY,
    model: process.env.SEEDANCE_FAST_MODEL,
  },
  seedance: {
    url: process.env.SEEDANCE_URL,
    key: process.env.SEEDANCE_KEY,
    model: process.env.SEEDANCE_MODEL,
  },
  omniFlash: {
    url: process.env.OMNI_FLASH_URL,
    key: process.env.OMNI_FLASH_KEY,
    model: process.env.OMNI_FLASH_MODEL,
  },
  veoFast: {
    url: process.env.VEO_FAST_URL,
    key: process.env.VEO_FAST_KEY,
    model: process.env.VEO_FAST_MODEL,
  },
  veo: {
    url: process.env.VEO_URL,
    key: process.env.VEO_KEY,
    model: process.env.VEO_MODEL,
  },
};

// Внутренний ID сайта -> настройки провайдера.
const MODELS = {
  asad5: {
    name: "Asad AI 5.0 Generator",
    provider: "sora2pro",
    fallbackModel: "tikdek-sora-2-pro",
  },
  seedance25: {
    name: "Seedance 2.5 Fast",
    provider: "seedanceFast",
  },
  seedance20fast: {
    name: "Seedance 2.0 Fast",
    provider: "seedanceFast",
  },
  seedance20: {
    name: "Seedance 2.0",
    provider: "seedance",
  },
  omni11: {
    name: "Omni Flash 1.1",
    provider: "omniFlash",
  },
  sora3: {
    name: "Sora 3 Beta",
    provider: "omniFlash",
  },
  veo31fast: {
    name: "Veo 3.1 Fast",
    provider: "veoFast",
  },
  veo31: {
    name: "Veo 3.1",
    provider: "veo",
  },
};

function getConfig(modelId) {
  const definition = MODELS[modelId];

  if (!definition) {
    const error = new Error("Unknown model: " + modelId);
    error.status = 400;
    throw error;
  }

  const provider = PROVIDERS[definition.provider];

  if (!provider?.url || !provider?.key) {
    const error = new Error(
      "Provider URL or API key is missing for model: " + modelId
    );
    error.status = 503;
    throw error;
  }

  const model = provider.model || definition.fallbackModel;

  if (!model) {
    const error = new Error(
      "Provider model ID is not configured for: " + modelId
    );
    error.status = 503;
    throw error;
  }

  return { definition, provider, model };
}

// Список моделей для интерфейса.
app.get("/api/models", (req, res) => {
  res.json({
    models: Object.entries(MODELS).map(([id, item]) => {
      const config = PROVIDERS[item.provider];
      const configured = Boolean(
        config?.url &&
        config?.key &&
        (config?.model || item.fallbackModel)
      );

      return {
        id,
        name: item.name,
        enabled: configured,
      };
    }),
  });
});

// Проверка состояния backend без раскрытия API-ключей.
app.get("/health", (req, res) => {
  res.json({ ok: true, service: "Asad AI backend" });
});

// Запуск генерации.
// ВАЖНО: формат тела запроса необходимо согласовать
// с фактической документацией API выбранного провайдера.
app.post("/api/generate", async (req, res) => {
  try {
    const {
      model: modelId,
      prompt,
      duration,
      aspectRatio,
      image,
      video,
    } = req.body || {};

    if (!modelId || typeof modelId !== "string") {
      return res.status(400).json({
        error: "Не выбрана модель.",
      });
    }

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({
        error: "Добавь описание видео.",
      });
    }

    const { provider, model } = getConfig(modelId);

    // Универсальный JSON нельзя считать совместимым
    // со всеми API. Это диагностический шаблон запроса.
    const payload = {
      model,
      prompt,
      duration,
      aspect_ratio: aspectRatio,
      image,
      video,
    };

    const response = await fetch(provider.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${provider.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }

    if (!response.ok) {
      console.error("Provider error:", {
        modelId,
        status: response.status,
        response: data,
      });

      return res.status(502).json({
        error: "Провайдер отклонил запрос генерации.",
        providerStatus: response.status,
        details: data,
      });
    }

    return res.json({
      ok: true,
      model: modelId,
      result: data,
    });
  } catch (error) {
    console.error("Generation error:", error.message);

    return res.status(error.status || 500).json({
      error: error.message || "Ошибка генерации.",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Asad AI backend listening on port ${PORT}`);
});

