import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Check, ICheck } from '@/models/Check';

// GET - Obtener un cheque específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const check = await Check.findById(params.id);
    
    if (!check) {
      return NextResponse.json(
        { error: 'Cheque no encontrado' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(check);
  } catch (error) {
    console.error('Get check error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar un cheque
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const body = await request.json();
    const {
      checkNumber,
      amount,
      isEcheq,
      receptionDate,
      dueDate,
      receivedFrom,
      issuedBy,
      bankName,
      accountNumber,
      notes,
      status
    } = body;
    
    const check = await Check.findById(params.id);
    
    if (!check) {
      return NextResponse.json(
        { error: 'Cheque no encontrado' },
        { status: 404 }
      );
    }
    
    // Verificar que el número de cheque sea único (si se está cambiando)
    if (checkNumber && checkNumber !== check.checkNumber) {
      const existingCheck = await Check.findOne({ checkNumber });
      if (existingCheck) {
        return NextResponse.json(
          { error: 'Ya existe un cheque con ese número' },
          { status: 400 }
        );
      }
    }
    
    // Actualizar campos
    if (checkNumber !== undefined) check.checkNumber = checkNumber;
    if (amount !== undefined) check.amount = Number(amount);
    if (isEcheq !== undefined) check.isEcheq = isEcheq;
    if (receptionDate !== undefined) check.receptionDate = new Date(receptionDate);
    if (dueDate !== undefined) check.dueDate = new Date(dueDate);
    if (receivedFrom !== undefined) check.receivedFrom = receivedFrom;
    if (issuedBy !== undefined) check.issuedBy = issuedBy;
    if (bankName !== undefined) check.bankName = bankName;
    if (accountNumber !== undefined) check.accountNumber = accountNumber;
    if (notes !== undefined) check.notes = notes;
    if (status !== undefined) check.status = status;
    
    await check.save();
    
    return NextResponse.json({
      message: 'Cheque actualizado exitosamente',
      check
    });
  } catch (error: unknown) {
    console.error('Update check error:', error);
    
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

// DELETE - Eliminar un cheque
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const check = await Check.findById(params.id);
    
    if (!check) {
      return NextResponse.json(
        { error: 'Cheque no encontrado' },
        { status: 404 }
      );
    }
    
    // Solo permitir eliminar cheques que no estén cobrados
    if (check.status === 'cobrado') {
      return NextResponse.json(
        { error: 'No se puede eliminar un cheque que ya fue cobrado' },
        { status: 400 }
      );
    }
    
    await Check.findByIdAndDelete(params.id);
    
    return NextResponse.json({
      message: 'Cheque eliminado exitosamente'
    });
  } catch (error) {
    console.error('Delete check error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 