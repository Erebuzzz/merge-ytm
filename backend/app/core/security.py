from __future__ import annotations

import base64
import hashlib
import json
from typing import Any

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import get_settings


def _build_fernet(secret_key: str) -> Fernet:
    digest = hashlib.sha256(secret_key.encode("utf-8")).digest()
    return Fernet(base64.urlsafe_b64encode(digest))


def encrypt_auth_payload(payload: dict[str, Any]) -> str:
    encoded = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    return _build_fernet(get_settings().secret_key).encrypt(encoded).decode("utf-8")


def decrypt_auth_payload(token: str) -> dict[str, Any]:
    try:
        decoded = _build_fernet(get_settings().secret_key).decrypt(token.encode("utf-8"))
    except InvalidToken as exc:
        raise ValueError("Could not decrypt the stored YouTube Music headers.") from exc

    parsed = json.loads(decoded.decode("utf-8"))
    if not isinstance(parsed, dict):
        raise ValueError("The decrypted auth payload is not a JSON object.")
    return parsed
