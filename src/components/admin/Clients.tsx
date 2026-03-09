import { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Phone,
  Mail,
  Calendar,
  TrendingUp,
  Edit,
  Trash2
} from 'lucide-react';
import { clientService } from '../../services/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';

export default function Clients() {
  const [clients, setClients] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const data = await clientService.getAll();
      setClients(data);
    } catch (error) {
      toast.error('Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone.includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-white text-lg">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
          <div className="flex items-center justify-between">
            <div className="bg-blue-500/20 p-3 rounded-xl">
              <Users className="h-6 w-6 text-blue-400" />
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-white">{clients.length}</p>
              <p className="text-gray-400 text-sm">Total de Clientes</p>
            </div>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
          <div className="flex items-center justify-between">
            <div className="bg-green-500/20 p-3 rounded-xl">
              <TrendingUp className="h-6 w-6 text-green-400" />
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-white">
                {clients.filter(c => {
                  const created = new Date(c.createdAt);
                  const now = new Date();
                  return created.getMonth() === now.getMonth();
                }).length}
              </p>
              <p className="text-gray-400 text-sm">Novos este mês</p>
            </div>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
          <div className="flex items-center justify-between">
            <div className="bg-amber-500/20 p-3 rounded-xl">
              <Calendar className="h-6 w-6 text-amber-400" />
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-white">
                {clients.filter(c => {
                  const created = new Date(c.createdAt);
                  const today = new Date();
                  return created.toDateString() === today.toDateString();
                }).length}
              </p>
              <p className="text-gray-400 text-sm">Cadastros hoje</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>
      </div>

      {/* Clients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClients.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-400">
            <Users className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p>Nenhum cliente encontrado</p>
          </div>
        ) : (
          filteredClients.map((client) => (
            <div
              key={client.id}
              className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 hover:border-amber-500/30 transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-600 rounded-full flex items-center justify-center">
                  <span className="text-black font-bold text-xl">
                    {client.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex space-x-2">
                  <button className="p-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg transition-all duration-200">
                    <Edit className="h-4 w-4" />
                  </button>
                  <button className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-all duration-200">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <h3 className="text-white font-bold text-lg mb-2">{client.name}</h3>

              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2 text-gray-300">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span>{client.phone}</span>
                </div>

                {client.email && (
                  <div className="flex items-center space-x-2 text-gray-300">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="truncate">{client.email}</span>
                  </div>
                )}

                <div className="flex items-center space-x-2 text-gray-400 text-xs pt-2 border-t border-white/10">
                  <Calendar className="h-3 w-3" />
                  <span>
                    Cliente desde {format(new Date(client.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-white/10">
                <a
                  href={`https://wa.me/55${client.phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center space-x-2 w-full px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded-lg transition-all duration-200"
                >
                  <Phone className="h-4 w-4" />
                  <span className="text-sm font-medium">WhatsApp</span>
                </a>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
