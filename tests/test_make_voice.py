"""make_voice.py with a fake TTS layer (the real service is not reachable from CI sandboxes)."""
import io
import json
import os
import shutil
import sys
import tempfile
import unittest
from unittest import mock

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
import make_voice as mv  # noqa: E402

MP3 = b"ID3" + b"\x00" * 12000          # big enough to pass the length check for the test texts
STUB = b"ID3" + b"\x00" * 1900          # the ~2 kB stub the service sometimes returns


class FakeTTS:
    def __init__(self, fail=None, stub=None):
        self.calls = []
        self.fail = dict(fail or {})      # text -> number of failures before success
        self.stub = dict(stub or {})      # text -> number of tiny "successful" outputs before a good one

    def synth(self, text, voice, rate, path):
        self.calls.append((text, voice, rate))
        if self.fail.get(text, 0) > 0:
            self.fail[text] -= 1
            raise ConnectionResetError("reset")
        data = MP3
        if self.stub.get(text, 0) > 0:
            self.stub[text] -= 1
            data = STUB
        with open(path, "wb") as f:
            f.write(data)


class TestMakeVoice(unittest.TestCase):
    def setUp(self):
        self.root = tempfile.mkdtemp(prefix="houbicky-voice-")
        os.makedirs(os.path.join(self.root, "voice"))
        self.write({"cs": {"ui.say.greeting": "Ahoj!", "sp.liska.name": "Liška obecná."}, "en": {"ui.say.greeting": "Hello!"}})
        self.out = io.StringIO()
        self.sleep = mock.patch("time.sleep", lambda s: None)
        self.sleep.start()

    def tearDown(self):
        self.sleep.stop()
        shutil.rmtree(self.root, ignore_errors=True)

    def write(self, phrases):
        with open(os.path.join(self.root, "voice", "phrases.json"), "w", encoding="utf-8") as f:
            json.dump(phrases, f, ensure_ascii=False)

    def index(self):
        with open(os.path.join(self.root, "voice", "index.json"), encoding="utf-8") as f:
            return json.load(f)

    def run_mv(self, tts, **kw):
        return mv.run(self.root, tts, pause=0, out=self.out, **kw)

    def test_records_all_with_right_voices_and_index(self):
        tts = FakeTTS()
        self.assertEqual(self.run_mv(tts), 0)
        self.assertEqual(len(tts.calls), 3)
        self.assertIn(("Ahoj!", "cs-CZ-VlastaNeural", "-8%"), tts.calls)
        self.assertIn(("Hello!", "en-GB-MaisieNeural", "-8%"), tts.calls)
        idx = self.index()
        self.assertEqual(idx["cs"]["sp.liska.name"]["file"], "cs/sp.liska.name.mp3")
        self.assertEqual(idx["cs"]["sp.liska.name"]["text"], "Liška obecná.")
        self.assertTrue(os.path.isfile(os.path.join(self.root, "voice", "cs", "sp.liska.name.mp3")))
        self.assertIn("[1/3] cs sp.liska.name … nahrávám … hotovo 12 kB", self.out.getvalue())

    def test_second_run_records_nothing(self):
        self.run_mv(FakeTTS())
        tts = FakeTTS()
        self.assertEqual(self.run_mv(tts), 0)
        self.assertEqual(tts.calls, [])
        self.assertIn("přeskočeno (beze změny)", self.out.getvalue())

    def test_changed_text_rerecorded_removed_text_pruned(self):
        self.run_mv(FakeTTS())
        self.write({"cs": {"ui.say.greeting": "Ahoj, kamarádko!"}, "en": {"ui.say.greeting": "Hello!"}})
        tts = FakeTTS()
        self.run_mv(tts)
        self.assertEqual([c[0] for c in tts.calls], ["Ahoj, kamarádko!"])
        idx = self.index()
        self.assertNotIn("sp.liska.name", idx["cs"])
        self.assertFalse(os.path.exists(os.path.join(self.root, "voice", "cs", "sp.liska.name.mp3")))

    def test_transient_failure_is_retried(self):
        tts = FakeTTS(fail={"Ahoj!": 2})
        self.assertEqual(self.run_mv(tts, langs=["cs"]), 0)
        self.assertEqual(sum(1 for c in tts.calls if c[0] == "Ahoj!"), 3)

    def test_permanent_failure_reported_and_others_continue(self):
        tts = FakeTTS(fail={"Ahoj!": 99})
        self.assertEqual(self.run_mv(tts, langs=["cs"], retries=2), 1)
        idx = self.index()
        self.assertNotIn("ui.say.greeting", idx.get("cs", {}))
        self.assertIn("sp.liska.name", idx["cs"])
        self.assertFalse([p for p in os.listdir(os.path.join(self.root, "voice", "cs")) if ".part" in p])

    def test_empty_audio_is_rejected(self):
        class Empty(FakeTTS):
            def synth(self, text, voice, rate, path):
                open(path, "wb").close()
        self.assertEqual(self.run_mv(Empty(), langs=["en"], retries=1), 1)

    def test_tiny_output_is_retried(self):
        tts = FakeTTS(stub={"Ahoj!": 2})
        self.assertEqual(self.run_mv(tts, langs=["cs"]), 0)
        self.assertEqual(sum(1 for c in tts.calls if c[0] == "Ahoj!"), 3)
        self.assertGreater(os.path.getsize(os.path.join(self.root, "voice", "cs", "ui.say.greeting.mp3")), 4000)

    def test_persistent_tiny_output_is_deleted_and_dropped(self):
        self.run_mv(FakeTTS())                               # a good recording exists first
        self.write({"cs": {"ui.say.greeting": "Ahoj, kamarádko!", "sp.liska.name": "Liška obecná."}, "en": {"ui.say.greeting": "Hello!"}})
        tts = FakeTTS(stub={"Ahoj, kamarádko!": 99})
        self.assertEqual(self.run_mv(tts, langs=["cs"], retries=3), 1)
        self.assertEqual(sum(1 for c in tts.calls if c[0] == "Ahoj, kamarádko!"), 3)
        self.assertNotIn("ui.say.greeting", self.index()["cs"])
        self.assertFalse(os.path.exists(os.path.join(self.root, "voice", "cs", "ui.say.greeting.mp3")))
        self.assertIn("chyb 1", self.out.getvalue())

    def test_cached_tiny_file_is_regenerated(self):
        self.run_mv(FakeTTS())
        stub_path = os.path.join(self.root, "voice", "cs", "sp.liska.name.mp3")
        with open(stub_path, "wb") as f:                     # the CI cache kept a 2 kB stub with a matching hash
            f.write(STUB)
        tts = FakeTTS()
        self.assertEqual(self.run_mv(tts), 0)
        self.assertEqual([c[0] for c in tts.calls], ["Liška obecná."])
        self.assertGreater(os.path.getsize(stub_path), 4000)
        out = self.out.getvalue()
        self.assertIn("podezřelé (podezřele krátká nahrávka", out)
        self.assertIn("podezřelé 1 (opraveno 1)", out)

    def test_min_bytes_scales_with_text(self):
        self.assertEqual(mv.min_bytes("Ahoj!"), 4000)
        self.assertEqual(mv.min_bytes("x" * 100), 20000)

    def test_missing_phrases(self):
        os.remove(os.path.join(self.root, "voice", "phrases.json"))
        self.assertEqual(self.run_mv(FakeTTS()), 2)

    def test_force(self):
        self.run_mv(FakeTTS())
        tts = FakeTTS()
        self.run_mv(tts, force=True)
        self.assertEqual(len(tts.calls), 3)


if __name__ == "__main__":
    unittest.main()
