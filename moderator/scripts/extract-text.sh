#!/usr/bin/env bash
# Print the plain text of a document so it can be read in one call.
#
# Usage: extract-text.sh <file>
#
# Supported: .docx .doc .odt .rtf .pptx .xlsx .pdf .txt .md .html .pages (preview only).
# Images are NOT handled here — read them with the Read tool (vision) after
# converting HEIC/WEBP with convert-images.sh.
# Exit code 4 means "no text layer" (e.g. a scanned PDF) — fall back to vision.
# Exit code 5 means "unsupported format" — file the document without reading it,
# or ask the moderator for a .docx/.pdf export.
set -euo pipefail

f="${1:-}"
if [[ -z "$f" || ! -f "$f" ]]; then
  echo "usage: extract-text.sh <file>" >&2
  exit 2
fi

ext="${f##*.}"
ext="$(printf '%s' "$ext" | tr '[:upper:]' '[:lower:]')"

need_pandoc() {
  command -v pandoc >/dev/null 2>&1 || { echo "error: pandoc is required (brew install pandoc)" >&2; exit 3; }
}

case "$ext" in
  txt|md|markdown|csv)
    cat "$f" ;;
  docx|odt|html|htm|epub|pptx|xlsx)
    need_pandoc
    pandoc "$f" -t plain --wrap=none ;;
  doc)
    if command -v textutil >/dev/null 2>&1; then
      textutil -convert txt -stdout "$f"
    else
      echo "cannot read legacy .doc here — ask for a .docx or .pdf export" >&2
      exit 5
    fi ;;
  rtf)
    if command -v textutil >/dev/null 2>&1; then
      textutil -convert txt -stdout "$f"
    else
      need_pandoc
      pandoc "$f" -f rtf -t plain --wrap=none
    fi ;;
  pdf)
    if ! command -v pdftotext >/dev/null 2>&1; then
      echo "error: pdftotext not installed; read the PDF with the Read tool instead" >&2
      exit 3
    fi
    text="$(pdftotext -layout "$f" - 2>/dev/null || true)"
    if [[ -z "${text//[[:space:]]/}" ]]; then
      echo "no text layer in $f — read pages with the Read tool (vision)" >&2
      exit 4
    fi
    printf '%s\n' "$text" ;;
  pages)
    # .pages is a zip bundle; only the QuickLook preview is portable to read.
    tmp="$(mktemp -d)"
    trap 'rm -rf "$tmp"' EXIT
    unzip -q -o "$f" 'QuickLook/*' 'preview*.jpg' -d "$tmp" 2>/dev/null || true
    if [[ -f "$tmp/QuickLook/Preview.pdf" ]] && command -v pdftotext >/dev/null 2>&1; then
      pdftotext -layout "$tmp/QuickLook/Preview.pdf" - 2>/dev/null || exit 4
    else
      echo "cannot extract text from .pages — ask the moderator to export .docx or .pdf" >&2
      exit 4
    fi ;;
  *)
    echo "unsupported extension: .$ext" >&2
    exit 5 ;;
esac
