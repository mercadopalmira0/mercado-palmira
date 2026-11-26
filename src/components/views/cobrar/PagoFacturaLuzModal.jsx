import React from 'react'
import { MESES } from '../../../lib/formatters'
import FotoUploaderModal from '../../modals/FotoUploaderModal'
import { Coins, QrCode, CheckCircle2, X, Camera } from 'lucide-react'

export default function PagoFacturaLuzModal({
  isOpen,
  onClose,
  periodo,
  selectedMes,
  selectedAnio,
  fechaPagoFactura,
  setFechaPagoFactura,
  metodoPagoFactura,
  setMetodoPagoFactura,
  fotoPagoFactura,
  setFotoPagoFactura,
  isPhotoFacturaOpen,
  setIsPhotoFacturaOpen,
  savingFacturaPago,
  onSubmit,
}) {
  if (!isOpen || !periodo) return null

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm">
        <div className="w-full max-w-md max-h-[88dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
          <div className="shrink-0 bg-slate-900 px-5 py-3.5 text-white flex items-center justify-between">
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base truncate">Registrar Pago de Factura de Luz</h3>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                {MESES[selectedMes]} {selectedAnio} • Total: {parseFloat(periodo.factura_luz_bs).toFixed(2)} Bs
              </p>
            </div>
            <button type="button" onClick={onClose} className="p-1.5 text-slate-300 hover:text-white shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={onSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                Al confirmar, se marcará la factura como <strong>Pagada</strong> y se creará el egreso automático en{' '}
                <strong>Caja Servicios</strong> por <strong>{parseFloat(periodo.factura_luz_bs).toFixed(2)} Bs</strong>.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha Real de Pago</label>
                <input
                  type="date"
                  required
                  value={fechaPagoFactura}
                  onChange={(e) => setFechaPagoFactura(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Método de Pago</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setMetodoPagoFactura('efectivo')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${
                      metodoPagoFactura === 'efectivo'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-50 text-slate-700 border-slate-300'
                    }`}
                  >
                    <Coins className="w-4 h-4" />
                    <span>Efectivo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMetodoPagoFactura('qr')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${
                      metodoPagoFactura === 'qr'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-50 text-slate-700 border-slate-300'
                    }`}
                  >
                    <QrCode className="w-4 h-4" />
                    <span>QR / Banco</span>
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-600">Comprobante Pagado (Drive):</span>
                <div className="flex items-center gap-2">
                  {fotoPagoFactura && (
                    <a href={fotoPagoFactura} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                      Ver
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsPhotoFacturaOpen(true)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold text-slate-700 flex items-center gap-1"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>{fotoPagoFactura ? 'Cambiar Foto' : 'Subir Comprobante'}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex items-center justify-end gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-600">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingFacturaPago}
                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{savingFacturaPago ? 'Registrando...' : 'Confirmar Pago'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <FotoUploaderModal
        isOpen={isPhotoFacturaOpen}
        onClose={() => setIsPhotoFacturaOpen(false)}
        onPhotoSaved={(url) => setFotoPagoFactura(url)}
        currentUrl={fotoPagoFactura}
        titulo="Comprobante de Pago Factura de Luz"
        categoria="Facturas_Generales"
        anio={selectedAnio}
        mes={selectedMes}
        customName={`Pago_Factura_Luz_${selectedAnio}-${selectedMes}.jpg`}
      />
    </>
  )
}
