import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  Users,
  Search,
  UserPlus,
  Edit2,
  Trash2,
  Zap,
  Store,
  Layers,
  Phone,
  Calendar,
  AlertCircle,
  CheckCircle2,
  X,
  RefreshCw,
  PlusCircle,
  ShieldAlert
} from 'lucide-react'

export default function SociosView({ onOpenAuth }) {
  const { user, isAdmin } = useAuth()
  const [socios, setSocios] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTipo, setFilterTipo] = useState('todos') // 'todos' | 'fijo' | 'variable' | 'especial'
  const [statusMessage, setStatusMessage] = useState(null)

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingSocioId, setEditingSocioId] = useState(null)
  const [editingUnidadId, setEditingUnidadId] = useState(null)
  const [saving, setSaving] = useState(false)

  // Form Fields - Socio
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [fechaPagoEspecial, setFechaPagoEspecial] = useState('')
  const [activo, setActivo] = useState(true)
  const [notas, setNotas] = useState('')

  // Form Fields - Unidad de Cobro
  const [hasUnidad, setHasUnidad] = useState(true)
  const [numeroIdentificador, setNumeroIdentificador] = useState('')
  const [nombresTitulares, setNombresTitulares] = useState('')
  const [tipo, setTipo] = useState('variable') // 'fijo' | 'variable'
  const [subtipoFijo, setSubtipoFijo] = useState('puesto_abierto') // 'puesto_cerrado' | 'puesto_abierto' | 'ambulante' | 'no_socio'
  const [cantidadPuestos, setCantidadPuestos] = useState(1)
  const [codigoTarifador, setCodigoTarifador] = useState('')
  const [ultimaLectura, setUltimaLectura] = useState(0)

  const nombreInputRef = useRef(null)

  // Cargar socios y sus unidades de cobro
  const fetchSocios = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('socios')
        .select(`
          *,
          unidades_cobro (*)
        `)
        .order('nombre', { ascending: true })

      if (error) throw error
      setSocios(data || [])
    } catch (err) {
      console.error('Error fetching socios:', err)
      setStatusMessage({ type: 'error', text: 'Error al cargar socios: ' + (err.message || 'Verifica conexión con Supabase') })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSocios()
  }, [])

  const resetForm = () => {
    setNombre('')
    setTelefono('')
    setFechaPagoEspecial('')
    setActivo(true)
    setNotas('')
    setHasUnidad(true)
    setNumeroIdentificador('')
    setNombresTitulares('')
    setTipo('variable')
    setSubtipoFijo('puesto_abierto')
    setCantidadPuestos(1)
    setCodigoTarifador('')
    setUltimaLectura(0)
    setIsEditing(false)
    setEditingSocioId(null)
    setEditingUnidadId(null)
  }

  const openNewModal = () => {
    resetForm()
    setIsModalOpen(true)
    setTimeout(() => nombreInputRef.current?.focus(), 100)
  }

  const openEditModal = (socio) => {
    resetForm()
    setIsEditing(true)
    setEditingSocioId(socio.id)
    setNombre(socio.nombre || '')
    setTelefono(socio.telefono || '')
    setFechaPagoEspecial(socio.fecha_pago_especial || '')
    setActivo(socio.activo !== false)
    setNotas(socio.notas || '')

    const unidad = socio.unidades_cobro?.[0]
    if (unidad) {
      setHasUnidad(true)
      setEditingUnidadId(unidad.id)
      setNumeroIdentificador(unidad.numero_identificador || '')
      setNombresTitulares(unidad.nombres_titulares || '')
      setTipo(unidad.tipo || 'variable')
      setSubtipoFijo(unidad.subtipo_fijo || 'puesto_abierto')
      setCantidadPuestos(unidad.cantidad_puestos || 1)
      setCodigoTarifador(unidad.codigo_tarifador || '')
      setUltimaLectura(unidad.ultima_lectura || 0)
    } else {
      setHasUnidad(false)
    }

    setIsModalOpen(true)
    setTimeout(() => nombreInputRef.current?.focus(), 100)
  }

  const handleSave = async (continueAdding = false) => {
    if (!nombre.trim()) {
      setStatusMessage({ type: 'error', text: 'El nombre del socio es obligatorio.' })
      return
    }

    if (hasUnidad && !numeroIdentificador.trim()) {
      setStatusMessage({ type: 'error', text: 'Ingresa un número o nombre identificador para el puesto/unidad.' })
      return
    }

    setSaving(true)
    setStatusMessage(null)

    try {
      if (isEditing) {
        // Actualizar Socio
        const { error: socioError } = await supabase
          .from('socios')
          .update({
            nombre: nombre.trim(),
            telefono: telefono.trim() || null,
            fecha_pago_especial: fechaPagoEspecial || null,
            activo,
            notas: notas.trim() || null,
          })
          .eq('id', editingSocioId)

        if (socioError) throw socioError

        // Actualizar o Crear Unidad de Cobro
        if (hasUnidad) {
          const unidadData = {
            socio_responsable_id: editingSocioId,
            numero_identificador: numeroIdentificador.trim(),
            nombres_titulares: nombresTitulares.trim() || null,
            tipo,
            subtipo_fijo: tipo === 'fijo' ? subtipoFijo : null,
            cantidad_puestos: parseInt(cantidadPuestos, 10) || 1,
            codigo_tarifador: tipo === 'variable' ? (codigoTarifador.trim() || null) : null,
            ultima_lectura: parseFloat(ultimaLectura) || 0,
            activo,
          }

          if (editingUnidadId) {
            const { error: unidadError } = await supabase
              .from('unidades_cobro')
              .update(unidadData)
              .eq('id', editingUnidadId)
            if (unidadError) throw unidadError
          } else {
            const { error: unidadError } = await supabase
              .from('unidades_cobro')
              .insert([unidadData])
            if (unidadError) throw unidadError
          }
        }

        setStatusMessage({ type: 'success', text: `Socio "${nombre}" actualizado correctamente.` })
        setIsModalOpen(false)
        await fetchSocios()
      } else {
        // Crear Nuevo Socio
        const { data: newSocio, error: socioError } = await supabase
          .from('socios')
          .insert([
            {
              nombre: nombre.trim(),
              telefono: telefono.trim() || null,
              fecha_pago_especial: fechaPagoEspecial || null,
              activo,
              notas: notas.trim() || null,
            },
          ])
          .select()
          .single()

        if (socioError) throw socioError

        // Crear Unidad de Cobro si está marcada
        if (hasUnidad && newSocio) {
          const { error: unidadError } = await supabase
            .from('unidades_cobro')
            .insert([
              {
                socio_responsable_id: newSocio.id,
                numero_identificador: numeroIdentificador.trim(),
                nombres_titulares: nombresTitulares.trim() || null,
                tipo,
                subtipo_fijo: tipo === 'fijo' ? subtipoFijo : null,
                cantidad_puestos: parseInt(cantidadPuestos, 10) || 1,
                codigo_tarifador: tipo === 'variable' ? (codigoTarifador.trim() || null) : null,
                ultima_lectura: parseFloat(ultimaLectura) || 0,
                activo,
              },
            ])

          if (unidadError) throw unidadError
        }

        setStatusMessage({
          type: 'success',
          text: `¡Socio "${nombre}" registrado con éxito! (Padrón actual: ${socios.length + 1} socios)`,
        })

        await fetchSocios()

        if (continueAdding) {
          // Reset para el siguiente ingreso rápido manteniendo la agilidad
          setNombre('')
          setTelefono('')
          setFechaPagoEspecial('')
          setNotas('')
          setNumeroIdentificador('')
          setNombresTitulares('')
          setCodigoTarifador('')
          setCantidadPuestos(1)
          setUltimaLectura(0)
          setTimeout(() => nombreInputRef.current?.focus(), 150)
        } else {
          setIsModalOpen(false)
          resetForm()
        }
      }
    } catch (err) {
      console.error('Error al guardar socio:', err)
      const isRlsError = err.message?.includes('violates row-level security policy') || err.code === '42501'
      setStatusMessage({
        type: 'error',
        text: isRlsError
          ? 'Bloqueado por política RLS: debes iniciar sesión como Administrador para guardar cambios.'
          : 'Error al guardar: ' + (err.message || 'Comprueba los datos ingresados.'),
      })
    } finally {
      setSaving(false)
    }
  }

  // Filtrado reactivo en tiempo real
  const filteredSocios = socios.filter((s) => {
    const term = searchTerm.toLowerCase()
    const matchesName = s.nombre?.toLowerCase().includes(term)
    const matchesPhone = s.telefono?.toLowerCase().includes(term)
    const matchesUnidad = s.unidades_cobro?.some(
      (u) =>
        u.numero_identificador?.toLowerCase().includes(term) ||
        u.codigo_tarifador?.toLowerCase().includes(term) ||
        u.nombres_titulares?.toLowerCase().includes(term)
    )

    const matchesSearch = !term || matchesName || matchesPhone || matchesUnidad

    if (!matchesSearch) return false

    if (filterTipo === 'fijo') {
      return s.unidades_cobro?.some((u) => u.tipo === 'fijo')
    }
    if (filterTipo === 'variable') {
      return s.unidades_cobro?.some((u) => u.tipo === 'variable')
    }
    if (filterTipo === 'especial') {
      return Boolean(s.fecha_pago_especial)
    }

    return true
  })

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-slate-900">Padrón de Socios y Puestos</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              {socios.length} socios registrados
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Gestión ágil de socios, puestos agrupados y códigos de tarifadores de luz.
          </p>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={fetchSocios}
            disabled={loading}
            title="Recargar socios"
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
          <button
            type="button"
            onClick={openNewModal}
            className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md shadow-emerald-900/20 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Agregar Socio / Puesto</span>
          </button>
        </div>
      </div>

      {/* RLS Auth Reminder Banner if not signed in */}
      {!user && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Aviso de Seguridad Supabase RLS (Modo Consulta)</p>
              <p className="text-amber-700 mt-0.5">
                Para guardar, editar o registrar socios sin bloqueo de permisos, debes iniciar sesión con una cuenta de <strong>Administrador</strong>.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenAuth}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs transition-colors self-start sm:self-auto"
          >
            Iniciar Sesión Admin
          </button>
        </div>
      )}

      {/* Status Messages */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center justify-between transition-all ${
            statusMessage.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <div className="flex items-center space-x-2">
            {statusMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="p-1 rounded-md hover:bg-black/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search and Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por socio, puesto, teléfono o tarifador..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 text-xs font-medium">
          <button
            onClick={() => setFilterTipo('todos')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              filterTipo === 'todos'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({socios.length})
          </button>
          <button
            onClick={() => setFilterTipo('variable')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 ${
              filterTipo === 'variable'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Zap className="w-3 h-3 text-amber-400" />
            Con Luz (Variable)
          </button>
          <button
            onClick={() => setFilterTipo('fijo')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              filterTipo === 'fijo'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Fijos
          </button>
          <button
            onClick={() => setFilterTipo('especial')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              filterTipo === 'especial'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Fecha Especial
          </button>
        </div>
      </div>

      {/* Socios List */}
      {loading ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <RefreshCw className="w-8 h-8 mx-auto animate-spin text-emerald-600 mb-2" />
          <p className="text-sm text-slate-600 font-medium">Cargando padrón desde Supabase...</p>
        </div>
      ) : filteredSocios.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
          <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <h3 className="text-base font-bold text-slate-700">No se encontraron socios</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {searchTerm
              ? `No hay resultados para "${searchTerm}". Intenta con otro término o limpia el buscador.`
              : 'El padrón de socios está vacío. Utiliza el formulario rápido "Agregar Socio / Puesto" para cargar los ~80 socios.'}
          </p>
          <button
            onClick={openNewModal}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            Iniciar Carga Rápida
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSocios.map((socio) => {
            const unidad = socio.unidades_cobro?.[0]
            const isVariable = unidad?.tipo === 'variable'
            const isMultiPuesto = (unidad?.cantidad_puestos || 1) > 1

            return (
              <div
                key={socio.id}
                className={`bg-white rounded-2xl p-4 border transition-all hover:shadow-md flex flex-col justify-between ${
                  socio.activo
                    ? 'border-slate-200 hover:border-emerald-300'
                    : 'border-slate-200 bg-slate-50/70 opacity-75'
                }`}
              >
                <div>
                  {/* Top Bar inside card */}
                  <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 leading-tight">
                        {socio.nombre}
                      </h4>
                      {socio.telefono && (
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{socio.telefono}</span>
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => openEditModal(socio)}
                        title="Editar socio y unidad"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Unidad de Cobro Info */}
                  <div className="mt-3 space-y-2 text-xs">
                    {unidad ? (
                      <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 flex items-center gap-1">
                            <Store className="w-3.5 h-3.5 text-slate-500" />
                            {unidad.numero_identificador}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              isVariable
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {isVariable ? 'Luz Variable' : unidad.subtipo_fijo?.replace('_', ' ') || 'Fijo'}
                          </span>
                        </div>

                        {/* Puestos agrupados badge */}
                        {isMultiPuesto && (
                          <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-semibold">
                            <Layers className="w-3 h-3" />
                            <span>{unidad.cantidad_puestos} puestos agrupados</span>
                          </div>
                        )}

                        {/* Tarifador */}
                        {unidad.codigo_tarifador && (
                          <div className="mt-1.5 flex items-center justify-between text-slate-600 text-[11px]">
                            <span className="flex items-center gap-1 text-slate-500">
                              <Zap className="w-3 h-3 text-amber-500" />
                              Tarifador:
                            </span>
                            <span className="font-mono font-semibold bg-white px-1.5 py-0.5 rounded border border-slate-200">
                              {unidad.codigo_tarifador}
                            </span>
                          </div>
                        )}

                        {unidad.nombres_titulares && (
                          <p className="mt-1 text-[11px] text-slate-500 italic">
                            Titulares: {unidad.nombres_titulares}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="p-2 rounded-xl bg-slate-50 text-slate-400 italic text-[11px]">
                        Sin puesto o unidad de cobro asignada.
                      </div>
                    )}

                    {/* Fecha de pago especial badge */}
                    {socio.fecha_pago_especial && (
                      <div className="flex items-center gap-1 text-[11px] text-purple-700 bg-purple-50 border border-purple-100 px-2 py-1 rounded-lg">
                        <Calendar className="w-3 h-3 text-purple-500" />
                        <span>Acuerdo directiva: límite {socio.fecha_pago_especial}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer of card */}
                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Estado: {socio.activo ? <strong className="text-emerald-600">Activo</strong> : <span className="text-slate-400">Inactivo</span>}</span>
                  <span className="text-[10px] text-slate-400 font-mono">ID: {socio.id.slice(0, 8)}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal / Formulario Ágil de Registro y Edición */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg my-8 overflow-hidden animate-fadeIn">
            {/* Modal Header */}
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
                  {isEditing ? <Edit2 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">
                    {isEditing ? 'Editar Socio y Unidad de Cobro' : 'Carga Rápida de Socio'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isEditing ? 'Actualiza los datos vigentes' : 'Optimizado para registrar los ~80 socios ágilmente'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Sección 1: Datos del Socio */}
              <div className="space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block border-b pb-1">
                  1. Datos del Socio
                </span>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nombre Completo <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={nombreInputRef}
                    type="text"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej. Juan Pérez Ramos"
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Teléfono / WhatsApp</label>
                    <input
                      type="text"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      placeholder="71234567"
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Fecha de Pago Especial (Opcional)
                    </label>
                    <input
                      type="date"
                      value={fechaPagoEspecial}
                      onChange={(e) => setFechaPagoEspecial(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-400">Acuerdo con directiva para no generar multa</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-1">
                  <input
                    type="checkbox"
                    id="activo"
                    checked={activo}
                    onChange={(e) => setActivo(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                  />
                  <label htmlFor="activo" className="text-xs font-medium text-slate-700">
                    Socio Activo en el mercado
                  </label>
                </div>
              </div>

              {/* Sección 2: Unidad de Cobro y Puestos Agrupados */}
              <div className="space-y-3 pt-3">
                <div className="flex items-center justify-between border-b pb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    2. Puesto o Unidad de Cobro
                  </span>
                  <label className="flex items-center space-x-1.5 text-xs text-emerald-700 font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasUnidad}
                      onChange={(e) => setHasUnidad(e.target.checked)}
                      className="w-3.5 h-3.5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                    />
                    <span>Asignar Puesto</span>
                  </label>
                </div>

                {hasUnidad && (
                  <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Identificador del Puesto <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={numeroIdentificador}
                          onChange={(e) => setNumeroIdentificador(e.target.value)}
                          placeholder="Ej. Puesto 14, Caseta A-2..."
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Modalidad de Cobro</label>
                        <select
                          value={tipo}
                          onChange={(e) => setTipo(e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
                        >
                          <option value="variable">⚡ Variable (Base 58 Bs + Luz)</option>
                          <option value="fijo">🔒 Fijo (Sin tarifador)</option>
                        </select>
                      </div>
                    </div>

                    {tipo === 'fijo' ? (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Subtipo de Tarifa Fija</label>
                        <select
                          value={subtipoFijo}
                          onChange={(e) => setSubtipoFijo(e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        >
                          <option value="puesto_abierto">Puesto Abierto (70 Bs)</option>
                          <option value="puesto_cerrado">Puesto Cerrado (55 Bs)</option>
                          <option value="ambulante">Ambulante (50 Bs)</option>
                          <option value="no_socio">No Socio (50 Bs)</option>
                        </select>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Código de Tarifador de Luz
                          </label>
                          <input
                            type="text"
                            value={codigoTarifador}
                            onChange={(e) => setCodigoTarifador(e.target.value)}
                            placeholder="Ej. TAR-14, MED-02"
                            className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Lectura Inicial (kWh)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={ultimaLectura}
                            onChange={(e) => setUltimaLectura(e.target.value)}
                            placeholder="0.00"
                            className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                          />
                        </div>
                      </div>
                    )}

                    {/* Agrupación de puestos */}
                    <div className="pt-2 border-t border-slate-200">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-indigo-600" />
                          Cantidad de Puestos Agrupados
                        </label>
                        <div className="flex items-center space-x-2">
                          {[1, 2, 3].map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => setCantidadPuestos(num)}
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                cantidadPuestos === num
                                  ? 'bg-purple-600 text-white shadow-sm'
                                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              {num} {num === 1 ? 'puesto' : 'puestos'}
                            </button>
                          ))}
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Si una persona atiende 2 puestos con un mismo tarifador, selecciona 2 para multiplicar la base fija (58 Bs × 2 = 116 Bs).
                      </p>
                    </div>

                    {cantidadPuestos > 1 && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Nombres de Titulares Agrupados (Opcional)
                        </label>
                        <input
                          type="text"
                          value={nombresTitulares}
                          onChange={(e) => setNombresTitulares(e.target.value)}
                          placeholder="Ej. Puesto A: Juan Pérez / Puesto B: Rosa Gómez"
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer / Buttons */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors"
              >
                Cancelar
              </button>

              {!isEditing && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSave(true)}
                  className="w-full sm:w-auto px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>{saving ? 'Guardando...' : 'Guardar y agregar otro'}</span>
                </button>
              )}

              <button
                type="button"
                disabled={saving}
                onClick={() => handleSave(false)}
                className="w-full sm:w-auto px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-900/20 transition-all flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{saving ? 'Guardando...' : isEditing ? 'Actualizar Socio' : 'Guardar y Cerrar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
