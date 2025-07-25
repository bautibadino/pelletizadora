import mongoose from 'mongoose';

export interface IClient extends mongoose.Document {
  name: string;
  company: string;
  cuit: string;
  contact: string;
  email?: string;
  address?: string;
  phone?: string;
  creditBalance: number; // Saldo a favor del cliente
  createdAt: Date;
  updatedAt: Date;
}

const clientSchema = new mongoose.Schema<IClient>({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  company: {
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
  contact: {
    type: String,
    required: true,
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
  creditBalance: {
    type: Number,
    default: 0,
    min: 0,
  },
}, {
  timestamps: true,
});

export default mongoose.models.Client || mongoose.model<IClient>('Client', clientSchema); 