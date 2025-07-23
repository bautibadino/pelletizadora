import mongoose from 'mongoose';

export interface ISale extends mongoose.Document {
  client: mongoose.Types.ObjectId;
  date: Date;
  presentation: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  lot?: string;
  notes?: string;
  status: 'pending' | 'paid' | 'partial';
  createdAt: Date;
  updatedAt: Date;
}

export interface IPayment extends mongoose.Document {
  sale: mongoose.Types.ObjectId;
  amount: number;
  date: Date;
  method: 'efectivo' | 'transferencia' | 'cheque' | 'tarjeta' | 'saldo_a_favor';
  reference?: string;
  notes?: string;
  checkId?: mongoose.Types.ObjectId; // Referencia al cheque si el método es 'cheque'
  createdAt: Date;
  updatedAt: Date;
}

const saleSchema = new mongoose.Schema<ISale>({
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true,
  },
  date: {
    type: Date,
    required: true,
    default: Date.now,
  },
  presentation: {
    type: String,
    required: true,
    enum: ['Bolsa 25kg', 'Big Bag', 'Granel'],
  },
  quantity: {
    type: Number,
    required: true,
    min: 0.001, // Permitir cantidades desde 1 kg (0.001 ton)
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  lot: {
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

const paymentSchema = new mongoose.Schema<IPayment>({
  sale: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sale',
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
    enum: ['efectivo', 'transferencia', 'cheque', 'tarjeta', 'saldo_a_favor'],
  },
  reference: {
    type: String,
    trim: true,
  },
  notes: {
    type: String,
    trim: true,
  },
  checkId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Check',
    required: false,
  },
}, {
  timestamps: true,
});

export const Sale = mongoose.models.Sale || mongoose.model<ISale>('Sale', saleSchema);
export const Payment = mongoose.models.Payment || mongoose.model<IPayment>('Payment', paymentSchema); 