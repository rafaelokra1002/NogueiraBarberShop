import { useState, useEffect } from 'react';
import { UserPlus, Trash2, Users } from 'lucide-react';
import { barberService } from '../../services/api';
import type { Barber } from '../../services/api';
import toast from 'react-hot-toast';

export default function Barbers() {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadBarbers();
  }, []);

  const loadBarbers = async () => {
    try {
      const data = await barberService.getAll();
      setBarbers(data);
    } catch {
      toast.error('Erro ao carregar barbeiros');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      toast.error('Preencha todos os campos');
      return;
    }
    setLoading(true);
    try {
      await barberService.create(form);
      toast.success('Barbeiro adicionado!');
      setForm({ name: '', email: '', password: '' });
      setShowForm(false);
      loadBarbers();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar barbeiro');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remover barbeiro "${name}"?`)) return;
    try {
      await barberService.delete(id);
      toast.success('Barbeiro removido');
      loadBarbers();
    } catch {
      toast.error('Erro ao remover barbeiro');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Barbeiros</h1>
          <p className="text-gray-400 text-sm">Gerencie os barbeiros da barbearia</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all"
        >
          <UserPlus className="h-4 w-4" />
          <span>Novo Barbeiro</span>
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Nome</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="Nome do barbeiro"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="email@exemplo.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Senha</label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="Senha de acesso"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-white/10 text-gray-300 rounded-xl hover:bg-white/20 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Adicionar'}
            </button>
          </div>
        </form>
      )}

      {barbers.length === 0 ? (
        <div className="text-center py-12 bg-white/5 border border-white/10 rounded-2xl">
          <Users className="h-12 w-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-white font-semibold text-lg mb-2">Nenhum barbeiro cadastrado</h3>
          <p className="text-gray-400">Adicione barbeiros para que os clientes possam escolher.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {barbers.map(barber => (
            <div key={barber.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center text-black font-bold text-lg">
                  {barber.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-white font-semibold">{barber.name}</div>
                  <div className="text-gray-400 text-sm">{barber.email}</div>
                </div>
              </div>
              <button
                onClick={() => handleDelete(barber.id, barber.name)}
                className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
