#!/usr/bin/env bash
# Convert photos (HEIC, WEBP, PNG, TIFF, JPEG) to compressed JPEG for reading and for the .docx.
#
# Usage: convert-images.sh --out <dir> [--max <px>] [--quality <1-100>] [--force] <file|dir>...
#
# - Directories are scanned one level deep for image files.
# - Output name: <basename>.jpg in --out with spaces and brackets replaced by "_"
#   (safe for markdown image links). Two sources with the same stem (a.png, a.webp)
#   never overwrite each other: the second gets the extension in its name (a_webp.jpg).
#   A manifest <out>/.sources.tsv remembers which source produced which output;
#   outputs newer than their source are skipped unless --force (use it to
#   re-compress with a smaller --max/--quality).
# - Uses sips (macOS) when present, otherwise ImageMagick (magick / convert).
# - Prints one TSV line per file: <source>\t<output>\t<status>
set -euo pipefail

OUT=""
MAX=1600
QUALITY=80
FORCE=0
INPUTS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --out) OUT="${2:-}"; shift 2 || shift ;;
    --max) MAX="${2:-}"; shift 2 || shift ;;
    --quality) QUALITY="${2:-}"; shift 2 || shift ;;
    --force) FORCE=1; shift ;;
    -h|--help) sed -n '2,10p' "$0"; exit 0 ;;
    *) INPUTS+=("$1"); shift ;;
  esac
done

if [[ -z "$OUT" || ${#INPUTS[@]} -eq 0 ]]; then
  echo "usage: convert-images.sh --out <dir> [--max px] [--quality q] <file|dir>..." >&2
  exit 2
fi
mkdir -p "$OUT"
MANIFEST="$OUT/.sources.tsv"
touch "$MANIFEST"

if command -v sips >/dev/null 2>&1; then
  ENGINE=sips
elif command -v magick >/dev/null 2>&1; then
  ENGINE=magick
elif command -v convert >/dev/null 2>&1; then
  ENGINE=convert
else
  echo "error: neither sips nor ImageMagick found" >&2
  exit 3
fi

is_image() {
  local ext="${1##*.}"
  ext="$(printf '%s' "$ext" | tr '[:upper:]' '[:lower:]')"
  case "$ext" in heic|heif|webp|png|jpg|jpeg|tif|tiff) return 0 ;; *) return 1 ;; esac
}

safe_name() {
  # Spaces and brackets break markdown image links; keep letters of any script.
  printf '%s' "$1" | sed -E 's/[][ (){}]+/_/g; s/^_+//; s/_+$//'
}

source_of() {
  awk -F '\t' -v d="$1" '$1 == d { print $2 }' "$MANIFEST" | tail -1
}

convert_one() {
  local src="$1"
  local abs_src
  abs_src="$(cd "$(dirname "$src")" && pwd)/$(basename "$src")"
  local name ext base
  name="$(basename "$src")"
  ext="${name##*.}"
  base="$(safe_name "${name%.*}")"
  # Names like "  .HEIC" (only spaces) would produce an empty name.
  if [[ -z "$base" ]]; then base="unnamed-$(cksum < "$src" | cut -d" " -f1)"; fi
  local dst="$OUT/$base.jpg"
  local owner
  owner="$(source_of "$base.jpg")"
  if [[ -n "$owner" && "$owner" != "$abs_src" ]]; then
    dst="$OUT/${base}_$(printf '%s' "$ext" | tr '[:upper:]' '[:lower:]').jpg"
    owner="$(source_of "$(basename "$dst")")"
    if [[ -n "$owner" && "$owner" != "$abs_src" ]]; then
      dst="$OUT/${base}_$(cksum < "$src" | cut -d" " -f1).jpg"
    fi
  fi
  if [[ -z "$(source_of "$(basename "$dst")")" ]]; then
    printf '%s\t%s\n' "$(basename "$dst")" "$abs_src" >> "$MANIFEST"
  fi
  if [[ $FORCE -eq 0 && -f "$dst" && "$dst" -nt "$src" ]]; then
    printf '%s\t%s\tskipped\n' "$src" "$dst"
    return
  fi
  case "$ENGINE" in
    sips)
      sips -s format jpeg -s formatOptions "$QUALITY" -Z "$MAX" "$src" --out "$dst" >/dev/null 2>&1 \
        || { printf '%s\t%s\tfailed\n' "$src" "$dst"; return; } ;;
    magick)
      magick "$src" -auto-orient -resize "${MAX}x${MAX}>" -quality "$QUALITY" "$dst" 2>/dev/null \
        || { printf '%s\t%s\tfailed\n' "$src" "$dst"; return; } ;;
    convert)
      convert "$src" -auto-orient -resize "${MAX}x${MAX}>" -quality "$QUALITY" "$dst" 2>/dev/null \
        || { printf '%s\t%s\tfailed\n' "$src" "$dst"; return; } ;;
  esac
  printf '%s\t%s\tconverted\n' "$src" "$dst"
}

for input in "${INPUTS[@]}"; do
  if [[ -d "$input" ]]; then
    while IFS= read -r -d '' f; do
      is_image "$f" && convert_one "$f"
    done < <(find "$input" -maxdepth 1 -type f ! -name '.*' -print0 | sort -z)
  elif [[ -f "$input" ]]; then
    if is_image "$input"; then convert_one "$input"; else printf '%s\t-\tnot-an-image\n' "$input"; fi
  else
    printf '%s\t-\tmissing\n' "$input"
  fi
done
