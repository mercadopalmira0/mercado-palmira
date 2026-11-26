import React from 'react'
import { round2 } from '../../../lib/formatters'
import { Search, ChevronDown, ChevronRight } from 'lucide-react'

export default function MatrizDeudoresTab({
  consolidado,
  deudorSearch,
  setDeudorSearch,
  deudorFilter,
  setDeudorFilter,
  expandedDeudores,
  toggleExpandDeudor,
}) {
  const md = consolidado.matrizDeudores || {
    resumenPorDeudor: [],
    detalleDeudas: [],
    totales: {
      deudaPeriodoActual: 0,
      deudaAnterior: 0,
      multas: 0,
      totalACobrar: 0,
      cantidadItems: 0,
      totalEsperadoDetalle: 0,
      totalAbonadoDetalle: 0,
    },
  }
  const q = deudorSearch.trim().toLowerCase()
  const resumenFiltrado = md.resumenPorDeudor.filter((d) => {
    if (deudorFilter === 'periodo_actual' && !d.tienePeriodoActual) return false
    if (deudorFilter === 'deuda_anterior' && !d.tieneDeudaAnterior) return false
    if (!q) return true
    return (
      String(d.nombre || '').toLowerCase().includes(q) ||
      String(d.puestoRef || '').toLowerCase().includes(q) ||
      d.items.some((it) => String(it.detalle || '').toLowerCase().includes(q))
    )
  })

  const detalleFiltrado = resumenFiltrado.flatMap((r) =>
    r.items.filter((it) => {
      if (deudorFilter === 'periodo_actual') return it.tipoCategoria === 'periodo_actual'
      if (deudorFilter === 'deuda_anterior') return it.tipoCategoria === 'deuda_anterior'
      return true
    })
  )

  const totResumenFilt = {
    periodoActual: round2(resumenFiltrado.reduce((s, r) => s + r.deudaPeriodoActual, 0)),
    anterior: round2(resumenFiltrado.reduce((s, r) => s + r.deudaAnterior, 0)),
    multas: round2(resumenFiltrado.reduce((s, r) => s + r.multas, 0)),
    total: round2(resumenFiltrado.reduce((s, r) => s + r.totalACobrar, 0)),
    items: resumenFiltrado.reduce((s, r) => s + r.cantidadItems, 0),
  }

  const totDetalleFilt = {
    esperado: round2(detalleFiltrado.reduce((s, d) => s + d.montoEsperado, 0)),
    abonado: round2(detalleFiltrado.reduce((s, d) => s + d.abonado, 0)),
    saldo: round2(detalleFiltrado.reduce((s, d) => s + d.saldoPendiente, 0)),
    multa: round2(detalleFiltrado.reduce((s, d) => s + d.multa, 0)),
  }

  const origenBadge = (origen) => {
    if (origen === 'Mes actual') return 'bg-red-100 text-red-800 border-red-200'
    if (origen === 'Deuda anterior') return 'bg-amber-100 text-amber-900 border-amber-200'
    if (origen === 'Externo') return 'bg-indigo-100 text-indigo-800 border-indigo-200'
    if (origen === 'Cobro Extra') return 'bg-purple-100 text-purple-800 border-purple-200'
    return 'bg-blue-100 text-blue-800 border-blue-200'
  }

  return (
    <div className="space-y-6 print-container">
      {/* NIVEL A: Matriz Resumen por Deudor */}
      <div className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b pb-4">
          <div>
            <h3 className="text-base font-black text-slate-900">
              Matriz 2A: Resumen Consolidado por Deudor (Total a Cobrar)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Consolida en 1 sola fila por persona las deudas del periodo actual, meses anteriores, externos y deudas heredadas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 no-print">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={deudorSearch}
                onChange={(e) => setDeudorSearch(e.target.value)}
                placeholder="Buscar nombre o puesto..."
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl w-52 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-xs font-semibold">
              {[
                { id: 'todos', label: 'Todos' },
                { id: 'periodo_actual', label: 'Solo Periodo Actual' },
                { id: 'deuda_anterior', label: 'Solo Deuda Anterior' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setDeudorFilter(opt.id)}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    deudorFilter === opt.id
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {resumenFiltrado.length === 0 ? (
          <p className="text-xs text-emerald-700 font-semibold py-4">
            ¡No existen deudores pendientes para los filtros seleccionados!
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse border border-slate-200">
              <thead>
                <tr className="bg-red-900 text-white font-bold">
                  <th className="p-2.5 border-r border-red-800">N° Puesto / Ref</th>
                  <th className="p-2.5 border-r border-red-800">Nombre del Deudor</th>
                  <th className="p-2.5 border-r border-red-800">Teléfono</th>
                  <th className="p-2.5 border-r border-red-800 text-right">Deuda Periodo Actual (Bs)</th>
                  <th className="p-2.5 border-r border-red-800 text-right">Deuda Anterior / Heredada (Bs)</th>
                  <th className="p-2.5 border-r border-red-800 text-right">Multas (Bs)</th>
                  <th className="p-2.5 border-r border-red-800 text-right bg-red-950">TOTAL A COBRAR (Bs)</th>
                  <th className="p-2.5 border-r border-red-800 text-center">Ítems</th>
                  <th className="p-2.5 text-center no-print">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {resumenFiltrado.map((d) => {
                  const isExpanded = Boolean(expandedDeudores[d.groupKey])
                  return (
                    <React.Fragment key={d.groupKey}>
                      <tr className="hover:bg-red-50/30">
                        <td className="p-2.5 border-r border-slate-200 font-bold text-slate-900">{d.puestoRef}</td>
                        <td className="p-2.5 border-r border-slate-200 font-bold">{d.nombre}</td>
                        <td className="p-2.5 border-r border-slate-200">{d.telefono}</td>
                        <td className="p-2.5 border-r border-slate-200 text-right font-mono">
                          {d.deudaPeriodoActual.toFixed(2)}
                        </td>
                        <td className="p-2.5 border-r border-slate-200 text-right font-mono text-amber-800">
                          {d.deudaAnterior.toFixed(2)}
                        </td>
                        <td className="p-2.5 border-r border-slate-200 text-right font-mono">
                          {d.multas.toFixed(2)}
                        </td>
                        <td className="p-2.5 border-r border-slate-200 text-right font-black text-red-700 bg-red-50/40 font-mono">
                          {d.totalACobrar.toFixed(2)}
                        </td>
                        <td className="p-2.5 border-r border-slate-200 text-center font-bold">{d.cantidadItems}</td>
                        <td className="p-2.5 text-center no-print">
                          <button
                            type="button"
                            onClick={() => toggleExpandDeudor(d.groupKey)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold"
                          >
                            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            <span>Ver detalle</span>
                          </button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-slate-50/90">
                          <td colSpan={9} className="p-3 border-b border-slate-200">
                            <div className="text-[11px] font-bold text-slate-700 mb-1.5">
                              Desglose de deuda para {d.nombre}:
                            </div>
                            <div className="space-y-1">
                              {d.items.map((it) => (
                                <div
                                  key={it.id}
                                  className="flex flex-wrap items-center justify-between gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-[11px]"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${origenBadge(it.origen)}`}>
                                      {it.origen}
                                    </span>
                                    <span className="font-semibold text-slate-800">{it.puesto}</span>
                                    <span className="text-slate-600">{it.detalle}</span>
                                  </div>
                                  <div className="font-mono font-bold text-red-700">
                                    Saldo: {it.saldoPendiente.toFixed(2)} Bs
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-900 text-white font-black">
                  <td colSpan={3} className="p-2.5 border-r border-slate-700 text-right uppercase">
                    TOTALES ({resumenFiltrado.length} deudores):
                  </td>
                  <td className="p-2.5 border-r border-slate-700 text-right font-mono">
                    {totResumenFilt.periodoActual.toFixed(2)}
                  </td>
                  <td className="p-2.5 border-r border-slate-700 text-right font-mono text-amber-300">
                    {totResumenFilt.anterior.toFixed(2)}
                  </td>
                  <td className="p-2.5 border-r border-slate-700 text-right font-mono">
                    {totResumenFilt.multas.toFixed(2)}
                  </td>
                  <td className="p-2.5 border-r border-slate-700 text-right font-mono text-emerald-400">
                    {totResumenFilt.total.toFixed(2)} Bs
                  </td>
                  <td className="p-2.5 border-r border-slate-700 text-center">
                    {totResumenFilt.items}
                  </td>
                  <td className="p-2.5 no-print" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* NIVEL B: Tabla completa de Detalle de qué deben */}
      <div className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="border-b pb-3">
          <h3 className="text-base font-black text-slate-900">
            Matriz 2B: Detalle Completo de Conceptos Impagos
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Desglose individual de cada mes, cuota o deuda heredada que compone el total a cobrar.
          </p>
        </div>

        {detalleFiltrado.length === 0 ? (
          <p className="text-xs text-slate-500 italic">Sin conceptos impagos para mostrar.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse border border-slate-200">
              <thead>
                <tr className="bg-slate-800 text-white font-bold">
                  <th className="p-2.5 border-r border-slate-700">Nombre</th>
                  <th className="p-2.5 border-r border-slate-700">Puesto</th>
                  <th className="p-2.5 border-r border-slate-700">Origen</th>
                  <th className="p-2.5 border-r border-slate-700">Periodo / Detalle</th>
                  <th className="p-2.5 border-r border-slate-700 text-right">Monto Esperado (Bs)</th>
                  <th className="p-2.5 border-r border-slate-700 text-right">Abonado (Bs)</th>
                  <th className="p-2.5 border-r border-slate-700 text-right">Saldo Pendiente (Bs)</th>
                  <th className="p-2.5 text-right">Multa (Bs)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {detalleFiltrado.map((it) => (
                  <tr key={it.id} className="hover:bg-slate-50">
                    <td className="p-2 border-r border-slate-200 font-bold text-slate-900">{it.nombre}</td>
                    <td className="p-2 border-r border-slate-200">{it.puesto}</td>
                    <td className="p-2 border-r border-slate-200">
                      <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${origenBadge(it.origen)}`}>
                        {it.origen}
                      </span>
                    </td>
                    <td className="p-2 border-r border-slate-200">{it.detalle}</td>
                    <td className="p-2 border-r border-slate-200 text-right font-mono">
                      {it.montoEsperado.toFixed(2)}
                    </td>
                    <td className="p-2 border-r border-slate-200 text-right font-mono text-emerald-700">
                      {it.abonado.toFixed(2)}
                    </td>
                    <td className="p-2 border-r border-slate-200 text-right font-bold font-mono text-red-700">
                      {it.saldoPendiente.toFixed(2)}
                    </td>
                    <td className="p-2 text-right font-mono">{it.multa.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-900 text-white font-black">
                  <td colSpan={4} className="p-2.5 border-r border-slate-700 text-right uppercase">
                    TOTALES ({detalleFiltrado.length} ítems):
                  </td>
                  <td className="p-2.5 border-r border-slate-700 text-right font-mono">
                    {totDetalleFilt.esperado.toFixed(2)}
                  </td>
                  <td className="p-2.5 border-r border-slate-700 text-right font-mono text-emerald-400">
                    {totDetalleFilt.abonado.toFixed(2)}
                  </td>
                  <td className="p-2.5 border-r border-slate-700 text-right font-mono text-amber-300">
                    {totDetalleFilt.saldo.toFixed(2)} Bs
                  </td>
                  <td className="p-2.5 text-right font-mono">
                    {totDetalleFilt.multa.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
