import seedCards from "./data/default-cards.json";
export type Rarity = "common" | "rare" | "epic" | "legendary" | "mythic";
export type Card = {
  id: number;
  name: string;
  description: string;
  rarity: Rarity;
  image: string;
  price: number;
  inventory_id?: number;
  active?: number;
};
export const RULES = {
  common: { chance: 60, price: 10 },
  rare: { chance: 25, price: 15 },
  epic: { chance: 10, price: 20 },
  legendary: { chance: 4, price: 100 },
  mythic: { chance: 1, price: 150 },
};
export type PackId = "origins" | "boost" | "elite" | "apex";
export type PackCount = 1 | 2 | 4;
export const PACKS: Record<
  PackId,
  { name: string; cost: number; tag: string; chances: Record<Rarity, number> }
> = {
  origins: {
    name: "Origins",
    cost: 25,
    tag: "Tady začíná příběh",
    chances: { common: 60, rare: 25, epic: 10, legendary: 4, mythic: 1 },
  },
  boost: {
    name: "Boost",
    cost: 40,
    tag: "Štěstí na vyšší obrátky",
    chances: { common: 35, rare: 35, epic: 20, legendary: 8, mythic: 2 },
  },
  elite: {
    name: "Elite",
    cost: 67,
    tag: "Pro lovce výjimečných",
    chances: { common: 10, rare: 25, epic: 40, legendary: 20, mythic: 5 },
  },
  apex: {
    name: "Apex",
    cost: 85,
    tag: "Žádný obyčejný úlovek",
    chances: { common: 0, rare: 10, epic: 40, legendary: 35, mythic: 15 },
  },
};
export const SAVE_KEY = "roll-an-onax-local-v1";
export type Save = {
  version: 1 | 2;
  coinImage?: string;
  coins: number;
  lastDaily: string | null;
  catalog: Card[];
  inventory: Card[];
  discovered: number[];
  nextCardId: number;
  nextInventoryId: number;
};
export function drawRarity(
  chances: Record<Rarity, number>,
  random: number,
): Rarity {
  if (!Number.isFinite(random) || random < 0 || random >= 1)
    throw Error("Neplatný náhodný los.");
  let roll = random * 100;
  for (const [rarity, chance] of Object.entries(chances)) {
    roll -= chance;
    if (roll < 0) return rarity as Rarity;
  }
  throw Error("Neplatné šance balíčku.");
}
export type StorageLike = Pick<Storage, "getItem" | "setItem">;
export function dayKey(now = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Prague",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function defaultCards(_image?: string): Card[] {
  return seedCards.map((c) => ({
    ...c,
    rarity: c.rarity as Rarity,
    price: RULES[c.rarity as Rarity].price,
  }));
}
export function freshSave(
  _image: string,
  catalog: Card[] = defaultCards(),
): Save {
  const cards = catalog.map((c) => ({ ...c }));
  return {
    version: 2,
    discovered: [],
    coins: 100,
    lastDaily: null,
    catalog: cards,
    inventory: [],
    nextCardId: Math.max(...cards.map((c) => c.id)) + 1,
    nextInventoryId: 1,
  };
}
const integer = (v: unknown) => Number.isSafeInteger(v) && Number(v) >= 0;
export function validateSave(value: unknown, placeholder: string): Save {
  const bad = () => {
    throw Error("Záloha není platná nebo pochází z nepodporované verze hry.");
  };
  if (!value || typeof value !== "object") return bad();
  const s = value as Save;
  if (
    (s.version !== 1 && s.version !== 2) ||
    !integer(s.coins) ||
    !integer(s.nextCardId) ||
    !integer(s.nextInventoryId) ||
    !Array.isArray(s.catalog) ||
    !s.catalog.length ||
    s.catalog.length > 500 ||
    !Array.isArray(s.inventory) ||
    s.inventory.length > 10000 ||
    (s.lastDaily !== null &&
      (typeof s.lastDaily !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(s.lastDaily)))
  )
    return bad();
  const validateCard = (c: Card, owned = false): Card => {
    if (
      !c ||
      !integer(c.id) ||
      c.id < 1 ||
      typeof c.name !== "string" ||
      !c.name.trim() ||
      c.name.length > 80 ||
      typeof c.description !== "string" ||
      c.description.length > 500 ||
      !Object.hasOwn(RULES, c.rarity) ||
      typeof c.image !== "string" ||
      (c.image !== placeholder &&
        !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(
          c.image,
        )) ||
      c.image.length > 1500000 ||
      (c.active !== 0 && c.active !== 1) ||
      (owned && (!integer(c.inventory_id) || !c.inventory_id))
    )
      return bad();
    return {
      id: c.id,
      name: c.name,
      description: c.description,
      rarity: c.rarity,
      image: c.image,
      price: RULES[c.rarity].price,
      active: c.active,
      ...(owned ? { inventory_id: c.inventory_id } : {}),
    };
  };
  if (
    s.coinImage !== undefined &&
    (typeof s.coinImage !== "string" ||
      s.coinImage.length > 1500000 ||
      !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(
        s.coinImage,
      ))
  )
    return bad();
  const catalog = s.catalog.map((c) => validateCard(c));
  const images = new Map(catalog.map((c) => [c.id, c.image]));
  const inventory = s.inventory.map((c) =>
    validateCard(
      c?.image === `card:${c.id}`
        ? { ...c, image: images.get(c.id) as string }
        : c,
      true,
    ),
  );
  if (
    new Set(catalog.map((c) => c.id)).size !== catalog.length ||
    new Set(inventory.map((c) => c.inventory_id)).size !== inventory.length ||
    s.nextCardId <=
      Math.max(...catalog.map((c) => c.id), ...inventory.map((c) => c.id)) ||
    s.nextInventoryId <= Math.max(0, ...inventory.map((c) => c.inventory_id!))
  )
    return bad();
  const discovered = s.discovered ?? inventory.map((c) => c.id);
  if (
    !Array.isArray(discovered) ||
    discovered.length > 10000 ||
    discovered.some((id) => !integer(id) || id < 1)
  )
    return bad();
  return {
    version: s.version,
    discovered: [...new Set(discovered)],
    ...(s.coinImage ? { coinImage: s.coinImage } : {}),
    coins: s.coins,
    lastDaily: s.lastDaily,
    catalog,
    inventory,
    nextCardId: s.nextCardId,
    nextInventoryId: s.nextInventoryId,
  };
}
function compact(save: Save) {
  const images = new Map(save.catalog.map((c) => [c.id, c.image]));
  return {
    ...save,
    inventory: save.inventory.map((c) => ({
      ...c,
      image: images.get(c.id) === c.image ? `card:${c.id}` : c.image,
    })),
  };
}
export class LocalGame {
  constructor(
    private storage: StorageLike,
    private placeholder: string,
    private seeds: Card[] = defaultCards(),
  ) {}
  load(): Save {
    let raw: string | null;
    try {
      raw = this.storage.getItem(SAVE_KEY);
    } catch {
      throw Error(
        "Prohlížeč blokuje ukládání. Povol ukládání dat pro tuto stránku.",
      );
    }
    if (raw === null) {
      const save = freshSave(this.placeholder, this.seeds);
      this.write(save);
      return save;
    }
    let save: Save;
    try {
      save = validateSave(JSON.parse(raw), this.placeholder);
    } catch {
      throw Error(
        "Uložený postup nelze načíst. Nic jsme nepřepsali. Obnov platnou zálohu nebo zvol výslovný reset.",
      );
    }
    save = this.normalize(save);
    if (JSON.stringify(compact(save)) !== raw) this.write(save);
    return save;
  }
  private normalize(save: Save): Save {
    const catalog = this.seeds.map((c) => ({
      ...c,
      price: RULES[c.rarity].price,
    }));
    const byId = new Map(catalog.map((c) => [c.id, c]));
    const match = (c: Card) =>
      save.version === 2 && byId.has(c.id)
        ? byId.get(c.id)
        : catalog.find(
            (seed) => seed.name === c.name && seed.rarity === c.rarity,
          );
    const discovered = new Set<number>();
    for (const id of save.discovered) {
      const c = save.catalog.find((c) => c.id === id);
      const found = save.version === 2 ? byId.get(id) : c && match(c);
      if (found) discovered.add(found.id);
    }
    let next = Math.max(
      save.nextCardId,
      ...catalog.map((c) => c.id + 1),
      ...save.inventory.map((c) => c.id + 1),
    );
    const archives = new Map<string, number>();
    const inventory = save.inventory.map((c) => {
      const found = match(c);
      if (found) {
        discovered.add(found.id);
        return { ...found, inventory_id: c.inventory_id };
      }
      const key = JSON.stringify([c.id, c.name, c.rarity, c.image]);
      if (!archives.has(key))
        archives.set(
          key,
          c.id >= 1000000000
            ? c.id
            : ((next = Math.max(next, 1000000000)), next++),
        );
      return { ...c, id: archives.get(key)!, price: RULES[c.rarity].price };
    });
    return {
      ...save,
      version: 2,
      catalog,
      inventory,
      discovered: [...discovered],
      nextCardId: next,
    };
  }
  private write(save: Save): void {
    validateSave(save, this.placeholder);
    const raw = JSON.stringify(compact(save));
    if (new TextEncoder().encode(raw).byteLength > 4000000)
      throw Error(
        "Uložení je příliš velké. Použij menší obrázky nebo méně karet.",
      );
    try {
      this.storage.setItem(SAVE_KEY, raw);
    } catch {
      throw Error(
        "Postup se nepodařilo uložit. Úložiště je plné nebo zablokované. Nic nebylo odečteno.",
      );
    }
  }
  private change<T>(fn: (s: Save) => T): T {
    const s = this.load();
    const result = fn(s);
    this.write(s);
    return result;
  }
  buy(
    packId: PackId = "origins",
    count: PackCount = 1,
    random: () => number = () =>
      crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296,
  ): Card[] {
    if (!Object.hasOwn(PACKS, packId) || ![1, 2, 4].includes(count))
      throw Error("Vyber platný balíček a počet 1, 2 nebo 4.");
    const pack = PACKS[packId];
    return this.change((s) => {
      if (s.coins < pack.cost * count)
        throw Error(
          `Potřebuješ ${pack.cost * count} OC. Vyzvedni odměnu nebo prodej kartu.`,
        );
      const pool = Object.fromEntries(
        Object.keys(RULES).map((r) => [
          r,
          s.catalog.filter((c) => c.rarity === r && c.active),
        ]),
      );
      if (
        Object.entries(pack.chances).some(
          ([r, chance]) => chance > 0 && !pool[r].length,
        )
      )
        throw Error("V edici chybí karta potřebné rarity.");
      const result: Card[] = [];
      for (let i = 0; i < count; i++) {
        const rarity = drawRarity(pack.chances, random());
        const options = pool[rarity];
        const pick = random();
        if (!Number.isFinite(pick) || pick < 0 || pick >= 1)
          throw Error("Neplatný náhodný los.");
        const c = {
          ...options[Math.floor(pick * options.length)],
          inventory_id: s.nextInventoryId++,
        };
        result.push(c);
        s.inventory.push(c);
        if (!s.discovered.includes(c.id)) s.discovered.push(c.id);
      }
      s.coins -= pack.cost * count;
      return result;
    });
  }
  daily(now = new Date()): void {
    this.change((s) => {
      const today = dayKey(now);
      if (s.lastDaily && s.lastDaily >= today)
        throw Error("Dnešní odměnu už máš. Přijď zítra.");
      s.coins += 50;
      s.lastDaily = today;
    });
  }
  sell(id: number): void {
    this.sellMany([id]);
  }
  sellMany(ids: number[]): void {
    if (!ids.length || new Set(ids).size !== ids.length)
      throw Error("Vyber různé vlastněné karty.");
    this.change((s) => {
      const cards = ids.map((id) =>
        s.inventory.find((c) => c.inventory_id === id),
      );
      if (cards.some((c) => !c))
        throw Error("Některá karta už není ve sbírce.");
      s.coins += cards.reduce((total, c) => total + RULES[c!.rarity].price, 0);
      s.inventory = s.inventory.filter((c) => !ids.includes(c.inventory_id!));
    });
  }
  setCoinImage(image: string): void {
    this.change((s) => {
      s.coinImage = image;
    });
  }
  export(): string {
    return JSON.stringify(compact(this.load()));
  }
  import(raw: string): void {
    if (raw.length > 5000000)
      throw Error("Záloha je příliš velká (max. 5 MB).");
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw Error("Soubor neobsahuje platnou JSON zálohu.");
    }
    this.write(this.normalize(validateSave(parsed, this.placeholder)));
  }
  reset(): void {
    this.write(freshSave(this.placeholder, this.seeds));
  }
}
export async function imageData(file: File): Promise<string> {
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 5 * 1024 * 1024
  )
    throw Error("Vyber JPG, PNG nebo WebP do 5 MB.");
  const image = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1000 / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw Error("Prohlížeč nepodporuje zpracování obrázků.");
    ctx.fillStyle = "#172211";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.8);
  } finally {
    image.close();
  }
}
