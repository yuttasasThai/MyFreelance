import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { RotateCcw, Wrench, ShoppingBag, X } from 'lucide-react';
import type { AreaGroup } from '../types.ts';

interface LeafletThailandMapProps {
  areaGroups: AreaGroup[];
  selectedKey: string | null;
  onSelectGroup: (group: AreaGroup | null) => void;
  focusTarget: { lat: number; lng: number; zoom?: number; seq: number } | null;
}

const THAILAND_CENTER: [number, number] = [13.7563, 100.5018];
const DEFAULT_ZOOM = 6;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function LeafletThailandMap({
  areaGroups,
  selectedKey,
  onSelectGroup,
  focusTarget,
}: LeafletThailandMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const onSelectGroupRef = useRef(onSelectGroup);
  onSelectGroupRef.current = onSelectGroup;

  const selectedGroup = useMemo(
    () => areaGroups.find((g) => g.key === selectedKey) ?? null,
    [areaGroups, selectedKey]
  );

  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container || mapInstanceRef.current) return;

    const map = L.map(container, {
      center: THAILAND_CENTER,
      zoom: DEFAULT_ZOOM,
      minZoom: 5,
      maxZoom: 17,
      zoomControl: true,
      attributionControl: true,
    });

    // Clean, minimal street/province tiles (CartoDB Voyager with OSM fallback)
    const primaryTiles = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      {
        subdomains: 'abcd',
        maxZoom: 18,
        attribution: '&copy; OpenStreetMap &copy; CARTO',
      }
    );

    let fallbackAdded = false;
    primaryTiles.on('tileerror', () => {
      if (!fallbackAdded) {
        fallbackAdded = true;
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 18,
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map);
      }
    });

    primaryTiles.addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    markersLayerRef.current = markersLayer;

    map.on('click', () => {
      onSelectGroupRef.current(null);
    });

    const handleResize = () => {
      map.invalidateSize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      map.remove();
      mapInstanceRef.current = null;
      markersLayerRef.current = null;
    };
  }, []);

  // Render simple, clean numbered markers on the map
  useEffect(() => {
    const layer = markersLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    for (const group of areaGroups) {
      const isSelected = selectedKey === group.key;
      const bgClass =
        group.assemblyCount > group.salesCount
          ? 'bg-blue-700 border-blue-200'
          : group.salesCount > group.assemblyCount
          ? 'bg-emerald-700 border-emerald-200'
          : 'bg-slate-900 border-slate-200';
      const ringClass = isSelected ? 'ring-4 ring-amber-400 scale-110' : '';

      const icon = L.divIcon({
        className: 'bg-transparent border-0',
        iconSize: [38, 38],
        iconAnchor: [19, 19],
        html: `<div class="flex h-9 w-9 items-center justify-center rounded-full border-2 ${bgClass} ${ringClass} font-mono text-xs font-bold text-white shadow-md tabular-nums transition-transform hover:scale-110" title="${escapeHtml(
          `${group.label} (${group.totalCount})`
        )}">${group.totalCount}</div>`,
      });

      const marker = L.marker([group.lat, group.lng], {
        icon,
        zIndexOffset: isSelected ? 500 : group.totalCount,
      });

      marker.on('click', (ev) => {
        L.DomEvent.stopPropagation(ev);
        onSelectGroupRef.current(group);
      });

      marker.addTo(layer);
    }
  }, [areaGroups, selectedKey]);

  // Smoothly fly & zoom when selecting from the sidebar list
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !focusTarget) return;
    const targetZoom = Math.min(15, Math.max(8, focusTarget.zoom ?? 11));
    map.flyTo([focusTarget.lat, focusTarget.lng], targetZoom, { duration: 0.55 });
  }, [focusTarget]);

  const handleResetView = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    onSelectGroup(null);
    map.setView(THAILAND_CENTER, DEFAULT_ZOOM, { animate: true });
  };

  return (
    <div className="relative h-[460px] w-full sm:h-[540px] lg:h-[620px]">
      <div ref={mapContainerRef} className="z-0 h-full w-full" />

      {/* Top-Right Reset View Button */}
      <button
        type="button"
        onClick={handleResetView}
        title="รีเซ็ตมุมมองทั้งประเทศ"
        className="absolute right-3 top-3 z-[400] inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white/95 px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 cursor-pointer"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        <span>ทั้งประเทศ</span>
      </button>

      {/* Compact Selected Pin Details Card */}
      {selectedGroup && (
        <div className="absolute bottom-14 left-3 right-3 z-[450] mx-auto max-w-sm rounded-xl border border-slate-200 bg-white p-3.5 shadow-lg sm:bottom-4 sm:left-auto sm:right-3 sm:w-80">
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

      {/* Simple Map Legend Overlay */}
      <div className="pointer-events-none absolute bottom-3 left-3 z-[400] flex flex-wrap items-center gap-2.5 rounded-lg border border-slate-200 bg-white/95 px-3 py-1.5 text-[11px] text-slate-700 shadow-xs backdrop-blur-xs">
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
