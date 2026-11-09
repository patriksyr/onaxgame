# Roll an Onax — Universe Edition

Česká offline sběratelská hra. Bez účtů a databáze; mince, sbírka a objevy se ukládají v prohlížeči. Katalog vydává pouze autor webu ze zdrojového projektu. Veřejný web nemá vytváření, úpravy, vyřazování ani import katalogu.

## Spuštění a aktualizace

Stáhni **[onax-local.zip](https://github.com/patriksyr/onaxgame/raw/refs/heads/main/onax-local.zip)**, rozbal ho a otevři `onax/index.html`. Na školní server nahraj pouze `index.html` z tohoto archivu, případně `dist/index.html` ze svého sestavení. Zachovej původní adresu webu. Není potřeba PHP, MySQL ani XAMPP.

**Před aktualizací exportuj zálohu** přes ozubené kolečko. Uložené mince a sbírka se zachovají, staré ceny se přepočtou na nové a vlastněné oficiální karty se označí jako objevené. Starší verze nesledovala už prodané karty: tyto dávno prodané objevy nelze zpětně zjistit. Od této verze objevení zůstává i po prodeji. Dříve vytvořené osobní karty zůstanou archivními kusy ve sbírce, ale nevstupují do veřejného katalogu ani losování.

Obnovení zálohy přenáší postup, nikoli vlastní katalog. Vždy platí oficiální karty z aktuálního vydání. Nové oficiální karty se po aktualizaci objeví automaticky jako neobjevené. Zachovávej jejich ID; pravidla pro autora jsou v **[KARTY.md](KARTY.md)**.

Postup patří konkrétnímu prohlížeči a adrese webu. Smazání jeho dat, anonymní režim, přesun HTML nebo změna adresy může data odstranit či zpřístupnit jiný postup. Pravidelně exportuj zálohu. Hraj ideálně v jedné záložce.

## Balíčky a ekonomika

Začínáš se **100 OC**, denní odměna je **50 OC**, jednou za kalendářní den v pásmu Europe/Prague podle hodin počítače.

| Balíček |  Cena | Common | Rare | Epic | Legendary | Mythic |
| ------- | ----: | -----: | ---: | ---: | --------: | -----: |
| Origins | 25 OC |   60 % | 25 % | 10 % |       4 % |    1 % |
| Boost   | 40 OC |   35 % | 35 % | 20 % |       8 % |    2 % |
| Elite   | 67 OC |   10 % | 25 % | 40 % |      20 % |    5 % |
| Apex    | 85 OC |    0 % | 10 % | 40 % |      35 % |   15 % |

Prodej: **Common 25 / Rare 30 / Epic 40 / Legendary 100 / Mythic 150 OC**. Common se prodá přesně za cenu Origins, takže s ním můžeš vždy točit dál. Průměrná prodejní hodnota úlovku je 32 / 38,25 / 53,5 / 76,5 OC podle typu balíčku: Origins se neprodělá, dražší balíčky jsou sázka.

Otevři **1, 2 nebo 4 stejné balíčky současně**. Každý obsahuje jednoho Onaxe, duplicity jsou možné a karty stejné rarity mají stejnou šanci. Nákup se uloží celý před animací; nedostatek peněz nebo chyba úložiště nestrhne část platby. Všechny pásy běží zároveň. Legendary a Mythic jsou skryté za stejnou zlatou ikonou a mají jedno společné slavnostní odhalení. Systémové nastavení omezeného pohybu zkrátí animace.

Výsledky umožňují prodat jednotlivé kusy, všechny zbývající nebo prodat a točit znovu. Zavření křížkem, Escape či kliknutím mimo nechá neprodané karty ve sbírce.

## Plinko

Záložka **Plinko**: vsaď 5, 10, 25 nebo 50 OC a pusť 1, 5 nebo 10 kuliček najednou přes 8 řad kolíků (další můžeš pouštět, i když ostatní ještě padají). Přihrádky násobí sázku **10× / 3× / 1,4× / 0,7× / 0,4× / 0,7× / 1,4× / 3× / 10×** (výhra se zaokrouhluje dolů). Okraje jsou vzácné (1 : 256), průměrná návratnost je asi 98,8 %. Výsledek se uloží dřív, než kulička dopadne.

## Vylepšení karet

Máš-li **3 stejné kusy** Onaxe, můžeš je obětovat za šanci na náhodného Onaxe o raritu výš: Common → Rare **20 %**, Rare → Epic **15 %**, Epic → Legendary **10 %**, Legendary → Mythic **5 %**. Při neúspěchu jsou všechny 3 kusy pryč. Mythic vylepšit nejde. Tlačítko je u karty ve sbírce i v jejím detailu. Otevře kolo štěstí: barevná výseč odpovídá šanci, a když v ní ručička skončí, vylepšení vyšlo.

## Sbírka a index

Ve **sbírce** klikni na kartu pro její velké zobrazení, celý popis, raritu, cenu a počet vlastněných kusů. Veřejné **Karty** jsou index: neobjevení Onaxové mají siluetu a raritu, po prvním získání se odkryjí natrvalo. Detail je dostupný i z objevené položky indexu.

Hra je lokální zábava, ne zabezpečená soutěž. Návštěvník s technickými znalostmi může změnit vlastní data v prohlížeči; neovlivní tím jiné hráče ani soubory serveru. Skutečná ochrana peněz či společný žebříček by vyžadovaly backend. Mince nemají skutečnou hodnotu.

## Vývoj

Node.js 22.12+ nebo 24, npm a `zip`:

```bash
npm ci
npm run dev
```

Katalog upravuj v `content/cards.json`, fotky patří do `content/images/`. Výchozí fotky jsou součástí projektu. Pomocník `npm run card:add` přidá další. `npm run catalog:build` obnoví generovaný manifest pro běžící Vite; `dev`, `build` i `test` ho připraví automaticky před spuštěním.

```bash
npm test
npm run build
npm run test:browser
```

Sestavení vytvoří samostatný offline `dist/index.html` a `onax-local.zip`. JavaScript, CSS, písma a obrázky jsou uvnitř HTML. Generovaný `src/data/default-cards.json` se necommituje. Testy ověřují šance všech balíčků, atomické nákupy a prodeje, objevování, migraci záloh, autoritativní katalog, chyby úložiště a autorského pomocníka. Prohlížečový test používá Chromium (`CHROMIUM_PATH`, výchozí `/usr/bin/chromium`) a skutečné `file://` bez serveru.
