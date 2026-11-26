import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
import {
  APIProvider,
  APILoadingStatus,
  Map as GoogleMap,
  AdvancedMarker,
  InfoWindow,
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
  Globe,
  Mountain,
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
type MarkerAnchor = ComponentProps<typeof InfoWindow>['anchor'];

const THAILAND_CENTER = { lat: 13.7563, lng: 100.5018 };
const MIN_ZOOM = 5;
const MAX_ZOOM = 17;
const MAP_LIBRARIES: string[] = ['marker'];

const MAP_TYPE_OPTIONS: {
  id: MapTypeOption;
  label: string;
  icon: typeof MapIcon;
}[] = [
  { id: 'roadmap', label: 'ถนน', icon: MapIcon },
  { id: 'satellite', label: 'ดาวเทียม', icon: Globe },
  { id: 'hybrid', label: 'ผสม', icon: Layers },
  { id: 'terrain', label: 'ภูมิประเทศ', icon: Mountain },
];

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
        map.setZoom(11);
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
      map.setZoom(command.zoom ?? 11);
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
  onSelect: (group: AreaGroup, markerEl: MarkerAnchor) => void;
  setMarkerRef: (marker: ClusterMarker | null, key: string, totalCount: number) => void;
}) {
  const [markerRef, marker] = useAdvancedMarkerRef();

  useEffect(() => {
    setMarkerRef(marker, group.key, group.totalCount);
    return () => {
      setMarkerRef(null, group.key, group.totalCount);
    };
  }, [marker, group.key, group.totalCount, setMarkerRef]);

  const dominantColor =
    group.assemblyCount > group.salesCount
      ? 'bg-blue-700 border-blue-200'
      : group.salesCount > group.assemblyCount
      ? 'bg-emerald-700 border-emerald-200'
      : 'bg-slate-900 border-slate-200';

  return (
    <AdvancedMarker
      ref={markerRef}
      position={{ lat: group.lat, lng: group.lng }}
      title={`${group.label} (${group.subLabel}) — ${group.totalCount} งาน`}
      onClick={() => onSelect(group, marker)}
      zIndex={isSelected ? 500 : group.totalCount}
    >
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-full border-2 font-mono text-xs font-bold text-white shadow-md tabular-nums cursor-pointer transition-transform duration-150 hover:scale-110 ${dominantColor} ${
          isSelected ? 'ring-4 ring-amber-400 scale-110' : ''
        }`}
      >
        {group.totalCount}
      </div>
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
  onSelect: (group: AreaGroup, markerEl: MarkerAnchor) => void;
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
          const size = totalCount >= 100 ? 48 : totalCount >= 20 ? 44 : 40;
          const badge = document.createElement('div');
          badge.className =
            'flex items-center justify-center rounded-full border-2 border-white bg-slate-900 font-mono text-xs font-bold text-white shadow-lg tabular-nums cursor-pointer ring-2 ring-slate-900/20';
          badge.style.width = `${size}px`;
          badge.style.height = `${size}px`;
          badge.textContent = String(totalCount);

          const clusterPin = new AdvancedMarkerElement({
            position,
            title: `รวม ${totalCount} งาน จาก ${count} พื้นที่ (คลิกเพื่อซูมดู)`,
            zIndex: 1000 + totalCount,
          });
          clusterPin.append(badge);
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
  const [activeMarker, setActiveMarker] = useState<MarkerAnchor>(null);
  const [mapLoadError, setMapLoadError] = useState(false);
  const [preferredMode, setPreferredMode] = useState<MapEngineMode>('google');
  const [mapType, setMapType] = useState<MapTypeOption>('roadmap');
  const [currentZoom, setCurrentZoom] = useState<number>(6);

  const handleMapLoadError = useCallback(() => {
    setMapLoadError(true);
  }, []);

  useEffect(() => {
    setMapLoadError(false);
  }, [apiKey]);

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

  const handleSelectFromMarker = useCallback(
    (group: AreaGroup, markerEl: MarkerAnchor) => {
      setSelectedKey(group.key);
      setActiveMarker(markerEl);
    },
    []
  );

  const handleSelectFromList = useCallback(
    (group: AreaGroup) => {
      setSelectedKey(group.key);
      setActiveMarker(null);
      issueCameraCommand({
        type: 'focus',
        lat: group.lat,
        lng: group.lng,
        zoom: groupingLevel === 'province' ? 8 : groupingLevel === 'district' ? 10 : 12,
      });
    },
    [groupingLevel, issueCameraCommand]
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Header & Map Controls */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs font-medium text-slate-500">หน้า 3 · แผนที่สรุปจำนวนแต่ละเขตพื้นที่</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            แผนที่ปักหมุดระบุจำนวนแต่ละพื้นที่
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            ตัวเลขบนหมุดแสดงจำนวนงานทั้งหมดในเขตพื้นที่นั้น คลิกหมุดหรือรายชื่อพื้นที่เพื่อดูรายละเอียด
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
                setActiveMarker(null);
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
                setActiveMarker(null);
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
                setActiveMarker(null);
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
          <div className="relative h-[460px] w-full sm:h-[540px] lg:h-[620px]">
            {/* Map Type Selector (Top-Left) */}
            <div
              role="group"
              aria-label="เลือกประเภทแผนที่"
              className="absolute left-3 top-3 z-[450] inline-flex max-w-[calc(100%-5.25rem)] flex-wrap items-center gap-0.5 rounded-lg border border-slate-300/90 bg-white/95 p-1 shadow-sm backdrop-blur-xs"
            >
              {MAP_TYPE_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isActive = mapType === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setMapType(option.id)}
                    aria-pressed={isActive}
                    className={`inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer sm:px-2.5 ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Zoom & Navigation Control Stack (Top-Right) */}
            <div
              role="group"
              aria-label="ควบคุมการซูมและมุมมองแผนที่"
              className="absolute right-3 top-3 z-[450] flex flex-col gap-2"
            >
              <div className="flex flex-col overflow-hidden rounded-lg border border-slate-300/90 bg-white/95 shadow-sm backdrop-blur-xs">
                <button
                  type="button"
                  onClick={() => issueCameraCommand({ type: 'zoomIn' })}
                  disabled={currentZoom >= MAX_ZOOM}
                  title="ซูมเข้า"
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

              <div className="flex flex-col overflow-hidden rounded-lg border border-slate-300/90 bg-white/95 shadow-sm backdrop-blur-xs">
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
                    setActiveMarker(null);
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
                  setActiveMarker(null);
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

                    {selectedGroup && (
                      <InfoWindow
                        anchor={activeMarker ?? undefined}
                        position={
                          activeMarker
                            ? undefined
                            : { lat: selectedGroup.lat, lng: selectedGroup.lng }
                        }
                        maxWidth={280}
                        onCloseClick={() => {
                          setSelectedKey(null);
                          setActiveMarker(null);
                        }}
                      >
                        <div className="p-1 text-slate-900">
                          <div className="text-sm font-bold">{selectedGroup.label}</div>
                          <div className="text-xs text-slate-500">{selectedGroup.subLabel}</div>

                          <div className="mt-2 flex items-center gap-3 border-y border-slate-200 py-1.5 font-mono text-xs tabular-nums">
                            <span className="font-bold text-slate-900">
                              รวม {selectedGroup.totalCount} งาน
                            </span>
                            <span className="text-blue-700">
                              ประกอบ {selectedGroup.assemblyCount}
                            </span>
                            <span className="text-emerald-700">
                              ขาย {selectedGroup.salesCount}
                            </span>
                          </div>

                          <ul className="mt-2 max-h-36 space-y-1.5 overflow-y-auto text-xs">
                            {selectedGroup.records.map((rec) => (
                              <li key={rec.id} className="flex items-center justify-between gap-2">
                                <span className="truncate font-medium text-slate-800">
                                  {rec.name}
                                </span>
                                <span className="shrink-0 font-mono text-[11px] text-slate-500 tabular-nums">
                                  {rec.phone}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </InfoWindow>
                    )}
                  </GoogleMap>
                </APIProvider>

                {/* Map Legend Overlay */}
                <div className="pointer-events-none absolute bottom-4 left-4 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs text-slate-700 shadow-sm backdrop-blur-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-blue-700" />
                    <span>งานประกอบสินค้าเด่น</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-700" />
                    <span>งานขายสินค้าเด่น</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-900" />
                    <span>จำนวนเท่ากัน</span>
                  </span>
                </div>
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
                      isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50'
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
                        <div className="text-base font-bold text-slate-900">
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
