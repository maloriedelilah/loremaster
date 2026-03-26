# Loremaster

**Lore universe management system for authors.**

Loremaster is a multi-tenant web application that lets authors manage their fiction universes, workspaces, and book ingestion pipelines. It sits alongside the Aeon 14 Lore Oracle stack and acts as the management layer for everything that feeds into AnythingLLM.

---

## Architecture Overview

```
Browser (authors UI)
    ↓ HTTPS
Caddy (reverse proxy + SSL)
    ↓
FastAPI (Loremaster API)
    ↓               ↓
PostgreSQL      AnythingLLM (Chonky)
                    ↓
              Qdrant (vector DB)
                    ↓
            LM Studio (Eighty-Eight)
```

**Dev stack:**
- **Backend:** FastAPI + SQLAlchemy (async) + PostgreSQL + Alembic
- **Frontend:** React + Vite + TypeScript + Tailwind v4 + React Query + React Hook Form + Zod
- **Auth:** JWT (superadmin and author tokens, bcrypt password hashing)
- **Infrastructure:** Docker Compose (dev + prod profiles), Caddy

---

## Machines

| Machine | Role | OS |
|---|---|---|
| Silver Pancake | Dev workstation | Windows 11 |
| SlimJimmy | Production host (planned) | Ubuntu 24.04 LTS |
| Chonky | AnythingLLM + Qdrant + Chunkinator Service | Windows 11 |
| Eighty-Eight | LM Studio inference (V100) | Windows 11 |

All machines connected via Tailscale.

---

## Service Ports

| Service | Port | Notes |
|---|---|---|
| PostgreSQL | 5662:5432 | Host:container (Silver Pancake dev) |
| Loremaster API | 8200:8100 | Host:container (Silver Pancake dev) |
| Authors UI (dev) | 5173:5173 | Vite dev server |
| Authors UI (prod) | 3000:80 | Nginx |
| AnythingLLM | 3001 | Chonky |
| Qdrant | 6333 | Chonky (Docker) |
| LM Studio | 1234 | Eighty-Eight |
| Chunkinator Service | 8001 | Chonky (NSSM) |

---

## Directory Structure

```
loremaster/
├── docker-compose.yml          ← dev + prod profiles
├── .env                        ← secrets (never commit)
├── .env.template               ← template for new setups
├── generate_secrets.py         ← generates alphanumeric secrets (no special chars)
├── README.md                   ← this file
│
├── api/                        ← FastAPI backend
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── main.py                 ← app entry point, runs migrations on startup
│   ├── alembic.ini
│   ├── alembic/
│   │   ├── env.py              ← sync psycopg2 migrations
│   │   ├── script.py.mako
│   │   └── versions/
│   │       ├── 0001_initial_schema.py
│   │       └── 0002_add_prompt_and_context_snippets.py
│   └── app/
│       ├── config.py           ← pydantic-settings, reads from env
│       ├── database.py         ← async SQLAlchemy engine + Base
│       ├── models/
│       │   ├── __init__.py
│       │   ├── user.py         ← User, UserRole (String not PG enum)
│       │   ├── universe.py     ← Tenant, Universe, Workspace
│       │   ├── book.py         ← Book, BookStatus (String not PG enum)
│       │   └── registrar.py    ← WorkspaceSignature
│       ├── schemas/
│       │   ├── tenant.py
│       │   ├── user.py
│       │   ├── universe.py     ← Universe + Workspace schemas
│       │   └── book.py
│       ├── routers/
│       │   ├── auth.py         ← /auth/superadmin/login + /auth/login
│       │   ├── tenants.py      ← /admin/tenants (superadmin only)
│       │   ├── users.py        ← /admin/users (superadmin only)
│       │   ├── universes.py    ← /universes + workspaces
│       │   └── books.py        ← /universes/{id}/workspaces/{id}/books
│       └── services/
│           ├── auth.py         ← JWT, bcrypt, superadmin bootstrap
│           ├── anythingllm.py  ← AnythingLLM API client
│           └── chunkinator.py  ← Chunkinator Service client
│
├── authors/                    ← React frontend
│   ├── Dockerfile              ← nginx prod build
│   ├── Dockerfile.dev          ← npm install + vite dev
│   ├── nginx.conf
│   ├── package.json
│   ├── vite.config.ts          ← proxy /api → http://api:8100
│   ├── postcss.config.js       ← @tailwindcss/postcss (v4)
│   ├── tailwind.config.js
│   └── src/
│       ├── main.tsx
│       ├── App.tsx             ← routes
│       ├── index.css           ← @import "tailwindcss"
│       ├── lib/api.ts          ← axios instance, JWT attach, 401 redirect
│       ├── context/AuthContext.tsx
│       ├── components/ProtectedRoute.tsx
│       ├── layouts/
│       │   ├── AdminLayout.tsx  ← superadmin sidebar
│       │   └── AuthorLayout.tsx ← author sidebar
│       └── pages/
│           ├── Login.tsx
│           ├── admin/
│           │   ├── Tenants.tsx
│           │   └── Users.tsx
│           └── author/
│               ├── Universes.tsx  ← universe + workspace management
│               └── Books.tsx      ← book pipeline management
│
└── caddy/
    └── Caddyfile               ← production reverse proxy config
```

---

## Data Model

```
Tenant
└── Universe (has default_prompt)
    └── Workspace (slug, prompt override, context_snippets)
        └── Book (full pipeline state machine)

User → belongs to Tenant, role = superadmin | author
WorkspaceSignature → entity routing table (Registrar)
```

### Workspace Slugs

Workspace slugs in AnythingLLM follow the format:

```
{hex_id}-{tenant_id}-{universe_name}-{workspace_name}
```

Where `hex_id` is a random 8-character hex prefix (`secrets.token_hex(4)`). This guarantees uniqueness and lets you find the workspace in AnythingLLM by looking up the hex ID shown in the Loremaster UI.

### Book Pipeline States

```
pending → stored → dry_run → approved → chunking → chunked → embedding → live
                                                                        ↘ error
```

---

## Key Design Decisions

- **Enum columns stored as String** — SQLAlchemy Enum types create PostgreSQL enum types that conflict with Alembic string-based migrations. All enum columns (`role`, `status`) stored as plain `String`.
- **Alembic migrations run synchronously** — uses psycopg2 (sync) at startup to avoid asyncio.run() conflict with uvicorn's event loop.
- **Defensive migrations** — all `ALTER TABLE` statements use `column_exists()` checks to be idempotent.
- **AnythingLLM workspace naming** — display name format is `{hex_id} | {tenant_id} | {universe_name} | {workspace_name}`. Slug is derived from this by AnythingLLM and starts with the hex ID for uniqueness.
- **extend_existing=True on all models** — prevents duplicate table errors when models are imported from both the app and alembic env.py.
- **Passwords must be alphanumeric** — `@` and `&` in DATABASE_URL passwords break URL parsing. Use `generate_secrets.py` which generates alphanumeric-only passwords.

---

## Setup

### 1. Prerequisites

- Docker Desktop
- Tailscale (for Chonky connectivity)

### 2. Configure environment

```bash
cp .env.template .env
python generate_secrets.py   # generates SECRET_KEY, POSTGRES_PASSWORD, etc.
# Edit .env to fill in ANYTHINGLLM_BASE_URL, ANYTHINGLLM_API_KEY, etc.
```

### 3. Run (dev)

```bash
docker compose --profile dev up --build
```

- Authors UI: http://localhost:5173
- API: http://localhost:8200
- API docs: http://localhost:8200/docs

### 4. First login

Log in at `/login` with the superadmin credentials from `.env`. Switch to **Admin** mode in the toggle.

Create a tenant, create an author user, then log in as that author to manage universes and books.

---

## Development Notes

### Adding a migration

Create a new file in `api/alembic/versions/` following the numbering convention. Always use `column_exists()` for defensive `ALTER TABLE` statements:

```python
def column_exists(table: str, column: str) -> bool:
    conn = op.get_bind()
    result = conn.execute(text(
        "SELECT 1 FROM information_schema.columns "
        "WHERE table_name = :table AND column_name = :column"
    ), {"table": table, "column": column})
    return result.fetchone() is not None
```

### File naming convention

When working with Claude, output files are named with their folder prefix to avoid confusion:

- `models_book.py` → `api/app/models/book.py`
- `schemas_book.py` → `api/app/schemas/book.py`
- `routers_books.py` → `api/app/routers/books.py`
- `services_chunkinator.py` → `api/app/services/chunkinator.py`
- `universes_Universes.tsx` → `authors/src/pages/author/Universes.tsx`

---

## TODO

### High priority

- [ ] **Book upload pipeline** — wire `/upload` endpoint to Chunkinator Service on Chonky
- [ ] **Dry run UI** — display chapter list from dry run result in the Books page
- [ ] **Approve & chunk** — trigger full chunking after dry run approval
- [ ] **Job polling** — auto-poll job status while chunking is in progress
- [ ] **Loremaster systemd service** — deploy to SlimJimmy as a systemd service
- [ ] **Production Caddy config** — loremaster.aeon14.com with Cloudflare DNS challenge

### Medium priority

- [ ] **Book edit** — edit book metadata after creation
- [ ] **Book re-upload** — replace .docx file and re-run pipeline
- [ ] **Dry run result viewer** — expandable chapter list with section types and word counts
- [ ] **Workspace chunk count** — show total embedded chunks per workspace
- [ ] **Universe-level prompt propagation** — when universe default_prompt changes, offer to sync to all workspaces
- [ ] **Registrar UI** — manage workspace routing signatures (characters, ships, eras)
- [ ] **Multi-workspace fan-out** — route queries to multiple workspaces and merge results

### Lower priority / future

- [ ] **Import existing workspaces** — link existing AnythingLLM workspaces (already embedded) to Loremaster
- [ ] **Book series ordering** — display books within a workspace in series order
- [ ] **Chunk count polling** — poll AnythingLLM document count to track embedding progress
- [ ] **Loreinator integration** — wire Loremaster workspace slugs into Loreinator routing
- [ ] **MCP server** — expose Loremaster as an MCP tool for Claude
- [ ] **Docker Compose for Chonky** — containerize AnythingLLM + Qdrant + Chunkinator Service
- [ ] **SlimJimmy RAM upgrade** — when RAM prices improve
- [ ] **Upgrade to 70B+ model** — when 3x SXM2 V100s arrive on Eighty-Eight

---

## Related Systems

| System | Location | Description |
|---|---|---|
| Loreinator | SlimJimmy :8000 | Public query API, live at lore.aeon14.com |
| Chunkinator | Chonky :8001 | Book processing pipeline service |
| AnythingLLM | Chonky :3001 | RAG + vector storage |
| LM Studio | Eighty-Eight :1234 | Qwen 3 8B Q6_K inference |
| Qdrant | Chonky Docker :6333 | Vector database |

---

*Last updated: March 2026*
*System: Loremaster v0.1*