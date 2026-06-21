// One-off: strip near-white background from logo and save transparent PNG.
const sharp = require('sharp');
const fs = require('fs');

const SRC = process.argv[2];
const OUT = process.argv[3];
const THRESHOLD = 235; // pixels with R,G,B all >= this become transparent

(async () => {
  const img = sharp(SRC).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const out = Buffer.from(data);

  for (let i = 0; i < out.length; i += channels) {
    const r = out[i], g = out[i + 1], b = out[i + 2];
    if (r >= THRESHOLD && g >= THRESHOLD && b >= THRESHOLD) {
      out[i + 3] = 0; // fully transparent
    } else {
      // Soft alpha for slightly-off-white edge pixels: scale by darkness
      const minC = Math.min(r, g, b);
      if (minC >= 200) {
        out[i + 3] = Math.round(((THRESHOLD - minC) / (THRESHOLD - 200)) * 255);
      }
    }
  }

  await sharp(out, { raw: { width, height, channels } })
    .png({ compressionLevel: 9 })
    .toFile(OUT);

  console.log('wrote', OUT, `${width}x${height}`);
})().catch(e => { console.error(e); process.exit(1); });
