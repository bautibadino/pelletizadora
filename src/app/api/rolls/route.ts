import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { RollStock, RollMovement } from '@/models/Stock';

// GET - Obtener stock de rollos
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    
    const filter: Record<string, unknown> = {};
    
    if (type) {
      filter.type = type;
    }
    
    const skip = (page - 1) * limit;
    
    const rolls = await RollStock.find(filter)
      .populate('supplier', 'businessName contact')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await RollStock.countDocuments(filter);
    
    return NextResponse.json({
      rolls,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get rolls error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear entrada de rollos (desde factura)
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const { 
      type, 
      quantity, 
      supplierId, 
      invoiceNumber, 
      notes 
    } = await request.json();

    if (!type || !quantity || !supplierId || !invoiceNumber) {
      return NextResponse.json(
        { error: 'Tipo, cantidad, proveedor y número de factura son requeridos' },
        { status: 400 }
      );
    }

    // Verificar si ya existe stock para este tipo de rollo
    let rollStock = await RollStock.findOne({ type });
    
    if (rollStock) {
      // Actualizar stock existente
      rollStock.quantity += quantity;
      rollStock.supplier = supplierId;
      rollStock.invoiceNumber = invoiceNumber;
      await rollStock.save();
    } else {
      // Crear nuevo stock
      rollStock = new RollStock({
        type,
        quantity,
        supplier: supplierId,
        invoiceNumber,
      });
      await rollStock.save();
    }

    // Crear movimiento de entrada
    const movement = new RollMovement({
      rollType: type,
      type: 'entrada',
      quantity,
      supplier: supplierId,
      invoiceNumber,
      reference: `Factura: ${invoiceNumber}`,
      notes,
    });
    await movement.save();

    // Poblar datos del proveedor para la respuesta
    await rollStock.populate('supplier', 'businessName contact');

    return NextResponse.json({
      message: 'Rollo ingresado exitosamente',
      rollStock,
    });
  } catch (error) {
    console.error('Create roll error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 