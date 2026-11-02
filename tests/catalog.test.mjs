import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, cp, readFile, writeFile, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { generateCatalog } from "../scripts/catalog.mjs";
const exec = promisify(execFile);
test("autorský pomocník přidá fotku a záznam; nové sestavení ho zahrne automaticky", async () => {
  const temp = await mkdtemp(resolve(tmpdir(), "onax-author-"));
  try {
    await cp("content", resolve(temp, "content"), { recursive: true });
    await mkdir(resolve(temp, "scripts"));
    for (const file of ["catalog.mjs", "add-card.mjs"])
      await cp(`scripts/${file}`, resolve(temp, "scripts", file));
    const result = await exec(process.execPath, [
      resolve(temp, "scripts/add-card.mjs"),
      "--name",
      "Testovací Onax",
      "--description",
      "Úplný popis s diakritikou.",
      "--rarity",
      "epic",
      "--image",
      resolve(temp, "content/images/onax-6.jpg"),
    ]);
    assert.match(result.stdout, /Hotovo: #16/);
    const cards = JSON.parse(
      await readFile(resolve(temp, "content/cards.json"), "utf8"),
    );
    assert.equal(cards.length, 11);
    assert.equal(cards.at(-1).id, 16);
    assert.equal(cards.at(-1).image, "images/onax-16.jpg");
    const generated = await generateCatalog(temp);
    assert.equal(generated.at(-1).name, "Testovací Onax");
    assert.ok(generated.at(-1).image.startsWith("data:image/jpeg;base64,"));
    cards[1].id = cards[0].id;
    await writeFile(resolve(temp, "content/cards.json"), JSON.stringify(cards));
    await assert.rejects(generateCatalog(temp), /jedinečná/);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});
test("generátor odmítne chybějící raritu a obrázek mimo content", async () => {
  const temp = await mkdtemp(resolve(tmpdir(), "onax-validation-"));
  try {
    await cp("content", resolve(temp, "content"), { recursive: true });
    const cards = JSON.parse(
      await readFile(resolve(temp, "content/cards.json"), "utf8"),
    );
    for (const c of cards) if (c.rarity === "rare") c.active = 0;
    await writeFile(resolve(temp, "content/cards.json"), JSON.stringify(cards));
    await assert.rejects(generateCatalog(temp), /Chybí aktivní karta/);
    for (const c of cards) if (c.rarity === "rare") c.active = 1;
    await cp(
      resolve(temp, "content/images/onax-6.jpg"),
      resolve(temp, "outside.jpg"),
    );
    cards[0].image = "../outside.jpg";
    await writeFile(resolve(temp, "content/cards.json"), JSON.stringify(cards));
    await assert.rejects(generateCatalog(temp), /uvnitř content/);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});
