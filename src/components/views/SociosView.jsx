import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { registrarAuditoria } from '../../lib/auditoria'
import TraspasoPuestoModal from '../modals/TraspasoPuestoModal'
import {
  Users,
  Search,
  UserPlus,
  Edit2,
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
  ArrowRightLeft,
  History,
  ExternalLink
} from 'lucide-react'

export default function SociosView() {
  const { user, isAdmin } = useAuth()
  const [activeTab, setActiveTab] = useState('socios') // 'socios' | 'externos' | 'traspasos'
  const [socios, setSocios] = useState([])
  const [externos, setExternos] = useState([])
  const [traspasos, setTraspasos] = useState([])
  const [costoAfiliacion, setCostoAfiliacion] = useState(1500)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTipo, setFilterTipo] = useState('todos')
  const [statusMessage, setStatusMessage] = useState(null)

  // Modal Socio
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingSocioId, setEditingSocioId] = useState(null)
  const [editingUnidadId, setEditingUnidadId] = useState(null)
  const [saving, setSaving] = useState(false)

  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [fechaPagoEspecial, setFechaPagoEspecial] = useState('')
  const [activo, setActivo] = useState(true)
  const [notas, setNotas] = useState('')

  const [hasUnidad, setHasUnidad] = useState(true)
  const [numeroIdentificador, setNumeroIdentificador] = useState('')
  const [nombresTitulares, setNombresTitulares] = useState('')
  const [tipo, setTipo] = useState('variable')
  const [subtipoFijo, setSubtipoFijo] = useState('puesto_abierto')
  const [cantidadPuestos, setCantidadPuestos] = useState(1)
  const [codigoTarifador, setCodigoTarifador] = useState('')
  const [ultimaLectura, setUltimaLectura] = useState(0)

  // Modal Externo (No Socio)
  const [isExtModalOpen, setIsExtModalOpen] = useState(false)
  const [editingExtId, setEditingExtId] = useState(null)
  const [extNombre, setExtNombre] = useState('')
  const [extTelefono, setExtTelefono] = useState('')
  const [extUbicacion, setExtUbicacion] = useState('')
  const [extMontoSugerido, setExtMontoSugerido] = useState('')
  const [extActivo, setExtActivo] = useState(true)
  const [extObs, setExtObs] = useState('')
  const [savingExt, setSavingExt] = useState(false)

  // Modal Traspaso
  const [traspasoTarget, setTraspasoTarget] = useState(null) // { socio, unidad }

  const nombreInputRef = useRef(null)

  const fetchAll = async () => {
    try {
      setLoading(true)
      const [
        { data: sData, error: sErr },
        { data: eData, error: eErr },
        { data: tData, error: tErr },
        { data: tarData },
      ] = await Promise.all([
        supabase.from('socios').select('*, unidades_cobro (*)').order('nombre', { ascending: true }),
        supabase.from('aportantes_externos').select('*').order('nombre_completo', { ascending: true }),
        supabase.from('traspasos_puestos').select('*').order('fecha_traspaso', { ascending: false }).order('created_at', { ascending: false }),
        supabase.from('configuracion_tarifas').select('costo_afiliacion').limit(1).maybeSingle(),
      ])

      if (sErr) throw sErr
      if (eErr) throw eErr
      if (tErr) throw tErr

      setSocios(sData || [])
      setExternos(eData || [])
      setTraspasos(tData || [])
      if (tarData?.costo_afiliacion) setCostoAfiliacion(tarData.costo_afiliacion)
    } catch (err) {
      console.error('Error fetching padrón:', err)
      setStatusMessage({ type: 'error', text: 'Error al cargar datos: ' + err.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
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

        if (hasUnidad) {
          const unidadData = {
            socio_responsable_id: editingSocioId,
            numero_identificador: numeroIdentificador.trim(),
            nombres_titulares: nombresTitulares.trim() || null,
            tipo,
            subtipo_fijo: tipo === 'fijo' ? subtipoFijo : null,
            cantidad_puestos: parseInt(cantidadPuestos, 10) || 1,
            codigo_tarifador: tipo === 'variable' ? codigoTarifador.trim() || null : null,
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
            const { error: unidadError } = await supabase.from('unidades_cobro').insert([unidadData])
            if (unidadError) throw unidadError
          }
        }

        setStatusMessage({ type: 'success', text: `Socio "${nombre}" actualizado correctamente.` })
        setIsModalOpen(false)
        await fetchAll()
      } else {
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

        if (hasUnidad && newSocio) {
          const { error: unidadError } = await supabase.from('unidades_cobro').insert([
            {
              socio_responsable_id: newSocio.id,
              numero_identificador: numeroIdentificador.trim(),
              nombres_titulares: nombresTitulares.trim() || null,
              tipo,
              subtipo_fijo: tipo === 'fijo' ? subtipoFijo : null,
              cantidad_puestos: parseInt(cantidadPuestos, 10) || 1,
              codigo_tarifador: tipo === 'variable' ? codigoTarifador.trim() || null : null,
              ultima_lectura: parseFloat(ultimaLectura) || 0,
              activo,
            },
          ])
          if (unidadError) throw unidadError
        }

        setStatusMessage({
          type: 'success',
          text: `¡Socio "${nombre}" registrado con éxito! (Padrón oficial: ${socios.length + 1} socios)`,
        })

        await fetchAll()

        if (continueAdding) {
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
      setStatusMessage({ type: 'error', text: 'Error al guardar: ' + err.message })
    } finally {
      setSaving(false)
    }
  }

  // Externos CRUD (sin borrar)
  const openNewExtModal = () => {
    setEditingExtId(null)
    setExtNombre('')
    setExtTelefono('')
    setExtUbicacion('')
    setExtMontoSugerido('')
    setExtActivo(true)
    setExtObs('')
    setIsExtModalOpen(true)
  }

  const openEditExtModal = (ext) => {
    setEditingExtId(ext.id)
    setExtNombre(ext.nombre_completo || '')
    setExtTelefono(ext.telefono || '')
    setExtUbicacion(ext.referencia_ubicacion || '')
    setExtMontoSugerido(String(ext.monto_mensual_sugerido ?? ''))
    setExtActivo(ext.activo !== false)
    setExtObs(ext.observaciones || '')
    setIsExtModalOpen(true)
  }

  const handleSaveExterno = async (e) => {
    e.preventDefault()
    if (!extNombre.trim()) {
      setStatusMessage({ type: 'error', text: 'El nombre del aportante externo es obligatorio.' })
      return
    }

    setSavingExt(true)
    try {
      const payload = {
        nombre_completo: extNombre.trim(),
        telefono: extTelefono.trim() || null,
        referencia_ubicacion: extUbicacion.trim() || null,
        monto_mensual_sugerido: parseFloat(extMontoSugerido) || 0,
        activo: extActivo,
        observaciones: extObs.trim() || null,
      }

      if (editingExtId) {
        const { error } = await supabase.from('aportantes_externos').update(payload).eq('id', editingExtId)
        if (error) throw error
        setStatusMessage({ type: 'success', text: `Aportante externo "${payload.nombre_completo}" actualizado.` })
      } else {
        const { error } = await supabase.from('aportantes_externos').insert([payload])
        if (error) throw error
        await registrarAuditoria({
          usuarioId: user?.id,
          accion: 'ALTA_APORTANTE_EXTERNO',
          detalleJson: {
            descripcion: `Nuevo aportante externo: ${payload.nombre_completo} (${payload.monto_mensual_sugerido} Bs/mes)`,
            ...payload,
          },
        })
        setStatusMessage({ type: 'success', text: `Aportante externo "${payload.nombre_completo}" registrado.` })
      }

      setIsExtModalOpen(false)
      await fetchAll()
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Error al guardar externo: ' + err.message })
    } finally {
      setSavingExt(false)
    }
  }

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
    if (filterTipo === 'fijo') return s.unidades_cobro?.some((u) => u.tipo === 'fijo')
    if (filterTipo === 'variable') return s.unidades_cobro?.some((u) => u.tipo === 'variable')
    if (filterTipo === 'especial') return Boolean(s.fecha_pago_especial)
    return true
  })

  const filteredExternos = externos.filter((e) => {
    const term = searchTerm.toLowerCase()
    return (
      !term ||
      e.nombre_completo?.toLowerCase().includes(term) ||
      e.referencia_ubicacion?.toLowerCase().includes(term) ||
      e.telefono?.toLowerCase().includes(term)
    )
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Padrón de Socios, Externos y Traspasos</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              {socios.length} socios oficiales
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Puestos agrupados, aportantes externos (Guardia/Agua) y transferencia de puestos con historial intacto.
          </p>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={fetchAll}
            disabled={loading}
            title="Recargar padrón"
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>

          {activeTab === 'externos' ? (
            isAdmin && (
              <button
                type="button"
                onClick={openNewExtModal}
                className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md transition-all"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Agregar Externo</span>
              </button>
            )
          ) : (
            isAdmin && (
              <button
                type="button"
                onClick={openNewModal}
                className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md shadow-emerald-900/20 transition-all"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Agregar Socio / Puesto</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* Pestañas */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('socios')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'socios' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Socios del Mercado ({socios.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('externos')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'externos' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Externos (No Socios) ({externos.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('traspasos')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'traspasos' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Historial de Traspasos ({traspasos.length})</span>
        </button>
      </div>

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
          <button onClick={() => setStatusMessage(null)} className="p-1 rounded-md hover:bg-black/5">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {activeTab === 'traspasos' ? (
        /* TAB: HISTORIAL DE TRASPASOS */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Registro Histórico de Traspasos / Venta de Puestos ({traspasos.length})
            </span>
          </div>

          {traspasos.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-500">
              No se han registrado traspasos de puestos todavía. Usa el botón <strong>Transferir / Vender Puesto</strong> en cualquier puesto activo.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {traspasos.map((tr) => (
                <div key={tr.id} className="p-4 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-bold">
                        {tr.puesto_referencia}
                      </span>
                      <span className="font-bold text-red-700">{tr.nombre_socio_anterior}</span>
                      <span className="text-slate-400">➔</span>
                      <span className="font-bold text-emerald-700">{tr.nombre_socio_nuevo}</span>
                      {tr.incluye_afiliacion_nueva && (
                        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                          Con Afiliación Nueva
                        </span>
                      )}
                    </div>
                    {tr.observaciones && <p className="text-slate-600">{tr.observaciones}</p>}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-slate-500 font-mono">{tr.fecha_traspaso}</span>
                    {tr.documento_respaldo_url && (
                      <a
                        href={tr.documento_respaldo_url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg font-semibold inline-flex items-center gap-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Acta</span>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === 'externos' ? (
        /* TAB: EXTERNOS (NO SOCIOS - GUARDIA Y AGUA) */
        <div className="space-y-4">
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 text-xs text-indigo-900">
            <strong>Aportantes Externos (No Socios):</strong> Personas fuera de la asociación que aportan únicamente para Guardia y Agua con un monto individual sugerido. No alteran el conteo oficial de socios ni tienen luz o afiliación.
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar externo por nombre, ubicación o teléfono..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {filteredExternos.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 text-xs text-slate-500">
              No hay aportantes externos registrados aún.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredExternos.map((ext) => (
                <div
                  key={ext.id}
                  className={`bg-white rounded-2xl p-4 border shadow-sm space-y-2 ${
                    ext.activo ? 'border-slate-200' : 'border-slate-200 bg-slate-50 opacity-70'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{ext.nombre_completo}</h4>
                      {ext.telefono && (
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" />
                          <span>{ext.telefono}</span>
                        </p>
                      )}
                    </div>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => openEditExtModal(ext)}
                        className="p-1.5 rounded-lg text-slate-500 hover:bg-indigo-50 hover:text-indigo-700"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="bg-indigo-50/60 p-2.5 rounded-xl border border-indigo-100 text-xs flex justify-between items-center">
                    <span className="text-indigo-900 font-medium">Aporte Sugerido:</span>
                    <span className="font-extrabold text-indigo-700">
                      {parseFloat(ext.monto_mensual_sugerido || 0).toFixed(2)} Bs/mes
                    </span>
                  </div>

                  {ext.referencia_ubicacion && (
                    <p className="text-xs text-slate-600">
                      <strong>Ubicación:</strong> {ext.referencia_ubicacion}
                    </p>
                  )}
                  {ext.observaciones && <p className="text-[11px] text-slate-500 italic">{ext.observaciones}</p>}

                  <div className="pt-2 border-t border-slate-100 flex justify-between text-[11px]">
                    <span className={ext.activo ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                      {ext.activo ? 'Activo' : 'Inactivo'}
                    </span>
                    <span className="text-slate-400">Solo Guardia y Agua</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* TAB: PADRÓN DE SOCIOS */
        <>
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

            <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 text-xs font-medium">
              <button
                onClick={() => setFilterTipo('todos')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  filterTipo === 'todos' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Todos ({socios.length})
              </button>
              <button
                onClick={() => setFilterTipo('variable')}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 ${
                  filterTipo === 'variable' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Zap className="w-3 h-3 text-amber-400" />
                Con Luz (Variable)
              </button>
              <button
                onClick={() => setFilterTipo('fijo')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  filterTipo === 'fijo' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Fijos
              </button>
              <button
                onClick={() => setFilterTipo('especial')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  filterTipo === 'especial' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Fecha Especial
              </button>
            </div>
          </div>

          {loading ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
              <RefreshCw className="w-8 h-8 mx-auto animate-spin text-emerald-600 mb-2" />
              <p className="text-sm text-slate-600 font-medium">Cargando padrón desde Supabase...</p>
            </div>
          ) : filteredSocios.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
              <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <h3 className="text-base font-bold text-slate-700">No se encontraron socios</h3>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSocios.map((socio) => {
                const unidadesSocio = socio.unidades_cobro || []
                const unidad = unidadesSocio[0]
                const isVariable = unidad?.tipo === 'variable'
                const isMultiPuesto = (unidad?.cantidad_puestos || 1) > 1

                return (
                  <div
                    key={socio.id}
                    className={`bg-white rounded-2xl p-4 border transition-all hover:shadow-md flex flex-col justify-between ${
                      socio.activo ? 'border-slate-200 hover:border-emerald-300' : 'border-slate-200 bg-slate-50/70 opacity-75'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100">
                        <div>
                          <h4 className="font-bold text-sm text-slate-900 leading-tight">{socio.nombre}</h4>
                          {socio.telefono && (
                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{socio.telefono}</span>
                            </p>
                          )}
                        </div>
                        {isAdmin && (
                          <button
                            onClick={() => openEditModal(socio)}
                            title="Editar socio y unidad"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="mt-3 space-y-2 text-xs">
                        {unidadesSocio.length > 0 ? (
                          unidadesSocio.map((u) => (
                            <div key={u.id} className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-800 flex items-center gap-1">
                                  <Store className="w-3.5 h-3.5 text-slate-500" />
                                  {u.numero_identificador}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                    u.tipo === 'variable' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                                  }`}
                                >
                                  {u.tipo === 'variable' ? 'Luz Variable' : u.subtipo_fijo?.replace('_', ' ') || 'Fijo'}
                                </span>
                              </div>

                              {(u.cantidad_puestos || 1) > 1 && (
                                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-semibold">
                                  <Layers className="w-3 h-3" />
                                  <span>{u.cantidad_puestos} puestos agrupados</span>
                                </div>
                              )}

                              {u.codigo_tarifador && (
                                <div className="flex items-center justify-between text-slate-600 text-[11px]">
                                  <span className="flex items-center gap-1 text-slate-500">
                                    <Zap className="w-3 h-3 text-amber-500" />
                                    Tarifador:
                                  </span>
                                  <span className="font-mono font-semibold bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                    {u.codigo_tarifador}
                                  </span>
                                </div>
                              )}

                              {u.activo !== false && isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => setTraspasoTarget({ socio, unidad: u })}
                                  className="w-full mt-1 py-1.5 px-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors"
                                >
                                  <ArrowRightLeft className="w-3 h-3" />
                                  <span>Transferir / Vender Puesto</span>
                                </button>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="p-2 rounded-xl bg-slate-50 text-slate-400 italic text-[11px]">
                            Sin puesto o unidad de cobro asignada.
                          </div>
                        )}

                        {socio.fecha_pago_especial && (
                          <div className="flex items-center gap-1 text-[11px] text-purple-700 bg-purple-50 border border-purple-100 px-2 py-1 rounded-lg">
                            <Calendar className="w-3 h-3 text-purple-500" />
                            <span>Acuerdo directiva: límite {socio.fecha_pago_especial}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                      <span>
                        Estado: {socio.activo ? <strong className="text-emerald-600">Activo</strong> : <span>Inactivo</span>}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {isMultiPuesto ? `${unidad.cantidad_puestos} puestos` : isVariable ? 'Variable' : 'Fijo'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Modal Socio / Puesto */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg my-8 overflow-hidden animate-fadeIn">
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
                  {isEditing ? <Edit2 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">
                    {isEditing ? 'Editar Socio y Unidad de Cobro' : 'Carga Rápida de Socio'}
                  </h3>
                  <p className="text-xs text-slate-400">Padrón oficial del mercado</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
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
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl"
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
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-1">
                  <input
                    type="checkbox"
                    id="activo"
                    checked={activo}
                    onChange={(e) => setActivo(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <label htmlFor="activo" className="text-xs font-medium text-slate-700">
                    Socio Activo en el mercado
                  </label>
                </div>
              </div>

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
                      className="w-3.5 h-3.5 text-emerald-600 rounded"
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
                          placeholder="Ej. Puesto 14"
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Modalidad de Cobro</label>
                        <select
                          value={tipo}
                          onChange={(e) => setTipo(e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-medium"
                        >
                          <option value="variable">Variable (Base 58 Bs + Luz)</option>
                          <option value="fijo">Fijo (Sin tarifador)</option>
                        </select>
                      </div>
                    </div>

                    {tipo === 'fijo' ? (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Subtipo de Tarifa Fija</label>
                        <select
                          value={subtipoFijo}
                          onChange={(e) => setSubtipoFijo(e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl"
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
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Código de Tarifador</label>
                          <input
                            type="text"
                            value={codigoTarifador}
                            onChange={(e) => setCodigoTarifador(e.target.value)}
                            placeholder="Ej. TAR-14"
                            className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Lectura Inicial (kWh)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={ultimaLectura}
                            onChange={(e) => setUltimaLectura(e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-mono"
                          />
                        </div>
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-indigo-600" />
                        Puestos Agrupados
                      </label>
                      <div className="flex items-center space-x-2">
                        {[1, 2, 3].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setCantidadPuestos(num)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold ${
                              cantidadPuestos === num ? 'bg-purple-600 text-white' : 'bg-white border border-slate-300 text-slate-700'
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>

                    {cantidadPuestos > 1 && (
                      <input
                        type="text"
                        value={nombresTitulares}
                        onChange={(e) => setNombresTitulares(e.target.value)}
                        placeholder="Nombres de titulares agrupados (Opcional)"
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl"
                      />
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-end gap-2.5">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-600">
                Cancelar
              </button>
              {!isEditing && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSave(true)}
                  className="px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>{saving ? 'Guardando...' : 'Guardar y agregar otro'}</span>
                </button>
              )}
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSave(false)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{saving ? 'Guardando...' : isEditing ? 'Actualizar Socio' : 'Guardar y Cerrar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Externo */}
      {isExtModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md my-8 overflow-hidden">
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">
                  {editingExtId ? 'Editar Aportante Externo' : 'Registrar Aportante Externo'}
                </h3>
                <p className="text-xs text-slate-400">Solo aporte de Guardia y Agua (sin multas ni afiliación)</p>
              </div>
              <button onClick={() => setIsExtModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400 hover:text-white" />
              </button>
            </div>

            <form onSubmit={handleSaveExterno} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre Completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={extNombre}
                  onChange={(e) => setExtNombre(e.target.value)}
                  placeholder="Ej. Tienda Esquina / Sra. Carmen"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={extTelefono}
                    onChange={(e) => setExtTelefono(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Monto Sugerido Mensual (Bs) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.50"
                    min="0"
                    required
                    value={extMontoSugerido}
                    onChange={(e) => setExtMontoSugerido(e.target.value)}
                    placeholder="Ej. 35.00"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Referencia / Ubicación</label>
                <input
                  type="text"
                  value={extUbicacion}
                  onChange={(e) => setExtUbicacion(e.target.value)}
                  placeholder="Ej. Acera Norte / Frente al portón"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Observaciones</label>
                <input
                  type="text"
                  value={extObs}
                  onChange={(e) => setExtObs(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={extActivo}
                  onChange={(e) => setExtActivo(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <span>Aportante Activo</span>
              </label>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button type="button" onClick={() => setIsExtModalOpen(false)} className="px-4 py-2 text-xs text-slate-600">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingExt}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold"
                >
                  {savingExt ? 'Guardando...' : 'Guardar Externo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Traspaso / Venta de Puesto */}
      <TraspasoPuestoModal
        isOpen={Boolean(traspasoTarget)}
        onClose={() => setTraspasoTarget(null)}
        socioAnterior={traspasoTarget?.socio}
        unidad={traspasoTarget?.unidad}
        socios={socios}
        costoAfiliacion={costoAfiliacion}
        onSuccess={(compradorNombre) => {
          setStatusMessage({
            type: 'success',
            text: `¡Puesto transferido a "${compradorNombre}"! El historial de cobros anteriores quedó intacto.`,
          })
          fetchAll()
        }}
      />
    </div>
  )
}
