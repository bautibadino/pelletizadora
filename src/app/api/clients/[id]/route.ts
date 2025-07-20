import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Client from '@/models/Client';

// GET - Obtener cliente por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const client = await Client.findById(params.id);
    
    if (!client) {
      return NextResponse.json(
        { error: 'Cliente no encontrado' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(client);
  } catch (error) {
    console.error('Get client error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar cliente
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const { name, company, cuit, contact, email, address, phone } = await request.json();

    if (!name || !company || !cuit || !contact) {
      return NextResponse.json(
        { error: 'Nombre, empresa, CUIT y contacto son requeridos' },
        { status: 400 }
      );
    }

    // Verificar si ya existe otro cliente con el mismo CUIT
    const existingClient = await Client.findOne({ 
      cuit, 
      _id: { $ne: params.id } 
    });
    
    if (existingClient) {
      return NextResponse.json(
        { error: 'Ya existe otro cliente con ese CUIT' },
        { status: 400 }
      );
    }

    const client = await Client.findByIdAndUpdate(
      params.id,
      {
        name,
        company,
        cuit,
        contact,
        email,
        address,
        phone,
      },
      { new: true, runValidators: true }
    );

    if (!client) {
      return NextResponse.json(
        { error: 'Cliente no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Cliente actualizado exitosamente',
      client,
    });
  } catch (error) {
    console.error('Update client error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar cliente
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const client = await Client.findByIdAndDelete(params.id);
    
    if (!client) {
      return NextResponse.json(
        { error: 'Cliente no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Cliente eliminado exitosamente',
    });
  } catch (error) {
    console.error('Delete client error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 