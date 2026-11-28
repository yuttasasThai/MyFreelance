import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  APIProvider,
  APILoadingStatus,
  Map as GoogleMap,
  AdvancedMarker,
  useApiLoadingStatus,
  useAdvancedMarkerRef,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import { MarkerClusterer, type Marker as ClusterMarker } from '@googlemaps/markerclusterer';
import {
  MapPin,
  Layers,
  Wrench,
  ShoppingBag,
  Map as MapIcon,
  Building2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  X,
  Flag,
  Users,
  Phone,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { AreaGroup, TeamRecord, WorkType } from '../types.ts';
import { THAILAND_PROVINCES, normalizeProvinceName, resolveThailandCoords } from '../data/thailandProvinces.ts';
import {
  LeafletThailandMap,
  type MapCameraCommand,
  type MapTypeOption,
} from './LeafletThailandMap.tsx';

interface SummaryMapPageProps {
  records: TeamRecord[];
  apiKey: string;
  isLoadingApiKey?: boolean;
  onRetryApiKey?: () => void;
}

type GroupingLevel = 'subdistrict' | 'district' | 'province';
type MapEngineMode = 'normal' | 'google';
type PopupListFilter = 'all' | 'assembly' | 'sales';

const THAILAND_CENTER = { lat: 13.7563, lng: 100.5018 };
const MIN_ZOOM = 5;
const MAX_ZOOM = 20;
const MAP_LIBRARIES: string[] = ['marker'];

function MapTypePreviewSvg({ type }: { type: MapTypeOption }) {
  if (type === 'hybrid') {
    return (
      <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden="true">
        <rect width="64" height="64" fill="#3b433b" />
        <path d="M0 18 Q22 8 44 26 T64 16 L64 64 L0 64 Z" fill="#2f3831" />
        <path d="M8 0 Q18 28 34 64" stroke="#5c625c" strokeWidth="9" fill="none" />
        <path d="M12 0 Q22 28 38 64" stroke="#8b8f88" strokeWidth="1.5" strokeDasharray="4 4" fill="none" />
        <path d="M26 0 Q38 30 56 64" stroke="#6f756e" strokeWidth="7" fill="none" />
        <path d="M26 0 Q38 30 56 64" stroke="#a6aaa2" strokeWidth="1.2" strokeDasharray="4 4" fill="none" />
        <circle cx="48" cy="14" r="5" fill="#4f5f4e" opacity="0.7" />
        <circle cx="14" cy="48" r="6" fill="#455344" opacity="0.7" />
      </svg>
    );
  }

  if (type === 'terrain') {
    return (
      <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden="true">
        <rect width="64" height="64" fill="#d9e5cf" />
        <path d="M0 10 Q18 26 40 16 T64 26 L64 64 L0 64 Z" fill="#c3d7b6" />
        <path d="M0 32 Q20 18 36 38 T64 34 L64 64 L0 64 Z" fill="#adc69e" />
        <path d="M10 64 Q16 42 30 34 T48 0" stroke="#9eb88e" strokeWidth="11" fill="none" strokeLinecap="round" />
        <path
          d="M12 64 C16 44 20 34 32 30 C44 26 42 12 52 0"
          stroke="#ffffff"
          strokeWidth="4.5"
          fill="none"
          strokeLinecap="round"
        />
        <path d="M40 38 L52 50 L64 42 L64 64 L32 64 Z" fill="#95b085" opacity="0.65" />
      </svg>
    );
  }

  // 'roadmap' (ค่าเริ่มต้น)
  return (
    <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden="true">
      <rect width="64" height="64" fill="#f1f5f9" />
      <path d="M0 0 L42 0 Q36 22 18 28 T0 42 Z" fill="#93c5fd" />
      <path d="M22 0 L64 0 L64 20 Q46 24 38 14 T22 0 Z" fill="#86efac" opacity="0.85" />
      <path d="M34 32 Q44 40 64 36 L64 64 L26 64 Q30 46 34 32 Z" fill="#e2e8f0" />
      <path d="M10 64 Q18 38 42 26 T64 8" stroke="#ffffff" strokeWidth="6" fill="none" />
      <path d="M22 64 L54 0" stroke="#64748b" strokeWidth="4" fill="none" />
      <path d="M22 64 L54 0" stroke="#60a5fa" strokeWidth="2.5" fill="none" />
      <path d="M4 44 L44 58" stroke="#ffffff" strokeWidth="4" fill="none" />
    </svg>
  );
}

const MAP_TYPE_OPTIONS: {
  id: MapTypeOption;
  label: string;
}[] = [
  { id: 'roadmap', label: 'ค่าเริ่มต้น' },
  { id: 'hybrid', label: 'ดาวเทียม' },
  { id: 'terrain', label: 'ภูมิประเทศ' },
];

function RedFlagBadge({ count, isSelected, isCluster = false }: { count: number; isSelected?: boolean; isCluster?: boolean }) {
  return (
    <div
      className={`relative flex items-end justify-start transition-transform duration-150 cursor-pointer select-none ${
        isCluster ? 'h-12 w-12 scale-105' : 'h-11 w-11'
      } ${isSelected ? 'scale-115' : 'hover:scale-110'}`}
    >
      {isSelected ? (
        <span className="absolute -bottom-1 left-[9px] h-3.5 w-3.5 rounded-full bg-red-500/40 ring-4 ring-amber-400/85" />
      ) : (
        <span className="absolute -bottom-0.5 left-[11px] h-2 w-2 rounded-full bg-slate-900/45 ring-2 ring-white" />
      )}
      <svg
        viewBox="0 0 36 42"
        className="relative z-10 h-10 w-9 drop-shadow-[0_2px_4px_rgba(15,23,42,0.42)]"
        aria-hidden="true"
      >
        <path
          d="M12 4.5 L31.5 9.5 C28.5 13 28.5 16.5 31.5 20.5 L12 24 Z"
          fill={isCluster ? '#b91c1c' : '#dc2626'}
          stroke="#ffffff"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path d="M12 6 L25 9.5 L12 13 Z" fill="#ef4444" opacity="0.72" />
        <rect x="10" y="3.5" width="3" height="35" rx="1.5" fill="#0f172a" stroke="#ffffff" strokeWidth="1" />
        <circle cx="11.5" cy="3.5" r="2.2" fill="#f8fafc" stroke="#0f172a" strokeWidth="1.2" />
      </svg>
      <span
        className={`absolute right-0 top-0 z-20 flex h-5 min-w-[20px] items-center justify-center rounded-full border-2 border-white px-1 font-mono text-[11px] font-bold leading-none text-white shadow-md tabular-nums ${
          isCluster ? 'bg-slate-900' : 'bg-red-600'
        }`}
      >
        {count}
      </span>
    </div>
  );
}

function createClusterFlagElement(totalCount: number): HTMLDivElement {
  const wrapper = document.createElement('div');
  wrapper.className =
    'relative flex h-12 w-12 items-end justify-start transition-transform duration-150 hover:scale-110 cursor-pointer select-none';

  const baseDot = document.createElement('span');
  baseDot.className =
    'absolute -bottom-0.5 left-[12px] h-2.5 w-2.5 rounded-full bg-slate-900/55 ring-2 ring-white';
  wrapper.appendChild(baseDot);

  const svgNs = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNs, 'svg');
  svg.setAttribute('viewBox', '0 0 36 42');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', 'relative z-10 h-11 w-10 drop-shadow-[0_3px_5px_rgba(15,23,42,0.45)]');

  const flagPath = document.createElementNS(svgNs, 'path');
  flagPath.setAttribute('d', 'M12 4.5 L31.5 9.5 C28.5 13 28.5 16.5 31.5 20.5 L12 24 Z');
  flagPath.setAttribute('fill', '#b91c1c');
  flagPath.setAttribute('stroke', '#ffffff');
  flagPath.setAttribute('stroke-width', '1.6');
  flagPath.setAttribute('stroke-linejoin', 'round');
  svg.appendChild(flagPath);

  const highlight = document.createElementNS(svgNs, 'path');
  highlight.setAttribute('d', 'M12 6 L25 9.5 L12 13 Z');
  highlight.setAttribute('fill', '#ef4444');
  highlight.setAttribute('opacity', '0.72');
  svg.appendChild(highlight);

  const pole = document.createElementNS(svgNs, 'rect');
  pole.setAttribute('x', '10');
  pole.setAttribute('y', '3.5');
  pole.setAttribute('width', '3');
  pole.setAttribute('height', '35');
  pole.setAttribute('rx', '1.5');
  pole.setAttribute('fill', '#0f172a');
  pole.setAttribute('stroke', '#ffffff');
  pole.setAttribute('stroke-width', '1');
  svg.appendChild(pole);

  const finial = document.createElementNS(svgNs, 'circle');
  finial.setAttribute('cx', '11.5');
  finial.setAttribute('cy', '3.5');
  finial.setAttribute('r', '2.2');
  finial.setAttribute('fill', '#f8fafc');
  finial.setAttribute('stroke', '#0f172a');
  finial.setAttribute('stroke-width', '1.2');
  svg.appendChild(finial);

  wrapper.appendChild(svg);

  const badge = document.createElement('span');
  badge.className =
    'absolute right-0 top-0 z-20 flex h-5.5 min-w-[22px] items-center justify-center rounded-full border-2 border-white bg-slate-900 px-1.5 font-mono text-[11px] font-bold leading-none text-white shadow-md tabular-nums';
  badge.textContent = String(totalCount);
  wrapper.appendChild(badge);

  return wrapper;
}

function MapLoadingStatusGuard({ onAuthOrLoadFailure }: { onAuthOrLoadFailure: () => void }) {
  const status = useApiLoadingStatus();

  useEffect(() => {
    if (status === APILoadingStatus.FAILED || status === APILoadingStatus.AUTH_FAILURE) {
      onAuthOrLoadFailure();
    }
  }, [status, onAuthOrLoadFailure]);

  return null;
}

function MapCameraController({
  command,
  areaGroups,
}: {
  command: MapCameraCommand | null;
  areaGroups: AreaGroup[];
}) {
  const map = useMap();

  useEffect(() => {
    if (!map || !command) return;

    if (command.type === 'zoomIn') {
      map.setZoom(Math.min(MAX_ZOOM, (map.getZoom() ?? 6) + 1));
      return;
    }

    if (command.type === 'zoomOut') {
      map.setZoom(Math.max(MIN_ZOOM, (map.getZoom() ?? 6) - 1));
      return;
    }

    if (command.type === 'reset') {
      map.panTo(THAILAND_CENTER);
      map.setZoom(6);
      return;
    }

    if (command.type === 'fitAll') {
      if (areaGroups.length === 0) {
        map.panTo(THAILAND_CENTER);
        map.setZoom(6);
      } else if (areaGroups.length === 1) {
        map.panTo({ lat: areaGroups[0].lat, lng: areaGroups[0].lng });
        map.setZoom(13);
      } else {
        let north = -90;
        let south = 90;
        let east = -180;
        let west = 180;
        for (const group of areaGroups) {
          if (group.lat > north) north = group.lat;
          if (group.lat < south) south = group.lat;
          if (group.lng > east) east = group.lng;
          if (group.lng < west) west = group.lng;
        }
        map.fitBounds({ north, south, east, west }, 56);
      }
      return;
    }

    if (command.type === 'focus') {
      map.panTo({ lat: command.lat, lng: command.lng });
      map.setZoom(Math.min(MAX_ZOOM, command.zoom ?? 13));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, command]);

  return null;
}

function AreaPinMarker({
  group,
  isSelected,
  onSelect,
  setMarkerRef,
}: {
  group: AreaGroup;
  isSelected: boolean;
  onSelect: (group: AreaGroup) => void;
  setMarkerRef: (marker: ClusterMarker | null, key: string, totalCount: number) => void;
}) {
  const [markerRef, marker] = useAdvancedMarkerRef();

  useEffect(() => {
    setMarkerRef(marker, group.key, group.totalCount);
    return () => {
      setMarkerRef(null, group.key, group.totalCount);
    };
  }, [marker, group.key, group.totalCount, setMarkerRef]);

  return (
    <AdvancedMarker
      ref={markerRef}
      position={{ lat: group.lat, lng: group.lng }}
      title={`${group.label} (${group.subLabel}) — ${group.totalCount} งาน`}
      onClick={() => onSelect(group)}
      zIndex={isSelected ? 600 : group.totalCount}
    >
      <RedFlagBadge count={group.totalCount} isSelected={isSelected} />
    </AdvancedMarker>
  );
}

function ClusteredAreaMarkers({
  areaGroups,
  selectedKey,
  onSelect,
}: {
  areaGroups: AreaGroup[];
  selectedKey: string | null;
  onSelect: (group: AreaGroup) => void;
}) {
  const map = useMap();
  const markerLib = useMapsLibrary('marker');
  const [markers, setMarkers] = useState<Record<string, ClusterMarker>>({});
  const markerTotalsRef = useRef<WeakMap<ClusterMarker, number>>(new WeakMap());

  const clusterer = useMemo(() => {
    if (!map || !markerLib) return null;
    const { AdvancedMarkerElement } = markerLib;

    return new MarkerClusterer({
      map,
      renderer: {
        render: ({ count, position, markers: clusterMarkers }) => {
          const totalCount = (clusterMarkers ?? []).reduce(
            (sum, m) => sum + (markerTotalsRef.current.get(m) ?? 1),
            0
          );
          const flagEl = createClusterFlagElement(totalCount);

          const clusterPin = new AdvancedMarkerElement({
            position,
            title: `รวม ${totalCount} งาน จาก ${count} พื้นที่ (คลิกเพื่อซูมดู)`,
            zIndex: 1000 + totalCount,
          });
          clusterPin.append(flagEl);
          return clusterPin;
        },
      },
    });
  }, [map, markerLib]);

  const setMarkerRef = useCallback(
    (marker: ClusterMarker | null, key: string, totalCount: number) => {
      if (marker) {
        markerTotalsRef.current.set(marker, totalCount);
      }
      setMarkers((prev) => {
        if (marker) {
          if (prev[key] === marker) return prev;
          return { ...prev, [key]: marker };
        }
        if (!(key in prev)) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    []
  );

  useEffect(() => {
    if (!clusterer) return;
    clusterer.clearMarkers();
    const list = Object.values(markers);
    if (list.length > 0) {
      clusterer.addMarkers(list);
    }
  }, [clusterer, markers, areaGroups]);

  useEffect(() => {
    return () => {
      if (clusterer) {
        clusterer.clearMarkers();
      }
    };
  }, [clusterer]);

  return (
    <>
      {areaGroups.map((group) => (
        <AreaPinMarker
          key={group.key}
          group={group}
          isSelected={selectedKey === group.key}
          onSelect={onSelect}
          setMarkerRef={setMarkerRef}
        />
      ))}
    </>
  );
}

export function SummaryMapPage({
  records,
  apiKey,
  isLoadingApiKey = false,
}: SummaryMapPageProps) {
  const [filterType, setFilterType] = useState<'all' | WorkType>('all');
  const [groupingLevel, setGroupingLevel] = useState<GroupingLevel>('subdistrict');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [popupListFilter, setPopupListFilter] = useState<PopupListFilter | null>(null);
  const [mapLoadError, setMapLoadError] = useState(false);
  const [preferredMode, setPreferredMode] = useState<MapEngineMode>('google');
  const [mapType, setMapType] = useState<MapTypeOption>('roadmap');
  const [isMapTypeMenuOpen, setIsMapTypeMenuOpen] = useState(false);
  const [currentZoom, setCurrentZoom] = useState<number>(6);
  const mapTypePopoverRef = useRef<HTMLDivElement | null>(null);

  const handleMapLoadError = useCallback(() => {
    setMapLoadError(true);
  }, []);

  useEffect(() => {
    setMapLoadError(false);
  }, [apiKey]);

  // Reset expanded member list inside popup whenever selected area changes
  useEffect(() => {
    setPopupListFilter(null);
  }, [selectedKey]);

  // Close map type popover on outside click or Escape
  useEffect(() => {
    if (!isMapTypeMenuOpen) return;
    const handlePointerDown = (ev: MouseEvent) => {
      if (mapTypePopoverRef.current && !mapTypePopoverRef.current.contains(ev.target as Node)) {
        setIsMapTypeMenuOpen(false);
      }
    };
    const handleKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        setIsMapTypeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMapTypeMenuOpen]);

  const [cameraCommand, setCameraCommand] = useState<MapCameraCommand | null>(null);

  const issueCameraCommand = useCallback(
    (
      cmd:
        | { type: 'focus'; lat: number; lng: number; zoom?: number }
        | { type: 'zoomIn' | 'zoomOut' | 'reset' | 'fitAll' }
    ) => {
      setCameraCommand((prev) => ({
        ...cmd,
        seq: (prev?.seq ?? 0) + 1,
      }));
    },
    []
  );

  const canUseGoogleMaps = Boolean(apiKey) && !mapLoadError && !isLoadingApiKey;
  const activeEngine: MapEngineMode =
    canUseGoogleMaps && preferredMode === 'google' ? 'google' : 'normal';

  const filteredRecords = useMemo(() => {
    if (filterType === 'all') return records;
    return records.filter((r) => r.workType === filterType);
  }, [records, filterType]);

  const areaGroups = useMemo<AreaGroup[]>(() => {
    const groups: Record<
      string,
      AreaGroup & { latSum: number; lngSum: number; useProvincePin: boolean }
    > = {};

    for (const rec of filteredRecords) {
      const normProv = normalizeProvinceName(rec.province);
      const cleanDist = rec.district.trim();
      const cleanSub = rec.subdistrict.trim();

      let key: string;
      let label: string;
      let subLabel: string;
      let coords: { lat: number; lng: number };
      let useProvincePin = false;

      if (groupingLevel === 'province') {
        key = normProv;
        label = normProv;
        subLabel = 'สรุประดับจังหวัด';
        const provMatch = THAILAND_PROVINCES.find((p) => p.name === normProv);
        coords = provMatch
          ? { lat: provMatch.lat, lng: provMatch.lng }
          : { lat: rec.lat, lng: rec.lng };
        useProvincePin = true;
      } else if (groupingLevel === 'district') {
        key = `${cleanDist}|${normProv}`;
        label = `อ.${cleanDist}`;
        subLabel = `จ.${normProv}`;
        const hasValidCoords = Number.isFinite(rec.lat) && Number.isFinite(rec.lng);
        coords = hasValidCoords
          ? { lat: rec.lat, lng: rec.lng }
          : resolveThailandCoords('', cleanDist, normProv);
      } else {
        key = `${cleanSub}|${cleanDist}|${normProv}`;
        label = `ต.${cleanSub}`;
        subLabel = `อ.${cleanDist} จ.${normProv}`;
        const hasValidCoords = Number.isFinite(rec.lat) && Number.isFinite(rec.lng);
        coords = hasValidCoords
          ? { lat: rec.lat, lng: rec.lng }
          : resolveThailandCoords(cleanSub, cleanDist, normProv);
      }

      if (!groups[key]) {
        groups[key] = {
          key,
          label,
          subLabel,
          province: normProv,
          district: groupingLevel !== 'province' ? cleanDist : undefined,
          subdistrict: groupingLevel === 'subdistrict' ? cleanSub : undefined,
          lat: coords.lat,
          lng: coords.lng,
          latSum: 0,
          lngSum: 0,
          useProvincePin,
          totalCount: 0,
          assemblyCount: 0,
          salesCount: 0,
          records: [],
        };
      }

      groups[key].totalCount += 1;
      groups[key].latSum += coords.lat;
      groups[key].lngSum += coords.lng;
      if (!groups[key].useProvincePin) {
        groups[key].lat = Number((groups[key].latSum / groups[key].totalCount).toFixed(6));
        groups[key].lng = Number((groups[key].lngSum / groups[key].totalCount).toFixed(6));
      }
      if (rec.workType === 'assembly') {
        groups[key].assemblyCount += 1;
      } else {
        groups[key].salesCount += 1;
      }
      groups[key].records.push(rec);
    }

    return Object.values(groups)
      .map(({ latSum: _latSum, lngSum: _lngSum, useProvincePin: _useProv, ...group }) => group)
      .sort((a, b) => b.totalCount - a.totalCount);
  }, [filteredRecords, groupingLevel]);

  const selectedGroup = useMemo(
    () => areaGroups.find((g) => g.key === selectedKey) ?? null,
    [areaGroups, selectedKey]
  );

  const popupVisibleRecords = useMemo(() => {
    if (!selectedGroup || !popupListFilter) return [];
    if (popupListFilter === 'all') return selectedGroup.records;
    return selectedGroup.records.filter((r) => r.workType === popupListFilter);
  }, [selectedGroup, popupListFilter]);

  const handleSelectFromMarker = useCallback((group: AreaGroup) => {
    setSelectedKey(group.key);
    setPopupListFilter(null);
  }, []);

  const handleSelectFromList = useCallback(
    (group: AreaGroup) => {
      setSelectedKey(group.key);
      setPopupListFilter(null);
      issueCameraCommand({
        type: 'focus',
        lat: group.lat,
        lng: group.lng,
        zoom: groupingLevel === 'province' ? 9 : groupingLevel === 'district' ? 11 : 13,
      });
    },
    [groupingLevel, issueCameraCommand]
  );

  const togglePopupCountFilter = (target: PopupListFilter) => {
    setPopupListFilter((prev) => (prev === target ? null : target));
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Header & Map Controls */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs font-medium text-slate-500">หน้า 3 · แผนที่สรุปจำนวนแต่ละเขตพื้นที่</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            แผนที่ปักหมุดธงสีแดงระบุจำนวนพื้นที่
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            ซูมเพื่อดูชื่อเขตเมืองและถนน กดที่ธงสีแดงเพื่อดูตัวเลขจำนวน แล้วกดที่ตัวเลขเพื่อดูรายชื่อสมาชิก
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Work Type Filter */}
          <div className="inline-flex items-center gap-1 rounded-lg bg-slate-200/70 p-1">
            <button
              type="button"
              onClick={() => {
                setFilterType('all');
                setSelectedKey(null);
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap cursor-pointer ${
                filterType === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ทั้งหมด ({records.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setFilterType('assembly');
                setSelectedKey(null);
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap cursor-pointer ${
                filterType === 'assembly'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              งานประกอบ
            </button>
            <button
              type="button"
              onClick={() => {
                setFilterType('sales');
                setSelectedKey(null);
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap cursor-pointer ${
                filterType === 'sales'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              งานขาย
            </button>
          </div>

          {/* Grouping Mode Switch: ตำบล / อำเภอ / จังหวัด */}
          <div className="inline-flex items-center gap-1 rounded-lg bg-slate-200/70 p-1">
            <button
              type="button"
              onClick={() => {
                setGroupingLevel('subdistrict');
                setSelectedKey(null);
              }}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium whitespace-nowrap cursor-pointer ${
                groupingLevel === 'subdistrict'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>ตามตำบล</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setGroupingLevel('district');
                setSelectedKey(null);
              }}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium whitespace-nowrap cursor-pointer ${
                groupingLevel === 'district'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>ตามอำเภอ</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setGroupingLevel('province');
                setSelectedKey(null);
              }}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium whitespace-nowrap cursor-pointer ${
                groupingLevel === 'province'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MapPin className="h-3.5 w-3.5" />
              <span>ตามจังหวัด</span>
            </button>
          </div>

          {/* Optional Engine Switch when Google Maps API Key is present */}
          {canUseGoogleMaps && (
            <div className="inline-flex items-center gap-1 rounded-lg bg-slate-200/70 p-1">
              <button
                type="button"
                onClick={() => setPreferredMode('normal')}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium whitespace-nowrap cursor-pointer ${
                  activeEngine === 'normal'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <MapIcon className="h-3.5 w-3.5" />
                <span>แผนที่ปกติ</span>
              </button>
              <button
                type="button"
                onClick={() => setPreferredMode('google')}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium whitespace-nowrap cursor-pointer ${
                  activeEngine === 'google'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <MapPin className="h-3.5 w-3.5" />
                <span>Google Maps</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main 2-Column Split: Map + Area Summary Ranking */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-stretch">
        {/* Map Viewport (8 cols) */}
        <div className="lg:col-span-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="relative h-[480px] w-full sm:h-[560px] lg:h-[640px]">
            {/* Icon-Based Map Type Selector (Google Maps Layers Icon + Visual Tile Popover) */}
            <div ref={mapTypePopoverRef} className="absolute left-3 top-3 z-[460]">
              <button
                type="button"
                onClick={() => setIsMapTypeMenuOpen((prev) => !prev)}
                aria-expanded={isMapTypeMenuOpen}
                aria-label="ประเภทแผนที่"
                title="ประเภทแผนที่"
                className={`flex h-11 w-11 items-center justify-center rounded-full border shadow-md backdrop-blur-xs transition-all cursor-pointer ${
                  isMapTypeMenuOpen
                    ? 'border-sky-600 bg-sky-50 text-sky-700 ring-2 ring-sky-600/20'
                    : 'border-slate-300/90 bg-white/95 text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Layers className="h-5 w-5" />
              </button>

              {isMapTypeMenuOpen && (
                <div
                  role="dialog"
                  aria-label="เลือกประเภทแผนที่"
                  className="mt-2 w-[280px] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:w-[304px]"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-slate-900">ประเภทแผนที่</h2>
                    <button
                      type="button"
                      onClick={() => setIsMapTypeMenuOpen(false)}
                      aria-label="ปิดเมนูประเภทแผนที่"
                      className="flex h-7 w-7 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-3">
                    {MAP_TYPE_OPTIONS.map((option) => {
                      const isActive = mapType === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => {
                            setMapType(option.id);
                            setIsMapTypeMenuOpen(false);
                          }}
                          aria-pressed={isActive}
                          className="group flex flex-col items-center gap-1.5 text-center cursor-pointer"
                        >
                          <div
                            className={`h-16 w-16 overflow-hidden rounded-2xl border-2 p-0.5 transition-all ${
                              isActive
                                ? 'border-sky-600 ring-2 ring-sky-600/25'
                                : 'border-transparent group-hover:border-slate-300'
                            }`}
                          >
                            <div className="h-full w-full overflow-hidden rounded-xl border border-slate-200/80">
                              <MapTypePreviewSvg type={option.id} />
                            </div>
                          </div>
                          <span
                            className={`text-xs whitespace-nowrap ${
                              isActive
                                ? 'font-semibold text-sky-700'
                                : 'font-medium text-slate-700 group-hover:text-slate-900'
                            }`}
                          >
                            {option.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Zoom & Navigation Control Stack (Top-Right) */}
            <div
              role="group"
              aria-label="ควบคุมการซูมและมุมมองแผนที่"
              className="absolute right-3 top-3 z-[450] flex flex-col gap-2"
            >
              <div className="flex flex-col overflow-hidden rounded-xl border border-slate-300/90 bg-white/95 shadow-md backdrop-blur-xs">
                <button
                  type="button"
                  onClick={() => issueCameraCommand({ type: 'zoomIn' })}
                  disabled={currentZoom >= MAX_ZOOM}
                  title="ซูมเข้า (ดูชื่อเขตเมือง)"
                  aria-label="ซูมเข้า"
                  className="flex h-10 w-10 items-center justify-center text-slate-700 transition-colors hover:bg-slate-100 active:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <div
                  title={`ระดับการซูมปัจจุบัน: ${currentZoom}`}
                  className="border-y border-slate-200 bg-slate-50/95 py-0.5 text-center font-mono text-[11px] font-semibold text-slate-600 tabular-nums select-none"
                >
                  {currentZoom}x
                </div>
                <button
                  type="button"
                  onClick={() => issueCameraCommand({ type: 'zoomOut' })}
                  disabled={currentZoom <= MIN_ZOOM}
                  title="ซูมออก"
                  aria-label="ซูมออก"
                  className="flex h-10 w-10 items-center justify-center text-slate-700 transition-colors hover:bg-slate-100 active:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
              </div>

              <div className="flex flex-col overflow-hidden rounded-xl border border-slate-300/90 bg-white/95 shadow-md backdrop-blur-xs">
                <button
                  type="button"
                  onClick={() => issueCameraCommand({ type: 'fitAll' })}
                  disabled={areaGroups.length === 0}
                  title="ปรับมุมมองให้เห็นหมุดทั้งหมด"
                  aria-label="ปรับมุมมองให้เห็นหมุดทั้งหมด"
                  className="flex h-10 w-10 items-center justify-center border-b border-slate-200 text-slate-700 transition-colors hover:bg-slate-100 active:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedKey(null);
                    issueCameraCommand({ type: 'reset' });
                  }}
                  title="รีเซ็ตมุมมองทั้งประเทศ"
                  aria-label="รีเซ็ตมุมมองทั้งประเทศ"
                  className="flex h-10 w-10 items-center justify-center text-slate-700 transition-colors hover:bg-slate-100 active:bg-slate-200 cursor-pointer"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
            </div>

            {activeEngine === 'normal' ? (
              <LeafletThailandMap
                areaGroups={areaGroups}
                selectedKey={selectedKey}
                onSelectGroup={(group) => {
                  setSelectedKey(group ? group.key : null);
                }}
                cameraCommand={cameraCommand}
                mapType={mapType}
                onZoomChange={setCurrentZoom}
              />
            ) : (
              <div className="relative h-full w-full">
                <APIProvider
                  key={apiKey}
                  apiKey={apiKey}
                  language="th"
                  region="TH"
                  libraries={MAP_LIBRARIES}
                  onError={handleMapLoadError}
                >
                  <MapLoadingStatusGuard onAuthOrLoadFailure={handleMapLoadError} />
                  <GoogleMap
                    mapId="DEMO_MAP_ID"
                    mapTypeId={mapType}
                    defaultCenter={THAILAND_CENTER}
                    defaultZoom={6}
                    minZoom={MIN_ZOOM}
                    maxZoom={MAX_ZOOM}
                    zoomControl={false}
                    mapTypeControl={false}
                    streetViewControl={false}
                    fullscreenControl={false}
                    gestureHandling="greedy"
                    internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                    onClick={() => setSelectedKey(null)}
                    onZoomChanged={(ev) => {
                      if (Number.isFinite(ev.detail.zoom)) {
                        setCurrentZoom(Math.round(ev.detail.zoom));
                      }
                    }}
                    className="h-full w-full"
                  >
                    <MapCameraController command={cameraCommand} areaGroups={areaGroups} />

                    <ClusteredAreaMarkers
                      areaGroups={areaGroups}
                      selectedKey={selectedKey}
                      onSelect={handleSelectFromMarker}
                    />
                  </GoogleMap>
                </APIProvider>

                {/* Simple Red Flag Legend Overlay */}
                <div className="pointer-events-none absolute bottom-3 left-3 z-[400] flex items-center gap-2 rounded-lg border border-slate-200 bg-white/95 px-3 py-1.5 text-[11px] font-medium text-slate-700 shadow-xs backdrop-blur-xs">
                  <span className="inline-block h-3 w-3 rounded-xs bg-red-600 ring-1 ring-white" />
                  <span>ธงแดง = จำนวนสมาชิกในพื้นที่ (กดที่ธงเพื่อดูรายชื่อ)</span>
                </div>
              </div>
            )}

            {/* Modern Interactive Flag Popup (Unified across Google Maps & Leaflet) */}
            {selectedGroup && (
              <div
                role="dialog"
                aria-label={`ข้อมูลสมาชิก ${selectedGroup.label}`}
                className="absolute bottom-3 left-3 right-3 z-[470] mx-auto max-w-md rounded-2xl border border-slate-200/95 bg-white/98 p-4 shadow-2xl backdrop-blur-md sm:bottom-4 sm:left-auto sm:right-3 sm:w-[376px]"
              >
                {/* Popup Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 ring-1 ring-red-200/80">
                      <Flag className="h-4 w-4 fill-red-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-bold text-slate-900">
                        {selectedGroup.label}
                      </h3>
                      <p className="truncate text-xs text-slate-500">{selectedGroup.subLabel}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedKey(null)}
                    aria-label="ปิดหน้าต่างข้อมูลพื้นที่"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Clickable Number Cards */}
                <div className="mt-3.5 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => togglePopupCountFilter('all')}
                    aria-pressed={popupListFilter === 'all'}
                    className={`group flex flex-col items-center rounded-xl border px-2 py-2.5 text-center transition-all cursor-pointer ${
                      popupListFilter === 'all'
                        ? 'border-red-600 bg-red-50/90 ring-2 ring-red-600/20'
                        : 'border-slate-200 bg-slate-50/70 hover:border-red-300 hover:bg-red-50/40'
                    }`}
                  >
                    <span className="text-[11px] font-medium text-slate-600">ทั้งหมด</span>
                    <span className="mt-0.5 font-mono text-2xl font-bold leading-tight text-red-600 tabular-nums">
                      {selectedGroup.totalCount}
                    </span>
                    <span className="mt-0.5 inline-flex items-center gap-0.5 text-[10px] font-medium text-red-700/80">
                      <span>{popupListFilter === 'all' ? 'ซ่อนรายชื่อ' : 'กดดูรายชื่อ'}</span>
                      {popupListFilter === 'all' ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={selectedGroup.assemblyCount === 0}
                    onClick={() => togglePopupCountFilter('assembly')}
                    aria-pressed={popupListFilter === 'assembly'}
                    className={`group flex flex-col items-center rounded-xl border px-2 py-2.5 text-center transition-all disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer ${
                      popupListFilter === 'assembly'
                        ? 'border-blue-600 bg-blue-50/90 ring-2 ring-blue-600/20'
                        : 'border-slate-200 bg-slate-50/70 hover:border-blue-300 hover:bg-blue-50/40'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600">
                      <Wrench className="h-3 w-3 text-blue-600" />
                      <span>ช่างประกอบ</span>
                    </span>
                    <span className="mt-0.5 font-mono text-2xl font-bold leading-tight text-blue-700 tabular-nums">
                      {selectedGroup.assemblyCount}
                    </span>
                    <span className="mt-0.5 inline-flex items-center gap-0.5 text-[10px] font-medium text-blue-700/80">
                      {selectedGroup.assemblyCount > 0 ? (
                        <>
                          <span>{popupListFilter === 'assembly' ? 'ซ่อนรายชื่อ' : 'กดดูรายชื่อ'}</span>
                          {popupListFilter === 'assembly' ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                        </>
                      ) : (
                        <span>ไม่มีข้อมูล</span>
                      )}
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={selectedGroup.salesCount === 0}
                    onClick={() => togglePopupCountFilter('sales')}
                    aria-pressed={popupListFilter === 'sales'}
                    className={`group flex flex-col items-center rounded-xl border px-2 py-2.5 text-center transition-all disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer ${
                      popupListFilter === 'sales'
                        ? 'border-emerald-600 bg-emerald-50/90 ring-2 ring-emerald-600/20'
                        : 'border-slate-200 bg-slate-50/70 hover:border-emerald-300 hover:bg-emerald-50/40'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600">
                      <ShoppingBag className="h-3 w-3 text-emerald-600" />
                      <span>งานขาย</span>
                    </span>
                    <span className="mt-0.5 font-mono text-2xl font-bold leading-tight text-emerald-700 tabular-nums">
                      {selectedGroup.salesCount}
                    </span>
                    <span className="mt-0.5 inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-700/80">
                      {selectedGroup.salesCount > 0 ? (
                        <>
                          <span>{popupListFilter === 'sales' ? 'ซ่อนรายชื่อ' : 'กดดูรายชื่อ'}</span>
                          {popupListFilter === 'sales' ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                        </>
                      ) : (
                        <span>ไม่มีข้อมูล</span>
                      )}
                    </span>
                  </button>
                </div>

                {/* Hint or Expandable Member List */}
                {popupListFilter === null ? (
                  <div className="mt-2.5 flex items-center justify-center gap-1.5 rounded-lg bg-slate-50 px-3 py-1.5 text-[11px] font-medium text-slate-600">
                    <Users className="h-3.5 w-3.5 text-slate-500" />
                    <span>กดที่ตัวเลขจำนวนด้านบนเพื่อดูรายชื่อสมาชิก</span>
                  </div>
                ) : (
                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/60">
                    <div className="flex items-center justify-between border-b border-slate-200/80 px-3 py-2">
                      <span className="text-xs font-semibold text-slate-800">
                        {popupListFilter === 'all'
                          ? `รายชื่อทั้งหมด (${popupVisibleRecords.length} คน)`
                          : popupListFilter === 'assembly'
                          ? `รายชื่อช่างประกอบ (${popupVisibleRecords.length} คน)`
                          : `รายชื่องานขาย (${popupVisibleRecords.length} คน)`}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPopupListFilter(null)}
                        className="text-[11px] font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
                      >
                        ย่อรายการ
                      </button>
                    </div>

                    <ul className="max-h-44 divide-y divide-slate-200/70 overflow-y-auto px-3 py-1">
                      {popupVisibleRecords.map((rec, idx) => (
                        <li
                          key={rec.id}
                          className="flex items-center justify-between gap-2.5 py-2 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                                {idx + 1}.
                              </span>
                              <span className="truncate font-semibold text-slate-900">
                                {rec.name}
                              </span>
                              <span
                                className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                  rec.workType === 'assembly'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {rec.workType === 'assembly' ? 'ประกอบ' : 'ขาย'}
                              </span>
                            </div>
                            <div className="mt-0.5 truncate pl-4 text-[11px] text-slate-500">
                              ต.{rec.subdistrict} อ.{rec.district} จ.{rec.province}
                            </div>
                          </div>

                          <div className="inline-flex shrink-0 items-center gap-1 font-mono text-[11px] font-medium text-slate-700 tabular-nums">
                            <Phone className="h-3 w-3 text-slate-400" />
                            <span>{rec.phone}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Area Count Breakdown Panel (4 cols) */}
        <aside className="lg:col-span-4 flex flex-col rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">
                สรุปจำนวนตามพื้นที่ ({areaGroups.length})
              </h2>
              <span className="font-mono text-xs font-medium text-slate-500 tabular-nums">
                รวม {filteredRecords.length} งาน
              </span>
            </div>
          </div>

          <div className="flex-1 divide-y divide-slate-100 overflow-y-auto max-h-[540px]">
            {areaGroups.length === 0 ? (
              <div className="px-5 py-12 text-center text-xs text-slate-500">
                ยังไม่มีข้อมูลพื้นที่สำหรับตัวกรองที่เลือก
              </div>
            ) : (
              areaGroups.map((group) => {
                const isSelected = selectedKey === group.key;
                return (
                  <button
                    key={group.key}
                    type="button"
                    onClick={() => handleSelectFromList(group)}
                    className={`w-full px-5 py-3.5 text-left transition-colors cursor-pointer ${
                      isSelected ? 'bg-red-50/70' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-900">
                          {group.label}
                        </div>
                        <div className="text-xs text-slate-500">{group.subLabel}</div>
                      </div>
                      <div className="shrink-0 text-right font-mono tabular-nums">
                        <div className="text-base font-bold text-red-600">
                          {group.totalCount}
                        </div>
                        <div className="text-[11px] text-slate-500">งาน</div>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center gap-4 text-xs font-mono tabular-nums">
                      <span className="inline-flex items-center gap-1 text-blue-700">
                        <Wrench className="h-3 w-3" />
                        <span>ประกอบ {group.assemblyCount}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 text-emerald-700">
                        <ShoppingBag className="h-3 w-3" />
                        <span>ขาย {group.salesCount}</span>
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
