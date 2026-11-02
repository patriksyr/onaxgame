import { readFile, realpath, writeFile, mkdir, rename } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
export const root = fileURLToPath(new URL("../", import.meta.url));
export const rarities = ["common", "rare", "epic", "legendary", "mythic"];
export function imageMime(bytes) {
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
    return "image/jpeg";
  if (
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return "image/png";
  if (
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  )
    return "image/webp";
  throw Error("Obrázek musí být skutečný JPG, PNG nebo WebP.");
}
export async function generateCatalog(base = root) {
  const content = await realpath(resolve(base, "content"));
  const cards = JSON.parse(
    await readFile(resolve(content, "cards.json"), "utf8"),
  );
  if (!Array.isArray(cards) || !cards.length || cards.length > 500)
    throw Error("Katalog musí obsahovat 1 až 500 karet.");
  const ids = new Set();
  const output = [];
  for (const c of cards) {
    if (
      !Number.isSafeInteger(c.id) ||
      c.id < 1 ||
      c.id > 1000000 ||
      ids.has(c.id)
    )
      throw Error(
        "ID karet musí být jedinečná kladná čísla do 1000000. Existující ID neměň.",
      );
    ids.add(c.id);
    if (
      typeof c.name !== "string" ||
      !c.name.trim() ||
      c.name.length > 80 ||
      typeof c.description !== "string" ||
      c.description.length > 500 ||
      !rarities.includes(c.rarity) ||
      ![0, 1].includes(c.active) ||
      typeof c.image !== "string"
    )
      throw Error(
        `Karta #${c.id}: zkontroluj název, popis, raritu a active (0 nebo 1).`,
      );
    const image = await realpath(resolve(content, c.image));
    if (!image.startsWith(content + sep))
      throw Error(`Karta #${c.id}: obrázek musí být uvnitř content/.`);
    const bytes = await readFile(image);
    if (bytes.length > 1000000)
      throw Error(`Karta #${c.id}: zmenši obrázek pod 1 MB.`);
    output.push({
      ...c,
      name: c.name.trim(),
      image: `data:${imageMime(bytes)};base64,${bytes.toString("base64")}`,
    });
  }
  for (const rarity of rarities)
    if (!output.some((c) => c.active && c.rarity === rarity))
      throw Error(`Chybí aktivní karta rarity ${rarity}.`);
  if (Buffer.byteLength(JSON.stringify(output)) > 2500000)
    throw Error(
      "Obrázky v katalogu jsou příliš velké. Zmenši je, součet katalogu musí být pod 2,5 MB.",
    );
  const target = resolve(base, "src/data/default-cards.json");
  await mkdir(resolve(base, "src/data"), { recursive: true });
  await writeFile(target + ".tmp", JSON.stringify(output, null, 2) + "\n");
  await rename(target + ".tmp", target);
  return output;
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  generateCatalog()
    .then((cards) => console.log(`Katalog: ${cards.length} karet připraveno.`))
    .catch((e) => {
      console.error(e.message);
      process.exitCode = 1;
    });
