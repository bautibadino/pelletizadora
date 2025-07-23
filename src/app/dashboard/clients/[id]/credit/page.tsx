'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, DollarSign, Plus, User, Building, Calendar, X, TrendingUp, TrendingDown } from 'lucide-react';
import { useToast, ToastContainer } from '@/components/Toast';

interface Client {
  _id: string;
  name: string;
  company: string;
  cuit: string;
  contact: string;
  email?: string;
  address?: string;
  phone?: string;
  creditBalance?: number;
  createdAt: string;
}

interface CreditTransaction {
  _id: string;
  type: 'surplus' | 'application';
  amount: number;
  date: string;
  description: string;
  saleId?: string;
  saleAmount?: number;
}

export default function ClientCreditPage() {
  const [client, setClient] = useState<Client | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const params = useParams();
  const clientId = params.id as string;
  const { success, error } = useToast();

  useEffect(() => {
    if (clientId) {
      loadClient();
      loadCreditTransactions();
    }
  }, [clientId]);

  const loadClient = async () => {
    try {
      const response = await fetch(`/api/clients/${clientId}`);
      const data = await response.json();
      setClient(data);
    } catch (err) {
      console.error('Error loading client:', err);
      error('❌ Error al cargar información del cliente');
    }
  };

  const loadCreditTransactions = async () => {
    try {
      const response = await fetch(`/api/clients/${clientId}/credit-transactions`);
      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions);
      }
    } catch (err) {
      console.error('Error loading credit transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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

  if (!client) {
    return <div className="min-h-screen flex items-center justify-center">Cliente no encontrado</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/dashboard/clients')}
                className="mr-4 p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <DollarSign className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">
                Saldo a Favor - {client.name}
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Client Summary */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Información del Cliente
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Cliente</h4>
              <div className="flex items-center">
                <User className="h-5 w-5 text-gray-400 mr-2" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{client.name}</p>
                  <p className="text-sm text-gray-500">{client.company}</p>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">CUIT</h4>
              <p className="text-sm text-gray-900">{client.cuit}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Contacto</h4>
              <p className="text-sm text-gray-900">{client.contact}</p>
              {client.phone && (
                <p className="text-sm text-gray-500">{client.phone}</p>
              )}
            </div>
          </div>
        </div>

        {/* Credit Balance Summary */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Resumen de Saldo a Favor
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-blue-700">Saldo Actual</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {formatCurrency(client.creditBalance || 0)}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-gray-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Cliente desde</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatDate(client.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Credit Transactions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Historial de Transacciones ({transactions.length})
          </h3>
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No hay transacciones de saldo a favor</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <div key={transaction._id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-4">
                    {transaction.type === 'surplus' ? (
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-red-600" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {transaction.type === 'surplus' ? 'Sobrante de Pago' : 'Aplicación a Venta'}
                      </p>
                      <p className="text-sm text-gray-500">{transaction.description}</p>
                      <p className="text-xs text-gray-400">{formatDate(transaction.date)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${
                      transaction.type === 'surplus' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.type === 'surplus' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </p>
                    {transaction.saleAmount && (
                      <p className="text-xs text-gray-500">
                        Venta: {formatCurrency(transaction.saleAmount)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Toast Container */}
        <ToastContainer toasts={[]} removeToast={() => {}} />
      </main>
    </div>
  );
} 