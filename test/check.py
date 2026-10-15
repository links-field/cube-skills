"""Signature regression check for the Python port (see check.mjs).  python3 test/check.py"""
import json, pathlib, sys
here = pathlib.Path(__file__).parent
sys.path.insert(0, str(here.parent / "skills" / "cube-api" / "scripts"))
from cube_sign import build_message, stringify_message, sign

v = json.loads((here / "vectors.json").read_text())
failed = 0
for c in v["cases"]:
    m = stringify_message(build_message(c["url"], c["nonce"], c["timestamp"], c.get("body")))
    ok = m == c["message"] and sign(m, v["privateKey"]) == c["signature"]
    failed += not ok
    print(("ok   " if ok else "FAIL ") + c["name"])
sys.exit(1 if failed else 0)
