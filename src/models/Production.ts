import mongoose from 'mongoose';

// Producción de Pellets
export interface IProduction extends mongoose.Document {
  date: Date;
  rollType: string;
  rollQuantity: number; // Cantidad de rollos consumidos (ton)
  pelletQuantity: number; // Cantidad de pellets producidos (ton)
  efficiency: number; // Rendimiento (pellet/rollo)
  notes?: string;
  operator?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Consumo de Rollos en Producción
export interface IRollConsumption extends mongoose.Document {
  production: mongoose.Types.ObjectId;
  rollType: string;
  quantity: number; // Cantidad consumida (ton)
  date: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Generación de Stock de Pellets
export interface IPelletGeneration extends mongoose.Document {
  production: mongoose.Types.ObjectId;
  presentation: string; // 'Bolsa 25kg', 'Big Bag', 'Granel'
  quantity: number; // Cantidad generada
  date: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const productionSchema = new mongoose.Schema<IProduction>({
  date: {
    type: Date,
    required: true,
    default: Date.now,
  },
  rollType: {
    type: String,
    required: true,
    trim: true,
  },
  rollQuantity: {
    type: Number,
    required: true,
    min: 0.01,
  },
  pelletQuantity: {
    type: Number,
    required: true,
    min: 0.01,
  },
  efficiency: {
    type: Number,
    required: true,
    min: 0,
    max: 1,
  },
  notes: {
    type: String,
    trim: true,
  },
  operator: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});

const rollConsumptionSchema = new mongoose.Schema<IRollConsumption>({
  production: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Production',
    required: true,
  },
  rollType: {
    type: String,
    required: true,
    trim: true,
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
  notes: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});

const pelletGenerationSchema = new mongoose.Schema<IPelletGeneration>({
  production: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Production',
    required: true,
  },
  presentation: {
    type: String,
    required: true,
    enum: ['Bolsa 25kg', 'Big Bag', 'Granel'],
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
  notes: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});

export const Production = mongoose.models.Production || mongoose.model<IProduction>('Production', productionSchema);
export const RollConsumption = mongoose.models.RollConsumption || mongoose.model<IRollConsumption>('RollConsumption', rollConsumptionSchema);
export const PelletGeneration = mongoose.models.PelletGeneration || mongoose.model<IPelletGeneration>('PelletGeneration', pelletGenerationSchema); 