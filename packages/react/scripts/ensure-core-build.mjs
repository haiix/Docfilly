import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { URL } from "node:url";

const coreTypes = new URL("../../docfilly/dist/index.d.ts", import.meta.url);

if (!existsSync(coreTypes)) {
  execSync("pnpm --filter docfilly build", {
    stdio: "inherit",
  });
}
