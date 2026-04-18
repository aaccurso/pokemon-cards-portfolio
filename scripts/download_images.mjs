#!/usr/bin/env node
/**
 * Download non-fallback card images to public/cards/{id}.webp so the app
 * keeps working if an external CDN disappears or starts blocking hotlinks.
 *
 * - Skips cards flagged imageIsFallback: true (those are deliberately
 *   non-definitive and may still be replaced).
 * - Skips cards already flagged localImage: true (idempotent).
 * - Resizes to max 800px wide and encodes WebP q85 — enough resolution
 *   for the modal view while keeping the committed size small.
 *
 *   node scripts/download_images.mjs           # normal
 *   node scripts/download_images.mjs --force   # re-download even if flagged
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const FILE = "data/cards.json";
const OUT_DIR = "public/cards";
const FORCE = process.argv.includes("--force");

fs.mkdirSync(OUT_DIR, { recursive: true });

const cards = JSON.parse(fs.readFileSync(FILE, "utf8"));
const todo = cards.filter(
  (c) => c.imageUrl && !c.imageIsFallback && (FORCE || !c.localImage)
);

console.log(
  `Downloading ${todo.length} card image(s) → ${OUT_DIR}/ (webp, max 800px)`
);

let ok = 0;
let failed = 0;
for (let i = 0; i < todo.length; i++) {
  const card = todo[i];
  const target = path.join(OUT_DIR, `${card.id}.webp`);
  try {
    const res = await fetch(card.imageUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    await sharp(buf)
      .resize({ width: 800, withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(target);
    card.localImage = true;
    ok++;
    if ((i + 1) % 10 === 0 || i === todo.length - 1) {
      console.log(`  ${i + 1} / ${todo.length}`);
    }
  } catch (e) {
    failed++;
    console.error(`  ! ${card.id} (${card.imageUrl}) — ${e.message}`);
  }
  // Polite pause
  await new Promise((r) => setTimeout(r, 200));
}

fs.writeFileSync(FILE, JSON.stringify(cards, null, 2) + "\n");

// Report disk footprint
const files = fs.readdirSync(OUT_DIR).filter((f) => f.endsWith(".webp"));
const totalBytes = files.reduce(
  (s, f) => s + fs.statSync(path.join(OUT_DIR, f)).size,
  0
);

console.log(
  `\nDone. ${ok} downloaded, ${failed} failed. ${files.length} webp on disk, ${(
    totalBytes /
    1024 /
    1024
  ).toFixed(1)} MB total.`
);
