import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { mkdir, readFile } from "node:fs/promises";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
const url = pathToFileURL(resolve("dist/index.html")).href;
const errors = [],
  requests = [];
async function profile(roll = 0.2, reduced = true) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: reduced ? "reduce" : "no-preference",
    acceptDownloads: true,
  });
  await context.addInitScript((value) => {
    Object.defineProperty(crypto, "getRandomValues", {
      value: (arr) => {
        arr.fill(Math.floor(value * 4294967296));
        return arr;
      },
    });
  }, roll);
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (/^https?:/.test(r.url())) requests.push(r.url());
  });
  page.on("dialog", (d) => d.accept());
  await page.goto(url);
  await page.locator(".balance").waitFor();
  return page;
}
const save = (p) =>
  p.evaluate(() => JSON.parse(localStorage.getItem("roll-an-onax-local-v1")));
async function rich(p) {
  await p.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("roll-an-onax-local-v1"));
    s.coins = 1000;
    localStorage.setItem("roll-an-onax-local-v1", JSON.stringify(s));
  });
  await p.reload();
  await p.locator(".balance").waitFor();
}
async function open(p, pack = "origins", count = 1) {
  await p.locator("[data-action=buy]").first().click();
  await p.locator(`[data-select-pack=${pack}]`).click();
  await p.locator(`[data-select-count="${count}"]`).click();
  await p.locator("[data-action=confirm-buy]").click();
}
async function result(p) {
  await p.locator(".batch-result").waitFor({ timeout: 10000 });
}
try {
  await mkdir(".test-data", { recursive: true });
  const p = await profile();
  assert.equal((await save(p)).catalog.length, 24);
  assert.equal((await save(p)).coins, 100);
  await p.screenshot({ path: ".test-data/universe-home.png", fullPage: true });
  await p.getByRole("link", { name: "Karty", exact: true }).click();
  await p.locator("#catalog").waitFor();
  assert.equal(await p.locator(".locked-card").count(), 24);
  assert.equal(await p.locator("#catalog img").count(), 0);
  assert.equal(
    await p
      .locator("#catalog")
      .getByText("ABSOLUTNÍ ONAX", { exact: true })
      .count(),
    0,
  );
  assert.equal(
    await p.locator("#card-form,[data-toggle],input[name=name]").count(),
    0,
  );
  await p.screenshot({
    path: ".test-data/universe-index-locked.png",
    fullPage: true,
  });
  await open(p, "origins", 4);
  await result(p);
  assert.equal(await p.locator(".batch-item").count(), 4);
  assert.equal((await save(p)).inventory.length, 4);
  assert.equal((await save(p)).coins, 0);
  assert.equal((await save(p)).discovered.length, 1);
  await p.screenshot({ path: ".test-data/universe-results4.png" });
  await p.locator("[data-result-sell]").first().click();
  await p.locator(".batch-item.is-sold").waitFor();
  assert.equal((await save(p)).coins, 25);
  await p.locator("[data-action=sell-result]").click();
  await p.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem("roll-an-onax-local-v1")).inventory
        .length === 0,
  );
  assert.equal((await save(p)).coins, 100);
  assert.ok(await p.locator("[data-action=sell-result]").isDisabled());
  await p.keyboard.press("Escape");
  await p.locator("#catalog").waitFor();
  assert.equal(await p.locator(".locked-card").count(), 23);
  assert.equal(await p.locator("[data-catalog-detail]").count(), 1);
  const snapshot = await save(p);
  const revealed = snapshot.catalog.find(
    (c) => c.id === snapshot.discovered[0],
  );
  await p.locator("[data-catalog-detail]").click();
  await p.locator(".card-detail").waitFor();
  assert.equal(
    await p.locator(".full-description").textContent(),
    revealed.description,
  );
  assert.equal(await p.locator("[data-detail-sell]").count(), 0);
  await p.screenshot({ path: ".test-data/universe-detail.png" });
  await p.keyboard.press("Escape");
  await p.reload();
  await p.locator("[data-catalog-detail]").waitFor();
  assert.equal(await p.locator(".locked-card").count(), 23);
  await p.getByRole("link", { name: "Balíčky", exact: true }).click();
  await p.getByRole("button", { name: /Vyzvednout 50 mincí/ }).click();
  await p.getByRole("button", { name: /Dnes vyzvednuto/ }).waitFor();
  assert.equal((await save(p)).coins, 150);
  await open(p, "boost", 2);
  await result(p);
  assert.equal((await save(p)).coins, 70);
  assert.equal((await save(p)).inventory.length, 2);
  await p.locator("[data-action=sell-result]").click();
  await p.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem("roll-an-onax-local-v1")).inventory
        .length === 0,
  );
  assert.equal((await save(p)).coins, 120);
  await p.keyboard.press("Escape");
  await p.getByRole("link", { name: "Moje sbírka", exact: true }).click();
  await open(p, "origins", 1);
  await result(p);
  assert.equal((await save(p)).coins, 95);
  await p.locator("[data-action=to-collection]").click();
  await p.locator(".owned-card").waitFor();
  await p.locator("[data-detail]").click();
  await p.locator(".full-description").waitFor();
  assert.equal(
    await p.locator(".full-description").textContent(),
    revealed.description,
  );
  await p.locator("[data-detail-sell]").click();
  await p.locator("#modal").waitFor({ state: "hidden" });
  assert.equal((await save(p)).coins, 120);
  assert.equal((await save(p)).inventory.length, 0);
  // Export a restore nesmí vrátit veřejnou správu či podvržený katalog.
  await p.getByRole("button", { name: "Záloha a nastavení" }).click();
  assert.equal(await p.locator("[data-action=import-catalog]").count(), 0);
  const downloading = p.waitForEvent("download");
  await p.locator("[data-action=export]").click();
  const raw = await readFile(await (await downloading).path(), "utf8");
  const modified = JSON.parse(raw);
  modified.catalog[0].name = "PODVRŽENÝ KATALOG";
  modified.catalog[0].active = 0;
  modified.catalog[0].price = 99999;
  await p.locator("#import-file").setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(modified)),
  });
  await p.locator("[data-action=import]").click();
  await p.locator("#modal").waitFor({ state: "hidden" });
  assert.ok(
    !(await save(p)).catalog.some((c) => c.name === "PODVRŽENÝ KATALOG"),
  );
  assert.equal((await save(p)).coins, 120);
  assert.equal((await save(p)).discovered.length, 1);
  // Migrace reálného tvaru původní zálohy se čtyřmi kartami.
  const legacy = await profile();
  await legacy.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("roll-an-onax-local-v1"));
    s.version = 1;
    delete s.discovered;
    s.coins = 73;
    s.lastDaily = "2026-11-01";
    s.inventory = Array.from({ length: 4 }, (_, i) => ({
      ...s.catalog[0],
      inventory_id: i + 1,
      price: 1,
    }));
    s.nextInventoryId = 5;
    localStorage.setItem("roll-an-onax-local-v1", JSON.stringify(s));
  });
  await legacy.reload();
  await legacy.getByRole("link", { name: "Moje sbírka", exact: true }).click();
  await legacy.locator(".owned-card").first().waitFor();
  assert.equal(await legacy.locator(".owned-card").count(), 4);
  assert.equal((await save(legacy)).coins, 73);
  assert.equal((await save(legacy)).discovered.length, 1);
  // Čtyři plné pásy jsou viditelné a skutečně se posouvají současně; Apex special se odhalí jednou.
  const multi = await profile(0.995, false);
  await rich(multi);
  await open(multi, "apex", 4);
  await multi.locator(".multi-roll").waitFor();
  assert.equal(await multi.locator(".reel-track").count(), 4);
  const before = await multi
    .locator(".reel-track")
    .evaluateAll((es) => es.map((e) => getComputedStyle(e).transform));
  await multi.waitForTimeout(300);
  const after = await multi
    .locator(".reel-track")
    .evaluateAll((es) => es.map((e) => getComputedStyle(e).transform));
  assert.ok(after.every((t, i) => t !== before[i]));
  assert.equal(
    await multi.locator(".reel-tile.legendary,.reel-tile.mythic").count(),
    0,
  );
  for (let i = 0; i < 4; i++)
    assert.match(
      await multi
        .locator(`[data-lane="${i}"] .reel-tile`)
        .nth(40)
        .textContent(),
      /TAJEMNÝ ONAX/,
    );
  await multi.screenshot({ path: ".test-data/universe-roll4.png" });
  await multi.locator("[data-action=skip-roll]").click();
  await multi.locator(".rare-cinematic").waitFor();
  assert.equal(await multi.locator(".rare-cinematic").count(), 1);
  await result(multi);
  assert.equal(await multi.locator(".batch-item .mythic").count(), 4);
  assert.equal((await save(multi)).coins, 660);
  assert.equal((await save(multi)).inventory.length, 4);
  await multi.locator("[data-action=sell-again]").click();
  await multi.locator(".multi-roll").waitFor();
  assert.equal((await save(multi)).coins, 920);
  assert.equal((await save(multi)).inventory.length, 4);
  await multi.keyboard.press("Escape");
  await multi.waitForTimeout(5100);
  assert.equal(await multi.locator("#modal[open]").count(), 0);
  // Desktop i mobil; čtyři kompaktní pásy se vejdou do dialogu současně.
  const mobile = await profile(0.2, false);
  await rich(mobile);
  await mobile.setViewportSize({ width: 390, height: 844 });
  await mobile.getByRole("link", { name: "Karty", exact: true }).click();
  await mobile.screenshot({
    path: ".test-data/universe-mobile-index.png",
    fullPage: true,
  });
  assert.ok(
    await mobile.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await open(mobile, "elite", 4);
  await mobile.locator(".multi-roll").waitFor();
  assert.equal(await mobile.locator(".reel-track").count(), 4);
  assert.ok(
    await mobile
      .locator(".reel-window")
      .evaluateAll((es) =>
        es.every(
          (e) =>
            e.getBoundingClientRect().top >= 0 &&
            e.getBoundingClientRect().bottom <= innerHeight,
        ),
      ),
  );
  await mobile.screenshot({ path: ".test-data/universe-mobile-roll4.png" });
  await mobile.locator("[data-action=skip-roll]").click();
  await result(mobile);
  assert.equal(await mobile.locator(".batch-item").count(), 4);
  await mobile.screenshot({ path: ".test-data/universe-mobile-results.png" });
  await mobile.keyboard.press("Escape");
  await mobile.getByRole("link", { name: "Moje sbírka", exact: true }).click();
  await mobile.locator("[data-detail]").first().click();
  await mobile.locator(".full-description").waitFor();
  await mobile.screenshot({
    path: ".test-data/universe-mobile-detail.png",
    fullPage: true,
  });
  assert.ok(
    await mobile.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await mobile.mouse.click(2, 2);
  await mobile.locator("#modal").waitFor({ state: "hidden" });
  // Chyba úložiště nezaplatí ani část dávky.
  const blockedContext = await browser.newContext();
  await blockedContext.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    };
  });
  const blocked = await blockedContext.newPage();
  await blocked.goto(url);
  await blocked.locator(".connection-banner").waitFor();
  await open(blocked, "origins", 4);
  await blocked
    .locator(".form-error")
    .filter({ hasText: "nepodařilo uložit" })
    .waitFor();
  assert.match(await blocked.locator(".balance").textContent(), /100/);
  assert.deepEqual(errors, []);
  assert.deepEqual(requests, []);
  console.log(
    "PASS: offline, zamčený katalog, detaily, trvalé objevy, všechny balíčky, 4 souběžné pásy, hromadný prodej a další dávka, migrace, autorita katalogu při importu, mobil, kvóta.",
  );
} finally {
  await browser.close();
}
