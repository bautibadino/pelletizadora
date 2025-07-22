import mongoose, { Schema, Document } from 'mongoose';

// Interfaz para el cheque
export interface ICheck extends Document {
  // Información básica del cheque
  checkNumber: string;
  amount: number;
  isEcheq: boolean;
  
  // Fechas
  receptionDate: Date;
  dueDate: Date;
  
  // Información de origen
  receivedFrom: string; // Quien entrega el cheque
  issuedBy: string; // Quien emite el cheque (banco/empresa)
  
  // Estado del cheque
  status: 'pendiente' | 'cobrado' | 'rechazado' | 'vencido' | 'entregado';
  
  // Relaciones
  clientPaymentId?: mongoose.Types.ObjectId; // Si viene de un pago de cliente
  supplierPaymentId?: mongoose.Types.ObjectId; // Si viene de un pago a proveedor
  
  // Información de entrega
  deliveredTo?: string; // A quién se entregó el cheque
  deliveredDate?: Date; // Fecha de entrega
  deliveredFor?: string; // Para qué se entregó (factura, concepto, etc.)
  invoiceId?: mongoose.Types.ObjectId; // Referencia a la factura si se entregó para pagar una
  
  // Información adicional
  bankName?: string;
  accountNumber?: string;
  notes?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const CheckSchema = new Schema<ICheck>({
  // Información básica del cheque
  checkNumber: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  isEcheq: {
    type: Boolean,
    required: true,
    default: false
  },
  
  // Fechas
  receptionDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: true
  },
  
  // Información de origen
  receivedFrom: {
    type: String,
    required: true,
    trim: true
  },
  issuedBy: {
    type: String,
    required: true,
    trim: true
  },
  
  // Estado del cheque
  status: {
    type: String,
    enum: ['pendiente', 'cobrado', 'rechazado', 'vencido', 'entregado'],
    required: true,
    default: 'pendiente'
  },
  
  // Relaciones opcionales
  clientPaymentId: {
    type: Schema.Types.ObjectId,
    ref: 'Payment',
    required: false
  },
  supplierPaymentId: {
    type: Schema.Types.ObjectId,
    ref: 'Payment',
    required: false
  },
  
  // Información de entrega
  deliveredTo: {
    type: String,
    trim: true
  },
  deliveredDate: {
    type: Date
  },
  deliveredFor: {
    type: String,
    trim: true
  },
  invoiceId: {
    type: Schema.Types.ObjectId,
    ref: 'Invoice',
    required: false
  },
  
  // Información adicional
  bankName: {
    type: String,
    trim: true
  },
  accountNumber: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Índices para búsquedas eficientes
CheckSchema.index({ checkNumber: 1 });
CheckSchema.index({ status: 1 });
CheckSchema.index({ dueDate: 1 });
CheckSchema.index({ clientPaymentId: 1 });
CheckSchema.index({ supplierPaymentId: 1 });

// Middleware para actualizar estado basado en fecha de vencimiento
CheckSchema.pre('save', function(next) {
  // Si el cheque está pendiente y la fecha de vencimiento ya pasó, marcarlo como vencido
  if (this.status === 'pendiente' && this.dueDate < new Date()) {
    this.status = 'vencido';
  }
  next();
});

// Método para marcar como cobrado
CheckSchema.methods.markAsCollected = function() {
  this.status = 'cobrado';
  return this.save();
};

// Método para marcar como rechazado
CheckSchema.methods.markAsRejected = function() {
  this.status = 'rechazado';
  return this.save();
};

// Método para obtener días hasta el vencimiento
CheckSchema.methods.getDaysUntilDue = function() {
  const today = new Date();
  const dueDate = new Date(this.dueDate);
  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// Método estático para obtener cheques próximos a vencer
CheckSchema.statics.getChecksDueSoon = function(days = 7) {
  const today = new Date();
  const dueDate = new Date();
  dueDate.setDate(today.getDate() + days);
  
  return this.find({
    status: 'pendiente',
    dueDate: {
      $gte: today,
      $lte: dueDate
    }
  }).sort({ dueDate: 1 });
};

// Eliminar el modelo existente si existe para evitar conflictos
if (mongoose.models.Check) {
  delete mongoose.models.Check;
}

export const Check = mongoose.model<ICheck>('Check', CheckSchema); 