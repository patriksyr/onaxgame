import type { Card } from "./local-game";
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
): { items: ReelItem[]; winningIndex: number } {
  const active = catalog.filter((c) => c.active);
  const items: ReelItem[] = [];
  const winningIndex = 40;
  for (let i = 0; i < 48; i++) {
    if (i === winningIndex) {
      items.push(reelItem(winner));
      continue;
    }
    const roll = random() * 100;
    const rarity =
      roll < 60
        ? "common"
        : roll < 85
          ? "rare"
          : roll < 95
            ? "epic"
            : "special";
    if (rarity === "special") {
      items.push({ kind: "special" });
      continue;
    }
    const pool = active.filter((c) => c.rarity === rarity);
    const c = pool[Math.floor(random() * pool.length)];
    items.push(c ? reelItem(c) : { kind: "special" });
  }
  return { items, winningIndex };
}
