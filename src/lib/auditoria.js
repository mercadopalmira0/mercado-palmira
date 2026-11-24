import { supabase } from './supabase'

function getUserAgent() {
  return typeof window !== 'undefined' ? window.navigator.userAgent : 'Desconocido'
}

/**
 * Registra un evento general en bitacora_auditoria sin interrumpir el flujo principal.
 */
export async function registrarAuditoria({ usuarioId = null, accion, detalleJson = {}, esSospechoso = false }) {
  try {
    const ua = getUserAgent()
    const { error } = await supabase.from('bitacora_auditoria').insert([
      {
        usuario_id: usuarioId || null,
        accion,
        detalle_json: detalleJson,
        device_id: ua,
        user_agent: ua,
        es_sospechoso: esSospechoso,
      },
    ])
    if (error) {
      console.warn(`[Auditoría] No se pudo registrar ${accion}:`, error.message)
    }
  } catch (err) {
    console.warn(`[Auditoría] Excepción al registrar ${accion}:`, err)
  }
}

/**
 * Calcula los campos modificados entre dos snapshots planos/simples.
 */
export function calcularDiffCampos(anterior = {}, nuevo = {}) {
  const cambios = []
  const keys = new Set([...Object.keys(anterior || {}), ...Object.keys(nuevo || {})])
  keys.forEach((key) => {
    if (key === 'updated_at' || key === 'created_at') return
    const vAnt = anterior?.[key]
    const vNew = nuevo?.[key]
    if (JSON.stringify(vAnt ?? null) !== JSON.stringify(vNew ?? null)) {
      cambios.push({
        campo: key,
        valor_anterior: vAnt ?? null,
        valor_nuevo: vNew ?? null,
      })
    }
  })
  return cambios
}

/**
 * Registra OBLIGATORIAMENTE una EDICIÓN en bitacora_auditoria antes de ejecutar el update en Supabase.
 * Lanza error si el motivo tiene menos de 5 caracteres o si falla el registro en bitácora.
 */
export async function registrarEdicionAuditoria({
  usuarioId = null,
  modulo,
  tabla,
  registroId,
  motivo,
  resumen,
  datosAnteriores,
  datosNuevos,
}) {
  const motivoLimpio = (motivo || '').trim()
  if (motivoLimpio.length < 5) {
    throw new Error('El motivo de la edición es obligatorio (mínimo 5 caracteres).')
  }

  const ua = getUserAgent()
  const cambios = calcularDiffCampos(datosAnteriores, datosNuevos)

  const { error } = await supabase.from('bitacora_auditoria').insert([
    {
      usuario_id: usuarioId || null,
      accion: 'EDICION',
      detalle_json: {
        descripcion: resumen || `Edición en ${modulo} (${tabla})`,
        modulo,
        tabla,
        registro_id: registroId,
        motivo: motivoLimpio,
        cambios,
        datos_anteriores: datosAnteriores,
        datos_nuevos: datosNuevos,
      },
      device_id: ua,
      user_agent: ua,
      es_sospechoso: false,
    },
  ])

  if (error) {
    throw new Error('No se pudo registrar la auditoría de edición (operación abortada): ' + error.message)
  }
}

/**
 * Registra OBLIGATORIAMENTE una ELIMINACIÓN en bitacora_auditoria antes de ejecutar el delete en Supabase.
 * Lanza error si el motivo tiene menos de 5 caracteres o si falla el registro en bitácora.
 */
export async function registrarEliminacionAuditoria({
  usuarioId = null,
  modulo,
  tabla,
  registroId,
  motivo,
  resumen,
  datosAnteriores,
}) {
  const motivoLimpio = (motivo || '').trim()
  if (motivoLimpio.length < 5) {
    throw new Error('El motivo de la eliminación es obligatorio (mínimo 5 caracteres).')
  }

  const ua = getUserAgent()

  const { error } = await supabase.from('bitacora_auditoria').insert([
    {
      usuario_id: usuarioId || null,
      accion: 'ELIMINACION',
      detalle_json: {
        descripcion: resumen || `Eliminación en ${modulo} (${tabla})`,
        modulo,
        tabla,
        registro_id: registroId,
        motivo: motivoLimpio,
        datos_anteriores: datosAnteriores,
      },
      device_id: ua,
      user_agent: ua,
      es_sospechoso: false,
    },
  ])

  if (error) {
    throw new Error('No se pudo registrar la auditoría de eliminación (operación abortada): ' + error.message)
  }
}
