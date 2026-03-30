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


# ---------------------------------------------------------------------------
# File size validation
# ---------------------------------------------------------------------------

MAX_AUTH_FILE_SIZE_BYTES = 1 * 1024 * 1024  # 1 MB


def validate_auth_file_size(size_bytes: int) -> None:
    """Raise ValueError if the file exceeds the maximum allowed size."""
    if size_bytes > MAX_AUTH_FILE_SIZE_BYTES:
        raise ValueError(
            f"Auth file too large: {size_bytes} bytes (max {MAX_AUTH_FILE_SIZE_BYTES} bytes / 1 MB)."
        )


# ---------------------------------------------------------------------------
# Convenience aliases for backward compatibility
# ---------------------------------------------------------------------------

encrypt_auth = encrypt_auth_payload
decrypt_auth = decrypt_auth_payload
