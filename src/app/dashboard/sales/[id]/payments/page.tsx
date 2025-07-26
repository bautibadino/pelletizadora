'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, DollarSign, Plus, User, Package, Calendar, X, CreditCard, Banknote, Building2, CheckCircle } from 'lucide-react';
import { useToast, ToastContainer } from '@/components/Toast';

interface Sale {
  _id: string;
  client: {
    _id: string;
    name: string;
    company: string;
    creditBalance?: number;
  };
  date: string;
  presentation: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  status: 'pending' | 'paid' | 'partial';
  lot?: string;
  notes?: string;
}

interface Payment {
  _id: string;
  amount: number;
  date: string;
  method: 'efectivo' | 'transferencia' | 'cheque' | 'tarjeta';
  reference?: string;
  notes?: string;
}

interface PendingPayment {
  id: string;
  amount: number;
  method: 'efectivo' | 'transferencia' | 'cheque' | 'tarjeta' | 'saldo_a_favor';
  reference?: string;
  notes?: string;
  // Campos específicos para cheques
  checkAmount?: number;
  checkNumber?: string;
  isEcheq?: boolean;
  receptionDate?: string;
  dueDate?: string;
  receivedFrom?: string;
  issuedBy?: string;
  bankName?: string;
  accountNumber?: string;
}

export default function SalePaymentsPage() {
  const [sale, setSale] = useState<Sale | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showCheckPopup, setShowCheckPopup] = useState(false);
  const [currentPaymentMethod, setCurrentPaymentMethod] = useState<'efectivo' | 'transferencia' | 'cheque' | 'tarjeta' | 'saldo_a_favor'>('efectivo');
  const router = useRouter();
  const params = useParams();
  const saleId = params.id as string;
  const { success, error } = useToast();

  const [formData, setFormData] = useState({
    amount: '',
    method: 'efectivo' as 'efectivo' | 'transferencia' | 'cheque' | 'tarjeta' | 'saldo_a_favor',
    reference: '',
    notes: '',
  });

  const [checkFormData, setCheckFormData] = useState({
    amount: '',
    checkNumber: '',
    isEcheq: false,
    receptionDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    receivedFrom: '',
    issuedBy: '',
    bankName: '',
    accountNumber: '',
  });

  useEffect(() => {
    if (saleId) {
      loadSale();
      loadPayments();
    }
  }, [saleId]);

  // Efecto para pre-llenar "Recibido de" cuando se carga la venta
  useEffect(() => {
    if (sale && sale.client && !checkFormData.receivedFrom) {
      const clientName = sale.client.company || sale.client.name;
      setCheckFormData(prev => ({
        ...prev,
        receivedFrom: clientName
      }));
    }
  }, [sale]);

  const loadSale = async () => {
    try {
      const response = await fetch(`/api/sales/${saleId}`);
      const data = await response.json();
      setSale(data);
    } catch (error) {
      console.error('Error loading sale:', error);
    }
  };

  const loadPayments = async () => {
    try {
      const response = await fetch(`/api/payments?saleId=${saleId}`);
      const data = await response.json();
      setPayments(data);
    } catch (error) {
      console.error('Error loading payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTotalPaid = () => {
    return payments.reduce((sum, payment) => sum + payment.amount, 0);
  };

  const getPendingPaymentsTotal = () => {
    return pendingPayments.reduce((sum, payment) => sum + payment.amount, 0);
  };

  const getRemainingAmount = () => {
    const totalPaid = getTotalPaid();
    const pendingTotal = getPendingPaymentsTotal();
    return sale ? sale.totalAmount - totalPaid - pendingTotal : 0;
  };

  const getClientCreditBalance = () => {
    return sale?.client?.creditBalance || 0;
  };

  const handleAddPayment = () => {
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      error('Debe ingresar un monto válido');
      return;
    }

    const amount = parseFloat(formData.amount);
    const remaining = getRemainingAmount();
    const clientCreditBalance = getClientCreditBalance();

    if (currentPaymentMethod === 'saldo_a_favor') {
      // Validar que el cliente tenga saldo a favor suficiente
      if (clientCreditBalance <= 0) {
        error('El cliente no tiene saldo a favor disponible');
      return;
    }

      // El monto máximo que se puede usar del saldo a favor es el mínimo entre:
      // 1. El saldo a favor disponible
      // 2. El monto pendiente de la venta
      const maxAmount = Math.min(clientCreditBalance, remaining);
      
      if (amount > maxAmount) {
        error(`El monto excede el disponible. Máximo: ${formatCurrency(maxAmount)} (Saldo a favor: ${formatCurrency(clientCreditBalance)}, Pendiente: ${formatCurrency(remaining)})`);
        return;
      }
      
      addPendingPayment(amount, currentPaymentMethod);
    } else if (currentPaymentMethod === 'cheque') {
      // Si es cheque, el popup ya debería estar abierto, solo validar
      if (!checkFormData.checkNumber || !checkFormData.receivedFrom || !checkFormData.issuedBy || !checkFormData.dueDate) {
        error('Para pagos con cheque, los campos Número de Cheque, Recibido de, Emitido por y Fecha de Vencimiento son obligatorios');
        return;
      }
      // Agregar el cheque directamente
      addPendingPayment(amount, currentPaymentMethod, checkFormData);
    } else {
      // Permitir sobrantes para otros métodos - no validar que el monto exceda el pendiente
      // El sobrante se aplicará al saldo a favor del cliente
      addPendingPayment(amount, currentPaymentMethod);
    }
  };

  const addPendingPayment = (amount: number, method: string, checkData?: {
    amount?: string;
    checkNumber?: string;
    isEcheq?: boolean;
    receptionDate?: string;
    dueDate?: string;
    receivedFrom?: string;
    issuedBy?: string;
    bankName?: string;
    accountNumber?: string;
  }) => {
        const newPayment: PendingPayment = {
      id: Date.now().toString(),
      amount,
      method: method as 'efectivo' | 'transferencia' | 'cheque' | 'tarjeta' | 'saldo_a_favor',
      reference: formData.reference,
      notes: formData.notes,
      ...(checkData && { 
        checkAmount: checkData.amount ? parseFloat(checkData.amount) : undefined,
        checkNumber: checkData.checkNumber,
        isEcheq: checkData.isEcheq,
        receptionDate: checkData.receptionDate,
        dueDate: checkData.dueDate,
        receivedFrom: checkData.receivedFrom,
        issuedBy: checkData.issuedBy,
        bankName: checkData.bankName,
        accountNumber: checkData.accountNumber,
      })
    };

    setPendingPayments(prev => [...prev, newPayment]);
    
    // Resetear formularios
    setFormData({
      amount: '',
      method: 'efectivo',
      reference: '',
      notes: '',
    });
    setCheckFormData({
      amount: '',
      checkNumber: '',
      isEcheq: false,
      receptionDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      receivedFrom: sale?.client?.company || sale?.client?.name || '',
      issuedBy: '',
      bankName: '',
      accountNumber: '',
    });
    setShowCheckPopup(false);
    setShowAddForm(false);
  };

  const removePendingPayment = (id: string) => {
    setPendingPayments(prev => prev.filter(p => p.id !== id));
  };

  const handleSubmitAllPayments = async () => {
    if (pendingPayments.length === 0) {
      error('No hay pagos pendientes para registrar');
      return;
    }

    try {
      const promises = pendingPayments.map(async (pendingPayment) => {
        // Para cheques, usar el monto del cheque como monto principal
        const paymentAmount = pendingPayment.method === 'cheque' && pendingPayment.checkAmount 
          ? pendingPayment.checkAmount 
          : pendingPayment.amount;

        const paymentData = {
          saleId,
          amount: paymentAmount,
          method: pendingPayment.method,
          reference: pendingPayment.reference,
          notes: pendingPayment.notes,
                     // Campos específicos para cheques
           checkNumber: pendingPayment.checkNumber,
           isEcheq: pendingPayment.isEcheq,
           receptionDate: pendingPayment.receptionDate,
           dueDate: pendingPayment.dueDate,
           receivedFrom: pendingPayment.receivedFrom,
           issuedBy: pendingPayment.issuedBy,
           bankName: pendingPayment.bankName,
           accountNumber: pendingPayment.accountNumber,
           checkAmount: pendingPayment.checkAmount,
        };

        const response = await fetch('/api/payments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(paymentData),
        });

        if (!response.ok) {
          throw new Error(`Error al registrar pago: ${response.statusText}`);
        }

        return response.json();
      });

      const results = await Promise.all(promises);
      
      // Verificar si hubo sobrantes
      let totalSurplus = 0;
      results.forEach(result => {
        if (result.surplusAmount) {
          totalSurplus += result.surplusAmount;
        }
      });
      
      // Limpiar pagos pendientes
      setPendingPayments([]);
      
      // Recargar datos
      await loadPayments();
      await loadSale();
      
      if (totalSurplus > 0) {
        success(`Pagos registrados exitosamente. Sobrante de ${formatCurrency(totalSurplus)} aplicado al saldo a favor del cliente.`);
      } else {
      success('Pagos registrados exitosamente');
      }
         } catch (err) {
       console.error('Error submitting payments:', err);
       error('Error al registrar los pagos');
     }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'efectivo':
        return <Banknote className="h-5 w-5 text-green-600" />;
      case 'transferencia':
        return <Building2 className="h-5 w-5 text-blue-600" />;
      case 'cheque':
        return <CheckCircle className="h-5 w-5 text-orange-600" />;
      case 'tarjeta':
        return <CreditCard className="h-5 w-5 text-purple-600" />;
      case 'saldo_a_favor':
        return <DollarSign className="h-5 w-5 text-blue-600" />;
      default:
        return <DollarSign className="h-5 w-5 text-gray-600" />;
    }
  };

  const getMethodText = (method: string) => {
    switch (method) {
      case 'efectivo':
        return 'Efectivo';
      case 'transferencia':
        return 'Transferencia';
      case 'cheque':
        return 'Cheque';
      case 'tarjeta':
        return 'Tarjeta';
      case 'saldo_a_favor':
        return 'Saldo a Favor';
      default:
        return method;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2
    }).format(amount);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  }

  if (!sale) {
    return <div className="min-h-screen flex items-center justify-center">Venta no encontrada</div>;
  }

  const totalPaid = getTotalPaid();
  const pendingTotal = getPendingPaymentsTotal();
  const remainingAmount = getRemainingAmount();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/dashboard/sales')}
                className="mr-4 p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <DollarSign className="h-8 w-8 text-green-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">
                Pagos de Venta
              </h1>
            </div>
            {remainingAmount > 0 && (
              <button
                onClick={() => setShowAddForm(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700"
              >
                <Plus className="h-4 w-4 inline mr-2" />
                Agregar Pago
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Sale Summary */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Resumen de Venta
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Cliente</h4>
              <div className="flex items-center">
                <User className="h-5 w-5 text-gray-400 mr-2" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{sale.client.name}</p>
                  <p className="text-sm text-gray-500">{sale.client.company}</p>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Producto</h4>
              <div className="flex items-center">
                <Package className="h-5 w-5 text-gray-400 mr-2" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{sale.presentation}</p>
                  <p className="text-sm text-gray-500">{sale.quantity} unidades</p>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Fecha</h4>
              <div className="flex items-center">
                <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                <p className="text-sm text-gray-900">{formatDate(sale.date)}</p>
              </div>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div>
                <p className="text-sm text-gray-600">Precio unitario</p>
                <p className="text-lg font-semibold text-gray-900">{formatCurrency(sale.unitPrice)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total venta</p>
                <p className="text-lg font-semibold text-purple-600">{formatCurrency(sale.totalAmount)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total pagado</p>
                <p className="text-lg font-semibold text-green-600">{formatCurrency(totalPaid)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Pendiente</p>
                <p className="text-lg font-semibold text-orange-600">{formatCurrency(pendingTotal)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Restante</p>
                <p className={`text-lg font-semibold ${remainingAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(remainingAmount)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Saldo a favor</p>
                <p className="text-lg font-semibold text-blue-600">{formatCurrency(getClientCreditBalance())}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Add Payment Form */}
        {showAddForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Agregar Pago
            </h3>
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>💡 Información:</strong> 
                {currentPaymentMethod === 'saldo_a_favor' ? (
                  <>
                    <strong>Saldo a Favor:</strong> {formatCurrency(getClientCreditBalance())} | 
                    <strong>Pendiente:</strong> {formatCurrency(remainingAmount)} | 
                    <strong>Máximo disponible:</strong> {formatCurrency(Math.min(getClientCreditBalance(), remainingAmount))}
                  </>
                ) : (
                  <>
                    Puede ingresar un monto mayor al pendiente. 
                    El excedente se aplicará automáticamente al saldo a favor del cliente.
                  </>
                )}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monto *
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 placeholder-gray-500"
                  placeholder="0.00"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Pendiente: {formatCurrency(remainingAmount)} | 
                  {formData.amount && parseFloat(formData.amount) > remainingAmount && (
                    <span className="text-blue-600 font-medium">
                      Sobrante: {formatCurrency(parseFloat(formData.amount) - remainingAmount)}
                    </span>
                  )}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Método de Pago *
                </label>
                <select
                  value={currentPaymentMethod}
                  onChange={(e) => {
                    const newMethod = e.target.value as 'efectivo' | 'transferencia' | 'cheque' | 'tarjeta' | 'saldo_a_favor';
                    setCurrentPaymentMethod(newMethod);
                    
                    // Si se selecciona cheque, mostrar el popup inmediatamente
                    if (newMethod === 'cheque') {
                        setShowCheckPopup(true);
                      success('📋 Formulario de cheque abierto. Complete la información del cheque.');
                    } else {
                      // Si se cambia a otro método, cerrar el popup del cheque
                      setShowCheckPopup(false);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900"
                  required
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="cheque">Cheque</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="saldo_a_favor">Saldo a Favor</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Referencia (opcional)
                </label>
                <input
                  type="text"
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 placeholder-gray-500"
                  placeholder="Número de comprobante, cheque, etc."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notas (opcional)
                </label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 placeholder-gray-500"
                  placeholder="Notas adicionales"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setFormData({
                    amount: '',
                    method: 'efectivo',
                    reference: '',
                    notes: '',
                  });
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAddPayment}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700"
              >
                Agregar Pago
              </button>
            </div>
          </div>
        )}

        {/* Pending Payments */}
        {pendingPayments.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Pagos Pendientes ({pendingPayments.length})
            </h3>
            <div className="space-y-3">
              {pendingPayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-4">
                    {getMethodIcon(payment.method)}
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {getMethodText(payment.method)} - {formatCurrency(payment.amount)}
                      </p>
                      {payment.reference && (
                        <p className="text-sm text-gray-500">Ref: {payment.reference}</p>
                      )}
                                             {payment.method === 'cheque' && payment.checkNumber && (
                         <p className="text-sm text-gray-500">
                           Cheque: {payment.checkNumber} - {formatCurrency(payment.checkAmount || 0)}
                         </p>
                       )}
                    </div>
                  </div>
                  <button
                    onClick={() => removePendingPayment(payment.id)}
                    className="p-1 text-red-600 hover:text-red-800"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-900">
                Total pendiente: {formatCurrency(pendingTotal)}
              </p>
              <button
                onClick={handleSubmitAllPayments}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
              >
                Confirmar Todos los Pagos
              </button>
            </div>
          </div>
        )}

        {/* Payment History */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Historial de Pagos ({payments.length})
          </h3>
          {payments.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No hay pagos registrados</p>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => (
                <div key={payment._id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-4">
                    {getMethodIcon(payment.method)}
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {getMethodText(payment.method)} - {formatCurrency(payment.amount)}
                      </p>
                      <p className="text-sm text-gray-500">{formatDate(payment.date)}</p>
                      {payment.reference && (
                        <p className="text-sm text-gray-500">Ref: {payment.reference}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Check Popup */}
      {showCheckPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Información del Cheque
                </h3>
                                 <button
                   onClick={() => {
                     setShowCheckPopup(false);
                     setCurrentPaymentMethod('efectivo');
                   }}
                   className="text-gray-400 hover:text-gray-600"
                 >
                   <X className="h-6 w-6" />
                 </button>
              </div>

              {/* Resumen del pago */}
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Resumen del Pago</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-blue-700">Monto del pago:</p>
                    <p className="font-semibold text-blue-900">{formData.amount ? formatCurrency(parseFloat(formData.amount)) : '$0.00'}</p>
                  </div>
                  <div>
                    <p className="text-blue-700">Cliente:</p>
                    <p className="font-semibold text-blue-900">{sale?.client?.company || sale?.client?.name}</p>
                  </div>
                </div>
              </div>

                             <form onSubmit={(e) => {
                 e.preventDefault();
                 
                 // Validar que hay un monto del pago válido
                 if (!formData.amount || parseFloat(formData.amount) <= 0) {
                   error('Debe ingresar un monto válido para el pago');
                   return;
                 }
                 
                 // Validar que hay un monto del cheque
                 if (!checkFormData.amount || parseFloat(checkFormData.amount) <= 0) {
                   error('Debe ingresar un monto válido para el cheque');
                   return;
                 }
                 
                 const checkAmount = parseFloat(checkFormData.amount);
                 const paymentAmount = parseFloat(formData.amount);
                 
                 // Permitir que el monto del cheque sea mayor al monto del pago
                 // El sobrante se aplicará al saldo a favor del cliente
                 
                 addPendingPayment(paymentAmount, 'cheque', checkFormData);
               }}>
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">
                       Monto del Cheque *
                     </label>
                     <input
                       type="number"
                       min="0.01"
                       step="0.01"
                       value={checkFormData.amount}
                       onChange={(e) => setCheckFormData({ ...checkFormData, amount: e.target.value })}
                       className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                       placeholder="0.00"
                       required
                     />
                     <p className="text-xs text-gray-500 mt-1">
                       El sobrante se aplicará al saldo a favor del cliente
                     </p>
                   </div>

                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">
                       Número de Cheque *
                     </label>
                     <input
                       type="text"
                       value={checkFormData.checkNumber}
                       onChange={(e) => setCheckFormData({ ...checkFormData, checkNumber: e.target.value })}
                       className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                       placeholder="Número del cheque"
                       required
                     />
                   </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Recibido de *
                    </label>
                    <input
                      type="text"
                      value={checkFormData.receivedFrom}
                      onChange={(e) => setCheckFormData({ ...checkFormData, receivedFrom: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                      placeholder="Quien entrega el cheque"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Pre-llenado con el cliente de la venta
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Emitido por *
                    </label>
                    <input
                      type="text"
                      value={checkFormData.issuedBy}
                      onChange={(e) => setCheckFormData({ ...checkFormData, issuedBy: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                      placeholder="Empresa que emite el cheque"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha de Vencimiento *
                    </label>
                    <input
                      type="date"
                      value={checkFormData.dueDate}
                      onChange={(e) => setCheckFormData({ ...checkFormData, dueDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha de Recepción
                    </label>
                    <input
                      type="date"
                      value={checkFormData.receptionDate}
                      onChange={(e) => setCheckFormData({ ...checkFormData, receptionDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Banco
                    </label>
                    <input
                      type="text"
                      value={checkFormData.bankName}
                      onChange={(e) => setCheckFormData({ ...checkFormData, bankName: e.target.value })}
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
                      value={checkFormData.accountNumber}
                      onChange={(e) => setCheckFormData({ ...checkFormData, accountNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                      placeholder="Número de cuenta (opcional)"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={checkFormData.isEcheq}
                      onChange={(e) => setCheckFormData({ ...checkFormData, isEcheq: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">
                      Es E-Cheque
                    </span>
                  </label>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                                     <button
                     type="button"
                     onClick={() => {
                       setShowCheckPopup(false);
                       setCurrentPaymentMethod('efectivo');
                     }}
                     className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                   >
                     Cancelar
                   </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                  >
                    Agregar Cheque
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Toast Container */}
      <ToastContainer toasts={[]} removeToast={() => {}} />
    </div>
  );
} 