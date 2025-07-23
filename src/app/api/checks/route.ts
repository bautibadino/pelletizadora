import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Check, ICheck } from '@/models/Check';
import { Invoice } from '@/models/Invoice';
import { roundToTwoDecimals } from '@/lib/utils';

// GET - Obtener cheques con filtros
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const isEcheq = searchParams.get('isEcheq');
    const dueSoon = searchParams.get('dueSoon'); // Para cheques próximos a vencer
    
    const skip = (page - 1) * limit;
    
    // Construir filtros
    const filters: Record<string, unknown> = {};
    if (status) filters.status = status;
    if (isEcheq !== null) filters.isEcheq = isEcheq === 'true';
    
    let query = Check.find(filters);
    
    // Si se solicitan cheques próximos a vencer
    if (dueSoon === 'true') {
      const days = parseInt(searchParams.get('days') || '7');
      const today = new Date();
      const dueDate = new Date();
      dueDate.setDate(today.getDate() + days);
      
      query = Check.find({
        status: 'pendiente',
        dueDate: {
          $gte: today,
          $lte: dueDate
        }
      }).sort({ dueDate: 1 });
    } else {
      query = query.sort({ dueDate: 1 });
    }
    
    const checks = await query
      .skip(skip)
      .limit(limit);
    
    const total = await Check.countDocuments(filters);
    
    // Calcular estadísticas
    const stats = await Check.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);
    
    const statsMap = stats.reduce((acc, stat) => {
      acc[stat._id] = { count: stat.count, totalAmount: stat.totalAmount };
      return acc;
    }, {} as Record<string, { count: number; totalAmount: number }>);
    
    return NextResponse.json({
      checks,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      stats: statsMap
    });
  } catch (error) {
    console.error('Get checks error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo cheque
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const {
      checkNumber,
      amount,
      isEcheq = false,
      receptionDate,
      dueDate,
      receivedFrom,
      issuedBy,
      bankName,
      accountNumber,
      notes,
      clientPaymentId,
      supplierPaymentId
    } = body;
    
    // Validaciones básicas
    if (!checkNumber || !amount || !receivedFrom || !issuedBy || !dueDate) {
      return NextResponse.json(
        { error: 'Datos requeridos: checkNumber, amount, receivedFrom, issuedBy, dueDate' },
        { status: 400 }
      );
    }
    
    // Verificar que el número de cheque sea único
    const existingCheck = await Check.findOne({ checkNumber });
    if (existingCheck) {
      return NextResponse.json(
        { error: 'Ya existe un cheque con ese número' },
        { status: 400 }
      );
    }
    
    // Crear el cheque con redondeo
    const check = new Check({
      checkNumber,
      amount: roundToTwoDecimals(Number(amount)),
      isEcheq,
      receptionDate: receptionDate ? new Date(receptionDate) : new Date(),
      dueDate: new Date(dueDate),
      receivedFrom,
      issuedBy,
      bankName,
      accountNumber,
      notes,
      clientPaymentId,
      supplierPaymentId,
      status: 'pendiente'
    });
    
    await check.save();
    
    return NextResponse.json({
      message: 'Cheque creado exitosamente',
      check
    }, { status: 201 });
    
  } catch (error: unknown) {
    console.error('Create check error:', error);
    
    // Manejar errores de validación específicos
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ValidationError' && 'errors' in error) {
      const validationError = error as { errors: Record<string, { path: string; message: string }> };
      const validationErrors = Object.keys(validationError.errors).map(key => {
        const field = validationError.errors[key];
        return `${field.path}: ${field.message}`;
      });
      
      return NextResponse.json(
        { 
          error: 'Error de validación',
          details: validationErrors.join(', ')
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 