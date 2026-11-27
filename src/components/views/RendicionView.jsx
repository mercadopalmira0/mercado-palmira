import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { calcularConsolidadoRendicion } from '../../lib/calculosRendicion'
import { descargarRendicionExcel, descargarMatricesExcel } from '../../lib/exportExcel'
import { registrarAuditoria } from '../../lib/auditoria'
import { MESES, getLocalDateStr, formatFechaDMY } from '../../lib/formatters'
import InformeConsolidadoTab from './rendicion/InformeConsolidadoTab'
import MatrizPeriodoTab from './rendicion/MatrizPeriodoTab'
import MatrizDeudoresTab from './rendicion/MatrizDeudoresTab'
import BalanceMensualTab from './rendicion/BalanceMensualTab'
import {
  Printer,
  Download,
  Lock,
  RefreshCw,
  X,
  Wallet,
  CheckCircle2,
  Table2,
  AlertCircle,
  BarChart3,
} from 'lucide-react'

function getDefaultFechaCorte(mesFin, anioFin) {
  const m = parseInt(mesFin, 10) || 1
  const y = parseInt(anioFin, 10) || new Date().getFullYear()
  const nextMonth = m === 12 ? 1 : m + 1
  const nextYear = m === 12 ? y + 1 : y
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}-24`
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
  const [rawBalanceData, setRawBalanceData] = useState(null)
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
        { data: extrasCampanasData },
        { data: extrasCuotasData },
        { data: extrasPagosData },
        { data: extrasEgresosData },
        { data: pagosGuardiaData },
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
          deudores_ciclos (caja, origen, nombre_deudor, detalle_deuda, puesto_referencia)
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
        supabase.from('cobros_extras_campanas').select('*').neq('estado', 'anulada').order('created_at', { ascending: false }),
        supabase
          .from('cobros_extras_cuotas')
          .select(`
            id, campana_id, unidad_id, externo_id, nombre_titular, puesto_referencia, cantidad_puestos, monto_esperado, monto_pagado, estado,
            cobros_extras_campanas (id, nombre, estado),
            unidades_cobro (id, numero_identificador, socio_responsable_id, socios (id, nombre, telefono)),
            aportantes_externos (id, nombre_completo, telefono)
          `)
          .in('estado', ['pendiente', 'parcial']),
        supabase.from('pagos_cobros_extras').select('*').eq('anulado', false),
        supabase.from('egresos_cobros_extras').select('*').eq('anulado', false),
        supabase.from('pagos_guardia').select('*'),
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
        cobrosExtrasCampanas: extrasCampanasData || [],
        cobrosExtrasCuotas: extrasCuotasData || [],
        pagosCobrosExtras: extrasPagosData || [],
        egresosCobrosExtras: extrasEgresosData || [],
        periodosMensuales: periodosData || [],
        pagosGuardia: pagosGuardiaData || [],
      })

      setRawBalanceData({
        ciclosHacienda: ciclosData || [],
        saldosIniciales: saldosData || [],
        periodosMensuales: periodosData || [],
        pagosServicios: pagosServiciosData || [],
        cobrosServicios: cobrosData || [],
        cobrosExternos: cobrosExternosData || [],
        pagosDeudoresCiclos: pagosDeudoresData || [],
        egresos: egresosData || [],
        pagosGuardia: pagosGuardiaData || [],
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

        <button
          type="button"
          onClick={() => setActiveTab('balance_mensual')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
            activeTab === 'balance_mensual'
              ? 'bg-indigo-700 text-white border-indigo-700 shadow-sm'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Balance Mes a Mes</span>
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
        <InformeConsolidadoTab
          consolidado={consolidado}
          mesInicio={mesInicio}
          anioInicio={anioInicio}
          mesFin={mesFin}
          anioFin={anioFin}
          fechaCorte={fechaCorte}
          estanTodosRendidos={estanTodosRendidos}
        />
      ) : activeTab === 'matriz_periodo' ? (
        <MatrizPeriodoTab
          consolidado={consolidado}
          mesInicio={mesInicio}
          anioInicio={anioInicio}
          mesFin={mesFin}
          anioFin={anioFin}
          matrizSearch={matrizSearch}
          setMatrizSearch={setMatrizSearch}
          matrizFilter={matrizFilter}
          setMatrizFilter={setMatrizFilter}
        />
      ) : activeTab === 'matriz_deudores' ? (
        <MatrizDeudoresTab
          consolidado={consolidado}
          deudorSearch={deudorSearch}
          setDeudorSearch={setDeudorSearch}
          deudorFilter={deudorFilter}
          setDeudorFilter={setDeudorFilter}
          expandedDeudores={expandedDeudores}
          toggleExpandDeudor={toggleExpandDeudor}
        />
      ) : (
        <BalanceMensualTab
          consolidado={consolidado}
          rawBalanceData={rawBalanceData}
          defaultMes={mesFin}
          defaultAnio={anioFin}
        />
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
