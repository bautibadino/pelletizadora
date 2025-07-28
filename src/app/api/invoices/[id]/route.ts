import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Invoice } from '@/models/Invoice';
import { SupplierPayment } from '@/models/Supplier';
import { SupplyStock, SupplyMovement } from '@/models/Stock';
import { Production } from '@/models/Production';
import { Sale } from '@/models/Sale';

// DELETE - Eliminar factura con verificación de dependencias
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const invoiceId = params.id;
    
    // 1. Verificar que la factura existe
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return NextResponse.json(
        { error: 'Factura no encontrada' },
        { status: 404 }
      );
    }

    // 2. Verificar dependencias críticas
    const dependencyChecks = await checkDependencies(invoiceId, invoice.invoiceNumber);
    
    if (dependencyChecks.hasCriticalDependencies) {
      return NextResponse.json({
        error: 'No se puede eliminar la factura',
        reason: 'Tiene dependencias críticas',
        details: dependencyChecks.details
      }, { status: 400 });
    }

    // 3. Si hay dependencias no críticas, mostrar advertencia
    if (dependencyChecks.hasWarnings) {
      return NextResponse.json({
        warning: 'La factura tiene dependencias que serán eliminadas',
        details: dependencyChecks.details,
        proceed: true
      }, { status: 200 });
    }

    // 4. Proceder con la eliminación
    await deleteInvoiceAndDependencies(invoiceId, invoice.invoiceNumber);

    return NextResponse.json({
      message: 'Factura eliminada exitosamente',
      deletedInvoice: invoice.invoiceNumber
    });

  } catch (error) {
    console.error('Delete invoice error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// Función para verificar dependencias
async function checkDependencies(invoiceId: string, invoiceNumber: string) {
  const details = {
    payments: 0,
    supplyMovements: 0,
    production: 0,
    sales: 0
  };

  let hasCriticalDependencies = false;
  const hasWarnings = false;

  // Verificar pagos
  const payments = await SupplierPayment.find({ invoice: invoiceId });
  details.payments = payments.length;

  // Verificar movimientos de insumos
  const supplyMovements = await SupplyMovement.find({ 
    invoiceNumber: invoiceNumber 
  });
  details.supplyMovements = supplyMovements.length;

  // Verificar si los insumos fueron usados en producción
  const supplyNames = supplyMovements
    .filter(m => m.type === 'entrada')
    .map(m => m.supplyName);

  let productionCount = 0;
  let salesCount = 0;

  if (supplyNames.length > 0) {
    // Buscar producción que usó estos insumos
    const production = await Production.find({
      'materials.supplyName': { $in: supplyNames }
    });
    productionCount = production.length;
    details.production = productionCount;

    // Si hay producción, verificar si se vendió
    if (productionCount > 0) {
      const productionIds = production.map(p => p._id);
      const sales = await Sale.find({
        'production': { $in: productionIds }
      });
      salesCount = sales.length;
      details.sales = salesCount;

      // Si hay ventas, es una dependencia crítica
      if (salesCount > 0) {
        hasCriticalDependencies = true;
      }
    }
  }

  return {
    hasCriticalDependencies,
    hasWarnings: details.payments > 0 || details.supplyMovements > 0 || details.production > 0,
    details
  };
}

// Función para eliminar factura y dependencias
async function deleteInvoiceAndDependencies(invoiceId: string, invoiceNumber: string) {
  // 1. Eliminar pagos asociados
  await SupplierPayment.deleteMany({ invoice: invoiceId });

  // 2. Eliminar movimientos de insumos
  const supplyMovements = await SupplyMovement.find({ 
    invoiceNumber: invoiceNumber 
  });

  // 3. Revertir stock de insumos
  for (const movement of supplyMovements) {
    if (movement.type === 'entrada') {
      const supplyStock = await SupplyStock.findOne({ 
        name: movement.supplyName 
      });
      
      if (supplyStock) {
        supplyStock.quantity -= movement.quantity;
        
        if (supplyStock.quantity <= 0) {
          await SupplyStock.findByIdAndDelete(supplyStock._id);
        } else {
          await supplyStock.save();
        }
      }
    }
  }

  // 4. Eliminar movimientos de insumos
  await SupplyMovement.deleteMany({ 
    invoiceNumber: invoiceNumber 
  });

  // 5. Eliminar la factura
  await Invoice.findByIdAndDelete(invoiceId);
} 