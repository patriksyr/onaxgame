import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  reducedMotion: "reduce",
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://127.0.0.1:8080/");
await page.getByRole("button", { name: /Přihlásit se/ }).waitFor();
await page.waitForTimeout(500);
await page.screenshot({ path: ".test-data/desktop.png", fullPage: true });
assert.equal(await page.locator(".connection-banner").count(), 0);
await page.getByRole("button", { name: /Přihlásit se/ }).click();
await page
  .getByRole("button", { name: "Zaregistrovat se", exact: true })
  .click();
await page.locator("[name=username]").fill(`ui_${Date.now()}`);
await page.locator("[name=password]").fill("browser-test-password");
await page.locator("#auth-form button").click();
await page.locator(".avatar").waitFor();
assert.match(await page.locator(".balance").textContent(), /100/);
await page.getByRole("button", { name: /Otevřít balíček/ }).click();
await page.getByRole("button", { name: /Rozbalit za/ }).click();
await page.locator(".flip-card").first().waitFor();
assert.equal(await page.locator(".flip-card").count(), 4);
await page.locator('[data-reveal="0"]').click();
await page.getByRole("button", { name: /Odhalit všechny/ }).click();
assert.equal(await page.locator(".flip-card.revealed").count(), 4);
await page.waitForTimeout(400);
await page.screenshot({ path: ".test-data/opening.png", fullPage: true });
await page.getByRole("button", { name: /Přejít do sbírky/ }).click();
await page.locator(".owned-card").first().waitFor();
assert.equal(await page.locator(".owned-card").count(), 4);
await page.locator("[data-sell]").first().click();
await page.getByRole("button", { name: /Potvrdit prodej/ }).click();
await page.waitForTimeout(300);
assert.equal(await page.locator(".owned-card").count(), 3);
await page.reload();
await page.locator(".owned-card").first().waitFor();
assert.equal(await page.locator(".owned-card").count(), 3);
await page.setViewportSize({ width: 390, height: 844 });
await page.goto("http://127.0.0.1:8080/#home");
await page.waitForTimeout(400);
assert.ok(
  await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
);
await page.screenshot({ path: ".test-data/mobile.png", fullPage: true });
await page.getByRole("button", { name: /Otevřít balíček/ }).click();
await page.getByRole("button", { name: /Rozbalit za/ }).click();
await page.locator(".flip-card").first().waitFor();
await page.getByRole("button", { name: /Odhalit všechny/ }).click();
await page.screenshot({ path: ".test-data/mobile-opening.png" });
await page.keyboard.press("Escape");
const c = JSON.parse(readFileSync(".test-data/admin.json"));
await page.locator(".avatar").click();
await page.getByRole("button", { name: "Odhlásit se", exact: true }).click();
await page.getByRole("button", { name: /Přihlásit se/ }).click();
await page.locator("[name=username]").fill(c.username);
await page.locator("[name=password]").fill(c.password);
await page.locator("#auth-form button").click();
await page.locator(".avatar").waitFor();
await page.getByRole("link", { name: "Správa", exact: true }).click();
await page.locator("#card-form").waitFor();
await page.locator("[name=name]").fill("Onax <b>Test</b>");
await page.locator("[name=rarity]").selectOption("mythic");
assert.match(
  await page.locator("#admin-preview h3").textContent(),
  /<b>Test<\/b>/,
);
assert.equal(await page.locator("#admin-preview h3 b").count(), 0);
assert.equal(await page.locator("#admin-preview .mythic").count(), 1);
assert.deepEqual(errors, []);
console.log(
  "Browser: desktop, mobil, registrace, 4 odhalení, sbírka, prodej, obnova a admin náhled prošly.",
);
await browser.close();
