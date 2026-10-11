#!/usr/bin/env python3
"""Houbičky — pre-record every spoken line with Microsoft neural voices (edge-tts; free, no key).

    pip install edge-tts
    node dev/export_phrases.mjs        # → voice/phrases.json (all lines, stable ids)
    python3 make_voice.py              # → voice/<lang>/<id>.mp3 + voice/index.json (only new/changed text)
    python3 make_voice.py --force      # re-record everything
    python3 make_voice.py --lang cs

voice/index.json keeps the text + a hash of (voice, rate, text) per phrase, so changed lines are re-recorded,
removed lines are deleted, and the app plays a recording only if its text still matches (else Web Speech).
Python 3.9+.
"""
from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import os
import re
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
VOICES = {"cs": "cs-CZ-VlastaNeural", "en": "en-GB-MaisieNeural"}
RATE = "-8%"
ID_RE = re.compile(r"^[A-Za-z0-9.-]+$")


class TTSError(Exception):
    pass


class EdgeTTS:
    """The only place that talks to the TTS service. Tests replace it with a fake."""

    def synth(self, text: str, voice: str, rate: str, path: str) -> None:
        try:
            import edge_tts  # noqa: PLC0415 — optional dependency, only needed for real recording
        except ImportError as e:
            raise TTSError("edge-tts is not installed: pip install edge-tts") from e

        async def _save():
            await edge_tts.Communicate(text, voice, rate=rate).save(path)

        asyncio.run(_save())


def text_hash(text: str, voice: str, rate: str) -> str:
    return hashlib.sha1(f"{voice}|{rate}|{text}".encode("utf-8")).hexdigest()


def load_json(path: str, default=None):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return default


def write_json_atomic(path: str, obj) -> None:
    tmp = path + ".part"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=1, sort_keys=True)
        f.write("\n")
    os.replace(tmp, path)


def looks_like_mp3(path: str) -> bool:
    try:
        with open(path, "rb") as f:
            head = f.read(3)
    except OSError:
        return False
    return head[:3] == b"ID3" or (len(head) >= 2 and head[0] == 0xFF and (head[1] & 0xE0) == 0xE0)


# A real recording is ≈ 6 kB per second of speech (48 kbit/s). The service sometimes returns a ~2 kB stub
# (a fragment or silence) without an error; such files are treated as failures, never as done.
MIN_BYTES = 4000              # shortest real line („Srnka!“) is ≈ 9 kB
MIN_BYTES_PER_CHAR = 200      # long lines: a truncated recording is far below this


def min_bytes(text: str) -> int:
    return max(MIN_BYTES, MIN_BYTES_PER_CHAR * len(text.strip()))


def audio_problem(path: str, text: str):
    """None if the file looks like a complete recording of `text`, else a short reason."""
    try:
        size = os.path.getsize(path)
    except OSError:
        return "soubor chybí"
    if not looks_like_mp3(path):
        return "není to MP3"
    if size < min_bytes(text):
        return f"podezřele krátká nahrávka ({size} B, čekáno ≥ {min_bytes(text)} B)"
    return None


def record(tts, text: str, voice: str, rate: str, dest: str, retries: int, delay: float) -> int:
    tmp = dest + ".part.mp3"
    wait = delay
    last = None
    for attempt in range(1, retries + 1):
        try:
            tts.synth(text, voice, rate, tmp)
            problem = audio_problem(tmp, text)
            if problem:
                raise TTSError(problem)
            os.replace(tmp, dest)
            return os.path.getsize(dest)
        except Exception as e:  # network, service throttling, empty audio — all transient here
            last = e
            if os.path.exists(tmp):
                os.remove(tmp)
            if attempt < retries:
                time.sleep(wait)
                wait *= 2
    raise TTSError(f"{last.__class__.__name__}: {last}")


def run(root: str = HERE, tts=None, force: bool = False, langs=None, retries: int = 3, delay: float = 2.0,
        pause: float = 0.2, out=sys.stdout) -> int:
    tts = tts or EdgeTTS()
    vdir = os.path.join(root, "voice")
    phrases = load_json(os.path.join(vdir, "phrases.json"))
    if not isinstance(phrases, dict) or not phrases:
        print("Chybí voice/phrases.json — nejdřív spusťte: node dev/export_phrases.mjs", file=out)
        return 2
    index_path = os.path.join(vdir, "index.json")
    index = load_json(index_path, {}) or {}
    langs = [lang for lang in (langs or phrases.keys()) if lang in VOICES and lang in phrases]
    todo = [(lang, pid, text) for lang in langs for pid, text in sorted(phrases[lang].items())]
    total = len(todo)
    made = skipped = failed = suspect = healed = 0
    print(f"Nahrávám hlasy ({total} vět) …", file=out, flush=True)
    for i, (lang, pid, text) in enumerate(todo, 1):
        prefix = f"[{i}/{total}] {lang} {pid} …"
        if not ID_RE.match(pid) or not isinstance(text, str) or not text.strip():
            print(f"{prefix} CHYBA: neplatné id nebo prázdný text", file=out, flush=True)
            failed += 1
            continue
        voice = VOICES[lang]
        os.makedirs(os.path.join(vdir, lang), exist_ok=True)
        dest = os.path.join(vdir, lang, f"{pid}.mp3")
        h = text_hash(text, voice, RATE)
        entry = index.get(lang, {}).get(pid)
        bad_cached = None
        if not force and entry and entry.get("sha1") == h and os.path.exists(dest):
            bad_cached = audio_problem(dest, text)      # re-validate cached files: heals stubs kept by the CI cache
            if not bad_cached:
                skipped += 1
                print(f"{prefix} přeskočeno (beze změny)", file=out, flush=True)
                continue
            suspect += 1
            print(f"{prefix} podezřelé ({bad_cached}), nahrávám znovu … ", end="", file=out, flush=True)
        else:
            print(f"{prefix} nahrávám … ", end="", file=out, flush=True)
        try:
            size = record(tts, text, voice, RATE, dest, retries, delay)
        except TTSError as e:
            failed += 1
            # never keep a bad or outdated recording: the app then says this line with the browser voice
            if os.path.isfile(dest):
                os.remove(dest)
            if index.get(lang, {}).pop(pid, None) is not None:
                write_json_atomic(index_path, index)
            print(f"CHYBA: {e} (smazáno, hra použije hlas prohlížeče)", file=out, flush=True)
            continue
        if bad_cached:
            healed += 1
        index.setdefault(lang, {})[pid] = {"text": text, "sha1": h, "file": f"{lang}/{pid}.mp3", "bytes": size, "voice": voice}
        write_json_atomic(index_path, index)
        made += 1
        print(f"hotovo {round(size / 1024)} kB", file=out, flush=True)
        if pause:
            time.sleep(pause)
    # prune lines that no longer exist
    removed = 0
    for lang in list(index):
        for pid in list(index[lang]):
            if pid not in phrases.get(lang, {}):
                f = os.path.join(vdir, index[lang][pid].get("file", ""))
                if os.path.isfile(f) and os.path.dirname(os.path.abspath(f)).startswith(os.path.abspath(vdir)):
                    os.remove(f)
                del index[lang][pid]
                removed += 1
    write_json_atomic(index_path, index)
    print(f"\nNahráno {made}, beze změny {skipped}, odstraněno {removed}, podezřelé {suspect} (opraveno {healed}), chyb {failed}.", file=out, flush=True)
    if failed:
        print("Věty s chybou hra řekne hlasem prohlížeče. Skript lze spustit znovu, dodělá jen chybějící.", file=out)
    return 1 if failed else 0


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Record Houbičky voice lines with edge-tts")
    ap.add_argument("--force", action="store_true", help="re-record everything")
    ap.add_argument("--lang", choices=sorted(VOICES), help="only one language")
    args = ap.parse_args(argv)
    return run(HERE, force=args.force, langs=[args.lang] if args.lang else None)


if __name__ == "__main__":
    sys.exit(main())
