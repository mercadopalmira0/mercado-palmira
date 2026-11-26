import React from 'react'
import { MESES } from '../../../lib/formatters'
import {
  Calendar,
  Zap,
  Droplets,
  Shield,
  Camera,
  CheckCircle2,
  ExternalLink,
  ArrowRight,
  PlusCircle,
} from 'lucide-react'

export default function GastosFijosPanel({
  guardiaMes,
  setGuardiaMes,
  guardiaAnio,
  setGuardiaAnio,
  periodoFijo,
  sueldoMensual,
  totalAdelantosGuardia,
  saldoPendienteGuardia,
  isAdmin,
  openCargaLuzModal,
  openPagoLuzModal,
  openCargaAguaModal,
  openPagoAguaModal,
  onGoGuardia,
  onOpenNewGuardia,
}) {
  const montoLuz = parseFloat(periodoFijo?.factura_luz_bs) || 0
  const luzCargada = Boolean(periodoFijo && montoLuz > 0)
  const luzPagada = periodoFijo?.estado_pago_factura === 'pagada'

  const montoAgua = parseFloat(periodoFijo?.factura_agua_bs) || 0
  const aguaCargada = Boolean(periodoFijo && montoAgua > 0)
  const aguaPagada = periodoFijo?.estado_pago_agua === 'pagada'

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-600" />
            <span>Gastos Fijos del Mes — Caja Servicios</span>
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Control mensual de facturas obligatorias (Luz, Agua) y adelantos del guardia.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-slate-600">Mes:</span>
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Tarjeta 1: Factura de Luz */}
        <div className="rounded-2xl p-4 border border-amber-200 bg-amber-50/40 flex flex-col justify-between gap-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-extrabold text-amber-900 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-600" />
                <span>Factura de Luz</span>
              </span>
              {luzPagada ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Pagada
                </span>
              ) : luzCargada ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                  Pendiente de pago
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
                  Sin cargar
                </span>
              )}
            </div>

            <p className="text-2xl font-black text-slate-900">
              {montoLuz.toFixed(2)} <span className="text-xs font-semibold text-slate-500">Bs</span>
            </p>

            {luzCargada ? (
              <div className="text-[11px] text-slate-600 space-y-0.5">
                {(parseFloat(periodoFijo?.factura_energia_bs) || 0) > 0 && (
                  <p>
                    Energía: {parseFloat(periodoFijo.factura_energia_bs).toFixed(2)} • Alumb:{' '}
                    {parseFloat(periodoFijo.factura_alumbrado_bs || 0).toFixed(2)} • Basura:{' '}
                    {parseFloat(periodoFijo.factura_basura_bs || 0).toFixed(2)}
                  </p>
                )}
                {periodoFijo?.factura_luz_drive_url && (
                  <a
                    href={periodoFijo.factura_luz_drive_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 font-semibold hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Ver factura</span>
                  </a>
                )}
                {luzPagada && (
                  <p className="text-emerald-700 font-medium">
                    Pagada el {periodoFijo.fecha_pago_factura} ({periodoFijo.metodo_pago_factura === 'qr' ? 'QR' : 'Efectivo'})
                    {periodoFijo.foto_comprobante_pago_luz && (
                      <>
                        {' • '}
                        <a
                          href={periodoFijo.foto_comprobante_pago_luz}
                          target="_blank"
                          rel="noreferrer"
                          className="underline font-bold"
                        >
                          Comprobante
                        </a>
                      </>
                    )}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-slate-500">
                Carga la factura de luz al abrir {MESES[guardiaMes]} en <strong>Cobros</strong>.
              </p>
            )}
          </div>

          {isAdmin && !luzPagada && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={openCargaLuzModal}
                className="flex-1 py-2 px-3 bg-white hover:bg-amber-50 text-amber-800 border border-amber-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{luzCargada ? 'Editar Factura' : 'Cargar Factura'}</span>
              </button>
              {luzCargada && (
                <button
                  type="button"
                  onClick={openPagoLuzModal}
                  className="flex-1 py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-sm"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Registrar Pago de Luz</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Tarjeta 2: Factura de Agua */}
        <div className="rounded-2xl p-4 border border-blue-200 bg-blue-50/40 flex flex-col justify-between gap-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-extrabold text-blue-900 flex items-center gap-1.5">
                <Droplets className="w-4 h-4 text-blue-600" />
                <span>Factura de Agua</span>
              </span>
              {aguaPagada ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Pagada
                </span>
              ) : aguaCargada ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                  Pendiente de pago
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
                  Sin cargar
                </span>
              )}
            </div>

            <p className="text-2xl font-black text-slate-900">
              {montoAgua.toFixed(2)} <span className="text-xs font-semibold text-slate-500">Bs</span>
            </p>

            <div className="text-[11px] text-slate-600 space-y-0.5">
              {((parseFloat(periodoFijo?.factura_agua_potable_bs) || 0) > 0 ||
                (parseFloat(periodoFijo?.factura_alcantarillado_bs) || 0) > 0 ||
                (parseFloat(periodoFijo?.factura_agua_aporte_socio_bs) || 0) > 0) && (
                <p>
                  Potable: {parseFloat(periodoFijo.factura_agua_potable_bs || 0).toFixed(2)} • Alcant.:{' '}
                  {parseFloat(periodoFijo.factura_alcantarillado_bs || 0).toFixed(2)} • Aporte:{' '}
                  {parseFloat(periodoFijo.factura_agua_aporte_socio_bs || 0).toFixed(2)}
                </p>
              )}
              {periodoFijo?.foto_factura_agua && (
                <a
                  href={periodoFijo.foto_factura_agua}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 font-semibold hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Ver factura agua</span>
                </a>
              )}
              {aguaPagada ? (
                <p className="text-emerald-700 font-medium">
                  Pagada el {periodoFijo.fecha_pago_agua} ({periodoFijo.metodo_pago_agua === 'qr' ? 'QR' : 'Efectivo'})
                  {periodoFijo.foto_comprobante_pago_agua && (
                    <>
                      {' • '}
                      <a
                        href={periodoFijo.foto_comprobante_pago_agua}
                        target="_blank"
                        rel="noreferrer"
                        className="underline font-bold"
                      >
                        Comprobante
                      </a>
                    </>
                  )}
                </p>
              ) : !aguaCargada ? (
                <p className="text-slate-500">
                  Carga la factura del mes sin descontar caja hasta pagarla.
                </p>
              ) : null}
            </div>
          </div>

          {isAdmin && (
            <div className="flex flex-wrap gap-2">
              {!aguaPagada && (
                <button
                  type="button"
                  onClick={openCargaAguaModal}
                  className="flex-1 py-2 px-3 bg-white hover:bg-blue-50 text-blue-800 border border-blue-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>{aguaCargada ? 'Editar Factura' : 'Cargar Factura'}</span>
                </button>
              )}
              {aguaCargada && !aguaPagada && (
                <button
                  type="button"
                  onClick={openPagoAguaModal}
                  className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-sm"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Registrar Pago de Agua</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Tarjeta 3: Sueldo del Guardia */}
        <div className="rounded-2xl p-4 border border-emerald-200 bg-emerald-50/40 flex flex-col justify-between gap-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-extrabold text-emerald-900 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-emerald-600" />
                <span>Sueldo del Guardia</span>
              </span>
              {saldoPendienteGuardia <= 0 && (parseFloat(sueldoMensual) || 0) > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Cubierto
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                  Saldo pendiente
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-[11px] bg-white/80 p-2 rounded-xl border border-emerald-100">
              <div>
                <span className="text-slate-400 block">Sueldo</span>
                <strong className="text-slate-900">{(parseFloat(sueldoMensual) || 0).toFixed(0)} Bs</strong>
              </div>
              <div>
                <span className="text-slate-400 block">Adelantos</span>
                <strong className="text-emerald-700">{totalAdelantosGuardia.toFixed(0)} Bs</strong>
              </div>
              <div>
                <span className="text-slate-400 block">Pendiente</span>
                <strong className="text-amber-700">{saldoPendienteGuardia.toFixed(0)} Bs</strong>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onGoGuardia}
              className="flex-1 py-2 px-3 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1"
            >
              <span>Ir a Guardia</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={onOpenNewGuardia}
                className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-sm"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Adelanto / Pago</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
