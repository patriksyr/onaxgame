import { test } from "node:test";
import assert from "node:assert/strict";
import {
  LocalGame,
  SAVE_KEY,
  RULES,
  PACKS,
  freshSave,
  defaultCards,
  validateSave,
  dayKey,
  drawRarity,
  type Card,
  type PackId,
} from "../src/local-game.ts";
import { createReel } from "../src/reel.ts";
const placeholder = "placeholder";
const seeds: Card[] = Object.entries(RULES).map(([rarity, rule], i) => ({
  id: i + 1,
  name: `Onax ${rarity}`,
  description: "Dlouhý popis.\nDruhý odstavec.",
  rarity: rarity as Card["rarity"],
  price: rule.price,
  image: placeholder,
  active: 1,
}));
function fixture(catalog = seeds) {
  const data = new Map<string, string>();
  const storage = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => {
      data.set(k, v);
    },
  };
  return { game: new LocalGame(storage, placeholder, catalog), storage, data };
}
const buyCommon = (g: LocalGame, n: 1 | 2 | 4 = 1) =>
  g.buy("origins", n, () => 0);
test("nová hra má 100 OC, prázdnou sbírku, žádné objevy a deset oficiálních karet", () => {
  const s = freshSave(placeholder);
  assert.equal(s.coins, 100);
  assert.equal(s.catalog.length, 10);
  assert.equal(s.discovered.length, 0);
  assert.equal(s.inventory.length, 0);
  assert.ok(
    s.catalog.every((c) => c.image.startsWith("data:image/jpeg;base64,")),
  );
  validateSave(s, placeholder);
});
test("domluvené ceny balíčků, prodejní ceny a přesné šance všech čtyř typů", () => {
  assert.deepEqual(
    Object.values(PACKS).map((p) => p.cost),
    [25, 40, 67, 85],
  );
  assert.deepEqual(
    Object.values(RULES).map((r) => r.price),
    [10, 15, 20, 100, 150],
  );
  for (const pack of Object.values(PACKS)) {
    const counts: Record<string, number> = {
      common: 0,
      rare: 0,
      epic: 0,
      legendary: 0,
      mythic: 0,
    };
    for (let i = 0; i < 100; i++)
      counts[drawRarity(pack.chances, (i + 0.5) / 100)]++;
    assert.deepEqual(counts, pack.chances);
    const expected = Object.entries(pack.chances).reduce(
      (n, [r, chance]) => n + (chance * RULES[r as Card["rarity"]].price) / 100,
      0,
    );
    assert.ok(expected < pack.cost);
  }
});
test("každý balíček skutečně losuje podle vlastních šancí", () => {
  for (const id of Object.keys(PACKS) as PackId[]) {
    const { game } = fixture();
    const rich = game.load();
    rich.coins = 10000;
    game.import(JSON.stringify(rich));
    const counts: Record<string, number> = {
      common: 0,
      rare: 0,
      epic: 0,
      legendary: 0,
      mythic: 0,
    };
    for (let i = 0; i < 100; i++) {
      let call = 0;
      const c = game.buy(id, 1, () =>
        call++ % 2 === 0 ? (i + 0.5) / 100 : 0,
      )[0];
      counts[c.rarity]++;
    }
    assert.deepEqual(counts, PACKS[id].chances);
  }
});
test("čtyři balíčky jsou jeden atomický nákup, duplicity mají různá inventory ID", () => {
  const { game } = fixture();
  const result = buyCommon(game, 4);
  assert.equal(result.length, 4);
  assert.equal(game.load().coins, 0);
  assert.equal(new Set(result.map((c) => c.inventory_id)).size, 4);
  assert.equal(new Set(result.map((c) => c.id)).size, 1);
  assert.deepEqual(game.load().discovered, [1]);
  assert.equal(game.load().inventory.length, 4);
  const before = game.export();
  assert.throws(() => buyCommon(game), /Potřebuješ/);
  assert.equal(game.export(), before);
});
test("neplatný nebo příliš drahý hromadný nákup nic nestrhne", () => {
  const { game } = fixture();
  const before = game.export();
  assert.throws(() => game.buy("apex", 2));
  assert.throws(() => game.buy("bad" as PackId, 1));
  assert.throws(() => game.buy("origins", 3 as 1));
  assert.throws(() => game.buy("origins", 1, () => 1));
  assert.equal(game.export(), before);
});
test("objevení zůstává po prodeji, reloadu a exportu/importu", () => {
  const { game, storage } = fixture();
  const result = buyCommon(game, 2);
  game.sellMany(result.map((c) => c.inventory_id!));
  assert.equal(game.load().coins, 70);
  assert.equal(game.load().inventory.length, 0);
  assert.deepEqual(game.load().discovered, [1]);
  const other = new LocalGame(storage, placeholder, seeds);
  assert.deepEqual(other.load().discovered, [1]);
  const fresh = fixture().game;
  fresh.import(game.export());
  assert.deepEqual(fresh.load().discovered, [1]);
});
test("opakovaný prodej a smíšený neplatný hromadný prodej jsou odmítnuty celé", () => {
  const { game } = fixture();
  const [a, b] = buyCommon(game, 2);
  const before = game.export();
  assert.throws(() => game.sellMany([a.inventory_id!, 999]));
  assert.throws(() => game.sellMany([a.inventory_id!, a.inventory_id!]));
  assert.equal(game.export(), before);
  game.sell(a.inventory_id!);
  const sold = game.export();
  assert.throws(() => game.sell(a.inventory_id!));
  assert.equal(game.export(), sold);
  assert.equal(game.load().inventory[0].inventory_id, b.inventory_id);
});
test("denní odměna je 50 OC, jednou za pražský den", () => {
  const { game } = fixture();
  const now = new Date("2026-11-02T22:59:00Z");
  game.daily(now);
  assert.equal(game.load().coins, 150);
  assert.throws(() => game.daily(now));
  game.daily(new Date("2026-11-02T23:01:00Z"));
  assert.equal(game.load().coins, 200);
  assert.throws(() => game.daily(now));
  assert.equal(dayKey(new Date("2026-07-01T22:01:00Z")), "2026-07-02");
});
test("import nemůže změnit oficiální katalog, ceny, aktivaci ani fotky", () => {
  const { game } = fixture();
  const backup = game.load();
  backup.catalog[0] = {
    ...backup.catalog[0],
    name: "Podvržená karta",
    price: 99999,
    active: 0,
    image: "data:image/png;base64,YWJj",
  };
  game.import(JSON.stringify(backup));
  assert.deepEqual(game.load().catalog, seeds);
  assert.equal(buyCommon(game)[0].name, seeds[0].name);
});
test("migrace původní zálohy zachová mince, denní odměnu a získané karty", () => {
  const { game } = fixture();
  const old: any = freshSave(placeholder, seeds);
  old.version = 1;
  delete old.discovered;
  old.coins = 73;
  old.lastDaily = "2026-11-01";
  old.inventory = [
    { ...seeds[0], id: 18, inventory_id: 1, price: 1 },
    { ...seeds[1], id: 19, inventory_id: 2, price: 2 },
  ];
  old.nextCardId = 20;
  old.nextInventoryId = 3;
  game.import(JSON.stringify(old));
  const s = game.load();
  assert.equal(s.coins, 73);
  assert.equal(s.lastDaily, "2026-11-01");
  assert.equal(s.inventory.length, 2);
  assert.deepEqual(
    s.inventory.map((c) => c.id),
    [1, 2],
  );
  assert.deepEqual(
    s.inventory.map((c) => c.price),
    [10, 15],
  );
  assert.deepEqual(s.discovered, [1, 2]);
});
test("nová vydaná karta se objeví automaticky a zůstane zamčená, metadata se aktualizují", () => {
  const { game, storage } = fixture();
  buyCommon(game);
  const updated = seeds.map((c) => ({ ...c }));
  updated[0].description = "Nový dlouhý popis.";
  updated.push({ ...seeds[4], id: 6, name: "Nová legenda" });
  const next = new LocalGame(storage, placeholder, updated);
  const s = next.load();
  assert.equal(s.catalog.length, 6);
  assert.deepEqual(s.discovered, [1]);
  assert.equal(s.inventory[0].description, "Nový dlouhý popis.");
  assert.equal(s.coins, 75);
});
test("dříve vlastní neoficiální karta zůstane archivním úlovkem, ne v losování", () => {
  const { game } = fixture();
  const old: any = freshSave(placeholder, seeds);
  old.version = 1;
  delete old.discovered;
  old.catalog.push({ ...seeds[0], id: 6, name: "Osobní karta" });
  old.inventory = [{ ...old.catalog[5], inventory_id: 1 }];
  old.nextCardId = 7;
  old.nextInventoryId = 2;
  game.import(JSON.stringify(old));
  assert.equal(game.load().catalog.length, 5);
  assert.equal(game.load().inventory[0].name, "Osobní karta");
  assert.ok(game.load().inventory[0].id >= 1000000000);
  game.sell(1);
  assert.equal(game.load().coins, 110);
});
test("neplatný import, poškozená data a chyba kvóty nezničí postup ani neodečtou mince", () => {
  const { game, data, storage } = fixture();
  const before = game.export();
  assert.throws(() => game.import("{bad"));
  const bad = JSON.parse(before);
  bad.catalog[0].image = "javascript:alert(1)";
  assert.throws(() => game.import(JSON.stringify(bad)));
  assert.equal(game.export(), before);
  storage.setItem = () => {
    throw Error("Quota");
  };
  assert.throws(() => buyCommon(game, 4), /nepodařilo uložit/);
  assert.equal(data.get(SAVE_KEY), before);
  data.set(SAVE_KEY, "broken");
  assert.throws(() => game.load(), /Nic jsme nepřepsali/);
  assert.equal(data.get(SAVE_KEY), "broken");
});
test("oba tajné výsledky zůstávají na pásu anonymní a podíly odpovídají balíčku", () => {
  const a = createReel(seeds, seeds[3], () => 0.99, "apex"),
    b = createReel(seeds, seeds[4], () => 0.99, "apex");
  assert.deepEqual(a.items, b.items);
  assert.deepEqual(a.items[a.winningIndex], { kind: "special" });
  const normal = createReel(seeds, seeds[0], () => 0, "apex");
  assert.deepEqual(normal.items[normal.winningIndex], {
    kind: "card",
    card: seeds[0],
  });
  assert.ok(
    normal.items
      .filter((_, i) => i !== normal.winningIndex)
      .every((item) => item.kind === "card" && item.card.rarity === "rare"),
  );
});
test("záloha obrázku mince zůstává kompatibilní", () => {
  const { game } = fixture();
  game.setCoinImage("data:image/png;base64,YWJj");
  const other = fixture().game;
  other.import(game.export());
  assert.equal(other.load().coinImage, "data:image/png;base64,YWJj");
});
