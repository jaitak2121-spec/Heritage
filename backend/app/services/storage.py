"""Configurable durable storage for original archival documents."""

from __future__ import annotations

import json
import mimetypes
import os
from dataclasses import dataclass
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen


class StorageConfigurationError(RuntimeError):
    pass


class StorageOperationError(RuntimeError):
    pass


@dataclass(frozen=True)
class DownloadTarget:
    local_path: Path | None = None
    redirect_url: str | None = None


class DocumentStorage:
    provider_name: str

    def store(self, object_key: str, content: bytes, content_type: str | None = None) -> None:
        raise NotImplementedError

    def delete(self, object_key: str) -> None:
        raise NotImplementedError

    def read(self, object_key: str) -> bytes:
        raise NotImplementedError

    def download_target(self, object_key: str, expires_in: int = 300) -> DownloadTarget:
        raise NotImplementedError


class LocalDocumentStorage(DocumentStorage):
    provider_name = "local"

    def __init__(self, root: Path | None = None):
        default_root = Path(__file__).resolve().parents[2] / "uploads"
        self.root = (root or Path(os.getenv("UPLOAD_DIR", default_root))).resolve()
        self.root.mkdir(parents=True, exist_ok=True)

    def _resolve(self, object_key: str) -> Path:
        candidate = (self.root / object_key).resolve()
        if self.root not in candidate.parents:
            raise StorageOperationError("Invalid storage object key.")
        return candidate

    def store(self, object_key: str, content: bytes, content_type: str | None = None) -> None:
        path = self._resolve(object_key)
        path.parent.mkdir(parents=True, exist_ok=True)
        temporary_path = path.with_suffix(path.suffix + ".uploading")
        try:
            temporary_path.write_bytes(content)
            temporary_path.replace(path)
        except OSError as exc:
            temporary_path.unlink(missing_ok=True)
            raise StorageOperationError(f"Could not write document to local storage: {exc}") from exc

    def delete(self, object_key: str) -> None:
        try:
            self._resolve(object_key).unlink(missing_ok=True)
        except OSError as exc:
            raise StorageOperationError(f"Could not delete document from local storage: {exc}") from exc

    def read(self, object_key: str) -> bytes:
        path = self._resolve(object_key)
        try:
            return path.read_bytes()
        except OSError as exc:
            raise StorageOperationError(f"Could not read document from local storage: {exc}") from exc

    def download_target(self, object_key: str, expires_in: int = 300) -> DownloadTarget:
        path = self._resolve(object_key)
        if not path.is_file():
            raise StorageOperationError("Stored document was not found.")
        return DownloadTarget(local_path=path)


class SupabaseDocumentStorage(DocumentStorage):
    provider_name = "supabase"

    def __init__(self):
        self.base_url = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
        self.service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
        self.bucket = os.getenv("SUPABASE_STORAGE_BUCKET", "heritage-documents").strip()
        if not self.base_url or not self.service_key or not self.bucket:
            raise StorageConfigurationError(
                "Supabase storage requires SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_STORAGE_BUCKET."
            )

    def _request(self, request: Request) -> bytes:
        request.add_header("Authorization", f"Bearer {self.service_key}")
        request.add_header("apikey", self.service_key)
        try:
            with urlopen(request, timeout=30) as response:
                return response.read()
        except HTTPError as exc:
            try:
                detail = json.loads(exc.read().decode("utf-8")).get("message")
            except Exception:
                detail = None
            raise StorageOperationError(detail or f"Supabase Storage returned HTTP {exc.code}.") from exc
        except (URLError, TimeoutError) as exc:
            raise StorageOperationError("Supabase Storage could not be reached.") from exc

    def store(self, object_key: str, content: bytes, content_type: str | None = None) -> None:
        path = quote(object_key, safe="/")
        url = f"{self.base_url}/storage/v1/object/{quote(self.bucket)}/{path}"
        request = Request(url, data=content, method="POST")
        request.add_header("Content-Type", content_type or mimetypes.guess_type(object_key)[0] or "application/octet-stream")
        request.add_header("x-upsert", "false")
        self._request(request)

    def delete(self, object_key: str) -> None:
        url = f"{self.base_url}/storage/v1/object/{quote(self.bucket)}"
        payload = json.dumps({"prefixes": [object_key]}).encode("utf-8")
        request = Request(url, data=payload, method="DELETE", headers={"Content-Type": "application/json"})
        self._request(request)

    def read(self, object_key: str) -> bytes:
        path = quote(object_key, safe="/")
        url = f"{self.base_url}/storage/v1/object/authenticated/{quote(self.bucket)}/{path}"
        return self._request(Request(url, method="GET"))

    def download_target(self, object_key: str, expires_in: int = 300) -> DownloadTarget:
        path = quote(object_key, safe="/")
        url = f"{self.base_url}/storage/v1/object/sign/{quote(self.bucket)}/{path}"
        payload = json.dumps({"expiresIn": max(60, min(expires_in, 3600))}).encode("utf-8")
        request = Request(url, data=payload, method="POST", headers={"Content-Type": "application/json"})
        response = json.loads(self._request(request).decode("utf-8"))
        signed_url = response.get("signedURL") or response.get("signedUrl")
        if not signed_url:
            raise StorageOperationError("Supabase Storage did not return a signed download URL.")
        if signed_url.startswith("/"):
            signed_url = f"{self.base_url}/storage/v1{signed_url}" if signed_url.startswith("/object/") else f"{self.base_url}{signed_url}"
        signed_url += "&download=" if "?" in signed_url else "?download="
        return DownloadTarget(redirect_url=signed_url)


def get_document_storage(provider: str | None = None) -> DocumentStorage:
    selected = (provider or os.getenv("STORAGE_PROVIDER", "local")).strip().lower()
    if selected == "local":
        return LocalDocumentStorage()
    if selected == "supabase":
        return SupabaseDocumentStorage()
    raise StorageConfigurationError("STORAGE_PROVIDER must be either 'local' or 'supabase'.")
