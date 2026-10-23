import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
const base = process.env.ONAX_TEST_URL || "http://127.0.0.1:8080/";
function client() {
  let cookie = "",
    csrf = "";
  return {
    async req(action, body, token = true) {
      const headers = { cookie };
      if (body) {
        if (token) headers["X-CSRF-Token"] = csrf;
        if (!(body instanceof FormData))
          headers["Content-Type"] = "application/json";
      }
      const res = await fetch(`${base}api.php?action=${action}`, {
        method: body ? "POST" : "GET",
        headers,
        body: body
          ? body instanceof FormData
            ? body
            : JSON.stringify(body)
          : undefined,
      });
      const set = res.headers.getSetCookie();
      if (set.length) cookie = set.at(-1).split(";")[0];
      const data = await res.json();
      if (data.csrf) csrf = data.csrf;
      return { status: res.status, ...data };
    },
  };
}
const suffix = randomUUID().slice(0, 8);
const username = `test_${suffix}`;
const password = "test-only-strong-password";
let a, b, admin, owned;
test("registrace, autentizace a serverová ekonomika", async (t) => {
  a = client();
  b = client();
  admin = client();
  await t.test("stav vrátí CSRF, návštěvník nemá inventář", async () => {
    assert.equal((await a.req("state")).status, 200);
    assert.equal((await a.req("inventory")).status, 401);
  });
  await t.test("CSRF je povinné", async () => {
    assert.equal(
      (await a.req("register", { username, password }, false)).status,
      403,
    );
  });
  await t.test(
    "registrace dá přesně 100 mincí a žádnou roli správce",
    async () => {
      const d = await a.req("register", {
        username,
        password,
        coins: 999999,
        is_admin: true,
      });
      assert.equal(d.status, 200);
      assert.equal(d.user.coins, 100);
      assert.equal(d.user.is_admin, false);
    },
  );
  await t.test("duplicitní jméno se zamítne", async () => {
    await b.req("state");
    assert.equal(
      (await b.req("register", { username: username.toUpperCase(), password }))
        .status,
      409,
    );
  });
  await t.test("jedna denní odměna, nikoli dvě", async () => {
    const results = await Promise.all([a.req("daily", {}), a.req("daily", {})]);
    assert.deepEqual(results.map((x) => x.status).sort(), [200, 409]);
    assert.equal((await a.req("state")).user.coins, 120);
  });
  await t.test("hráč nesmí přidávat karty", async () => {
    assert.equal((await a.req("admin_create", {})).status, 403);
    assert.equal((await a.req("admin_cards")).status, 403);
  });
  if (!process.env.ONAX_TEST_ADMIN || !process.env.ONAX_TEST_PASSWORD)
    throw Error(
      "Zadej ONAX_TEST_ADMIN a ONAX_TEST_PASSWORD pro testovací databázi.",
    );
  await t.test("správce se přihlásí", async () => {
    await admin.req("state");
    const d = await admin.req("login", {
      username: process.env.ONAX_TEST_ADMIN,
      password: process.env.ONAX_TEST_PASSWORD,
    });
    assert.equal(d.status, 200);
    assert.equal(d.user.is_admin, true);
  });
  await t.test("prázdná edice blokuje nákup bez stržení mincí", async () => {
    const s = await a.req("state");
    if (s.catalog.length !== 0) return;
    const d = await a.req("buy", { key: randomUUID() });
    assert.equal(d.status, 409);
    assert.equal((await a.req("state")).user.coins, 120);
  });
  await t.test("neplatný upload se zamítne", async () => {
    const f = new FormData();
    f.set("name", "X");
    f.set("description", "X");
    f.set("rarity", "common");
    f.set(
      "image",
      new Blob(["<?php echo 1; ?>"], { type: "image/jpeg" }),
      "bad.jpg",
    );
    assert.equal((await admin.req("admin_create", f)).status, 400);
  });
  await t.test("upload obrázků všech pěti rarit", async () => {
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1kAAAAASUVORK5CYII=",
      "base64",
    );
    for (const rarity of ["common", "rare", "epic", "legendary", "mythic"]) {
      const f = new FormData();
      f.set("name", `Test ${rarity}`);
      f.set("description", "Testovací karta <script>alert(1)</script>");
      f.set("rarity", rarity);
      f.set("image", new Blob([png], { type: "image/png" }), "card.png");
      assert.equal((await admin.req("admin_create", f)).status, 200);
    }
  });
  await t.test(
    "balíček obsahuje čtyři uložené karty a stojí 10 mincí",
    async () => {
      const key = randomUUID();
      const d = await a.req("buy", { key });
      assert.equal(d.status, 200);
      assert.equal(d.cards.length, 4);
      assert.equal(d.user.coins, 110);
      owned = d.cards;
      const repeat = await a.req("buy", { key });
      assert.equal(repeat.user.coins, 110);
      assert.deepEqual(repeat.cards, d.cards);
      const inv = await a.req("inventory");
      assert.equal(inv.cards.length, 4);
    },
  );
  await t.test(
    "souběžné opakování stejného nákupu zaplatí jen jednou",
    async () => {
      const key = randomUUID();
      const ds = await Promise.all([
        a.req("buy", { key }),
        a.req("buy", { key }),
      ]);
      assert.ok(ds.every((d) => d.status === 200));
      assert.deepEqual(ds[0].cards, ds[1].cards);
      assert.equal((await a.req("state")).user.coins, 100);
      assert.equal((await a.req("inventory")).cards.length, 8);
    },
  );
  await t.test("cizí hráč nemůže prodat mou kartu", async () => {
    assert.equal(
      (await b.req("register", { username: `other_${suffix}`, password }))
        .status,
      200,
    );
    assert.equal(
      (await b.req("sell", { id: owned[0].inventory_id })).status,
      409,
    );
    assert.equal((await b.req("state")).user.coins, 100);
  });
  await t.test("prodej přidá cenu karty a nelze ho zopakovat", async () => {
    const d = await a.req("sell", { id: owned[0].inventory_id });
    assert.equal(d.status, 200);
    assert.equal(d.user.coins, 100 + owned[0].price);
    assert.equal(
      (await a.req("sell", { id: owned[0].inventory_id })).status,
      409,
    );
    assert.equal((await a.req("inventory")).cards.length, 7);
  });
  await t.test(
    "vyřazení neodstraní vlastněné karty a zastaví neúplnou edici",
    async () => {
      const list = await admin.req("admin_cards");
      const selected = list.cards.filter(
        (c) => c.rarity === "mythic" && Number(c.active),
      );
      for (const c of selected)
        assert.equal(
          (await admin.req("admin_toggle", { id: c.id })).status,
          200,
        );
      assert.equal((await a.req("buy", { key: randomUUID() })).status, 409);
      assert.equal((await a.req("inventory")).cards.length, 7);
      for (const c of selected) await admin.req("admin_toggle", { id: c.id });
    },
  );
  await t.test("po vyčerpání mincí nákup nepřidá karty", async () => {
    let s = await a.req("state");
    while (s.user.coins >= 10) {
      assert.equal((await a.req("buy", { key: randomUUID() })).status, 200);
      s = await a.req("state");
    }
    const before = (await a.req("inventory")).cards.length;
    assert.equal((await a.req("buy", { key: randomUUID() })).status, 409);
    assert.equal((await a.req("inventory")).cards.length, before);
  });
  await t.test("odhlášení a nové přihlášení uchová účet", async () => {
    await a.req("logout", {});
    assert.equal((await a.req("inventory")).status, 401);
    assert.equal(
      (await a.req("login", { username, password: "wrong-password" })).status,
      401,
    );
    assert.equal((await a.req("login", { username, password })).status, 200);
    assert.ok((await a.req("inventory")).cards.length > 0);
  });
});
