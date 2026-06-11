import { useId } from "react";

/** The ML Math Viz mark: a sigma drawn as a connected graph of nodes. */
export function BrandMark({ size = 38 }: { size?: number }) {
  const id = useId();
  return (
    <svg
      className="brand-mark-svg"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#14b8a6" />
          <stop offset="1" stopColor="#0891b2" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill={`url(#${id})`} />
      <path
        d="M44 17 L20 17 L32 32 L20 47 L44 47"
        fill="none"
        stroke="#fff"
        strokeWidth="3.6"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity="0.85"
      />
      <circle cx="44" cy="17" r="4.6" fill="#fff" />
      <circle cx="20" cy="17" r="4.6" fill="#fff" />
      <circle cx="32" cy="32" r="5.4" fill="#fff" />
      <circle cx="20" cy="47" r="4.6" fill="#fff" />
      <circle cx="44" cy="47" r="4.6" fill="#fff" />
    </svg>
  );
}
