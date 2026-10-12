#!/usr/bin/env python3
"""Ukázky (v9: ElevenLabs knihovna + moje hlasy: Gemini/Vertex) českých hlasů pro Houbičky — Google Cloud Text-to-Speech + Piper + současný hlas ze hry.
Běží v GitHub Actions; klíč v tajemství GOOGLE_TTS_API_KEY. Výstup: ukazky/*.mp3 + ukazky/index.html."""
import base64, html, json, os, pathlib, re, subprocess, sys, urllib.error, urllib.parse, urllib.request

HERE = pathlib.Path(__file__).parent
TEXT = "Ahoj! Já jsem hřib smrkový a jsem jedlá houba. Podívej, na noze mám bílou síťku. Ale pozor, houby sbíráme jen s dospělým!"
KEY = os.environ.get("GOOGLE_TTS_API_KEY", "")
API = "https://texttospeech.googleapis.com/v1"
PIPER = "https://huggingface.co/rhasspy/piper-voices/resolve/main/cs/cs_CZ/jirka/medium/cs_CZ-jirka-medium.onnx"
CURRENT = "https://pavel560.github.io/houbicky/beta/voice/cs/sp.hrib-smrkovy.fact.mp3"
rows = []

def call(path, body=None):
    req = urllib.request.Request(f"{API}/{path}{'&' if '?' in path else '?'}key={KEY}",
                                 data=json.dumps(body).encode() if body else None,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)

STYLE = ("Mluv česky, vesele a hravě, jako šťastná, nadšená holčička kolem sedmi let, která kamarádce "
         "vypráví o lese. Jasně, vřele a s úsměvem v hlase.")
PROJECT = os.environ.get("GCP_PROJECT", "")

def sa_token():
    """Access token ze servisního účtu; snese JSON zkopírovaný bez vnějších složených závorek."""
    raw = os.environ.get("GCP_SA_KEY", "")
    if not raw.strip():
        return ""
    print("sa_diag prvni_znaky", [hex(ord(c)) for c in raw.strip()[:2]])
    t = (raw.replace("\u201c", '"').replace("\u201d", '"').replace("\u201e", '"')
            .replace("\u2018", "'").replace("\u2019", "'").strip().lstrip("\ufeff\u200b").strip())
    try:
        info = json.loads(t if t.startswith("{") else "{" + t.rstrip(",") + "}")
    except Exception:  # noqa: BLE001 — vytáhni jen nutná pole bez ohledu na formát
        def field(name):
            m = re.search(r'["\']?' + name + r'["\']?[\s:=]+["\']?([^"\',\s]+)', t)
            return m.group(1) if m else ""
        key = re.search(r"-----BEGIN PRIVATE KEY-----.*?-----END PRIVATE KEY-----", t, re.S)
        if not key:
            raise RuntimeError("v secretu není private key")
        info = {"type": "service_account", "client_email": field("client_email"),
                "private_key": key.group(0).replace("\\n", "\n"), "project_id": field("project_id"),
                "token_uri": field("token_uri") or "https://oauth2.googleapis.com/token"}
        if not info["client_email"]:
            em = re.search(r"[\w.-]+@[\w.-]+\.iam\.gserviceaccount\.com", t)
            pid = info["project_id"] or os.environ.get("GCP_PROJECT", "")
            info["client_email"] = em.group(0) if em else (f"houbicky-tts@{pid}.iam.gserviceaccount.com" if pid else "")
        info["project_id"] = info["project_id"] or os.environ.get("GCP_PROJECT", "")
        print("sa_diag nouzové čtení polí, client_email:", "OK" if info["client_email"] else "chybí",
              "oddělovače", sorted({repr(c) for c in t[4:12] if not c.isalnum() and c != "_"}))
    from google.oauth2 import service_account  # noqa: PLC0415
    from google.auth.transport.requests import Request  # noqa: PLC0415
    creds = service_account.Credentials.from_service_account_info(
        info, scopes=["https://www.googleapis.com/auth/cloud-platform"])
    creds.refresh(Request())
    global PROJECT
    PROJECT = PROJECT or info.get("project_id", "")
    return creds.token

try:
    TOKEN = sa_token()
    print("servisní účet:", "OK" if TOKEN else "není")
except Exception as e:  # noqa: BLE001
    TOKEN = ""; print("CHYBA servisní účet", type(e).__name__, str(e)[:200])

def post(url, body, bearer=False):
    hdr = {"Content-Type": "application/json"}
    if bearer:
        hdr.update({"Authorization": f"Bearer {TOKEN}", "x-goog-user-project": PROJECT})
    else:
        url += ("&" if "?" in url else "?") + f"key={KEY}"
    req = urllib.request.Request(url, data=json.dumps(body).encode(), headers=hdr)
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"HTTP {e.code}: {e.read().decode()[:300]}") from None

def chirp(who):
    out = HERE / f"g-{who}.mp3"
    r = post(f"{API}/text:synthesize", {"input": {"text": TEXT}, "voice": {"languageCode": "cs-CZ",
             "name": f"cs-CZ-Chirp3-HD-{who}"}, "audioConfig": {"audioEncoding": "MP3", "speakingRate": 1.05}})
    out.write_bytes(base64.b64decode(r["audioContent"])); rows.append((out.stem, f"{who} – původní (Chirp 3 HD)"))

def gemini_tts(who, model):
    out = HERE / f"h-{who}-{model}.mp3"
    r = post(f"{API}/text:synthesize", {"input": {"text": TEXT, "prompt": STYLE},
             "voice": {"languageCode": "cs-CZ", "name": who, "modelName": model},
             "audioConfig": {"audioEncoding": "MP3"}}, bearer=True)
    out.write_bytes(base64.b64decode(r["audioContent"])); rows.append((out.stem, f"{who} – Gemini ({model}), „veselá holčička“"))

def vertex(who, model):
    url = (f"https://us-central1-aiplatform.googleapis.com/v1/projects/{PROJECT}/locations/us-central1/"
           f"publishers/google/models/{model}:generateContent")
    r = post(url, {"contents": [{"role": "user", "parts": [{"text": f"{STYLE}\n\n{TEXT}"}]}],
                   "generationConfig": {"responseModalities": ["AUDIO"], "speechConfig": {
                       "voiceConfig": {"prebuiltVoiceConfig": {"voiceName": who}}}}}, bearer=True)
    part = r["candidates"][0]["content"]["parts"][0]["inlineData"]
    raw = HERE / "tmp.pcm"; raw.write_bytes(base64.b64decode(part["data"]))
    rate = re.search(r"rate=(\d+)", part.get("mimeType", "")) ; rate = rate.group(1) if rate else "24000"
    out = HERE / f"v-{who}-{model}.mp3"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "s16le", "-ar", rate, "-ac", "1", "-i", str(raw),
                    "-b:a", "96k", str(out)], check=True)
    raw.unlink(); rows.append((out.stem, f"{who} – Vertex AI ({model}), „veselá holčička“"))

def google():
    for who in ("Leda", "Despina"):
        for fn, args in ((chirp, ()), (gemini_tts, ("gemini-2.5-flash-tts",)), (gemini_tts, ("gemini-2.5-pro-tts",)),
                         (vertex, ("gemini-2.5-flash-preview-tts",)), (vertex, ("gemini-2.5-pro-preview-tts",))):
            if fn is not chirp and not TOKEN:
                continue
            try:
                fn(who, *args); print("ok", fn.__name__, who, *args)
            except Exception as e:  # noqa: BLE001
                print("CHYBA", fn.__name__, who, *args, str(e)[:400])

EL_KEY = os.environ.get("ELEVENLABS_API_KEY", "")
EL_WANT = ["Jessica", "Laura", "Alice", "Lily", "Matilda", "Charlotte"]   # mladé, veselé ženské hlasy z výchozí nabídky

def el_call(path, body=None):
    req = urllib.request.Request("https://api.elevenlabs.io/v1/" + path, data=json.dumps(body).encode() if body else None,
                                 headers={"xi-api-key": EL_KEY, "Content-Type": "application/json", "Accept": "*/*"})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return r.read()
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"HTTP {e.code}: {e.read().decode()[:300]}") from None

def elevenlabs():
    voices = json.loads(el_call("voices"))["voices"]
    print("ElevenLabs hlasy:", [v["name"].split(" ")[0] for v in voices])
    picked = [v for w in EL_WANT for v in voices if v["name"].split(" ")[0].lower() == w.lower()][:4]
    for v in picked:
        name = v["name"].split(" ")[0]
        for model, text, label in (("eleven_multilingual_v2", TEXT, "Multilingual v2"),
                                   ("eleven_v3", "[cheerfully] " + TEXT, "v3, „vesele“")):
            try:
                audio = el_call(f"text-to-speech/{v['voice_id']}?output_format=mp3_44100_64",
                                {"text": text, "model_id": model, "language_code": "cs",
                                 "voice_settings": {"stability": 0.4, "similarity_boost": 0.75, "style": 0.5}})
                out = HERE / f"e-{name}-{model}.mp3"; out.write_bytes(audio)
                rows.append((out.stem, f"ElevenLabs {name} – {label}")); print("ok el", name, model, len(audio))
            except Exception as e:  # noqa: BLE001
                print("CHYBA el", name, model, str(e)[:300])

KID_DESC = ("A cheerful, playful little girl about seven years old, speaking Czech with a clear native accent. "
            "Bright, warm, smiling, curious and excited, like telling a friend about a walk in the forest.")

def el_json(path, body=None, method=None):
    req = urllib.request.Request("https://api.elevenlabs.io/v1/" + path, method=method,
                                 data=json.dumps(body).encode() if body is not None else None,
                                 headers={"xi-api-key": EL_KEY, "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=180) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"HTTP {e.code}: {e.read().decode()[:300]}") from None

def el_say(voice_id, fn, label, model="eleven_multilingual_v2", text=TEXT):
    audio = el_call(f"text-to-speech/{voice_id}?output_format=mp3_44100_64",
                    {"text": text, "model_id": model, "language_code": "cs",
                     "voice_settings": {"stability": 0.4, "similarity_boost": 0.75, "style": 0.5}})
    (HERE / f"{fn}.mp3").write_bytes(audio); rows.append((fn, label)); print("ok", fn, len(audio))

def el_kids():
    # A) dětské dívčí hlasy ze sdílené knihovny
    seen, found = set(), []
    for q in ("child", "little girl", "kid", "young girl"):
        try:
            res = el_json("shared-voices?page_size=20&gender=female&search=" + urllib.parse.quote(q))
        except Exception as e:  # noqa: BLE001
            print("CHYBA hledání", q, str(e)[:200]); continue
        for v in res.get("voices", []):
            txt = " ".join(str(v.get(k, "")) for k in ("name", "age", "description", "descriptive", "use_case")).lower()
            if v["voice_id"] in seen or not any(w in txt for w in ("child", "kid", "girl", "little")):
                continue
            seen.add(v["voice_id"]); found.append(v)
    print("knihovna – nalezeno:", [(v.get("name"), v.get("age")) for v in found[:8]])
    for v in found[:4]:
        name = re.sub(r"[^A-Za-z0-9]+", "-", v.get("name", "hlas"))[:24].strip("-")
        try:
            added = el_json(f"voices/add/{v['public_owner_id']}/{v['voice_id']}", {"new_name": f"houbicky {name}"})
            el_say(added["voice_id"], f"c-{name}", f"ElevenLabs knihovna: {v.get('name')} (dětský hlas)")
        except Exception as e:  # noqa: BLE001
            print("CHYBA knihovna", name, str(e)[:300])
    # B) návrh hlasu podle popisu
    for path, body in (("text-to-voice/design", {"voice_description": KID_DESC, "text": TEXT, "model_id": "eleven_ttv_v3"}),
                       ("text-to-voice/create-previews", {"voice_description": KID_DESC, "text": TEXT})):
        try:
            res = el_json(path, body)
            for i, pv in enumerate(res.get("previews", [])[:3], 1):
                fn = f"d-navrh-{i}"
                (HERE / f"{fn}.mp3").write_bytes(base64.b64decode(pv["audio_base_64"]))
                rows.append((fn, f"ElevenLabs návrh hlasu „veselá sedmiletá holčička“ – varianta {i}"))
                print("ok návrh", i, pv.get("generated_voice_id"))
            break
        except Exception as e:  # noqa: BLE001
            print("CHYBA návrh", path, str(e)[:300])

def el_mine():
    """Všechny hlasy, které si rodič přidal do svého účtu (Moje hlasy), každý česky ve v2 a v3."""
    voices = [v for v in json.loads(el_call("voices"))["voices"] if v.get("category") != "premade"]
    print("moje hlasy:", [v["name"] for v in voices])
    for v in voices[:6]:
        name = re.sub(r"[^A-Za-z0-9]+", "-", v["name"])[:24].strip("-")
        for model, text, tag in (("eleven_multilingual_v2", TEXT, "Multilingual v2"), ("eleven_v3", "[cheerfully] " + TEXT, "v3 „vesele“")):
            try:
                el_say(v["voice_id"], f"m-{name}-{model}", f"Tvůj hlas {v['name']} – {tag}", model=model, text=text)
            except Exception as e:  # noqa: BLE001
                print("CHYBA můj hlas", name, model, str(e)[:300])

def el_library_page():
    """Stránka s ukázkami kandidátů z knihovny ElevenLabs (jejich vlastní preview, nestojí kredity)."""
    seen, found = set(), []
    for q in ("cartoon girl", "animated character girl", "childlike", "little girl", "kid character", "playful girl",
              "cartoon", "child"):
        for extra in ("&gender=female", ""):
            try:
                res = el_json("shared-voices?page_size=30&sort=usage_character_count_1y&search=" + urllib.parse.quote(q) + extra)
            except Exception as e:  # noqa: BLE001
                print("CHYBA hledání", q, str(e)[:200]); continue
            for v in res.get("voices", []):
                if v["voice_id"] in seen or not v.get("preview_url") or v.get("gender") == "male":
                    continue
                txt = " ".join(str(v.get(k, "")) for k in ("name", "description", "descriptive", "use_case", "category")).lower()
                if not any(w in txt for w in ("cartoon", "animat", "child", "kid", "girl", "playful", "cute", "character")):
                    continue
                seen.add(v["voice_id"]); found.append((q, v))
    found = found[:24]
    print("knihovna – kandidátů:", len(found))
    items = "".join(
        f'<li><p>{html.escape(v.get("name",""))}</p><p style="font-weight:400;font-size:14px">'
        f'{html.escape((v.get("description") or "")[:160])} · věk: {html.escape(str(v.get("age","?")))} · '
        f'přízvuk: {html.escape(str(v.get("accent","?")))}</p>'
        f'<audio controls preload="none" src="{html.escape(v["preview_url"])}"></audio></li>' for q, v in found)
    d = HERE / "knihovna"; d.mkdir(exist_ok=True)
    (d / "index.html").write_text(f"""<!doctype html><html lang="cs"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Houbičky – kandidáti z ElevenLabs</title>
<style>body{{font:17px/1.4 system-ui,sans-serif;margin:0 auto;max-width:640px;padding:16px;background:#faf3e3;color:#3b2a1a}}
ul{{list-style:none;padding:0}}li{{background:#fff;border-radius:14px;padding:12px 14px;margin:0 0 12px}}
p{{margin:0 0 6px;font-weight:600}}audio{{width:100%}}</style>
<h1>Kandidáti z knihovny ElevenLabs</h1>
<p style="font-weight:400">Ukázky jsou v originálním jazyce hlasu (většinou anglicky). Líbí-li se ti hlas, najdi ho podle jména
v ElevenLabs › Voice Library a dej „Add to my voices“. Pak ho namluvíme česky.</p><ul>{items}</ul></html>
""", encoding="utf-8")

def piper():
    model = HERE / "jirka.onnx"
    for ext in ("", ".json"):
        urllib.request.urlretrieve(PIPER + ext, str(model) + ext)
    wav = HERE / "p-piper.wav"
    subprocess.run([sys.executable, "-m", "piper", "-m", str(model), "-f", str(wav)], input=TEXT.encode(), check=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav), "-b:a", "64k", str(HERE / "p-piper.mp3")], check=True)
    for p in (wav, model, pathlib.Path(str(model) + ".json")):
        p.unlink(missing_ok=True)
    rows.append(("p-piper", "Piper „Jirka“ – zdarma a offline, mužský"))

for f in HERE.glob("*.mp3"):
    if f.name.startswith("e-"):
        n, m = f.stem[2:].split("-", 1)
        rows.append((f.stem, f"ElevenLabs {n} – {'v3, „vesele“' if m == 'eleven_v3' else 'Multilingual v2'} (dospělý hlas)"))
    else:
        f.unlink()
try:
    urllib.request.urlretrieve(CURRENT, str(HERE / "a-soucasny.mp3"))
    rows.append(("a-soucasny", "Současný hlas ve hře (Vlasta) – jiná věta, jen pro srovnání barvy hlasu"))
except Exception as e:  # noqa: BLE001
    print("CHYBA současný", e)
if EL_KEY:
    try:
        el_library_page()
    except Exception as e:  # noqa: BLE001
        print("CHYBA knihovna stránka", str(e)[:300])
    try:
        el_mine()
    except Exception as e:  # noqa: BLE001
        print("CHYBA elevenlabs", str(e)[:300])
else:
    print("ELEVENLABS_API_KEY chybí")
try:
    urllib.request.urlretrieve(CURRENT.replace("/cs/", "/en/"), str(HERE / "b-maisie.mp3"))
    rows.append(("b-maisie", "Pro srovnání: anglická Maisie ze hry (jiná věta)"))
except Exception as e:  # noqa: BLE001
    print("CHYBA maisie", e)
rows.sort()
items = "\n".join(f'<li><p>{html.escape(l)}</p><audio controls preload="none" src="{n}.mp3"></audio></li>' for n, l in rows)
(HERE / "index.html").write_text(f"""<!doctype html><html lang="cs"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Houbičky – ukázky hlasů</title>
<style>body{{font:17px/1.4 system-ui,sans-serif;margin:0 auto;max-width:640px;padding:16px;background:#faf3e3;color:#3b2a1a}}
ul{{list-style:none;padding:0}}li{{background:#fff;border-radius:14px;padding:12px 14px;margin:0 0 12px}}
p{{margin:0 0 8px;font-weight:600}}audio{{width:100%}}</style>
<h1>Ukázky hlasů</h1><p style="font-weight:400">Věta: „{html.escape(TEXT)}“</p><ul>{items}</ul></html>
""", encoding="utf-8")
