import { useEffect, useMemo, useState } from 'react';
import { InverterWrenchIcon, SolarCartIcon } from './WorkTypeIcons.tsx';

interface BootSplashScreenProps {
  onComplete: () => void;
  durationMs?: number;
}

const BOOT_MESSAGE = 'จัดทำโดยช่างหน่อยชุมแพ';
const ASSEMBLY_BUTTON_IMAGE = '/assets/aistudio/IMG_20261125_133921_2043975d.png';
const SALES_BUTTON_IMAGE = '/assets/aistudio/IMG_20261125_133935_1b9fcb1b.png';

function splitThaiGraphemes(text: string): string[] {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new Intl.Segmenter('th', { granularity: 'grapheme' });
    return Array.from(segmenter.segment(text), (seg) => seg.segment);
  }
  return Array.from(text);
}

export function BootSplashScreen({
  onComplete,
  durationMs = 4650,
}: BootSplashScreenProps) {
  const graphemes = useMemo(() => splitThaiGraphemes(BOOT_MESSAGE), []);
  const [visibleCount, setVisibleCount] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const [assemblyImgError, setAssemblyImgError] = useState(false);
  const [salesImgError, setSalesImgError] = useState(false);

  useEffect(() => {
    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (reducedMotion) {
      setVisibleCount(graphemes.length);
    }

    const startDelay = 200;
    const typingWindow = Math.max(1800, durationMs - 1650);
    const stepMs = Math.max(85, Math.floor(typingWindow / Math.max(1, graphemes.length)));

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
    }, durationMs + 350);

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
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950 px-6 text-slate-50 transition-opacity duration-[350ms] ${
        isExiting ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      {/* Subtle radial glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute h-80 w-80 rounded-full bg-blue-500/15 blur-3xl"
      />

      <div className="relative flex w-full max-w-md flex-col items-center text-center">
        {/* Opposite-Direction Running Lanes */}
        <div className="w-full max-w-sm space-y-3 overflow-hidden py-2">
          {/* Lane 1: "งานช่างประกอบ" Icon running Left -> Right */}
          <div>
            <div
              className="flex w-full justify-start boot-icon-runner-ltr"
              style={{ animationDuration: `${durationMs}ms` }}
            >
              <div className="btn-3d-image-assembly flex h-[72px] w-[72px] items-center justify-center rounded-2xl p-[4px] sm:h-[88px] sm:w-[88px] sm:rounded-[20px] sm:p-[5px]">
                <div className="relative h-full w-full overflow-hidden rounded-[12px] bg-blue-600 ring-1 ring-white/50 sm:rounded-[15px]">
                  {!assemblyImgError ? (
                    <img
                      src={ASSEMBLY_BUTTON_IMAGE}
                      alt="ไอคอนปุ่มงานช่างประกอบ"
                      referrerPolicy="no-referrer"
                      onError={() => setAssemblyImgError(true)}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500 to-blue-800 p-2">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow">
                        <InverterWrenchIcon className="h-8 w-8" />
                      </div>
                    </div>
                  )}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/25 to-transparent"
                  />
                </div>
              </div>
            </div>
            <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full w-full origin-left rounded-full bg-gradient-to-r from-blue-500 via-sky-400 to-cyan-300 boot-progress-fill-ltr"
                style={{ animationDuration: `${durationMs}ms` }}
              />
            </div>
          </div>

          {/* Lane 2: "งานขาย" Icon running Right -> Left */}
          <div>
            <div
              className="flex w-full justify-start boot-icon-runner-rtl"
              style={{ animationDuration: `${durationMs}ms` }}
            >
              <div className="btn-3d-image-sales flex h-[72px] w-[72px] items-center justify-center rounded-2xl p-[4px] sm:h-[88px] sm:w-[88px] sm:rounded-[20px] sm:p-[5px]">
                <div className="relative h-full w-full overflow-hidden rounded-[12px] bg-emerald-600 ring-1 ring-white/50 sm:rounded-[15px]">
                  {!salesImgError ? (
                    <img
                      src={SALES_BUTTON_IMAGE}
                      alt="ไอคอนปุ่มงานขาย"
                      referrerPolicy="no-referrer"
                      onError={() => setSalesImgError(true)}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-500 to-emerald-800 p-2">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow">
                        <SolarCartIcon className="h-8 w-8" />
                      </div>
                    </div>
                  )}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/25 to-transparent"
                  />
                </div>
              </div>
            </div>
            <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full w-full origin-right rounded-full bg-gradient-to-l from-emerald-500 via-teal-400 to-amber-300 boot-progress-fill-rtl"
                style={{ animationDuration: `${durationMs}ms` }}
              />
            </div>
          </div>
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

        <p className="mt-2.5 text-xs font-medium text-slate-400">
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
