#!/usr/bin/env python3
"""Ukázky (v3) českých hlasů pro Houbičky — Google Cloud Text-to-Speech + Piper + současný hlas ze hry.
Běží v GitHub Actions; klíč v tajemství GOOGLE_TTS_API_KEY. Výstup: ukazky/*.mp3 + ukazky/index.html."""
import base64, html, json, os, pathlib, subprocess, sys, urllib.request

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

def google():
    voices = sorted(call("voices?languageCode=cs-CZ")["voices"], key=lambda v: v["name"])
    print("české hlasy:", [v["name"] for v in voices])
    for i, v in enumerate(voices, 1):
        name, gender = v["name"], v.get("ssmlGender", "")
        variants = [("", 0.92, 0.0)]
        if gender == "FEMALE" and ("Chirp" not in name):
            variants.append((" – vyšší a veselejší", 0.97, 3.0))
        for suffix, rate, pitch in variants:
            cfg = {"audioEncoding": "MP3", "speakingRate": rate}
            if "Chirp" not in name:
                cfg["pitch"] = pitch
            try:
                out = call("text:synthesize", {"input": {"text": TEXT},
                           "voice": {"languageCode": "cs-CZ", "name": name}, "audioConfig": cfg})
                fn = f"g{i:02d}{'b' if suffix else 'a'}-{name}"
                (HERE / f"{fn}.mp3").write_bytes(base64.b64decode(out["audioContent"]))
                kind = "žena" if gender == "FEMALE" else "muž" if gender == "MALE" else gender.lower()
                rows.append((fn, f"Google {name} ({kind}){suffix}"))
                print("ok", fn)
            except Exception as e:  # noqa: BLE001
                print("CHYBA", name, str(e)[:120])

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
if KEY:
    google()
else:
    print("GOOGLE_TTS_API_KEY chybí – Google přeskočen")
try:
    piper()
except Exception as e:  # noqa: BLE001
    print("CHYBA piper", e)
rows.sort()
items = "\n".join(f'<li><p>{html.escape(l)}</p><audio controls preload="none" src="{n}.mp3"></audio></li>' for n, l in rows)
(HERE / "index.html").write_text(f"""<!doctype html><html lang="cs"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Houbičky – ukázky hlasů</title>
<style>body{{font:17px/1.4 system-ui,sans-serif;margin:0 auto;max-width:640px;padding:16px;background:#faf3e3;color:#3b2a1a}}
ul{{list-style:none;padding:0}}li{{background:#fff;border-radius:14px;padding:12px 14px;margin:0 0 12px}}
p{{margin:0 0 8px;font-weight:600}}audio{{width:100%}}</style>
<h1>Ukázky hlasů</h1><p style="font-weight:400">Věta: „{html.escape(TEXT)}“</p><ul>{items}</ul></html>
""", encoding="utf-8")
