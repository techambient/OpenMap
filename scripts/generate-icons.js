import fs from 'fs';
import zlib from 'zlib';

function createSolidPNG(width, height, r, g, b, a = 255) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth: 8
  ihdr[9] = 6; // Color type: RGBA (6)
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);

  // Raw image data with filter type 0 for each scanline
  const rowLength = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowLength);
  
  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowLength;
    rawData[rowOffset] = 0; // None filter
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      // Slight gradient
      const factor = 1 - (y / height) * 0.3;
      rawData[pixelOffset] = Math.round(r * factor);
      rawData[pixelOffset + 1] = Math.round(g * factor);
      rawData[pixelOffset + 2] = Math.round(b * factor);
      rawData[pixelOffset + 3] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const length = data.length;
  const chunk = Buffer.alloc(4 + 4 + length + 4);
  chunk.writeUInt32BE(length, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);

  const crcData = Buffer.alloc(4 + length);
  chunk.copy(crcData, 0, 4, 8 + length);
  const crc = crc32(crcData);
  chunk.writeUInt32BE(crc, 8 + length);

  return chunk;
}

// Standard CRC32 table
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) {
      c = 0xedb88320 ^ (c >>> 1);
    } else {
      c = c >>> 1;
    }
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

// Generate icons in dark atmospheric slate blue (#0f172a / #0284c7)
const icon192 = createSolidPNG(192, 192, 14, 116, 144);
const icon512 = createSolidPNG(512, 512, 15, 23, 42);
const appleIcon = createSolidPNG(180, 180, 2, 132, 199);

fs.writeFileSync('public/pwa-192x192.png', icon192);
fs.writeFileSync('public/pwa-512x512.png', icon512);
fs.writeFileSync('public/pwa-maskable-512x512.png', icon512);
fs.writeFileSync('public/apple-touch-icon.png', appleIcon);
console.log('Successfully generated PWA and Apple Touch PNG icons.');
