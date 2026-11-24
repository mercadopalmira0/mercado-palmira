import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { calcularDesgloseCobro, roundLuz, calcularConsumo } from '../../lib/calculosCobro'
import AbrirMesModal from '../modals/AbrirMesModal'
import CobrarModal from '../modals/CobrarModal'
import HistorialPagosModal from '../modals/HistorialPagosModal'
import PerdonarMultaModal from '../modals/PerdonarMultaModal'
import FotoUploaderModal from '../modals/FotoUploaderModal'
import {
  Receipt,
  Zap,
  Search,
  Filter,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  Coins,
  QrCode,
  RefreshCw,
  Camera,
  Layers,
  Store,
  ExternalLink,
  ShieldAlert,
  ChevronRight,
  Eye,
  Lock,
  PlusCircle,
  FileSpreadsheet
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

export default function CobrarView() {
  const { user, isAdmin } = useAuth()

  // Selección de fecha actual
  const today = new Date()
  const [selectedMes, setSelectedMes] = useState(today.getMonth() + 1)
  const [selectedAnio, setSelectedAnio] = useState(today.getFullYear())

  // Estado del periodo
  const [periodo, setPeriodo] = useState(null)
  const [cobros, setCobros] = useState([])
  const [tarifas, setTarifas] = useState({})
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterEstado, setFilterEstado] = useState('todos') // 'todos' | 'pendiente' | 'parcial' | 'pagado' | 'con_multa'
  const [statusMessage, setStatusMessage] = useState(null)

  // Modales
  const [isAbrirMesModalOpen, setIsAbrirMesModalOpen] = useState(false)
  const [selectedCobroForPago, setSelectedCobroForPago] = useState(null)
  const [selectedCobroForHistorial, setSelectedCobroForHistorial] = useState(null)
  const [selectedCobroForPerdon, setSelectedCobroForPerdon] = useState(null)
  const [photoModalTarget, setPhotoModalTarget] = useState(null) // { cobroId, currentUrl, titulo, customName }

  // Cargar tarifas vigentes
  useEffect(() => {
    supabase
      .from('configuracion_tarifas')
      .select('*')
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setTarifas(data)
      })
  }, [])

  // Cargar periodo y cobros del mes seleccionado
  const fetchPeriodoYCobros = async () => {
    setLoading(true)
    setStatusMessage(null)
    try {
      // 1. Obtener periodo mensual
      const { data: pData, error: pError } = await supabase
        .from('periodos_mensuales')
        .select('*')
        .eq('mes', selectedMes)
        .eq('anio', selectedAnio)
        .maybeSingle()

      if (pError) throw pError
      setPeriodo(pData || null)

      if (!pData) {
        setCobros([])
        setLoading(false)
        return
      }

      // 2. Obtener cobros_servicios con unidades, socios y pagos
      const { data: cData, error: cError } = await supabase
        .from('cobros_servicios')
        .select(`
          *,
          unidades_cobro (
            id,
            numero_identificador,
            nombres_titulares,
            tipo,
            subtipo_fijo,
            cantidad_puestos,
            codigo_tarifador,
            ultima_lectura,
            socios (
              id,
              nombre,
              telefono,
              fecha_pago_especial,
              activo
            )
          ),
          pagos_servicios (
            id,
            monto,
            metodo_pago,
            nro_talonario_fisico,
            estado,
            fecha_pago
          )
        `)
        .eq('periodo_id', pData.id)
        .order('created_at', { ascending: true })

      if (cError) throw cError

      // Procesar cálculos para cada cobro
      const processed = (cData || []).map((cobro) => {
        const pagosActivos = (cobro.pagos_servicios || []).filter((p) => p.estado === 'activo')
        const socio = cobro.unidades_cobro?.socios

        const desglose = calcularDesgloseCobro({
          modalidadAplicada: cobro.modalidad_aplicada,
          cantidadPuestos: cobro.cantidad_puestos_aplicada || 1,
          lecturaAnt: cobro.lectura_ant || 0,
          lecturaAct: cobro.lectura_act || 0,
          cambioTarifador: cobro.cambio_tarifador,
          precioKwh: pData.precio_kwh_calculado || 0,
          tarifas,
          diasProrroga: cobro.dias_prorroga || 0,
          fechaPagoEspecial: socio?.fecha_pago_especial,
          multaPerdonada: cobro.multa_perdonada || 0,
          pagosActivos,
          mes: selectedMes,
          anio: selectedAnio,
        })

        return {
          ...cobro,
          ...desglose,
          pagosActivos,
        }
      })

      setCobros(processed)
    } catch (err) {
      console.error(err)
      setStatusMessage({ type: 'error', text: 'Error al cargar cobros: ' + err.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (tarifas.id) {
      fetchPeriodoYCobros()
    }
  }, [selectedMes, selectedAnio, tarifas])

  // Actualizar lectura actual de un tarifador
  const handleUpdateLectura = async (cobro, nuevaLectura) => {
    const act = parseFloat(nuevaLectura) || 0
    try {
      const desglose = calcularDesgloseCobro({
        modalidadAplicada: cobro.modalidad_aplicada,
        cantidadPuestos: cobro.cantidad_puestos_aplicada,
        lecturaAnt: cobro.lectura_ant,
        lecturaAct: act,
        cambioTarifador: cobro.cambio_tarifador,
        precioKwh: periodo?.precio_kwh_calculado || 0,
        tarifas,
        diasProrroga: cobro.dias_prorroga,
        fechaPagoEspecial: cobro.unidades_cobro?.socios?.fecha_pago_especial,
        multaPerdonada: cobro.multa_perdonada,
        pagosActivos: cobro.pagosActivos,
        mes: selectedMes,
        anio: selectedAnio,
      })

      const { error } = await supabase
        .from('cobros_servicios')
        .update({
          lectura_act: act,
          monto_base: desglose.montoBase,
          monto_luz_redondeado: desglose.montoLuzRedondeado,
          monto_multa: desglose.montoMulta,
          total_a_pagar: desglose.totalAPagar,
          estado: desglose.estado,
        })
        .eq('id', cobro.id)

      if (error) throw error

      // Actualizar también ultima_lectura en unidades_cobro para que persista para el siguiente mes
      await supabase
        .from('unidades_cobro')
        .update({ ultima_lectura: act })
        .eq('id', cobro.unidad_id)

      // Actualizar localmente
      setCobros((prev) =>
        prev.map((c) => (c.id === cobro.id ? { ...c, ...desglose, lectura_act: act } : c))
      )
    } catch (err) {
      console.error(err)
      setStatusMessage({ type: 'error', text: 'Error al actualizar lectura: ' + err.message })
    }
  }

  // Alternar cambio de tarifador
  const handleToggleCambioTarifador = async (cobro) => {
    const nuevoCambio = !cobro.cambio_tarifador
    try {
      const desglose = calcularDesgloseCobro({
        modalidadAplicada: cobro.modalidad_aplicada,
        cantidadPuestos: cobro.cantidad_puestos_aplicada,
        lecturaAnt: cobro.lectura_ant,
        lecturaAct: cobro.lectura_act,
        cambioTarifador: nuevoCambio,
        precioKwh: periodo?.precio_kwh_calculado || 0,
        tarifas,
        diasProrroga: cobro.dias_prorroga,
        fechaPagoEspecial: cobro.unidades_cobro?.socios?.fecha_pago_especial,
        multaPerdonada: cobro.multa_perdonada,
        pagosActivos: cobro.pagosActivos,
        mes: selectedMes,
        anio: selectedAnio,
      })

      await supabase
        .from('cobros_servicios')
        .update({
          cambio_tarifador: nuevoCambio,
          monto_base: desglose.montoBase,
          monto_luz_redondeado: desglose.montoLuzRedondeado,
          monto_multa: desglose.montoMulta,
          total_a_pagar: desglose.totalAPagar,
          estado: desglose.estado,
        })
        .eq('id', cobro.id)

      setCobros((prev) =>
        prev.map((c) =>
          c.id === cobro.id ? { ...c, ...desglose, cambio_tarifador: nuevoCambio } : c
        )
      )
    } catch (err) {
      console.error(err)
    }
  }

  // Conceder prórroga de 2 días
  const handleToggleProrroga = async (cobro) => {
    const nuevaProrroga = cobro.dias_prorroga > 0 ? 0 : 2
    try {
      const desglose = calcularDesgloseCobro({
        modalidadAplicada: cobro.modalidad_aplicada,
        cantidadPuestos: cobro.cantidad_puestos_aplicada,
        lecturaAnt: cobro.lectura_ant,
        lecturaAct: cobro.lectura_act,
        cambioTarifador: cobro.cambio_tarifador,
        precioKwh: periodo?.precio_kwh_calculado || 0,
        tarifas,
        diasProrroga: nuevaProrroga,
        fechaPagoEspecial: cobro.unidades_cobro?.socios?.fecha_pago_especial,
        multaPerdonada: cobro.multa_perdonada,
        pagosActivos: cobro.pagosActivos,
        mes: selectedMes,
        anio: selectedAnio,
      })

      await supabase
        .from('cobros_servicios')
        .update({
          dias_prorroga: nuevaProrroga,
          monto_multa: desglose.montoMulta,
          total_a_pagar: desglose.totalAPagar,
          estado: desglose.estado,
        })
        .eq('id', cobro.id)

      setCobros((prev) =>
        prev.map((c) =>
          c.id === cobro.id ? { ...c, ...desglose, dias_prorroga: nuevaProrroga } : c
        )
      )
    } catch (err) {
      console.error(err)
    }
  }

  // Guardar foto de tarifador
  const handleSaveFotoTarifador = async (url) => {
    if (!photoModalTarget?.cobroId) return
    try {
      await supabase
        .from('cobros_servicios')
        .update({ foto_tarifador_drive_url: url })
        .eq('id', photoModalTarget.cobroId)

      setCobros((prev) =>
        prev.map((c) =>
          c.id === photoModalTarget.cobroId ? { ...c, foto_tarifador_drive_url: url } : c
        )
      )
      setPhotoModalTarget(null)
    } catch (err) {
      console.error(err)
    }
  }

  // Filtrado de cobros
  const filteredCobros = cobros.filter((c) => {
    const term = searchTerm.toLowerCase()
    const socioName = c.unidades_cobro?.socios?.nombre?.toLowerCase() || ''
    const puestoId = c.unidades_cobro?.numero_identificador?.toLowerCase() || ''
    const tarifadorCode = c.unidades_cobro?.codigo_tarifador?.toLowerCase() || ''

    const matchesSearch = !term || socioName.includes(term) || puestoId.includes(term) || tarifadorCode.includes(term)
    if (!matchesSearch) return false

    if (filterEstado === 'pendiente') return c.estado === 'pendiente'
    if (filterEstado === 'parcial') return c.estado === 'parcial'
    if (filterEstado === 'pagado') return c.estado === 'pagado'
    if (filterEstado === 'con_multa') return c.montoMulta > 0

    return true
  })

  // Estadísticas del mes
  const totalCobros = cobros.length
  const pagadosCount = cobros.filter((c) => c.estado === 'pagado').length
  const totalRecaudado = cobros.reduce((sum, c) => sum + (c.totalPagado || 0), 0)
  const totalPendiente = cobros.reduce((sum, c) => sum + (c.saldoPendiente || 0), 0)

  return (
    <div className="space-y-6">
      {/* Top Banner & Month Selector */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-slate-900">Cobro Mensual de Servicios</h2>
            {periodo ? (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                Periodo Abierto
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                Mes No Abierto
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Lectura de tarifadores, cálculo de luz redondeada, regla 0 kWh, multas y emisión de recibos.
          </p>
        </div>

        {/* Mes / Año Selector & Action */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 text-xs">
            <select
              value={selectedMes}
              onChange={(e) => setSelectedMes(parseInt(e.target.value, 10))}
              className="bg-transparent font-bold text-slate-800 py-1 px-2 focus:outline-none"
            >
              {MESES.slice(1).map((m, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {m}
                </option>
              ))}
            </select>
            <select
              value={selectedAnio}
              onChange={(e) => setSelectedAnio(parseInt(e.target.value, 10))}
              className="bg-transparent font-bold text-slate-800 py-1 px-2 border-l border-slate-200 focus:outline-none"
            >
              {[2024, 2025, 2026, 2027, 2028].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={fetchPeriodoYCobros}
            title="Recargar datos"
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setIsAbrirMesModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-900/20 transition-all flex items-center gap-1.5"
          >
            <Zap className="w-4 h-4" />
            <span>{periodo ? 'Configurar Factura de Luz' : 'Abrir Mes / Factura de Luz'}</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center justify-between ${
            statusMessage.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <span>{statusMessage.text}</span>
          <button onClick={() => setStatusMessage(null)}>
            <AlertCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Si el periodo no está abierto */}
      {!periodo && !loading && (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Zap className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-base font-bold text-slate-800">
              El periodo de {MESES[selectedMes]} {selectedAnio} no ha sido abierto
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Para registrar los cobros y capturar lecturas de luz de este mes, primero debes ingresar el monto total y los kWh consumidos de la factura general de energía eléctrica.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsAbrirMesModalOpen(true)}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all inline-flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            <span>Abrir Mes {MESES[selectedMes]} {selectedAnio}</span>
          </button>
        </div>
      )}

      {/* Si el periodo está abierto: Tarjetas de Resumen & Filtros */}
      {periodo && (
        <>
          {/* Factura de Luz y Resumen del Mes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Factura general */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
                Factura General de Luz
              </span>
              <p className="text-lg font-bold text-slate-900 mt-1">
                {parseFloat(periodo.factura_luz_bs).toFixed(2)}{' '}
                <span className="text-xs font-normal text-slate-500">Bs</span>
              </p>
              <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                <span>{periodo.factura_luz_kwh} kWh</span>
                <span className="font-mono font-bold text-emerald-700">
                  {periodo.precio_kwh_calculado} Bs/kWh
                </span>
              </div>
              {periodo.factura_luz_drive_url && (
                <a
                  href={periodo.factura_luz_drive_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Ver foto factura</span>
                </a>
              )}
            </div>

            {/* Progreso de Cobro */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Puestos Cobrados
              </span>
              <p className="text-lg font-bold text-slate-900 mt-1">
                {pagadosCount}{' '}
                <span className="text-xs font-normal text-slate-500">de {totalCobros} puestos</span>
              </p>
              <div className="w-full bg-slate-100 rounded-full h-2 mt-2">
                <div
                  className="bg-emerald-600 h-2 rounded-full transition-all"
                  style={{ width: `${totalCobros > 0 ? (pagadosCount / totalCobros) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Total Recaudado */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                Total Recaudado (Mes)
              </span>
              <p className="text-lg font-bold text-emerald-700 mt-1">
                {totalRecaudado.toFixed(2)}{' '}
                <span className="text-xs font-normal text-slate-500">Bs</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Suma de abonos activos recibidos</p>
            </div>

            {/* Total Pendiente */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 block">
                Saldo Pendiente
              </span>
              <p className="text-lg font-bold text-red-600 mt-1">
                {totalPendiente.toFixed(2)}{' '}
                <span className="text-xs font-normal text-slate-500">Bs</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Por cobrar a los socios</p>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por socio, número de puesto o código de tarifador..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto text-xs font-medium pb-1 sm:pb-0">
              <button
                onClick={() => setFilterEstado('todos')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  filterEstado === 'todos'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Todos ({cobros.length})
              </button>
              <button
                onClick={() => setFilterEstado('pendiente')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  filterEstado === 'pendiente'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Pendientes
              </button>
              <button
                onClick={() => setFilterEstado('parcial')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  filterEstado === 'parcial'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                A cuenta
              </button>
              <button
                onClick={() => setFilterEstado('pagado')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  filterEstado === 'pagado'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Pagados
              </button>
              <button
                onClick={() => setFilterEstado('con_multa')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  filterEstado === 'con_multa'
                    ? 'bg-red-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Con Multa
              </button>
            </div>
          </div>

          {/* Lista de Cobros por Puesto */}
          {loading ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
              <RefreshCw className="w-8 h-8 mx-auto animate-spin text-emerald-600 mb-2" />
              <p className="text-xs text-slate-500 font-medium">Cargando cobros del mes...</p>
            </div>
          ) : filteredCobros.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
              No se encontraron cobros coincidentes con el filtro.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCobros.map((cobro) => {
                const unidad = cobro.unidades_cobro
                const socio = unidad?.socios
                const isVariable = cobro.modalidad_aplicada === 'variable'
                const isPagado = cobro.estado === 'pagado'
                const isParcial = cobro.estado === 'parcial'

                return (
                  <div
                    key={cobro.id}
                    className={`bg-white rounded-2xl p-4 border transition-all shadow-sm hover:shadow-md ${
                      isPagado
                        ? 'border-emerald-200 bg-emerald-50/20'
                        : isParcial
                        ? 'border-blue-200 bg-blue-50/20'
                        : cobro.montoMulta > 0
                        ? 'border-red-200'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Socio & Puesto info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-bold text-sm text-slate-900 truncate">
                            {unidad?.numero_identificador} • {socio?.nombre || 'Sin socio'}
                          </h4>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              isPagado
                                ? 'bg-emerald-100 text-emerald-800'
                                : isParcial
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {cobro.estado}
                          </span>
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                          <span>
                            Modalidad:{' '}
                            <strong className="text-slate-700 capitalize">
                              {cobro.modalidad_aplicada.replace('_', ' ')}
                            </strong>
                          </span>
                          {(cobro.cantidad_puestos_aplicada || 1) > 1 && (
                            <span className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-semibold border border-purple-200">
                              {cobro.cantidad_puestos_aplicada} puestos agrupados
                            </span>
                          )}
                          {unidad?.codigo_tarifador && (
                            <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                              Tarifador: {unidad.codigo_tarifador}
                            </span>
                          )}
                        </div>

                        {/* Aviso regla 0 kWh */}
                        {cobro.reglaCeroKwhAplicada && (
                          <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            <span>Regla 0 kWh aplicada: Puesto cerrado (55 Bs)</span>
                          </div>
                        )}
                      </div>

                      {/* Captura de Lectura de Tarifador (Si es Variable) */}
                      {isVariable && (
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-wrap items-center gap-3 text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                              Ant. (kWh)
                            </span>
                            <span className="font-mono font-bold text-slate-700">
                              {cobro.lectura_ant || 0}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                              Act. (kWh)
                            </span>
                            <input
                              type="number"
                              step="0.01"
                              disabled={isPagado}
                              defaultValue={cobro.lectura_act || cobro.lectura_ant || 0}
                              onBlur={(e) => handleUpdateLectura(cobro, e.target.value)}
                              className="w-20 px-2 py-1 text-xs bg-white border border-slate-300 rounded font-mono font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                            />
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                              Consumo
                            </span>
                            <span className="font-mono font-bold text-emerald-700">
                              {cobro.consumoKwh} kWh
                            </span>
                          </div>

                          {/* Foto Tarifador */}
                          <div className="flex items-center space-x-1">
                            {cobro.foto_tarifador_drive_url && (
                              <a
                                href={cobro.foto_tarifador_drive_url}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 text-blue-600 hover:text-blue-800 bg-blue-50 rounded-lg"
                                title="Ver foto del tarifador"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                setPhotoModalTarget({
                                  cobroId: cobro.id,
                                  currentUrl: cobro.foto_tarifador_drive_url,
                                  titulo: `Foto Tarifador ${unidad?.codigo_tarifador || unidad?.numero_identificador}`,
                                  customName: `Tarifador_${unidad?.numero_identificador}_${selectedMes}-${selectedAnio}.jpg`,
                                })
                              }
                              className="p-1.5 text-slate-600 hover:text-emerald-700 bg-white border border-slate-200 rounded-lg"
                              title="Subir foto del medidor"
                            >
                              <Camera className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Cambio de tarifador */}
                          <label className="flex items-center space-x-1 text-[11px] text-slate-600 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={cobro.cambio_tarifador}
                              onChange={() => handleToggleCambioTarifador(cobro)}
                              className="w-3.5 h-3.5 text-emerald-600 rounded"
                            />
                            <span>Nuevo / 0</span>
                          </label>
                        </div>
                      )}

                      {/* Desglose de Montos y Multas */}
                      <div className="flex flex-wrap items-center gap-4 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                            Base + Luz
                          </span>
                          <span className="font-bold text-slate-800">
                            {(cobro.montoBase + cobro.montoLuzRedondeado).toFixed(2)} Bs
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            (Base {cobro.montoBase} + Luz {cobro.montoLuzRedondeado})
                          </span>
                        </div>

                        {/* Multa */}
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block flex items-center gap-1">
                            Multa Mora
                            {cobro.dias_prorroga > 0 && (
                              <span className="text-[9px] bg-purple-100 text-purple-700 px-1 rounded">
                                +2d
                              </span>
                            )}
                          </span>
                          <span
                            className={`font-bold ${
                              cobro.multaNeta > 0 ? 'text-red-600 font-mono' : 'text-slate-500'
                            }`}
                          >
                            {cobro.multaNeta > 0 ? `+${cobro.multaNeta.toFixed(2)} Bs` : '0.00 Bs'}
                          </span>
                          {cobro.motivoExencion && (
                            <span className="text-[10px] text-emerald-600 block truncate max-w-[120px]">
                              {cobro.motivoExencion}
                            </span>
                          )}
                        </div>

                        {/* Saldo Pendiente */}
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                            Saldo Pendiente
                          </span>
                          <span
                            className={`text-base font-extrabold ${
                              cobro.saldoPendiente > 0 ? 'text-red-600' : 'text-emerald-700'
                            }`}
                          >
                            {cobro.saldoPendiente.toFixed(2)} Bs
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            Total: {cobro.totalAPagar.toFixed(2)} Bs
                          </span>
                        </div>
                      </div>

                      {/* Botones de Acción */}
                      <div className="flex flex-wrap items-center gap-1.5 self-end lg:self-center">
                        <button
                          type="button"
                          onClick={() => setSelectedCobroForPago(cobro)}
                          disabled={isPagado}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1"
                        >
                          <Coins className="w-3.5 h-3.5" />
                          <span>Cobrar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedCobroForHistorial(cobro)}
                          className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                          title="Ver pagos y anular con motivo"
                        >
                          <Receipt className="w-4 h-4" />
                        </button>

                        {/* Botón rápido Prórroga */}
                        <button
                          type="button"
                          onClick={() => handleToggleProrroga(cobro)}
                          className={`px-2 py-1.5 rounded-xl border text-[11px] font-bold transition-colors ${
                            cobro.dias_prorroga > 0
                              ? 'bg-purple-600 text-white border-purple-600'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                          title="Conceder prórroga rápida de 2 días sin multa"
                        >
                          +2d
                        </button>

                        {/* Botón Perdonar Multa */}
                        {cobro.montoMulta > 0 && (
                          <button
                            type="button"
                            onClick={() => setSelectedCobroForPerdon(cobro)}
                            className="p-2 rounded-xl text-amber-600 hover:bg-amber-50 transition-colors"
                            title="Rebajar o perdonar multa con motivo escrito"
                          >
                            <Clock className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Modales */}
      <AbrirMesModal
        isOpen={isAbrirMesModalOpen}
        onClose={() => setIsAbrirMesModalOpen(false)}
        mes={selectedMes}
        anio={selectedAnio}
        periodoExistente={periodo}
        tarifas={tarifas}
        onMonthOpened={() => fetchPeriodoYCobros()}
      />

      <CobrarModal
        isOpen={Boolean(selectedCobroForPago)}
        onClose={() => setSelectedCobroForPago(null)}
        cobro={selectedCobroForPago}
        onPaymentSuccess={() => fetchPeriodoYCobros()}
      />

      <HistorialPagosModal
        isOpen={Boolean(selectedCobroForHistorial)}
        onClose={() => setSelectedCobroForHistorial(null)}
        cobro={selectedCobroForHistorial}
        onPaymentUpdated={() => fetchPeriodoYCobros()}
      />

      <PerdonarMultaModal
        isOpen={Boolean(selectedCobroForPerdon)}
        onClose={() => setSelectedCobroForPerdon(null)}
        cobro={selectedCobroForPerdon}
        onMultaUpdated={() => fetchPeriodoYCobros()}
      />

      {photoModalTarget && (
        <FotoUploaderModal
          isOpen={Boolean(photoModalTarget)}
          onClose={() => setPhotoModalTarget(null)}
          onPhotoSaved={handleSaveFotoTarifador}
          currentUrl={photoModalTarget.currentUrl}
          titulo={photoModalTarget.titulo}
          categoria="Tarifadores"
          anio={selectedAnio}
          mes={selectedMes}
          customName={photoModalTarget.customName}
        />
      )}
    </div>
  )
}
