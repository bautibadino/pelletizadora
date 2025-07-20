import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Supplier } from '@/models/Supplier';

// GET - Obtener proveedor por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const { id } = await params;
    const supplier = await Supplier.findById(id);
    
    if (!supplier) {
      return NextResponse.json(
        { error: 'Proveedor no encontrado' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(supplier);
  } catch (error) {
    console.error('Get supplier error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar proveedor
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;

    // Verificar si ya existe otro proveedor con el mismo CUIT
    const existingSupplier = await Supplier.findOne({ 
      cuit, 
      _id: { $ne: id } 
    });
    
    if (existingSupplier) {
      return NextResponse.json(
        { error: 'Ya existe otro proveedor con ese CUIT' },
        { status: 400 }
      );
    }

    const supplier = await Supplier.findByIdAndUpdate(
      id,
      {
        businessName: name,
        contact,
        cuit,
        email,
        address,
        phone,
      },
      { new: true, runValidators: true }
    );

    if (!supplier) {
      return NextResponse.json(
        { error: 'Proveedor no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Proveedor actualizado exitosamente',
      supplier,
    });
  } catch (error) {
    console.error('Update supplier error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar proveedor
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const { id } = await params;
    const supplier = await Supplier.findByIdAndDelete(id);
    
    if (!supplier) {
      return NextResponse.json(
        { error: 'Proveedor no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Proveedor eliminado exitosamente',
    });
  } catch (error) {
    console.error('Delete supplier error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 