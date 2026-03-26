"""
Loremaster — Chunkinator Service Client
Communicates with the Chunkinator Service on Chonky.
"""

import aiohttp
import json
from ..config import settings


class ChunkinatorClient:

    def __init__(self):
        self.base_url = settings.CHUNKINATOR_BASE_URL.rstrip("/")
        self.headers = {
            "X-Service-Key": settings.CHUNKINATOR_SERVICE_KEY,
        }

    async def dry_run(self, job_id: str) -> dict | None:
        """
        Request a dry run for an already-uploaded book.
        Returns the job status dict or None on failure.
        """
        url = f"{self.base_url}/dry-run/{job_id}"
        async with aiohttp.ClientSession() as session:
            async with session.post(url, headers=self.headers) as resp:
                if resp.status == 200:
                    return await resp.json()
                return None

    async def chunk(self, job_id: str) -> dict | None:
        """
        Trigger full chunking for an already-uploaded book.
        Returns the job status dict or None on failure.
        """
        url = f"{self.base_url}/chunk/{job_id}"
        async with aiohttp.ClientSession() as session:
            async with session.post(url, headers=self.headers) as resp:
                if resp.status == 200:
                    return await resp.json()
                return None

    async def get_job(self, job_id: str) -> dict | None:
        """
        Poll a job's current status.
        Returns the job dict or None if not found.
        """
        url = f"{self.base_url}/jobs/{job_id}"
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=self.headers) as resp:
                if resp.status == 200:
                    return await resp.json()
                return None

    async def upload(
        self,
        file_bytes: bytes,
        filename: str,
        manifest: dict,
    ) -> dict | None:
        """
        Upload a .docx file to the Chunkinator Service along with its manifest entry.
        Returns the job dict (including job_id) or None on failure.
        """
        url = f"{self.base_url}/upload"
        form = aiohttp.FormData()
        form.add_field(
            "file",
            file_bytes,
            filename=filename,
            content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )
        form.add_field("manifest", json.dumps(manifest), content_type="application/json")

        async with aiohttp.ClientSession() as session:
            async with session.post(url, data=form, headers=self.headers) as resp:
                if resp.status == 200:
                    return await resp.json()
                return None


# Singleton client instance
chunkinator = ChunkinatorClient()