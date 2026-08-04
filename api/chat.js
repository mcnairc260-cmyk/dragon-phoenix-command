// api/chat.js — Serverless function (runs on Vercel, holds your API key safely)
// The phone NEVER sees the key. It only talks to this endpoint.

export default async function handler(req, res) {
  // Allow your app to call this from anywhere
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Browser sends a preflight "OPTIONS" check first — answer it
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const { messages, system } = req.body || {};

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Missing 'messages' array in request body." });
  }

  // Defensive cap: any caller (not just our own client) could send an
  // unbounded transcript. Keep only the most recent turns so we don't hit
  // Anthropic's "prompt is too long" error, and keep the transcript
  // starting on a user turn as the Messages API expects.
  const MAX_HISTORY_MESSAGES = 20;
  let trimmedMessages = messages;
  if (trimmedMessages.length > MAX_HISTORY_MESSAGES) {
    trimmedMessages = trimmedMessages.slice(-MAX_HISTORY_MESSAGES);
    if (trimmedMessages[0]?.role === "assistant") trimmedMessages = trimmedMessages.slice(1);
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
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: system || "You are a helpful assistant.",
        messages: trimmedMessages
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || "Anthropic API error",
        detail: data
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
