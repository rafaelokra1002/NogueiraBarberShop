import { useState, ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Clock,
  DollarSign,
  Settings,
  LogOut,
  Menu,
  X,
  TrendingUp,
  Scissors
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
    { icon: Calendar, label: 'Agendamentos', path: '/admin/appointments' },
    { icon: Users, label: 'Clientes', path: '/admin/clients' },
    { icon: Clock, label: 'Horários', path: '/admin/schedule' },
    { icon: DollarSign, label: 'Financeiro', path: '/admin/financial' },
    { icon: Scissors, label: 'Serviços', path: '/admin/services' },
    { icon: Settings, label: 'Configurações', path: '/admin/settings' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-black/40 backdrop-blur-xl border-r border-white/10 transition-all duration-300 z-50 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 ${
          sidebarOpen ? 'w-64' : 'w-20'
        } lg:block`}
      >
        {/* Logo */}
        <div className="h-20 flex items-center justify-between px-4 border-b border-white/10">
          {sidebarOpen ? (
            <>
              <div className="flex items-center space-x-3">
                <img 
                  src="/images/logo-nogueira.png" 
                  alt="Nogueira BarberShop" 
                  className="h-12 w-auto"
                />
              </div>
              <button
                onClick={() => {
                  setSidebarOpen(false);
                  setMobileMenuOpen(false);
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </>
          ) : (
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-gray-400 hover:text-white transition-colors mx-auto"
            >
              <Menu className="h-6 w-6" />
            </button>
          )}
        </div>

        {/* Menu Items */}
        <nav className="p-4 space-y-2">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black font-semibold shadow-lg'
                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <item.icon className={`h-5 w-5 ${isActive ? 'text-black' : ''}`} />
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User Info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
          {sidebarOpen ? (
            <div className="space-y-3">
              <div className="flex items-center space-x-3 px-4 py-2 bg-white/5 rounded-xl">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-600 rounded-full flex items-center justify-center">
                  <span className="text-black font-bold text-sm">
                    {user?.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{user?.name}</p>
                  <p className="text-gray-400 text-xs truncate">{user?.role}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-xl transition-all duration-200 border border-red-500/30"
              >
                <LogOut className="h-4 w-4" />
                <span className="text-sm font-medium">Sair</span>
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center px-4 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-xl transition-all duration-200"
            >
              <LogOut className="h-5 w-5" />
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={`transition-all duration-300 lg:ml-64 ${
          sidebarOpen ? '' : 'lg:ml-20'
        }`}
      >
        {/* Top Bar */}
        <header className="h-16 lg:h-20 bg-black/30 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-4 lg:px-8">
          <div className="flex items-center space-x-4">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden text-gray-400 hover:text-white transition-colors"
            >
              <Menu className="h-6 w-6" />
            </button>
            
            {/* Logo Mobile */}
            <div className="flex items-center space-x-2 lg:hidden">
              <img 
                src="/images/logo-nogueira.png" 
                alt="Nogueira BarberShop" 
                className="h-8 w-auto"
              />
              <div>
                <h1 className="text-white font-bold text-sm">Nogueira</h1>
                <p className="text-gray-400 text-xs">BarberShop</p>
              </div>
            </div>
            
            <div className="hidden lg:block">
              <h2 className="text-lg lg:text-2xl font-bold text-white">
                {menuItems.find((item) => item.path === location.pathname)?.label || 'Admin'}
              </h2>
              <p className="text-gray-400 text-xs lg:text-sm hidden sm:block">Bem-vindo de volta, {user?.name}</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex px-3 lg:px-4 py-1.5 lg:py-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-xl">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-3 lg:h-4 w-3 lg:w-4 text-amber-400" />
                <span className="text-white text-xs lg:text-sm font-semibold">Em alta</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
