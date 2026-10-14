#!/usr/bin/env node
// Match photos to program days and blocks by their capture time (EXIF).
//
// Usage: node photo-dates.mjs [--state .moderator/state.json] <file|dir>...
//
// Prints TSV: <file>\t<taken YYYY-MM-DD HH:MM | ->\t<day n | ->\t<block id | ->\t<block title | ->
// Capture time sources, first that works: sips (macOS), ImageMagick, exiftool.
// A block matches when the photo was taken inside its time range or up to
// 20 minutes after it ended (flipcharts are often photographed right after).

import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const IMAGE_EXT = new Set(['.heic', '.heif', '.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff']);
const GRACE_MIN = 20;

function tryRun(cmd, args) {
  try {
    return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return '';
  }
}

export function parseExifDate(s) {
  const m = s && s.match(/(\d{4})[:\-](\d{2})[:\-](\d{2})[ T](\d{2}):(\d{2})/);
  return m ? { date: `${m[1]}-${m[2]}-${m[3]}`, time: `${m[4]}:${m[5]}` } : null;
}

export function takenAt(file) {
  return (
    parseExifDate(tryRun('sips', ['-g', 'creation', file]).split('creation:')[1] ?? '') ||
    parseExifDate(tryRun('magick', ['identify', '-format', '%[EXIF:DateTimeOriginal]', file])) ||
    parseExifDate(tryRun('exiftool', ['-s3', '-DateTimeOriginal', file]))
  );
}

const toMin = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

export function parseRange(time) {
  const m = time && time.match(/(\d{1,2}:\d{2})\s*[–—-]\s*(\d{1,2}:\d{2})/);
  return m ? [toMin(m[1]), toMin(m[2])] : null;
}

export function matchBlock(days, taken) {
  if (!taken) return { day: null, block: null };
  const day = days.find((d) => d.date === taken.date) ?? null;
  if (!day) return { day: null, block: null };
  const t = toMin(taken.time);
  const blocks = (day.blocks ?? []).filter((b) => b.in_report !== false);
  let best = null;
  for (const b of blocks) {
    const r = parseRange(b.time);
    if (!r) continue;
    if (t >= r[0] && t <= r[1]) return { day, block: b };
    if (t > r[1] && t <= r[1] + GRACE_MIN && (!best || r[1] > best.end)) best = { block: b, end: r[1] };
  }
  return { day, block: best?.block ?? null };
}

function expand(inputs) {
  const out = [];
  for (const p of inputs) {
    if (!existsSync(p)) continue;
    if (statSync(p).isDirectory()) {
      for (const n of readdirSync(p).sort()) {
        if (!n.startsWith('.') && IMAGE_EXT.has(extname(n).toLowerCase())) out.push(join(p, n));
      }
    } else if (IMAGE_EXT.has(extname(p).toLowerCase())) out.push(p);
  }
  return out;
}

const isMain = process.argv[1]?.endsWith('photo-dates.mjs');
if (isMain) {
  const args = process.argv.slice(2);
  const si = args.indexOf('--state');
  const statePath = si >= 0 ? args[si + 1] : join('.moderator', 'state.json');
  const inputs = args.filter((a, i) => a !== '--state' && args[i - 1] !== '--state');
  const days = existsSync(statePath) ? JSON.parse(readFileSync(statePath, 'utf8')).days ?? [] : [];
  for (const f of expand(inputs)) {
    const t = takenAt(f);
    const { day, block } = matchBlock(days, t);
    console.log(
      [f, t ? `${t.date} ${t.time}` : '-', day ? day.n : '-', block ? block.id : '-', block ? block.title : '-'].join('\t'),
    );
  }
}
