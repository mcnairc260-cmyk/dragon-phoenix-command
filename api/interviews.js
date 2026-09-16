// api/interviews.js — Storage for the Interviews app (studies, responses, syntheses).
// Zero dependencies. Talks to a Redis-compatible REST store (Vercel KV / Upstash)
// over plain fetch when KV_REST_API_URL + KV_REST_API_TOKEN (or the UPSTASH_REDIS_REST_*
// pair) are set in Vercel env vars. Without them it falls back to process memory,
// which survives only while the function instance is warm — the UI shows a banner
// so nobody mistakes demo storage for durable storage.
//
// Access model (no accounts): every study has a secret ownerKey generated in the
// researcher's browser. Writes and reads of responses need it; participants only
// ever see the public study (ownerKey stripped) and can only append responses.

const MAX_STUDY_BYTES = 64 * 1024;
const MAX_RESPONSE_BYTES = 256 * 1024;
const MAX_SYNTHESIS_BYTES = 256 * 1024;

const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const PERSISTENT = Boolean(KV_URL && KV_TOKEN);

// ---- store: one tiny interface, two backends -------------------------------

async function redis(...command) {
  const r = await fetch(KV_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${KV_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(command)
  });
  const data = await r.json();
  if (!r.ok || data.error) throw new Error(data.error || `Store error ${r.status}`);
  return data.result;
}

const mem = globalThis.__dpaInterviewStore || (globalThis.__dpaInterviewStore = { kv: new Map(), sets: new Map() });

const store = PERSISTENT ? {
  get: async k => { const v = await redis("GET", k); return v == null ? null : JSON.parse(v); },
  set: async (k, v) => { await redis("SET", k, JSON.stringify(v)); },
  del: async k => { await redis("DEL", k); },
  sadd: async (s, m) => { await redis("SADD", s, m); },
  srem: async (s, m) => { await redis("SREM", s, m); },
  smembers: async s => (await redis("SMEMBERS", s)) || []
} : {
  get: async k => (mem.kv.has(k) ? JSON.parse(mem.kv.get(k)) : null),
  set: async (k, v) => { mem.kv.set(k, JSON.stringify(v)); },
  del: async k => { mem.kv.delete(k); },
  sadd: async (s, m) => { if (!mem.sets.has(s)) mem.sets.set(s, new Set()); mem.sets.get(s).add(m); },
  srem: async (s, m) => { mem.sets.get(s)?.delete(m); },
  smembers: async s => Array.from(mem.sets.get(s) || [])
};

// ---- helpers ---------------------------------------------------------------

const ID_RE = /^[a-z0-9]{6,32}$/;
const KEY_RE = /^[a-z0-9]{16,64}$/;
const isId = v => typeof v === "string" && ID_RE.test(v);
const isKey = v => typeof v === "string" && KEY_RE.test(v);
const bytes = v => Buffer.byteLength(JSON.stringify(v));

function publicStudy(study) {
  if (!study) return null;
  const { ownerKey, ...rest } = study;
  return rest;
}

function bad(res, msg) { return res.status(400).json({ error: msg }); }
function forbidden(res) { return res.status(403).json({ error: "Owner key does not match this study." }); }

// ---- handler ---------------------------------------------------------------

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed. Use POST." });

  const body = req.body || {};
  const op = body.op;

  try {
    switch (op) {
      case "health":
        return res.status(200).json({ ok: true, persistent: PERSISTENT, store: PERSISTENT ? "kv" : "memory" });

      case "saveStudy": {
        const { study, ownerKey } = body;
        if (!study || typeof study !== "object" || !isId(study.id)) return bad(res, "Missing or invalid 'study'.");
        if (!isKey(ownerKey)) return bad(res, "Missing or invalid 'ownerKey'.");
        if (bytes(study) > MAX_STUDY_BYTES) return bad(res, "Study is too large.");
        const existing = await store.get(`study:${study.id}`);
        if (existing && existing.ownerKey !== ownerKey) return forbidden(res);
        const saved = { ...publicStudy(study), ownerKey, updatedAt: Date.now() };
        await store.set(`study:${study.id}`, saved);
        await store.sadd(`owner:${ownerKey}`, study.id);
        return res.status(200).json({ ok: true, study: publicStudy(saved), persistent: PERSISTENT });
      }

      case "getStudy": {
        const { id } = body;
        if (!isId(id)) return bad(res, "Missing or invalid 'id'.");
        const study = await store.get(`study:${id}`);
        if (!study) return res.status(404).json({ error: "Study not found." });
        return res.status(200).json({ ok: true, study: publicStudy(study), persistent: PERSISTENT });
      }

      case "listStudies": {
        const { ownerKey } = body;
        if (!isKey(ownerKey)) return bad(res, "Missing or invalid 'ownerKey'.");
        const ids = await store.smembers(`owner:${ownerKey}`);
        const studies = [];
        for (const id of ids) {
          const s = await store.get(`study:${id}`);
          if (s && s.ownerKey === ownerKey) {
            const respIds = await store.smembers(`resps:${id}`);
            studies.push({ ...publicStudy(s), responseCount: respIds.length });
          }
        }
        return res.status(200).json({ ok: true, studies, persistent: PERSISTENT });
      }

      case "deleteStudy": {
        const { id, ownerKey } = body;
        if (!isId(id) || !isKey(ownerKey)) return bad(res, "Missing 'id' or 'ownerKey'.");
        const study = await store.get(`study:${id}`);
        if (!study) return res.status(404).json({ error: "Study not found." });
        if (study.ownerKey !== ownerKey) return forbidden(res);
        const respIds = await store.smembers(`resps:${id}`);
        for (const rid of respIds) await store.del(`resp:${id}:${rid}`);
        await store.del(`resps:${id}`);
        await store.del(`synth:${id}`);
        await store.del(`study:${id}`);
        await store.srem(`owner:${ownerKey}`, id);
        return res.status(200).json({ ok: true });
      }

      case "saveResponse": {
        // Participant path: no ownerKey. The study must exist and be live.
        const { studyId, response } = body;
        if (!isId(studyId)) return bad(res, "Missing or invalid 'studyId'.");
        if (!response || typeof response !== "object" || !isId(response.id)) return bad(res, "Missing or invalid 'response'.");
        if (!Array.isArray(response.transcript)) return bad(res, "'response.transcript' must be an array.");
        if (bytes(response) > MAX_RESPONSE_BYTES) return bad(res, "Response is too large.");
        const study = await store.get(`study:${studyId}`);
        if (!study) return res.status(404).json({ error: "Study not found." });
        if (study.status !== "live") return res.status(409).json({ error: "This interview is not open." });
        const key = `resp:${studyId}:${response.id}`;
        const existing = await store.get(key);
        // A response can only be updated by the same participant session (its own secret).
        if (existing && existing.sessionKey !== response.sessionKey) return forbidden(res);
        const saved = { ...response, studyId, updatedAt: Date.now() };
        await store.set(key, saved);
        await store.sadd(`resps:${studyId}`, response.id);
        return res.status(200).json({ ok: true, persistent: PERSISTENT });
      }

      case "listResponses": {
        const { studyId, ownerKey } = body;
        if (!isId(studyId) || !isKey(ownerKey)) return bad(res, "Missing 'studyId' or 'ownerKey'.");
        const study = await store.get(`study:${studyId}`);
        if (!study) return res.status(404).json({ error: "Study not found." });
        if (study.ownerKey !== ownerKey) return forbidden(res);
        const ids = await store.smembers(`resps:${studyId}`);
        const responses = [];
        for (const rid of ids) {
          const r = await store.get(`resp:${studyId}:${rid}`);
          if (r) { const { sessionKey, ...pub } = r; responses.push(pub); }
        }
        responses.sort((a, b) => (a.startedAt || 0) - (b.startedAt || 0));
        const synthesis = await store.get(`synth:${studyId}`);
        return res.status(200).json({ ok: true, responses, synthesis, study: publicStudy(study), persistent: PERSISTENT });
      }

      case "updateResponse": {
        // Researcher path: attach/replace a summary, or delete.
        const { studyId, ownerKey, responseId, summary, remove } = body;
        if (!isId(studyId) || !isKey(ownerKey) || !isId(responseId)) return bad(res, "Missing 'studyId', 'ownerKey' or 'responseId'.");
        const study = await store.get(`study:${studyId}`);
        if (!study) return res.status(404).json({ error: "Study not found." });
        if (study.ownerKey !== ownerKey) return forbidden(res);
        const key = `resp:${studyId}:${responseId}`;
        if (remove) {
          await store.del(key);
          await store.srem(`resps:${studyId}`, responseId);
          return res.status(200).json({ ok: true });
        }
        const existing = await store.get(key);
        if (!existing) return res.status(404).json({ error: "Response not found." });
        if (summary !== undefined) existing.summary = summary;
        existing.updatedAt = Date.now();
        await store.set(key, existing);
        return res.status(200).json({ ok: true });
      }

      case "saveSynthesis": {
        const { studyId, ownerKey, synthesis } = body;
        if (!isId(studyId) || !isKey(ownerKey)) return bad(res, "Missing 'studyId' or 'ownerKey'.");
        if (!synthesis || typeof synthesis !== "object") return bad(res, "Missing 'synthesis'.");
        if (bytes(synthesis) > MAX_SYNTHESIS_BYTES) return bad(res, "Synthesis is too large.");
        const study = await store.get(`study:${studyId}`);
        if (!study) return res.status(404).json({ error: "Study not found." });
        if (study.ownerKey !== ownerKey) return forbidden(res);
        await store.set(`synth:${studyId}`, { ...synthesis, savedAt: Date.now() });
        return res.status(200).json({ ok: true });
      }

      default:
        return bad(res, `Unknown op '${op}'.`);
    }
  } catch (err) {
    return res.status(500).json({ error: err.message || "Server error" });
  }
}
