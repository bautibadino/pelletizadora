const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Configurar la conexión de MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pelletizadora';

async function createTestInvoice() {
  try {
    // Conectar a MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Buscar un proveedor existente
    const suppliersCollection = mongoose.connection.collection('suppliers');
    const supplier = await suppliersCollection.findOne();
    if (!supplier) {
      console.log('❌ No hay proveedores en la base de datos');
      return;
    }

    console.log(`📋 Usando proveedor: ${supplier.businessName}`);

    // Crear factura de prueba
    const invoicesCollection = mongoose.connection.collection('invoices');
    const testInvoice = {
      supplierId: supplier._id,
      invoiceNumber: 'TEST-001',
      date: new Date('2024-01-15'),
      dueDate: new Date('2024-02-15'),
      concept: 'Factura de prueba para testing',
      lines: [
        {
          description: 'BENTONITA',
          type: 'insumo',
          quantity: 100,
          unitPrice: 50,
          total: 5000
        },
        {
          description: 'CARBONATO DE CALCIO',
          type: 'insumo',
          quantity: 200,
          unitPrice: 30,
          total: 6000
        }
      ],
      subtotal: 11000,
      tax: 0,
      total: 11000,
      status: 'pendiente',
      payments: [],
      notes: 'Factura de prueba para testing de eliminación',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await invoicesCollection.insertOne(testInvoice);
    console.log(`✅ Factura creada: ${testInvoice.invoiceNumber}`);

    // Procesar líneas y agregar al stock de insumos
    const supplyStocksCollection = mongoose.connection.collection('supplystocks');
    const supplyMovementsCollection = mongoose.connection.collection('supplymovements');

    for (const line of testInvoice.lines) {
      if (line.type === 'insumo') {
        let supplyName = line.description;
        let quantity = Number(line.quantity);
        let unit = 'kg';
        
        // Buscar stock existente o crear nuevo
        let supplyStock = await supplyStocksCollection.findOne({ name: supplyName });
        
        if (supplyStock) {
          await supplyStocksCollection.updateOne(
            { _id: supplyStock._id },
            { $inc: { quantity: quantity } }
          );
        } else {
          await supplyStocksCollection.insertOne({
            name: supplyName,
            quantity: quantity,
            unit: unit,
            supplier: supplier._id,
            invoiceNumber: testInvoice.invoiceNumber,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
        
        // Crear movimiento de entrada
        await supplyMovementsCollection.insertOne({
          supplyName: supplyName,
          type: 'entrada',
          quantity: quantity,
          unit: unit,
          date: new Date(testInvoice.date),
          supplier: supplier._id,
          invoiceNumber: testInvoice.invoiceNumber,
          reference: `Factura ${testInvoice.invoiceNumber}`,
          notes: `Entrada por factura ${testInvoice.invoiceNumber} - ${line.description}`,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }

    console.log('✅ Stock y movimientos creados');
    console.log(`📄 Factura ID: ${result.insertedId}`);
    console.log(`📄 Factura Número: ${testInvoice.invoiceNumber}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Conexión cerrada');
  }
}

createTestInvoice(); 