import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { SupplyMovement, SupplyStock } from '@/models/Stock';
import { roundToTwoDecimals } from '@/lib/utils';

// GET - Obtener movimientos de insumos
export async function GET(request: NextRequest) {
  try {
    console.log('GET /api/supplies/movements - Iniciando...');
    await connectDB();
    console.log('GET /api/supplies/movements - Conexión a DB establecida');
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const supplyName = searchParams.get('supplyName');
    const type = searchParams.get('type');
    
    console.log('GET /api/supplies/movements - Parámetros:', { page, limit, supplyName, type });
    
    const skip = (page - 1) * limit;
    
    // Construir filtros
    const filters: Record<string, unknown> = {};
    if (supplyName) filters.supplyName = supplyName;
    if (type) filters.type = type;
    
    console.log('GET /api/supplies/movements - Filtros:', filters);
    
    // Verificar que el modelo existe
    console.log('GET /api/supplies/movements - Modelo SupplyMovement:', SupplyMovement);
    console.log('GET /api/supplies/movements - Nombre del modelo:', SupplyMovement.modelName);
    
    const movements = await SupplyMovement.find(filters)
      .populate('supplier', 'businessName')
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);
    
    console.log('GET /api/supplies/movements - Movements encontrados:', movements.length);
    console.log('GET /api/supplies/movements - Movements raw:', JSON.stringify(movements, null, 2));
    
    const total = await SupplyMovement.countDocuments(filters);
    console.log('GET /api/supplies/movements - Total de movements:', total);
    
    const response = {
      movements: movements || [],
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
    
    console.log('GET /api/supplies/movements - Respuesta preparada:', response);
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('GET /api/supplies/movements - Error completo:', error);
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