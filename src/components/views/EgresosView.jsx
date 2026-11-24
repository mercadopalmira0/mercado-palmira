import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import FotoUploaderModal from '../modals/FotoUploaderModal'
import {
  ArrowDownCircle,
  Coins,
  QrCode,
  CheckCircle2,
  AlertCircle,
  X,
  Camera,
  Calendar,
  ExternalLink,
  RefreshCw,
  PlusCircle,
  Filter,
  Search,
  ShieldAlert
} from 'lucide-react'

const CATEGORIAS_SERVICIOS = [
  'Factura Luz General',
  'Factura Agua Potable',
  'Sueldo Guardia / Seguridad',
  'Tasa de Aseo y Basura',
  'Alumbrado Público / Pasillos',
  'Gastos Operativos (Pasajes, Talonarios, Útiles)',
  'Otro Gasto de Servicios',
]

const CATEGORIAS_AFILIACIONES = [
  'Limpieza General del Mercado',
  'Mantenimiento y Plomería',
  'Pintura y Albañilería',
  'Materiales y Compras del Mercado',
  'Mejoras de Infraestructura',
  'Otro Gasto de Afiliaciones',
]

export default function EgresosView() {
  const { user } = useAuth()
  const [egresos, setEgresos] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterCaja, setFilterCaja] = useState('todos') // 'todos' | 'servicios' | 'afiliaciones'
  const [filterMetodo, setFilterMetodo] = useState('todos') // 'todos' | 'efectivo' | 'qr'
  const [searchTerm, setSearchTerm] = useState('')
  const [statusMessage, setStatusMessage] = useState(null)

  // Modales
  const [isNewModalOpen, setIsNewModalOpen] = useState(false)
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false)
  const [anulandoEgresoId, setAnulandoEgresoId] = useState(null)
  const [motivoAnulacion, setMotivoAnulacion] = useState('')

  // Form Fields
  const [caja, setCaja] = useState('servicios') // 'servicios' | 'afiliaciones'
  const [categoria, setCategoria] = useState(CATEGORIAS_SERVICIOS[0])
  const [descripcion, setDescripcion] = useState('')
  const [monto, setMonto] = useState('')
  const [metodoPago, setMetodoPago] = useState('efectivo')
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [reciboDriveUrl, setReciboDriveUrl] = useState('')
  const [saving, setSaving] = useState(false)

  // Cargar lista de egresos
  const fetchEgresos = async () => {
    setLoading(true)
    setStatusMessage(null)
    try {
      const { data, error } = await supabase
        .from('egresos')
        .select('*')
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error
      setEgresos(data || [])
    } catch (err) {
      console.error(err)
      setStatusMessage({ type: 'error', text: 'Error al cargar egresos: ' + err.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEgresos()
  }, [])

  // Cambiar categorías disponibles según la caja seleccionada
  const handleCajaChange = (newCaja) => {
    setCaja(newCaja)
    setCategoria(newCaja === 'servicios' ? CATEGORIAS_SERVICIOS[0] : CATEGORIAS_AFILIACIONES[0])
  }

  // Registrar nuevo egreso
  const handleSaveEgreso = async (e) => {
    e.preventDefault()
    const montoNum = parseFloat(monto)
    if (!montoNum || montoNum <= 0) {
      setStatusMessage({ type: 'error', text: 'Ingresa un monto válido mayor a 0.' })
      return
    }

    if (!descripcion.trim()) {
      setStatusMessage({ type: 'error', text: 'Ingresa una descripción del gasto.' })
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase.from('egresos').insert([
        {
          caja,
          categoria,
          descripcion: descripcion.trim(),
          monto: montoNum,
          metodo_pago: metodoPago,
          fecha,
          recibo_drive_url: reciboDriveUrl || null,
          estado: 'activo',
        },
      ])

      if (error) throw error

      setStatusMessage({ type: 'success', text: `¡Egreso de ${montoNum.toFixed(2)} Bs registrado en Caja ${caja === 'servicios' ? 'Servicios' : 'Afiliaciones'}!` })
      setIsNewModalOpen(false)
      setDescripcion('')
      setMonto('')
      setReciboDriveUrl('')
      await fetchEgresos()
    } catch (err) {
      console.error(err)
      setStatusMessage({ type: 'error', text: 'Error al registrar egreso: ' + err.message })
    } finally {
      setSaving(false)
    }
  }

  // Anular egreso con motivo escrito
  const handleAnularEgreso = async (egresoId) => {
    if (!motivoAnulacion.trim()) {
      setStatusMessage({ type: 'error', text: 'El motivo de anulación es obligatorio (regla de cero borrados).' })
      return
    }

    try {
      const { error } = await supabase
        .from('egresos')
        .update({
          estado: 'anulado',
          motivo_anulacion: motivoAnulacion.trim(),
        })
        .eq('id', egresoId)

      if (error) throw error

      setStatusMessage({ type: 'success', text: 'Egreso anulado correctamente. Queda tachado en auditoría sin descontar de caja.' })
      setAnulandoEgresoId(null)
      setMotivoAnulacion('')
      await fetchEgresos()
    } catch (err) {
      console.error(err)
      setStatusMessage({ type: 'error', text: 'Error al anular egreso: ' + err.message })
    }
  }

  // Filtrado de egresos
  const filteredEgresos = egresos.filter((eg) => {
    const term = searchTerm.toLowerCase()
    const matchesSearch =
      !term ||
      eg.descripcion?.toLowerCase().includes(term) ||
      eg.categoria?.toLowerCase().includes(term)

    if (!matchesSearch) return false

    if (filterCaja !== 'todos' && eg.caja !== filterCaja) return false
    if (filterMetodo !== 'todos' && eg.metodo_pago !== filterMetodo) return false

    return true
  })

  // Totales de egresos activos
  const totalServicios = egresos
    .filter((e) => e.caja === 'servicios' && e.estado === 'activo')
    .reduce((s, e) => s + (parseFloat(e.monto) || 0), 0)

  const totalAfiliaciones = egresos
    .filter((e) => e.caja === 'afiliaciones' && e.estado === 'activo')
    .reduce((s, e) => s + (parseFloat(e.monto) || 0), 0)

  const totalGeneralEgresos = totalServicios + totalAfiliaciones

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-slate-900">Egresos y Gastos por Caja</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
              Dos Cajas Separadas
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Registro estricto de facturas, sueldos y mantenimiento con foto de respaldo a Google Drive.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchEgresos}
            title="Recargar egresos"
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-600' : ''}`} />
          </button>
          <button
            onClick={() => setIsNewModalOpen(true)}
            className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-900/20 transition-all flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Registrar Egreso</span>
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

      {/* Resumen de Egresos por Caja */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
            Egresos Caja Servicios
          </span>
          <p className="text-xl font-bold text-slate-900 mt-1">
            {totalServicios.toFixed(2)} <span className="text-xs font-normal text-slate-500">Bs</span>
          </p>
          <span className="text-[11px] text-slate-400">Luz, agua, guardia y basura</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">
            Egresos Caja Afiliaciones
          </span>
          <p className="text-xl font-bold text-slate-900 mt-1">
            {totalAfiliaciones.toFixed(2)} <span className="text-xs font-normal text-slate-500">Bs</span>
          </p>
          <span className="text-[11px] text-slate-400">Limpieza y mantenimiento</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 block">
            Total Egresos General
          </span>
          <p className="text-xl font-bold text-red-600 mt-1">
            {totalGeneralEgresos.toFixed(2)} <span className="text-xs font-normal text-slate-500">Bs</span>
          </p>
          <span className="text-[11px] text-slate-400">Total descargado en recibos</span>
        </div>
      </div>

      {/* Filtros y Búsqueda */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por descripción o categoría..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
          {/* Filtro Caja */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setFilterCaja('todos')}
              className={`px-2.5 py-1 rounded-lg ${filterCaja === 'todos' ? 'bg-white font-bold shadow-sm' : 'text-slate-600'}`}
            >
              Todas
            </button>
            <button
              onClick={() => setFilterCaja('servicios')}
              className={`px-2.5 py-1 rounded-lg ${filterCaja === 'servicios' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-600'}`}
            >
              Servicios
            </button>
            <button
              onClick={() => setFilterCaja('afiliaciones')}
              className={`px-2.5 py-1 rounded-lg ${filterCaja === 'afiliaciones' ? 'bg-blue-600 text-white font-bold' : 'text-slate-600'}`}
            >
              Afiliaciones
            </button>
          </div>

          {/* Filtro Método */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setFilterMetodo('todos')}
              className={`px-2 py-1 rounded-lg ${filterMetodo === 'todos' ? 'bg-white font-bold shadow-sm' : 'text-slate-600'}`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterMetodo('efectivo')}
              className={`px-2 py-1 rounded-lg ${filterMetodo === 'efectivo' ? 'bg-slate-900 text-white font-bold' : 'text-slate-600'}`}
            >
              Efectivo
            </button>
            <button
              onClick={() => setFilterMetodo('qr')}
              className={`px-2 py-1 rounded-lg ${filterMetodo === 'qr' ? 'bg-slate-900 text-white font-bold' : 'text-slate-600'}`}
            >
              QR
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Egresos */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <RefreshCw className="w-8 h-8 mx-auto animate-spin text-amber-600 mb-2" />
          <p className="text-xs text-slate-500">Cargando egresos...</p>
        </div>
      ) : filteredEgresos.length === 0 ? (
        <div className="p-10 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs space-y-2">
          <ArrowDownCircle className="w-10 h-10 mx-auto text-slate-300" />
          <p>No se encontraron egresos con los filtros seleccionados.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm divide-y divide-slate-100">
          {filteredEgresos.map((egreso) => {
            const isAnulado = egreso.estado === 'anulado'
            const isAnulando = anulandoEgresoId === egreso.id
            const isServicios = egreso.caja === 'servicios'

            return (
              <div key={egreso.id} className="p-4 hover:bg-slate-50 transition-colors space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-start space-x-3">
                    <span
                      className={`p-2 rounded-xl mt-0.5 ${
                        isServicios ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                      }`}
                    >
                      <ArrowDownCircle className="w-4 h-4" />
                    </span>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            isServicios ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          Caja {isServicios ? 'Servicios' : 'Afiliaciones'}
                        </span>
                        <span className="font-semibold text-slate-800">{egreso.categoria}</span>
                        <span className="text-slate-400 text-[11px]">• {egreso.fecha}</span>
                      </div>
                      <p className={`text-slate-600 mt-1 ${isAnulado ? 'line-through text-slate-400' : ''}`}>
                        {egreso.descripcion}
                      </p>
                    </div>
                  </div>

                  {/* Monto y Botones */}
                  <div className="flex items-center space-x-3 self-end sm:self-center">
                    <div className="text-right">
                      <span className={`text-sm font-bold block ${isAnulado ? 'line-through text-slate-400' : 'text-red-600'}`}>
                        -{parseFloat(egreso.monto).toFixed(2)} Bs
                      </span>
                      <span className="text-[10px] text-slate-400 uppercase font-medium">
                        {egreso.metodo_pago === 'qr' ? 'QR / Banco' : 'Efectivo en mano'}
                      </span>
                    </div>

                    {egreso.recibo_drive_url && (
                      <a
                        href={egreso.recibo_drive_url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 text-blue-600 hover:text-blue-800 bg-blue-50 rounded-lg"
                        title="Ver foto del recibo"
                      >
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
                          setAnulandoEgresoId(egreso.id)
                          setMotivoAnulacion('')
                        }}
                        className="text-[11px] font-semibold text-red-600 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors"
                      >
                        Anular
                      </button>
                    )}
                  </div>
                </div>

                {isAnulado && egreso.motivo_anulacion && (
                  <p className="text-[11px] text-red-700 bg-red-50 p-2 rounded-lg">
                    <strong>Motivo de anulación:</strong> {egreso.motivo_anulacion}
                  </p>
                )}

                {/* Formulario de Anulación con Motivo */}
                {isAnulando && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs">
                    <span className="font-bold text-amber-900 block">Motivo de Anulación Obligatorio</span>
                    <input
                      type="text"
                      required
                      value={motivoAnulacion}
                      onChange={(e) => setMotivoAnulacion(e.target.value)}
                      placeholder="Escribe el motivo de anulación del gasto..."
                      className="w-full px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setAnulandoEgresoId(null)}
                        className="text-[11px] text-slate-600"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAnularEgreso(egreso.id)}
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

      {/* Modal: Registrar Nuevo Egreso */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md my-8 overflow-hidden">
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
                  <ArrowDownCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">Registrar Egreso</h3>
                  <p className="text-xs text-slate-400">Descargo de fondos con respaldo fotográfico</p>
                </div>
              </div>
              <button onClick={() => setIsNewModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400 hover:text-white" />
              </button>
            </div>

            <form onSubmit={handleSaveEgreso} className="p-6 space-y-4">
              {/* Selección obligatoria de Caja */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Caja de donde sale el dinero <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleCajaChange('servicios')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      caja === 'servicios'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-300'
                    }`}
                  >
                    Caja Servicios
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCajaChange('afiliaciones')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      caja === 'afiliaciones'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-300'
                    }`}
                  >
                    Caja Afiliaciones
                  </button>
                </div>
              </div>

              {/* Categoría */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Categoría</label>
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  {(caja === 'servicios' ? CATEGORIAS_SERVICIOS : CATEGORIAS_AFILIACIONES).map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Descripción del Gasto <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Ej. Pago factura de luz del pasillo 4 / Compra de 2 escobas..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Monto y Fecha */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Monto (Bs) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.50"
                    min="0.50"
                    required
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha</label>
                  <input
                    type="date"
                    required
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              {/* Método de Pago */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Pagado con</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setMetodoPago('efectivo')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${
                      metodoPago === 'efectivo'
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 text-slate-700 border-slate-300'
                    }`}
                  >
                    <Coins className="w-4 h-4" />
                    <span>Efectivo en mano</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMetodoPago('qr')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${
                      metodoPago === 'qr'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-50 text-slate-700 border-slate-300'
                    }`}
                  >
                    <QrCode className="w-4 h-4" />
                    <span>QR / Banco</span>
                  </button>
                </div>
              </div>

              {/* Foto de Recibo / Factura a Google Drive */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-600">Foto Recibo (Drive):</span>
                <div className="flex items-center space-x-2">
                  {reciboDriveUrl && (
                    <a
                      href={reciboDriveUrl}
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
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-1"
                  >
                    <Camera className="w-3.5 h-3.5 text-slate-500" />
                    <span>{reciboDriveUrl ? 'Cambiar Foto' : 'Adjuntar Recibo'}</span>
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  {saving ? 'Guardando...' : 'Confirmar Egreso'}
                </button>
              </div>
            </form>
          </div>

          <FotoUploaderModal
            isOpen={isPhotoModalOpen}
            onClose={() => setIsPhotoModalOpen(false)}
            onPhotoSaved={(url) => setReciboDriveUrl(url)}
            currentUrl={reciboDriveUrl}
            titulo={`Foto Recibo de Egreso (${caja === 'servicios' ? 'Servicios' : 'Afiliaciones'})`}
            categoria={caja === 'servicios' ? 'Egresos_Servicios' : 'Egresos_Afiliaciones'}
            anio={new Date().getFullYear()}
            mes={new Date().getMonth() + 1}
            customName={`Recibo_${caja}_${Date.now()}.jpg`}
          />
        </div>
      )}
    </div>
  )
}
