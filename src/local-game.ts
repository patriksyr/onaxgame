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
  common: { chance: 60, price: 1 },
  rare: { chance: 25, price: 2 },
  epic: { chance: 10, price: 4 },
  legendary: { chance: 4, price: 8 },
  mythic: { chance: 1, price: 20 },
};
export const SAVE_KEY = "roll-an-onax-local-v1";
export type Save = {
  version: 1;
  coinImage?: string;
  coins: number;
  lastDaily: string | null;
  catalog: Card[];
  inventory: Card[];
  nextCardId: number;
  nextInventoryId: number;
};
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
    version: 1,
    coins: 100,
    lastDaily: null,
    catalog: cards,
    inventory: [],
    nextCardId: Math.max(...cards.map((c) => c.id)) + 1,
    nextInventoryId: 1,
  };
}
const legacyNames = [
  "Onax Original",
  "Onax Neko",
  "Onax Supreme",
  "Onax Samurai",
  "První Onax",
];
function isLegacyDefault(save: Save, placeholder: string): boolean {
  return (
    save.catalog.length === 5 &&
    save.catalog.every(
      (c) =>
        c.id >= 1 &&
        c.id <= 5 &&
        c.name === legacyNames[c.id - 1] &&
        c.image === placeholder,
    )
  );
}
const integer = (v: unknown) => Number.isSafeInteger(v) && Number(v) >= 0;
export function validateSave(value: unknown, placeholder: string): Save {
  const bad = () => {
    throw Error("Záloha není platná nebo pochází z nepodporované verze hry.");
  };
  if (!value || typeof value !== "object") return bad();
  const s = value as Save;
  if (
    s.version !== 1 ||
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
  return {
    version: 1,
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
    // Nahrazujeme jen známé původní náhledy; vlastní katalogy a sbírky se nemažou.
    if (
      isLegacyDefault(save, this.placeholder) &&
      this.seeds.some((c) => c.image !== this.placeholder)
    ) {
      save.catalog = this.seeds.map((c) => ({ ...c }));
      save.nextCardId = Math.max(
        save.nextCardId,
        ...save.catalog.map((c) => c.id + 1),
      );
      this.write(save);
    }
    return save;
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
    random: () => number = () =>
      crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296,
  ): Card[] {
    return this.change((s) => {
      if (s.coins < 10)
        throw Error(
          "Nemáš dost mincí. Vyzvedni denní odměnu nebo prodej kartu.",
        );
      const pool = Object.fromEntries(
        Object.keys(RULES).map((r) => [
          r,
          s.catalog.filter((c) => c.rarity === r && c.active),
        ]),
      );
      if (Object.values(pool).some((p) => !p.length))
        throw Error("V losování musí zůstat alespoň jedna karta každé rarity.");
      const result: Card[] = [];
      for (let i = 0; i < 1; i++) {
        let roll = Math.floor(random() * 100) + 1;
        let rarity: Rarity = "mythic";
        for (const [r, rule] of Object.entries(RULES)) {
          roll -= rule.chance;
          if (roll <= 0) {
            rarity = r as Rarity;
            break;
          }
        }
        const options = pool[rarity];
        const c = {
          ...options[Math.floor(random() * options.length)],
          inventory_id: s.nextInventoryId++,
        };
        s.inventory.push(c);
        result.push(c);
      }
      s.coins -= 10;
      return result;
    });
  }
  daily(now = new Date()): void {
    this.change((s) => {
      const today = dayKey(now);
      if (s.lastDaily && s.lastDaily >= today)
        throw Error("Dnešní odměnu už máš. Přijď zítra.");
      s.coins += 20;
      s.lastDaily = today;
    });
  }
  sell(id: number): void {
    this.change((s) => {
      const index = s.inventory.findIndex((c) => c.inventory_id === id);
      if (index < 0) throw Error("Tato karta už není ve sbírce.");
      s.coins += RULES[s.inventory[index].rarity].price;
      s.inventory.splice(index, 1);
    });
  }
  addCard(c: Pick<Card, "name" | "description" | "rarity" | "image">): void {
    this.change((s) => {
      if (s.catalog.length >= 500)
        throw Error("Katalog může obsahovat nejvýše 500 karet.");
      const card = {
        ...c,
        id: s.nextCardId++,
        price: RULES[c.rarity]?.price,
        active: 1,
      };
      s.catalog.push(card);
      validateSave(s, this.placeholder);
    });
  }
  toggle(id: number): void {
    this.change((s) => {
      const card = s.catalog.find((c) => c.id === id);
      if (!card) throw Error("Karta neexistuje.");
      if (
        card.active &&
        s.catalog.filter((c) => c.rarity === card.rarity && c.active).length ===
          1
      )
        throw Error(
          "Poslední aktivní kartu této rarity nelze vyřadit. Nejdřív přidej jinou.",
        );
      card.active = card.active ? 0 : 1;
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
    this.write(validateSave(parsed, this.placeholder));
  }
  importCatalog(raw: string): void {
    if (raw.length > 5000000) throw Error("Záloha může mít nejvýše 5 MB.");
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw Error("Soubor neobsahuje platnou JSON zálohu.");
    }
    const imported = validateSave(parsed, this.placeholder);
    if (
      Object.keys(RULES).some(
        (r) => !imported.catalog.some((c) => c.rarity === r && c.active),
      )
    )
      throw Error("Katalog musí obsahovat aktivní kartu každé rarity.");
    this.change((s) => {
      s.catalog = imported.catalog.map((c) => ({ ...c, id: s.nextCardId++ }));
      if (imported.coinImage) s.coinImage = imported.coinImage;
    });
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
