'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ShoppingCart, 
  Plus, 
  Search, 
  Eye, 
  DollarSign, 
  ArrowLeft,
  Filter,
  RefreshCw,
  Calendar,
  User,
  Package,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { useToast, ToastContainer } from '@/components/Toast';

interface Client {
  _id: string;
  name: string;
  company: string;
  creditBalance?: number;
}

interface Sale {
  _id: string;
  client: Client;
  date: string;
  presentation: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  status: 'pending' | 'paid' | 'partial';
  lot?: string;
  notes?: string;
  createdAt: string;
  surplus?: number; // Sobrante específico de esta venta
}

interface StockItem {
  _id: string;
  presentation: string;
  quantity: number;
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    clientId: '',
    status: '',
    dateFrom: '',
    dateTo: '',
  });
  const router = useRouter();
  const { success, error } = useToast();

  const [formData, setFormData] = useState({
    clientId: '',
    quantity: '',
    unitPrice: '',
    lot: '',
    notes: '',
  });

  useEffect(() => {
    loadSales();
    loadClients();
    loadStock();
    success('🛒 Página de ventas cargada');
  }, [currentPage, filters]);

  const loadSales = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
      });
      
      if (filters.clientId) params.append('clientId', filters.clientId);
      if (filters.status) params.append('status', filters.status);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);

      const response = await fetch(`/api/sales?${params}`);
      const data = await response.json();
      
      setSales(data.sales);
      setTotalPages(data.pagination.pages);
    } catch (error) {
      console.error('Error loading sales:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
    try {
      const response = await fetch('/api/clients?limit=100');
      const data = await response.json();
      setClients(data.clients);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const loadStock = async () => {
    try {
      const response = await fetch('/api/stock');
      const data = await response.json();
      // Filtrar solo el stock de Granel
      const granelStock = data.filter((item: StockItem) => item.presentation === 'Granel');
      setStock(granelStock);
    } catch (error) {
      console.error('Error loading stock:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.clientId || !formData.quantity || !formData.unitPrice) {
      error('❌ Por favor complete todos los campos requeridos');
      return;
    }

    // Verificar stock disponible de Granel
    const stockAvailable = getStockAvailable();
    const quantityRequested = parseFloat(formData.quantity);
    if (quantityRequested > stockAvailable) {
      error(`❌ Stock insuficiente. Disponible: ${stockAvailable.toFixed(2)} kg, solicitado: ${quantityRequested.toFixed(2)} kg`);
      return;
    }

    try {
      success('🔄 Procesando venta...');
      
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          presentation: 'Granel', // Siempre Granel
          quantity: formData.quantity, // Mantener en kg
        }),
      });

      if (response.ok) {
        const saleData = await response.json();
        
        // Aplicar saldo a favor automáticamente si el cliente tiene saldo
        const clientCreditBalance = getSelectedClientCreditBalance();
        if (clientCreditBalance > 0) {
          try {
            const totalAmount = parseFloat(formData.quantity) * parseFloat(formData.unitPrice);
            const amountToApply = Math.min(clientCreditBalance, totalAmount);
            
            const creditResponse = await fetch(`/api/clients/${formData.clientId}/apply-credit`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                saleId: saleData.sale._id,
                amount: amountToApply,
              }),
            });

            if (creditResponse.ok) {
              const creditData = await creditResponse.json();
              success(`✅ Venta creada exitosamente. Saldo a favor aplicado: ${formatCurrency(amountToApply)}`);
            } else {
              success('✅ Venta creada exitosamente');
            }
          } catch (creditError) {
            console.error('Error applying credit:', creditError);
            success('✅ Venta creada exitosamente');
          }
        } else {
          success('✅ Venta creada exitosamente');
        }
        
        setFormData({
          clientId: '',
          quantity: '',
          unitPrice: '',
          lot: '',
          notes: '',
        });
        setShowAddForm(false);
        loadSales();
        loadStock(); // Recargar stock después de la venta
      } else {
        const errorData = await response.json();
        error(`❌ ${errorData.error}`);
      }
    } catch (err) {
      console.error('Error creating sale:', err);
      error('❌ Error de conexión. Verifique su conexión a internet e intente nuevamente');
    }
  };

  const getStockAvailable = () => {
    const stockItem = stock.find(item => item.presentation === 'Granel');
    return stockItem ? stockItem.quantity : 0;
  };

  const getSelectedClientCreditBalance = () => {
    const selectedClient = clients.find(client => client._id === formData.clientId);
    return selectedClient?.creditBalance || 0;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'partial':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Pagada';
      case 'partial':
        return 'Parcial';
      case 'pending':
        return 'Pendiente';
      default:
        return 'Desconocido';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(amount);
  };

  if (loading && sales.length === 0) {
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
              <ShoppingCart className="h-8 w-8 text-purple-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">
                Ventas de Pellets (Granel)
              </h1>
            </div>
            <button
              onClick={() => {
                setShowAddForm(true);
                success('📝 Formulario de nueva venta abierto');
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700"
            >
              <Plus className="h-4 w-4 inline mr-2" />
              Nueva Venta
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stock Overview */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Stock Disponible - Granel
              </h3>
              <p className="text-2xl font-bold text-blue-600">
                {getStockAvailable().toFixed(2)} kg
              </p>
              <p className="text-sm text-gray-600">kilogramos disponibles para venta</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cliente
              </label>
              <select
                value={filters.clientId}
                onChange={(e) => setFilters({ ...filters, clientId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
              >
                <option value="">Todos los clientes</option>
                {clients.map((client) => (
                  <option key={client._id} value={client._id}>
                    {client.name} - {client.company}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
              >
                <option value="">Todos los estados</option>
                <option value="pending">Pendiente</option>
                <option value="partial">Parcial</option>
                <option value="paid">Pagada</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Desde
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hasta
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  loadSales();
                  success('🔍 Filtros aplicados');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <RefreshCw className="h-4 w-4 inline mr-2" />
                Filtrar
              </button>
            </div>
          </div>
        </div>

        {/* Modal de Nueva Venta */}
        {showAddForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-6 border w-[500px] shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">
                    Nueva Venta (Granel)
                  </h3>
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      success('❌ Formulario cancelado');
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Cliente */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cliente *
                    </label>
                    <select
                      value={formData.clientId}
                      onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
                      required
                    >
                      <option value="">Seleccionar cliente</option>
                      {clients.map((client) => (
                        <option key={client._id} value={client._id}>
                          {client.name} - {client.company}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Stock Disponible */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Stock Disponible
                    </label>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md">
                      <span className="text-sm font-medium text-gray-900">
                        {getStockAvailable().toFixed(2)} kg (Granel)
                      </span>
                    </div>
                  </div>

                  {/* Saldo a Favor del Cliente */}
                  {formData.clientId && getSelectedClientCreditBalance() > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Saldo a Favor del Cliente
                      </label>
                      <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-md">
                        <span className="text-sm font-medium text-blue-600">
                          {formatCurrency(getSelectedClientCreditBalance())}
                        </span>
                        <p className="text-xs text-blue-600 mt-1">
                          💡 Este saldo se puede aplicar automáticamente al crear la venta
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Cantidad en kg */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cantidad (kg) *
                    </label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      placeholder="Ingrese cantidad en kilogramos"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
                      required
                    />
                  </div>

                  {/* Precio Unitario */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Precio Unitario (por kg) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.unitPrice}
                      onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                      placeholder="Precio por kilogramo"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
                      required
                    />
                  </div>

                  {/* Lote */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Lote (opcional)
                    </label>
                    <input
                      type="text"
                      value={formData.lot}
                      onChange={(e) => setFormData({ ...formData, lot: e.target.value })}
                      placeholder="Número de lote"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
                    />
                  </div>

                  {/* Notas */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notas (opcional)
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      placeholder="Notas adicionales sobre la venta..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
                    />
                  </div>

                  {/* Resumen de la Venta */}
                  {(formData.quantity || formData.unitPrice) && (
                    <div className="bg-gray-50 p-4 rounded-lg border">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Resumen de la Venta</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Cantidad:</span>
                          <span className="ml-2 font-medium">
                            {formData.quantity ? `${formData.quantity} kg` : '-'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Precio unitario:</span>
                          <span className="ml-2 font-medium">
                            {formData.unitPrice ? `${formatCurrency(parseFloat(formData.unitPrice))}/kg` : '-'}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-600">Total:</span>
                          <span className="ml-2 font-bold text-lg text-purple-600">
                            {formatCurrency((parseFloat(formData.quantity) || 0) * (parseFloat(formData.unitPrice) || 0))}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Botones */}
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddForm(false);
                        success('❌ Formulario cancelado');
                      }}
                      className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={!formData.clientId || !formData.quantity || !formData.unitPrice}
                      className="px-6 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Crear Venta
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Sales Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Ventas ({sales.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cantidad (kg)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Saldo a Favor
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sales.map((sale) => (
                  <tr key={sale._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-purple-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {sale.client.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {sale.client.company}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(sale.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sale.quantity} kg
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(sale.totalAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(sale.status)}`}>
                        {getStatusIcon(sale.status)}
                        <span className="ml-1">{getStatusText(sale.status)}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                      {sale.surplus && sale.surplus > 0 ? (
                  <span className="text-blue-600 font-medium">
                    {formatCurrency(sale.surplus)}
                  </span>
                ) : (
                  <span className="text-gray-500">$0.00</span>
                )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => {
                            setSelectedSale(sale);
                            success(`📋 Ver detalles de venta a ${sale.client.name}`);
                          }}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="Ver detalles"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {sale.status !== 'paid' && (
                          <button
                            onClick={() => router.push(`/dashboard/sales/${sale._id}/payments`)}
                            className="text-green-600 hover:text-green-900 p-1"
                            title="Registrar pago"
                          >
                            <DollarSign className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
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

        {/* Sale Details Modal */}
        {selectedSale && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Detalles de Venta
                  </h3>
                  <button
                    onClick={() => setSelectedSale(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Cliente:</label>
                    <p className="text-sm text-gray-900">{selectedSale.client.name}</p>
                    <p className="text-xs text-gray-500">{selectedSale.client.company}</p>
                    {selectedSale.surplus && selectedSale.surplus > 0 && (
                      <p className="text-xs text-blue-600 font-medium">
                        Sobrante de esta venta: {formatCurrency(selectedSale.surplus)}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Fecha:</label>
                    <p className="text-sm text-gray-900">{formatDate(selectedSale.date)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Producto:</label>
                    <p className="text-sm text-gray-900">{selectedSale.presentation}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Cantidad:</label>
                    <p className="text-sm text-gray-900">{selectedSale.quantity} kg</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Precio unitario:</label>
                    <p className="text-sm text-gray-900">{formatCurrency(selectedSale.unitPrice)}/kg</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Total:</label>
                    <p className="text-sm font-bold text-purple-600">{formatCurrency(selectedSale.totalAmount)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Estado:</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedSale.status)}`}>
                      {getStatusIcon(selectedSale.status)}
                      <span className="ml-1">{getStatusText(selectedSale.status)}</span>
                    </span>
                  </div>
                  {selectedSale.lot && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Lote:</label>
                      <p className="text-sm text-gray-900">{selectedSale.lot}</p>
                    </div>
                  )}
                  {selectedSale.notes && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Notas:</label>
                      <p className="text-sm text-gray-900">{selectedSale.notes}</p>
                    </div>
                  )}
                </div>
                <div className="flex justify-end mt-6 space-x-3">
                  {selectedSale.status !== 'paid' && (
                    <button
                      onClick={() => {
                        setSelectedSale(null);
                        router.push(`/dashboard/sales/${selectedSale._id}/payments`);
                      }}
                      className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700"
                    >
                      Registrar Pago
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setSelectedSale(null);
                      success('❌ Detalles cerrados');
                    }}
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
        <ToastContainer toasts={[]} removeToast={() => {}} />
      </main>
    </div>
  );
} 