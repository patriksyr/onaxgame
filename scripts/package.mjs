import { cp, mkdir, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
await rm("release", { recursive: true, force: true });
await mkdir("release/onax", { recursive: true });
await cp("dist/index.html", "release/onax/index.html");
await cp("README.md", "release/onax/README.md");
await rm("onax-local.zip", { force: true });
execFileSync("zip", ["-q", "-r", "../onax-local.zip", "onax"], {
  cwd: "release",
});
console.log("Hotovo: onax-local.zip. Rozbal a otevři onax/index.html.");
