import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Supplier } from '@/models/Supplier';

// GET - Obtener proveedores
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    
    const skip = (page - 1) * limit;
    
    // Construir filtro de búsqueda
    const filter: Record<string, unknown> = {};
    if (search) {
      filter.$or = [
        { businessName: { $regex: search, $options: 'i' } },
        { contact: { $regex: search, $options: 'i' } },
        { cuit: { $regex: search, $options: 'i' } },
      ];
    }
    
    // Obtener proveedores con paginación
    const suppliers = await Supplier.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Contar total para paginación
    const total = await Supplier.countDocuments(filter);
    const pages = Math.ceil(total / limit);
    
    return NextResponse.json({
      suppliers,
      pagination: {
        page,
        limit,
        total,
        pages,
      },
    });
  } catch (error) {
    console.error('Get suppliers error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo proveedor
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    console.log('Received supplier data:', body);
    
    const { name, cuit, contact, email, address, phone } = body;

    if (!name || !cuit || !contact) {
      return NextResponse.json(
        { error: 'Nombre de empresa, CUIT y contacto son requeridos' },
        { status: 400 }
      );
    }

    // Verificar si ya existe un proveedor con el mismo CUIT
    const existingSupplier = await Supplier.findOne({ cuit });
    if (existingSupplier) {
      return NextResponse.json(
        { error: 'Ya existe un proveedor con ese CUIT' },
        { status: 400 }
      );
    }

    const supplier = new Supplier({
      businessName: name,
      contact,
      cuit,
      email,
      address,
      phone,
    });

    await supplier.save();

    return NextResponse.json({
      message: 'Proveedor creado exitosamente',
      supplier,
    });
  } catch (error) {
    console.error('Create supplier error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 