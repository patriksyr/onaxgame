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
  network = [];
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
    if (/^https?:/.test(r.url())) network.push(r.url());
  });
  await page.goto(url);
  await page.locator(".balance").waitFor();
  return page;
}
const count = (page) =>
  page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("roll-an-onax-local-v1")).inventory
        .length,
  );
async function pack(page) {
  await page.locator("[data-action=buy]").first().click();
  await page.locator("[data-action=confirm-buy]").click();
}
try {
  await mkdir(".test-data", { recursive: true });
  const page = await profile();
  assert.match(await page.locator(".balance").textContent(), /100/);
  assert.equal(await page.locator(".connection-banner").count(), 0);
  assert.equal(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("roll-an-onax-local-v1")).catalog
          .length,
    ),
    10,
  );
  await page.waitForFunction(() => {
    const img = document.querySelector(".hero-card img");
    return img?.complete && img.naturalWidth > 0;
  });
  await page.screenshot({
    path: ".test-data/purple-desktop.png",
    fullPage: true,
  });
  await pack(page);
  await page.locator(".result-view").waitFor();
  assert.equal(await count(page), 1);
  assert.match(await page.locator(".balance").textContent(), /90/);
  assert.equal(await page.locator(".result-card .onax-card").count(), 1);
  await page.locator("[data-action=again]").click();
  await page.locator(".result-view").waitFor();
  assert.equal(await count(page), 2);
  assert.match(await page.locator(".balance").textContent(), /80/);
  await page.locator("[data-action=sell-again]").click();
  await page.locator(".result-view").waitFor();
  assert.equal(await count(page), 2);
  assert.match(await page.locator(".balance").textContent(), /71/);
  await page.locator("[data-action=sell-result]").click();
  await page
    .locator("[data-action=sell-result]")
    .waitFor({ state: "detached" });
  assert.equal(await count(page), 1);
  assert.match(await page.locator(".balance").textContent(), /72/);
  await page.keyboard.press("Escape");
  await page.locator("#modal").waitFor({ state: "hidden" });
  await page.getByRole("link", { name: "Moje sbírka", exact: true }).click();
  await page.locator(".owned-card").waitFor();
  assert.equal(await page.locator(".owned-card").count(), 1);
  await pack(page);
  await page.locator(".result-view").waitFor();
  await page.mouse.click(5, 5);
  await page.locator("#modal").waitFor({ state: "hidden" });
  assert.equal(await page.locator(".owned-card").count(), 2);
  await page.reload();
  await page.locator(".owned-card").first().waitFor();
  assert.equal(await page.locator(".owned-card").count(), 2);
  await page.getByRole("link", { name: "Balíčky", exact: true }).click();
  await page.getByRole("button", { name: /Vyzvednout 20 mincí/ }).click();
  await page.getByRole("button", { name: /Dnes vyzvednuto/ }).waitFor();
  assert.ok(
    await page.getByRole("button", { name: /Dnes vyzvednuto/ }).isDisabled(),
  );
  await page.getByRole("link", { name: "Karty", exact: true }).click();
  await page.locator("[name=name]").fill("Můj <b>Onax</b>");
  await page.locator("[name=rarity]").selectOption("mythic");
  assert.equal(await page.locator("#admin-preview h3 b").count(), 0);
  const image = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 10;
    c.height = 10;
    c.getContext("2d").fillRect(0, 0, 10, 10);
    return c.toDataURL("image/png").split(",")[1];
  });
  const file = {
    name: "onax.png",
    mimeType: "image/png",
    buffer: Buffer.from(image, "base64"),
  };
  await page.locator("[name=image]").setInputFiles(file);
  await page.locator("#card-form button").click();
  await page.getByText("Můj <b>Onax</b>", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Záloha a nastavení" }).click();
  await page.locator("#coin-file").setInputFiles(file);
  await page.locator("[data-action=coin-image]").click();
  await page.locator("#modal").waitFor({ state: "hidden" });
  assert.equal(await page.locator(".balance .coin img").count(), 1);
  await page.getByRole("button", { name: "Záloha a nastavení" }).click();
  const downloading = page.waitForEvent("download");
  await page.locator("[data-action=export]").click();
  const raw = await readFile(await (await downloading).path(), "utf8");
  const saved = JSON.parse(raw);
  assert.equal(saved.inventory.length, 2);
  assert.equal(saved.catalog.length, 11);
  assert.ok(saved.coinImage.startsWith("data:image/jpeg;"));
  page.on("dialog", (d) => d.accept());
  await page.locator("[data-action=reset]").click();
  await page.locator("#modal").waitFor({ state: "hidden" });
  assert.match(await page.locator(".balance").textContent(), /100/);
  await page.getByRole("button", { name: "Záloha a nastavení" }).click();
  await page.locator("#import-file").setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(raw),
  });
  await page.locator("[data-action=import]").click();
  await page.locator("#modal").waitFor({ state: "hidden" });
  assert.equal(await count(page), 2);
  // Samotný katalog ze stejné zálohy nesmí změnit peníze ani sbírku.
  await page.getByRole("button", { name: "Záloha a nastavení" }).click();
  await page.locator("#import-file").setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(raw),
  });
  await page.locator("[data-action=import-catalog]").click();
  await page.locator("#modal").waitFor({ state: "hidden" });
  assert.equal(await count(page), 2);
  assert.match(
    await page.locator(".balance").textContent(),
    new RegExp(String(saved.coins)),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("link", { name: "Moje sbírka", exact: true }).click();
  await page.locator(".owned-card").first().waitFor();
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({
    path: ".test-data/purple-mobile-collection.png",
    fullPage: true,
  });
  await pack(page);
  await page.locator(".result-view").waitFor();
  await page.screenshot({ path: ".test-data/purple-mobile-result.png" });
  await page.keyboard.press("Escape");
  const other = await profile();
  other.on("dialog", (d) => d.accept());
  await other.getByRole("button", { name: "Záloha a nastavení" }).click();
  await other.locator("#import-file").setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(raw),
  });
  await other.locator("[data-action=import]").click();
  await other.locator("#modal").waitFor({ state: "hidden" });
  assert.equal(await count(other), 2);
  // Obě nejvyšší rarity na pásu používají pouze tutéž anonymní ikonu.
  for (const [roll, rarity] of [
    [0.97, "legendary"],
    [0.995, "mythic"],
  ]) {
    const p = await profile(roll, false);
    await pack(p);
    await p.locator(".roll-view").waitFor();
    assert.match(
      await p.locator(".reel-tile").nth(40).textContent(),
      /TAJEMNÝ ONAX/,
    );
    assert.equal(
      await p.locator(".reel-tile.legendary,.reel-tile.mythic").count(),
      0,
    );
    assert.equal(
      await p.locator('.roll-view img[alt="Onax Samurai"]').count(),
      0,
    );
    await p.screenshot({ path: `.test-data/reel-${rarity}.png` });
    await p.locator(".rare-cinematic").waitFor({ timeout: 9000 });
    assert.ok(
      await p
        .locator(".rare-cinematic")
        .evaluate((e) => e.getBoundingClientRect().height >= innerHeight),
    );
    await p.screenshot({ path: `.test-data/cinematic-${rarity}.png` });
    await p.locator(`.result-view.${rarity}`).waitFor({ timeout: 5000 });
    await p.screenshot({ path: `.test-data/result-${rarity}.png` });
    assert.equal(await count(p), 1);
  }
  const cancelled = await profile(0.2, false);
  await pack(cancelled);
  await cancelled.locator(".roll-view").waitFor();
  await cancelled.keyboard.press("Escape");
  await cancelled.locator("#modal").waitFor({ state: "hidden" });
  await cancelled.waitForTimeout(5100);
  assert.equal(await cancelled.locator("#modal[open]").count(), 0);
  assert.equal(await count(cancelled), 1);
  assert.match(await cancelled.locator(".balance").textContent(), /90/);
  const blocked = await browser.newContext();
  await blocked.addInitScript(() => {
    Storage.prototype.setItem = function () {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    };
  });
  const p3 = await blocked.newPage();
  await p3.goto(url);
  await p3.locator(".connection-banner").waitFor();
  await pack(p3);
  await p3
    .locator(".form-error")
    .filter({ hasText: "nepodařilo uložit" })
    .waitFor();
  assert.match(await p3.locator(".balance").textContent(), /100/);
  assert.deepEqual(errors, []);
  assert.deepEqual(network, []);
  console.log(
    "PASS: offline, jeden Onax, prodat/točit/nechat, kolekce, Escape a backdrop, zrušení animace, oba tajné symboly a filmové odhalení, mobil, staré zálohy, katalog, mince, kvóta.",
  );
} finally {
  await browser.close();
}
