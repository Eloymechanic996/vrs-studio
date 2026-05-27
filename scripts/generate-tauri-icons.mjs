// Generates the icon set Tauri expects from the existing brand SVG.
// Run: node scripts/generate-tauri-icons.mjs
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";
import pngToIco from "png-to-ico";
import { writeFileSync } from "node:fs";

const ROOT = resolve(process.cwd());
const SVG = readFileSync(resolve(ROOT, "public/icons/icon.svg"));
const OUT = resolve(ROOT, "src-tauri/icons");

async function main() {
  const sizes = [32, 128, 256];
  await Promise.all(
    sizes.map((s) =>
      sharp(SVG).resize(s, s).png().toFile(`${OUT}/${s}x${s}.png`),
    ),
  );
  // Tauri also expects 128x128@2x.png (256x256)
  await sharp(SVG).resize(256, 256).png().toFile(`${OUT}/128x128@2x.png`);
  // And the canonical icon.png (512)
  await sharp(SVG).resize(512, 512).png().toFile(`${OUT}/icon.png`);

  // Windows .ico — multi-resolution
  const icoBuffers = await Promise.all(
    [16, 32, 48, 64, 128, 256].map((s) =>
      sharp(SVG).resize(s, s).png().toBuffer(),
    ),
  );
  const ico = await pngToIco(icoBuffers);
  writeFileSync(`${OUT}/icon.ico`, ico);

  // For .icns (macOS) we ship a placeholder PNG; macOS bundling step in CI
  // converts it via `iconutil` automatically. Keeping a PNG here is fine
  // for non-macOS builds and a noop for Windows.
  await sharp(SVG).resize(1024, 1024).png().toFile(`${OUT}/icon.icns.png`);

  console.log("Tauri icons generated in", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
