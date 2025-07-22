import mongoose from 'mongoose';

// Stock de Pellets (Producto Final)
export interface IStock extends mongoose.Document {
  presentation: string;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
}



// Stock de Insumos (Materiales de producción)
export interface ISupplyStock extends mongoose.Document {
  name: string; // Nombre del insumo (BENTONITA, etc.)
  quantity: number; // Cantidad en kg
  unit: string; // Unidad de medida (kg, litros, etc.)
  supplier?: mongoose.Types.ObjectId; // Proveedor del insumo
  invoiceNumber?: string; // Número de factura
  minStock?: number; // Stock mínimo para alertas
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



// Movimientos de Insumos
export interface ISupplyMovement extends mongoose.Document {
  supplyName: string;
  type: 'entrada' | 'salida' | 'produccion';
  quantity: number;
  unit: string;
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



const supplyStockSchema = new mongoose.Schema<ISupplyStock>({
  name: {
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
  unit: {
    type: String,
    required: true,
    trim: true,
    default: 'kg',
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
  },
  invoiceNumber: {
    type: String,
    trim: true,
  },
  minStock: {
    type: Number,
    min: 0,
    default: 0,
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



const supplyMovementSchema = new mongoose.Schema<ISupplyMovement>({
  supplyName: {
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
  unit: {
    type: String,
    required: true,
    trim: true,
    default: 'kg',
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
export const SupplyStock = mongoose.models.SupplyStock || mongoose.model<ISupplyStock>('SupplyStock', supplyStockSchema);
export const StockMovement = mongoose.models.StockMovement || mongoose.model<IStockMovement>('StockMovement', stockMovementSchema);
export const SupplyMovement = mongoose.models.SupplyMovement || mongoose.model<ISupplyMovement>('SupplyMovement', supplyMovementSchema); 