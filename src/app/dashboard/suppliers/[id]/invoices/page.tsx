'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, DollarSign, FileText, Calendar, User, ArrowLeft } from 'lucide-react';
import { useToast, ToastContainer } from '@/components/Toast';
import { roundToTwoDecimals, roundToOneDecimal, formatCurrency, calculateTax, calculateSubtotalFromTotal } from '@/lib/utils';

interface Supplier {
  _id: string;
  businessName: string;
  contact: string;
  cuit: string;
  email?: string;
  phone?: string;
  address?: string;
}

interface InvoiceLine {
  description: string;
  type: 'rollo_alfalfa' | 'rollo_otro' | 'insumo' | 'servicio' | 'otro';
  quantity: number;
  unitPrice: number;
  total: number;
  weight?: number; // Peso por unidad en kg (solo para rollos)
}

interface Check {
  _id: string;
  checkNumber: string;
  amount: number;
  isEcheq: boolean;
  receptionDate: string;
  dueDate: string;
  receivedFrom: string;
  issuedBy: string;
  status: 'pendiente' | 'cobrado' | 'rechazado' | 'vencido';
  bankName?: string;
  accountNumber?: string;
  notes?: string;
}

interface Payment {
  amount: number;
  method: 'efectivo' | 'transferencia' | 'cheque' | 'otro';
  date: Date;
  reference?: string;
  description?: string;
  receivedFrom?: string;
  checkId?: string;
  checkNumber?: string;
  isEcheq?: boolean;
  issuedBy?: string;
  bankName?: string;
  accountNumber?: string;
  dueDate?: Date;
  transferNumber?: string;
  bankAccount?: string;
}

interface Invoice {
  _id: string;
  supplierId: Supplier;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  concept: string;
  lines: InvoiceLine[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'pendiente' | 'pagado' | 'parcial';
  payments: Payment[];
  notes?: string;
}

interface PaymentData {
  amount: number;
  method: 'efectivo' | 'transferencia' | 'cheque' | 'otro';
  date: string;
  reference?: string;
  description?: string;
  receivedFrom?: string;
  excessHandling?: 'credit' | 'refund_cash' | 'refund_check' | 'refund_transfer';
  refundMethod?: 'efectivo' | 'transferencia' | 'cheque' | 'otro';
  refundReference?: string;
  // Campos específicos para cheques
  checkId?: string;
  checkNumber?: string;
  isEcheq?: boolean;
  issuedBy?: string;
  bankName?: string;
  accountNumber?: string;
  dueDate?: string;
  // Campos específicos para transferencias
  transferNumber?: string;
  bankAccount?: string;
}

export default function SupplierInvoices({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { toasts, removeToast, success, error } = useToast();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [availableChecks, setAvailableChecks] = useState<Check[]>([]);
  const [showCheckModal, setShowCheckModal] = useState(false);
  const [loadingChecks, setLoadingChecks] = useState(false);

  // Formulario de factura simplificado
  const [formData, setFormData] = useState({
    invoiceNumber: '',
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    isBlackMarket: false, // true = en negro (sin IVA), false = en blanco (con IVA)
    notes: ''
  });

  // Líneas de factura simplificadas
  const [lines, setLines] = useState<InvoiceLine[]>([
    {
      description: '',
      type: 'rollo_alfalfa',
      quantity: 1,
      unitPrice: 0,
      total: 0,
      weight: 0
    }
  ]);

  // Formulario de pago
  const [paymentData, setPaymentData] = useState<PaymentData>({
    amount: 0,
    method: 'efectivo',
    date: new Date().toISOString().split('T')[0],
    reference: '',
    description: '',
    receivedFrom: '',
    excessHandling: 'credit',
    refundMethod: 'efectivo',
    refundReference: ''
  });

  // Formulario para crear nuevo cheque
  const [checkFormData, setCheckFormData] = useState({
    checkNumber: '',
    amount: 0,
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
    const loadData = async () => {
      const { id } = await params;
      await fetchSupplier(id);
      await fetchInvoices(id);
    };
    loadData();
  }, [params]);

  const fetchSupplier = async (supplierId: string) => {
    try {
      const response = await fetch(`/api/suppliers/${supplierId}`);
      if (response.ok) {
        const data = await response.json();
        setSupplier(data);
      }
    } catch (error) {
      console.error('Error fetching supplier:', error);
    }
  };

  const fetchInvoices = async (supplierId: string) => {
    try {
      const response = await fetch(`/api/invoices?supplierId=${supplierId}`);
      if (response.ok) {
        const data = await response.json();
        setInvoices(data.invoices || []);
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLineChange = (index: number, field: keyof InvoiceLine, value: unknown) => {
    const newLines = [...lines];
    const line = newLines[index];
    
    switch (field) {
      case 'description':
        line.description = value as string;
        break;
      case 'type':
        line.type = value as 'rollo_alfalfa' | 'rollo_otro' | 'insumo' | 'servicio' | 'otro';
        break;
      case 'quantity':
        line.quantity = roundToOneDecimal(value as number);
        break;
      case 'unitPrice':
        line.unitPrice = roundToTwoDecimals(value as number);
        break;
      case 'weight':
        line.weight = roundToOneDecimal(value as number);
        break;
    }
    
    // Calcular total de la línea con redondeo
    if (field === 'quantity' || field === 'unitPrice') {
      line.total = roundToTwoDecimals(line.quantity * line.unitPrice);
    }
    
    setLines(newLines);
  };

  const addLine = () => {
    setLines([...lines, {
      description: '',
      type: 'rollo_alfalfa',
      quantity: 1,
      unitPrice: 0,
      total: 0,
      weight: 0
    }]);
  };

  const removeLine = (index: number) => {
    if (lines.length > 1) {
      setLines(lines.filter((_, i) => i !== index));
    }
  };

  const calculateSubtotal = () => {
    return roundToTwoDecimals(lines.reduce((sum, line) => sum + (line.total || 0), 0));
  };

  const calculateTaxAmount = () => {
    if (formData.isBlackMarket) return 0; // En negro, sin IVA
    // Si es en blanco, calculamos el IVA sobre el subtotal (21%)
    const subtotal = calculateSubtotal();
    return roundToTwoDecimals(subtotal * 0.21); // IVA = 21% del subtotal
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const tax = calculateTaxAmount();
    return roundToTwoDecimals(subtotal + tax); // Total = Subtotal + IVA
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones más detalladas
    if (!formData.invoiceNumber) {
      error('El número de factura es requerido');
      return;
    }
    
    if (lines.some(line => !line.description)) {
      error('Todas las líneas deben tener una descripción');
      return;
    }
    
    if (lines.some(line => line.quantity <= 0)) {
      error('Todas las cantidades deben ser mayores a 0');
      return;
    }
    
    if (lines.some(line => line.unitPrice <= 0)) {
      error('Todos los precios unitarios deben ser mayores a 0');
      return;
    }
    
    const total = calculateTotal();
    if (total <= 0) {
      error('El total de la factura debe ser mayor a 0');
      return;
    }

    try {
      const { id } = await params;
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          supplierId: id,
          invoiceNumber: formData.invoiceNumber,
          date: formData.date,
          dueDate: formData.dueDate,
          concept: 'Factura de proveedor',
          tax: calculateTaxAmount(),
          lines: lines.map(line => ({
            ...line,
            total: line.quantity * line.unitPrice
          })),
          notes: formData.notes
        }),
      });

      if (response.ok) {
        success('Factura creada exitosamente');
        setShowForm(false);
        setFormData({
          invoiceNumber: '',
          date: new Date().toISOString().split('T')[0],
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          isBlackMarket: false,
          notes: ''
        });
        setLines([{
          description: '',
          type: 'rollo_alfalfa',
          quantity: 1,
          unitPrice: 0,
          total: 0,
          weight: 0
        }]);
        fetchInvoices(id);
      } else {
        const errorData = await response.json();
        if (errorData.details) {
          error(`Error de validación: ${errorData.details}`);
        } else {
          error(errorData.error || 'Error al crear la factura');
        }
      }
    } catch (err) {
      console.error('Error creating invoice:', err);
      error('Error al crear la factura');
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!paymentData.amount || paymentData.amount <= 0) {
      error('Por favor ingrese un monto válido');
      return;
    }

    if (!selectedInvoice) {
      error('No se ha seleccionado una factura');
      return;
    }

    const pendingAmount = calculatePendingAmount(selectedInvoice);
    const excessAmount = calculateExcessAmount(selectedInvoice, paymentData.amount);

    // Validar que el pago no exceda el monto pendiente (a menos que se maneje el exceso)
    if (paymentData.amount > pendingAmount && !paymentData.excessHandling) {
      error('El pago excede el monto pendiente. Por favor seleccione cómo manejar el exceso.');
      return;
    }

    try {
      const response = await fetch(`/api/invoices/${selectedInvoice._id}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...paymentData,
          pendingAmount,
          excessAmount,
          appliedAmount: Math.min(paymentData.amount, pendingAmount)
        }),
      });

      if (response.ok) {
        const result = await response.json();
        
        // Mostrar mensaje específico según el caso
        if (excessAmount > 0) {
          switch (paymentData.excessHandling) {
            case 'credit':
              success(`Pago registrado exitosamente. Saldo a favor del proveedor: ${formatCurrency(excessAmount)}`);
              break;
            case 'refund_cash':
              success(`Pago registrado exitosamente. Devolución en efectivo: ${formatCurrency(excessAmount)}`);
              break;
            case 'refund_check':
              success(`Pago registrado exitosamente. Devolución con cheque: ${formatCurrency(excessAmount)}`);
              break;
            case 'refund_transfer':
              success(`Pago registrado exitosamente. Devolución por transferencia: ${formatCurrency(excessAmount)}`);
              break;
          }
        } else {
        success('Pago registrado exitosamente');
        }

        setShowPaymentForm(null);
        setSelectedInvoice(null);
        setPaymentData({
          amount: 0,
          method: 'efectivo',
          date: new Date().toISOString().split('T')[0],
          reference: '',
          description: '',
          receivedFrom: '',
          excessHandling: 'credit',
          refundMethod: 'efectivo',
          refundReference: ''
        });
        const { id } = await params;
        fetchInvoices(id);
      } else {
        const errorData = await response.json();
        error(errorData.error || 'Error al registrar el pago');
      }
    } catch (err) {
      console.error('Error adding payment:', err);
      error('Error al registrar el pago');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pagado': return 'bg-green-100 text-green-800';
      case 'parcial': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-red-100 text-red-800';
    }
  };

  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'efectivo': return 'Efectivo';
      case 'transferencia': return 'Transferencia';
      case 'cheque': return 'Cheque';
      default: return 'Otro';
    }
  };

  const calculatePendingAmount = (invoice: Invoice) => {
    const totalPaid = invoice.payments.reduce((sum, payment) => sum + roundToTwoDecimals(payment.amount), 0);
    return Math.max(0, roundToTwoDecimals(invoice.total - totalPaid));
  };

  const calculateExcessAmount = (invoice: Invoice, paymentAmount: number) => {
    const pendingAmount = calculatePendingAmount(invoice);
    return Math.max(0, roundToTwoDecimals(paymentAmount - pendingAmount));
  };

  const loadAvailableChecks = async () => {
    try {
      setLoadingChecks(true);
      const response = await fetch('/api/checks?status=pendiente&limit=50');
      if (response.ok) {
        const data = await response.json();
        setAvailableChecks(data.checks || []);
      }
    } catch (error) {
      console.error('Error loading checks:', error);
    } finally {
      setLoadingChecks(false);
    }
  };

  const handleCreateCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/checks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(checkFormData),
      });

      if (response.ok) {
        success('Cheque creado exitosamente');
        setShowCheckModal(false);
        setCheckFormData({
          checkNumber: '',
          amount: 0,
          isEcheq: false,
          receptionDate: new Date().toISOString().split('T')[0],
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          receivedFrom: '',
          issuedBy: '',
          bankName: '',
          accountNumber: '',
          notes: ''
        });
        loadAvailableChecks();
      } else {
        const errorData = await response.json();
        error(errorData.error || 'Error al crear el cheque');
      }
    } catch (err) {
      console.error('Error creating check:', err);
      error('Error al crear el cheque');
    }
  };

  const handleCheckSelection = (check: Check) => {
    setPaymentData({
      ...paymentData,
      checkId: check._id,
      checkNumber: check.checkNumber,
      isEcheq: check.isEcheq,
      issuedBy: check.issuedBy,
      bankName: check.bankName || '',
      accountNumber: check.accountNumber || '',
      dueDate: check.dueDate,
      receivedFrom: check.receivedFrom,
      amount: check.amount
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </button>
          
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Facturas de {supplier?.businessName}
              </h1>
              <p className="text-gray-600 mt-1">
                {supplier?.contact} • CUIT: {supplier?.cuit}
              </p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nueva Factura
            </button>
          </div>
        </div>

        {/* Lista de Facturas */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Facturas ({invoices.length})
            </h2>
            
            {invoices.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No hay facturas registradas</p>
              </div>
            ) : (
              <div className="space-y-4">
                {invoices.map((invoice) => (
                  <div key={invoice._id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          Factura #{invoice.invoiceNumber}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {new Date(invoice.date).toLocaleDateString()} - Vto: {new Date(invoice.dueDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                          {invoice.status.toUpperCase()}
                        </span>
                        <div className="mt-1">
                                                  <p className="text-lg font-bold text-gray-900">
                          ${formatCurrency(invoice.total)}
                        </p>
                          <p className="text-sm text-gray-600">
                            Pendiente: ${formatCurrency(calculatePendingAmount(invoice))}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        {new Date(invoice.date).toLocaleDateString()}
                      </div>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        Vto: {new Date(invoice.dueDate).toLocaleDateString()}
                      </div>
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 mr-2" />
                        {invoice.lines.length} líneas
                      </div>
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 mr-2" />
                        {invoice.payments.length} pagos
                      </div>
                    </div>

                    {/* Líneas de la factura */}
                    <div className="mb-3">
                      <h4 className="font-medium text-gray-900 mb-2">Productos/Servicios:</h4>
                      <div className="space-y-1">
                        {invoice.lines.map((line, index) => (
                          <div key={index} className="flex justify-between text-sm">
                            <span>{line.description} ({line.type})</span>
                            <span>${line.total.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Pagos */}
                    {invoice.payments.length > 0 && (
                      <div className="mb-3">
                        <h4 className="font-medium text-gray-900 mb-2">Pagos:</h4>
                        <div className="space-y-2">
                          {invoice.payments.map((payment, index) => (
                            <div key={index} className="bg-gray-50 p-3 rounded-lg">
                              <div className="flex justify-between items-start mb-1">
                                <span className="font-medium text-gray-900">
                                  {getMethodLabel(payment.method)} - ${payment.amount.toLocaleString()}
                              </span>
                                <span className="text-xs text-gray-500">
                                  {new Date(payment.date).toLocaleDateString()}
                                </span>
                              </div>
                              
                              {/* Información específica según método */}
                              {payment.method === 'cheque' && (
                                <div className="text-xs text-gray-600 space-y-1">
                                  {payment.checkNumber && <div>Cheque #{payment.checkNumber}</div>}
                                  {payment.issuedBy && <div>Emitido por: {payment.issuedBy}</div>}
                                  {payment.bankName && <div>Banco: {payment.bankName}</div>}
                                  {payment.dueDate && <div>Vto: {new Date(payment.dueDate).toLocaleDateString()}</div>}
                                  {payment.isEcheq && <div className="text-blue-600 font-medium">E-Cheq</div>}
                                </div>
                              )}
                              
                              {payment.method === 'transferencia' && (
                                <div className="text-xs text-gray-600 space-y-1">
                                  {payment.transferNumber && <div>Transferencia #{payment.transferNumber}</div>}
                                  {payment.bankAccount && <div>Cuenta: {payment.bankAccount}</div>}
                                </div>
                              )}
                              
                              {payment.receivedFrom && (
                                <div className="text-xs text-gray-600">
                                  Recibido de: {payment.receivedFrom}
                                </div>
                              )}
                              
                              {payment.description && (
                                <div className="text-xs text-gray-600">
                                  {payment.description}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => {
                          setSelectedInvoice(invoice);
                          setShowPaymentForm(invoice._id);
                        }}
                        className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                      >
                        Agregar Pago
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal de Nueva Factura - SIMPLIFICADO */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Nueva Factura</h2>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Información básica */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Número de Factura *
                      </label>
                      <input
                        type="text"
                        value={formData.invoiceNumber}
                        onChange={(e) => setFormData({...formData, invoiceNumber: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fecha *
                      </label>
                      <input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({...formData, date: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fecha de Vencimiento *
                      </label>
                      <input
                        type="date"
                        value={formData.dueDate}
                        onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fecha *
                      </label>
                      <input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({...formData, date: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                  </div>

                  {/* Tipo de factura */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.isBlackMarket}
                        onChange={(e) => setFormData({...formData, isBlackMarket: e.target.checked})}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm font-medium text-gray-700">
                        Factura en negro (sin IVA)
                      </span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      Marque esta casilla si la factura es en negro. Si no la marca, se aplicará 21% de IVA automáticamente.
                    </p>
                  </div>

                  {/* Líneas de productos - SIMPLIFICADO */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium text-gray-900">Productos/Servicios</h3>
                      <button
                        type="button"
                        onClick={addLine}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                      >
                        Agregar Línea
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      {lines.map((line, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Descripción *
                              </label>
                              <input
                                type="text"
                                value={line.description}
                                onChange={(e) => handleLineChange(index, 'description', e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Tipo *
                              </label>
                              <select
                                value={line.type}
                                onChange={(e) => handleLineChange(index, 'type', e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                required
                              >
                                <option value="rollo_alfalfa">Rollo de Alfalfa</option>
                                <option value="rollo_otro">Rollo Otro</option>
                                <option value="insumo">Insumo</option>
                                <option value="servicio">Servicio</option>
                                <option value="otro">Otro</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Cantidad *
                              </label>
                              <input
                                type="number"
                                value={line.quantity}
                                onChange={(e) => handleLineChange(index, 'quantity', Number(e.target.value))}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                min="0"
                                step="0.01"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Precio Unitario *
                              </label>
                              <input
                                type="number"
                                value={line.unitPrice}
                                onChange={(e) => handleLineChange(index, 'unitPrice', Number(e.target.value))}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                min="0"
                                step="0.01"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Total
                              </label>
                              <div className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 text-gray-900 font-medium">
                                ${line.total.toLocaleString()}
                              </div>
                            </div>
                          </div>
                          
                          {/* Peso solo para rollos */}
                          {(line.type === 'rollo_alfalfa' || line.type === 'rollo_otro') && (
                            <div className="mt-4">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Peso por unidad (kg)
                              </label>
                              <input
                                type="number"
                                value={line.weight || ''}
                                onChange={(e) => handleLineChange(index, 'weight', Number(e.target.value))}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                min="0"
                                step="0.01"
                                placeholder="Peso en kg por rollo"
                              />
                            </div>
                          )}
                          
                          {lines.length > 1 && (
                            <div className="flex justify-end mt-4">
                              <button
                                type="button"
                                onClick={() => removeLine(index)}
                                className="text-red-600 hover:text-red-800 text-sm"
                              >
                                Eliminar línea
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Totales */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {formData.isBlackMarket ? 'Total (sin IVA)' : 'Total (Subtotal + IVA)'}
                        </label>
                        <div className="text-xl font-bold text-blue-600">
                          ${calculateTotal().toLocaleString()}
                        </div>
                      </div>
                      {!formData.isBlackMarket && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            IVA incluido (21%)
                          </label>
                          <div className="text-lg font-bold text-gray-900">
                            ${formatCurrency(calculateTaxAmount())}
                          </div>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {formData.isBlackMarket 
                        ? 'Factura en negro: el precio ingresado es el total final'
                        : 'Factura en blanco: se calcula el IVA (21%) sobre el subtotal'
                      }
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notas
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Crear Factura
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Pago Mejorado */}
        {showPaymentForm && selectedInvoice && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">
                  Agregar Pago - Factura #{selectedInvoice.invoiceNumber}
                </h2>
                  <button
                    onClick={() => {
                      setShowPaymentForm(null);
                      setSelectedInvoice(null);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                {/* Información de la factura */}
                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                      <span className="font-medium text-gray-700">Total Factura:</span>
                      <p className="text-lg font-bold text-gray-900">${formatCurrency(selectedInvoice.total)}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Ya Pagado:</span>
                      <p className="text-lg font-bold text-green-600">
                        ${formatCurrency(selectedInvoice.payments.reduce((sum, p) => sum + p.amount, 0))}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Pendiente:</span>
                      <p className="text-lg font-bold text-red-600">
                        ${formatCurrency(calculatePendingAmount(selectedInvoice))}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Estado:</span>
                      <p className={`text-sm font-medium px-2 py-1 rounded-full inline-block ${getStatusColor(selectedInvoice.status)}`}>
                        {selectedInvoice.status.toUpperCase()}
                      </p>
                    </div>
                  </div>
                </div>
                
                <form onSubmit={handlePaymentSubmit} className="space-y-6">
                  {/* Información del pago */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Monto del Pago *
                    </label>
                    <input
                      type="number"
                      value={paymentData.amount}
                      onChange={(e) => setPaymentData({...paymentData, amount: Number(e.target.value)})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>

                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                      Método de Pago *
                    </label>
                    <select
                      value={paymentData.method}
                        onChange={(e) => {
                          const method = e.target.value as 'efectivo' | 'transferencia' | 'cheque' | 'otro';
                          setPaymentData({
                            ...paymentData, 
                            method,
                            // Limpiar campos específicos al cambiar método
                            checkId: undefined,
                            checkNumber: undefined,
                            transferNumber: undefined,
                            bankAccount: undefined
                          });
                          // Cargar cheques si se selecciona cheque
                          if (method === 'cheque') {
                            loadAvailableChecks();
                          }
                        }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="efectivo">Efectivo</option>
                      <option value="transferencia">Transferencia</option>
                      <option value="cheque">Cheque</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>

                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Fecha del Pago
                    </label>
                    <input
                      type="date"
                      value={paymentData.date}
                      onChange={(e) => setPaymentData({...paymentData, date: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                    {/* Campos dinámicos según método de pago */}
                    {paymentData.method === 'transferencia' && (
                  <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Número de Transferencia *
                    </label>
                    <input
                      type="text"
                          value={paymentData.transferNumber || ''}
                          onChange={(e) => setPaymentData({...paymentData, transferNumber: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Número de transferencia"
                          required
                    />
                  </div>
                    )}

                    {paymentData.method === 'cheque' && (
                  <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Seleccionar Cheque Existente
                        </label>
                        <select
                          value={paymentData.checkId || ''}
                          onChange={(e) => {
                            const checkId = e.target.value;
                            if (checkId) {
                              const selectedCheck = availableChecks.find(c => c._id === checkId);
                              if (selectedCheck) {
                                handleCheckSelection(selectedCheck);
                              }
                            } else {
                              setPaymentData({
                                ...paymentData,
                                checkId: undefined,
                                checkNumber: undefined,
                                isEcheq: undefined,
                                issuedBy: undefined,
                                bankName: undefined,
                                accountNumber: undefined,
                                dueDate: undefined,
                                receivedFrom: undefined
                              });
                            }
                          }}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Seleccionar cheque...</option>
                          {availableChecks.map((check) => (
                            <option key={check._id} value={check._id}>
                              #{check.checkNumber} - ${check.amount.toLocaleString()} - {check.issuedBy} (Vto: {new Date(check.dueDate).toLocaleDateString()})
                            </option>
                          ))}
                        </select>
                        <div className="mt-2">
                          <button
                            type="button"
                            onClick={() => setShowCheckModal(true)}
                            className="text-sm text-blue-600 hover:text-blue-800"
                          >
                            + Crear nuevo cheque
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Información adicional */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                      Descripción
                    </label>
                    <input
                      type="text"
                      value={paymentData.description}
                      onChange={(e) => setPaymentData({...paymentData, description: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Descripción del pago"
                    />
                  </div>

                    {paymentData.method !== 'cheque' && (
                  <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Recibido de
                    </label>
                    <input
                      type="text"
                      value={paymentData.receivedFrom}
                      onChange={(e) => setPaymentData({...paymentData, receivedFrom: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Nombre de quien entrega el pago"
                    />
                      </div>
                    )}
                  </div>

                  {/* Campos específicos para cheques */}
                  {paymentData.method === 'cheque' && paymentData.checkId && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h3 className="text-sm font-medium text-blue-800 mb-3">Información del Cheque Seleccionado:</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">Número:</span>
                          <p className="text-gray-900">{paymentData.checkNumber}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Monto:</span>
                          <p className="text-gray-900">${paymentData.amount?.toLocaleString()}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Emitido por:</span>
                          <p className="text-gray-900">{paymentData.issuedBy}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Recibido de:</span>
                          <p className="text-gray-900">{paymentData.receivedFrom}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Banco:</span>
                          <p className="text-gray-900">{paymentData.bankName || 'No especificado'}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Vencimiento:</span>
                          <p className="text-gray-900">{paymentData.dueDate ? new Date(paymentData.dueDate).toLocaleDateString() : 'No especificado'}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Tipo:</span>
                          <p className="text-gray-900">{paymentData.isEcheq ? 'E-Cheq' : 'Cheque común'}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Cuenta:</span>
                          <p className="text-gray-900">{paymentData.accountNumber || 'No especificado'}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Manejo de exceso */}
                  {paymentData.amount > 0 && calculateExcessAmount(selectedInvoice, paymentData.amount) > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-yellow-800">
                            Pago excede el monto pendiente
                          </h3>
                          <div className="mt-1 text-sm text-yellow-700">
                            <p>Exceso: <span className="font-bold">${calculateExcessAmount(selectedInvoice, paymentData.amount).toLocaleString()}</span></p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          ¿Qué hacer con el exceso?
                        </label>
                        <div className="space-y-2">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              value="credit"
                              checked={paymentData.excessHandling === 'credit'}
                              onChange={(e) => setPaymentData({...paymentData, excessHandling: e.target.value as 'credit' | 'refund_cash' | 'refund_check' | 'refund_transfer'})}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                            />
                            <span className="ml-2 text-sm text-gray-700">
                              Mantener como saldo a favor del proveedor
                            </span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              value="refund_cash"
                              checked={paymentData.excessHandling === 'refund_cash'}
                              onChange={(e) => setPaymentData({...paymentData, excessHandling: e.target.value as 'credit' | 'refund_cash' | 'refund_check' | 'refund_transfer'})}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                            />
                            <span className="ml-2 text-sm text-gray-700">
                              Devolver en efectivo
                            </span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              value="refund_check"
                              checked={paymentData.excessHandling === 'refund_check'}
                              onChange={(e) => setPaymentData({...paymentData, excessHandling: e.target.value as 'credit' | 'refund_cash' | 'refund_check' | 'refund_transfer'})}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                            />
                            <span className="ml-2 text-sm text-gray-700">
                              Devolver con cheque
                            </span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              value="refund_transfer"
                              checked={paymentData.excessHandling === 'refund_transfer'}
                              onChange={(e) => setPaymentData({...paymentData, excessHandling: e.target.value as 'credit' | 'refund_cash' | 'refund_check' | 'refund_transfer'})}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                            />
                            <span className="ml-2 text-sm text-gray-700">
                              Devolver por transferencia
                            </span>
                          </label>
                        </div>

                        {/* Campos adicionales para devoluciones */}
                        {(paymentData.excessHandling === 'refund_check' || paymentData.excessHandling === 'refund_transfer') && (
                          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Referencia de devolución
                              </label>
                              <input
                                type="text"
                                value={paymentData.refundReference}
                                onChange={(e) => setPaymentData({...paymentData, refundReference: e.target.value})}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder={paymentData.excessHandling === 'refund_check' ? 'Número de cheque' : 'Número de transferencia'}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Resumen del pago */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-blue-800 mb-2">Resumen del pago:</h3>
                    <div className="space-y-1 text-sm text-blue-700">
                      <div className="flex justify-between">
                        <span>Monto del pago:</span>
                        <span className="font-medium">${paymentData.amount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Se aplicará a la factura:</span>
                        <span className="font-medium">${Math.min(paymentData.amount, calculatePendingAmount(selectedInvoice)).toLocaleString()}</span>
                      </div>
                      {calculateExcessAmount(selectedInvoice, paymentData.amount) > 0 && (
                        <div className="flex justify-between">
                          <span>Exceso:</span>
                          <span className="font-medium">${calculateExcessAmount(selectedInvoice, paymentData.amount).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <button
                      type="button"
                      onClick={() => {
                        setShowPaymentForm(null);
                        setSelectedInvoice(null);
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Registrar Pago
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Modal para crear nuevo cheque */}
        {showCheckModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">
                    Crear Nuevo Cheque
                  </h2>
                  <button
                    onClick={() => setShowCheckModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
                
                <form onSubmit={handleCreateCheck} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Número de Cheque *
                      </label>
                      <input
                        type="text"
                        value={checkFormData.checkNumber}
                        onChange={(e) => setCheckFormData({...checkFormData, checkNumber: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Monto *
                      </label>
                      <input
                        type="number"
                        value={checkFormData.amount}
                        onChange={(e) => setCheckFormData({...checkFormData, amount: Number(e.target.value)})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Fecha de Recepción
                      </label>
                      <input
                        type="date"
                        value={checkFormData.receptionDate}
                        onChange={(e) => setCheckFormData({...checkFormData, receptionDate: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Fecha de Vencimiento *
                      </label>
                      <input
                        type="date"
                        value={checkFormData.dueDate}
                        onChange={(e) => setCheckFormData({...checkFormData, dueDate: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Recibido de *
                      </label>
                      <input
                        type="text"
                        value={checkFormData.receivedFrom}
                        onChange={(e) => setCheckFormData({...checkFormData, receivedFrom: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Nombre de quien entrega el cheque"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Emitido por *
                      </label>
                      <input
                        type="text"
                        value={checkFormData.issuedBy}
                        onChange={(e) => setCheckFormData({...checkFormData, issuedBy: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Banco o empresa que emite el cheque"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nombre del Banco
                      </label>
                      <input
                        type="text"
                        value={checkFormData.bankName}
                        onChange={(e) => setCheckFormData({...checkFormData, bankName: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Nombre del banco"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Número de Cuenta
                      </label>
                      <input
                        type="text"
                        value={checkFormData.accountNumber}
                        onChange={(e) => setCheckFormData({...checkFormData, accountNumber: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Número de cuenta"
                      />
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={checkFormData.isEcheq}
                        onChange={(e) => setCheckFormData({...checkFormData, isEcheq: e.target.checked})}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm font-medium text-gray-700">
                        Es un E-Cheq
                      </span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      Marque esta casilla si el cheque es un E-Cheq (cheque electrónico)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notas
                    </label>
                    <textarea
                      value={checkFormData.notes}
                      onChange={(e) => setCheckFormData({...checkFormData, notes: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={3}
                      placeholder="Notas adicionales sobre el cheque"
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <button
                      type="button"
                      onClick={() => setShowCheckModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Crear Cheque
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Toast Container */}
        <ToastContainer toasts={toasts} removeToast={removeToast} />
      </div>
    </div>
  );
} 