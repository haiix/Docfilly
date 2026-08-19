import { readFile } from "node:fs/promises";
import process from "node:process";

const versionFile = "version.txt";
const packageFiles = [
  "packages/docfilly/package.json",
  "packages/react/package.json",
  "apps/web/package.json",
];

const version = (await readFile(versionFile, "utf8")).trim();
const semverPattern =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

if (!semverPattern.test(version)) {
  process.stderr.write(`${versionFile} does not contain a valid semantic version: ${version}\n`);
  process.exitCode = 1;
}

for (const packageFile of packageFiles) {
  const packageJson = JSON.parse(await readFile(packageFile, "utf8"));

  if (packageJson.version !== version) {
    process.stderr.write(
      `${packageFile} has version ${packageJson.version}; expected ${version}\n`,
    );
    process.exitCode = 1;
  }
}

if (process.exitCode === undefined) {
  process.stdout.write(`All project versions match ${version}.\n`);
}
