#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Build a fixed-layout EPUB 3 of 'Princess Lia and the Littlest Knight'.

Expects the illustrations beside this script as cover.jpg and p01.jpg .. p14.jpg,
sized 1500x1875 (1.25x the 1200x1500 page box, for retina displays).

    python3 build_epub.py
    python3 validate_epub.py
"""
import datetime
import html
import os
import uuid
import zipfile

# ---------------------------------------------------------------- book text
T = u"Princess Lia and the Littlest Knight"
SUB = u"A tale of two brave hearts"
AU = u"Uncle Courtney"          # <- set to the author name you want published
DED = (u"For Lia and Laughlin — may you always be as brave as you are kind, "
       u"and may every star you wish on shine right back at you.")
SIGN = u"With all my love,<br/>your Uncle Courtney,<br/>who loves you both dearly."
B1 = (u"When the Great Star above the Kingdom of Everbright goes dim, it takes a brave "
      u"princess, the littlest knight, and one very lonely baby dragon to light it up again.")
B2 = (u"A bedtime adventure about holding hands, being brave, and the magic of a kind heart.")
CALT = (u"Princess Lia and Sir Laughlin stand hand in hand on a hilltop at night before a "
        u"glowing fairy-tale castle, a baby dragon peeking over the boy's shoulder and a "
        u"great golden star shining above the tallest tower.")

# (story text, alt text) for pages 1..14
P = [
    (u"Once upon a time, in the golden Kingdom of Everbright, there lived a little princess named Lia. She had sunshine hair, sky-blue eyes, and the kindest heart in all the land.",
     u"Princess Lia twirls in her rose-pink gown in a sunny castle garden full of pink roses and butterflies."),
    (u"And wherever Princess Lia went, there toddled her favorite knight in the whole wide world — Sir Laughlin the Littlest. His sword was wooden. His helmet was wobbly. But his heart was as big as the castle. “Go-go!” he cheered. It was his favorite word.",
     u"Sir Laughlin marches proudly across a castle courtyard, his helmet over one eye and his wooden sword raised, while Lia giggles behind him."),
    (u"Every night, the Great Star above the castle filled Everbright with light and color. But one morning, Lia looked out her window and gasped. The roses were turning gray! The banners drooped! High above the tallest tower, the Great Star had gone dim.",
     u"Lia looks worried at an arched castle window while the kingdom outside fades to gray beneath a dim star."),
    (u"“Someone has to bring back the light,” said Princess Lia, putting on her bravest face. Sir Laughlin lifted his little wooden sword. “Go-go!” And so, hand in hand, the two marched out through the great castle gates.",
     u"Lia and Laughlin walk hand in hand through enormous open castle gates toward a winding path and golden morning light."),
    (u"They tramped into the Whispering Woods, where the trees hummed lullabies and fireflies lit the path like tiny floating lanterns. “Hello, trees!” called Lia. The leaves waved back.",
     u"The two children walk a mossy forest path lit by hundreds of golden fireflies beneath giant friendly trees."),
    (u"At the Giggling Brook, they hopped from stone to stone. Hop! Hop! Whoops — Laughlin slipped! But quick as a wish, Lia caught his hand. “I’ve got you, little knight,” she said. “We stick together.”",
     u"Laughlin wobbles on a stepping stone in a sparkling brook while Lia catches his hand to steady him."),
    (u"Deep in the woods, a silver owl swooped down. “Whoo seeks the light?” she asked. “We do!” said Lia. The owl blinked her moon-round eyes. “The Great Star fell from the sky… into the Dragon’s Cave on Moonberry Hill.”",
     u"A silver owl on a low branch speaks to the two children at twilight among glowing purple moonberry bushes."),
    (u"A dragon?! Lia’s tummy did a flip-flop. But she squeezed Laughlin’s hand, and Laughlin squeezed right back. That is how brave works — it’s easier when you hold hands. Up, up Moonberry Hill they climbed, all the way to the deep, dark cave.",
     u"Lia and Laughlin climb a purple flowered hillside at night toward a cave mouth glowing with warm light."),
    (u"But inside the cave there was no big scary dragon at all. There was a baby dragon — small and round as a puppy — curled around the glowing Great Star. And the baby dragon was… crying. Plip. Plip. Plip.",
     u"A tiny pink and gold baby dragon curls around a radiant golden star inside a cave, crying sparkling tears."),
    (u"“I’m sorry,” sniffled the little dragon. “My name is Ember. I was cold, and I was lonely, and the star was so warm… I didn’t know the whole kingdom would go gray.”",
     u"Ember the baby dragon looks up with a tear on its cheek as Lia kneels to listen and Laughlin peeks from behind her."),
    (u"Princess Lia did not draw a sword. Princesses like Lia know a better magic. She wrapped Ember in the biggest, warmest hug. “You don’t have to be lonely anymore,” she said. “Come home with us.” Laughlin patted Ember’s nose. “Go-go!”",
     u"Lia hugs Ember the baby dragon in a burst of golden light while Laughlin gently pats the dragon's nose."),
    (u"So Ember stretched her little wings — flap, flap, WHOOSH! — and flew Lia and Laughlin up, up, past the clouds, to hang the Great Star back in the sky. It burst into light! And every color came flooding home: pink for the roses, purple for the banners, gold for every tower.",
     u"The children ride the flying baby dragon high above the kingdom, placing the blazing golden star back in the starry sky as color floods the land below."),
    (u"That night, the castle held the grandest ball Everbright had ever seen — for Princess Lia, Sir Laughlin the Littlest, and Ember, the newest friend of the kingdom. Because the bravest thing of all isn’t a sword or a crown. It’s a kind heart.",
     u"Lia twirls at a joyful castle ball with Laughlin dancing beside her and Ember wearing a tiny bow, under glowing chandeliers and confetti."),
    (u"And when the music grew soft and the candles grew sleepy, the littlest knight climbed onto the princess’s shoulder and closed his eyes. High above the castle, the Great Star shone its brightest — right over two brave hearts. Goodnight, Lia. Goodnight, Laughlin. The end.",
     u"On a quiet castle balcony at night, Laughlin sleeps against Lia's shoulder with Ember curled at their feet beneath a huge glowing star."),
]

# ---------------------------------------------------------------- build
W, H = 1200, 1500
UID = 'urn:uuid:' + str(uuid.uuid5(uuid.NAMESPACE_URL, 'lia-laughlin-storybook-v1'))
MOD = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
YEAR = datetime.datetime.now().year


def doc(title, cls, body):
    return (u'<?xml version="1.0" encoding="utf-8"?>\n<!DOCTYPE html>\n'
            u'<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en" xml:lang="en">\n'
            u'<head><meta charset="utf-8"/><title>%s</title>'
            u'<meta name="viewport" content="width=%d, height=%d"/>'
            u'<link rel="stylesheet" type="text/css" href="../css/book.css"/></head>\n'
            u'<body class="%s">%s</body>\n</html>\n' % (html.escape(title), W, H, cls, body))


CSS = u"""@charset "utf-8";
html,body{margin:0;padding:0;width:%(w)dpx;height:%(h)dpx;font-family:Georgia,"Iowan Old Style",Palatino,serif;-webkit-text-size-adjust:none;}
.page{position:relative;width:%(w)dpx;height:%(h)dpx;overflow:hidden;}
img.art{position:absolute;top:0;left:0;width:%(w)dpx;height:%(h)dpx;}
.panel{position:absolute;left:52px;right:52px;bottom:46px;background:#FFF9EE;border:2px solid #C9A227;
 border-radius:24px;padding:30px 40px;box-shadow:0 8px 26px rgba(20,14,44,.35);}
.panel p{margin:0;font-size:31px;line-height:1.44;color:#3A2F4F;text-align:center;}
.ctitle{position:absolute;left:0;right:0;bottom:0;padding:70px 70px 62px;text-align:center;color:#FFF6DF;
 background:linear-gradient(rgba(20,14,44,0),rgba(20,14,44,.86) 46%%);}
.ctitle h1{margin:0;font-size:72px;line-height:1.1;font-weight:700;text-shadow:0 3px 16px rgba(0,0,0,.6);}
.ctitle .rule{width:250px;height:3px;margin:22px auto;background:#C9A227;}
.ctitle .sub{margin:0;font-size:30px;font-style:italic;color:#FFE9A0;}
.ctitle .by{margin:26px 0 0;font-size:26px;letter-spacing:.09em;color:#FFF6DF;}
body.paper{background:#FFF9EE;}
.ded{display:block;}
.dedbox{position:absolute;left:120px;right:120px;top:50%%;transform:translateY(-50%%);text-align:center;color:#4A3C63;}
.dedbox .star{font-size:56px;color:#C9A227;margin:0 0 34px;}
.dedbox p.d{margin:0;font-size:36px;line-height:1.65;font-style:italic;}
.dedbox .sign{margin:64px 0 0;font-size:31px;line-height:1.7;color:#9A7B1E;font-style:italic;}
body.back{background:#33265E;background:linear-gradient(#1C1740,#33265E 55%%,#5E4B8C);}
.backbox{position:absolute;left:120px;right:120px;top:50%%;transform:translateY(-50%%);text-align:center;color:#E9DFF7;}
.backbox .star2{font-size:74px;color:#FFD34E;margin:0 0 40px;text-shadow:0 0 30px rgba(255,211,78,.75);}
.backbox p.b{margin:0 0 30px;font-size:32px;line-height:1.7;font-style:italic;}
.backbox .names{margin:56px 0 0;font-size:24px;letter-spacing:.11em;color:#FFE9A0;line-height:1.7;}
""" % {'w': W, 'h': H}

files = {'css/book.css': CSS}

cov = (u'<div class="page"><img class="art" src="../images/cover.jpg" alt="%s"/>'
       u'<div class="ctitle"><h1>Princess Lia<br/>and the Littlest Knight</h1><div class="rule"></div>'
       u'<p class="sub">%s</p><p class="by">%s</p></div></div>'
       ) % (html.escape(CALT), html.escape(SUB), html.escape(AU))
files['text/cover.xhtml'] = doc(T, '', cov)

ded = (u'<div class="page ded"><div class="dedbox"><p class="star">&#10022;</p>'
       u'<p class="d">%s</p><p class="sign">%s</p></div></div>') % (html.escape(DED), SIGN)
files['text/dedication.xhtml'] = doc(u'Dedication', 'paper', ded)

for i, (txt, alt) in enumerate(P, 1):
    body = (u'<div class="page"><img class="art" src="../images/p%02d.jpg" alt="%s"/>'
            u'<div class="panel"><p>%s</p></div></div>') % (i, html.escape(alt), html.escape(txt))
    files['text/p%02d.xhtml' % i] = doc(u'Page %d' % i, '', body)

bk = (u'<div class="page"><div class="backbox"><p class="star2">&#9733;</p><p class="b">%s</p><p class="b">%s</p>'
      u'<p class="names">&#10022; MADE WITH LOVE FOR LIA &amp; LAUGHLIN<br/>BY THEIR UNCLE COURTNEY &#10022;</p>'
      u'</div></div>') % (html.escape(B1), html.escape(B2))
files['text/backcover.xhtml'] = doc(u'The End', 'back', bk)

order = ['cover', 'dedication'] + ['p%02d' % i for i in range(1, 15)] + ['backcover']

nav = (u'<nav epub:type="toc" id="toc" role="doc-toc"><h1>Contents</h1><ol>'
       + u'<li><a href="text/cover.xhtml">Cover</a></li>'
       + u'<li><a href="text/dedication.xhtml">Dedication</a></li>'
       + u''.join(u'<li><a href="text/p%02d.xhtml">Page %d</a></li>' % (i, i) for i in range(1, 15))
       + u'<li><a href="text/backcover.xhtml">The End</a></li></ol></nav>'
       + u'<nav epub:type="landmarks" hidden="hidden"><h2>Landmarks</h2><ol>'
       + u'<li><a epub:type="cover" href="text/cover.xhtml">Cover</a></li>'
       + u'<li><a epub:type="bodymatter" href="text/p01.xhtml">Start of Content</a></li></ol></nav>')
files['nav.xhtml'] = (u'<?xml version="1.0" encoding="utf-8"?>\n<!DOCTYPE html>\n'
                      u'<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en" xml:lang="en">\n'
                      u'<head><meta charset="utf-8"/><title>Contents</title></head>\n<body>%s</body>\n</html>\n') % nav

man = [u'<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>',
       u'<item id="css" href="css/book.css" media-type="text/css"/>',
       u'<item id="img-cover" href="images/cover.jpg" media-type="image/jpeg" properties="cover-image"/>']
for i in range(1, 15):
    man.append(u'<item id="img-p%02d" href="images/p%02d.jpg" media-type="image/jpeg"/>' % (i, i))
for n in order:
    man.append(u'<item id="x-%s" href="text/%s.xhtml" media-type="application/xhtml+xml"/>' % (n, n))
spine = u''.join(u'<itemref idref="x-%s"/>' % n for n in order)

opf = (u'<?xml version="1.0" encoding="utf-8"?>\n'
       u'<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="pub-id" xml:lang="en" prefix="rendition: http://www.idpf.org/vocab/rendition/#">\n'
       u'<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">\n'
       u'<dc:identifier id="pub-id">%s</dc:identifier>\n'
       u'<dc:title id="t1">%s</dc:title><meta refines="#t1" property="title-type">main</meta>\n'
       u'<dc:title id="t2">%s</dc:title><meta refines="#t2" property="title-type">subtitle</meta>\n'
       u'<dc:creator id="au">%s</dc:creator><meta refines="#au" property="role" scheme="marc:relators">aut</meta>\n'
       u'<dc:language>en</dc:language>\n<dc:date>%s-01-01T00:00:00Z</dc:date>\n'
       u'<dc:publisher>%s</dc:publisher>\n'
       u'<dc:rights>Copyright &#169; %d %s. All rights reserved.</dc:rights>\n'
       u'<dc:description>%s %s</dc:description>\n'
       u'<meta property="dcterms:modified">%s</meta>\n'
       u'<meta property="rendition:layout">pre-paginated</meta>\n'
       u'<meta property="rendition:orientation">portrait</meta>\n'
       u'<meta property="rendition:spread">none</meta>\n'
       u'<meta property="schema:accessMode">textual</meta>\n'
       u'<meta property="schema:accessMode">visual</meta>\n'
       u'<meta property="schema:accessModeSufficient">textual</meta>\n'
       u'<meta property="schema:accessibilityFeature">alternativeText</meta>\n'
       u'<meta property="schema:accessibilityFeature">structuralNavigation</meta>\n'
       u'<meta property="schema:accessibilityFeature">readingOrder</meta>\n'
       u'<meta property="schema:accessibilityHazard">none</meta>\n'
       u'<meta property="schema:accessibilitySummary">Fixed-layout picture book. All illustrations carry '
       u'descriptive alternative text and the full story is available as real, selectable text.</meta>\n'
       u'<meta name="cover" content="img-cover"/>\n'
       u'</metadata>\n<manifest>\n%s\n</manifest>\n<spine>%s</spine>\n</package>\n'
       ) % (UID, html.escape(T), html.escape(SUB), html.escape(AU), YEAR, html.escape(AU),
            YEAR, html.escape(AU), html.escape(B1), html.escape(B2), MOD, u'\n'.join(man), spine)
files['content.opf'] = opf

OUT = 'Princess-Lia-and-the-Littlest-Knight.epub'
z = zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED)
# mimetype must be the first entry and stored uncompressed
zi = zipfile.ZipInfo('mimetype')
zi.compress_type = zipfile.ZIP_STORED
z.writestr(zi, 'application/epub+zip')
z.writestr('META-INF/container.xml',
           u'<?xml version="1.0" encoding="utf-8"?>\n'
           u'<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">'
           u'<rootfiles><rootfile full-path="OEBPS/content.opf" '
           u'media-type="application/oebps-package+xml"/></rootfiles></container>\n')
for k, v in files.items():
    z.writestr('OEBPS/' + k, v.encode('utf-8'))
z.write('cover.jpg', 'OEBPS/images/cover.jpg')
for i in range(1, 15):
    z.write('p%02d.jpg' % i, 'OEBPS/images/p%02d.jpg' % i)
z.close()
print('EPUB %s  %.2f MB' % (OUT, os.path.getsize(OUT) / 1048576.0))
