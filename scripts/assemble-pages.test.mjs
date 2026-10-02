import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import { URL } from "node:url";
import { assemblePages } from "./assemble-pages.mjs";

test("publishes both builds and retires only the old root PWA", async () => {
  const directory = await mkdtemp(join(tmpdir(), "docfilly-pages-"));
  try {
    const dev = join(directory, "dev-input");
    const stable = join(directory, "stable-input");
    const output = join(directory, "output");
    await mkdir(dev);
    await mkdir(stable);
    await writeFile(join(dev, "index.html"), "development app");
    await writeFile(join(stable, "index.html"), "released app");
    for (const [path, base] of [
      [dev, "/Docfilly/dev/"],
      [stable, "/Docfilly/stable/"],
    ]) {
      await writeFile(
        join(path, "manifest.webmanifest"),
        JSON.stringify({ id: base, scope: base }),
      );
    }
    await assemblePages(dev, stable, output);
    assert.equal(await readFile(join(output, "dev/index.html"), "utf8"), "development app");
    assert.equal(await readFile(join(output, "stable/index.html"), "utf8"), "released app");
    assert.match(await readFile(join(output, "index.html"), "utf8"), /url=.\/stable\//);

    const scope = "https://example.test/Docfilly/";
    const deleted = [];
    const navigated = [];
    let unregistered = false;
    let activation;
    const listeners = new Map();
    runInNewContext(await readFile(join(output, "sw.js"), "utf8"), {
      URL,
      caches: {
        keys: async () => [
          `docfilly-precache-${scope}`,
          `workbox-precache-${scope}`,
          `docfilly-precache-${scope}stable/`,
          `docfilly-precache-${scope}dev/`,
          `other-${scope}`,
        ],
        delete: async (name) => deleted.push(name),
      },
      self: {
        addEventListener: (name, listener) => listeners.set(name, listener),
        registration: {
          scope,
          unregister: async () => {
            unregistered = true;
          },
        },
        clients: {
          matchAll: async () =>
            [scope, `${scope}index.html`, `${scope}dev/`, `${scope}stable/`].map((url) => ({
              url,
              navigate: async (target) => navigated.push(target),
            })),
        },
      },
    });
    listeners.get("activate")({
      waitUntil: (promise) => {
        activation = promise;
      },
    });
    await activation;
    assert.equal(unregistered, true);
    assert.deepEqual(deleted, [`docfilly-precache-${scope}`, `workbox-precache-${scope}`]);
    assert.deepEqual(navigated, [`${scope}stable/`, `${scope}stable/`]);
    await writeFile(
      join(dev, "manifest.webmanifest"),
      JSON.stringify({ id: "/Docfilly/", scope: "." }),
    );
    await assert.rejects(assemblePages(dev, stable, output), /must use PWA id and scope/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
