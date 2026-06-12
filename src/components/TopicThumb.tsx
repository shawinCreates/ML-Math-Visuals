import { ReactNode } from "react";

/**
 * Miniature preview of each topic's visualization, drawn in the same visual
 * language as the real sandbox so the catalog shows, not tells.
 */

const INK = "#5a6473";
const LIGHT = "#c6cdd9";
const B = "#4f7df9"; // class 0
const O = "#f97316"; // class 1
const G = "#10b981"; // class 2
const A = "#0d9488"; // accent / model output

function dots(pts: [number, number][], fill: string, r = 2.2): ReactNode {
  return pts.map(([x, y], i) => <circle key={fill + i} cx={x} cy={y} r={r} fill={fill} />);
}

const SCATTER: [number, number][] = [
  [14, 48], [24, 44], [32, 38], [42, 36], [52, 30], [62, 28], [74, 22], [86, 18], [98, 14], [68, 34],
];

function thumb(id: string): ReactNode {
  switch (id) {
    case "linear-regression":
      return (
        <>
          {dots(SCATTER, INK)}
          <line x1="8" y1="52" x2="108" y2="12" stroke={A} strokeWidth="2" />
        </>
      );
    case "polynomial-regression":
      return (
        <>
          {dots([[12, 40], [26, 26], [40, 22], [54, 30], [68, 42], [82, 40], [96, 26], [106, 16]], INK)}
          <path d="M8 46 C 28 10, 44 18, 56 32 S 84 52, 110 12" fill="none" stroke={A} strokeWidth="2" />
        </>
      );
    case "logistic-regression":
      return (
        <>
          {dots([[18, 18], [30, 14], [26, 28], [40, 20], [34, 36]], B)}
          {dots([[76, 44], [88, 50], [94, 38], [82, 30], [102, 46]], O)}
          <line x1="38" y1="58" x2="86" y2="6" stroke={A} strokeWidth="2" />
        </>
      );
    case "decision-tree":
      return (
        <>
          <line x1="60" y1="12" x2="34" y2="32" stroke={LIGHT} strokeWidth="1.5" />
          <line x1="60" y1="12" x2="86" y2="32" stroke={LIGHT} strokeWidth="1.5" />
          <line x1="34" y1="32" x2="20" y2="52" stroke={LIGHT} strokeWidth="1.5" />
          <line x1="34" y1="32" x2="48" y2="52" stroke={LIGHT} strokeWidth="1.5" />
          <line x1="86" y1="32" x2="72" y2="52" stroke={LIGHT} strokeWidth="1.5" />
          <line x1="86" y1="32" x2="100" y2="52" stroke={LIGHT} strokeWidth="1.5" />
          <circle cx="60" cy="12" r="6" fill={A} />
          <circle cx="34" cy="32" r="5" fill="#fff" stroke={INK} strokeWidth="1.5" />
          <circle cx="86" cy="32" r="5" fill="#fff" stroke={INK} strokeWidth="1.5" />
          <circle cx="20" cy="52" r="4" fill={B} />
          <circle cx="48" cy="52" r="4" fill={O} />
          <circle cx="72" cy="52" r="4" fill={B} />
          <circle cx="100" cy="52" r="4" fill={O} />
        </>
      );
    case "svm":
      return (
        <>
          {dots([[20, 16], [32, 12], [28, 26], [16, 32]], B)}
          {dots([[88, 50], [100, 44], [92, 34], [104, 54]], O)}
          <line x1="30" y1="60" x2="94" y2="4" stroke={A} strokeWidth="2" />
          <line x1="16" y1="54" x2="80" y2="-2" stroke={B} strokeWidth="1" strokeDasharray="3 3" />
          <line x1="44" y1="66" x2="108" y2="10" stroke={O} strokeWidth="1" strokeDasharray="3 3" />
          <circle cx="28" cy="26" r="5" fill="none" stroke={A} strokeWidth="1.5" />
          <circle cx="92" cy="34" r="5" fill="none" stroke={A} strokeWidth="1.5" />
        </>
      );
    case "knn":
      return (
        <>
          {dots([[20, 20], [34, 14], [26, 36], [44, 26]], B)}
          {dots([[86, 44], [98, 36], [90, 22], [104, 50]], O)}
          <circle cx="62" cy="32" r="18" fill="none" stroke={A} strokeWidth="1.5" strokeDasharray="3 3" />
          <circle cx="62" cy="32" r="3.4" fill={A} />
        </>
      );
    case "naive-bayes":
      return (
        <>
          <path d="M8 54 Q 38 -10 68 54" fill="none" stroke={B} strokeWidth="2" />
          <path d="M52 54 Q 82 -10 112 54" fill="none" stroke={O} strokeWidth="2" />
          <line x1="8" y1="54" x2="112" y2="54" stroke={LIGHT} strokeWidth="1.5" />
          <line x1="60" y1="10" x2="60" y2="54" stroke={A} strokeWidth="1.5" strokeDasharray="3 3" />
        </>
      );
    case "k-means":
      return (
        <>
          {dots([[18, 18], [28, 24], [22, 32], [34, 16]], B)}
          {dots([[58, 46], [68, 52], [62, 40], [74, 48]], O)}
          {dots([[92, 16], [102, 24], [96, 30], [106, 14]], G)}
          <path d="M22 23 l5 5 m0 -5 l-5 5" stroke="#16202e" strokeWidth="2" />
          <path d="M63 44 l5 5 m0 -5 l-5 5" stroke="#16202e" strokeWidth="2" />
          <path d="M97 19 l5 5 m0 -5 l-5 5" stroke="#16202e" strokeWidth="2" />
        </>
      );
    case "hierarchical-clustering":
      return (
        <>
          <path d="M20 54 V 38 H 40 V 54 M30 38 V 24 M70 54 V 30 H 96 V 54 M83 30 V 24 M30 24 H 83" fill="none" stroke={INK} strokeWidth="1.7" />
          <line x1="10" y1="32" x2="110" y2="32" stroke={A} strokeWidth="1.5" strokeDasharray="3 3" />
        </>
      );
    case "dbscan":
      return (
        <>
          {dots([[24, 22], [30, 28], [22, 32], [34, 20], [28, 16], [36, 28]], B)}
          {dots([[78, 42], [86, 46], [82, 36], [92, 44], [88, 52], [76, 50]], O)}
          {dots([[60, 12], [106, 16], [12, 52]], LIGHT, 2.4)}
        </>
      );
    case "gaussian-mixture":
      return (
        <>
          <ellipse cx="42" cy="30" rx="28" ry="16" fill={B} opacity="0.15" />
          <ellipse cx="42" cy="30" rx="28" ry="16" fill="none" stroke={B} strokeWidth="1.5" />
          <ellipse cx="78" cy="36" rx="26" ry="14" fill={O} opacity="0.15" />
          <ellipse cx="78" cy="36" rx="26" ry="14" fill="none" stroke={O} strokeWidth="1.5" />
          {dots([[38, 28], [50, 34], [30, 24], [74, 38], [88, 32], [62, 33]], INK)}
        </>
      );
    case "pca":
      return (
        <>
          <ellipse cx="60" cy="32" rx="44" ry="16" fill="none" stroke={LIGHT} strokeWidth="1.5" transform="rotate(-18 60 32)" />
          {dots([[28, 42], [44, 36], [58, 32], [74, 26], [90, 22], [62, 38], [50, 28]], INK)}
          <line x1="24" y1="44" x2="96" y2="20" stroke={B} strokeWidth="2" />
          <line x1="54" y1="22" x2="66" y2="42" stroke={O} strokeWidth="2" />
        </>
      );
    case "ensembles":
      return (
        <>
          <path d="M8 44 C 30 18, 50 40, 70 26 S 100 30, 112 18" fill="none" stroke={LIGHT} strokeWidth="1.4" />
          <path d="M8 36 C 30 30, 50 18, 70 36 S 100 14, 112 26" fill="none" stroke={LIGHT} strokeWidth="1.4" />
          <path d="M8 52 C 30 26, 50 30, 70 18 S 100 38, 112 14" fill="none" stroke={LIGHT} strokeWidth="1.4" />
          <path d="M8 44 C 30 25, 50 30, 70 27 S 100 27, 112 19" fill="none" stroke={A} strokeWidth="2.4" />
        </>
      );
    case "random-forest":
      return (
        <>
          {[16, 52, 88].map((x) => (
            <g key={x}>
              <line x1={x} y1="20" x2={x - 10} y2="38" stroke={LIGHT} strokeWidth="1.5" />
              <line x1={x} y1="20" x2={x + 10} y2="38" stroke={LIGHT} strokeWidth="1.5" />
              <circle cx={x} cy="20" r="4.5" fill={A} />
              <circle cx={x - 10} cy="38" r="3.5" fill={B} />
              <circle cx={x + 10} cy="38" r="3.5" fill={O} />
            </g>
          ))}
          <text x="60" y="58" textAnchor="middle" fontSize="9" fill={INK} fontFamily="var(--font-mono)">
            vote
          </text>
        </>
      );
    case "gradient-boosting":
      return (
        <>
          {dots(SCATTER, INK)}
          <path d="M8 50 H 30 V 40 H 52 V 32 H 74 V 22 H 96 V 14 H 112" fill="none" stroke={A} strokeWidth="2" />
        </>
      );
    case "neural-networks":
      return (
        <>
          {[
            [16, 22], [16, 42],
            [60, 14], [60, 32], [60, 50],
            [104, 32],
          ].map(([x, y], i) => (
            <g key={i}>
              {x === 16 && [14, 32, 50].map((y2) => <line key={y2} x1="16" y1={y} x2="60" y2={y2} stroke={LIGHT} strokeWidth="1" />)}
              {x === 60 && <line x1="60" y1={y} x2="104" y2="32" stroke={LIGHT} strokeWidth="1" />}
            </g>
          ))}
          {dots([[16, 22], [16, 42]], B, 4.5)}
          {dots([[60, 14], [60, 32], [60, 50]], A, 4.5)}
          {dots([[104, 32]], O, 4.5)}
        </>
      );
    case "weights-and-biases":
      return (
        <>
          <line x1="20" y1="18" x2="58" y2="32" stroke={A} strokeWidth="3" />
          <line x1="20" y1="46" x2="58" y2="32" stroke={LIGHT} strokeWidth="1.5" />
          <line x1="64" y1="32" x2="102" y2="32" stroke={INK} strokeWidth="1.5" />
          {dots([[20, 18], [20, 46]], B, 4.5)}
          <circle cx="60" cy="32" r="8" fill="#fff" stroke={INK} strokeWidth="1.7" />
          <circle cx="104" cy="32" r="4" fill={O} />
          <text x="60" y="35" textAnchor="middle" fontSize="8" fill={INK}>Σ</text>
        </>
      );
    case "activation-functions":
      return (
        <>
          <line x1="8" y1="44" x2="112" y2="44" stroke={LIGHT} strokeWidth="1.2" />
          <path d="M12 44 H 60 L 108 10" fill="none" stroke={A} strokeWidth="2.2" />
          <path d="M12 52 C 48 52, 72 16, 108 16" fill="none" stroke={O} strokeWidth="1.8" />
        </>
      );
    case "loss-functions":
      return (
        <>
          <line x1="8" y1="52" x2="112" y2="52" stroke={LIGHT} strokeWidth="1.2" />
          <path d="M20 12 Q 60 76 100 12" fill="none" stroke={A} strokeWidth="2.2" />
          <path d="M24 14 L 60 48 L 96 14" fill="none" stroke={O} strokeWidth="1.8" />
        </>
      );
    case "optimizers":
      return (
        <>
          <ellipse cx="60" cy="32" rx="48" ry="22" fill="none" stroke={LIGHT} strokeWidth="1.2" />
          <ellipse cx="60" cy="32" rx="32" ry="14" fill="none" stroke={LIGHT} strokeWidth="1.2" />
          <ellipse cx="60" cy="32" rx="16" ry="7" fill="none" stroke={LIGHT} strokeWidth="1.2" />
          <path d="M16 44 L 36 22 L 44 40 L 54 26 L 58 34" fill="none" stroke={O} strokeWidth="1.8" />
          <path d="M16 14 C 36 36, 48 34, 58 32" fill="none" stroke={B} strokeWidth="1.8" />
          <circle cx="60" cy="32" r="3" fill={A} />
        </>
      );
    case "bias-variance":
      return (
        <>
          <path d="M14 16 C 40 52, 80 52, 106 16" fill="none" stroke={A} strokeWidth="2.2" />
          <path d="M14 22 C 44 40, 76 44, 106 50" fill="none" stroke={LIGHT} strokeWidth="1.6" />
          <line x1="58" y1="40" x2="58" y2="56" stroke={O} strokeWidth="1.6" strokeDasharray="3 3" />
        </>
      );
    case "rnn":
      return (
        <>
          {[18, 52, 86].map((x, i) => (
            <g key={x}>
              <rect x={x} y="24" width="18" height="18" rx="4" fill="#fff" stroke={A} strokeWidth="1.7" />
              {i < 2 && <line x1={x + 18} y1="33" x2={x + 34} y2="33" stroke={INK} strokeWidth="1.5" markerEnd="" />}
              {i < 2 && <path d={`M${x + 30} 30 l4 3 l-4 3`} fill="none" stroke={INK} strokeWidth="1.5" />}
            </g>
          ))}
          <path d="M27 24 C 20 8, 34 8, 27 22" fill="none" stroke={O} strokeWidth="1.5" />
        </>
      );
    case "cnn":
      return (
        <>
          {Array.from({ length: 5 }, (_, r) =>
            Array.from({ length: 7 }, (_, c) => (
              <rect key={`${r}-${c}`} x={14 + c * 13} y={4 + r * 11.5} width="11" height="9.5" rx="1.5" fill={r < 3 && c < 3 ? "transparent" : "var(--grid)"} stroke="none" />
            ))
          )}
          <rect x="14" y="4" width="37" height="32.5" rx="2" fill={A} opacity="0.25" />
          <rect x="14" y="4" width="37" height="32.5" rx="2" fill="none" stroke={A} strokeWidth="1.8" />
        </>
      );
    case "transformers":
      return (
        <>
          <path d="M22 44 Q 41 8 60 44" fill="none" stroke={A} strokeWidth="2.6" opacity="0.85" />
          <path d="M22 44 Q 60 -8 98 44" fill="none" stroke={A} strokeWidth="1.2" opacity="0.4" />
          <path d="M60 44 Q 79 18 98 44" fill="none" stroke={A} strokeWidth="1.8" opacity="0.6" />
          {dots([[22, 48], [60, 48], [98, 48]], INK, 4)}
        </>
      );
    case "reinforcement-learning":
      return (
        <>
          {Array.from({ length: 3 }, (_, r) =>
            Array.from({ length: 5 }, (_, c) => (
              <rect key={`${r}-${c}`} x={14 + c * 19} y={8 + r * 16} width="17" height="14" rx="2" fill="var(--grid)" />
            ))
          )}
          <path d="M22 15 H 60 V 47 H 88" fill="none" stroke={A} strokeWidth="2" strokeLinecap="round" />
          <circle cx="22" cy="15" r="3.5" fill={B} />
          <circle cx="98" cy="47" r="4" fill={O} />
        </>
      );
    default:
      return (
        <>
          {dots(SCATTER, INK)}
        </>
      );
  }
}

export function TopicThumb({ id }: { id: string }) {
  return (
    <span className="topic-thumb-wrap" aria-hidden="true">
      <svg className="topic-thumb" viewBox="0 0 120 64">{thumb(id)}</svg>
    </span>
  );
}
