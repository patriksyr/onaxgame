# Roll an Onax

Česká sběratelská hra pro PHP 8.2+ a MySQL 8 / MariaDB 10.6+. TypeScript, Vite a GSAP se používají při sestavení; školní server Node.js nepotřebuje.

## Co umí

Registrace a přihlášení přes jméno/heslo, 100 počátečních mincí, 20 mincí denně (kalendářní den Europe/Prague), balíček čtyř karet za 10 mincí, odhalování karet, sbírka, prodej a administrace s nahráváním obrázků. Rarity: Common 60 % / 1 OC, Rare 25 % / 2 OC, Epic 10 % / 4 OC, Legendary 4 % / 8 OC, Mythic 1 % / 20 OC. Každý slot se losuje samostatně; duplicity jsou možné. V rámci rarity mají aktivní karty stejnou šanci.

Mince jsou pouze herní a nelze je koupit ani směnit za skutečné peníze. Průměrná prodejní hodnota celého balíčku je 8,08 OC, cena 10 OC.

## Lokální vývoj

1. `npm ci` (Node.js 22.12+ nebo 24).
2. Připrav MySQL/MariaDB databázi s UTF-8. Zkopíruj `app/config.example.php` jako `app/config.local.php`, doplň lokální přístup a `secure_cookies => false` pro HTTP. Nastav dlouhý náhodný `setup_token` (např. výstup `openssl rand -hex 32`). Hodnoty nikam necommituj.
3. `php -S 127.0.0.1:8080 -t public` (rozšíření pdo_mysql, mbstring, fileinfo).
4. Otevři lokální `/setup.php`, zadej instalační klíč a vytvoř správce. Instalátor funguje jen v prázdné databázi. Po instalaci odstraň klíč.
5. `npm run dev` — Vite proxy předává API a uploady PHP serveru.
6. Přihlas se správcem a v **Správa** nahraj alespoň jednu kartu každé z pěti rarit. Dokud některá chybí, nákupy jsou blokované bez stržení mincí. Vizuální ukázky na úvodu nejsou skutečné karty a nelosují se.
7. `npm run build` (vyžaduje také nástroj `zip`) vytvoří `dist/` a složku `release/onax/` k nahrání. `npm test` provede integrační testy, pokud běží testovací backend popsaný níže.

Uživatelské fotografie z konverzace nejsou automaticky dostupné jako soubory v repozitáři. Nahraj je v administraci, například Onax Original / Common, Onax Neko / Rare, Onax Supreme / Epic, Onax Samurai / Legendary. Pro Mythic lze stejnou fotku použít znovu s jiným názvem. Efekt se řídí zvolenou raritou. Ikona OC je zatím vlastní stylizovaný symbol; dodaný obrázek mince se automaticky nezískal z chatu.

## Nahrání na školní server přes FileZillu

**Nejjednodušší cesta:** stáhni z GitHubu soubor `onax-filezilla.zip` přes tlačítko Download raw file, rozbal ho a nahraj složku `onax`. Archiv obsahuje sestavený web, PHP backend a příklad konfigurace; nemusíš instalovat Node.js. Potom pokračuj konfigurací databáze v kroku 4.

1. Ověř PHP **8.2+**, rozšíření **pdo_mysql, mbstring, fileinfo**, MySQL/MariaDB a HTTPS. Pro uploady je potřeba alespoň `upload_max_filesize=5M` a `post_max_size=8M`. Doporučujeme Apache s povoleným `.htaccess`; při jiném serveru musí správce zakázat prohlížení složky `app` a spouštění skriptů v `uploads`.
2. Vytvoř databázi přes školní panel/phpMyAdmin, případně použij přidělenou. Zjisti host, název databáze, jméno a heslo. Přihlašovací údaje zadávej jen do lokální konfigurace na serveru.
3. Spusť `npm ci` a `npm run build`. Přes FileZillu nahraj **celou složku `release/onax`**, včetně skrytých `.htaccess` souborů. Zachovej sourozenecké složky `onax/app` a `onax/public`. Web otevřeš na `/onax/public/`. Pokud lze nastavit document root, směruj jej přímo na `onax/public` a `app` ponech mimo veřejný kořen.
4. Na serveru vytvoř `onax/app/config.local.php` podle příkladu. Nastav databázi, `secure_cookies => true` a jednorázový dlouhý náhodný instalační klíč. Příklad konfigurace je součást balíčku. Nezveřejňuj skutečnou konfiguraci na GitHubu.
5. Otevři přes **HTTPS** `/onax/public/setup.php`, zadej instalační klíč a vytvoř účet správce s dlouhým heslem. Použij prázdnou databázi. Instalace vytváří tabulky bez prefixu. Pokud instalace selže uprostřed, oprav příčinu podle PHP logu; nepoužívej instalátor na databázi s hráčskými daty.
6. V konfiguraci nastav `setup_token => ''` a ze serveru smaž `setup.php`. Opakované použití je navíc blokované existující tabulkou uživatelů.
7. Zajisti zápis PHP do `public/uploads` podle nastavení školního serveru. Nepoužívej bez rozmyslu oprávnění 777. Nahraj karty všech rarit a zkus registraci, denní odměnu, nákup a prodej.
8. Pravidelně zálohuj **databázi, `public/uploads` a konfiguraci**. Git obsahuje kód, nikoli živé účty a fotky. Při aktualizaci nepřepisuj/smaž konfiguraci ani existující uploady. Nové sestavení neobsahuje nahrané karty; FileZilla nesmí při synchronizaci mazat vzdálené soubory navíc.

## Bezpečnost a pravidla

Hesla jsou hashovaná přes PHP password_hash. API používá session cookie HttpOnly/SameSite, CSRF tokeny, parametrizované SQL a serverovou kontrolu správcovské role. Autentizační požadavky jsou omezené na 30 za 15 minut na IP (ve školní síti je limit sdílený). Obrázky: JPG/PNG/WebP do 5 MB a do 6000 px, ověření obsahu, náhodný název, zákaz skriptů ve složce uploadů.

Nákup i prodej jsou databázové transakce se zamykáním zůstatku; nákup má unikátní klíč proti dvojímu zaplacení při opakování požadavku. Při obnovení stránky jsou všechny koupené karty už ve sbírce. Zůstatek ani výsledek losování neposílá klient. Vyřazení karty ovlivní budoucí losování a nesmaže ji ze sbírek.

Obnova zapomenutého hesla přes e-mail a resetovací UI nejsou součástí první verze (účty nemají e-mail). Správce databáze může nastavit nový hash ručně. Počítej s tím před veřejným spuštěním. Neexistuje platba skutečnými penězi ani obchodování mezi hráči.

## Integrační testy

`tests/api.test.mjs` testuje skutečné PHP API a MySQL/MariaDB: registraci, CSRF, denní odměnu, správu karet, nákup, opakovaný nákup, prodej, cizí vlastnictví a přihlášení. Běží nad novou testovací databází. Parametry `ONAX_TEST_URL`, `ONAX_TEST_ADMIN`, `ONAX_TEST_PASSWORD` nastav jen pro testovacího správce. Testy vytvářejí a mění testovací data; nikdy je nespouštěj proti produkci.

Pro prohlížečové ověření: `npm run test:browser`. Vyžaduje Chromium (`CHROMIUM_PATH`, výchozí `/usr/bin/chromium`), backend na portu 8080 a `.test-data/admin.json` s účtem **testovacího** správce. Test zaregistruje nové hráče a nakupuje/prodává karty.
