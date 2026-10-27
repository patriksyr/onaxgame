import { createReel } from "../src/reel.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  LocalGame,
  SAVE_KEY,
  dayKey,
  validateSave,
} from "../src/local-game.ts";
function fixture() {
  const data = new Map<string, string>();
  const storage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
  return { game: new LocalGame(storage, "placeholder"), data, storage };
}
test("nová hra má 100 mincí a pět aktivních rarit, obnova zachová postup", () => {
  const { game, storage } = fixture();
  assert.equal(game.load().coins, 100);
  assert.equal(game.load().catalog.length, 5);
  game.buy(() => 0);
  const restored = new LocalGame(storage, "placeholder");
  assert.equal(restored.load().coins, 90);
  assert.equal(restored.load().inventory.length, 1);
});
test("balíček stojí 10 mincí, uloží jednoho Onaxe a prodej nelze opakovat", () => {
  const { game } = fixture();
  const cards = game.buy(() => 0);
  assert.equal(cards.length, 1);
  assert.equal(new Set(cards.map((c) => c.id)).size, 1);
  assert.equal(new Set(cards.map((c) => c.inventory_id)).size, 1);
  game.sell(cards[0].inventory_id!);
  assert.equal(game.load().coins, 91);
  assert.equal(game.load().inventory.length, 0);
  assert.throws(() => game.sell(cards[0].inventory_id!), /není ve sbírce/);
  assert.equal(game.load().coins, 91);
});
test("bez mincí se nezmění zůstatek ani inventář", () => {
  const { game } = fixture();
  for (let i = 0; i < 10; i++) game.buy(() => 0);
  const before = game.export();
  assert.throws(() => game.buy(), /dost mincí/);
  assert.equal(game.export(), before);
});
test("všech sto hodnot losu odpovídá poměru 60/25/10/4/1", () => {
  const { game } = fixture();
  let backup = JSON.parse(game.export());
  backup.coins = 10000;
  game.import(JSON.stringify(backup));
  const counts: Record<string, number> = {};
  for (let i = 0; i < 100; i++) {
    let call = 0;
    const cards = game.buy(() => (call++ % 2 === 0 ? (i + 0.5) / 100 : 0));
    for (const c of cards) counts[c.rarity] = (counts[c.rarity] ?? 0) + 1;
  }
  assert.deepEqual(counts, {
    common: 60,
    rare: 25,
    epic: 10,
    legendary: 4,
    mythic: 1,
  });
});
test("denní odměna jednou za pražský den včetně změny data a návratu hodin", () => {
  const { game } = fixture();
  const now = new Date("2026-10-27T22:59:00Z");
  game.daily(now);
  assert.equal(game.load().coins, 120);
  assert.throws(() => game.daily(now), /už máš/);
  game.daily(new Date("2026-10-27T23:01:00Z"));
  assert.equal(game.load().coins, 140);
  assert.throws(() => game.daily(now), /už máš/);
  assert.equal(dayKey(new Date("2026-07-01T22:01:00Z")), "2026-07-02");
});
test("záloha přenese mince, sbírku i vlastní obrázky a přepočítá prodejní cenu", () => {
  const { game } = fixture();
  game.addCard({
    name: "Vlastní Onax",
    description: "Ahoj",
    rarity: "mythic",
    image: "data:image/png;base64,YWJj",
  });
  game.buy(() => 0);
  const saved = game.export();
  const other = fixture().game;
  other.import(saved);
  assert.deepEqual(other.load(), game.load());
  const modified = JSON.parse(saved);
  modified.inventory[0].price = 9999;
  other.import(JSON.stringify(modified));
  assert.equal(other.load().inventory[0].price, 1);
});
test("neplatný import ani vyčerpání úložiště nezničí starý postup", () => {
  const { game, data, storage } = fixture();
  game.load();
  const before = data.get(SAVE_KEY);
  assert.throws(() => game.import("{bad"));
  const bad = JSON.parse(game.export());
  bad.catalog[0].image = "javascript:alert(1)";
  assert.throws(() => game.import(JSON.stringify(bad)));
  bad.catalog[0].image = "placeholder";
  bad.inventory = [
    { ...bad.catalog[0], inventory_id: 1 },
    { ...bad.catalog[0], inventory_id: 1 },
  ];
  assert.throws(() => validateSave(bad, "placeholder"));
  assert.equal(data.get(SAVE_KEY), before);
  storage.setItem = () => {
    throw Error("Quota exceeded");
  };
  assert.throws(() => game.buy(() => 0), /nepodařilo uložit/);
  assert.equal(data.get(SAVE_KEY), before);
});
test("poškozená uložená hra se automaticky nepřepíše", () => {
  const { game, data } = fixture();
  data.set(SAVE_KEY, "broken");
  assert.throws(() => game.load(), /Nic jsme nepřepsali/);
  assert.equal(data.get(SAVE_KEY), "broken");
  game.reset();
  assert.equal(game.load().coins, 100);
});
test("poslední kartu rarity nelze vyřadit; starý úlovek zůstává ve sbírce", () => {
  const { game } = fixture();
  game.buy(() => 0);
  assert.throws(() => game.toggle(1), /Poslední aktivní/);
  game.addCard({
    name: "Nová common",
    description: "",
    rarity: "common",
    image: "placeholder",
  });
  game.toggle(1);
  assert.equal(game.load().inventory.length, 1);
  assert.ok(game.buy(() => 0).every((c) => c.id === 6));
});

test("fotka se neukládá znovu pro každý získaný duplikát", () => {
  const { game, data } = fixture();
  game.addCard({
    name: "Fotka",
    description: "",
    rarity: "common",
    image: "data:image/jpeg;base64," + "A".repeat(100000),
  });
  game.toggle(1);
  for (let i = 0; i < 5; i++) game.buy(() => 0);
  assert.equal(game.load().inventory.length, 5);
  assert.ok(data.get(SAVE_KEY)!.length < 150000);
  assert.equal(
    game.load().inventory[0].image,
    game.load().catalog.at(-1)!.image,
  );
  const other = fixture().game;
  other.import(game.export());
  assert.deepEqual(other.load(), game.load());
});

test("starší záloha se čtyřmi kartami i nová mince zůstávají kompatibilní", () => {
  const { game } = fixture();
  const old = JSON.parse(game.export());
  old.inventory = Array.from({ length: 4 }, (_, i) => ({
    ...old.catalog[0],
    inventory_id: i + 1,
  }));
  old.nextInventoryId = 5;
  game.import(JSON.stringify(old));
  assert.equal(game.load().inventory.length, 4);
  game.setCoinImage("data:image/jpeg;base64,YWJj");
  const other = fixture().game;
  other.import(game.export());
  assert.equal(other.load().coinImage, "data:image/jpeg;base64,YWJj");
  assert.equal(other.load().inventory.length, 4);
  assert.equal(other.buy(() => 0).length, 1);
});

test("reel skrývá obě nejvyšší rarity za totožný symbol a drží uloženého vítěze", () => {
  const { game } = fixture();
  const c = game.load().catalog;
  const legendary = createReel(c, c[3], () => 0.99),
    mythic = createReel(c, c[4], () => 0.99);
  assert.deepEqual(legendary.items[legendary.winningIndex], {
    kind: "special",
  });
  assert.deepEqual(legendary.items, mythic.items);
  assert.ok(!JSON.stringify(legendary.items).includes("legendary"));
  assert.ok(!JSON.stringify(legendary.items).includes("mythic"));
  const normal = createReel(c, c[1], () => 0.99);
  assert.deepEqual(normal.items[normal.winningIndex], {
    kind: "card",
    card: c[1],
  });
});

test("import pouze katalogu zachová peníze a staré úlovky bez kolize ID", () => {
  const { game } = fixture();
  game.buy(() => 0);
  const before = game.load();
  const custom = fixture().game;
  custom.addCard({
    name: "Nová karta ze zálohy",
    description: "",
    rarity: "mythic",
    image: "data:image/png;base64,YWJj",
  });
  custom.setCoinImage("data:image/png;base64,YWJj");
  game.importCatalog(custom.export());
  const after = game.load();
  assert.equal(after.coins, before.coins);
  assert.deepEqual(after.inventory, before.inventory);
  assert.ok(after.catalog.every((c) => c.id >= before.nextCardId));
  assert.ok(after.catalog.some((c) => c.name === "Nová karta ze zálohy"));
  assert.equal(after.coinImage, "data:image/png;base64,YWJj");
  const restored = fixture().game;
  restored.import(game.export());
  assert.deepEqual(restored.load(), after);
});
