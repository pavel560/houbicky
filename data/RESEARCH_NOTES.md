# Houbičky – výzkumné poznámky (houbař-výzkumník, 11. 10. 2026)

## Metodika a omezení
- Jedlost každého druhu je ověřena z ≥ 2 zdrojů. Primární český zdroj je **Myko atlas České mykologické společnosti** (myko.cz). Doplňují ho houbareni.cz, nahouby.cz a mykologie.net, mezinárodně First Nature (UK), Woodland Trust (UK), Wild Food UK a Svampguiden (SE). Úplné URL jsou u každého druhu v `species.json → sources`.
- **Omezení prostředí:** WebFetch i curl na wikimedia.org a na české atlasy v sandboxu nefungovaly (DNS / proxy 403). Obsah stránek jsem četl jen přes vyhledávač, který vrací shrnutí stránky. Proto má každá fotka v manifestu `"verified": false`. Autor, licence, datum a místo pocházejí z textu stránky souboru na Commons, ale **na samotný obrázek se zatím nikdo nepodíval**. `fetch_photos.py` při stahování znovu přečte licenci z extmetadata Commons a nesoulad nahlásí.
- Pravidlo pro hru: žádný text nenabádá k ochutnávání ani k osahávání jedovatých druhů. U jedovatých druhů caution říká „Nesahej na ni“.

## Druhy

### hrib-smrkovy – Hřib smrkový, *Boletus edulis* Bull. – JEDLÁ
- Zdroje: Myko atlas („doporučená jedlá houba“), houbareni.cz, First Nature, Woodland Trust.
- Záměna: **hřib žlučník** (*Tylopilus felleus*). Je hořký a nejedlý, rourky mu s věkem růžoví a síťku na třeni má tmavou. Hřib smrkový má síťku bílou a rourky bílé → žluté → olivové. Ostatní hřiby ze skupiny *edulis* (dubový, borový, bronzový) jsou také jedlé.
- Pozn.: některé zdroje doporučují rozlišit žlučník ochutnáním. To ve hře **záměrně neuvádím**.

### liska – Liška obecná, *Cantharellus cibarius* Fr. – JEDLÁ
- Zdroje: Myko atlas, houbareni.cz, mykologie.net.
- Záměna: **lištička pomerančová** (*Hygrophoropsis aurantiaca*). Má pravé, husté, vidličnatě větvené oranžové lupeny, kdežto liška má tupé lišty. Lištička není nebezpečně jedovatá, ale je těžko stravitelná.

### bedla – Bedla vysoká, *Macrolepiota procera* (Scop.) Singer – JEDLÁ, s upozorněním
- Zdroje: Myko atlas („doporučená jedlá“), houbareni.cz, nahouby.cz, First Nature.
- **Nebezpečná záměna:** muchomůrka zelená a tygrovaná (myko.cz uvádí, že k těmto záměnám u bedel skutečně došlo). Bedlu poznáme podle hnědých šupin na klobouku, třeně s **hadím vzorem**, **posuvného dvojitého prstenu** a hlízovité báze **bez pochvy**. Muchomůrky mají pochvu nebo hlízu s lemem a klobouk bez šupinek (jen bílé zbytky plachetky). Malé bedly (*Lepiota*) mohou být smrtelně jedovaté. Velikost tedy hraje roli, ale ve hře ji jako pravidlo nepoužívám.

### kozak – Kozák březový, *Leccinum scabrum* (Bull.) Gray – JEDLÁ
- Zdroje: Myko atlas („výborná jedlá“), houbareni.cz, nahouby.cz, First Nature.
- Váže se na břízu. Existuje několik podobných kozáků, všechny jsou jedlé. Pro hru jsem jako záměnu zvolil žlučníka, protože je to nejčastější „hořký omyl“ u hřibovitých hub.
- Obecné upozornění: houby rodu *Leccinum* syrové nebo nedovařené mohou vyvolat nevolnost. Do hry to nepatří, ale dospělý by to měl vědět.

### kremenac – Křemenáč osikový – JEDLÁ – **taxonomie je sporná**
- Zdroje jedlosti: Myko atlas (*L. rufum*, „oblíbená a hojně sbíraná jedlá“), houbareni.cz, nahouby.cz, Wild Food UK, Svampguiden.
- **Latinské jméno – rozhodnutí: *Leccinum albostipitatum* den Bakker & Noordel. 2005.**
  - Revize den Bakker & Noordeloos (2005) rozdělila dřívější „*L. aurantiacum*“ takto: druh vázaný na osiku a topoly s **bílými šupinkami na mladém třeni** = *L. albostipitatum*. Jméno *L. aurantiacum* (Bull.) Gray se nově používá pro druh s rezavými šupinkami pod duby a jinými listnáči (dříve *L. quercinum*).
  - **Česká mykologická společnost (Myko atlas) a houbareni.cz** vedou křemenáč osikový pod jménem ***Leccinum rufum* (Schaeff.) Kreisel** a *L. albostipitatum* uvádějí jako synonymum. *L. aurantiacum* je u nich **křemenáč krvavý** (sloučený s k. dubovým).
  - **nahouby.cz** a starší literatura (i BioLib) dávají křemenáči osikovému jméno *L. aurantiacum*. Je to stav před rokem 2005.
  - Na Commons je kategorie *Leccinum albostipitatum* a novější soubory používají jméno *L. leucopodium*. Nomenklatorní prioritu *leucopodium* × *albostipitatum* jsem z dostupných zdrojů neověřil.
  - V `species.json` tedy stojí *L. albostipitatum*, mezinárodně nejčastější jméno. Pokud má hra ladit s ČMS, lze jej bez dopadu na obsah vyměnit za *L. rufum* (jde o tentýž taxon).
- Anglický název: „Aspen bolete“ (Wild Food UK, Svampguiden). „Orange birch bolete“ je *L. versipelle* (křemenáč březový), proto jsem ho nepoužil.

### suchohrib – Hřib hnědý, *Imleria badia* (Fr.) Vizzini 2014 – JEDLÁ
- Zdroje: Myko atlas („doporučená jedlá“), houbareni.cz, mykologie.net, Woodland Trust.
- Názvosloví: dříve *Xerocomus badius* (odtud „suchohřib hnědý“) a *Boletus badius*. Dnes platí *Imleria badia* a česky „hřib hnědý“. Jméno v `name.cs` je „Hřib hnědý“, id zůstává `suchohrib`.
- Záměna: žlučník (rourky nemodrají a růžoví).

### pychavka – Pýchavka obecná, *Lycoperdon perlatum* Pers. – JEDLÁ, jen mladá
- Zdroje: Myko atlas („jedlá, jen mladé plodnice s bílým vnitřkem“), nahouby.cz, houbareni.cz, First Nature.
- **Nebezpečná záměna:** mladé uzavřené plodnice („vajíčka“) **muchomůrky zelené / jízlivé** a mladé muchomůrky červené. Při podélném rozříznutí je u muchomůrky vidět obrys klobouku, lupenů a třeně, pýchavka je uvnitř homogenní a bílá. Dále je tu riziko záměny s **pestřecem** (*Scleroderma*, jedovatý, uvnitř tmavý). Jedlost je proto ve hře podmíněná a v `caution` stojí „rozhodne dospělý“.
- Pozn. pro designéra: `colors.under` = barva vnitřku (gleby) mladé plodnice, protože pýchavka nemá rourky ani lupeny.

### zlucnik – Hřib žlučník, *Tylopilus felleus* (Bull.) P. Karst. – NEJEDLÁ
- Zdroje: Myko atlas („nejedlá“), nahouby.cz, mykologie.net, First Nature.
- Není jedovatý, je extrémně hořký a hořkost vařením nezmizí (podle First Nature se ještě zesílí). Lidové názvy: hořčák, žlučák (odtud přezdívka).

### troudnatec – Troudnatec kopytovitý, *Fomes fomentarius* (L.) Fr. – NEJEDLÁ
- Zdroje: Myko atlas, houbareni.cz, nahouby.cz, First Nature.
- Je dřevnatý a víceletý. Historicky se z něj vyráběl troud, nosil ho i Ötzi (First Nature). Nemá třeň, proto `colors.stem` = tmavší hnědá báze / okraj u kmene a `under` = rourkový povrch.

### muchomurka-cervena – Muchomůrka červená, *Amanita muscaria* (L.) Lam. – JEDOVATÁ, deadly=false
- Zdroje: myko.cz (článek 173), nahouby.cz, cs.wikipedia, Woodland Trust.
- Obsahuje kyselinu ibotenovou a muscimol a působí halucinogenně. Smrtelné otravy jsou velmi vzácné (Woodland Trust: „extremely rare“, First Nature uvádí nejméně jeden doložený případ). Proto `deadly: false`, ale skupina `jedovata`.

### muchomurka-zelena – Muchomůrka zelená, *Amanita phalloides* (Vaill. ex Fr.) Link – JEDOVATÁ, deadly=true
- Zdroje: myko.cz (článek 198), houbareni.cz, cs.wikipedia, Woodland Trust, First Nature.
- Je nejjedovatější houbou Evropy a způsobuje přes 90 % smrtelných otrav (First Nature). Obsahuje amatoxiny (α-amanitin) a příznaky přicházejí se zpožděním. Ve hře by měla být nejsilněji označena.
- Záměny: bedly, holubinky (zelené), pečárky, mladé „vajíčko“ s pýchavkou.

### muchomurka-tygrovana – Muchomůrka tygrovaná, *Amanita pantherina* (DC.) Krombh. – JEDOVATÁ, deadly=true (s poznámkou)
- Zdroje: Myko atlas („prudce jedovatá“), houbareni.cz („prudce až smrtelně jedovatá“), cs.wikipedia, First Nature („deadly poisonous toadstool“, toxičnější než m. červená).
- **Sporný bod:** cs.wikipedia uvádí, že ze stovky zaznamenaných otrav nebyla žádná smrtelná, a Myko popisuje prognózu jako dobrou. Smrtelné případy jsou vzácné, ale možné (zejména u lidí s onemocněním srdce). Brief chce `deadly: true` jen pro „potenciálně smrtelné“ druhy, a to tato houba splňuje. Proto `deadly: true` ponechávám. Je-li potřeba striktnější výklad („běžně smrtelná“), změnit na `false`.
- Záměny: jedlá **muchomůrka růžovka** (*A. rubescens*) a **m. šedivka** (*A. excelsa*). Obě mají rýhovaný prsten, růžovka navíc na řezu růžoví.

### trepenitka – Třepenitka svazčitá, *Hypholoma fasciculare* (Huds.) P. Kumm. – JEDOVATÁ, deadly=false
- Zdroje: Myko atlas, nahouby.cz, cs.wikipedia, First Nature.
- Je velmi hořká. Otravy (fasciculoly) jsou obvykle zažívací, First Nature zmiňuje pravděpodobně jeden úmrtní případ v Evropě. Myko uvádí, že toxiny nejsou jednoznačně identifikovány. Druh je všeobecně veden jako jedovatý, proto `deadly: false`.
- Záměny: jedlé **václavky** (*Armillaria*), **třepenitka maková** (*H. capnoides*, na jehličnanech, lupeny šedé) a penízovka sametonohá.

## Opravy a odchylky oproti tabulce v BRIEF
1. **Skupiny:** žádnou jsem neměnil. Všech 13 zařazení odpovídá zdrojům.
2. **Křemenáč osikový:** latinské jméno je *Leccinum albostipitatum*, ne *L. aurantiacum* (viz výše). ČMS používá synonymum *L. rufum*.
3. **„Hřib hnědý (suchohřib hnědý)“:** platné jméno je *Imleria badia*. Jméno „suchohřib“ je historické (*Xerocomus badius*), v `name.cs` stojí jen „Hřib hnědý“.
4. **Muchomůrka tygrovaná `deadly: true`:** ponecháno, ale je to hraniční případ (viz výše).
5. `caution` je vyplněné u všech 13 druhů (nikde není null), aby každá karta nesla bezpečnostní nebo poznávací vzkaz.

## Fotky (photos/manifest.json)
- U každého druhu je jedna hlavní fotka a 1–2 alternativy. Všechny jsou z Commons, „own work“, s licencí CC BY nebo CC BY-SA. Hodně fotek je od jednoho fotografa z okolí Ulmu, který má jednotný a kvalitní styl (jména autorů jsou jen v manifestu kvůli licenci).
- Vyhnul jsem se souborům z iNaturalist a Flickru, u nichž Commons upozorňuje na nejistý stav autorských práv, a flickrové fotce *A. pantherina* (pravděpodobně severoamerický taxon).
- Nejméně jistá je hlavní fotka muchomůrky tygrované („Pantherpilz (Amanita pantherina).jpg“, 2023), protože u ní není uvedeno místo. U muchomůrky zelené nevím, zda je na fotce vidět pochva. Obojí doporučuji zkontrolovat očima.
- Kontrola po stažení (CI nebo lokálně): obrázek opravdu ukazuje daný druh, celou plodnici (klobouk + třeň) a je dobře nasvícený. Jinak použít `alt`.

---

# Verze 2 – 12 nových druhů, úrovně a dvojníci (11. 10. 2026)

## Metodika
Postup je stejný jako u verze 1. Jedlost každého druhu jsem ověřil z ≥ 2 zdrojů, přednostně z Myko atlasu ČMS (myko.cz) a z houbareni.cz nebo nahouby.cz, doplněných o First Nature (UK). Úplné URL jsou v `species.json → sources`. Stránky jsem opět četl jen přes vyhledávač (WebFetch na wikimedia.org ani na atlasy v sandboxu nefunguje), proto mají i nové fotky `verified: false`.
Bezpečnost: mezi jedlými druhy není žádná muchomůrka. U druhů jedlých jen po tepelné úpravě (václavka, kovář) říká `caution` dětsky „Jí se jen uvařená/uvařený. Rozhodne dospělý.“ U všech jedovatých druhů stojí „Nesahej na ni/něj“.

## Nové druhy

### vaclavka – Václavka obecná, *Armillaria mellea* (Vahl) P. Kumm. – JEDLÁ, jen uvařená
- Zdroje: Myko atlas (jedlá, tržní, tepelná úprava alespoň 30 minut), nahouby.cz, cs.wikipedia (za syrova mírně jedovatá), First Nature.
- Ve smrkových lesích ČR je nejčastější **václavka smrková** (*A. ostoyae*). Pro sběr se václavky obvykle nerozlišují, všechny se jedí jen důkladně tepelně upravené. First Nature upozorňuje, že druhy z listnáčů někteří autoři považují za podezřelé. Proto je v `caution` „rozhodne dospělý“.
- Záměna: **třepenitka svazčitá** (jedovatá, sírově žlutá, bez prstenu), dále šupinovka kostrbatá. Odtud dvojice `vaclavka ↔ trepenitka`.
- Rozpor: starší článek na myko.cz (2011) uvádí *A. mellea* s. str. v Červeném seznamu, jiný článek kategorii EN. Atlas ji vede jako běžnou tržní houbu. Pro hru to nic nemění, právní stav jsem neověřoval.

### hrib-kovar – Hřib kovář, *Neoboletus luridiformis* (Rostk.) Gelardi, Simonini & Vizzini – JEDLÝ, jen uvařený
- Zdroje: Myko atlas („doporučená jedlá“, vyžaduje delší tepelnou úpravu), houbareni.cz, nahouby.cz (min. 30 minut), cs.wikipedia (20 minut), First Nature.
- Názvosloví: dříve *Boletus erythropus* / *B. luridiformis*. Myko atlas jej vede jako *Sutorius luridiformis*, houbareni.cz a mezinárodní zdroje jako *Neoboletus luridiformis*. Ponechal jsem *Neoboletus*.
- Modrání dužniny je normální a samo o sobě neznamená jed.
- Záměna: **hřib satan** (bělavý klobouk, síťka na třeni, teplomilný, pod listnáči na vápenci), hřib koloděj (jedlý po uvaření). Dvojice `hrib-kovar ↔ hrib-satan`.

### klouzek – Klouzek sličný, *Suillus grevillei* (Klotzsch) Singer – JEDLÝ
- Zdroje: Myko atlas („doporučená jedlá“, jen pod modříny), houbareni.cz, nahouby.cz, mykologie.net, First Nature (Larch Bolete).
- Podobné klouzky pod modříny (slizký, tridentský, hnědooranžový) jsou také jedlé. Nebezpečný dvojník není, proto `twin: null`.

### ryzec – Ryzec pravý, *Lactarius deliciosus* (L.) Gray – JEDLÝ
- Zdroje: Myko atlas (skupina ryzců s oranžovým mlékem, všechny jsou jedlé), nahouby.cz, mykologie.net, First Nature (Saffron Milkcap).
- Velmi podobný je ryzec smrkový (*L. deterrimus*, jedlý). Nejedlý **ryzec kravský** (*L. torminosus*) má chlupatý okraj klobouku a bílé, pálivé mléko. Ten je zmíněn v `caution`. Ve hře není, takže `twin: null`.

### sirovec – Sírovec žlutooranžový, *Laetiporus sulphureus* (Bull.) Murrill – JEDLÝ, jen mladý
- Zdroje: Myko atlas (jedlý, dokud je dužnina měkká, „prakticky nezaměnitelný“), houbareni.cz, cs.wikipedia, First Nature (Chicken-of-the-woods).
- Upozornění pro dospělé: nesbírat z **tisu** (First Nature), u citlivých lidí může vyvolat zažívací potíže (cs.wikipedia: zvlášť s alkoholem). Sírovec horský (*L. montanus*) na jehličnanech je vzácný. Nebezpečný dvojník není, proto `twin: null`.

### lisak – Lišák zprohýbaný, *Hydnum repandum* L. – JEDLÝ
- Zdroje: Myko atlas (jedlý, tržní, sbírat mladé), houbareni.cz, cs.wikipedia, First Nature (Wood Hedgehog).
- Pod kloboukem má **ostny**, a proto ho nelze zaměnit s jedovatou houbou. Atlasy ho srovnávají s liškou, proto jednosměrně `twin: "liska"` (liška má jako dvojníka lištičku).

### kotrc – Kotrč kadeřavý, *Sparassis crispa* (Wulfen) Fr. – JEDLÝ
- Zdroje: Myko atlas (jedlý), houbareni.cz (záměna za jedovatou houbu není možná), nahouby.cz, First Nature (Wood Cauliflower).
- Pozor: **kotrč Němcův** (*S. nemecii*, na jedlích) a kotrč štěrbákový (*S. laminosa*, na listnáčích) jsou vzácné a ohrožené. Ve hře je jen kotrč kadeřavý od borovic. `twin: null`.

### hrib-satan – Hřib satan, *Rubroboletus satanas* (Lenz) Kuan Zhao & Zhu L. Yang – JEDOVATÝ, deadly=false
- Zdroje: Myko atlas (Červený seznam: zranitelný druh VU), cs.wikipedia (za syrova silně jedovatý, indolové látky se vařením nerozloží), mykologie.net, First Nature (Devil's Bolete, „poisonous“, jediný nejasný úmrtní případ).
- Je vzácný a teplomilný. Lidově se jako „satan“ označuje i hřib žlučník (houbareni.cz), což může mást. Ve hře jde o druh, který „jen pozorujeme“. Zákonná ochrana je nejasná (podle cs.wikipedia byl navržen k ochraně).

### pestrec – Pestřec obecný, *Scleroderma citrinum* Pers. – JEDOVATÝ, deadly=false
- Zdroje: Myko atlas (jedovatý), nahouby.cz, mykologie.net („Jedovatý!“), First Nature („probably poisonous“), Woodland Trust (common earthball, záměna s pýchavkou).
- Rozlišení od pýchavky: tlustá, tvrdá a šupinatá slupka (odborně okrovka, obal plodnice) a vnitřek brzy fialovočerný. Pýchavka je uvnitř bílá a měkká. Dvojice `pychavka ↔ pestrec`.
- Pozn. pro designéra: `colors.under` = barva vnitřku (teřichu) zralé plodnice.

### muchomurka-jizliva – Muchomůrka jízlivá, *Amanita virosa* Bertill. – JEDOVATÁ, deadly=true
- Zdroje: myko.cz (článek 357: otrava stejného typu jako u m. zelené), myko.cz (jedovaté houby a jejich záměny), First Nature (Destroying Angel, „deadly poisonous“).
- Je celá bílá, s bílými lupeny, prstenem a pochvou. Roste hlavně pod jehličnany, častěji v horách. Záměny: pečárky (lupeny růžovějí až hnědnou), bedla zardělá, uzavřené „vajíčko“ s pýchavkou.
- Dvojník podle briefu je `bedla` (jednosměrně). Bedla sama má jako dvojníka muchomůrku zelenou, protože tu myko.cz uvádí jako skutečnou záměnu u bedel.

## Dva vybrané NEJEDLÉ druhy (volba výzkumníka)

### listicka – Lištička pomerančová, *Hygrophoropsis aurantiaca* (Wulfen) Maire – NEJEDLÁ (nesbírá se)
- **Proč:** je to nejběžnější dvojník lišky v českém lese, hojná od léta do pozdního podzimu na zemi i tlejícím dřevě jehličnanů. Pro dítě je pár „liška ↔ lištička“ ten nejužitečnější: měkké vrásky × husté oranžové lupínky. `twin` je symetrický s `liska`.
- **Verdikt a rozpor zdrojů:** houbareni.cz „nejedlá, ke sběru se nedoporučuje“. Myko atlas: „dříve považována za mírně jedovatou, toxicita se neprokázala, většinou je považována za nejedlou nebo méně hodnotnou jedlou“. cs.wikipedia: „jedlá, ale pro riziko žaludečních potíží by se neměla jíst ve větších dávkách“. nahouby.cz: nevalná chuť, natrpklá. Shoda zdrojů je tedy „nedoporučená“, a proto skupina `nejedla`. Text hry netvrdí, že je jedovatá, jen „nesbíráme ji“.

### troudnatec-pasovany – Troudnatec pásovaný, *Fomitopsis pinicola* (Sw.) P. Karst. – NEJEDLÝ
- **Proč:** je jedním z nejhojnějších chorošů českých smrčin (roste celý rok, dítě ho uvidí na každé procházce), dobře poznatelný podle červenooranžového pásu a bílého okraje a v mládí podle „slziček“ (gutace). Myko atlas i cs.wikipedia ho uvádějí jako častou záměnu s troudnatcem kopytovitým, proto symetrický `twin` s `troudnatec`.
- **Verdikt:** jednoznačně nejedlý (Myko atlas, houbareni.cz, nahouby.cz, cs.wikipedia).
- Zvažoval jsem i jiné druhy, ale k novým jedlým druhům žádný běžný nejedlý dvojník poznatelný dítětem není. Sírovec, lišák, kotrč a klouzek takového dvojníka nemají a ryzec kravský je v ČR často veden jako jedovatý.

## Úroveň 1 – „Malý houbař“ (8 druhů)
| id | skupina | proč |
|---|---|---|
| hrib-smrkovy | jedlá | ikonický český hřib, děti ho znají z pohádek a obrázků |
| liska | jedlá | celá žlutá, tvar trychtýře, nezaměnitelná barva |
| sirovec | jedlá | zářivě žlutooranžové „poličky“ na stromě, nic podobného v lese |
| kotrc | jedlá | „kudrnatý květák / houba na nádobí“, nezaměnitelný tvar |
| troudnatec | nejedlá | „koňské kopyto na stromě“, roste celý rok |
| muchomurka-cervena | jedovatá | povinná podle briefu; červená s puntíky |
| muchomurka-zelena | jedovatá, smrtelná | nejdůležitější houba, kterou se má dítě naučit hned |
| trepenitka | jedovatá | sírově žluté trsy na pařezech, velmi hojná |

V úrovni 1 je kvíz ze tří různých skupin, takže na podobnosti dvojníků nezáleží. Rozhodují výrazné tvary a barvy a to, aby dítě hned znalo nejnebezpečnější druh. Druhy s podmíněnou jedlostí (pýchavka, václavka, kovář) a s nebezpečným dvojníkem (bedla) jsou až v úrovni 2.

## Dvojníci (`twin`)
Symetrické páry: hrib-smrkovy↔zlucnik, liska↔listicka, bedla↔muchomurka-zelena, kozak↔kremenac, pychavka↔pestrec, troudnatec↔troudnatec-pasovany, muchomurka-cervena↔muchomurka-tygrovana, trepenitka↔vaclavka, hrib-kovar↔hrib-satan.
Jednosměrné: suchohrib→zlucnik, lisak→liska, muchomurka-jizliva→bedla.
Bez dvojníka (`null`): klouzek, ryzec, sirovec, kotrc.
Pár kozák↔křemenáč tvoří dva jedlé druhy. Jde o dvojníky pro učení jmen, ne o nebezpečnou záměnu.

## Opravy a změny u druhů z verze 1
- Obsah 13 původních karet je beze změny, přibyla jen pole `level` a `twin`.
- `bedla.twin = muchomurka-zelena`. Tabulka v briefu dává jízlivé dvojníka bedlu, ale pro bedlu samotnou je podle myko.cz skutečnou záměnou muchomůrka zelená (a tygrovaná).
- V poznámkách k fotkám verze 1 jsem odstranil jména fotografů (veřejný repozitář) a zmínku o Macu (fotky teď stahuje CI). Jména autorů zůstávají jen v `photos/manifest.json`, protože licence CC BY / CC BY-SA vyžadují uvedení autora.

## Fotky verze 2 (photos/manifest.json)
- 12 nových záznamů, každý s hlavní fotkou a alternativou, všechny „own work“ s licencí CC BY, CC BY-SA nebo public domain a bez importů z iNaturalist a Flickru.
- Vyřazené kandidáty uvádím v `altNote`: václavka ze Soči (ruský popis ukazuje spíš na penízovku), *A. virosa* z Japonska (jiný taxon) a pestřec „1.jpg“ (historie souboru zmiňuje pýchavku).
- Hlavní fotka hřibu kováře je z Ukrajiny a podle popisu ukazuje i rozříznutou modrající dužninu. Hlavní fotka klouzka je z ČR (s českým popisem), alternativa troudnatce pásovaného také (PR Skočický hrad).
- Nejméně jisté: muchomůrka jízlivá (místo nálezu není uvedeno) a sírovec (bez místa). Obojí doporučuji zkontrolovat očima.

## Oprava po revizi (11. 10. 2026)
- **muchomurka-tygrovana.caution:** odstraněna zmínka o jedlé muchomůrce růžovce, protože odporovala pravidlu „muchomůrky nesbíráme“ a předčítá se při každém otevření karty. Nové znění: „Prudce jedovatá! Je hnědá s bílými tečkami. Nesahej na ni.“ / „Very poisonous! It is brown with white spots. Do not touch it.“ Ostatní texty pro dítě (fact, lookFor, where, caution, twinTell) žádnou jedlou muchomůrku nezmiňují, ověřeno skriptem. Růžovka a šedivka zůstávají jen v těchto poznámkách pro dospělé.
- **Podmíněná jedlost – jednotný konec `caution`:** všech šest podmíněně jedlých druhů končí přesně větou „Rozhodne dospělý.“ / „A grown-up decides.“: pychavka, vaclavka, hrib-kovar, sirovec, lisak a kotrc. Druhy jedlé jen po uvaření obsahují kmen „uvař“: vaclavka, hrib-kovar a nově sirovec. U pýchavky jsem sjednotil anglický konec („Grown-ups decide.“ → „A grown-up decides.“).
- **Sírovec = jen mladý a jen uvařený.** Nové znění: „Jí se jen mladý a uvařený. Rozhodne dospělý.“ Zdroje:
  - Myko atlas: jedlý, jen dokud je dužnina měkká.
  - en.wikipedia: „should not be consumed raw“, u části lidí zažívací potíže.
  - University of Florida IFAS (PP358): syrový nebo nedovařený vyvolává zažívací potíže, u některých lidí alergie.
  - MushroomExpert / Messiah University: mírné až střední zažívací potíže u části strávníků.
  - cs.wikipedia: potíže zvláště v kombinaci s alkoholem.
  - Do `sources` přibyly odkazy na en.wikipedia a UF IFAS.
- **Lišák = jen mladý** (beze změny): Myko atlas uvádí, že se sbírají pouze mladé plodnice, a cs.wikipedia, že starší jsou tuhé a štiplavé. Žádný zdroj neuvádí toxicitu za syrova, proto bez „uvař“.
- **Kotrč = jen mladý a světlý** (beze změny): First Nature uvádí, že je jedlý jen mladý a zhnědlý se vyhazuje. houbareni.cz doporučuje kvůli tuhé dužnině delší tepelnou úpravu, jde ale o kuchyňskou kvalitu, ne o jedovatost. Proto bez „uvař“.
- **Otevřený bod:** kozáky a křemenáče (*Leccinum*) mohou syrové nebo nedovařené vyvolat nevolnost. Viz poznámka u kozáka ve v1. Brief je za podmíněné druhy nepovažuje a jejich `caution` jsem neměnil. Pokud se má pravidlo „jen uvařený“ rozšířit, týkalo by se i jich.
- **Kozák a křemenáč = jen uvařený (rozhodnutí koordinátora, konzervativně kvůli dítěti).** Za stávající upozornění na dvojníka přibyla věta „Jí se jen uvařený. Rozhodne dospělý.“ / „Only eaten cooked. A grown-up decides.“ Zdroje: en.wikipedia (*Leccinum*: syrové nebo nedostatečně tepelně upravené často vyvolávají nevolnost a zvracení) a fórum UBC Botanical Garden (příspěvek mykologa: *Leccinum* nikdy nejíst syrové). Druhý zdroj je slabší (fórum). Myko atlas podmínku tepelné úpravy u těchto druhů výslovně neuvádí.
