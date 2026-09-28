import json, html, sys
sys.path.insert(0, '/home/claude/ascension')
from script import CH1_PAGES, CH2_PAGES, CH3_PAGES
from PIL import Image

W, H = 1200, 1800          # page canvas
M = 36                     # margin
G = 14                     # gutter
IW, IH = W - 2*M, H - 2*M

def size(k):
    im = Image.open(f'/home/claude/ascension/reader/img/{k}.jpg'); return im.size

def esc(t): return html.escape(t).replace('\n', '<br>')

# ---------- layout helpers: return list of (key, x, y, w, h) ----------
def rows_layout(rows, upmax=1.0):
    """rows: list of lists of image keys. Each row fills IW; heights from aspect ratios; scale to fit IH."""
    laid = []
    y = 0
    for row in rows:
        ars = [size(k)[0]/size(k)[1] for k in row]
        h = (IW - G*(len(row)-1)) / sum(ars)
        x = 0
        cells = []
        for k, ar in zip(row, ars):
            w = h*ar; cells.append([k, x, y, w, h]); x += w + G
        laid.append(cells); y += h + G
    total = y - G
    s = min(upmax, IH/total)
    out = []
    for cells in laid:
        for k, x, yy, w, h in cells:
            out.append((k, M + x*s + (IW - IW*s)/2, M + yy*s + (IH - total*s)/2, w*s, h*s))
    return out

POS = {
 'tl': 'left:3%;top:3%', 'tr': 'right:3%;top:3%', 'tc': 'left:50%;top:3%;transform:translateX(-50%)',
 'ml': 'left:3%;top:46%', 'mr': 'right:3%;top:46%',
 'bl': 'left:3%;bottom:3%', 'br': 'right:3%;bottom:3%', 'bc': 'left:50%;bottom:3%;transform:translateX(-50%)',
}

def text_html(t):
    k = t['k']; pos = POS[t['pos']]
    if k == 'title':
        return f'<div class="tt" style="{pos}">{esc(t["t"])}</div>'
    if k == 'end':
        return f'<div class="end" style="{pos}">{esc(t["t"])}</div>'
    if k == 'bal':
        return f'<div class="bal" style="{pos}"><span class="who">{esc(t["who"])}</span>{esc(t["t"])}</div>'
    return f'<div class="cap" style="{pos}">{esc(t["t"])}</div>'

def panel(k, x, y, w, h, texts=(), baked=False):
    inner = ''.join(text_html(t) for t in texts)
    fit = 'contain' if baked else 'cover'
    return (f'<div class="pnl" style="left:{x:.1f}px;top:{y:.1f}px;width:{w:.1f}px;height:{h:.1f}px">'
            f'<img src="img/{k}.jpg" alt="" loading="lazy" style="object-fit:{fit}">{inner}</div>')

pages = []  # each: dict(ch, label, html)

# cover
pages.append({'ch': 0, 'label': 'Cover', 'html': '<div class="coverbg"><img src="img/cover.jpg" alt=""></div><img class="coverfg" src="img/cover.jpg" alt="Project Ascension cover">'})

# chapter 1 (baked captions)
for i, pg in enumerate(CH1_PAGES):
    cells = rows_layout(pg['rows'], upmax=1.35)
    pages.append({'ch': 1, 'label': f'1.{i+1}', 'html': ''.join(panel(k, x, y, w, h, baked=True) for k, x, y, w, h in cells)})

def new_pages(ch, PG):
    for i, pg in enumerate(PG):
        keys = [im['id'] for im in pg['images']]
        rows = [[k] for k in keys]
        cells = rows_layout(rows)
        parts = []
        for idx, (k, x, y, w, h) in enumerate(cells):
            texts = [t for t in pg['text'] if t.get('img', 0) == idx]
            parts.append(panel(k, x, y, w, h, texts))
        pages.append({'ch': ch, 'label': f'{ch}.{i+1}', 'html': ''.join(parts)})

new_pages(2, CH2_PAGES); new_pages(3, CH3_PAGES)

# closing page
pages.append({'ch': 4, 'label': 'End', 'html': f'''
<div class="colophon">
  <div class="eyebrow">Dragon Phoenix Ascension presents</div>
  <h1>PROJECT<br>ASCENSION</h1>
  <p class="tag">Truth has superhuman side effects.</p>
  <p>Three chapters. One seed. Ten thousand doors.</p>
  <p class="small">Chapter 1 art and concept by Courtney McNair. Chapters 2–3 story, script and art direction continued in collaboration with Claude. All characters are original and fictional.</p>
  <p class="small">Mature content: violence, language, conspiracy themes.</p>
</div>'''})

CH = {0: 'Cover', 1: 'Ch. 1 · The Quiet Sky', 2: 'Ch. 2 · The Seed', 3: 'Ch. 3 · Ascension', 4: 'End'}
pages_json = json.dumps([{'ch': p['ch'], 'label': p['label']} for p in pages])
page_divs = ''.join(f'<section class="page" data-i="{i}" hidden>{p["html"]}</section>' for i, p in enumerate(pages))
chapter_starts = {}
for i, p in enumerate(pages):
    chapter_starts.setdefault(p['ch'], i)
nav = ''.join(f'<button class="chip" data-go="{chapter_starts[c]}">{CH[c]}</button>' for c in sorted(chapter_starts))

doc = f'''<title>Project Ascension</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&family=Barlow+Semi+Condensed:ital,wght@0,500;0,600;1,500&display=swap">
<style>
:root{{--paper:#0b0d10;--ink:#141516;--cream:#efe6d3;--white:#fbfaf6;--rule:#2a2f36;--muted:#8d95a3;--accent:#c8332b;--fg:#e8e6e0;color-scheme:dark}}
html,body{{height:100%}}
body{{margin:0;background:var(--paper);color:var(--fg);font-family:"Barlow Semi Condensed",system-ui,sans-serif;overflow:hidden}}
.app{{position:fixed;inset:0;display:flex;flex-direction:column}}
.bar{{display:flex;align-items:center;gap:10px;padding:8px 16px;padding-top:calc(8px + env(safe-area-inset-top,0px));border-bottom:1px solid var(--rule);background:#0e1115;flex:none;overflow-x:auto;scrollbar-width:none}}
.bar::-webkit-scrollbar{{display:none}}
.brand{{font-family:Oswald,Impact,sans-serif;font-weight:700;letter-spacing:.08em;font-size:15px;white-space:nowrap}}
.brand b{{color:var(--accent)}}
.chip{{background:none;border:1px solid var(--rule);color:var(--muted);border-radius:999px;padding:4px 10px;font:inherit;font-size:12px;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap;cursor:pointer}}
.chip.on{{color:var(--fg);border-color:var(--fg)}}
.chip:focus-visible,.nb:focus-visible{{outline:2px solid var(--accent);outline-offset:2px}}
.stage{{flex:1;position:relative;display:flex;align-items:center;justify-content:center;padding:10px 16px;min-height:0}}
.scaler{{position:relative;width:{W}px;height:{H}px;transform-origin:center;flex:none}}
.page{{position:absolute;inset:0;background:#000;box-shadow:0 20px 60px rgba(0,0,0,.6)}}
.coverbg{{position:absolute;inset:0;overflow:hidden}}
.coverbg img{{width:100%;height:100%;object-fit:cover;filter:blur(28px) brightness(.45);transform:scale(1.15)}}
.coverfg{{position:absolute;top:0;bottom:0;left:50%;transform:translateX(-50%);height:100%;width:auto;max-width:100%;object-fit:contain;box-shadow:0 0 60px rgba(0,0,0,.8)}}
.pnl{{position:absolute;overflow:hidden;background:#000;outline:3px solid #f2ede2;outline-offset:-3px}}
.pnl img{{width:100%;height:100%;display:block;object-position:center}}
.cap,.bal,.tt,.end{{position:absolute;max-width:62%;font-size:25px;line-height:1.22;font-weight:500;color:var(--ink);padding:9px 13px;box-shadow:2px 3px 0 rgba(0,0,0,.55)}}
.cap{{background:var(--cream);border:2px solid #1a1a1a}}
.bal{{background:var(--white);border:2px solid #1a1a1a;border-radius:22px;padding:11px 16px}}
.bal .who{{display:block;font-size:14px;letter-spacing:.14em;text-transform:uppercase;color:#7a2a24;font-weight:600;margin-bottom:2px}}
.tt{{background:#111;color:#fff;border:2px solid #f2ede2;font-family:Oswald,Impact,sans-serif;font-size:44px;line-height:1.02;letter-spacing:.04em;text-transform:uppercase;font-weight:700;padding:12px 18px;max-width:70%}}
.end{{background:#111;color:#fff;border:2px solid #f2ede2;font-family:Oswald,Impact,sans-serif;font-size:30px;letter-spacing:.14em;text-transform:uppercase;font-weight:700}}
.colophon{{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:120px;background:radial-gradient(ellipse at 50% 30%,#1a2530,#0b0d10 70%)}}
.colophon h1{{font-family:Oswald,Impact,sans-serif;font-size:150px;line-height:.95;letter-spacing:.06em;margin:20px 0;color:#f2ede2;text-wrap:balance}}
.colophon .eyebrow{{letter-spacing:.3em;text-transform:uppercase;color:var(--muted);font-size:24px}}
.colophon .tag{{color:var(--accent);font-family:Oswald,Impact,sans-serif;font-size:40px;letter-spacing:.14em;text-transform:uppercase}}
.colophon p{{font-size:30px;max-width:820px}}
.colophon .small{{font-size:22px;color:var(--muted)}}
.foot{{display:flex;align-items:center;justify-content:center;gap:14px;padding:8px 16px;padding-bottom:calc(8px + env(safe-area-inset-bottom,0px));border-top:1px solid var(--rule);background:#0e1115;flex:none;font-variant-numeric:tabular-nums}}
.nb{{background:#161a20;border:1px solid var(--rule);color:var(--fg);border-radius:8px;padding:8px 18px;font:inherit;font-size:15px;cursor:pointer}}
.nb:disabled{{opacity:.35;cursor:default}}
.cnt{{color:var(--muted);font-size:14px;letter-spacing:.06em;min-width:120px;text-align:center}}
.hint{{color:var(--muted);font-size:12px}}
@media (max-width:640px){{.hint{{display:none}}.brand{{font-size:13px}}}}
@media (prefers-reduced-motion:no-preference){{.page{{animation:fade .25s ease}}}}
@keyframes fade{{from{{opacity:0}}to{{opacity:1}}}}
</style>
<div class="app">
  <div class="bar"><span class="brand">PROJECT <b>A</b>SCENSION</span>{nav}</div>
  <div class="stage" id="stage"><div class="scaler" id="scaler">{page_divs}</div></div>
  <div class="foot">
    <button class="nb" id="prev">‹ Prev</button>
    <span class="cnt" id="cnt"></span>
    <button class="nb" id="next">Next ›</button>
    <span class="hint">← → keys · swipe · tap sides</span>
  </div>
</div>
<script>
const PAGES={pages_json};
const scaler=document.getElementById('scaler'),stage=document.getElementById('stage');
const secs=[...document.querySelectorAll('.page')];
let i=0;
function fit(){{const r=stage.getBoundingClientRect();const s=Math.min((r.width-32)/{W},(r.height-20)/{H});scaler.style.transform='scale('+s+')';scaler.style.margin=(({H}*s-{H})/2)+'px '+(({W}*s-{W})/2)+'px';}}
function show(n){{i=Math.max(0,Math.min(secs.length-1,n));secs.forEach((s,k)=>s.hidden=k!==i);
 document.getElementById('cnt').textContent=PAGES[i].label+'  ·  '+(i+1)+' / '+secs.length;
 document.getElementById('prev').disabled=i===0;document.getElementById('next').disabled=i===secs.length-1;
 const ch=PAGES[i].ch;document.querySelectorAll('.chip').forEach(c=>c.classList.toggle('on',PAGES[+c.dataset.go].ch===ch));
 try{{localStorage.setItem('pa_page',i)}}catch(e){{}}
 // preload neighbours
 [i+1,i+2].forEach(k=>secs[k]&&secs[k].querySelectorAll('img').forEach(im=>{{im.loading='eager'}}));
}}
document.getElementById('prev').onclick=()=>show(i-1);document.getElementById('next').onclick=()=>show(i+1);
document.querySelectorAll('.chip').forEach(c=>c.onclick=()=>show(+c.dataset.go));
addEventListener('keydown',e=>{{if(e.key==='ArrowRight'||e.key===' ')show(i+1);if(e.key==='ArrowLeft')show(i-1)}});
let tx=null;stage.addEventListener('touchstart',e=>tx=e.touches[0].clientX,{{passive:true}});
stage.addEventListener('touchend',e=>{{if(tx===null)return;const dx=e.changedTouches[0].clientX-tx;if(Math.abs(dx)>50)show(dx<0?i+1:i-1);tx=null}});
stage.addEventListener('click',e=>{{if(e.target.closest('button'))return;const r=stage.getBoundingClientRect();const x=(e.clientX-r.left)/r.width;if(x<0.3)show(i-1);else if(x>0.7)show(i+1)}});
addEventListener('resize',fit);fit();
let start=0;try{{start=+localStorage.getItem('pa_page')||0}}catch(e){{}}
const h=location.hash.replace('#','');if(h==='cover')start=0;
show(start);
</script>'''
open('/home/claude/ascension/reader/index.html', 'w').write(doc)
print(len(pages), 'pages;', len(doc), 'bytes')
