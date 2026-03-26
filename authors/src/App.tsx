import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import AdminLayout from './layouts/AdminLayout'
import AuthorLayout from './layouts/AuthorLayout'
import Login from './pages/Login'
import Tenants from './pages/admin/Tenants'
import Users from './pages/admin/Users'
import Universes from './pages/author/Universes'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />

            {/* Superadmin */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requiredRole="superadmin">
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/admin/tenants" replace />} />
              <Route path="tenants" element={<Tenants />} />
              <Route path="users" element={<Users />} />
            </Route>

            {/* Author */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute requiredRole="author">
                  <AuthorLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard/universes" replace />} />
              <Route path="universes" element={<Universes />} />
            </Route>

            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}