import React from 'react'
import { round2 } from '../../../lib/formatters'
import { Zap, Droplets, Shield, Coins, BarChart3, Clock } from 'lucide-react'

function formatSignedBs(valor) {
  const n = round2(parseFloat(valor) || 0)
  const sign = n > 0 ? '+' : ''
  return `${sign}${n.toFixed(2)} Bs`
}

function getSaldoColorClass(valor) {
  const n = round2(parseFloat(valor) || 0)
  if (n > 0) return 'text-emerald-700'
  if (n < 0) return 'text-red-600'
  return 'text-slate-700'
}

export default function BalanceMensualTab({ consolidado }) {
  const meses = consolidado?.balanceMensualPorRubro || []

  const acumulados = meses.reduce(
    (acc, m) => {
      acc.luzCobrado = round2(acc.luzCobrado + m.luz.cobrado)
      acc.luzPagado = round2(acc.luzPagado + m.luz.pagado)
      acc.luzSaldo = round2(acc.luzSaldo + m.luz.saldo)

      acc.aguaCobrado = round2(acc.aguaCobrado + m.agua.cobrado)
      acc.aguaPagado = round2(acc.aguaPagado + m.agua.pagado)
      acc.aguaSaldo = round2(acc.aguaSaldo + m.agua.saldo)

      acc.guardiaCobrado = round2(acc.guardiaCobrado + m.guardia.cobrado)
      acc.guardiaPagado = round2(acc.guardiaPagado + m.guardia.pagado)
      acc.guardiaSaldo = round2(acc.guardiaSaldo + m.guardia.saldo)

      acc.otrosCobrado = round2(acc.otrosCobrado + m.otros.cobrado)
      acc.otrosPagado = round2(acc.otrosPagado + m.otros.pagado)
      acc.otrosSaldo = round2(acc.otrosSaldo + m.otros.saldo)

      acc.totalCobrado = round2(acc.totalCobrado + m.totalCobrado)
      acc.totalPagado = round2(acc.totalPagado + m.totalPagado)
      acc.sobranteNeto = round2(acc.sobranteNeto + m.sobranteNeto)
      return acc
    },
    {
      luzCobrado: 0,
      luzPagado: 0,
      luzSaldo: 0,
      aguaCobrado: 0,
      aguaPagado: 0,
      aguaSaldo: 0,
      guardiaCobrado: 0,
      guardiaPagado: 0,
      guardiaSaldo: 0,
      otrosCobrado: 0,
      otrosPagado: 0,
      otrosSaldo: 0,
      totalCobrado: 0,
      totalPagado: 0,
      sobranteNeto: 0,
    }
  )

  if (meses.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 text-xs text-slate-500">
        No hay meses en el rango seleccionado para generar el Balance Mes a Mes.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Resumen Rápido Superior (Totales Acumulados del Rango) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          className={`bg-white rounded-2xl p-4 border shadow-sm ${
            acumulados.luzSaldo < 0 ? 'border-red-200' : 'border-amber-200'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
              Acumulado Luz (Grupo Luz)
            </span>
            <Zap className="w-4 h-4 text-amber-500 shrink-0" />
          </div>
          <p className={`text-xl font-black mt-1 font-mono ${getSaldoColorClass(acumulados.luzSaldo)}`}>
            {formatSignedBs(acumulados.luzSaldo)}
          </p>
          <span className="text-[11px] text-slate-500 block mt-0.5">
            Cobrado: {acumulados.luzCobrado.toFixed(2)} Bs • Pagado: {acumulados.luzPagado.toFixed(2)} Bs
          </span>
        </div>

        <div
          className={`bg-white rounded-2xl p-4 border shadow-sm ${
            acumulados.aguaSaldo < 0 ? 'border-red-200' : 'border-sky-200'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700">
              Acumulado Agua
            </span>
            <Droplets className="w-4 h-4 text-sky-500 shrink-0" />
          </div>
          <p className={`text-xl font-black mt-1 font-mono ${getSaldoColorClass(acumulados.aguaSaldo)}`}>
            {formatSignedBs(acumulados.aguaSaldo)}
          </p>
          <span className="text-[11px] text-slate-500 block mt-0.5">
            Cobrado: {acumulados.aguaCobrado.toFixed(2)} Bs • Pagado: {acumulados.aguaPagado.toFixed(2)} Bs
          </span>
        </div>

        <div
          className={`bg-white rounded-2xl p-4 border shadow-sm ${
            acumulados.guardiaSaldo < 0 ? 'border-red-200' : 'border-emerald-200'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
              Acumulado Guardia
            </span>
            <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
          </div>
          <p className={`text-xl font-black mt-1 font-mono ${getSaldoColorClass(acumulados.guardiaSaldo)}`}>
            {formatSignedBs(acumulados.guardiaSaldo)}
          </p>
          <span className="text-[11px] text-slate-500 block mt-0.5">
            Cobrado: {acumulados.guardiaCobrado.toFixed(2)} Bs • Pagado: {acumulados.guardiaPagado.toFixed(2)} Bs
          </span>
        </div>

        <div
          className={`rounded-2xl p-4 border-2 shadow-sm ${
            acumulados.sobranteNeto < 0
              ? 'bg-red-50/70 border-red-300'
              : 'bg-emerald-50/70 border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider ${
                acumulados.sobranteNeto < 0 ? 'text-red-800' : 'text-emerald-800'
              }`}
            >
              Sobrante / Déficit Neto Total
            </span>
            <BarChart3
              className={`w-4 h-4 shrink-0 ${
                acumulados.sobranteNeto < 0 ? 'text-red-600' : 'text-emerald-600'
              }`}
            />
          </div>
          <p className={`text-2xl font-black mt-1 font-mono ${getSaldoColorClass(acumulados.sobranteNeto)}`}>
            {formatSignedBs(acumulados.sobranteNeto)}
          </p>
          <span className="text-[11px] text-slate-600 block mt-0.5">
            Cobrado total: {acumulados.totalCobrado.toFixed(2)} Bs • Pagado: {acumulados.totalPagado.toFixed(2)} Bs
          </span>
        </div>
      </div>

      {/* Tarjetas por Mes (en orden cronológico) */}
      <div className="space-y-4">
        {meses.map((m) => {
          const pendientesCount = [m.luz.pendiente, m.agua.pendiente].filter(Boolean).length
          return (
            <div
              key={m.key}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden break-inside-avoid"
            >
              <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                    {m.label}
                  </h3>
                  {pendientesCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      <Clock className="w-3 h-3" />
                      {pendientesCount === 1
                        ? '1 factura pendiente de pago'
                        : `${pendientesCount} facturas pendientes de pago`}
                    </span>
                  )}
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-extrabold font-mono border ${
                    m.sobranteNeto >= 0
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-red-50 text-red-700 border-red-200'
                  }`}
                >
                  {m.sobranteNeto >= 0 ? 'Sobrante: ' : 'Déficit: '}
                  {formatSignedBs(m.sobranteNeto)}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse min-w-[520px]">
                  <thead>
                    <tr className="bg-slate-100/80 text-slate-600 font-bold border-b border-slate-200">
                      <th className="py-2.5 px-4">Rubro</th>
                      <th className="py-2.5 px-4 text-right">Cobrado (Bs)</th>
                      <th className="py-2.5 px-4 text-right">Pagado (Bs)</th>
                      <th className="py-2.5 px-4 text-right">Sobrante / Déficit (Bs)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {/* 1. Luz */}
                    <tr className="hover:bg-slate-50/70">
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span className="font-bold text-slate-900">Luz (Grupo Luz)</span>
                          {m.luz.pendiente && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                              Factura pendiente
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-800">
                        {m.luz.cobrado.toFixed(2)} Bs
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700">
                        {m.luz.pagado.toFixed(2)} Bs
                      </td>
                      <td className={`py-3 px-4 text-right font-mono font-extrabold ${getSaldoColorClass(m.luz.saldo)}`}>
                        {formatSignedBs(m.luz.saldo)}
                      </td>
                    </tr>

                    {/* 2. Agua */}
                    <tr className="hover:bg-slate-50/70">
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <Droplets className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                          <span className="font-bold text-slate-900">Agua</span>
                          {m.agua.pendiente && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                              Factura pendiente
                            </span>
                          )}
                        </div>
                        <span className="block text-[11px] text-slate-500 pl-5 mt-0.5">
                          (Socios: {m.agua.cobradoSocios.toFixed(2)} Bs + Externos: {m.agua.cobradoExternos.toFixed(2)} Bs)
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-800">
                        {m.agua.cobrado.toFixed(2)} Bs
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700">
                        {m.agua.pagado.toFixed(2)} Bs
                      </td>
                      <td className={`py-3 px-4 text-right font-mono font-extrabold ${getSaldoColorClass(m.agua.saldo)}`}>
                        {formatSignedBs(m.agua.saldo)}
                      </td>
                    </tr>

                    {/* 3. Guardia */}
                    <tr className="hover:bg-slate-50/70">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Shield className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="font-bold text-slate-900">Guardia</span>
                        </div>
                        <span className="block text-[11px] text-slate-500 pl-5 mt-0.5">
                          (Socios: {m.guardia.cobradoSocios.toFixed(2)} Bs + Externos: {m.guardia.cobradoExternos.toFixed(2)} Bs)
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-800">
                        {m.guardia.cobrado.toFixed(2)} Bs
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700">
                        {m.guardia.pagado.toFixed(2)} Bs
                      </td>
                      <td className={`py-3 px-4 text-right font-mono font-extrabold ${getSaldoColorClass(m.guardia.saldo)}`}>
                        {formatSignedBs(m.guardia.saldo)}
                      </td>
                    </tr>

                    {/* 4. Multas / Otros Operativos */}
                    <tr className="hover:bg-slate-50/70">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Coins className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                          <span className="font-bold text-slate-900">Multas / Otros Operativos</span>
                        </div>
                        <span className="block text-[11px] text-slate-500 pl-5 mt-0.5">
                          Multas cobradas del periodo vs egresos operativos (sin Luz, Agua ni Guardia)
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-800">
                        {m.otros.cobrado.toFixed(2)} Bs
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700">
                        {m.otros.pagado.toFixed(2)} Bs
                      </td>
                      <td className={`py-3 px-4 text-right font-mono font-extrabold ${getSaldoColorClass(m.otros.saldo)}`}>
                        {formatSignedBs(m.otros.saldo)}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-900 text-white font-bold">
                      <td className="py-3 px-4 uppercase tracking-wider text-[11px]">
                        TOTAL DEL MES — {m.label.toUpperCase()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {m.totalCobrado.toFixed(2)} Bs
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {m.totalPagado.toFixed(2)} Bs
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-mono text-sm font-black ${
                          m.sobranteNeto > 0
                            ? 'text-emerald-400'
                            : m.sobranteNeto < 0
                            ? 'text-red-400'
                            : 'text-white'
                        }`}
                      >
                        {formatSignedBs(m.sobranteNeto)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
