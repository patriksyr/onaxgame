import { PACKS, drawRarity, type PackId, type Card } from "./local-game";
export const isSpecial = (card: Card) =>
  card.rarity === "legendary" || card.rarity === "mythic";
export type ReelItem = { kind: "special" } | { kind: "card"; card: Card };
export function reelItem(card: Card): ReelItem {
  return isSpecial(card) ? { kind: "special" } : { kind: "card", card };
}
// Výsledek je uložený nákup. Animace ho znovu nelosuje.
export function createReel(
  catalog: Card[],
  winner: Card,
  random = Math.random,
  packId: PackId = "origins",
): { items: ReelItem[]; winningIndex: number } {
  const active = catalog.filter((c) => c.active);
  const items: ReelItem[] = [];
  const winningIndex = 40;
  for (let i = 0; i < 48; i++) {
    if (i === winningIndex) {
      items.push(reelItem(winner));
      continue;
    }
    const rarity = drawRarity(PACKS[packId].chances, random());
    if (rarity === "legendary" || rarity === "mythic") {
      items.push({ kind: "special" });
      continue;
    }
    const pool = active.filter((c) => c.rarity === rarity);
    const c = pool[Math.floor(random() * pool.length)];
    items.push(c ? reelItem(c) : { kind: "special" });
  }
  return { items, winningIndex };
}
