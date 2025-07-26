const mongoose = require('mongoose');

// Conectar a MongoDB
mongoose.connect('mongodb+srv://bautistabadino9:0WSdPAR5lnDk9C3Z@cluster0.q5wdqwv.mongodb.net/pelletizadora?retryWrites=true&w=majority&appName=Cluster0');

// Esquemas simplificados para el script
const clientSchema = new mongoose.Schema({
  name: String,
  company: String,
  cuit: String,
  contact: String,
  email: String,
  address: String,
  phone: String,
  creditBalance: { type: Number, default: 0 },
}, { timestamps: true });

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

const stockSchema = new mongoose.Schema({
  presentation: String,
  quantity: Number,
}, { timestamps: true });

const Client = mongoose.model('Client', clientSchema);
const Sale = mongoose.model('Sale', saleSchema);
const Payment = mongoose.model('Payment', paymentSchema);
const Stock = mongoose.model('Stock', stockSchema);

async function showTestSaleSummary() {
  try {
    console.log('📊 RESUMEN DE VENTA DE TESTING');
    console.log('================================\n');
    
    // Obtener la venta más reciente
    const recentSale = await Sale.findOne().sort({ createdAt: -1 }).populate('client');
    
    if (!recentSale) {
      console.log('❌ No se encontraron ventas.');
      return;
    }
    
    // Información del cliente
    console.log('👤 INFORMACIÓN DEL CLIENTE:');
    console.log(`   Nombre: ${recentSale.client.name}`);
    console.log(`   Empresa: ${recentSale.client.company}`);
    console.log(`   CUIT: ${recentSale.client.cuit}`);
    console.log(`   Contacto: ${recentSale.client.contact}`);
    console.log(`   Email: ${recentSale.client.email || 'No especificado'}`);
    console.log(`   Teléfono: ${recentSale.client.phone || 'No especificado'}`);
    console.log(`   Saldo a favor: $${recentSale.client.creditBalance || 0}`);
    console.log('');
    
    // Información de la venta
    console.log('🛒 INFORMACIÓN DE LA VENTA:');
    console.log(`   ID de venta: ${recentSale._id}`);
    console.log(`   Fecha: ${recentSale.createdAt.toLocaleString('es-AR')}`);
    console.log(`   Presentación: ${recentSale.presentation}`);
    console.log(`   Cantidad: ${recentSale.quantity} kg`);
    console.log(`   Precio unitario: $${recentSale.unitPrice}/kg`);
    console.log(`   Total: $${recentSale.totalAmount}`);
    console.log(`   Lote: ${recentSale.lot}`);
    console.log(`   Estado: ${recentSale.status}`);
    console.log(`   Notas: ${recentSale.notes || 'Sin notas'}`);
    console.log('');
    
    // Información de pagos
    const payments = await Payment.find({ sale: recentSale._id }).sort({ date: 1 });
    const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const remainingAmount = recentSale.totalAmount - totalPaid;
    
    console.log('💰 INFORMACIÓN DE PAGOS:');
    console.log(`   Total facturado: $${recentSale.totalAmount}`);
    console.log(`   Total pagado: $${totalPaid}`);
    console.log(`   Pendiente: $${remainingAmount}`);
    console.log(`   Estado: ${recentSale.status}`);
    console.log('');
    
    if (payments.length > 0) {
      console.log('📋 DETALLE DE PAGOS:');
      payments.forEach((payment, index) => {
        console.log(`   ${index + 1}. $${payment.amount} - ${payment.method} - ${payment.date.toLocaleDateString('es-AR')}`);
        console.log(`      Referencia: ${payment.reference || 'Sin referencia'}`);
        console.log(`      Notas: ${payment.notes || 'Sin notas'}`);
      });
      console.log('');
    }
    
    // Información de stock
    const stock = await Stock.findOne({ presentation: recentSale.presentation });
    console.log('📦 INFORMACIÓN DE STOCK:');
    console.log(`   Presentación: ${recentSale.presentation}`);
    console.log(`   Stock actual: ${stock ? stock.quantity + ' kg' : '0 kg'}`);
    console.log(`   Cantidad vendida: ${recentSale.quantity} kg`);
    console.log('');
    
    // Resumen final
    console.log('📈 RESUMEN FINAL:');
    console.log(`   ✅ Venta creada exitosamente`);
    console.log(`   ✅ Stock actualizado (${recentSale.quantity} kg descontados)`);
    console.log(`   ✅ ${payments.length} pago(s) registrado(s)`);
    console.log(`   ✅ Estado de venta: ${recentSale.status}`);
    
    if (remainingAmount > 0) {
      console.log(`   ⚠️  Monto pendiente: $${remainingAmount}`);
    } else {
      console.log(`   ✅ Venta completamente pagada`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
    console.log('\n🔌 Conexión cerrada');
  }
}

// Ejecutar el script
showTestSaleSummary(); 