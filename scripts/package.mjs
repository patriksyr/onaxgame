import { cp, mkdir, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
await rm("release", { recursive: true, force: true });
await mkdir("release/onax", { recursive: true });
await cp("dist", "release/onax/public", { recursive: true });
await cp("app", "release/onax/app", {
  recursive: true,
  filter: (p) => !p.endsWith("config.local.php"),
});
await cp("README.md", "release/onax/README.md");
console.log("FileZilla: release/onax/ (config.local.php doplň podle návodu).");

await rm("onax-filezilla.zip", { force: true });
execFileSync("zip", ["-q", "-r", "../onax-filezilla.zip", "onax"], {
  cwd: "release",
});
console.log("Archiv onax-filezilla.zip je připravený k nahrání.");
