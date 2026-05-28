// Generates placeholder WebP assets into ./protected so the protected-asset
// pipeline has something to serve in dev. Replace these with real photos.
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const ROOT = path.join(process.cwd(), "protected");

const ASSETS = [
  { file: "hero/hero-bg-blur.webp", w: 1920, h: 1080, c: "#0a1124", label: "HERO BG" },
  { file: "hero/hero-foreground-object.webp", w: 1200, h: 1200, c: "#10b981", label: "3D OBJECT" },
  { file: "products/colecionavel-01.webp", w: 800, h: 1066, c: "#0f172a", label: "Dragão" },
  { file: "products/peca-tecnica-01.webp", w: 800, h: 1066, c: "#111827", label: "Engrenagem" },
  { file: "products/colecionavel-02.webp", w: 800, h: 1066, c: "#0b132b", label: "Busto" },
  { file: "products/peca-tecnica-02.webp", w: 800, h: 1066, c: "#0f1e2e", label: "Suporte" },
  { file: "products/colecionavel-03.webp", w: 800, h: 1066, c: "#101826", label: "Miniatura" },
  { file: "products/peca-tecnica-03.webp", w: 800, h: 1066, c: "#0c1322", label: "Protótipo" },
];

function svg(w, h, c, label) {
  return Buffer.from(
    `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
       <defs>
         <radialGradient id="g" cx="50%" cy="40%" r="75%">
           <stop offset="0%" stop-color="#10b981" stop-opacity="0.35"/>
           <stop offset="100%" stop-color="${c}" stop-opacity="1"/>
         </radialGradient>
       </defs>
       <rect width="100%" height="100%" fill="url(#g)"/>
       <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle"
             font-family="sans-serif" font-size="${Math.round(w / 12)}"
             font-weight="800" fill="rgba(255,255,255,0.85)">${label}</text>
     </svg>`,
  );
}

for (const a of ASSETS) {
  const out = path.join(ROOT, a.file);
  await mkdir(path.dirname(out), { recursive: true });
  await sharp(svg(a.w, a.h, a.c, a.label)).webp({ quality: 80 }).toFile(out);
  console.log("seeded", a.file);
}
