import { useCallback, useEffect, useMemo, useState, type ComponentProps } from 'react';
import {
  APIProvider,
  Map as GoogleMap,
  AdvancedMarker,
  InfoWindow,
  useMap,
} from '@vis.gl/react-google-maps';
import { MapPin, Layers, Wrench, ShoppingBag } from 'lucide-react';
import type { AreaGroup, TeamRecord, WorkType } from '../types.ts';
import { THAILAND_PROVINCES, normalizeProvinceName } from '../data/thailandProvinces.ts';

interface SummaryMapPageProps {
  records: TeamRecord[];
  apiKey: string;
}

type GroupingLevel = 'area' | 'province';
type MarkerAnchor = ComponentProps<typeof InfoWindow>['anchor'];

const THAILAND_CENTER = { lat: 13.7563, lng: 100.5018 };

function MapCameraController({ target }: { target: { lat: number; lng: number; zoom: number } | null }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !target) return;
    map.panTo({ lat: target.lat, lng: target.lng });
    map.setZoom(target.zoom);
  }, [map, target]);

  return null;
}

function AreaPinMarker({
  group,
  isSelected,
  onSelect,
}: {
  group: AreaGroup;
  isSelected: boolean;
  onSelect: (group: AreaGroup, markerEl: MarkerAnchor) => void;
}) {
  const [markerInstance, setMarkerInstance] = useState<MarkerAnchor>(null);

  const refCallback = useCallback((m: MarkerAnchor) => {
    setMarkerInstance(m);
  }, []);

  const dominantColor =
    group.assemblyCount > group.salesCount
      ? 'bg-blue-700 border-blue-200'
      : group.salesCount > group.assemblyCount
      ? 'bg-emerald-700 border-emerald-200'
      : 'bg-slate-900 border-slate-200';

  return (
    <AdvancedMarker
      ref={refCallback}
      position={{ lat: group.lat, lng: group.lng }}
      title={`${group.label} — ${group.totalCount} รายการ`}
      onClick={() => onSelect(group, markerInstance)}
      zIndex={isSelected ? 50 : group.totalCount}
    >
      <div className="flex flex-col items-center cursor-pointer transition-transform duration-150 hover:scale-110">
        <div
          className={`flex h-9 min-w-9 items-center justify-center rounded-full border-2 px-2 font-mono text-xs font-bold text-white shadow-md tabular-nums ${dominantColor} ${
            isSelected ? 'ring-4 ring-amber-400/70 scale-110' : ''
          }`}
        >
          {group.totalCount}
        </div>
        <div className="mt-0.5 max-w-[140px] truncate rounded bg-white/95 px-1.5 py-0.5 text-[10px] font-medium text-slate-800 shadow-xs border border-slate-200">
          {group.label}
        </div>
      </div>
    </AdvancedMarker>
  );
}

export function SummaryMapPage({ records, apiKey }: SummaryMapPageProps) {
  const [filterType, setFilterType] = useState<'all' | WorkType>('all');
  const [groupingLevel, setGroupingLevel] = useState<GroupingLevel>('area');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [activeMarker, setActiveMarker] = useState<MarkerAnchor>(null);
  const [cameraTarget, setCameraTarget] = useState<{
    lat: number;
    lng: number;
    zoom: number;
  } | null>(null);

  const filteredRecords = useMemo(() => {
    if (filterType === 'all') return records;
    return records.filter((r) => r.workType === filterType);
  }, [records, filterType]);

  const areaGroups = useMemo<AreaGroup[]>(() => {
    const groups: Record<string, AreaGroup> = {};

    for (const rec of filteredRecords) {
      const normProv = normalizeProvinceName(rec.province);
      const key =
        groupingLevel === 'province'
          ? normProv
          : `${rec.subdistrict.trim()}|${rec.district.trim()}|${normProv}`;

      if (!groups[key]) {
        const provMatch = THAILAND_PROVINCES.find((p) => p.name === normProv);
        const lat = groupingLevel === 'province' && provMatch ? provMatch.lat : rec.lat;
        const lng = groupingLevel === 'province' && provMatch ? provMatch.lng : rec.lng;

        groups[key] = {
          key,
          label:
            groupingLevel === 'province'
              ? normProv
              : `ต.${rec.subdistrict} อ.${rec.district}`,
          subLabel: groupingLevel === 'province' ? 'สรุประดับจังหวัด' : `จ.${normProv}`,
          province: normProv,
          district: groupingLevel === 'area' ? rec.district : undefined,
          subdistrict: groupingLevel === 'area' ? rec.subdistrict : undefined,
          lat,
          lng,
          totalCount: 0,
          assemblyCount: 0,
          salesCount: 0,
          records: [],
        };
      }

      groups[key].totalCount += 1;
      if (rec.workType === 'assembly') {
        groups[key].assemblyCount += 1;
      } else {
        groups[key].salesCount += 1;
      }
      groups[key].records.push(rec);
    }

    return Object.values(groups).sort((a, b) => b.totalCount - a.totalCount);
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

  const handleSelectFromList = useCallback((group: AreaGroup) => {
    setSelectedKey(group.key);
    setActiveMarker(null);
    setCameraTarget({
      lat: group.lat,
      lng: group.lng,
      zoom: groupingLevel === 'province' ? 9 : 12,
    });
  }, [groupingLevel]);

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

        <div className="flex flex-wrap items-center gap-3">
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

          {/* Grouping Mode Switch */}
          <div className="inline-flex items-center gap-1 rounded-lg bg-slate-200/70 p-1">
            <button
              type="button"
              onClick={() => {
                setGroupingLevel('area');
                setSelectedKey(null);
                setActiveMarker(null);
              }}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap cursor-pointer ${
                groupingLevel === 'area'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>ตามตำบล / อำเภอ</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setGroupingLevel('province');
                setSelectedKey(null);
                setActiveMarker(null);
              }}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap cursor-pointer ${
                groupingLevel === 'province'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MapPin className="h-3.5 w-3.5" />
              <span>ตามจังหวัด</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main 2-Column Split: Map + Area Summary Ranking */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-stretch">
        {/* Google Map Viewport (8 cols) */}
        <div className="lg:col-span-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          {!apiKey ? (
            <div className="flex h-[540px] flex-col items-center justify-center bg-slate-50 p-6 text-center">
              <MapPin className="h-10 w-10 text-slate-400" />
              <p className="mt-3 text-sm font-semibold text-slate-800">
                กำลังรอ Google Maps API Key
              </p>
              <p className="mt-1 max-w-md text-xs text-slate-500">
                กรุณารอสักครู่หรือรีเฟรชหน้าเว็บหลังจากตั้งค่า Google Maps Platform เสร็จสิ้น
              </p>
            </div>
          ) : (
            <div className="relative h-[540px] w-full lg:h-[620px]">
              <APIProvider apiKey={apiKey} language="th" region="TH" libraries={['marker']}>
                <GoogleMap
                  mapId="DEMO_MAP_ID"
                  defaultCenter={THAILAND_CENTER}
                  defaultZoom={6}
                  gestureHandling="greedy"
                  internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                  className="h-full w-full"
                >
                  <MapCameraController target={cameraTarget} />

                  {areaGroups.map((group) => (
                    <AreaPinMarker
                      key={group.key}
                      group={group}
                      isSelected={selectedKey === group.key}
                      onSelect={handleSelectFromMarker}
                    />
                  ))}

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
