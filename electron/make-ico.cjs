/**
 * make-ico.cjs — PNG → ICO converter for electron-builder
 * Used by GitHub Actions to generate assets/icon.ico before NSIS build.
 */
const pngToIco = require('png-to-ico');
const fs = require('fs');
const path = require('path');

const input = path.join(__dirname, 'assets', 'icon.png');
const output = path.join(__dirname, 'assets', 'icon.ico');

const convert = typeof pngToIco === 'function' ? pngToIco : pngToIco.default;

convert(input)
  .then(buf => {
    fs.writeFileSync(output, buf);
    console.log('ICO created:', output, buf.length, 'bytes');
  })
  .catch(() => {
    // Fallback: embed PNG inside valid ICO container
    const pngBuf = fs.readFileSync(input);
    const ico = Buffer.alloc(6 + 16 + pngBuf.length);
    ico.writeUInt16LE(0, 0);
    ico.writeUInt16LE(1, 2);
    ico.writeUInt16LE(1, 4);
    ico.writeUInt8(0, 6); ico.writeUInt8(0, 7); ico.writeUInt8(0, 8); ico.writeUInt8(0, 9);
    ico.writeUInt16LE(1, 10); ico.writeUInt16LE(32, 12);
    ico.writeUInt32LE(pngBuf.length, 14);
    ico.writeUInt32LE(22, 18);
    pngBuf.copy(ico, 22);
    fs.writeFileSync(output, ico);
    console.log('Minimal ICO created:', output, ico.length, 'bytes');
  });
