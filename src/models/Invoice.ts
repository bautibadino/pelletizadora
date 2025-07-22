import mongoose, { Schema, Document } from 'mongoose';
import { roundToTwoDecimals } from '@/lib/utils';

// Interfaz para líneas de factura
export interface InvoiceLine {
  description: string;
  type: 'rollo_alfalfa' | 'rollo_otro' | 'insumo' | 'servicio' | 'otro';
  quantity: number;
  unitPrice: number;
  total: number;
  weight?: number; // Peso por unidad en kg (solo para rollos)
}

// Interfaz para pagos
export interface Payment {
  amount: number;
  method: 'efectivo' | 'transferencia' | 'cheque' | 'otro';
  date: Date;
  reference?: string; // Número de transferencia, número de cheque, etc.
  description?: string;
  receivedFrom?: string; // Para cheques de terceros
  checkId?: mongoose.Types.ObjectId; // Referencia al cheque si el método es 'cheque'
}

// Interfaz principal de la factura
export interface IInvoice extends Document {
  supplierId: mongoose.Types.ObjectId;
  invoiceNumber: string;
  date: Date;
  dueDate: Date;
  concept: string;
  lines: InvoiceLine[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'pendiente' | 'pagado' | 'parcial';
  payments: Payment[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceLineSchema = new Schema<InvoiceLine>({
  description: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['rollo_alfalfa', 'rollo_otro', 'insumo', 'servicio', 'otro'],
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  weight: {
    type: Number,
    min: 0
  }
});

const PaymentSchema = new Schema<Payment>({
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  method: {
    type: String,
    enum: ['efectivo', 'transferencia', 'cheque', 'otro'],
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  reference: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  receivedFrom: {
    type: String,
    trim: true
  },
  checkId: {
    type: Schema.Types.ObjectId,
    ref: 'Check',
    required: false
  }
});

const InvoiceSchema = new Schema<IInvoice>({
  supplierId: {
    type: Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true
  },
  invoiceNumber: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: true
  },
  concept: {
    type: String,
    required: false,
    trim: true,
    default: 'Factura de proveedor'
  },
  lines: {
    type: [InvoiceLineSchema],
    required: true,
    validate: {
      validator: function(lines: InvoiceLine[]) {
        return lines && lines.length > 0;
      },
      message: 'La factura debe tener al menos una línea'
    }
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  tax: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pendiente', 'pagado', 'parcial'],
    required: true,
    default: 'pendiente'
  },
  payments: {
    type: [PaymentSchema],
    default: []
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Middleware para calcular totales antes de guardar - DESHABILITADO TEMPORALMENTE
// InvoiceSchema.pre('save', function(next) {
//   try {
//     // Calcular subtotal solo si hay líneas
//     if (this.lines && this.lines.length > 0) {
//       this.subtotal = this.lines.reduce((sum, line) => sum + (line.total || 0), 0);
//     } else {
//       this.subtotal = 0;
//     }
//     
//     // Calcular total (subtotal + impuestos)
//     this.total = this.subtotal + (this.tax || 0);
//     
//     // Actualizar estado basado en pagos solo si hay pagos
//     if (this.payments && this.payments.length > 0) {
//       const totalPaid = this.payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
//       
//       if (totalPaid >= this.total) {
//         this.status = 'pagado';
//       } else if (totalPaid > 0) {
//         this.status = 'parcial';
//       } else {
//         this.status = 'pendiente';
//       }
//     } else {
//       this.status = 'pendiente';
//     }
//     
//     next();
//   } catch (error) {
//     next(error as Error);
//   }
// });

// Método para agregar pago
InvoiceSchema.methods.addPayment = function(payment: Payment) {
  this.payments.push(payment);
  
  // Recalcular estado
  const totalPaid = this.payments.reduce((sum: number, p: Payment) => sum + roundToTwoDecimals(p.amount), 0);
  
  if (totalPaid >= this.total) {
    this.status = 'pagado';
  } else if (totalPaid > 0) {
    this.status = 'parcial';
  }
  
  return this.save();
};

// Método para obtener monto pendiente
InvoiceSchema.methods.getPendingAmount = function() {
  const totalPaid = this.payments.reduce((sum: number, payment: Payment) => sum + roundToTwoDecimals(payment.amount), 0);
  return Math.max(0, roundToTwoDecimals(this.total - totalPaid));
};

// Eliminar el modelo existente si existe para evitar conflictos
if (mongoose.models.Invoice) {
  delete mongoose.models.Invoice;
}

export const Invoice = mongoose.model<IInvoice>('Invoice', InvoiceSchema); 