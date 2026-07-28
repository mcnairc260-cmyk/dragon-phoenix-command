#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Build the painted edition's print layout and web flipbook.

Writes print.html (8x10in, one sheet per page — render to PDF with headless
Chromium) and book.html (the tap/swipe storybook). Both expect the painted
illustrations beside them as cover.jpg and p01.jpg .. p14.jpg.

    python3 build_painted.py
    chromium --headless --no-pdf-header-footer --print-to-pdf=out.pdf print.html
"""
import json

from story_text import (TITLE, COVER_SUB, DEDICATION, DEDICATION_LINES, SIGNATURE,
                        BLURB_1, BLURB_2, BACK_CREDIT, PAGES)

# ------------------------------------------------------------------ print
PRINT_CSS = u"""
@page { size: 8in 10in; margin: 0; }
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Palatino Linotype',Palatino,Georgia,serif;color:#4A3C63}
.sheet{width:8in;height:10in;page-break-after:always;position:relative;overflow:hidden;
 background:#FFF9EE;display:flex;flex-direction:column;align-items:center}
.sheet.cover{background:#221B44}
.sheet.cover img{position:absolute;inset:0;width:8in;height:10in;object-fit:cover}
.cover-title{position:absolute;left:0;right:0;bottom:0;padding:.7in .6in .55in;
 background:linear-gradient(transparent,rgba(20,14,44,.85) 45%);text-align:center;color:#FFF6DF}
.cover-title h1{font-size:34pt;line-height:1.12;font-weight:700}
.cover-title .rule{margin:.16in auto;width:1.6in;height:2.5px;
 background:linear-gradient(90deg,transparent,#C9A227,transparent)}
.cover-title .sub{font-style:italic;font-size:13pt;color:#FFE9A0}
.sheet.dedication{justify-content:center;text-align:center;padding:1.2in}
.sheet.dedication .star{font-size:30pt;color:#C9A227;margin-bottom:.3in}
.sheet.dedication p{font-style:italic;font-size:15pt;line-height:1.7}
.sheet.dedication .sign{margin-top:.5in;font-size:13pt;color:#9A7B1E;line-height:1.7}
.sheet.story{padding:.45in .55in .4in}
.plate{height:6.55in;padding:.085in;background:linear-gradient(135deg,#E7CF8C,#C9A227 45%,#E7CF8C);
 border-radius:.1in;box-shadow:0 .06in .25in rgba(74,60,99,.28)}
.plate .inner{height:100%;padding:.05in;background:#FFF9EE;border-radius:.06in}
.plate img{height:100%;display:block;border-radius:.04in}
.story .words{flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;
 text-align:center;padding:.18in .25in 0}
.story .words p{font-size:12pt;line-height:1.5;max-width:6.6in}
.pgnum{position:absolute;bottom:.16in;left:0;right:0;text-align:center;font-size:8pt;
 color:#A79EB4;letter-spacing:.25em}
.sheet.back{background:linear-gradient(#1C1740,#33265E 55%,#5E4B8C);color:#FFF6DF;
 justify-content:center;text-align:center;padding:1in}
.sheet.back .star{font-size:40pt;color:#FFD34E;text-shadow:0 0 .3in rgba(255,211,78,.8);margin-bottom:.35in}
.sheet.back p{font-style:italic;font-size:13pt;line-height:1.8;color:#E9DFF7;max-width:5.6in;margin:0 auto}
.sheet.back .names{margin-top:.45in;font-size:11pt;color:#FFE9A0;letter-spacing:.12em;line-height:1.8}
"""

sheets = [
    u'<div class="sheet cover"><img src="cover.jpg">'
    u'<div class="cover-title"><h1>Princess Lia<br>and the Littlest Knight</h1>'
    u'<div class="rule"></div><div class="sub">%s</div></div></div>' % COVER_SUB,
    u'<div class="sheet dedication"><div class="star">&#10022;</div>'
    u'<p>%s</p><p class="sign">%s</p></div>' % (DEDICATION_LINES, SIGNATURE),
]
for i, (text, _alt) in enumerate(PAGES, 1):
    sheets.append(u'<div class="sheet story"><div class="plate"><div class="inner">'
                  u'<img src="p%02d.jpg"></div></div><div class="words"><p>%s</p></div>'
                  u'<div class="pgnum">&mdash; %d &mdash;</div></div>' % (i, text, i))
sheets.append(u'<div class="sheet back"><div class="star">&#9733;</div><p>%s</p>'
              u'<p style="margin-top:.3in">%s</p><div class="names">%s</div></div>'
              % (BLURB_1, BLURB_2, BACK_CREDIT))

open('print.html', 'w').write(
    u'<!doctype html><html><head><meta charset="utf-8"><title>%s</title><style>%s</style></head>'
    u'<body>%s</body></html>' % (TITLE, PRINT_CSS, u''.join(sheets)))
print('print.html written (%d sheets)' % len(sheets))

# ------------------------------------------------------------------ flipbook
BOOK_CSS = u"""
:root{--paper:#FFF9EE;--ink:#4A3C63;--gold:#C9A227;--night:#221B44}
*{box-sizing:border-box;margin:0;padding:0}html,body{height:100%}
body{background:radial-gradient(120% 100% at 50% 0%,#3A2E66 0%,var(--night) 70%);
 font-family:'Palatino Linotype',Palatino,Georgia,serif;color:var(--ink);
 display:flex;flex-direction:column;align-items:center;justify-content:center;
 overflow:hidden;-webkit-tap-highlight-color:transparent}
#stage{position:relative;width:min(94vw,calc((100vh - 90px)*.72),560px);aspect-ratio:.78;
 perspective:2200px;z-index:2}
.page{position:absolute;inset:0;background:var(--paper);border-radius:14px;
 box-shadow:0 18px 50px rgba(0,0,0,.5);overflow:hidden;display:flex;flex-direction:column;
 backface-visibility:hidden;transform-origin:left center;
 transition:transform .65s cubic-bezier(.4,.1,.2,1),opacity .65s ease}
.page.hidden{visibility:hidden}
.page.out-f{transform:rotateY(-78deg) translateZ(30px);opacity:0}
.page.out-b{transform:rotateY(12deg) scale(.94);opacity:0}
.art{flex:0 0 70%;position:relative;overflow:hidden}
.art img{width:100%;height:100%;object-fit:cover;display:block}
.words{flex:1 1 auto;padding:4% 7% 5%;display:flex;flex-direction:column;justify-content:center;
 background:radial-gradient(120% 140% at 50% -20%,#FFFDF4 0%,var(--paper) 60%);text-align:center;position:relative}
.words::before{content:"\\2726";color:var(--gold);font-size:.75rem;opacity:.8}
.words p{font-size:clamp(.78rem,2.3vmin,1rem);line-height:1.45}
.words .pgnum{position:absolute;bottom:5px;left:0;right:0;font-size:.6rem;color:#A79EB4;letter-spacing:.2em}
.page.cover .art{flex:1 1 auto}
.cover-title{position:absolute;inset:auto 0 0 0;padding:7% 8% 9%;
 background:linear-gradient(transparent,rgba(20,14,44,.82) 42%);text-align:center;color:#FFF6DF}
.cover-title h1{font-size:clamp(1.4rem,6vmin,2.2rem);line-height:1.15;font-weight:700;
 text-shadow:0 2px 14px rgba(0,0,0,.55)}
.cover-title .sub{margin-top:.6em;font-style:italic;font-size:clamp(.75rem,2.4vmin,.95rem);color:#FFE9A0}
.page.dedication{justify-content:center;text-align:center}
.page.dedication .words{flex:0 0 auto;background:none}
.page.dedication .words::before{font-size:1.8rem}
.page.dedication p{font-style:italic;font-size:clamp(.9rem,2.8vmin,1.1rem);margin-top:.6em}
.page.dedication .sign{margin-top:1.6em;color:var(--gold);font-size:clamp(.82rem,2.5vmin,.98rem);line-height:1.6}
#bar{z-index:2;margin-top:14px;display:flex;align-items:center;gap:12px;color:#CFC8E2;font-size:.8rem;user-select:none}
#bar button{background:rgba(255,249,238,.1);color:#FFE9A0;border:1px solid rgba(255,233,160,.35);
 border-radius:999px;width:42px;height:42px;font-size:1rem;cursor:pointer;font-family:inherit}
#bar button:disabled{opacity:.3}
#dots{display:flex;gap:4px}
#dots i{width:6px;height:6px;border-radius:50%;background:rgba(255,249,238,.25)}
#dots i.on{background:var(--gold);transform:scale(1.35)}
#hint{z-index:2;margin-top:8px;color:rgba(207,200,226,.55);font-size:.66rem;font-style:italic}
"""

BOOK_JS = u"""
const stage=document.getElementById('stage'),dots=document.getElementById('dots');
const prevB=document.getElementById('prev'),nextB=document.getElementById('next');
let cur=0,anim=false;
function mk(p,idx){const el=document.createElement('div');
 if(p.type=='cover'){el.className='page cover';
  el.innerHTML=`<div class="art"><img src="${p.img}"><div class="cover-title"><h1>${p.title}</h1><div class="sub">${p.sub}</div></div></div>`;}
 else if(p.type=='ded'){el.className='page dedication';
  el.innerHTML=`<div class="words"><p>${p.text}</p><p class="sign">${p.sign}</p></div>`;}
 else{el.className='page';
  el.innerHTML=`<div class="art"><img src="${p.img}"></div><div class="words"><p>${p.text}</p><span class="pgnum">\\u2014 ${idx-1} \\u2014</span></div>`;}
 return el;}
const els=PAGES.map(mk);
els.forEach((el,i)=>{if(i)el.classList.add('hidden');stage.appendChild(el);});
PAGES.forEach((_,i)=>{const d=document.createElement('i');if(!i)d.className='on';dots.appendChild(d);});
function upd(){[...dots.children].forEach((d,i)=>d.className=i==cur?'on':'');
 prevB.disabled=!cur;nextB.disabled=cur==PAGES.length-1;}
function go(dir){const n=cur+dir;if(anim||n<0||n>=PAGES.length)return;anim=true;
 const out=els[cur],inn=els[n];inn.classList.remove('hidden');inn.style.zIndex=1;out.style.zIndex=2;
 out.classList.add(dir>0?'out-f':'out-b');
 setTimeout(()=>{out.classList.remove('out-f','out-b');out.classList.add('hidden');cur=n;anim=false;upd();},660);}
prevB.onclick=()=>go(-1);nextB.onclick=()=>go(1);
stage.onclick=e=>{const r=stage.getBoundingClientRect();go(e.clientX-r.left<r.width/2?-1:1);};
document.onkeydown=e=>{if(e.key=='ArrowRight'||e.key==' ')go(1);if(e.key=='ArrowLeft')go(-1);};
let tx=null;stage.addEventListener('touchstart',e=>tx=e.touches[0].clientX,{passive:true});
stage.addEventListener('touchend',e=>{if(tx===null)return;const dx=e.changedTouches[0].clientX-tx;
 if(Math.abs(dx)>40)go(dx<0?1:-1);tx=null;},{passive:true});
const m=location.hash.match(/^#p(\\d+)$/);
if(m){const t=Math.min(Math.max(+m[1],0),PAGES.length-1);els[cur].classList.add('hidden');cur=t;els[cur].classList.remove('hidden');}
upd();
"""

pages = [{"type": "cover", "img": "cover.jpg", "title": TITLE, "sub": COVER_SUB},
         {"type": "ded", "text": DEDICATION, "sign": SIGNATURE}]
for i, (text, _alt) in enumerate(PAGES, 1):
    pages.append({"img": "p%02d.jpg" % i, "text": text})

open('book.html', 'w').write(
    u'<!doctype html><html lang="en"><head><meta charset="utf-8">'
    u'<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'
    u'<title>%s</title><style>%s</style></head><body>'
    u'<div id="stage"></div>'
    u'<div id="bar"><button id="prev">&#10094;</button><div id="dots"></div>'
    u'<button id="next">&#10095;</button></div>'
    u'<div id="hint">tap the sides, swipe, or use arrow keys to turn the page</div>'
    u'<script>const PAGES=%s;%s</script></body></html>'
    % (TITLE, BOOK_CSS, json.dumps(pages, ensure_ascii=False), BOOK_JS))
print('book.html written (%d pages)' % len(pages))
