'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Shield, CheckCircle, AlertCircle } from 'lucide-react';

export default function CreateAdminPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const createAdminUser = async () => {
    setLoading(true);
    setMessage('');
    setError('');

    
    try {
      const response = await fetch('/api/admin/create-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
        if (data.user) {
          setMessage(`${data.message}\n\nUsuario: ${data.user.username}\nEmail: ${data.user.email}\nRol: ${data.user.role}`);
        }
      } else {
        setError(data.error || 'Error al crear usuario administrador');
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
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Crear Usuario Administrador
          </h1>
          <p className="text-gray-600">
            Crea el usuario administrador para el sistema de pelletizadora
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-blue-900 mb-2">Credenciales del Administrador:</h3>
          <div className="text-sm text-blue-700 space-y-1">
            <p><strong>Usuario:</strong> admin</p>
            <p><strong>Contraseña:</strong> admin123</p>
            <p><strong>Email:</strong> admin@pelletizadora.com</p>
          </div>
        </div>

        <button
          onClick={createAdminUser}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium mb-4"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Creando usuario...
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <User className="h-5 w-5 mr-2" />
              Crear Usuario Administrador
            </div>
          )}
        </button>

        {message && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              <div className="text-sm text-green-800 whitespace-pre-line">{message}</div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
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