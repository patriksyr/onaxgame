import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
    acceptDownloads: true,
  });
  const page = await context.newPage();
  const errors = [];
  const network = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (/^https?:/.test(r.url())) network.push(r.url());
  });
  const url = pathToFileURL(resolve("dist/index.html")).href;
  await page.goto(url);
  await page.locator(".balance").waitFor();
  await page.waitForTimeout(200);
  assert.match(await page.locator(".balance").textContent(), /100/);
  assert.equal(
    await page.getByText("Přihlásit se", { exact: true }).count(),
    0,
  );
  assert.equal(await page.locator(".connection-banner").count(), 0);
  await mkdir(".test-data", { recursive: true });
  await page.screenshot({
    path: ".test-data/local-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: /Otevřít balíček/ }).click();
  await page.getByRole("button", { name: /Rozbalit za/ }).click();
  await page.locator(".flip-card").first().waitFor();
  assert.equal(await page.locator(".flip-card").count(), 4);
  await page.locator('[data-reveal="0"]').click();
  await page.getByRole("button", { name: /Odhalit všechny/ }).click();
  assert.equal(await page.locator(".revealed").count(), 4);
  await page.screenshot({ path: ".test-data/local-opening.png" });
  await page.getByRole("button", { name: /Přejít do sbírky/ }).click();
  await page.locator(".owned-card").first().waitFor();
  assert.equal(await page.locator(".owned-card").count(), 4);
  assert.match(await page.locator(".balance").textContent(), /90/);
  await page.reload();
  await page.locator(".owned-card").first().waitFor();
  assert.equal(await page.locator(".owned-card").count(), 4);
  await page.locator("[data-sell]").first().click();
  await page.getByRole("button", { name: /Potvrdit prodej/ }).click();
  await page.waitForTimeout(100);
  assert.equal(await page.locator(".owned-card").count(), 3);
  await page.getByRole("link", { name: "Balíčky", exact: true }).click();
  await page.getByRole("button", { name: /Vyzvednout 20 mincí/ }).click();
  await page.getByRole("button", { name: /Dnes vyzvednuto/ }).waitFor();
  assert.equal(
    await page.getByRole("button", { name: /Dnes vyzvednuto/ }).isDisabled(),
    true,
  );
  await page.getByRole("link", { name: "Karty", exact: true }).click();
  await page.locator("#card-form").waitFor();
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
  await page.locator("[name=image]").setInputFiles({
    name: "onax.png",
    mimeType: "image/png",
    buffer: Buffer.from(image, "base64"),
  });
  await page.locator("#card-form button").click();
  await page.getByText("Můj <b>Onax</b>", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Záloha a nastavení" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Stáhnout zálohu", exact: true })
    .click();
  const download = await downloadPromise;
  const raw = await readFile(await download.path(), "utf8");
  const saved = JSON.parse(raw);
  assert.equal(saved.inventory.length, 3);
  assert.equal(saved.catalog.length, 6);
  assert.ok(saved.catalog.at(-1).image.startsWith("data:image/jpeg;"));
  page.on("dialog", (d) => d.accept());
  await page.getByRole("button", { name: /Začít znovu/ }).click();
  assert.match(await page.locator(".balance").textContent(), /100/);
  await page.getByRole("button", { name: "Záloha a nastavení" }).click();
  await page.locator("#import-file").setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(raw),
  });
  await page
    .getByRole("button", { name: "Obnovit zálohu", exact: true })
    .click();
  await page.locator("#modal").waitFor({ state: "hidden" });
  assert.match(
    await page.locator(".balance").textContent(),
    new RegExp(String(saved.coins)),
  );
  await page.reload();
  await page.getByRole("link", { name: "Moje sbírka", exact: true }).click();
  await page.locator(".owned-card").first().waitFor();
  assert.equal(await page.locator(".owned-card").count(), 3);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("link", { name: "Balíčky", exact: true }).click();
  await page.waitForTimeout(100);
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({
    path: ".test-data/local-mobile.png",
    fullPage: true,
  });
  // Stejná záloha funguje v samostatném prohlížečovém profilu bez serveru.
  const second = await browser.newContext();
  const p2 = await second.newPage();
  await p2.goto(url);
  await p2.getByRole("button", { name: "Záloha a nastavení" }).click();
  p2.on("dialog", (d) => d.accept());
  await p2.locator("#import-file").setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(raw),
  });
  await p2.getByRole("button", { name: "Obnovit zálohu", exact: true }).click();
  await p2.locator("#modal").waitFor({ state: "hidden" });
  await p2.getByRole("link", { name: "Moje sbírka", exact: true }).click();
  await p2.locator(".owned-card").first().waitFor();
  assert.equal(await p2.locator(".owned-card").count(), 3);
  const blocked = await browser.newContext();
  await blocked.addInitScript(() => {
    Storage.prototype.setItem = function () {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    };
  });
  const p3 = await blocked.newPage();
  await p3.goto(url);
  await p3.locator(".connection-banner").waitFor();
  await p3.getByRole("button", { name: /Otevřít balíček/ }).click();
  await p3.getByRole("button", { name: /Rozbalit za/ }).click();
  await p3
    .locator(".form-error")
    .filter({ hasText: "nepodařilo uložit" })
    .waitFor();
  assert.match(await p3.locator(".balance").textContent(), /100/);
  assert.deepEqual(errors, []);
  assert.deepEqual(network, []);
  console.log(
    "PASS: file:// offline, žádné HTTP požadavky, nákup, prodej, obnova po reloadu, odměna, vlastní fotka, export/import, druhý profil, mobil, blokované úložiště.",
  );
} finally {
  await browser.close();
}
