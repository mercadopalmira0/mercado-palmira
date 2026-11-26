import React from 'react'
import { MESES } from '../../../lib/formatters'
import FotoUploaderModal from '../../modals/FotoUploaderModal'
import { Coins, QrCode, CheckCircle2, X, Camera, Save } from 'lucide-react'

export default function GastosFijosModals({
  guardiaMes,
  guardiaAnio,
  periodoFijo,
  // Carga Luz
  isCargaLuzOpen,
  setIsCargaLuzOpen,
  luzEnergiaInput,
  setLuzEnergiaInput,
  luzAlumbradoInput,
  setLuzAlumbradoInput,
  luzBasuraInput,
  setLuzBasuraInput,
  luzKwhInput,
  setLuzKwhInput,
  precioKwhModal,
  totalFacturaLuzModal,
  fotoFacturaLuzInput,
  setFotoFacturaLuzInput,
  isPhotoFacturaLuzOpen,
  setIsPhotoFacturaLuzOpen,
  savingCargaLuz,
  handleSaveCargaLuz,
  // Pago Luz
  isPagoLuzOpen,
  setIsPagoLuzOpen,
  fechaPagoLuz,
  setFechaPagoLuz,
  metodoPagoLuz,
  setMetodoPagoLuz,
  fotoPagoLuz,
  setFotoPagoLuz,
  isPhotoLuzOpen,
  setIsPhotoLuzOpen,
  savingLuzPago,
  handleConfirmarPagoLuz,
  // Carga Agua
  isCargaAguaOpen,
  setIsCargaAguaOpen,
  aguaPotableInput,
  setAguaPotableInput,
  aguaAlcantarilladoInput,
  setAguaAlcantarilladoInput,
  aguaAporteSocioInput,
  setAguaAporteSocioInput,
  totalFacturaAguaModal,
  fotoFacturaAguaInput,
  setFotoFacturaAguaInput,
  isPhotoFacturaAguaOpen,
  setIsPhotoFacturaAguaOpen,
  savingCargaAgua,
  handleSaveCargaAgua,
  // Pago Agua
  isPagoAguaOpen,
  setIsPagoAguaOpen,
  fechaPagoAgua,
  setFechaPagoAgua,
  metodoPagoAgua,
  setMetodoPagoAgua,
  fotoPagoAgua,
  setFotoPagoAgua,
  isPhotoPagoAguaOpen,
  setIsPhotoPagoAguaOpen,
  savingPagoAgua,
  handleConfirmarPagoAgua,
}) {
  return (
    <>
      {/* Modal: Cargar / Editar Factura de Luz */}
      {isCargaLuzOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md max-h-[88dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
            <div className="shrink-0 bg-slate-900 px-5 py-3.5 text-white flex items-center justify-between">
              <div className="min-w-0">
                <h3 className="font-bold text-sm sm:text-base truncate">Factura de Luz del Mes</h3>
                <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                  {MESES[guardiaMes]} {guardiaAnio} • Desglose exacto (precio/kWh usa solo Energía)
                </p>
              </div>
              <button type="button" onClick={() => setIsCargaLuzOpen(false)} className="p-1.5 text-slate-300 hover:text-white shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCargaLuz} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
                <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200 space-y-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 block">
                    Desglose de Factura de Luz (Centavos exactos)
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Consumo Energía (Bs) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        required
                        value={luzEnergiaInput}
                        onChange={(e) => setLuzEnergiaInput(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Alumbrado Público (Bs)
                      </label>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        value={luzAlumbradoInput}
                        onChange={(e) => setLuzAlumbradoInput(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Recojo de Basura (Bs)
                      </label>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        value={luzBasuraInput}
                        onChange={(e) => setLuzBasuraInput(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Total kWh Consumidos <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0.01"
                        required
                        value={luzKwhInput}
                        onChange={(e) => setLuzKwhInput(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-bold"
                      />
                    </div>
                  </div>
                  <div className="pt-2 border-t border-amber-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-amber-950 block">Total Factura de Luz:</span>
                      <span className="text-[10px] text-amber-700">Precio/kWh: {precioKwhModal} Bs</span>
                    </div>
                    <span className="text-base font-extrabold text-amber-800">{totalFacturaLuzModal.toFixed(2)} Bs</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-600">Foto Factura de Luz (Drive):</span>
                  <div className="flex items-center gap-2">
                    {fotoFacturaLuzInput && (
                      <a href={fotoFacturaLuzInput} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                        Ver
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsPhotoFacturaLuzOpen(true)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold text-slate-700 flex items-center gap-1"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>{fotoFacturaLuzInput ? 'Cambiar Foto' : 'Subir Factura'}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex items-center justify-end gap-2">
                <button type="button" onClick={() => setIsCargaLuzOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-600">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingCargaLuz}
                  className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingCargaLuz ? 'Guardando...' : 'Guardar Factura'}</span>
                </button>
              </div>
            </form>
          </div>

          <FotoUploaderModal
            isOpen={isPhotoFacturaLuzOpen}
            onClose={() => setIsPhotoFacturaLuzOpen(false)}
            onPhotoSaved={(url) => setFotoFacturaLuzInput(url)}
            currentUrl={fotoFacturaLuzInput}
            titulo={`Factura de Luz ${MESES[guardiaMes]} ${guardiaAnio}`}
            categoria="Facturas_Generales"
            anio={guardiaAnio}
            mes={guardiaMes}
            customName={`Factura_Luz_${guardiaAnio}-${guardiaMes}.jpg`}
          />
        </div>
      )}

      {/* Modal: Registrar Pago de Factura de Luz */}
      {isPagoLuzOpen && periodoFijo && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md max-h-[88dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
            <div className="shrink-0 bg-slate-900 px-5 py-3.5 text-white flex items-center justify-between">
              <div className="min-w-0">
                <h3 className="font-bold text-sm sm:text-base truncate">Registrar Pago de Factura de Luz</h3>
                <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                  {MESES[guardiaMes]} {guardiaAnio} • Total: {parseFloat(periodoFijo.factura_luz_bs || 0).toFixed(2)} Bs
                </p>
              </div>
              <button type="button" onClick={() => setIsPagoLuzOpen(false)} className="p-1.5 text-slate-300 hover:text-white shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmarPagoLuz} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                  Se marcará la factura como <strong>Pagada</strong> y se creará el egreso automático en{' '}
                  <strong>Caja Servicios</strong> por <strong>{parseFloat(periodoFijo.factura_luz_bs || 0).toFixed(2)} Bs</strong>.
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha Real de Pago</label>
                  <input
                    type="date"
                    required
                    value={fechaPagoLuz}
                    onChange={(e) => setFechaPagoLuz(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Método de Pago</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setMetodoPagoLuz('efectivo')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${
                        metodoPagoLuz === 'efectivo'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-slate-50 text-slate-700 border-slate-300'
                      }`}
                    >
                      <Coins className="w-4 h-4" />
                      <span>Efectivo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMetodoPagoLuz('qr')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${
                        metodoPagoLuz === 'qr'
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
                    {fotoPagoLuz && (
                      <a href={fotoPagoLuz} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                        Ver
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsPhotoLuzOpen(true)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold text-slate-700 flex items-center gap-1"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>{fotoPagoLuz ? 'Cambiar Foto' : 'Subir Comprobante'}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex items-center justify-end gap-2">
                <button type="button" onClick={() => setIsPagoLuzOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-600">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingLuzPago}
                  className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{savingLuzPago ? 'Registrando...' : 'Confirmar Pago de Luz'}</span>
                </button>
              </div>
            </form>
          </div>

          <FotoUploaderModal
            isOpen={isPhotoLuzOpen}
            onClose={() => setIsPhotoLuzOpen(false)}
            onPhotoSaved={(url) => setFotoPagoLuz(url)}
            currentUrl={fotoPagoLuz}
            titulo="Comprobante de Pago Factura de Luz"
            categoria="Facturas_Generales"
            anio={guardiaAnio}
            mes={guardiaMes}
            customName={`Pago_Factura_Luz_${guardiaAnio}-${guardiaMes}.jpg`}
          />
        </div>
      )}

      {/* Modal: Cargar / Editar Factura de Agua (Pendiente de Pago) */}
      {isCargaAguaOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md max-h-[88dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
            <div className="shrink-0 bg-slate-900 px-5 py-3.5 text-white flex items-center justify-between">
              <div className="min-w-0">
                <h3 className="font-bold text-sm sm:text-base truncate">Factura de Agua del Mes</h3>
                <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                  {MESES[guardiaMes]} {guardiaAnio} • Queda en Pendiente de Pago (sin descontar caja)
                </p>
              </div>
              <button type="button" onClick={() => setIsCargaAguaOpen(false)} className="p-1.5 text-slate-300 hover:text-white shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCargaAgua} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
                <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-200 space-y-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-900 block">
                    Desglose de Factura de Agua (Centavos exactos)
                  </span>
                  <div className="space-y-2.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Servicio de Agua Potable (Bs) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        required
                        value={aguaPotableInput}
                        onChange={(e) => setAguaPotableInput(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Servicio de Alcantarillado Sanitario (Bs)
                      </label>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        value={aguaAlcantarilladoInput}
                        onChange={(e) => setAguaAlcantarilladoInput(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Aporte de Socio (Bs)
                      </label>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        value={aguaAporteSocioInput}
                        onChange={(e) => setAguaAporteSocioInput(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-bold"
                      />
                    </div>
                  </div>
                  <div className="pt-2 border-t border-blue-200 flex items-center justify-between text-xs">
                    <span className="font-bold text-blue-950">Total Factura de Agua:</span>
                    <span className="text-base font-extrabold text-blue-700">{totalFacturaAguaModal.toFixed(2)} Bs</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-600">Foto Factura de Agua (Drive):</span>
                  <div className="flex items-center gap-2">
                    {fotoFacturaAguaInput && (
                      <a href={fotoFacturaAguaInput} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                        Ver
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsPhotoFacturaAguaOpen(true)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold text-slate-700 flex items-center gap-1"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>{fotoFacturaAguaInput ? 'Cambiar Foto' : 'Subir Factura'}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex items-center justify-end gap-2">
                <button type="button" onClick={() => setIsCargaAguaOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-600">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingCargaAgua}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingCargaAgua ? 'Guardando...' : 'Guardar Factura'}</span>
                </button>
              </div>
            </form>
          </div>

          <FotoUploaderModal
            isOpen={isPhotoFacturaAguaOpen}
            onClose={() => setIsPhotoFacturaAguaOpen(false)}
            onPhotoSaved={(url) => setFotoFacturaAguaInput(url)}
            currentUrl={fotoFacturaAguaInput}
            titulo={`Factura de Agua ${MESES[guardiaMes]} ${guardiaAnio}`}
            categoria="Facturas_Generales"
            anio={guardiaAnio}
            mes={guardiaMes}
            customName={`Factura_Agua_${guardiaAnio}-${guardiaMes}.jpg`}
          />
        </div>
      )}

      {/* Modal: Registrar Pago de Factura de Agua */}
      {isPagoAguaOpen && periodoFijo && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md max-h-[88dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
            <div className="shrink-0 bg-slate-900 px-5 py-3.5 text-white flex items-center justify-between">
              <div className="min-w-0">
                <h3 className="font-bold text-sm sm:text-base truncate">Registrar Pago de Factura de Agua</h3>
                <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                  {MESES[guardiaMes]} {guardiaAnio} • Total: {parseFloat(periodoFijo.factura_agua_bs || 0).toFixed(2)} Bs
                </p>
              </div>
              <button type="button" onClick={() => setIsPagoAguaOpen(false)} className="p-1.5 text-slate-300 hover:text-white shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmarPagoAgua} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900">
                  Se marcará la factura como <strong>Pagada</strong> y se creará el egreso automático en{' '}
                  <strong>Caja Servicios</strong> (categoría <em>Factura de Agua</em>) por{' '}
                  <strong>{parseFloat(periodoFijo.factura_agua_bs || 0).toFixed(2)} Bs</strong>.
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha Real de Pago</label>
                  <input
                    type="date"
                    required
                    value={fechaPagoAgua}
                    onChange={(e) => setFechaPagoAgua(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Método de Pago</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setMetodoPagoAgua('efectivo')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${
                        metodoPagoAgua === 'efectivo'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-slate-50 text-slate-700 border-slate-300'
                      }`}
                    >
                      <Coins className="w-4 h-4" />
                      <span>Efectivo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMetodoPagoAgua('qr')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${
                        metodoPagoAgua === 'qr'
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
                    {fotoPagoAgua && (
                      <a href={fotoPagoAgua} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                        Ver
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsPhotoPagoAguaOpen(true)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold text-slate-700 flex items-center gap-1"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>{fotoPagoAgua ? 'Cambiar Foto' : 'Subir Comprobante'}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex items-center justify-end gap-2">
                <button type="button" onClick={() => setIsPagoAguaOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-600">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingPagoAgua}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{savingPagoAgua ? 'Registrando...' : 'Confirmar Pago de Agua'}</span>
                </button>
              </div>
            </form>
          </div>

          <FotoUploaderModal
            isOpen={isPhotoPagoAguaOpen}
            onClose={() => setIsPhotoPagoAguaOpen(false)}
            onPhotoSaved={(url) => setFotoPagoAgua(url)}
            currentUrl={fotoPagoAgua}
            titulo="Comprobante de Pago Factura de Agua"
            categoria="Facturas_Generales"
            anio={guardiaAnio}
            mes={guardiaMes}
            customName={`Pago_Factura_Agua_${guardiaAnio}-${guardiaMes}.jpg`}
          />
        </div>
      )}
    </>
  )
}
