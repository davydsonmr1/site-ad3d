// Procedurally generates the hero art (no photos) and uploads it to Supabase.
//   node --env-file=.env.local scripts/generate-hero.mjs
//
//  - hero-bg-blur.webp        cinematic navy backdrop: perspective grid + glows
//  - hero-foreground-object.webp  a real low-poly icosphere, light-shaded,
//                                 transparent background, emerald glow + shadow
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import ws from "ws";
if (typeof globalThis.WebSocket === "undefined") globalThis.WebSocket = ws;

// ---------- tiny vector / color helpers ----------
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a) => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const mix = (c1, c2, t) => [
  Math.round(c1[0] + (c2[0] - c1[0]) * t),
  Math.round(c1[1] + (c2[1] - c1[1]) * t),
  Math.round(c1[2] + (c2[2] - c1[2]) * t),
];
const hex = (c) => `#${c.map((v) => clamp(v, 0, 255).toString(16).padStart(2, "0")).join("")}`;

function rotX(v, a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [v[0], v[1] * c - v[2] * s, v[1] * s + v[2] * c];
}
function rotY(v, a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c];
}

// ---------- foreground: shaded low-poly icosphere ----------
function icosphereSVG() {
  const W = 1200, H = 1200, cx = W / 2, cy = H / 2;
  const R = 360;
  const t = (1 + Math.sqrt(5)) / 2;
  let verts = [
    [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
    [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
    [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
  ].map(norm);
  const faces = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
  ];

  // pose the solid at a pleasing angle
  verts = verts.map((v) => rotY(rotX(v, -0.5), 0.7));

  const light = norm([-0.35, 0.65, 0.85]);
  const dark = [4, 30, 26];        // deep emerald shadow
  const lit = [52, 211, 153];      // emerald-400
  const hot = [167, 243, 208];     // near-white highlight

  const tris = faces.map((f) => {
    const p = f.map((i) => verts[i]);
    const n = norm(cross(sub(p[1], p[0]), sub(p[2], p[0])));
    const facing = n[2] >= 0; // toward viewer
    const intensity = clamp(dot(n, light), 0, 1);
    const avgZ = (p[0][2] + p[1][2] + p[2][2]) / 3;
    const base = intensity < 0.6 ? mix(dark, lit, intensity / 0.6) : mix(lit, hot, (intensity - 0.6) / 0.4);
    return { p, avgZ, facing, color: hex(base), intensity };
  });
  tris.sort((a, b) => a.avgZ - b.avgZ); // back to front

  const poly = tris
    .map((tr) => {
      const pts = tr.p.map((v) => `${(cx + v[0] * R).toFixed(1)},${(cy - v[1] * R).toFixed(1)}`).join(" ");
      const edge = tr.facing ? "rgba(167,243,208,0.18)" : "rgba(0,0,0,0.25)";
      return `<polygon points="${pts}" fill="${tr.color}" stroke="${edge}" stroke-width="1.2" stroke-linejoin="round"/>`;
    })
    .join("");

  return Buffer.from(
    `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="glow" cx="50%" cy="46%" r="50%">
          <stop offset="0%" stop-color="#10b981" stop-opacity="0.55"/>
          <stop offset="45%" stop-color="#10b981" stop-opacity="0.18"/>
          <stop offset="100%" stop-color="#10b981" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="shadow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#000000" stop-opacity="0.55"/>
          <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <ellipse cx="${cx}" cy="${cy + R * 0.92}" rx="${R * 0.85}" ry="${R * 0.16}" fill="url(#shadow)"/>
      <circle cx="${cx}" cy="${cy}" r="${R * 1.35}" fill="url(#glow)"/>
      <g>${poly}</g>
    </svg>`,
  );
}

// ---------- background: perspective grid + glows ----------
function backgroundSVG() {
  const W = 1920, H = 1080;
  const vpx = W * 0.5, vpy = H * 0.34; // vanishing point
  let grid = "";
  // radial lines toward vanishing point (floor fan)
  for (let i = -16; i <= 16; i++) {
    const x = vpx + i * (W / 14);
    grid += `<line x1="${vpx}" y1="${vpy}" x2="${x.toFixed(0)}" y2="${H}" stroke="rgba(94,234,212,0.07)" stroke-width="1"/>`;
  }
  // horizon-parallel lines compressing toward the vanishing point
  for (let i = 1; i <= 22; i++) {
    const f = i / 22;
    const y = vpy + (H - vpy) * f * f; // ease so they bunch near horizon
    grid += `<line x1="0" y1="${y.toFixed(0)}" x2="${W}" y2="${y.toFixed(0)}" stroke="rgba(94,234,212,0.05)" stroke-width="1"/>`;
  }

  // soft bokeh orbs (fixed, deterministic)
  const orbs = [
    [300, 220, 160, "#10b981", 0.12], [1650, 300, 220, "#22d3ee", 0.10],
    [1500, 780, 120, "#10b981", 0.14], [520, 820, 180, "#34d399", 0.10],
    [960, 160, 260, "#0ea5e9", 0.08], [180, 560, 90, "#34d399", 0.12],
  ];
  const bokeh = orbs
    .map(([x, y, r, c, o], i) =>
      `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#orb${i})"/>` +
      `<radialGradient id="orb${i}" cx="50%" cy="50%" r="50%">
         <stop offset="0%" stop-color="${c}" stop-opacity="${o}"/>
         <stop offset="100%" stop-color="${c}" stop-opacity="0"/></radialGradient>`,
    )
    .join("");

  return Buffer.from(
    `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#0a1326"/>
          <stop offset="55%" stop-color="#050a18"/>
          <stop offset="100%" stop-color="#02050e"/>
        </linearGradient>
        <radialGradient id="halo" cx="50%" cy="30%" r="60%">
          <stop offset="0%" stop-color="#10b981" stop-opacity="0.22"/>
          <stop offset="60%" stop-color="#0b3b2e" stop-opacity="0.06"/>
          <stop offset="100%" stop-color="#02050e" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#bg)"/>
      ${bokeh}
      <g>${grid}</g>
      <rect width="${W}" height="${H}" fill="url(#halo)"/>
    </svg>`,
  );
}

// ---------- render + write + upload ----------
const targets = [
  {
    rel: "hero/hero-foreground-object.webp",
    buf: await sharp(icosphereSVG()).webp({ quality: 92, alphaQuality: 100 }).toBuffer(),
  },
  {
    rel: "hero/hero-bg-blur.webp",
    buf: await sharp(backgroundSVG()).blur(3).webp({ quality: 86 }).toBuffer(),
  },
];

for (const t of targets) {
  const out = path.join(process.cwd(), "protected", t.rel);
  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, t.buf);
  console.log("gerado", t.rel, `(${(t.buf.length / 1024).toFixed(0)} KB)`);
}

const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (url && key) {
  const bucket = process.env.SUPABASE_BUCKET ?? "assets";
  const s = createClient(url, key, { auth: { persistSession: false } });
  for (const t of targets) {
    const { error } = await s.storage
      .from(bucket)
      .upload(t.rel, t.buf, { contentType: "image/webp", upsert: true });
    console.log(error ? `  upload falhou ${t.rel}: ${error.message}` : `  enviado ${t.rel}`);
  }
} else {
  console.log("Supabase não configurado — apenas arquivos locais gerados.");
}
console.log("hero pronto.");
