"""Small HTML tree with source offsets, used only by offline tests."""
from pathlib import Path
from html.parser import HTMLParser
import re

VOID = set('area base br col embed hr img input link meta param source track wbr mspace'.split())


class Node:
    def __init__(self, tag='', attrs=(), parent=None, start=0, inner=0):
        self.tag, self.attrs, self.parent = tag, dict(attrs), parent
        self.children, self.start, self.inner, self.end = [], start, inner, inner

    def all(self):
        yield self
        for child in self.children:
            if isinstance(child, Node):
                yield from child.all()

    def text(self, tex=True):
        if self.tag == 'math' and tex and 'data-tex' in self.attrs:
            return '$' + clean(self.attrs['data-tex']) + '$'
        return ''.join(c.text(tex) if isinstance(c, Node) else c for c in self.children)


class Tree(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.source, self.root = source, Node()
        self.stack = [self.root]
        self.lines = [0]
        self.lines += [m.end() for m in re.finditer('\n', source)]
        self.feed(source)

    def absolute_offset(self):
        line, col = self.getpos()
        return self.lines[line - 1] + col

    def handle_starttag(self, tag, attrs):
        start = self.absolute_offset()
        node = Node(tag, attrs, self.stack[-1], start, start + len(self.get_starttag_text()))
        self.stack[-1].children.append(node)
        if tag not in VOID:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.stack.pop()

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i].tag == tag:
                self.stack[i].end = self.absolute_offset()
                self.stack = self.stack[:i]
                break

    def handle_data(self, data):
        self.stack[-1].children.append(data)

    def by_id(self, id):
        return next(n for n in self.root.all() if n.attrs.get('id') == id)


def clean(text):
    return re.sub(r'\s+', ' ', text).strip()


