import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import process from "node:process";

export async function assemblePages(devDirectory, stableDirectory, outputDirectory) {
  for (const [directory, base] of [
    [devDirectory, "/Docfilly/dev/"],
    [stableDirectory, "/Docfilly/stable/"],
  ]) {
    const manifest = JSON.parse(await readFile(resolve(directory, "manifest.webmanifest"), "utf8"));
    if (manifest.id !== base || manifest.scope !== base) {
      throw new Error(`The build in ${directory} must use PWA id and scope ${base}.`);
    }
  }
  await mkdir(outputDirectory, { recursive: true });
  await cp(devDirectory, resolve(outputDirectory, "dev"), { recursive: true });
  await cp(stableDirectory, resolve(outputDirectory, "stable"), { recursive: true });
  await writeFile(resolve(outputDirectory, ".nojekyll"), "");
  await writeFile(
    resolve(outputDirectory, "index.html"),
    `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="refresh" content="0;url=./stable/">
<title>Docfilly</title>
<p><a href="./stable/">Open Docfilly</a></p>
<p><a href="./dev/">Open the development version</a></p>
</html>
`,
  );
  // Retire the former root worker without touching saved documents or preferences.
  await writeFile(
    resolve(outputDirectory, "sw.js"),
    `self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const scope = self.registration.scope;
    const names = await caches.keys();
    await Promise.all(names.filter((name) =>
      (name.startsWith("docfilly-") || name.startsWith("workbox-")) &&
      name.endsWith("-" + scope)
    ).map((name) => caches.delete(name)));
    await self.registration.unregister();
    const windows = await self.clients.matchAll({ type: "window" });
    await Promise.all(windows.filter((client) => {
      const path = new URL(client.url).pathname;
      return path === new URL(scope).pathname || path === new URL(scope).pathname + "index.html";
    }).map((client) => client.navigate(new URL("stable/", scope).href)));
  })());
});
`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [, , dev, stable, output] = process.argv;
  if (!dev || !stable || !output) {
    throw new Error("Usage: node scripts/assemble-pages.mjs <dev-dist> <stable-dist> <output>");
  }
  await assemblePages(dev, stable, output);
}
