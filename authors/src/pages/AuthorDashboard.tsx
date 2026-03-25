import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function AuthorDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold">Loremaster</h1>
            <p className="text-gray-400 text-sm mt-1">Author dashboard</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-gray-400 hover:text-white text-sm transition-colors"
          >
            Sign out
          </button>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <p className="text-gray-400">Author UI coming soon.</p>
        </div>
      </div>
    </div>
  )
}