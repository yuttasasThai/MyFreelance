import { useEffect, useMemo, useRef, useState } from 'react';
import { Minus, Plus, RotateCcw, Wrench, ShoppingBag, X } from 'lucide-react';
import type { AreaGroup } from '../types.ts';
import { THAILAND_PROVINCES } from '../data/thailandProvinces.ts';

interface SimpleThailandMapProps {
  areaGroups: AreaGroup[];
  selectedKey: string | null;
  onSelectGroup: (group: AreaGroup | null) => void;
  focusTarget: { lat: number; lng: number; zoom?: number; seq: number } | null;
}

const SVG_WIDTH = 600;
const SVG_HEIGHT = 840;

// Calibrated bounds covering Thailand (Mae Sai ~20.46N down to Betong ~5.61N, West ~97.3E to East ~105.65E)
// Aspect factor cos(13 deg) ~= 0.974
const MIN_LNG = 96.8;
const MAX_LNG = 106.2;
const MIN_LAT = 5.2;
const MAX_LAT = 20.9;

function projectLatLng(lat: number, lng: number): { x: number; y: number } {
  const x = ((lng - MIN_LNG) / (MAX_LNG - MIN_LNG)) * SVG_WIDTH;
  const y = ((MAX_LAT - lat) / (MAX_LAT - MIN_LAT)) * SVG_HEIGHT;
  return { x, y };
}

// Accurate Thailand border polygon [lat, lng] clockwise from Northernmost Chiang Rai
const THAILAND_OUTLINE_COORDS: Array<[number, number]> = [
  [20.46, 99.88],
  [20.28, 100.42],
  [19.65, 100.45],
  [19.5, 101.28],
  [18.7, 101.3],
  [17.75, 101.05],
  [17.5, 101.18],
  [17.9, 101.66],
  [18.18, 102.25],
  [17.88, 102.75],
  [18.38, 103.65],
  [18.3, 104.05],
  [17.4, 104.78],
  [16.55, 104.75],
  [15.85, 105.35],
  [15.32, 105.6],
  [14.35, 105.2],
  [14.42, 104.35],
  [14.35, 103.3],
  [14.12, 102.95],
  [13.7, 102.55],
  [12.95, 102.55],
  [12.25, 102.92],
  [11.65, 102.92],
  [12.18, 102.3],
  [12.55, 101.95],
  [12.66, 101.28],
  [12.65, 100.92],
  [13.38, 100.98],
  [13.52, 100.62],
  [13.5, 100.28],
  [13.4, 100.0],
  [13.05, 100.05],
  [12.55, 99.97],
  [11.8, 99.82],
  [11.0, 99.5],
  [10.45, 99.22],
  [9.25, 99.38],
  [9.15, 99.9],
  [8.45, 100.12],
  [7.55, 100.4],
  [7.22, 100.6],
  [6.9, 101.25],
  [6.42, 101.88],
  [6.22, 102.08],
  [5.62, 101.85],
  [5.65, 101.1],
  [6.22, 101.1],
  [6.55, 100.35],
  [6.42, 100.12],
  [6.9, 99.68],
  [7.5, 99.3],
  [8.05, 98.9],
  [7.8, 98.3],
  [8.45, 98.24],
  [9.95, 98.58],
  [10.45, 98.75],
  [10.9, 99.1],
  [11.82, 99.62],
  [12.95, 99.3],
  [13.5, 99.25],
  [14.2, 98.9],
  [15.25, 98.25],
  [16.1, 98.7],
  [16.72, 98.52],
  [17.65, 97.75],
  [18.6, 97.35],
  [19.45, 97.8],
  [19.78, 98.2],
  [19.72, 98.95],
  [20.08, 99.2],
];

const REGION_LABELS: Array<{ name: string; lat: number; lng: number }> = [
  { name: 'ภาคเหนือ', lat: 18.6, lng: 99.3 },
  { name: 'ภาคอีสาน', lat: 16.4, lng: 103.3 },
  { name: 'ภาคกลาง', lat: 14.7, lng: 100.3 },
  { name: 'ภาคตะวันออก', lat: 13.3, lng: 101.8 },
  { name: 'ภาคใต้', lat: 8.6, lng: 99.4 },
];

const MAJOR_PROVINCE_GUIDES = new Set([
  'กรุงเทพมหานคร',
  'เชียงใหม่',
  'เชียงราย',
  'ขอนแก่น',
  'นครราชสีมา',
  'อุดรธานี',
  'อุบลราชธานี',
  'ชัยภูมิ',
  'ชลบุรี',
  'ระยอง',
  'นครสวรรค์',
  'พิษณุโลก',
  'สุราษฎร์ธานี',
  'ภูเก็ต',
  'สงขลา',
]);

export function SimpleThailandMap({
  areaGroups,
  selectedKey,
  onSelectGroup,
  focusTarget,
}: SimpleThailandMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragStateRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    origPanX: number;
    origPanY: number;
    moved: boolean;
  }>({
    active: false,
    startX: 0,
    startY: 0,
    origPanX: 0,
    origPanY: 0,
    moved: false,
  });

  const thailandPath = useMemo(() => {
    return (
      THAILAND_OUTLINE_COORDS.map(([lat, lng], idx) => {
        const { x, y } = projectLatLng(lat, lng);
        return `${idx === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(' ') + ' Z'
    );
  }, []);

  const gridLines = useMemo(() => {
    const lats = [8, 10, 12, 14, 16, 18, 20];
    const lngs = [98, 100, 102, 104];
    return {
      horizontals: lats.map((lat) => ({ lat, y: projectLatLng(lat, MIN_LNG).y })),
      verticals: lngs.map((lng) => ({ lng, x: projectLatLng(MIN_LAT, lng).x })),
    };
  }, []);

  const projectedProvinces = useMemo(
    () =>
      THAILAND_PROVINCES.map((p) => ({
        ...p,
        ...projectLatLng(p.lat, p.lng),
      })),
    []
  );

  const projectedGroups = useMemo(
    () =>
      areaGroups.map((group) => ({
        group,
        ...projectLatLng(group.lat, group.lng),
      })),
    [areaGroups]
  );

  const selectedGroup = useMemo(
    () => areaGroups.find((g) => g.key === selectedKey) ?? null,
    [areaGroups, selectedKey]
  );

  useEffect(() => {
    if (!focusTarget || !containerRef.current) return;
    const targetZoom = Math.min(3.5, Math.max(1.5, focusTarget.zoom ?? 2));
    const { x, y } = projectLatLng(focusTarget.lat, focusTarget.lng);
    const rect = containerRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    // SVG fits aspect ratio (preserveAspectRatio="xMidYMid meet") inside container
    const baseScale = Math.min(rect.width / SVG_WIDTH, rect.height / SVG_HEIGHT);
    const offsetX = (SVG_WIDTH / 2 - x) * baseScale * targetZoom;
    const offsetY = (SVG_HEIGHT / 2 - y) * baseScale * targetZoom;

    setZoom(targetZoom);
    setPan({ x: offsetX, y: offsetY });
  }, [focusTarget]);

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleZoomBy = (delta: number) => {
    setZoom((prev) => {
      const next = Math.min(4.5, Math.max(1, Number((prev + delta).toFixed(2))));
      if (next === 1) {
        setPan({ x: 0, y: 0 });
      }
      return next;
    });
  };

  return (
    <div
      ref={containerRef}
      className="relative h-[460px] w-full select-none overflow-hidden bg-[#eaf3fb] sm:h-[540px] lg:h-[620px]"
    >
      {/* Interactive Pan/Zoom Stage */}
      <div
        className="h-full w-full cursor-grab active:cursor-grabbing touch-none"
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest('button')) return;
          dragStateRef.current = {
            active: true,
            startX: e.clientX,
            startY: e.clientY,
            origPanX: pan.x,
            origPanY: pan.y,
            moved: false,
          };
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!dragStateRef.current.active) return;
          const dx = e.clientX - dragStateRef.current.startX;
          const dy = e.clientY - dragStateRef.current.startY;
          if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
            dragStateRef.current.moved = true;
          }
          setPan({
            x: dragStateRef.current.origPanX + dx,
            y: dragStateRef.current.origPanY + dy,
          });
        }}
        onPointerUp={() => {
          dragStateRef.current.active = false;
        }}
        onPointerCancel={() => {
          dragStateRef.current.active = false;
        }}
        onWheel={(e) => {
          e.preventDefault();
          const delta = e.deltaY < 0 ? 0.35 : -0.35;
          handleZoomBy(delta);
        }}
      >
        <div
          className="relative flex h-full w-full items-center justify-center transition-transform duration-150 ease-out"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
          }}
        >
          <svg
            viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
            className="h-full w-full max-h-full max-w-full"
            role="img"
            aria-label="แผนที่ประเทศไทยแสดงจำนวนทีมงานตามพื้นที่"
          >
            <defs>
              <filter id="thailand-land-shadow" x="-5%" y="-5%" width="110%" height="110%">
                <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#64748b" floodOpacity="0.18" />
              </filter>
            </defs>

            {/* Coordinate Graticule */}
            <g stroke="#d5e5f5" strokeWidth={0.8 / zoom} strokeDasharray="3 4">
              {gridLines.horizontals.map((g) => (
                <line key={`lat-${g.lat}`} x1={0} y1={g.y} x2={SVG_WIDTH} y2={g.y} />
              ))}
              {gridLines.verticals.map((g) => (
                <line key={`lng-${g.lng}`} x1={g.x} y1={0} x2={g.x} y2={SVG_HEIGHT} />
              ))}
            </g>

            {/* Thailand Landmass */}
            <path
              d={thailandPath}
              fill="#fcfdf9"
              stroke="#64748b"
              strokeWidth={1.6 / Math.sqrt(zoom)}
              strokeLinejoin="round"
              filter="url(#thailand-land-shadow)"
              onClick={() => {
                if (!dragStateRef.current.moved) {
                  onSelectGroup(null);
                }
              }}
            />

            {/* Subtle Regional Labels */}
            <g className="pointer-events-none select-none">
              {REGION_LABELS.map((reg) => {
                const pos = projectLatLng(reg.lat, reg.lng);
                return (
                  <text
                    key={reg.name}
                    x={pos.x}
                    y={pos.y}
                    textAnchor="middle"
                    fill="#cbd5e1"
                    fontSize={16 / Math.sqrt(zoom)}
                    fontWeight={700}
                    letterSpacing="0.03em"
                  >
                    {reg.name}
                  </text>
                );
              })}
            </g>

            {/* Province Reference Dots & Names */}
            <g className="pointer-events-none select-none">
              {projectedProvinces.map((prov) => {
                const showLabel = zoom >= 1.55 || MAJOR_PROVINCE_GUIDES.has(prov.name);
                return (
                  <g key={prov.name}>
                    <circle
                      cx={prov.x}
                      cy={prov.y}
                      r={prov.name === 'กรุงเทพมหานคร' ? 3.2 / Math.sqrt(zoom) : 1.7 / Math.sqrt(zoom)}
                      fill={prov.name === 'กรุงเทพมหานคร' ? '#f59e0b' : '#cbd5e1'}
                    />
                    {showLabel && (
                      <text
                        x={prov.x}
                        y={prov.y + 9 / Math.sqrt(zoom)}
                        textAnchor="middle"
                        fill="#94a3b8"
                        fontSize={8.5 / Math.sqrt(zoom)}
                        fontWeight={prov.name === 'กรุงเทพมหานคร' ? 600 : 400}
                      >
                        {prov.name === 'กรุงเทพมหานคร' ? 'กรุงเทพฯ' : prov.name}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>

            {/* Active Area Pins */}
            {projectedGroups.map(({ group, x, y }) => {
              const isSelected = selectedKey === group.key;
              const pinFill =
                group.assemblyCount > group.salesCount
                  ? '#1d4ed8'
                  : group.salesCount > group.assemblyCount
                  ? '#047857'
                  : '#0f172a';
              const ringStroke =
                group.assemblyCount > group.salesCount
                  ? '#bfdbfe'
                  : group.salesCount > group.assemblyCount
                  ? '#a7f3d0'
                  : '#cbd5e1';

              const invScale = 1 / Math.sqrt(zoom);
              const badgeRadius = (isSelected ? 15 : 13) * invScale;

              return (
                <g
                  key={group.key}
                  transform={`translate(${x}, ${y})`}
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (dragStateRef.current.moved) return;
                    onSelectGroup(group);
                  }}
                >
                  {/* Selection Halo */}
                  {isSelected && (
                    <circle
                      cx={0}
                      cy={0}
                      r={20 * invScale}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth={3 * invScale}
                    />
                  )}

                  {/* Pin Circle */}
                  <circle
                    cx={0}
                    cy={0}
                    r={badgeRadius}
                    fill={pinFill}
                    stroke={ringStroke}
                    strokeWidth={2 * invScale}
                  />

                  {/* Count Inside Pin */}
                  <text
                    x={0}
                    y={4 * invScale}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize={11.5 * invScale}
                    fontWeight={700}
                    fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                  >
                    {group.totalCount}
                  </text>

                  {/* Compact Label Tag Below Pin */}
                  <g transform={`translate(0, ${badgeRadius + 10 * invScale})`}>
                    <rect
                      x={-52 * invScale}
                      y={-8 * invScale}
                      width={104 * invScale}
                      height={15 * invScale}
                      rx={4 * invScale}
                      fill="rgba(255,255,255,0.94)"
                      stroke="#cbd5e1"
                      strokeWidth={0.8 * invScale}
                    />
                    <text
                      x={0}
                      y={3 * invScale}
                      textAnchor="middle"
                      fill="#0f172a"
                      fontSize={9 * invScale}
                      fontWeight={600}
                    >
                      {group.label.length > 16 ? `${group.label.slice(0, 15)}…` : group.label}
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Top-Left Title Badge */}
      <div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-slate-200 bg-white/95 px-3 py-1.5 shadow-xs backdrop-blur-xs">
        <p className="text-[11px] font-semibold text-slate-800">
          แผนที่ประเทศไทย (2D) · {areaGroups.length} พื้นที่
        </p>
        <p className="text-[10px] text-slate-500">ลากเพื่อเลื่อน · กดหมุดเพื่อดูรายละเอียด</p>
      </div>

      {/* Top-Right Zoom Controls */}
      <div className="absolute right-3 top-3 flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => handleZoomBy(0.5)}
          aria-label="ซูมเข้า"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white/95 text-slate-700 shadow-xs hover:bg-slate-50 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => handleZoomBy(-0.5)}
          aria-label="ซูมออก"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white/95 text-slate-700 shadow-xs hover:bg-slate-50 cursor-pointer"
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={handleResetView}
          aria-label="รีเซ็ตมุมมองแผนที่"
          title="รีเซ็ตมุมมอง"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white/95 text-slate-700 shadow-xs hover:bg-slate-50 cursor-pointer"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      {/* Selected Pin Detail Card */}
      {selectedGroup && (
        <div className="absolute bottom-14 left-3 right-3 z-20 mx-auto max-w-sm rounded-xl border border-slate-200 bg-white p-3.5 shadow-lg sm:bottom-4 sm:left-auto sm:right-3 sm:w-80">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-bold text-slate-900">{selectedGroup.label}</h3>
              <p className="text-xs text-slate-500">{selectedGroup.subLabel}</p>
            </div>
            <button
              type="button"
              onClick={() => onSelectGroup(null)}
              aria-label="ปิดรายละเอียด"
              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-2 flex items-center gap-3 border-y border-slate-100 py-1.5 font-mono text-xs tabular-nums">
            <span className="font-bold text-slate-900">รวม {selectedGroup.totalCount} งาน</span>
            <span className="inline-flex items-center gap-1 text-blue-700">
              <Wrench className="h-3 w-3" />
              <span>ประกอบ {selectedGroup.assemblyCount}</span>
            </span>
            <span className="inline-flex items-center gap-1 text-emerald-700">
              <ShoppingBag className="h-3 w-3" />
              <span>ขาย {selectedGroup.salesCount}</span>
            </span>
          </div>

          <ul className="mt-2 max-h-32 space-y-1.5 overflow-y-auto text-xs">
            {selectedGroup.records.map((rec) => (
              <li key={rec.id} className="flex items-center justify-between gap-2">
                <span className="truncate font-medium text-slate-800">{rec.name}</span>
                <span className="shrink-0 font-mono text-[11px] text-slate-500 tabular-nums">
                  {rec.phone}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Map Legend Overlay */}
      <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap items-center gap-2.5 rounded-lg border border-slate-200 bg-white/95 px-3 py-1.5 text-[11px] text-slate-700 shadow-xs backdrop-blur-xs">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-700" />
          <span>งานประกอบเด่น</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-700" />
          <span>งานขายเด่น</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-900" />
          <span>เท่ากัน</span>
        </span>
      </div>
    </div>
  );
}
