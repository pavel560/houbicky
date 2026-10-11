# Houbičky

Hra pro děti: poznáváme houby (jak se jmenují a zda jsou jedlé, nejedlé nebo jedovaté), česky i anglicky, s předčítáním nahlas. Statický web bez instalace – stačí Python 3, který na Macu i Raspberry Pi už je.

## Co ve hře je

- **Les** – úvodní obrazovka. Les se dá posouvat prstem (nebo šipkami). Klepnutí na houbičku: poskočí, řekne své skutečné jméno a otevře se kartička.
- **Kartička** – velký obrázek s očíslovanými znaky (klepnutím je hra přečte), verdikt jedlá / nejedlá / jedovatá / smrtelně jedovatá, věta „Houby sbíráme jen s dospělým“. Tlačítko s šipkami kartičku otočí na skutečnou fotku. U hub s nebezpečnou záměnou je tlačítko **Dvojník**.
- **Do košíku!** – šest hub: jedlé patří do košíku, ostatní zůstanou v lese. Houbu lze přetáhnout, nebo na ni klepnout a pak klepnout na místo. Chyba se jen vlídně opraví, prohrát nejde.
- **Houbový kvíz** – hra řekne jméno a dítě vybírá ze tří houbiček. Reproduktor jméno zopakuje.
- **Album nálepek** – nálepka přibude, když dítě houbu pozná. Zlatý rámeček znamená, že ji poprvé správně určilo v obou hrách.
- **Koutek pro rodiče** – otevře se podržením ikony rodičů vpravo nahoře po dobu 3 sekund. Obsahuje bezpečnostní větu, úroveň 2 (obličeje bez nápověd, ve výchozím stavu vypnuto), jazyk, rychlost hlasu, zvukové efekty, autory fotografií a smazání postupu.

Na iPadu na výšku se kartička skládá pod sebe a ve hrách se zobrazí výzva „Otoč iPad na šířku“.

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

## Hlasy (nahrané neuronové hlasy)

Všechno, co hra říká, je v pevném seznamu vět (`js/phrases.js`). Věty lze předem nahrát přirozenými hlasy Microsoftu (česky Vlasta, anglicky dětský hlas Maisie) přes balíček `edge-tts` (zdarma, bez klíče, potřebuje internet):

```bash
pip3 install edge-tts
node dev/export_phrases.mjs     # seznam vět → voice/phrases.json
python3 make_voice.py           # nahraje jen nové nebo změněné věty → voice/cs/*.mp3, voice/en/*.mp3
```

Skript průběžně vypisuje každou větu. Když se text věty změní (např. v `data/species.json`), stačí oba příkazy spustit znovu; nahraje se jen to, co se změnilo. Věty bez nahrávky hra řekne hlasem prohlížeče. Rychlost hlasu se nastavuje v Rodičovském koutku.

## Zveřejnění na GitHub Pages (iPad v autě bez internetu)

Složka obsahuje workflow `.github/workflows/pages.yml`. Po každém pushi do větve `main` stáhne fotky, nahraje hlasy a zveřejní hru na `https://<uživatel>.github.io/houbicky/`. Fotky ani nahrávky se do gitu nepřidávají.

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
