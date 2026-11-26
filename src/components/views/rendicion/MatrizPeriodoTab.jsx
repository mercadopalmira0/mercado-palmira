import React from 'react'
import { MESES, round2 } from '../../../lib/formatters'
import { Search } from 'lucide-react'

export default function MatrizPeriodoTab({
  consolidado,
  mesInicio,
  anioInicio,
  mesFin,
  anioFin,
  matrizSearch,
  setMatrizSearch,
  matrizFilter,
  setMatrizFilter,
}) {
  const mp = consolidado.matrizPeriodo || { meses: [], filasSocios: [], filasExternos: [] }
  const q = matrizSearch.trim().toLowerCase()

  const matchesRow = (f) => {
    if (matrizFilter === 'deben' && f.diferencia <= 0) return false
    if (matrizFilter === 'al_dia' && f.diferencia > 0) return false
    if (!q) return true
    return (
      String(f.puesto || '').toLowerCase().includes(q) ||
      String(f.titular || '').toLowerCase().includes(q) ||
      String(f.integrantes || '').toLowerCase().includes(q)
    )
  }

  const sociosVisibles = mp.filasSocios.filter(matchesRow)
  const externosVisibles = mp.filasExternos.filter(matchesRow)
  const allVisibles = [...sociosVisibles, ...externosVisibles]

  const calcTotals = (rows) => {
    const porMes = {}
    mp.meses.forEach((m) => {
      porMes[m.key] = round2(rows.reduce((s, r) => s + (r.pagosPorMes[m.key] || 0), 0))
    })
    return {
      porMes,
      totalPagado: round2(rows.reduce((s, r) => s + r.totalPagado, 0)),
      totalEsperado: round2(rows.reduce((s, r) => s + r.totalEsperado, 0)),
      diferencia: round2(rows.reduce((s, r) => s + r.diferencia, 0)),
    }
  }
  const totSociosFilt = calcTotals(sociosVisibles)
  const totExternosFilt = calcTotals(externosVisibles)
  const totGenFilt = calcTotals(allVisibles)

  const renderEstadoBadge = (estado) => {
    if (estado === 'Al día') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          Al día
        </span>
      )
    }
    if (estado === 'Parcial') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
          Parcial
        </span>
      )
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
        Debe
      </span>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200 shadow-sm print-container space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b pb-4">
        <div>
          <h3 className="text-base font-black text-slate-900">
            Matriz 1: Control de Cobranza — Solo Periodo ({MESES[mesInicio]} {anioInicio} a {MESES[mesFin]} {anioFin})
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Pagos válidos mes a mes sin mezclar deudas heredadas. Puestos agrupados muestran todos sus integrantes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 no-print">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={matrizSearch}
              onChange={(e) => setMatrizSearch(e.target.value)}
              placeholder="Buscar puesto o socio..."
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl w-52 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-xs font-semibold">
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'deben', label: 'Solo los que deben' },
              { id: 'al_dia', label: 'Al día' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setMatrizFilter(opt.id)}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  matrizFilter === opt.id
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

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse border border-slate-200">
          <thead>
            <tr className="bg-slate-900 text-white font-bold">
              <th className="p-2.5 border-r border-slate-700">N° Puesto</th>
              <th className="p-2.5 border-r border-slate-700">Titular / Responsable</th>
              <th className="p-2.5 border-r border-slate-700">Integrantes / Registro</th>
              {mp.meses.map((m) => (
                <th key={m.key} className="p-2.5 border-r border-slate-700 text-right whitespace-nowrap">
                  {m.shortLabel} (Bs)
                </th>
              ))}
              <th className="p-2.5 border-r border-slate-700 text-right">Total Pagado</th>
              <th className="p-2.5 border-r border-slate-700 text-right">Total Esperado</th>
              <th className="p-2.5 border-r border-slate-700 text-right">Diferencia</th>
              <th className="p-2.5 text-center">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
            {sociosVisibles.length === 0 && externosVisibles.length === 0 ? (
              <tr>
                <td colSpan={7 + mp.meses.length} className="p-6 text-center text-slate-400 italic">
                  No hay registros que coincidan con el filtro seleccionado.
                </td>
              </tr>
            ) : (
              <>
                {sociosVisibles.map((f) => (
                  <tr key={f.id} className={f.diferencia > 0 ? 'bg-red-50/30 hover:bg-red-50/50' : 'hover:bg-slate-50'}>
                    <td className="p-2 border-r border-slate-200 font-bold text-slate-900 whitespace-nowrap">
                      {f.puesto}
                    </td>
                    <td className="p-2 border-r border-slate-200 font-semibold">{f.titular}</td>
                    <td className="p-2 border-r border-slate-200 text-[11px] text-slate-600">{f.integrantes}</td>
                    {mp.meses.map((m) => {
                      const val = f.pagosPorMes[m.key] || 0
                      return (
                        <td
                          key={m.key}
                          className={`p-2 border-r border-slate-200 text-right font-mono ${
                            val > 0 ? 'text-slate-800' : 'text-slate-400'
                          }`}
                        >
                          {val.toFixed(2)}
                        </td>
                      )
                    })}
                    <td className="p-2 border-r border-slate-200 text-right font-bold text-emerald-700">
                      {f.totalPagado.toFixed(2)}
                    </td>
                    <td className="p-2 border-r border-slate-200 text-right">
                      {f.totalEsperado.toFixed(2)}
                    </td>
                    <td
                      className={`p-2 border-r border-slate-200 text-right font-bold ${
                        f.diferencia > 0 ? 'text-red-700' : 'text-slate-500'
                      }`}
                    >
                      {f.diferencia.toFixed(2)}
                    </td>
                    <td className="p-2 text-center">{renderEstadoBadge(f.estado)}</td>
                  </tr>
                ))}

                {sociosVisibles.length > 0 && (
                  <tr className="bg-slate-100 font-bold text-slate-900">
                    <td colSpan={3} className="p-2 border-r border-slate-200 text-right">
                      Subtotal Socios / Grupos ({sociosVisibles.length}):
                    </td>
                    {mp.meses.map((m) => (
                      <td key={m.key} className="p-2 border-r border-slate-200 text-right font-mono">
                        {(totSociosFilt.porMes[m.key] || 0).toFixed(2)}
                      </td>
                    ))}
                    <td className="p-2 border-r border-slate-200 text-right text-emerald-800">
                      {totSociosFilt.totalPagado.toFixed(2)}
                    </td>
                    <td className="p-2 border-r border-slate-200 text-right">
                      {totSociosFilt.totalEsperado.toFixed(2)}
                    </td>
                    <td className="p-2 border-r border-slate-200 text-right text-red-700">
                      {totSociosFilt.diferencia.toFixed(2)}
                    </td>
                    <td className="p-2" />
                  </tr>
                )}

                {externosVisibles.length > 0 && (
                  <>
                    <tr className="bg-indigo-50 border-y border-indigo-200">
                      <td colSpan={7 + mp.meses.length} className="p-2 font-black text-indigo-900 uppercase tracking-wide text-[11px]">
                        Aportantes Externos — Otra Asociación ({externosVisibles.length})
                      </td>
                    </tr>
                    {externosVisibles.map((f) => (
                      <tr key={`ext-${f.id}`} className={f.diferencia > 0 ? 'bg-red-50/30' : 'hover:bg-indigo-50/20'}>
                        <td className="p-2 border-r border-slate-200 font-bold text-indigo-950 whitespace-nowrap">
                          {f.puesto}
                        </td>
                        <td className="p-2 border-r border-slate-200 font-semibold">{f.titular}</td>
                        <td className="p-2 border-r border-slate-200 text-[11px] text-slate-600">{f.integrantes}</td>
                        {mp.meses.map((m) => {
                          const val = f.pagosPorMes[m.key] || 0
                          return (
                            <td
                              key={m.key}
                              className={`p-2 border-r border-slate-200 text-right font-mono ${
                                val > 0 ? 'text-slate-800' : 'text-slate-400'
                              }`}
                            >
                              {val.toFixed(2)}
                            </td>
                          )
                        })}
                        <td className="p-2 border-r border-slate-200 text-right font-bold text-emerald-700">
                          {f.totalPagado.toFixed(2)}
                        </td>
                        <td className="p-2 border-r border-slate-200 text-right">
                          {f.totalEsperado.toFixed(2)}
                        </td>
                        <td
                          className={`p-2 border-r border-slate-200 text-right font-bold ${
                            f.diferencia > 0 ? 'text-red-700' : 'text-slate-500'
                          }`}
                        >
                          {f.diferencia.toFixed(2)}
                        </td>
                        <td className="p-2 text-center">{renderEstadoBadge(f.estado)}</td>
                      </tr>
                    ))}
                    <tr className="bg-indigo-50/70 font-bold text-indigo-950">
                      <td colSpan={3} className="p-2 border-r border-slate-200 text-right">
                        Subtotal Externos ({externosVisibles.length}):
                      </td>
                      {mp.meses.map((m) => (
                        <td key={m.key} className="p-2 border-r border-slate-200 text-right font-mono">
                          {(totExternosFilt.porMes[m.key] || 0).toFixed(2)}
                        </td>
                      ))}
                      <td className="p-2 border-r border-slate-200 text-right text-emerald-800">
                        {totExternosFilt.totalPagado.toFixed(2)}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-right">
                        {totExternosFilt.totalEsperado.toFixed(2)}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-right text-red-700">
                        {totExternosFilt.diferencia.toFixed(2)}
                      </td>
                      <td className="p-2" />
                    </tr>
                  </>
                )}
              </>
            )}
          </tbody>
          <tfoot>
            <tr className="bg-slate-900 text-white font-black">
              <td colSpan={3} className="p-2.5 border-r border-slate-700 text-right uppercase">
                TOTAL GENERAL ({allVisibles.length} filas):
              </td>
              {mp.meses.map((m) => (
                <td key={m.key} className="p-2.5 border-r border-slate-700 text-right font-mono">
                  {(totGenFilt.porMes[m.key] || 0).toFixed(2)}
                </td>
              ))}
              <td className="p-2.5 border-r border-slate-700 text-right text-emerald-400">
                {totGenFilt.totalPagado.toFixed(2)}
              </td>
              <td className="p-2.5 border-r border-slate-700 text-right">
                {totGenFilt.totalEsperado.toFixed(2)}
              </td>
              <td className="p-2.5 border-r border-slate-700 text-right text-amber-300">
                {totGenFilt.diferencia.toFixed(2)}
              </td>
              <td className="p-2.5" />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
