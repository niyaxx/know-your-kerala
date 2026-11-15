import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  DropMark,
  FooterScene,
  HeroScene,
  Kasavu,
  RainCanvas,
  RainGauge,
  SvgDefs,
  Swash,
  UmbrellaScene,
} from "./Illustrations.jsx";
import "./App.css";

/* ================================================================== *
 *  DATA + STATISTICS  (unchanged scientific logic)
 * ================================================================== */

const formatRain = (value) =>
  `${Number(value).toLocaleString("en-IN", {
    maximumFractionDigits: 1,
  })} mm`;

function parseMonth(value) {
  if (!value) return null;

  const date = new Date(`${value}-01T00:00:00`);

  if (!Number.isNaN(date.getTime())) {
    return date;
  }

  const fallback = new Date(value);

  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function median(values) {
  if (!values.length) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
}

// Approximation of the error function for normal-distribution probabilities.
function erf(x) {
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);

  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const t = 1 / (1 + p * x);

  const polynomial =
    (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t;

  return sign * (1 - polynomial * Math.exp(-x * x));
}

function normalCDF(z) {
  return 0.5 * (1 + erf(z / Math.sqrt(2)));
}

// Mann-Kendall test and Sen's slope for annual rainfall totals.
function calculateTrend(annualData) {
  const n = annualData.length;

  if (n < 3) {
    return null;
  }

  let S = 0;

  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      const difference =
        annualData[j].total - annualData[i].total;

      if (difference > 0) S++;
      else if (difference < 0) S--;
    }
  }

  // Tie correction for repeated annual rainfall totals.
  const valueCounts = {};

  annualData.forEach((item) => {
    const key = item.total;
    valueCounts[key] = (valueCounts[key] || 0) + 1;
  });

  const tieCorrection = Object.values(valueCounts).reduce(
    (sum, count) => {
      if (count <= 1) return sum;

      return sum + count * (count - 1) * (2 * count + 5);
    },
    0
  );

  const varianceS =
    (n * (n - 1) * (2 * n + 5) - tieCorrection) / 18;

  let z = 0;

  if (varianceS > 0) {
    const standardDeviation = Math.sqrt(varianceS);

    if (S > 0) {
      z = (S - 1) / standardDeviation;
    } else if (S < 0) {
      z = (S + 1) / standardDeviation;
    }
  }

  const pValue = Math.max(
    0,
    Math.min(1, 2 * (1 - normalCDF(Math.abs(z))))
  );

  // Sen's slope: median of all pairwise slopes.
  const slopes = [];

  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      const yearDifference =
        annualData[j].year - annualData[i].year;

      if (yearDifference === 0) continue;

      const slope =
        (annualData[j].total - annualData[i].total) /
        yearDifference;

      slopes.push(slope);
    }
  }

  const senSlope = median(slopes);

  let interpretation = "No statistically significant trend";

  if (pValue < 0.05 && senSlope > 0) {
    interpretation = "Statistically significant increasing trend";
  } else if (pValue < 0.05 && senSlope < 0) {
    interpretation = "Statistically significant decreasing trend";
  }

  return {
    S,
    z,
    pValue,
    senSlope,
    interpretation,
    significant: pValue < 0.05,
  };
}

/* ================================================================== *
 *  SMALL UI HELPERS
 * ================================================================== */

const reducedMotion = () =>
  typeof window !== "undefined" &&
  !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const fmtNumber = (v) =>
  Number(v).toLocaleString("en-IN", { maximumFractionDigits: 1 });

const monthName = (i) =>
  new Date(2000, i, 1).toLocaleDateString("en-IN", { month: "long" });

// India Meteorological Department four-season convention.
const seasonOf = (i) =>
  i <= 1
    ? "Winter"
    : i <= 4
      ? "Pre-monsoon"
      : i <= 8
        ? "Southwest monsoon"
        : "Post-monsoon / northeast monsoon";

const formatP = (p) => (p < 0.001 ? "< 0.001" : p.toFixed(3));

const SECTIONS = [
  { id: "investigation", n: "01", label: "Investigation" },
  { id: "patterns", n: "02", label: "Patterns" },
  { id: "seasons", n: "03", label: "Seasons" },
  { id: "field-note", n: "04", label: "Field note" },
  { id: "key-findings", n: "05", label: "Findings" },
  { id: "methodology", n: "06", label: "Methodology" },
];

const RAIN_LEVELS = [
  { label: "Drizzle", v: 0.45 },
  { label: "Steady", v: 1 },
  { label: "Downpour", v: 2.3 },
];

function useInView(ref, margin = "0px 0px -8% 0px") {
  const [inView, setInView] = useState(
    typeof IntersectionObserver === "undefined"
  );

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return undefined;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: margin, threshold: 0.1 }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [ref, margin]);

  return inView;
}

function Reveal({ as: Tag = "div", delay = 0, className = "", children, ...rest }) {
  const ref = useRef(null);
  const shown = useInView(ref);

  return (
    <Tag
      ref={ref}
      className={`reveal ${shown ? "is-in" : ""} ${className}`}
      style={{ "--d": `${delay}ms` }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

function AnimatedNumber({ value, format = fmtNumber }) {
  const ref = useRef(null);
  const inView = useInView(ref, "0px");
  const from = useRef(0);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!inView) return undefined;

    if (reducedMotion()) {
      from.current = value;
      setShown(value);
      return undefined;
    }

    const start = performance.now();
    const a = from.current;
    const duration = 1000;
    let raf = 0;

    const tick = (t) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = a + (value - a) * eased;
      from.current = v;
      setShown(v);
      if (p < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, inView]);

  return <span ref={ref}>{format(shown)}</span>;
}

function useChartHeight(desktop, mobile) {
  const [h, setH] = useState(() =>
    typeof window !== "undefined" && window.innerWidth < 640 ? mobile : desktop
  );

  useEffect(() => {
    const on = () => setH(window.innerWidth < 640 ? mobile : desktop);
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, [desktop, mobile]);

  return h;
}

/* ---------- modal ---------- */

function Modal({ onClose, labelledBy, tone = "paper", children }) {
  const ref = useRef(null);

  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !ref.current) return;

      const items = ref.current.querySelectorAll(
        'button, [href], select, input, [tabindex]:not([tabindex="-1"])'
      );
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    ref.current?.querySelector(".modal-close")?.focus();

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`modal modal-${tone}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        ref={ref}
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M4 4L16 16M16 4L4 16" />
          </svg>
        </button>
        {children}
      </div>
    </div>
  );
}

/* ---------- chart pieces ---------- */

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="chart-tooltip">
      <p>{label}</p>
      <strong>{formatRain(payload[0].value)}</strong>
    </div>
  );
}

// A raindrop-capped column used for the seasonal chart.
function DripBar({ x, y, width, height, index, activeIndex, onHover, onPick }) {
  const w = Math.min(width, 30);
  const cx = x + width / 2;
  const left = cx - w / 2;
  const active = index === activeIndex;
  const monsoon = index >= 5 && index <= 8;
  const fill = active ? "#e8b02e" : monsoon ? "#8fd0ea" : "#4f94b5";
  const h = Math.max(0, height);

  return (
    <g
      className={`drip-bar ${active ? "is-active" : ""}`}
      onMouseEnter={() => onHover(index)}
      onClick={() => onPick(index)}
      style={{ cursor: "pointer" }}
    >
      <rect x={x - 10} y={y - 420} width={width + 20} height={h + 420} fill="transparent" />
      {h > 0 && (
        <>
          <path
            d={`M${left} ${y + h}V${y + w / 2}A${w / 2} ${w / 2} 0 0 1 ${left + w} ${y + w / 2}V${y + h}Z`}
            fill={fill}
          />
          <path
            d={`M${left + w * 0.28} ${y + h - 4}V${y + w / 2 + 2}`}
            stroke="#fff"
            strokeOpacity="0.38"
            strokeWidth="2.4"
            strokeLinecap="round"
            fill="none"
          />
        </>
      )}
      {active && (
        <path
          className="drip-drop"
          d={`M${cx} ${y - 26}c-5 7 -7 10 -7 14a7 7 0 0 0 14 0c0 -4 -2 -7 -7 -14Z`}
          fill="#e8b02e"
        />
      )}
    </g>
  );
}

// Twelve calendar months arranged like a clock face, January at the top.
function RainClock({ monthly, highlight }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(...monthly.map((m) => m.rainfall), 1);
  const cx = 170;
  const cy = 170;
  const r0 = 48;
  const rMax = 118;

  const polar = (r, deg) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };

  const shown = hover ?? highlight;

  return (
    <svg className="rain-clock" viewBox="0 0 340 340" role="img" aria-label="Average rainfall for each calendar month, arranged as a clock">
      <circle cx={cx} cy={cy} r={r0 + 4} fill="none" stroke="#16231d" strokeWidth="1.5" strokeDasharray="2 5" />
      {monthly.map((m, i) => {
        const a0 = i * 30 + 2;
        const a1 = i * 30 + 28;
        const r1 = r0 + 8 + (m.rainfall / max) * (rMax - r0 - 8);
        const [x0, y0] = polar(r0, a0);
        const [x1, y1] = polar(r1, a0);
        const [x2, y2] = polar(r1, a1);
        const [x3, y3] = polar(r0, a1);
        const [lx, ly] = polar(rMax + 24, i * 30 + 15);
        const isHi = i === highlight;
        const isOn = i === shown;

        return (
          <g
            key={m.month}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            tabIndex={0}
            className={`clock-wedge ${isOn ? "is-on" : ""}`}
          >
            <title>{`${monthName(i)}: ${formatRain(m.rainfall)} average`}</title>
            <path
              d={`M${x0} ${y0}L${x1} ${y1}A${r1} ${r1} 0 0 1 ${x2} ${y2}L${x3} ${y3}A${r0} ${r0} 0 0 0 ${x0} ${y0}Z`}
              fill={isHi ? "#e8b02e" : "#2f7fa3"}
              fillOpacity={isHi ? 1 : 0.35 + 0.65 * (m.rainfall / max)}
              stroke="#16231d"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" className="clock-label">
              {m.month.slice(0, 1)}
            </text>
          </g>
        );
      })}
      <text x={cx} y={cy - 6} textAnchor="middle" className="clock-center">
        {monthly[shown]?.month}
      </text>
      <text x={cx} y={cy + 16} textAnchor="middle" className="clock-sub">
        {shown === highlight ? "wettest" : "average"}
      </text>
    </svg>
  );
}

// Annual totals drawn as pencil strokes: one per complete year.
function AnnualTally({ annual }) {
  if (!annual.length) {
    return <p className="tally-empty">No complete calendar year in this view.</p>;
  }
  const max = Math.max(...annual.map((a) => a.total), 1);

  return (
    <figure className="tally" aria-label="Annual rainfall totals for each complete year">
      <div className="tally-bars">
        {annual.map((a, i) => (
          <span
            key={a.year}
            className="tally-bar"
            style={{ "--h": `${Math.max(6, (a.total / max) * 100)}%`, "--i": i }}
            title={`${a.year}: ${formatRain(a.total)}`}
          />
        ))}
      </div>
      <figcaption>
        <span>{annual[0].year}</span>
        <span>annual totals, mm</span>
        <span>{annual[annual.length - 1].year}</span>
      </figcaption>
    </figure>
  );
}

/* ---------- period controls (shared by ledger + floating dock) ---------- */

function PeriodControls({ value, onChange, years, label }) {
  const chips = [
    ["all", "All years"],
    ["last10", "Recent 10"],
    ["last5", "Recent 5"],
  ];

  return (
    <div className="period">
      <div className="period-chips" role="group" aria-label="Quick time periods">
        {chips.map(([v, t]) => (
          <button
            key={v}
            type="button"
            className={`chip ${value === v ? "is-on" : ""}`}
            aria-pressed={value === v}
            onClick={() => onChange(v)}
          >
            {t}
          </button>
        ))}
      </div>

      <label className="period-select">
        <span>Or a single year</span>
        <select
          className="year-filter"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-label="Select rainfall time period"
        >
          <option value="all">All available years</option>
          <option value="last10">Recent 10 years</option>
          <option value="last5">Recent 5 years</option>

          {years.map((year) => (
            <option key={year} value={String(year)}>
              {year} only
            </option>
          ))}
        </select>
      </label>

      <span className="filter-range">VIEWING: {label}</span>
    </div>
  );
}

function PeriodDock({ visible, ...controls }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={`dock ${visible ? "is-visible" : ""} ${open ? "is-open" : ""}`}>
      {open && (
        <div className="dock-panel" role="dialog" aria-label="Change time period">
          <p className="dock-title">Change the time period</p>
          <PeriodControls {...controls} />
        </div>
      )}
      <button
        type="button"
        className="dock-button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        tabIndex={visible ? 0 : -1}
      >
        <DropMark size={14} />
        <span>
          <small>Viewing</small> {controls.label}
        </span>
        <b aria-hidden="true">{open ? "×" : "↕"}</b>
      </button>
    </div>
  );
}

/* ================================================================== *
 *  SECTIONS
 * ================================================================== */

function Nav({ activeId, scrolled, menuOpen, setMenuOpen }) {
  return (
    <>
      <nav className={`navbar ${scrolled ? "is-scrolled" : ""}`}>
        <a className="brand" href="#top" onClick={() => setMenuOpen(false)}>
          <DropMark size={17} />
          <span>Know Your Kerala</span>
        </a>

        <div className="nav-links">
          {SECTIONS.filter((s) => s.id !== "field-note").map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className={activeId === s.id ? "is-active" : ""}
            >
              {s.label}
            </a>
          ))}
        </div>

        <div className="nav-status">
          <span className="status-dot" />
          NASA GPM IMERG
        </div>

        <button
          type="button"
          className={`menu-toggle ${menuOpen ? "is-open" : ""}`}
          aria-expanded={menuOpen}
          aria-controls="menu-sheet"
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span>{menuOpen ? "Close" : "Menu"}</span>
          <i />
        </button>
      </nav>

      <div id="menu-sheet" className={`menu-sheet ${menuOpen ? "is-open" : ""}`} aria-hidden={!menuOpen}>
        <ol>
          {SECTIONS.map((s, i) => (
            <li key={s.id} style={{ "--i": i }}>
              <a href={`#${s.id}`} onClick={() => setMenuOpen(false)} tabIndex={menuOpen ? 0 : -1}>
                <small>{s.n}</small>
                {s.label}
              </a>
            </li>
          ))}
        </ol>
        <Kasavu />
      </div>
    </>
  );
}

function Rail({ activeId, railRef }) {
  const chapters = [{ id: "top", n: "00", label: "Prologue" }, ...SECTIONS];

  return (
    <aside className="rail" ref={railRef} aria-label="Chapters">
      <span className="rail-line" aria-hidden="true" />
      <span className="rail-fill" aria-hidden="true" />
      <span className="rail-drop" aria-hidden="true" />
      <ol>
        {chapters.map((c) => (
          <li key={c.id}>
            <a href={`#${c.id}`} className={activeId === c.id ? "is-active" : ""}>
              <b>{c.n}</b>
              <span>{c.label}</span>
            </a>
          </li>
        ))}
      </ol>
    </aside>
  );
}

function Hero({ range, onExplore }) {
  const ref = useRef(null);
  const [level, setLevel] = useState(1);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const reduce = reducedMotion();
    let raf = 0;

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const vh = window.innerHeight;
        const y = Math.min(window.scrollY, vh * 1.2);
        el.style.setProperty("--scroll", y.toFixed(1));
        el.style.setProperty("--fade", Math.max(0, 1 - y / (vh * 0.55)).toFixed(3));
      });
    };

    const onMove = (e) => {
      if (reduce) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", (((e.clientX - r.left) / r.width - 0.5) * 2).toFixed(3));
      el.style.setProperty("--my", (((e.clientY - r.top) / r.height - 0.5) * 2).toFixed(3));
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("pointermove", onMove);
    return () => {
      window.removeEventListener("scroll", onScroll);
      el.removeEventListener("pointermove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const letters = (text, offset = 0) =>
    text.split("").map((ch, i) => (
      <span
        key={`${text}-${i}`}
        className="ch"
        style={{ "--i": i + offset }}
        aria-hidden="true"
      >
        {ch === " " ? "\u00a0" : ch}
      </span>
    ));

  const seamBack = "M0 55Q200 105 400 55T800 55T1200 55T1600 55T2000 55T2400 55T2800 55T3200 55V90H0Z";
  const seam = "M0 55Q200 5 400 55T800 55T1200 55T1600 55T2000 55T2400 55T2800 55T3200 55V90H0Z";

  return (
    <header className="hero" id="top" ref={ref}>
      <div className="hero-scene" aria-hidden="true">
        <HeroScene />
      </div>
      <RainCanvas intensity={RAIN_LEVELS[level].v} className="hero-rain" />
      <div className="hero-shade" aria-hidden="true" />

      <div className="hero-copy">
        <p className="hero-kicker">
          <span>NASA GPM IMERG</span>
          <i />
          <span>Kerala, India</span>
          <i />
          <span>
            {range.first} — {range.last}
          </span>
        </p>

        <h1 aria-label="Know your Kerala">
          <span className="h1-small">{letters("KNOW YOUR")}</span>
          <span className="h1-big">{letters("KERALA", 9)}</span>
        </h1>

        <p className="hero-line">The rhythm of Kerala’s rain.</p>
        <p className="hero-ml" lang="ml">
          മഴയുടെ താളം
        </p>
      </div>

      <div className="hero-foot">
        <p className="hero-coords">
          09° N <i /> 76° E
          <span>Monsoon season</span>
        </p>

        <button type="button" className="explore" onClick={onExplore}>
          <span>Explore the data</span>
          <svg viewBox="0 0 24 34" aria-hidden="true">
            <path className="explore-drop" d="M12 3C12 3 4 13 4 19a8 8 0 0 0 16 0C20 13 12 3 12 3Z" />
          </svg>
        </button>

        <div className="rain-control" role="radiogroup" aria-label="Rain intensity">
          <span>Rain</span>
          {RAIN_LEVELS.map((l, i) => (
            <button
              key={l.label}
              type="button"
              role="radio"
              aria-checked={level === i}
              className={level === i ? "is-on" : ""}
              onClick={() => setLevel(i)}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <svg className="hero-seam" viewBox="0 0 3200 90" preserveAspectRatio="none" aria-hidden="true">
        <path className="seam seam-back" d={seamBack} />
        <path className="seam seam-front" d={seam} />
      </svg>
    </header>
  );
}

function Prologue({ range, records }) {
  return (
    <section className="prologue">
      <div className="wrap">
        <Reveal as="p" className="prologue-text">
          Reading the rhythm of the monsoon. A data-driven investigation into rainfall patterns
          across Kerala, and what the numbers reveal about our <em>changing climate.</em>
        </Reveal>

        <Reveal className="prologue-facts" delay={120}>
          <p>
            <small>Source</small>NASA GPM IMERG
          </p>
          <p>
            <small>Place</small>Kerala, India
          </p>
          <p>
            <small>Record</small>
            {range.first} — {range.last}
          </p>
          <p>
            <small>Observations</small>
            {records} monthly values
          </p>
        </Reveal>
      </div>
      <span className="prologue-thread" aria-hidden="true" />
    </section>
  );
}

function InfoButton({ onClick, label }) {
  return (
    <button type="button" className="info-btn" onClick={onClick} aria-label={`About ${label}`}>
      ?
    </button>
  );
}

function Ledger({ stats, trendIsUp, controls, fullTotal, range, openModal }) {
  const share = fullTotal > 0 ? Math.round((stats.total / fullTotal) * 100) : 0;

  return (
    <section className="ledger" id="investigation">
      <div className="wrap">
        <div className="section-head">
          <Reveal>
            <p className="kicker">
              <b>01</b> / The big picture
            </p>
            <h2>
              Rainfall at a glance<span>.</span>
            </h2>
            <Swash className="swash-head" />
          </Reveal>
          <Reveal as="p" className="lede" delay={100}>
            Monthly precipitation observations
            <br />
            aggregated across the study region.
          </Reveal>
        </div>

        <Reveal className="ledger-controls">
          <div className="filter-label">
            <span className="filter-dot" />
            EXPLORE TIME PERIOD
          </div>
          <PeriodControls {...controls} />
        </Reveal>

        <div className="ledger-grid">
          <Reveal as="article" className="fig fig-total">
            <div className="fig-label">
              <span>TOTAL PRECIPITATION</span>
              <InfoButton label="total precipitation" onClick={() => openModal({ type: "stat", key: "total" })} />
            </div>
            <div className="fig-body">
              <div className="gauge-wrap">
                <RainGauge level={share / 100} />
                <p>
                  <b>{share}%</b> of the {range.first}–{range.last} record
                </p>
              </div>
              <div>
                <p className="fig-value">
                  <AnimatedNumber value={stats.total} />
                  <small>mm</small>
                </p>
                <p className="fig-note">Across {stats.records} monthly records</p>
              </div>
            </div>
          </Reveal>

          <Reveal as="article" className="fig fig-mean" delay={90}>
            <div className="fig-label">
              <span>MONTHLY MEAN</span>
              <InfoButton label="monthly mean" onClick={() => openModal({ type: "stat", key: "mean" })} />
            </div>
            <p className="fig-value">
              <AnimatedNumber value={stats.average} />
              <small>mm</small>
            </p>
            <p className="fig-note">Average per recorded month</p>
            <svg className="fig-doodle" viewBox="0 0 220 40" aria-hidden="true">
              {Array.from({ length: 12 }, (_, i) => (
                <path
                  key={i}
                  d={`M${12 + i * 17} 6c-4 6 -5.5 8 -5.5 11a5.5 5.5 0 0 0 11 0c0 -3 -1.5 -5 -5.5 -11Z`}
                  fill="none"
                  stroke="#16231d"
                  strokeWidth="1.4"
                />
              ))}
            </svg>
          </Reveal>

          <Reveal as="article" className="fig fig-sen" delay={60}>
            <div className="fig-label">
              <span>SEN&apos;S SLOPE</span>
              <InfoButton label="Sen's slope" onClick={() => openModal({ type: "stat", key: "sen" })} />
            </div>
            <p className="fig-value">
              {stats.trendResult === null ? (
                "—"
              ) : (
                <>
                  <AnimatedNumber
                    value={stats.trendResult.senSlope}
                    format={(v) => `${trendIsUp && v >= 0 ? "+" : ""}${Number(v).toFixed(1)}`}
                  />
                  <small>mm/yr</small>
                </>
              )}
            </p>
            <p className="fig-note">
              {stats.trendResult === null
                ? "Requires at least 3 complete years"
                : "Robust annual trend estimate"}
            </p>
            {stats.trendResult !== null && (
              <svg className={`fig-arrow ${trendIsUp ? "is-up" : "is-down"}`} viewBox="0 0 160 90" aria-hidden="true">
                <path d={trendIsUp ? "M8 74C40 70 60 52 84 40S128 18 148 12" : "M8 14C40 18 60 38 84 50S128 72 148 78"} />
                <path d={trendIsUp ? "M122 8L150 11L142 38" : "M122 82L150 79L142 52"} />
              </svg>
            )}
            <button type="button" className="text-link" onClick={() => openModal({ type: "trend" })}>
              Open the Mann–Kendall readout
            </button>
          </Reveal>

          <Reveal as="article" className="fig fig-wet" delay={140}>
            <div className="fig-label">
              <span>WETTEST MONTH</span>
              <InfoButton label="wettest month" onClick={() => openModal({ type: "stat", key: "wet" })} />
            </div>
            <p className="fig-value fig-month">
              <span className="marker">{stats.wettestMonth.month}</span>
            </p>
            <p className="fig-note">
              {formatRain(stats.wettestMonth.rainfall) + " average for this month"}
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Timeline({ filteredData, periodLabel, onPick }) {
  const height = useChartHeight(380, 290);
  const peak = useMemo(
    () => filteredData.reduce((a, b) => (b.rainfall > a.rainfall ? b : a), filteredData[0]),
    [filteredData]
  );

  const handleClick = (state) => {
    const label = state?.activeLabel ?? state?.activePayload?.[0]?.payload?.month;
    let item = label ? filteredData.find((d) => d.month === label) : null;
    if (!item && state?.activeIndex !== undefined) item = filteredData[Number(state.activeIndex)];
    if (item) onPick(item);
  };

  return (
    <section className="timeline" id="patterns">
      <div className="wrap">
        <div className="section-head section-head-split">
          <Reveal>
            <p className="kicker">
              <b>02</b> / Long-term signal
            </p>
            <h2>
              The rainfall timeline<span>.</span>
            </h2>
            <Swash className="swash-head" color="#2f7fa3" />
            <p className="lede">
              Monthly precipitation through the years. Explore the peaks, dips, and shifts.
            </p>
          </Reveal>

          <Reveal className="stamp-wrap" delay={120}>
            <div className="stamp" key={periodLabel}>
              <span>{periodLabel.toUpperCase()}</span>
            </div>
          </Reveal>
        </div>

        <Reveal className="plate">
          <div className="plate-top">
            <span>PRECIPITATION / TIME SERIES</span>
            <span className="plate-hint">Select any point for the month’s story</span>
            <span className="chart-unit">MILLIMETERS (MM)</span>
          </div>

          <div className="plate-chart">
            <ResponsiveContainer width="100%" height={height}>
              <AreaChart
                data={filteredData}
                onClick={handleClick}
                margin={{ top: 34, right: 12, left: -6, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="rainGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2f7fa3" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#2f7fa3" stopOpacity={0.04} />
                  </linearGradient>
                </defs>

                <CartesianGrid stroke="#16231d" strokeOpacity={0.14} strokeDasharray="2 6" vertical={false} />

                <XAxis
                  dataKey="month"
                  tick={{ fill: "#4a554f", fontSize: 11, fontFamily: "DM Mono, monospace" }}
                  axisLine={{ stroke: "#16231d", strokeOpacity: 0.5 }}
                  tickLine={false}
                  minTickGap={45}
                />

                <YAxis
                  tick={{ fill: "#4a554f", fontSize: 11, fontFamily: "DM Mono, monospace" }}
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ stroke: "#b24a2a", strokeWidth: 1.4, strokeDasharray: "3 4" }}
                />

                <Area
                  type="monotone"
                  dataKey="rainfall"
                  stroke="#1d5f80"
                  strokeWidth={2.4}
                  fill="url(#rainGradient)"
                  dot={false}
                  activeDot={{ r: 6, fill: "#e8b02e", stroke: "#16231d", strokeWidth: 2 }}
                />

                <ReferenceDot
                  x={peak.month}
                  y={peak.rainfall}
                  r={6}
                  fill="#e8b02e"
                  stroke="#16231d"
                  strokeWidth={2}
                  label={{
                    value: "wettest month in view",
                    position: "top",
                    fill: "#b24a2a",
                    fontSize: 19,
                    fontFamily: "Caveat, cursive",
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="plate-foot">
            <button type="button" className="text-link" onClick={() => onPick(peak)}>
              Open the wettest month in view: {peak.month}
            </button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Seasons({ stats }) {
  const height = useChartHeight(380, 300);
  const wettestIdx = useMemo(
    () => stats.monthly.reduce((bi, m, i, a) => (m.rainfall > a[bi].rainfall ? i : bi), 0),
    [stats.monthly]
  );
  const [pinned, setPinned] = useState(null);
  const [hover, setHover] = useState(null);
  const active = hover ?? pinned ?? wettestIdx;
  const current = stats.monthly[active];
  const maxRain = stats.monthly[wettestIdx].rainfall || 1;
  const sum = stats.monthly.reduce((s, m) => s + m.rainfall, 0);
  const rank =
    [...stats.monthly]
      .map((m, i) => ({ i, r: m.rainfall }))
      .sort((a, b) => b.r - a.r)
      .findIndex((m) => m.i === active) + 1;
  const intensity = 0.1 + 2.4 * (current.rainfall / maxRain);

  return (
    <section className="seasons" id="seasons">
      <RainCanvas intensity={intensity} className="seasons-rain" rgb="190,225,240" maxAlpha={0.5} slant={0.12} />
      <svg className="seasons-ghats" viewBox="0 0 1600 110" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 0H1600V66Q1450 16 1300 60T1020 48T760 76T500 38T240 68T0 44Z" />
      </svg>

      <div className="wrap">
        <div className="section-head">
          <Reveal>
            <p className="kicker">
              <b>03</b> / Seasonality
            </p>
            <h2>
              When does Kerala get wet?<span>.</span>
            </h2>
            <Swash className="swash-head" color="#8fd0ea" />
          </Reveal>
          <Reveal as="p" className="lede" delay={100}>
            Average rainfall by calendar month across the selected period.
            <br />
            <em>Hover or tap a month: the rain above changes with it.</em>
          </Reveal>
        </div>

        <div className="seasons-grid">
          <Reveal className="seasons-plate" onMouseLeave={() => setHover(null)}>
            <div className="plate-top plate-top-light">
              <span>MONTHLY CLIMATOLOGY</span>
              <span className="chart-unit">AVERAGE / MM</span>
            </div>

            <ResponsiveContainer width="100%" height={height}>
              <BarChart data={stats.monthly} margin={{ top: 36, right: 6, left: -8, bottom: 0 }}>
                <CartesianGrid stroke="#f6eedb" strokeOpacity={0.16} strokeDasharray="2 6" vertical={false} />

                <XAxis
                  dataKey="month"
                  tick={{ fill: "#cfe0e0", fontSize: 12, fontFamily: "DM Mono, monospace" }}
                  axisLine={{ stroke: "#f6eedb", strokeOpacity: 0.4 }}
                  tickLine={false}
                />

                <YAxis
                  tick={{ fill: "#cfe0e0", fontSize: 11, fontFamily: "DM Mono, monospace" }}
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip content={<CustomTooltip />} cursor={false} />

                <Bar
                  dataKey="rainfall"
                  maxBarSize={44}
                  shape={(props) => (
                    <DripBar
                      {...props}
                      activeIndex={active}
                      onHover={setHover}
                      onPick={(i) => setPinned((p) => (p === i ? null : i))}
                    />
                  )}
                />
              </BarChart>
            </ResponsiveContainer>

            <div className="month-strip" role="group" aria-label="Choose a calendar month">
              {stats.monthly.map((m, i) => (
                <button
                  key={m.month}
                  type="button"
                  className={`${active === i ? "is-on" : ""} ${i >= 5 && i <= 8 ? "is-monsoon" : ""}`}
                  aria-pressed={pinned === i}
                  onMouseEnter={() => setHover(i)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  onClick={() => setPinned((p) => (p === i ? null : i))}
                >
                  {m.month}
                </button>
              ))}
            </div>

            <ul className="legend">
              <li><i className="lg-monsoon" /> Jun–Sep, southwest monsoon</li>
              <li><i className="lg-other" /> Other months</li>
              <li><i className="lg-active" /> Selected</li>
            </ul>
          </Reveal>

          <Reveal className="specimen" delay={120}>
            <p className="specimen-kicker">MONTH SPECIMEN</p>
            <h3 key={active}>{monthName(active)}</h3>
            <p className="specimen-season">{seasonOf(active)}</p>

            <p className="specimen-value">
              <AnimatedNumber value={current.rainfall} />
              <small>mm average</small>
            </p>

            <div className="specimen-bar" aria-hidden="true">
              <span style={{ width: `${Math.max(2, (current.rainfall / maxRain) * 100)}%` }} />
            </div>
            <p className="specimen-bar-note">against the wettest month, {stats.monthly[wettestIdx].month}</p>

            <dl>
              <div>
                <dt>Share of the yearly climatology</dt>
                <dd>{sum > 0 ? ((current.rainfall / sum) * 100).toFixed(1) : "0.0"}%</dd>
              </div>
              <div>
                <dt>Rank among 12 months</dt>
                <dd>#{rank}</dd>
              </div>
            </dl>

            <p className="specimen-foot">
              Seasons follow the India Meteorological Department’s four-season convention.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function FieldNote() {
  return (
    <section className="note" id="field-note">
      <svg className="note-roof" width="100%" height="72" aria-hidden="true" focusable="false">
        <rect width="100%" height="72" fill="url(#roof-scales)" />
      </svg>
      <div className="wrap note-grid">
        <div className="note-text">
          <Reveal as="p" className="kicker kicker-light">
            <b>04</b> / THE INVESTIGATION <span className="note-index">FIELD NOTE 001</span>
          </Reveal>

          <Reveal as="h2" delay={80}>
            A trend is <em>not</em> a verdict.
          </Reveal>

          <Reveal as="p" className="note-body" delay={160}>
            A linear trend can help us identify a long-term direction, but it does not explain
            every year’s rainfall. Monsoon variability, regional differences, and extreme events
            all matter. The data is a starting point for asking better questions—not a prediction
            of what comes next.
          </Reveal>

          <Reveal className="note-steps" delay={240}>
            <span>OBSERVE</span>
            <i>→</i>
            <span>ANALYZE</span>
            <i>→</i>
            <span>QUESTION</span>
          </Reveal>
          <p className="note-tag">KERALA / EARTH SYSTEMS</p>
        </div>

        <Reveal className="note-art" delay={120}>
          <UmbrellaScene />
        </Reveal>
      </div>
    </section>
  );
}

function Findings({ stats, openModal }) {
  const t = stats.trendResult;
  const wettestIdx = stats.monthly.reduce(
    (bi, m, i, a) => (m.rainfall > a[bi].rainfall ? i : bi),
    0
  );

  return (
    <section className="findings" id="key-findings">
      <div className="wrap">
        <Reveal>
          <p className="kicker">
            <b>05</b> / Key findings
          </p>
          <h2>
            What the data <span>reveals.</span>
          </h2>
        </Reveal>

        <div className="finding-list">
          <Reveal as="article" className="finding finding-a">
            <span className="finding-index" aria-hidden="true">01</span>
            <div className="finding-text">
              <span className="finding-number">01 / LONG-TERM TREND</span>
              <h3>
                {t === null
                  ? "Trend unavailable"
                  : t.senSlope > 0
                    ? "An upward signal."
                    : t.senSlope < 0
                      ? "A downward signal."
                      : "A stable signal."}
              </h3>
              <p>
                {t === null
                  ? "Select multiple years to calculate a long-term rainfall trend."
                  : `Sen's slope estimates a change of ${t.senSlope.toFixed(2)} mm/year. ${
                      t.significant
                        ? "The trend is statistically significant at the 5% level."
                        : "The trend is not statistically significant at the 5% level."
                    }`}
              </p>
              {t !== null && (
                <button type="button" className="text-link" onClick={() => openModal({ type: "trend" })}>
                  See the test statistics
                </button>
              )}
            </div>
            <div className="finding-viz">
              <AnnualTally annual={stats.annual} />
            </div>
          </Reveal>

          <Reveal as="article" className="finding finding-b">
            <span className="finding-index" aria-hidden="true">02</span>
            <div className="finding-viz">
              <RainClock monthly={stats.monthly} highlight={wettestIdx} />
            </div>
            <div className="finding-text">
              <span className="finding-number">02 / SEASONAL PATTERN</span>
              <h3>The wettest month.</h3>
              <p>
                {stats.wettestMonth.month} records the highest average monthly rainfall among the
                calendar months in the selected period, at {formatRain(stats.wettestMonth.rainfall)}.
                This reflects Kerala&apos;s seasonal rainfall pattern.
              </p>
            </div>
          </Reveal>

          <Reveal as="article" className="finding finding-c">
            <span className="finding-index" aria-hidden="true">03</span>
            <div className="finding-text">
              <span className="finding-number">03 / DATA COVERAGE</span>
              <h3>{stats.completeYears} complete years.</h3>
              <p>
                The trend analysis uses {stats.completeYears} complete calendar years. Each included
                year contains all 12 monthly records, helping maintain consistency in annual
                comparisons.
              </p>
            </div>
            <div className="finding-viz">
              <ul className="year-grid" aria-label="Complete years included in the trend analysis">
                {stats.annual.map((a) => (
                  <li key={a.year}>{String(a.year).slice(2)}</li>
                ))}
                {!stats.annual.length && <li className="year-empty">none</li>}
              </ul>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Method({ stats, periodLabel, openModal }) {
  const t = stats.trendResult;

  return (
    <section className="method" id="methodology">
      <div className="wrap method-grid">
        <div className="method-side">
          <Reveal>
            <p className="kicker">
              <b>06</b> / DATA &amp; METHOD
            </p>
            <h2>
              Follow the signal<span>.</span>
            </h2>
          </Reveal>

          <Reveal as="aside" className="readout" delay={100} aria-label="Live statistics readout">
            <p className="readout-title">
              LIVE READOUT <span>{periodLabel}</span>
            </p>
            <dl>
              <div><dt>Monthly records</dt><dd>{stats.records}</dd></div>
              <div><dt>Complete years (n)</dt><dd>{stats.completeYears}</dd></div>
              <div><dt>Mann–Kendall S</dt><dd>{t ? t.S : "—"}</dd></div>
              <div><dt>Z statistic</dt><dd>{t ? t.z.toFixed(3) : "—"}</dd></div>
              <div><dt>p-value</dt><dd>{t ? formatP(t.pValue) : "—"}</dd></div>
              <div>
                <dt>Sen&apos;s slope</dt>
                <dd>{t ? `${t.senSlope.toFixed(2)} mm/yr` : "—"}</dd>
              </div>
            </dl>
            <p className="readout-verdict">{t ? t.interpretation : "Requires at least 3 complete years"}</p>
            {t && (
              <button type="button" className="text-link" onClick={() => openModal({ type: "trend" })}>
                Open as a popup
              </button>
            )}
          </Reveal>
        </div>

        <div className="method-list">
          <Reveal as="article" className="method-item">
            <span className="method-number">01</span>
            <div>
              <h3>Data source</h3>
              <p>
                NASA Global Precipitation Measurement (GPM) IMERG Version 07 satellite precipitation
                estimates. Monthly rainfall records are used to examine long-term precipitation
                patterns.
              </p>
            </div>
          </Reveal>

          <Reveal as="article" className="method-item" delay={80}>
            <span className="method-number">02</span>
            <div>
              <h3>Study region</h3>
              <p>
                Kerala, India. Monthly rainfall values represent the regional aggregation used in
                the dataset. Annual totals are calculated from monthly values. Only years with all 12
                calendar months are included in annual trend analysis.
              </p>
            </div>
          </Reveal>

          <Reveal as="article" className="method-item" delay={160}>
            <span className="method-number">03</span>
            <div>
              <h3>Statistical analysis</h3>
              <p>
                Monthly time series and calendar-month averages reveal seasonal patterns. The
                Mann–Kendall test evaluates the direction and statistical significance of the annual
                rainfall trend, while Sen’s slope estimates its magnitude in mm/year. A p-value
                below 0.05 is used as the significance threshold.
              </p>
            </div>
          </Reveal>

          <Reveal as="ol" className="pipeline" delay={200} aria-label="Analysis pipeline">
            <li>Monthly GPM IMERG values</li>
            <li>Annual totals, complete years only</li>
            <li>Mann–Kendall test</li>
            <li>Sen&apos;s slope</li>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="footer" id="footer">
      <Kasavu />
      <div className="footer-art">
        <FooterScene />
        <RainCanvas intensity={0.5} className="footer-rain" rgb="200,230,235" maxAlpha={0.35} slant={0.14} />
      </div>
      <div className="footer-inner">
        <p className="footer-word" aria-hidden="true">
          KNOW YOUR KERALA
        </p>
        <div className="footer-row">
          <a className="brand" href="#top">
            <DropMark size={17} />
            <span>Know Your Kerala</span>
          </a>
          <span>MADE FOR NASA SPACE APPS CHALLENGE</span>
          <span>KERALA, INDIA · 2026</span>
          <a className="to-top" href="#top">
            Back to the clouds ↑
          </a>
        </div>
      </div>
    </footer>
  );
}

/* ---------- modal content ---------- */

const STAT_COPY = {
  total: {
    title: "Total precipitation",
    body: "The sum of every monthly rainfall value in the selected period, in millimetres.",
  },
  mean: {
    title: "Monthly mean",
    body: "Total precipitation divided by the number of monthly records in the selected period.",
  },
  sen: {
    title: "Sen’s slope",
    body: "The median of all pairwise slopes between annual rainfall totals (complete years only), reported in mm per year. It is a robust estimate of how annual rainfall changes through time.",
  },
  wet: {
    title: "Wettest month",
    body: "Rainfall is averaged by calendar month across the selected period. The month with the highest average is shown.",
  },
};

function ModalHost({ modal, onClose, stats, filteredData, openModal }) {
  if (!modal) return null;
  const t = stats.trendResult;

  if (modal.type === "stat") {
    const copy = STAT_COPY[modal.key];
    return (
      <Modal onClose={onClose} labelledBy="modal-title">
        <p className="modal-kicker">ABOUT THIS MEASURE</p>
        <h3 id="modal-title">{copy.title}</h3>
        <p>{copy.body}</p>
        {modal.key === "sen" && (
          <button type="button" className="text-link" onClick={() => openModal({ type: "trend" })}>
            Open the Mann–Kendall readout
          </button>
        )}
      </Modal>
    );
  }

  if (modal.type === "trend") {
    return (
      <Modal onClose={onClose} labelledBy="modal-title">
        <p className="modal-kicker">MANN–KENDALL TEST &amp; SEN&apos;S SLOPE</p>
        <h3 id="modal-title">{t ? t.interpretation : "Trend unavailable"}</h3>
        {t ? (
          <>
            <dl className="modal-dl">
              <div><dt>Complete years (n)</dt><dd>{stats.completeYears}</dd></div>
              <div><dt>S statistic</dt><dd>{t.S}</dd></div>
              <div><dt>Z statistic</dt><dd>{t.z.toFixed(3)}</dd></div>
              <div><dt>p-value</dt><dd>{formatP(t.pValue)}</dd></div>
              <div><dt>Sen&apos;s slope</dt><dd>{t.senSlope.toFixed(2)} mm/yr</dd></div>
              <div><dt>Threshold</dt><dd>p &lt; 0.05</dd></div>
            </dl>
            <AnnualTally annual={stats.annual} />
            <p className="modal-small">
              {t.significant
                ? "The trend is statistically significant at the 5% level."
                : "The trend is not statistically significant at the 5% level."}{" "}
              A trend is not a verdict.
            </p>
          </>
        ) : (
          <p>Select at least 3 complete calendar years to calculate a long-term rainfall trend.</p>
        )}
      </Modal>
    );
  }

  if (modal.type === "month") {
    const item = modal.item;
    const avg = stats.monthly[item.monthNumber - 1].rainfall;
    const diff = avg > 0 ? ((item.rainfall - avg) / avg) * 100 : null;
    const rank =
      [...filteredData].sort((a, b) => b.rainfall - a.rainfall).findIndex((d) => d === item) + 1;
    const top = Math.max(item.rainfall, avg, 1);
    const fullName = item.date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

    return (
      <Modal onClose={onClose} labelledBy="modal-title" tone="blue">
        <p className="modal-kicker">A MONTH IN THE RECORD</p>
        <h3 id="modal-title">{fullName}</h3>
        <p className="modal-big">
          {fmtNumber(item.rainfall)}
          <small>mm</small>
        </p>

        <div className="compare">
          <div>
            <span>This month</span>
            <i style={{ width: `${(item.rainfall / top) * 100}%` }} />
          </div>
          <div>
            <span>Average {monthName(item.monthNumber - 1)} in this view</span>
            <i className="is-avg" style={{ width: `${(avg / top) * 100}%` }} />
          </div>
        </div>

        <p className="modal-small">
          {diff === null
            ? "No average is available to compare."
            : `${Math.abs(diff).toFixed(0)}% ${diff >= 0 ? "above" : "below"} the ${formatRain(avg)} average for ${monthName(item.monthNumber - 1)}. `}
          It ranks #{rank} of {filteredData.length} months in the selected period.
        </p>
      </Modal>
    );
  }

  return null;
}

/* ================================================================== *
 *  SITE (everything rendered once data is ready)
 * ================================================================== */

function Site({
  data,
  filteredData,
  stats,
  selectedPeriod,
  setSelectedPeriod,
  availableYears,
  periodLabel,
}) {
  const [modal, setModal] = useState(null);
  const [activeId, setActiveId] = useState("top");
  const [scrolled, setScrolled] = useState(false);
  const [pastHero, setPastHero] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const railRef = useRef(null);

  const range = useMemo(
    () => ({ first: data[0].year, last: data[data.length - 1].year }),
    [data]
  );
  const fullTotal = useMemo(() => data.reduce((s, d) => s + d.rainfall, 0), [data]);

  const closeModal = useCallback(() => setModal(null), []);
  const openModal = useCallback((m) => setModal(m), []);
  const pickMonth = useCallback((item) => setModal({ type: "month", item }), []);

  const trendIsUp = stats.trendResult !== null && stats.trendResult.senSlope >= 0;

  // scroll progress, nav state, dock visibility
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      railRef.current?.style.setProperty("--prog", max > 0 ? (y / max).toFixed(4) : "0");
      setScrolled(y > 40);
      setPastHero(y > window.innerHeight * 0.8);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // which chapter is on screen
  useEffect(() => {
    const ids = ["top", ...SECTIONS.map((s) => s.id), "footer"];
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean);
    if (typeof IntersectionObserver === "undefined") return undefined;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActiveId(e.target.id);
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.classList.add("menu-lock");
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("menu-lock");
    };
  }, [menuOpen]);

  const goExplore = () =>
    document
      .getElementById("investigation")
      ?.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "start" });

  const controls = {
    value: selectedPeriod,
    onChange: setSelectedPeriod,
    years: availableYears,
    label: periodLabel,
  };

  const darkIds = ["top", "seasons", "field-note", "footer"];

  return (
    <div className={`site ${darkIds.includes(activeId) ? "on-dark" : "on-light"}`}>
      <SvgDefs />
      <div className="grain" aria-hidden="true" />

      <Nav activeId={activeId} scrolled={scrolled} menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      <Rail activeId={activeId} railRef={railRef} />

      <main>
        <Hero range={range} onExplore={goExplore} />
        <Prologue range={range} records={data.length} />
        <Ledger
          stats={stats}
          trendIsUp={trendIsUp}
          controls={controls}
          fullTotal={fullTotal}
          range={range}
          openModal={openModal}
        />
        <Kasavu className="kasavu-gap" />
        <Timeline filteredData={filteredData} periodLabel={periodLabel} onPick={pickMonth} />
        <Seasons stats={stats} />
        <FieldNote />
        <Findings stats={stats} openModal={openModal} />
        <Kasavu className="kasavu-gap" />
        <Method stats={stats} periodLabel={periodLabel} openModal={openModal} />
      </main>

      <Footer />

      <PeriodDock visible={pastHero && activeId !== "footer"} {...controls} />

      <ModalHost
        modal={modal}
        onClose={closeModal}
        stats={stats}
        filteredData={filteredData}
        openModal={openModal}
      />
    </div>
  );
}

/* ================================================================== *
 *  APP  (data loading + statistics, unchanged behaviour)
 * ================================================================== */

export default function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("all");

  useEffect(() => {
    Papa.parse("/Kerala_Monthly_Rainfall.csv", {
      download: true,
      header: true,
      skipEmptyLines: true,

      complete: (results) => {
        const parsed = results.data
          .map((row) => {
            const month =
              row.month ??
              row.Month ??
              row.date ??
              row.Date;

            const rainfall = Number(
              row.rainfall_mm ??
                row.Rainfall_mm ??
                row.rainfall ??
                row.Rainfall
            );

            const date = parseMonth(month);

            if (!date || !Number.isFinite(rainfall)) {
              return null;
            }

            return {
              date,
              month: date.toLocaleDateString("en-IN", {
                month: "short",
                year: "numeric",
              }),
              year: date.getFullYear(),
              monthNumber: date.getMonth() + 1,
              rainfall,
            };
          })
          .filter(Boolean)
          .sort((a, b) => a.date - b.date);

        if (!parsed.length) {
          setError(
            "Could not read the CSV. Check its column names and date format."
          );
        } else {
          setData(parsed);
        }

        setLoading(false);
      },

      error: () => {
        setError(
          "CSV could not be loaded. Check the file in frontend/public/"
        );
        setLoading(false);
      },
    });
  }, []);

  const availableYears = useMemo(() => {
    return [...new Set(data.map((item) => item.year))].sort(
      (a, b) => b - a
    );
  }, [data]);

  const latestYear = availableYears[0] ?? null;

  const filteredData = useMemo(() => {
    if (!data.length || !latestYear) return [];

    if (selectedPeriod === "all") {
      return data;
    }

    if (selectedPeriod === "last10") {
      return data.filter(
        (item) => item.year >= latestYear - 9
      );
    }

    if (selectedPeriod === "last5") {
      return data.filter(
        (item) => item.year >= latestYear - 4
      );
    }

    const selectedYear = Number(selectedPeriod);

    return data.filter(
      (item) => item.year === selectedYear
    );
  }, [data, selectedPeriod, latestYear]);

  const stats = useMemo(() => {
    if (!filteredData.length) return null;

    const total = filteredData.reduce(
      (sum, item) => sum + item.rainfall,
      0
    );

    const average = total / filteredData.length;

    // Group rainfall records by year.
    const annualMap = {};

    filteredData.forEach((item) => {
      if (!annualMap[item.year]) {
        annualMap[item.year] = {
          year: item.year,
          total: 0,
          months: new Set(),
        };
      }

      annualMap[item.year].total += item.rainfall;
      annualMap[item.year].months.add(item.monthNumber);
    });

    // Use only years containing all 12 calendar months.
    const completeAnnual = Object.values(annualMap)
      .filter((item) => item.months.size === 12)
      .map((item) => ({
        year: item.year,
        total: item.total,
      }))
      .sort((a, b) => a.year - b.year);

    // Statistical trend analysis.
    const trendResult = calculateTrend(completeAnnual);

    // Calendar-month averages.
    const monthly = Array.from({ length: 12 }, (_, i) => {
      const records = filteredData.filter(
        (item) => item.monthNumber === i + 1
      );

      const monthTotal = records.reduce(
        (sum, item) => sum + item.rainfall,
        0
      );

      return {
        month: new Date(2000, i, 1).toLocaleDateString(
          "en-IN",
          { month: "short" }
        ),
        rainfall: records.length
          ? monthTotal / records.length
          : 0,
      };
    });

    const wettestMonth = [...monthly].sort(
      (a, b) => b.rainfall - a.rainfall
    )[0];

    return {
      total,
      average,
      monthly,
      trendResult,
      wettestMonth,
      annual: completeAnnual,
      firstYear: filteredData[0].year,
      lastYear: filteredData[filteredData.length - 1].year,
      records: filteredData.length,
      completeYears: completeAnnual.length,
    };
  }, [filteredData]);

  const periodLabel = useMemo(() => {
    if (selectedPeriod === "all") {
      return `${stats?.firstYear ?? ""} — ${stats?.lastYear ?? ""}`;
    }

    if (selectedPeriod === "last10") {
      return "Recent 10 years";
    }

    if (selectedPeriod === "last5") {
      return "Recent 5 years";
    }

    return selectedPeriod;
  }, [selectedPeriod, stats]);

  if (loading) {
    return (
      <div className="loading-screen">
        <svg className="loader-drop" viewBox="0 0 40 52" aria-hidden="true">
          <path d="M20 3C20 3 5 21 5 31a15 15 0 0 0 30 0C35 21 20 3 20 3Z" />
        </svg>
        <p>Reading Kerala’s rainfall archive...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="loading-screen">
        <svg className="loader-drop is-still" viewBox="0 0 40 52" aria-hidden="true">
          <path d="M20 3C20 3 5 21 5 31a15 15 0 0 0 30 0C35 21 20 3 20 3Z" />
        </svg>
        <h2>Data unavailable</h2>
        <p>{error || "Something went wrong."}</p>
        <p className="error-help">
          Ensure the CSV is at
          frontend/public/Kerala_Monthly_Rainfall.csv
        </p>
      </div>
    );
  }

  return (
    <Site
      data={data}
      filteredData={filteredData}
      stats={stats}
      selectedPeriod={selectedPeriod}
      setSelectedPeriod={setSelectedPeriod}
      availableYears={availableYears}
      periodLabel={periodLabel}
    />
  );
}
