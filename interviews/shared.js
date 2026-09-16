// interviews/shared.js — helpers used by both the researcher app (index.html)
// and the participant app (join.html). Vanilla, no build step.

const DPI = (() => {
  const LS = "dpa.interviews.";

  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const nl = s => esc(s).replace(/\n/g, "<br>");

  function uid(len = 12) {
    const a = new Uint8Array(len); crypto.getRandomValues(a);
    return Array.from(a, b => "abcdefghijklmnopqrstuvwxyz0123456789"[b % 36]).join("");
  }

  async function api(path, body) {
    let res, data;
    try {
      res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      data = await res.json();
    } catch (e) {
      throw new Error("Could not reach the server. Check your connection and try again.");
    }
    if (!res.ok || data.error) { const err = new Error(data.error || `Request failed (${res.status})`); err.status = res.status; throw err; }
    return data;
  }
  const store = body => api("/api/interviews", body);
  const ai = body => api("/api/interview-ai", body);

  // localStorage wrapped so private mode / blocked storage never throws
  const ls = {
    get(k, d) { try { const v = localStorage.getItem(LS + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(LS + k, JSON.stringify(v)); } catch { /* ignore */ } },
    del(k) { try { localStorage.removeItem(LS + k); } catch { /* ignore */ } }
  };

  function ownerKey() {
    let k = ls.get("ownerKey");
    if (!k) { k = uid(32); ls.set("ownerKey", k); }
    return k;
  }

  // Public study config travels inside the share link (#hash, base64url) so the
  // participant page works even if the server store has been reset.
  const b64u = {
    enc: s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
    dec: s => decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4))))
  };
  function publicStudy(s) {
    const { ownerKey: _k, responseCount: _c, ...rest } = s;
    return rest;
  }
  const encodeStudy = s => b64u.enc(JSON.stringify(publicStudy(s)));
  function decodeStudy(h) { try { return JSON.parse(b64u.dec(h)); } catch { return null; } }

  // Two forms. The short one (/i/<id>, a Vercel rewrite) needs the study in the server
  // store; the long one carries the guide in the #hash, so it works even without storage.
  function shareUrl(study, short) {
    if (short) return `${location.origin}/i/${encodeURIComponent(study.id)}`;
    const base = location.origin + location.pathname.replace(/[^/]*$/, "");
    return `${base}join.html?s=${encodeURIComponent(study.id)}#${encodeStudy(study)}`;
  }

  const fmtDate = t => (t ? new Date(t).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "—");
  const fmtDay = t => (t ? new Date(t).toLocaleDateString([], { dateStyle: "medium" }) : "—");
  function fmtDur(sec) {
    if (!sec && sec !== 0) return "—";
    const m = Math.floor(sec / 60), s = Math.round(sec % 60);
    return m ? `${m}m ${String(s).padStart(2, "0")}s` : `${s}s`;
  }

  const SENTIMENT = { positive: ["Positive", "var(--pos)"], neutral: ["Neutral", "var(--smoke)"], negative: ["Negative", "var(--neg)"], mixed: ["Mixed", "var(--gold)"] };

  function download(name, text, type = "text/plain") {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // Original starting points. Each is a complete, editable guide.
  const TEMPLATES = [
    { id: "discovery", icon: "🔭", name: "Customer discovery", tagline: "Find the problem before you build the solution.",
      goal: "Understand how people currently handle a specific problem, what they have tried, what frustrates them, and what a better solution would need to do for them to switch.",
      audience: "People who face the problem regularly (not yet customers).",
      questions: [
        { text: "Walk me through the last time you dealt with this. What happened?", probes: ["What did you do first?", "How long did it take?"] },
        { text: "What have you tried so far to make it easier?", probes: ["What worked, even a little?", "What did you stop using, and why?"] },
        { text: "What is the most frustrating part of the current way?", probes: ["Can you give a concrete example?"] },
        { text: "If that part disappeared tomorrow, what would change for you?", probes: [] },
        { text: "What would make you switch to a new way of doing this?", probes: ["What would make you hesitate?"] },
        { text: "Is there anything I should have asked and didn't?", probes: [] }
      ] },
    { id: "churn", icon: "🚪", name: "Churn / cancellation", tagline: "Learn why people leave while they still remember.",
      goal: "Find the real reasons customers cancelled, what the product failed to do for them, what they moved to, and what would have kept them.",
      audience: "Customers who cancelled in the last 60 days.",
      questions: [
        { text: "What were you hoping the product would do for you when you signed up?", probes: [] },
        { text: "What led to the decision to cancel?", probes: ["Was there a specific moment?", "How long had you been thinking about it?"] },
        { text: "What are you using instead now, if anything?", probes: ["What does it do better?"] },
        { text: "Was there anything that almost kept you?", probes: [] },
        { text: "If we fixed one thing, what would it need to be for you to come back?", probes: [] }
      ] },
    { id: "feedback", icon: "🧪", name: "Product feedback", tagline: "Hear how a feature actually gets used.",
      goal: "Understand how customers use a specific feature, where it helps, where it gets in the way, and what they wish it did.",
      audience: "Active customers who used the feature in the last month.",
      questions: [
        { text: "When did you last use this feature, and what were you trying to get done?", probes: [] },
        { text: "How did it go? Where did it help, and where did it slow you down?", probes: ["What did you expect to happen instead?"] },
        { text: "Is there a workaround you use around it?", probes: [] },
        { text: "If you could change one thing about it, what would it be?", probes: ["Why that one?"] },
        { text: "How would you describe this feature to a colleague in one sentence?", probes: [] }
      ] },
    { id: "winloss", icon: "⚖️", name: "Win / loss", tagline: "Find out why deals were won or lost.",
      goal: "Understand how a buyer evaluated options, what mattered most in the decision, how we compared, and what would change the outcome next time.",
      audience: "Decision-makers from recent won and lost deals.",
      questions: [
        { text: "What started the search for a solution like this?", probes: [] },
        { text: "Which options did you look at, and how did you compare them?", probes: ["What criteria mattered most?"] },
        { text: "What stood out about us, for better or worse?", probes: [] },
        { text: "What made the final decision?", probes: ["Who else was involved?"] },
        { text: "What would have changed the outcome?", probes: [] }
      ] },
    { id: "employee", icon: "🧭", name: "Employee experience", tagline: "Understand how work really feels on the team.",
      goal: "Learn what helps and what blocks people in their day-to-day work, how they experience communication and priorities, and what one change would help most.",
      audience: "Team members across roles.",
      questions: [
        { text: "What does a good day at work look like for you?", probes: [] },
        { text: "What gets in the way most often?", probes: ["How do you deal with it right now?"] },
        { text: "How clear are priorities to you week to week?", probes: ["Where does the clarity break down?"] },
        { text: "What do you wish leadership understood better?", probes: [] },
        { text: "If you could change one thing about how the team works, what would it be?", probes: [] }
      ] },
    { id: "audience", icon: "🎬", name: "Audience research", tagline: "Know who watches, reads or listens, and why.",
      goal: "Understand why people follow this creator or channel, what they want more of, what they skip, and what would make them recommend it.",
      audience: "Viewers, readers or subscribers.",
      questions: [
        { text: "How did you first find this channel, and what made you stay?", probes: [] },
        { text: "Which piece do you remember best, and why that one?", probes: [] },
        { text: "What do you usually skip or drop off from?", probes: ["What was missing?"] },
        { text: "What would you like to see more of?", probes: [] },
        { text: "What would make you send this to a friend?", probes: [] }
      ] },
    { id: "blank", icon: "✍️", name: "Blank study", tagline: "Start from your own goal and let AI draft the guide.",
      goal: "", audience: "", questions: [] }
  ];

  return { esc, nl, uid, api, store, ai, ls, ownerKey, publicStudy, encodeStudy, decodeStudy, shareUrl, fmtDate, fmtDay, fmtDur, SENTIMENT, download, TEMPLATES };
})();
