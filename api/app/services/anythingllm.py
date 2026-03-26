"""
Loremaster — AnythingLLM Client
Handles communication with AnythingLLM API on Chonky.
"""

import secrets
import aiohttp
from ..config import settings


def generate_workspace_slug() -> str:
    """Generate a short random 8-character hex ID."""
    return secrets.token_hex(4)  # e.g. "a3f8c2d1"


class AnythingLLMClient:

    def __init__(self):
        self.base_url = settings.ANYTHINGLLM_BASE_URL.rstrip("/")
        self.headers = {
            "Authorization": f"Bearer {settings.ANYTHINGLLM_API_KEY}",
            "Content-Type": "application/json",
        }

    async def create_workspace(self, hex_id: str, tenant_id: str, universe_name: str, workspace_name: str) -> dict | None:
        """
        Create a new workspace in AnythingLLM.

        The workspace name is prefixed with the hex ID so AnythingLLM generates
        a slug that starts with the hex ID — guaranteeing uniqueness and
        making it easy to cross-reference between Loremaster and AnythingLLM.

        Display name format: "{hex_id} | {tenant_id} | {universe_name} | {workspace_name}"
        Resulting slug:      "{hex_id}-{tenant-id}-{universe-name}-{workspace-name}"

        Returns dict with {"slug": ..., "name": ...} or None on failure.
        """
        display_name = f"{hex_id} | {tenant_id} | {universe_name} | {workspace_name}"

        url = f"{self.base_url}/api/v1/workspace/new"
        async with aiohttp.ClientSession() as session:
            async with session.post(
                url,
                json={"name": display_name},
                headers=self.headers
            ) as resp:
                if resp.status != 200:
                    return None
                data = await resp.json()
                workspace = data.get("workspace")
                if not workspace:
                    return None

        return {"slug": workspace.get("slug"), "name": display_name}

    async def update_workspace(self, slug: str, hex_id: str, tenant_id: str, universe_name: str, workspace_name: str) -> bool:
        """Update a workspace's display name in AnythingLLM, keeping the hex prefix."""
        display_name = f"{hex_id} | {tenant_id} | {universe_name} | {workspace_name}"
        url = f"{self.base_url}/api/v1/workspace/{slug}/update"
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json={"name": display_name}, headers=self.headers) as resp:
                return resp.status == 200

    async def update_workspace_settings(
        self,
        slug: str,
        prompt: str | None = None,
        context_snippets: int = 10,
        chat_mode: str = "query",
        similarity_threshold: str = "0.25",
    ) -> bool:
        """Update workspace settings in AnythingLLM."""
        url = f"{self.base_url}/api/v1/workspace/{slug}/update"
        payload = {
            "openAiTemp": 0.7,
            "chatMode": chat_mode,
            "topN": context_snippets,
            "similarityThreshold": similarity_threshold,
        }
        if prompt:
            payload["openAiPrompt"] = prompt

        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload, headers=self.headers) as resp:
                return resp.status == 200

    async def delete_workspace(self, slug: str) -> bool:
        """Delete a workspace from AnythingLLM by slug."""
        url = f"{self.base_url}/api/v1/workspace/{slug}"
        async with aiohttp.ClientSession() as session:
            async with session.delete(url, headers=self.headers) as resp:
                return resp.status == 200

    async def get_workspace(self, slug: str) -> dict | None:
        """Get workspace details from AnythingLLM."""
        url = f"{self.base_url}/api/v1/workspace/{slug}"
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=self.headers) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    return data.get("workspace")
                return None

    async def list_workspaces(self) -> list[dict]:
        """List all workspaces in AnythingLLM."""
        url = f"{self.base_url}/api/v1/workspaces"
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=self.headers) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    return data.get("workspaces", [])
                return []

    async def get_document_count(self, slug: str) -> int:
        """Get the number of embedded documents in a workspace."""
        workspace = await self.get_workspace(slug)
        if not workspace:
            return 0
        return len(workspace.get("documents", []))


# Singleton client instance
anythingllm = AnythingLLMClient()