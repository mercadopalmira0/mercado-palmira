import { supabase } from './supabase'

/**
 * Registra un evento inmutable en bitacora_auditoria sin interrumpir el flujo principal si falla RLS/red.
 */
export async function registrarAuditoria({ usuarioId = null, accion, detalleJson = {}, esSospechoso = false }) {
  try {
    const ua = typeof window !== 'undefined' ? window.navigator.userAgent : 'Desconocido'
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
