"use client";

type CenterPendingBoltProps = {
  label?: string;
};

export default function CenterPendingBolt({
  label = "Loading",
}: CenterPendingBoltProps) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-0 z-[80] flex items-center justify-center"
      role="status"
    >
      <span className="sr-only">{label}</span>
      <span className="center-pending-bolt" aria-hidden="true">
        <svg
          className="h-[184px] w-[112px]"
          viewBox="0 0 128 224"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <filter
              id="g7-center-pending-bolt-glow"
              x="-140%"
              y="-60%"
              width="380%"
              height="220%"
            >
              <feGaussianBlur stdDeviation="2.2" result="blur-soft" />
              <feGaussianBlur
                in="SourceGraphic"
                stdDeviation="0.85"
                result="blur-tight"
              />
              <feColorMatrix
                in="blur-soft"
                type="matrix"
                values="0 0 0 0 0.231 0 0 0 0 0.51 0 0 0 0 0.965 0 0 0 0.78 0"
                result="glow-soft"
              />
              <feColorMatrix
                in="blur-tight"
                type="matrix"
                values="0 0 0 0 0.22 0 0 0 0 0.741 0 0 0 0 0.98 0 0 0 0.92 0"
                result="glow-tight"
              />
              <feMerge>
                <feMergeNode in="glow-soft" />
                <feMergeNode in="glow-tight" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient
              id="g7-center-pending-bolt-fill"
              x1="62"
              y1="8"
              x2="62"
              y2="212"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0" stopColor="#2563EB" stopOpacity="0.14" />
              <stop offset="0.58" stopColor="#1D4ED8" stopOpacity="0.08" />
              <stop offset="1" stopColor="#0F172A" stopOpacity="0.04" />
            </linearGradient>
            <linearGradient
              id="g7-center-pending-bolt-outline"
              x1="28"
              y1="20"
              x2="104"
              y2="180"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0" stopColor="#60A5FA" stopOpacity="0.28" />
              <stop offset="0.5" stopColor="#3B82F6" stopOpacity="0.18" />
              <stop offset="1" stopColor="#38BDF8" stopOpacity="0.22" />
            </linearGradient>
            <linearGradient
              id="g7-center-pending-bolt-trace"
              x1="30"
              y1="18"
              x2="104"
              y2="188"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0" stopColor="#38BDF8" />
              <stop offset="0.45" stopColor="#60A5FA" />
              <stop offset="1" stopColor="#2563EB" />
            </linearGradient>
            <linearGradient
              id="g7-center-pending-bolt-highlight"
              x1="40"
              y1="12"
              x2="92"
              y2="164"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0" stopColor="#E0F2FE" />
              <stop offset="0.45" stopColor="#BAE6FD" />
              <stop offset="1" stopColor="#7DD3FC" />
            </linearGradient>
          </defs>
          <path
            d="M86 8L20 116H58L40 212L106 84H68L86 8Z"
            fill="url(#g7-center-pending-bolt-fill)"
          />
          <g className="center-pending-bolt__base">
            <path
              d="M86 8L20 116H58L40 212L106 84H68L86 8Z"
              stroke="url(#g7-center-pending-bolt-outline)"
              strokeLinecap="round"
              strokeLinejoin="miter"
              strokeWidth="3.6"
            />
          </g>
          <g
            className="center-pending-bolt__tracer-glow"
            filter="url(#g7-center-pending-bolt-glow)"
          >
            <path
              className="center-pending-bolt__tracer center-pending-bolt__tracer--glow"
              d="M86 8L20 116H58L40 212L106 84H68L86 8Z"
              pathLength="100"
              stroke="url(#g7-center-pending-bolt-trace)"
              strokeLinecap="round"
              strokeLinejoin="miter"
              strokeWidth="5.6"
            />
          </g>
          <g className="center-pending-bolt__tracer-core">
            <path
              className="center-pending-bolt__tracer"
              d="M86 8L20 116H58L40 212L106 84H68L86 8Z"
              pathLength="100"
              stroke="url(#g7-center-pending-bolt-trace)"
              strokeLinecap="round"
              strokeLinejoin="miter"
              strokeWidth="4"
            />
            <path
              className="center-pending-bolt__tracer center-pending-bolt__tracer--highlight"
              d="M86 8L20 116H58L40 212L106 84H68L86 8Z"
              pathLength="100"
              stroke="url(#g7-center-pending-bolt-highlight)"
              strokeLinecap="round"
              strokeLinejoin="miter"
              strokeWidth="1.8"
            />
          </g>
        </svg>
      </span>
      <style jsx>{`
        .center-pending-bolt {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          opacity: 0.98;
          filter: drop-shadow(0 0 18px rgba(56, 189, 248, 0.12));
          animation: center-pending-bolt-breathe 1.7s ease-in-out infinite;
        }

        .center-pending-bolt__base {
          filter:
            drop-shadow(0 0 8px rgba(59, 130, 246, 0.06))
            drop-shadow(0 0 14px rgba(56, 189, 248, 0.04));
        }

        .center-pending-bolt__tracer {
          stroke-dasharray: 24 76;
          stroke-dashoffset: 114;
          animation: center-pending-bolt-trace 1.52s cubic-bezier(0.33, 0, 0.18, 1)
            infinite;
        }

        .center-pending-bolt__tracer--glow {
          opacity: 0.82;
          animation:
            center-pending-bolt-trace 1.52s cubic-bezier(0.33, 0, 0.18, 1)
              infinite,
            center-pending-bolt-pulse 1.52s ease-in-out infinite;
        }

        .center-pending-bolt__tracer--highlight {
          opacity: 0.92;
          animation:
            center-pending-bolt-trace 1.52s cubic-bezier(0.33, 0, 0.18, 1)
              infinite,
            center-pending-bolt-pulse 1.52s ease-in-out infinite;
        }

        @keyframes center-pending-bolt-breathe {
          0%,
          100% {
            opacity: 0.86;
            transform: scale(0.985);
          }
          50% {
            opacity: 1;
            transform: scale(1.02);
          }
        }

        @keyframes center-pending-bolt-trace {
          0% {
            stroke-dashoffset: 114;
          }
          100% {
            stroke-dashoffset: 14;
          }
        }

        @keyframes center-pending-bolt-pulse {
          0%,
          100% {
            opacity: 0.52;
          }
          38% {
            opacity: 0.98;
          }
          72% {
            opacity: 0.76;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .center-pending-bolt {
            animation: center-pending-bolt-reduced 2.4s ease-in-out infinite;
            filter: drop-shadow(0 0 20px rgba(56, 189, 248, 0.16));
          }

          .center-pending-bolt__tracer,
          .center-pending-bolt__tracer--glow,
          .center-pending-bolt__tracer--highlight {
            animation: none;
            stroke-dasharray: none;
            stroke-dashoffset: 0;
          }

          .center-pending-bolt__tracer--glow {
            opacity: 0.78;
          }

          .center-pending-bolt__tracer--highlight {
            opacity: 0.94;
          }
        }

        @keyframes center-pending-bolt-reduced {
          0%,
          100% {
            opacity: 0.84;
          }
          50% {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
