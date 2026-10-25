# Houbičky

Hra pro děti: poznáváme houby (jak se jmenují a zda jsou jedlé, nejedlé nebo jedovaté), česky i anglicky, s předčítáním nahlas. Statický web bez instalace – stačí Python 3, který na Macu i Raspberry Pi už je.

## Co ve hře je

- **Les** – úvodní obrazovka. Les se dá posouvat prstem (nebo šipkami). Klepnutí na houbičku: poskočí, řekne své skutečné jméno a otevře se kartička.
- **Kartička** – velký obrázek s očíslovanými znaky (klepnutím je hra přečte), verdikt jedlá / nejedlá / jedovatá / smrtelně jedovatá, věta „Houby sbíráme jen s dospělým“. Tlačítko s šipkami kartičku otočí na skutečnou fotku. U hub s nebezpečnou záměnou je tlačítko **Dvojník**.
- **Do košíku!** – šest hub: jedlé patří do košíku, ostatní zůstanou v lese. Houbu lze přetáhnout, nebo na ni klepnout a pak klepnout na místo. Chyba se jen vlídně opraví, prohrát nejde.
- **Houbový kvíz** – hra řekne jméno a dítě vybírá ze tří houbiček. Reproduktor jméno zopakuje.
- **Album nálepek** – nálepka přibude, když dítě houbu pozná. Zlatý rámeček znamená, že ji poprvé správně určilo v obou hrách.
- **Koutek pro rodiče** – otevře se podržením ikony rodičů vpravo nahoře po dobu 3 sekund. Obsahuje bezpečnostní větu, obtížnost (úrovně 1–3 a jejich ruční odemčení), jazyk, rychlost hlasu, zvukové efekty, autory fotografií a smazání postupu.

Na iPadu na výšku se kartička skládá pod sebe a ve hrách se zobrazí výzva „Otoč iPad na šířku“.

## Obtížnost (verze 2)

| Úroveň | Název | Houby | Obličeje ve hrách | Kvíz a košík |
|---|---|---|---|---|
| 1 | Malý houbař | jen snadné (`"level": 1` v `data/species.json`) | nálada napovídá | možnosti z různých skupin |
| 2 | Houbař | všechny | neutrální | mezi možnostmi jsou dvojníci |
| 3 | Mistr houbař | všechny | schválené skutečné fotky, jinak neutrální kresba | dvojníci a otázka „jedlá, nejedlá, nebo jedovatá?“ |

Úroveň 2 a Výprava do lesa se odemknou po 8 nálepkách (celé album úrovně 1); hra to oslaví a les se rozšíří doprava. Úroveň 3 se odemkne po 20 zlatých nálepkách získaných na úrovni 2 nebo 3. Rodič může úrovně i „Výpravu do lesa“ odemknout ručně v Rodičovském koutku. Dítě volí úroveň tlačítkem s rozetou vlevo nahoře v lese; dolů se smí vrátit kdykoli. Nastavení „obličeje bez nápověd“ z verze 1 se při prvním spuštění převede na úroveň 2.

## Výprava do lesa (verze 2)

Malý houbař s ježkem jde po lesní cestičce zleva doprava, přes kopečky a k potůčku. Podržením velké šipky „Dál“ jde, klepnutím dojde k další houbě. Houby rostou v mechu, u kamenů a u pařezů, některé jsou napůl schované. Jedlou nebo nejedlou houbu může dát do košíku, nebo nechat v lese; jedovatou nikdy nezvedne („Nesahej na mě!“). Od úrovně 2 je na cestě rozcestí (nahoru do kopce, nebo dolů k potůčku). Občas přeběhne srnka, zajíc nebo veverka. Na konci ježek projde košík: jedlé pochválí, u nejedlých vysvětlí rozdíl od dvojníka. Nikdy neřekne „špatně“.

## Beta (verze 2) vedle stabilní verze

Workflow nasazuje obě verze najednou: větev `main` na `https://<uživatel>.github.io/houbicky/`, větev `v2` na `https://<uživatel>.github.io/houbicky/beta/`. Beta má vlastní uložený postup (klíč `houbicky.beta.v1`), vlastní service worker i mezipaměť a v rohu pruh „BETA“. Postup dítěte ve stabilní verzi se tím nezmění. Všechno se odvozuje z adresy, žádný zvláštní build není potřeba.

## Spuštění na Macu

**Dvojklikem:** ve Finderu dvakrát klikněte na `start.command`. Otevře se Terminál se serverem a prohlížeč s hrou. Při prvním spuštění se macOS může zeptat, zda smí Python přijímat příchozí spojení – zvolte **Povolit** (jinak se iPad nepřipojí).

Pokud macOS soubor odmítne otevřít („nelze ověřit vývojáře“): od macOS 15 už nefunguje pravé tlačítko → Otevřít. Otevřete **Nastavení systému → Soukromí a zabezpečení**, sjeďte dolů a u hlášky o `start.command` klikněte na **Přesto otevřít**. Případně jednou v Terminálu spusťte `xattr -d com.apple.quarantine start.command`.

**Z Terminálu** (z klonu veřejného repozitáře hry):

```bash
git clone https://github.com/pavel560/houbicky ~/houbicky-hra   # jen poprvé
cd ~/houbicky-hra
python3 fetch_photos.py     # jen poprvé: stáhne fotky z Wikimedia Commons
python3 serve.py            # port 8642
python3 serve.py --port 9000 --open
```

**Aktualizace hry:** `cd ~/houbicky-hra && git pull`, potom server spusťte znovu.

Hraje se i bez Macu: https://pavel560.github.io/houbicky/ (po prvním načtení funguje offline).

Server vypíše adresy, například:

```
Na tomto počítači:  http://localhost:8642/
Na iPadu (Wi-Fi):   http://192.168.1.23:8642/
```

Ukončení: `Ctrl+C` nebo zavření okna Terminálu.

## Otevření na iPadu

1. iPad musí být ve stejné Wi-Fi síti jako Mac.
2. V Safari otevřete adresu „Na iPadu (Wi-Fi)“, kterou vypsal server (např. `http://192.168.1.23:8642/`).
3. Tlačítko **Sdílet** → **Přidat na plochu**. Hra se pak spouští jako aplikace přes celou obrazovku.
4. Hlasy: pro nejlepší češtinu stáhněte v iPadu hlas **Zuzana (vylepšený)**: Nastavení → Zpřístupnění → Předčítaný obsah → Hlasy → Čeština. Pro angličtinu stáhněte libovolný hlas pro angličtinu (Spojené království), např. Serena nebo Daniel.
5. Pokud hra mlčí, zkontrolujte, že iPad nemá ztlumený zvuk a že jste se hry alespoň jednou dotkli (iPad pustí zvuk až po prvním dotyku).

**Režim bez internetu (offline) na iPadu:** prohlížeče dovolí offline mezipaměť (service worker) jen na zabezpečené adrese (`https://…` nebo `localhost`). Přes obyčejné `http://192.168…` hra na iPadu funguje, jen potřebuje, aby běžel Mac. Pokud chcete hru i bez Macu, spusťte server s certifikátem (`python3 serve.py --cert cert.pem --key key.pem`, certifikát lze vytvořit nástrojem `mkcert`, jehož kořenový certifikát se pak musí v iPadu nainstalovat a povolit v Nastavení → Obecné → Informace → Nastavení důvěryhodnosti certifikátů).

## Stažení fotografií

Skutečné fotky hub se stahují jednorázově z Wikimedia Commons (Mac musí být online):

```bash
cd ~/houbicky/output/games/houbicky
python3 fetch_photos.py
```

Skript průběžně vypisuje každý druh (`[3/13] kozak … stahuji … hotovo 182 kB`).

**Před hraním si projděte fotky v Rodičovském koutku** (podržet ikonu rodičů 3 sekundy → „Zkontrolujte fotky“). Fotky zatím nikdo neověřil. Každou můžete skrýt; skrytou fotku dítě neuvidí. Fotky, které skript našel jen automaticky přes Wikipedii, jsou skryté, dokud je neschválíte.

- Seznam fotek je v `photos/manifest.json`. Skript uloží `photos/<id>.jpg` (šířka 1000 px) a `photos/credits.json` (autor, licence, odkaz), které hra zobrazuje v koutku pro rodiče.
- Již stažené fotky přeskočí. Vše znovu: `python3 fetch_photos.py --force`. Jen některé: `--only liska,bedla`.
- Wikimedia žádá v hlavičce User-Agent kontakt: `python3 fetch_photos.py --contact vas@email.cz` (nepovinné).
- Když fotka v Commons chybí, skript zkusí náhradní soubor (`alt`) a nakonec hlavní obrázek z anglické Wikipedie podle latinského názvu. Na konci vypíše přehled; řádky `FAILED` je třeba opravit v manifestu.
- Chyba `CERTIFICATE_VERIFY_FAILED` na Macu: spusťte jednou `Install Certificates.command` ve složce `/Applications/Python 3.x/`, nebo použijte systémový `/usr/bin/python3`.

## Hlasy

Všechno, co hra říká, je v pevném seznamu vět (`js/phrases.js`). Nahrávky jsou uložené přímo v gitu (`voice/cs/`, `voice/en/`, `voice/index.json`), takže nasazení stránky nepotřebuje žádnou hlasovou službu. Věty bez nahrávky hra řekne hlasem prohlížeče.

Nahrávky smějí pocházet jen ze služeb, které dovolují komerční užití. Hlas pro každý jazyk určuje `voice/config.json`:

- `"provider": "elevenlabs"` (čeština, hlas „Candy - Young and Sweet“ z knihovny hlasů ElevenLabs): nahrává se jen na placeném tarifu. Klíč je v tajemství repozitáře `ELEVENLABS_API_KEY` (celý klíč `sk_…`).
- `"provider": "azure"` (angličtina, hlas `en-GB-MaisieNeural` z Azure AI Speech): klíč je v tajemství `AZURE_SPEECH_KEY`, oblast v proměnné repozitáře `AZURE_SPEECH_REGION` (například `westeurope`).

Bezplatné hlasy Microsoft Edge (edge-tts) se nepoužívají, protože je Microsoft pro komerční užití nelicencuje.

**Evidence licence:** `voice/index.json` u každé nahrávky uvádí službu (`provider`), licenci (`licence`) a čas nahrání (`recorded`, UTC); `voice/config.json` u jazyka uvádí tarif a začátek licence (`licence.since`). Příkaz `python3 make_voice.py --audit` vypíše, které věty ještě nejsou nahrané licencovanou službou a kolik znaků by přenahrání stálo. Spouští ho workflow „Record voices“ (bez nálezu skončí zeleně) i nasazení stránky (jen upozorní). Doklad o tarifu (fakturu) vede provozovatel mimo tento veřejný repozitář.

**Přenahrání:** Actions → Record voices → Run workflow. Volba `force` přenahraje celý jazyk i bez změny (`en`, `cs`, `all`); bez ní se nahrají jen nové, změněné a nelicencované věty. Workflow nahrávky uloží do gitu a stránku znovu nasadí. Jazyk se přepne jen tehdy, když se podaří nahrát všechny jeho věty, takže se ve hře nikdy nemíchají dva hlasy. U ElevenLabs workflow předem ověří, že zbývá dost kreditů; jinak nenahraje nic. Jazyk, kterému chybí klíč, se nenahrává a jeho stávající nahrávky zůstanou.

Na počítači: `node dev/export_phrases.mjs` a `python3 make_voice.py` (s proměnnými prostředí uvedenými výše).

## Licence a autoři

- **Fotky:** Wikimedia Commons, licence CC BY, CC BY-SA a volné dílo. Autor, licence a odkaz na zdroj jsou u každé fotky v `photos/manifest.json` a ve hře v koutku pro rodiče. Fotky jsou zmenšené a ve hře oříznuté; jiné úpravy nemají.
- **Písma:** Andika a Grandstander, SIL Open Font License 1.1 (`fonts/LICENSE-*.txt`).
- **Hlasy:** vytvořené umělou inteligencí (ElevenLabs, Azure AI Speech), podrobnosti v části o hlasech.

## Zveřejnění na GitHub Pages (iPad v autě bez internetu)

Složka obsahuje workflow `.github/workflows/pages.yml`. Po každém pushi do větve `main` stáhne fotky a zveřejní hru na `https://<uživatel>.github.io/houbicky/`. Fotky se do gitu nepřidávají; nahrávky hlasů v gitu jsou (workflow „Record voices“).

1. Na iPadu otevřete adresu hry v Safari, chvíli počkejte a v Rodičovském koutku zkontrolujte **Připraveno na cestu: 100 %**.
2. **Sdílet → Přidat na plochu.** Pak hra funguje i v autě bez signálu.
3. Fotky, které nemají být vidět na žádném zařízení, zapište do `photos/hidden.json` (seznam id, např. `["liska"]`).

## Přesun na Raspberry Pi (volitelně)

Zkopírujte celou složku (včetně `photos/`), například:

```bash
rsync -a houbicky/ pi@raspberrypi.local:~/houbicky/
ssh pi@raspberrypi.local 'cd ~/houbicky && python3 serve.py'
```

Aby server běžel i po restartu, stačí uživatelská služba systemd (bez `sudo`):

```bash
mkdir -p ~/.config/systemd/user
printf '[Unit]\nDescription=Houbičky\n\n[Service]\nExecStart=/usr/bin/python3 %%h/houbicky/serve.py --quiet\nRestart=on-failure\n\n[Install]\nWantedBy=default.target\n' > ~/.config/systemd/user/houbicky.service
systemctl --user daemon-reload && systemctl --user enable --now houbicky
loginctl enable-linger "$USER"   # spustí službu i bez přihlášení (jednorázově, může vyžadovat sudo)
```

Na iPadu pak otevřete `http://raspberrypi.local:8642/`.

## Pro vývoj

- Testy: `python3 -m unittest discover -s tests -t .`
- Celohra v prohlížeči (Playwright, běžící server): `PLAYWRIGHT=…/playwright/index.mjs CHROME=… node dev/e2e.mjs`. Snímky obrazovek se uloží do `dev/screens/`. Fotka pro test se podvrhne jen v prohlížeči, do `photos/` se nic nezapisuje.
- Ikony aplikace se generují z obrázku hřibu: `node dev/make_icons.mjs` (se stejnými proměnnými).
- Po změně souborů hry zvyšte `VERSION` v `sw.js`, aby si iPad stáhl novou verzi. Přidání `?nosw` k adrese mezipaměť vypne a smaže.
- Moduly v `js/`: `app.js` (spuštění), `router.js` (obrazovky), `scene.js` (les a posun), `les.js`, `card.js`, `kosik.js`, `kdo.js`, `album.js`, `parents.js` (obrazovky), `assets.js` (data a obrázky), `anim.js` (pohyb postaviček), `speech.js` (předčítání), `sound.js` (zvuky z Web Audio), `store.js` (postup), `i18n.js` (texty CZ/EN), `confetti.js` (oslava), `pwa.js` (service worker).
- Písma Grandstander a Andika jsou uložena lokálně ve `fonts/` (licence SIL OFL 1.1).
