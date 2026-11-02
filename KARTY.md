# Jak přidat nebo upravit Onaxe ve VS Code

Stačí změnit projekt na svém počítači a nahrát nový hotový HTML soubor. Na školním serveru nic neinstaluješ. Návštěvníci se k těmto nástrojům přes hru nedostanou.

## První otevření projektu

Otevři složku staženého **zdrojového projektu z GitHubu** ve VS Code (Soubor → Otevřít složku). Složka musí obsahovat `package.json`, `content` a `src`; samotný rozbalený herní ZIP zdrojový projekt neobsahuje.

V menu VS Code vyber **Terminál → Nový terminál**. Příkazy zadávej do tohoto terminálu, ve složce projektu:

```bash
npm ci
```

To stačí jednou po stažení projektu. Je potřeba Node.js 22.12+ nebo 24; pro vytvoření ZIPu také program `zip` (na CachyOS `sudo pacman -S zip`).

## Nová karta — doporučený postup

1. Připrav fotku **JPG, PNG nebo WebP**, ideálně do 1000 px a přibližně 100–250 kB, nejvýše 1 MB. Větší fotku nejdřív zmenši v editoru obrázků.
2. V terminálu spusť:

   ```bash
   npm run card:add
   ```

3. Pomocník se postupně zeptá na **název, popis, raritu a cestu k fotce**. Zadej jednu z rarit přesně: `common`, `rare`, `epic`, `legendary`, `mythic`. Cestu k fotce můžeš vložit z její nabídky v souborovém správci; pokud obsahuje mezery, pomocník je zvládne.
4. Pomocník zkopíruje fotku do projektu, přidělí nové ID a doplní záznam do `content/cards.json`. Fotka tak po sestavení nemusí zůstat na původním místě.
5. Pro zkoušku spusť:

   ```bash
   npm run dev
   ```

   Otevři adresu, kterou terminál vypíše. Nová karta se ukáže v indexu jako silueta. **To je správně:** hráč ji ještě nezískal. Název, popis a fotku můžeš zkontrolovat přímo v projektu; metadata jsou v `content/cards.json`, fotka v `content/images/`.

Příklad bez postupného dotazování:

```bash
npm run card:add -- --name "Vesmírný Onax" --description "Jeho příběh právě začíná." --rarity epic --image "/home/patrik/Obrázky/onax.jpg"
```

## Úprava existující karty

Ve VS Code otevři **`content/cards.json`**. Je v něm krátký čitelný záznam pro každou kartu, například:

```json
{
  "id": 16,
  "name": "Vesmírný Onax",
  "description": "Celý příběh karty.\nDalší odstavec může být na novém řádku.",
  "rarity": "epic",
  "active": 1,
  "image": "images/onax-16.jpg"
}
```

Měň `name`, `description`, `rarity` nebo cestu `image`. **Existující `id` nikdy neměň a nepoužívej ho pro jinou kartu**: podle něj si hráči pamatují objevení a vlastnictví. Nové ID přiděluje pomocník automaticky. Prodejní cenu počítá hra podle rarity.

Chceš-li kartu vyřadit z budoucích balíčků, změň `active` na **0**. **Záznam a fotku nemaž.** Zůstane v indexu jako archivní edice a majitelům ve sbírce. V každé raritě musí zůstat alespoň jedna aktivní karta. Pokud se rozhodneš starou kartu změnit na úplně jiného Onaxe, přidej ji raději jako novou s novým ID.

Po ruční úpravě pro běžící náhled spusť `npm run catalog:build`; náhled se obnoví. Při dalším sestavení nebo spuštění se katalog připraví automaticky. Neměň `src/data/default-cards.json`: jde o generovaný soubor a tvoje úpravy by se přepsaly.

## Nahrání nové verze přes FileZillu

1. Ulož změny ve VS Code a spusť:

   ```bash
   npm run build
   ```

2. Pokud příkaz vypíše chybu, oprav ji; starou fungující verzi na serveru zatím ponech. Generátor hlídá chybějící fotky, duplicitní ID i chybějící rarity. Součet katalogu s obrázky musí být pod 2,5 MB, aby zbývalo místo pro postup hráčů.
3. Ve FileZille nahraj **`dist/index.html`** přes původní HTML na stejnou adresu školního webu. Fotky už jsou uvnitř, nemusíš je zvlášť nahrávat. Zdrojové složky `content`, `src`, `scripts` ani `node_modules` na server nepatří.
4. Obnov web v prohlížeči, případně **Ctrl+Shift+R**. Hráčům zůstanou mince, sbírka a objevy; nové karty se přidají jako zamčené siluety. Před výměnou verze si pro jistotu exportuj vlastní postup.

Změny si můžeš uložit i na GitHub. Úpravy pouze na tvém PC se tam samy nenahrají.
