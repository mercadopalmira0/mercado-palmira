import React from 'react'
import {
  UserX,
  Search,
  RefreshCw,
  Coins,
  History,
  Edit2,
  Trash2,
} from 'lucide-react'

export default function HeredadosCiclosTab({
  saldoServiciosPend,
  saldoAfiliacionesPend,
  totalRecuperado,
  searchTerm,
  setSearchTerm,
  filterCaja,
  setFilterCaja,
  filterOrigen,
  setFilterOrigen,
  filterEstado,
  setFilterEstado,
  loading,
  filteredDeudas,
  isAdmin,
  openPagoModal,
  onOpenHistorial,
  openEditDeudaModal,
  anulandoDeudaId,
  setAnulandoDeudaId,
  motivoAnulDeuda,
  setMotivoAnulDeuda,
  handleAnularDeuda,
  setConfirmState,
}) {
  return (
    <>
      {/* Tarjetas Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 block">Por Cobrar Total</span>
          <p className="text-xl font-bold text-red-600 mt-1">
            {(saldoServiciosPend + saldoAfiliacionesPend).toFixed(2)} <span className="text-xs font-normal">Bs</span>
          </p>
          <span className="text-[11px] text-slate-400">Suma de saldos pendientes</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">Pendiente Caja Servicios</span>
          <p className="text-xl font-bold text-slate-900 mt-1">
            {saldoServiciosPend.toFixed(2)} <span className="text-xs font-normal text-slate-500">Bs</span>
          </p>
          <span className="text-[11px] text-slate-400">Al cobrarse suma a Servicios</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">Pendiente Caja Afiliaciones</span>
          <p className="text-xl font-bold text-slate-900 mt-1">
            {saldoAfiliacionesPend.toFixed(2)} <span className="text-xs font-normal text-slate-500">Bs</span>
          </p>
          <span className="text-[11px] text-slate-400">Al cobrarse suma a Afiliaciones</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">Total Recuperado</span>
          <p className="text-xl font-bold text-emerald-700 mt-1">
            {totalRecuperado.toFixed(2)} <span className="text-xs font-normal text-slate-500">Bs</span>
          </p>
          <span className="text-[11px] text-slate-400">Abonos recibidos en caja</span>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col lg:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, puesto o detalle de deuda..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select value={filterCaja} onChange={(e) => setFilterCaja(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700">
            <option value="todos">Todas las Cajas</option>
            <option value="servicios">Caja Servicios</option>
            <option value="afiliaciones">Caja Afiliaciones</option>
          </select>

          <select value={filterOrigen} onChange={(e) => setFilterOrigen(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700">
            <option value="todos">Todos los Orígenes</option>
            <option value="tesorero_anterior">Tesorero Anterior</option>
            <option value="cierre_ciclo">Cierre de Ciclo</option>
          </select>

          <select value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700">
            <option value="activos">Pendientes / Parciales</option>
            <option value="pagado">Pagados</option>
            <option value="anulado">Anulados</option>
            <option value="todos">Todos</option>
          </select>
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <RefreshCw className="w-8 h-8 mx-auto animate-spin text-emerald-600 mb-2" />
          <p className="text-xs text-slate-500">Cargando registro de deudores...</p>
        </div>
      ) : filteredDeudas.length === 0 ? (
        <div className="p-10 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs space-y-2">
          <UserX className="w-10 h-10 mx-auto text-slate-300" />
          <p>No existen registros de deudas con los filtros seleccionados.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDeudas.map((d) => {
            const orig = parseFloat(d.monto_original) || 0
            const pag = parseFloat(d.monto_pagado) || 0
            const saldo = Math.max(0, orig - pag)
            const isAnulado = d.estado === 'anulado'
            const isPagado = d.estado === 'pagado'

            return (
              <div
                key={d.id}
                className={`bg-white rounded-2xl p-4 border shadow-sm space-y-2 ${
                  isAnulado ? 'border-red-200 bg-red-50/30 opacity-80' : isPagado ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className={`font-bold text-sm ${isAnulado ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                        {d.nombre_deudor}
                      </h4>
                      {d.puesto_referencia && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-semibold">
                          {d.puesto_referencia}
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          d.caja === 'servicios' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        Caja {d.caja}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                        {d.origen === 'cierre_ciclo' ? `Cierre: ${d.ciclo_origen || 'Ciclo'}` : `Heredado: ${d.ciclo_origen || 'Tesorero Anterior'}`}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          isAnulado ? 'bg-red-100 text-red-700' : isPagado ? 'bg-emerald-100 text-emerald-800' : d.estado === 'parcial' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {d.estado}
                      </span>
                    </div>
                    <p className={`text-xs text-slate-600 ${isAnulado ? 'line-through' : ''}`}>
                      <strong>Detalle:</strong> {d.detalle_deuda}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Original</span>
                      <span className="font-bold text-slate-800">{orig.toFixed(2)} Bs</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Pagado</span>
                      <span className="font-bold text-emerald-700">{pag.toFixed(2)} Bs</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Saldo</span>
                      <span className={`text-base font-extrabold ${saldo > 0 && !isAnulado ? 'text-red-600' : 'text-emerald-700'}`}>
                        {isAnulado ? '0.00' : saldo.toFixed(2)} Bs
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {!isAnulado && !isPagado && isAdmin && (
                        <button
                          type="button"
                          onClick={() => openPagoModal(d)}
                          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1 shadow-sm"
                        >
                          <Coins className="w-3.5 h-3.5" />
                          <span>Cobrar</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onOpenHistorial(d)}
                        className="p-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50"
                        title="Historial de abonos"
                      >
                        <History className="w-4 h-4" />
                      </button>
                      {isAdmin && (
                        <>
                          <button
                            type="button"
                            onClick={() => openEditDeudaModal(d)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl"
                            title="Editar deuda"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {!isAnulado && (
                            <button
                              type="button"
                              onClick={() => {
                                setAnulandoDeudaId(d.id)
                                setMotivoAnulDeuda('')
                              }}
                              className="px-2 py-1.5 text-orange-600 hover:bg-orange-50 rounded-xl font-semibold"
                            >
                              Anular
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmState({
                                open: true,
                                tipo: 'eliminacion',
                                entity: 'deuda',
                                target: d,
                                advertencia:
                                  (d.pagos_deudores_ciclos || []).length > 0
                                    ? `¡Atención! Tiene ${d.pagos_deudores_ciclos.length} abono(s) registrado(s) que también se eliminarán y afectarán el saldo de caja.`
                                    : '',
                              })
                            }
                            className="p-2 text-red-600 hover:bg-red-50 rounded-xl"
                            title="Eliminar deuda cargada por error"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {isAnulado && d.motivo_anulacion && (
                  <p className="text-[11px] text-red-700 bg-red-50 p-2 rounded-lg">
                    <strong>Motivo anulación:</strong> {d.motivo_anulacion}
                  </p>
                )}

                {anulandoDeudaId === d.id && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs">
                    <span className="font-bold text-amber-900 block">Motivo de Anulación Obligatorio</span>
                    <input
                      type="text"
                      value={motivoAnulDeuda}
                      onChange={(e) => setMotivoAnulDeuda(e.target.value)}
                      placeholder="Indica por qué se anula esta deuda..."
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg"
                    />
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setAnulandoDeudaId(null)} className="text-slate-600">
                        Cancelar
                      </button>
                      <button type="button" onClick={() => handleAnularDeuda(d.id)} className="px-3 py-1 bg-red-600 text-white rounded-lg font-bold">
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
    </>
  )
}
