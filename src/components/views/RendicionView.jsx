import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { calcularConsolidadoRendicion, round2 } from '../../lib/calculosRendicion'
import { descargarRendicionExcel, descargarMatricesExcel } from '../../lib/exportExcel'
import { registrarAuditoria } from '../../lib/auditoria'
import { MESES, getLocalDateStr } from '../../lib/formatters'
import {
  FileSpreadsheet,
  Printer,
  Download,
  Lock,
  RefreshCw,
  X,
  ExternalLink,
  Wallet,
  Users,
  CheckCircle2,
  ClipboardCheck,
  Search,
  ChevronDown,
  ChevronRight,
  Table2,
  AlertCircle
} from 'lucide-react'

function getDefaultFechaCorte(mesFin, anioFin) {
  const m = parseInt(mesFin, 10) || 1
  const y = parseInt(anioFin, 10) || new Date().getFullYear()
  const nextMonth = m === 12 ? 1 : m + 1
  const nextYear = m === 12 ? y + 1 : y
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}-24`
}

function formatFechaDMY(fechaStr) {
  if (!fechaStr) return ''
  const [y, m, d] = String(fechaStr).split('T')[0].split('-')
  if (y && m && d) return `${d}/${m}/${y}`
  return fechaStr
}

export default function RendicionView() {
  const { user, isAdmin } = useAuth()
  const today = new Date()

  const currentMonth = today.getMonth() + 1
  const currentYear = today.getFullYear()

  const defaultStartMonth = currentMonth >= 3 ? currentMonth - 2 : 1
  const [mesInicio, setMesInicio] = useState(defaultStartMonth)
  const [anioInicio, setAnioInicio] = useState(currentYear)
  const [mesFin, setMesFin] = useState(currentMonth)
  const [anioFin, setAnioFin] = useState(currentYear)
  const [fechaCorte, setFechaCorte] = useState(() => getDefaultFechaCorte(currentMonth, currentYear))

  const [consolidado, setConsolidado] = useState(null)
  const [periodosRango, setPeriodosRango] = useState([])
  const [cicloAbierto, setCicloAbierto] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lockingPeriod, setLockingPeriod] = useState(false)
  const [statusMessage, setStatusMessage] = useState(null)

  // Pestañas y filtros de matrices
  const [activeTab, setActiveTab] = useState('resumen') // 'resumen' | 'matriz_periodo' | 'matriz_deudores'
  const [matrizFilter, setMatrizFilter] = useState('todos') // 'todos' | 'deben' | 'al_dia'
  const [matrizSearch, setMatrizSearch] = useState('')
  const [deudorFilter, setDeudorFilter] = useState('todos') // 'todos' | 'periodo_actual' | 'deuda_anterior'
  const [deudorSearch, setDeudorSearch] = useState('')
  const [expandedDeudores, setExpandedDeudores] = useState({})

  // Modal de Cierre de Periodo y Traslado de Deudores
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false)
  const [nombreNuevoCiclo, setNombreNuevoCiclo] = useState('')
  const [trasladarDeudas, setTrasladarDeudas] = useState(true)

  const loadData = async () => {
    setLoading(true)
    setStatusMessage(null)
    try {
      const [
        { data: periodosData },
        { data: ciclosData },
        { data: saldosData },
        { data: pagosServiciosData },
        { data: cobrosData },
        { data: pagosAfiliacionData },
        { data: afiliacionesData },
        { data: deudoresCiclosData },
        { data: pagosDeudoresData },
        { data: cobrosExternosData },
        { data: aportantesExternosData },
        { data: unidadesData },
        { data: egresosData },
        { data: movimientosData },
      ] = await Promise.all([
        supabase.from('periodos_mensuales').select('*'),
        supabase.from('ciclos_hacienda').select('*').order('created_at', { ascending: false }),
        supabase.from('saldos_iniciales').select('*'),
        supabase.from('pagos_servicios').select(`
          id, monto, metodo_pago, nro_talonario_fisico, estado, fecha_pago,
          cobros_servicios (
            id, total_a_pagar, monto_base, monto_luz_redondeado, monto_multa, cantidad_puestos_aplicada,
            monto_guardia, monto_agua, monto_luz_grupo, es_monto_editado,
            nombre_socio_historico,
            periodos_mensuales (mes, anio),
            unidades_cobro (
              numero_identificador,
              socios (nombre, telefono)
            )
          )
        `),
        supabase.from('cobros_servicios').select(`
          id, unidad_id, total_a_pagar, monto_multa, estado, cantidad_puestos_aplicada,
          socio_id_historico, nombre_socio_historico,
          periodos_mensuales (mes, anio),
          unidades_cobro (
            id, numero_identificador, cantidad_puestos, socio_responsable_id,
            socios (id, nombre, telefono)
          ),
          pagos_servicios (id, monto, estado)
        `),
        supabase.from('pagos_afiliacion').select(`
          id, monto, metodo_pago, nro_talonario_fisico, estado, fecha_pago,
          afiliaciones (
            id, monto_total, saldo_pendiente,
            socios (nombre, telefono)
          )
        `),
        supabase.from('afiliaciones').select(`
          id, socio_id, monto_total, cuota_acordada, saldo_pendiente, estado,
          socios (id, nombre, telefono),
          pagos_afiliacion (id, monto, estado)
        `),
        supabase.from('deudores_ciclos').select(`
          *,
          socios (id, nombre, telefono)
        `),
        supabase.from('pagos_deudores_ciclos').select(`
          id, monto, metodo_pago, fecha_pago, anulado, nro_talonario_fisico,
          deudores_ciclos (caja, nombre_deudor)
        `),
        supabase.from('cobros_externos').select(`
          id, externo_id, anio, mes, monto_correspondiente, monto_pagado, monto_guardia, monto_agua, es_monto_editado, metodo_pago, nro_talonario_fisico, fecha_pago, anulado,
          aportantes_externos (id, nombre_completo, referencia_ubicacion)
        `),
        supabase.from('aportantes_externos').select('*').eq('activo', true),
        supabase.from('unidades_cobro').select(`
          id, socio_responsable_id, numero_identificador, nombres_titulares, nombre_grupo,
          tipo, subtipo_fijo, monto_fijo_personalizado, cantidad_puestos, activo, grupo_padre_id,
          socios (id, nombre, telefono)
        `),
        supabase.from('egresos').select('*'),
        supabase.from('movimientos_internos').select('*'),
      ])

      const periodosEnRango = (periodosData || []).filter((p) => {
        const pDate = new Date(p.anio, p.mes - 1, 1)
        const dIni = new Date(anioInicio, mesInicio - 1, 1)
        const dFin = new Date(anioFin, mesFin - 1, 1)
        return pDate >= dIni && pDate <= dFin
      })
      setPeriodosRango(periodosEnRango)

      const abierto = (ciclosData || []).find((c) => c.estado === 'abierto') || null
      setCicloAbierto(abierto)

      const resultado = calcularConsolidadoRendicion({
        mesInicio,
        anioInicio,
        mesFin,
        anioFin,
        fechaCorte,
        ciclosHacienda: ciclosData || [],
        saldosIniciales: saldosData || [],
        pagosServicios: pagosServiciosData || [],
        pagosAfiliacion: pagosAfiliacionData || [],
        pagosDeudoresCiclos: pagosDeudoresData || [],
        cobrosExternos: cobrosExternosData || [],
        egresos: egresosData || [],
        movimientosInternos: movimientosData || [],
        cobrosServicios: cobrosData || [],
        afiliaciones: afiliacionesData || [],
        deudoresCiclos: deudoresCiclosData || [],
        unidadesCobro: unidadesData || [],
        aportantesExternos: aportantesExternosData || [],
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
  }, [mesInicio, anioInicio, mesFin, anioFin, fechaCorte])

  const handleMesFinChange = (newMes) => {
    setMesFin(newMes)
    setFechaCorte(getDefaultFechaCorte(newMes, anioFin))
  }

  const handleAnioFinChange = (newAnio) => {
    setAnioFin(newAnio)
    setFechaCorte(getDefaultFechaCorte(mesFin, newAnio))
  }

  const setPreset = (tipo) => {
    if (tipo === 'trimestre') {
      const startM = currentMonth >= 3 ? currentMonth - 2 : 1
      setMesInicio(startM)
      setAnioInicio(currentYear)
      setMesFin(currentMonth)
      setAnioFin(currentYear)
      setFechaCorte(getDefaultFechaCorte(currentMonth, currentYear))
    } else if (tipo === 'cuatrimestre') {
      const startM = currentMonth >= 4 ? currentMonth - 3 : 1
      setMesInicio(startM)
      setAnioInicio(currentYear)
      setMesFin(currentMonth)
      setAnioFin(currentYear)
      setFechaCorte(getDefaultFechaCorte(currentMonth, currentYear))
    } else if (tipo === 'anio') {
      setMesInicio(1)
      setAnioInicio(currentYear)
      setMesFin(12)
      setAnioFin(currentYear)
      setFechaCorte(getDefaultFechaCorte(12, currentYear))
    }
  }

  const openCloseCycleModal = () => {
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
    const nextMonth = mesFin === 12 ? 1 : mesFin + 1
    const nextYear = mesFin === 12 ? anioFin + 1 : anioFin
    setNombreNuevoCiclo(`Ciclo desde ${MESES[nextMonth]} ${nextYear}`)
    setTrasladarDeudas(true)
    setIsCloseModalOpen(true)
  }

  // Sellar Rendición, cerrar ciclo actual en ciclos_hacienda, crear nuevo ciclo abierto y trasladar deudores
  const handleConfirmarCierreAsamblea = async (e) => {
    e.preventDefault()
    if (!consolidado) return

    setLockingPeriod(true)
    try {
      const now = new Date()
      const nowIso = now.toISOString()
      const ids = periodosRango.map((p) => p.id)

      // 1. Marcar periodos_mensuales como rendidos
      const { error: pError } = await supabase
        .from('periodos_mensuales')
        .update({
          rendido_en_asamblea: true,
          fecha_rendicion: nowIso,
        })
        .in('id', ids)
      if (pError) throw pError

      // 2. Fecha de cierre exacta = Fecha de Corte de Asamblea; nuevo ciclo inicia al día siguiente
      const fechaCierreStr = fechaCorte || getDefaultFechaCorte(mesFin, anioFin)
      const [cy, cm, cd] = fechaCierreStr.split('-').map(Number)
      const nextDayDate = new Date(cy, cm - 1, cd + 1)
      const fechaInicioNuevoStr = getLocalDateStr(nextDayDate)

      const saldosCierre = {
        servicios_efectivo_final: consolidado.finServiciosEf,
        servicios_qr_final: consolidado.finServiciosQr,
        afiliaciones_efectivo_final: consolidado.finAfiliacionesEf,
        afiliaciones_qr_final: consolidado.finAfiliacionesQr,
      }

      const nombreCicloCerrado =
        cicloAbierto?.nombre || `Ciclo ${MESES[mesInicio]} ${anioInicio} - ${MESES[mesFin]} ${anioFin}`

      if (cicloAbierto) {
        const { error: cErr } = await supabase
          .from('ciclos_hacienda')
          .update({
            estado: 'cerrado',
            fecha_cierre: fechaCierreStr,
            ...saldosCierre,
          })
          .eq('id', cicloAbierto.id)
        if (cErr) throw cErr
      } else {
        const { error: cInsErr } = await supabase.from('ciclos_hacienda').insert([
          {
            nombre: nombreCicloCerrado,
            fecha_inicio: getLocalDateStr(consolidado.fechaInicio),
            fecha_cierre: fechaCierreStr,
            es_inicial: true,
            estado: 'cerrado',
            servicios_efectivo_inicial: consolidado.antServiciosEf,
            servicios_qr_inicial: consolidado.antServiciosQr,
            afiliaciones_efectivo_inicial: consolidado.antAfiliacionesEf,
            afiliaciones_qr_inicial: consolidado.antAfiliacionesQr,
            ...saldosCierre,
          },
        ])
        if (cInsErr) throw cInsErr
      }

      // 3. Crear automáticamente el NUEVO ciclo abierto con los saldos finales como saldo inicial
      const { error: newCicloErr } = await supabase.from('ciclos_hacienda').insert([
        {
          nombre: nombreNuevoCiclo.trim() || `Ciclo Post-Rendición (${fechaInicioNuevoStr})`,
          fecha_inicio: fechaInicioNuevoStr,
          es_inicial: false,
          estado: 'abierto',
          servicios_efectivo_inicial: consolidado.finServiciosEf,
          servicios_qr_inicial: consolidado.finServiciosQr,
          afiliaciones_efectivo_inicial: consolidado.finAfiliacionesEf,
          afiliaciones_qr_inicial: consolidado.finAfiliacionesQr,
          observaciones: `Arrastre automático desde cierre: ${nombreCicloCerrado}`,
        },
      ])
      if (newCicloErr) throw newCicloErr

      // 4. Trasladar saldos pendientes a deudores_ciclos si el usuario lo confirmó
      let trasladadosCount = 0
      if (trasladarDeudas) {
        const { data: existentes } = await supabase
          .from('deudores_ciclos')
          .select('nombre_deudor, detalle_deuda, ciclo_origen')
          .eq('ciclo_origen', nombreCicloCerrado)

        const existKeys = new Set(
          (existentes || []).map((x) => `${x.nombre_deudor}|${x.detalle_deuda}|${x.ciclo_origen}`)
        )

        const deudasParaInsertar = []

        for (const ds of consolidado.deudoresServicios || []) {
          const detalle = `Servicios ${ds.periodo} (Saldo pendiente al cierre)`
          const key = `${ds.socio}|${detalle}|${nombreCicloCerrado}`
          if (!existKeys.has(key) && ds.saldoPendiente > 0) {
            deudasParaInsertar.push({
              socio_id: ds.socioId || null,
              nombre_deudor: ds.socio,
              puesto_referencia: ds.puesto || null,
              caja: 'servicios',
              origen: 'cierre_ciclo',
              ciclo_origen: nombreCicloCerrado,
              detalle_deuda: detalle,
              monto_original: ds.saldoPendiente,
              monto_pagado: 0,
              estado: 'pendiente',
            })
          }
        }

        for (const da of consolidado.deudoresAfiliaciones || []) {
          const detalle = `Afiliación (Plan ${da.totalPlan} Bs - Saldo pendiente al cierre)`
          const key = `${da.socio}|${detalle}|${nombreCicloCerrado}`
          if (!existKeys.has(key) && parseFloat(da.saldoPendiente) > 0) {
            deudasParaInsertar.push({
              socio_id: da.socioId || null,
              nombre_deudor: da.socio,
              puesto_referencia: 'Afiliación',
              caja: 'afiliaciones',
              origen: 'cierre_ciclo',
              ciclo_origen: nombreCicloCerrado,
              detalle_deuda: detalle,
              monto_original: parseFloat(da.saldoPendiente),
              monto_pagado: 0,
              estado: 'pendiente',
            })
          }
        }

        if (deudasParaInsertar.length > 0) {
          const { error: dErr } = await supabase.from('deudores_ciclos').insert(deudasParaInsertar)
          if (dErr) throw dErr
          trasladadosCount = deudasParaInsertar.length
        }
      }

      // 5. Auditoría
      await registrarAuditoria({
        usuarioId: user?.id,
        accion: 'RENDICION_EN_ASAMBLEA_SELLADA',
        detalleJson: {
          descripcion: `Rendición sellada (${mesInicio}/${anioInicio} - ${mesFin}/${anioFin}, corte ${fechaCierreStr}). Nuevo ciclo: ${nombreNuevoCiclo}. Deudas trasladadas: ${trasladadosCount}.`,
          rango: `${mesInicio}/${anioInicio} - ${mesFin}/${anioFin}`,
          fecha_corte: fechaCierreStr,
          periodos_afectados: ids.length,
          saldos_cierre: saldosCierre,
          deudores_trasladados: trasladadosCount,
        },
      })

      setIsCloseModalOpen(false)
      setStatusMessage({
        type: 'success',
        text: `¡Periodo rendido en Asamblea! Se cerró el ciclo al ${formatFechaDMY(fechaCierreStr)}, se abrió "${nombreNuevoCiclo}" desde el ${formatFechaDMY(fechaInicioNuevoStr)} con los saldos exactos${trasladadosCount > 0 ? ` y se trasladaron ${trasladadosCount} deudas a Deudores` : ''}.`,
      })
      await loadData()
    } catch (err) {
      console.error(err)
      setStatusMessage({ type: 'error', text: 'Error al sellar asamblea: ' + err.message })
    } finally {
      setLockingPeriod(false)
    }
  }

  const handleExportExcel = () => {
    if (!consolidado) return
    descargarRendicionExcel(consolidado, {
      mesInicio,
      anioInicio,
      mesFin,
      anioFin,
      fechaCorte,
      fechaEmision: new Date().toLocaleDateString('es-BO'),
    })
  }

  const handleExportMatrices = () => {
    if (!consolidado) return
    descargarMatricesExcel(consolidado, {
      mesInicio,
      anioInicio,
      mesFin,
      anioFin,
      fechaCorte,
      fechaEmision: new Date().toLocaleDateString('es-BO'),
    })
  }

  const toggleExpandDeudor = (key) => {
    setExpandedDeudores((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const estanTodosRendidos = periodosRango.length > 0 && periodosRango.every((p) => p.rendido_en_asamblea)
  const cp = consolidado?.cumplimientoPuestos || {}

  return (
    <div className="space-y-6">
      {/* Barra de Control */}
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
              Consolidador financiero, cumplimiento de puestos, exportación Excel/PDF y cierre con arrastre de ciclo.
            </p>
          </div>

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
              onClick={handleExportMatrices}
              disabled={loading || !consolidado}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
            >
              <Table2 className="w-4 h-4" />
              <span>Solo Matrices (.xlsx)</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              disabled={loading || !consolidado}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Guardar PDF</span>
            </button>

            {isAdmin && !estanTodosRendidos && (
              <button
                type="button"
                onClick={openCloseCycleModal}
                disabled={lockingPeriod || loading || periodosRango.length === 0}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
              >
                <Lock className="w-4 h-4" />
                <span>Marcar Periodo como Rendido en Asamblea</span>
              </button>
            )}
          </div>
        </div>

        {/* Selector de Fechas */}
        <div className="pt-3 border-t border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
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
                {[2024, 2025, 2026, 2027, 2028].map((y) => (
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
                onChange={(e) => handleMesFinChange(parseInt(e.target.value, 10))}
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
                onChange={(e) => handleAnioFinChange(parseInt(e.target.value, 10))}
                className="bg-transparent font-bold text-slate-800 pl-1 border-l border-slate-200 focus:outline-none"
              >
                {[2024, 2025, 2026, 2027, 2028].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-xl px-2.5 py-1">
              <span className="font-bold text-emerald-900">Fecha de Corte de Asamblea:</span>
              <input
                type="date"
                value={fechaCorte}
                onChange={(e) => setFechaCorte(e.target.value)}
                className="bg-transparent font-bold text-emerald-950 focus:outline-none"
              />
            </label>
          </div>

          <div className="flex items-center space-x-1.5 font-medium">
            <span className="text-slate-400">Presets:</span>
            <button type="button" onClick={() => setPreset('trimestre')} className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700">
              Trimestre
            </button>
            <button type="button" onClick={() => setPreset('cuatrimestre')} className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700">
              Cuatrimestre
            </button>
            <button type="button" onClick={() => setPreset('anio')} className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700">
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

      {/* Pestañas de Visualización */}
      <div className="flex flex-wrap gap-2 no-print">
        <button
          type="button"
          onClick={() => setActiveTab('resumen')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
            activeTab === 'resumen'
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>Informe Consolidado (Asamblea)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('matriz_periodo')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
            activeTab === 'matriz_periodo'
              ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Table2 className="w-4 h-4" />
          <span>Matriz de Cobranza — Solo Periodo</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('matriz_deudores')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
            activeTab === 'matriz_deudores'
              ? 'bg-red-700 text-white border-red-700 shadow-sm'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <AlertCircle className="w-4 h-4" />
          <span>
            Deudores ({consolidado?.matrizDeudores?.resumenPorDeudor?.length || 0})
          </span>
        </button>
      </div>

      {/* REPORTE OFICIAL IMPRIMIBLE */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <RefreshCw className="w-8 h-8 mx-auto animate-spin text-emerald-600 mb-2" />
          <p className="text-xs text-slate-500 font-medium">Consolidando estados financieros...</p>
        </div>
      ) : !consolidado ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
          No hay información disponible para el periodo seleccionado.
        </div>
      ) : activeTab === 'resumen' ? (
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

                  {/* Ingresos */}
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

                  {/* Egresos */}
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

          {/* BLOQUE NUEVO: Resumen de Cumplimiento de Cobros */}
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

          {/* Desglose Interno de Ingresos Caja Servicios (Guardia / Agua / Grupo Luz) */}
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
      ) : activeTab === 'matriz_periodo' ? (
        (() => {
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
        })()
      ) : (
        (() => {
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
            if (origen === 'Mes actual') {
              return 'bg-red-100 text-red-800 border-red-200'
            }
            if (origen === 'Deuda anterior') {
              return 'bg-amber-100 text-amber-900 border-amber-200'
            }
            if (origen === 'Externo') {
              return 'bg-indigo-100 text-indigo-800 border-indigo-200'
            }
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
        })()
      )}

      {/* Modal Confirmación Cierre de Periodo y Arrastre de Ciclo */}
      {isCloseModalOpen && consolidado && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm no-print">
          <div className="w-full max-w-lg max-h-[88dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
            <div className="shrink-0 bg-slate-900 px-5 py-3.5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm sm:text-base truncate">Cerrar Periodo y Abrir Nuevo Ciclo</h3>
                  <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                    Rango: {MESES[mesInicio]} {anioInicio} a {MESES[mesFin]} {anioFin} • Corte: {formatFechaDMY(fechaCorte)}
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => setIsCloseModalOpen(false)} className="p-1.5 text-slate-300 hover:text-white shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmarCierreAsamblea} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5">
                <span className="font-bold text-slate-800 block">
                  Saldos Finales que pasarán como Saldo Inicial del Nuevo Ciclo:
                </span>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-emerald-700 font-bold uppercase block">Caja Servicios</span>
                    <p className="font-bold">Ef: {consolidado.finServiciosEf.toFixed(2)} Bs</p>
                    <p className="font-bold">QR: {consolidado.finServiciosQr.toFixed(2)} Bs</p>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-blue-700 font-bold uppercase block">Caja Afiliaciones</span>
                    <p className="font-bold">Ef: {consolidado.finAfiliacionesEf.toFixed(2)} Bs</p>
                    <p className="font-bold">QR: {consolidado.finAfiliacionesQr.toFixed(2)} Bs</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre del Nuevo Ciclo Abierto
                </label>
                <input
                  type="text"
                  required
                  value={nombreNuevoCiclo}
                  onChange={(e) => setNombreNuevoCiclo(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-semibold"
                />
              </div>

              <label className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-950 cursor-pointer">
                <input
                  type="checkbox"
                  checked={trasladarDeudas}
                  onChange={(e) => setTrasladarDeudas(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded mt-0.5"
                />
                <span>
                  <strong>Trasladar saldos pendientes al módulo de Deudores ({consolidado.deudoresServicios.length + consolidado.deudoresAfiliaciones.length} pendientes)</strong>
                  <span className="block text-[11px] text-amber-800 mt-0.5">
                    Permite seguir cobrando estos saldos en el nuevo ciclo desde DeudoresView sin perder historial.
                  </span>
                </span>
              </label>

              </div>

              <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCloseModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={lockingPeriod}
                  className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{lockingPeriod ? 'Cerrando...' : 'Confirmar y Sellar'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
