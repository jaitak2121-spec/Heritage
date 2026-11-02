"""Small stateless curator authentication layer for protected archive writes."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import time
import threading
from collections import defaultdict, deque
from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer


TOKEN_VERSION = 1
DEFAULT_TOKEN_TTL_SECONDS = 8 * 60 * 60
bearer_scheme = HTTPBearer(auto_error=False)


class LoginRateLimiter:
    """Small per-process limiter for the single curator login endpoint."""

    def __init__(self):
        self._failures: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    @staticmethod
    def _configuration() -> tuple[int, int]:
        try:
            attempts = int(os.getenv("CURATOR_LOGIN_MAX_ATTEMPTS", "5"))
            window = int(os.getenv("CURATOR_LOGIN_WINDOW_SECONDS", "300"))
        except ValueError:
            attempts, window = 5, 300
        return max(1, attempts), max(30, window)

    def check(self, identifier: str) -> None:
        attempts, window = self._configuration()
        now = time.monotonic()
        with self._lock:
            failures = self._failures[identifier]
            while failures and failures[0] <= now - window:
                failures.popleft()
            if len(failures) >= attempts:
                retry_after = max(1, int(window - (now - failures[0])))
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many curator login attempts. Try again later.",
                    headers={"Retry-After": str(retry_after)},
                )

    def record_failure(self, identifier: str) -> None:
        with self._lock:
            self._failures[identifier].append(time.monotonic())

    def clear(self, identifier: str) -> None:
        with self._lock:
            self._failures.pop(identifier, None)

    def reset(self) -> None:
        with self._lock:
            self._failures.clear()


login_rate_limiter = LoginRateLimiter()


@dataclass(frozen=True)
class CuratorIdentity:
    role: str = "curator"


def _b64encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def _b64decode(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def _auth_configuration() -> tuple[str, str, int]:
    password = os.getenv("CURATOR_PASSWORD", "")
    secret = os.getenv("CURATOR_TOKEN_SECRET", "")
    try:
        ttl = int(os.getenv("CURATOR_TOKEN_TTL_SECONDS", str(DEFAULT_TOKEN_TTL_SECONDS)))
    except ValueError:
        ttl = DEFAULT_TOKEN_TTL_SECONDS

    if not password or not secret or len(secret) < 32:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Curator authentication is not configured. Set CURATOR_PASSWORD and a "
                "CURATOR_TOKEN_SECRET of at least 32 characters on the backend."
            ),
        )
    return password, secret, max(300, ttl)


def authenticate_curator(password: str) -> str:
    configured_password, secret, ttl = _auth_configuration()
    if not hmac.compare_digest(password.encode("utf-8"), configured_password.encode("utf-8")):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid curator credentials.")

    now = int(time.time())
    payload = _b64encode(
        json.dumps(
            {"v": TOKEN_VERSION, "role": "curator", "iat": now, "exp": now + ttl},
            separators=(",", ":"),
            sort_keys=True,
        ).encode("utf-8")
    )
    signature = _b64encode(hmac.new(secret.encode("utf-8"), payload.encode("ascii"), hashlib.sha256).digest())
    return f"{payload}.{signature}"


def verify_curator_token(token: str) -> CuratorIdentity:
    _, secret, _ = _auth_configuration()
    try:
        payload_segment, signature_segment = token.split(".", 1)
        expected = _b64encode(
            hmac.new(secret.encode("utf-8"), payload_segment.encode("ascii"), hashlib.sha256).digest()
        )
        if not hmac.compare_digest(signature_segment, expected):
            raise ValueError("signature mismatch")
        payload = json.loads(_b64decode(payload_segment))
        if payload.get("v") != TOKEN_VERSION or payload.get("role") != "curator":
            raise ValueError("invalid claims")
        if int(payload.get("exp", 0)) <= int(time.time()):
            raise ValueError("expired")
    except (ValueError, TypeError, json.JSONDecodeError, UnicodeDecodeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Curator session is invalid or expired.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return CuratorIdentity()


def require_curator(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> CuratorIdentity:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Curator authentication is required for this operation.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return verify_curator_token(credentials.credentials)
