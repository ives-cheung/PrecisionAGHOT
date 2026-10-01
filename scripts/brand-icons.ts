// Reproducible PrecisionAGHOT field-row mark; no upstream logo assets are used.
// Run with Node 24: node scripts/brand-icons.ts
import { writeFileSync } from "node:fs";
import sharp from "sharp";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="116" fill="#171717"/><g fill="none" stroke="#ffffff" stroke-width="38" stroke-linecap="round"><path d="M94 368C211 368 175 146 306 146M174 417C306 417 260 228 417 228M78 260C160 260 136 89 230 89"/></g><circle cx="402" cy="103" r="39" fill="#ffffff"/></svg>`;
writeFileSync("industry/brand/logo.svg", `${svg}\n`);
for (const [name, size] of [["icon.png", 512], ["icon-192.png", 192], ["apple-icon.png", 180]] as const) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(`industry/brand/${name}`);
}
const png = await sharp(Buffer.from(svg)).resize(32, 32).png().toBuffer();
const header = Buffer.alloc(22);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(1, 4);
header[6] = header[7] = 32;
header.writeUInt16LE(1, 10);
header.writeUInt16LE(32, 12);
header.writeUInt32LE(png.length, 14);
header.writeUInt32LE(22, 18);
writeFileSync("industry/brand/favicon.ico", Buffer.concat([header, png]));
console.log("PrecisionAGHOT brand icons generated.");
