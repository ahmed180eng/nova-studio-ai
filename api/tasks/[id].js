const RUNWAY_VERSION = "2024-11-06";
const API_BASE = "https://api.dev.runwayml.com";

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "x-nova-access-code");
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const accessCode = process.env.NOVA_ACCESS_CODE;
  const apiKey = process.env.RUNWAYML_API_SECRET;
  if (!apiKey || !accessCode) {
    return res.status(503).json({ error: "خادم التوليد غير مكتمل الإعداد." });
  }
  if (req.headers["x-nova-access-code"] !== accessCode) {
    return res.status(401).json({ error: "رمز الوصول غير صحيح." });
  }

  const id = String(req.query.id || "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return res.status(400).json({ error: "معرّف المهمة غير صحيح." });
  }

  try {
    const upstream = await fetch(`${API_BASE}/v1/tasks/${id}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "X-Runway-Version": RUNWAY_VERSION
      }
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: data.error || "تعذر جلب حالة الفيديو." });
    }
    const output = Array.isArray(data.output) ? data.output[0] : data.output;
    return res.status(200).json({
      taskId: data.id,
      status: data.status,
      videoUrl: typeof output === "string" ? output : null,
      failure: data.failure || data.failureCode || null
    });
  } catch (error) {
    return res.status(502).json({ error: "تعذر الاتصال بخدمة الفيديو." });
  }
}
