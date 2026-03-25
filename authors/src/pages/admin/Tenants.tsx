import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, PowerOff, Power } from 'lucide-react'
import api from '../../lib/api'

interface Tenant {
  id: string
  name: string
  active: boolean
  created_at: string
}

interface TenantFormData {
  id: string
  name: string
}

function TenantModal({
  tenant,
  onClose,
}: {
  tenant?: Tenant
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const isEdit = !!tenant
  const [form, setForm] = useState<TenantFormData>({
    id: tenant?.id ?? '',
    name: tenant?.name ?? '',
  })
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: (data: TenantFormData) =>
      isEdit
        ? api.patch(`/admin/tenants/${tenant!.id}`, { name: data.name })
        : api.post('/admin/tenants', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
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
        <h2 className="text-lg font-semibold text-white mb-4">
          {isEdit ? 'Edit Tenant' : 'New Tenant'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isEdit && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Tenant ID
              </label>
              <input
                value={form.id}
                onChange={(e) => setForm({ ...form, id: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                placeholder="e.g. aeon14"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
              <p className="text-gray-500 text-xs mt-1">Lowercase, no spaces. Cannot be changed later.</p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Display Name
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Aeon 14 Universe"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

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
              {mutation.isPending ? 'Saving...' : isEdit ? 'Save changes' : 'Create tenant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Tenants() {
  const queryClient = useQueryClient()
  const [modalTenant, setModalTenant] = useState<Tenant | undefined>()
  const [showModal, setShowModal] = useState(false)

  const { data: tenants = [], isLoading } = useQuery<Tenant[]>({
    queryKey: ['tenants'],
    queryFn: () => api.get('/admin/tenants').then((r) => r.data),
  })

  const toggleMutation = useMutation({
    mutationFn: (tenant: Tenant) =>
      api.patch(`/admin/tenants/${tenant.id}`, { active: !tenant.active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tenants'] }),
  })

  const openCreate = () => {
    setModalTenant(undefined)
    setShowModal(true)
  }

  const openEdit = (tenant: Tenant) => {
    setModalTenant(tenant)
    setShowModal(true)
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Tenants</h1>
          <p className="text-gray-400 text-sm mt-0.5">Manage lore universe tenants</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm px-3 py-2 rounded-lg transition-colors"
        >
          <Plus size={15} />
          New tenant
        </button>
      </div>

      {isLoading ? (
        <p className="text-gray-400">Loading...</p>
      ) : tenants.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <p className="text-gray-400">No tenants yet.</p>
          <button
            onClick={openCreate}
            className="mt-3 text-blue-400 hover:text-blue-300 text-sm transition-colors"
          >
            Create your first tenant
          </button>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3">ID</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3">Name</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3">Status</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3">Created</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {tenants.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3 text-sm font-mono text-gray-300">{tenant.id}</td>
                  <td className="px-4 py-3 text-sm text-white">{tenant.name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      tenant.active
                        ? 'bg-green-900/50 text-green-400'
                        : 'bg-gray-700 text-gray-400'
                    }`}>
                      {tenant.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">
                    {new Date(tenant.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => openEdit(tenant)}
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => toggleMutation.mutate(tenant)}
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                        title={tenant.active ? 'Deactivate' : 'Activate'}
                      >
                        {tenant.active ? <PowerOff size={14} /> : <Power size={14} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <TenantModal
          tenant={modalTenant}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}