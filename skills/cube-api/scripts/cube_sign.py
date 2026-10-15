"""Cube API Signature v2 for Python 3.8+. Needs: pip install cryptography

Ported from the sign-v2 reference script (see cube-sign.mjs); test/ checks both agree.

    from cube_sign import sign_request
    headers, message = sign_request("GET", url, key_id, private_key)
    requests.get(url, headers=headers)
"""
import base64, json, random, time
from urllib.parse import urlsplit, parse_qsl

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding


def build_message(url, nonce, timestamp, body=None):
    u = urlsplit(url)
    message = {"nonce": str(nonce), "timestamp": str(timestamp)}
    query = {}
    for k, v in parse_qsl(u.query, keep_blank_values=True):
        if v == "":
            continue
        query[k] = f"{query[k]},{v}" if k in query else v
    message.update(query)
    message["x-sign-uri"] = u.path
    if isinstance(body, dict):
        message.update({k: v for k, v in body.items() if v is not None})
    return message


def _js_entry_key(item):
    # The reference sorts [key, value] pairs with JavaScript's default sort, i.e. by the
    # string "key,value". Values here are JSON scalars, so render them the way JS would.
    k, v = item
    s = "true" if v is True else "false" if v is False else "null" if v is None else (
        "[object Object]" if isinstance(v, dict) else ",".join(map(str, v)) if isinstance(v, list) else str(v))
    return f"{k},{s}"


def _dumps(v):
    return json.dumps(v, ensure_ascii=False, separators=(",", ":"))


def stringify_message(message):
    parts = []
    for key in sorted(message):
        value = message[key]
        if isinstance(value, dict):
            value = dict(sorted(value.items(), key=_js_entry_key))
        parts.append(_dumps({key: value})[1:-1])
    return "{" + ",".join(parts) + "}"


def load_private_key(text):
    text = text.strip()
    if text.startswith("-----BEGIN"):
        text = "".join(line for line in text.splitlines() if not line.startswith("-----"))
    der = base64.b64decode("".join(text.split()))
    return serialization.load_der_private_key(der, password=None)


def sign(message_string, private_key):
    key = load_private_key(private_key) if isinstance(private_key, str) else private_key
    sig = key.sign(message_string.encode("utf-8"), padding.PKCS1v15(), hashes.SHA1())
    return base64.b64encode(sig).decode()


def sign_request(method, url, key_id, private_key, body=None, nonce=None, timestamp=None):
    nonce = random.randint(0, 99) if nonce is None else nonce
    timestamp = int(time.time() * 1000) if timestamp is None else timestamp
    message = stringify_message(build_message(url, nonce, timestamp, body))
    headers = {
        "nonce": str(nonce),
        "timestamp": str(timestamp),
        "X-LF-Signature-Type": "2.0",
        "Authorization": f"LF {key_id}/{sign(message, private_key)}",
        "Content-Type": "application/json",
    }
    return headers, message
