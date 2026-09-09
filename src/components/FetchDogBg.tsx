/**
 * Decorative background: husky silhouette fetching a stick on a soft loop.
 * Non-interactive, low-opacity, respects prefers-reduced-motion.
 */
export function FetchDogBg() {
  return (
    <div
      className="fetch-dog-bg"
      aria-hidden="true"
      role="presentation"
    >
      <div className="fetch-dog-scene">
        <svg
          className="fetch-dog-svg"
          viewBox="0 0 320 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Soft ground shimmer */}
          <ellipse
            className="fetch-ground"
            cx="160"
            cy="72"
            rx="140"
            ry="6"
            fill="url(#fetchGlow)"
          />

          {/* Stick — arcs ahead, then rides with the dog */}
          <g className="fetch-stick">
            <rect
              x="0"
              y="-1.5"
              width="22"
              height="3"
              rx="1.5"
              fill="currentColor"
              opacity="0.85"
            />
            <circle cx="2" cy="0" r="1.2" fill="var(--electric)" opacity="0.7" />
            <circle cx="20" cy="0" r="1.2" fill="var(--lavender-soft)" opacity="0.6" />
          </g>

          {/* Husky-ish silhouette */}
          <g className="fetch-dog">
            {/* Tail */}
            <path
              className="fetch-tail"
              d="M8 38 Q-6 28 -4 18"
              stroke="currentColor"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
            />
            {/* Hind legs */}
            <path
              className="fetch-leg-hind"
              d="M18 48 L14 62 M26 48 L30 62"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
            {/* Body */}
            <ellipse cx="32" cy="40" rx="22" ry="12" fill="currentColor" />
            {/* Front legs */}
            <path
              className="fetch-leg-fore"
              d="M40 48 L36 62 M48 48 L52 62"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
            {/* Neck + head */}
            <ellipse cx="54" cy="30" rx="11" ry="9" fill="currentColor" />
            {/* Ears (pointy husky) */}
            <path d="M46 24 L44 12 L52 22 Z" fill="currentColor" />
            <path d="M58 22 L64 10 L66 24 Z" fill="currentColor" />
            {/* Snout */}
            <ellipse cx="64" cy="32" rx="7" ry="4.5" fill="currentColor" />
            {/* Electric eyes */}
            <circle cx="56" cy="28" r="1.8" fill="var(--electric)" className="fetch-eye" />
            <circle cx="61" cy="28" r="1.8" fill="var(--electric)" className="fetch-eye" />
            {/* Nose tip */}
            <circle cx="70" cy="32" r="1.4" fill="var(--lavender)" opacity="0.9" />
            {/* Soft belly stripe (husky marking) */}
            <ellipse cx="34" cy="42" rx="12" ry="5" fill="var(--electric)" opacity="0.12" />
          </g>

          <defs>
            <radialGradient id="fetchGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--electric)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--electric)" stopOpacity="0" />
            </radialGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}
