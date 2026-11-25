import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { registrarEdicionAuditoria } from '../../lib/auditoria'
import { getNombreSocioCobro } from '../../lib/formatters'
import { Sliders, CheckCircle2, AlertCircle, X, ShieldAlert } from 'lucide-react'

/**
 * Modal compartido para editar individualmente los rubros (Guardia, Agua, Grupo Luz)
 * de un cobro de socio (cobros_servicios) o de un externo (cobros_externos) con auditoría obligatoria.
 */
export default function EditarMontosModal({
  isOpen,
  onClose,
  tipo = 'socio', // 'socio' | 'externo'
  cobro = null,
  externoNombre = '',
  onSaved,
}) {
  const { user } = useAuth()
  const [guardia, setGuardia] = useState('40')
  const [agua, setAgua] = useState('5')
  const [luzGrupo, setLuzGrupo] = useState('0')
  const [motivo, setMotivo] = useState('')
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!isOpen || !cobro) return
    setErrorMsg('')
    if (tipo === 'socio') {
      setGuardia(String(cobro.montoGuardia ?? cobro.monto_guardia ?? 40))
      setAgua(String(cobro.montoAgua ?? cobro.monto_agua ?? 5))
      setLuzGrupo(String(cobro.montoLuzGrupo ?? cobro.monto_luz_grupo ?? 0))
      setMotivo(cobro.motivo_edicion_monto || '')
    } else {
      setGuardia(String(cobro.monto_guardia ?? 40))
      setAgua(String(cobro.monto_agua ?? 10))
      setLuzGrupo('0')
      setMotivo(cobro.motivo_edicion_monto || '')
    }
  }, [isOpen, cobro, tipo])

  if (!isOpen || !cobro) return null

  const gNum = parseFloat(guardia) || 0
  const aNum = parseFloat(agua) || 0
  const lNum = tipo === 'socio' ? parseFloat(luzGrupo) || 0 : 0
  const multaNeta = tipo === 'socio' ? parseFloat(cobro.multaNeta) || 0 : 0
  const totalNuevo = gNum + aNum + lNum + multaNeta

  const handleSubmit = async (e) => {
    e.preventDefault()
    const motivoLimpio = motivo.trim()
    if (motivoLimpio.length < 5) {
      setErrorMsg('El motivo del ajuste es obligatorio (mínimo 5 caracteres).')
      return
    }
    if (gNum < 0 || aNum < 0 || lNum < 0) {
      setErrorMsg('Los montos no pueden ser negativos.')
      return
    }

    setSaving(true)
    setErrorMsg('')

    try {
      if (tipo === 'socio') {
        const nombreSocio = getNombreSocioCobro(cobro)
        const totalPagado = parseFloat(cobro.totalPagado) || 0
        const nuevoEstado =
          totalPagado >= totalNuevo && totalNuevo > 0
            ? 'pagado'
            : totalPagado > 0
            ? 'parcial'
            : 'pendiente'

        const datosAnteriores = {
          monto_guardia: cobro.montoGuardia ?? cobro.monto_guardia ?? 40,
          monto_agua: cobro.montoAgua ?? cobro.monto_agua ?? 5,
          monto_luz_grupo: cobro.montoLuzGrupo ?? cobro.monto_luz_grupo ?? 0,
          total_a_pagar: cobro.totalAPagar ?? cobro.total_a_pagar ?? 0,
          es_monto_editado: Boolean(cobro.es_monto_editado),
        }

        const datosNuevos = {
          monto_guardia: gNum,
          monto_agua: aNum,
          monto_luz_grupo: lNum,
          monto_base: gNum + aNum + lNum,
          monto_luz_redondeado: 0,
          total_a_pagar: totalNuevo,
          es_monto_editado: true,
          motivo_edicion_monto: motivoLimpio,
          estado: nuevoEstado,
        }

        await registrarEdicionAuditoria({
          usuarioId: user?.id,
          modulo: 'Edición Individual de Montos (Emergencia/Reposición)',
          tabla: 'cobros_servicios',
          registroId: cobro.id,
          motivo: motivoLimpio,
          resumen: `Ajuste individual de rubros a ${nombreSocio} (${cobro.unidades_cobro?.numero_identificador})`,
          datosAnteriores,
          datosNuevos,
        })

        const { error } = await supabase
          .from('cobros_servicios')
          .update(datosNuevos)
          .eq('id', cobro.id)
        if (error) throw error
      } else {
        const nuevoTotalExt = gNum + aNum
        const datosAnteriores = {
          monto_guardia: cobro.monto_guardia ?? 40,
          monto_agua: cobro.monto_agua ?? 10,
          monto_pagado: cobro.monto_pagado,
          es_monto_editado: Boolean(cobro.es_monto_editado),
        }

        const datosNuevos = {
          monto_guardia: gNum,
          monto_agua: aNum,
          monto_pagado: nuevoTotalExt,
          monto_correspondiente: nuevoTotalExt,
          es_monto_editado: true,
          motivo_edicion_monto: motivoLimpio,
        }

        await registrarEdicionAuditoria({
          usuarioId: user?.id,
          modulo: 'Edición Individual Externo',
          tabla: 'cobros_externos',
          registroId: cobro.id,
          motivo: motivoLimpio,
          resumen: `Ajuste individual de cobro externo (${externoNombre || cobro.externo_id})`,
          datosAnteriores,
          datosNuevos,
        })

        const { error } = await supabase
          .from('cobros_externos')
          .update(datosNuevos)
          .eq('id', cobro.id)
        if (error) throw error
      }

      if (onSaved) await onSaved()
      onClose()
    } catch (err) {
      console.error(err)
      setErrorMsg(err.message || 'Error al guardar ajuste de montos')
    } finally {
      setSaving(false)
    }
  }

  const tituloPersona =
    tipo === 'socio'
      ? `${cobro.unidades_cobro?.numero_identificador || ''} • ${getNombreSocioCobro(cobro)}`
      : externoNombre || 'Aportante Externo'

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md max-h-[88dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
        <div className="shrink-0 bg-slate-900 px-5 py-3.5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-amber-500/20 text-amber-300 rounded-lg shrink-0">
              <Sliders className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base leading-tight truncate">Editar Montos del Mes</h3>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">{tituloPersona}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-slate-300 hover:text-white shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className={`grid gap-3 ${tipo === 'socio' ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Guardia (Bs)</label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                required
                value={guardia}
                onChange={(e) => setGuardia(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Agua (Bs)</label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                required
                value={agua}
                onChange={(e) => setAgua(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            {tipo === 'socio' && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Grupo Luz (Bs)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  required
                  value={luzGrupo}
                  onChange={(e) => setLuzGrupo(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            )}
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
            <span className="font-semibold text-slate-600">
              {multaNeta > 0 ? `Nuevo Total (incluye ${multaNeta.toFixed(2)} Bs multa):` : 'Nuevo Total del Mes:'}
            </span>
            <span className="text-base font-extrabold text-slate-900">{totalNuevo.toFixed(2)} Bs</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
              <span>Motivo del Ajuste (Obligatorio) *</span>
            </label>
            <textarea
              rows={2}
              required
              minLength={5}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej. Emergencia familiar, paga menos este mes / Reposición mes anterior..."
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          </div>

          <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-600">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || motivo.trim().length < 5}
              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{saving ? 'Guardando...' : 'Guardar Ajuste Auditado'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
