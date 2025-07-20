import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Check, ICheck } from '@/models/Check';

// PUT - Cambiar estado del cheque
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  try {
    await connectDB();
    
    const body = await request.json();
    const { status, notes } = body;
    
    if (!status) {
      return NextResponse.json(
        { error: 'El estado es requerido' },
        { status: 400 }
      );
    }
    
    const check = await Check.findById(resolvedParams.id);
    
    if (!check) {
      return NextResponse.json(
        { error: 'Cheque no encontrado' },
        { status: 404 }
      );
    }
    
    // Validar que el estado sea válido
    const validStatuses = ['pendiente', 'cobrado', 'rechazado', 'vencido'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Estado inválido' },
        { status: 400 }
      );
    }
    
    // Actualizar estado
    check.status = status;
    if (notes) {
      check.notes = check.notes ? `${check.notes}\n${notes}` : notes;
    }
    
    await check.save();
    
    return NextResponse.json({
      message: `Cheque marcado como ${status}`,
      check
    });
  } catch (error) {
    console.error('Update check status error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 