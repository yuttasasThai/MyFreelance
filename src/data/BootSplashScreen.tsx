import { useEffect, useMemo, useState } from 'react';

interface BootSplashScreenProps {
  onComplete: () => void;
  durationMs?: number;
}

const BOOT_MESSAGE = 'จัดทำโดยช่างหน่อยชุมแพ';

function splitThaiGraphemes(text: string): string[] {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new Intl.Segmenter('th', { granularity: 'grapheme' });
    return Array.from(segmenter.segment(text), (seg) => seg.segment);
  }
  return Array.from(text);
}

// 4 columns x 3 rows solar cell grid; column index 3 is rightmost, 0 is leftmost
const SOLAR_COLS = [0, 1, 2, 3] as const;
const SOLAR_ROWS = [0, 1, 2] as const;

export function BootSplashScreen({
  onComplete,
  durationMs = 3500,
}: BootSplashScreenProps) {
  const graphemes = useMemo(() => splitThaiGraphemes(BOOT_MESSAGE), []);
  const [visibleCount, setVisibleCount] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (reducedMotion) {
      setVisibleCount(graphemes.length);
    }

    const startDelay = 200;
    const typingWindow = Math.max(1400, durationMs - 1300);
    const stepMs = Math.max(75, Math.floor(typingWindow / Math.max(1, graphemes.length)));

    const intervalIds: number[] = [];
    if (!reducedMotion) {
      const startTimer = window.setTimeout(() => {
        let count = 0;
        const typer = window.setInterval(() => {
          count += 1;
          setVisibleCount(count);
          if (count >= graphemes.length) {
            window.clearInterval(typer);
          }
        }, stepMs);
        intervalIds.push(typer);
      }, startDelay);
      intervalIds.push(startTimer);
    }

    const fadeTimer = window.setTimeout(() => {
      setIsExiting(true);
    }, durationMs);

    const doneTimer = window.setTimeout(() => {
      onComplete();
    }, durationMs + 420);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsExiting(true);
        window.setTimeout(onComplete, 200);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      intervalIds.forEach((id) => {
        window.clearTimeout(id);
        window.clearInterval(id);
      });
      window.clearTimeout(fadeTimer);
      window.clearTimeout(doneTimer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [durationMs, graphemes.length, onComplete]);

  const typedText = graphemes.slice(0, visibleCount).join('');

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="กำลังเปิดระบบ"
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950 px-6 text-slate-50 transition-opacity duration-400 ${
        isExiting ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      {/* Subtle radial atmosphere behind solar icon */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute h-80 w-80 rounded-full bg-sky-500/10 blur-3xl"
      />

      <div className="relative flex w-full max-w-md flex-col items-center text-center">
        {/* Solar Panel Icon with Right-to-Left Color Running Light */}
        <div className="relative flex items-center justify-center">
          <svg
            viewBox="0 0 180 132"
            className="h-32 w-44 drop-shadow-[0_14px_30px_rgba(14,165,233,0.22)] sm:h-36 sm:w-48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <defs>
              <clipPath id="solar-panel-clip">
                <polygon points="30,16 150,16 168,88 12,88" />
              </clipPath>
              <linearGradient id="solar-sweep-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(255,255,255,0)" />
                <stop offset="45%" stopColor="rgba(250,204,21,0.55)" />
                <stop offset="55%" stopColor="rgba(56,189,248,0.65)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
              </linearGradient>
            </defs>

            {/* Mounting stand & base */}
            <path
              d="M84 88 L80 116 M96 88 L100 116"
              stroke="#64748b"
              strokeWidth="4.5"
              strokeLinecap="round"
            />
            <rect x="60" y="114" width="60" height="7" rx="3.5" fill="#475569" />

            {/* Outer aluminum frame */}
            <polygon
              points="26,12 154,12 173,92 7,92"
              fill="#0f172a"
              stroke="#cbd5e1"
              strokeWidth="3.5"
              strokeLinejoin="round"
            />

            {/* Photovoltaic cells grid with right-to-left running color wave */}
            <g clipPath="url(#solar-panel-clip)">
              {SOLAR_ROWS.map((row) =>
                SOLAR_COLS.map((col) => {
                  // Perspective trapezoid cell calculation
                  const topOffset = row / 3;
                  const botOffset = (row + 1) / 3;
                  const yTop = 18 + topOffset * 68;
                  const yBot = 18 + botOffset * 68 - 2.5;

                  const leftTop = 30 - topOffset * 17;
                  const rightTop = 150 + topOffset * 17;
                  const leftBot = 30 - botOffset * 17;
                  const rightBot = 150 + botOffset * 17;

                  const colWidthTop = (rightTop - leftTop) / 4;
                  const colWidthBot = (rightBot - leftBot) / 4;

                  const x1 = leftTop + col * colWidthTop + 1.5;
                  const x2 = leftTop + (col + 1) * colWidthTop - 1.5;
                  const x3 = leftBot + (col + 1) * colWidthBot - 1.5;
                  const x4 = leftBot + col * colWidthBot + 1.5;

                  // Reverse column index (3 -> 0) so color wave runs right-to-left
                  const rtlStep = 3 - col;
                  const delayMs = rtlStep * 180 + row * 45;

                  return (
                    <polygon
                      key={`${row}-${col}`}
                      points={`${x1.toFixed(1)},${yTop.toFixed(1)} ${x2.toFixed(1)},${yTop.toFixed(1)} ${x3.toFixed(1)},${yBot.toFixed(1)} ${x4.toFixed(1)},${yBot.toFixed(1)}`}
                      className="solar-cell-rtl"
                      style={{ animationDelay: `${delayMs}ms` }}
                    />
                  );
                })
              )}

              {/* Sweeping light beam moving from right to left across the panel */}
              <rect
                x="0"
                y="10"
                width="64"
                height="86"
                fill="url(#solar-sweep-grad)"
                className="solar-beam-rtl"
              />
            </g>

            {/* Right-to-left indicator arrows/glow nodes along bottom frame */}
            <circle cx="144" cy="92" r="2.2" className="solar-node-rtl" style={{ animationDelay: '0ms' }} />
            <circle cx="108" cy="92" r="2.2" className="solar-node-rtl" style={{ animationDelay: '180ms' }} />
            <circle cx="72" cy="92" r="2.2" className="solar-node-rtl" style={{ animationDelay: '360ms' }} />
            <circle cx="36" cy="92" r="2.2" className="solar-node-rtl" style={{ animationDelay: '540ms' }} />
          </svg>
        </div>

        {/* Running Typewriter Thai Text */}
        <div className="mt-6 min-h-[2.75rem] flex items-center justify-center">
          <p className="font-display text-2xl font-bold tracking-wide text-white sm:text-3xl">
            <span>{typedText}</span>
            <span
              aria-hidden="true"
              className="boot-cursor ml-1 inline-block h-[1.1em] w-[3px] translate-y-[2px] rounded-xs bg-amber-400"
            />
          </p>
        </div>

        {/* Clean Progress Line sweeping Right-to-Left */}
        <div className="mt-6 h-1 w-56 overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full w-full origin-right bg-gradient-to-l from-amber-400 via-emerald-400 to-sky-400 boot-progress-fill"
            style={{ animationDuration: `${durationMs}ms` }}
          />
        </div>

        <p className="mt-3 text-xs font-medium text-slate-400">
          กำลังเตรียมระบบทีมงานอิสระ...
        </p>
      </div>

      {/* Subtle Skip Button */}
      <button
        type="button"
        onClick={() => {
          setIsExiting(true);
          window.setTimeout(onComplete, 180);
        }}
        className="absolute bottom-6 right-6 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-900 hover:text-slate-200 cursor-pointer"
      >
        ข้าม
      </button>
    </div>
  );
}
