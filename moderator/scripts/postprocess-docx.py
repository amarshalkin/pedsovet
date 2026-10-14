#!/usr/bin/env python3
"""Post-process a pandoc-generated report .docx to match the template rules.

- Bullet lists use a dash («–») in Times New Roman instead of Symbol glyphs.
- Tables get thin black borders (digitized cards read as a grid, like in the template).

Usage: python3 -I postprocess-docx.py <file.docx>   (edits in place)
"""
import re
import shutil
import sys
import tempfile
import zipfile
from pathlib import Path

DASH = "–"
FONT = '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman" w:hint="default" />'
BORDERS = (
    "<w:tblBorders>"
    + "".join(
        f'<w:{side} w:val="single" w:sz="4" w:space="0" w:color="000000" />'
        for side in ("top", "left", "bottom", "right", "insideH", "insideV")
    )
    + "</w:tblBorders>"
)


def patch_numbering(xml: str) -> str:
    def fix_level(match: re.Match) -> str:
        lvl = match.group(0)
        if 'w:numFmt w:val="bullet"' not in lvl:
            return lvl
        lvl = re.sub(r'<w:lvlText w:val="[^"]*"\s*/>', f'<w:lvlText w:val="{DASH}" />', lvl)
        if "<w:rPr>" in lvl:
            lvl = re.sub(r"<w:rPr>.*?</w:rPr>", f"<w:rPr>{FONT}</w:rPr>", lvl, flags=re.S)
        else:
            lvl = lvl.replace("</w:lvl>", f"<w:rPr>{FONT}</w:rPr></w:lvl>")
        return lvl

    return re.sub(r"<w:lvl\b.*?</w:lvl>", fix_level, xml, flags=re.S)


def patch_document(xml: str) -> str:
    # CT_TblPr order: tblStyle, …, tblW, jc, tblCellSpacing, tblInd, tblBorders, shd,
    # tblLayout, tblCellMar, tblLook, tblCaption, tblDescription.
    def add_borders(match: re.Match) -> str:
        pr = match.group(0)
        if "<w:tblBorders>" in pr:
            return pr
        anchor = re.search(r"<w:(shd|tblLayout|tblCellMar|tblLook|tblCaption|tblDescription)\b", pr)
        if anchor:
            return pr[: anchor.start()] + BORDERS + pr[anchor.start():]
        return pr.replace("</w:tblPr>", BORDERS + "</w:tblPr>")

    return re.sub(r"<w:tblPr>.*?</w:tblPr>", add_borders, xml, flags=re.S)


def main() -> None:
    if len(sys.argv) != 2:
        print(__doc__.strip().splitlines()[-1], file=sys.stderr)
        sys.exit(2)
    path = Path(sys.argv[1])
    with tempfile.TemporaryDirectory() as tmp:
        out = Path(tmp) / path.name
        with zipfile.ZipFile(path) as zin, zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as zout:
            for item in zin.infolist():
                data = zin.read(item.filename)
                if item.filename == "word/numbering.xml":
                    data = patch_numbering(data.decode("utf-8")).encode("utf-8")
                elif item.filename == "word/document.xml":
                    data = patch_document(data.decode("utf-8")).encode("utf-8")
                zout.writestr(item, data)
        shutil.move(str(out), path)


if __name__ == "__main__":
    main()
