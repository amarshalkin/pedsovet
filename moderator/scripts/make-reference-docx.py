#!/usr/bin/env python3
"""Regenerate assets/reference.docx — the pandoc style reference for the report.

Dev-only utility: the generated file is committed, so moderators never run this.
Takes pandoc's default reference.docx and rewrites styles.xml to the report
style rules: Times New Roman 14 pt everywhere, single line spacing, no colours,
headings bold and black. The document language is not fixed here: build-docx.sh
passes the report language to pandoc (--lang).

Usage: python3 make-reference-docx.py [out.docx]
"""
import re
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE.parent / "assets" / "reference.docx"

FONT = '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="Times New Roman" w:cs="Times New Roman" />'
SIZE = '<w:sz w:val="28" /><w:szCs w:val="28" />'


def patch_styles(xml: str) -> str:
    xml = re.sub(r"<w:rFonts\b[^>]*/>", FONT, xml, flags=re.S)
    xml = re.sub(r'<w:sz w:val="\d+"\s*/>', '<w:sz w:val="28" />', xml)
    xml = re.sub(r'<w:szCs w:val="\d+"\s*/>', '<w:szCs w:val="28" />', xml)
    xml = re.sub(r"<w:color\b[^>]*/>", "", xml, flags=re.S)
    # Single spacing in document defaults and every explicit spacing rule.
    xml = re.sub(r'w:line="\d+"', 'w:line="240"', xml)
    xml = xml.replace('<w:spacing w:after="200" />', '<w:spacing w:after="120" w:line="240" w:lineRule="auto" />', 1)
    # Make sure the default run props carry the font even if pandoc changes them.
    if FONT not in xml.split("</w:rPrDefault>")[0]:
        xml = xml.replace("<w:rPrDefault>\n      <w:rPr>", "<w:rPrDefault>\n      <w:rPr>" + FONT + SIZE, 1)

    # Headings and Title: bold, black, 14 pt (no extra size hierarchy in the template).
    def bold_style(match: re.Match) -> str:
        block = match.group(0)
        if "<w:b />" not in block and "<w:b/>" not in block:
            # OOXML CT_RPr is an ordered sequence: rFonts, b, bCs, i, ..., sz, szCs.
            if FONT in block:
                block = block.replace(FONT, FONT + "<w:b /><w:bCs />", 1)
            elif "<w:rPr>" in block:
                block = block.replace("<w:rPr>", "<w:rPr>" + FONT + "<w:b /><w:bCs />", 1)
            else:
                block = block.replace("</w:style>", "<w:rPr>" + FONT + "<w:b /><w:bCs />" + SIZE + "</w:rPr></w:style>")
        return block

    xml = re.sub(r'<w:style [^>]*w:styleId="(Heading\d|Title|Subtitle)".*?</w:style>', bold_style, xml, flags=re.S)
    # Italic heading styles from pandoc defaults would break the "italic only for remarks" rule.
    xml = re.sub(r'(<w:style [^>]*w:styleId="Heading\d".*?)<w:i\s*/>(.*?</w:style>)', r"\1\2", xml, flags=re.S)
    return xml


def main() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        src = Path(tmp) / "default.docx"
        with open(src, "wb") as fh:
            subprocess.run(["pandoc", "--print-default-data-file", "reference.docx"], stdout=fh, check=True)
        OUT.parent.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(src) as zin, zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as zout:
            for item in zin.infolist():
                data = zin.read(item.filename)
                if item.filename == "word/styles.xml":
                    data = patch_styles(data.decode("utf-8")).encode("utf-8")
                zout.writestr(item, data)
    print(f"written {OUT}")


if __name__ == "__main__":
    main()
