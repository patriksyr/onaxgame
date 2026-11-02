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
  PACKS,
  type PackId,
  type PackCount,
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
  inventory: [] as Card[],
  discovered: [] as number[],
};
let page = "home";
let filter = "all";
let currentResults: Card[] = [];
let selectedPack: PackId = "origins";
let selectedCount: PackCount = 1;
let rollToken = 0;
const activeTweens = new Set<gsap.core.Tween>();

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
  return `<article class="onax-card ${c.rarity}" data-tilt><div class="card-inner"><header><span class="card-series">ONAX / ${String(c.id).padStart(3, "0")}</span><span class="rarity-symbol">${c.rarity === "mythic" ? "✦" : c.rarity === "legendary" ? "✧" : "◆"}</span></header><div class="card-art"><img src="${esc(c.image)}" alt="${esc(c.name)}" loading="lazy" onerror="this.onerror=null;this.src='${placeholder}'"><div class="art-shine"></div>${preview ? '<span class="preview-tag">UKÁZKA VZHLEDU</span>' : ""}</div><div class="card-copy"><div class="card-rarity">${rarityNames[c.rarity]} <span>✦</span></div><h3>${esc(c.name)}</h3><p>${esc(c.description)}</p><div class="card-bottom"><span>ROLL AN ONAX</span><span>${c.rarity === "mythic" ? "★★★★★" : c.rarity === "legendary" ? "★★★★" : c.rarity === "epic" ? "★★★" : c.rarity === "rare" ? "★★" : "★"}</span></div></div></div><div class="holo"></div>${extras}</article>`;
}
function header() {
  return `<header class="site-header"><a class="brand" href="#home"><span class="brand-mark">O<span>✦</span></span>ROLL AN <b>ONAX</b></a><nav aria-label="Hlavní navigace"><a href="#home" class="${page === "home" ? "active" : ""}">Balíčky</a><a href="#collection" class="${page === "collection" ? "active" : ""}">Moje sbírka</a><a href="#cards" class="${page === "cards" ? "active" : ""}">Karty</a></nav><div class="header-account"><span class="balance">${coin(state.coins)}</span><button class="avatar" data-action="backup" aria-label="Záloha a nastavení" title="Záloha a nastavení">⚙</button></div></header>`;
}
function home() {
  const featured = state.catalog.length ? state.catalog : demoCards;
  const hero = featured.find((c) => c.rarity === "legendary") || featured[0];
  return `<main><section class="hero"><div class="hero-grain"></div><div class="hero-content"><div class="eyebrow"><span class="live-dot"></span> PRVNÍ EDICE · ONAX ORIGINS</div><h1>ROZBAL TO.<br>NAJDI SVOU<br><span>LEGENDU.</span></h1><p>Jeden balíček. Jeden Onax. A ten pocit,<br>když padne něco výjimečného.</p><div class="hero-actions"><button class="btn" data-action="buy">Otevřít balíček <span><span class="arrow" aria-hidden="true"></span></span></button><div class="pack-price">${coin(25)} <span>/ balíček</span></div></div><div class="hero-proof"><span class="mini-stars">✦ ✦ ✦</span> Žádné skutečné peníze. Jen pořádný štěstí.</div></div><div class="hero-visual"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="floating-label"><span class="live-dot"></span> TVŮJ DALŠÍ ÚLOVEK?</div><div class="ghost-card ghost-left"></div><div class="ghost-card ghost-right"></div><div class="hero-card">${card(hero, "", !state.catalog.length)}</div><div class="visual-caption"><span>EDICE / ${String(state.catalog.length).padStart(2, "0")}</span><span>VÍC NEŽ JEN KARTA.</span></div><span class="spark spark-one">✦</span><span class="spark spark-two">✧</span></div><div class="hero-bottom"><span>SBÍREJ. OBJEVUJ. OPAKUJ.</span><a href="#rarities">PROZKOUMAT EDICI ↓</a></div></section><div class="ticker" aria-hidden="true"><span>1 ONAX V BALÍČKU</span>✦<span>5 ÚROVNÍ RARITY</span>✦<span>100 MINCÍ DO ZAČÁTKU</span>✦<span>KAŽDÝ DEN NOVÁ ŠANCE</span>✦</div>${packLobby()}<section class="section" id="rarities"><div class="section-heading"><div><div class="eyebrow">MALÁ ŠANCE. VELKÝ MOMENT.</div><h2>NE KAŽDÝ ONAX<br>JE <span>OBYČEJNÝ.</span></h2></div><p>Od první karty po nejvzácnější úlovek.<br>Každá rarita má svůj vlastní charakter.</p></div><div class="rarity-grid">${Object.entries(
    RULES,
  )
    .map(
      ([r, v], i) =>
        `<div class="rarity-tile ${r}"><span class="tile-number">0${i + 1}</span><span class="tile-icon">${["◇", "◆", "✧", "✦", "✺"][i]}</span><h3>${rarityNames[r as Rarity]}</h3><div><span>Rarita</span><b>${i + 1} / 5</b></div><div><span>Prodejní cena</span><b>${v.price} OC</b></div></div>`,
    )
    .join(
      "",
    )}</div></section><section class="daily-section"><div class="daily-orb"><span class="coin large">${state.coinImage ? `<img src="${esc(state.coinImage)}" alt="">` : "O"}</span><span class="spark">✦</span></div><div><div class="eyebrow">MALÝ RITUÁL. VELKÁ ODMĚNA.</div><h2>ZÍTRA ZASE?<br><span>DNESKA TAKY.</span></h2><p>Vrať se každý den pro 50 Onaxcoinů.<br>Další legenda může být jen jeden balíček daleko.</p></div><button class="btn" data-action="daily" ${!state.daily_available ? "disabled" : ""}>${!state.daily_available ? "Dnes vyzvednuto ✓" : "Vyzvednout 50 mincí"} <span><span class="arrow" aria-hidden="true"></span></span></button></section><section class="section how"><div class="eyebrow">JEDNODUCHÝ PLÁN</div><h2>OD BALÍČKU KE <span>SBÍRCE.</span></h2><div class="steps"><div><span>01 /</span><h3>Vyber si štěstí.</h3><p>Začni se 100 mincemi. Origins stojí 25 mincí. Otevři až čtyři naráz.</p></div><div><span>02 /</span><h3>Roztoč svůj příběh.</h3><p>Sleduj pás. Zlatý symbol skrývá Legendary nebo Mythic.</p></div><div><span>03 /</span><h3>Nech si legendy.</h3><p>Buduj sbírku. Přebytečné karty prodej a zkus další balíček.</p></div></div></section></main>`;
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
  if (page === "admin") {
    location.hash = "cards";
    page = "cards";
  }
  if (page === "rarities" || page === "packs") page = "home";
  if (page === "home") {
    shell(home());
    if (location.hash === "#rarities" || location.hash === "#packs")
      document
        .getElementById(location.hash.slice(1))
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
  if (page === "cards") {
    const found = state.catalog.filter((c) =>
      state.discovered.includes(c.id),
    ).length;
    shell(
      `<main class="section inner-page"><div class="eyebrow">EDICE / ONAX UNIVERSE</div><div class="page-heading"><div><h1>ONAX <span>INDEX.</span></h1><p>Každý úlovek odhalí další příběh. Objevené karty nezmizí ani po prodeji.</p></div><div class="discovery-score"><strong>${found}<span> / ${state.catalog.length}</span></strong><small>OBJEVENÝCH ONAXŮ</small></div></div><progress class="discovery-progress" value="${found}" max="${state.catalog.length}" aria-label="Počet objevených karet"></progress><div class="collection-tools"><p>Nové edice se objeví tady. Dokážeš je objevit všechny?</p><button class="btn" data-action="buy">Objevit dalšího Onaxe <span class="arrow"></span></button>${filterSelect()}</div><div id="catalog" class="collection-grid"></div></main>`,
    );
    drawCatalog();
    document.querySelector("#filter")?.addEventListener("change", (e) => {
      filter = (e.target as HTMLSelectElement).value;
      drawCatalog();
    });
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
            `<div class="owned-card"><button class="card-open" data-detail="${c.inventory_id}" aria-label="Detail karty ${esc(c.name)}">${card(c)}</button><button class="btn btn-sell" data-sell="${c.inventory_id}" data-price="${c.price}">Prodat kartu <span>+ ${c.price} OC</span></button></div>`,
        )
        .join("")
    : '<div class="empty"><span>◇</span><h2>ZATÍM ŽÁDNÝ ÚLOVEK.</h2><p>Otevři balíček nebo vyber jinou raritu.</p><button class="btn" data-action="buy">Otevřít balíček <span class="arrow" aria-hidden="true"></span></button></div>';
  bindTilt();
}
function filterSelect() {
  return `<label>Rarita <select id="filter"><option value="all">Všechny rarity</option>${Object.entries(
    rarityNames,
  )
    .map(
      ([r, name]) =>
        `<option value="${r}" ${filter === r ? "selected" : ""}>${name}</option>`,
    )
    .join("")}</select></label>`;
}
function lockedCard(c: Card) {
  return `<article class="locked-card ${c.rarity}"><span class="locked-id">#${String(c.id).padStart(3, "0")}</span><div class="unknown-figure" aria-hidden="true"><span>?</span></div><span class="locked-rarity">${rarityNames[c.rarity]}</span><h3>NEOBJEVENÝ ONAX</h3><p>${c.active ? "Čeká na první úlovek" : "Archivní edice"}</p></article>`;
}
function drawCatalog() {
  document.querySelector("#catalog")!.innerHTML =
    state.catalog
      .filter((c) => filter === "all" || c.rarity === filter)
      .map((c) =>
        state.discovered.includes(c.id)
          ? `<div class="catalog-entry"><button class="card-open" data-catalog-detail="${c.id}" aria-label="Detail karty ${esc(c.name)}">${card(c)}</button><div class="catalog-caption"><span>✦ OBJEVENO</span><span>${state.inventory.filter((i) => i.id === c.id).length} ks</span></div></div>`
          : `<div class="catalog-entry">${lockedCard(c)}</div>`,
      )
      .join("") || '<p class="empty">Tato rarita zatím nemá kartu.</p>';
  bindTilt();
}
function detail(c: Card) {
  const owned = state.inventory.filter((i) => i.id === c.id);
  modal(
    `<div class="card-detail ${c.rarity}"><div class="detail-art">${card(c)}</div><div class="detail-copy"><div class="eyebrow">#${String(c.id).padStart(3, "0")} / ${rarityNames[c.rarity]}</div><h2>${esc(c.name)}</h2><p class="full-description">${esc(c.description) || "Tenhle Onax ještě svůj příběh nenapsal."}</p><dl><div><dt>Prodejní cena</dt><dd>${coin(c.price)}</dd></div><div><dt>Ve tvé sbírce</dt><dd>${owned.length} ks</dd></div></dl>${owned.length ? `<button class="btn" data-detail-sell="${c.inventory_id ?? owned[0].inventory_id}">Prodat jeden kus · +${c.price} OC</button>` : '<p class="fine">Karta zůstává objevená i po prodeji.</p>'}<button class="text-button" data-action="close">Zavřít detail</button><div class="form-error" role="alert"></div></div></div>`,
    true,
  );
}
function packLobby() {
  return `<section class="section pack-lobby" id="packs"><div class="section-heading"><div><div class="eyebrow">VYBER SI SVŮJ DALŠÍ LEVEL</div><h2>ČTYŘI CESTY.<br><span>JEDNA LEGENDA.</span></h2></div><p>Vyšší liga. Vyšší šance.<br>Každý balíček obsahuje jednoho Onaxe.</p></div><div class="pack-grid">${Object.entries(
    PACKS,
  )
    .map(
      ([id, p], i) =>
        `<button class="pack-option pack-${id}" data-pick-pack="${id}"><span class="pack-level">LEVEL 0${i + 1}</span><span class="pack-gem">${["◇", "◈", "✦", "✺"][i]}</span><h3>${p.name}</h3><p>${p.tag}</p><span class="pack-special">${p.chances.legendary + p.chances.mythic}% Legendary / Mythic</span><span class="pack-buy">${coin(p.cost)} <span class="arrow"></span></span></button>`,
    )
    .join("")}</div></section>`;
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
  for (const tween of [...activeTweens]) tween.kill();
  document.querySelector<HTMLDialogElement>("#modal")?.close();
  void render();
}
function backup() {
  modal(
    `<div class="eyebrow">ULOŽENO V TOMTO PROHLÍŽEČI</div><h2>TVŮJ POSTUP.</h2><p>Mince, sbírka i objevení Onaxové se ukládají automaticky. Smazání dat prohlížeče je odstraní. Pro přenos na jiné PC použij zálohu. V anonymním režimu se postup po zavření může ztratit.</p><button class="btn" data-action="export">Stáhnout zálohu</button><label>Soubor zálohy<input id="import-file" type="file" accept=".json,application/json"></label><button class="btn" data-action="import">Obnovit celý postup</button><p class="fine">Obnova přenese mince, sbírku a objevy. Katalog vždy určuje aktuální edice hry.</p><label>Vlastní obrázek Onaxcoinu<input id="coin-file" type="file" accept="image/jpeg,image/png,image/webp"></label><button class="btn btn-secondary" data-action="coin-image">Uložit obrázek mince</button><button class="text-button logout" data-action="reset">Začít znovu / vymazat postup</button><div class="form-error" role="alert"></div>`,
  );
}
async function refresh() {
  const save = game.load();
  state = {
    coins: save.coins,
    daily_available: !save.lastDaily || save.lastDaily < dayKey(),
    catalog: save.catalog,
    inventory: save.inventory,
    discovered: save.discovered,
    coinImage: save.coinImage || "",
  };
  storageError = "";
  const balance = document.querySelector(".header-account .balance");
  if (balance) balance.innerHTML = coin(state.coins);
}
async function buy() {
  const pack = PACKS[selectedPack];
  const total = pack.cost * selectedCount;
  modal(
    `<div class="pack-picker"><div class="eyebrow">VYBER SI ŠTĚSTÍ</div><h2>DALŠÍ <span>ÚLOVEK.</span></h2><div class="pack-tabs" role="group" aria-label="Typ balíčku">${Object.entries(
      PACKS,
    )
      .map(
        ([id, p]) =>
          `<button class="pack-tab ${id === selectedPack ? "selected" : ""}" data-select-pack="${id}" aria-pressed="${id === selectedPack}">${p.name}<small>${p.cost} OC</small></button>`,
      )
      .join(
        "",
      )}</div><div class="picker-preview pack-${selectedPack}"><div class="booster"><div>ROLL AN<br><strong>ONAX</strong></div><span class="booster-emblem">${{ origins: "◇", boost: "◈", elite: "✦", apex: "✺" }[selectedPack]}</span><span>${pack.name.toUpperCase()}<br><small>1 NÁHODNÝ ONAX</small></span></div><div><h3>${pack.name}</h3><p>${pack.tag}</p><div class="pack-odds">${Object.entries(
      pack.chances,
    )
      .map(
        ([r, chance]) =>
          `<span class="${r}">${rarityNames[r as Rarity]}<b>${chance} %</b></span>`,
      )
      .join(
        "",
      )}</div></div></div><div class="quantity-row"><span>Kolik otevřít současně?</span><div role="group" aria-label="Počet balíčků">${[1, 2, 4].map((n) => `<button data-select-count="${n}" class="quantity ${selectedCount === n ? "selected" : ""}" aria-pressed="${selectedCount === n}">${n}×</button>`).join("")}</div></div><button class="btn" data-action="confirm-buy" ${state.coins < total ? "disabled" : ""}>Otevřít ${selectedCount}× ${pack.name} · ${coin(total)}</button><p class="fine">${state.coins < total ? `Chybí ${total - state.coins} OC. Zkus odměnu nebo prodej karty.` : "Celý nákup se uloží před animací. Karty neztratíš ani zavřením."}</p><div class="form-error" role="alert"></div></div>`,
    true,
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
    const tween = gsap.to(target, {
      ...vars,
      onComplete: () => {
        activeTweens.delete(tween);
        resolve();
      },
      onInterrupt: () => {
        activeTweens.delete(tween);
        resolve();
      },
    });
    activeTweens.add(tween);
  });
}
function remainingResults() {
  return currentResults.filter((c) =>
    state.inventory.some((i) => i.inventory_id === c.inventory_id),
  );
}
function showResult() {
  const remaining = remainingResults();
  const total = remaining.reduce((n, c) => n + c.price, 0);
  const pack = PACKS[selectedPack];
  const price = pack.cost * selectedCount;
  const best = [...currentResults].sort((a, b) => b.price - a.price)[0];
  modal(
    `<div class="result-view batch-result ${best.rarity} ${isSpecial(best) ? "rare-result" : ""}"><div class="result-rays" aria-hidden="true"></div><div class="eyebrow">${selectedCount}× ${pack.name.toUpperCase()} / VÝSLEDKY</div><h2>${currentResults.some(isSpecial) ? "LEGENDÁRNÍ MOMENT." : "TOHLE JE TVŮJ ÚLOVEK."}</h2><div class="batch-results count-${currentResults.length}">${currentResults
      .map((c) => {
        const sold = !remaining.some((i) => i.inventory_id === c.inventory_id);
        return `<div class="batch-item ${sold ? "is-sold" : ""}"><div class="result-card">${card(c)}</div><p class="result-name">${esc(c.name)}</p><span class="result-price">${sold ? "PRODÁNO" : `${rarityNames[c.rarity]} · ${c.price} OC`}</span><button class="btn btn-secondary" data-result-sell="${c.inventory_id}" ${sold ? "disabled" : ""}>${sold ? "Prodáno" : `Prodat · +${c.price} OC`}</button></div>`;
      })
      .join(
        "",
      )}</div><div class="result-actions"><button class="btn" data-action="again" ${state.coins < price ? "disabled" : ""}>${remaining.length ? "Nechat a točit" : "Točit znovu"} ${selectedCount}× · ${coin(price)}</button><button class="btn btn-secondary" data-action="sell-again" ${!remaining.length || state.coins + total < price ? "disabled" : ""}>Prodat zbývající a točit · +${total} OC</button><button class="text-button" data-action="sell-result" ${!remaining.length ? "disabled" : ""}>Prodat všechny zbývající · +${total} OC</button></div><p class="fine">Neprodané karty jsou ve sbírce. Stejný Onax může padnout vícekrát.</p><button class="text-button" data-action="to-collection">Zpátky do sbírky</button><div class="form-error" role="alert"></div></div>`,
    true,
  );
}
async function runSpin() {
  if (busy) return;
  busy = true;
  const token = ++rollToken;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  try {
    currentResults = game.buy(selectedPack, selectedCount);
    await refresh();
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
    const reels = currentResults.map((c) =>
      createReel(state.catalog, c, Math.random, selectedPack),
    );
    modal(
      `<div class="roll-view ${selectedCount > 1 ? "multi-roll" : ""}"><div class="eyebrow">${PACKS[selectedPack].name.toUpperCase()} / ${selectedCount}× SOUČASNĚ</div><h2>TAK SE <span>UKAŽ.</span></h2><p class="roll-status" role="status">${selectedCount === 1 ? "Losování běží…" : "Všechny pásy se točí současně…"}</p><div class="reels-stack">${reels.map((r, i) => `<div class="reel-lane"><span class="lane-label">BALÍČEK 0${i + 1}</span><div class="reel-window" data-lane="${i}"><div class="reel-marker" aria-hidden="true"></div><div class="reel-track">${r.items.map(reelTile).join("")}</div></div></div>`).join("")}</div><p class="fine">Zlatý symbol skrývá Legendary nebo Mythic. Všechny výsledky už jsou uložené.</p><button class="text-button" data-action="skip-roll">Přeskočit animace</button></div>`,
      true,
    );
    await Promise.all(
      reels.map((r, i) => {
        const frame = document.querySelector<HTMLElement>(
          `[data-lane="${i}"]`,
        )!;
        const tile = frame.querySelector<HTMLElement>(".reel-tile")!;
        const track = frame.querySelector<HTMLElement>(".reel-track")!;
        const step = tile.getBoundingClientRect().width + 12;
        gsap.set(track, { x: frame.clientWidth / 2 - step * 2.5 });
        return animate(track, {
          x: () =>
            frame.clientWidth / 2 -
            (tile.getBoundingClientRect().width + 12) * (r.winningIndex + 0.5) +
            6,
          duration: reduced ? 0.12 : 4.8,
          ease: "power4.out",
        });
      }),
    );
    if (token !== rollToken) return;
    const specials = currentResults.filter(isSpecial);
    if (specials.length) {
      modal(
        `<div class="rare-cinematic"><div class="cinematic-ring ring-a"></div><div class="cinematic-ring ring-b"></div><div class="rare-particles" aria-hidden="true">${Array.from({ length: 24 }, (_, i) => `<i style="--i:${i}"></i>`).join("")}</div><div class="cinematic-icon">✦</div><div class="eyebrow">${specials.length > 1 ? `${specials.length} VZÁCNÉ ÚLOVKY V JEDNOM OTEVŘENÍ` : "NĚCO SE PROBOUZÍ…"}</div><h2>TOHLE NENÍ<br>OBYČEJNÝ ONAX.</h2></div>`,
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
    if (action === "import") {
      const file =
        document.querySelector<HTMLInputElement>("#import-file")?.files?.[0];
      if (!file) throw Error("Nejdřív vyber JSON zálohu.");
      if (file.size > 5000000) throw Error("Záloha může mít nejvýše 5 MB.");
      if (
        !confirm(
          "Obnovit zálohu a nahradit současný postup? Katalog zůstane podle aktuální edice.",
        )
      )
        return;
      const raw = await file.text();
      game.import(raw);
      await refresh();
      close();
      await render();
      toast("Záloha byla obnovena.");
    }
    if (action === "reset") {
      if (
        !confirm(
          "Opravdu smazat celý postup a objevy? Bez zálohy je nelze obnovit.",
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
      toast("+50 Onaxcoinů. Štěstí přeje pravidelným!");
    }
    if (action === "confirm-buy" || action === "again") {
      target.setAttribute("disabled", "");
      await runSpin();
      target.removeAttribute("disabled");
    }
    if (action === "skip-roll") {
      for (const tween of [...activeTweens]) tween.progress(1);
    }
    if (action === "sell-again" || action === "sell-result") {
      if (busy) return;
      const ids = remainingResults().map((c) => c.inventory_id!);
      if (!ids.length) return;
      game.sellMany(ids);
      await refresh();
      showResult();
      if (action === "sell-again") await runSpin();
    }
    if (target.dataset.resultSell) {
      if (busy) return;
      game.sell(Number(target.dataset.resultSell));
      await refresh();
      showResult();
    }
    if (target.dataset.selectPack) {
      selectedPack = target.dataset.selectPack as PackId;
      await buy();
    }
    if (target.dataset.selectCount) {
      selectedCount = Number(target.dataset.selectCount) as PackCount;
      await buy();
    }
    if (target.dataset.pickPack) {
      selectedPack = target.dataset.pickPack as PackId;
      await buy();
    }
    if (target.dataset.detail) {
      const c = state.inventory.find(
        (c) => c.inventory_id === Number(target.dataset.detail),
      );
      if (c) detail(c);
    }
    if (target.dataset.catalogDetail) {
      const c = state.catalog.find(
        (c) => c.id === Number(target.dataset.catalogDetail),
      );
      if (c && state.discovered.includes(c.id)) detail(c);
    }
    if (target.dataset.detailSell) {
      game.sell(Number(target.dataset.detailSell));
      await refresh();
      close();
      toast("Karta prodaná. Objev v indexu zůstává.");
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
