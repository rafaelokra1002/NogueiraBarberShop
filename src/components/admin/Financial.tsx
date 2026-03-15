import { useState, useEffect, useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  Download,
  Calendar
} from 'lucide-react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { transactionService, type Transaction } from '../../services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Financial() {
  const [expenses, setExpenses] = useState<Transaction[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [periodFilter, setPeriodFilter] = useState<'all' | 'daily' | 'weekly' | 'monthly'>('all');
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    type: 'expense' as 'income' | 'expense'
  });

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const data = await transactionService.getAll();
      setExpenses(data);
    } catch (error) {
      console.error('Erro ao carregar transações:', error);
      toast.error('Erro ao carregar transações');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await transactionService.create({
        description: formData.description,
        amount: parseFloat(formData.amount),
        category: formData.category,
        date: new Date(formData.date),
        type: formData.type
      });

      await loadExpenses();
      setShowAddModal(false);
      setFormData({
        description: '',
        amount: '',
        category: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        type: 'expense'
      });
      
      toast.success('Registro adicionado com sucesso!');
    } catch (error) {
      console.error('Erro ao criar transação:', error);
      toast.error('Erro ao criar transação');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este registro?')) return;

    try {
      await transactionService.delete(id);
      await loadExpenses();
      toast.success('Registro removido!');
    } catch (error) {
      console.error('Erro ao deletar transação:', error);
      toast.error('Erro ao deletar transação');
    }
  };

  const periodFilteredExpenses = useMemo(() => {
    if (periodFilter === 'all') return expenses;
    const now = new Date();
    let start: Date, end: Date;
    switch (periodFilter) {
      case 'daily':
        start = startOfDay(now);
        end = endOfDay(now);
        break;
      case 'weekly':
        start = startOfWeek(now, { weekStartsOn: 1 });
        end = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case 'monthly':
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
    }
    return expenses.filter(e => {
      const d = new Date(e.date);
      return isWithinInterval(d, { start, end });
    });
  }, [expenses, periodFilter]);

  const filteredExpenses = periodFilteredExpenses.filter(e => 
    filterType === 'all' || e.type === filterType
  );

  const totalIncome = periodFilteredExpenses
    .filter(e => e.type === 'income')
    .reduce((acc, e) => acc + e.amount, 0);

  const totalExpense = periodFilteredExpenses
    .filter(e => e.type === 'expense')
    .reduce((acc, e) => acc + e.amount, 0);

  const balance = totalIncome - totalExpense;

  const periodLabel = periodFilter === 'daily' ? 'Hoje'
    : periodFilter === 'weekly' ? 'Esta Semana'
    : periodFilter === 'monthly' ? 'Este Mês'
    : 'Geral';

  const exportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const now = new Date();

    // Header background
    doc.setFillColor(30, 30, 30);
    doc.rect(0, 0, pageWidth, 45, 'F');

    // Title
    doc.setFontSize(22);
    doc.setTextColor(245, 158, 11);
    doc.text('Nogueira Barber Shop', pageWidth / 2, 18, { align: 'center' });

    // Subtitle
    doc.setFontSize(12);
    doc.setTextColor(200, 200, 200);
    doc.text(`Relatório Financeiro - ${periodLabel}`, pageWidth / 2, 28, { align: 'center' });

    // Date
    doc.setFontSize(9);
    doc.setTextColor(160, 160, 160);
    doc.text(`Gerado em: ${format(now, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, pageWidth / 2, 37, { align: 'center' });

    // Summary section
    let y = 55;
    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text('Resumo', 14, y);
    y += 3;
    doc.setDrawColor(245, 158, 11);
    doc.setLineWidth(0.5);
    doc.line(14, y, pageWidth - 14, y);
    y += 10;

    // Summary cards
    const cardWidth = (pageWidth - 42) / 3;

    // Receitas card
    doc.setFillColor(220, 252, 231);
    doc.roundedRect(14, y, cardWidth, 25, 3, 3, 'F');
    doc.setFontSize(9);
    doc.setTextColor(22, 101, 52);
    doc.text('RECEITAS', 14 + cardWidth / 2, y + 9, { align: 'center' });
    doc.setFontSize(14);
    doc.text(`R$ ${totalIncome.toFixed(2)}`, 14 + cardWidth / 2, y + 19, { align: 'center' });

    // Despesas card
    const cardX2 = 14 + cardWidth + 7;
    doc.setFillColor(254, 226, 226);
    doc.roundedRect(cardX2, y, cardWidth, 25, 3, 3, 'F');
    doc.setFontSize(9);
    doc.setTextColor(153, 27, 27);
    doc.text('DESPESAS', cardX2 + cardWidth / 2, y + 9, { align: 'center' });
    doc.setFontSize(14);
    doc.text(`R$ ${totalExpense.toFixed(2)}`, cardX2 + cardWidth / 2, y + 19, { align: 'center' });

    // Saldo card
    const cardX3 = cardX2 + cardWidth + 7;
    doc.setFillColor(balance >= 0 ? 219 : 254, balance >= 0 ? 234 : 215, balance >= 0 ? 254 : 170);
    doc.roundedRect(cardX3, y, cardWidth, 25, 3, 3, 'F');
    doc.setFontSize(9);
    doc.setTextColor(balance >= 0 ? 30 : 154, balance >= 0 ? 64 : 52, balance >= 0 ? 175 : 18);
    doc.text(balance >= 0 ? 'SALDO' : 'DÉFICIT', cardX3 + cardWidth / 2, y + 9, { align: 'center' });
    doc.setFontSize(14);
    doc.text(`R$ ${Math.abs(balance).toFixed(2)}`, cardX3 + cardWidth / 2, y + 19, { align: 'center' });

    y += 38;

    // Transactions table
    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text('Lançamentos', 14, y);
    y += 3;
    doc.setDrawColor(245, 158, 11);
    doc.line(14, y, pageWidth - 14, y);
    y += 5;

    const tableData = filteredExpenses.map(e => [
      format(new Date(e.date), 'dd/MM/yyyy', { locale: ptBR }),
      e.description,
      e.category,
      e.type === 'income' ? 'Receita' : 'Despesa',
      `${e.type === 'income' ? '+' : '-'} R$ ${e.amount.toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 30, 30],
        textColor: [245, 158, 11],
        fontStyle: 'bold',
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [40, 40, 40],
      },
      alternateRowStyles: {
        fillColor: [248, 248, 248],
      },
      columnStyles: {
        0: { cellWidth: 25 },
        3: { cellWidth: 22 },
        4: { halign: 'right', cellWidth: 30 },
      },
      margin: { left: 14, right: 14 },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 4) {
          const val = String(data.cell.raw);
          if (val.startsWith('+')) {
            data.cell.styles.textColor = [22, 101, 52];
            data.cell.styles.fontStyle = 'bold';
          } else {
            data.cell.styles.textColor = [153, 27, 27];
            data.cell.styles.fontStyle = 'bold';
          }
        }
        if (data.section === 'body' && data.column.index === 3) {
          const val = String(data.cell.raw);
          data.cell.styles.textColor = val === 'Receita' ? [22, 101, 52] : [153, 27, 27];
        }
      },
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const pageH = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(160, 160, 160);
      doc.text(`Nogueira Barber Shop - Relatório Financeiro`, 14, pageH - 10);
      doc.text(`Página ${i} de ${pageCount}`, pageWidth - 14, pageH - 10, { align: 'right' });
    }

    const fileName = `relatorio_financeiro_${format(now, 'yyyy-MM-dd_HHmm')}.pdf`;
    doc.save(fileName);
    toast.success('PDF exportado com sucesso!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Period Filter */}
      <div className="bg-white/5 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 border border-white/10">
        <div className="flex items-center space-x-3 mb-3">
          <Calendar className="h-5 w-5 text-amber-400" />
          <h3 className="text-white font-semibold text-sm sm:text-base">Período do Relatório</h3>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-3 overflow-x-auto">
          {[
            { key: 'all' as const, label: 'Geral' },
            { key: 'daily' as const, label: 'Diário' },
            { key: 'weekly' as const, label: 'Semanal' },
            { key: 'monthly' as const, label: 'Mensal' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPeriodFilter(key)}
              className={`px-3 sm:px-4 py-2 rounded-xl transition-all duration-200 whitespace-nowrap text-sm ${
                periodFilter === key
                  ? 'bg-amber-500 text-black font-semibold'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-green-500/30">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="bg-green-500/30 p-2 sm:p-3 rounded-xl">
              <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-green-300" />
            </div>
            <div className="text-right">
              <p className="text-2xl sm:text-3xl font-bold text-white">R$ {totalIncome.toFixed(2)}</p>
              <p className="text-green-300 text-xs sm:text-sm font-medium">Receitas ({periodLabel})</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-500/20 to-red-600/20 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-red-500/30">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="bg-red-500/30 p-2 sm:p-3 rounded-xl">
              <TrendingDown className="h-5 w-5 sm:h-6 sm:w-6 text-red-300" />
            </div>
            <div className="text-right">
              <p className="text-2xl sm:text-3xl font-bold text-white">R$ {totalExpense.toFixed(2)}</p>
              <p className="text-red-300 text-xs sm:text-sm font-medium">Despesas ({periodLabel})</p>
            </div>
          </div>
        </div>

        <div className={`bg-gradient-to-br ${balance >= 0 ? 'from-blue-500/20 to-blue-600/20 border-blue-500/30' : 'from-orange-500/20 to-orange-600/20 border-orange-500/30'} backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 border sm:col-span-2 lg:col-span-1`}>
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className={`${balance >= 0 ? 'bg-blue-500/30' : 'bg-orange-500/30'} p-2 sm:p-3 rounded-xl`}>
              <DollarSign className={`h-5 w-5 sm:h-6 sm:w-6 ${balance >= 0 ? 'text-blue-300' : 'text-orange-300'}`} />
            </div>
            <div className="text-right">
              <p className="text-2xl sm:text-3xl font-bold text-white">R$ {Math.abs(balance).toFixed(2)}</p>
              <p className={`${balance >= 0 ? 'text-blue-300' : 'text-orange-300'} text-xs sm:text-sm font-medium`}>
                {balance >= 0 ? 'Saldo' : 'Déficit'} ({periodLabel})
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center space-x-2 sm:space-x-3 overflow-x-auto pb-2 sm:pb-0">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 sm:px-4 py-2 rounded-xl transition-all duration-200 whitespace-nowrap text-sm ${
              filterType === 'all'
                ? 'bg-amber-500 text-black font-semibold'
                : 'bg-white/5 text-gray-300 hover:bg-white/10'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilterType('income')}
            className={`px-3 sm:px-4 py-2 rounded-xl transition-all duration-200 whitespace-nowrap text-sm ${
              filterType === 'income'
                ? 'bg-green-500 text-black font-semibold'
                : 'bg-white/5 text-gray-300 hover:bg-white/10'
            }`}
          >
            Receitas
          </button>
          <button
            onClick={() => setFilterType('expense')}
            className={`px-3 sm:px-4 py-2 rounded-xl transition-all duration-200 whitespace-nowrap text-sm ${
              filterType === 'expense'
                ? 'bg-red-500 text-black font-semibold'
                : 'bg-white/5 text-gray-300 hover:bg-white/10'
            }`}
          >
            Despesas
          </button>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3">
          <button
            onClick={exportPDF}
            className="flex items-center justify-center space-x-2 px-3 sm:px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all duration-200 flex-1 sm:flex-none"
          >
            <Download className="h-4 w-4" />
            <span className="text-sm">Exportar PDF</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center space-x-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-semibold rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all duration-200 flex-1 sm:flex-none"
          >
            <Plus className="h-4 w-4" />
            <span className="text-sm">Novo</span>
          </button>
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-white/5 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/10">
        <h3 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6">Lançamentos</h3>

        <div className="space-y-3">
          {filteredExpenses.length === 0 ? (
            <div className="text-center py-8 sm:py-12 text-gray-400">
              <DollarSign className="h-12 sm:h-16 w-12 sm:w-16 mx-auto mb-4 opacity-30" />
              <p className="text-sm sm:text-base">Nenhum registro encontrado</p>
            </div>
          ) : (
            filteredExpenses.map((expense) => (
              <div
                key={expense.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-white/5 rounded-xl border border-white/10 hover:border-amber-500/30 transition-all duration-200 gap-3"
              >
                <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                  <div className={`p-2 sm:p-3 rounded-xl flex-shrink-0 ${
                    expense.type === 'income'
                      ? 'bg-green-500/20'
                      : 'bg-red-500/20'
                  }`}>
                    {expense.type === 'income' ? (
                      <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-400" />
                    ) : (
                      <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-red-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm sm:text-base truncate">{expense.description}</p>
                    <div className="flex items-center space-x-2 sm:space-x-3 text-xs sm:text-sm text-gray-400">
                      <span className="truncate">{expense.category}</span>
                      <span>•</span>
                      <span className="whitespace-nowrap">{format(new Date(expense.date), 'dd/MM/yyyy', { locale: ptBR })}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end space-x-3 sm:space-x-4">
                  <p className={`text-lg sm:text-xl font-bold ${
                    expense.type === 'income' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {expense.type === 'income' ? '+' : '-'} R$ {expense.amount.toFixed(2)}
                  </p>
                  <button
                    onClick={() => handleDelete(expense.id)}
                    className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-all duration-200"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl p-8 max-w-md w-full border border-white/10">
            <h3 className="text-2xl font-bold text-white mb-6">Novo Registro</h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Tipo
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'income' })}
                    className={`px-4 py-3 rounded-xl font-semibold transition-all duration-200 ${
                      formData.type === 'income'
                        ? 'bg-green-500 text-black'
                        : 'bg-white/5 text-gray-300'
                    }`}
                  >
                    Receita
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'expense' })}
                    className={`px-4 py-3 rounded-xl font-semibold transition-all duration-200 ${
                      formData.type === 'expense'
                        ? 'bg-red-500 text-black'
                        : 'bg-white/5 text-gray-300'
                    }`}
                  >
                    Despesa
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Descrição
                </label>
                <input
                  type="text"
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Ex: Compra de produtos"
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Valor
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Categoria
                </label>
                <input
                  type="text"
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Ex: Estoque, Serviço"
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Data
                </label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-semibold transition-all duration-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-semibold rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all duration-200"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
