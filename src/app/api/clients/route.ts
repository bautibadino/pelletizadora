import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Client from '@/models/Client';

// GET - Obtener todos los clientes
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    
    const filter: Record<string, unknown> = {};
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { cuit: { $regex: search, $options: 'i' } },
      ];
    }
    
    const skip = (page - 1) * limit;
    
    const clients = await Client.find(filter)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Client.countDocuments(filter);
    
    return NextResponse.json({
      clients,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get clients error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo cliente
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const { name, company, cuit, contact, email, address, phone } = await request.json();

    if (!name || !company || !cuit || !contact) {
      return NextResponse.json(
        { error: 'Nombre, empresa, CUIT y contacto son requeridos' },
        { status: 400 }
      );
    }

    // Verificar si ya existe un cliente con el mismo CUIT
    const existingClient = await Client.findOne({ cuit });
    
    if (existingClient) {
      return NextResponse.json(
        { error: 'Ya existe un cliente con ese CUIT' },
        { status: 400 }
      );
    }

    const client = new Client({
      name,
      company,
      cuit,
      contact,
      email,
      address,
      phone,
    });

    await client.save();

    return NextResponse.json({
      message: 'Cliente creado exitosamente',
      client,
    });
  } catch (error) {
    console.error('Create client error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 