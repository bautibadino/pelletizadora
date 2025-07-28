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

    // VALIDACIÓN CRÍTICA: Verificar que el número de lote no exista
    const existingProduction = await Production.findOne({ lotNumber });
    if (existingProduction) {
      console.log('Validation failed - lot number already exists:', lotNumber);
      return NextResponse.json(
        { error: `El número de lote ${lotNumber} ya existe. Por favor, genere un nuevo número de lote.` },
        { status: 400 }
      );
    }

    // Validar que la cantidad total sea positiva
    if (Number(totalQuantity) <= 0) {
      return NextResponse.json(
        { error: 'La cantidad total debe ser mayor a 0' },
        { status: 400 }
      );
    }

    // Validar que la eficiencia esté en el rango correcto (0-1)
    if (Number(efficiency) < 0 || Number(efficiency) > 1) {
      return NextResponse.json(
        { error: 'La eficiencia debe estar entre 0 y 1 (0% a 100%)' },
        { status: 400 }
      );
    }

    // Validar que haya al menos un consumo de insumo
    if (!Array.isArray(supplyConsumptions) || supplyConsumptions.length === 0) {
      return NextResponse.json(
        { error: 'Debe especificar al menos un consumo de insumo' },
        { status: 400 }
      );
    }

    // Verificar stock disponible de insumos
    for (const consumption of supplyConsumptions) {
      const { supplyName, quantity } = consumption;
      
      if (!supplyName || !quantity || quantity <= 0) {
        return NextResponse.json(
          { error: `Datos inválidos para insumo: ${supplyName}` },
          { status: 400 }
        );
      }
      
      const supplyStock = await SupplyStock.findOne({ name: supplyName });
      
      if (!supplyStock) {
        return NextResponse.json(
          { error: `Insumo ${supplyName} no encontrado en stock` },
          { status: 400 }
        );
      }
      
      if (supplyStock.quantity < quantity) {
        return NextResponse.json(
          { error: `Stock insuficiente de ${supplyName}. Disponible: ${supplyStock.quantity} ${supplyStock.unit}` },
          { status: 400 }
        );
      }
    }

    // Validar presentaciones
    if (!Array.isArray(presentations) || presentations.length === 0) {
      return NextResponse.json(
        { error: 'Debe especificar al menos una presentación de pellets' },
        { status: 400 }
      );
    }

    // Verificar que la suma de las presentaciones coincida con la cantidad total
    const totalPresentations = presentations.reduce((sum, p) => sum + Number(p.quantity), 0);
    if (Math.abs(totalPresentations - Number(totalQuantity)) > 0.01) {
      return NextResponse.json(
        { error: `La suma de las presentaciones (${totalPresentations} kg) no coincide con la cantidad total (${totalQuantity} kg)` },
        { status: 400 }
      );
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