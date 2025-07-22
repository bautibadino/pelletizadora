'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  CreditCard, 
  Plus, 
  Search, 
  Edit, 
  Eye, 
  Trash2, 
  ArrowLeft,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Truck
} from 'lucide-react';
import { useToast, ToastContainer } from '@/components/Toast';
import { roundToTwoDecimals, formatCurrency } from '@/lib/utils';

interface Check {
  _id: string;
  checkNumber: string;
  amount: number;
  isEcheq: boolean;
  receptionDate: string;
  dueDate: string;
  receivedFrom: string;
  issuedBy: string;
  status: 'pendiente' | 'cobrado' | 'rechazado' | 'vencido' | 'entregado';
  bankName?: string;
  accountNumber?: string;
  notes?: string;
  // Información de entrega
  deliveredTo?: string;
  deliveredDate?: string;
  deliveredFor?: string;
  invoiceId?: {
    _id: string;
    invoiceNumber: string;
    supplierId: {
      businessName: string;
    };
  };
  createdAt: string;
  updatedAt: string;
}

interface CheckStats {
  pendiente?: { count: number; totalAmount: number };
  cobrado?: { count: number; totalAmount: number };
  rechazado?: { count: number; totalAmount: number };
  vencido?: { count: number; totalAmount: number };
  entregado?: { count: number; totalAmount: number };
}

export default function ChecksPage() {
  const { toasts, removeToast, success, error } = useToast();
  const [checks, setChecks] = useState<Check[]>([]);
  const [stats, setStats] = useState<CheckStats>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCheck, setEditingCheck] = useState<Check | null>(null);
  const [selectedCheck, setSelectedCheck] = useState<Check | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isEcheqFilter, setIsEcheqFilter] = useState<string>('');
  const [showDueSoon, setShowDueSoon] = useState(false);
  const router = useRouter();

  const [formData, setFormData] = useState({
    checkNumber: '',
    amount: '',
    isEcheq: false,
    receptionDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    receivedFrom: '',
    issuedBy: '',
    bankName: '',
    accountNumber: '',
    notes: ''
  });

  useEffect(() => {
    loadChecks();
  }, [currentPage, searchTerm, statusFilter, isEcheqFilter, showDueSoon]);

  const loadChecks = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
      });
      
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      
      if (statusFilter) {
        params.append('status', statusFilter);
      }
      
      if (isEcheqFilter) {
        params.append('isEcheq', isEcheqFilter);
      }
      
      if (showDueSoon) {
        params.append('dueSoon', 'true');
        params.append('days', '7');
      }

      const response = await fetch(`/api/checks?${params}`);
      const data = await response.json();
      
      if (response.ok) {
        setChecks(data.checks);
        setStats(data.stats);
        setTotalPages(data.pagination.pages);
      } else {
        error('Error al cargar los cheques');
      }
    } catch (err) {
      console.error('Error loading checks:', err);
      error('Error al cargar los cheques');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.checkNumber || !formData.amount || !formData.receivedFrom || !formData.issuedBy) {
      error('Por favor complete todos los campos requeridos');
      return;
    }

    try {
      const url = editingCheck 
        ? `/api/checks/${editingCheck._id}` 
        : '/api/checks';
      
      const method = editingCheck ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          amount: roundToTwoDecimals(Number(formData.amount))
        }),
      });

      if (response.ok) {
        success(editingCheck ? 'Cheque actualizado exitosamente' : 'Cheque creado exitosamente');
        setFormData({
          checkNumber: '',
          amount: '',
          isEcheq: false,
          receptionDate: new Date().toISOString().split('T')[0],
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          receivedFrom: '',
          issuedBy: '',
          bankName: '',
          accountNumber: '',
          notes: ''
        });
        setShowAddForm(false);
        setEditingCheck(null);
        loadChecks();
      } else {
        const errorData = await response.json();
        if (errorData.details) {
          error(`Error de validación: ${errorData.details}`);
        } else {
          error(errorData.error || 'Error al guardar el cheque');
        }
      }
    } catch (err) {
      console.error('Error saving check:', err);
      error('Error al guardar el cheque');
    }
  };

  const handleEdit = (check: Check) => {
    setEditingCheck(check);
    setFormData({
      checkNumber: check.checkNumber,
      amount: check.amount.toString(),
      isEcheq: check.isEcheq,
      receptionDate: new Date(check.receptionDate).toISOString().split('T')[0],
      dueDate: new Date(check.dueDate).toISOString().split('T')[0],
      receivedFrom: check.receivedFrom,
      issuedBy: check.issuedBy,
      bankName: check.bankName || '',
      accountNumber: check.accountNumber || '',
      notes: check.notes || ''
    });
    setShowAddForm(true);
  };

  const handleDelete = async (checkId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este cheque?')) {
      return;
    }

    try {
      const response = await fetch(`/api/checks/${checkId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        success('Cheque eliminado exitosamente');
        loadChecks();
      } else {
        const errorData = await response.json();
        error(errorData.error || 'Error al eliminar el cheque');
      }
    } catch (err) {
      console.error('Error deleting check:', err);
      error('Error al eliminar el cheque');
    }
  };

  const handleStatusChange = async (checkId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/checks/${checkId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        success(`Cheque marcado como ${newStatus}`);
        loadChecks();
      } else {
        const errorData = await response.json();
        error(errorData.error || 'Error al cambiar el estado');
      }
    } catch (err) {
      console.error('Error changing status:', err);
      error('Error al cambiar el estado');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'cobrado': return 'bg-green-100 text-green-800';
      case 'rechazado': return 'bg-red-100 text-red-800';
      case 'vencido': return 'bg-orange-100 text-orange-800';
      case 'entregado': return 'bg-blue-100 text-blue-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'cobrado': return <CheckCircle className="h-4 w-4" />;
      case 'rechazado': return <XCircle className="h-4 w-4" />;
      case 'vencido': return <AlertTriangle className="h-4 w-4" />;
      case 'entregado': return <Truck className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR');
  };

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading && checks.length === 0) {
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/dashboard')}
                className="mr-4 p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <CreditCard className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">
                Gestión de Cheques
              </h1>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 inline mr-2" />
              Nuevo Cheque
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pendientes</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {stats.pendiente?.count || 0}
                </p>
                <p className="text-sm text-gray-500">
                  ${formatCurrency(stats.pendiente?.totalAmount || 0)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Cobrados</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.cobrado?.count || 0}
                </p>
                <p className="text-sm text-gray-500">
                  ${formatCurrency(stats.cobrado?.totalAmount || 0)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Vencidos</p>
                <p className="text-2xl font-bold text-orange-600">
                  {stats.vencido?.count || 0}
                </p>
                <p className="text-sm text-gray-500">
                  ${formatCurrency(stats.vencido?.totalAmount || 0)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Rechazados</p>
                <p className="text-2xl font-bold text-red-600">
                  {stats.rechazado?.count || 0}
                </p>
                <p className="text-sm text-gray-500">
                  ${formatCurrency(stats.rechazado?.totalAmount || 0)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Truck className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Entregados</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.entregado?.count || 0}
                </p>
                <p className="text-sm text-gray-500">
                  ${formatCurrency(stats.entregado?.totalAmount || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por número de cheque, recibido de, emitido por..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todos los estados</option>
                <option value="pendiente">Pendiente</option>
                <option value="cobrado">Cobrado</option>
                <option value="rechazado">Rechazado</option>
                <option value="vencido">Vencido</option>
                <option value="entregado">Entregado</option>
              </select>
              
              <select
                value={isEcheqFilter}
                onChange={(e) => setIsEcheqFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todos los tipos</option>
                <option value="true">E-Cheque</option>
                <option value="false">Cheque físico</option>
              </select>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showDueSoon}
                  onChange={(e) => setShowDueSoon(e.target.checked)}
                  className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Próximos a vencer</span>
              </label>
              
              <button
                onClick={loadChecks}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <RefreshCw className="h-4 w-4 inline mr-2" />
                Actualizar
              </button>
            </div>
          </div>
        </div>

        {/* Add/Edit Form */}
        {showAddForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingCheck ? 'Editar Cheque' : 'Nuevo Cheque'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número de Cheque *
                  </label>
                  <input
                    type="text"
                    value={formData.checkNumber}
                    onChange={(e) => setFormData({ ...formData, checkNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monto *
                  </label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Recibido de *
                  </label>
                  <input
                    type="text"
                    value={formData.receivedFrom}
                    onChange={(e) => setFormData({ ...formData, receivedFrom: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Emitido por *
                  </label>
                  <input
                    type="text"
                    value={formData.issuedBy}
                    onChange={(e) => setFormData({ ...formData, issuedBy: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                    placeholder="Empresa que emite el cheque"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Recepción
                  </label>
                  <input
                    type="date"
                    value={formData.receptionDate}
                    onChange={(e) => setFormData({ ...formData, receptionDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Vencimiento *
                  </label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Banco
                  </label>
                  <input
                    type="text"
                    value={formData.bankName}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                    placeholder="Nombre del banco (opcional)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número de Cuenta
                  </label>
                  <input
                    type="text"
                    value={formData.accountNumber}
                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                    placeholder="Número de cuenta (opcional)"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isEcheq}
                    onChange={(e) => setFormData({ ...formData, isEcheq: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700">
                    Es E-Cheque
                  </span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notas
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingCheck(null);
                    setFormData({
                      checkNumber: '',
                      amount: '',
                      isEcheq: false,
                      receptionDate: new Date().toISOString().split('T')[0],
                      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                      receivedFrom: '',
                      issuedBy: '',
                      bankName: '',
                      accountNumber: '',
                      notes: ''
                    });
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                >
                  {editingCheck ? 'Actualizar' : 'Crear'} Cheque
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Checks Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Cheques ({checks.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cheque
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Monto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Recibido de
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Emitido por
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fechas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Entrega
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {checks.map((check) => {
                  const daysUntilDue = getDaysUntilDue(check.dueDate);
                  const isOverdue = daysUntilDue < 0;
                  
                  return (
                    <tr key={check._id} className={`hover:bg-gray-50 ${isOverdue ? 'bg-red-50' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <CreditCard className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {check.checkNumber}
                            </div>
                            <div className="text-sm text-gray-500">
                              {check.isEcheq ? 'E-Cheque' : 'Cheque físico'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          ${formatCurrency(check.amount)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{check.receivedFrom}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{check.issuedBy}</div>
                        {check.bankName && (
                          <div className="text-sm text-gray-500">{check.bankName}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <div>Rec: {formatDate(check.receptionDate)}</div>
                          <div>Vto: {formatDate(check.dueDate)}</div>
                          {check.status === 'pendiente' && (
                            <div className={`text-xs ${isOverdue ? 'text-red-600' : 'text-gray-500'}`}>
                              {isOverdue ? `${Math.abs(daysUntilDue)} días vencido` : `${daysUntilDue} días`}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(check.status)}`}>
                          {getStatusIcon(check.status)}
                          <span className="ml-1">{check.status.toUpperCase()}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {check.status === 'entregado' ? (
                          <div className="text-sm">
                            <div className="text-gray-900 font-medium">{check.deliveredTo}</div>
                            <div className="text-gray-500 text-xs">
                              {check.deliveredDate && formatDate(check.deliveredDate)}
                            </div>
                            {check.invoiceId && (
                              <div className="text-blue-600 text-xs">
                                Factura #{check.invoiceId.invoiceNumber}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-400">-</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          {check.status === 'pendiente' && (
                            <>
                              <button
                                onClick={() => handleStatusChange(check._id, 'cobrado')}
                                className="text-green-600 hover:text-green-900 p-1"
                                title="Marcar como cobrado"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleStatusChange(check._id, 'rechazado')}
                                className="text-red-600 hover:text-red-900 p-1"
                                title="Marcar como rechazado"
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => setSelectedCheck(check)}
                            className="text-blue-600 hover:text-blue-900 p-1"
                            title="Ver detalles"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(check)}
                            className="text-orange-600 hover:text-orange-900 p-1"
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          {check.status !== 'cobrado' && (
                            <button
                              onClick={() => handleDelete(check._id)}
                              className="text-red-600 hover:text-red-900 p-1"
                              title="Eliminar"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-4 rounded-lg shadow">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Página <span className="font-medium">{currentPage}</span> de{' '}
                  <span className="font-medium">{totalPages}</span>
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Siguiente
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}

        {/* Check Details Modal */}
        {selectedCheck && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Detalles del Cheque
                  </h3>
                  <button
                    onClick={() => setSelectedCheck(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Número:</label>
                    <p className="text-sm text-gray-900">{selectedCheck.checkNumber}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Monto:</label>
                    <p className="text-sm text-gray-900">${formatCurrency(selectedCheck.amount)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Tipo:</label>
                    <p className="text-sm text-gray-900">{selectedCheck.isEcheq ? 'E-Cheque' : 'Cheque físico'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Recibido de:</label>
                    <p className="text-sm text-gray-900">{selectedCheck.receivedFrom}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Emitido por:</label>
                    <p className="text-sm text-gray-900">{selectedCheck.issuedBy}</p>
                  </div>
                  {selectedCheck.bankName && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Banco:</label>
                      <p className="text-sm text-gray-900">{selectedCheck.bankName}</p>
                    </div>
                  )}
                  {selectedCheck.accountNumber && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Cuenta:</label>
                      <p className="text-sm text-gray-900">{selectedCheck.accountNumber}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-gray-700">Fecha de recepción:</label>
                    <p className="text-sm text-gray-900">{formatDate(selectedCheck.receptionDate)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Fecha de vencimiento:</label>
                    <p className="text-sm text-gray-900">{formatDate(selectedCheck.dueDate)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Estado:</label>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(selectedCheck.status)}`}>
                      {getStatusIcon(selectedCheck.status)}
                      <span className="ml-1">{selectedCheck.status.toUpperCase()}</span>
                    </span>
                  </div>
                  {selectedCheck.notes && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Notas:</label>
                      <p className="text-sm text-gray-900">{selectedCheck.notes}</p>
                    </div>
                  )}
                  
                  {/* Información de entrega */}
                  {selectedCheck.status === 'entregado' && (
                    <div className="border-t pt-3 mt-3">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Información de Entrega:</h4>
                      <div className="space-y-2">
                        <div>
                          <label className="text-xs font-medium text-gray-600">Entregado a:</label>
                          <p className="text-sm text-gray-900">{selectedCheck.deliveredTo}</p>
                        </div>
                        {selectedCheck.deliveredDate && (
                          <div>
                            <label className="text-xs font-medium text-gray-600">Fecha de entrega:</label>
                            <p className="text-sm text-gray-900">{formatDate(selectedCheck.deliveredDate)}</p>
                          </div>
                        )}
                        {selectedCheck.deliveredFor && (
                          <div>
                            <label className="text-xs font-medium text-gray-600">Motivo:</label>
                            <p className="text-sm text-gray-900">{selectedCheck.deliveredFor}</p>
                          </div>
                        )}
                        {selectedCheck.invoiceId && (
                          <div>
                            <label className="text-xs font-medium text-gray-600">Factura:</label>
                            <p className="text-sm text-blue-600 font-medium">
                              #{selectedCheck.invoiceId.invoiceNumber} - {selectedCheck.invoiceId.supplierId.businessName}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex justify-end mt-6 space-x-3">
                  <button
                    onClick={() => {
                      setSelectedCheck(null);
                      handleEdit(selectedCheck);
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => setSelectedCheck(null)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Toast Container */}
        <ToastContainer toasts={toasts} removeToast={removeToast} />
      </main>
    </div>
  );
} 