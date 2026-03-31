import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, ArrowLeft, Upload, Play, CheckCircle, AlertCircle, Clock, BookOpen, ChevronDown, ChevronRight, Pencil, Trash2 } from 'lucide-react'
import api from '../../lib/api'
import DryRunViewer from '../../components/DryRunViewer'

interface Book {
  id: string
  title: string
  series: string
  era: string
  series_order: string | null
  format: string | null
  uses_parts: boolean
  pov_markers: boolean
  has_drop_caps: boolean
  is_extended_content: boolean
  date_identifier: string | null
  filename: string | null
  status: string
  chunk_count: number | null
  chunks_embedded: number | null
  error_message: string | null
  chunkinator_job_id: string | null
  dry_run_result: string | null
  skip_headings_extra: string | null
  recap_headings_extra: string | null
  appendix_headings_extra: string | null
  created_at: string
}

interface Workspace {
  id: string
  name: string
  slug: string
}

interface Universe {
  id: string
  name: string
}

const ERA_OPTIONS = [
  'Pre-Modern',
  'Age of Expansion',
  'Age of Colonization',
  'Age of Terra',
  'FTL Wars and Reconstruction',
  'Age of the Orion War',
  'Age of Sapiens',
  'Custom',
]

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending:    { label: 'Pending',    color: 'text-gray-400',   icon: Clock },
  stored:     { label: 'Uploaded',   color: 'text-blue-400',   icon: Upload },
  dry_run:    { label: 'Dry Run',    color: 'text-yellow-400', icon: Play },
  validating: { label: 'Review',     color: 'text-yellow-400', icon: CheckCircle },
  approved:   { label: 'Approved',   color: 'text-blue-400',   icon: CheckCircle },
  chunking:   { label: 'Chunking',   color: 'text-blue-400',   icon: Clock },
  chunked:    { label: 'Chunked',    color: 'text-green-400',  icon: CheckCircle },
  embedding:  { label: 'Embedding',  color: 'text-blue-400',   icon: Clock },
  live:       { label: 'Live',       color: 'text-green-400',  icon: CheckCircle },
  error:      { label: 'Error',      color: 'text-red-400',    icon: AlertCircle },
}

function formatError(err: any): string {
  const detail = err.response?.data?.detail
  if (Array.isArray(detail)) {
    return detail.map((d: any) => d.msg).join(', ')
  }
  return detail ?? 'Something went wrong'
}

// ── Book Modal ────────────────────────────────────────────────────────────────

function BookModal({
  universeId,
  workspaceId,
  onClose,
}: {
  universeId: string
  workspaceId: string
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    title: '',
    series: '',
    era: 'Age of the Orion War',
    series_order: '',
    format: 'novel',
    uses_parts: false,
    pov_markers: false,
    has_drop_caps: false,
    is_extended_content: false,
    date_identifier: '',
  })
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: (data: typeof form) =>
      api.post(`/universes/${universeId}/workspaces/${workspaceId}/books`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books', workspaceId] })
      onClose()
    },
    onError: (err: any) => setError(formatError(err)),
  })

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-white mb-4">Add Book</h2>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form) }} className="space-y-4">

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-1">Title</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Orion Rising"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Series</label>
              <input
                value={form.series}
                onChange={(e) => setForm({ ...form, series: e.target.value })}
                placeholder="e.g. The Orion War"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Order in Series</label>
              <input
                value={form.series_order}
                onChange={(e) => setForm({ ...form, series_order: e.target.value })}
                placeholder="e.g. 1"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Era</label>
              <select
                value={form.era}
                onChange={(e) => setForm({ ...form, era: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              >
                {ERA_OPTIONS.map((era) => (
                  <option key={era} value={era}>{era}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Format</label>
              <select
                value={form.format}
                onChange={(e) => setForm({ ...form, format: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="novel">Novel</option>
                <option value="novella">Novella</option>
                <option value="short_story">Short Story</option>
                <option value="collection">Collection</option>
              </select>
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors"
            >
              {showAdvanced ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              Advanced options
            </button>

            {showAdvanced && (
              <div className="mt-3 space-y-3 pl-4 border-l border-gray-700">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Date Identifier <span className="text-gray-500">(e.g. COMMON ERA)</span>
                  </label>
                  <input
                    value={form.date_identifier}
                    onChange={(e) => setForm({ ...form, date_identifier: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    ['uses_parts', 'Uses Parts (H1/H2 structure)'],
                    ['pov_markers', 'POV markers'],
                    ['has_drop_caps', 'Has drop caps'],
                    ['is_extended_content', 'Extended content'],
                  ] as const).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form[key]}
                        onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                        className="accent-blue-500"
                      />
                      <span className="text-sm text-gray-300">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
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
              {mutation.isPending ? 'Adding...' : 'Add book'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Edit Book Modal ───────────────────────────────────────────────────────────

function EditBookModal({
  book,
  universeId,
  workspaceId,
  onClose,
}: {
  book: Book
  universeId: string
  workspaceId: string
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    title: book.title,
    series: book.series,
    era: book.era,
    series_order: book.series_order ?? '',
    format: book.format ?? 'novel',
    uses_parts: book.uses_parts,
    pov_markers: book.pov_markers,
    has_drop_caps: book.has_drop_caps,
    is_extended_content: book.is_extended_content,
    date_identifier: book.date_identifier ?? '',
  })
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: (data: typeof form) =>
      api.patch(`/universes/${universeId}/workspaces/${workspaceId}/books/${book.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books', workspaceId] })
      onClose()
    },
    onError: (err: any) => setError(formatError(err)),
  })

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-white mb-4">Edit Book</h2>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form) }} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-1">Title</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Series</label>
              <input
                value={form.series}
                onChange={(e) => setForm({ ...form, series: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Order in Series</label>
              <input
                value={form.series_order}
                onChange={(e) => setForm({ ...form, series_order: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Era</label>
              <select
                value={form.era}
                onChange={(e) => setForm({ ...form, era: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              >
                {ERA_OPTIONS.map((era) => (
                  <option key={era} value={era}>{era}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Format</label>
              <select
                value={form.format}
                onChange={(e) => setForm({ ...form, format: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="novel">Novel</option>
                <option value="novella">Novella</option>
                <option value="short_story">Short Story</option>
                <option value="collection">Collection</option>
              </select>
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors"
            >
              {showAdvanced ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              Advanced options
            </button>
            {showAdvanced && (
              <div className="mt-3 space-y-3 pl-4 border-l border-gray-700">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Date Identifier <span className="text-gray-500">(e.g. COMMON ERA)</span>
                  </label>
                  <input
                    value={form.date_identifier}
                    onChange={(e) => setForm({ ...form, date_identifier: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    ['uses_parts', 'Uses Parts (H1/H2 structure)'],
                    ['pov_markers', 'POV markers'],
                    ['has_drop_caps', 'Has drop caps'],
                    ['is_extended_content', 'Extended content'],
                  ] as const).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form[key]}
                        onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                        className="accent-blue-500"
                      />
                      <span className="text-sm text-gray-300">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
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
              {mutation.isPending ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending
  const Icon = config.icon
  return (
    <span className={`flex items-center gap-1 text-xs font-medium ${config.color}`}>
      <Icon size={12} />
      {config.label}
    </span>
  )
}

// ── Book Row ──────────────────────────────────────────────────────────────────

function BookRow({
  book,
  universeId,
  workspaceId,
}: {
  book: Book
  universeId: string
  workspaceId: string
}) {
  const queryClient = useQueryClient()
  const [uploading, setUploading] = useState(false)
  const [rowError, setRowError] = useState<string | null>(null)
  const [showEdit, setShowEdit] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/universes/${universeId}/workspaces/${workspaceId}/books/${book.id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['books', workspaceId] }),
    onError: (err: any) => setRowError(formatError(err)),
  })

  const dryRunMutation = useMutation({
    mutationFn: () => api.post(`/universes/${universeId}/workspaces/${workspaceId}/books/${book.id}/dry-run`),
    onSuccess: () => {
      setRowError(null)
      queryClient.invalidateQueries({ queryKey: ['books', workspaceId] })
    },
    onError: (err: any) => setRowError(formatError(err)),
  })

  const approveMutation = useMutation({
    mutationFn: () => api.post(`/universes/${universeId}/workspaces/${workspaceId}/books/${book.id}/approve`),
    onSuccess: () => {
      setRowError(null)
      queryClient.invalidateQueries({ queryKey: ['books', workspaceId] })
    },
    onError: (err: any) => setRowError(formatError(err)),
  })

  // Auto-poll while a job is in progress
  useQuery({
    queryKey: ['job-status', book.id],
    queryFn: () =>
      api.get(`/universes/${universeId}/workspaces/${workspaceId}/books/${book.id}/job-status`)
        .then((r) => {
          queryClient.invalidateQueries({ queryKey: ['books', workspaceId] })
          return r.data
        }),
    enabled: book.status === 'dry_run' || book.status === 'chunking',
    refetchInterval: 3000,
  })

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setRowError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      await api.post(
        `/universes/${universeId}/workspaces/${workspaceId}/books/${book.id}/upload`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
      queryClient.invalidateQueries({ queryKey: ['books', workspaceId] })
    } catch (err: any) {
      setRowError(formatError(err))
    } finally {
      setUploading(false)
      // Reset file input so same file can be re-uploaded after an error
      e.target.value = ''
    }
  }

  return (
    <>
      <tr className="hover:bg-gray-800/50 transition-colors">
        <td className="px-4 py-3">
          <div>
            <p className="text-sm text-white font-medium">{book.title}</p>
            <p className="text-xs text-gray-400">{book.series}{book.series_order ? ` #${book.series_order}` : ''}</p>
          </div>
        </td>
        <td className="px-4 py-3 text-xs text-gray-400">{book.era}</td>
        <td className="px-4 py-3">
          <StatusBadge status={book.status} />
        </td>
        <td className="px-4 py-3 text-xs text-gray-400">
          {book.filename ?? <span className="text-gray-600">no file</span>}
        </td>
        <td className="px-4 py-3 text-xs text-gray-400">
          {book.chunk_count != null ? `${book.chunk_count} chunks` : '—'}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1 justify-end">
            {/* Edit — always available */}
            <button
              onClick={() => setShowEdit(true)}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
              title="Edit book"
            >
              <Pencil size={13} />
            </button>

            {/* Upload — pending, stored, validating, or error */}
            {(['pending', 'stored', 'validating', 'error'] as string[]).includes(book.status) && (
              <label
                className={`p-1.5 rounded cursor-pointer transition-colors ${uploading ? 'text-gray-600' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
                title={book.status === 'validating' ? 'Re-upload .docx' : 'Upload .docx'}
              >
                {uploading ? <Clock size={13} /> : <Upload size={13} />}
                <input type="file" accept=".docx" className="hidden" onChange={handleUpload} disabled={uploading} />
              </label>
            )}

            {/* Dry run — stored or validating (re-run after metadata edit) */}
            {(book.status === 'stored' || book.status === 'validating') && (
              <button
                onClick={() => dryRunMutation.mutate()}
                disabled={dryRunMutation.isPending}
                className="p-1.5 text-gray-400 hover:text-yellow-400 hover:bg-gray-700 rounded transition-colors"
                title={book.status === 'validating' ? 'Re-run dry run' : 'Dry run'}
              >
                <Play size={13} />
              </button>
            )}

            {/* Polling indicator — dry_run or chunking in progress */}
            {(book.status === 'dry_run' || book.status === 'chunking') && (
              <span className="p-1.5 text-blue-400 animate-pulse" title="Processing...">
                <Clock size={13} />
              </span>
            )}

            {/* Approve — handled inside DryRunViewer when validating */}

            {/* Delete — always available */}
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded transition-colors"
                title="Delete book"
              >
                <Trash2 size={13} />
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <span className="text-xs text-red-400">Delete?</span>
                <button
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                  className="px-2 py-0.5 text-xs bg-red-600 hover:bg-red-500 text-white rounded transition-colors"
                >
                  Yes
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-2 py-0.5 text-xs text-gray-400 hover:text-white transition-colors"
                >
                  No
                </button>
              </div>
            )}
          </div>
        </td>
      </tr>

      {rowError && (
        <tr className="bg-red-950/30">
          <td colSpan={6} className="px-4 py-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-red-400 flex items-center gap-1.5">
                <AlertCircle size={12} />
                {rowError}
              </span>
              <button onClick={() => setRowError(null)} className="text-xs text-red-400/60 hover:text-red-400 transition-colors">
                dismiss
              </button>
            </div>
          </td>
        </tr>
      )}

      {/* Dry run result — shown when validating */}
      {book.status === 'validating' && book.dry_run_result && (
        <tr>
          <td colSpan={6} className="p-0">
            <DryRunViewer
              book={book}
              universeId={universeId}
              workspaceId={workspaceId}
            />
          </td>
        </tr>
      )}

      {showEdit && (
        <EditBookModal
          book={book}
          universeId={universeId}
          workspaceId={workspaceId}
          onClose={() => setShowEdit(false)}
        />
      )}
    </>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Books() {
  const { universeId, workspaceId } = useParams<{ universeId: string; workspaceId: string }>()
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false)

  const { data: workspace } = useQuery<Workspace>({
    queryKey: ['workspace', workspaceId],
    queryFn: () => api.get(`/universes/${universeId}/workspaces/${workspaceId}`).then((r) => r.data),
    enabled: !!universeId && !!workspaceId,
  })

  const { data: universe } = useQuery<Universe>({
    queryKey: ['universe', universeId],
    queryFn: () => api.get(`/universes/${universeId}`).then((r) => r.data),
    enabled: !!universeId,
  })

  const { data: books = [], isLoading } = useQuery<Book[]>({
    queryKey: ['books', workspaceId],
    queryFn: () => api.get(`/universes/${universeId}/workspaces/${workspaceId}/books`).then((r) => r.data),
    enabled: !!universeId && !!workspaceId,
  })

  if (!universeId || !workspaceId) return null

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-1">
        <button
          onClick={() => navigate('/dashboard/universes')}
          className="text-gray-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="text-xs text-gray-500">
          {universe?.name} / {workspace?.name}
        </div>
      </div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">{workspace?.name ?? 'Books'}</h1>
          <p className="text-gray-400 text-sm mt-0.5">Manage books in this workspace</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm px-3 py-2 rounded-lg transition-colors"
        >
          <Plus size={15} />
          Add book
        </button>
      </div>

      {isLoading ? (
        <p className="text-gray-400">Loading...</p>
      ) : books.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <BookOpen size={32} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No books yet.</p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-3 text-blue-400 hover:text-blue-300 text-sm transition-colors"
          >
            Add the first book
          </button>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3">Book</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3">Era</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3">Status</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3">File</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3">Chunks</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {books.map((book) => (
                <BookRow
                  key={book.id}
                  book={book}
                  universeId={universeId}
                  workspaceId={workspaceId}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <BookModal
          universeId={universeId}
          workspaceId={workspaceId}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}