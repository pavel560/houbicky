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
- U každého druhu je jedna hlavní fotka a 1–2 alternativy. Všechny jsou z Commons, „own work“, s licencí CC BY nebo CC BY-SA. Hodně fotek je od Holgera Krispa (Ulm), který má jednotný a kvalitní styl.
- Vyhnul jsem se souborům z iNaturalist a Flickru, u nichž Commons upozorňuje na nejistý stav autorských práv, a fotce *A. pantherina* od Jamese St. Johna (pravděpodobně severoamerický taxon).
- Nejméně jistá je hlavní fotka muchomůrky tygrované („Pantherpilz (Amanita pantherina).jpg“, Bildkreateur 2023), protože u ní není uvedeno místo. U muchomůrky zelené nevím, zda je na fotce vidět pochva. Obojí doporučuji zkontrolovat očima.
- Kontrola po stažení na Macu: obrázek opravdu ukazuje daný druh, celou plodnici (klobouk + třeň) a je dobře nasvícený. Jinak použít `alt`.
