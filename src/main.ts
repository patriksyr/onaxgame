import "@fontsource/barlow-condensed/latin-ext-800.css";
import "@fontsource/barlow-condensed/latin-ext-700.css";
import "@fontsource/barlow-condensed/latin-800.css";
import "@fontsource/barlow-condensed/latin-700.css";
import "@fontsource/dm-sans/latin-ext-400.css";
import "@fontsource/dm-sans/latin-ext-600.css";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-600.css";
import "./style.css";
import { gsap } from "gsap";
import { createReel, isSpecial, type ReelItem } from "./reel";
import {
  LocalGame,
  RULES,
  dayKey,
  freshSave,
  imageData,
  type Card,
  type Rarity,
} from "./local-game";
import placeholder from "../public/onax-placeholder.svg?inline";
const game = new LocalGame(
  {
    getItem: (key) => localStorage.getItem(key),
    setItem: (key, value) => localStorage.setItem(key, value),
  },
  placeholder,
);
let storageError = "";
const rarityNames: Record<Rarity, string> = {
  common: "Common",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
  mythic: "Mythic",
};
const demoCards = freshSave(placeholder).catalog;
let state = {
  coins: 100,
  daily_available: true,
  catalog: demoCards,
  coinImage: "",
};
let page = "home";
let filter = "all";
let currentResult: Card | null = null;
let rollToken = 0;
let activeTween: gsap.core.Tween | null = null;

let busy = false;
const app = document.querySelector<HTMLDivElement>("#app")!;
const esc = (s: unknown) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const coin = (n: number) =>
  `<span class="coin" aria-hidden="true">${state.coinImage ? `<img src="${esc(state.coinImage)}" alt="">` : "O"}</span><span>${n}</span>`;
function toast(message: string) {
  const t = document.querySelector<HTMLElement>("#toast")!;
  t.textContent = message;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 4500);
}
function card(c: Card, extras = "", preview = false) {
  return `<article class="onax-card ${c.rarity}" data-tilt><div class="card-inner"><header><span class="card-series">ONAX / 001</span><span class="rarity-symbol">${c.rarity === "mythic" ? "✦" : c.rarity === "legendary" ? "✧" : "◆"}</span></header><div class="card-art"><img src="${esc(c.image)}" alt="${esc(c.name)}" loading="lazy" onerror="this.onerror=null;this.src='${placeholder}'"><div class="art-shine"></div>${preview ? '<span class="preview-tag">UKÁZKA VZHLEDU</span>' : ""}</div><div class="card-copy"><div class="card-rarity">${rarityNames[c.rarity]} <span>✦</span></div><h3>${esc(c.name)}</h3><p>${esc(c.description)}</p><div class="card-bottom"><span>ROLL AN ONAX</span><span>${c.rarity === "mythic" ? "★★★★★" : c.rarity === "legendary" ? "★★★★" : c.rarity === "epic" ? "★★★" : c.rarity === "rare" ? "★★" : "★"}</span></div></div></div><div class="holo"></div>${extras}</article>`;
}
function header() {
  return `<header class="site-header"><a class="brand" href="#home"><span class="brand-mark">O<span>✦</span></span>ROLL AN <b>ONAX</b></a><nav aria-label="Hlavní navigace"><a href="#home" class="${page === "home" ? "active" : ""}">Balíčky</a><a href="#collection" class="${page === "collection" ? "active" : ""}">Moje sbírka</a><a href="#admin">Karty</a></nav><div class="header-account"><span class="balance">${coin(state.coins)}</span><button class="avatar" data-action="backup" aria-label="Záloha a nastavení" title="Záloha a nastavení">⚙</button></div></header>`;
}
function home() {
  const featured = state.catalog.length ? state.catalog : demoCards;
  const hero = featured.find((c) => c.rarity === "legendary") || featured[0];
  return `<main><section class="hero"><div class="hero-grain"></div><div class="hero-content"><div class="eyebrow"><span class="live-dot"></span> PRVNÍ EDICE · ONAX ORIGINS</div><h1>ROZBAL TO.<br>NAJDI SVOU<br><span>LEGENDU.</span></h1><p>Jeden balíček. Jeden Onax. A ten pocit,<br>když padne něco výjimečného.</p><div class="hero-actions"><button class="btn" data-action="buy">Otevřít balíček <span><span class="arrow" aria-hidden="true"></span></span></button><div class="pack-price">${coin(10)} <span>/ balíček</span></div></div><div class="hero-proof"><span class="mini-stars">✦ ✦ ✦</span> Žádné skutečné peníze. Jen pořádný štěstí.</div></div><div class="hero-visual"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="floating-label"><span class="live-dot"></span> TVŮJ DALŠÍ ÚLOVEK?</div><div class="ghost-card ghost-left"></div><div class="ghost-card ghost-right"></div><div class="hero-card">${card(hero, "", !state.catalog.length)}</div><div class="visual-caption"><span>01 / 05</span><span>VÍC NEŽ JEN KARTA.</span></div><span class="spark spark-one">✦</span><span class="spark spark-two">✧</span></div><div class="hero-bottom"><span>SBÍREJ. OBJEVUJ. OPAKUJ.</span><a href="#rarities">PROZKOUMAT EDICI ↓</a></div></section><div class="ticker" aria-hidden="true"><span>1 ONAX V BALÍČKU</span>✦<span>5 ÚROVNÍ RARITY</span>✦<span>100 MINCÍ DO ZAČÁTKU</span>✦<span>KAŽDÝ DEN NOVÁ ŠANCE</span>✦</div><section class="section" id="rarities"><div class="section-heading"><div><div class="eyebrow">MALÁ ŠANCE. VELKÝ MOMENT.</div><h2>NE KAŽDÝ ONAX<br>JE <span>OBYČEJNÝ.</span></h2></div><p>Od první karty po nejvzácnější úlovek.<br>Každá rarita má svůj vlastní charakter.</p></div><div class="rarity-grid">${Object.entries(
    RULES,
  )
    .map(
      ([r, v], i) =>
        `<div class="rarity-tile ${r}"><span class="tile-number">0${i + 1}</span><span class="tile-icon">${["◇", "◆", "✧", "✦", "✺"][i]}</span><h3>${rarityNames[r as Rarity]}</h3><div><span>Šance na kartu</span><b>${v.chance} %</b></div><div><span>Prodejní cena</span><b>${v.price} OC</b></div></div>`,
    )
    .join(
      "",
    )}</div></section><section class="daily-section"><div class="daily-orb"><span class="coin large">${state.coinImage ? `<img src="${esc(state.coinImage)}" alt="">` : "O"}</span><span class="spark">✦</span></div><div><div class="eyebrow">MALÝ RITUÁL. VELKÁ ODMĚNA.</div><h2>ZÍTRA ZASE?<br><span>DNESKA TAKY.</span></h2><p>Vrať se každý den pro 20 Onaxcoinů.<br>Další legenda může být jen jeden balíček daleko.</p></div><button class="btn" data-action="daily" ${!state.daily_available ? "disabled" : ""}>${!state.daily_available ? "Dnes vyzvednuto ✓" : "Vyzvednout 20 mincí"} <span><span class="arrow" aria-hidden="true"></span></span></button></section><section class="section how"><div class="eyebrow">JEDNODUCHÝ PLÁN</div><h2>OD BALÍČKU KE <span>SBÍRCE.</span></h2><div class="steps"><div><span>01 /</span><h3>Vyber si štěstí.</h3><p>Začni se 100 mincemi. Jeden balíček stojí jen 10.</p></div><div><span>02 /</span><h3>Roztoč svůj příběh.</h3><p>Sleduj pás. Zlatý symbol skrývá Legendary nebo Mythic.</p></div><div><span>03 /</span><h3>Nech si legendy.</h3><p>Buduj sbírku. Přebytečné karty prodej a zkus další balíček.</p></div></div></section></main>`;
}
function shell(content: string) {
  app.innerHTML = `${header()}${storageError ? `<div class="connection-banner" role="alert">${esc(storageError)} <button class="text-button" data-action="backup">Obnovit zálohu</button></div>` : ""}${content}<footer><a class="brand" href="#home">ROLL AN <b>ONAX</b><span>✦</span></a><p>Velké úlovky začínají malým kliknutím.</p><span>© ${new Date().getFullYear()} ONAX · VIRTUÁLNÍ SBĚRATELSKÁ HRA</span></footer><div id="toast" role="status" aria-live="polite"></div><dialog id="modal"></dialog>`;
  const dialog = document.querySelector<HTMLDialogElement>("#modal")!;
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    close();
  });
  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
      close();
  });
  bindTilt();
}
async function render() {
  page = location.hash.slice(1) || "home";
  if (page === "rarities") page = "home";
  if (page === "home") {
    shell(home());
    if (location.hash === "#rarities")
      document
        .getElementById("rarities")
        ?.scrollIntoView({ behavior: "smooth" });
    return;
  }
  if (page === "collection") {
    shell(
      `<main class="section inner-page"><div class="eyebrow">TVOJE VLASTNÍ SÍŇ SLÁVY</div><h1>MOJE <span>SBÍRKA.</span></h1><div class="collection-tools"><p id="count">Tvoje úlovky uložené v tomto prohlížeči.</p><button class="btn" data-action="buy">Otevřít další balíček <span class="arrow" aria-hidden="true"></span></button><label>Rarita <select id="filter"><option value="all">Všechny rarity</option>${Object.entries(
        rarityNames,
      )
        .map(([r, n]) => `<option value="${r}">${n}</option>`)
        .join(
          "",
        )}</select></label></div><div id="collection" class="collection-grid"></div></main>`,
    );
    try {
      const result = { cards: game.load().inventory.slice().reverse() };
      drawInventory(result.cards);
      document.querySelector("#filter")?.addEventListener("change", (e) => {
        filter = (e.target as HTMLSelectElement).value;
        drawInventory(result.cards);
      });
    } catch (e) {
      toast((e as Error).message);
    }
    return;
  }
  if (page === "admin") {
    shell(
      `<main class="section inner-page"><div class="eyebrow">ZÁKULISÍ EDICE</div><h1>SPRÁVA <span>KARET.</span></h1><p>Přidej vlastní fotky a karty. Změny se ukládají jen v tomto prohlížeči a zahrnou se do zálohy. Základní karty můžeš vyřadit po přidání vlastní karty stejné rarity.</p><div class="admin-layout"><form id="card-form" class="panel"><h2>NOVÝ ONAX</h2><label>Název<input name="name" maxlength="80" required placeholder="Onax Samurai"></label><label>Popis<textarea name="description" maxlength="500" rows="3" placeholder="Příběh téhle karty…"></textarea></label><label>Rarita<select name="rarity">${Object.entries(
        rarityNames,
      )
        .map(([r, n]) => `<option value="${r}">${n}</option>`)
        .join(
          "",
        )}</select></label><label>Obrázek (JPG, PNG, WebP · max. 5 MB)<input name="image" type="file" accept="image/jpeg,image/png,image/webp" required></label><div class="form-error" role="alert"></div><button class="btn">Přidat do edice <span class="arrow" aria-hidden="true"></span></button></form><div><div class="eyebrow">ŽIVÝ NÁHLED</div><div id="admin-preview">${card(demoCards[0], "", true)}</div></div></div><h2>KATALOG EDICE</h2><div id="admin-list" class="admin-list"></div></main>`,
    );
    let previewUrl = "";
    const form = document.querySelector<HTMLFormElement>("#card-form")!;
    form.addEventListener("input", () => {
      const f = new FormData(form);
      const img = f.get("image") as File;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      previewUrl = img?.size ? URL.createObjectURL(img) : "";
      document.querySelector("#admin-preview")!.innerHTML = card({
        id: 0,
        name: String(f.get("name") || "Nový Onax"),
        description: String(f.get("description") || "Tvůj příběh začíná tady."),
        rarity: f.get("rarity") as Rarity,
        image: previewUrl || placeholder,
        price: 0,
      });
      bindTilt();
    });
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const b = form.querySelector<HTMLButtonElement>("button")!;
      b.disabled = true;
      try {
        const data = new FormData(form);
        const file = data.get("image") as File;
        const image = await imageData(file);
        game.addCard({
          name: String(data.get("name") || "").trim(),
          description: String(data.get("description") || "").trim(),
          rarity: data.get("rarity") as Rarity,
          image,
        });
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        await refresh();
        await render();
        toast("Nová karta je v edici.");
      } catch (e) {
        form.querySelector(".form-error")!.textContent = (e as Error).message;
        b.disabled = false;
      }
    });
    await adminList();
    return;
  }
  location.hash = "home";
}
function drawInventory(cards: Card[]) {
  const visible = cards.filter((c) => filter === "all" || c.rarity === filter);
  const sel = document.querySelector<HTMLSelectElement>("#filter");
  if (sel) sel.value = filter;
  document.querySelector("#count")!.textContent =
    `${cards.length} karet ve sbírce · ${new Set(cards.map((c) => c.id)).size} různých Onaxů`;
  document.querySelector("#collection")!.innerHTML = visible.length
    ? visible
        .map(
          (c) =>
            `<div class="owned-card">${card(c)}<button class="btn btn-sell" data-sell="${c.inventory_id}" data-price="${c.price}">Prodat kartu <span>+ ${c.price} OC</span></button></div>`,
        )
        .join("")
    : '<div class="empty"><span>◇</span><h2>ZATÍM ŽÁDNÝ ÚLOVEK.</h2><p>Otevři balíček nebo vyber jinou raritu.</p><button class="btn" data-action="buy">Otevřít balíček <span class="arrow" aria-hidden="true"></span></button></div>';
  bindTilt();
}
async function adminList() {
  try {
    const d = { cards: game.load().catalog.slice().reverse() };
    document.querySelector("#admin-list")!.innerHTML = d.cards.length
      ? d.cards
          .map(
            (c) =>
              `<div class="admin-row"><img src="${esc(c.image)}" alt=""><div><strong>${esc(c.name)}</strong><span class="${c.rarity}">${rarityNames[c.rarity]}</span></div><span>${Number(c.active) ? "V losování" : "Vyřazeno"}</span><button class="text-button" data-toggle="${c.id}">${Number(c.active) ? "Vyřadit" : "Vrátit"}</button></div>`,
          )
          .join("")
      : "<p>Katalog je zatím prázdný.</p>";
  } catch (e) {
    toast((e as Error).message);
  }
}
let previousFocus: HTMLElement | null = null;
function modal(html: string, wide = false) {
  const d = document.querySelector<HTMLDialogElement>("#modal")!;
  previousFocus = document.activeElement as HTMLElement;
  d.className = wide ? "wide" : "";
  d.innerHTML = `<button class="close" aria-label="Zavřít" data-action="close">×</button>${html}`;
  if (!d.open) d.showModal();
  d.addEventListener(
    "close",
    () => previousFocus?.isConnected && previousFocus.focus(),
    { once: true },
  );
  bindTilt();
}
function close() {
  rollToken++;
  activeTween?.kill();
  activeTween = null;
  document.querySelector<HTMLDialogElement>("#modal")?.close();
  void render();
}
function backup() {
  modal(
    `<div class="eyebrow">ULOŽENO V TOMTO PROHLÍŽEČI</div><h2>TVŮJ POSTUP.</h2><p>Mince, sbírka i vlastní karty se ukládají automaticky. Smazání dat prohlížeče je odstraní. Pro přenos na jiné PC použij zálohu. V anonymním režimu se postup po zavření může ztratit.</p><button class="btn" data-action="export">Stáhnout zálohu</button><label>Soubor zálohy<input id="import-file" type="file" accept=".json,application/json"></label><button class="btn" data-action="import">Obnovit celý postup</button><button class="btn btn-secondary" data-action="import-catalog">Načíst jen karty</button><p class="fine">Jen karty: nahradí katalog, tvoje mince a sbírka zůstanou.</p><label>Vlastní obrázek Onaxcoinu<input id="coin-file" type="file" accept="image/jpeg,image/png,image/webp"></label><button class="btn btn-secondary" data-action="coin-image">Uložit obrázek mince</button><button class="text-button logout" data-action="reset">Začít znovu / vymazat postup</button><div class="form-error" role="alert"></div>`,
  );
}
async function refresh() {
  const save = game.load();
  state = {
    coins: save.coins,
    daily_available: !save.lastDaily || save.lastDaily < dayKey(),
    catalog: save.catalog,
    coinImage: save.coinImage || "",
  };
  storageError = "";
  const balance = document.querySelector(".header-account .balance");
  if (balance) balance.innerHTML = coin(state.coins);
}
async function buy() {
  modal(
    `<div class="pack-confirm"><div class="eyebrow">ONAX ORIGINS / EDICE 01</div><div class="booster"><div>ROLL AN<br><strong>ONAX</strong></div><span class="booster-emblem">✦</span><span>ORIGINS<br><small>1 NÁHODNÝ ONAX</small></span></div><h2>CO SE SKRÝVÁ UVNITŘ?</h2><p>Jeden Onax. Pět rarit. Roztoč svůj další úlovek.</p><button class="btn" data-action="confirm-buy">Rozbalit za ${coin(10)} <span class="arrow" aria-hidden="true"></span></button><p class="fine">Onax se uloží hned při nákupu. Zavřením animace o něj nepřijdeš.</p><div class="form-error" role="alert"></div></div>`,
  );
}
function reelTile(item: ReelItem) {
  if (item.kind === "special")
    return `<div class="reel-tile special"><span class="special-symbol">✦</span><strong>TAJEMNÝ ONAX</strong><small>LEGENDARY / MYTHIC</small></div>`;
  const c = item.card;
  return `<div class="reel-tile ${c.rarity}"><img src="${esc(c.image)}" alt=""><span>${rarityNames[c.rarity]}</span><strong>${esc(c.name)}</strong></div>`;
}
function animate(
  target: gsap.TweenTarget,
  vars: gsap.TweenVars,
): Promise<void> {
  return new Promise((resolve) => {
    activeTween = gsap.to(target, {
      ...vars,
      onComplete: () => {
        activeTween = null;
        resolve();
      },
      onInterrupt: resolve,
    });
  });
}
function showResult(sold = false) {
  const c = currentResult;
  if (!c) return;
  const special = isSpecial(c);
  modal(
    `<div class="result-view ${c.rarity} ${special ? "rare-result" : ""}"><div class="result-rays" aria-hidden="true"></div><div class="eyebrow">${sold ? "ONAX PRODANÝ" : special ? "TOHLE SE NEVIDÍ KAŽDÝ DEN" : "TVŮJ NOVÝ ÚLOVEK"}</div><h2>${sold ? "MINCE JSOU TVOJE." : rarityNames[c.rarity] + " ONAX!"}</h2><div class="result-card">${card(c)}</div><p>${sold ? "Tato karta už není ve sbírce." : "Uloženo ve sbírce. Můžeš ho nechat, nebo rovnou prodat."}</p><div class="result-actions"><button class="btn" data-action="again" ${state.coins < 10 ? "disabled" : ""}>${sold ? "Točit znovu" : "Nechat a točit"} · ${coin(10)}</button>${!sold ? `<button class="btn btn-secondary" data-action="sell-again" ${state.coins + c.price < 10 ? "disabled" : ""}>Prodat za ${c.price} a točit</button><button class="text-button" data-action="sell-result">Jen prodat · +${c.price} OC</button>` : ""}</div>${state.coins < 10 ? '<p class="fine">Na další balíček potřebuješ 10 OC. Pomůže denní odměna nebo prodej karet.</p>' : ""}<button class="text-button" data-action="to-collection">Zpátky do sbírky</button><div class="form-error" role="alert"></div></div>`,
    true,
  );
}
async function runSpin() {
  if (busy) return;
  busy = true;
  const token = ++rollToken;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  try {
    const winner = game.buy()[0];
    currentResult = winner;
    await refresh();
    const balance = document.querySelector(".balance");
    if (balance) balance.innerHTML = coin(state.coins);
    const booster = document.querySelector(".booster");
    if (booster && !reduced) {
      booster.classList.add("tearing");
      await animate(booster, {
        y: -35,
        rotation: 5,
        opacity: 0,
        duration: 0.55,
        delay: 0.2,
      });
      if (token !== rollToken) return;
    }
    const { items, winningIndex } = createReel(state.catalog, winner);
    modal(
      `<div class="roll-view"><div class="eyebrow">ONAX ORIGINS / 1 ONAX</div><h2>TAK SE <span>UKAŽ.</span></h2><p class="roll-status" role="status">Losování běží…</p><div class="reel-window"><div class="reel-marker" aria-hidden="true"></div><div class="reel-track">${items.map(reelTile).join("")}</div></div><p class="fine">Zlatý symbol skrývá Legendary nebo Mythic. Výsledek už je bezpečně uložený.</p><button class="text-button" data-action="skip-roll">Přeskočit animaci</button></div>`,
      true,
    );
    const frame = document.querySelector<HTMLElement>(".reel-window")!;
    const tile = document.querySelector<HTMLElement>(".reel-tile")!;
    const step = tile.getBoundingClientRect().width + 12;
    const center = frame.clientWidth / 2;
    gsap.set(".reel-track", { x: center - step * 2.5 });
    await animate(".reel-track", {
      x: center - step * (winningIndex + 0.5) + 6,
      duration: reduced ? 0.12 : 4.8,
      ease: "power4.out",
    });
    if (token !== rollToken) return;
    if (isSpecial(winner)) {
      modal(
        `<div class="rare-cinematic"><div class="cinematic-ring ring-a"></div><div class="cinematic-ring ring-b"></div><div class="rare-particles" aria-hidden="true">${Array.from({ length: 24 }, (_, i) => `<i style="--i:${i}"></i>`).join("")}</div><div class="cinematic-icon">✦</div><div class="eyebrow">NĚCO SE PROBOUZÍ…</div><h2>TOHLE NENÍ<br>OBYČEJNÝ ONAX.</h2></div>`,
        true,
      );
      await animate(".cinematic-icon", {
        scale: reduced ? 1 : 1.5,
        rotation: reduced ? 0 : 180,
        duration: reduced ? 0.15 : 2,
        ease: "power2.in",
      });
      if (token !== rollToken) return;
    }
    showResult();
  } catch (error) {
    const el = document.querySelector("#modal[open] .form-error");
    if (el) el.textContent = (error as Error).message;
    else toast((error as Error).message);
  } finally {
    busy = false;
  }
}
function bindTilt() {
  if (
    !matchMedia("(hover: hover) and (prefers-reduced-motion: no-preference)")
      .matches
  )
    return;
  document.querySelectorAll<HTMLElement>("[data-tilt]").forEach((el) => {
    el.onpointermove = (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width,
        y = (e.clientY - r.top) / r.height;
      el.style.setProperty("--rx", `${(0.5 - y) * 12}deg`);
      el.style.setProperty("--ry", `${(x - 0.5) * 14}deg`);
      el.style.setProperty("--mx", `${x * 100}%`);
      el.style.setProperty("--my", `${y * 100}%`);
    };
    el.onpointerleave = () => {
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
    };
  });
}
app.addEventListener("click", async (e) => {
  const target = (e.target as HTMLElement).closest<HTMLElement>("button");
  if (!target) return;
  const action = target.dataset.action;
  try {
    if (action === "close") close();
    if (action === "buy") await buy();
    if (action === "backup") backup();
    if (action === "coin-image") {
      const file =
        document.querySelector<HTMLInputElement>("#coin-file")?.files?.[0];
      if (!file) throw Error("Vyber obrázek mince.");
      target.setAttribute("disabled", "");
      game.setCoinImage(await imageData(file));
      await refresh();
      close();
      await render();
      toast("Nová mince je uložená i v záloze.");
    }
    if (action === "export") {
      const blob = new Blob([game.export()], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `onax-zaloha-${dayKey()}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast("Záloha byla připravena ke stažení.");
    }
    if (action === "import" || action === "import-catalog") {
      const file =
        document.querySelector<HTMLInputElement>("#import-file")?.files?.[0];
      if (!file) throw Error("Nejdřív vyber JSON zálohu.");
      if (file.size > 5000000) throw Error("Záloha může mít nejvýše 5 MB.");
      if (
        !confirm(
          action === "import-catalog"
            ? "Nahradit katalog kartami ze zálohy? Mince a sbírka zůstanou."
            : "Obnovit zálohu a nahradit současný postup i katalog?",
        )
      )
        return;
      const raw = await file.text();
      if (action === "import-catalog") game.importCatalog(raw);
      else game.import(raw);
      await refresh();
      close();
      await render();
      toast("Záloha byla obnovena.");
    }
    if (action === "reset") {
      if (
        !confirm(
          "Opravdu smazat celý postup i vlastní karty? Bez zálohy je nelze obnovit.",
        )
      )
        return;
      game.reset();
      await refresh();
      close();
      await render();
      toast("Nový začátek. Máš 100 Onaxcoinů.");
    }
    if (action === "daily") {
      target.setAttribute("disabled", "");
      game.daily();
      await refresh();
      close();
      await render();
      toast("+20 Onaxcoinů. Štěstí přeje pravidelným!");
    }
    if (action === "confirm-buy" || action === "again") {
      target.setAttribute("disabled", "");
      await runSpin();
      target.removeAttribute("disabled");
    }
    if (action === "skip-roll") {
      activeTween?.progress(1);
    }
    if (action === "sell-again" || action === "sell-result") {
      if (busy || !currentResult) return;
      target.setAttribute("disabled", "");
      game.sell(currentResult.inventory_id!);
      await refresh();
      showResult(true);
      if (action === "sell-again") await runSpin();
    }
    if (action === "to-collection") {
      close();
      if (location.hash === "#collection") await render();
      else location.hash = "collection";
    }
    if (target.dataset.sell) {
      const id = Number(target.dataset.sell);
      modal(
        `<div class="eyebrow">MÍSTO PRO NOVÝ ÚLOVEK</div><h2>PRODAT KARTU?</h2><p>Za tento kus získáš ${Number(target.dataset.price)} Onaxcoinů. Prodej nelze vrátit.</p><button class="btn" data-action="confirm-sell" data-id="${id}">Potvrdit prodej <span class="arrow" aria-hidden="true"></span></button>`,
      );
    }
    if (action === "confirm-sell") {
      target.setAttribute("disabled", "");
      game.sell(Number(target.dataset.id));
      await refresh();
      close();
      await render();
      toast("Karta prodaná. Mince máš zpátky.");
    }
    if (target.dataset.toggle) {
      target.setAttribute("disabled", "");
      game.toggle(Number(target.dataset.toggle));
      await refresh();
      await adminList();
    }
  } catch (e) {
    const error = document.querySelector("#modal[open] .form-error");
    if (error) error.textContent = (e as Error).message;
    else toast((e as Error).message);
    target.removeAttribute("disabled");
  }
});
window.addEventListener("hashchange", () => {
  filter = "all";
  void render();
});
try {
  await refresh();
} catch (error) {
  storageError = (error as Error).message;
}
await render();
window.addEventListener("storage", async (e) => {
  if (e.key === "roll-an-onax-local-v1") {
    try {
      await refresh();
      close();
      await render();
      toast("Postup byl aktualizován z druhé záložky.");
    } catch (error) {
      storageError = (error as Error).message;
      await render();
    }
  }
});
