// 화면 촬영이 함께 쓰는 PNG 풀기 · 만들기. shoot.mjs(두 번 찍은 그림이 다를 때 점 비교)와 compare.mjs(전후 비교)가 쓴다.
// Node 기본 기능(zlib)만 쓴다. 크롬이 만드는 8비트 RGB · RGBA PNG만 푼다(겹쳐 쓰기(interlace) · 색 목록 PNG는 모른다).
import { crc32, deflateSync, inflateSync } from 'node:zlib';

// PNG Buffer → { w, h, bpp(점 하나의 바이트 수 3 · 4), rows(줄마다 Buffer) }
export function decodePng(buf) {
  let i = 8, w = 0, h = 0, bpp = 0;
  const idat = [];
  while (i < buf.length) {
    const n = buf.readUInt32BE(i), type = buf.toString('latin1', i + 4, i + 8), c = buf.subarray(i + 8, i + 8 + n);
    if (type === 'IHDR') {
      w = c.readUInt32BE(0); h = c.readUInt32BE(4);
      bpp = { 2: 3, 6: 4 }[c[9]];
      if (c[8] !== 8 || !bpp || c[12]) throw new Error('모르는 PNG 형식');
    } else if (type === 'IDAT') idat.push(c);
    i += 12 + n;
  }
  const raw = inflateSync(Buffer.concat(idat)), stride = w * bpp, rows = [];
  let prev = Buffer.alloc(stride);
  for (let y = 0, p = 0; y < h; y++, p += stride + 1) {
    const f = raw[p], line = Buffer.from(raw.subarray(p + 1, p + 1 + stride));
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? line[x - bpp] : 0, b = prev[x], c = x >= bpp ? prev[x - bpp] : 0;
      const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
      line[x] = (line[x] + [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][f]) & 255;
    }
    rows.push(line); prev = line;
  }
  return { w, h, bpp, rows };
}

// RGB 점 배열(w × h × 3 바이트) → PNG Buffer (8비트 RGB, 줄마다 거르기 없음)
export function encodePng(w, h, rgb) {
  const chunk = (type, data) => {
    const len = Buffer.alloc(4), crc = Buffer.alloc(4), body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
    len.writeUInt32BE(data.length); crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2;   // 8비트 · RGB (압축 · 거르기 · 겹쳐 쓰기는 0)
  const stride = w * 3, raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) rgb.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 6 })), chunk('IEND', Buffer.alloc(0))]);
}
