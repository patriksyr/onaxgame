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
let state = { coins: 100, daily_available: true, catalog: demoCards };
let page = "home";
let filter = "all";
let opened: Card[] = [];
let revealed = new Set<number>();
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
  `<span class="coin" aria-hidden="true">O</span><span>${n}</span>`;
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
  return `<main><section class="hero"><div class="hero-grain"></div><div class="hero-content"><div class="eyebrow"><span class="live-dot"></span> PRVNÍ EDICE · ONAX ORIGINS</div><h1>ROZBAL TO.<br>NAJDI SVOU<br><span>LEGENDU.</span></h1><p>Čtyři karty. Jeden balíček. A ten pocit,<br>když padne něco výjimečného.</p><div class="hero-actions"><button class="btn" data-action="buy">Otevřít balíček <span><span class="arrow" aria-hidden="true"></span></span></button><div class="pack-price">${coin(10)} <span>/ balíček</span></div></div><div class="hero-proof"><span class="mini-stars">✦ ✦ ✦</span> Žádné skutečné peníze. Jen pořádný štěstí.</div></div><div class="hero-visual"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="floating-label"><span class="live-dot"></span> TVŮJ DALŠÍ ÚLOVEK?</div><div class="ghost-card ghost-left"></div><div class="ghost-card ghost-right"></div><div class="hero-card">${card(hero, "", !state.catalog.length)}</div><div class="visual-caption"><span>01 / 05</span><span>VÍC NEŽ JEN KARTA.</span></div><span class="spark spark-one">✦</span><span class="spark spark-two">✧</span></div><div class="hero-bottom"><span>SBÍREJ. OBJEVUJ. OPAKUJ.</span><a href="#rarities">PROZKOUMAT EDICI ↓</a></div></section><div class="ticker" aria-hidden="true"><span>4 KARTY V BALÍČKU</span>✦<span>5 ÚROVNÍ RARITY</span>✦<span>100 MINCÍ DO ZAČÁTKU</span>✦<span>KAŽDÝ DEN NOVÁ ŠANCE</span>✦</div><section class="section" id="rarities"><div class="section-heading"><div><div class="eyebrow">MALÁ ŠANCE. VELKÝ MOMENT.</div><h2>NE KAŽDÝ ONAX<br>JE <span>OBYČEJNÝ.</span></h2></div><p>Od první karty po nejvzácnější úlovek.<br>Každá rarita má svůj vlastní charakter.</p></div><div class="rarity-grid">${Object.entries(
    RULES,
  )
    .map(
      ([r, v], i) =>
        `<div class="rarity-tile ${r}"><span class="tile-number">0${i + 1}</span><span class="tile-icon">${["◇", "◆", "✧", "✦", "✺"][i]}</span><h3>${rarityNames[r as Rarity]}</h3><div><span>Šance na kartu</span><b>${v.chance} %</b></div><div><span>Prodejní cena</span><b>${v.price} OC</b></div></div>`,
    )
    .join(
      "",
    )}</div></section><section class="daily-section"><div class="daily-orb"><span class="coin large">O</span><span class="spark">✦</span></div><div><div class="eyebrow">MALÝ RITUÁL. VELKÁ ODMĚNA.</div><h2>ZÍTRA ZASE?<br><span>DNESKA TAKY.</span></h2><p>Vrať se každý den pro 20 Onaxcoinů.<br>Další legenda může být jen jeden balíček daleko.</p></div><button class="btn" data-action="daily" ${!state.daily_available ? "disabled" : ""}>${!state.daily_available ? "Dnes vyzvednuto ✓" : "Vyzvednout 20 mincí"} <span><span class="arrow" aria-hidden="true"></span></span></button></section><section class="section how"><div class="eyebrow">JEDNODUCHÝ PLÁN</div><h2>OD BALÍČKU KE <span>SBÍRCE.</span></h2><div class="steps"><div><span>01 /</span><h3>Vyber si štěstí.</h3><p>Začni se 100 mincemi. Jeden balíček stojí jen 10.</p></div><div><span>02 /</span><h3>Otoč svůj příběh.</h3><p>Klikni na každou ze čtyř karet. Tu nejlepší si nech na konec.</p></div><div><span>03 /</span><h3>Nech si legendy.</h3><p>Buduj sbírku. Přebytečné karty prodej a zkus další balíček.</p></div></div></section></main>`;
}
function shell(content: string) {
  app.innerHTML = `${header()}${storageError ? `<div class="connection-banner" role="alert">${esc(storageError)} <button class="text-button" data-action="backup">Obnovit zálohu</button></div>` : ""}${content}<footer><a class="brand" href="#home">ROLL AN <b>ONAX</b><span>✦</span></a><p>Velké úlovky začínají malým kliknutím.</p><span>© ${new Date().getFullYear()} ONAX · VIRTUÁLNÍ SBĚRATELSKÁ HRA</span></footer><div id="toast" role="status" aria-live="polite"></div><dialog id="modal"></dialog>`;
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
      `<main class="section inner-page"><div class="eyebrow">TVOJE VLASTNÍ SÍŇ SLÁVY</div><h1>MOJE <span>SBÍRKA.</span></h1><div class="collection-tools"><p id="count">Tvoje úlovky uložené v tomto prohlížeči.</p><label>Rarita <select id="filter"><option value="all">Všechny rarity</option>${Object.entries(
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
  d.showModal();
  d.addEventListener(
    "close",
    () => previousFocus?.isConnected && previousFocus.focus(),
    { once: true },
  );
  bindTilt();
}
function close() {
  document.querySelector<HTMLDialogElement>("#modal")?.close();
}
function backup() {
  modal(
    `<div class="eyebrow">ULOŽENO V TOMTO PROHLÍŽEČI</div><h2>TVŮJ POSTUP.</h2><p>Mince, sbírka i vlastní karty se ukládají automaticky. Smazání dat prohlížeče je odstraní. Pro přenos na jiné PC použij zálohu. V anonymním režimu se postup po zavření může ztratit.</p><button class="btn" data-action="export">Stáhnout zálohu</button><label>Obnovit ze zálohy (nahradí současný postup)<input id="import-file" type="file" accept=".json,application/json"></label><button class="btn" data-action="import">Obnovit zálohu</button><button class="text-button logout" data-action="reset">Začít znovu / vymazat postup</button><div class="form-error" role="alert"></div>`,
  );
}
async function refresh() {
  const save = game.load();
  state = {
    coins: save.coins,
    daily_available: !save.lastDaily || save.lastDaily < dayKey(),
    catalog: save.catalog,
  };
  storageError = "";
}
async function buy() {
  modal(
    `<div class="pack-confirm"><div class="eyebrow">ONAX ORIGINS / EDICE 01</div><div class="booster"><div>ROLL AN<br><strong>ONAX</strong></div><span class="booster-emblem">✦</span><span>ORIGINS<br><small>4 SBĚRATELSKÉ KARTY</small></span></div><h2>CO SE SKRÝVÁ UVNITŘ?</h2><p>Čtyři karty. Pět rarit. Jedna šance na legendu.</p><button class="btn" data-action="confirm-buy">Rozbalit za ${coin(10)} <span class="arrow" aria-hidden="true"></span></button><p class="fine">Karty se uloží hned při nákupu, i když stránku zavřeš.</p><div class="form-error" role="alert"></div></div>`,
  );
}
function opening() {
  revealed = new Set();
  modal(
    `<div class="opening"><div class="eyebrow">ONAX ORIGINS · TVŮJ BALÍČEK</div><h2>TVŮJ MOMENT <span>PRAVDY.</span></h2><p id="reveal-count">Klikni na kartu a odhal svůj úlovek. 0 / 4</p><div class="reveal-grid">${opened.map((c, i) => `<button class="flip-card" data-reveal="${i}" aria-label="Odhalit kartu ${i + 1}"><div class="flip-inner"><div class="card-back"><span>ROLL AN</span><strong>ONAX</strong><div class="back-emblem">✦</div><span>ORIGINS / 01</span><small>KLIKNI A OTOČ</small></div><div class="card-front">${card(c)}</div></div></button>`).join("")}</div><div class="opening-actions"><button class="text-button" data-action="reveal-all">Odhalit všechny <span class="arrow" aria-hidden="true"></span></button><button class="btn" data-action="to-collection">Přejít do sbírky <span class="arrow" aria-hidden="true"></span></button></div></div>`,
    true,
  );
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches)
    gsap.from(".flip-card", {
      y: 70,
      opacity: 0,
      duration: 0.65,
      stagger: 0.12,
      ease: "power3.out",
    });
}
function reveal(i: number) {
  if (revealed.has(i)) return;
  revealed.add(i);
  const el = document.querySelector<HTMLElement>(`[data-reveal="${i}"]`)!;
  el.classList.add("revealed", opened[i].rarity);
  el.setAttribute(
    "aria-label",
    `${opened[i].name}, ${rarityNames[opened[i].rarity]}`,
  );
  document.querySelector("#reveal-count")!.textContent =
    `${revealed.size === 4 ? "Všechny karty jsou bezpečně ve tvé sbírce." : "Ještě něco se skrývá…"} ${revealed.size} / 4`;
  if (
    !matchMedia("(prefers-reduced-motion: reduce)").matches &&
    ["legendary", "mythic"].includes(opened[i].rarity)
  ) {
    gsap.fromTo(
      el,
      { filter: "brightness(2)" },
      { filter: "brightness(1)", duration: 1.7, delay: 0.3 },
    );
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
      if (!confirm("Obnovit zálohu a nahradit současný postup i katalog?"))
        return;
      game.import(await file.text());
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
    if (action === "confirm-buy") {
      if (busy) return;
      busy = true;
      target.setAttribute("disabled", "");
      try {
        opened = game.buy();
        await refresh();
        if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
          document.querySelector(".booster")?.classList.add("tearing");
          await new Promise<void>((resolve) =>
            gsap.to(".booster", {
              y: -35,
              rotation: 5,
              opacity: 0,
              duration: 0.65,
              delay: 0.3,
              onComplete: resolve,
            }),
          );
        }
        close();
        await render();
        opening();
      } catch (e) {
        document.querySelector("#modal .form-error")!.textContent = (
          e as Error
        ).message;
        target.removeAttribute("disabled");
      } finally {
        busy = false;
      }
    }
    if (target.dataset.reveal !== undefined)
      reveal(Number(target.dataset.reveal));
    if (action === "reveal-all") opened.forEach((_, i) => reveal(i));
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
