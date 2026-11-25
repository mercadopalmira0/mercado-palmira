import React, { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { registrarAuditoria } from '../../lib/auditoria'
import { getNombreSocioCobro } from '../../lib/formatters'
import FotoUploaderModal from './FotoUploaderModal'
import { Receipt, Coins, QrCode, CheckCircle2, AlertCircle, X, Camera, ExternalLink, Sparkles, Edit2 } from 'lucide-react'

export default function CobrarModal({
  isOpen,
  onClose,
  cobro,
  perdonazoActivo = null,
  isAdmin = false,
  onEditMontos = null,
  onPaymentSuccess,
}) {
  const { user } = useAuth()
  const [monto, setMonto] = useState('')
  const [metodoPago, setMetodoPago] = useState('efectivo')
  const [nroTalonarioFisico, setNroTalonarioFisico] = useState('')
  const [comprobanteUrl, setComprobanteUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false)

  const totalAPagar = cobro ? cobro.totalAPagar ?? cobro.total_a_pagar ?? 0 : 0
  const totalPagado = cobro
    ? cobro.totalPagado ??
      (cobro.pagos_servicios || [])
        .filter((p) => p.estado === 'activo')
        .reduce((s, p) => s + (parseFloat(p.monto) || 0), 0)
    : 0
  const saldoPendiente = Math.max(0, totalAPagar - totalPagado)

  React.useEffect(() => {
    if (isOpen && cobro) {
      setMonto(saldoPendiente > 0 ? saldoPendiente.toFixed(2) : '')
      setMetodoPago('efectivo')
      setNroTalonarioFisico('')
      setComprobanteUrl('')
      setErrorMsg('')
      setSuccessMsg('')
    }
  }, [isOpen, cobro, saldoPendiente])

  if (!isOpen || !cobro) return null

  const nombreSocio = getNombreSocioCobro(cobro)
  const aplicaPerdonazo = Boolean(perdonazoActivo && (cobro.descuentoPerdonazo || 0) > 0)

  const handleRegisterPayment = async (e) => {
    e.preventDefault()
    const montoNum = parseFloat(monto)
    if (!montoNum || montoNum <= 0) {
      setErrorMsg('Ingresa un monto válido mayor a 0.')
      return
    }

    setSaving(true)
    setErrorMsg('')
    setSuccessMsg('')

    try {
      const { error: pagoError } = await supabase.from('pagos_servicios').insert([
        {
          cobro_id: cobro.id,
          monto: montoNum,
          metodo_pago: metodoPago,
          nro_talonario_fisico: nroTalonarioFisico.trim() || null,
          comprobante_drive_url: comprobanteUrl || null,
          estado: 'activo',
          fecha_pago: new Date().toISOString(),
        },
      ])

      if (pagoError) throw pagoError

      const nuevoTotalPagado = totalPagado + montoNum
      const nuevoSaldo = totalAPagar - nuevoTotalPagado
      const nuevoEstado = nuevoSaldo <= 0 ? 'pagado' : 'parcial'

      const cobroUpdate = {
        estado: nuevoEstado,
        monto_multa: cobro.montoMulta ?? cobro.monto_multa ?? 0,
        total_a_pagar: totalAPagar,
      }

      if (aplicaPerdonazo) {
        const nuevaMultaPerdonada = (parseFloat(cobro.multaPerdonada) || 0) + (cobro.descuentoPerdonazo || 0)
        cobroUpdate.multa_perdonada = nuevaMultaPerdonada
        cobroUpdate.motivo_perdon_multa = [
          cobro.motivo_perdon_multa,
          `Perdonazo "${perdonazoActivo.nombre}" (-${perdonazoActivo.porcentaje_descuento}%)`,
        ]
          .filter(Boolean)
          .join(' | ')
      }

      const { error: cobroError } = await supabase
        .from('cobros_servicios')
        .update(cobroUpdate)
        .eq('id', cobro.id)

      if (cobroError) throw cobroError

      if (aplicaPerdonazo) {
        await registrarAuditoria({
          usuarioId: user?.id,
          accion: 'APLICACION_PERDONAZO_COBRO',
          detalleJson: {
            descripcion: `Perdonazo "${perdonazoActivo.nombre}" (-${perdonazoActivo.porcentaje_descuento}%) aplicado a ${nombreSocio} (${cobro.unidades_cobro?.numero_identificador})`,
            cobro_id: cobro.id,
            campania: perdonazoActivo.nombre,
            porcentaje: perdonazoActivo.porcentaje_descuento,
            multa_original: cobro.montoMulta,
            descuento_aplicado: cobro.descuentoPerdonazo,
            multa_final: cobro.multaNeta,
          },
        })
      }

      setSuccessMsg('¡Pago registrado con éxito!')
      if (onPaymentSuccess) onPaymentSuccess()
      setTimeout(() => {
        onClose()
      }, 700)
    } catch (err) {
      console.error(err)
      setErrorMsg('Error al registrar pago: ' + (err.message || 'Error desconocido'))
    } finally {
      setSaving(false)
    }
  }

  const puestosSubtitle = cobro.resumenGrupo?.esGrupo
    ? `${cobro.resumenGrupo.puestosLabel} • ${cobro.resumenGrupo.sociosLabel}`
    : `${cobro.unidades_cobro?.numero_identificador || ''} • ${nombreSocio}`

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md max-h-[88dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
        <div className="shrink-0 bg-slate-900 px-5 py-3.5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base leading-tight truncate">Registrar Cobro de Servicios</h3>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                {puestosSubtitle}
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

        {/* Banner de Perdonazo en Modal */}
        {perdonazoActivo && (
          <div className="shrink-0 bg-purple-50 border-b border-purple-200 px-4 py-2.5 text-xs text-purple-900 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">
                Perdonazo Activo: {perdonazoActivo.nombre} (-{perdonazoActivo.porcentaje_descuento}% en multas)
              </p>
              {aplicaPerdonazo ? (
                <p className="text-purple-700 mt-0.5">
                  Multa original: <span className="line-through">{cobro.montoMulta.toFixed(2)} Bs</span>{' '}
                  ➔ Con perdonazo: <strong>{cobro.multaNeta.toFixed(2)} Bs</strong> (Ahorro:{' '}
                  {cobro.descuentoPerdonazo.toFixed(2)} Bs)
                </p>
              ) : (
                <p className="text-purple-700 mt-0.5">Este cobro no tiene multa pendiente.</p>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleRegisterPayment} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
            <div className="bg-slate-50 p-4 border-b border-slate-200 space-y-2.5 text-xs">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Total a Pagar</span>
                  <p className="text-sm font-bold text-slate-800">{totalAPagar.toFixed(2)} Bs</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Ya Abonado</span>
                  <p className="text-sm font-bold text-emerald-700">{totalPagado.toFixed(2)} Bs</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Saldo Pendiente</span>
                  <p className="text-sm font-bold text-red-600">{saldoPendiente.toFixed(2)} Bs</p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <div className="flex flex-wrap items-center gap-1.5 text-slate-600">
                  <span className="px-2 py-0.5 rounded bg-white border border-slate-200 font-semibold">
                    Guardia: {(cobro.montoGuardia ?? cobro.monto_guardia ?? 40).toFixed(2)}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white border border-slate-200 font-semibold">
                    Agua: {(cobro.montoAgua ?? cobro.monto_agua ?? 5).toFixed(2)}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white border border-slate-200 font-semibold">
                    Luz: {(cobro.montoLuzGrupo ?? cobro.monto_luz_grupo ?? 0).toFixed(2)}
                  </span>
                  {(cobro.esMontoEditado || cobro.es_monto_editado) && (
                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 font-bold">
                      Monto ajustado
                    </span>
                  )}
                </div>

                {isAdmin && onEditMontos && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose()
                      onEditMontos(cobro)
                    }}
                    className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg font-bold inline-flex items-center gap-1"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Editar Montos</span>
                  </button>
                )}
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Monto a Cobrar (Bs) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                required
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="0.00"
                className="w-full pl-3 pr-16 py-2.5 text-base bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <span className="absolute right-3 top-3 text-xs font-semibold text-slate-400">Bs</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMonto(saldoPendiente.toFixed(2))}
                className="text-[11px] text-emerald-700 font-semibold hover:underline"
              >
                Cobro total ({saldoPendiente.toFixed(2)} Bs)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Método de Pago</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMetodoPago('efectivo')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  metodoPago === 'efectivo'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <Coins className="w-4 h-4" />
                <span>Efectivo</span>
              </button>

              <button
                type="button"
                onClick={() => setMetodoPago('qr')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  metodoPago === 'qr'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span>QR / Banco</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              N° Recibo Talonario Físico (Opcional)
            </label>
            <input
              type="text"
              value={nroTalonarioFisico}
              onChange={(e) => setNroTalonarioFisico(e.target.value)}
              placeholder="Ej. Recibo 0452"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-600">Foto de Comprobante (Drive):</span>
            <div className="flex items-center space-x-2">
              {comprobanteUrl && (
                <a
                  href={comprobanteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 text-blue-600 hover:text-blue-800 bg-blue-50 rounded-lg"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              <button
                type="button"
                onClick={() => setIsPhotoModalOpen(true)}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-1 transition-colors"
              >
                <Camera className="w-3.5 h-3.5 text-slate-500" />
                <span>{comprobanteUrl ? 'Cambiar Foto' : 'Adjuntar Foto'}</span>
              </button>
            </div>
          </div>

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
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-900/20 transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{saving ? 'Registrando...' : 'Confirmar Cobro'}</span>
            </button>
          </div>
        </form>
      </div>

      <FotoUploaderModal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        onPhotoSaved={(url) => setComprobanteUrl(url)}
        currentUrl={comprobanteUrl}
        titulo="Comprobante de Pago"
        categoria="Comprobantes"
        anio={new Date().getFullYear()}
        mes={new Date().getMonth() + 1}
        customName={`Recibo_${cobro.unidades_cobro?.numero_identificador}_${Date.now()}.jpg`}
      />
    </div>
  )
}
