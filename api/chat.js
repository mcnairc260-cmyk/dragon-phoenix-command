// api/chat.js — Serverless function (runs on Vercel, holds your API key safely)
// The browser NEVER sees the key, and no longer supplies the system prompt.
// It only sends { messages }; everything else is decided here.

// Model is swappable by design (Constitution Art. IX: capabilities over brand loyalty).
const MODEL = "claude-sonnet-5";

// The DPA Mentor's voice lives server-side (brand doctrine, safe to commit — no PII).
// The founder's personal profile is injected from the MENTOR_PROFILE env var, so it
// stays out of both the page source and this repo. With no env var, the Mentor still
// runs full brand voice — just un-personalized.
const BASE_SYSTEM = `You are the DPA Mentor inside Dragon Phoenix Command, the operating system for Dragon Phoenix Ascension — a cognitive intelligence brand built on one loop: understanding creates awareness, awareness creates better decisions, decisions create consistent action, action creates transformation. You advise the founder of DPA. Your first job is defending focus: fewer projects, smaller next steps, finished things.

Operate by the Seven Laws: clarity before action, systems before willpower, truth before popularity, learning before certainty, progress before perfection, people before technology, build for decades not days.

Voice: a brilliant, calm operator talking to a trusted peer. Precise (mechanisms, not vibes), honest (admit uncertainty, never invent statistics), practical (every answer ends with something to do), respectful. Never a drill sergeant, guru, doomer, or hype account. No false urgency, no empty motivational language, no medical advice — behavioral and mental-health topics get an educational framing only.

You are an amplifier, not a replacement: think with the founder, lay out the mechanism and the options, but the decision stays theirs. End every reply with ONE concrete next action sized for the next 24 hours.`;

function systemPrompt() {
  const profile = (process.env.MENTOR_PROFILE || "").trim();
  return profile
    ? `${BASE_SYSTEM}\n\nAbout the person you're advising: ${profile}`
    : BASE_SYSTEM;
}

// CORS: only this project's own Vercel domains (production + previews), plus any
// origins explicitly allow-listed via ALLOWED_ORIGINS (comma-separated). The live
// site calls /api/chat same-origin, so it is unaffected; this blocks other sites
// from spending the API budget cross-origin.
function allowedOrigin(origin) {
  if (!origin) return null;
  const extra = (process.env.ALLOWED_ORIGINS || "")
    .split(",").map(s => s.trim()).filter(Boolean);
  if (extra.includes(origin)) return origin;
  if (/^https:\/\/dragon-phoenix-command[a-z0-9-]*\.vercel\.app$/.test(origin)) return origin;
  return null;
}

// Basic in-memory rate limit. Best-effort only: per instance, resets on cold start,
// not shared across Vercel instances — a speed bump, not a wall. Durable limiting
// would need Vercel KV / Upstash (a future infra decision, not taken here).
const RL_WINDOW_MS = 60 * 1000;
const RL_MAX = 20;
const hits = new Map(); // ip -> [timestamps]
function rateLimited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter(t => now - t < RL_WINDOW_MS);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (v.every(t => now - t >= RL_WINDOW_MS)) hits.delete(k);
    }
  }
  return arr.length > RL_MAX;
}

const MAX_MESSAGES = 40;
const MAX_CHARS = 24000;

export default async function handler(req, res) {
  const origin = allowedOrigin(req.headers.origin);
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  }

  // Browser sends a preflight "OPTIONS" check first — answer it
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  if (rateLimited(ip)) {
    return res.status(429).json({ error: "Too many requests. Give it a minute." });
  }

  // Note: any client-supplied `system` is intentionally ignored — the prompt is
  // decided server-side (see systemPrompt()).
  const { messages } = req.body || {};

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "Missing 'messages' array in request body." });
  }
  if (messages.length > MAX_MESSAGES) {
    return res.status(400).json({ error: "Conversation too long." });
  }

  let total = 0;
  for (const m of messages) {
    if (!m || (m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string") {
      return res.status(400).json({ error: "Malformed message in 'messages'." });
    }
    total += m.content.length;
  }
  if (total > MAX_CHARS) {
    return res.status(400).json({ error: "Message content too large." });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,   // <- secret, lives only on the server
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system: systemPrompt(),
        messages: messages
      })
    });

    const data = await response.json();

    if (!response.ok) {
      // Don't leak upstream error internals to the client.
      return res.status(response.status).json({
        error: data?.error?.message || "Anthropic API error"
      });
    }

    // Extract just the text and send it back clean
    const reply = (data.content || [])
      .filter(b => b.type === "text")
      .map(b => b.text)
      .join("\n")
      .trim();

    return res.status(200).json({ reply: reply || "No response generated." });

  } catch (err) {
    return res.status(500).json({ error: err.message || "Server error" });
  }
}
