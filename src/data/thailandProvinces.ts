export interface ProvinceCoord {
  name: string;
  lat: number;
  lng: number;
}

export const THAILAND_PROVINCES: ProvinceCoord[] = [
  { name: 'กรุงเทพมหานคร', lat: 13.7563, lng: 100.5018 },
  { name: 'สมุทรปราการ', lat: 13.5991, lng: 100.5998 },
  { name: 'นนทบุรี', lat: 13.8621, lng: 100.5144 },
  { name: 'ปทุมธานี', lat: 14.0208, lng: 100.525 },
  { name: 'พระนครศรีอยุธยา', lat: 14.3532, lng: 100.5689 },
  { name: 'อ่างทอง', lat: 14.5896, lng: 100.4551 },
  { name: 'ลพบุรี', lat: 14.7995, lng: 100.6534 },
  { name: 'สิงห์บุรี', lat: 14.8936, lng: 100.3967 },
  { name: 'ชัยนาท', lat: 15.1852, lng: 100.1251 },
  { name: 'สระบุรี', lat: 14.5289, lng: 100.9101 },
  { name: 'ชลบุรี', lat: 13.3611, lng: 100.9847 },
  { name: 'ระยอง', lat: 12.6814, lng: 101.2816 },
  { name: 'จันทบุรี', lat: 12.6114, lng: 102.1039 },
  { name: 'ตราด', lat: 12.2428, lng: 102.5175 },
  { name: 'ฉะเชิงเทรา', lat: 13.6904, lng: 101.0779 },
  { name: 'ปราจีนบุรี', lat: 14.0509, lng: 101.3727 },
  { name: 'นครนายก', lat: 14.2069, lng: 101.213 },
  { name: 'สระแก้ว', lat: 13.824, lng: 102.0646 },
  { name: 'นครราชสีมา', lat: 14.9799, lng: 102.0978 },
  { name: 'บุรีรัมย์', lat: 14.993, lng: 103.1029 },
  { name: 'สุรินทร์', lat: 14.8818, lng: 103.4936 },
  { name: 'ศรีสะเกษ', lat: 15.1186, lng: 104.322 },
  { name: 'อุบลราชธานี', lat: 15.2287, lng: 104.8564 },
  { name: 'ยโสธร', lat: 15.7926, lng: 104.1453 },
  { name: 'ชัยภูมิ', lat: 15.8068, lng: 102.0315 },
  { name: 'อำนาจเจริญ', lat: 15.8657, lng: 104.6258 },
  { name: 'บึงกาฬ', lat: 18.3609, lng: 103.6464 },
  { name: 'หนองบัวลำภู', lat: 17.2218, lng: 102.426 },
  { name: 'ขอนแก่น', lat: 16.4322, lng: 102.8236 },
  { name: 'อุดรธานี', lat: 17.4156, lng: 102.7872 },
  { name: 'เลย', lat: 17.486, lng: 101.7223 },
  { name: 'หนองคาย', lat: 17.8783, lng: 102.7413 },
  { name: 'มหาสารคาม', lat: 16.1851, lng: 103.3026 },
  { name: 'ร้อยเอ็ด', lat: 16.0538, lng: 103.652 },
  { name: 'กาฬสินธุ์', lat: 16.4314, lng: 103.5059 },
  { name: 'สกลนคร', lat: 17.1546, lng: 104.1348 },
  { name: 'นครพนม', lat: 17.392, lng: 104.7696 },
  { name: 'มุกดาหาร', lat: 16.5453, lng: 104.7235 },
  { name: 'เชียงใหม่', lat: 18.7883, lng: 98.9853 },
  { name: 'ลำพูน', lat: 18.5745, lng: 99.0087 },
  { name: 'ลำปาง', lat: 18.2888, lng: 99.4908 },
  { name: 'อุตรดิตถ์', lat: 17.6201, lng: 100.0993 },
  { name: 'แพร่', lat: 18.1446, lng: 100.1403 },
  { name: 'น่าน', lat: 18.7756, lng: 100.773 },
  { name: 'พะเยา', lat: 19.1665, lng: 99.9019 },
  { name: 'เชียงราย', lat: 19.9105, lng: 99.8406 },
  { name: 'แม่ฮ่องสอน', lat: 19.302, lng: 97.9654 },
  { name: 'นครสวรรค์', lat: 15.7047, lng: 100.1372 },
  { name: 'อุทัยธานี', lat: 15.3835, lng: 100.0246 },
  { name: 'กำแพงเพชร', lat: 16.4828, lng: 99.5227 },
  { name: 'ตาก', lat: 16.884, lng: 99.1258 },
  { name: 'สุโขทัย', lat: 17.0056, lng: 99.8264 },
  { name: 'พิษณุโลก', lat: 16.8211, lng: 100.2659 },
  { name: 'พิจิตร', lat: 16.4429, lng: 100.3482 },
  { name: 'เพชรบูรณ์', lat: 16.419, lng: 101.1592 },
  { name: 'ราชบุรี', lat: 13.5283, lng: 99.8134 },
  { name: 'กาญจนบุรี', lat: 14.0228, lng: 99.5328 },
  { name: 'สุพรรณบุรี', lat: 14.4745, lng: 100.1177 },
  { name: 'นครปฐม', lat: 13.8199, lng: 100.0622 },
  { name: 'สมุทรสาคร', lat: 13.5475, lng: 100.2744 },
  { name: 'สมุทรสงคราม', lat: 13.4098, lng: 100.0023 },
  { name: 'เพชรบุรี', lat: 13.1119, lng: 99.9398 },
  { name: 'ประจวบคีรีขันธ์', lat: 11.8124, lng: 99.7973 },
  { name: 'นครศรีธรรมราช', lat: 8.4304, lng: 99.9631 },
  { name: 'กระบี่', lat: 8.0863, lng: 98.9063 },
  { name: 'พังงา', lat: 8.4501, lng: 98.5255 },
  { name: 'ภูเก็ต', lat: 7.8804, lng: 98.3923 },
  { name: 'สุราษฎร์ธานี', lat: 9.1382, lng: 99.3217 },
  { name: 'ระนอง', lat: 9.9529, lng: 98.6085 },
  { name: 'ชุมพร', lat: 10.493, lng: 99.1801 },
  { name: 'สงขลา', lat: 7.1756, lng: 100.6143 },
  { name: 'สตูล', lat: 6.6238, lng: 100.0674 },
  { name: 'ตรัง', lat: 7.5563, lng: 99.6114 },
  { name: 'พัทลุง', lat: 7.6167, lng: 100.074 },
  { name: 'ปัตตานี', lat: 6.8695, lng: 101.2505 },
  { name: 'ยะลา', lat: 6.5411, lng: 101.2804 },
  { name: 'นราธิวาส', lat: 6.4255, lng: 101.8253 },
];

function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function normalizeProvinceName(raw: string): string {
  const cleaned = raw.trim().replace(/^(จังหวัด|จ\.)\s*/g, '');
  if (cleaned === 'กทม' || cleaned === 'กทม.' || cleaned === 'กรุงเทพ' || cleaned === 'กรุงเทพฯ') {
    return 'กรุงเทพมหานคร';
  }
  return cleaned;
}

export function resolveThailandCoords(
  subdistrict: string,
  district: string,
  province: string
): { lat: number; lng: number } {
  const normalizedProv = normalizeProvinceName(province);
  const exact = THAILAND_PROVINCES.find((p) => p.name === normalizedProv);
  const partial =
    exact ??
    THAILAND_PROVINCES.find(
      (p) => p.name.includes(normalizedProv) || normalizedProv.includes(p.name)
    );

  const base = partial ?? { lat: 13.7563, lng: 100.5018 };

  const areaKey = `${subdistrict.trim()}|${district.trim()}|${normalizedProv}`;
  if (!subdistrict.trim() && !district.trim()) {
    return { lat: base.lat, lng: base.lng };
  }

  // Deterministic offset within ~5-10km radius of the province center so distinct subdistricts/districts spread cleanly
  const h1 = hashString(areaKey);
  const h2 = hashString(`${areaKey}:lng`);
  const latOffset = ((h1 % 1000) / 1000 - 0.5) * 0.14;
  const lngOffset = ((h2 % 1000) / 1000 - 0.5) * 0.14;

  return {
    lat: Number((base.lat + latOffset).toFixed(6)),
    lng: Number((base.lng + lngOffset).toFixed(6)),
  };
}
