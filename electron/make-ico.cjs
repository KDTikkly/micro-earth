const pngToIco = require('png-to-ico');
const fs = require('fs');
const path = require('path');

const input = path.join(__dirname, 'assets', 'icon.png');
const output = path.join(__dirname, 'assets', 'icon.ico');

// png-to-ico may be a default export wrapped
const convert = typeof pngToIco === 'function' ? pngToIco : pngToIco.default;

convert(input)
  .then(buf => {
    fs.writeFileSync(output, buf);
    console.log('ICO created:', output, buf.length, 'bytes');
  })
  .catch(e => {
    // Fallback: build a minimal valid ICO manually from PNG bytes
    console.log('png-to-ico failed:', e.message, '— building minimal ICO manually');
    const pngBuf = fs.readFileSync(input);
    // ICO format: ICONDIR (6 bytes) + ICONDIRENTRY (16 bytes) + PNG data
    const ico = Buffer.alloc(6 + 16 + pngBuf.length);
    ico.writeUInt16LE(0, 0);   // reserved
    ico.writeUInt16LE(1, 2);   // type: 1 = icon
    ico.writeUInt16LE(1, 4);   // count: 1 image
    // ICONDIRENTRY
    ico.writeUInt8(0, 6);      // width (0 = 256)
    ico.writeUInt8(0, 7);      // height (0 = 256)
    ico.writeUInt8(0, 8);      // color count
    ico.writeUInt8(0, 9);      // reserved
    ico.writeUInt16LE(1, 10);  // planes
    ico.writeUInt16LE(32, 12); // bit count
    ico.writeUInt32LE(pngBuf.length, 14); // size of image data
    ico.writeUInt32LE(22, 18); // offset of image data (6+16=22)
    pngBuf.copy(ico, 22);
    fs.writeFileSync(output, ico);
    console.log('Minimal ICO created:', output, ico.length, 'bytes');
  });
