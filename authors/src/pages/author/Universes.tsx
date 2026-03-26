import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, ChevronRight, Pencil, Trash2, Globe, AlertTriangle } from 'lucide-react'
import api from '../../lib/api'

interface Universe {
  id: string
  name: string
  description: string | null
  default_prompt: string | null
  default_workspace: string | null
  active: boolean
  created_at: string
}

interface Workspace {
  id: string
  universe_id: string
  name: string
  slug: string
  prompt: string | null
  context_snippets: number
  active: boolean
}

// ── Confirm Delete Modal ──────────────────────────────────────────────────────

function ConfirmDeleteModal({
  workspace,
  onConfirm,
  onCancel,
  isDeleting,
}: {
  workspace: Workspace
  onConfirm: () => void
  onCancel: () => void
  isDeleting: boolean
}) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-red-900/50 rounded-xl w-full max-w-md p-6">
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h2 className="text-lg font-semibold text-white">Delete Workspace?</h2>
            <p className="text-gray-400 text-sm mt-1">
              This will deactivate <span className="text-white font-medium">{workspace.name}</span> and
              remove it from AnythingLLM. All embedded chunks will be lost.
              Re-creating it requires re-chunking and re-embedding all books.
            </p>
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg px-3 py-2 mb-4">
          <p className="text-xs text-gray-400">AnythingLLM slug</p>
          <p className="text-sm font-mono text-white mt-0.5">{workspace.slug}</p>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 text-sm bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            {isDeleting ? 'Deleting...' : 'Yes, delete workspace'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Universe Modal ────────────────────────────────────────────────────────────

function UniverseModal({
  universe,
  onClose,
}: {
  universe?: Universe
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const isEdit = !!universe
  const [form, setForm] = useState({
    name: universe?.name ?? '',
    description: universe?.description ?? '',
    default_prompt: universe?.default_prompt ?? '',
  })
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: (data: typeof form) =>
      isEdit
        ? api.patch(`/universes/${universe!.id}`, data)
        : api.post('/universes', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['universes'] })
      onClose()
    },
    onError: (err: any) => setError(err.response?.data?.detail ?? 'Something went wrong'),
  })

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          {isEdit ? 'Edit Universe' : 'New Universe'}
        </h2>
        <form
          onSubmit={(e) => { e.preventDefault(); mutation.mutate(form) }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Aeon 14 Universe"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Description <span className="text-gray-500">(optional)</span>
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="A brief description of this universe..."
              rows={2}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Default System Prompt <span className="text-gray-500">(optional)</span>
            </label>
            <textarea
              value={form.default_prompt}
              onChange={(e) => setForm({ ...form, default_prompt: e.target.value })}
              placeholder="You are a lore assistant for this universe..."
              rows={5}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none text-sm font-mono"
            />
            <p className="text-gray-500 text-xs mt-1">Individual workspaces can override this prompt.</p>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              {mutation.isPending ? 'Saving...' : isEdit ? 'Save changes' : 'Create universe'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Workspace Modal ───────────────────────────────────────────────────────────

function WorkspaceModal({
  universeId,
  workspace,
  onClose,
}: {
  universeId: string
  workspace?: Workspace
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const isEdit = !!workspace
  const [form, setForm] = useState({
    name: workspace?.name ?? '',
    prompt: workspace?.prompt ?? '',
    context_snippets: workspace?.context_snippets ?? 10,
  })
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: (data: typeof form) =>
      isEdit
        ? api.patch(`/universes/${universeId}/workspaces/${workspace!.id}`, data)
        : api.post(`/universes/${universeId}/workspaces`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces', universeId] })
      onClose()
    },
    onError: (err: any) => setError(err.response?.data?.detail ?? 'Something went wrong'),
  })

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          {isEdit ? 'Edit Workspace' : 'New Workspace'}
        </h2>
        <form
          onSubmit={(e) => { e.preventDefault(); mutation.mutate(form) }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Orion War — Core"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
            {isEdit && workspace?.slug && (
              <p className="text-gray-500 text-xs mt-1 font-mono">slug: {workspace.slug}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Context Snippets <span className="text-gray-500 font-normal">(5–20)</span>
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={5}
                max={20}
                value={form.context_snippets}
                onChange={(e) => setForm({ ...form, context_snippets: parseInt(e.target.value) })}
                className="flex-1 accent-blue-500"
              />
              <span className="text-white font-mono text-sm w-6 text-right">{form.context_snippets}</span>
            </div>
            <p className="text-gray-500 text-xs mt-1">Higher values = more context but slower responses.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              System Prompt Override <span className="text-gray-500">(optional)</span>
            </label>
            <textarea
              value={form.prompt}
              onChange={(e) => setForm({ ...form, prompt: e.target.value })}
              placeholder="Leave blank to use the universe default prompt..."
              rows={4}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none text-sm font-mono"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              {mutation.isPending ? 'Saving...' : isEdit ? 'Save changes' : 'Create workspace'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Universe Card ─────────────────────────────────────────────────────────────

function UniverseCard({ universe }: { universe: Universe }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)
  const [editUniverse, setEditUniverse] = useState(false)
  const [addWorkspace, setAddWorkspace] = useState(false)
  const [editWorkspace, setEditWorkspace] = useState<Workspace | undefined>()
  const [confirmDelete, setConfirmDelete] = useState<Workspace | undefined>()

  const { data: workspaces = [] } = useQuery<Workspace[]>({
    queryKey: ['workspaces', universe.id],
    queryFn: () => api.get(`/universes/${universe.id}/workspaces`).then((r) => r.data),
    enabled: expanded,
  })

  const deleteWorkspace = useMutation({
    mutationFn: (ws: Workspace) =>
      api.delete(`/universes/${universe.id}/workspaces/${ws.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces', universe.id] })
      setConfirmDelete(undefined)
    },
  })

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <ChevronRight
            size={16}
            className={`transition-transform ${expanded ? 'rotate-90' : ''}`}
          />
        </button>
        <Globe size={16} className="text-blue-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-medium text-sm">{universe.name}</h3>
          {universe.description && (
            <p className="text-gray-400 text-xs mt-0.5 truncate">{universe.description}</p>
          )}
        </div>
        {universe.default_prompt && (
          <span className="text-xs text-blue-400 bg-blue-950/50 px-2 py-0.5 rounded">
            has prompt
          </span>
        )}
        <button
          onClick={() => setEditUniverse(true)}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
        >
          <Pencil size={13} />
        </button>
      </div>

      {expanded && (
        <div className="border-t border-gray-800 p-4 pt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Workspaces</span>
            <button
              onClick={() => setAddWorkspace(true)}
              className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              <Plus size={12} />
              Add workspace
            </button>
          </div>

          {workspaces.length === 0 ? (
            <p className="text-gray-500 text-xs py-2">No workspaces yet.</p>
          ) : (
            <div className="space-y-1">
              {workspaces.map((ws) => (
                <div
                  key={ws.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-800 group"
                >
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => navigate(`/dashboard/universes/${universe.id}/workspaces/${ws.id}/books`)}
                      className="text-sm text-white hover:text-blue-400 transition-colors"
                    >
                      {ws.name}
                    </button>
                    <span className="text-xs text-gray-500 font-mono ml-2">{ws.slug}</span>
                    <span className="text-xs text-gray-600 ml-2">{ws.context_snippets} snippets</span>
                    {ws.prompt && (
                      <span className="text-xs text-blue-400 ml-2">custom prompt</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setEditWorkspace(ws)}
                      className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                      title="Edit"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(ws)}
                      className="p-1 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {editUniverse && (
        <UniverseModal universe={universe} onClose={() => setEditUniverse(false)} />
      )}
      {addWorkspace && (
        <WorkspaceModal universeId={universe.id} onClose={() => setAddWorkspace(false)} />
      )}
      {editWorkspace && (
        <WorkspaceModal
          universeId={universe.id}
          workspace={editWorkspace}
          onClose={() => setEditWorkspace(undefined)}
        />
      )}
      {confirmDelete && (
        <ConfirmDeleteModal
          workspace={confirmDelete}
          onConfirm={() => deleteWorkspace.mutate(confirmDelete)}
          onCancel={() => setConfirmDelete(undefined)}
          isDeleting={deleteWorkspace.isPending}
        />
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Universes() {
  const [showModal, setShowModal] = useState(false)

  const { data: universes = [], isLoading } = useQuery<Universe[]>({
    queryKey: ['universes'],
    queryFn: () => api.get('/universes').then((r) => r.data),
  })

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Universes</h1>
          <p className="text-gray-400 text-sm mt-0.5">Manage your lore universes and workspaces</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm px-3 py-2 rounded-lg transition-colors"
        >
          <Plus size={15} />
          New universe
        </button>
      </div>

      {isLoading ? (
        <p className="text-gray-400">Loading...</p>
      ) : universes.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <Globe size={32} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No universes yet.</p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-3 text-blue-400 hover:text-blue-300 text-sm transition-colors"
          >
            Create your first universe
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {universes.map((universe) => (
            <UniverseCard key={universe.id} universe={universe} />
          ))}
        </div>
      )}

      {showModal && <UniverseModal onClose={() => setShowModal(false)} />}
    </div>
  )
}