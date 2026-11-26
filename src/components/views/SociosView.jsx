import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { registrarAuditoria, registrarEdicionAuditoria, registrarEliminacionAuditoria } from '../../lib/auditoria'
import { calcularAutorellenoPersonalizado } from '../../lib/calculosCobro'
import { formatResumenGrupo, round2 } from '../../lib/formatters'
import TraspasoPuestoModal from '../modals/TraspasoPuestoModal'
import GrupoCobroModal from '../modals/GrupoCobroModal'
import ConfirmMotivoModal from '../modals/ConfirmMotivoModal'
import GruposCobroTab from './socios/GruposCobroTab'
import TraspasosTab from './socios/TraspasosTab'
import ExternosSociosTab from './socios/ExternosSociosTab'
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
  ArrowRightLeft,
  History,
  MoreVertical,
} from 'lucide-react'

export default function SociosView() {
  const { user, isAdmin } = useAuth()
  const [activeTab, setActiveTab] = useState('socios') // 'socios' | 'grupos' | 'externos' | 'traspasos'
  const [socios, setSocios] = useState([])
  const [externos, setExternos] = useState([])
  const [traspasos, setTraspasos] = useState([])
  const [costoAfiliacion, setCostoAfiliacion] = useState(1500)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTipo, setFilterTipo] = useState('todos')
  const [statusMessage, setStatusMessage] = useState(null)
  const [openMenuSocioId, setOpenMenuSocioId] = useState(null)

  // Modal Socio
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingSocioOriginal, setEditingSocioOriginal] = useState(null)
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
  const [tipo, setTipo] = useState('fijo')
  const [subtipoFijo, setSubtipoFijo] = useState('puesto_abierto')
  const [codigoTarifador, setCodigoTarifador] = useState('')
  const [ultimaLectura, setUltimaLectura] = useState(0)

  // Tarifa fija personalizada
  const [montoFijoPers, setMontoFijoPers] = useState('')
  const [guardiaPers, setGuardiaPers] = useState('')
  const [aguaPers, setAguaPers] = useState('')
  const [luzPers, setLuzPers] = useState('')
  const [detallePers, setDetallePers] = useState('')

  // Modal Grupo de Cobro
  const [isGrupoModalOpen, setIsGrupoModalOpen] = useState(false)
  const [editingGrupo, setEditingGrupo] = useState(null)

  // Modal Externo (No Socio)
  const [isExtModalOpen, setIsExtModalOpen] = useState(false)
  const [editingExtOriginal, setEditingExtOriginal] = useState(null)
  const [editingExtId, setEditingExtId] = useState(null)
  const [extNombre, setExtNombre] = useState('')
  const [extTelefono, setExtTelefono] = useState('')
  const [extUbicacion, setExtUbicacion] = useState('')
  const [extGuardiaBase, setExtGuardiaBase] = useState('40')
  const [extAguaBase, setExtAguaBase] = useState('10')
  const [extActivo, setExtActivo] = useState(true)
  const [extObs, setExtObs] = useState('')
  const [savingExt, setSavingExt] = useState(false)

  // Modal Traspaso
  const [traspasoTarget, setTraspasoTarget] = useState(null)

  // Confirmación auditada de Edición / Eliminación
  const [confirmState, setConfirmState] = useState({
    open: false,
    tipo: 'edicion',
    entity: null, // 'socio' | 'externo'
    target: null,
    advertencia: '',
  })

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
    setTipo('fijo')
    setSubtipoFijo('puesto_abierto')
    setCodigoTarifador('')
    setUltimaLectura(0)
    setMontoFijoPers('')
    setGuardiaPers('')
    setAguaPers('')
    setLuzPers('')
    setDetallePers('')
    setIsEditing(false)
    setEditingSocioOriginal(null)
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
    setEditingSocioOriginal(socio)
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
      setTipo(unidad.tipo || 'fijo')
      setSubtipoFijo(unidad.subtipo_fijo || 'puesto_abierto')
      setCodigoTarifador(unidad.codigo_tarifador || '')
      setUltimaLectura(unidad.ultima_lectura || 0)
      setMontoFijoPers(unidad.monto_fijo_personalizado != null ? String(unidad.monto_fijo_personalizado) : '')
      setGuardiaPers(unidad.monto_guardia_personalizado != null ? String(unidad.monto_guardia_personalizado) : '')
      setAguaPers(unidad.monto_agua_personalizado != null ? String(unidad.monto_agua_personalizado) : '')
      setLuzPers(unidad.monto_luz_personalizado != null ? String(unidad.monto_luz_personalizado) : '')
      setDetallePers(unidad.detalle_tarifa_personalizada || '')
    } else {
      setHasUnidad(false)
    }

    setIsModalOpen(true)
    setTimeout(() => nombreInputRef.current?.focus(), 100)
  }

  const handleMontoTotalPersChange = (val) => {
    setMontoFijoPers(val)
    const auto = calcularAutorellenoPersonalizado(val)
    setGuardiaPers(val === '' ? '' : String(auto.montoGuardia))
    setAguaPers(val === '' ? '' : String(auto.montoAgua))
    setLuzPers(val === '' ? '' : String(auto.montoLuzGrupo))
  }

  const handleDesglosePersChange = (field, val) => {
    const nextG = field === 'g' ? val : guardiaPers
    const nextA = field === 'a' ? val : aguaPers
    const nextL = field === 'l' ? val : luzPers
    if (field === 'g') setGuardiaPers(val)
    if (field === 'a') setAguaPers(val)
    if (field === 'l') setLuzPers(val)
    const sum = round2((parseFloat(nextG) || 0) + (parseFloat(nextA) || 0) + (parseFloat(nextL) || 0))
    setMontoFijoPers(String(sum))
  }

  const buildCustomTariffFields = () => {
    const isPers = tipo === 'fijo' && subtipoFijo === 'personalizado'
    return {
      monto_fijo_personalizado: isPers ? round2(parseFloat(montoFijoPers) || 0) : null,
      monto_guardia_personalizado: isPers ? round2(parseFloat(guardiaPers) || 0) : null,
      monto_agua_personalizado: isPers ? round2(parseFloat(aguaPers) || 0) : null,
      monto_luz_personalizado: isPers ? round2(parseFloat(luzPers) || 0) : null,
      detalle_tarifa_personalizada: isPers ? detallePers.trim() || null : null,
    }
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
    if (hasUnidad && tipo === 'fijo' && subtipoFijo === 'personalizado' && (parseFloat(montoFijoPers) || 0) <= 0) {
      setStatusMessage({ type: 'error', text: 'Ingresa el monto total mensual personalizado mayor a 0.' })
      return
    }

    if (isEditing) {
      setConfirmState({
        open: true,
        tipo: 'edicion',
        entity: 'socio',
        target: editingSocioOriginal,
        advertencia: '',
      })
      return
    }

    setSaving(true)
    setStatusMessage(null)

    try {
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
        const customFields = buildCustomTariffFields()
        const { error: unidadError } = await supabase.from('unidades_cobro').insert([
          {
            socio_responsable_id: newSocio.id,
            numero_identificador: numeroIdentificador.trim(),
            tipo,
            subtipo_fijo: tipo === 'fijo' ? subtipoFijo : null,
            cantidad_puestos: 1,
            codigo_tarifador: tipo === 'variable' ? codigoTarifador.trim() || null : null,
            ultima_lectura: parseFloat(ultimaLectura) || 0,
            activo,
            ...customFields,
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
        setTipo('fijo')
        setSubtipoFijo('puesto_abierto')
        setCodigoTarifador('')
        setUltimaLectura(0)
        setMontoFijoPers('')
        setGuardiaPers('')
        setAguaPers('')
        setLuzPers('')
        setDetallePers('')
        setTimeout(() => nombreInputRef.current?.focus(), 150)
      } else {
        setIsModalOpen(false)
        resetForm()
      }
    } catch (err) {
      console.error('Error al guardar socio:', err)
      setStatusMessage({ type: 'error', text: 'Error al guardar: ' + err.message })
    } finally {
      setSaving(false)
    }
  }

  // Verificar dependencias antes de abrir confirmación de eliminación de socio
  const requestDeleteSocio = async (socio) => {
    try {
      const unidadIds = (socio.unidades_cobro || []).map((u) => u.id)
      let cobrosCount = 0
      if (unidadIds.length > 0) {
        const { count } = await supabase
          .from('cobros_servicios')
          .select('*', { count: 'exact', head: true })
          .in('unidad_id', unidadIds)
        cobrosCount = count || 0
      }

      const { count: afCount } = await supabase
        .from('afiliaciones')
        .select('*', { count: 'exact', head: true })
        .eq('socio_id', socio.id)

      if (cobrosCount > 0 || (afCount || 0) > 0) {
        setStatusMessage({
          type: 'error',
          text: `No se puede eliminar a "${socio.nombre}" porque tiene ${cobrosCount} cobro(s) de servicios y ${afCount || 0} plan(es) de afiliación asociados. Desactívalo editándolo o elimina primero esos cobros/planes si fueron un error.`,
        })
        return
      }

      setConfirmState({
        open: true,
        tipo: 'eliminacion',
        entity: 'socio',
        target: socio,
        advertencia:
          (socio.unidades_cobro || []).length > 0
            ? `Se eliminará también su unidad de cobro (${socio.unidades_cobro.map((u) => u.numero_identificador).join(', ')}).`
            : '',
      })
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Error al verificar dependencias del socio: ' + err.message })
    }
  }

  // Verificar dependencias de externo antes de eliminar
  const requestDeleteExterno = async (ext) => {
    try {
      const { count } = await supabase
        .from('cobros_externos')
        .select('*', { count: 'exact', head: true })
        .eq('externo_id', ext.id)

      setConfirmState({
        open: true,
        tipo: 'eliminacion',
        entity: 'externo',
        target: ext,
        advertencia:
          (count || 0) > 0
            ? `¡Atención! Este aportante externo tiene ${count} cobro(s) registrado(s) que también se eliminarán por cascada y afectarán la Caja Servicios.`
            : '',
      })
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Error al verificar cobros del externo: ' + err.message })
    }
  }

  // Externos CRUD
  const openNewExtModal = () => {
    setEditingExtOriginal(null)
    setEditingExtId(null)
    setExtNombre('')
    setExtTelefono('')
    setExtUbicacion('')
    setExtGuardiaBase('40')
    setExtAguaBase('10')
    setExtActivo(true)
    setExtObs('')
    setIsExtModalOpen(true)
  }

  const openEditExtModal = (ext) => {
    setEditingExtOriginal(ext)
    setEditingExtId(ext.id)
    setExtNombre(ext.nombre_completo || '')
    setExtTelefono(ext.telefono || '')
    setExtUbicacion(ext.referencia_ubicacion || '')
    setExtGuardiaBase(String(ext.monto_guardia_base ?? 40))
    setExtAguaBase(String(ext.monto_agua_base ?? 10))
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

    if (editingExtId) {
      setConfirmState({
        open: true,
        tipo: 'edicion',
        entity: 'externo',
        target: editingExtOriginal,
        advertencia: '',
      })
      return
    }

    setSavingExt(true)
    try {
      const gVal = parseFloat(extGuardiaBase) || 0
      const aVal = parseFloat(extAguaBase) || 0
      const payload = {
        nombre_completo: extNombre.trim(),
        telefono: extTelefono.trim() || null,
        referencia_ubicacion: extUbicacion.trim() || null,
        monto_guardia_base: gVal,
        monto_agua_base: aVal,
        monto_mensual_sugerido: gVal + aVal,
        activo: extActivo,
        observaciones: extObs.trim() || null,
      }
      const { data, error } = await supabase.from('aportantes_externos').insert([payload]).select().single()
      if (error) throw error

      await registrarAuditoria({
        usuarioId: user?.id,
        accion: 'ALTA_APORTANTE_EXTERNO',
        detalleJson: {
          descripcion: `Nuevo aportante externo: ${payload.nombre_completo} (${payload.monto_mensual_sugerido} Bs/mes)`,
          tabla: 'aportantes_externos',
          registro_id: data?.id,
          ...payload,
        },
      })
      setStatusMessage({ type: 'success', text: `Aportante externo "${payload.nombre_completo}" registrado.` })
      setIsExtModalOpen(false)
      await fetchAll()
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Error al guardar externo: ' + err.message })
    } finally {
      setSavingExt(false)
    }
  }

  // Ejecutar Edición o Eliminación auditada tras confirmar motivo
  const handleConfirmAudit = async (motivo) => {
    const { tipo: tipoOp, entity, target } = confirmState
    if (!target) return

    setSaving(true)
    setSavingExt(true)
    try {
      if (entity === 'socio' && tipoOp === 'edicion') {
        const nuevoSocio = {
          nombre: nombre.trim(),
          telefono: telefono.trim() || null,
          fecha_pago_especial: fechaPagoEspecial || null,
          activo,
          notas: notas.trim() || null,
        }
        const unidadOrig = target.unidades_cobro?.[0] || null
        const customFields = buildCustomTariffFields()
        const nuevaUnidad = hasUnidad
          ? {
              numero_identificador: numeroIdentificador.trim(),
              tipo,
              subtipo_fijo: tipo === 'fijo' ? subtipoFijo : null,
              cantidad_puestos: unidadOrig?.cantidad_puestos || 1,
              codigo_tarifador: tipo === 'variable' ? codigoTarifador.trim() || null : null,
              ultima_lectura: parseFloat(ultimaLectura) || 0,
              activo,
              ...customFields,
            }
          : null

        await registrarEdicionAuditoria({
          usuarioId: user?.id,
          modulo: 'Socios y Puestos',
          tabla: 'socios',
          registroId: editingSocioId,
          motivo,
          resumen: `Edición de socio "${target.nombre}"`,
          datosAnteriores: {
            nombre: target.nombre,
            telefono: target.telefono,
            fecha_pago_especial: target.fecha_pago_especial,
            activo: target.activo,
            notas: target.notas,
            puesto: unidadOrig
              ? {
                  numero_identificador: unidadOrig.numero_identificador,
                  tipo: unidadOrig.tipo,
                  subtipo_fijo: unidadOrig.subtipo_fijo,
                  cantidad_puestos: unidadOrig.cantidad_puestos,
                  codigo_tarifador: unidadOrig.codigo_tarifador,
                  monto_fijo_personalizado: unidadOrig.monto_fijo_personalizado,
                }
              : null,
          },
          datosNuevos: {
            ...nuevoSocio,
            puesto: nuevaUnidad
              ? {
                  numero_identificador: nuevaUnidad.numero_identificador,
                  tipo: nuevaUnidad.tipo,
                  subtipo_fijo: nuevaUnidad.subtipo_fijo,
                  cantidad_puestos: nuevaUnidad.cantidad_puestos,
                  codigo_tarifador: nuevaUnidad.codigo_tarifador,
                  monto_fijo_personalizado: nuevaUnidad.monto_fijo_personalizado,
                }
              : null,
          },
        })

        const { error: socioError } = await supabase.from('socios').update(nuevoSocio).eq('id', editingSocioId)
        if (socioError) throw socioError

        if (hasUnidad) {
          const unidadData = { socio_responsable_id: editingSocioId, ...nuevaUnidad }
          if (editingUnidadId) {
            const { error: uErr } = await supabase.from('unidades_cobro').update(unidadData).eq('id', editingUnidadId)
            if (uErr) throw uErr
          } else {
            const { error: uErr } = await supabase.from('unidades_cobro').insert([unidadData])
            if (uErr) throw uErr
          }
        }

        setIsModalOpen(false)
        setStatusMessage({ type: 'success', text: `Socio "${nuevoSocio.nombre}" editado y auditado en bitácora.` })
      } else if (entity === 'socio' && tipoOp === 'eliminacion') {
        await registrarEliminacionAuditoria({
          usuarioId: user?.id,
          modulo: 'Socios y Puestos',
          tabla: 'socios',
          registroId: target.id,
          motivo,
          resumen: `Eliminación de socio "${target.nombre}" y sus puestos sin cobros`,
          datosAnteriores: target,
        })

        if ((target.unidades_cobro || []).length > 0) {
          const { error: uDelErr } = await supabase
            .from('unidades_cobro')
            .delete()
            .eq('socio_responsable_id', target.id)
          if (uDelErr) throw uDelErr
        }

        const { error: sDelErr } = await supabase.from('socios').delete().eq('id', target.id)
        if (sDelErr) throw sDelErr

        setStatusMessage({ type: 'success', text: `Socio "${target.nombre}" eliminado y registrado en bitácora.` })
      } else if (entity === 'externo' && tipoOp === 'edicion') {
        const gVal = parseFloat(extGuardiaBase) || 0
        const aVal = parseFloat(extAguaBase) || 0
        const payload = {
          nombre_completo: extNombre.trim(),
          telefono: extTelefono.trim() || null,
          referencia_ubicacion: extUbicacion.trim() || null,
          monto_guardia_base: gVal,
          monto_agua_base: aVal,
          monto_mensual_sugerido: gVal + aVal,
          activo: extActivo,
          observaciones: extObs.trim() || null,
        }

        await registrarEdicionAuditoria({
          usuarioId: user?.id,
          modulo: 'Aportantes Externos',
          tabla: 'aportantes_externos',
          registroId: editingExtId,
          motivo,
          resumen: `Edición de aportante externo "${target.nombre_completo}"`,
          datosAnteriores: {
            nombre_completo: target.nombre_completo,
            telefono: target.telefono,
            referencia_ubicacion: target.referencia_ubicacion,
            monto_guardia_base: target.monto_guardia_base ?? 40,
            monto_agua_base: target.monto_agua_base ?? 10,
            monto_mensual_sugerido: target.monto_mensual_sugerido,
            activo: target.activo,
            observaciones: target.observaciones,
          },
          datosNuevos: payload,
        })

        const { error } = await supabase.from('aportantes_externos').update(payload).eq('id', editingExtId)
        if (error) throw error

        setIsExtModalOpen(false)
        setStatusMessage({ type: 'success', text: `Aportante externo "${payload.nombre_completo}" actualizado y auditado.` })
      } else if (entity === 'externo' && tipoOp === 'eliminacion') {
        await registrarEliminacionAuditoria({
          usuarioId: user?.id,
          modulo: 'Aportantes Externos',
          tabla: 'aportantes_externos',
          registroId: target.id,
          motivo,
          resumen: `Eliminación de aportante externo "${target.nombre_completo}"`,
          datosAnteriores: target,
        })

        const { error } = await supabase.from('aportantes_externos').delete().eq('id', target.id)
        if (error) throw error

        setStatusMessage({ type: 'success', text: `Aportante externo "${target.nombre_completo}" eliminado y auditado.` })
      } else if (entity === 'desagrupar' && tipoOp === 'edicion') {
        const { lider, miembros } = target
        const idsMiembros = (miembros || []).map((m) => m.id)

        await registrarEdicionAuditoria({
          usuarioId: user?.id,
          modulo: 'Grupos de Cobro',
          tabla: 'unidades_cobro',
          registroId: lider.id,
          motivo,
          resumen: `Desagrupación de grupo "${lider.nombre_grupo || lider.numero_identificador}"`,
          datosAnteriores: {
            lider_id: lider.id,
            miembros_ids: idsMiembros,
            cantidad_puestos: lider.cantidad_puestos,
            nombre_grupo: lider.nombre_grupo,
          },
          datosNuevos: {
            lider_id: lider.id,
            miembros_ids: [],
            cantidad_puestos: 1,
            nombre_grupo: null,
          },
        })

        if (idsMiembros.length > 0) {
          const { error: mErr } = await supabase
            .from('unidades_cobro')
            .update({ grupo_padre_id: null, cantidad_puestos: 1, nombre_grupo: null, nombres_titulares: null })
            .in('id', idsMiembros)
          if (mErr) throw mErr
        }

        const { error: lErr } = await supabase
          .from('unidades_cobro')
          .update({ cantidad_puestos: 1, nombre_grupo: null, nombres_titulares: null })
          .eq('id', lider.id)
        if (lErr) throw lErr

        setStatusMessage({ type: 'success', text: 'Grupo desagrupado correctamente y registrado en bitácora.' })
      }

      setConfirmState({ open: false, tipo: 'edicion', entity: null, target: null, advertencia: '' })
      await fetchAll()
    } catch (err) {
      console.error(err)
      setStatusMessage({ type: 'error', text: err.message })
      setConfirmState({ open: false, tipo: 'edicion', entity: null, target: null, advertencia: '' })
    } finally {
      setSaving(false)
      setSavingExt(false)
    }
  }

  const allUnidadesMap = {}
  const hijosPorPadre = {}
  socios.forEach((s) => {
    ;(s.unidades_cobro || []).forEach((u) => {
      const enriched = { ...u, socios: { id: s.id, nombre: s.nombre, telefono: s.telefono } }
      allUnidadesMap[u.id] = enriched
      if (u.grupo_padre_id) {
        if (!hijosPorPadre[u.grupo_padre_id]) hijosPorPadre[u.grupo_padre_id] = []
        hijosPorPadre[u.grupo_padre_id].push(enriched)
      }
    })
  })

  const gruposCobro = Object.values(allUnidadesMap)
    .filter((u) => !u.grupo_padre_id && ((hijosPorPadre[u.id]?.length || 0) > 0 || (u.cantidad_puestos || 1) > 1))
    .map((lider) => {
      const miembros = hijosPorPadre[lider.id] || []
      return {
        lider,
        miembros,
        resumen: formatResumenGrupo(lider, miembros),
      }
    })

  const filteredSocios = socios.filter((s) => {
    const term = searchTerm.toLowerCase()
    const matchesName = s.nombre?.toLowerCase().includes(term)
    const matchesPhone = s.telefono?.toLowerCase().includes(term)
    const matchesUnidad = s.unidades_cobro?.some(
      (u) =>
        u.numero_identificador?.toLowerCase().includes(term) ||
        u.codigo_tarifador?.toLowerCase().includes(term) ||
        u.nombres_titulares?.toLowerCase().includes(term) ||
        u.nombre_grupo?.toLowerCase().includes(term)
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
            Puestos agrupados, externos, traspasos y edición/eliminación auditada en bitácora.
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

          {activeTab === 'grupos' ? (
            isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setEditingGrupo(null)
                  setIsGrupoModalOpen(true)
                }}
                className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm shadow-md transition-all"
              >
                <Layers className="w-4 h-4" />
                <span>+ Crear Grupo</span>
              </button>
            )
          ) : activeTab === 'externos' ? (
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
          <span>Socios ({socios.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('grupos')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'grupos' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Grupos de Cobro ({gruposCobro.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('externos')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'externos' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Externos ({externos.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('traspasos')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'traspasos' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Traspasos ({traspasos.length})</span>
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

      {activeTab === 'grupos' ? (
        <GruposCobroTab
          gruposCobro={gruposCobro}
          isAdmin={isAdmin}
          onCreateGrupo={() => {
            setEditingGrupo(null)
            setIsGrupoModalOpen(true)
          }}
          onEditGrupo={({ lider, miembros }) => {
            setEditingGrupo({ lider, miembros })
            setIsGrupoModalOpen(true)
          }}
          onDesagrupar={({ lider, miembros }) =>
            setConfirmState({
              open: true,
              tipo: 'edicion',
              entity: 'desagrupar',
              target: { lider, miembros },
              advertencia: 'Todos los puestos del grupo volverán a cobrarse de forma individual en los próximos meses.',
            })
          }
        />
      ) : activeTab === 'traspasos' ? (
        <TraspasosTab traspasos={traspasos} />
      ) : activeTab === 'externos' ? (
        <ExternosSociosTab
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filteredExternos={filteredExternos}
          isAdmin={isAdmin}
          openEditExtModal={openEditExtModal}
          requestDeleteExterno={requestDeleteExterno}
          isExtModalOpen={isExtModalOpen}
          setIsExtModalOpen={setIsExtModalOpen}
          editingExtId={editingExtId}
          handleSaveExterno={handleSaveExterno}
          extNombre={extNombre}
          setExtNombre={setExtNombre}
          extTelefono={extTelefono}
          setExtTelefono={setExtTelefono}
          extGuardiaBase={extGuardiaBase}
          setExtGuardiaBase={setExtGuardiaBase}
          extAguaBase={extAguaBase}
          setExtAguaBase={setExtAguaBase}
          extUbicacion={extUbicacion}
          setExtUbicacion={setExtUbicacion}
          extObs={extObs}
          setExtObs={setExtObs}
          extActivo={extActivo}
          setExtActivo={setExtActivo}
          savingExt={savingExt}
        />
      ) : (
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
                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-2.5 text-slate-400 p-1">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 text-xs font-medium">
              <button
                onClick={() => setFilterTipo('todos')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  filterTipo === 'todos' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                Todos ({socios.length})
              </button>
              <button
                onClick={() => setFilterTipo('variable')}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 ${
                  filterTipo === 'variable' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                <Zap className="w-3 h-3 text-amber-400" />
                Con Luz
              </button>
              <button
                onClick={() => setFilterTipo('fijo')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  filterTipo === 'fijo' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                Fijos
              </button>
              <button
                onClick={() => setFilterTipo('especial')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  filterTipo === 'especial' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600'
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
                const hijos = unidad ? hijosPorPadre[unidad.id] || [] : []
                const esLiderGrupo = Boolean(unidad && !unidad.grupo_padre_id && (hijos.length > 0 || (unidad.cantidad_puestos || 1) > 1))
                const esMiembroGrupo = Boolean(unidad?.grupo_padre_id)
                const unidadLiderObj = esMiembroGrupo ? allUnidadesMap[unidad.grupo_padre_id] : null
                const resumenGrupo = esLiderGrupo ? formatResumenGrupo(unidad, hijos) : null
                const menuOpen = openMenuSocioId === socio.id

                return (
                  <div
                    key={socio.id}
                    className={`bg-white rounded-2xl p-4 border transition-all hover:shadow-md flex flex-col justify-between relative ${
                      socio.activo ? 'border-slate-200 hover:border-emerald-300' : 'border-slate-200 bg-slate-50/70 opacity-75'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-extrabold text-base sm:text-lg text-slate-900 leading-tight break-words">
                            {socio.nombre}
                          </h4>
                          {socio.telefono && (
                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{socio.telefono}</span>
                            </p>
                          )}
                        </div>
                        {isAdmin && (
                          <div className="relative flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => openEditModal(socio)}
                              title="Editar socio y unidad"
                              className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setOpenMenuSocioId(menuOpen ? null : socio.id)}
                              title="Más acciones"
                              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {menuOpen && (
                              <div className="absolute right-0 top-9 z-30 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 text-xs">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuSocioId(null)
                                    openEditModal(socio)
                                  }}
                                  className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-semibold"
                                >
                                  <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                                  <span>Editar Socio / Puesto</span>
                                </button>
                                {unidad && unidad.activo !== false && !unidad.grupo_padre_id && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuSocioId(null)
                                      setTraspasoTarget({ socio, unidad })
                                    }}
                                    className="w-full px-3.5 py-2 text-left text-indigo-700 hover:bg-indigo-50 flex items-center gap-2 font-semibold"
                                  >
                                    <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-600" />
                                    <span>Transferir / Vender Puesto</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuSocioId(null)
                                    requestDeleteSocio(socio)
                                  }}
                                  className="w-full px-3.5 py-2 text-left text-red-600 hover:bg-red-50 flex items-center gap-2 font-semibold"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-red-600" />
                                  <span>Eliminar Socio</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="mt-3 space-y-2 text-xs">
                        {unidadesSocio.length > 0 ? (
                          unidadesSocio.map((u) => (
                            <div key={u.id} className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 text-white text-xs sm:text-sm font-black tracking-wide">
                                  <Store className="w-3.5 h-3.5 text-emerald-400" />
                                  {u.numero_identificador}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                    u.tipo === 'variable'
                                      ? 'bg-amber-100 text-amber-800'
                                      : u.subtipo_fijo === 'personalizado'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-blue-100 text-blue-800'
                                  }`}
                                >
                                  {u.tipo === 'variable'
                                    ? 'Luz Variable'
                                    : u.subtipo_fijo === 'personalizado'
                                    ? `Pers. ${parseFloat(u.monto_fijo_personalizado || 0).toFixed(2)} Bs`
                                    : u.subtipo_fijo?.replace('_', ' ') || 'Fijo'}
                                </span>
                              </div>

                              {esLiderGrupo && resumenGrupo && (
                                <div className="p-2 rounded-lg bg-purple-50 text-purple-900 border border-purple-200 text-[11px] space-y-0.5">
                                  <div className="font-bold flex items-center gap-1">
                                    <Layers className="w-3 h-3 text-purple-600" />
                                    <span>
                                      {resumenGrupo.puestosLabel}
                                      {u.nombre_grupo ? ` • ${u.nombre_grupo}` : ''}
                                    </span>
                                  </div>
                                  <p className="text-purple-700 truncate">{resumenGrupo.sociosLabel}</p>
                                </div>
                              )}

                              {esMiembroGrupo && (
                                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-900 border border-indigo-200 text-[11px] flex items-center gap-1.5 font-semibold">
                                  <Layers className="w-3 h-3 text-indigo-600 shrink-0" />
                                  <span className="truncate">
                                    Agrupado con: {unidadLiderObj?.socios?.nombre || 'Titular'} ({unidadLiderObj?.numero_identificador || ''})
                                  </span>
                                </div>
                              )}

                              {u.detalle_tarifa_personalizada && u.subtipo_fijo === 'personalizado' && (
                                <p className="text-[11px] text-emerald-800 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                                  {u.detalle_tarifa_personalizada}
                                </p>
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
                        {esLiderGrupo
                          ? `${resumenGrupo?.miembrosCount || unidad.cantidad_puestos} puestos`
                          : esMiembroGrupo
                          ? 'En grupo'
                          : isVariable
                          ? 'Variable'
                          : 'Fijo'}
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg max-h-[88dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200 animate-fadeIn">
            <div className="shrink-0 bg-slate-900 px-5 py-3.5 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg shrink-0">
                  {isEditing ? <Edit2 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm sm:text-base leading-tight truncate">
                    {isEditing ? 'Editar Socio y Unidad (Auditado)' : 'Carga Rápida de Socio'}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-400 truncate">Padrón oficial del mercado</p>
                </div>
              </div>
              <button type="button" onClick={() => setIsModalOpen(false)} className="p-1.5 rounded-lg text-slate-300 hover:text-white shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
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
                          <option value="fijo">Fijo (Sin tarifador)</option>
                          <option value="variable">Variable (Base 58 Bs + Luz)</option>
                        </select>
                      </div>
                    </div>

                    {tipo === 'fijo' ? (
                      <div className="space-y-3">
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
                            <option value="personalizado">Personalizado (Monto manual)</option>
                          </select>
                        </div>

                        {subtipoFijo === 'personalizado' && (
                          <div className="bg-white p-3 rounded-xl border border-blue-200 space-y-2.5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[11px] font-bold text-blue-900 mb-1">
                                  Monto Total Mensual (Bs) <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  step="0.01"
                                  min="0.01"
                                  required
                                  value={montoFijoPers}
                                  onChange={(e) => handleMontoTotalPersChange(e.target.value)}
                                  placeholder="Ej. 60.00"
                                  className="w-full px-3 py-2 text-sm bg-blue-50/50 border border-blue-300 rounded-xl font-bold"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                  Motivo / Detalle Tarifa Especial
                                </label>
                                <input
                                  type="text"
                                  value={detallePers}
                                  onChange={(e) => setDetallePers(e.target.value)}
                                  placeholder="Ej. Puesto medio / acuerdo"
                                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                                />
                              </div>
                            </div>

                            <div className="pt-1 border-t border-slate-100">
                              <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1.5">
                                Desglose Interno Automático (Guardia / Agua / Grupo Luz)
                              </span>
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Guardia (Bs)</label>
                                  <input
                                    type="number"
                                    inputMode="decimal"
                                    step="0.01"
                                    min="0"
                                    value={guardiaPers}
                                    onChange={(e) => handleDesglosePersChange('g', e.target.value)}
                                    className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-bold"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Agua (Bs)</label>
                                  <input
                                    type="number"
                                    inputMode="decimal"
                                    step="0.01"
                                    min="0"
                                    value={aguaPers}
                                    onChange={(e) => handleDesglosePersChange('a', e.target.value)}
                                    className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-bold"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Grupo Luz (Bs)</label>
                                  <input
                                    type="number"
                                    inputMode="decimal"
                                    step="0.01"
                                    min="0"
                                    value={luzPers}
                                    onChange={(e) => handleDesglosePersChange('l', e.target.value)}
                                    className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-bold"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
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
                            inputMode="decimal"
                            step="0.01"
                            value={ultimaLectura}
                            onChange={(e) => setUltimaLectura(e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-mono"
                          />
                        </div>
                      </div>
                    )}

                    {isEditing && editingUnidadId && isAdmin && !editingSocioOriginal?.unidades_cobro?.[0]?.grupo_padre_id && (
                      <div className="pt-2 border-t border-slate-200 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            const uTarget = editingSocioOriginal?.unidades_cobro?.[0]
                            if (uTarget) {
                              setIsModalOpen(false)
                              setTraspasoTarget({ socio: editingSocioOriginal, unidad: uTarget })
                            }
                          }}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold inline-flex items-center gap-1.5"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                          <span>Transferir / Vender Puesto</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex flex-wrap items-center justify-end gap-2">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-3 py-2 text-xs font-semibold text-slate-600">
                Cancelar
              </button>
              {!isEditing && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSave(true)}
                  className="px-3 py-2 bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>{saving ? 'Guardando...' : 'Guardar y otro'}</span>
                </button>
              )}
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSave(false)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{saving ? 'Guardando...' : isEditing ? 'Actualizar Socio' : 'Guardar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <GrupoCobroModal
        isOpen={isGrupoModalOpen}
        onClose={() => {
          setIsGrupoModalOpen(false)
          setEditingGrupo(null)
        }}
        socios={socios}
        editingGroup={editingGrupo}
        onSaved={(nombreGrupoGuardado) => {
          setStatusMessage({
            type: 'success',
            text: `¡Grupo "${nombreGrupoGuardado}" guardado correctamente! Se cobrará en una sola boleta mensual.`,
          })
          fetchAll()
        }}
      />

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

      <ConfirmMotivoModal
        isOpen={confirmState.open}
        onClose={() => setConfirmState({ open: false, tipo: 'edicion', entity: null, target: null, advertencia: '' })}
        onConfirm={handleConfirmAudit}
        tipo={confirmState.tipo}
        titulo={
          confirmState.entity === 'desagrupar'
            ? 'Desagrupar Puestos del Grupo'
            : confirmState.entity === 'socio'
            ? confirmState.tipo === 'eliminacion'
              ? 'Eliminar Socio y Puesto'
              : 'Editar Datos de Socio y Puesto'
            : confirmState.tipo === 'eliminacion'
            ? 'Eliminar Aportante Externo'
            : 'Editar Aportante Externo'
        }
        descripcion={
          confirmState.target
            ? `${confirmState.tipo === 'eliminacion' ? 'Se eliminará' : 'Se actualizará'} a "${
                confirmState.target.lider?.nombre_grupo ||
                confirmState.target.lider?.numero_identificador ||
                confirmState.target.nombre ||
                confirmState.target.nombre_completo
              }" registrando el snapshot completo en bitacora_auditoria.`
            : ''
        }
        advertencia={confirmState.advertencia}
        loading={saving || savingExt}
      />
    </div>
  )
}
