import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { SupplyStock, SupplyMovement } from '@/models/Stock';
import { roundToTwoDecimals } from '@/lib/utils';

// GET - Obtener stock de insumos
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search');
    
    // Validar parámetros
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Parámetros de paginación inválidos' },
        { status: 400 }
      );
    }
    
    const skip = (page - 1) * limit;
    
    // Construir filtros
    const filters: Record<string, unknown> = {};
    if (search) {
      filters.name = { $regex: search, $options: 'i' };
    }
    
    const supplies = await SupplyStock.find(filters)
      .populate('supplier', 'businessName')
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit);
    
    const total = await SupplyStock.countDocuments(filters);
    
    // Calcular estadísticas
    const stats = await SupplyStock.aggregate([
      {
        $group: {
          _id: null,
          totalItems: { $sum: 1 },
          lowStock: {
            $sum: {
              $cond: [
                { $and: [{ $gt: ['$minStock', 0] }, { $lte: ['$quantity', '$minStock'] }] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);
    
    return NextResponse.json({
      supplies: supplies || [],
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      stats: stats[0] || { totalItems: 0, lowStock: 0 }
    });
  } catch (error) {
    console.error('Get supplies error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear o actualizar stock de insumo
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const {
      name,
      quantity,
      unit = 'kg',
      supplier,
      minStock = 0,
      notes
    } = body;
    
    // Validaciones básicas
    if (!name || quantity === undefined) {
      return NextResponse.json(
        { error: 'Datos requeridos: name y quantity' },
        { status: 400 }
      );
    }

    // Validar que la cantidad sea un número válido
    const numericQuantity = Number(quantity);
    if (isNaN(numericQuantity) || numericQuantity < 0) {
      return NextResponse.json(
        { error: 'La cantidad debe ser un número válido mayor o igual a 0' },
        { status: 400 }
      );
    }

    // Validar que el nombre no esté vacío
    if (typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'El nombre del insumo no puede estar vacío' },
        { status: 400 }
      );
    }
    
    // Buscar stock existente
    let supplyStock = await SupplyStock.findOne({ name: name.trim() });
    
    if (supplyStock) {
      // Actualizar stock existente
      supplyStock.quantity = roundToTwoDecimals(supplyStock.quantity + numericQuantity);
      supplyStock.minStock = minStock;
    } else {
      // Crear nuevo stock
      supplyStock = new SupplyStock({
        name: name.trim(),
        quantity: roundToTwoDecimals(numericQuantity),
        unit,
        supplier,
        minStock
      });
    }
    
    await supplyStock.save();
    
    // Crear movimiento
    const movement = new SupplyMovement({
      supplyName: name.trim(),
      type: 'entrada',
      quantity: roundToTwoDecimals(numericQuantity),
      unit,
      date: new Date(),
      supplier,
      reference: 'Ajuste manual',
      notes: notes || 'Entrada manual'
    });
    
    await movement.save();
    
    await supplyStock.populate('supplier', 'businessName');
    
    return NextResponse.json({
      message: 'Stock de insumo actualizado exitosamente',
      supply: supplyStock
    }, { status: 201 });
    
  } catch (error) {
    console.error('Update supply stock error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 