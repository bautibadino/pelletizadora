import mongoose from 'mongoose';

// Producción de Pellets
export interface IProduction extends mongoose.Document {
  date: Date;
  lotNumber: string; // Número de lote
  pelletType: string; // Tipo de pellet (ej: "Pellet Alfalfa")
  totalQuantity: number; // Cantidad total producida (kg)
  efficiency: number; // Rendimiento (%)
  operator?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Consumo de Insumos en Producción
export interface ISupplyConsumption extends mongoose.Document {
  production: mongoose.Types.ObjectId;
  supplyName: string; // Nombre del insumo consumido
  quantity: number; // Cantidad consumida
  unit: string; // Unidad de medida
  date: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Generación de Stock de Pellets
export interface IPelletGeneration extends mongoose.Document {
  production: mongoose.Types.ObjectId;
  presentation: string; // 'Bolsa 25kg', 'Big Bag', 'Granel'
  quantity: number; // Cantidad generada (kg)
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
  lotNumber: {
    type: String,
    required: true,
    trim: true,
  },
  pelletType: {
    type: String,
    required: true,
    trim: true,
  },
  totalQuantity: {
    type: Number,
    required: true,
    min: 0.01,
  },
  efficiency: {
    type: Number,
    required: true,
    min: 0,
    max: 1, // Cambiado de 100 a 1 para usar decimales
  },
  operator: {
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

const supplyConsumptionSchema = new mongoose.Schema<ISupplyConsumption>({
  production: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Production',
    required: true,
  },
  supplyName: {
    type: String,
    required: true,
    trim: true,
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

// Forzar la recreación de los modelos eliminando el caché
if (mongoose.models.Production) {
  delete mongoose.models.Production;
}
if (mongoose.models.SupplyConsumption) {
  delete mongoose.models.SupplyConsumption;
}
if (mongoose.models.PelletGeneration) {
  delete mongoose.models.PelletGeneration;
}

export const Production = mongoose.model<IProduction>('Production', productionSchema);
export const SupplyConsumption = mongoose.model<ISupplyConsumption>('SupplyConsumption', supplyConsumptionSchema);
export const PelletGeneration = mongoose.model<IPelletGeneration>('PelletGeneration', pelletGenerationSchema); 