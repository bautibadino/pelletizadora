const mongoose = require('mongoose');

// Conectar a MongoDB
mongoose.connect('mongodb+srv://bautistabadino9:0WSdPAR5lnDk9C3Z@cluster0.q5wdqwv.mongodb.net/pelletizadora?retryWrites=true&w=majority&appName=Cluster0');

// Esquemas simplificados para el script
const saleSchema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
  presentation: String,
  quantity: Number,
  unitPrice: Number,
  totalAmount: Number,
  lot: String,
  notes: String,
  status: { type: String, enum: ['pending', 'paid', 'partial'], default: 'pending' },
}, { timestamps: true });

const paymentSchema = new mongoose.Schema({
  sale: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', required: true },
  amount: { type: Number, required: true, min: 0 },
  date: { type: Date, required: true, default: Date.now },
  method: { 
    type: String, 
    required: true, 
    enum: ['efectivo', 'transferencia', 'cheque', 'tarjeta', 'saldo_a_favor'] 
  },
  reference: String,
  notes: String,
  checkId: { type: mongoose.Schema.Types.ObjectId, ref: 'Check' },
}, { timestamps: true });

const Sale = mongoose.model('Sale', saleSchema);
const Payment = mongoose.model('Payment', paymentSchema);

async function createTestPayment() {
  try {
    console.log('🔍 Buscando ventas recientes...');
    
    // Obtener la venta más reciente
    const recentSale = await Sale.findOne().sort({ createdAt: -1 });
    
    if (!recentSale) {
      console.log('❌ No se encontraron ventas. Crear una venta primero.');
      return;
    }
    
    console.log(`📋 Venta encontrada:`);
    console.log(`   ID: ${recentSale._id}`);
    console.log(`   Total: $${recentSale.totalAmount}`);
    console.log(`   Estado: ${recentSale.status}`);
    
    // Verificar si ya tiene pagos
    const existingPayments = await Payment.find({ sale: recentSale._id });
    const totalPaid = existingPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const remainingAmount = recentSale.totalAmount - totalPaid;
    
    console.log(`   Ya pagado: $${totalPaid}`);
    console.log(`   Pendiente: $${remainingAmount}`);
    
    if (remainingAmount <= 0) {
      console.log('✅ La venta ya está completamente pagada.');
      return;
    }
    
    // Crear pago de testing
    const paymentAmount = Math.min(remainingAmount, 50000); // Pagar $50,000 o el monto pendiente
    const paymentMethod = 'efectivo';
    
    const payment = new Payment({
      sale: recentSale._id,
      amount: paymentAmount,
      date: new Date(),
      method: paymentMethod,
      reference: 'PAGO-TEST-001',
      notes: 'Pago de prueba creado por script de testing',
    });
    
    await payment.save();
    
    // Actualizar estado de la venta
    const newTotalPaid = totalPaid + paymentAmount;
    if (newTotalPaid >= recentSale.totalAmount) {
      recentSale.status = 'paid';
    } else {
      recentSale.status = 'partial';
    }
    await recentSale.save();
    
    console.log('\n✅ Pago de prueba creado exitosamente!');
    console.log(`   ID de pago: ${payment._id}`);
    console.log(`   Monto: $${payment.amount}`);
    console.log(`   Método: ${payment.method}`);
    console.log(`   Referencia: ${payment.reference}`);
    console.log(`   Estado de venta actualizado: ${recentSale.status}`);
    
    // Mostrar resumen final
    const finalPayments = await Payment.find({ sale: recentSale._id });
    const finalTotalPaid = finalPayments.reduce((sum, p) => sum + p.amount, 0);
    console.log(`   Total pagado: $${finalTotalPaid}/${recentSale.totalAmount}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
    console.log('\n🔌 Conexión cerrada');
  }
}

// Ejecutar el script
createTestPayment(); 