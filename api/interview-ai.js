// api/interview-ai.js — Every model call the Interviews app makes, in one place.
// Zero dependencies: plain fetch against the Anthropic Messages API, same as api/chat.js.
// The key never leaves this function. The interviewer's system prompt is assembled
// HERE from the study the participant is answering, so nothing sensitive is in page source.
//
// ops: guide | turn | summarize | synthesize | ask   (all POST {op, ...})
// Every op uses structured outputs (output_config.format) so the client gets JSON,
// never free text it has to parse.
//
// Env: ANTHROPIC_API_KEY (required), INTERVIEW_MODEL (optional, default claude-opus-5),
//      ANTHROPIC_BASE_URL (optional, for proxies/tests).

const MODEL = process.env.INTERVIEW_MODEL || "claude-opus-5";
const BASE_URL = (process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com").replace(/\/$/, "");

// Bounds — generous for real use, tight enough that an open endpoint can't be abused for free.
const LIMITS = { turnMessages: 160, messageChars: 4000, questions: 25, questionChars: 600, probeChars: 300,
  goalChars: 4000, introChars: 2000, titleChars: 200, responses: 300, corpusChars: 600000, askChars: 2000 };

// ---- schemas (structured outputs) -----------------------------------------

const STR = { type: "string" };
const INT = { type: "integer" };
const BOOL = { type: "boolean" };
const arr = items => ({ type: "array", items });
const obj = (properties, required = Object.keys(properties)) => ({ type: "object", properties, required, additionalProperties: false });

const SCHEMAS = {
  guide: obj({
    title: STR,
    intro: STR,
    interviewer_name: STR,
    questions: arr(obj({ text: STR, why: STR, probes: arr(STR) })),
    closing: STR,
    estimated_minutes: INT
  }),
  turn: obj({
    message: STR,
    question_index: INT,
    done: BOOL
  }),
  summarize: obj({
    headline: STR,
    summary: STR,
    key_points: arr(STR),
    sentiment: { type: "string", enum: ["positive", "neutral", "negative", "mixed"] },
    quotes: arr(obj({ text: STR, about: STR })),
    answers: arr(obj({ question_index: INT, answer: STR })),
    tags: arr(STR)
  }),
  synthesize: obj({
    executive_summary: STR,
    themes: arr(obj({ title: STR, description: STR, response_ids: arr(STR), quotes: arr(obj({ text: STR, response_id: STR })) })),
    sentiment_overview: STR,
    surprises: arr(STR),
    recommendations: arr(STR),
    open_questions: arr(STR)
  }),
  ask: obj({
    answer: STR,
    citations: arr(obj({ response_id: STR, quote: STR })),
    confidence: { type: "string", enum: ["high", "medium", "low"] }
  })
};

// ---- validation ------------------------------------------------------------

const clip = (v, n) => (typeof v === "string" ? v.slice(0, n) : "");
class BadInput extends Error { constructor(m) { super(m); this.status = 400; } }

function cleanStudy(s) {
  if (!s || typeof s !== "object") throw new BadInput("Missing 'study'.");
  const questions = Array.isArray(s.questions) ? s.questions.slice(0, LIMITS.questions).map(q => ({
    text: clip(q && q.text, LIMITS.questionChars),
    probes: Array.isArray(q && q.probes) ? q.probes.slice(0, 5).map(p => clip(p, LIMITS.probeChars)).filter(Boolean) : []
  })).filter(q => q.text) : [];
  const settings = s.settings && typeof s.settings === "object" ? s.settings : {};
  return {
    title: clip(s.title, LIMITS.titleChars) || "Untitled study",
    goal: clip(s.goal, LIMITS.goalChars),
    audience: clip(s.audience, 500),
    intro: clip(s.intro, LIMITS.introChars),
    closing: clip(s.closing, 1000),
    questions,
    settings: {
      interviewerName: clip(settings.interviewerName, 60) || "Alex",
      tone: ["warm", "neutral", "direct"].includes(settings.tone) ? settings.tone : "warm",
      maxFollowUps: Math.min(3, Math.max(0, parseInt(settings.maxFollowUps, 10) || 0)),
      language: clip(settings.language, 40) || "English"
    }
  };
}

function cleanTranscript(t) {
  if (!Array.isArray(t)) throw new BadInput("'transcript' must be an array.");
  if (t.length > LIMITS.turnMessages) throw new BadInput("This conversation is too long to continue.");
  return t.map(m => ({
    role: m && m.role === "assistant" ? "assistant" : "user",
    content: clip(m && m.content, LIMITS.messageChars),
    q: Number.isInteger(m && m.q) ? m.q : null
  })).filter(m => m.content);
}

// ---- the model call --------------------------------------------------------

async function callModel({ system, messages, schema, maxTokens, effort }) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set on the server.");
  const useFallbacks = /^claude-(opus-5|fable)/.test(MODEL);
  const headers = {
    "Content-Type": "application/json",
    "x-api-key": process.env.ANTHROPIC_API_KEY,
    "anthropic-version": "2023-06-01"
  };
  if (useFallbacks) headers["anthropic-beta"] = "server-side-fallback-2026-07-01";
  const payload = {
    model: MODEL,
    max_tokens: maxTokens,
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages,
    output_config: { effort, format: { type: "json_schema", schema } }
  };
  if (useFallbacks) payload.fallbacks = "default";

  const r = await fetch(`${BASE_URL}/v1/messages`, { method: "POST", headers, body: JSON.stringify(payload) });
  const data = await r.json();
  if (!r.ok) {
    const err = new Error(data?.error?.message || "Model API error");
    err.status = r.status; err.detail = data;
    throw err;
  }
  if (data.stop_reason === "refusal") throw new Error("The model declined this request.");
  if (data.stop_reason === "max_tokens") throw new Error("The model's answer was cut off. Try again with a shorter input.");
  const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
  try { return JSON.parse(text); }
  catch { throw new Error("The model returned something that was not valid JSON."); }
}

// ---- prompts ---------------------------------------------------------------

const TONES = {
  warm: "Warm, curious and encouraging. Short acknowledgements before the next question.",
  neutral: "Neutral and professional. Brief, no flattery, no filler.",
  direct: "Direct and efficient. Minimal acknowledgement; move to the next question quickly."
};

function guideSystem() {
  return `You design discussion guides for one-on-one research interviews that an AI moderator will run in a chat.
Write in plain language a participant will understand. Questions must be open, non-leading and answerable in a sentence or two.
Order them from easy and general to specific and sensitive. Each question gets 1-3 optional probes (follow-up angles the moderator can use if the answer is thin).
The intro is what the moderator says first: who this is for, what it is about, roughly how long it takes, and that there are no wrong answers.
The closing is a short thank-you. estimated_minutes is a realistic total for the whole conversation. interviewer_name is a short, friendly first name.`;
}

function interviewerSystem(study) {
  const s = study.settings;
  const guide = study.questions.map((q, i) => `${i}. ${q.text}${q.probes.length ? `\n   probes: ${q.probes.join(" | ")}` : ""}`).join("\n");
  return `You are ${s.interviewerName}, an AI moderator running a one-on-one research interview in a chat. You ask questions on behalf of the researcher; you never pretend to be human if asked.

STUDY: ${study.title}
RESEARCH GOAL: ${study.goal || "(not stated)"}
AUDIENCE: ${study.audience || "(not stated)"}
LANGUAGE: ${s.language}
TONE: ${TONES[s.tone]}

DISCUSSION GUIDE (question_index in brackets):
${guide || "(no questions — ask the participant what they would like to share about the goal, then wrap up)"}

INTRO TO OPEN WITH (paraphrase, keep it short): ${study.intro || "Thanks for taking the time. This is a short conversation, there are no wrong answers, and your honest view is what helps."}
CLOSING (say when done): ${study.closing || "That is everything. Thank you for your time and your honesty."}

RULES
- One question per message. Never stack questions. Keep every message under 60 words.
- Work through the guide in order. Use a probe or a follow-up only when the answer was thin, vague or interesting; at most ${s.maxFollowUps} follow-up(s) per question, then move on.
- Never lead, suggest answers, judge, argue, give advice, or share opinions. Reflect back briefly, then ask.
- If the participant asks who you are: you are an AI moderator asking questions for the researcher; their answers go to the researcher.
- If they go off-topic, acknowledge in a few words and steer back. If they want to stop, thank them and finish.
- Do not ask for passwords, financial details, health details or anything the guide does not need.
- When every question has been covered (or they want to stop), send the closing and set done=true. Otherwise done=false.
- question_index = the index of the guide question your message is asking about (the intro plus first question = 0). When done, use the last index.`;
}

function turnState(transcript, study) {
  const asked = transcript.filter(m => m.role === "assistant");
  const last = asked.length ? asked[asked.length - 1] : null;
  const current = last && last.q != null ? last.q : 0;
  const followUps = last ? asked.filter(m => m.q === current).length - 1 : 0;
  const total = study.questions.length;
  return `[moderator state: ${asked.length === 0 ? "conversation not started — open with the intro and question 0" :
    `current question_index ${current} of ${Math.max(total - 1, 0)}; follow-ups already used on it: ${Math.max(followUps, 0)} of ${study.settings.maxFollowUps}`}]`;
}

function summarizeSystem(study) {
  const guide = study.questions.map((q, i) => `${i}. ${q.text}`).join("\n");
  return `You summarize one research interview transcript for the researcher who designed it.
STUDY: ${study.title}
GOAL: ${study.goal}
GUIDE:
${guide}

Be faithful to what the participant actually said. Do not invent detail. Quotes must be verbatim from the participant's messages (light trimming allowed, no rewording).
headline: one sentence, the single most useful takeaway. summary: 3-5 sentences. key_points: 3-6 bullets.
answers: one entry per guide question the participant addressed (question_index from the guide), with their answer paraphrased in one or two sentences; skip questions not reached.
tags: 2-6 short lowercase labels. sentiment: the participant's overall attitude toward the topic.`;
}

function synthesizeSystem(study, n) {
  return `You synthesize ${n} research interviews into findings for the researcher who designed the study.
STUDY: ${study.title}
GOAL: ${study.goal}
AUDIENCE: ${study.audience}

Each interview below is tagged with its response id. Ground everything in the transcripts; never invent a quote or a participant.
themes: 3-7 patterns, most important first. For each: a title, a description that says what the pattern is and why it matters for the goal, response_ids of every interview that shows it (this is how prevalence is counted, so be complete and accurate), and 1-3 verbatim quotes with the correct response_id.
executive_summary: 4-8 sentences a busy reader can act on. sentiment_overview: 2-3 sentences. surprises: things that contradict a likely assumption. recommendations: concrete next steps, phrased as options for the researcher to decide on, not orders. open_questions: what these interviews could not answer.`;
}

function askSystem(study) {
  return `You answer a researcher's questions about their interview data.
STUDY: ${study.title}
GOAL: ${study.goal}

Use only the interviews provided. Every claim needs a citation: a verbatim participant quote and its response_id. If the data does not answer the question, say so plainly and set confidence to "low". Counts must match the transcripts. Keep the answer under 250 words.`;
}

function corpus(responses) {
  return responses.map(r => {
    const who = r.participant && r.participant.name ? ` (${clip(r.participant.name, 60)})` : "";
    const summary = r.summary ? `\nSUMMARY: ${clip(r.summary.headline, 300)} ${clip(r.summary.summary, 1500)}` : "";
    const lines = (r.transcript || []).map(m => `${m.role === "assistant" ? "Moderator" : "Participant"}: ${clip(m.content, LIMITS.messageChars)}`).join("\n");
    return `=== response_id: ${r.id}${who} ===${summary}\n${lines}`;
  }).join("\n\n");
}

function cleanResponses(list) {
  if (!Array.isArray(list) || !list.length) throw new BadInput("No responses to work with.");
  return list.slice(0, LIMITS.responses).map(r => ({
    id: clip(r && r.id, 40) || "unknown",
    participant: r && r.participant,
    summary: r && r.summary,
    transcript: Array.isArray(r && r.transcript) ? r.transcript.slice(0, LIMITS.turnMessages) : []
  }));
}

// ---- handler ---------------------------------------------------------------

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed. Use POST." });

  const body = req.body || {};
  try {
    switch (body.op) {
      case "guide": {
        const goal = clip(body.goal, LIMITS.goalChars).trim();
        if (!goal) return res.status(400).json({ error: "Tell the model what you want to learn ('goal')." });
        const audience = clip(body.audience, 500);
        const title = clip(body.title, LIMITS.titleChars);
        const count = Math.min(12, Math.max(3, parseInt(body.count, 10) || 7));
        const result = await callModel({
          system: guideSystem(),
          messages: [{ role: "user", content: `Research goal: ${goal}\nAudience: ${audience || "not specified"}\nWorking title: ${title || "none yet"}\nNumber of main questions: ${count}` }],
          schema: SCHEMAS.guide, maxTokens: 4096, effort: "medium"
        });
        return res.status(200).json({ ok: true, guide: result });
      }

      case "turn": {
        const study = cleanStudy(body.study);
        const transcript = cleanTranscript(body.transcript);
        const messages = transcript.map(m => ({ role: m.role, content: m.content }));
        const state = turnState(transcript, study);
        if (!messages.length || messages[messages.length - 1].role === "assistant") {
          messages.push({ role: "user", content: `(The participant is ready.) ${state}` });
        } else {
          messages[messages.length - 1] = { role: "user", content: `${messages[messages.length - 1].content}\n\n${state}` };
        }
        const result = await callModel({ system: interviewerSystem(study), messages, schema: SCHEMAS.turn, maxTokens: 1024, effort: "low" });
        const lastIndex = Math.max(study.questions.length - 1, 0);
        result.question_index = Math.min(Math.max(result.question_index, 0), lastIndex);
        return res.status(200).json({ ok: true, turn: result });
      }

      case "summarize": {
        const study = cleanStudy(body.study);
        const transcript = cleanTranscript(body.transcript);
        if (!transcript.some(m => m.role === "user")) return res.status(400).json({ error: "Nothing to summarize yet." });
        const text = transcript.map(m => `${m.role === "assistant" ? "Moderator" : "Participant"}: ${m.content}`).join("\n");
        const result = await callModel({ system: summarizeSystem(study), messages: [{ role: "user", content: `TRANSCRIPT:\n${text}` }], schema: SCHEMAS.summarize, maxTokens: 4096, effort: "medium" });
        return res.status(200).json({ ok: true, summary: result });
      }

      case "synthesize": {
        const study = cleanStudy(body.study);
        const responses = cleanResponses(body.responses);
        let text = corpus(responses);
        if (text.length > LIMITS.corpusChars) text = corpus(responses.map(r => ({ ...r, transcript: [] })));
        const result = await callModel({ system: synthesizeSystem(study, responses.length), messages: [{ role: "user", content: text }], schema: SCHEMAS.synthesize, maxTokens: 16000, effort: "high" });
        return res.status(200).json({ ok: true, synthesis: result });
      }

      case "ask": {
        const study = cleanStudy(body.study);
        const responses = cleanResponses(body.responses);
        const question = clip(body.question, LIMITS.askChars).trim();
        if (!question) return res.status(400).json({ error: "Ask a question." });
        let text = corpus(responses);
        if (text.length > LIMITS.corpusChars) text = corpus(responses.map(r => ({ ...r, transcript: [] })));
        const history = Array.isArray(body.history) ? body.history.slice(-8).map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: clip(m.content, 4000) })).filter(m => m.content) : [];
        const messages = [{ role: "user", content: `INTERVIEWS:\n${text}` }, { role: "assistant", content: "I have read every interview. Ask me anything about them." }, ...history, { role: "user", content: question }];
        const result = await callModel({ system: askSystem(study), messages, schema: SCHEMAS.ask, maxTokens: 4096, effort: "medium" });
        return res.status(200).json({ ok: true, ...result });
      }

      default:
        return res.status(400).json({ error: `Unknown op '${body.op}'.` });
    }
  } catch (err) {
    const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 500;
    return res.status(status).json({ error: err.message || "Server error", detail: err.detail });
  }
}
