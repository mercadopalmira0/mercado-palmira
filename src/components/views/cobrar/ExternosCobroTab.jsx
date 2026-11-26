import React from 'react'
import { MESES } from '../../../lib/formatters'
import {
  Search,
  Coins,
  QrCode,
  CheckCircle2,
  X,
  ShieldAlert,
  Edit2,
  Trash2,
} from 'lucide-react'

export default function ExternosCobroTab({
  selectedMes,
  selectedAnio,
  searchTerm,
  setSearchTerm,
  loadingExternos,
  filteredExternos,
  cobrosExternos,
  isAdmin,
  openCobrarExternoModal,
  openEditCobroExternoModal,
  setEditarMontosTarget,
  anulandoExtId,
  setAnulandoExtId,
  motivoAnulExt,
  setMotivoAnulExt,
  handleAnularCobroExterno,
  setConfirmExtState,
  // Modal Cobro Externo
  selectedExternoPago,
  setSelectedExternoPago,
  editingExtCobro,
  extGuardia,
  setExtGuardia,
  extAgua,
  setExtAgua,
  extMotivoEdicion,
  setExtMotivoEdicion,
  extFecha,
  setExtFecha,
  extMetodo,
  setExtMetodo,
  extTalonario,
  setExtTalonario,
  extObs,
  setExtObs,
  savingExterno,
  handleSaveCobroExterno,
}) {
  return (
    <>
      <div className="space-y-4">
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 text-xs text-indigo-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <p className="font-bold">
              Aportantes Externos (No Socios) — {MESES[selectedMes]} {selectedAnio}
            </p>
            <p className="text-indigo-700 mt-0.5">
              Solo aportan para Guardia y Agua según monto individual sugerido (editable al cobrar).{' '}
              <strong>Nunca aplican multas ni retrasos</strong> y suman a Caja Servicios.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar aportante externo por nombre o ubicación..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {loadingExternos ? (
          <div className="p-10 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500">
            Cargando externos...
          </div>
        ) : filteredExternos.length === 0 ? (
          <div className="p-10 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500">
            No hay aportantes externos activos. Regístralos en la pestaña{' '}
            <strong>Socios → Externos (No Socios)</strong>.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredExternos.map((ext) => {
              const pagosDelMes = cobrosExternos.filter((ce) => ce.externo_id === ext.id)
              const pagosActivosMes = pagosDelMes.filter((ce) => !ce.anulado)
              const totalPagadoMes = pagosActivosMes.reduce(
                (s, p) => s + (parseFloat(p.monto_pagado) || 0),
                0
              )

              return (
                <div key={ext.id} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-slate-900">{ext.nombre_completo}</h4>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">
                          Externo • Sin Multa
                        </span>
                        {totalPagadoMes > 0 && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Pagado {totalPagadoMes.toFixed(2)} Bs
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {ext.referencia_ubicacion || 'Sin referencia'} • Base:{' '}
                        <strong>{parseFloat(ext.monto_mensual_sugerido || 0).toFixed(2)} Bs/mes</strong>{' '}
                        <span className="text-[11px] text-indigo-700">
                          (Guardia {(parseFloat(ext.monto_guardia_base ?? 40) || 0).toFixed(0)} + Agua{' '}
                          {(parseFloat(ext.monto_agua_base ?? 10) || 0).toFixed(0)})
                        </span>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => openCobrarExternoModal(ext)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 self-start sm:self-center"
                    >
                      <Coins className="w-3.5 h-3.5" />
                      <span>Registrar Cobro ({MESES[selectedMes]})</span>
                    </button>
                  </div>

                  {pagosDelMes.length > 0 && (
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 divide-y divide-slate-200/70">
                      {pagosDelMes.map((p) => (
                        <div key={p.id} className="py-2 first:pt-0 last:pb-0 text-xs space-y-1.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`font-bold ${p.anulado ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                                {parseFloat(p.monto_pagado).toFixed(2)} Bs
                              </span>
                              <span className="text-[11px] text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                                G: {(parseFloat(p.monto_guardia ?? ext.monto_guardia_base ?? 40) || 0).toFixed(2)} • A:{' '}
                                {(parseFloat(p.monto_agua ?? ext.monto_agua_base ?? 10) || 0).toFixed(2)}
                              </span>
                              {p.es_monto_editado && (
                                <span
                                  title={p.motivo_edicion_monto || 'Monto ajustado'}
                                  className="text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.5 rounded"
                                >
                                  Monto ajustado
                                </span>
                              )}
                              <span className="text-slate-500">
                                ({p.metodo_pago === 'qr' ? 'QR' : 'Efectivo'}) • {p.fecha_pago}
                              </span>
                              {p.nro_talonario_fisico && (
                                <span className="font-mono text-[10px] bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                  Tal. {p.nro_talonario_fisico}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5">
                              {p.anulado ? (
                                <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded">
                                  Anulado
                                </span>
                              ) : (
                                isAdmin && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setEditarMontosTarget({
                                          tipo: 'externo',
                                          cobro: p,
                                          externoNombre: ext.nombre_completo,
                                        })
                                      }
                                      className="px-2 py-0.5 text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded"
                                    >
                                      Editar Montos
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => openEditCobroExternoModal(ext, p)}
                                      title="Editar cobro externo"
                                      className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setAnulandoExtId(p.id)
                                        setMotivoAnulExt('')
                                      }}
                                      className="text-orange-600 hover:bg-orange-50 px-2 py-0.5 rounded font-semibold"
                                    >
                                      Anular
                                    </button>
                                  </>
                                )
                              )}
                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => setConfirmExtState({ open: true, tipo: 'eliminacion', target: p })}
                                  title="Eliminar cobro externo"
                                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {p.anulado && p.motivo_anulacion && (
                            <p className="text-[11px] text-red-700">Motivo: {p.motivo_anulacion}</p>
                          )}

                          {anulandoExtId === p.id && (
                            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                              <span className="font-bold text-amber-900 flex items-center gap-1 text-[11px]">
                                <ShieldAlert className="w-3.5 h-3.5" /> Motivo obligatorio de anulación
                              </span>
                              <input
                                type="text"
                                value={motivoAnulExt}
                                onChange={(e) => setMotivoAnulExt(e.target.value)}
                                placeholder="Motivo..."
                                className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded text-xs"
                              />
                              <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => setAnulandoExtId(null)} className="text-slate-600">
                                  Cancelar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAnularCobroExterno(p.id)}
                                  className="px-3 py-1 bg-red-600 text-white rounded font-bold"
                                >
                                  Confirmar
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal: Cobrar a Externo */}
      {selectedExternoPago && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md max-h-[88dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
            <div className="shrink-0 bg-slate-900 px-5 py-3.5 text-white flex items-center justify-between">
              <div className="min-w-0">
                <h3 className="font-bold text-sm sm:text-base truncate">Cobro Externo (Guardia y Agua)</h3>
                <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                  {selectedExternoPago.nombre_completo} • {MESES[selectedMes]} {selectedAnio}
                </p>
              </div>
              <button type="button" onClick={() => setSelectedExternoPago(null)} className="p-1.5 text-slate-300 hover:text-white shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCobroExterno} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-indigo-950">Desglose Guardia y Agua</span>
                    <span className="font-extrabold text-indigo-700">
                      Total: {((parseFloat(extGuardia) || 0) + (parseFloat(extAgua) || 0)).toFixed(2)} Bs
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-indigo-900 mb-1">Guardia (Bs)</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        required
                        value={extGuardia}
                        onChange={(e) => setExtGuardia(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm bg-white border border-indigo-300 rounded-xl font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-indigo-900 mb-1">Agua (Bs)</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        required
                        value={extAgua}
                        onChange={(e) => setExtAgua(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm bg-white border border-indigo-300 rounded-xl font-bold"
                      />
                    </div>
                  </div>
                  {!editingExtCobro &&
                    (Math.abs((parseFloat(extGuardia) || 0) - (parseFloat(selectedExternoPago.monto_guardia_base ?? 40) || 0)) > 0.009 ||
                      Math.abs((parseFloat(extAgua) || 0) - (parseFloat(selectedExternoPago.monto_agua_base ?? 10) || 0)) > 0.009) && (
                      <div>
                        <label className="block text-[11px] font-bold text-amber-900 mb-1">
                          Motivo del Ajuste (Obligatorio, min. 5 car.)
                        </label>
                        <input
                          type="text"
                          required
                          value={extMotivoEdicion}
                          onChange={(e) => setExtMotivoEdicion(e.target.value)}
                          placeholder="Ej. Puesto cerrado medio mes / reposición..."
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-amber-300 rounded-lg"
                        />
                      </div>
                    )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha de Pago</label>
                  <input
                    type="date"
                    required
                    value={extFecha}
                    onChange={(e) => setExtFecha(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Método de Pago</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setExtMetodo('efectivo')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${
                        extMetodo === 'efectivo'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-slate-50 text-slate-700 border-slate-300'
                      }`}
                    >
                      <Coins className="w-4 h-4" />
                      <span>Efectivo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setExtMetodo('qr')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${
                        extMetodo === 'qr'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-50 text-slate-700 border-slate-300'
                      }`}
                    >
                      <QrCode className="w-4 h-4" />
                      <span>QR / Banco</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">N° Talonario (Opcional)</label>
                  <input
                    type="text"
                    value={extTalonario}
                    onChange={(e) => setExtTalonario(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Observaciones (Opcional)</label>
                  <input
                    type="text"
                    value={extObs}
                    onChange={(e) => setExtObs(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex items-center justify-end gap-2">
                <button type="button" onClick={() => setSelectedExternoPago(null)} className="px-4 py-2 text-xs font-semibold text-slate-600">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingExterno}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{savingExterno ? 'Guardando...' : 'Confirmar Cobro'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
