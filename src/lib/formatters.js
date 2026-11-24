export const MESES = [
  '',
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

/**
 * Devuelve la fecha local en formato YYYY-MM-DD (sin desfase UTC).
 */
export function getLocalDateStr(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Obtiene el nombre del socio respetando el historial congelado al momento de un traspaso.
 */
export function getNombreSocioCobro(cobro) {
  return cobro?.nombre_socio_historico || cobro?.unidades_cobro?.socios?.nombre || 'Sin socio'
}

/**
 * Obtiene la lista de campañas de perdonazo vigentes para una fecha dada (YYYY-MM-DD).
 */
export function getPerdonazoVigente(campanias = [], fechaStr = getLocalDateStr()) {
  const vigentes = (campanias || []).filter(
    (c) => c.activo && c.fecha_inicio <= fechaStr && c.fecha_fin >= fechaStr
  )
  if (vigentes.length === 0) return null
  return vigentes.sort(
    (a, b) => (parseFloat(b.porcentaje_descuento) || 0) - (parseFloat(a.porcentaje_descuento) || 0)
  )[0]
}
