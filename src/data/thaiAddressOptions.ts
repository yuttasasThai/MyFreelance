import rawDb from 'thai-address-database/database/db.json';

export interface ThaiAddressEntry {
  subdistrict: string;
  district: string;
  province: string;
}

export interface AddressComboOption {
  value: string;
  subtitle?: string;
  province?: string;
  district?: string;
  subdistrict?: string;
}

interface RawCompactDb {
  lookup?: string;
  words?: string;
  data: unknown[];
}

function decodeThaiAddressDb(): ThaiAddressEntry[] {
  const db = rawDb as RawCompactDb;
  const lookup = db.lookup ? db.lookup.split('|') : [];
  const words = db.words ? db.words.split('|') : [];
  const useLookup = Boolean(db.lookup && db.words);

  const decodeToken = (token: unknown): string => {
    if (!useLookup) return String(token ?? '');
    let text = typeof token === 'number' ? (lookup[token] ?? '') : String(token ?? '');
    return text.replace(/[A-Z]/gi, (match) => {
      const code = match.charCodeAt(0);
      return words[code < 97 ? code - 65 : 26 + code - 97] ?? match;
    });
  };

  const entries: ThaiAddressEntry[] = [];
  const seen = new Set<string>();

  for (const provRow of db.data) {
    if (!Array.isArray(provRow)) continue;
    const provinceName = decodeToken(provRow[0]).trim();
    const nestedIdx = provRow.length === 3 ? 2 : 1;
    const amphoeList = provRow[nestedIdx];
    if (!Array.isArray(amphoeList)) continue;

    for (const amphoeRow of amphoeList) {
      if (!Array.isArray(amphoeRow)) continue;
      const districtName = decodeToken(amphoeRow[0]).trim();
      const subdistrictList = amphoeRow[nestedIdx];
      if (!Array.isArray(subdistrictList)) continue;

      for (const subRow of subdistrictList) {
        if (!Array.isArray(subRow)) continue;
        const subdistrictName = decodeToken(subRow[0]).trim();
        if (!subdistrictName || !districtName || !provinceName) continue;

        const key = `${subdistrictName}|${districtName}|${provinceName}`;
        if (seen.has(key)) continue;
        seen.add(key);

        entries.push({
          subdistrict: subdistrictName,
          district: districtName,
          province: provinceName,
        });
      }
    }
  }

  return entries;
}

const ALL_THAI_ADDRESSES = decodeThaiAddressDb();

export const ALL_PROVINCE_NAMES: string[] = Array.from(
  new Set(ALL_THAI_ADDRESSES.map((e) => e.province))
).sort((a, b) => a.localeCompare(b, 'th'));

function normalizeQuery(text: string): string {
  return text.trim().replace(/^(ต\.|ตำบล|แขวง|อ\.|อำเภอ|เขต|จ\.|จังหวัด)\s*/g, '').toLowerCase();
}

export function filterProvinceOptions(query: string, limit = 80): AddressComboOption[] {
  const q = normalizeQuery(query);
  const matched = q
    ? ALL_PROVINCE_NAMES.filter((p) => p.toLowerCase().includes(q))
    : ALL_PROVINCE_NAMES;

  // Prioritize prefix matches first
  const sorted = q
    ? [...matched].sort((a, b) => {
        const aStarts = a.toLowerCase().startsWith(q) ? 0 : 1;
        const bStarts = b.toLowerCase().startsWith(q) ? 0 : 1;
        return aStarts - bStarts || a.localeCompare(b, 'th');
      })
    : matched;

  return sorted.slice(0, limit).map((name) => ({
    value: name,
    province: name,
  }));
}

export function filterDistrictOptions(
  provinceInput: string,
  query: string,
  limit = 80
): AddressComboOption[] {
  const provClean = normalizeQuery(provinceInput);
  const q = normalizeQuery(query);

  const seen = new Set<string>();
  const results: AddressComboOption[] = [];

  for (const entry of ALL_THAI_ADDRESSES) {
    if (provClean && !entry.province.toLowerCase().includes(provClean)) {
      continue;
    }
    if (q && !entry.district.toLowerCase().includes(q)) {
      continue;
    }

    const key = `${entry.district}|${entry.province}`;
    if (seen.has(key)) continue;
    seen.add(key);

    results.push({
      value: entry.district,
      subtitle: provClean ? undefined : `จ.${entry.province}`,
      district: entry.district,
      province: entry.province,
    });
  }

  results.sort((a, b) => {
    if (q) {
      const aStarts = a.value.toLowerCase().startsWith(q) ? 0 : 1;
      const bStarts = b.value.toLowerCase().startsWith(q) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
    }
    return a.value.localeCompare(b.value, 'th');
  });

  return results.slice(0, limit);
}

export function filterSubdistrictOptions(
  provinceInput: string,
  districtInput: string,
  query: string,
  limit = 80
): AddressComboOption[] {
  const provClean = normalizeQuery(provinceInput);
  const distClean = normalizeQuery(districtInput);
  const q = normalizeQuery(query);

  const seen = new Set<string>();
  const results: AddressComboOption[] = [];

  for (const entry of ALL_THAI_ADDRESSES) {
    if (provClean && !entry.province.toLowerCase().includes(provClean)) {
      continue;
    }
    if (distClean && !entry.district.toLowerCase().includes(distClean)) {
      continue;
    }
    if (q && !entry.subdistrict.toLowerCase().includes(q)) {
      continue;
    }

    const key = `${entry.subdistrict}|${entry.district}|${entry.province}`;
    if (seen.has(key)) continue;
    seen.add(key);

    results.push({
      value: entry.subdistrict,
      subtitle:
        distClean && provClean
          ? undefined
          : distClean
          ? `จ.${entry.province}`
          : `อ.${entry.district} · จ.${entry.province}`,
      subdistrict: entry.subdistrict,
      district: entry.district,
      province: entry.province,
    });
  }

  results.sort((a, b) => {
    if (q) {
      const aStarts = a.value.toLowerCase().startsWith(q) ? 0 : 1;
      const bStarts = b.value.toLowerCase().startsWith(q) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
    }
    return a.value.localeCompare(b.value, 'th');
  });

  return results.slice(0, limit);
}
