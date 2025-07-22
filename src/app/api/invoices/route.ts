import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Invoice, IInvoice, InvoiceLine } from '@/models/Invoice';
import { Supplier } from '@/models/Supplier';
import { SupplyStock, SupplyMovement } from '@/models/Stock';
import mongoose from 'mongoose';

interface InvoiceLineInput {
  description: string;
  type: 'rollo_alfalfa' | 'rollo_otro' | 'insumo' | 'servicio' | 'otro';
  quantity: number;
  unitPrice: number;
  total: number;
  weight?: number;
}

// GET - Obtener facturas con filtros
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const supplierId = searchParams.get('supplierId');
    const status = searchParams.get('status');
    
    const skip = (page - 1) * limit;
    
    // Construir filtros
    const filters: Record<string, unknown> = {};
    if (supplierId) filters.supplierId = supplierId;
    if (status) filters.status = status;
    
    const invoices = await Invoice.find(filters)
      .populate('supplierId', 'businessName contact')
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Invoice.countDocuments(filters);
    
    return NextResponse.json({
      invoices,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get invoices error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear nueva factura
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    // Forzar la recreación del modelo Invoice
    if (mongoose.models.Invoice) {
      delete mongoose.models.Invoice;
    }
    
    // Importar el modelo nuevamente
    const { Invoice } = await import('@/models/Invoice');
    
    const body = await request.json();
    console.log('Received invoice data:', JSON.stringify(body, null, 2));
    const {
      supplierId,
      invoiceNumber,
      date,
      dueDate,
      concept,
      lines,
      tax = 0,
      notes
    } = body;
    
    // Validaciones básicas
    if (!supplierId || !invoiceNumber || !lines || !Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json(
        { error: 'Datos requeridos: supplierId, invoiceNumber y al menos una línea de producto' },
        { status: 400 }
      );
    }
    
    // Verificar que el proveedor existe
    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      return NextResponse.json(
        { error: 'Proveedor no encontrado' },
        { status: 404 }
      );
    }
    
    // Verificar que el número de factura sea único para este proveedor
    const existingInvoice = await Invoice.findOne({ 
      invoiceNumber,
      supplierId 
    });
    if (existingInvoice) {
      return NextResponse.json(
        { error: 'Ya existe una factura con ese número para este proveedor' },
        { status: 400 }
      );
    }
    
    // Procesar líneas y calcular totales
    const processedLines = lines.map((line: InvoiceLineInput) => {
      const quantity = Number(line.quantity) || 0;
      const unitPrice = Number(line.unitPrice) || 0;
      const total = quantity * unitPrice;
      return {
        description: line.description || '',
        type: line.type || 'otro',
        quantity,
        unitPrice,
        total,
        weight: line.weight ? Number(line.weight) : undefined
      };
    });
    
    const subtotal = processedLines.reduce((sum: number, line: InvoiceLineInput) => sum + line.total, 0);
    const total = subtotal + (tax || 0);
    
    // Crear la factura
    console.log('Creating invoice with data:', {
      supplierId,
      invoiceNumber,
      date: new Date(date),
      dueDate: new Date(dueDate),
      concept: concept || 'Factura de proveedor',
      lines: processedLines,
      subtotal,
      tax,
      total,
      status: 'pendiente',
      payments: [],
      notes
    });
    
    const invoice = new Invoice({
      supplierId,
      invoiceNumber,
      date: new Date(date),
      dueDate: new Date(dueDate),
      concept: concept || 'Factura de proveedor',
      lines: processedLines,
      subtotal,
      tax,
      total,
      status: 'pendiente',
      payments: [],
      notes
    });
    
    console.log('Invoice object created:', invoice);
    await invoice.save();
    console.log('Invoice saved successfully');
    
    // Procesar líneas y agregar al stock de insumos
    for (const line of processedLines) {
      if (line.type === 'rollo_alfalfa' || line.type === 'rollo_otro' || line.type === 'insumo') {
        let supplyName = line.description;
        let quantity = Number(line.quantity);
        let unit = 'kg';
        
        // Para rollos, usar el tipo como nombre y calcular peso total
        if (line.type === 'rollo_alfalfa' || line.type === 'rollo_otro') {
          supplyName = line.type === 'rollo_alfalfa' ? 'ROLLO ALFALFA' : 'ROLLO OTRO';
          if (line.weight) {
            quantity = Number(line.quantity) * Number(line.weight);
          }
          unit = 'kg'; // Los rollos se miden en kg para consistencia con el consumo
        }
        
        // Buscar stock existente o crear nuevo
        let supplyStock = await SupplyStock.findOne({ name: supplyName });
        
        if (supplyStock) {
          supplyStock.quantity += quantity;
        } else {
          supplyStock = new SupplyStock({
            name: supplyName,
            quantity: quantity,
            unit: unit,
            supplier: supplierId,
            invoiceNumber: invoiceNumber
          });
        }
        
        await supplyStock.save();
        
        // Crear movimiento de entrada
        const supplyMovement = new SupplyMovement({
          supplyName: supplyName,
          type: 'entrada',
          quantity: quantity,
          unit: unit,
          date: new Date(date),
          supplier: supplierId,
          invoiceNumber: invoiceNumber,
          reference: `Factura ${invoiceNumber}`,
          notes: `Entrada por factura ${invoiceNumber} - ${line.description}`
        });
        
        await supplyMovement.save();
      }
    }
    
    // Poblar datos del proveedor para la respuesta
    await invoice.populate('supplierId', 'businessName contact');
    
    return NextResponse.json({
      message: 'Factura creada exitosamente',
      invoice
    }, { status: 201 });
    
  } catch (error: unknown) {
    console.error('Create invoice error:', error);
    
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