import mongoose from 'mongoose';

// Conectar a MongoDB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pelletizadora');
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

async function cleanInvoices() {
  try {
    await connectDB();
    
    // Eliminar la colección de facturas si existe
    const collections = await mongoose.connection.db.listCollections().toArray();
    const invoiceCollection = collections.find(col => col.name === 'invoices');
    
    if (invoiceCollection) {
      console.log('Eliminando colección de facturas existente...');
      await mongoose.connection.db.dropCollection('invoices');
      console.log('Colección de facturas eliminada');
    } else {
      console.log('No se encontró colección de facturas existente');
    }
    
    // Eliminar el modelo de mongoose si existe
    if (mongoose.models.Invoice) {
      delete mongoose.models.Invoice;
      console.log('Modelo Invoice eliminado de mongoose');
    }
    
    console.log('Limpieza completada. El modelo se recreará automáticamente.');
    
  } catch (error) {
    console.error('Error durante la limpieza:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Desconectado de MongoDB');
  }
}

cleanInvoices(); 