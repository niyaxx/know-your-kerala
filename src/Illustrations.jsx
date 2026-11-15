import { useEffect, useId, useMemo, useRef } from "react";

export const ILLUSTRATION_OVERRIDES = {
  sky: null, // opaque sky + sun glow
  clouds: null, // transparent PNG, clouds and birds
  ghats: null, // transparent PNG, Western Ghats ridges + mist
  village: null, // transparent PNG, backwater, houses, boats
  foreground: null, // transparent PNG, palms and leaves framing the scene
  footer: null, // wide strip used in the footer
  umbrella: null, // figure used in the field-note section
};

/* ---------- small helpers ---------- */

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function quad(p0, c, p1, t) {
  const u = 1 - t;
  return [
    u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0],
    u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1],
  ];
}

function ridgeY(pts, x) {
  for (let i = 0; i < pts.length - 1; i++) {
    if (x >= pts[i][0] && x <= pts[i + 1][0]) {
      const t = (x - pts[i][0]) / (pts[i + 1][0] - pts[i][0]);
      return pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t;
    }
  }
  return pts[pts.length - 1][1];
}

function smoothPath(pts, bottom) {
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2;
    const my = (pts[i][1] + pts[i + 1][1]) / 2;
    d += `Q${pts[i][0]} ${pts[i][1]} ${mx} ${my}`;
  }
  const l = pts[pts.length - 1];
  return `${d}L${l[0]} ${l[1]}L${l[0]} ${bottom}L${pts[0][0]} ${bottom}Z`;
}

function ridgeLine(pts, dy) {
  const shifted = pts.map(([x, y]) => [x, y + dy]);
  let d = `M${shifted[0][0]} ${shifted[0][1]}`;
  for (let i = 1; i < shifted.length - 1; i++) {
    const mx = (shifted[i][0] + shifted[i + 1][0]) / 2;
    const my = (shifted[i][1] + shifted[i + 1][1]) / 2;
    d += `Q${shifted[i][0]} ${shifted[i][1]} ${mx} ${my}`;
  }
  const l = shifted[shifted.length - 1];
  return `${d}L${l[0]} ${l[1]}`;
}

function hatchPath(pts, seed, count, depth, len = 12) {
  const r = rng(seed);
  let d = "";
  for (let i = 0; i < count; i++) {
    const x = r() * 1600;
    const y = ridgeY(pts, x) + 8 + r() * depth;
    d += `M${x.toFixed(0)} ${y.toFixed(0)}l${(-2 - r() * 3).toFixed(0)} ${(
      len *
      (0.6 + r() * 0.7)
    ).toFixed(0)}`;
  }
  return d;
}

/* ---------- layer wrapper (SVG by default, <img> if overridden) ---------- */

function Layer({ name, children }) {
  const src = ILLUSTRATION_OVERRIDES[name];

  return (
    <div className={`scene-layer layer-${name}`} data-layer={name}>
      {src ? (
        <img src={src} alt="" draggable="false" />
      ) : (
        <svg
          viewBox="0 0 1600 900"
          preserveAspectRatio="xMidYMax slice"
          aria-hidden="true"
          focusable="false"
        >
          {children}
        </svg>
      )}
    </div>
  );
}

/* ---------- coconut palm ---------- */

export function Palm({
  x,
  y,
  h = 300,
  lean = 0.2,
  s = 1,
  seed = 1,
  trunk = "#5a4528",
  ring = "#38291a",
  leaf = "#1d6a3e",
  leaf2 = "#2f8f4c",
  fringe = "#14502e",
  sway = true,
  delay = 0,
}) {
  const g = useMemo(() => {
    const r = rng(seed * 97 + 13);
    const cx = x + lean * h;
    const cy = y - h;
    const qc = [x + lean * h * 0.12 + (r() - 0.5) * 18, y - h * 0.55];
    const wB = 9 * s;
    const wT = 4.5 * s;
    const mid = (wB + wT) / 2;

    const trunkPath = `M${x - wB} ${y}Q${qc[0] - mid} ${qc[1]} ${cx - wT} ${cy}L${
      cx + wT
    } ${cy}Q${qc[0] + mid} ${qc[1]} ${x + wB} ${y}Z`;

    let rings = "";
    for (let t = 0.04; t < 0.97; t += 0.055) {
      const [px, py] = quad([x, y], qc, [cx, cy], t);
      const w = wB + (wT - wB) * t;
      rings += `M${(px - w).toFixed(1)} ${py.toFixed(1)}q${w.toFixed(1)} ${(
        w * 0.55
      ).toFixed(1)} ${(2 * w).toFixed(1)} 0`;
    }

    const n = 11;
    const fronds = [];
    let fr = "";
    for (let k = 0; k < n; k++) {
      const th =
        ((-172 + (k / (n - 1)) * 164 + (r() - 0.5) * 10) * Math.PI) / 180;
      const L = (95 + r() * 55) * s * Math.min(1.3, Math.max(0.8, h / 320));
      const E = [
        cx + Math.cos(th) * L,
        cy + Math.sin(th) * L * 0.55 + L * 0.42,
      ];
      const C = [
        cx + Math.cos(th) * L * 0.5,
        cy + Math.sin(th) * L * 0.95 - L * 0.12,
      ];
      const dx = E[0] - cx;
      const dy = E[1] - cy;
      const len = Math.hypot(dx, dy) || 1;
      const N = [-dy / len, dx / len];
      const w = L * 0.085;
      const Cu = [C[0] + N[0] * w * 2, C[1] + N[1] * w * 2];
      const Cl = [C[0] - N[0] * w * 2, C[1] - N[1] * w * 2];
      fronds.push({
        d: `M${cx} ${cy}Q${Cu[0].toFixed(1)} ${Cu[1].toFixed(1)} ${E[0].toFixed(
          1
        )} ${E[1].toFixed(1)}Q${Cl[0].toFixed(1)} ${Cl[1].toFixed(1)} ${cx} ${cy}Z`,
        fill: k % 2 ? leaf : leaf2,
      });

      for (let t = 0.12; t < 0.96; t += 0.055) {
        const P = quad([cx, cy], C, E, t);
        const T = [
          2 * (1 - t) * (C[0] - cx) + 2 * t * (E[0] - C[0]),
          2 * (1 - t) * (C[1] - cy) + 2 * t * (E[1] - C[1]),
        ];
        const tl = Math.hypot(T[0], T[1]) || 1;
        const Tn = [T[0] / tl, T[1] / tl];
        const Nn = [-Tn[1], Tn[0]];
        const f = L * 0.19 * (1 - t * 0.55);
        for (const sg of [1, -1]) {
          const ex = P[0] + Nn[0] * f * sg + Tn[0] * f * 0.5;
          const ey = P[1] + Nn[1] * f * sg + Tn[1] * f * 0.5 + f * 0.28;
          fr += `M${P[0].toFixed(1)} ${P[1].toFixed(1)}L${ex.toFixed(1)} ${ey.toFixed(1)}`;
        }
      }
    }

    return { cx, cy, trunkPath, rings, fronds, fr };
  }, [x, y, h, lean, s, seed, leaf, leaf2]);

  return (
    <g>
      <path d={g.trunkPath} fill={trunk} />
      <path
        d={g.rings}
        fill="none"
        stroke={ring}
        strokeWidth={1.4 * s}
        strokeLinecap="round"
        opacity="0.55"
      />
      <g
        className={sway ? "palm-crown" : undefined}
        style={{
          transformOrigin: `${g.cx}px ${g.cy}px`,
          transformBox: "view-box",
          animationDelay: `${delay}s`,
        }}
      >
        {g.fronds.map((f, i) => (
          <path key={i} d={f.d} fill={f.fill} />
        ))}
        <path
          d={g.fr}
          stroke={fringe}
          strokeWidth={2.1 * s}
          strokeLinecap="round"
          fill="none"
          opacity="0.9"
        />
        <circle cx={g.cx - 5 * s} cy={g.cy + 8 * s} r={6 * s} fill="#6b5a2a" />
        <circle cx={g.cx + 6 * s} cy={g.cy + 9 * s} r={6 * s} fill="#7d6a30" />
        <circle cx={g.cx} cy={g.cy + 14 * s} r={5.5 * s} fill="#5c4d22" />
      </g>
    </g>
  );
}

/* ---------- cloud ---------- */

function Cloud({ x, y, s = 1, fill, shade, seed = 1, opacity = 1 }) {
  const puffs = useMemo(() => {
    const r = rng(seed * 31 + 7);
    const n = 7;
    const arr = [];
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const hump = Math.sin(Math.PI * (0.12 + 0.76 * t));
      arr.push({
        cx: (t - 0.5) * 300 * s + (r() - 0.5) * 20 * s,
        cy: -hump * 38 * s + (r() - 0.5) * 10 * s,
        r: (32 + hump * 38 + r() * 14) * s,
      });
    }
    return arr;
  }, [seed, s]);

  return (
    <g transform={`translate(${x} ${y})`} opacity={opacity}>
      <g fill={shade} transform={`translate(0 ${14 * s})`}>
        {puffs.map((p, i) => (
          <circle key={i} cx={p.cx} cy={p.cy} r={p.r} />
        ))}
        <rect x={-150 * s} y={-10 * s} width={300 * s} height={32 * s} rx={16 * s} />
      </g>
      <g fill={fill}>
        {puffs.map((p, i) => (
          <circle key={i} cx={p.cx} cy={p.cy} r={p.r} />
        ))}
        <rect x={-150 * s} y={-14 * s} width={300 * s} height={34 * s} rx={17 * s} />
      </g>
    </g>
  );
}

/* ---------- banana / broad leaf ---------- */

function BroadLeaf({ x, y, rot = 0, len = 320, w = 90, fill = "#2f8f4c", vein = "#1b5e37" }) {
  const d = `M0 0C${w * 0.9} ${-len * 0.18} ${w} ${-len * 0.7} 0 ${-len}C${-w} ${
    -len * 0.7
  } ${-w * 0.9} ${-len * 0.18} 0 0Z`;
  let veins = "";
  for (let t = 0.12; t < 0.92; t += 0.07) {
    const yy = -len * t;
    const half = w * Math.sin(Math.PI * Math.min(1, t * 1.05)) * 0.92;
    veins += `M0 ${yy}L${half} ${yy - 22}M0 ${yy}L${-half} ${yy - 22}`;
  }
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <path d={d} fill={fill} />
      <path d={`M0 0L0 ${-len}`} stroke={vein} strokeWidth="3" />
      <path d={veins} stroke={vein} strokeWidth="1.6" opacity="0.5" fill="none" />
    </g>
  );
}

/* ---------- hero scene ---------- */

const FAR = [
  [0, 470], [140, 440], [260, 400], [380, 430], [500, 380], [640, 420],
  [780, 350], [900, 400], [1040, 360], [1180, 410], [1320, 370], [1460, 420], [1600, 390],
];
const MID = [
  [0, 520], [160, 480], [300, 455], [440, 500], [580, 470], [720, 520],
  [860, 480], [1000, 510], [1140, 470], [1300, 505], [1450, 480], [1600, 515],
];

export function HeroScene() {
  const farHatch = useMemo(() => hatchPath(FAR, 4, 170, 90, 12), []);
  const midHatch = useMemo(() => hatchPath(MID, 9, 190, 110, 13), []);
  const ripples = useMemo(() => {
    const r = rng(21);
    return Array.from({ length: 18 }, (_, i) => ({
      x: 60 + r() * 1480,
      y: 668 + r() * 215,
      d: r() * 5,
      k: 0.55 + ((i * 0.07) % 0.5),
    }));
  }, []);
  const shimmer = useMemo(() => {
    const r = rng(77);
    return Array.from({ length: 34 }, () => ({
      x: r() * 1560,
      y: 660 + r() * 230,
      w: 18 + r() * 70,
    }));
  }, []);

  return (
    <>
      {/* ------------------------------ SKY ------------------------------ */}
      <Layer name="sky">
        <defs>
          <linearGradient id="hs-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#173d50" />
            <stop offset="0.27" stopColor="#2e6477" />
            <stop offset="0.44" stopColor="#5d9aa0" />
            <stop offset="0.58" stopColor="#c4d3a4" />
            <stop offset="0.72" stopColor="#f2d68a" />
            <stop offset="1" stopColor="#f6c862" />
          </linearGradient>
          <radialGradient id="hs-glow" cx="1180" cy="430" r="430" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#fff0b8" stopOpacity="0.95" />
            <stop offset="0.5" stopColor="#f7d97d" stopOpacity="0.4" />
            <stop offset="1" stopColor="#f7d97d" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="1600" height="900" fill="url(#hs-sky)" />
        <circle cx="1180" cy="430" r="430" fill="url(#hs-glow)" />
        <circle cx="1180" cy="392" r="46" fill="#fff4c9" opacity="0.8" />
      </Layer>

      {/* ----------------------------- CLOUDS ---------------------------- */}
      <Layer name="clouds">
        <g className="drift drift-a">
          <Cloud x={220} y={95} s={1.9} fill="#25495a" shade="#183746" seed={1} />
          <Cloud x={760} y={60} s={2.2} fill="#2a5062" shade="#1a3b4a" seed={2} />
          <Cloud x={1380} y={90} s={2} fill="#27495b" shade="#183746" seed={3} />
        </g>
        <g className="drift drift-b">
          <Cloud x={420} y={250} s={1.15} fill="#6f9aa4" shade="#547f8c" seed={4} opacity="0.92" />
          <Cloud x={1050} y={230} s={1.3} fill="#76a1aa" shade="#5a8591" seed={5} opacity="0.9" />
          <Cloud x={1500} y={300} s={1} fill="#7ea8ad" shade="#5f8a94" seed={6} opacity="0.9" />
        </g>
        <g className="drift drift-c">
          <Cloud x={140} y={360} s={0.9} fill="#e9e3c4" shade="#cfd1b0" seed={7} opacity="0.85" />
          <Cloud x={880} y={345} s={0.75} fill="#f1e8c3" shade="#dcd5b0" seed={8} opacity="0.8" />
        </g>
        <g className="birds" fill="none" stroke="#10303d" strokeWidth="2.4" strokeLinecap="round">
          <path d="M330 300q9-10 18 0q9-10 18 0" />
          <path d="M370 322q7-8 14 0q7-8 14 0" />
          <path d="M1010 290q8-9 16 0q8-9 16 0" />
          <path d="M1048 308q6-7 12 0q6-7 12 0" />
          <path d="M1090 280q6-7 12 0q6-7 12 0" />
        </g>
      </Layer>

      {/* ------------------------- WESTERN GHATS ------------------------- */}
      <Layer name="ghats">
        <defs>
          <linearGradient id="hs-far" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5b948d" />
            <stop offset="1" stopColor="#7eada0" />
          </linearGradient>
          <linearGradient id="hs-mid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2f8456" />
            <stop offset="1" stopColor="#1f6a43" />
          </linearGradient>
          <radialGradient id="hs-mist">
            <stop offset="0" stopColor="#f4f1dc" stopOpacity="0.75" />
            <stop offset="1" stopColor="#f4f1dc" stopOpacity="0" />
          </radialGradient>
        </defs>
        <path d={smoothPath(FAR, 700)} fill="url(#hs-far)" />
        <path d={farHatch} stroke="#ecf5d2" strokeWidth="1.8" strokeLinecap="round" opacity="0.28" fill="none" />
        <g className="drift drift-b">
          <ellipse cx="500" cy="470" rx="420" ry="44" fill="url(#hs-mist)" />
          <ellipse cx="1250" cy="455" rx="460" ry="40" fill="url(#hs-mist)" />
        </g>
        <path d={smoothPath(MID, 700)} fill="url(#hs-mid)" />
        {[34, 58, 82, 106].map((dy) => (
          <path key={dy} d={ridgeLine(MID, dy)} stroke="#a6dd7e" strokeWidth="2" opacity="0.2" fill="none" />
        ))}
        <path d={midHatch} stroke="#bfe58f" strokeWidth="1.8" strokeLinecap="round" opacity="0.3" fill="none" />
        <g className="drift drift-a">
          <ellipse cx="900" cy="560" rx="520" ry="38" fill="url(#hs-mist)" opacity="0.8" />
        </g>
      </Layer>

      {/* ----------------------------- VILLAGE --------------------------- */}
      <Layer name="village">
        <defs>
          <linearGradient id="hs-water" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#a6d3bf" />
            <stop offset="0.3" stopColor="#58a5a2" />
            <stop offset="1" stopColor="#164f63" />
          </linearGradient>
          <pattern id="hs-net" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <path d="M0 0H9M0 0V9" stroke="#2b1f14" strokeWidth="1" opacity="0.7" />
          </pattern>
          <g id="hs-boat">
            <path d="M-150 -8Q-142 22 -92 26L92 26Q142 22 150 -8Q0 6 -150 -8Z" fill="#3a2819" />
            <path d="M-150 -8Q0 6 150 -8" stroke="#8b5a2b" strokeWidth="3" fill="none" />
            <rect x="-122" y="-34" width="244" height="24" fill="#2a1c11" />
            <rect x="-104" y="-30" width="22" height="14" fill="#f0c040" opacity="0.92" />
            <rect x="-62" y="-30" width="22" height="14" fill="#f0c040" opacity="0.7" />
            <rect x="82" y="-30" width="22" height="14" fill="#f0c040" opacity="0.92" />
            <path d="M-130 -34Q0 -122 130 -34Z" fill="#c9983a" />
            <path d="M-130 -34Q0 -122 130 -34" stroke="#8a5f1d" strokeWidth="3" fill="none" />
            <path d="M-100 -36Q-70 -92 -40 -102M-60 -36Q-38 -92 -12 -108M-20 -36Q-8 -92 12 -110M20 -36Q30 -92 40 -106M60 -36Q76 -88 92 -98M100 -36Q112 -76 118 -84" stroke="#8a5f1d" strokeWidth="2" fill="none" opacity="0.7" />
            <path d="M0 -116L0 -138" stroke="#2a1c11" strokeWidth="3" />
            <path d="M0 -138L26 -130L0 -122Z" fill="#b24a2a" />
          </g>
        </defs>

        {/* water */}
        <rect y="636" width="1600" height="264" fill="url(#hs-water)" />
        {/* sun road */}
        <g stroke="#fff1b0" strokeLinecap="round" opacity="0.55">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <path key={i} d={`M${1180 - (120 - i * 9)} ${652 + i * 15}h${(120 - i * 9) * 2}`} strokeWidth={5 - i * 0.4} opacity={0.75 - i * 0.07} />
          ))}
        </g>
        {shimmer.map((m, i) => (
          <path key={i} d={`M${m.x.toFixed(0)} ${m.y.toFixed(0)}h${m.w.toFixed(0)}`} stroke="#e8f6ea" strokeWidth="2" strokeLinecap="round" opacity="0.2" />
        ))}

        {/* far shore */}
        <path
          d="M0 618C140 604 300 626 470 614S760 606 960 620 1320 606 1600 618L1600 656L0 656Z"
          fill="#1b5c3a"
        />
        <path d="M0 640C200 628 420 646 640 636S1100 630 1320 642 1500 634 1600 640L1600 660L0 660Z" fill="#134a2e" />

        {/* palms on the far shore */}
        <Palm x={96} y={636} h={170} lean={0.18} s={0.85} seed={11} leaf="#1a5f38" leaf2="#237a45" fringe="#114529" trunk="#4a3a22" delay={0.3} />
        <Palm x={190} y={638} h={130} lean={-0.12} s={0.7} seed={12} leaf="#1a5f38" leaf2="#237a45" fringe="#114529" trunk="#4a3a22" delay={1.1} />
        <Palm x={330} y={634} h={150} lean={0.1} s={0.78} seed={13} leaf="#1b6a3f" leaf2="#2a8a4d" fringe="#114529" trunk="#4a3a22" delay={0.7} />
        <Palm x={1225} y={636} h={160} lean={-0.14} s={0.82} seed={14} leaf="#1a5f38" leaf2="#237a45" fringe="#114529" trunk="#4a3a22" delay={0.5} />
        <Palm x={1420} y={638} h={185} lean={0.12} s={0.9} seed={15} leaf="#1b6a3f" leaf2="#2a8a4d" fringe="#114529" trunk="#4a3a22" delay={1.4} />
        <Palm x={1530} y={640} h={140} lean={-0.1} s={0.75} seed={16} leaf="#1a5f38" leaf2="#237a45" fringe="#114529" trunk="#4a3a22" delay={0.9} />

        {/* laterite house with tiled gables */}
        <g transform="translate(560 640)">
          <rect x="0" y="-64" width="176" height="64" fill="#b4502c" />
          <path d="M0 -44H176M0 -22H176M44 -64V-44M104 -64V-44M72 -44V-22M140 -44V-22M30 -22V0M100 -22V0" stroke="#8c3b1d" strokeWidth="1.6" opacity="0.55" fill="none" />
          <path d="M-16 -60L30 -116H146L192 -60Z" fill="#8a3420" />
          <path d="M-16 -60L30 -116H146L192 -60" stroke="#5c2214" strokeWidth="3" fill="none" />
          <path d="M18 -76H158M6 -66H170M40 -96H136M30 -106H146" stroke="#5c2214" strokeWidth="2" opacity="0.6" />
          <rect x="20" y="-48" width="22" height="48" fill="#2a1a10" />
          <rect x="64" y="-52" width="34" height="26" fill="#f0c040" />
          <path d="M81 -52V-26M64 -39H98" stroke="#2a1a10" strokeWidth="2.4" />
          <rect x="124" y="-48" width="26" height="48" fill="#2a1a10" />
          <path d="M-4 -4H180" stroke="#5c2214" strokeWidth="4" />
        </g>
        <g transform="translate(850 640)">
          <rect x="0" y="-44" width="104" height="44" fill="#a84727" />
          <path d="M-12 -42L22 -80H82L116 -42Z" fill="#7a2e1c" />
          <path d="M-12 -42L22 -80H82L116 -42" stroke="#5c2214" strokeWidth="2.4" fill="none" />
          <rect x="14" y="-34" width="18" height="34" fill="#2a1a10" />
          <rect x="52" y="-36" width="22" height="18" fill="#f0c040" opacity="0.9" />
        </g>

        {/* Chinese fishing net */}
        <g transform="translate(1320 646)" stroke="#2b1f14" strokeLinecap="round" fill="none">
          <path d="M-22 0L2 -112M26 0L2 -112" strokeWidth="5" />
          <path d="M-96 -22L84 -150" strokeWidth="5" />
          <path d="M-96 -22L-138 34M-96 -22L-52 40" strokeWidth="2.4" />
          <path d="M-138 34L-52 40L-70 44L-120 40Z" fill="url(#hs-net)" strokeWidth="1.6" />
          <path d="M-96 -22L-138 34L-52 40Z" fill="url(#hs-net)" opacity="0.8" strokeWidth="1.6" />
          <path d="M84 -150L74 -70" strokeWidth="2" />
          <circle cx="74" cy="-64" r="6" fill="#2b1f14" />
        </g>

        {/* houseboat + reflection */}
        <g transform="translate(980 742)">
          <use href="#hs-boat" />
        </g>
        <g transform="translate(980 784) scale(1 -0.45)" opacity="0.22">
          <use href="#hs-boat" />
        </g>

        {/* canoe with umbrella */}
        <g transform="translate(560 812)">
          <path d="M-70 0Q-60 18 -30 20L40 20Q66 14 78 -6Q0 4 -70 0Z" fill="#2c2016" />
          <path d="M-70 0Q0 4 78 -6" stroke="#8b5a2b" strokeWidth="2.5" fill="none" />
          <circle cx="0" cy="-48" r="9" fill="#7a4a2d" />
          <path d="M-9 -38H9L12 -6H-12Z" fill="#f6efd9" />
          <path d="M0 -40V-96" stroke="#2c2016" strokeWidth="2.5" />
          <path d="M-52 -78Q0 -132 52 -78Q26 -88 0 -82Q-26 -88 -52 -78Z" fill="#e8b02e" />
          <path d="M0 -112V-82M-26 -100L-26 -86M26 -100L26 -86" stroke="#b24a2a" strokeWidth="2" />
          <path d="M20 -10L88 -30" stroke="#5a4528" strokeWidth="3" strokeLinecap="round" />
        </g>

        {/* rain on water */}
        <g fill="none" stroke="#f5fbf0" strokeWidth="1.6">
          {ripples.map((p, i) => (
            <ellipse
              key={i}
              className="ripple"
              cx={p.x.toFixed(0)}
              cy={p.y.toFixed(0)}
              rx={(30 * p.k).toFixed(1)}
              ry={(7 * p.k).toFixed(1)}
              style={{ animationDelay: `${p.d.toFixed(2)}s` }}
            />
          ))}
        </g>
      </Layer>

      {/* --------------------------- FOREGROUND -------------------------- */}
      <Layer name="foreground">
        <path d="M0 760Q150 780 280 840L340 900H0Z" fill="#134a2e" />
        <path d="M1600 740Q1450 770 1310 836L1260 900H1600Z" fill="#134a2e" />
        <path d="M0 810Q120 820 210 870L240 900H0Z" fill="#0d3a24" />
        <path d="M1600 800Q1480 816 1390 868L1360 900H1600Z" fill="#0d3a24" />

        <Palm x={70} y={880} h={470} lean={0.16} s={1.25} seed={31} leaf="#16603a" leaf2="#2c8b4b" fringe="#0f4a2a" trunk="#4e3b22" delay={0} />
        <Palm x={1536} y={880} h={420} lean={-0.14} s={1.15} seed={32} leaf="#16603a" leaf2="#2c8b4b" fringe="#0f4a2a" trunk="#4e3b22" delay={0.8} />

        <BroadLeaf x={150} y={900} rot={22} len={330} w={96} fill="#2f8f4c" />
        <BroadLeaf x={60} y={900} rot={-18} len={300} w={84} fill="#247a40" />
        <BroadLeaf x={270} y={900} rot={52} len={240} w={74} fill="#3a9d57" />
        <BroadLeaf x={1450} y={900} rot={-24} len={340} w={98} fill="#2f8f4c" />
        <BroadLeaf x={1540} y={900} rot={16} len={290} w={84} fill="#247a40" />
        <BroadLeaf x={1330} y={900} rot={-54} len={240} w={74} fill="#3a9d57" />

        <g stroke="#0f4a2a" strokeWidth="3" strokeLinecap="round" fill="none">
          <path d="M20 900Q30 850 52 828M44 900Q50 856 74 836M300 900Q310 872 330 856M1580 900Q1570 850 1548 828M1556 900Q1550 856 1526 836M1300 900Q1290 872 1270 856" />
        </g>

        <g>
          {[
            [214, 806, "#b24a2a"], [236, 826, "#e8b02e"], [1384, 802, "#b24a2a"], [1362, 824, "#e8b02e"], [1408, 830, "#b24a2a"],
          ].map(([fx, fy, c], i) => (
            <g key={i} transform={`translate(${fx} ${fy})`}>
              {[0, 72, 144, 216, 288].map((a) => (
                <ellipse key={a} cx="0" cy="-8" rx="5" ry="9" fill={c} transform={`rotate(${a})`} />
              ))}
              <circle r="3.4" fill="#3b1d10" />
            </g>
          ))}
        </g>
        <text
  x="1570"
  y="875"
  textAnchor="end"
  fontSize="24"
  fontFamily="Arial, sans-serif"
  fontWeight="600"
  fill="#f6eedb"
  stroke="#16231d"
  strokeWidth="3"
  paintOrder="stroke"
>
  AI-generated with Claude
</text>
      </Layer>
    </>
  );
}

/* ---------- rain on canvas ---------- */

export function RainCanvas({
  intensity = 1,
  slant = 0.2,
  rgb = "255,255,255",
  maxAlpha = 0.42,
  className = "",
}) {
  const ref = useRef(null);
  const intensityRef = useRef(intensity);

  useEffect(() => {
    intensityRef.current = intensity;
  }, [intensity]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const MAX = 650;
    let w = 0;
    let h = 0;
    let dpr = 1;
    let raf = 0;
    let last = 0;
    let onScreen = true;
    const drops = [];

    const spawn = (anywhere) => ({
      x: Math.random() * (w + 240) - 120,
      y: anywhere ? Math.random() * h : -Math.random() * 60,
      z: Math.random(),
    });

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.lineCap = "round";
      const buckets = [
        { a: 0, b: 0.33, alpha: 0.35, width: 0.9 },
        { a: 0.33, b: 0.66, alpha: 0.6, width: 1.2 },
        { a: 0.66, b: 1.01, alpha: 1, width: 1.7 },
      ];
      for (const bk of buckets) {
        ctx.strokeStyle = `rgba(${rgb},${(bk.alpha * maxAlpha).toFixed(3)})`;
        ctx.lineWidth = bk.width;
        ctx.beginPath();
        for (const d of drops) {
          if (d.z < bk.a || d.z >= bk.b) continue;
          const len = 9 + d.z * 20;
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x - len * slant, d.y - len);
        }
        ctx.stroke();
      }
    };

    const step = (dt) => {
      const target = Math.min(MAX, Math.round(((w * h) / 12000) * intensityRef.current));
      while (drops.length < target) drops.push(spawn(false));
      if (drops.length > target) drops.length = Math.max(target, drops.length - 12);
      for (const d of drops) {
        const speed = 520 + d.z * 980;
        d.y += speed * dt;
        d.x += speed * slant * dt;
        if (d.y > h + 30 || d.x > w + 140) {
          d.y = -20 - Math.random() * 40;
          d.x = Math.random() * (w + 240) - 120;
        }
      }
    };

    const loop = (t) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (t - last) / 1000 || 0.016);
      last = t;
      step(dt);
      draw();
    };

    const start = () => {
      if (raf || reduce || !onScreen || document.hidden) return;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = Math.max(1, Math.round(rect.width));
      h = Math.max(1, Math.round(rect.height));
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reduce) {
        drops.length = 0;
        const n = Math.min(MAX, Math.round(((w * h) / 12000) * intensityRef.current));
        for (let i = 0; i < n; i++) drops.push(spawn(true));
        draw();
      }
    };

    resize();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    let io;
    if ("IntersectionObserver" in window) {
      io = new IntersectionObserver(([entry]) => {
        onScreen = entry.isIntersecting;
        if (onScreen) start();
        else stop();
      });
      io.observe(canvas);
    }
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVis);
    start();

    return () => {
      stop();
      ro.disconnect();
      io?.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [rgb, slant, maxAlpha]);

  return <canvas ref={ref} className={`rain-canvas ${className}`} aria-hidden="true" />;
}

/* ---------- shared SVG defs (kasavu border, roof scales) ---------- */

export function SvgDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
      <defs>
        <pattern id="kasavu-pattern" width="56" height="26" patternUnits="userSpaceOnUse">
          <rect width="56" height="26" fill="#f6eedb" />
          <path d="M0 3H56M0 6H56M0 20H56M0 23H56" stroke="#c99a1e" strokeWidth="1.4" />
          <path d="M14 13L21 7L28 13L21 19Z" fill="#c99a1e" />
          <path d="M42 13L49 7L56 13L49 19Z" fill="#b24a2a" opacity="0.9" />
          <circle cx="35" cy="13" r="2" fill="#c99a1e" />
          <circle cx="7" cy="13" r="2" fill="#c99a1e" />
        </pattern>
        <pattern id="roof-scales" width="46" height="24" patternUnits="userSpaceOnUse">
          <path d="M0 24A23 23 0 0 1 46 24M-23 12A23 23 0 0 1 23 12M23 12A23 23 0 0 1 69 12" fill="none" stroke="#7a2e1c" strokeWidth="2" />
        </pattern>
      </defs>
    </svg>
  );
}

export function Kasavu({ className = "" }) {
  return (
    <svg className={`kasavu ${className}`} width="100%" height="26" aria-hidden="true" focusable="false">
      <rect width="100%" height="26" fill="url(#kasavu-pattern)" />
    </svg>
  );
}

/* ---------- drop mark / swash ---------- */

export function DropMark({ size = 24 }) {
  return (
    <svg width={size} height={size * 1.25} viewBox="0 0 24 30" aria-hidden="true" focusable="false">
      <path d="M12 1C12 1 2 13 2 19a10 10 0 0 0 20 0C22 13 12 1 12 1Z" fill="#e8b02e" stroke="#16231d" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M7 20a5.5 5.5 0 0 0 4 5" stroke="#16231d" strokeWidth="1.6" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function Swash({ color = "#e8b02e", className = "" }) {
  return (
    <svg className={`swash ${className}`} viewBox="0 0 240 16" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path d="M3 10C40 2 78 15 120 7S196 3 237 9" stroke={color} strokeWidth="6" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/* ---------- rain gauge ---------- */

export function RainGauge({ level = 0.5 }) {
  const uid = useId().replace(/:/g, "");
  const clamped = Math.max(0, Math.min(1, level));
  const ticks = Array.from({ length: 11 }, (_, i) => i);

  return (
    <svg className="rain-gauge" viewBox="0 0 120 300" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={`gauge-clip-${uid}`}>
          <path d="M34 14H86V268a26 26 0 0 1-26 20 26 26 0 0 1-26-20Z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#gauge-clip-${uid})`}>
        <rect x="30" y="10" width="60" height="290" fill="#f9f4e4" />
        <g className="gauge-water" style={{ "--lvl": clamped }}>
          <rect x="20" y="40" width="80" height="320" fill="#2f7fa3" />
          <path className="gauge-wave" d="M-40 40q15 -9 30 0t30 0 30 0 30 0 30 0 30 0 30 0 30 0 30 0 30 0 30 0" fill="none" stroke="#9fd2e6" strokeWidth="5" strokeLinecap="round" />
          <path className="gauge-wave gauge-wave-2" d="M-30 46q15 -8 30 0t30 0 30 0 30 0 30 0 30 0 30 0 30 0 30 0 30 0 30 0" fill="none" stroke="#fff" strokeOpacity="0.45" strokeWidth="3" strokeLinecap="round" />
        </g>
      </g>
      <path d="M34 14H86V268a26 26 0 0 1-26 20 26 26 0 0 1-26-20Z" fill="none" stroke="#16231d" strokeWidth="3" strokeLinejoin="round" />
      <path d="M26 14H94" stroke="#16231d" strokeWidth="4" strokeLinecap="round" />
      {ticks.map((i) => (
        <path key={i} d={`M86 ${(24 + i * 23.5).toFixed(1)}H${i % 5 === 0 ? 104 : 98}`} stroke="#16231d" strokeWidth={i % 5 === 0 ? 2.6 : 1.6} strokeLinecap="round" />
      ))}
    </svg>
  );
}

/* ---------- umbrella figure (field note) ---------- */

export function UmbrellaScene() {
  const src = ILLUSTRATION_OVERRIDES.umbrella;
  if (src) return <img className="umbrella-scene" src={src} alt="" draggable="false" />;

  return (
    <svg className="umbrella-scene" viewBox="0 0 360 470" aria-hidden="true" focusable="false">
      <g stroke="#f6eedb" strokeWidth="2" strokeLinecap="round" opacity="0.5">
        {[
          [14, 30], [54, 90], [20, 150], [330, 40], [300, 120], [344, 190], [26, 250], [336, 280], [60, 330], [310, 350], [90, 20], [270, 14],
        ].map(([x, y], i) => (
          <path key={i} d={`M${x} ${y}l-9 26`} />
        ))}
      </g>
      <path d="M18 154Q180 -22 342 154Q292 128 244 154Q212 124 180 154Q148 124 116 154Q68 128 18 154Z" fill="#e8b02e" stroke="#16231d" strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M180 22L116 154M180 22L180 154M180 22L244 154M180 22L66 140M180 22L294 140" stroke="#b24a2a" strokeWidth="2.4" opacity="0.85" />
      <path d="M180 8V22" stroke="#16231d" strokeWidth="5" strokeLinecap="round" />
      <path d="M180 154V262" stroke="#16231d" strokeWidth="5" strokeLinecap="round" />
      <circle cx="170" cy="212" r="21" fill="#7a4a2d" stroke="#16231d" strokeWidth="3" />
      <path d="M150 208Q154 186 172 188Q192 188 192 206Q178 196 150 208Z" fill="#16231d" />
      <path d="M142 244Q170 232 200 244L206 336H136Z" fill="#f6eedb" stroke="#16231d" strokeWidth="3" strokeLinejoin="round" />
      <path d="M198 250Q196 262 182 262" stroke="#16231d" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M136 336H206L220 428H124Z" fill="#f6eedb" stroke="#16231d" strokeWidth="3" strokeLinejoin="round" />
      <path d="M126 414H218M127 421H219" stroke="#c99a1e" strokeWidth="3" />
      <path d="M152 428V452M190 428V452" stroke="#7a4a2d" strokeWidth="9" strokeLinecap="round" />
      <path d="M142 456H164M184 456H206" stroke="#16231d" strokeWidth="4" strokeLinecap="round" />
      <ellipse cx="180" cy="462" rx="120" ry="9" fill="none" stroke="#f6eedb" strokeWidth="2" opacity="0.55" className="puddle" />
      <ellipse cx="180" cy="462" rx="70" ry="5" fill="none" stroke="#f6eedb" strokeWidth="2" opacity="0.55" className="puddle puddle-2" />
      <text
  x="350"
  y="465"
  textAnchor="end"
  fontSize="10"
  fontFamily="Arial, sans-serif"
  fontWeight="600"
  fill="#f6eedb"
  stroke="#16231d"
  strokeWidth="1.5"
  paintOrder="stroke"
>
  AI-generated with Claude
</text>
    </svg>
  );
}

/* ---------- footer scene ---------- */

export function FooterScene() {
  const src = ILLUSTRATION_OVERRIDES.footer;
  const ripples = useMemo(() => {
    const r = rng(5);
    return Array.from({ length: 10 }, () => ({ x: 40 + r() * 1520, y: 330 + r() * 80, d: r() * 4 }));
  }, []);

  if (src) return <img className="footer-scene" src={src} alt="" draggable="false" />;

  return (
    <svg className="footer-scene" viewBox="0 0 1600 420" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="fs-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1d5c67" />
          <stop offset="1" stopColor="#0a2b36" />
        </linearGradient>
      </defs>
      <path d="M0 250Q120 190 260 220T520 200T800 230T1080 190T1360 220T1600 200V420H0Z" fill="#14402f" />
      <path d="M0 290Q200 250 420 275T860 262T1260 280T1600 262V420H0Z" fill="#0f3426" />
      <rect y="316" width="1600" height="104" fill="url(#fs-water)" />
      <path d="M0 312C220 300 420 322 640 310S1100 304 1340 316 1500 310 1600 314L1600 330L0 330Z" fill="#0a2a1d" />
      {[
        [90, 312, 150, 0.15], [170, 314, 110, -0.1], [300, 310, 140, 0.12], [520, 312, 100, -0.08],
        [1030, 312, 120, 0.1], [1210, 314, 150, -0.14], [1350, 312, 108, 0.1], [1500, 314, 160, -0.12],
      ].map(([px, py, ph, pl], i) => (
        <Palm key={i} x={px} y={py} h={ph} lean={pl} s={0.78} seed={50 + i} trunk="#0b2419" ring="#06150f" leaf="#0b2f20" leaf2="#10402b" fringe="#071d14" delay={i * 0.4} />
      ))}
      <g transform="translate(760 336) scale(0.5)" opacity="0.9">
        <path d="M-150 -8Q-142 22 -92 26L92 26Q142 22 150 -8Q0 6 -150 -8Z" fill="#06150f" />
        <path d="M-130 -34Q0 -122 130 -34Z" fill="#0b2419" />
        <rect x="-104" y="-30" width="22" height="14" fill="#e8b02e" opacity="0.85" />
        <rect x="82" y="-30" width="22" height="14" fill="#e8b02e" opacity="0.85" />
      </g>
      <g fill="none" stroke="#bfe0da" strokeWidth="1.6">
        {ripples.map((p, i) => (
          <ellipse key={i} className="ripple" cx={p.x.toFixed(0)} cy={p.y.toFixed(0)} rx="26" ry="6" style={{ animationDelay: `${p.d.toFixed(2)}s` }} />
        ))}
      </g>
      <text
  x="1550"
  y="400"
  textAnchor="end"
  fontSize="20"
  fontFamily="Arial, sans-serif"
  fontWeight="600"
  fill="#f6eedb"
  stroke="#16231d"
  strokeWidth="3"
  paintOrder="stroke"
>
  AI-generated with Claude
</text>
    </svg>
  );
}
