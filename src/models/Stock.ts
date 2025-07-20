import mongoose from 'mongoose';

// Stock de Pellets (Producto Final)
export interface IStock extends mongoose.Document {
  presentation: string;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
}

// Stock de Rollos (Materia Prima)
export interface IRollStock extends mongoose.Document {
  type: string; // Tipo de rollo (pino, eucalipto, etc.)
  quantity: number; // Cantidad en toneladas
  supplier?: mongoose.Types.ObjectId; // Proveedor del rollo
  invoiceNumber?: string; // Número de factura
  createdAt: Date;
  updatedAt: Date;
}

export interface IStockMovement extends mongoose.Document {
  presentation: string;
  type: 'entrada' | 'salida';
  quantity: number;
  date: Date;
  reference?: string; // Para referenciar ventas o cargas
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Movimientos de Rollos
export interface IRollMovement extends mongoose.Document {
  rollType: string;
  type: 'entrada' | 'salida' | 'produccion';
  quantity: number;
  date: Date;
  supplier?: mongoose.Types.ObjectId;
  invoiceNumber?: string;
  reference?: string; // Para referenciar facturas o producción
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const stockSchema = new mongoose.Schema<IStock>({
  presentation: {
    type: String,
    required: true,
    enum: ['Bolsa 25kg', 'Big Bag', 'Granel'],
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
}, {
  timestamps: true,
});

const rollStockSchema = new mongoose.Schema<IRollStock>({
  type: {
    type: String,
    required: true,
    trim: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
  },
  invoiceNumber: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});

const stockMovementSchema = new mongoose.Schema<IStockMovement>({
  presentation: {
    type: String,
    required: true,
    enum: ['Bolsa 25kg', 'Big Bag', 'Granel'],
  },
  type: {
    type: String,
    required: true,
    enum: ['entrada', 'salida'],
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  date: {
    type: Date,
    required: true,
    default: Date.now,
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

const rollMovementSchema = new mongoose.Schema<IRollMovement>({
  rollType: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
    type: String,
    required: true,
    enum: ['entrada', 'salida', 'produccion'],
  },
  quantity: {
    type: Number,
    required: true,
    min: 0.01,
  },
  date: {
    type: Date,
    required: true,
    default: Date.now,
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
  },
  invoiceNumber: {
    type: String,
    trim: true,
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

export const Stock = mongoose.models.Stock || mongoose.model<IStock>('Stock', stockSchema);
export const RollStock = mongoose.models.RollStock || mongoose.model<IRollStock>('RollStock', rollStockSchema);
export const StockMovement = mongoose.models.StockMovement || mongoose.model<IStockMovement>('StockMovement', stockMovementSchema);
export const RollMovement = mongoose.models.RollMovement || mongoose.model<IRollMovement>('RollMovement', rollMovementSchema); 