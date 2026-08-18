import { Buffer } from "node:buffer";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { stdout } from "node:process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(repositoryRoot, "brand", "source", "docfilly-icon.svg");
const configPath = path.join(repositoryRoot, "brand", "icon-generation.json");
const outputDirectory = path.join(repositoryRoot, "apps", "web", "public", "icons");

const pngOutputs = [
  ["favicon-32x32.png", 32],
  ["apple-touch-icon.png", 180],
  ["icon-192.png", 192],
  ["icon-512.png", 512],
];

const config = JSON.parse(await readFile(configPath, "utf8"));
const sourceSvg = await readFile(source, "utf8");
const generatedSvg = applyTrim(sourceSvg, config.trim);

await mkdir(outputDirectory, { recursive: true });
await writeFile(path.join(outputDirectory, "favicon.svg"), generatedSvg);

await Promise.all(
  pngOutputs.map(([fileName, size]) =>
    sharp(Buffer.from(generatedSvg), { density: 384 })
      .resize(size, size)
      .png({ compressionLevel: 9 })
      .toFile(path.join(outputDirectory, fileName)),
  ),
);

stdout.write(`Generated ${pngOutputs.length + 1} icon files in ${outputDirectory}\n`);

/**
 * Adjusts an SVG viewBox to remove a configurable amount from each edge.
 * Trim values use the coordinate system declared by the source SVG viewBox.
 */
function applyTrim(svg, trim) {
  const viewBoxMatch = svg.match(/viewBox="([^"]+)"/);
  if (!viewBoxMatch) throw new Error("The icon source must declare an SVG viewBox");

  const viewBox = viewBoxMatch[1]
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  if (viewBox.length !== 4 || viewBox.some((value) => !Number.isFinite(value))) {
    throw new Error("The icon source has an invalid SVG viewBox");
  }

  const edges = ["top", "right", "bottom", "left"];
  for (const edge of edges) {
    if (!Number.isFinite(trim?.[edge]) || trim[edge] < 0) {
      throw new Error(`Icon trim.${edge} must be a non-negative number`);
    }
  }

  const [x, y, width, height] = viewBox;
  const trimmedWidth = width - trim.left - trim.right;
  const trimmedHeight = height - trim.top - trim.bottom;
  if (trimmedWidth <= 0 || trimmedHeight <= 0) {
    throw new Error("Icon trim values must leave a positive viewBox size");
  }
  if (Math.abs(trimmedWidth - trimmedHeight) > Number.EPSILON) {
    throw new Error("Icon trim values must leave a square viewBox");
  }

  const trimmedViewBox = [x + trim.left, y + trim.top, trimmedWidth, trimmedHeight].join(" ");
  return svg.replace(viewBoxMatch[0], `viewBox="${trimmedViewBox}"`);
}
