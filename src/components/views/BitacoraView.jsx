import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { ShieldAlert, AlertTriangle, Fingerprint, Lock, RefreshCw, Clock, CheckCircle2, FileText } from 'lucide-react'

export default function BitacoraView({ role }) {
  const { isAdmin } = useAuth()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('bitacora_auditoria')
        .select(`
          *,
          perfiles_usuarios (nombre, cargo, rol)
        `)
        .order('fecha_hora', { ascending: false })
        .limit(50)

      if (error) throw error
      setLogs(data || [])
    } catch (err) {
      console.warn('Bitacora query:', err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAdmin || role === 'admin') {
      fetchLogs()
    }
  }, [isAdmin, role])

  if (!isAdmin && role !== 'admin') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-800">
        <div className="flex items-center gap-3">
          <Lock className="w-6 h-6 text-red-600" />
          <h2 className="text-lg font-bold">Acceso Restringido por Política RLS</h2>
        </div>
        <p className="text-xs text-red-700 mt-2">
          La bitácora de auditoría inmutable es visible únicamente para el Secretario de Hacienda (rol Admin).
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3 text-red-600 mb-1">
            <ShieldAlert className="w-6 h-6" />
            <h2 className="text-xl font-bold text-slate-900">Bitácora de Auditoría (Exclusivo Admin)</h2>
          </div>
          <p className="text-xs text-slate-500">
            Registro inmutable protegido por Row Level Security (RLS). Trazabilidad total de cambios en tarifas, descargas y accesos.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors self-start sm:self-auto flex items-center gap-1.5 text-xs font-semibold"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-red-600' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* Tarjetas de Métricas de Seguridad */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
          <span className="flex items-center text-xs font-semibold text-slate-700 gap-1.5 mb-1">
            <Fingerprint className="w-4 h-4 text-red-500" />
            Huella de Dispositivo & Navegador
          </span>
          <p className="text-xs text-slate-500">
            Captura de huella y user agent en cada acción crítica para impedir cuentas compartidas.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
          <span className="flex items-center text-xs font-semibold text-slate-700 gap-1.5 mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Cero Borrados (Inmutabilidad)
          </span>
          <p className="text-xs text-slate-500">
            Ningún evento registrado en esta tabla puede ser modificado ni eliminado a nivel de base de datos.
          </p>
        </div>
      </div>

      {/* Registros de Bitácora */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Eventos de Auditoría Recientes ({logs.length})
          </span>
          <span className="text-[10px] text-slate-400">Orden cronológico inverso</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            <RefreshCw className="w-5 h-5 mx-auto animate-spin mb-2 text-slate-400" />
            Cargando bitácora desde Supabase...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            Aún no hay eventos registrados en la bitácora. Al guardar cambios en tarifas o anulaciones se registrarán aquí automáticamente.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {logs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-slate-50 transition-colors text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                    {log.accion}
                  </span>
                  <span className="text-slate-400 text-[11px] flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(log.fecha_hora).toLocaleString('es-BO', {
                      dateStyle: 'short',
                      timeStyle: 'medium',
                    })}
                  </span>
                </div>

                <div className="text-slate-700">
                  {log.detalle_json?.descripcion || JSON.stringify(log.detalle_json)}
                </div>

                {log.detalle_json?.cambios && (
                  <div className="mt-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1">
                    <span className="font-semibold text-[10px] uppercase text-slate-500 block">
                      Valores Modificados:
                    </span>
                    {log.detalle_json.cambios.map((c, i) => (
                      <div key={i} className="text-[11px] text-slate-600 flex items-center gap-2 font-mono">
                        <span className="font-semibold text-slate-800">{c.campo}:</span>
                        <span className="text-red-600 line-through">{c.valor_anterior}</span>
                        <span>➔</span>
                        <span className="text-emerald-700 font-bold">{c.valor_nuevo}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="text-[10px] text-slate-400 flex items-center gap-3 pt-1">
                  <span>Usuario: {log.perfiles_usuarios?.nombre || log.usuario_id || 'Sistema'}</span>
                  <span>•</span>
                  <span className="truncate max-w-xs">Navegador: {log.user_agent || 'N/A'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
