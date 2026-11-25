import { useState } from 'react';
import { Lock, TableProperties, MapPin, Download, KeyRound } from 'lucide-react';
import { InverterWrenchIcon, SolarCartIcon } from './WorkTypeIcons.tsx';
import type { AppPage, WorkType } from '../types.ts';

interface HomePageProps {
  isAdmin: boolean;
  isDownloadingSource: boolean;
  sourceRevision: number;
  onSelectWorkType: (type: WorkType) => void;
  onOpenAdminLogin: () => void;
  onOpenChangePasscode: () => void;
  onNavigate: (page: AppPage) => void;
  onDownloadSource: () => void;
}

const ASSEMBLY_BUTTON_IMAGE = '/assets/aistudio/IMG_20261125_133921_2043975d.png';
const SALES_BUTTON_IMAGE = '/assets/aistudio/IMG_20261125_133935_1b9fcb1b.png';

export function HomePage({
  isAdmin,
  isDownloadingSource,
  sourceRevision,
  onSelectWorkType,
  onOpenAdminLogin,
  onOpenChangePasscode,
  onNavigate,
  onDownloadSource,
}: HomePageProps) {
  const [assemblyImgError, setAssemblyImgError] = useState(false);
  const [salesImgError, setSalesImgError] = useState(false);

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl flex-col items-center justify-center px-3 py-8 sm:px-6">
      {/* Cover Header */}
      <section className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl [text-wrap:balance]">
          งานอิสระทำที่บ้าน
        </h1>
        <p className="mt-1.5 font-display text-base font-medium text-slate-600 sm:text-lg">
          &ldquo;งานดี my freelance&rdquo;
        </p>
        <p className="mt-1.5 font-mono text-xs font-medium text-slate-500 tabular-nums">
          Revision rev{sourceRevision}
        </p>
      </section>

      {/* Focal Anchor: Two 3D Beveled Image Buttons sized cleanly for mobile & desktop */}
      <section aria-label="ปุ่มเลือกประเภทงาน 3 มิติ" className="mt-8 w-full max-w-xl">
        <div className="orb-3d-stage relative flex items-center justify-center rounded-3xl border border-slate-200 bg-white px-3 py-9 shadow-sm sm:px-10 sm:py-12">
          <div className="relative z-10 flex flex-row items-center justify-center gap-4 sm:gap-10">
            {/* 1) 3D Beveled Image Button: งานช่างประกอบ */}
            <button
              type="button"
              onClick={() => onSelectWorkType('assembly')}
              aria-label="งานช่างประกอบ กดกรอกข้อมูล"
              className="btn-3d-image-assembly group relative flex h-[156px] w-[156px] items-center justify-center rounded-[28px] p-[6px] cursor-pointer focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-blue-600 sm:h-[216px] sm:w-[216px] sm:rounded-[36px] sm:p-[7px]"
            >
              <div className="relative h-full w-full overflow-hidden rounded-[22px] bg-blue-600 ring-1 ring-white/50 sm:rounded-[29px]">
                {!assemblyImgError ? (
                  <img
                    src={ASSEMBLY_BUTTON_IMAGE}
                    alt="งานช่างประกอบ"
                    referrerPolicy="no-referrer"
                    onError={() => setAssemblyImgError(true)}
                    className="h-full w-full object-cover transition-transform duration-150 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-blue-500 to-blue-800 p-3 text-white">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow">
                      <InverterWrenchIcon className="h-12 w-12" />
                    </div>
                    <span className="mt-2 text-sm font-bold">งานช่างประกอบ</span>
                  </div>
                )}
                {/* Subtle top specular glass sheen for 3D depth */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/20 to-transparent"
                />
              </div>
            </button>

            {/* 2) 3D Beveled Image Button: งานขาย */}
            <button
              type="button"
              onClick={() => onSelectWorkType('sales')}
              aria-label="งานขาย กดกรอกข้อมูล"
              className="btn-3d-image-sales group relative flex h-[156px] w-[156px] items-center justify-center rounded-[28px] p-[6px] cursor-pointer focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-emerald-600 sm:h-[216px] sm:w-[216px] sm:rounded-[36px] sm:p-[7px]"
            >
              <div className="relative h-full w-full overflow-hidden rounded-[22px] bg-emerald-600 ring-1 ring-white/50 sm:rounded-[29px]">
                {!salesImgError ? (
                  <img
                    src={SALES_BUTTON_IMAGE}
                    alt="งานขาย"
                    referrerPolicy="no-referrer"
                    onError={() => setSalesImgError(true)}
                    className="h-full w-full object-cover transition-transform duration-150 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-emerald-500 to-emerald-800 p-3 text-white">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow">
                      <SolarCartIcon className="h-12 w-12" />
                    </div>
                    <span className="mt-2 text-sm font-bold">งานขาย</span>
                  </div>
                )}
                {/* Subtle top specular glass sheen for 3D depth */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/20 to-transparent"
                />
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* Admin Access Entry on Home Page */}
      <section className="mt-7 flex flex-wrap items-center justify-center gap-3">
        {!isAdmin ? (
          <button
            type="button"
            onClick={onOpenAdminLogin}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 shadow-xs transition-colors hover:bg-slate-100 cursor-pointer"
          >
            <Lock className="h-3.5 w-3.5 text-slate-500" />
            <span>Admin</span>
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onNavigate('database')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs sm:text-sm font-medium text-slate-800 shadow-xs hover:bg-slate-50 cursor-pointer"
            >
              <TableProperties className="h-4 w-4 text-emerald-700" />
              <span>ฐานข้อมูล Excel</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('map')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs sm:text-sm font-medium text-slate-800 shadow-xs hover:bg-slate-50 cursor-pointer"
            >
              <MapPin className="h-4 w-4 text-blue-700" />
              <span>แผนที่สรุปจำนวน</span>
            </button>
            <button
              type="button"
              onClick={onDownloadSource}
              disabled={isDownloadingSource}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs sm:text-sm font-medium text-white shadow-xs hover:bg-slate-800 disabled:opacity-60 cursor-pointer tabular-nums"
            >
              <Download className="h-4 w-4" />
              <span>
                {isDownloadingSource
                  ? 'กำลังเตรียมไฟล์...'
                  : `ดาวน์โหลด Source Code (rev${sourceRevision})`}
              </span>
            </button>
            <button
              type="button"
              onClick={onOpenChangePasscode}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs sm:text-sm font-medium text-slate-800 shadow-xs hover:bg-slate-50 cursor-pointer"
            >
              <KeyRound className="h-4 w-4 text-slate-600" />
              <span>เปลี่ยนรหัส Admin</span>
            </button>
          </>
        )}
      </section>
    </main>
  );
}
