# Roll an Onax — lokální verze

Česká sběratelská hra bez účtů, hesel, PHP, MySQL a instalace. Mince, sbírka i vlastní karty se ukládají do localStorage v prohlížeči.

## Jak hrát na libovolném PC

1. Z GitHubu stáhni **[onax-local.zip](https://github.com/patriksyr/onaxgame/raw/refs/heads/main/onax-local.zip)** (případně tlačítkem Download raw file).
2. ZIP nejprve rozbal. Ve složce `onax` otevři **`index.html`** v aktuálním Firefoxu, Chrome nebo Edge. Funguje i offline, bez XAMPP a bez terminálu.
3. Dostaneš 100 Onaxcoinů a můžeš rovnou otevřít balíček. Ve hře jsou výchozí karty s označeným náhradním obrázkem. V **Karty** přidáš vlastní fotky, názvy, popisy a rarity. Původní fotografie z chatu nejsou součástí zdrojových souborů.
4. Přes ozubené kolečko vpravo nahoře zvol **Stáhnout zálohu**. Záloha obsahuje celý postup i obrázky. Na jiném PC ji nahraj přes **Obnovit zálohu**.

**Důležité:** postup není v HTML souboru ani na GitHubu. Je v konkrétním prohlížeči. Anonymní režim, smazání dat prohlížeče, změna prohlížeče nebo přesunutí/přejmenování HTML souboru mohou znamenat jinou či ztracenou uloženou hru. U `file://` se chování úložiště liší mezi prohlížeči; ponech soubor na stejném místě a pravidelně exportuj zálohu. Pokud prohlížeč ukládání blokuje, hra zobrazí chybu a neodečte mince při neúspěšném zápisu. Poškozený postup automaticky nepřepíše.

Hraj ideálně v jedné záložce. Druhá záložka na stejném originu se aktualizuje při změně úložiště, souběžné hraní ale není cílem lokální verze. Původní účty a MySQL data nejsou automaticky migrována.

## Pravidla

- Začátek: 100 OC. Balíček: 10 OC, čtyři karty, duplicity povoleny.
- Denní odměna: 20 OC jednou za kalendářní den v časovém pásmu Europe/Prague podle hodin počítače.
- Common: 60 % / prodej 1 OC; Rare: 25 % / 2 OC; Epic: 10 % / 4 OC; Legendary: 4 % / 8 OC; Mythic: 1 % / 20 OC.
- Všechny čtyři karty se uloží hned při nákupu. Obnovením stránky o ně nepřijdeš.
- V každé raritě musí být alespoň jedna aktivní karta. Výchozí kartu lze vyřadit po přidání jiné stejné rarity. Již získané kusy zůstávají ve sbírce.
- Fotky: JPG, PNG nebo WebP do 5 MB. Hra je zmenší na nejvýše 1000 px a uloží do zálohy. Velikost postupu je omezená kvůli kapacitě úložiště prohlížeče; při překročení zobrazí chybu.

Jde o lokální hru pro zábavu. Mince nemají skutečnou hodnotu. Uživatel si může upravit vlastní data či hodiny počítače; žádná serverová ochrana ani společný žebříček tu není.

## Nahrání na web / XAMPP

Pokud chceš hru na školním webu nebo přes XAMPP, nahraj pouze rozbalený `index.html` do veřejné složky. Otevři jeho adresu. Není potřeba žádný instalátor ani databáze. Každý návštěvník má svůj vlastní lokální postup. Před přechodem z lokálního souboru na web nebo před změnou adresy proveď export zálohy a na nové adrese ji importuj.

## Vývoj

Node.js 22.12+ nebo 24, npm a nástroj `zip` pro přípravu archivu:

```bash
npm ci
npm run dev
```

`npm run build` ověří TypeScript, sestaví samostatný offline `dist/index.html` a vytvoří `onax-local.zip`. Písma, JavaScript, CSS a náhradní obrázek jsou uvnitř HTML, nestahují se z internetu. Archiv neobsahuje účty, lokální postup ani testovací data.

```bash
npm test
npm run test:browser
```

Jednotkové testy ověřují ekonomiku, denní odměnu, přesné poměry rarit, zálohy, neplatné importy a chyby úložiště. Prohlížečový test po sestavení používá Chromium (`CHROMIUM_PATH`, výchozí `/usr/bin/chromium`) a otevírá skutečný `dist/index.html` přes `file://`. Není třeba spouštět PHP ani jiný server.
