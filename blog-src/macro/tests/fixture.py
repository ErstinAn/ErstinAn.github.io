"""Generate the DOM contract in a temporary directory, never a saved page snapshot."""
from dom_tree import Tree

def fixture(page):
    doc = Tree(page)
    nodes = [n for n in doc.root.all() if n.tag not in {"script", "style"}]
    indices = {id(n): i for i, n in enumerate(nodes)}
    rows = []
    for node in nodes:
        value = node.attrs.get("value", "")
        if node.tag == "select":
            options = [n for n in node.all() if n.tag == "option"]
            if options:
                selected = next((n for n in options if "selected" in n.attrs), options[0])
                value = selected.attrs.get("value", selected.text())
        rows.append({
            "tag": node.tag, "attrs": node.attrs, "parent": indices.get(id(node.parent)),
            "value": value,
            "innerHTML": doc.source[node.inner:node.end] if "id" in node.attrs else "",
            "textContent": node.text(False) if "id" in node.attrs else "",
        })
    return rows
