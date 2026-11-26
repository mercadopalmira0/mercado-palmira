import React from 'react'
import { Search, Phone, Edit2, Trash2, X } from 'lucide-react'

export default function ExternosSociosTab({
  searchTerm,
  setSearchTerm,
  filteredExternos,
  isAdmin,
  openEditExtModal,
  requestDeleteExterno,
  isExtModalOpen,
  setIsExtModalOpen,
  editingExtId,
  handleSaveExterno,
  extNombre,
  setExtNombre,
  extTelefono,
  setExtTelefono,
  extGuardiaBase,
  setExtGuardiaBase,
  extAguaBase,
  setExtAguaBase,
  extUbicacion,
  setExtUbicacion,
  extObs,
  setExtObs,
  extActivo,
  setExtActivo,
  savingExt,
}) {
  return (
    <>
      <div className="space-y-4">
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 text-xs text-indigo-900">
          <strong>Aportantes Externos (No Socios):</strong> Personas fuera de la asociación que aportan únicamente para Guardia y Agua.
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar externo por nombre, ubicación o teléfono..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {filteredExternos.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 text-xs text-slate-500">
            No hay aportantes externos registrados aún.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredExternos.map((ext) => (
              <div
                key={ext.id}
                className={`bg-white rounded-2xl p-4 border shadow-sm space-y-2 ${
                  ext.activo ? 'border-slate-200' : 'border-slate-200 bg-slate-50 opacity-70'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{ext.nombre_completo}</h4>
                    {ext.telefono && (
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3" />
                        <span>{ext.telefono}</span>
                      </p>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditExtModal(ext)}
                        title="Editar externo"
                        className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => requestDeleteExterno(ext)}
                        title="Eliminar externo"
                        className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="bg-indigo-50/60 p-2.5 rounded-xl border border-indigo-100 text-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-indigo-900 font-medium">Aporte Mensual Base:</span>
                    <span className="font-extrabold text-indigo-700">
                      {parseFloat(ext.monto_mensual_sugerido || 0).toFixed(2)} Bs/mes
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-indigo-800">
                    <span className="px-1.5 py-0.5 bg-white rounded border border-indigo-200">
                      Guardia: {(parseFloat(ext.monto_guardia_base ?? 40) || 0).toFixed(2)} Bs
                    </span>
                    <span className="px-1.5 py-0.5 bg-white rounded border border-indigo-200">
                      Agua: {(parseFloat(ext.monto_agua_base ?? 10) || 0).toFixed(2)} Bs
                    </span>
                  </div>
                </div>

                {ext.referencia_ubicacion && (
                  <p className="text-xs text-slate-600">
                    <strong>Ubicación:</strong> {ext.referencia_ubicacion}
                  </p>
                )}
                {ext.observaciones && <p className="text-[11px] text-slate-500 italic">{ext.observaciones}</p>}

                <div className="pt-2 border-t border-slate-100 flex justify-between text-[11px]">
                  <span className={ext.activo ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                    {ext.activo ? 'Activo' : 'Inactivo'}
                  </span>
                  <span className="text-slate-400">Solo Guardia y Agua</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Externo */}
      {isExtModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md max-h-[88dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
            <div className="shrink-0 bg-slate-900 px-5 py-3.5 text-white flex items-center justify-between">
              <div className="min-w-0">
                <h3 className="font-bold text-sm sm:text-base truncate">
                  {editingExtId ? 'Editar Aportante Externo (Auditado)' : 'Registrar Aportante Externo'}
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-400 truncate">Solo aporte de Guardia y Agua</p>
              </div>
              <button type="button" onClick={() => setIsExtModalOpen(false)} className="p-1.5 text-slate-300 hover:text-white shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExterno} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nombre Completo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={extNombre}
                    onChange={(e) => setExtNombre(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={extTelefono}
                    onChange={(e) => setExtTelefono(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-indigo-950">Desglose Mensual Base (Bs)</span>
                    <span className="font-extrabold text-indigo-700">
                      Total: {((parseFloat(extGuardiaBase) || 0) + (parseFloat(extAguaBase) || 0)).toFixed(2)} Bs/mes
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-indigo-900 mb-1">
                        Guardia (Bs) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        required
                        value={extGuardiaBase}
                        onChange={(e) => setExtGuardiaBase(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm bg-white border border-indigo-300 rounded-xl font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-indigo-900 mb-1">
                        Agua (Bs) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        required
                        value={extAguaBase}
                        onChange={(e) => setExtAguaBase(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm bg-white border border-indigo-300 rounded-xl font-bold"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Referencia / Ubicación</label>
                  <input
                    type="text"
                    value={extUbicacion}
                    onChange={(e) => setExtUbicacion(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Observaciones</label>
                  <input
                    type="text"
                    value={extObs}
                    onChange={(e) => setExtObs(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={extActivo}
                    onChange={(e) => setExtActivo(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span>Aportante Activo</span>
                </label>
              </div>

              <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex items-center justify-end gap-2">
                <button type="button" onClick={() => setIsExtModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-600">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingExt}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold"
                >
                  {savingExt ? 'Guardando...' : editingExtId ? 'Actualizar Externo' : 'Guardar Externo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
