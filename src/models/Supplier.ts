import mongoose from 'mongoose';

export interface ISupplier extends mongoose.Document {
  businessName: string;
  contact: string;
  cuit: string;
  email?: string;
  address?: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IInvoice extends mongoose.Document {
  supplier: mongoose.Types.ObjectId;
  date: Date;
  amount: number;
  concept: string;
  invoiceNumber?: string;
  notes?: string;
  status: 'pending' | 'paid' | 'partial';
  createdAt: Date;
  updatedAt: Date;
}

export interface ISupplierPayment extends mongoose.Document {
  invoice: mongoose.Types.ObjectId;
  amount: number;
  date: Date;
  method: 'efectivo' | 'transferencia' | 'cheque' | 'tarjeta';
  reference?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const supplierSchema = new mongoose.Schema<ISupplier>({
  businessName: {
    type: String,
    required: true,
    trim: true,
  },
  contact: {
    type: String,
    required: true,
    trim: true,
  },
  cuit: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
  },
  address: {
    type: String,
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});

const invoiceSchema = new mongoose.Schema<IInvoice>({
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true,
  },
  date: {
    type: Date,
    required: true,
    default: Date.now,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  concept: {
    type: String,
    required: true,
    trim: true,
  },
  invoiceNumber: {
    type: String,
    trim: true,
  },
  notes: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'partial'],
    default: 'pending',
  },
}, {
  timestamps: true,
});

const supplierPaymentSchema = new mongoose.Schema<ISupplierPayment>({
  invoice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  date: {
    type: Date,
    required: true,
    default: Date.now,
  },
  method: {
    type: String,
    required: true,
    enum: ['efectivo', 'transferencia', 'cheque', 'tarjeta'],
  },
  reference: {
    type: String,
    trim: true,
  },
  notes: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});

export const Supplier = mongoose.models.Supplier || mongoose.model<ISupplier>('Supplier', supplierSchema);
export const Invoice = mongoose.models.Invoice || mongoose.model<IInvoice>('Invoice', invoiceSchema);
export const SupplierPayment = mongoose.models.SupplierPayment || mongoose.model<ISupplierPayment>('SupplierPayment', supplierPaymentSchema); 