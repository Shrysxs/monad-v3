import React from 'react';

interface TuxLogoProps {
  size?: number;
  className?: string;
  showWordmark?: boolean;
  wordmarkClassName?: string;
  subtitle?: string;
}

/**
 * Authentic Linux Tux Penguin Mascot Logo Component.
 * Features the canonical Tux silhouette: round black body, white belly/face patches,
 * distinctive expressive eyes, and classic orange beak and webbed flipper feet.
 * Designed to render sharply against dark and near-black surfaces.
 */
export function TuxLogo({
  size = 28,
  className = '',
  showWordmark = false,
  wordmarkClassName = '',
  subtitle,
}: TuxLogoProps) {
  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Tux Mascot SVG */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
        role="img"
        aria-label="Linux Tux Penguin mascot - Penguin Trace brand mark"
      >
        <title>Linux Tux Penguin</title>
        <g id="tux-penguin">
          {/* Subtle outline highlight for contrast against #070708 near-black background */}
          <path
            d="M50 8 C33 8 25 21 25 40 C25 50 16 63 16 75 C16 83 23 88 32 88 L68 88 C77 88 84 83 84 75 C84 63 75 50 75 40 C75 21 67 8 50 8 Z"
            fill="#232529"
          />

          {/* Left Foot (Orange/Yellow-Orange Webbed) */}
          <path
            d="M20 84 C12 84 10 92 18 95 C25 97 38 95 44 91 C46 89 44 85 38 85 C32 85 26 84 20 84 Z"
            fill="#F59E0B"
            stroke="#D97706"
            strokeWidth="1.5"
          />
          {/* Left Toe Web Details */}
          <path d="M19 92 C23 93 28 92 31 89" stroke="#B45309" strokeWidth="1" strokeLinecap="round" />
          <path d="M25 94 C29 95 35 93 38 90" stroke="#B45309" strokeWidth="1" strokeLinecap="round" />

          {/* Right Foot (Orange/Yellow-Orange Webbed) */}
          <path
            d="M80 84 C88 84 90 92 82 95 C75 97 62 95 56 91 C54 89 56 85 62 85 C68 85 74 84 80 84 Z"
            fill="#F59E0B"
            stroke="#D97706"
            strokeWidth="1.5"
          />
          {/* Right Toe Web Details */}
          <path d="M81 92 C77 93 72 92 69 89" stroke="#B45309" strokeWidth="1" strokeLinecap="round" />
          <path d="M75 94 C71 95 65 93 62 90" stroke="#B45309" strokeWidth="1" strokeLinecap="round" />

          {/* Main Body (Deep Charcoal Black Tux Body) */}
          <path
            d="M50 10 C35 10 27 22 27 40 C27 50 19 63 19 74 C19 82 25 86 34 86 L66 86 C75 86 81 82 81 74 C81 63 73 50 73 40 C73 22 65 10 50 10 Z"
            fill="#111215"
          />

          {/* Left Wing / Flipper */}
          <path
            d="M27 42 C23 45 13 55 13 67 C13 74 18 76 22 72 C27 67 29 58 29 49 Z"
            fill="#181A1F"
            stroke="#23262E"
            strokeWidth="1"
          />

          {/* Right Wing / Flipper */}
          <path
            d="M73 42 C77 45 87 55 87 67 C87 74 82 76 78 72 C73 67 71 58 71 49 Z"
            fill="#181A1F"
            stroke="#23262E"
            strokeWidth="1"
          />

          {/* White Chest & Belly Patch (Tux Hallmark) */}
          <ellipse cx="50" cy="62" rx="23" ry="21" fill="#F4F5F7" />
          <path
            d="M29 64 C29 76 38 84 50 84 C62 84 71 76 71 64 C71 56 64 47 50 47 C36 47 29 56 29 64 Z"
            fill="#FFFFFF"
          />
          {/* Soft Belly Shadow */}
          <ellipse cx="50" cy="74" rx="16" ry="7" fill="#E5E7EB" opacity="0.6" />

          {/* White Face Patch (Mask around eyes) */}
          <path
            d="M40 33 C40 38 35 41 33 41 C31 41 29 38 30 33 C31 27 35 24 39 25 C40 26 40 30 40 33 Z"
            fill="#FFFFFF"
          />
          <path
            d="M60 33 C60 38 65 41 67 41 C69 41 71 38 70 33 C69 27 65 24 61 25 C60 26 60 30 60 33 Z"
            fill="#FFFFFF"
          />
          <ellipse cx="44" cy="31" rx="8" ry="9" fill="#FFFFFF" />
          <ellipse cx="56" cy="31" rx="8" ry="9" fill="#FFFFFF" />

          {/* Left Eye */}
          <ellipse cx="43.5" cy="30" rx="3.5" ry="5.5" fill="#111215" />
          <circle cx="42.5" cy="28" r="1.2" fill="#FFFFFF" />

          {/* Right Eye */}
          <ellipse cx="56.5" cy="30" rx="3.5" ry="5.5" fill="#111215" />
          <circle cx="55.5" cy="28" r="1.2" fill="#FFFFFF" />

          {/* Classic Curved Orange Beak (Upper and Lower Mandibles) */}
          {/* Lower Beak Shadow */}
          <path
            d="M42 41 C42 45 46 47 50 47 C54 47 58 45 58 41 Z"
            fill="#D97706"
          />
          {/* Upper Beak */}
          <path
            d="M37 36 C42 34 58 34 63 36 C64 38 62 43 50 45 C38 43 36 38 37 36 Z"
            fill="#F59E0B"
            stroke="#D97706"
            strokeWidth="1"
          />
          {/* Beak Nostril markings */}
          <circle cx="47" cy="37" r="0.6" fill="#B45309" />
          <circle cx="53" cy="37" r="0.6" fill="#B45309" />
        </g>
      </svg>

      {/* Optional Wordmark */}
      {showWordmark && (
        <div className="flex flex-col leading-none">
          <div
            className={`text-sm font-semibold tracking-tight text-[#F0F1F2] uppercase font-mono ${wordmarkClassName}`}
          >
            PENGUIN TRACE
          </div>
          {subtitle && (
            <div className="text-[10px] font-mono text-[#9A9DA3] tracking-wide mt-0.5">
              {subtitle}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TuxLogo;
