import logoMark from "../../../assets/brand/logo-mark.webp";
import { usePrefersReducedMotion } from "../../../hooks/useMediaQuery";

/*
 * The logo's ring, read literally for a social app: people in orbit around Aevora.
 * Avatars travel slowly along tilted ellipses (SVG <animateMotion>).
 * With "reduce motion" on, they stay parked at fixed spots on the same paths.
 */

const WIDTH = 640;
const HEIGHT = 460;
const CX = WIDTH / 2;
const CY = HEIGHT / 2;
const TILT = -16; // degrees, matches the slant of the logo's ring

const ORBITS = [
  { id: "inner", rx: 150, ry: 54, stroke: "url(#orbit-brand)", opacity: 0.7, width: 1.5 },
  { id: "middle", rx: 235, ry: 88, stroke: "#ffffff", opacity: 0.13, width: 1 },
  { id: "outer", rx: 285, ry: 112, stroke: "#ffffff", opacity: 0.08, width: 1 },
];

// seconds per lap, and a negative delay so each starts at a different point
const PEOPLE = [
  { initial: "A", orbit: "inner", r: 15, dur: 38, from: "#3f68f5", to: "#7c4df0", at: 0.1 },
  { initial: "S", orbit: "inner", r: 11, dur: 38, from: "#0f9d8a", to: "#2563eb", at: 0.62 },
  { initial: "D", orbit: "middle", r: 18, dur: 72, from: "#d9476b", to: "#8e44e0", at: 0.3 },
  { initial: "E", orbit: "middle", r: 12, dur: 72, from: "#7c4df0", to: "#c04bd8", at: 0.78 },
  { initial: "M", orbit: "outer", r: 16, dur: 110, from: "#0e7fd9", to: "#2e5be8", at: 0.5 },
];

const orbitPath = ({ rx, ry }) =>
  `M ${-rx} 0 a ${rx} ${ry} 0 1 0 ${2 * rx} 0 a ${rx} ${ry} 0 1 0 ${-2 * rx} 0`;

// Where the avatar sits on the ellipse for the static (reduced-motion) layout.
const pointAt = ({ rx, ry }, t) => {
  const angle = Math.PI + t * Math.PI * 2; // path starts at the left and runs clockwise
  return { x: rx * Math.cos(angle), y: ry * Math.sin(angle) };
};

function Person({ person, orbit, reduceMotion }) {
  const gradientId = `person-${person.initial}`;
  const body = (
    <>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={person.from} />
          <stop offset="1" stopColor={person.to} />
        </linearGradient>
      </defs>
      <circle r={person.r + 7} fill="#7c8cff" opacity="0.12" />
      <circle r={person.r} fill={`url(#${gradientId})`} stroke="#ffffff" strokeOpacity="0.4" strokeWidth="1.5" />
      <text
        textAnchor="middle"
        dominantBaseline="central"
        fill="#fff"
        fontSize={person.r * 0.95}
        fontWeight="700"
        fontFamily="var(--font-sans)"
      >
        {person.initial}
      </text>
    </>
  );

  if (reduceMotion) {
    const { x, y } = pointAt(orbit, person.at);
    return <g transform={`translate(${x} ${y})`}>{body}</g>;
  }

  return (
    <g>
      <animateMotion
        dur={`${person.dur}s`}
        begin={`${-person.dur * person.at}s`}
        repeatCount="indefinite"
        path={orbitPath(orbit)}
      />
      {body}
    </g>
  );
}

export default function OrbitScene({ className }) {
  const reduceMotion = usePrefersReducedMotion();
  const byId = Object.fromEntries(ORBITS.map((o) => [o.id, o]));

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label="Aevora logo with member avatars orbiting around it"
      className={className}
    >
      <defs>
        <linearGradient id="orbit-brand" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#7fb4ff" />
          <stop offset="1" stopColor="#a47bff" />
        </linearGradient>
        <radialGradient id="orbit-glow">
          <stop offset="0" stopColor="#4a6dff" stopOpacity="0.38" />
          <stop offset="1" stopColor="#4a6dff" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx={CX} cy={CY} r="190" fill="url(#orbit-glow)" />

      <g transform={`translate(${CX} ${CY}) rotate(${TILT})`}>
        {ORBITS.map((orbit) => (
          <path
            key={orbit.id}
            d={orbitPath(orbit)}
            fill="none"
            stroke={orbit.stroke}
            strokeOpacity={orbit.opacity}
            strokeWidth={orbit.width}
          />
        ))}
      </g>

      <image href={logoMark} x={CX - 105} y={CY - 83} width="210" height="166" />

      <g transform={`translate(${CX} ${CY}) rotate(${TILT})`}>
        {PEOPLE.map((person) => (
          <Person
            key={person.initial}
            person={person}
            orbit={byId[person.orbit]}
            reduceMotion={reduceMotion}
          />
        ))}
      </g>
    </svg>
  );
}
