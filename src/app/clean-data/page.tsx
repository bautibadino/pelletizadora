'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, AlertTriangle, CheckCircle, Shield } from 'lucide-react';

export default function CleanDataPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [results, setResults] = useState<Record<string, number> | null>(null);
  const router = useRouter();

  const cleanDatabase = async () => {
    if (!confirm('⚠️ ¿Estás seguro de que quieres limpiar TODA la base de datos?\n\nEsta acción eliminará:\n• Todas las producciones\n• Todo el stock\n• Todas las ventas\n• Todos los clientes\n• Todos los proveedores\n• Todas las facturas\n• Todos los cheques\n\nLos usuarios se mantendrán.\n\nEsta acción NO se puede deshacer.')) {
      return;
    }

    setLoading(true);
    setMessage('');
    setError('');
    setResults(null);

    try {
      const response = await fetch('/api/admin/clean-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
        setResults(data.results);
      } else {
        setError(data.error || 'Error al limpiar la base de datos');
      }
    } catch (err) {
      setError('Error de conexión. Verifique su conexión a internet.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <Trash2 className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Limpiar Base de Datos
          </h1>
          <p className="text-gray-600">
            Elimina todos los datos del sistema excepto los usuarios
          </p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-red-600 mr-2 mt-0.5" />
            <div className="text-sm text-red-700">
              <p className="font-medium mb-2">⚠️ ADVERTENCIA</p>
              <p>Esta acción eliminará permanentemente:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Todas las producciones</li>
                <li>Todo el stock</li>
                <li>Todas las ventas</li>
                <li>Todos los clientes</li>
                <li>Todos los proveedores</li>
                <li>Todas las facturas</li>
                <li>Todos los cheques</li>
              </ul>
              <p className="mt-2 font-medium">Los usuarios se mantendrán.</p>
            </div>
          </div>
        </div>

        <button
          onClick={cleanDatabase}
          disabled={loading}
          className="w-full bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium mb-4"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Limpiando base de datos...
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <Trash2 className="h-5 w-5 mr-2" />
              Limpiar Base de Datos
            </div>
          )}
        </button>

        {message && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              <div className="text-sm text-green-800">{message}</div>
            </div>
          </div>
        )}

        {results && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h3 className="font-medium text-blue-900 mb-2">Resultados:</h3>
            <div className="text-sm text-blue-700 space-y-1">
              {Object.entries(results).map(([collection, count]) => (
                <div key={collection} className="flex justify-between">
                  <span>{collection}:</span>
                  <span className="font-medium">{count} eliminados</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
              <div className="text-sm text-red-800">{error}</div>
            </div>
          </div>
        )}

        <div className="text-center">
          <button
            onClick={() => router.push('/')}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            ← Volver al Login
          </button>
        </div>
      </div>
    </div>
  );
} 