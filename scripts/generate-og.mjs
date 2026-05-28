// Builds the public Open Graph share card (1200x630) -> ./public/og.png
// Composites the brand logo (public/brand.png) centered on the dark brand
// background. Public marketing image (committed, served statically).
// Run: node scripts/generate-og.mjs
import sharp from "sharp";
import path from "node:path";

const W = 1200, H = 630;
const cx = W / 2, cy = H / 2;

const background = Buffer.from(
  `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0a1326"/>
        <stop offset="60%" stop-color="#050a18"/>
        <stop offset="100%" stop-color="#02050e"/>
      </linearGradient>
      <radialGradient id="halo" cx="50%" cy="50%" r="55%">
        <stop offset="0%" stop-color="#10b981" stop-opacity="0.26"/>
        <stop offset="60%" stop-color="#0b3b2e" stop-opacity="0.05"/>
        <stop offset="100%" stop-color="#02050e" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <rect width="${W}" height="${H}" fill="url(#halo)"/>
  </svg>`,
);

// Resize the logo (keep it modest — source is small) and round its corners.
const LOGO_H = 340;
const logoMeta = await sharp(path.join(process.cwd(), "public", "brand.png")).metadata();
const scale = LOGO_H / (logoMeta.height ?? 205);
const logoW = Math.round((logoMeta.width ?? 251) * scale);
const radius = 24;

const logoResized = await sharp(path.join(process.cwd(), "public", "brand.png"))
  .resize(logoW, LOGO_H, { fit: "fill" })
  .png()
  .toBuffer();

const mask = Buffer.from(
  `<svg width="${logoW}" height="${LOGO_H}" xmlns="http://www.w3.org/2000/svg">
     <rect width="${logoW}" height="${LOGO_H}" rx="${radius}" ry="${radius}" fill="#fff"/>
   </svg>`,
);
const logoRounded = await sharp(logoResized)
  .composite([{ input: mask, blend: "dest-in" }])
  .png()
  .toBuffer();

// Subtle ring/frame behind the logo for polish.
const frameW = logoW + 16, frameH = LOGO_H + 16;
const frame = Buffer.from(
  `<svg width="${frameW}" height="${frameH}" xmlns="http://www.w3.org/2000/svg">
     <rect x="1" y="1" width="${frameW - 2}" height="${frameH - 2}" rx="${radius + 6}" ry="${radius + 6}"
           fill="rgba(16,185,129,0.06)" stroke="rgba(16,185,129,0.35)" stroke-width="2"/>
   </svg>`,
);

const out = path.join(process.cwd(), "public", "og.png");
await sharp(background)
  .composite([
    { input: frame, left: Math.round(cx - frameW / 2), top: Math.round(cy - frameH / 2) },
    { input: logoRounded, left: Math.round(cx - logoW / 2), top: Math.round(cy - LOGO_H / 2) },
  ])
  .png()
  .toFile(out);

console.log(`gerado public/og.png (1200x630), logo ${logoW}x${LOGO_H}`);
