// Rasterises the app mark into the PNG sizes a PWA/TWA install needs.
import sharp from 'sharp';
import { readFileSync } from 'node:fs';

const svg = readFileSync('public/icons/icon.svg');
const out = [
  ['public/icons/icon-192.png', 192, 0],
  ['public/icons/icon-512.png', 512, 0],
  ['public/icons/icon-maskable-512.png', 512, 0.2],
  ['public/icons/apple-touch-icon.png', 180, 0.12],
  ['public/icons/favicon-32.png', 32, 0],
];

for (const [file, size, pad] of out) {
  const inner = Math.round(size * (1 - pad * 2));
  const icon = await sharp(svg, { density: 384 }).resize(inner, inner).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: { r: 10, g: 10, b: 12, alpha: 1 } } })
    .composite([{ input: icon, gravity: 'centre' }])
    .png({ compressionLevel: 9 })
    .toFile(file);
  console.log(file, size);
}
