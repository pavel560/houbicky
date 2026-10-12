#!/usr/bin/env python3
"""Ukázky (v5.2: Gemini/Vertex) českých hlasů pro Houbičky — Google Cloud Text-to-Speech + Piper + současný hlas ze hry.
Běží v GitHub Actions; klíč v tajemství GOOGLE_TTS_API_KEY. Výstup: ukazky/*.mp3 + ukazky/index.html."""
import base64, html, json, os, pathlib, re, subprocess, sys, urllib.error, urllib.request

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
TOKEN = os.environ.get("GCP_TOKEN", "")
PROJECT = os.environ.get("GCP_PROJECT", "")

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
    f.unlink()
try:
    urllib.request.urlretrieve(CURRENT, str(HERE / "a-soucasny.mp3"))
    rows.append(("a-soucasny", "Současný hlas ve hře (Vlasta) – jiná věta, jen pro srovnání barvy hlasu"))
except Exception as e:  # noqa: BLE001
    print("CHYBA současný", e)
if KEY or TOKEN:
    google()
else:
    print("GOOGLE_TTS_API_KEY chybí – Google přeskočen")
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
