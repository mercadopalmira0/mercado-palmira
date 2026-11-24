import React, { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { registrarAuditoria, registrarEdicionAuditoria, registrarEliminacionAuditoria } from '../../lib/auditoria'
import { getLocalDateStr } from '../../lib/formatters'
import FotoUploaderModal from '../modals/FotoUploaderModal'
import ConfirmMotivoModal from '../modals/ConfirmMotivoModal'
import {
  Package,
  PlusCircle,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  Camera,
  ExternalLink,
  Printer,
  Download,
  CheckCircle2,
  X,
  ShieldAlert,
  FileText
} from 'lucide-react'

const CATEGORIAS_INV = [
  'Útiles / Insumos',
  'Limpieza / Plagas',
  'Herramientas',
  'Mobiliario',
  'Otros',
]

const ESTADOS_INV = [
  { value: 'en_uso', label: 'En uso', badge: 'bg-emerald-100 text-emerald-800' },
  { value: 'en_deposito', label: 'En depósito', badge: 'bg-blue-100 text-blue-800' },
  { value: 'agotado', label: 'Agotado', badge: 'bg-amber-100 text-amber-800' },
  { value: 'danado_baja', label: 'Dañado / Baja', badge: 'bg-red-100 text-red-800' },
]

export default function InventarioView() {
  const { user, isAdmin } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCat, setFilterCat] = useState('todos')
  const [filterOrigen, setFilterOrigen] = useState('todos')
  const [filterEstado, setFilterEstado] = useState('activos')
  const [statusMessage, setStatusMessage] = useState(null)

  const [showActaView, setShowActaView] = useState(false)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [nombre, setNombre] = useState('')
  const [categoria, setCategoria] = useState(CATEGORIAS_INV[0])
  const [cantidad, setCantidad] = useState('1')
  const [unidadMedida, setUnidadMedida] = useState('unidades')
  const [origen, setOrigen] = useState('comprado_gestion')
  const [fechaAdq, setFechaAdq] = useState(getLocalDateStr())
  const [costoRef, setCostoRef] = useState('0')
  const [responsable, setResponsable] = useState('')
  const [estado, setEstado] = useState('en_uso')
  const [fotoUrl, setFotoUrl] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [motivoBaja, setMotivoBaja] = useState('')
  const [isPhotoOpen, setIsPhotoOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [anulandoId, setAnulandoId] = useState(null)
  const [motivoAnulacion, setMotivoAnulacion] = useState('')

  const [confirmState, setConfirmState] = useState({ open: false, tipo: 'edicion', target: null })

  const fetchItems = async () => {
    setLoading(true)
    setStatusMessage(null)
    try {
      const { data, error } = await supabase
        .from('inventario_mercado')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setItems(data || [])
    } catch (err) {
      console.error(err)
      setStatusMessage({ type: 'error', text: 'Error al cargar inventario: ' + err.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
  }, [])

  const openNewModal = () => {
    setEditingItem(null)
    setNombre('')
    setCategoria(CATEGORIAS_INV[0])
    setCantidad('1')
    setUnidadMedida('unidades')
    setOrigen('comprado_gestion')
    setFechaAdq(getLocalDateStr())
    setCostoRef('0')
    setResponsable('')
    setEstado('en_uso')
    setFotoUrl('')
    setObservaciones('')
    setMotivoBaja('')
    setIsModalOpen(true)
  }

  const openEditModal = (it) => {
    setEditingItem(it)
    setNombre(it.nombre || '')
    setCategoria(it.categoria || CATEGORIAS_INV[0])
    setCantidad(String(it.cantidad ?? 1))
    setUnidadMedida(it.unidad_medida || 'unidades')
    setOrigen(it.origen || 'comprado_gestion')
    setFechaAdq(it.fecha_adquisicion || getLocalDateStr())
    setCostoRef(String(it.costo_referencial ?? 0))
    setResponsable(it.responsable_ubicacion || '')
    setEstado(it.estado || 'en_uso')
    setFotoUrl(it.foto_url || '')
    setObservaciones(it.observaciones || '')
    setMotivoBaja(it.motivo_baja || '')
    setIsModalOpen(true)
  }

  const buildPayload = () => ({
    nombre: nombre.trim(),
    categoria,
    cantidad: parseFloat(cantidad) || 0,
    unidad_medida: unidadMedida.trim() || 'unidades',
    origen,
    fecha_adquisicion: fechaAdq || getLocalDateStr(),
    costo_referencial: parseFloat(costoRef) || 0,
    responsable_ubicacion: responsable.trim() || null,
    estado,
    foto_url: fotoUrl || null,
    observaciones: observaciones.trim() || null,
    motivo_baja: estado === 'agotado' || estado === 'danado_baja' ? motivoBaja.trim() : null,
  })

  const handleSaveItem = async (e) => {
    e.preventDefault()
    if (!nombre.trim()) {
      setStatusMessage({ type: 'error', text: 'El nombre del bien o insumo es obligatorio.' })
      return
    }
    if ((estado === 'agotado' || estado === 'danado_baja') && !motivoBaja.trim()) {
      setStatusMessage({
        type: 'error',
        text: 'Debes indicar un motivo de baja/agotamiento cuando el estado sea Agotado o Dañado/Baja.',
      })
      return
    }

    if (editingItem) {
      setConfirmState({ open: true, tipo: 'edicion', target: editingItem })
      return
    }

    setSaving(true)
    try {
      const payload = buildPayload()
      const { data, error } = await supabase.from('inventario_mercado').insert([payload]).select().single()
      if (error) throw error

      await registrarAuditoria({
        usuarioId: user?.id,
        accion: 'ALTA_INVENTARIO',
        detalleJson: {
          descripcion: `Alta en inventario: "${payload.nombre}" (${payload.cantidad} ${payload.unidad_medida} • ${payload.origen})`,
          tabla: 'inventario_mercado',
          registro_id: data?.id,
          ...payload,
        },
      })
      setStatusMessage({ type: 'success', text: `Bien "${payload.nombre}" agregado al inventario.` })
      setIsModalOpen(false)
      await fetchItems()
    } catch (err) {
      console.error(err)
      setStatusMessage({ type: 'error', text: 'Error al guardar ítem: ' + err.message })
    } finally {
      setSaving(false)
    }
  }

  const handleConfirmAudit = async (motivo) => {
    const { tipo, target } = confirmState
    if (!target) return

    setSaving(true)
    try {
      if (tipo === 'edicion') {
        const payload = buildPayload()
        await registrarEdicionAuditoria({
          usuarioId: user?.id,
          modulo: 'Inventario del Mercado',
          tabla: 'inventario_mercado',
          registroId: target.id,
          motivo,
          resumen: `Edición de bien "${target.nombre}"`,
          datosAnteriores: {
            nombre: target.nombre,
            categoria: target.categoria,
            cantidad: target.cantidad,
            unidad_medida: target.unidad_medida,
            origen: target.origen,
            fecha_adquisicion: target.fecha_adquisicion,
            costo_referencial: target.costo_referencial,
            responsable_ubicacion: target.responsable_ubicacion,
            estado: target.estado,
            foto_url: target.foto_url,
            observaciones: target.observaciones,
            motivo_baja: target.motivo_baja,
          },
          datosNuevos: payload,
        })

        const { error } = await supabase
          .from('inventario_mercado')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', target.id)
        if (error) throw error

        setIsModalOpen(false)
        setEditingItem(null)
        setStatusMessage({ type: 'success', text: `Ítem "${payload.nombre}" actualizado y auditado en bitácora.` })
      } else {
        await registrarEliminacionAuditoria({
          usuarioId: user?.id,
          modulo: 'Inventario del Mercado',
          tabla: 'inventario_mercado',
          registroId: target.id,
          motivo,
          resumen: `Eliminación de bien "${target.nombre}" (${target.cantidad} ${target.unidad_medida})`,
          datosAnteriores: target,
        })

        const { error } = await supabase.from('inventario_mercado').delete().eq('id', target.id)
        if (error) throw error

        setStatusMessage({ type: 'success', text: `Ítem "${target.nombre}" eliminado con auditoría en bitácora.` })
      }

      setConfirmState({ open: false, tipo: 'edicion', target: null })
      await fetchItems()
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message })
      setConfirmState({ open: false, tipo: 'edicion', target: null })
    } finally {
      setSaving(false)
    }
  }

  const handleAnularItem = async (id) => {
    if (!motivoAnulacion.trim()) {
      setStatusMessage({ type: 'error', text: 'El motivo de anulación es obligatorio.' })
      return
    }
    try {
      const { error } = await supabase
        .from('inventario_mercado')
        .update({
          anulado: true,
          motivo_anulacion: motivoAnulacion.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
      if (error) throw error

      await registrarAuditoria({
        usuarioId: user?.id,
        accion: 'ANULACION_INVENTARIO',
        detalleJson: {
          descripcion: `Anulación de ítem de inventario ${id}`,
          tabla: 'inventario_mercado',
          registro_id: id,
          motivo: motivoAnulacion.trim(),
        },
      })

      setStatusMessage({ type: 'success', text: 'Ítem anulado y conservado en auditoría.' })
      setAnulandoId(null)
      setMotivoAnulacion('')
      await fetchItems()
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Error al anular ítem: ' + err.message })
    }
  }

  const itemsEntregables = items.filter((it) => !it.anulado && (it.estado === 'en_uso' || it.estado === 'en_deposito'))
  const itemsDirectivaAnterior = items.filter((it) => !it.anulado && it.origen === 'directiva_anterior')
  const itemsCompradosGestion = items.filter((it) => !it.anulado && it.origen === 'comprado_gestion')
  const itemsBaja = items.filter((it) => !it.anulado && (it.estado === 'agotado' || it.estado === 'danado_baja'))

  const filteredItems = items.filter((it) => {
    const term = searchTerm.toLowerCase()
    const matchSearch =
      !term ||
      it.nombre?.toLowerCase().includes(term) ||
      it.responsable_ubicacion?.toLowerCase().includes(term) ||
      it.observaciones?.toLowerCase().includes(term)
    if (!matchSearch) return false
    if (filterCat !== 'todos' && it.categoria !== filterCat) return false
    if (filterOrigen !== 'todos' && it.origen !== filterOrigen) return false
    if (filterEstado === 'activos') return !it.anulado
    if (filterEstado === 'anulados') return Boolean(it.anulado)
    if (filterEstado !== 'todos') return !it.anulado && it.estado === filterEstado
    return true
  })

  const handleExportActaExcel = () => {
    const wb = XLSX.utils.book_new()
    const rows = [
      ['ASOCIACIÓN DE COMERCIANTES MINORISTAS - MERCADO PALMIRA'],
      ['ACTA DE ENTREGA DE INVENTARIO Y BIENES DEL MERCADO'],
      [`Fecha de Emisión: ${new Date().toLocaleDateString('es-BO')}`],
      [],
      ['N°', 'Bien / Objeto', 'Categoría', 'Cantidad', 'Unidad', 'Origen', 'Estado', 'Responsable / Ubicación', 'Observaciones'],
      ...itemsEntregables.map((it, idx) => [
        idx + 1,
        it.nombre,
        it.categoria,
        parseFloat(it.cantidad) || 0,
        it.unidad_medida || 'unidades',
        it.origen === 'directiva_anterior' ? 'Recibido directiva anterior' : 'Comprado en esta gestión',
        it.estado === 'en_uso' ? 'En uso' : 'En depósito',
        it.responsable_ubicacion || '-',
        it.observaciones || '-',
      ]),
    ]
    const ws = XLSX.utils.aoa_to_sheet(rows)
    XLSX.utils.book_append_sheet(wb, ws, 'Acta_Inventario')
    XLSX.writeFile(wb, `Acta_Entrega_Inventario_Palmira_${getLocalDateStr()}.xlsx`)
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-slate-900">Inventario / Bienes del Mercado</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              {itemsEntregables.length} vigentes a entregar
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Control de bienes, edición/eliminación auditada y acta de entrega de directiva.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button onClick={fetchItems} title="Recargar inventario" className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>

          <button type="button" onClick={() => setShowActaView(!showActaView)} className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5">
            <FileText className="w-4 h-4" />
            <span>{showActaView ? 'Volver al Listado' : 'Imprimir / Exportar Acta de Entrega'}</span>
          </button>

          {isAdmin && (
            <button type="button" onClick={openNewModal} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5">
              <PlusCircle className="w-4 h-4" />
              <span>+ Registrar Bien / Insumo</span>
            </button>
          )}
        </div>
      </div>

      {statusMessage && (
        <div className={`p-4 rounded-2xl border text-xs flex items-center justify-between no-print ${statusMessage.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
          <span>{statusMessage.text}</span>
          <button onClick={() => setStatusMessage(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {showActaView ? (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 no-print">
            <span className="text-xs font-semibold text-slate-700">
              Vista previa del Acta de Entrega ({itemsEntregables.length} bienes vigentes)
            </span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={handleExportActaExcel} className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5">
                <Download className="w-4 h-4" />
                <span>Exportar Acta Excel (.xlsx)</span>
              </button>
              <button type="button" onClick={() => window.print()} className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5">
                <Printer className="w-4 h-4" />
                <span>Imprimir / Guardar PDF</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200 shadow-sm print-container space-y-6">
            <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-700 block">
                  Asociación de Comerciantes Minoristas — Mercado Palmira
                </span>
                <h1 className="text-xl font-black text-slate-900">ACTA DE ENTREGA DE INVENTARIO Y BIENES DEL MERCADO</h1>
              </div>
              <div className="text-xs text-slate-600 sm:text-right">
                <p><strong>Fecha de Emisión:</strong> {new Date().toLocaleDateString('es-BO')}</p>
                <p><strong>Total Ítems Vigentes:</strong> {itemsEntregables.length}</p>
              </div>
            </div>

            {itemsEntregables.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">No existen ítems vigentes para incluir en el acta.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                      <th className="p-2 border-r border-slate-300 text-center">N°</th>
                      <th className="p-2 border-r border-slate-300">Bien / Objeto</th>
                      <th className="p-2 border-r border-slate-300">Categoría</th>
                      <th className="p-2 border-r border-slate-300 text-right">Cant.</th>
                      <th className="p-2 border-r border-slate-300">Origen</th>
                      <th className="p-2 border-r border-slate-300">Estado</th>
                      <th className="p-2 border-r border-slate-300">Responsable / Ubicación</th>
                      <th className="p-2">Observaciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {itemsEntregables.map((it, idx) => (
                      <tr key={it.id}>
                        <td className="p-2 border-r border-slate-300 text-center font-mono">{idx + 1}</td>
                        <td className="p-2 border-r border-slate-300 font-bold">{it.nombre}</td>
                        <td className="p-2 border-r border-slate-300">{it.categoria}</td>
                        <td className="p-2 border-r border-slate-300 text-right font-semibold">{parseFloat(it.cantidad)} {it.unidad_medida}</td>
                        <td className="p-2 border-r border-slate-300">{it.origen === 'directiva_anterior' ? 'Directiva anterior' : 'Comprado gestión'}</td>
                        <td className="p-2 border-r border-slate-300">{it.estado === 'en_uso' ? 'En uso' : 'En depósito'}</td>
                        <td className="p-2 border-r border-slate-300">{it.responsable_ubicacion || '-'}</td>
                        <td className="p-2">{it.observaciones || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="pt-16 pb-4 grid grid-cols-2 gap-12 text-center text-xs">
              <div className="border-t border-slate-900 pt-2">
                <p className="font-bold text-slate-900">Secretaría de Hacienda Saliente</p>
                <p className="text-[11px] text-slate-500">Entrega conforme de bienes</p>
              </div>
              <div className="border-t border-slate-900 pt-2">
                <p className="font-bold text-slate-900">Directiva Entrante</p>
                <p className="text-[11px] text-slate-500">Recepción conforme de bienes</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">Ítems Activos a Entregar</span>
              <p className="text-2xl font-extrabold text-emerald-700 mt-1">{itemsEntregables.length}</p>
              <span className="text-[11px] text-slate-400">En uso y en depósito</span>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">Directiva Anterior</span>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">{itemsDirectivaAnterior.length}</p>
              <span className="text-[11px] text-slate-400">Recibidos al asumir</span>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block">Comprados en Gestión</span>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">{itemsCompradosGestion.length}</p>
              <span className="text-[11px] text-slate-400">Adquiridos en el periodo</span>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 block">Agotados / Baja</span>
              <p className="text-2xl font-extrabold text-red-600 mt-1">{itemsBaja.length}</p>
              <span className="text-[11px] text-slate-400">Con motivo de baja</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col lg:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre, responsable o ubicación..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700">
                <option value="todos">Todas Categorías</option>
                {CATEGORIAS_INV.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <select value={filterOrigen} onChange={(e) => setFilterOrigen(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700">
                <option value="todos">Todos Orígenes</option>
                <option value="directiva_anterior">Directiva Anterior</option>
                <option value="comprado_gestion">Comprado en Gestión</option>
              </select>

              <select value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700">
                <option value="activos">Activos (No anulados)</option>
                <option value="en_uso">En uso</option>
                <option value="en_deposito">En depósito</option>
                <option value="agotado">Agotado</option>
                <option value="danado_baja">Dañado / Baja</option>
                <option value="anulados">Anulados</option>
                <option value="todos">Todos</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500">Cargando inventario...</div>
          ) : filteredItems.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500 space-y-2">
              <Package className="w-10 h-10 mx-auto text-slate-300" />
              <p>No hay bienes registrados con los filtros seleccionados.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((it) => {
                const estMeta = ESTADOS_INV.find((e) => e.value === it.estado) || ESTADOS_INV[0]
                return (
                  <div key={it.id} className={`bg-white rounded-2xl p-4 border shadow-sm space-y-3 flex flex-col justify-between ${it.anulado ? 'border-red-200 bg-red-50/30 opacity-80' : 'border-slate-200'}`}>
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className={`font-bold text-sm ${it.anulado ? 'line-through text-slate-400' : 'text-slate-900'}`}>{it.nombre}</h4>
                          <span className="text-[11px] text-slate-500">{it.categoria}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {it.anulado ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">Anulado</span>
                          ) : (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${estMeta.badge}`}>{estMeta.label}</span>
                          )}
                          {isAdmin && (
                            <>
                              {!it.anulado && (
                                <button type="button" onClick={() => openEditModal(it)} className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg" title="Editar bien">
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setConfirmState({ open: true, tipo: 'eliminacion', target: it })}
                                className="p-1 text-red-600 hover:bg-red-50 rounded-lg"
                                title="Eliminar bien cargado por error"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Cantidad:</span>
                          <strong className="text-slate-900">{parseFloat(it.cantidad)} {it.unidad_medida}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Origen:</span>
                          <span className="font-medium text-slate-700">{it.origen === 'directiva_anterior' ? 'Directiva anterior' : 'Comprado en gestión'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Adquisición:</span>
                          <span className="font-mono text-slate-700">{it.fecha_adquisicion}</span>
                        </div>
                        {parseFloat(it.costo_referencial) > 0 && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Costo ref.:</span>
                            <span className="text-slate-700">{parseFloat(it.costo_referencial).toFixed(2)} Bs</span>
                          </div>
                        )}
                      </div>

                      {it.responsable_ubicacion && (
                        <p className="text-xs text-slate-600"><strong>Ubicación / Resp.:</strong> {it.responsable_ubicacion}</p>
                      )}
                      {it.observaciones && <p className="text-[11px] text-slate-500">{it.observaciones}</p>}
                      {it.motivo_baja && (
                        <p className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg"><strong>Motivo baja:</strong> {it.motivo_baja}</p>
                      )}
                      {it.anulado && it.motivo_anulacion && (
                        <p className="text-[11px] text-red-700 bg-red-50 p-2 rounded-lg"><strong>Anulado:</strong> {it.motivo_anulacion}</p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      {it.foto_url ? (
                        <a href={it.foto_url} target="_blank" rel="noreferrer" className="text-blue-600 font-semibold inline-flex items-center gap-1 hover:underline">
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Ver Foto</span>
                        </a>
                      ) : (
                        <span className="text-[11px] text-slate-400">Sin foto</span>
                      )}

                      {!it.anulado && isAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            setAnulandoId(it.id)
                            setMotivoAnulacion('')
                          }}
                          className="text-orange-600 hover:bg-orange-50 px-2 py-1 rounded-lg font-semibold text-[11px]"
                        >
                          Anular
                        </button>
                      )}
                    </div>

                    {anulandoId === it.id && (
                      <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs">
                        <span className="font-bold text-amber-900 flex items-center gap-1 text-[11px]">
                          <ShieldAlert className="w-3.5 h-3.5" /> Motivo obligatorio de anulación
                        </span>
                        <input
                          type="text"
                          value={motivoAnulacion}
                          onChange={(e) => setMotivoAnulacion(e.target.value)}
                          placeholder="Motivo..."
                          className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded-lg"
                        />
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => setAnulandoId(null)} className="text-slate-600">
                            Cancelar
                          </button>
                          <button type="button" onClick={() => handleAnularItem(it.id)} className="px-3 py-1 bg-red-600 text-white rounded-lg font-bold">
                            Confirmar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Modal Crear / Editar Ítem */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg my-8 overflow-hidden">
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">
                  {editingItem ? 'Actualizar Bien / Insumo (Auditado)' : 'Registrar Bien / Insumo'}
                </h3>
                <p className="text-xs text-slate-400">Control patrimonial (costo referencial informativo)</p>
              </div>
              <button onClick={() => setIsModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400 hover:text-white" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="p-6 space-y-4 max-h-[78vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre del Bien / Objeto *</label>
                  <input type="text" required value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Categoría</label>
                  <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-semibold">
                    {CATEGORIAS_INV.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Cantidad</label>
                  <input type="number" inputMode="decimal" step="0.01" min="0" required value={cantidad} onChange={(e) => setCantidad(e.target.value)} className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Unidad Medida</label>
                  <input type="text" value={unidadMedida} onChange={(e) => setUnidadMedida(e.target.value)} className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Costo Ref. (Bs)</label>
                  <input type="number" inputMode="decimal" step="0.01" min="0" value={costoRef} onChange={(e) => setCostoRef(e.target.value)} className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Origen</label>
                  <select value={origen} onChange={(e) => setOrigen(e.target.value)} className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-semibold">
                    <option value="comprado_gestion">Comprado en esta gestión</option>
                    <option value="directiva_anterior">Recibido de directiva anterior</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha Adquisición</label>
                  <input type="date" required value={fechaAdq} onChange={(e) => setFechaAdq(e.target.value)} className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Estado</label>
                  <select value={estado} onChange={(e) => setEstado(e.target.value)} className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-semibold">
                    {ESTADOS_INV.map((st) => (
                      <option key={st.value} value={st.value}>
                        {st.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Responsable / Ubicación</label>
                  <input type="text" value={responsable} onChange={(e) => setResponsable(e.target.value)} className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl" />
                </div>
              </div>

              {(estado === 'agotado' || estado === 'danado_baja') && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <label className="block text-xs font-bold text-amber-900 mb-1">Motivo de Baja / Agotamiento *</label>
                  <input type="text" required value={motivoBaja} onChange={(e) => setMotivoBaja(e.target.value)} className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg" />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Observaciones</label>
                <textarea rows={2} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl" />
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-600">Foto del Bien (Drive):</span>
                <div className="flex items-center gap-2">
                  {fotoUrl && (
                    <a href={fotoUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                      Ver
                    </a>
                  )}
                  <button type="button" onClick={() => setIsPhotoOpen(true)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold text-slate-700 flex items-center gap-1">
                    <Camera className="w-3.5 h-3.5" />
                    <span>{fotoUrl ? 'Cambiar Foto' : 'Subir Foto'}</span>
                  </button>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-xs text-slate-600">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{saving ? 'Guardando...' : editingItem ? 'Guardar Cambios' : 'Registrar Ítem'}</span>
                </button>
              </div>
            </form>
          </div>

          <FotoUploaderModal
            isOpen={isPhotoOpen}
            onClose={() => setIsPhotoOpen(false)}
            onPhotoSaved={(url) => setFotoUrl(url)}
            currentUrl={fotoUrl}
            titulo="Foto de Bien / Inventario"
            categoria="Inventario_Mercado"
            anio={new Date().getFullYear()}
            mes={new Date().getMonth() + 1}
            customName={`Inventario_${Date.now()}.jpg`}
          />
        </div>
      )}

      <ConfirmMotivoModal
        isOpen={confirmState.open}
        onClose={() => setConfirmState({ open: false, tipo: 'edicion', target: null })}
        onConfirm={handleConfirmAudit}
        tipo={confirmState.tipo}
        titulo={confirmState.tipo === 'eliminacion' ? 'Eliminar Ítem de Inventario' : 'Editar Ítem de Inventario'}
        descripcion={
          confirmState.target
            ? `${confirmState.tipo === 'eliminacion' ? 'Se eliminará' : 'Se actualizará'} "${confirmState.target.nombre}" guardando el snapshot completo en bitacora_auditoria.`
            : ''
        }
        loading={saving}
      />
    </div>
  )
}
