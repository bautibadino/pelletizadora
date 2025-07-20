import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { RollMovement } from '@/models/Stock';

// GET - Obtener movimientos de rollos
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const rollType = searchParams.get('rollType');
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');
    
    const filter: Record<string, unknown> = {};
    
    if (rollType) {
      filter.rollType = rollType;
    }
    
    if (type) {
      filter.type = type;
    }
    
    const skip = (page - 1) * limit;
    
    const movements = await RollMovement.find(filter)
      .populate('supplier', 'businessName contact')
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await RollMovement.countDocuments(filter);
    
    return NextResponse.json({
      movements,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get roll movements error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Registrar movimiento de rollos (producción, salida, etc.)
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const { 
      rollType, 
      type, 
      quantity, 
      supplierId, 
      invoiceNumber, 
      reference, 
      notes 
    } = await request.json();

    if (!rollType || !type || !quantity) {
      return NextResponse.json(
        { error: 'Tipo de rollo, tipo de movimiento y cantidad son requeridos' },
        { status: 400 }
      );
    }

    // Crear movimiento
    const movement = new RollMovement({
      rollType,
      type,
      quantity,
      supplier: supplierId,
      invoiceNumber,
      reference,
      notes,
    });
    await movement.save();

    // Poblar datos del proveedor para la respuesta
    await movement.populate('supplier', 'businessName contact');

    return NextResponse.json({
      message: 'Movimiento registrado exitosamente',
      movement,
    });
  } catch (error) {
    console.error('Create roll movement error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 