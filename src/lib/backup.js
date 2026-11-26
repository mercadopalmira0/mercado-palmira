import { supabase } from './supabase'
import { registrarAuditoria } from './auditoria'
import { getLocalDateStr } from './formatters'

const BACKUP_TABLES = [
  'configuracion_tarifas',
  'saldos_iniciales',
  'ciclos_hacienda',
  'socios',
  'unidades_cobro',
  'periodos_mensuales',
  'cobros_servicios',
  'pagos_servicios',
  'afiliaciones',
  'pagos_afiliacion',
  'egresos',
  'movimientos_internos',
  'deudores_ciclos',
  'pagos_deudores_ciclos',
  'campañas_perdonazo',
  'pagos_guardia',
  'aportantes_externos',
  'cobros_externos',
  'inventario_mercado',
  'traspasos_puestos',
  'cobros_extras_campanas',
  'cobros_extras_cuotas',
  'pagos_cobros_extras',
  'egresos_cobros_extras',
  'perfiles_usuarios',
  'bitacora_auditoria',
]

/**
 * Descarga un respaldo completo en JSON de todas las tablas principales activas
 * desde Supabase y registra la acción en bitacora_auditoria.
 */
export async function descargarBackupCompleto({ usuarioId }) {
  const results = await Promise.all(
    BACKUP_TABLES.map(async (table) => {
      const { data, error } = await supabase.from(table).select('*')
      return {
        table,
        data: error ? [] : data || [],
        error: error ? error.message : null,
      }
    })
  )

  const tablas = {}
  const conteos = {}
  const errores = {}

  results.forEach(({ table, data, error }) => {
    tablas[table] = data
    conteos[table] = data.length
    if (error) errores[table] = error
  })

  const fechaLocal = getLocalDateStr()
  const fileName = `Backup_Manual_Hacienda_${fechaLocal}.json`

  const backupPayload = {
    sistema: 'Secretaría de Hacienda - Mercado Palmira',
    version_backup: 1,
    generado_en: new Date().toISOString(),
    fecha_local: fechaLocal,
    generado_por_usuario_id: usuarioId || null,
    conteos,
    errores: Object.keys(errores).length > 0 ? errores : undefined,
    tablas,
  }

  const blob = new Blob([JSON.stringify(backupPayload, null, 2)], {
    type: 'application/json;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  const totalRegistros = Object.values(conteos).reduce((sum, n) => sum + n, 0)

  await registrarAuditoria({
    usuarioId,
    accion: 'DESCARGA_BACKUP_MANUAL',
    detalleJson: {
      descripcion: `Descarga manual de respaldo completo (${fileName}, ${totalRegistros} registros en ${BACKUP_TABLES.length} tablas)`,
      archivo: fileName,
      total_registros: totalRegistros,
      tablas_con_error: Object.keys(errores),
    },
  })

  return { fileName, totalRegistros, conteos, errores }
}
