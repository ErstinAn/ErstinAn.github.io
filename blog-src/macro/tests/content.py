"""Check the current standalone page, source graph and offline structure."""
from pathlib import Path
import json, re, sys
from dom_tree import Tree
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from build import render
page = (ROOT / 'index.html').read_text()
assert render() == page, 'Source and index.html differ'
tree = Tree(page)
nodes = list(tree.root.all())
ids = [n.attrs['id'] for n in nodes if 'id' in n.attrs]
assert len(ids) == len(set(ids)), 'Duplicate IDs'
chapters = [n for n in nodes if n.attrs.get('class') == 'chapter']
assert [n.attrs['id'] for n in chapters] == [f'section-{i}' for i in range(5)]
for tag in ['html','body','main','h1','footer']:
    assert sum(n.tag == tag for n in nodes) == 1, tag
nav = next(n for n in nodes if n.tag == 'nav')
assert [n.text() for n in nav.all() if n.tag == 'a'] == [
    '0 · MACRO','1 · RMSNorm','2 · Weight Decay','3 · Low Precision','4 · Results']
for node in nodes:
    for attr in ['aria-labelledby','aria-describedby','aria-controls']:
        for target in node.attrs.get(attr,'').split(): assert target in ids, target
    if node.attrs.get('href','').startswith('#'): assert node.attrs['href'][1:] in ids
    if 'src' in node.attrs: assert node.attrs['src'].startswith('data:')
    if node.tag == 'link': assert node.attrs.get('rel') != 'stylesheet'
assert not re.search(r'\b(?:fetch|XMLHttpRequest|WebSocket)\s*\(',page)
assert not re.search(r'@import\b|url\(\s*["\']?https?://',page)
assert '/Users/evelyn/' not in page
assert '{{include:' not in page
assert '{{image:' not in page
assert sum(n.attrs.get('class') == 'takeaway' for n in nodes) == 4
assert not any(n.attrs.get('class') == 'takeaway' for n in chapters[0].all())
for i in (1,2,3): assert not any(n.attrs.get('class') == 'chapter-subtitle' for n in chapters[i].all())
for ident in ['s3-rounding-thresholds','s3-optimizer-ratios','s3-cancellation-model','s4-benchmark-details']:
    node = tree.by_id(ident)
    assert node.tag == 'details' and 'open' not in node.attrs
for ident in ['rounding','ending']:
    assert not any(n.attrs.get('class') == 'section-head' for n in tree.by_id(ident).all())
for ident,number in [('constraints','01'),('training','02'),('model','03')]:
    head = next(n for n in tree.by_id(ident).all() if n.attrs.get('class') == 'section-head')
    assert next(n.text() for n in head.all() if n.tag == 'span') == number
assert tree.by_id('model-metric-help').text() == 'Retention measures absolute-update magnitude. Cancellation counts coordinates.'
assert [n for n in chapters[4].children if hasattr(n,'tag')][-1].attrs.get('class') == 'takeaway'
sources = tree.by_id('article-sources-panel')
methods = tree.by_id('article-methods-panel')
for node in (sources,methods): assert node.tag == 'details' and 'open' not in node.attrs
assert sources.parent is methods.parent and sources.end < methods.start
assert tree.by_id('run-details') in list(methods.all())
assert tree.by_id('s0-oblique-details').attrs.get('open') is None
assert 'Preview: Sections 0, 1, 2, and 3.' not in page
assert 's2-mean-balance-details' not in ids
assert 'manual-details' not in ids
assert sum(n.tag == 'figure' for n in chapters[4].all()) == 3
for ident in ['s4-warmup-caption','s4-warmup-source-detail']:
    text = tree.by_id(ident).text()
    assert 'author slide 44' in text and 'Paper Table 12' in text
for variable,filename in [
 ('S0Data','data/section0.json'),('S1Data','data/section1.json'),
 ('S2Data','data/section2.json'),('S2Meta','data/rotation-metadata.json'),
 ('S2Tables','data/weight-decay.json'),('S4Data','data/section4.json')]:
    embedded = json.loads(page.split('const '+variable+'=')[1].split(';\n')[0])
    assert embedded == json.loads((ROOT/filename).read_text()), variable
assert json.loads(tree.by_id('figure-data').text(False)) == json.loads((ROOT/'data/section3.json').read_text())
assert sum(n.tag == 'svg' for n in nodes) == 21
assert 's2-adamw-note' not in ids and 's2-fnref2:rotation' not in ids
for ident in ['s2-norm-equilibrium','s2-exact-angle','s2-spectral-angle-details']:
    node = tree.by_id(ident)
    assert node.tag == 'details' and 'open' not in node.attrs
for row in tree.by_id('s2-norm-equilibrium').all():
    if row.attrs.get('class') == 'math-norm':
        fences = [n for n in row.children if hasattr(n,'tag') and n.tag == 'mo']
        assert len(fences) == 2
        assert fences[0].text() == fences[1].text() == '‖'
        for attr in ['stretchy','symmetric','lspace','rspace']:
            assert fences[0].attrs.get(attr) == fences[1].attrs.get(attr)
print('PASS: five chapters, shared disclosures, standalone offline resources, all embedded datasets, 21 static SVGs and current controls.')
