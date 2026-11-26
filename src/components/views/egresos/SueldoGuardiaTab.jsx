import React from 'react'
import { MESES } from '../../../lib/formatters'
import FotoUploaderModal from '../../modals/FotoUploaderModal'
import {
  Save,
  ExternalLink,
  Edit2,
  Trash2,
  X,
  Coins,
  QrCode,
  Camera,
  CheckCircle2,
} from 'lucide-react'

export default function SueldoGuardiaTab({
  isAdmin,
  guardiaMes,
  setGuardiaMes,
  guardiaAnio,
  setGuardiaAnio,
  sueldoMensual,
  setSueldoMensual,
  tarifaId,
  savingSueldo,
  totalAdelantosGuardia,
  saldoPendienteGuardia,
  pagosGuardia,
  tiposGuardia,
  openEditGuardiaModal,
  anulandoGuardiaId,
  setAnulandoGuardiaId,
  motivoAnulGuardia,
  setMotivoAnulGuardia,
  handleAnularPagoGuardia,
  setConfirmState,
  // Modal Pago Guardia
  isGuardiaModalOpen,
  setIsGuardiaModalOpen,
  editingGuardia,
  gTipo,
  setGTipo,
  gMonto,
  setGMonto,
  gFecha,
  setGFecha,
  gMetodo,
  setGMetodo,
  gObs,
  setGObs,
  gFotoUrl,
  setGFotoUrl,
  isGuardiaPhotoOpen,
  setIsGuardiaPhotoOpen,
  savingGuardia,
  handleSavePagoGuardia,
}) {
  return (
    <>
      <div className="space-y-5">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-600">Mes de Control:</span>
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1">
              <select
                value={guardiaMes}
                onChange={(e) => setGuardiaMes(parseInt(e.target.value, 10))}
                className="bg-transparent font-bold text-slate-800 py-1 px-2 focus:outline-none"
              >
                {MESES.slice(1).map((m, i) => (
                  <option key={i + 1} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                value={guardiaAnio}
                onChange={(e) => setGuardiaAnio(parseInt(e.target.value, 10))}
                className="bg-transparent font-bold text-slate-800 py-1 px-2 border-l border-slate-200 focus:outline-none"
              >
                {[2024, 2025, 2026, 2027, 2028].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <label className="font-semibold text-slate-700">Sueldo Mensual (Bs):</label>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              disabled={!isAdmin}
              value={sueldoMensual}
              onChange={(e) => setSueldoMensual(e.target.value)}
              className="w-28 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900"
            />
            {isAdmin && (
              <button
                type="button"
                onClick={() =>
                  setConfirmState({
                    open: true,
                    tipo: 'edicion',
                    entity: 'sueldo',
                    target: { id: tarifaId },
                    advertencia: '',
                  })
                }
                disabled={savingSueldo}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center gap-1"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Guardar</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Sueldo Mensual</span>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">
              {(parseFloat(sueldoMensual) || 0).toFixed(2)} <span className="text-xs font-normal text-slate-500">Bs</span>
            </p>
            <span className="text-[11px] text-slate-400">
              {MESES[guardiaMes]} {guardiaAnio}
            </span>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-emerald-200 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">Total Adelantos Entregados</span>
            <p className="text-2xl font-extrabold text-emerald-700 mt-1">
              {totalAdelantosGuardia.toFixed(2)} <span className="text-xs font-normal text-slate-500">Bs</span>
            </p>
            <span className="text-[11px] text-slate-400">Cargado en Egresos Servicios</span>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-amber-200 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">Saldo Pendiente por Pagar</span>
            <p className="text-2xl font-extrabold text-amber-700 mt-1">
              {saldoPendienteGuardia.toFixed(2)} <span className="text-xs font-normal text-slate-500">Bs</span>
            </p>
            <span className="text-[11px] text-slate-400">Restante del sueldo del mes</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Movimientos del Guardia — {MESES[guardiaMes]} {guardiaAnio} ({pagosGuardia.length})
            </span>
          </div>

          {pagosGuardia.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No se registraron adelantos ni pagos al guardia en {MESES[guardiaMes]} {guardiaAnio}.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {pagosGuardia.map((p) => {
                const tipoLabel = tiposGuardia.find((t) => t.value === p.tipo)?.label || p.tipo
                return (
                  <div key={p.id} className="p-4 text-xs space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[11px]">
                          {tipoLabel}
                        </span>
                        <span className={`font-bold text-sm ${p.anulado ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                          {parseFloat(p.monto).toFixed(2)} Bs
                        </span>
                        <span className="text-slate-500">
                          • {p.fecha_pago} • {p.metodo_pago === 'qr' ? 'QR / Banco' : 'Efectivo'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {p.foto_vale_url && (
                          <a href={p.foto_vale_url} target="_blank" rel="noreferrer" className="p-1.5 bg-blue-50 text-blue-600 rounded-lg inline-flex items-center gap-1 text-[11px] font-semibold">
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Ver Vale</span>
                          </a>
                        )}
                        {p.anulado ? (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-bold">Anulado</span>
                        ) : (
                          isAdmin && (
                            <>
                              <button type="button" onClick={() => openEditGuardiaModal(p)} title="Editar pago" className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg">
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setAnulandoGuardiaId(p.id)
                                  setMotivoAnulGuardia('')
                                }}
                                className="text-orange-600 hover:bg-orange-50 px-2 py-1 rounded font-semibold"
                              >
                                Anular
                              </button>
                            </>
                          )
                        )}
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmState({
                                open: true,
                                tipo: 'eliminacion',
                                entity: 'guardia',
                                target: p,
                                advertencia: p.egreso_id ? 'Se eliminará también su egreso vinculado en Caja Servicios.' : '',
                              })
                            }
                            title="Eliminar pago guardia"
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {p.observaciones && <p className="text-slate-600">{p.observaciones}</p>}
                    {p.anulado && p.motivo_anulacion && (
                      <p className="text-[11px] text-red-700 bg-red-50 p-2 rounded">
                        <strong>Motivo anulación:</strong> {p.motivo_anulacion}
                      </p>
                    )}

                    {anulandoGuardiaId === p.id && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                        <span className="font-bold text-amber-900 block">
                          Motivo obligatorio (anulará también el egreso vinculado en Caja Servicios)
                        </span>
                        <input
                          type="text"
                          value={motivoAnulGuardia}
                          onChange={(e) => setMotivoAnulGuardia(e.target.value)}
                          placeholder="Escribe el motivo..."
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg"
                        />
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => setAnulandoGuardiaId(null)} className="text-slate-600">
                            Cancelar
                          </button>
                          <button type="button" onClick={() => handleAnularPagoGuardia(p)} className="px-3 py-1 bg-red-600 text-white rounded-lg font-bold">
                            Confirmar Anulación
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal Crear / Editar Pago Guardia */}
      {isGuardiaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md max-h-[88dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
            <div className="shrink-0 bg-slate-900 px-5 py-3.5 text-white flex items-center justify-between">
              <div className="min-w-0">
                <h3 className="font-bold text-sm sm:text-base truncate">
                  {editingGuardia ? 'Editar Pago Guardia (Auditado)' : 'Adelanto / Pago del Guardia'}
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                  {MESES[guardiaMes]} {guardiaAnio} • Sincronizado con Egresos Servicios
                </p>
              </div>
              <button type="button" onClick={() => setIsGuardiaModalOpen(false)} className="p-1.5 text-slate-300 hover:text-white shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePagoGuardia} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de Pago</label>
                  <select value={gTipo} onChange={(e) => setGTipo(e.target.value)} className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-bold">
                    {tiposGuardia.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Monto (Bs)</label>
                    <input type="number" inputMode="decimal" step="0.01" min="0.01" required value={gMonto} onChange={(e) => setGMonto(e.target.value)} className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-bold" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha Real</label>
                    <input type="date" required value={gFecha} onChange={(e) => setGFecha(e.target.value)} className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Método</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => setGMetodo('efectivo')} className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${gMetodo === 'efectivo' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 text-slate-700 border-slate-300'}`}>
                      <Coins className="w-4 h-4" />
                      <span>Efectivo</span>
                    </button>
                    <button type="button" onClick={() => setGMetodo('qr')} className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${gMetodo === 'qr' ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-700 border-slate-300'}`}>
                      <QrCode className="w-4 h-4" />
                      <span>QR / Banco</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Observaciones</label>
                  <input type="text" value={gObs} onChange={(e) => setGObs(e.target.value)} className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl" />
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-600">Foto Vale (Drive):</span>
                  <div className="flex items-center gap-2">
                    {gFotoUrl && (
                      <a href={gFotoUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                        Ver
                      </a>
                    )}
                    <button type="button" onClick={() => setIsGuardiaPhotoOpen(true)} className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold text-slate-700 flex items-center gap-1">
                      <Camera className="w-3.5 h-3.5" />
                      <span>{gFotoUrl ? 'Cambiar Foto' : 'Subir Vale'}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex items-center justify-end gap-2">
                <button type="button" onClick={() => setIsGuardiaModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-600">
                  Cancelar
                </button>
                <button type="submit" disabled={savingGuardia} className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{savingGuardia ? 'Guardando...' : editingGuardia ? 'Actualizar Pago' : 'Confirmar Pago'}</span>
                </button>
              </div>
            </form>
          </div>

          <FotoUploaderModal
            isOpen={isGuardiaPhotoOpen}
            onClose={() => setIsGuardiaPhotoOpen(false)}
            onPhotoSaved={(url) => setGFotoUrl(url)}
            currentUrl={gFotoUrl}
            titulo="Foto Vale Firmado Guardia"
            categoria="Egresos_Servicios"
            anio={guardiaAnio}
            mes={guardiaMes}
            customName={`Vale_Guardia_${guardiaAnio}-${guardiaMes}_${Date.now()}.jpg`}
          />
        </div>
      )}
    </>
  )
}
