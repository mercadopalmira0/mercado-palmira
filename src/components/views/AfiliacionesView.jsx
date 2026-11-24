import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import FotoUploaderModal from '../modals/FotoUploaderModal'
import {
  UserPlus,
  Search,
  Receipt,
  Coins,
  QrCode,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  PlusCircle,
  ShieldAlert,
  Calendar,
  ExternalLink,
  Trash2,
  Users
} from 'lucide-react'

export default function AfiliacionesView() {
  const { user } = useAuth()
  const [afiliaciones, setAfiliaciones] = useState([])
  const [socios, setSocios] = useState([])
  const [tarifas, setTarifas] = useState({})
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterEstado, setFilterEstado] = useState('todos') // 'todos' | 'en_curso' | 'completada'
  const [statusMessage, setStatusMessage] = useState(null)

  // Modales
  const [isNewPlanModalOpen, setIsNewPlanModalOpen] = useState(false)
  const [isAbonoModalOpen, setIsAbonoModalOpen] = useState(false)
  const [isHistorialModalOpen, setIsHistorialModalOpen] = useState(false)
  const [selectedAfiliacion, setSelectedAfiliacion] = useState(null)

  // Form Nueva Afiliación
  const [selectedSocioId, setSelectedSocioId] = useState('')
  const [montoTotal, setMontoTotal] = useState(1500)
  const [cuotaAcordada, setCuotaAcordada] = useState(100)
  const [savingPlan, setSavingPlan] = useState(false)

  // Form Registrar Abono
  const [abonoMonto, setAbonoMonto] = useState('')
  const [abonoMetodo, setAbonoMetodo] = useState('efectivo')
  const [abonoTalonario, setAbonoTalonario] = useState('')
  const [abonoComprobanteUrl, setAbonoComprobanteUrl] = useState('')
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false)
  const [savingAbono, setSavingAbono] = useState(false)

  // Historial y Anulación
  const [pagosAfiliacion, setPagosAfiliacion] = useState([])
  const [loadingPagos, setLoadingPagos] = useState(false)
  const [anulandoPagoId, setAnulandoPagoId] = useState(null)
  const [motivoAnulacion, setMotivoAnulacion] = useState('')

  // Cargar datos
  const fetchData = async () => {
    setLoading(true)
    setStatusMessage(null)
    try {
      // 1. Tarifas
      const { data: tData } = await supabase.from('configuracion_tarifas').select('*').limit(1).maybeSingle()
      if (tData) {
        setTarifas(tData)
        setMontoTotal(tData.costo_afiliacion || 1500)
      }

      // 2. Socios
      const { data: sData } = await supabase.from('socios').select('id, nombre, telefono').eq('activo', true).order('nombre')
      setSocios(sData || [])

      // 3. Afiliaciones con pagos
      const { data: aData, error: aError } = await supabase
        .from('afiliaciones')
        .select(`
          *,
          socios (id, nombre, telefono),
          pagos_afiliacion (id, monto, metodo_pago, nro_talonario_fisico, estado, fecha_pago, comprobante_drive_url, motivo_anulacion)
        `)
        .order('created_at', { ascending: false })

      if (aError) throw aError
      setAfiliaciones(aData || [])
    } catch (err) {
      console.error(err)
      setStatusMessage({ type: 'error', text: 'Error al cargar afiliaciones: ' + err.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Crear nuevo plan de afiliación
  const handleCreatePlan = async (e) => {
    e.preventDefault()
    if (!selectedSocioId) {
      setStatusMessage({ type: 'error', text: 'Selecciona un socio para iniciar la afiliación.' })
      return
    }

    setSavingPlan(true)
    try {
      const totalNum = parseFloat(montoTotal) || 1500
      const cuotaNum = parseFloat(cuotaAcordada) || 100

      const { error } = await supabase.from('afiliaciones').insert([
        {
          socio_id: selectedSocioId,
          monto_total: totalNum,
          cuota_acordada: cuotaNum,
          saldo_pendiente: totalNum,
          estado: 'en_curso',
        },
      ])

      if (error) throw error

      setStatusMessage({ type: 'success', text: '¡Plan de afiliación iniciado con éxito!' })
      setIsNewPlanModalOpen(false)
      setSelectedSocioId('')
      await fetchData()
    } catch (err) {
      console.error(err)
      setStatusMessage({ type: 'error', text: 'Error al crear plan de afiliación: ' + err.message })
    } finally {
      setSavingPlan(false)
    }
  }

  // Registrar abono a cuenta de afiliación
  const handleRegisterAbono = async (e) => {
    e.preventDefault()
    const montoNum = parseFloat(abonoMonto)
    if (!montoNum || montoNum <= 0) {
      setStatusMessage({ type: 'error', text: 'Ingresa un monto válido mayor a 0.' })
      return
    }

    setSavingAbono(true)
    try {
      // 1. Insertar en pagos_afiliacion
      const { error: pagoError } = await supabase.from('pagos_afiliacion').insert([
        {
          afiliacion_id: selectedAfiliacion.id,
          monto: montoNum,
          metodo_pago: abonoMetodo,
          nro_talonario_fisico: abonoTalonario.trim() || null,
          comprobante_drive_url: abonoComprobanteUrl || null,
          estado: 'activo',
          fecha_pago: new Date().toISOString(),
        },
      ])

      if (pagoError) throw pagoError

      // 2. Recalcular pagos activos
      const pagosActivos = (selectedAfiliacion.pagos_afiliacion || []).filter((p) => p.estado === 'activo')
      const nuevoTotalPagado = pagosActivos.reduce((sum, p) => sum + (parseFloat(p.monto) || 0), 0) + montoNum
      const nuevoSaldo = Math.max(0, selectedAfiliacion.monto_total - nuevoTotalPagado)
      const nuevoEstado = nuevoSaldo <= 0 ? 'completada' : 'en_curso'

      const { error: afError } = await supabase
        .from('afiliaciones')
        .update({
          saldo_pendiente: nuevoSaldo,
          estado: nuevoEstado,
        })
        .eq('id', selectedAfiliacion.id)

      if (afError) throw afError

      setStatusMessage({ type: 'success', text: `¡Abono de ${montoNum.toFixed(2)} Bs registrado en Caja Afiliaciones!` })
      setIsAbonoModalOpen(false)
      setAbonoMonto('')
      setAbonoTalonario('')
      setAbonoComprobanteUrl('')
      await fetchData()
    } catch (err) {
      console.error(err)
      setStatusMessage({ type: 'error', text: 'Error al registrar abono: ' + err.message })
    } finally {
      setSavingAbono(false)
    }
  }

  // Cargar pagos para modal historial
  const openHistorialModal = (afiliacion) => {
    setSelectedAfiliacion(afiliacion)
    setPagosAfiliacion(afiliacion.pagos_afiliacion || [])
    setAnulandoPagoId(null)
    setMotivoAnulacion('')
    setIsHistorialModalOpen(true)
  }

  // Anular pago de afiliación con motivo
  const handleAnularPago = async (pagoId) => {
    if (!motivoAnulacion.trim()) {
      setStatusMessage({ type: 'error', text: 'El motivo de anulación es obligatorio (regla de cero borrados).' })
      return
    }

    try {
      const { error: pError } = await supabase
        .from('pagos_afiliacion')
        .update({
          estado: 'anulado',
          motivo_anulacion: motivoAnulacion.trim(),
        })
        .eq('id', pagoId)

      if (pError) throw pError

      // Recalcular saldo pendiente
      const { data: actPagos, error: aError } = await supabase
        .from('pagos_afiliacion')
        .select('monto')
        .eq('afiliacion_id', selectedAfiliacion.id)
        .eq('estado', 'activo')

      if (aError) throw aError

      const totalActivo = actPagos?.reduce((sum, p) => sum + (parseFloat(p.monto) || 0), 0) || 0
      const nuevoSaldo = Math.max(0, selectedAfiliacion.monto_total - totalActivo)
      const nuevoEstado = nuevoSaldo <= 0 ? 'completada' : 'en_curso'

      await supabase
        .from('afiliaciones')
        .update({
          saldo_pendiente: nuevoSaldo,
          estado: nuevoEstado,
        })
        .eq('id', selectedAfiliacion.id)

      setStatusMessage({ type: 'success', text: 'Pago anulado y descontado de Caja Afiliaciones con registro en bitácora.' })
      setIsHistorialModalOpen(false)
      await fetchData()
    } catch (err) {
      console.error(err)
      setStatusMessage({ type: 'error', text: 'Error al anular pago: ' + err.message })
    }
  }

  // Filtrado
  const filteredAfiliaciones = afiliaciones.filter((a) => {
    const term = searchTerm.toLowerCase()
    const socioName = a.socios?.nombre?.toLowerCase() || ''
    const matchesSearch = !term || socioName.includes(term)
    if (!matchesSearch) return false

    if (filterEstado === 'en_curso') return a.estado === 'en_curso'
    if (filterEstado === 'completada') return a.estado === 'completada'
    return true
  })

  // Estadísticas globales
  const totalEnCurso = afiliaciones.filter((a) => a.estado === 'en_curso').length
  const totalCompletadas = afiliaciones.filter((a) => a.estado === 'completada').length
  const totalRecaudadoGlobal = afiliaciones.reduce((sum, a) => {
    const pagados = (a.pagos_afiliacion || [])
      .filter((p) => p.estado === 'activo')
      .reduce((s, p) => s + (parseFloat(p.monto) || 0), 0)
    return sum + pagados
  }, 0)
  const totalSaldoPendienteGlobal = afiliaciones.reduce((sum, a) => sum + (parseFloat(a.saldo_pendiente) || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-slate-900">Módulo de Afiliaciones (Nuevos Socios)</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
              Caja Afiliaciones
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Planes de pago estándar de 1.500 Bs, control de cuotas acordadas y amortización a saldo cero.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchData}
            title="Recargar afiliaciones"
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
          <button
            onClick={() => setIsNewPlanModalOpen(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-900/20 transition-all flex items-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Iniciar Nueva Afiliación</span>
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
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tarjetas de Resumen Global */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Planes en Curso
          </span>
          <p className="text-xl font-bold text-blue-700 mt-1">{totalEnCurso} socios</p>
          <span className="text-[11px] text-slate-400">Pagando cuotas mensuales</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
            Completadas
          </span>
          <p className="text-xl font-bold text-emerald-700 mt-1">{totalCompletadas} socios</p>
          <span className="text-[11px] text-slate-400">Amortizados al 100%</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Total Recaudado (Afiliaciones)
          </span>
          <p className="text-xl font-bold text-slate-900 mt-1">
            {totalRecaudadoGlobal.toFixed(2)}{' '}
            <span className="text-xs font-normal text-slate-500">Bs</span>
          </p>
          <span className="text-[11px] text-slate-400">Ingresado a Caja Afiliaciones</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
            Saldo por Amortizar
          </span>
          <p className="text-xl font-bold text-amber-700 mt-1">
            {totalSaldoPendienteGlobal.toFixed(2)}{' '}
            <span className="text-xs font-normal text-slate-500">Bs</span>
          </p>
          <span className="text-[11px] text-slate-400">Pendiente de cobro</span>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtro */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre de socio afiliado..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center space-x-1.5 text-xs font-medium">
          <button
            onClick={() => setFilterEstado('todos')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              filterEstado === 'todos' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({afiliaciones.length})
          </button>
          <button
            onClick={() => setFilterEstado('en_curso')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              filterEstado === 'en_curso' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            En Curso
          </button>
          <button
            onClick={() => setFilterEstado('completada')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              filterEstado === 'completada' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Completadas
          </button>
        </div>
      </div>

      {/* Lista de Afiliaciones */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <RefreshCw className="w-8 h-8 mx-auto animate-spin text-blue-600 mb-2" />
          <p className="text-xs text-slate-500">Cargando afiliaciones...</p>
        </div>
      ) : filteredAfiliaciones.length === 0 ? (
        <div className="p-10 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs space-y-3">
          <UserPlus className="w-10 h-10 mx-auto text-slate-300" />
          <p>No se encontraron planes de afiliación con los filtros actuales.</p>
          <button
            onClick={() => setIsNewPlanModalOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
          >
            Iniciar Primera Afiliación
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAfiliaciones.map((afiliacion) => {
            const socio = afiliacion.socios
            const pagosActivos = (afiliacion.pagos_afiliacion || []).filter((p) => p.estado === 'activo')
            const totalPagado = pagosActivos.reduce((sum, p) => sum + (parseFloat(p.monto) || 0), 0)
            const porcentaje = Math.min(100, Math.round((totalPagado / (afiliacion.monto_total || 1500)) * 100))
            const isCompletada = afiliacion.estado === 'completada' || afiliacion.saldo_pendiente <= 0

            return (
              <div
                key={afiliacion.id}
                className={`bg-white rounded-2xl p-5 border shadow-sm transition-all flex flex-col justify-between ${
                  isCompletada ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200 hover:border-blue-300'
                }`}
              >
                <div>
                  {/* Top card */}
                  <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{socio?.nombre || 'Socio sin nombre'}</h4>
                      {socio?.telefono && <p className="text-xs text-slate-400">Tel: {socio.telefono}</p>}
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        isCompletada ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {isCompletada ? 'Completada' : 'En Curso'}
                    </span>
                  </div>

                  {/* Barra de Progreso */}
                  <div className="mt-3 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-600">
                        Abonado: <strong className="text-emerald-700">{totalPagado.toFixed(2)} Bs</strong>
                      </span>
                      <span className="text-slate-500">
                        Total: {parseFloat(afiliacion.monto_total).toFixed(2)} Bs ({porcentaje}%)
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-2.5 rounded-full transition-all duration-500 ${
                          isCompletada ? 'bg-emerald-500' : 'bg-blue-600'
                        }`}
                        style={{ width: `${porcentaje}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span>Cuota acordada: {afiliacion.cuota_acordada || 100} Bs/mes</span>
                      <span className="font-bold text-red-600">
                        Saldo restante: {parseFloat(afiliacion.saldo_pendiente).toFixed(2)} Bs
                      </span>
                    </div>
                  </div>
                </div>

                {/* Acciones */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => openHistorialModal(afiliacion)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>Ver {pagosActivos.length} abonos</span>
                  </button>

                  <button
                    type="button"
                    disabled={isCompletada}
                    onClick={() => {
                      setSelectedAfiliacion(afiliacion)
                      setAbonoMonto(afiliacion.cuota_acordada || '')
                      setAbonoMetodo('efectivo')
                      setAbonoTalonario('')
                      setAbonoComprobanteUrl('')
                      setIsAbonoModalOpen(true)
                    }}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1"
                  >
                    <Coins className="w-3.5 h-3.5" />
                    <span>Registrar Abono</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal: Iniciar Nueva Afiliación */}
      {isNewPlanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md my-8 overflow-hidden">
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">Nueva Afiliación de Socio</h3>
                  <p className="text-xs text-slate-400">Plan de pago de 1.500 Bs para nuevo socio</p>
                </div>
              </div>
              <button onClick={() => setIsNewPlanModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400 hover:text-white" />
              </button>
            </div>

            <form onSubmit={handleCreatePlan} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Seleccionar Socio <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={selectedSocioId}
                  onChange={(e) => setSelectedSocioId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">-- Elige un socio registrado --</option>
                  {socios.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre} {s.telefono ? `(${s.telefono})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Costo Total (Bs)</label>
                  <input
                    type="number"
                    step="50"
                    required
                    value={montoTotal}
                    onChange={(e) => setMontoTotal(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-bold"
                  />
                  <span className="text-[10px] text-slate-400">Estándar: 1.500 Bs</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Cuota Acordada (Bs/mes)</label>
                  <input
                    type="number"
                    step="10"
                    required
                    value={cuotaAcordada}
                    onChange={(e) => setCuotaAcordada(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-bold"
                  />
                  <span className="text-[10px] text-slate-400">Ej. 100 o 150 Bs</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewPlanModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingPlan}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  {savingPlan ? 'Guardando...' : 'Iniciar Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Registrar Abono */}
      {isAbonoModalOpen && selectedAfiliacion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md my-8 overflow-hidden">
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">Abonar Cuota de Afiliación</h3>
                  <p className="text-xs text-slate-400">{selectedAfiliacion.socios?.nombre}</p>
                </div>
              </div>
              <button onClick={() => setIsAbonoModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400 hover:text-white" />
              </button>
            </div>

            <div className="bg-blue-50/60 p-3 border-b border-blue-100 flex items-center justify-between text-xs text-blue-900">
              <span>Saldo pendiente actual:</span>
              <span className="text-sm font-bold text-blue-700">
                {parseFloat(selectedAfiliacion.saldo_pendiente).toFixed(2)} Bs
              </span>
            </div>

            <form onSubmit={handleRegisterAbono} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Monto a Abonar (Bs) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="10"
                    min="1"
                    required
                    value={abonoMonto}
                    onChange={(e) => setAbonoMonto(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-3 pr-12 py-2 text-sm bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-semibold text-slate-400">Bs</span>
                </div>
              </div>

              {/* Método de pago */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Método de Pago</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAbonoMetodo('efectivo')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${
                      abonoMetodo === 'efectivo'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-50 text-slate-700 border-slate-300'
                    }`}
                  >
                    <Coins className="w-4 h-4" />
                    <span>Efectivo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAbonoMetodo('qr')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${
                      abonoMetodo === 'qr'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-50 text-slate-700 border-slate-300'
                    }`}
                  >
                    <QrCode className="w-4 h-4" />
                    <span>QR / Banco</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  N° Recibo Talonario Físico (Opcional)
                </label>
                <input
                  type="text"
                  value={abonoTalonario}
                  onChange={(e) => setAbonoTalonario(e.target.value)}
                  placeholder="Ej. Recibo 1054"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Comprobante */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-600">Comprobante Drive:</span>
                <div className="flex items-center space-x-2">
                  {abonoComprobanteUrl && (
                    <a
                      href={abonoComprobanteUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 text-blue-600 bg-blue-50 rounded-lg"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsPhotoModalOpen(true)}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-700"
                  >
                    {abonoComprobanteUrl ? 'Cambiar Foto' : 'Adjuntar Foto'}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAbonoModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingAbono}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  {savingAbono ? 'Registrando...' : 'Confirmar Abono'}
                </button>
              </div>
            </form>
          </div>

          <FotoUploaderModal
            isOpen={isPhotoModalOpen}
            onClose={() => setIsPhotoModalOpen(false)}
            onPhotoSaved={(url) => setAbonoComprobanteUrl(url)}
            currentUrl={abonoComprobanteUrl}
            titulo="Foto Recibo Afiliación"
            categoria="Egresos_Afiliaciones"
            anio={new Date().getFullYear()}
            mes={new Date().getMonth() + 1}
            customName={`Recibo_Afiliacion_${Date.now()}.jpg`}
          />
        </div>
      )}

      {/* Modal: Historial de Abonos y Anulación */}
      {isHistorialModalOpen && selectedAfiliacion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg my-8 overflow-hidden">
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">Historial de Abonos de Afiliación</h3>
                  <p className="text-xs text-slate-400">{selectedAfiliacion.socios?.nombre}</p>
                </div>
              </div>
              <button onClick={() => setIsHistorialModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400 hover:text-white" />
              </button>
            </div>

            <div className="p-6 space-y-3">
              {pagosAfiliacion.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No hay abonos registrados para este socio.</p>
              ) : (
                <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                  {pagosAfiliacion.map((pago) => {
                    const isAnulado = pago.estado === 'anulado'
                    const isAnulando = anulandoPagoId === pago.id

                    return (
                      <div key={pago.id} className="py-2.5 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-2">
                            <span
                              className={`p-1 rounded-lg ${
                                pago.metodo_pago === 'qr' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                              }`}
                            >
                              {pago.metodo_pago === 'qr' ? <QrCode className="w-3.5 h-3.5" /> : <Coins className="w-3.5 h-3.5" />}
                            </span>
                            <div>
                              <p className={`font-bold ${isAnulado ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                                {parseFloat(pago.monto).toFixed(2)} Bs
                              </p>
                              <span className="text-[10px] text-slate-400">
                                {new Date(pago.fecha_pago).toLocaleDateString('es-BO')}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            {pago.nro_talonario_fisico && (
                              <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                                N° {pago.nro_talonario_fisico}
                              </span>
                            )}
                            {pago.comprobante_drive_url && (
                              <a href={pago.comprobante_drive_url} target="_blank" rel="noreferrer" className="text-blue-600">
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                            {isAnulado ? (
                              <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">
                                Anulado
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setAnulandoPagoId(pago.id)
                                  setMotivoAnulacion('')
                                }}
                                className="text-[11px] font-semibold text-red-600 hover:bg-red-50 px-2 py-0.5 rounded"
                              >
                                Anular
                              </button>
                            )}
                          </div>
                        </div>

                        {isAnulado && pago.motivo_anulacion && (
                          <p className="text-[10px] text-red-700 bg-red-50 p-1.5 rounded">
                            Motivo: {pago.motivo_anulacion}
                          </p>
                        )}

                        {isAnulando && (
                          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs">
                            <span className="font-bold text-amber-900 block">Motivo de Anulación Obligatorio</span>
                            <input
                              type="text"
                              required
                              value={motivoAnulacion}
                              onChange={(e) => setMotivoAnulacion(e.target.value)}
                              placeholder="Ej. Error en digitación / Comprobante duplicado..."
                              className="w-full px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none"
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setAnulandoPagoId(null)}
                                className="text-[11px] text-slate-600"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAnularPago(pago.id)}
                                className="px-3 py-1 bg-red-600 text-white rounded-lg text-[11px] font-bold"
                              >
                                Confirmar Anulación
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsHistorialModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
