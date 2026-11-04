"""Check the current Section 0 copy, native formulas, chart fallbacks, and scope."""
from pathlib import Path
import hashlib
import json
import re
import xml.etree.ElementTree as ET
from dom_tree import Node, Tree, clean

ROOT = Path(__file__).resolve().parents[1]
page = (ROOT/'index.html').read_text()
tree = Tree(page)
section = tree.by_id('section-0')
scope = json.loads((ROOT/'tests/fixtures/section0-opening-scope.json').read_text())
copy = (ROOT/'tests/fixtures/section0-opening-copy.md').read_text()
content = json.loads((ROOT/'src/copy/section0.json').read_text())

def digest(data):
    return hashlib.sha256(data).hexdigest()

def text(node):
    if isinstance(node,str):
        return node
    if node.tag=='sup':
        return ''
    if node.tag=='math':
        return '$'+clean(node.attrs['data-tex'])+'$'
    return ''.join(text(c) for c in node.children)

def plain_md(s):
    s = re.sub(r'\[\^[\w-]+\]', '', s)
    s = re.sub(r'\[([^]]+)\]\([^)]*\)', r'\1', s)
    s = re.sub(r'\\\((.*?)\\\)', lambda m:'$'+clean(m[1])+'$', s, flags=re.S)
    return clean(s.replace('**',''))

body = re.sub(r'<!--.*?-->', '', copy, flags=re.S)
body = re.sub(r'^\[\^[\w-]+\]:.*$', '', body, flags=re.M)
blocks = [s.strip() for s in re.split(r'\n\s*\n',body) if s.strip()]
expected = [plain_md(s) for s in blocks if not s.startswith(('#',r'\['))]
guide = 'Both constraints act on the whole matrix. Later, we will ask whether each row or column needs its own norm constraint.'
figure = tree.by_id('s0-update-figure')
opening = [n for n in section.children if isinstance(n,Node) and n.start < figure.start]
assert [clean(text(n)) for n in opening if n.tag=='p' and n.text()!=guide] == expected
assert next(n.text() for n in opening if n.tag=='h2') == 'Preparation: Candidate Constraints and the Optimizer'
assert 'What do we constrain?' not in section.text()
assert 'How does MACRO update the weights?' in section.text()
assert 'How do we train with a weight constraint, and how do we choose its radius?' not in section.text()
expected_math = [clean(s[2:-2]) for s in blocks if s.startswith(r'\[')]
actual_math = [m for n in opening if n.attrs.get('class')=='formula-block' for m in n.all() if m.tag=='math']
assert [clean(m.attrs['data-tex']) for m in actual_math] == expected_math
for m in section.all():
    if m.tag=='math':
        ET.fromstring(page[m.start:m.end+7])
objective = actual_math[0]
brackets = [n for n in objective.all() if n.tag=='mo' and n.text() in ('(',')')]
assert len(brackets)==2 and all(n.attrs.get('stretchy')=='false' for n in brackets)
assert brackets[0].parent is brackets[1].parent
assert not any(n.tag=='munder' for n in brackets[0].parent.all())
callback = next(n for n in opening if n.tag=='p' and 'update-to-weight ratio' in n.text())
assert any(n.attrs.get('href')=='#section-3' and n.attrs.get('class')=='s0-section-link' for n in callback.all())

# The accepted convergence note, other source groups, and unrelated files stay exact.
source = (ROOT/'src/sections/0.html').read_text()
start = source.index('<details class="source-detail">\n<summary>Convergence result</summary>')
convergence_source = source[start:source.index('</details>',start)+len('</details>')]
assert digest(convergence_source.encode()) == scope['protected_convergence_sha256']
sources = (ROOT/'src/sources.html').read_text()
assert digest(sources[:sources.index('<div id="section-0-sources"')].encode()) == scope['sources_prefix_sha256']
assert digest(sources[sources.index('<div id="section-1-sources"'):].encode()) == scope['sources_suffix_sha256']
for filename,sha in scope['files'].items():
    assert digest((ROOT/filename).read_bytes()) == sha, filename
css = (ROOT/'src/styles.css').read_bytes()
assert digest(css[:scope['previous_css']['length']]) == scope['previous_css']['sha256']

# The stage formulas remain exact; both JS content and noscript use the new copy.
assert [s['formula'] for s in content['stages']] == scope['section0_math_formulas']
assert content['stage_instruction']=='Select a stage to see its role.'
assert tree.by_id('s0-update-caption').text()=='Figure 0.1'
assert not any(n.tag=='figcaption' for n in figure.all())
assert 'figure01_caption' not in content
assert len(content['captions'])==1 and 'Figure 0.2.' in content['captions'][0]
fallback = next(n for n in figure.all() if n.attrs.get('class')=='s0-stage-fallback')
items = [n for n in fallback.children if isinstance(n,Node)]
for stage,item in zip(content['stages'],items):
    paragraphs = [n for n in item.children if isinstance(n,Node) and n.tag=='p']
    target = [stage['explanation']]+([stage['definition']] if stage['definition'] else [])
    assert [page[n.inner:n.end] for n in paragraphs] == target
    formula = next(n for n in item.all() if n.tag=='math' and n.attrs.get('display')=='block')
    assert page[formula.start:formula.end+7] == stage['formula']
assert len(items)==5
assert 'central to our convergence analysis' in content['stages'][1]['definition']
assert 'spectral steepest-descent step' in content['stages'][2]['definition']

# Radius/oblique v2: exact reviewed paragraphs and formulas, with compact columns.
radius_scope = json.loads((ROOT/'tests/fixtures/section0-radius-scope.json').read_text())
radius_copy = (ROOT/'tests/fixtures/section0-radius-copy.md').read_text()
radius_body = re.sub(r'<!--.*?-->', '', radius_copy, flags=re.S)
radius_body = re.sub(r'^\[\^[\w-]+\]:.*$', '', radius_body, flags=re.M)
radius_blocks = [s.strip() for s in re.split(r'\n\s*\n',radius_body) if s.strip()]
expected_paragraphs = [plain_md(s) for s in radius_blocks if not s.startswith(('#','<','|',r'\['))]
cutoff = next(n.start for n in section.children if isinstance(n,Node) and 'How do we choose the radius?' in n.text())
def excluded(n):
    while n is not section:
        if n.attrs.get('id')=='s0-oblique-figure' or n.attrs.get('class')=='s0-radius-column':
            return True
        n = n.parent
    return False
actual_paragraphs = [clean(text(n)) for n in section.all() if n.tag=='p' and n.start>cutoff and not excluded(n)]
assert [guide]+actual_paragraphs == expected_paragraphs
expected_formulas = [clean(s[2:-2]) for s in radius_blocks if s.startswith(r'\[')]
actual_formulas = [clean(n.attrs['data-tex']) for n in section.all() if n.tag=='math' and n.attrs.get('display')=='block' and n.start>cutoff and not excluded(n)]
assert actual_formulas == expected_formulas
columns = [n for n in section.all() if n.attrs.get('class')=='s0-radius-column']
assert len(columns)==2
expected_columns = [
    [r'R_{\mathrm{fro}}=r\sqrt p',r'\mathbb E_G[r_Y^2\mid X]=r^2r_X^2'],
    [r'R_{\mathrm{spec}}=r\sqrt{p/n}',r'r_Y=r\,r_X\quad\text{with high probability}'],
]
for column,formulas in zip(columns,expected_columns):
    assert [n.attrs['data-tex'] for n in column.all() if n.tag=='math']==formulas
    assert not any(s in column.text() for s in ['Theta','Scale relation','Result'])
proposition = tree.by_id('s0-radius-proposition')
oblique = tree.by_id('s0-oblique-details')
assert 'open' not in proposition.attrs and 'open' not in oblique.attrs
assert next(n.text() for n in proposition.all() if n.tag=='summary')=='Proposition 1: Radius selection at initialization'
assert 'n/p=O(1)' in proposition.text() and 'Remark 1' in proposition.text()
assert 'The probability is over' in proposition.text() and 'independent standard normal entries' in proposition.text()
assert not any(n.attrs.get('id')=='s0-constraint-slice' for n in section.all())
for obsolete in ['Frobenius scale after initialization','with probability 1','no significant differences','kappa','s0-slice-']:
    assert obsolete not in source
assert source.count('With the constraints and radii in place')==1
prefix = source[:source.index('<div class="section-head"><span>03</span>')].replace('<p>'+guide+'</p>','')
assert digest(prefix.encode())==radius_scope['opening_without_visual_sha256']
source_figure = Tree(source).by_id('s0-oblique-figure')
assert digest(source[source_figure.start:source_figure.end+9].encode())==radius_scope['figure02_sha256']
for filename,sha in radius_scope['files'].items():
    assert digest((ROOT/filename).read_bytes())==sha,filename
other_copy = {k:v for k,v in content.items() if k!='post_figure_observation'}
assert digest(json.dumps(other_copy,sort_keys=True).encode())==radius_scope['figure_copy_without_observation_sha256']
assert content['post_figure_observation'] in actual_paragraphs
def unrelated_css(s):
    s=re.sub(r'/\*.*?\*/','',s,flags=re.S)
    s=re.sub(r'[^{}]*(?:#s0-constraint-slice|#s0-radius-proposition|#section-0\s+\.s0-radius)[^{}]*\{[^{}]*\}','',s)
    s=re.sub(r'@media[^{}]*\{\s*\}','',s)
    return re.sub(r'\s+','',s)
assert digest(unrelated_css(css.decode()).encode())==radius_scope['unrelated_css_sha256']

# Extract the replacement's actual visible copy, formulas, and disclosure text.
review = ['# Section 0 — extracted from latest/index.html', '']
def collect(node):
    if node.tag in ('h2','h3','h4'):
        review.extend(['## '+clean(text(node)), ''])
    elif node.tag=='p' or node.tag=='figcaption':
        review.extend([clean(text(node)), ''])
    elif node.tag=='math' and node.attrs.get('display')=='block':
        review.extend(['$$', clean(node.attrs['data-tex']), '$$', ''])
    elif node.tag=='summary':
        review.extend(['**Closed disclosure: '+node.text()+'**', ''])
    elif node.tag=='table':
        rows=[n for n in node.all() if n.tag=='tr']
        for i,row in enumerate(rows):
            cells=[n for n in row.children if isinstance(n,Node)]
            review.append('| '+' | '.join(clean(text(n)) for n in cells)+' |')
            if i==0:
                review.append('| '+' | '.join('---' for _ in cells)+' |')
        review.append('')
    elif node.tag not in ('sup','svg'):
        for child in node.children:
            if isinstance(child,Node):
                collect(child)
for node in opening:
    collect(node)
review += ['## Figure 0.1', '', content['stage_instruction'], '']
for i,stage in enumerate(content['stages'],1):
    review += ['### '+str(i)+'. '+stage['label'], '']
    collect(Tree(stage['formula']).root)
    review += [clean(text(Tree(stage['explanation']).root)), '']
    if stage['definition']:
        review += [clean(text(Tree(stage['definition']).root)), '']
convergence = next(n for n in section.children if isinstance(n,Node) and n.tag=='details')
collect(convergence)
for node in section.children:
    if isinstance(node,Node) and node.start>=cutoff:
        collect(node)
(ROOT/'SECTION_0_COPY_REVIEW.md').write_text('\n'.join(review)+'\n')
print('PASS: exact opening and radius/oblique copy, compact radius formulas, closed Proposition, unchanged algorithm/convergence/Figure 0.2, protected files and unrelated styles. Review extracted from HTML.')
