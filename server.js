
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.disable("x-powered-by");
app.use(cors());
app.use(express.json({ limit: "20mb" }));

const MODELS = [
  { id: "asad-ai-5-generator", name: "Asad AI 5.0 Generator", env: "SORA2_PRO" },
  { id: "seedance-2-5-fast", name: "Seedance 2.5 Fast", env: "SEEDANCE_FAST" },
  { id: "seedance-2-0-fast", name: "Seedance 2.0 Fast", env: "SEEDANCE_FAST" },
  { id: "seedance-2-0", name: "Seedance 2.0", env: "SEEDANCE" },
  { id: "omni-flash-1-1", name: "Omni Flash 1.1", env: "OMNI_FLASH" },
  { id: "veo-3-1-fast", name: "Veo 3.1 Fast", env: "VEO_FAST" },
  { id: "veo-3-1", name: "Veo 3.1", env: "VEO" },
  { id: "sora-3-beta", name: "Sora 3 beta", env: "OMNI_FLASH" }
];

app.get("/", (req, res) => {
  res.json({ name: "AsadAI Backend", status: "running" });
});

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/api/models", (req, res) => {
  res.json({
    models: MODELS.map(({ id, name, env }) => ({
      id,
      name,
      enabled: Boolean(
        process.env[`${env}_URL`] &&
        process.env[`${env}_KEY`] &&
        process.env[`${env}_MODEL`]
      )
    }))
  });
});

app.post("/api/generate", async (req, res) => {
  try {
    const { model, prompt, mode = "text-to-video", ...options } = req.body;

    const selected = MODELS.find(item => item.id === model);

    if (!selected) {
      return res.status(400).json({ error: "Unknown model" });
    }

    if (typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({ error: "Enter a prompt" });
    }

    if (!["text-to-video", "image-to-video", "video-to-video"].includes(mode)) {
      return res.status(400).json({ error: "Invalid generation mode" });
    }

    const prefix = selected.env;
    const url = process.env[`${prefix}_URL`];
    const key = process.env[`${prefix}_KEY`];
    const providerModel = process.env[`${prefix}_MODEL`];

    if (!url || !key || !providerModel) {
      return res.status(503).json({
        error: "This model's API has not been configured yet",
        model: selected.id
      });
    }

    // This adapter expects an OpenAI-compatible provider endpoint.
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: providerModel,
        prompt: prompt.trim(),
        mode,
        ...options
      })
    });

    const result = await response.json();

    if (!response.ok) {
      return res.status(502).json({
        error: "The provider rejected the request",
        details: result
      });
    }

    res.json({ ok: true, result });
  } catch (error) {
    console.error("Generation error:", error.message);
    res.status(500).json({ error: "Generation request failed" });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`AsadAI backend listening on port ${PORT}`);
});

