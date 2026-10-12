#!/usr/bin/env python3
"""Ukázky (v2) českých hlasů pro Houbičky (běží v GitHub Actions; výstup ukazky/*.mp3 + ukazky/index.html)."""
import asyncio, html, pathlib, subprocess, sys, urllib.request
import edge_tts

HERE = pathlib.Path(__file__).parent
TEXT = "Ahoj! Já jsem hřib smrkový a jsem jedlá houba. Podívej, na noze mám bílou síťku. Ale pozor, houby sbíráme jen s dospělým!"
EN = "Hello! I am a penny bun, and I am an edible mushroom. Look, I have a white net on my stem!"
EDGE = [  # (soubor, popis, hlas, rate, pitch, text)
    ("1-vlasta-dnes", "Vlasta – současný hlas ve hře", "cs-CZ-VlastaNeural", "-8%", "+0Hz", TEXT),
    ("2-vlasta-vesela", "Vlasta – vyšší a o kousek rychlejší (veselejší)", "cs-CZ-VlastaNeural", "+0%", "+15Hz", TEXT),
    ("3-vlasta-pohadka", "Vlasta – výš a pomaleji (pohádkově)", "cs-CZ-VlastaNeural", "-12%", "+25Hz", TEXT),
    ("4-antonin", "Antonín – mužský hlas", "cs-CZ-AntoninNeural", "-8%", "+0Hz", TEXT),
    ("5-emma-multi", "Emma (vícejazyčný hlas, čte česky)", "en-US-EmmaMultilingualNeural", "-5%", "+0Hz", TEXT),
    ("6-ava-multi", "Ava (vícejazyčný hlas, čte česky)", "en-US-AvaMultilingualNeural", "-5%", "+0Hz", TEXT),
    ("7-seraphina-multi", "Seraphina (vícejazyčný hlas, čte česky)", "de-DE-SeraphinaMultilingualNeural", "-5%", "+0Hz", TEXT),
    ("9-maisie-en", "Pro srovnání: Maisie – současný anglický hlas", "en-GB-MaisieNeural", "-8%", "+0Hz", EN),
]
PIPER = "https://huggingface.co/rhasspy/piper-voices/resolve/main/cs/cs_CZ/jirka/medium/cs_CZ-jirka-medium.onnx"

async def edge(name, voice, rate, pitch, text):
    await edge_tts.Communicate(text, voice, rate=rate, pitch=pitch).save(str(HERE / f"{name}.mp3"))

def piper():
    model = HERE / "jirka.onnx"
    for ext in ("", ".json"):
        urllib.request.urlretrieve(PIPER + ext, str(model) + ext)
    wav = HERE / "8-piper.wav"
    subprocess.run([sys.executable, "-m", "piper", "-m", str(model), "-f", str(wav)], input=TEXT.encode(), check=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav), "-b:a", "64k", str(HERE / "8-piper.mp3")], check=True)
    for p in (wav, model, pathlib.Path(str(model) + ".json")):
        p.unlink(missing_ok=True)

import time
rows = []
for name, label, voice, rate, pitch, text in EDGE:
    out = HERE / f"{name}.mp3"
    for attempt in range(4):
        try:
            asyncio.run(edge(name, voice, rate, pitch, text))
            if out.stat().st_size > 4000:
                rows.append((name, label)); print("ok", name, out.stat().st_size, "B"); break
            print("krátké", name, out.stat().st_size, "B")
        except Exception as e:  # noqa: BLE001
            print("CHYBA", name, attempt, str(e)[:80])
        out.unlink(missing_ok=True); time.sleep(10 * (attempt + 1))
try:
    piper(); rows.append(("8-piper", "Piper „Jirka“ – zdarma a offline (open source), mužský"))
    print("ok 8-piper")
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
