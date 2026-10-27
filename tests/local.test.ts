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
  assert.equal(restored.load().inventory.length, 4);
});
test("balíček stojí 10 mincí, uloží čtyři duplikáty a prodej nelze opakovat", () => {
  const { game } = fixture();
  const cards = game.buy(() => 0);
  assert.equal(cards.length, 4);
  assert.equal(new Set(cards.map((c) => c.id)).size, 1);
  assert.equal(new Set(cards.map((c) => c.inventory_id)).size, 4);
  game.sell(cards[0].inventory_id!);
  assert.equal(game.load().coins, 91);
  assert.equal(game.load().inventory.length, 3);
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
    common: 240,
    rare: 100,
    epic: 40,
    legendary: 16,
    mythic: 4,
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
  assert.equal(game.load().inventory.length, 4);
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
  assert.equal(game.load().inventory.length, 20);
  assert.ok(data.get(SAVE_KEY)!.length < 150000);
  assert.equal(
    game.load().inventory[0].image,
    game.load().catalog.at(-1)!.image,
  );
  const other = fixture().game;
  other.import(game.export());
  assert.deepEqual(other.load(), game.load());
});
