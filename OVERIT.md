# Co ověřit po přepisu do TypeScriptu

Automaticky ověřeno (typecheck, lint, 42 testů) a porovnáno s původní verzí: `-info`, `-getversions` (výstup shodný bajt po bajtu na `v6_4`, `v3_0`, `v6_X`) a barevný log aplikací.
Vše níže **nebylo spuštěno**, protože to potřebuje Gradle, docker, běžící aplikace nebo internet.

Tip: když něco selže, přidej `-verbose`. Vypíše každý příkaz, jeho složku, exit code a stack trace.

## 0. Příprava

- [ ] `npm ci` v adresáři builderu (změnil se `package-lock.json`, přibyl `tsx`).
- [ ] `node -v` je alespoň 20.11.
- [ ] `npm run typecheck && npm run lint && npm test` projde.
- [ ] Zálohovat `last.json`, ať ho případné pokusy nepřepíšou.

## 1. Kontrakt s C# runnerem (nejdůležitější)

- [ ] Spustit GUI `EgwBuilderRunner`: načte se seznam verzí (`-getversions`) i projekty, větve a prostředí (`-info`).
- [ ] V GUI zvolit pár voleb a spustit. Okno se otevře přes `cmd /C start /MAX cmd /K node index -last`.
- [ ] Po spuštění z GUI zkontrolovat `last.json`. Všechny klíče (`buildDG`, `runMR`, `initASYNC`, `testFTP`, `additionalTests`, `environmentFile`...) musí zůstat a GUI je musí po dalším otevření správně předvyplnit.
- [ ] Builder při `-last` zapisuje do `last.json` nový klíč `onlyShowResults`. Ověřit, že GUI se na něm nezasekne (Newtonsoft by ho měl ignorovat).

## 2. Změny chování, o kterých je dobré vědět

- [ ] `node index` bez argumentů vypíše nápovědu a skončí (dřív nápovědu vypsal a pak se ptal).
- [ ] Překlep v přepínači (`-buildDGG`) je chyba, ne tiché ignorování. Zkontrolovat, že žádný váš `.bat` nebo zkratka v `package.json` nepoužívá přepínač, který už neexistuje. Zrušený je `-ask`, skript `ask` je pryč z `package.json` i z `.vscode/tasks.json`.
- [ ] Žádné interaktivní otázky: UID, verze i složka se musí zadat na příkazové řádce nebo z `last.json`. Chybějící UID u init/test ukončí běh srozumitelnou chybou.
- [ ] Podpora EGW 1.x je pryč. Pokud někdy otevřete starý workspace (`v1_1`), nebude fungovat (`-Jhost=localhost`, SMTP parametry pro EMAIL).
- [ ] `-Juid` se do testů předává jen když je UID zadané (dřív se při chybějícím předal řetězec `undefined`).

## 3. Věci, kde byla změna implementace (spustit ručně)

Pro bezpečí zkoušet nejdřív na pomocném workspace nebo na `v6_4` s nepotřebnými daty.

### Build
- [ ] `node index -folder ../v6_4 -buildDG` (Gradle, `cmd /C set PATH=... & gradlew ...` se teď skládá z pole argumentů, ne z řetězce dělenými mezerami).
- [ ] `-buildMR` bez `-buildNpm`/`-buildGui` přidá `-Pno-build-client`, s nimi ne.
- [ ] `-buildMRAll` (npm ci pro uu5lib a HI, build GUI) s Node.js z `nodejs/`.
- [ ] `-buildMERGED`, pokud ho používáte (npm ci a build HI).
- [ ] `-unitTests` se `-build` spouští i testy (bez nich je `-x test`).
- [ ] `-buildIEC62325`: vytvoří se kopie DG podle `settings.gradle` (jen pro DG verze nižší než 4).

### Spuštění aplikací
- [ ] `-runDG -runMR`: otevřou se minimalizovaná okna a v nich barevný log, soubory jsou v `<root>/logs/<KOD>.log`.
- [ ] Opětovné spuštění téže aplikace předchozí instanci zabije (`killProject`: `netstat` + PowerShell s JSON výstupem + `taskkill`). Zavře se i celé okno, ne jen Java.
- [ ] `-runInSequence` čeká na health check předchozí aplikace.
- [ ] `-payloadPersistenceStrategy Azure` přidá `-DpayloadPersistenceStrategy=Azure` a docker profil `Azure`.
- [ ] **`startDetached`** (otevírání oken přes `start`) jsem testoval jen nepřímo, můj izolovaný pokus byl nerozhodný. Hlavní ověření je tedy tento bod: okna se opravdu otevřou a mají správný titulek a logy.
- [ ] `-logAsyncJob` otevře okno s logem AsyncJob (převod JSON z dockeru).

### Docker
- [ ] `-clear` zastaví a smaže compose projekty a kontejnery `egw-tests_mongo` / `egw-run-test`.
- [ ] Při `-run*` nebo `-unitTests` se spustí `docker compose --profile <strategie> up -d`. Pokud existuje `before-start.cmd`, spustí se před ním.

### Inity a testy (JMeter)
- [ ] `-init* -uid <vaše>` (DG, MR, FTP...), včetně `-initASYNC` a `-initBSg02` (čekání na porty 10090 a 10091).
- [ ] Parametry JMeteru se teď předávají jako pole, ne dělením řetězce mezerami. Cesty s mezerou jsou ošetřené uvozovkami. Ověřit alespoň jeden init a jeden test (`-testDG`, `-testFTP`).
- [ ] Při chybějící nebo přebývající vlastnosti `__P(...)` v `.jmx` se chová jako dřív (chybějící = chyba, přebývající se odstraní).
- [ ] `-tests Quick` a `-tests Web` (Selenium, při selhání otevře HTML report).
- [ ] `-results -testDG` (jen zobrazení, otestováno bez chyby).
- [ ] Souhrn na konci a soubor `logs/testResults.json`.

### Verze, metamodel, broker
- [ ] `-version 6.5.0-SNAPSHOT` přepíše verzi ve všech souborech (`uuapp.json`, `uucloud-*.json`, `build.gradle`, `metamodel-*.json`, `package.json` HI). Zkontrolovat `git diff` v repozitářích, že se změnily jen řádky s verzí a že se zachoval formát JSON.
- [ ] `-metamodel`: `egw-metamodel-generatorg01.cmd` se teď spouští přes shell. Ověřit, že se metamodel vygeneruje a změna se pozná.
- [ ] `-messageBroker kafka` přepne řádek `primaryMessageBroker.mbidUri` (`git diff`).

### Stahování nástrojů
- [ ] Nová implementace stahování je přes `fetch` (Dropbox odkazy a přesměrování). Ověřit smazáním jedné složky a spuštěním: např. `nodejs/16`, `java/17` nebo `jmeter`. Čeká se, že se stáhne, rozbalí, a dočasné `.zip` zmizí.
- [ ] `java/21` (nebo jiná verze) funguje bez `java` v PATH. `java -version` se volá absolutní cestou.

## 4. Vyzkoušet chybové stavy

- [ ] `-folder ../neexistuje`: srozumitelná zpráva, exit code 1, bez rámečku s odkazem na troubleshooting.
- [ ] Spuštění ve složce, která není EGW workspace.
- [ ] Neběžící docker při `-clear`: nepadá (chyby `compose kill/down` se ignorují).
- [ ] Neběžící aplikace při `-testDG`: po 300 s skončí chybou „Application is not ready“ s příčinou.
- [ ] Chybný výstup z příkazu: v chybě je příkaz, složka, exit code a konec `stderr`.

## 5. Úklid po ověření

- [ ] Obnovit `last.json` ze zálohy.
- [ ] Rozhodnout, zda smazat `temp.log` a `testColors.txt` (zbytky; `testColors.txt` používá `coloredGradle-test.cmd`).
- [ ] Commit (zatím nic necommitnuto). Doporučené je rozdělit na: základ (konfigurace, závislosti), `src/`, testy, dokumentace.

## 6. Známé rozdíly a nedodělky

- `npm ci` v adresáři GUI komponent se nespouští (stejně jako dřív, původní kontrola `package-lock.json` hledala špatnou cestu). Kód to komentuje v `src/steps/build.ts`.
- Rámeček s odkazem na troubleshooting je užší (původní byl zbytečně široký kvůli barevným kódům).
- Natvrdo zapsané cesty a UID v `package.json` (`../v3_0`, `12-8835-1`) zůstaly, jsou to vaše osobní zkratky.
- Balíček zůstal CommonJS kvůli lokálnímu `config.js` (`module.exports`).
