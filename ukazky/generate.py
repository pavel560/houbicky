#!/usr/bin/env python3
"""Ukázky (v4: dětský hlas) českých hlasů pro Houbičky — Google Cloud Text-to-Speech + Piper + současný hlas ze hry.
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

STYLE = ("Read this in Czech, cheerfully and playfully, like a happy, excited little girl of about seven "
         "telling her friend about the forest. Bright, warm and smiling.")

def synth(voice, cfg, text=TEXT, prompt=None):
    body = {"input": {"text": text}, "voice": voice, "audioConfig": cfg}
    if prompt:
        body["input"]["prompt"] = prompt
    return base64.b64decode(call("text:synthesize", body)["audioContent"])

def shift(src, dst, ratio):
    # vyšší hlas, stejné tempo: asetrate zvýší výšku i tempo, atempo vrátí tempo zpět
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(src), "-af",
                    f"asetrate=24000*{ratio},aresample=24000,atempo={1/ratio:.4f}", "-b:a", "96k", str(dst)], check=True)

def google():
    for i, who in enumerate(["Leda", "Despina"], 1):
        base = HERE / f"g{i}a-{who}.mp3"
        try:
            base.write_bytes(synth({"languageCode": "cs-CZ", "name": f"cs-CZ-Chirp3-HD-{who}"},
                                   {"audioEncoding": "MP3", "speakingRate": 1.05, "sampleRateHertz": 24000}))
            rows.append((base.stem, f"{who} – původní (Chirp 3 HD)"))
            for tag, ratio, label in (("b", 1.19, "o 3 půltóny výš (mladší)"), ("c", 1.30, "o 4,5 půltónu výš (holčička)")):
                out = HERE / f"g{i}{tag}-{who}.mp3"
                shift(base, out, ratio); rows.append((out.stem, f"{who} – {label}"))
            print("ok", who)
        except Exception as e:  # noqa: BLE001
            print("CHYBA chirp", who, str(e)[:200])
        try:
            out = HERE / f"g{i}d-{who}-gemini.mp3"
            out.write_bytes(synth({"languageCode": "cs-CZ", "name": who, "modelName": "gemini-2.5-flash-tts"},
                                  {"audioEncoding": "MP3"}, prompt=STYLE))
            rows.append((out.stem, f"{who} – Gemini, styl „veselá holčička“"))
            out2 = HERE / f"g{i}e-{who}-gemini-vys.mp3"
            shift(out, out2, 1.19); rows.append((out2.stem, f"{who} – Gemini „veselá holčička“ + o 3 půltóny výš"))
            print("ok gemini", who)
        except Exception as e:  # noqa: BLE001
            print("CHYBA gemini", who, str(e)[:300])

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
