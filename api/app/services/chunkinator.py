"""
Loremaster — Chunkinator Service Client
Communicates with the Chunkinator Service on Chonky.
"""

import aiohttp
import json
import logging
from ..config import settings

logger = logging.getLogger(__name__)


class ChunkinatorClient:

    def __init__(self):
        self.base_url = settings.CHUNKINATOR_BASE_URL.rstrip("/")
        self.headers = {
            "X-Service-Key": settings.CHUNKINATOR_SERVICE_KEY,
        }

    async def upload(
        self,
        file_bytes: bytes,
        filename: str,
        tenant_id: str,
        book_id: str,
    ) -> dict | None:
        """
        Upload a .docx file to the Chunkinator Service.
        Stores it at uploads/{tenant_id}/{book_id}.docx on Chonky.
        Returns {"status": "stored", "tenant_id": ..., "book_id": ..., ...} or None on failure.
        """
        url = f"{self.base_url}/upload"
        form = aiohttp.FormData()
        form.add_field("tenant_id", tenant_id)
        form.add_field("book_id", book_id)
        form.add_field(
            "file",
            file_bytes,
            filename=filename,
            content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, data=form, headers=self.headers) as resp:
                    if resp.status == 200:
                        return await resp.json()
                    body = await resp.text()
                    logger.error("Chunkinator upload failed: status=%s body=%s", resp.status, body)
                    return None
        except aiohttp.ClientConnectorError as e:
            logger.error("Chunkinator unreachable at %s: %s", self.base_url, e)
            return None
        except Exception as e:
            logger.error("Chunkinator upload unexpected error: %s", e)
            return None

    async def dry_run(
        self,
        tenant_id: str,
        book_id: str,
        manifest: dict,
    ) -> dict | None:
        """
        Submit a dry run job for an uploaded book.
        Returns {"job_id": ..., "status": "queued", ...} or None on failure.
        Poll /jobs/{job_id} for results.
        """
        url = f"{self.base_url}/dry-run"
        payload = {
            "tenant_id": tenant_id,
            "book_id": book_id,
            "manifest": manifest,
        }

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=payload, headers=self.headers) as resp:
                    if resp.status == 200:
                        return await resp.json()
                    body = await resp.text()
                    logger.error("Chunkinator dry_run failed: status=%s body=%s", resp.status, body)
                    return None
        except aiohttp.ClientConnectorError as e:
            logger.error("Chunkinator unreachable at %s: %s", self.base_url, e)
            return None
        except Exception as e:
            logger.error("Chunkinator dry_run unexpected error: %s", e)
            return None

    async def chunk(
        self,
        tenant_id: str,
        book_id: str,
        manifest: dict,
        workspace_slug: str,
    ) -> dict | None:
        """
        Submit a full chunking job for an uploaded book.
        Returns {"job_id": ..., "status": "queued", ...} or None on failure.
        Poll /jobs/{job_id} for results.
        """
        url = f"{self.base_url}/chunk"
        payload = {
            "tenant_id": tenant_id,
            "book_id": book_id,
            "manifest": manifest,
            "workspace_slug": workspace_slug,
        }

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=payload, headers=self.headers) as resp:
                    if resp.status == 200:
                        return await resp.json()
                    body = await resp.text()
                    logger.error("Chunkinator chunk failed: status=%s body=%s", resp.status, body)
                    return None
        except aiohttp.ClientConnectorError as e:
            logger.error("Chunkinator unreachable at %s: %s", self.base_url, e)
            return None
        except Exception as e:
            logger.error("Chunkinator chunk unexpected error: %s", e)
            return None

    async def get_job(self, job_id: str) -> dict | None:
        """
        Poll a job's current status and result.
        Returns job dict or None if not found.
        """
        url = f"{self.base_url}/jobs/{job_id}"
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=self.headers) as resp:
                    if resp.status == 200:
                        return await resp.json()
                    body = await resp.text()
                    logger.error("Chunkinator get_job failed: status=%s body=%s", resp.status, body)
                    return None
        except aiohttp.ClientConnectorError as e:
            logger.error("Chunkinator unreachable at %s: %s", self.base_url, e)
            return None
        except Exception as e:
            logger.error("Chunkinator get_job unexpected error: %s", e)
            return None


    async def delete_book(self, tenant_id: str, book_id: str) -> bool:
        """
        Delete all Chunkinator data for a book — .docx, chunks, and AnythingLLM documents.
        Returns True on success, False on failure (non-fatal — book is still deleted in Loremaster).
        """
        url = f"{self.base_url}/books/{tenant_id}/{book_id}"
        try:
            async with aiohttp.ClientSession() as session:
                async with session.delete(url, headers=self.headers) as resp:
                    if resp.status == 200:
                        return True
                    body = await resp.text()
                    logger.error("Chunkinator delete_book failed: status=%s body=%s", resp.status, body)
                    return False
        except aiohttp.ClientConnectorError as e:
            logger.error("Chunkinator unreachable at %s: %s", self.base_url, e)
            return False
        except Exception as e:
            logger.error("Chunkinator delete_book unexpected error: %s", e)
            return False


# Singleton client instance
chunkinator = ChunkinatorClient()