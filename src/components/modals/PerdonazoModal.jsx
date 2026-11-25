import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { registrarAuditoria, registrarEdicionAuditoria, registrarEliminacionAuditoria } from '../../lib/auditoria'
import { getLocalDateStr } from '../../lib/formatters'
import ConfirmMotivoModal from './ConfirmMotivoModal'
import { Sparkles, CheckCircle2, AlertCircle, X, Calendar, Percent, Edit2, Trash2 } from 'lucide-react'

export default function PerdonazoModal({ isOpen, onClose, onUpdated }) {
  const { user, isAdmin } = useAuth()
  const [campanias, setCampanias] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const [editingItem, setEditingItem] = useState(null)
  const [nombre, setNombre] = useState('')
  const [fechaInicio, setFechaInicio] = useState(getLocalDateStr())
  const [fechaFin, setFechaFin] = useState(getLocalDateStr())
  const [porcentaje, setPorcentaje] = useState('50')
  const [activo, setActivo] = useState(true)
  const [observaciones, setObservaciones] = useState('')

  const [confirmState, setConfirmState] = useState({ open: false, tipo: 'edicion', target: null })

  const fetchCampanias = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('campañas_perdonazo')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setCampanias(data || [])
    } catch (err) {
      console.error(err)
      setErrorMsg('Error al cargar campañas de perdonazo: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchCampanias()
      resetForm()
      setErrorMsg('')
      setSuccessMsg('')
    }
  }, [isOpen])

  const resetForm = () => {
    setEditingItem(null)
    setNombre('')
    setFechaInicio(getLocalDateStr())
    setFechaFin(getLocalDateStr())
    setPorcentaje('50')
    setActivo(true)
    setObservaciones('')
  }

  if (!isOpen) return null

  const handleEdit = (c) => {
    setEditingItem(c)
    setNombre(c.nombre || '')
    setFechaInicio(c.fecha_inicio || getLocalDateStr())
    setFechaFin(c.fecha_fin || getLocalDateStr())
    setPorcentaje(String(c.porcentaje_descuento || 50))
    setActivo(c.activo !== false)
    setObservaciones(c.observaciones || '')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isAdmin) return

    const pct = parseFloat(porcentaje)
    if (!nombre.trim() || !pct || pct <= 0 || pct > 100) {
      setErrorMsg('Ingresa un nombre válido y un porcentaje entre 1% y 100%.')
      return
    }
    if (fechaFin < fechaInicio) {
      setErrorMsg('La fecha fin no puede ser anterior a la fecha de inicio.')
      return
    }

    if (editingItem) {
      setConfirmState({ open: true, tipo: 'edicion', target: editingItem })
      return
    }

    setSaving(true)
    setErrorMsg('')
    setSuccessMsg('')

    try {
      const payload = {
        nombre: nombre.trim(),
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        porcentaje_descuento: pct,
        activo,
        observaciones: observaciones.trim() || null,
      }
      const { data, error } = await supabase.from('campañas_perdonazo').insert([payload]).select().single()
      if (error) throw error

      await registrarAuditoria({
        usuarioId: user?.id,
        accion: 'CAMPANA_PERDONAZO_CREADA',
        detalleJson: {
          descripcion: `Nueva campaña de perdonazo "${payload.nombre}" (${pct}% del ${fechaInicio} al ${fechaFin})`,
          tabla: 'campañas_perdonazo',
          registro_id: data?.id,
          ...payload,
        },
      })
      setSuccessMsg('Campaña de perdonazo creada y activada con éxito.')
      resetForm()
      await fetchCampanias()
      if (onUpdated) onUpdated()
    } catch (err) {
      console.error(err)
      setErrorMsg('Error al guardar perdonazo: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleConfirmAudit = async (motivo) => {
    const { tipo, target } = confirmState
    if (!target) return
    setSaving(true)
    setErrorMsg('')

    try {
      if (tipo === 'edicion') {
        const pct = parseFloat(porcentaje)
        const payload = {
          nombre: nombre.trim(),
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
          porcentaje_descuento: pct,
          activo,
          observaciones: observaciones.trim() || null,
        }

        await registrarEdicionAuditoria({
          usuarioId: user?.id,
          modulo: 'Perdonazo de Multas',
          tabla: 'campañas_perdonazo',
          registroId: target.id,
          motivo,
          resumen: `Edición de campaña "${payload.nombre}"`,
          datosAnteriores: {
            nombre: target.nombre,
            fecha_inicio: target.fecha_inicio,
            fecha_fin: target.fecha_fin,
            porcentaje_descuento: target.porcentaje_descuento,
            activo: target.activo,
            observaciones: target.observaciones,
          },
          datosNuevos: payload,
        })

        const { error } = await supabase.from('campañas_perdonazo').update(payload).eq('id', target.id)
        if (error) throw error

        setSuccessMsg('Campaña actualizada y auditada en bitácora.')
        resetForm()
      } else {
        await registrarEliminacionAuditoria({
          usuarioId: user?.id,
          modulo: 'Perdonazo de Multas',
          tabla: 'campañas_perdonazo',
          registroId: target.id,
          motivo,
          resumen: `Eliminación de campaña "${target.nombre}" (-${target.porcentaje_descuento}%)`,
          datosAnteriores: target,
        })

        const { error } = await supabase.from('campañas_perdonazo').delete().eq('id', target.id)
        if (error) throw error

        setSuccessMsg(`Campaña "${target.nombre}" eliminada con auditoría en bitácora.`)
        if (editingItem?.id === target.id) resetForm()
      }

      setConfirmState({ open: false, tipo: 'edicion', target: null })
      await fetchCampanias()
      if (onUpdated) onUpdated()
    } catch (err) {
      setErrorMsg(err.message)
      setConfirmState({ open: false, tipo: 'edicion', target: null })
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActivo = async (c) => {
    const nuevoEstado = !c.activo
    try {
      const { error } = await supabase
        .from('campañas_perdonazo')
        .update({ activo: nuevoEstado })
        .eq('id', c.id)
      if (error) throw error

      await registrarAuditoria({
        usuarioId: user?.id,
        accion: 'CAMPANA_PERDONAZO_ESTADO',
        detalleJson: {
          descripcion: `Perdonazo "${c.nombre}" ${nuevoEstado ? 'activado' : 'desactivado'}`,
          tabla: 'campañas_perdonazo',
          registro_id: c.id,
          activo: nuevoEstado,
        },
      })

      await fetchCampanias()
      if (onUpdated) onUpdated()
    } catch (err) {
      setErrorMsg('Error al cambiar estado: ' + err.message)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-2xl max-h-[88dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
        <div className="shrink-0 bg-slate-900 px-5 py-3.5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="p-2 bg-purple-500/20 text-purple-300 rounded-lg shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base leading-tight truncate">Configurar Perdonazo de Multas</h3>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">Edición y eliminación auditadas en bitácora</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-slate-300 hover:text-white shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-800 block border-b pb-1">
              {editingItem ? 'Editar Campaña de Perdonazo (Auditado)' : 'Nueva Campaña de Perdonazo'}
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre de la Campaña <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Perdonazo Aniversario Palmira"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Percent className="w-3.5 h-3.5 text-purple-600" />
                  Porcentaje Descuento (1% a 100%)
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  step="1"
                  required
                  value={porcentaje}
                  onChange={(e) => setPorcentaje(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Fecha Inicio
                </label>
                <input
                  type="date"
                  required
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Fecha Fin
                </label>
                <input
                  type="date"
                  required
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Observaciones (Opcional)</label>
              <input
                type="text"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activo}
                  onChange={(e) => setActivo(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded"
                />
                <span>Campaña Activa</span>
              </label>

              <div className="flex items-center gap-2">
                {editingItem && (
                  <button type="button" onClick={resetForm} className="px-3 py-1.5 text-xs text-slate-600 hover:underline">
                    Cancelar Edición
                  </button>
                )}
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  {saving ? 'Guardando...' : editingItem ? 'Actualizar Campaña' : 'Crear Campaña'}
                </button>
              </div>
            </div>
          </form>

          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
              Campañas Registradas ({campanias.length})
            </span>
            {loading ? (
              <p className="text-xs text-slate-400">Cargando campañas...</p>
            ) : campanias.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No hay campañas de perdonazo creadas.</p>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl">
                {campanias.map((c) => {
                  const todayStr = getLocalDateStr()
                  const vigenteHoy = c.activo && c.fecha_inicio <= todayStr && c.fecha_fin >= todayStr
                  return (
                    <div key={c.id} className="p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{c.nombre}</span>
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded font-bold">
                            -{c.porcentaje_descuento}% multa
                          </span>
                          {vigenteHoy && (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold">
                              Vigente Hoy
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Del {c.fecha_inicio} al {c.fecha_fin} {c.observaciones ? `• ${c.observaciones}` : ''}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleEdit(c)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Editar campaña"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmState({ open: true, tipo: 'eliminacion', target: c })}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Eliminar campaña"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleActivo(c)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                            c.activo
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}
                        >
                          {c.activo ? 'Activa' : 'Inactiva'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmMotivoModal
        isOpen={confirmState.open}
        onClose={() => setConfirmState({ open: false, tipo: 'edicion', target: null })}
        onConfirm={handleConfirmAudit}
        tipo={confirmState.tipo}
        titulo={confirmState.tipo === 'eliminacion' ? 'Eliminar Campaña de Perdonazo' : 'Editar Campaña de Perdonazo'}
        descripcion={
          confirmState.target
            ? `${confirmState.tipo === 'eliminacion' ? 'Se eliminará' : 'Se actualizará'} la campaña "${confirmState.target.nombre}" con registro previo en bitácora.`
            : ''
        }
        loading={saving}
      />
    </div>
  )
}
