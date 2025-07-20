import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Production, RollConsumption, PelletGeneration } from '@/models/Production';
import { RollStock, RollMovement } from '@/models/Stock';
import { Stock, StockMovement } from '@/models/Stock';

// GET - Obtener producciones
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const rollType = searchParams.get('rollType');
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    
    const filter: Record<string, unknown> = {};
    
    if (rollType) {
      filter.rollType = rollType;
    }
    
    const skip = (page - 1) * limit;
    
    const productions = await Production.find(filter)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Production.countDocuments(filter);
    
    return NextResponse.json({
      productions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get productions error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Registrar producción
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const { 
      rollType, 
      rollQuantity, 
      pelletQuantity, 
      efficiency, 
      operator, 
      notes,
      presentations // Array de {presentation, quantity}
    } = await request.json();

    if (!rollType || !rollQuantity || !pelletQuantity || !efficiency) {
      return NextResponse.json(
        { error: 'Tipo de rollo, cantidad de rollos, cantidad de pellets y eficiencia son requeridos' },
        { status: 400 }
      );
    }

    // Verificar stock disponible de rollos
    const rollStock = await RollStock.findOne({ type: rollType });
    if (!rollStock || rollStock.quantity < rollQuantity) {
      return NextResponse.json(
        { error: `Stock insuficiente de ${rollType}. Disponible: ${rollStock?.quantity || 0} ton` },
        { status: 400 }
      );
    }

    // Crear producción
    const production = new Production({
      date: new Date(),
      rollType,
      rollQuantity,
      pelletQuantity,
      efficiency,
      operator,
      notes,
    });

    await production.save();

    // Registrar consumo de rollos
    const consumption = new RollConsumption({
      production: production._id,
      rollType,
      quantity: rollQuantity,
      date: new Date(),
      notes: `Consumo para producción ${production._id}`,
    });
    await consumption.save();

    // Actualizar stock de rollos
    rollStock.quantity -= rollQuantity;
    await rollStock.save();

    // Registrar movimiento de salida de rollos
    const rollMovement = new RollMovement({
      rollType,
      type: 'produccion',
      quantity: rollQuantity,
      reference: `Producción: ${production._id}`,
      notes: `Consumo para producción de pellets`,
    });
    await rollMovement.save();

    // Generar stock de pellets por presentación
    for (const presentation of presentations || []) {
      const { presentation: presentationType, quantity } = presentation;
      
      // Crear registro de generación
      const generation = new PelletGeneration({
        production: production._id,
        presentation: presentationType,
        quantity,
        date: new Date(),
        notes: `Generado desde producción ${production._id}`,
      });
      await generation.save();

      // Actualizar stock de pellets
      let pelletStock = await Stock.findOne({ presentation: presentationType });
      if (pelletStock) {
        pelletStock.quantity += quantity;
        await pelletStock.save();
      } else {
        pelletStock = new Stock({
          presentation: presentationType,
          quantity,
        });
        await pelletStock.save();
      }

      // Registrar movimiento de entrada de pellets
      const stockMovement = new StockMovement({
        presentation: presentationType,
        type: 'entrada',
        quantity,
        reference: `Producción: ${production._id}`,
        notes: `Generado desde rollos ${rollType}`,
      });
      await stockMovement.save();
    }

    return NextResponse.json({
      message: 'Producción registrada exitosamente',
      production,
    });
  } catch (error) {
    console.error('Create production error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 