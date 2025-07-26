const mongoose = require('mongoose');
require('dotenv').config();

// Conectar a MongoDB
mongoose.connect('mongodb+srv://bautistabadino9:0WSdPAR5lnDk9C3Z@cluster0.q5wdqwv.mongodb.net/pelletizadora?retryWrites=true&w=majority&appName=Cluster0');

// Esquema de factura (simplificado para el script)
const invoiceSchema = new mongoose.Schema({
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true,
  },
  invoiceNumber: String,
  date: Date,
  dueDate: Date,
  concept: String,
  lines: mongoose.Schema.Types.Mixed, // Usar Mixed para evitar problemas de casting
  subtotal: Number,
  tax: Number,
  total: Number,
  status: String,
  payments: mongoose.Schema.Types.Mixed, // Usar Mixed para evitar problemas de casting
  notes: String,
}, {
  timestamps: true,
});

const Invoice = mongoose.model('Invoice', invoiceSchema);

async function fixInvoiceTax() {
  try {
    console.log('🔍 Buscando facturas con IVA mal calculado...');
    
    // Obtener todas las facturas
    const invoices = await Invoice.find({});
    console.log(`📋 Encontradas ${invoices.length} facturas`);
    
    let fixedCount = 0;
    let totalFixed = 0;
    
    for (const invoice of invoices) {
      const oldTax = invoice.tax;
      const oldTotal = invoice.total;
      
      // Calcular el IVA correcto (21% del subtotal)
      const correctTax = Math.round(invoice.subtotal * 0.21 * 100) / 100;
      const correctTotal = Math.round((invoice.subtotal + correctTax) * 100) / 100;
      
      // Verificar si el IVA está mal calculado (diferencia mayor a 1 peso)
      if (Math.abs(oldTax - correctTax) > 1) {
        console.log(`\n🔧 Corrigiendo factura ${invoice.invoiceNumber}:`);
        console.log(`   Subtotal: $${invoice.subtotal.toLocaleString()}`);
        console.log(`   IVA anterior: $${oldTax.toLocaleString()}`);
        console.log(`   IVA correcto: $${correctTax.toLocaleString()}`);
        console.log(`   Total anterior: $${oldTotal.toLocaleString()}`);
        console.log(`   Total correcto: $${correctTotal.toLocaleString()}`);
        
        // Actualizar la factura
        invoice.tax = correctTax;
        invoice.total = correctTotal;
        await invoice.save();
        
        fixedCount++;
        totalFixed += (correctTotal - oldTotal);
        
        console.log(`   ✅ Factura corregida`);
      }
    }
    
    console.log(`\n🎉 Proceso completado:`);
    console.log(`   Facturas corregidas: ${fixedCount}`);
    console.log(`   Diferencia total: $${totalFixed.toLocaleString()}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Conexión cerrada');
  }
}

// Ejecutar el script
fixInvoiceTax(); 