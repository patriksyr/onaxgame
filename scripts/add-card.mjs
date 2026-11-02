import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { parseArgs } from "node:util";
import { readFile, writeFile, copyFile, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { root, rarities, imageMime, generateCatalog } from "./catalog.mjs";
let rl;
try {
  const { values } = parseArgs({
    options: {
      name: { type: "string" },
      description: { type: "string" },
      rarity: { type: "string" },
      image: { type: "string" },
    },
  });
  const ask = async (key, prompt) =>
    values[key] ??
    ((rl ??= createInterface({ input: stdin, output: stdout })),
    await rl.question(prompt));
  const name = (await ask("name", "Název Onaxe: ")).trim();
  const description = await ask("description", "Popis (max. 500 znaků): ");
  const rarity = (await ask("rarity", `Rarita (${rarities.join(", ")}): `))
    .trim()
    .toLowerCase();
  const source = (await ask("image", "Cesta k fotce (JPG/PNG/WebP): "))
    .trim()
    .replace(/^['"]|['"]$/g, "");
  if (
    !name ||
    name.length > 80 ||
    description.length > 500 ||
    !rarities.includes(rarity)
  )
    throw Error("Neplatný název, délka popisu nebo rarita.");
  const bytes = await readFile(resolve(source));
  if (bytes.length > 1000000)
    throw Error("Fotku nejdřív zmenši pod 1 MB (doporučeno 100–250 kB).");
  const ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[
    imageMime(bytes)
  ];
  const path = resolve(root, "content/cards.json");
  const original = await readFile(path, "utf8");
  const cards = JSON.parse(original);
  const id = Math.max(...cards.map((c) => c.id)) + 1;
  const image = `images/onax-${id}.${ext}`;
  const target = resolve(root, "content", image);
  await copyFile(resolve(source), target, 1);
  try {
    cards.push({ id, name, description, rarity, active: 1, image });
    await writeFile(path, JSON.stringify(cards, null, 2) + "\n");
    await generateCatalog();
  } catch (error) {
    await writeFile(path, original);
    await unlink(target);
    throw error;
  }
  console.log(
    `Hotovo: #${id} ${name}. Teď spusť npm run build a nahraj dist/index.html na server.`,
  );
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  rl?.close();
}
