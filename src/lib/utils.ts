/**
 * Utilidades para manejo de números y redondeo
 */

/**
 * Redondea un número a 2 decimales (para montos monetarios)
 * @param value - El valor a redondear
 * @returns El valor redondeado a 2 decimales
 */
export function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Redondea un número a 1 decimal (para cantidades)
 * @param value - El valor a redondear
 * @returns El valor redondeado a 1 decimal
 */
export function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Formatea un número como moneda con redondeo a 2 decimales
 * @param value - El valor a formatear
 * @returns El valor formateado como string
 */
export function formatCurrency(value: number): string {
  return roundToTwoDecimals(value).toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/**
 * Calcula el IVA (21%) con redondeo correcto
 * @param subtotal - El subtotal sin IVA
 * @returns El IVA calculado y redondeado
 */
export function calculateTax(subtotal: number): number {
  return roundToTwoDecimals(subtotal * 0.21);
}

/**
 * Calcula el subtotal sin IVA a partir del total con IVA
 * @param totalWithTax - El total que incluye IVA
 * @returns El subtotal sin IVA redondeado
 */
export function calculateSubtotalFromTotal(totalWithTax: number): number {
  return roundToTwoDecimals(totalWithTax / 1.21);
}

/**
 * Calcula el total con IVA a partir del subtotal
 * @param subtotal - El subtotal sin IVA
 * @returns El total con IVA redondeado
 */
export function calculateTotalWithTax(subtotal: number): number {
  return roundToTwoDecimals(subtotal * 1.21);
}

/**
 * Valida que un número sea válido y positivo
 * @param value - El valor a validar
 * @returns true si es válido, false en caso contrario
 */
export function isValidPositiveNumber(value: number): boolean {
  return !isNaN(value) && isFinite(value) && value >= 0;
} 