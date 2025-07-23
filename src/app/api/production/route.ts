import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Production, SupplyConsumption, PelletGeneration } from '@/models/Production';
import { Stock, StockMovement, SupplyStock, SupplyMovement } from '@/models/Stock';
import { roundToTwoDecimals } from '@/lib/utils';

// GET - Obtener producciones
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const pelletType = searchParams.get('pelletType');
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    
    const filter: Record<string, unknown> = {};
    
    if (pelletType) {
      filter.pelletType = pelletType;
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
    
    const body = await request.json();
    console.log('Received production data:', body);
    
    const { 
      lotNumber,
      pelletType, 
      totalQuantity, 
      efficiency, 
      operator, 
      notes,
      supplyConsumptions, // Array de {supplyName, quantity, unit}
      presentations // Array de {presentation, quantity}
    } = body;

    console.log('Validation check:', {
      lotNumber: !!lotNumber,
      pelletType: !!pelletType,
      totalQuantity: !!totalQuantity,
      efficiency: !!efficiency,
      supplyConsumptions: !!supplyConsumptions,
      supplyConsumptionsLength: supplyConsumptions?.length
    });

    if (!lotNumber || !pelletType || !totalQuantity || !efficiency || !supplyConsumptions) {
      console.log('Validation failed - missing required fields');
      return NextResponse.json(
        { error: 'Número de lote, tipo de pellet, cantidad total, eficiencia y consumos de insumos son requeridos' },
        { status: 400 }
      );
    }

    // Verificar stock disponible de insumos
    for (const consumption of supplyConsumptions) {
      const { supplyName, quantity } = consumption;
      const supplyStock = await SupplyStock.findOne({ name: supplyName });
      
      if (!supplyStock || supplyStock.quantity < quantity) {
        return NextResponse.json(
          { error: `Stock insuficiente de ${supplyName}. Disponible: ${supplyStock?.quantity || 0} ${supplyStock?.unit || 'kg'}` },
          { status: 400 }
        );
      }
    }

    // Crear producción
    const production = new Production({
      date: new Date(),
      lotNumber,
      pelletType,
      totalQuantity: roundToTwoDecimals(totalQuantity),
      efficiency: roundToTwoDecimals(efficiency),
      operator,
      notes,
    });

    await production.save();

    // Registrar consumo de insumos y actualizar stock
    for (const consumption of supplyConsumptions) {
      const { supplyName, quantity, unit } = consumption;
      
      // Crear registro de consumo
      const supplyConsumption = new SupplyConsumption({
        production: production._id,
        supplyName,
        quantity: roundToTwoDecimals(quantity),
        unit,
        date: new Date(),
        notes: `Consumo para producción ${production.lotNumber}`,
      });
      await supplyConsumption.save();

      // Actualizar stock de insumos
      const supplyStock = await SupplyStock.findOne({ name: supplyName });
      if (supplyStock) {
        supplyStock.quantity = roundToTwoDecimals(supplyStock.quantity - quantity);
        await supplyStock.save();
      }

      // Registrar movimiento de salida de insumos
      const supplyMovement = new SupplyMovement({
        supplyName,
        type: 'produccion',
        quantity: roundToTwoDecimals(quantity),
        unit,
        date: new Date(),
        reference: `Producción: ${production.lotNumber}`,
        notes: `Consumo para producción de ${pelletType}`,
      });
      await supplyMovement.save();
    }

    // Generar stock de pellets por presentación
    console.log('Presentations to process:', presentations);
    for (const presentation of presentations || []) {
      const { presentation: presentationType, quantity } = presentation;
      console.log(`Processing presentation: ${presentationType} with quantity: ${quantity}`);
      
      // Crear registro de generación
      const generation = new PelletGeneration({
        production: production._id,
        presentation: presentationType,
        quantity: roundToTwoDecimals(quantity),
        date: new Date(),
        notes: `Generado desde producción ${production.lotNumber}`,
      });
      await generation.save();
      console.log(`PelletGeneration saved for ${presentationType}`);

      // Actualizar stock de pellets
      let pelletStock = await Stock.findOne({ presentation: presentationType });
      console.log(`Current stock for ${presentationType}:`, pelletStock);
      
      if (pelletStock) {
        const oldQuantity = pelletStock.quantity;
        pelletStock.quantity = roundToTwoDecimals(pelletStock.quantity + quantity);
        await pelletStock.save();
        console.log(`Stock updated for ${presentationType}: ${oldQuantity} + ${quantity} = ${pelletStock.quantity}`);
      } else {
        pelletStock = new Stock({
          presentation: presentationType,
          quantity: roundToTwoDecimals(quantity),
        });
        await pelletStock.save();
        console.log(`New stock created for ${presentationType}: ${quantity}`);
      }

      // Registrar movimiento de entrada de pellets
      const stockMovement = new StockMovement({
        presentation: presentationType,
        type: 'entrada',
        quantity: roundToTwoDecimals(quantity),
        date: new Date(),
        reference: `Producción: ${production.lotNumber}`,
        notes: `Generado desde ${pelletType}`,
      });
      await stockMovement.save();
      console.log(`StockMovement saved for ${presentationType}`);
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