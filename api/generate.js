const RUNWAY_VERSION = "2024-11-06";
const API_BASE = "https://api.dev.runwayml.com";

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-nova-access-code");
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const accessCode = process.env.NOVA_ACCESS_CODE;
  const apiKey = process.env.RUNWAYML_API_SECRET;
  if (!apiKey || !accessCode) {
    return res.status(503).json({
      error: "خادم التوليد لم يكتمل إعداده بعد. أضف RUNWAYML_API_SECRET وNOVA_ACCESS_CODE في إعدادات Vercel."
    });
  }
  if (req.headers["x-nova-access-code"] !== accessCode) {
    return res.status(401).json({ error: "رمز الوصول غير صحيح." });
  }

  const { prompt, style = "3D كرتون", ratio = "9:16", duration = 5, scenes = "مشهد واحد" } = req.body || {};
  if (typeof prompt !== "string" || !prompt.trim() || prompt.trim().length > 850) {
    return res.status(400).json({ error: "اكتب وصفًا للفيديو لا يتجاوز 850 حرفًا." });
  }

  const apiRatio = ratio === "16:9" ? "1280:720" : "720:1280";
  const seconds = Number(duration);
  const safeDuration = [5, 10, 15].includes(seconds) ? seconds : 5;
  const styleGuide = {
    "3D كرتون": "polished 3D animated family-friendly cartoon, expressive characters, detailed cinematic lighting",
    "أنمي": "high-quality Japanese anime-inspired 2D animation, expressive motion, richly painted backgrounds",
    "واقعي سينمائي": "photorealistic cinematic live-action look, natural motion, detailed lighting and camera work",
    "رسوم 2D": "beautiful hand-drawn 2D animation, clean line art, fluid character movement, rich colors"
  }[style] || "cinematic animated video";

  const promptText = `${prompt.trim()}. Visual style: ${styleGuide}. Keep character appearance consistent, use smooth natural motion and clear cinematic composition.`;

  const multiShot = scenes === "عدة لقطات متتابعة";
  const endpoint = multiShot
    ? `${API_BASE}/v1/recipes/multi_shot_video`
    : `${API_BASE}/v1/text_to_video`;
  const payload = multiShot
    ? { version: "2026-06", prompt: promptText, duration: safeDuration, ratio: apiRatio }
    : {
        model: "grok_imagine_1_5_lite",
        promptText,
        ratio: apiRatio,
        duration: Math.min(safeDuration, 10)
      };

  try {
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Runway-Version": RUNWAY_VERSION
      },
      body: JSON.stringify(payload)
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const message = data.error || data.message || "تعذر بدء إنشاء الفيديو من Runway.";
      return res.status(upstream.status).json({ error: message });
    }
    return res.status(200).json({
      taskId: data.id,
      estimatedCost: data.estimatedCost || null,
      note: !multiShot && safeDuration > 10 ? "تم ضبط المدة إلى 10 ثوانٍ لهذا النمط." : null
    });
  } catch (error) {
    return res.status(502).json({ error: "تعذر الاتصال بخدمة توليد الفيديو. حاول مرة أخرى." });
  }
}
