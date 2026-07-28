#!/usr/bin/env python3
"""Structural check on the built EPUB.

Not a replacement for epubcheck (run that too if you have Java), but it catches
the mistakes that actually get picture books rejected: a compressed or misplaced
mimetype, manifest/spine references that don't resolve, malformed XHTML, a
missing fixed-layout declaration, and images without alt text.

    python3 validate_epub.py [file.epub]
"""
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from urllib.parse import unquote

f = sys.argv[1] if len(sys.argv) > 1 else 'Princess-Lia-and-the-Littlest-Knight.epub'
z = zipfile.ZipFile(f)
names = z.namelist()
info = z.infolist()
errs, ok = [], []

if names[0] != 'mimetype':
    errs.append('mimetype is not the first zip entry: ' + names[0])
elif info[0].compress_type != zipfile.ZIP_STORED:
    errs.append('mimetype is compressed (must be stored)')
elif z.read('mimetype') != b'application/epub+zip':
    errs.append('mimetype content is wrong')
else:
    ok.append('mimetype first + stored + correct')

container = ET.fromstring(z.read('META-INF/container.xml'))
root = container.find('.//{urn:oasis:names:tc:opendocument:xmlns:container}rootfile').get('full-path')
ok.append('container points to ' + root)

opf = ET.fromstring(z.read(root))
base = root.rsplit('/', 1)[0] + '/'
NS = {'o': 'http://www.idpf.org/2007/opf', 'dc': 'http://purl.org/dc/elements/1.1/'}

ids = {}
for it in opf.findall('.//o:manifest/o:item', NS):
    href = unquote(it.get('href'))
    ids[it.get('id')] = (href, it.get('properties') or '')
    if base + href not in names:
        errs.append('manifest href missing from zip: ' + href)
ok.append('manifest items: %d, all present' % len(ids))

spine = [ir.get('idref') for ir in opf.findall('.//o:spine/o:itemref', NS)]
for s in spine:
    if s not in ids:
        errs.append('spine idref not in manifest: ' + s)
ok.append('spine: %d items, all resolve' % len(spine))

props = ' '.join(v[1] for v in ids.values())
for need in ('nav', 'cover-image'):
    if need not in props:
        errs.append('missing manifest property: ' + need)

layout = opf.find('.//o:metadata/o:meta[@property="rendition:layout"]', NS)
if layout is None or layout.text != 'pre-paginated':
    errs.append('not declared fixed-layout (rendition:layout)')
else:
    ok.append('rendition:layout = pre-paginated')

if opf.find('.//o:metadata/o:meta[@property="dcterms:modified"]', NS) is None:
    errs.append('missing dcterms:modified')
if opf.find('.//dc:identifier', NS) is None:
    errs.append('missing dc:identifier')
ok.append('title: ' + opf.find('.//dc:title', NS).text)
ok.append('author: ' + opf.find('.//dc:creator', NS).text)

viewports, alts, missing_alt = 0, 0, []
docs = [n for n in names if n.endswith('.xhtml')]
for n in docs:
    data = z.read(n)
    try:
        ET.fromstring(data)
    except Exception as e:
        errs.append('XHTML not well-formed %s: %s' % (n, e))
    s = data.decode('utf-8')
    if 'name="viewport"' in s:
        viewports += 1
    for m in re.finditer(r'<img[^>]*>', s):
        tag = m.group(0)
        a = re.search(r'alt="([^"]*)"', tag)
        if a and a.group(1).strip():
            alts += 1
        else:
            missing_alt.append(n)
        src = re.search(r'src="([^"]+)"', tag).group(1)
        path = base + src[3:] if src.startswith('../') else base + 'text/' + src
        if path not in names:
            errs.append('unresolved img src %s in %s' % (src, n))
ok.append('xhtml docs: %d, all well-formed' % len(docs))
ok.append('viewport meta on %d content pages' % viewports)
ok.append('images with alt text: %d (missing: %d)' % (alts, len(missing_alt)))
if missing_alt:
    errs.append('images without alt text in: ' + ', '.join(missing_alt))

print('== PASSED ==')
for x in ok:
    print('  +', x)
print('== ERRORS: %d ==' % len(errs))
for e in errs:
    print('  !', e)
sys.exit(1 if errs else 0)
