import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, PowerOff, Power, KeyRound } from 'lucide-react'
import api from '../../lib/api'

interface Tenant {
  id: string
  name: string
  active: boolean
}

interface User {
  id: string
  email: string
  role: string
  tenant_id: string
  active: boolean
  created_at: string
}

function UserModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ email: '', password: '', tenant_id: '' })
  const [error, setError] = useState('')

  const { data: tenants = [] } = useQuery<Tenant[]>({
    queryKey: ['tenants'],
    queryFn: () => api.get('/admin/tenants').then((r) => r.data),
  })

  const mutation = useMutation({
    mutationFn: (data: typeof form) => api.post('/admin/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      onClose()
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail ?? 'Something went wrong')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    mutation.mutate(form)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-white mb-4">New Author Account</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Tenant</label>
            <select
              value={form.tenant_id}
              onChange={(e) => setForm({ ...form, tenant_id: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">Select a tenant...</option>
              {tenants.filter(t => t.active).map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="author@example.com"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              {mutation.isPending ? 'Creating...' : 'Create account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Users() {
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/admin/users').then((r) => r.data),
  })

  const { data: tenants = [] } = useQuery<Tenant[]>({
    queryKey: ['tenants'],
    queryFn: () => api.get('/admin/tenants').then((r) => r.data),
  })

  const toggleMutation = useMutation({
    mutationFn: (user: User) =>
      api.patch(`/admin/users/${user.id}`, { active: !user.active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })

  const getTenantName = (id: string) =>
    tenants.find((t) => t.id === id)?.name ?? id

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Users</h1>
          <p className="text-gray-400 text-sm mt-0.5">Manage author accounts</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm px-3 py-2 rounded-lg transition-colors"
        >
          <Plus size={15} />
          New author
        </button>
      </div>

      {isLoading ? (
        <p className="text-gray-400">Loading...</p>
      ) : users.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <p className="text-gray-400">No author accounts yet.</p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-3 text-blue-400 hover:text-blue-300 text-sm transition-colors"
          >
            Create the first author account
          </button>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3">Email</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3">Tenant</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3">Status</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3">Created</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3 text-sm text-white">{user.email}</td>
                  <td className="px-4 py-3 text-sm text-gray-300 font-mono">{getTenantName(user.tenant_id)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      user.active
                        ? 'bg-green-900/50 text-green-400'
                        : 'bg-gray-700 text-gray-400'
                    }`}>
                      {user.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => toggleMutation.mutate(user)}
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                        title={user.active ? 'Deactivate' : 'Activate'}
                      >
                        {user.active ? <PowerOff size={14} /> : <Power size={14} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && <UserModal onClose={() => setShowModal(false)} />}
    </div>
  )
}