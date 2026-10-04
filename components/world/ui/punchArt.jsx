// The 2D art of the pop (PunchCut.jsx): the seal cutout and the guests. All
// flat ink shapes: a guest is a silhouette, one prop and one pose, never a
// face, hair or logo (issue #7 choreography). Colour is the place's own.

const INK = "#1c1b19";
const PAPER = "#fbfaf7";

// pose -> transforms for the cutout's body and two flippers (a transition
// animates the change between beat 1 and beat 2). Angles lift the flipper.
export const POSES = {
  still: { body: "", fl: "rotate(14deg)", fr: "rotate(-14deg)" },
  flipperOut: { body: "", fl: "rotate(14deg)", fr: "rotate(-85deg)" },
  open: { body: "", fl: "rotate(80deg)", fr: "rotate(-80deg)" },
  recoil: { body: "translate(-14px, 6px) rotate(-7deg)", fl: "rotate(30deg)", fr: "rotate(-30deg)" },
  point: { body: "", fl: "rotate(14deg)", fr: "rotate(-95deg) scaleX(1.25)" },
  phone: { body: "", fl: "rotate(14deg)", fr: "rotate(-150deg)" },
  small: { body: "scale(0.82)", fl: "rotate(14deg)", fr: "rotate(-14deg)" },
  squash: { body: "scale(1.12, 0.78)", fl: "rotate(40deg)", fr: "rotate(-40deg)" },
  tall: { body: "scale(0.92, 1.35)", fl: "rotate(8deg)", fr: "rotate(-8deg)" },
  fist: { body: "", fl: "rotate(14deg)", fr: "rotate(-100deg) scale(1.5)" },
  jab: { body: "", fl: "rotate(-70deg) scale(1.2)", fr: "rotate(-70deg) scale(1.2)" },
  hide: { body: "", fl: "rotate(2deg) scale(0.6)", fr: "rotate(-2deg) scale(0.6)" },
  lookback: { body: "scaleX(-1)", fl: "rotate(14deg)", fr: "rotate(-14deg)" },
  step: { body: "translateY(-8px) scale(1.06)", fl: "rotate(14deg)", fr: "rotate(-14deg)" },
};

const Look = ({ look, accent }) => {
  if (look === null || look === "none") return null;
  if (look === "flame") return <path d="M110 6 L96 46 L124 46Z" fill="#ff9a3c" stroke={INK} strokeWidth="4" strokeLinejoin="round" />;
  if (look === "spikes") return <path d="M70 46 L78 12 L92 38 L110 6 L128 38 L142 12 L150 46Z" fill={accent} stroke={INK} strokeWidth="4" strokeLinejoin="round" />;
  if (look === "ninja") {
    return (
      <g stroke={INK} strokeWidth="4" strokeLinejoin="round">
        <rect x="68" y="44" width="84" height="12" rx="3" fill="#3a3a52" />
        <path d="M150 50 L186 38 L174 58 L190 70 L152 58Z" fill="#3a3a52" />
      </g>
    );
  }
  if (look === "buns") {
    return (
      <g fill={accent} stroke={INK} strokeWidth="4">
        <circle cx="74" cy="34" r="15" />
        <circle cx="146" cy="34" r="15" />
      </g>
    );
  }
  if (look === "straw") {
    return (
      <g fill="#e8c46a" stroke={INK} strokeWidth="4" strokeLinejoin="round">
        <ellipse cx="110" cy="40" rx="62" ry="12" />
        <path d="M80 40 Q110 -4 140 40Z" />
      </g>
    );
  }
  return (
    <g stroke={INK} strokeWidth="4">
      <rect x="60" y="48" width="100" height="9" rx="4" fill="#3a3a52" />
      <circle cx="84" cy="48" r="11" fill="#bfe6ff" />
      <circle cx="136" cy="48" r="11" fill="#bfe6ff" />
    </g>
  );
};

// The cutout of the real pup (variants/D.jsx), front on: lavender-blue back and
// flippers, cream face and muzzle, big glossy eyes with highlights, blush, a
// nose with whisker dots, two small gold sparkles, and the island look on top.
export function SealArt({ look, accent, pose, rim }) {
  const p = POSES[pose] ?? POSES.still;
  const o = { transformBox: "fill-box", transition: "transform 220ms cubic-bezier(0.2, 1.5, 0.4, 1)" };
  const BACK = "#b4aee8";
  const BACK2 = "#9690d6";
  const CREAM = "#fdf3ee";
  return (
    <svg className="punch-seal-art" viewBox="0 0 220 190" aria-hidden="true" focusable="false">
      <ellipse cx="110" cy="22" rx="46" ry="9" fill="none" stroke={rim ?? "#ffd84a"} strokeWidth="5" />
      <g style={{ ...o, transformOrigin: "50% 100%", transform: p.body }}>
        <ellipse cx="110" cy="144" rx="66" ry="38" fill={BACK} stroke={INK} strokeWidth="5" />
        <ellipse cx="110" cy="152" rx="40" ry="24" fill={CREAM} />
        <g style={{ ...o, transformOrigin: "100% 0%", transform: p.fl }}>
          <ellipse cx="40" cy="146" rx="30" ry="12" fill={BACK2} stroke={INK} strokeWidth="5" />
        </g>
        <g style={{ ...o, transformOrigin: "0% 0%", transform: p.fr }}>
          <ellipse cx="180" cy="146" rx="30" ry="12" fill={BACK2} stroke={INK} strokeWidth="5" />
        </g>
        <path d="M66 70 L52 40 L86 52Z M154 70 L168 40 L134 52Z" fill={BACK2} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
        <ellipse cx="110" cy="92" rx="56" ry="48" fill={BACK} stroke={INK} strokeWidth="5" />
        <ellipse cx="110" cy="108" rx="40" ry="32" fill={CREAM} />
        <Look look={look} accent={accent} />
        <g>
          <ellipse cx="84" cy="90" rx="13" ry="15" fill="#2b2338" stroke={INK} strokeWidth="2" />
          <ellipse cx="136" cy="90" rx="13" ry="15" fill="#2b2338" stroke={INK} strokeWidth="2" />
          <circle cx="79" cy="84" r="5" fill="#fff" />
          <circle cx="131" cy="84" r="5" fill="#fff" />
          <circle cx="89" cy="96" r="2.5" fill="#fff" />
          <circle cx="141" cy="96" r="2.5" fill="#fff" />
        </g>
        <path d="M60 76 l5 -6 l5 6 l-5 6Z M158 70 l5 -6 l5 6 l-5 6Z" fill="#ffd84a" />
        <ellipse cx="68" cy="112" rx="10" ry="6" fill="#f7a5b0" opacity="0.85" />
        <ellipse cx="152" cy="112" rx="10" ry="6" fill="#f7a5b0" opacity="0.85" />
        <ellipse cx="110" cy="110" rx="9" ry="6" fill="#4a3a52" />
        <path d="M110 116 Q110 126 100 126 M110 116 Q110 126 120 126" stroke="#4a3a52" strokeWidth="3" fill="none" strokeLinecap="round" />
        <g fill="#7a6a86">
          <circle cx="94" cy="120" r="1.8" />
          <circle cx="90" cy="125" r="1.8" />
          <circle cx="126" cy="120" r="1.8" />
          <circle cx="130" cy="125" r="1.8" />
        </g>
      </g>
    </svg>
  );
}

const Person = ({ arm, scale = 1, children }) => (
  <g transform={`translate(${100 * (1 - scale)} ${260 * (1 - scale)}) scale(${scale})`} fill={INK}>
    <path d="M58 258 L64 112 Q100 84 136 112 L142 258Z" />
    <circle cx="100" cy="54" r="26" />
    {arm === "point" ? <path d="M70 120 L6 96 L10 112 L72 142Z" /> : null}
    {arm === "hip" ? <path d="M64 120 L34 170 L56 178 L76 140Z M136 120 L166 170 L144 178 L124 140Z" /> : null}
    {children}
  </g>
);
const dots = (pts, c = PAPER, r = 4) => pts.map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill={c} />);
const PATH = new Set(["0-0", "1-0", "2-1", "3-1", "4-2"]); // the scheduled blocks

// One drawing per guest.prop (punch.js). `a` is the place's own colour.
const ART = {
  band: (a) => (
    <Person>
      <rect x="70" y="42" width="60" height="12" fill={a} />
    </Person>
  ),
  coat: (a) => (
    <Person arm="point">
      <path d="M54 258 L60 130 L100 160 L140 130 L146 258Z" />
      <circle cx="90" cy="54" r="7" fill="none" stroke={PAPER} strokeWidth="3" />
      <circle cx="112" cy="54" r="7" fill="none" stroke={PAPER} strokeWidth="3" />
      <rect x="168" y="70" width="8" height="150" fill={a} />
    </Person>
  ),
  finger: (a) => (
    <g fill={INK}>
      <rect x="86" y="-20" width="30" height="120" rx="15" />
      <rect x="40" y="90" width="120" height="110" rx="40" />
      <rect x="86" y="96" width="30" height="8" fill={a} />
    </g>
  ),
  dots2: () => <Person arm="point">{dots([[90, 54], [112, 54]])}</Person>,
  spoon: (a) => (
    <g transform="rotate(-18 100 140)">
      <ellipse cx="100" cy="60" rx="34" ry="46" fill={a} stroke={INK} strokeWidth="6" />
      <rect x="94" y="100" width="12" height="150" fill={INK} />
    </g>
  ),
  mask: (a) => (
    <Person>
      <path d="M30 258 L100 100 L170 258Z" opacity="0.9" />
      <path d="M78 40 L122 40 L116 70 L84 70Z" fill={PAPER} />
      <circle cx="100" cy="52" r="5" fill={a} />
    </Person>
  ),
  sevendots: () => <Person arm="point">{dots([[100, 130], [84, 150], [116, 150], [76, 172], [124, 172], [92, 192], [108, 192]], PAPER, 5)}</Person>,
  cane: () => (
    <Person scale={0.62}>
      <ellipse cx="62" cy="52" rx="18" ry="9" />
      <ellipse cx="138" cy="52" rx="18" ry="9" />
      <rect x="152" y="110" width="7" height="150" />
    </Person>
  ),
  hip: () => <Person arm="hip" />,
  lens: (a) => (
    <Person arm="point">
      <circle cx="122" cy="46" r="9" fill={a} stroke={PAPER} strokeWidth="3" />
    </Person>
  ),
  bowtie: (a) => (
    <Person arm="point" scale={0.7}>
      <path d="M84 100 L116 124 L116 100 L84 124Z" fill={a} />
    </Person>
  ),
  car: (a) => (
    <g>
      <rect x="10" y="130" width="170" height="44" rx="12" fill={a} stroke={INK} strokeWidth="6" />
      <path d="M54 130 L78 98 L128 98 L152 130Z" fill={a} stroke={INK} strokeWidth="6" strokeLinejoin="round" />
      <circle cx="52" cy="176" r="15" fill={INK} />
      <circle cx="140" cy="176" r="15" fill={INK} />
      <path d="M-30 120 H0 M-40 146 H0 M-26 172 H0" stroke={INK} strokeWidth="6" />
    </g>
  ),
  gap: (a) => (
    <g>
      <circle cx="100" cy="130" r="46" fill={INK} />
      <circle cx="100" cy="130" r="46" fill="none" stroke={a} strokeWidth="9" />
    </g>
  ),
  dam: (a) => (
    <g>
      <rect x="0" y="60" width="200" height="40" fill="#aab3c0" stroke={INK} strokeWidth="6" />
      {[30, 80, 130].map((x) => (
        <path key={x} d={`M${x} 100 V190`} stroke={INK} strokeWidth="7" />
      ))}
      <path d="M176 100 L160 130 L184 150 L166 190" stroke={a} strokeWidth="8" fill="none" strokeLinejoin="round" />
    </g>
  ),
  // the causal-attention triangle: every block starts lit, then on the seal's
  // snap (CSS .tri-dead under .punch[data-pop=5|6]) all but the scheduled path go dark
  triangle: (a) => (
    <g>
      {[1, 2, 3, 4, 5].flatMap((n, r) =>
        Array.from({ length: n }, (_, i) => (
          <rect key={`${r}-${i}`} className={PATH.has(`${r}-${i}`) ? "tri-live" : "tri-dead"} x={100 - n * 21 + i * 42} y={20 + r * 42} width="36" height="36" fill={a} stroke={INK} strokeWidth="3" />
        )),
      )}
    </g>
  ),
  moat: (a) => (
    <g>
      <path d="M-10 190 Q20 170 50 190 T110 190 T170 190 T230 190" stroke="#2f8fb0" strokeWidth="10" fill="none" />
      <rect x="96" y="20" width="9" height="170" fill={INK} />
      <circle cx="100" cy="20" r="12" fill={a} stroke={INK} strokeWidth="4" />
    </g>
  ),
  chain: (a) => (
    <g>
      {dots([[14, 150], [44, 150], [74, 150], [104, 150], [134, 150], [164, 150]], INK, 12)}
      <path d="M164 130 L164 190" stroke={a} strokeWidth="8" />
      <path d="M150 118 L178 118 L164 132Z" fill={a} />
    </g>
  ),
};

const FISH = (a, x, y, k) => (
  <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
    <ellipse cx="0" cy="0" rx="13" ry="7" fill={k ? INK : a} stroke={INK} strokeWidth="2" />
    <path d="M12 0 L22 -7 L22 7Z" fill={k ? INK : a} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
  </g>
);
ART.fishwall = (a) => (
  <g>
    {[0, 1, 2, 3].flatMap((r) => Array.from({ length: 9 }, (_, i) => FISH(a, -30 + i * 28, 140 + r * 20, false)))}
    <rect x="96" y="226" width="16" height="16" fill="#2f7fff" stroke={INK} strokeWidth="3" />
  </g>
);
ART.faces = () => (
  <g fill="#8c8478" stroke={INK} strokeWidth="6">
    <circle cx="40" cy="80" r="62" />
    <circle cx="170" cy="80" r="62" />
    <g fill={INK} stroke="none">
      <circle cx="22" cy="70" r="6" />
      <circle cx="58" cy="70" r="6" />
      <circle cx="152" cy="70" r="6" />
      <circle cx="188" cy="70" r="6" />
      <rect x="22" y="104" width="36" height="6" />
      <rect x="152" y="104" width="36" height="6" />
    </g>
  </g>
);
ART.floor = (a) => (
  <g>
    {Array.from({ length: 6 }, (_, r) => Array.from({ length: 6 }, (_, i) => <rect key={`${r}-${i}`} x={i * 36 - 10} y={100 + r * 26} width="30" height="20" fill={a} stroke={INK} strokeWidth="2" opacity="0.8" />))}
  </g>
);
ART.rays = (a) => (
  <g stroke={a} strokeWidth="6" strokeLinecap="round">
    {[-60, -35, -12, 12, 35, 60].map((d) => <path key={d} d={`M100 40 L${100 + d * 3} 250`} />)}
    <circle cx="100" cy="40" r="14" fill={INK} stroke={INK} />
  </g>
);
ART.cards = (a) => (
  <g>
    {Array.from({ length: 12 }, (_, i) => <rect key={i} x={30 + (i % 4) * 36} y={60 + Math.floor(i / 4) * 40} width="30" height="36" fill={PAPER} stroke={INK} strokeWidth="4" transform={`rotate(${(i * 17) % 20 - 10} ${45 + (i % 4) * 36} ${78 + Math.floor(i / 4) * 40})`} />)}
    <circle cx="100" cy="150" r="30" fill={a} opacity="0.5" />
  </g>
);
ART.sheet = (a) => (
  <g>
    <path d="M10 70 L190 70 L160 120 L-20 120Z" fill={PAPER} stroke={INK} strokeWidth="5" />
    <path d="M10 170 L190 170 L160 220 L-20 220Z" fill={a} stroke={INK} strokeWidth="5" opacity="0.8" />
  </g>
);

ART.fin = () => (
  <g>
    <path d="M-10 200 Q20 190 50 200 T110 200 T170 200 T230 200" stroke="#2f8fb0" strokeWidth="8" fill="none" />
    <path d="M70 200 Q82 120 104 70 Q112 130 134 200Z" fill={INK} />
  </g>
);

export function GuestArt({ prop, accent, seal2 }) {
  if (prop === "seal2") return seal2;
  const draw = ART[prop];
  return (
    <svg className="punch-guest-art" viewBox="-40 -30 280 310" aria-hidden="true" focusable="false">
      {draw ? draw(accent) : null}
    </svg>
  );
}
