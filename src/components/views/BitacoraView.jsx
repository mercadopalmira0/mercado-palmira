import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { descargarBackupCompleto } from '../../lib/backup'
import {
  ShieldAlert,
  AlertTriangle,
  Fingerprint,
  Lock,
  RefreshCw,
  Clock,
  FileText,
  ChevronDown,
  ChevronUp,
  Download,
  CheckCircle2,
  X
} from 'lucide-react'

function getBadgeStyle(accion = '') {
  const up = accion.toUpperCase()
  if (up === 'ELIMINACION' || up.includes('ELIMINACION')) {
    return 'bg-red-100 text-red-800 border-red-300'
  }
  if (up === 'EDICION' || up.includes('EDICION') || up.includes('ACTUALIZACION')) {
    return 'bg-blue-100 text-blue-800 border-blue-300'
  }
  if (up.includes('ANULACION')) {
    return 'bg-orange-100 text-orange-800 border-orange-300'
  }
  return 'bg-slate-100 text-slate-800 border-slate-200'
}

export default function BitacoraView({ role }) {
  const { user, isAdmin } = useAuth()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [downloadingBackup, setDownloadingBackup] = useState(false)
  const [backupStatus, setBackupStatus] = useState(null)
  const [filterTipo, setFilterTipo] = useState('todos') // 'todos' | 'edicion' | 'eliminacion' | 'anulacion'
  const [expandedIds, setExpandedIds] = useState({})

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
        .limit(100)

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

  const toggleExpand = (id) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const handleDescargarRespaldo = async () => {
    if (!isAdmin && role !== 'admin') return
    setDownloadingBackup(true)
    setBackupStatus(null)
    try {
      const res = await descargarBackupCompleto({ usuarioId: user?.id })
      setBackupStatus({
        type: 'success',
        text: `Respaldo ${res.fileName} descargado (${res.totalRegistros} registros) y registrado en bitácora.`,
      })
      await fetchLogs()
    } catch (err) {
      console.error(err)
      setBackupStatus({
        type: 'error',
        text: 'Error al generar el respaldo manual: ' + (err.message || 'Error desconocido'),
      })
    } finally {
      setDownloadingBackup(false)
    }
  }

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

  const filteredLogs = logs.filter((log) => {
    const up = (log.accion || '').toUpperCase()
    if (filterTipo === 'edicion') return up === 'EDICION' || up.includes('EDICION') || up.includes('ACTUALIZACION')
    if (filterTipo === 'eliminacion') return up === 'ELIMINACION' || up.includes('ELIMINACION')
    if (filterTipo === 'anulacion') return up.includes('ANULACION')
    return true
  })

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3 text-red-600 mb-1">
            <ShieldAlert className="w-6 h-6" />
            <h2 className="text-xl font-bold text-slate-900">Bitácora de Auditoría (Exclusivo Admin)</h2>
          </div>
          <p className="text-xs text-slate-500">
            Registro inmutable protegido por RLS. Toda edición, eliminación o anulación queda trazada con snapshot anterior, motivo y usuario.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {(isAdmin || role === 'admin') && (
            <button
              type="button"
              onClick={handleDescargarRespaldo}
              disabled={downloadingBackup}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Download className={`w-4 h-4 ${downloadingBackup ? 'animate-bounce' : ''}`} />
              <span>{downloadingBackup ? 'Generando Respaldo...' : 'Descargar Respaldo Completo (.json)'}</span>
            </button>
          )}
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-1.5 text-xs font-semibold"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-red-600' : ''}`} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {backupStatus && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center justify-between gap-2 ${
            backupStatus.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {backupStatus.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{backupStatus.text}</span>
          </div>
          <button type="button" onClick={() => setBackupStatus(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tarjetas de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
          <span className="flex items-center text-xs font-semibold text-slate-700 gap-1.5 mb-1">
            <Fingerprint className="w-4 h-4 text-red-500" />
            Trazabilidad Total (Antes vs. Después)
          </span>
          <p className="text-xs text-slate-500">
            Cada edición y eliminación guarda el registro completo previo, los cambios exactos, el motivo escrito y el dispositivo.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
          <span className="flex items-center text-xs font-semibold text-slate-700 gap-1.5 mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Bitácora Inmutable
          </span>
          <p className="text-xs text-slate-500">
            Los eventos registrados en esta bitácora no pueden modificarse ni eliminarse desde la aplicación.
          </p>
        </div>
      </div>

      {/* Filtros por tipo */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm w-fit text-xs font-bold">
        <button
          type="button"
          onClick={() => setFilterTipo('todos')}
          className={`px-3 py-1.5 rounded-xl ${filterTipo === 'todos' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          Todos ({logs.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterTipo('edicion')}
          className={`px-3 py-1.5 rounded-xl ${filterTipo === 'edicion' ? 'bg-blue-600 text-white' : 'text-blue-700 bg-blue-50 hover:bg-blue-100'}`}
        >
          Ediciones
        </button>
        <button
          type="button"
          onClick={() => setFilterTipo('eliminacion')}
          className={`px-3 py-1.5 rounded-xl ${filterTipo === 'eliminacion' ? 'bg-red-600 text-white' : 'text-red-700 bg-red-50 hover:bg-red-100'}`}
        >
          Eliminaciones
        </button>
        <button
          type="button"
          onClick={() => setFilterTipo('anulacion')}
          className={`px-3 py-1.5 rounded-xl ${filterTipo === 'anulacion' ? 'bg-orange-600 text-white' : 'text-orange-700 bg-orange-50 hover:bg-orange-100'}`}
        >
          Anulaciones
        </button>
      </div>

      {/* Registros */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Eventos de Auditoría ({filteredLogs.length})
          </span>
          <span className="text-[10px] text-slate-400">Orden cronológico inverso</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            <RefreshCw className="w-5 h-5 mx-auto animate-spin mb-2 text-slate-400" />
            Cargando bitácora desde Supabase...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            No hay eventos que coincidan con el filtro seleccionado.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredLogs.map((log) => {
              const det = log.detalle_json || {}
              const isExpanded = Boolean(expandedIds[log.id])
              const hasSnapshots = Boolean(det.datos_anteriores || det.datos_nuevos)

              return (
                <div key={log.id} className="p-4 hover:bg-slate-50 transition-colors text-xs space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`font-bold font-mono px-2.5 py-0.5 rounded border ${getBadgeStyle(log.accion)}`}>
                        {log.accion}
                      </span>
                      {det.modulo && (
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                          {det.modulo}
                        </span>
                      )}
                      {det.tabla && (
                        <span className="text-[11px] font-mono text-slate-500">
                          [{det.tabla}]
                        </span>
                      )}
                    </div>
                    <span className="text-slate-400 text-[11px] flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(log.fecha_hora).toLocaleString('es-BO', {
                        dateStyle: 'short',
                        timeStyle: 'medium',
                      })}
                    </span>
                  </div>

                  <div className="text-slate-800 font-medium">
                    {det.descripcion || JSON.stringify(det)}
                  </div>

                  {det.motivo && (
                    <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-950">
                      <strong>Motivo ingresado:</strong> {det.motivo}
                    </div>
                  )}

                  {Array.isArray(det.cambios) && det.cambios.length > 0 && (
                    <div className="mt-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1">
                      <span className="font-semibold text-[10px] uppercase text-slate-500 block">
                        Campos Modificados:
                      </span>
                      {det.cambios.map((c, i) => (
                        <div key={i} className="text-[11px] text-slate-600 flex flex-wrap items-center gap-2 font-mono">
                          <span className="font-semibold text-slate-800">{c.campo}:</span>
                          <span className="text-red-600 line-through">{String(c.valor_anterior ?? 'vacío')}</span>
                          <span>➔</span>
                          <span className="text-emerald-700 font-bold">{String(c.valor_nuevo ?? 'vacío')}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {hasSnapshots && (
                    <div>
                      <button
                        type="button"
                        onClick={() => toggleExpand(log.id)}
                        className="text-[11px] font-bold text-indigo-600 hover:underline inline-flex items-center gap-1"
                      >
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        <span>{isExpanded ? 'Ocultar detalle JSON completo' : 'Ver snapshot completo (Antes / Después)'}</span>
                      </button>

                      {isExpanded && (
                        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                          {det.datos_anteriores && (
                            <div className="bg-red-50/70 border border-red-200 rounded-lg p-2.5 overflow-x-auto">
                              <span className="text-[10px] font-bold uppercase text-red-700 block mb-1">
                                Datos Anteriores
                              </span>
                              <pre className="text-[10px] text-slate-800 whitespace-pre-wrap break-all">
                                {JSON.stringify(det.datos_anteriores, null, 2)}
                              </pre>
                            </div>
                          )}
                          {det.datos_nuevos && (
                            <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-2.5 overflow-x-auto">
                              <span className="text-[10px] font-bold uppercase text-emerald-700 block mb-1">
                                Datos Nuevos
                              </span>
                              <pre className="text-[10px] text-slate-800 whitespace-pre-wrap break-all">
                                {JSON.stringify(det.datos_nuevos, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="text-[10px] text-slate-400 flex flex-wrap items-center gap-2 pt-1">
                    <span>Usuario: {log.perfiles_usuarios?.nombre || log.usuario_id || 'Sistema'}</span>
                    {det.registro_id && (
                      <>
                        <span>•</span>
                        <span className="font-mono">ID: {String(det.registro_id).slice(0, 8)}</span>
                      </>
                    )}
                    <span>•</span>
                    <span className="truncate max-w-xs">Navegador: {log.user_agent || 'N/A'}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
