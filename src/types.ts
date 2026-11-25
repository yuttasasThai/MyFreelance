export type WorkType = 'assembly' | 'sales';

export interface TeamRecord {
  id: string;
  workType: WorkType;
  name: string;
  phone: string;
  subdistrict: string; // ตำบล / แขวง
  district: string;    // อำเภอ / เขต
  province: string;    // จังหวัด
  lat: number;
  lng: number;
  createdAt: string;
}

export interface CreateTeamRecordInput {
  workType: WorkType;
  name: string;
  phone: string;
  subdistrict: string;
  district: string;
  province: string;
}

export interface AreaGroup {
  key: string;
  label: string;
  subLabel: string;
  province: string;
  district?: string;
  subdistrict?: string;
  lat: number;
  lng: number;
  totalCount: number;
  assemblyCount: number;
  salesCount: number;
  records: TeamRecord[];
}

export type AppPage = 'home' | 'database' | 'map';

export type StorageMode = 'redis-cloud' | 'local-disk' | 'vercel-tmp';
