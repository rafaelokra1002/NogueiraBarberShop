import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import ClientBooking from './components/ClientBooking';
import { Scissors } from 'lucide-react';

// New Admin Components
import AdminLayout from './components/admin/Layout';
import Dashboard from './components/admin/Dashboard';
import Financial from './components/admin/Financial';
import Clients from './components/admin/Clients';
import Services from './components/admin/Services';
import Schedule from './components/admin/Schedule';
import Appointments from './components/admin/Appointments';

function ProtectedRoute({ children }: { children: React.ReactElement }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        {/* Client-facing booking page with original layout */}
        <Route
          path="/"
          element={
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
              {/* Decorative background elements */}
              <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-400/5 rounded-full blur-3xl"></div>
              </div>

              {/* Header */}
              <header className="relative bg-black/30 backdrop-blur-xl border-b border-white/10 shadow-2xl">
                <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
                  <div className="flex items-center justify-between h-24 sm:h-26">
                    <div className="flex items-center space-x-4">
                      {/* Logo Image */}
                      <div className="relative flex items-center">
                        <img
                          src="/images/logo-nogueira.png"
                          alt="Logo NOGUEIRA"
                          className="h-14 w-14 sm:h-16 sm:w-16 md:h-18 md:w-18 rounded-xl object-cover border-2 border-amber-500/30 shadow-lg"
                          onError={(e) => {
                            // Fallback para o ícone SVG se a imagem não carregar
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                        {/* Fallback Icon */}
                        <div className="hidden bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 p-3 rounded-xl shadow-lg">
                          <Scissors className="h-7 w-7 text-black transform rotate-45" />
                        </div>
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-300 rounded-full animate-pulse"></div>
                      </div>
                      <div>
                          <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                          Nogueira BarberShop
                        </h1>
                        <p className="text-xs text-gray-400 font-medium">Sistema de Agendamento Profissional</p>
                      </div>
                    </div>
                  </div>
                </div>
              </header>

              {/* Main Content */}
              <main className="relative max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-12">
                <div className="transition-all duration-500 ease-in-out">
                  <ClientBooking />
                </div>
              </main>

              {/* Footer */}
              <footer className="relative mt-16 sm:mt-20 bg-black/20 backdrop-blur-sm border-t border-white/10">
                <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-8">
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-2 mb-4">
                      <div className="bg-gradient-to-br from-amber-400 to-orange-500 p-2 rounded-lg">
                        <Scissors className="h-5 w-5 text-black" />
                      </div>
                      <span className="text-white font-bold text-lg flex items-center gap-1">
                        NOGUEIR
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 64 64"
                          className="w-5 h-5 text-yellow-400 rotate-90"
                          fill="currentColor"
                        >
                          <path d="M32 6 L20 40 L44 40 Z" /> 
                          <circle cx="32" cy="30" r="3" fill="black" />
                          <circle cx="24" cy="52" r="6" stroke="currentColor" strokeWidth="2" fill="none" />
                          <circle cx="40" cy="52" r="6" stroke="currentColor" strokeWidth="2" fill="none" />
                        </svg>
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm">
                      Sistema profissional de agendamento para barbearias
                    </p>
                    <p className="text-gray-500 text-xs mt-2">
                      © 2025 Nogueira Barbearia. Todos os direitos reservados.
                    </p>
                  </div>
                </div>
              </footer>
            </div>
          }
        />

        {/* Admin routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        
        {/* New Admin Dashboard Routes */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <Dashboard />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/appointments"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <Appointments />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/clients"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <Clients />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/financial"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <Financial />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/schedule"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <Schedule />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/services"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <Services />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <AdminDashboard />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        
        {/* Redirect /admin to /admin/dashboard */}
        <Route
          path="/admin"
          element={<Navigate to="/admin/dashboard" replace />}
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;