import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Client from '@/models/Client';

// GET - Obtener saldo a favor de un cliente
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const { id } = await params;
    const client = await Client.findById(id).select('creditBalance name company');
    
    if (!client) {
      return NextResponse.json(
        { error: 'Cliente no encontrado' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      clientId: client._id,
      clientName: client.name,
      clientCompany: client.company,
      creditBalance: client.creditBalance || 0,
    });
  } catch (error) {
    console.error('Get client credit balance error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 