import React from 'react'
import {
  Search,
  RefreshCw,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Coins,
} from 'lucide-react'

export default function ConsolidadoDeudoresTab({
  matrizConsolidada,
  consolidadoSearch,
  setConsolidadoSearch,
  consolidadoFilter,
  setConsolidadoFilter,
  loading,
  resumenConsolidadoFiltrado,
  expandedConsolidado,
  toggleExpandConsolidado,
  isAdmin,
  deudasPorId,
  openPagoModal,
  getOrigenBadgeClass,
  getOrigenLabelDetalle,
  totalesConsolidadoFiltrado,
}) {
  return (
    <div className="space-y-6">
      {/* Tarjetas KPI Consolidado General */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border-2 border-red-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 block">
            Total General Por Cobrar (Bs)
          </span>
          <p className="text-2xl font-black text-red-600 mt-1">
            {matrizConsolidada.totales.totalACobrar.toFixed(2)}{' '}
            <span className="text-xs font-bold">Bs</span>
          </p>
          <span className="text-[11px] text-slate-500 font-medium block">
            {matrizConsolidada.totales.cantidadDeudores}{' '}
            {matrizConsolidada.totales.cantidadDeudores === 1 ? 'persona con deuda' : 'personas con deuda'} •{' '}
            {matrizConsolidada.totales.cantidadItems} ítems
          </span>
          {(matrizConsolidada.totales.totalCobrosExtras || 0) > 0 && (
            <span className="text-[10px] font-bold text-purple-700 block mt-0.5">
              Incluye {matrizConsolidada.totales.totalCobrosExtras.toFixed(2)} Bs de Cobros Extras
            </span>
          )}
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
            Servicios Mensuales y Externos (Bs)
          </span>
          <p className="text-xl font-bold text-slate-900 mt-1">
            {matrizConsolidada.totales.totalMensualesYExternos.toFixed(2)}{' '}
            <span className="text-xs font-normal text-slate-500">Bs</span>
          </p>
          <span className="text-[11px] text-slate-400">
            Cobros mensuales + aportantes externos
          </span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
            Deudas Heredadas / Ciclos (Bs)
          </span>
          <p className="text-xl font-bold text-slate-900 mt-1">
            {matrizConsolidada.totales.totalHeredados.toFixed(2)}{' '}
            <span className="text-xs font-normal text-slate-500">Bs</span>
          </p>
          <span className="text-[11px] text-slate-400">
            Saldos arrastrados y tesorero anterior
          </span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">
            Afiliaciones Pendientes (Bs)
          </span>
          <p className="text-xl font-bold text-slate-900 mt-1">
            {matrizConsolidada.totales.totalAfiliaciones.toFixed(2)}{' '}
            <span className="text-xs font-normal text-slate-500">Bs</span>
          </p>
          <span className="text-[11px] text-slate-400">
            Planes de afiliación con saldo activo
          </span>
        </div>
      </div>

      {/* Buscador y Filtros Rápidos */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={consolidadoSearch}
            onChange={(e) => setConsolidadoSearch(e.target.value)}
            placeholder="Buscar por nombre, N° puesto o detalle de deuda..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          {[
            { id: 'todos', label: 'Todos' },
            { id: 'mensual', label: 'Con Deuda Mensual' },
            { id: 'heredado', label: 'Con Deuda Heredada' },
            { id: 'afiliacion', label: 'Con Afiliación' },
            { id: 'cobro_extra', label: 'Con Cobro Extra' },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setConsolidadoFilter(opt.id)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                consolidadoFilter === opt.id
                  ? 'bg-white text-slate-900 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista Consolidada por Persona */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <RefreshCw className="w-8 h-8 mx-auto animate-spin text-red-600 mb-2" />
          <p className="text-xs text-slate-500">Consolidando todas las fuentes de deuda...</p>
        </div>
      ) : resumenConsolidadoFiltrado.length === 0 ? (
        <div className="p-10 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs space-y-2">
          <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400" />
          <p>No hay deudas pendientes para los filtros seleccionados.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {resumenConsolidadoFiltrado.map((d) => {
            const isExpanded = Boolean(expandedConsolidado[d.groupKey])
            return (
              <div
                key={d.groupKey}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
              >
                {/* Cabecera de Persona */}
                <div className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-bold text-sm sm:text-base text-slate-900">
                        {d.nombre}
                      </h4>
                      {d.puestoRef && d.puestoRef !== '-' && (
                        <span className="px-2.5 py-0.5 bg-slate-100 text-slate-800 border border-slate-200 rounded-lg text-[11px] font-bold">
                          {d.puestoRef}
                        </span>
                      )}
                      {d.tieneMensual && (
                        <span className="px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase bg-red-100 text-red-800 border-red-200">
                          Mensual
                        </span>
                      )}
                      {d.tieneExterno && (
                        <span className="px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase bg-indigo-100 text-indigo-800 border-indigo-200">
                          Externo
                        </span>
                      )}
                      {d.tieneHeredado && (
                        <span className="px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase bg-amber-100 text-amber-900 border-amber-200">
                          Heredado
                        </span>
                      )}
                      {d.tieneAfiliacion && (
                        <span className="px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase bg-blue-100 text-blue-800 border-blue-200">
                          Afiliación
                        </span>
                      )}
                      {d.tieneCobroExtra && (
                        <span className="px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase bg-purple-100 text-purple-800 border-purple-200">
                          Cobro Extra
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
                      <span>
                        <strong>{d.cantidadItems}</strong>{' '}
                        {d.cantidadItems === 1 ? 'ítem pendiente' : 'ítems pendientes'}
                      </span>
                      {d.telefono && d.telefono !== '-' && (
                        <span>Tel: {d.telefono}</span>
                      )}
                      {d.multas > 0 && (
                        <span className="text-orange-700 font-semibold">
                          Incluye multas: {d.multas.toFixed(2)} Bs
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between lg:justify-end gap-4 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                    <div className="text-left lg:text-right">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Total a Cobrar
                      </span>
                      <span className="text-lg sm:text-xl font-black text-red-600 font-mono">
                        {d.totalACobrar.toFixed(2)}{' '}
                        <span className="text-xs font-bold">Bs</span>
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleExpandConsolidado(d.groupKey)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors shrink-0"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                      <span>{isExpanded ? 'Ocultar detalle' : 'Ver detalle'}</span>
                    </button>
                  </div>
                </div>

                {/* Acordeón Desplegable */}
                {isExpanded && (
                  <div className="border-t border-slate-200 bg-slate-50/80 p-3 sm:p-4 space-y-2">
                    <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Detalle de conceptos pendientes ({d.cantidadItems})
                    </div>

                    {/* Vista Tabla Desktop */}
                    <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 bg-white">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                            <th className="p-2.5">Origen</th>
                            <th className="p-2.5">Periodo / Detalle</th>
                            <th className="p-2.5 text-right">Monto Original</th>
                            <th className="p-2.5 text-right">Abonado</th>
                            <th className="p-2.5 text-right">Multa</th>
                            <th className="p-2.5 text-right">Saldo Pendiente (Bs)</th>
                            {isAdmin && <th className="p-2.5 text-center">Acción</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {d.items.map((it) => {
                            const deudaCicloObj =
                              it.fuente === 'heredado' ? deudasPorId.get(it.recordId) : null
                            return (
                              <tr key={it.id} className="hover:bg-slate-50/80">
                                <td className="p-2.5 whitespace-nowrap">
                                  <span
                                    className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${getOrigenBadgeClass(
                                      it.fuente
                                    )}`}
                                  >
                                    {getOrigenLabelDetalle(it.fuente)}
                                  </span>
                                </td>
                                <td className="p-2.5 text-slate-800">
                                  <span className="font-semibold">{it.detalle}</span>
                                  {it.puesto && it.puesto !== '-' && it.puesto !== d.puestoRef && (
                                    <span className="ml-2 text-[11px] text-slate-500">
                                      ({it.puesto})
                                    </span>
                                  )}
                                </td>
                                <td className="p-2.5 text-right font-mono text-slate-700">
                                  {it.montoEsperado.toFixed(2)} Bs
                                </td>
                                <td className="p-2.5 text-right font-mono text-emerald-700">
                                  {it.abonado.toFixed(2)} Bs
                                </td>
                                <td className="p-2.5 text-right font-mono text-orange-700">
                                  {it.multa > 0 ? `${it.multa.toFixed(2)} Bs` : '—'}
                                </td>
                                <td className="p-2.5 text-right font-mono font-extrabold text-red-600">
                                  {it.saldoPendiente.toFixed(2)} Bs
                                </td>
                                {isAdmin && (
                                  <td className="p-2.5 text-center whitespace-nowrap">
                                    {deudaCicloObj ? (
                                      <button
                                        type="button"
                                        onClick={() => openPagoModal(deudaCicloObj)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold shadow-sm"
                                      >
                                        <Coins className="w-3.5 h-3.5" />
                                        <span>Cobrar</span>
                                      </button>
                                    ) : (
                                      <span className="text-[11px] text-slate-400">—</span>
                                    )}
                                  </td>
                                )}
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Vista Tarjetas Móvil */}
                    <div className="md:hidden space-y-2">
                      {d.items.map((it) => {
                        const deudaCicloObj =
                          it.fuente === 'heredado' ? deudasPorId.get(it.recordId) : null
                        return (
                          <div
                            key={it.id}
                            className="bg-white border border-slate-200 rounded-xl p-3 text-xs space-y-2"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="space-y-1 min-w-0">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded-md border text-[10px] font-bold ${getOrigenBadgeClass(
                                    it.fuente
                                  )}`}
                                >
                                  {getOrigenLabelDetalle(it.fuente)}
                                </span>
                                <p className="font-semibold text-slate-800 break-words">
                                  {it.detalle}
                                </p>
                                {it.puesto && it.puesto !== '-' && it.puesto !== d.puestoRef && (
                                  <p className="text-[11px] text-slate-500">{it.puesto}</p>
                                )}
                              </div>
                              <div className="text-right shrink-0">
                                <span className="text-[10px] text-slate-400 uppercase block">
                                  Saldo
                                </span>
                                <span className="font-mono font-extrabold text-red-600 text-sm">
                                  {it.saldoPendiente.toFixed(2)} Bs
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-[11px]">
                              <div>
                                <span className="text-slate-400 block">Original</span>
                                <span className="font-mono font-semibold text-slate-700">
                                  {it.montoEsperado.toFixed(2)} Bs
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block">Abonado</span>
                                <span className="font-mono font-semibold text-emerald-700">
                                  {it.abonado.toFixed(2)} Bs
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block">Multa</span>
                                <span className="font-mono font-semibold text-orange-700">
                                  {it.multa > 0 ? `${it.multa.toFixed(2)} Bs` : '—'}
                                </span>
                              </div>
                            </div>

                            {isAdmin && deudaCicloObj && (
                              <div className="pt-1 flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => openPagoModal(deudaCicloObj)}
                                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm"
                                >
                                  <Coins className="w-3.5 h-3.5" />
                                  <span>Cobrar</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {/* Barra / Fila Final de Totales Filtrados */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Totales del Consolidado Filtrado
              </span>
              <p className="text-sm font-bold mt-0.5">
                {totalesConsolidadoFiltrado.cantidadDeudores}{' '}
                {totalesConsolidadoFiltrado.cantidadDeudores === 1 ? 'deudor' : 'deudores'} •{' '}
                {totalesConsolidadoFiltrado.cantidadItems}{' '}
                {totalesConsolidadoFiltrado.cantidadItems === 1 ? 'ítem' : 'ítems'}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase block">Original</span>
                <span className="font-mono font-bold">
                  {totalesConsolidadoFiltrado.totalOriginal.toFixed(2)} Bs
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block">Abonado</span>
                <span className="font-mono font-bold text-emerald-400">
                  {totalesConsolidadoFiltrado.totalAbonado.toFixed(2)} Bs
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block">Multas</span>
                <span className="font-mono font-bold text-amber-300">
                  {totalesConsolidadoFiltrado.totalMultas.toFixed(2)} Bs
                </span>
              </div>
              <div>
                <span className="text-[10px] text-red-300 uppercase block font-bold">
                  Total Por Cobrar
                </span>
                <span className="font-mono font-black text-base text-red-400">
                  {totalesConsolidadoFiltrado.totalACobrar.toFixed(2)} Bs
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
