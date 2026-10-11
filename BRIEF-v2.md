# Houbičky v2 — společný brief (kontrakt mezi agenty)

Veřejný repozitář: žádná jména, e-maily ani odkazy na soukromé repozitáře. Hráč = „dítě (5–6 let, Year 1,
čeština doma, angličtina ve škole)“.

## Cíl verze 2
1. **25 druhů hub** (dnes 13). Nové druhy přednostně jako dvojice „jedlá ↔ jedovatá/nejedlá“.
2. **Tři úrovně obtížnosti** pro celou hru.
3. **Nová hra „Výprava do lesa“** — 3D les, procházení po cestičce, sbírání do košíku. Odemkne se až po
   poznávání (výchozí: 8 nálepek; rodič může odemknout ručně).

Verze 1 dál běží beze změny na `https://pavel560.github.io/houbicky/`. Verze 2 se vyvíjí ve větvi `v2`
a nasazuje na `https://pavel560.github.io/houbicky/beta/` s **odděleným** uloženým postupem (jiný klíč v
localStorage, vlastní service worker scope), aby se dítěti nesmazal ani nesmíchal postup z verze 1.

## Bezpečnostní zásady (beze změny + doplnění)
- Aplikace nikdy nenaznačí, že dítě smí houbu samo sníst, ochutnat nebo o jedlosti rozhodnout.
  „Houby sbíráme jen s dospělým. Co se smí jíst, vždycky rozhodne dospělý, který houbám opravdu rozumí.“
- Jedlost každého nového druhu ověřena z ≥ 2 seriózních zdrojů (přednostně myko.cz + houbareni.cz/nahouby.cz).
- **Muchomůrky učíme jako celek „nesbíráme“.** Proto žádná jedlá muchomůrka (např. růžovka) mezi jedlými druhy.
- Druhy jedlé jen po tepelné úpravě (václavka, kovář): `caution` to řekne dětsky („Jí se jen uvařená. Rozhodne dospělý.“).
- Ve „Výpravě“ nikdy neodměňovat sebrání jedovaté houby; jedovaté a smrtelně jedovaté se nesbírají vůbec
  (klepnutí → postavička varuje „Nesahej na mě!“, žádné zvednutí).

## Druhy — 12 nových (id jsou kontrakt)
| id | česky | group | dvojník |
|---|---|---|---|
| vaclavka | Václavka obecná | jedla (jen uvařená) | trepenitka |
| hrib-kovar | Hřib kovář | jedla (jen uvařená, modrá na řezu) | hrib-satan |
| klouzek | Klouzek sličný (pod modříny) | jedla | — |
| ryzec | Ryzec pravý | jedla | — |
| sirovec | Sírovec žlutooranžový (na stromech) | jedla | — |
| lisak | Lišák zprohýbaný (ostny pod kloboukem) | jedla | — |
| kotrc | Kotrč kadeřavý | jedla | — |
| hrib-satan | Hřib satan | jedovata | hrib-kovar |
| pestrec | Pestřec obecný | jedovata | pychavka |
| muchomurka-jizliva | Muchomůrka jízlivá | jedovata, deadly=true | bedla |
| *(výzkumník vybere)* | 2 běžné **nejedlé** druhy českého podzimního lesa, dobře poznatelné dítětem | nejedla | ideálně dvojník k jedlé |

Výzkumník smí kterýkoli druh vyměnit jen s písemným zdůvodněním v `data/RESEARCH_NOTES.md` a **musí to
nahlásit hned** (designér kreslí podle této tabulky souběžně).

## Úrovně obtížnosti (kontrakt pro designéra a programátora)
| úroveň | název CZ / EN | druhy | tváře | kvíz / košík |
|---|---|---|---|---|
| 1 | Malý houbař / Little forager | 8 snadných (designér+výzkumník je označí `"level": 1`) | nálada napovídá | 3 možnosti z různých skupin |
| 2 | Houbař / Forager | všech 25 | neutrální | dvojníci jako možnosti |
| 3 | Mistr houbař / Master forager | všech 25 | jen skutečné fotky (kde jsou schválené), jinak neutrální kresba | dvojníci + otázka „jedlá/nejedlá/jedovatá“ |
Odemčení: úroveň 2 po 8 nálepkách, úroveň 3 po zlatém albu úrovně 2 (designér navrhne přesně); rodič může odemknout.
Do `data/species.json` přibude pole `"level": 1|2` (minimální úroveň, na které se druh objeví).

## „Výprava do lesa“ — rámec
- 3D les ve stylu **papírového divadla**: vrstvené 2D malované prvky (stromy, kapradí, listí, postavičky hub)
  jako billboardy ve 3D prostoru → sedí na storybookový styl, levné pro iPad, funguje offline.
- Ovládání bez joysticku: klepnutí = krok po cestičce (nebo šipka „dál“), klepnutí na houbu = zvednout/varování,
  rozhodnutí košík / nechat. Jedno kolo ≈ 3–4 minuty, 8–10 hub, část schovaná v listí/u pařezů.
- Konec: průvodce (zvířátko, designér navrhne) projde košík a pochválí / vysvětlí chybu (hlasem).
- Výkon: 60 fps na iPadu 9. gen. nebo novějším cílem, 30 fps minimum; `prefers-reduced-motion` = bez pohupování kamery.
- Technika: three.js vendorovaný z npm do `vendor/` (žádné CDN), ES moduly.

## Struktura souborů v2 (kontrakt)
- VÝZKUMNÍK: `data/species.json` (rozšířit, pole `level`, `twin`), `data/RESEARCH_NOTES.md`, `photos/manifest.json`.
- DESIGNÉR: `design/DESIGN-v2.md`, rozšíření `design/build_art.py` → `art/<nové id>.svg` (stejný kontrakt
  skupin/kotev jako v1), `art/vyprava/*` (vrstvy lesa, cestička, průvodce), odznaky úrovní do `art/ui-icons.svg`.
- PROGRAMÁTOR: vše ostatní (`js/`, `css/`, `sw.js`, `vendor/`, `.github/workflows/pages.yml`, testy).

Hlasy a fotky generuje CI (workflow), do gitu se necommitují. Každá nová mluvená věta musí být v katalogu
`js/phrases.js` (nic se neskládá za běhu).
