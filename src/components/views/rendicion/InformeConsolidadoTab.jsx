import React from 'react'
import { MESES, formatFechaDMY } from '../../../lib/formatters'
import { Wallet, ClipboardCheck, FileSpreadsheet, ExternalLink, Users } from 'lucide-react'

export default function InformeConsolidadoTab({
  consolidado,
  mesInicio,
  anioInicio,
  mesFin,
  anioFin,
  fechaCorte,
  estanTodosRendidos,
}) {
  const cp = consolidado.cumplimientoPuestos || {}

  return (
    <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200 shadow-sm print-container space-y-6">
      {/* Encabezado Oficial */}
      <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-700 block">
            Asociación de Comerciantes Minoristas
          </span>
          <h1 className="text-2xl font-black text-slate-900 leading-tight">
            MERCADO PALMIRA — SECRETARÍA DE HACIENDA
          </h1>
          <p className="text-sm font-semibold text-slate-600 mt-0.5">
            INFORME DE RENDICIÓN DE CUENTAS (ASAMBLEA GENERAL)
          </p>
        </div>

        <div className="text-left sm:text-right text-xs text-slate-600 space-y-0.5">
          <p>
            <strong>Periodo Rendido:</strong> {MESES[mesInicio]} {anioInicio} a {MESES[mesFin]} {anioFin} ({mesInicio}/{anioInicio} - {mesFin}/{anioFin})
          </p>
          <p>
            <strong>Fecha de Corte de Caja:</strong> {formatFechaDMY(fechaCorte)}
          </p>
          <p>
            <strong>Fecha de Emisión:</strong> {new Date().toLocaleDateString('es-BO')}
          </p>
          {estanTodosRendidos && (
            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
              APROBADO EN ASAMBLEA
            </span>
          )}
        </div>
      </div>

      {/* CUADRO 1: Resumen General de Cajas y Arqueo */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5 border-b pb-1">
          <Wallet className="w-4 h-4 text-emerald-700" />
          1. Cuadro Consolidado de Cajas y Arqueo
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse border border-slate-200">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                <th className="p-2.5 border-r border-slate-200">Concepto / Rubro</th>
                <th className="p-2.5 border-r border-slate-200 text-right">Caja Servicios (Bs)</th>
                <th className="p-2.5 border-r border-slate-200 text-right">Caja Afiliaciones (Bs)</th>
                <th className="p-2.5 text-right font-black bg-slate-200/70">Total Consolidado (Bs)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium text-slate-700">
              <tr className="bg-slate-50/50">
                <td className="p-2.5 border-r border-slate-200 font-bold">1. Saldo Anterior de Arrastre</td>
                <td className="p-2.5 border-r border-slate-200 text-right font-bold">
                  {consolidado.totalAntServicios.toFixed(2)}
                </td>
                <td className="p-2.5 border-r border-slate-200 text-right font-bold">
                  {consolidado.totalAntAfiliaciones.toFixed(2)}
                </td>
                <td className="p-2.5 text-right font-bold bg-slate-100/50">
                  {consolidado.totalAntGeneral.toFixed(2)}
                </td>
              </tr>
              <tr className="text-[11px] text-slate-500">
                <td className="p-1.5 pl-6 border-r border-slate-200">• Efectivo en mano</td>
                <td className="p-1.5 border-r border-slate-200 text-right">{consolidado.antServiciosEf.toFixed(2)}</td>
                <td className="p-1.5 border-r border-slate-200 text-right">{consolidado.antAfiliacionesEf.toFixed(2)}</td>
                <td className="p-1.5 text-right">{(consolidado.antServiciosEf + consolidado.antAfiliacionesEf).toFixed(2)}</td>
              </tr>
              <tr className="text-[11px] text-slate-500">
                <td className="p-1.5 pl-6 border-r border-slate-200">• Saldo en QR / Banco</td>
                <td className="p-1.5 border-r border-slate-200 text-right">{consolidado.antServiciosQr.toFixed(2)}</td>
                <td className="p-1.5 border-r border-slate-200 text-right">{consolidado.antAfiliacionesQr.toFixed(2)}</td>
                <td className="p-1.5 text-right">{(consolidado.antServiciosQr + consolidado.antAfiliacionesQr).toFixed(2)}</td>
              </tr>

              <tr className="bg-emerald-50/40">
                <td className="p-2.5 border-r border-slate-200 font-bold text-emerald-950">
                  2. (+) Ingresos Recaudados en el Periodo
                </td>
                <td className="p-2.5 border-r border-slate-200 text-right font-bold text-emerald-800">
                  +{consolidado.totalIngServicios.toFixed(2)}
                </td>
                <td className="p-2.5 border-r border-slate-200 text-right font-bold text-emerald-800">
                  +{consolidado.totalIngAfiliaciones.toFixed(2)}
                </td>
                <td className="p-2.5 text-right font-bold text-emerald-900 bg-emerald-100/50">
                  +{consolidado.totalIngresosGeneral.toFixed(2)}
                </td>
              </tr>
              <tr className="text-[11px] text-slate-500">
                <td className="p-1.5 pl-6 border-r border-slate-200">• Ingresos en Efectivo</td>
                <td className="p-1.5 border-r border-slate-200 text-right">{consolidado.ingServiciosEf.toFixed(2)}</td>
                <td className="p-1.5 border-r border-slate-200 text-right">{consolidado.ingAfiliacionesEf.toFixed(2)}</td>
                <td className="p-1.5 text-right">{(consolidado.ingServiciosEf + consolidado.ingAfiliacionesEf).toFixed(2)}</td>
              </tr>
              <tr className="text-[11px] text-slate-500">
                <td className="p-1.5 pl-6 border-r border-slate-200">• Ingresos en QR / Banco</td>
                <td className="p-1.5 border-r border-slate-200 text-right">{consolidado.ingServiciosQr.toFixed(2)}</td>
                <td className="p-1.5 border-r border-slate-200 text-right">{consolidado.ingAfiliacionesQr.toFixed(2)}</td>
                <td className="p-1.5 text-right">{(consolidado.ingServiciosQr + consolidado.ingAfiliacionesQr).toFixed(2)}</td>
              </tr>
              <tr className="text-[11px] text-indigo-700 bg-indigo-50/30 font-semibold">
                <td className="p-1.5 pl-6 border-r border-slate-200">• Ingresos Externos (Guardia y Agua)</td>
                <td className="p-1.5 border-r border-slate-200 text-right">{(consolidado.totalIngExternos || 0).toFixed(2)}</td>
                <td className="p-1.5 border-r border-slate-200 text-right">0.00</td>
                <td className="p-1.5 text-right">{(consolidado.totalIngExternos || 0).toFixed(2)}</td>
              </tr>
              {((consolidado.totalIngDeudoresServicios || 0) > 0 || (consolidado.totalIngDeudoresAfiliaciones || 0) > 0) && (
                <tr className="text-[11px] text-slate-600 bg-slate-50/60">
                  <td className="p-1.5 pl-6 border-r border-slate-200">• Recuperación Deudores de Ciclos Anteriores</td>
                  <td className="p-1.5 border-r border-slate-200 text-right">{(consolidado.totalIngDeudoresServicios || 0).toFixed(2)}</td>
                  <td className="p-1.5 border-r border-slate-200 text-right">{(consolidado.totalIngDeudoresAfiliaciones || 0).toFixed(2)}</td>
                  <td className="p-1.5 text-right">
                    {((consolidado.totalIngDeudoresServicios || 0) + (consolidado.totalIngDeudoresAfiliaciones || 0)).toFixed(2)}
                  </td>
                </tr>
              )}

              <tr className="bg-red-50/40">
                <td className="p-2.5 border-r border-slate-200 font-bold text-red-950">
                  3. (-) Egresos y Gastos Ejecutados
                </td>
                <td className="p-2.5 border-r border-slate-200 text-right font-bold text-red-700">
                  -{consolidado.totalEgServicios.toFixed(2)}
                </td>
                <td className="p-2.5 border-r border-slate-200 text-right font-bold text-red-700">
                  -{consolidado.totalEgAfiliaciones.toFixed(2)}
                </td>
                <td className="p-2.5 text-right font-bold text-red-800 bg-red-100/50">
                  -{consolidado.totalEgresosGeneral.toFixed(2)}
                </td>
              </tr>

              <tr className="bg-slate-50/30 text-slate-600">
                <td className="p-2 border-r border-slate-200 font-semibold">4. (±) Movimientos Internos (Neto)</td>
                <td className="p-2 border-r border-slate-200 text-right">
                  {(consolidado.movServiciosEf + consolidado.movServiciosQr).toFixed(2)}
                </td>
                <td className="p-2 border-r border-slate-200 text-right">
                  {(consolidado.movAfiliacionesEf + consolidado.movAfiliacionesQr).toFixed(2)}
                </td>
                <td className="p-2 text-right">0.00</td>
              </tr>

              <tr className="bg-slate-900 text-white font-bold text-xs">
                <td className="p-3 border-r border-slate-800 uppercase">5. SALDO FINAL AL CIERRE (ARQUEO)</td>
                <td className="p-3 border-r border-slate-800 text-right font-extrabold text-emerald-400">
                  {consolidado.totalFinServicios.toFixed(2)} Bs
                </td>
                <td className="p-3 border-r border-slate-800 text-right font-extrabold text-blue-400">
                  {consolidado.totalFinAfiliaciones.toFixed(2)} Bs
                </td>
                <td className="p-3 text-right font-black text-amber-300 bg-black/40">
                  {consolidado.granTotalFinal.toFixed(2)} Bs
                </td>
              </tr>
              <tr className="bg-slate-100 text-slate-800 font-semibold text-[11px]">
                <td className="p-1.5 pl-6 border-r border-slate-200">» Efectivo Físico en Mano (Billetes)</td>
                <td className="p-1.5 border-r border-slate-200 text-right">{consolidado.finServiciosEf.toFixed(2)} Bs</td>
                <td className="p-1.5 border-r border-slate-200 text-right">{consolidado.finAfiliacionesEf.toFixed(2)} Bs</td>
                <td className="p-1.5 text-right font-bold">{consolidado.totalEfectivoFinal.toFixed(2)} Bs</td>
              </tr>
              <tr className="bg-slate-100 text-slate-800 font-semibold text-[11px]">
                <td className="p-1.5 pl-6 border-r border-slate-200">» Saldo en QR / Cuenta Bancaria</td>
                <td className="p-1.5 border-r border-slate-200 text-right">{consolidado.finServiciosQr.toFixed(2)} Bs</td>
                <td className="p-1.5 border-r border-slate-200 text-right">{consolidado.finAfiliacionesQr.toFixed(2)} Bs</td>
                <td className="p-1.5 text-right font-bold">{consolidado.totalQrFinal.toFixed(2)} Bs</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Resumen de Cumplimiento de Cobros */}
      <div className="space-y-3 pt-1">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5 border-b pb-1">
          <ClipboardCheck className="w-4 h-4 text-emerald-700" />
          Resumen de Cumplimiento de Cobros
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">Total Puestos Activos</span>
            <p className="text-lg font-extrabold text-slate-900 mt-0.5">{cp.totalPuestosActivos || 0}</p>
            <span className="text-[11px] text-slate-500">
              (representan {cp.totalSociosActivos || 0} socios)
            </span>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
            <span className="text-[10px] font-bold uppercase text-emerald-700 block">Pagados Completos</span>
            <p className="text-lg font-extrabold text-emerald-700 mt-0.5">{cp.puestosPagados || 0}</p>
            <span className="text-[11px] text-emerald-600">Al día en el rango</span>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
            <span className="text-[10px] font-bold uppercase text-blue-700 block">Pago Parcial ("A cuenta")</span>
            <p className="text-lg font-extrabold text-blue-700 mt-0.5">{cp.puestosParciales || 0}</p>
            <span className="text-[11px] text-blue-600">Con abono parcial</span>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <span className="text-[10px] font-bold uppercase text-red-700 block">Pendientes / Falta Pagar</span>
            <p className="text-lg font-extrabold text-red-700 mt-0.5">{cp.puestosPendientes || 0}</p>
            <span className="text-[11px] text-red-600">Sin pago registrado</span>
          </div>

          <div className="bg-slate-900 text-white rounded-xl p-3 col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold uppercase text-slate-300 block">% Cumplimiento</span>
            <p className="text-lg font-extrabold text-emerald-400 mt-0.5">{cp.porcentajeCumplimiento || 0}%</p>
            <div className="w-full bg-slate-700 rounded-full h-1.5 mt-1.5">
              <div
                className="bg-emerald-400 h-1.5 rounded-full"
                style={{ width: `${Math.min(100, cp.porcentajeCumplimiento || 0)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Desglose Interno de Ingresos Caja Servicios */}
      {consolidado.desgloseInternoServicios && (
        <div className="space-y-3 pt-1">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5 border-b pb-1">
            <Wallet className="w-4 h-4 text-emerald-700" />
            Desglose Interno de Ingresos — Caja Servicios (Guardia / Agua / Luz)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <span className="text-[10px] font-bold uppercase text-slate-600 block">Fondo Guardia</span>
              <p className="text-lg font-extrabold text-slate-900 mt-0.5">
                {consolidado.desgloseInternoServicios.totalGuardia.toFixed(2)} Bs
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Socios: {consolidado.desgloseInternoServicios.guardiaSocios.toFixed(2)} Bs • Externos:{' '}
                {consolidado.desgloseInternoServicios.guardiaExternos.toFixed(2)} Bs
              </p>
            </div>

            <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3">
              <span className="text-[10px] font-bold uppercase text-blue-700 block">Fondo Agua</span>
              <p className="text-lg font-extrabold text-blue-900 mt-0.5">
                {consolidado.desgloseInternoServicios.totalAgua.toFixed(2)} Bs
              </p>
              <p className="text-[11px] text-blue-700 mt-0.5">
                Socios: {consolidado.desgloseInternoServicios.aguaSocios.toFixed(2)} Bs • Externos:{' '}
                {consolidado.desgloseInternoServicios.aguaExternos.toFixed(2)} Bs
              </p>
            </div>

            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3">
              <span className="text-[10px] font-bold uppercase text-amber-700 block">
                Fondo Grupo Luz (Consumo + Alumb. + Basura)
              </span>
              <p className="text-lg font-extrabold text-amber-900 mt-0.5">
                {consolidado.desgloseInternoServicios.totalLuzGrupo.toFixed(2)} Bs
              </p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                Multas mora: {consolidado.desgloseInternoServicios.totalMultasSocios.toFixed(2)} Bs • Deudores:{' '}
                {consolidado.desgloseInternoServicios.totalDeudoresServicios.toFixed(2)} Bs
              </p>
            </div>
          </div>
        </div>
      )}

      {/* CUADRO 2: Detalle de Egresos */}
      <div className="space-y-3 pt-2">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5 border-b pb-1">
          <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
          2. Detalle de Egresos Ejecutados con Respaldo Digital
        </h3>

        {consolidado.egresosRango.length === 0 ? (
          <p className="text-xs text-slate-500 italic">No se registraron egresos en el periodo seleccionado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse border border-slate-200">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                  <th className="p-2 border-r border-slate-200">Fecha</th>
                  <th className="p-2 border-r border-slate-200">Caja</th>
                  <th className="p-2 border-r border-slate-200">Categoría</th>
                  <th className="p-2 border-r border-slate-200">Descripción del Gasto</th>
                  <th className="p-2 border-r border-slate-200 text-right">Monto (Bs)</th>
                  <th className="p-2 border-r border-slate-200">Método</th>
                  <th className="p-2 text-center">Recibo Drive</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {consolidado.egresosRango.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="p-2 border-r border-slate-200 font-mono">{e.fecha}</td>
                    <td className="p-2 border-r border-slate-200 capitalize">{e.caja}</td>
                    <td className="p-2 border-r border-slate-200 font-semibold">{e.categoria}</td>
                    <td className="p-2 border-r border-slate-200">{e.descripcion}</td>
                    <td className="p-2 border-r border-slate-200 text-right font-bold text-red-700">
                      {parseFloat(e.monto).toFixed(2)}
                    </td>
                    <td className="p-2 border-r border-slate-200 uppercase font-mono">{e.metodo_pago}</td>
                    <td className="p-2 text-center">
                      {e.recibo_drive_url ? (
                        <a
                          href={e.recibo_drive_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 font-bold hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Ver Foto</span>
                        </a>
                      ) : (
                        <span className="text-slate-400">Sin foto</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CUADRO 3: Anexo de Socios Morosos */}
      <div className="space-y-3 pt-4 page-break">
        <h3 className="text-sm font-bold uppercase tracking-wider text-red-800 flex items-center gap-1.5 border-b pb-1">
          <Users className="w-4 h-4 text-red-600" />
          3. Anexo de Socios con Saldos Pendientes / Mora al Corte
        </h3>

        {consolidado.deudoresServicios.length === 0 &&
        consolidado.deudoresAfiliaciones.length === 0 &&
        (consolidado.deudoresAnteriores || []).length === 0 ? (
          <p className="text-xs text-emerald-700 font-semibold">
            ¡Excelente! No existen deudas pendientes de servicios, afiliaciones ni gestiones anteriores al corte del periodo.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse border border-slate-200">
              <thead>
                <tr className="bg-red-50 text-red-900 font-bold border-b border-slate-200">
                  <th className="p-2 border-r border-slate-200">Tipo Deuda</th>
                  <th className="p-2 border-r border-slate-200">Socio</th>
                  <th className="p-2 border-r border-slate-200">Teléfono</th>
                  <th className="p-2 border-r border-slate-200">Puesto / Detalle</th>
                  <th className="p-2 border-r border-slate-200">Periodo / Ciclo Origen</th>
                  <th className="p-2 border-r border-slate-200 text-right">Total (Bs)</th>
                  <th className="p-2 border-r border-slate-200 text-right">Abonado (Bs)</th>
                  <th className="p-2 border-r border-slate-200 text-right text-red-700 font-black">Deuda (Bs)</th>
                  <th className="p-2 text-right">Multa (Bs)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {consolidado.deudoresServicios.map((d, i) => (
                  <tr key={`s-${i}`}>
                    <td className="p-2 border-r border-slate-200">
                      <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 text-[10px] font-bold">
                        Servicios Básicos
                      </span>
                    </td>
                    <td className="p-2 border-r border-slate-200 font-bold">{d.socio}</td>
                    <td className="p-2 border-r border-slate-200">{d.telefono || '-'}</td>
                    <td className="p-2 border-r border-slate-200">{d.puesto}</td>
                    <td className="p-2 border-r border-slate-200">Servicios {d.periodo}</td>
                    <td className="p-2 border-r border-slate-200 text-right">{d.totalAPagar.toFixed(2)}</td>
                    <td className="p-2 border-r border-slate-200 text-right text-emerald-700">{d.totalPagado.toFixed(2)}</td>
                    <td className="p-2 border-r border-slate-200 text-right font-bold text-red-700">
                      {d.saldoPendiente.toFixed(2)}
                    </td>
                    <td className="p-2 text-right">{d.multa > 0 ? `${d.multa.toFixed(2)} Bs` : '0.00'}</td>
                  </tr>
                ))}
                {consolidado.deudoresAfiliaciones.map((a, i) => (
                  <tr key={`a-${i}`} className="bg-blue-50/30">
                    <td className="p-2 border-r border-slate-200">
                      <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                        Cuota Afiliación
                      </span>
                    </td>
                    <td className="p-2 border-r border-slate-200 font-bold">{a.socio}</td>
                    <td className="p-2 border-r border-slate-200">{a.telefono || '-'}</td>
                    <td className="p-2 border-r border-slate-200">Afiliación Nueva (Cuota {a.cuotaAcordada} Bs/mes)</td>
                    <td className="p-2 border-r border-slate-200">Plan {parseFloat(a.totalPlan).toFixed(2)} Bs</td>
                    <td className="p-2 border-r border-slate-200 text-right">{parseFloat(a.totalPlan).toFixed(2)}</td>
                    <td className="p-2 border-r border-slate-200 text-right text-emerald-700">{a.totalPagado.toFixed(2)}</td>
                    <td className="p-2 border-r border-slate-200 text-right font-bold text-red-700">
                      {parseFloat(a.saldoPendiente).toFixed(2)}
                    </td>
                    <td className="p-2 text-right">-</td>
                  </tr>
                ))}
                {(consolidado.deudoresAnteriores || []).map((da, i) => (
                  <tr key={`h-${i}`} className="bg-amber-50/40">
                    <td className="p-2 border-r border-slate-200">
                      <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-bold">
                        {da.tipoDeuda}
                      </span>
                    </td>
                    <td className="p-2 border-r border-slate-200 font-bold">{da.socio}</td>
                    <td className="p-2 border-r border-slate-200">{da.telefono || '-'}</td>
                    <td className="p-2 border-r border-slate-200">{da.puestoDetalle || da.detalleDeuda}</td>
                    <td className="p-2 border-r border-slate-200">{da.cicloOrigen}</td>
                    <td className="p-2 border-r border-slate-200 text-right">{da.montoOriginal.toFixed(2)}</td>
                    <td className="p-2 border-r border-slate-200 text-right text-emerald-700">{da.montoPagado.toFixed(2)}</td>
                    <td className="p-2 border-r border-slate-200 text-right font-bold text-red-700">
                      {da.saldoPendiente.toFixed(2)}
                    </td>
                    <td className="p-2 text-right">-</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-bold text-xs">
                <tr>
                  <td colSpan={7} className="p-2 border-r border-slate-200 text-right text-slate-700">
                    Subtotal Mora del Periodo (Servicios + Afiliaciones):
                  </td>
                  <td className="p-2 border-r border-slate-200 text-right text-red-700">
                    {(consolidado.resumenMora?.subtotalMoraPeriodo || 0).toFixed(2)} Bs
                  </td>
                  <td className="p-2" />
                </tr>
                <tr>
                  <td colSpan={7} className="p-2 border-r border-slate-200 text-right text-amber-900">
                    Subtotal Deudas Anteriores (Heredadas):
                  </td>
                  <td className="p-2 border-r border-slate-200 text-right text-amber-800">
                    {(consolidado.resumenMora?.subtotalDeudasAnteriores || 0).toFixed(2)} Bs
                  </td>
                  <td className="p-2" />
                </tr>
                <tr className="bg-slate-900 text-white">
                  <td colSpan={7} className="p-2.5 border-r border-slate-700 text-right uppercase">
                    Total General de Mora:
                  </td>
                  <td className="p-2.5 border-r border-slate-700 text-right text-amber-300 font-black">
                    {(consolidado.resumenMora?.totalGeneralMora || 0).toFixed(2)} Bs
                  </td>
                  <td className="p-2.5" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* CUADRO 4 (Informativo): Cobros Extras / Campañas */}
      {(consolidado.resumenCobrosExtras || []).length > 0 && (
        <div className="space-y-2.5 pt-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5 border-b pb-1">
            <ClipboardCheck className="w-4 h-4 text-amber-600" />
            4. Resumen de Cobros Extras / Campañas (Fondo Independiente)
          </h3>
          <p className="text-[11px] text-slate-500">
            Los fondos de campañas extraordinarias se administran de forma independiente. Solo ingresan a Caja Servicios o Caja Afiliaciones si se transfiere un sobrante al cierre.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse border border-slate-200">
              <thead>
                <tr className="bg-amber-50 text-amber-950 font-bold border-b border-slate-200">
                  <th className="p-2 border-r border-slate-200">Campaña</th>
                  <th className="p-2 border-r border-slate-200">Estado</th>
                  <th className="p-2 border-r border-slate-200 text-right">Recaudado (Bs)</th>
                  <th className="p-2 border-r border-slate-200 text-right">Gastado (Bs)</th>
                  <th className="p-2 border-r border-slate-200 text-right">Saldo Sobrante (Bs)</th>
                  <th className="p-2">Observación / Traspaso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {consolidado.resumenCobrosExtras.map((ce) => (
                  <tr key={ce.id} className="hover:bg-slate-50">
                    <td className="p-2 border-r border-slate-200 font-bold text-slate-900">{ce.nombre}</td>
                    <td className="p-2 border-r border-slate-200 uppercase text-[10px] font-bold">
                      <span
                        className={`px-2 py-0.5 rounded ${
                          ce.estado === 'cerrada'
                            ? 'bg-slate-200 text-slate-700'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {ce.estado === 'cerrada' ? 'Cerrada' : 'Abierta'}
                      </span>
                    </td>
                    <td className="p-2 border-r border-slate-200 text-right font-mono">
                      {ce.recaudado.toFixed(2)}
                    </td>
                    <td className="p-2 border-r border-slate-200 text-right font-mono text-red-700">
                      {ce.gastado.toFixed(2)}
                    </td>
                    <td className="p-2 border-r border-slate-200 text-right font-mono font-bold text-emerald-700">
                      {ce.saldoSobrante.toFixed(2)}
                    </td>
                    <td className="p-2 text-[11px] text-slate-600">
                      {ce.estado === 'cerrada'
                        ? ce.cajaDestinoSobrante
                          ? `Sobrante transferido (${ce.sobranteTransferido.toFixed(2)} Bs) a Caja ${
                              ce.cajaDestinoSobrante === 'servicios' ? 'Servicios' : 'Afiliaciones'
                            }`
                          : 'Cierre informativo (sin traspaso)'
                        : 'Campaña en curso (fondo independiente)'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pie de Firmas */}
      <div className="pt-16 pb-4 border-t border-slate-300 grid grid-cols-3 gap-8 text-center text-xs">
        <div className="border-t border-slate-900 pt-2 space-y-0.5">
          <p className="font-bold text-slate-900">Secretario de Hacienda</p>
          <p className="text-[11px] text-slate-500">Mesa Directiva Mercado Palmira</p>
        </div>
        <div className="border-t border-slate-900 pt-2 space-y-0.5">
          <p className="font-bold text-slate-900">Presidente / Secretario General</p>
          <p className="text-[11px] text-slate-500">Mesa Directiva Mercado Palmira</p>
        </div>
        <div className="border-t border-slate-900 pt-2 space-y-0.5">
          <p className="font-bold text-slate-900">Comité de Vigilancia / Actas</p>
          <p className="text-[11px] text-slate-500">Aprobación en Asamblea</p>
        </div>
      </div>
    </div>
  )
}
