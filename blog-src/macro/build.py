"""Assemble the current sources into one self-contained offline HTML file."""
from pathlib import Path
import argparse
import base64
import re

ROOT = Path(__file__).resolve().parent
INCLUDE = re.compile(r"\{\{include:([a-zA-Z0-9_./-]+)\}\}")
IMAGE = re.compile(r"\{\{image:([a-zA-Z0-9_./-]+)\}\}")


def image_uri(match):
    path = (ROOT / match[1]).resolve()
    if not path.is_relative_to(ROOT):
        raise ValueError(f"Image outside latest/: {match[1]}")
    mime = {".png": "image/png", ".svg": "image/svg+xml"}[path.suffix]
    return f"data:{mime};base64," + base64.b64encode(path.read_bytes()).decode("ascii")


def render(name="src/page.html", parents=()):
    path = (ROOT / name).resolve()
    if not path.is_relative_to(ROOT):
        raise ValueError(f"Include outside latest/: {name}")
    if path in parents:
        raise ValueError(f"Circular include: {name}")
    text = path.read_text(encoding="utf-8")
    text = INCLUDE.sub(lambda match: render(match[1], parents + (path,)), text)
    return IMAGE.sub(image_uri, text)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Verify index.html without writing it.")
    args = parser.parse_args()
    output = render().encode("utf-8")
    destination = ROOT / "index.html"
    if args.check:
        if destination.read_bytes() != output:
            raise SystemExit("index.html is stale. Run: python3 build.py")
        print("PASS: index.html matches the current source files.")
    else:
        destination.write_bytes(output)
        print(f"Built {destination.name}: {len(output):,} bytes; all resources inline.")


if __name__ == "__main__":
    main()
