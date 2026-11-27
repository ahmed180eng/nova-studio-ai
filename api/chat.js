// Vercel serverless endpoint. Keep OPENAI_API_KEY in project environment variables.
export default async function handler(req, res) {
  const origin = req.headers.origin
  const allowedOrigins = new Set([
    'http://localhost',
    'https://localhost',
    'capacitor://localhost',
    process.env.APP_ORIGIN
  ].filter(Boolean))
  const requestHost = req.headers.host
  const sameOrigin = origin && requestHost && new URL(origin).host === requestHost
  if (origin && (allowedOrigins.has(origin) || sameOrigin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS')
    return res.status(405).json({ error: 'الطريقة غير مدعومة.' })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return res.status(503).json({ error: 'المساعد غير مفعّل بعد. أضف OPENAI_API_KEY إلى إعدادات الخادم.' })
  }

  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : ''
  if (!message) return res.status(400).json({ error: 'اكتب رسالة الأول.' })
  if (message.length > 6000) return res.status(413).json({ error: 'الرسالة طويلة جدًا. اختصرها وحاول تاني.' })

  const history = Array.isArray(req.body?.history) ? req.body.history.slice(-10) : []
  const safeHistory = history
    .filter(item => item && ['user', 'assistant'].includes(item.role) && typeof item.content === 'string')
    .map(item => ({ role: item.role, content: item.content.slice(0, 6000) }))

  try {
    const upstream = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-5.5',
        instructions: 'أنت مساعد NOVA داخل محرر فيديو. تحدث بالعربية المصرية الواضحة ما لم يطلب المستخدم لغة أخرى. ساعد في أفكار الفيديو والسكريبتات والمونتاج والترجمة والعناوين. كن عمليًا ومنظمًا، ولا تدّع تنفيذ تعديل داخل التايم لاين إذا لم تكن الأداة متاحة.',
        input: safeHistory.length ? safeHistory : message,
        max_output_tokens: 1200
      })
    })

    const result = await upstream.json()
    if (!upstream.ok) {
      console.error('OpenAI API error:', upstream.status, result?.error?.code || 'unknown')
      return res.status(502).json({ error: 'خدمة الذكاء الاصطناعي لم ترد بنجاح. راجع إعدادات API والرصيد.' })
    }

    const reply = result.output_text || (result.output || [])
      .flatMap(item => item.content || [])
      .filter(item => item.type === 'output_text')
      .map(item => item.text)
      .join('\n')
    if (!reply) return res.status(502).json({ error: 'وصل رد فارغ من خدمة الذكاء الاصطناعي.' })
    return res.status(200).json({ reply })
  } catch (error) {
    console.error('NOVA assistant request failed:', error?.message || error)
    return res.status(500).json({ error: 'حصل خطأ داخلي أثناء الاتصال بالمساعد.' })
  }
}
