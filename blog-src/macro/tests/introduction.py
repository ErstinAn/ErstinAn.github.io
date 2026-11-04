"""Verify the reviewed introduction against the delivered HTML, and extract its copy."""
from pathlib import Path
import base64
import datetime
import hashlib
import json
import re
import xml.etree.ElementTree as ET
from dom_tree import Node, Tree, clean

ROOT = Path(__file__).resolve().parents[1]
page = (ROOT / 'index.html').read_text()
tree = Tree(page)
intro = tree.by_id('introduction')
note = tree.by_id('intro-math-note')
sources = tree.by_id('intro-sources')
copy = (ROOT / 'tests/fixtures/introduction-copy.md').read_text()
scope = json.loads((ROOT / 'tests/fixtures/introduction-scope.json').read_text())
definitions = dict(re.findall(r'^\[\^([\w-]+)\]: (.+)$', copy, re.M))

def text(node, math=False):
    if isinstance(node, str):
        return node
    if node.tag == 'sup' or node.attrs.get('class') == 'footnote-backref':
        return ''
    if node.tag == 'math' and math:
        return '$' + node.attrs['data-tex'] + '$'
    return ''.join(text(child, math) for child in node.children)

def plain_md(value):
    value = re.sub(r'\[\^[\w-]+\]', '', value)
    value = value.replace('***', '').replace('**', '').replace('*', '')
    return clean(value)

body = re.sub(r'<!--.*?-->', '', copy, flags=re.S)
body = re.sub(r'^\[\^[\w-]+\]: .+$', '', body, flags=re.M)
blocks = [block.strip() for block in re.split(r'\n\s*\n', body) if block.strip()]
paragraphs = [b for b in blocks if not b.startswith('|') and b != '**What are we normalizing?**']
actual = [n for n in intro.children if isinstance(n, Node) and n.tag == 'p']
assert [clean(text(n)) for n in actual] == [plain_md(b) for b in paragraphs]
assert not any(n.tag in {'h1','h2','h3'} for n in intro.all())
assert page.index('<h1>') < intro.start < next(n.start for n in tree.root.all() if n.tag == 'nav')
assert next(n.text() for n in tree.root.all() if n.tag == 'h1') == scope['previous_title']
header = next(n for n in tree.root.all() if n.attrs.get('class') == 'article-header')
assert not any(n.tag == 'p' for n in header.all()), 'Old visible summary was retained'

diagram = tree.by_id('intro-comparison')
rows = [n for n in diagram.all() if n.attrs.get('class') == 'intro-row']
expected_rows = [line.strip('|').split('|') for line in next(b for b in blocks if b.startswith('|')).splitlines()[2:]]
assert len(rows) == 3
for row, expected in zip(rows, expected_rows):
    assert [clean(text(n)) for n in row.children if isinstance(n, Node)] == [plain_md(cell) for cell in expected]
    links = [n for n in row.all() if n.tag == 'a' and n.parent.tag != 'sup']
    assert len(links) in (2,3)
    assert all(n.attrs['href'].startswith('#intro-fn:') for n in links)
assert 'Mano' in text(rows[1]) and all('Mano' not in text(row) for row in (rows[0],rows[2]))
assert 'open' not in note.attrs and note.tag == 'details'
assert next(n.text() for n in note.all() if n.tag == 'summary') == 'From normalization to constrained optimization'

math_copy = (ROOT / 'tests/fixtures/introduction-math.md').read_text()
math_tex = re.findall(r'\\\((.*?)\\\)|\\\[(.*?)\\\]', math_copy, re.S)
expected_tex = [a or b for a,b in math_tex]
delivered_math = [n for n in note.all() if n.tag == 'math']
compact = lambda s: re.sub(r'\s+', '', s)
assert [compact(n.attrs['data-tex']) for n in delivered_math] == [compact(t) for t in expected_tex]
for formula in delivered_math:
    ET.fromstring(page[formula.start:formula.end+len('</math>')])
expected_note = re.sub(r'\\\((.*?)\\\)', lambda m: '$'+m[1]+'$', math_copy, flags=re.S)
expected_note = re.sub(r'\\\[.*?\\\]', '', expected_note, flags=re.S)
expected_note = re.sub(r'\[\^[\w-]+\]', '', expected_note)
expected_note_paragraphs = [clean(s) for s in re.split(r'\n\s*\n', expected_note) if s.strip()]
assert [clean(text(n,True)) for n in note.all() if n.tag == 'p'] == expected_note_paragraphs
assert sum(n.attrs.get('display') == 'block' for n in delivered_math) == 3
assert sum(n.attrs.get('class') == 'intro-question' for n in intro.all()) == 1
assert not any(n.tag in {'script','iframe','svg'} for n in intro.all())

# Match the current reviewed source after removing the two media includes.
image_scope = json.loads((ROOT/'tests/fixtures/introduction-images-scope.json').read_text())
original_intro = (ROOT/'src/introduction.html').read_text()
for fragment in ('post', 'weights'):
    original_intro = original_intro.replace('{{include:src/intro-media/'+fragment+'.html}}\n\n', '')
assert hashlib.sha256(original_intro.encode()).hexdigest() == image_scope['src/introduction.html']['sha256']
assert hashlib.sha256((ROOT/'src/introduction-sources.html').read_bytes()).hexdigest() == image_scope['src/introduction-sources.html']['sha256']
previous_css = image_scope['src/styles.css']
assert hashlib.sha256((ROOT/'src/styles.css').read_bytes()[:previous_css['length']]).hexdigest() == previous_css['sha256']
post = tree.by_id('intro-wen-post-figure')
muse = tree.by_id('intro-muse-figure')
qwen = tree.by_id('intro-qwen-comparison')
qwen_figure = tree.by_id('intro-qwen-figure')
assert actual[1].end < post.start < post.end < actual[2].start
assert actual[2].end < qwen.start < qwen.end < actual[3].start
assert qwen.start < qwen_figure.start < qwen_figure.end < muse.start < muse.end < qwen.end
assert qwen.tag == 'details' and 'open' not in qwen.attrs
assert next(n.text() for n in qwen.all() if n.tag == 'summary') == 'Comparison between Qwen3-8B and Muse Glimmer'
assert post.parent is intro and qwen_figure.parent is qwen and muse.parent is qwen
assert [clean(n.text()) for n in qwen.children if isinstance(n,Node) and n.tag == 'p'] == [
    'In these plots, weight RMS varies across Qwen3-8B layers and matrix types. Muse Glimmer shows a much more uniform pattern near 0.006.',
    'The plots use different vertical-axis ranges. Compare the patterns and labeled values, not bar heights alone.',
]
assert actual[3].text() == "Why might keeping weight scale fixed help a model learn? That's the puzzle we want to explore."
for obsolete in ['intro-reasoning-evidence','intro-yue-figure','intro-fn:reasoning','intro-fnref:reasoning','pass@k','AIME']:
    assert obsolete not in page
assert all('open' not in n.attrs for n in intro.all() if n.attrs.get('class') == 'intro-image-zoom')
media = json.loads((ROOT/'references/introduction/verification.json').read_text())
images = {
    'intro-wen-post-figure':('references/introduction/kaiyue-wen-post.png','image/png',1),
    'intro-muse-figure':('references/introduction/muse-glimmer-weight-rms.png','image/png',2),
    'intro-qwen-figure':('references/introduction/qwen3-weight-rms.png','image/png',2),
}
for ident,(filename,mime,count) in images.items():
    figure = tree.by_id(ident)
    children = [n for n in figure.children if isinstance(n,Node)]
    assert children[-1].tag == 'figcaption'
    nodes = [n for n in figure.all() if n.tag == 'img']
    assert len(nodes) == count
    data = (ROOT/filename).read_bytes()
    for n in nodes:
        assert n.attrs['src'].startswith('data:'+mime+';base64,')
        assert base64.b64decode(n.attrs['src'].split(',',1)[1],validate=True) == data
        assert n.attrs['alt'] and int(n.attrs['width']) > 0 and int(n.attrs['height']) > 0
    if ident == 'intro-wen-post-figure':
        assert hashlib.sha256(data).hexdigest() == image_scope[filename]['sha256']
        assert nodes[0].attrs['width'] == '843' and nodes[0].attrs['height'] == '255'
    else:
        assert hashlib.sha256(data).hexdigest() == media['sha256'][Path(filename).name]
        zooms = [n for n in figure.all() if n.tag == 'details']
        assert len(zooms) == 1 and 'open' not in zooms[0].attrs
assert sum(n.tag == 'img' for n in intro.all()) == 5
assert media['primary_post'] in page and media['qwen_comparison_reply'] in page
assert [clean(n.text()) for n in qwen.all() if n.attrs.get('class') == 'intro-figure-label'] == ['Qwen3-8B','Muse Glimmer']
captions = {
    'intro-wen-post-figure': "Kaiyue Wen's post about weight scales in Muse Glimmer.",
    'intro-qwen-figure': 'Qwen3-8B: weight RMS by layer and matrix type. From the same thread.',
    'intro-muse-figure': "Muse-Glimmer-30B: weight RMS by layer and matrix type. From Kaiyue Wen's post.",
}
for ident,caption in captions.items():
    assert next(n.text() for n in tree.by_id(ident).all() if n.tag == 'figcaption') == caption

entries = [n for n in sources.all() if n.tag == 'li']
assert [n.attrs['id'] for n in entries] == ['intro-fn:'+key for key in definitions]
for entry, definition in zip(entries,definitions.values()):
    assert clean(text(entry)) == plain_md(definition)
wen = tree.by_id('intro-fn:wen')
assert not any(n.tag=='a' and n.attrs['href'].startswith('http') for n in wen.all())
assert sum('0.006' in n.text() for n in intro.all() if n.tag=='strong') == 1
for n in intro.all():
    if n.tag == 'sup':
        a = next(c for c in n.children if isinstance(c,Node))
        key = a.attrs['href'].split(':')[-1]
        assert a.text() == str(list(definitions).index(key)+1)
        assert a.attrs['aria-label'] == 'Reference '+a.text()
assert sum(n.tag=='footer' for n in tree.root.all()) == 1
assert 'open' not in tree.by_id('article-sources-panel').attrs
assert any(n.attrs.get('href')=='#intro-fn:macro' for n in tree.by_id('section-3-sources').all())
for fragment in ['VISUAL I-B','OPTIONAL I-C','You should add more','WEN_POST_URL','confirm before publication']:
    assert fragment not in page

for filename, expected_hash in scope['files'].items():
    assert hashlib.sha256((ROOT/filename).read_bytes()).hexdigest() == expected_hash, filename
css = (ROOT/'src/styles.css').read_bytes()
assert hashlib.sha256(css[:scope['previous_css']['length']]).hexdigest() == scope['previous_css']['sha256']
assert b'@media(max-width:600px)' in css[scope['previous_css']['length']:]

# This review is extracted from the generated page, not copied from the input Markdown.
def review_inline(node):
    if isinstance(node,str):
        return node
    if node.attrs.get('class')=='footnote-backref':
        return ''
    if node.tag=='math':
        return '$'+clean(node.attrs['data-tex'])+'$'
    if node.tag=='sup':
        return '['+node.text()+']'
    content=''.join(review_inline(c) for c in node.children)
    if node.tag=='strong':
        return '**'+content+'**'
    if node.tag=='em':
        return '*'+content+'*'
    if node.tag=='a' and node.attrs.get('href','').startswith('http'):
        return '['+content+']('+node.attrs['href']+')'
    return content

review = ['# Introduction — extracted from latest/index.html', '']
for node in intro.children:
    if not isinstance(node,Node):
        continue
    if node.tag=='p':
        review += [clean(review_inline(node)), '']
    elif node.attrs.get('id')=='intro-comparison':
        review += ['**'+tree.by_id('intro-comparison-title').text()+'**', '',
                   '| Object | Examples |', '| --- | --- |']
        for row in rows:
            cells=[clean(review_inline(n)) for n in row.children if isinstance(n,Node)]
            review.append('| '+' | '.join(cells)+' |')
        review.append('')
    elif node.attrs.get('id')=='intro-math-note':
        review += ['<details>', '<summary>'+next(n.text() for n in node.all() if n.tag=='summary')+'</summary>', '']
        for n in node.all():
            if n.tag=='p':
                review += [clean(review_inline(n)), '']
            elif n.tag=='math' and n.attrs.get('display')=='block':
                review += ['$$', clean(n.attrs['data-tex']), '$$', '']
        review += ['</details>', '']
    elif node.tag in {'figure','details'}:
        for n in node.all():
            if n.tag=='summary':
                review += ['**Closed disclosure:** '+n.text(), '']
            elif n.tag in ('p','figcaption'):
                review += [clean(review_inline(n)), '']
            elif n.tag=='img':
                review += ['*Image alt text:* '+n.attrs['alt'], '']
review += ['## Shared Sources · Intro / Background', '']
for i,entry in enumerate(entries):
    review.append(str(i+1)+'. '+clean(review_inline(entry)))
(ROOT/'INTRODUCTION_COPY_REVIEW.md').write_text('\n'.join(review)+'\n')
report = {
    'generated_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'html_sha256':hashlib.sha256(page.encode()).hexdigest(),
    'status':'passed',
    'main_paragraphs_exact':len(actual),
    'comparison_rows_exact':len(rows),
    'math_note_exact':True,
    'native_mathml_formulas':len(delivered_math),
    'shared_reference_entries':len(entries),
    'protected_source_files_unchanged':len(scope['files']),
    'introduction_matches_reviewed_copy':True,
    'original_png_images_byte_identical':True,
    'post_screenshot_byte_identical':True,
    'rms_comparison_closed_and_stacked':True,
    'embedded_images':5,
    'browser_status':'not_run_pending_local_acceptance',
    'not_run':['Desktop/mobile rendering and screenshots','Browser console and native keyboard/touch navigation','Direct offline file:// opening'],
    'source_note':'User-supplied screenshot preserved byte-for-byte. Existing RMS PNGs and post links retained without a new online check. Reviewed prose and shared source entries validated against the current copy fixture.'
}
(ROOT/'tests/introduction-results.json').write_text(json.dumps(report,indent=2)+'\n')
print('PASS: exact reviewed introduction, original screenshot and RMS images, closed stacked comparison, 12 shared references, '+str(len(scope['files']))+' unchanged source files; extracted review saved.')

