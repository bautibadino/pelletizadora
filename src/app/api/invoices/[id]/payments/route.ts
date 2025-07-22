import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Invoice } from '@/models/Invoice';
import { Check } from '@/models/Check';
import mongoose from 'mongoose';
import { roundToTwoDecimals } from '@/lib/utils';

// GET - Obtener pagos de una factura
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const { id } = await params;
    const invoice = await Invoice.findById(id);
    
    if (!invoice) {
      return NextResponse.json(
        { error: 'Factura no encontrada' },
        { status: 404 }
      );
    }
    
    const totalPaid = invoice.payments.reduce((sum: number, payment: { amount: number }) => sum + payment.amount, 0);
    const pendingAmount = invoice.total - totalPaid;
    
    return NextResponse.json({
      payments: invoice.payments,
      totalPaid,
      pendingAmount: Math.max(0, pendingAmount)
    });
  } catch (error) {
    console.error('Get payments error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Agregar pago a una factura
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const { id } = await params;
    const body = await request.json();
    const {
      amount,
      method,
      date,
      reference,
      description,
      receivedFrom,
      excessHandling,
      refundMethod,
      refundReference,
      pendingAmount,
      excessAmount,
      appliedAmount,
      // Campos específicos para cheques
      checkId,
      checkNumber,
      isEcheq,
      issuedBy,
      bankName,
      accountNumber,
      dueDate,
      // Campos específicos para transferencias
      transferNumber,
      bankAccount
    } = body;
    
    // Validaciones
    if (!amount || !method || amount <= 0) {
      return NextResponse.json(
        { error: 'Monto y método de pago son requeridos' },
        { status: 400 }
      );
    }
    
    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return NextResponse.json(
        { error: 'Factura no encontrada' },
        { status: 404 }
      );
    }
    
    // Calcular montos con redondeo
    const totalPaid = invoice.payments.reduce((sum: number, payment: { amount: number }) => sum + roundToTwoDecimals(payment.amount), 0);
    const actualPendingAmount = Math.max(0, roundToTwoDecimals(invoice.total - totalPaid));
    const actualExcessAmount = Math.max(0, roundToTwoDecimals(amount - actualPendingAmount));
    
    // Determinar el monto que se aplicará a la factura
    let amountToApply = amount;
    let refundInfo = null;
    
    if (actualExcessAmount > 0) {
      // Hay exceso, manejar según la opción seleccionada
      amountToApply = actualPendingAmount; // Solo aplicar lo que corresponde a la factura
      
      switch (excessHandling) {
        case 'credit':
          // Mantener como saldo a favor (no hacer nada especial)
          refundInfo = {
            type: 'credit',
            amount: actualExcessAmount,
            message: `Saldo a favor del proveedor: $${actualExcessAmount.toLocaleString()}`
          };
          break;
          
        case 'refund_cash':
          refundInfo = {
            type: 'refund_cash',
            amount: actualExcessAmount,
            message: `Devolución en efectivo: $${actualExcessAmount.toLocaleString()}`
          };
          break;
          
        case 'refund_check':
          if (!refundReference) {
            return NextResponse.json(
              { error: 'Se requiere número de cheque para la devolución' },
              { status: 400 }
            );
          }
          refundInfo = {
            type: 'refund_check',
            amount: actualExcessAmount,
            method: refundMethod || 'cheque',
            reference: refundReference,
            message: `Devolución con cheque #${refundReference}: $${actualExcessAmount.toLocaleString()}`
          };
          break;
          
        case 'refund_transfer':
          if (!refundReference) {
            return NextResponse.json(
              { error: 'Se requiere número de transferencia para la devolución' },
              { status: 400 }
            );
          }
          refundInfo = {
            type: 'refund_transfer',
            amount: actualExcessAmount,
            method: refundMethod || 'transferencia',
            reference: refundReference,
            message: `Devolución por transferencia #${refundReference}: $${actualExcessAmount.toLocaleString()}`
          };
          break;
          
        default:
          return NextResponse.json(
            { error: 'Opción de manejo de exceso no válida' },
            { status: 400 }
          );
      }
    }
    
    // Crear el pago (solo el monto que se aplica a la factura)
    const payment = {
      amount: roundToTwoDecimals(amountToApply),
      method,
      date: date ? new Date(date) : new Date(),
      reference: method === 'transferencia' ? transferNumber : reference,
      description: description || (refundInfo ? `Pago parcial - ${refundInfo.message}` : 'Pago'),
      receivedFrom,
      // Campos específicos para cheques
      checkId: method === 'cheque' ? checkId : undefined,
      checkNumber: method === 'cheque' ? checkNumber : undefined,
      isEcheq: method === 'cheque' ? isEcheq : undefined,
      issuedBy: method === 'cheque' ? issuedBy : undefined,
      bankName: method === 'cheque' ? bankName : undefined,
      accountNumber: method === 'cheque' ? accountNumber : undefined,
      dueDate: method === 'cheque' && dueDate ? new Date(dueDate) : undefined,
      // Campos específicos para transferencias
      transferNumber: method === 'transferencia' ? transferNumber : undefined,
      bankAccount: method === 'transferencia' ? bankAccount : undefined
    };
    
    // Agregar el pago a la factura
    invoice.payments.push(payment);
    
    // Recalcular estado con redondeo
    const newTotalPaid = invoice.payments.reduce((sum: number, p: { amount: number }) => sum + roundToTwoDecimals(p.amount), 0);
    if (newTotalPaid >= invoice.total) {
      invoice.status = 'pagado';
    } else if (newTotalPaid > 0) {
      invoice.status = 'parcial';
    }
    
    await invoice.save();
    
    // Si el pago es con cheque, actualizar el estado del cheque
    if (method === 'cheque' && checkId) {
      try {
        const check = await Check.findById(checkId);
        if (check) {
          check.status = 'entregado';
          check.deliveredTo = receivedFrom || 'Proveedor';
          check.deliveredDate = new Date();
          check.deliveredFor = `Pago factura #${invoice.invoiceNumber}`;
          check.invoiceId = invoice._id as mongoose.Types.ObjectId;
          await check.save();
        }
      } catch (error) {
        console.error('Error updating check status:', error);
        // No fallar el pago si hay error actualizando el cheque
      }
    }
    
    // Poblar datos del proveedor para la respuesta
    await invoice.populate('supplierId', 'businessName contact');
    
    return NextResponse.json({
      message: 'Pago registrado exitosamente',
      invoice,
      payment,
      refundInfo,
      summary: {
        totalPayment: roundToTwoDecimals(amount),
        appliedToInvoice: roundToTwoDecimals(amountToApply),
        excessAmount: roundToTwoDecimals(actualExcessAmount),
        newPendingAmount: Math.max(0, roundToTwoDecimals(invoice.total - newTotalPaid))
      }
    });
    
  } catch (error) {
    console.error('Add payment error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 