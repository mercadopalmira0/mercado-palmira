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
 * Redondeo monetario seguro a 2 decimales.
 */
export const round2 = (n) => Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100

/**
 * Formatea una fecha ISO/YYYY-MM-DD como DD/MM/YYYY.
 */
export function formatFechaDMY(fechaStr) {
  if (!fechaStr) return ''
  const [y, m, d] = String(fechaStr).split('T')[0].split('-')
  if (y && m && d) return `${d}/${m}/${y}`
  return fechaStr
}

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

/**
 * Formatea los puestos y nombres de un grupo de cobro para tarjetas, cobros y recibos.
 */
export function formatResumenGrupo(unidadLider, miembros = [], nombreLiderOverride = null) {
  if (!unidadLider) {
    return {
      puestosLabel: '',
      sociosLabel: nombreLiderOverride || 'Sin socio',
      esGrupo: false,
      miembrosCount: 1,
    }
  }

  const liderNombre = nombreLiderOverride || unidadLider.socios?.nombre || 'Sin socio'
  const hijos = Array.isArray(miembros) ? miembros : []

  if (hijos.length === 0) {
    return {
      puestosLabel: unidadLider.numero_identificador || '',
      sociosLabel: unidadLider.nombres_titulares
        ? `${liderNombre} (${unidadLider.nombres_titulares})`
        : liderNombre,
      esGrupo: (unidadLider.cantidad_puestos || 1) > 1,
      miembrosCount: unidadLider.cantidad_puestos || 1,
    }
  }

  const puestosRaw = [unidadLider.numero_identificador, ...hijos.map((h) => h.numero_identificador)]
    .map((p) => (p ? String(p).trim() : ''))
    .filter(Boolean)
  const puestosNums = puestosRaw.map((p) => p.replace(/^puesto\s+/i, '').trim())
  const puestosLabel = `Puestos ${puestosNums.join(', ')}`

  const otrosSocios = []
  hijos.forEach((h) => {
    const n = h.socios?.nombre
    if (n && n !== liderNombre && !otrosSocios.includes(n)) {
      otrosSocios.push(n)
    }
  })

  const sociosLabel =
    otrosSocios.length > 0 ? `${liderNombre} (+ ${otrosSocios.join(', ')})` : liderNombre

  return {
    puestosLabel,
    sociosLabel,
    esGrupo: true,
    miembrosCount: 1 + hijos.length,
  }
}
