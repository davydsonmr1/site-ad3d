// Generates the favicon (icosphere) into src/app/icon.png. Next App Router
// turns app/icon.png into the site favicon automatically.
// Run: node scripts/generate-favicon.mjs
import sharp from "sharp";
import path from "node:path";

const sub = (a, b) => [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const dot = (a, b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
const norm = (a) => { const l = Math.hypot(a[0],a[1],a[2]) || 1; return [a[0]/l,a[1]/l,a[2]/l]; };
const clamp = (x,a,b) => Math.min(b, Math.max(a,x));
const mix = (c1,c2,t) => [Math.round(c1[0]+(c2[0]-c1[0])*t), Math.round(c1[1]+(c2[1]-c1[1])*t), Math.round(c1[2]+(c2[2]-c1[2])*t)];
const hex = (c) => `#${c.map((v)=>clamp(v,0,255).toString(16).padStart(2,"0")).join("")}`;
const rotX = (v,a)=>{const c=Math.cos(a),s=Math.sin(a);return [v[0],v[1]*c-v[2]*s,v[1]*s+v[2]*c];};
const rotY = (v,a)=>{const c=Math.cos(a),s=Math.sin(a);return [v[0]*c+v[2]*s,v[1],-v[0]*s+v[2]*c];};

function polys(cx, cy, R) {
  const t = (1 + Math.sqrt(5)) / 2;
  let verts = [
    [-1,t,0],[1,t,0],[-1,-t,0],[1,-t,0],[0,-1,t],[0,1,t],
    [0,-1,-t],[0,1,-t],[t,0,-1],[t,0,1],[-t,0,-1],[-t,0,1],
  ].map(norm).map((v) => rotY(rotX(v, -0.5), 0.7));
  const faces = [
    [0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],
    [11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],
    [3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1],
  ];
  const light = norm([-0.35, 0.65, 0.85]);
  const dark = [4,30,26], lit = [52,211,153], hot = [167,243,208];
  return faces
    .map((f) => {
      const p = f.map((i) => verts[i]);
      const n = norm(cross(sub(p[1],p[0]), sub(p[2],p[0])));
      const inten = clamp(dot(n, light), 0, 1);
      const base = inten < 0.6 ? mix(dark,lit,inten/0.6) : mix(lit,hot,(inten-0.6)/0.4);
      return { p, avgZ: (p[0][2]+p[1][2]+p[2][2])/3, facing: n[2] >= 0, color: hex(base) };
    })
    .sort((a,b) => a.avgZ - b.avgZ)
    .map((tr) => {
      const pts = tr.p.map((v)=>`${(cx+v[0]*R).toFixed(1)},${(cy-v[1]*R).toFixed(1)}`).join(" ");
      const edge = tr.facing ? "rgba(167,243,208,0.22)" : "rgba(0,0,0,0.3)";
      return `<polygon points="${pts}" fill="${tr.color}" stroke="${edge}" stroke-width="1.5" stroke-linejoin="round"/>`;
    })
    .join("");
}

const S = 512, c = S / 2, R = 168;
const svg = Buffer.from(
  `<svg width="${S}" height="${S}" viewBox="0 0 ${S} ${S}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="bg" cx="50%" cy="42%" r="70%">
        <stop offset="0%" stop-color="#0c1f35"/>
        <stop offset="100%" stop-color="#050a18"/>
      </radialGradient>
      <radialGradient id="glow" cx="50%" cy="46%" r="50%">
        <stop offset="0%" stop-color="#10b981" stop-opacity="0.5"/>
        <stop offset="100%" stop-color="#10b981" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${S}" height="${S}" rx="112" ry="112" fill="url(#bg)"/>
    <circle cx="${c}" cy="${c}" r="${R*1.4}" fill="url(#glow)"/>
    <g>${polys(c, c, R)}</g>
  </svg>`,
);

const out = path.join(process.cwd(), "src", "app", "icon.png");
await sharp(svg).png().toFile(out);
console.log("gerado src/app/icon.png (512x512)");
