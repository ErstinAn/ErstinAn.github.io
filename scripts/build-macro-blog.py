"""Publish the reviewed MACRO article with minimal personal-site navigation."""
import argparse
import hashlib
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "blog-src/macro"
OUTPUT = ROOT / "dist/blog/macro/index.html"
SITE_CSS = """
/* Personal-site navigation; the reviewed article styles remain unchanged. */
.site-links{display:flex;align-items:center;gap:10px;font:14px/1.5 var(--sans);letter-spacing:0}
.site-links a{text-decoration:none}.site-links a:hover{text-decoration:underline}
.site-links span{color:var(--muted)}
"""
SITE_LINKS = '<div class="site-links" role="navigation" aria-label="Personal site"><a href="../../">Kang An</a><span aria-hidden="true">/</span><a href="../">Blog</a></div>'
CANONICAL = '<link rel="canonical" href="https://erstinan.github.io/blog/macro/">'


def render():
    spec = importlib.util.spec_from_file_location("macro_source_builder", SOURCE / "build.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    original = module.render()
    replacements = [
        ("</style>", SITE_CSS + "</style>"),
        ("</head>", CANONICAL + "</head>"),
        ('<div class="masthead">', '<div class="masthead">' + SITE_LINKS),
    ]
    exported = original
    for before, after in replacements:
        if exported.count(before) != 1:
            raise ValueError(f"Expected one export marker: {before}")
        exported = exported.replace(before, after, 1)
    restored = exported
    for before, after in reversed(replacements):
        restored = restored.replace(after, before, 1)
    if restored != original:
        raise ValueError("Export changed protected article content")
    return original.encode(), exported.encode()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    original, exported = render()
    if args.check:
        if not OUTPUT.exists() or OUTPUT.read_bytes() != exported:
            raise SystemExit("Published article is stale. Run python3 scripts/build-macro-blog.py")
    else:
        OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        OUTPUT.write_bytes(exported)
    print(f"{'Checked' if args.check else 'Built'} {OUTPUT.relative_to(ROOT)} ({len(exported):,} bytes)")
    print(f"Canonical article SHA-256: {hashlib.sha256(original).hexdigest()}")


if __name__ == "__main__":
    main()
