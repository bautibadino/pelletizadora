import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { SupplyMovement, SupplyStock } from '@/models/Stock';
import { roundToTwoDecimals } from '@/lib/utils';

// GET - Obtener movimientos de insumos
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const supplyName = searchParams.get('supplyName');
    const type = searchParams.get('type');
    
    const skip = (page - 1) * limit;
    
    // Construir filtros
    const filters: Record<string, unknown> = {};
    if (supplyName) filters.supplyName = supplyName;
    if (type) filters.type = type;
    
    const movements = await SupplyMovement.find(filters)
      .populate('supplier', 'businessName')
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await SupplyMovement.countDocuments(filters);
    
    return NextResponse.json({
      movements,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get supply movements error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear movimiento de insumo (salida/producción)
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const {
      supplyName,
      type,
      quantity,
      unit = 'kg',
      reference,
      notes
    } = body;
    
    // Validaciones básicas
    if (!supplyName || !type || !quantity) {
      return NextResponse.json(
        { error: 'Datos requeridos: supplyName, type y quantity' },
        { status: 400 }
      );
    }
    
    if (type !== 'salida' && type !== 'produccion') {
      return NextResponse.json(
        { error: 'Tipo debe ser "salida" o "produccion"' },
        { status: 400 }
      );
    }
    
    // Verificar stock disponible
    const supplyStock = await SupplyStock.findOne({ name: supplyName });
    if (!supplyStock) {
      return NextResponse.json(
        { error: 'Insumo no encontrado en stock' },
        { status: 404 }
      );
    }
    
    const quantityToDeduct = roundToTwoDecimals(Number(quantity));
    
    if (supplyStock.quantity < quantityToDeduct) {
      return NextResponse.json(
        { error: `Stock insuficiente. Disponible: ${supplyStock.quantity} ${supplyStock.unit}` },
        { status: 400 }
      );
    }
    
    // Actualizar stock
    supplyStock.quantity = roundToTwoDecimals(supplyStock.quantity - quantityToDeduct);
    await supplyStock.save();
    
    // Crear movimiento
    const movement = new SupplyMovement({
      supplyName,
      type,
      quantity: quantityToDeduct,
      unit,
      date: new Date(),
      reference,
      notes: notes || `${type === 'produccion' ? 'Consumo en producción' : 'Salida manual'}`
    });
    
    await movement.save();
    
    return NextResponse.json({
      message: 'Movimiento registrado exitosamente',
      movement,
      newStock: supplyStock.quantity
    }, { status: 201 });
    
  } catch (error) {
    console.error('Create supply movement error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 