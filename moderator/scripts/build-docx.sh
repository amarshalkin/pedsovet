#!/usr/bin/env bash
# Build the moderator report .docx from the assembled markdown.
#
# Usage: build-docx.sh <report.md> <out.docx> [--lang <BCP47, e.g. ru-RU, en-GB>]
#
# - Styles come from ../assets/reference.docx (Times New Roman 14, single spacing,
#   bold black headings, no colours); postprocess-docx.py swaps bullets for dashes
#   and adds table borders.
# - Image paths in the markdown are resolved relative to the markdown's folder.
# - Prints the output path and size; exits non-zero if pandoc fails or an image is missing.
set -euo pipefail

SRC="${1:-}"
OUT="${2:-}"
LANG_TAG=""
if [[ "${3:-}" == "--lang" ]]; then LANG_TAG="${4:-}"; fi
if [[ -z "$SRC" || -z "$OUT" || ! -f "$SRC" ]]; then
  echo "usage: build-docx.sh <report.md> <out.docx> [--lang <tag>]" >&2
  exit 2
fi
if ! command -v pandoc >/dev/null 2>&1; then
  echo "error: pandoc is required (brew install pandoc)" >&2
  exit 3
fi
if ! command -v python3 >/dev/null 2>&1; then
  echo "error: python3 is required for post-processing" >&2
  exit 3
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REF="$ROOT/assets/reference.docx"
SRC_DIR="$(cd "$(dirname "$SRC")" && pwd)"

# Fail early on broken image links: pandoc only warns and silently drops them.
# Both ![x](path.jpg) and ![x](<path with spaces.jpg>) forms are checked;
# paths are relative to the markdown's folder (the only pandoc resource path).
missing=0
while IFS= read -r img; do
  [[ -z "$img" ]] && continue
  case "$img" in http://*|https://*) continue ;; esac
  if [[ ! -f "$SRC_DIR/$img" ]]; then
    echo "missing image: $img" >&2
    missing=1
  fi
done < <(grep -oE '!\[[^]]*\]\((<[^>]+>|[^) ]+)' "$SRC" | sed -E 's/^!\[[^]]*\]\(//; s/^<//; s/>$//')
if [[ $missing -ne 0 ]]; then
  exit 4
fi

mkdir -p "$(dirname "$OUT")"
pandoc "$SRC" \
  --from markdown+pipe_tables+grid_tables+implicit_figures+link_attributes \
  --to docx \
  --reference-doc "$REF" \
  --resource-path "$SRC_DIR" \
  ${LANG_TAG:+--metadata "lang=$LANG_TAG"} \
  --output "$OUT"

python3 -I -B "$ROOT/scripts/postprocess-docx.py" "$OUT"

size="$(du -h "$OUT" | cut -f1)"
echo "built $OUT ($size)"
