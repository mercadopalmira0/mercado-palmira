import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { calcularConsolidadoRendicion } from '../../lib/calculosRendicion'
import { descargarRendicionExcel } from '../../lib/exportExcel'
import {
  FileSpreadsheet,
  Printer,
  Download,
  Lock,
  Calendar,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  X,
  ExternalLink,
  ShieldCheck,
  Coins,
  QrCode,
  Wallet,
  ArrowRightLeft,
  Users
} from 'lucide-react'

const MESES = [
  '',
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

export default function RendicionView() {
  const { user, isAdmin } = useAuth()
  const today = new Date()

  // Rango de meses (default: último trimestre / últimos 3 meses)
  const currentMonth = today.getMonth() + 1
  const currentYear = today.getFullYear()

  const defaultStartMonth = currentMonth >= 3 ? currentMonth - 2 : 1
  const [mesInicio, setMesInicio] = useState(defaultStartMonth)
  const [anioInicio, setAnioInicio] = useState(currentYear)
  const [mesFin, setMesFin] = useState(currentMonth)
  const [anioFin, setAnioFin] = useState(currentYear)

  const [consolidado, setConsolidado] = useState(null)
  const [periodosRango, setPeriodosRango] = useState([])
  const [loading, setLoading] = useState(true)
  const [lockingPeriod, setLockingPeriod] = useState(false)
  const [statusMessage, setStatusMessage] = useState(null)

  // Cargar datos completos para la consolidación
  const loadData = async () => {
    setLoading(true)
    setStatusMessage(null)
    try {
      // 1. Periodos Mensuales
      const { data: periodosData } = await supabase.from('periodos_mensuales').select('*')

      // Filtrar periodos en el rango
      const periodosEnRango = (periodosData || []).filter((p) => {
        const pDate = new Date(p.anio, p.mes - 1, 1)
        const dIni = new Date(anioInicio, mesInicio - 1, 1)
        const dFin = new Date(anioFin, mesFin - 1, 1)
        return pDate >= dIni && pDate <= dFin
      })
      setPeriodosRango(periodosEnRango)

      // 2. Saldos Iniciales
      const { data: saldosData } = await supabase.from('saldos_iniciales').select('*')

      // 3. Pagos de Servicios (con cobros, unidades, socios y periodos)
      const { data: pagosServiciosData } = await supabase.from('pagos_servicios').select(`
        id, monto, metodo_pago, nro_talonario_fisico, estado, fecha_pago,
        cobros_servicios (
          id, total_a_pagar,
          periodos_mensuales (mes, anio),
          unidades_cobro (
            numero_identificador,
            socios (nombre, telefono)
          )
        )
      `)

      // 4. Cobros de Servicios (para detectar deudores)
      const { data: cobrosData } = await supabase.from('cobros_servicios').select(`
        id, total_a_pagar, monto_multa, estado,
        periodos_mensuales (mes, anio),
        unidades_cobro (
          numero_identificador,
          socios (nombre, telefono)
        ),
        pagos_servicios (id, monto, estado)
      `)

      // 5. Pagos de Afiliaciones
      const { data: pagosAfiliacionData } = await supabase.from('pagos_afiliacion').select(`
        id, monto, metodo_pago, nro_talonario_fisico, estado, fecha_pago,
        afiliaciones (
          id, monto_total, saldo_pendiente,
          socios (nombre, telefono)
        )
      `)

      // 6. Afiliaciones
      const { data: afiliacionesData } = await supabase.from('afiliaciones').select(`
        id, monto_total, cuota_acordada, saldo_pendiente, estado,
        socios (nombre, telefono),
        pagos_afiliacion (id, monto, estado)
      `)

      // 7. Egresos
      const { data: egresosData } = await supabase.from('egresos').select('*')

      // 8. Movimientos Internos
      const { data: movimientosData } = await supabase.from('movimientos_internos').select('*')

      // Ejecutar motor de cálculo consolidado
      const resultado = calcularConsolidadoRendicion({
        mesInicio,
        anioInicio,
        mesFin,
        anioFin,
        saldosIniciales: saldosData || [],
        pagosServicios: pagosServiciosData || [],
        pagosAfiliacion: pagosAfiliacionData || [],
        egresos: egresosData || [],
        movimientosInternos: movimientosData || [],
        cobrosServicios: cobrosData || [],
        afiliaciones: afiliacionesData || [],
      })

      setConsolidado(resultado)
    } catch (err) {
      console.error(err)
      setStatusMessage({ type: 'error', text: 'Error al generar rendición consolidada: ' + err.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [mesInicio, anioInicio, mesFin, anioFin])

  // Presets rápidos de rango
  const setPreset = (tipo) => {
    if (tipo === 'trimestre') {
      const startM = currentMonth >= 3 ? currentMonth - 2 : 1
      setMesInicio(startM)
      setAnioInicio(currentYear)
      setMesFin(currentMonth)
      setAnioFin(currentYear)
    } else if (tipo === 'cuatrimestre') {
      const startM = currentMonth >= 4 ? currentMonth - 3 : 1
      setMesInicio(startM)
      setAnioInicio(currentYear)
      setMesFin(currentMonth)
      setAnioFin(currentYear)
    } else if (tipo === 'anio') {
      setMesInicio(1)
      setAnioInicio(currentYear)
      setMesFin(12)
      setAnioFin(currentYear)
    }
  }

  // Candado de Asamblea (Bloquear meses rendidos)
  const handleBloquearAsamblea = async () => {
    if (!isAdmin) {
      setStatusMessage({ type: 'error', text: 'Solo el Secretario de Hacienda (Admin) puede sellar el periodo.' })
      return
    }

    if (periodosRango.length === 0) {
      setStatusMessage({
        type: 'error',
        text: 'No hay periodos registrados en el rango seleccionado para marcar como rendidos.',
      })
      return
    }

    const confirmacion = window.confirm(
      `¿Confirmas marcar el rango ${mesInicio}/${anioInicio} a ${mesFin}/${anioFin} como "RENDIDO EN ASAMBLEA"?\nEsta acción registrará la fecha en la bitácora y congelará los meses contra ediciones accidentales.`
    )
    if (!confirmacion) return

    setLockingPeriod(true)
    try {
      const now = new Date().toISOString()
      const ids = periodosRango.map((p) => p.id)

      // 1. Actualizar periodos_mensuales
      const { error: pError } = await supabase
        .from('periodos_mensuales')
        .update({
          rendido_en_asamblea: true,
          fecha_rendicion: now,
        })
        .in('id', ids)

      if (pError) throw pError

      // 2. Registrar en bitacora_auditoria
      await supabase.from('bitacora_auditoria').insert([
        {
          usuario_id: user?.id || null,
          accion: 'RENDICION_EN_ASAMBLEA_SELLADA',
          detalle_json: {
            rango: `${mesInicio}/${anioInicio} - ${mesFin}/${anioFin}`,
            periodos_afectados: ids.length,
            fecha_sellado: now,
            gran_total_rendido: consolidado?.granTotalFinal || 0,
          },
          device_id: window.navigator.userAgent,
          user_agent: window.navigator.userAgent,
          es_sospechoso: false,
        },
      ])

      setStatusMessage({
        type: 'success',
        text: '¡Periodo marcado como "Rendido en Asamblea" con éxito! Auditoría registrada.',
      })
      await loadData()
    } catch (err) {
      console.error(err)
      setStatusMessage({ type: 'error', text: 'Error al sellar asamblea: ' + err.message })
    } finally {
      setLockingPeriod(false)
    }
  }

  // Exportar Excel
  const handleExportExcel = () => {
    if (!consolidado) return
    descargarRendicionExcel(consolidado, {
      mesInicio,
      anioInicio,
      mesFin,
      anioFin,
      fechaEmision: new Date().toLocaleDateString('es-BO'),
    })
  }

  // Imprimir / Guardar PDF
  const handlePrintPdf = () => {
    window.print()
  }

  const estanTodosRendidos =
    periodosRango.length > 0 && periodosRango.every((p) => p.rendido_en_asamblea)

  return (
    <div className="space-y-6">
      {/* Barra de Control y Selector de Rango (Oculta al imprimir) */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm no-print space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold text-slate-900">Rendición de Cuentas para Asamblea</h2>
              {estanTodosRendidos ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Rendido en Asamblea
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
                  Periodo Abierto
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Consolidador financiero por rango de meses, exportación a Excel (.xlsx) e informe imprimible para asamblea.
            </p>
          </div>

          {/* Acciones principales */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={loadData}
              title="Recargar rendición"
              className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              disabled={loading || !consolidado}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span>Descargar Excel (.xlsx)</span>
            </button>

            <button
              type="button"
              onClick={handlePrintPdf}
              disabled={loading || !consolidado}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Guardar PDF</span>
            </button>

            {isAdmin && !estanTodosRendidos && (
              <button
                type="button"
                onClick={handleBloquearAsamblea}
                disabled={lockingPeriod || loading || periodosRango.length === 0}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
              >
                <Lock className="w-4 h-4" />
                <span>{lockingPeriod ? 'Sellando...' : 'Sellar en Asamblea'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Selector de Fechas y Presets */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-600">Rango desde:</span>
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
              <select
                value={mesInicio}
                onChange={(e) => setMesInicio(parseInt(e.target.value, 10))}
                className="bg-transparent font-bold text-slate-800 pr-1 focus:outline-none"
              >
                {MESES.slice(1).map((m, i) => (
                  <option key={i + 1} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                value={anioInicio}
                onChange={(e) => setAnioInicio(parseInt(e.target.value, 10))}
                className="bg-transparent font-bold text-slate-800 pl-1 border-l border-slate-200 focus:outline-none"
              >
                {[2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <span className="font-semibold text-slate-600">hasta:</span>
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
              <select
                value={mesFin}
                onChange={(e) => setMesFin(parseInt(e.target.value, 10))}
                className="bg-transparent font-bold text-slate-800 pr-1 focus:outline-none"
              >
                {MESES.slice(1).map((m, i) => (
                  <option key={i + 1} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                value={anioFin}
                onChange={(e) => setAnioFin(parseInt(e.target.value, 10))}
                className="bg-transparent font-bold text-slate-800 pl-1 border-l border-slate-200 focus:outline-none"
              >
                {[2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Botones Presets */}
          <div className="flex items-center space-x-1.5 font-medium">
            <span className="text-slate-400">Presets:</span>
            <button
              type="button"
              onClick={() => setPreset('trimestre')}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700"
            >
              Trimestre
            </button>
            <button
              type="button"
              onClick={() => setPreset('cuatrimestre')}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700"
            >
              Cuatrimestre
            </button>
            <button
              type="button"
              onClick={() => setPreset('anio')}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700"
            >
              Año Completo
            </button>
          </div>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center justify-between no-print ${
            statusMessage.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <span>{statusMessage.text}</span>
          <button onClick={() => setStatusMessage(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* REPORTE OFICIAL IMPRIMIBLE (Se imprime exactamente esto) */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <RefreshCw className="w-8 h-8 mx-auto animate-spin text-emerald-600 mb-2" />
          <p className="text-xs text-slate-500 font-medium">Consolidando estados financieros...</p>
        </div>
      ) : !consolidado ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
          No hay información disponible para el periodo seleccionado.
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200 shadow-sm print-container space-y-6">
          {/* Encabezado Oficial del Informe */}
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
                <strong>Periodo Rendido:</strong> {MESES[mesInicio]} {anioInicio} a {MESES[mesFin]} {anioFin}
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
                  {/* Saldo Anterior */}
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

                  {/* Ingresos Rango */}
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

                  {/* Egresos Rango */}
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

                  {/* Movimientos Internos */}
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

                  {/* Saldo Final */}
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

          {/* CUADRO 2: Detalle de Egresos por Rubro con enlaces a Google Drive */}
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

          {/* CUADRO 3: Anexo de Socios Morosos y Saldos Pendientes (Page break para imprimir) */}
          <div className="space-y-3 pt-4 page-break">
            <h3 className="text-sm font-bold uppercase tracking-wider text-red-800 flex items-center gap-1.5 border-b pb-1">
              <Users className="w-4 h-4 text-red-600" />
              3. Anexo de Socios con Saldos Pendientes / Mora al Corte
            </h3>

            {consolidado.deudoresServicios.length === 0 && consolidado.deudoresAfiliaciones.length === 0 ? (
              <p className="text-xs text-emerald-700 font-semibold">
                ¡Excelente! No existen deudas pendientes de servicios ni afiliaciones al corte del periodo.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse border border-slate-200">
                  <thead>
                    <tr className="bg-red-50 text-red-900 font-bold border-b border-slate-200">
                      <th className="p-2 border-r border-slate-200">Socio</th>
                      <th className="p-2 border-r border-slate-200">Teléfono</th>
                      <th className="p-2 border-r border-slate-200">Puesto / Detalle</th>
                      <th className="p-2 border-r border-slate-200">Periodo / Concepto</th>
                      <th className="p-2 border-r border-slate-200 text-right">Total (Bs)</th>
                      <th className="p-2 border-r border-slate-200 text-right">Abonado (Bs)</th>
                      <th className="p-2 border-r border-slate-200 text-right text-red-700 font-black">Deuda (Bs)</th>
                      <th className="p-2 text-right">Multa (Bs)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {consolidado.deudoresServicios.map((d, i) => (
                      <tr key={`s-${i}`}>
                        <td className="p-2 border-r border-slate-200 font-bold">{d.socio}</td>
                        <td className="p-2 border-r border-slate-200">{d.telefono || '-'}</td>
                        <td className="p-2 border-r border-slate-200">{d.puesto}</td>
                        <td className="p-2 border-r border-slate-200">Servicios {d.periodo}</td>
                        <td className="p-2 border-r border-slate-200 text-right">{d.totalAPagar.toFixed(2)}</td>
                        <td className="p-2 border-r border-slate-200 text-right text-emerald-700">{d.totalPagado.toFixed(2)}</td>
                        <td className="p-2 border-r border-slate-200 text-right font-bold text-red-700">
                          {d.saldoPendiente.toFixed(2)}
                        </td>
                        <td className="p-2 text-right">{d.multa > 0 ? `${d.multa} Bs` : '0'}</td>
                      </tr>
                    ))}
                    {consolidado.deudoresAfiliaciones.map((a, i) => (
                      <tr key={`a-${i}`} className="bg-blue-50/30">
                        <td className="p-2 border-r border-slate-200 font-bold">{a.socio}</td>
                        <td className="p-2 border-r border-slate-200">{a.telefono || '-'}</td>
                        <td className="p-2 border-r border-slate-200">Afiliación Nueva</td>
                        <td className="p-2 border-r border-slate-200">Cuota {a.cuotaAcordada} Bs/mes</td>
                        <td className="p-2 border-r border-slate-200 text-right">{parseFloat(a.totalPlan).toFixed(2)}</td>
                        <td className="p-2 border-r border-slate-200 text-right text-emerald-700">{a.totalPagado.toFixed(2)}</td>
                        <td className="p-2 border-r border-slate-200 text-right font-bold text-red-700">
                          {parseFloat(a.saldoPendiente).toFixed(2)}
                        </td>
                        <td className="p-2 text-right">-</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pie de Firmas Oficiales para la Asamblea */}
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
      )}
    </div>
  )
}
