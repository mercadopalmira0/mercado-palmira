import React, { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { registrarAuditoria } from '../../lib/auditoria'
import { getNombreSocioCobro } from '../../lib/formatters'
import { Clock, CheckCircle2, AlertCircle, X } from 'lucide-react'

export default function PerdonarMultaModal({
  isOpen,
  onClose,
  cobro,
  onMultaUpdated,
}) {
  const { user } = useAuth()
  const [montoPerdonado, setMontoPerdonado] = useState(cobro?.montoMulta || cobro?.monto_multa || 0)
  const [motivoPerdon, setMotivoPerdon] = useState('')
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  React.useEffect(() => {
    if (isOpen && cobro) {
      setMontoPerdonado(cobro.montoMulta ?? cobro.monto_multa ?? 0)
      setMotivoPerdon(cobro.motivo_perdon_multa || '')
      setErrorMsg('')
    }
  }, [isOpen, cobro])

  if (!isOpen || !cobro) return null

  const nombreSocio = getNombreSocioCobro(cobro)
  const multaBase = parseFloat(cobro.montoMulta ?? cobro.monto_multa) || 0

  const handleConfirm = async (e) => {
    e.preventDefault()
    if (!motivoPerdon.trim()) {
      setErrorMsg('Debes ingresar un motivo escrito justificando la rebaja o perdón de multa.')
      return
    }

    setSaving(true)
    setErrorMsg('')

    try {
      const perdonNum = parseFloat(montoPerdonado) || 0
      const multaNeta = Math.max(0, multaBase - perdonNum)
      const base = parseFloat(cobro.montoBase ?? cobro.monto_base) || 0
      const luz = parseFloat(cobro.montoLuzRedondeado ?? cobro.monto_luz_redondeado) || 0
      const nuevoTotal = base + luz + multaNeta

      const { error } = await supabase
        .from('cobros_servicios')
        .update({
          monto_multa: multaBase,
          multa_perdonada: perdonNum,
          motivo_perdon_multa: motivoPerdon.trim(),
          total_a_pagar: nuevoTotal,
        })
        .eq('id', cobro.id)

      if (error) throw error

      await registrarAuditoria({
        usuarioId: user?.id,
        accion: 'PERDON_MULTA_MANUAL',
        detalleJson: {
          descripcion: `Rebaja de multa a ${nombreSocio} (${cobro.unidades_cobro?.numero_identificador}): ${perdonNum} Bs`,
          cobro_id: cobro.id,
          motivo: motivoPerdon.trim(),
        },
      })

      if (onMultaUpdated) onMultaUpdated()
      onClose()
    } catch (err) {
      console.error(err)
      setErrorMsg('Error al perdonar multa: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md max-h-[88dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
        <div className="shrink-0 bg-slate-900 px-5 py-3.5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base leading-tight truncate">Rebaja o Perdón de Multa</h3>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                {cobro.unidades_cobro?.numero_identificador} • {nombreSocio} • Multa: {multaBase} Bs
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleConfirm} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Monto de Multa a Condonar / Rebajar (Bs)
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              max={multaBase || 70}
              required
              value={montoPerdonado}
              onChange={(e) => setMontoPerdonado(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Motivo Escrito Obligatorio <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={motivoPerdon}
              onChange={(e) => setMotivoPerdon(e.target.value)}
              placeholder="Ej. Problema de salud justificado..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          </div>

          <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{saving ? 'Guardando...' : 'Aplicar Rebaja / Perdón'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
