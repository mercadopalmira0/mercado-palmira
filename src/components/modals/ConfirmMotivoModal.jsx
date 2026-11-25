import React, { useState, useEffect } from 'react'
import { AlertTriangle, Edit2, Trash2, ShieldAlert, X, CheckCircle2 } from 'lucide-react'

/**
 * Modal de confirmación obligatoria con motivo (mínimo 5 caracteres)
 * para cualquier EDICIÓN o ELIMINACIÓN auditada.
 */
export default function ConfirmMotivoModal({
  isOpen,
  onClose,
  onConfirm,
  tipo = 'edicion', // 'edicion' | 'eliminacion'
  titulo,
  descripcion,
  advertencia,
  confirmLabel,
  loading = false,
}) {
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setMotivo('')
      setError('')
    }
  }, [isOpen])

  if (!isOpen) return null

  const isDelete = tipo === 'eliminacion'

  const handleSubmit = async (e) => {
    e.preventDefault()
    const clean = motivo.trim()
    if (clean.length < 5) {
      setError('Debes ingresar un motivo claro de al menos 5 caracteres para dejar constancia en bitácora.')
      return
    }
    setError('')
    await onConfirm(clean)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md max-h-[88dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
        <div className={`shrink-0 px-5 py-3.5 text-white flex items-center justify-between ${isDelete ? 'bg-red-900' : 'bg-slate-900'}`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`p-2 rounded-lg shrink-0 ${isDelete ? 'bg-red-500/20 text-red-200' : 'bg-blue-500/20 text-blue-300'}`}>
              {isDelete ? <Trash2 className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base leading-tight truncate">
                {titulo || (isDelete ? 'Confirmar Eliminación' : 'Confirmar Edición Auditada')}
              </h3>
              <p className="text-[11px] text-white/75 truncate">
                Se registrará en bitacora_auditoria antes de aplicar el cambio
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-lg text-white/80 hover:text-white shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
            {descripcion && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
                {descripcion}
              </div>
            )}

            {advertencia && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>{advertencia}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                <ShieldAlert className={`w-3.5 h-3.5 ${isDelete ? 'text-red-600' : 'text-blue-600'}`} />
                <span>
                  Motivo obligatorio ({isDelete ? 'por qué se elimina' : 'por qué se edita'}) <span className="text-red-500">*</span>
                </span>
              </label>
              <textarea
                rows={3}
                required
                minLength={5}
                autoFocus
                value={motivo}
                onChange={(e) => {
                  setMotivo(e.target.value)
                  if (error && e.target.value.trim().length >= 5) setError('')
                }}
                placeholder={
                  isDelete
                    ? 'Ej. Registro duplicado por error al cargar socio nuevo...'
                    : 'Ej. Corrección de monto digitado erróneamente (era 58 Bs)...'
                }
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400">Mínimo 5 caracteres. Quedará guardado en bitácora.</span>
            </div>

            {error && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                {error}
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || motivo.trim().length < 5}
              className={`px-4 py-2.5 text-white rounded-xl text-xs font-bold shadow-md disabled:opacity-40 flex items-center gap-1.5 ${
                isDelete ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isDelete ? <Trash2 className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>
                {loading
                  ? 'Registrando...'
                  : confirmLabel || (isDelete ? 'Auditar y Eliminar' : 'Auditar y Guardar')}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
