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
 * Devuelve la fecha de hoy en Bolivia (America/La_Paz) en formato YYYY-MM-DD.
 */
export function getBoliviaDateStr(date = new Date()) {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/La_Paz',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date)
  } catch {
    return getLocalDateStr(date)
  }
}

/**
 * Convierte YYYY-MM-DD a ISO con mediodía de Bolivia (-04:00) para evitar desfases UTC.
 */
export function toBoliviaNoonISO(fechaYMD) {
  const clean = String(fechaYMD || '').split('T')[0]
  if (!/^\d{4}-\d{2}-\d{2}$/.test(clean)) return new Date().toISOString()
  return `${clean}T12:00:00-04:00`
}

/**
 * Formatea una fecha/hora de pago en zona horaria de Bolivia (America/La_Paz).
 */
export function formatFechaHoraBolivia(fechaVal) {
  if (!fechaVal) return ''
  const str = String(fechaVal)
  const dateObj = /^\d{4}-\d{2}-\d{2}$/.test(str)
    ? new Date(`${str}T12:00:00-04:00`)
    : new Date(str)
  if (Number.isNaN(dateObj.getTime())) return str
  try {
    return dateObj.toLocaleString('es-BO', {
      timeZone: 'America/La_Paz',
      dateStyle: 'short',
      timeStyle: 'short',
    })
  } catch {
    return dateObj.toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' })
  }
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
 * Extrae de forma segura el nombre de socio de una unidad de cobro o objeto relacionado.
 */
function resolveUnidadSocioNombre(unidad) {
  if (!unidad) return ''
  const rel = Array.isArray(unidad.socios) ? unidad.socios[0] : unidad.socios
  return (
    rel?.nombre ||
    unidad.socio?.nombre ||
    unidad.socio_nombre ||
    unidad.nombre_socio_historico ||
    ''
  )
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
      integrantesNombres: nombreLiderOverride ? [nombreLiderOverride] : [],
      integrantesPuestos: [],
    }
  }

  const liderNombre =
    nombreLiderOverride || resolveUnidadSocioNombre(unidadLider) || 'Sin socio'
  const hijos = Array.isArray(miembros) ? miembros : []

  if (hijos.length === 0) {
    return {
      puestosLabel: unidadLider.numero_identificador || '',
      sociosLabel: unidadLider.nombres_titulares
        ? `${liderNombre} (${unidadLider.nombres_titulares})`
        : liderNombre,
      esGrupo: (unidadLider.cantidad_puestos || 1) > 1,
      miembrosCount: unidadLider.cantidad_puestos || 1,
      integrantesNombres: [liderNombre].filter((n) => n && n !== 'Sin socio'),
      integrantesPuestos: unidadLider.numero_identificador ? [unidadLider.numero_identificador] : [],
    }
  }

  const puestosRaw = [unidadLider.numero_identificador, ...hijos.map((h) => h.numero_identificador)]
    .map((p) => (p ? String(p).trim() : ''))
    .filter(Boolean)
  const puestosNums = puestosRaw.map((p) => p.replace(/^puesto\s+/i, '').trim())
  const puestosLabel = `Puestos ${puestosNums.join(', ')}`

  const otrosSocios = []
  hijos.forEach((h) => {
    const n = resolveUnidadSocioNombre(h)
    if (n && n !== liderNombre && !otrosSocios.includes(n)) {
      otrosSocios.push(n)
    }
  })

  const sociosLabel =
    otrosSocios.length > 0 ? `${liderNombre} (+ ${otrosSocios.join(', ')})` : liderNombre

  const integrantesNombres = [liderNombre, ...otrosSocios].filter((n) => n && n !== 'Sin socio')

  return {
    puestosLabel,
    sociosLabel,
    esGrupo: true,
    miembrosCount: 1 + hijos.length,
    integrantesNombres,
    integrantesPuestos: puestosRaw,
  }
}
