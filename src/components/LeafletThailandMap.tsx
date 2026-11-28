import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { AreaGroup } from '../types.ts';

export type MapTypeOption = 'roadmap' | 'hybrid' | 'terrain';

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
const MAX_ZOOM = 19;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildTileLayersForType(mapType: MapTypeOption): L.TileLayer[] {
  if (mapType === 'hybrid') {
    const imagery = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        maxNativeZoom: 18,
        maxZoom: MAX_ZOOM,
        attribution: 'Tiles &copy; Esri',
      }
    );
    const roadsOverlay = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',
      {
        maxNativeZoom: 18,
        maxZoom: MAX_ZOOM,
        opacity: 0.78,
        attribution: 'Roads &copy; Esri',
      }
    );
    const labelsOverlay = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      {
        maxNativeZoom: 18,
        maxZoom: MAX_ZOOM,
        attribution: 'Labels &copy; Esri',
      }
    );
    return [imagery, roadsOverlay, labelsOverlay];
  }

  if (mapType === 'terrain') {
    return [
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
        {
          maxNativeZoom: 18,
          maxZoom: MAX_ZOOM,
          attribution: 'Tiles &copy; Esri',
        }
      ),
    ];
  }

  // 'roadmap': OpenStreetMap with full street/town/city labels
  const primaryTiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxNativeZoom: 19,
    maxZoom: MAX_ZOOM,
    attribution: '&copy; OpenStreetMap contributors',
  });

  return [primaryTiles];
}

function buildRedFlagHtml(count: number, isSelected: boolean, title: string): string {
  const scaleClass = isSelected ? 'scale-115' : 'hover:scale-110';
  const haloHtml = isSelected
    ? '<span class="absolute -bottom-1 left-[9px] h-3.5 w-3.5 rounded-full bg-red-500/40 ring-4 ring-amber-400/80"></span>'
    : '<span class="absolute -bottom-0.5 left-[11px] h-2 w-2 rounded-full bg-slate-900/45 ring-2 ring-white"></span>';

  return `
    <div class="relative flex h-11 w-11 items-end justify-start transition-transform duration-150 cursor-pointer ${scaleClass}" title="${escapeHtml(title)}">
      ${haloHtml}
      <svg viewBox="0 0 36 42" class="relative z-10 h-10 w-9 drop-shadow-[0_2px_4px_rgba(15,23,42,0.4)]" aria-hidden="true">
        <path d="M12 4.5 L31.5 9.5 C28.5 13 28.5 16.5 31.5 20.5 L12 24 Z" fill="#dc2626" stroke="#ffffff" stroke-width="1.6" stroke-linejoin="round" />
        <path d="M12 6 L25 9.5 L12 13 Z" fill="#ef4444" opacity="0.7" />
        <rect x="10" y="3.5" width="3" height="35" rx="1.5" fill="#0f172a" stroke="#ffffff" stroke-width="1" />
        <circle cx="11.5" cy="3.5" r="2.2" fill="#f8fafc" stroke="#0f172a" stroke-width="1.2" />
      </svg>
      <span class="absolute right-0 top-0 z-20 flex h-5 min-w-[20px] items-center justify-center rounded-full border-2 border-white bg-red-600 px-1 font-mono text-[11px] font-bold leading-none text-white shadow-md tabular-nums">
        ${count}
      </span>
    </div>
  `;
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
              maxNativeZoom: 18,
              maxZoom: MAX_ZOOM,
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

  // Render Red Flag markers with numerical badges
  useEffect(() => {
    const layer = markersLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    for (const group of areaGroups) {
      const isSelected = selectedKey === group.key;
      const title = `${group.label} (${group.totalCount})`;

      const icon = L.divIcon({
        className: 'bg-transparent border-0',
        iconSize: [44, 44],
        iconAnchor: [14, 40],
        html: buildRedFlagHtml(group.totalCount, isSelected, title),
      });

      const marker = L.marker([group.lat, group.lng], {
        icon,
        zIndexOffset: isSelected ? 600 : group.totalCount,
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
        map.flyTo([groups[0].lat, groups[0].lng], 13, { duration: 0.5 });
      } else {
        const bounds = L.latLngBounds(groups.map((g) => [g.lat, g.lng] as [number, number]));
        map.fitBounds(bounds, { padding: [56, 56], maxZoom: 14, animate: true });
      }
      return;
    }

    if (cameraCommand.type === 'focus') {
      const targetZoom = Math.min(MAX_ZOOM, Math.max(8, cameraCommand.zoom ?? 12));
      map.flyTo([cameraCommand.lat, cameraCommand.lng], targetZoom, { duration: 0.55 });
    }
  }, [cameraCommand]);

  return (
    <div className="relative h-full w-full">
      <div ref={mapContainerRef} className="z-0 h-full w-full" />

      {/* Simple Red Flag Legend Overlay */}
      <div className="pointer-events-none absolute bottom-3 left-3 z-[400] flex items-center gap-2 rounded-lg border border-slate-200 bg-white/95 px-3 py-1.5 text-[11px] font-medium text-slate-700 shadow-xs backdrop-blur-xs">
        <span className="inline-block h-3 w-3 rounded-xs bg-red-600 ring-1 ring-white" />
        <span>ธงแดง = จำนวนสมาชิกในพื้นที่ (กดที่ธงเพื่อดูรายชื่อ)</span>
      </div>
    </div>
  );
}
