import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Wrench, ShoppingBag, X } from 'lucide-react';
import type { AreaGroup } from '../types.ts';

export type MapTypeOption = 'roadmap' | 'satellite' | 'hybrid' | 'terrain';

export type MapCameraCommand =
  | { type: 'focus'; lat: number; lng: number; zoom?: number; seq: number }
  | { type: 'zoomIn'; seq: number }
  | { type: 'zoomOut'; seq: number }
  | { type: 'reset'; seq: number }
  | { type: 'fitAll'; seq: number };

interface LeafletThailandMapProps {
  areaGroups: AreaGroup[];
  selectedKey: string | null;
  onSelectGroup: (group: AreaGroup | null) => void;
  cameraCommand: MapCameraCommand | null;
  mapType: MapTypeOption;
  onZoomChange?: (zoom: number) => void;
}

const THAILAND_CENTER: [number, number] = [13.7563, 100.5018];
const DEFAULT_ZOOM = 6;
const MIN_ZOOM = 5;
const MAX_ZOOM = 17;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildTileLayersForType(mapType: MapTypeOption): L.TileLayer[] {
  if (mapType === 'satellite') {
    return [
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 18,
          attribution: 'Tiles &copy; Esri, Maxar, Earthstar Geographics',
        }
      ),
    ];
  }

  if (mapType === 'hybrid') {
    const imagery = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 18,
        attribution: 'Tiles &copy; Esri',
      }
    );
    const labelsOverlay = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 18,
        attribution: 'Labels &copy; Esri',
      }
    );
    return [imagery, labelsOverlay];
  }

  if (mapType === 'terrain') {
    return [
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 18,
          attribution: 'Tiles &copy; Esri',
        }
      ),
    ];
  }

  // 'roadmap': OpenStreetMap primary with Esri World Street fallback
  const primaryTiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; OpenStreetMap contributors',
  });

  return [primaryTiles];
}

export function LeafletThailandMap({
  areaGroups,
  selectedKey,
  onSelectGroup,
  cameraCommand,
  mapType,
  onZoomChange,
}: LeafletThailandMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const baseLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const onSelectGroupRef = useRef(onSelectGroup);
  onSelectGroupRef.current = onSelectGroup;
  const onZoomChangeRef = useRef(onZoomChange);
  onZoomChangeRef.current = onZoomChange;
  const areaGroupsRef = useRef(areaGroups);
  areaGroupsRef.current = areaGroups;

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
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      zoomControl: false,
      attributionControl: true,
    });

    const baseLayerGroup = L.layerGroup().addTo(map);
    const markersLayer = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    baseLayerGroupRef.current = baseLayerGroup;
    markersLayerRef.current = markersLayer;

    onZoomChangeRef.current?.(map.getZoom());

    map.on('zoomend', () => {
      onZoomChangeRef.current?.(map.getZoom());
    });

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
      baseLayerGroupRef.current = null;
      markersLayerRef.current = null;
    };
  }, []);

  // Swap tile layers whenever mapType changes
  useEffect(() => {
    const baseLayerGroup = baseLayerGroupRef.current;
    if (!baseLayerGroup) return;

    baseLayerGroup.clearLayers();
    const layers = buildTileLayersForType(mapType);

    if (mapType === 'roadmap' && layers[0]) {
      let fallbackAdded = false;
      layers[0].on('tileerror', () => {
        if (!fallbackAdded && baseLayerGroupRef.current === baseLayerGroup) {
          fallbackAdded = true;
          L.tileLayer(
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
            {
              maxZoom: 18,
              attribution: 'Tiles &copy; Esri',
            }
          ).addTo(baseLayerGroup);
        }
      });
    }

    for (const layer of layers) {
      layer.addTo(baseLayerGroup);
    }
  }, [mapType]);

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

  // Execute unified zoom, reset, fit-all, or focus commands
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !cameraCommand) return;

    if (cameraCommand.type === 'zoomIn') {
      map.setZoom(Math.min(MAX_ZOOM, map.getZoom() + 1));
      return;
    }

    if (cameraCommand.type === 'zoomOut') {
      map.setZoom(Math.max(MIN_ZOOM, map.getZoom() - 1));
      return;
    }

    if (cameraCommand.type === 'reset') {
      map.setView(THAILAND_CENTER, DEFAULT_ZOOM, { animate: true });
      return;
    }

    if (cameraCommand.type === 'fitAll') {
      const groups = areaGroupsRef.current;
      if (groups.length === 0) {
        map.setView(THAILAND_CENTER, DEFAULT_ZOOM, { animate: true });
      } else if (groups.length === 1) {
        map.flyTo([groups[0].lat, groups[0].lng], 11, { duration: 0.5 });
      } else {
        const bounds = L.latLngBounds(groups.map((g) => [g.lat, g.lng] as [number, number]));
        map.fitBounds(bounds, { padding: [56, 56], maxZoom: 13, animate: true });
      }
      return;
    }

    if (cameraCommand.type === 'focus') {
      const targetZoom = Math.min(15, Math.max(8, cameraCommand.zoom ?? 11));
      map.flyTo([cameraCommand.lat, cameraCommand.lng], targetZoom, { duration: 0.55 });
    }
  }, [cameraCommand]);

  return (
    <div className="relative h-full w-full">
      <div ref={mapContainerRef} className="z-0 h-full w-full" />

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
