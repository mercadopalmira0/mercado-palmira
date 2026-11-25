import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { registrarAuditoria, registrarEdicionAuditoria, registrarEliminacionAuditoria } from '../../lib/auditoria'
import { MESES, getLocalDateStr } from '../../lib/formatters'
import FotoUploaderModal from '../modals/FotoUploaderModal'
import ConfirmMotivoModal from '../modals/ConfirmMotivoModal'
import {
  ArrowDownCircle,
  Coins,
  QrCode,
  CheckCircle2,
  X,
  Camera,
  ExternalLink,
  RefreshCw,
  PlusCircle,
  Search,
  Shield,
  Save,
  Edit2,
  Trash2,
  Zap,
  Droplets,
  Calendar,
  ArrowRight
} from 'lucide-react'

const SUGERENCIAS_SERVICIOS = [
  'Factura Luz General',
  'Factura de Agua',
  'Sueldo Guardia',
  'Tasa de Aseo y Basura',
  'Alumbrado / Pasillos',
  'Papelería / Talonarios',
  'Viáticos / Pasajes',
  'Imprevistos',
]

const SUGERENCIAS_AFILIACIONES = [
  'Mantenimiento',
  'Limpieza',
  'Viáticos / Salidas',
  'Imprevistos',
  'Papelería',
  'Compra Insumos / Veneno',
  'Apoyo Reunión Directiva',
  'Mejoras de Infraestructura',
]

const TIPOS_GUARDIA = [
  { value: 'adelanto_quincena', label: 'Adelanto Quincena (día 15)' },
  { value: 'adelanto_emergencia', label: 'Adelanto Emergencia' },
  { value: 'saldo_fin_mes', label: 'Saldo Fin de Mes' },
]

export default function EgresosView() {
  const { user, isAdmin } = useAuth()
  const today = new Date()

  const [activeTab, setActiveTab] = useState('egresos')
  const [egresos, setEgresos] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterCaja, setFilterCaja] = useState('todos')
  const [filterMetodo, setFilterMetodo] = useState('todos')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusMessage, setStatusMessage] = useState(null)

  // Modal Egreso General (Crear / Editar)
  const [isNewModalOpen, setIsNewModalOpen] = useState(false)
  const [editingEgreso, setEditingEgreso] = useState(null)
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false)
  const [anulandoEgresoId, setAnulandoEgresoId] = useState(null)
  const [motivoAnulacion, setMotivoAnulacion] = useState('')

  const [caja, setCaja] = useState('servicios')
  const [categoria, setCategoria] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [monto, setMonto] = useState('')
  const [metodoPago, setMetodoPago] = useState('efectivo')
  const [fecha, setFecha] = useState(getLocalDateStr())
  const [reciboDriveUrl, setReciboDriveUrl] = useState('')
  const [saving, setSaving] = useState(false)

  // Control mensual (Gastos Fijos: Luz, Agua, Sueldo Guardia)
  const [guardiaMes, setGuardiaMes] = useState(today.getMonth() + 1)
  const [guardiaAnio, setGuardiaAnio] = useState(today.getFullYear())
  const [periodoFijo, setPeriodoFijo] = useState(null)
  const [loadingFijos, setLoadingFijos] = useState(false)

  // Modal Pago Factura Luz
  const [isPagoLuzOpen, setIsPagoLuzOpen] = useState(false)
  const [fechaPagoLuz, setFechaPagoLuz] = useState(getLocalDateStr())
  const [metodoPagoLuz, setMetodoPagoLuz] = useState('efectivo')
  const [fotoPagoLuz, setFotoPagoLuz] = useState('')
  const [isPhotoLuzOpen, setIsPhotoLuzOpen] = useState(false)
  const [savingLuzPago, setSavingLuzPago] = useState(false)

  // Modal Cargar / Editar Factura de Luz
  const [isCargaLuzOpen, setIsCargaLuzOpen] = useState(false)
  const [luzEnergiaInput, setLuzEnergiaInput] = useState('')
  const [luzAlumbradoInput, setLuzAlumbradoInput] = useState('')
  const [luzBasuraInput, setLuzBasuraInput] = useState('')
  const [luzKwhInput, setLuzKwhInput] = useState('')
  const [fotoFacturaLuzInput, setFotoFacturaLuzInput] = useState('')
  const [isPhotoFacturaLuzOpen, setIsPhotoFacturaLuzOpen] = useState(false)
  const [savingCargaLuz, setSavingCargaLuz] = useState(false)

  // Modal Cargar / Editar Factura de Agua (Pendiente de pago)
  const [isCargaAguaOpen, setIsCargaAguaOpen] = useState(false)
  const [aguaPotableInput, setAguaPotableInput] = useState('')
  const [aguaAlcantarilladoInput, setAguaAlcantarilladoInput] = useState('')
  const [aguaAporteSocioInput, setAguaAporteSocioInput] = useState('')
  const [fotoFacturaAguaInput, setFotoFacturaAguaInput] = useState('')
  const [isPhotoFacturaAguaOpen, setIsPhotoFacturaAguaOpen] = useState(false)
  const [savingCargaAgua, setSavingCargaAgua] = useState(false)

  // Modal Registrar Pago Factura de Agua
  const [isPagoAguaOpen, setIsPagoAguaOpen] = useState(false)
  const [fechaPagoAgua, setFechaPagoAgua] = useState(getLocalDateStr())
  const [metodoPagoAgua, setMetodoPagoAgua] = useState('efectivo')
  const [fotoPagoAgua, setFotoPagoAgua] = useState('')
  const [isPhotoPagoAguaOpen, setIsPhotoPagoAguaOpen] = useState(false)
  const [savingPagoAgua, setSavingPagoAgua] = useState(false)

  // Sueldo y Adelantos del Guardia
  const [tarifaId, setTarifaId] = useState(null)
  const [sueldoMensual, setSueldoMensual] = useState(0)
  const [sueldoOriginal, setSueldoOriginal] = useState(0)
  const [savingSueldo, setSavingSueldo] = useState(false)
  const [pagosGuardia, setPagosGuardia] = useState([])
  const [loadingGuardia, setLoadingGuardia] = useState(false)

  // Modal Adelanto / Pago Guardia (Crear / Editar)
  const [isGuardiaModalOpen, setIsGuardiaModalOpen] = useState(false)
  const [editingGuardia, setEditingGuardia] = useState(null)
  const [gTipo, setGTipo] = useState('adelanto_quincena')
  const [gMonto, setGMonto] = useState('')
  const [gFecha, setGFecha] = useState(getLocalDateStr())
  const [gMetodo, setGMetodo] = useState('efectivo')
  const [gObs, setGObs] = useState('')
  const [gFotoUrl, setGFotoUrl] = useState('')
  const [isGuardiaPhotoOpen, setIsGuardiaPhotoOpen] = useState(false)
  const [savingGuardia, setSavingGuardia] = useState(false)

  const [anulandoGuardiaId, setAnulandoGuardiaId] = useState(null)
  const [motivoAnulGuardia, setMotivoAnulGuardia] = useState('')

  // Confirmación auditada
  const [confirmState, setConfirmState] = useState({
    open: false,
    tipo: 'edicion',
    entity: null, // 'egreso' | 'guardia' | 'sueldo'
    target: null,
    advertencia: '',
  })

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

  const fetchGuardiaData = async () => {
    setLoadingGuardia(true)
    setLoadingFijos(true)
    try {
      const [{ data: tData }, { data: pgData, error: pgErr }, { data: pData, error: pErr }] = await Promise.all([
        supabase.from('configuracion_tarifas').select('id, sueldo_guardia_mensual').limit(1).maybeSingle(),
        supabase
          .from('pagos_guardia')
          .select('*')
          .eq('mes', guardiaMes)
          .eq('anio', guardiaAnio)
          .order('fecha_pago', { ascending: false })
          .order('created_at', { ascending: false }),
        supabase
          .from('periodos_mensuales')
          .select('*')
          .eq('mes', guardiaMes)
          .eq('anio', guardiaAnio)
          .maybeSingle(),
      ])

      if (tData) {
        setTarifaId(tData.id)
        const s = parseFloat(tData.sueldo_guardia_mensual) || 0
        setSueldoMensual(s)
        setSueldoOriginal(s)
      }
      if (pgErr) throw pgErr
      if (pErr) throw pErr
      setPagosGuardia(pgData || [])
      setPeriodoFijo(pData || null)
    } catch (err) {
      console.error(err)
      setStatusMessage({ type: 'error', text: 'Error al cargar control mensual: ' + err.message })
    } finally {
      setLoadingGuardia(false)
      setLoadingFijos(false)
    }
  }

  useEffect(() => {
    fetchEgresos()
  }, [])

  useEffect(() => {
    fetchGuardiaData()
  }, [guardiaMes, guardiaAnio])

  const handleCajaChange = (newCaja) => {
    setCaja(newCaja)
  }

  const openNewEgresoModal = () => {
    setEditingEgreso(null)
    setCaja('servicios')
    setCategoria('')
    setDescripcion('')
    setMonto('')
    setMetodoPago('efectivo')
    setFecha(getLocalDateStr())
    setReciboDriveUrl('')
    setIsNewModalOpen(true)
  }

  const openEditEgresoModal = (eg) => {
    setEditingEgreso(eg)
    setCaja(eg.caja || 'servicios')
    setCategoria(eg.categoria || '')
    setDescripcion(eg.descripcion || '')
    setMonto(String(eg.monto ?? ''))
    setMetodoPago(eg.metodo_pago || 'efectivo')
    setFecha(eg.fecha || getLocalDateStr())
    setReciboDriveUrl(eg.recibo_drive_url || '')
    setIsNewModalOpen(true)
  }

  const handleSaveEgreso = async (e) => {
    e.preventDefault()
    const montoNum = parseFloat(monto)
    if (!categoria.trim()) {
      setStatusMessage({ type: 'error', text: 'Ingresa o selecciona una categoría / concepto.' })
      return
    }
    if (!montoNum || montoNum <= 0) {
      setStatusMessage({ type: 'error', text: 'Ingresa un monto válido mayor a 0.' })
      return
    }
    if (!descripcion.trim()) {
      setStatusMessage({ type: 'error', text: 'Ingresa una descripción del gasto.' })
      return
    }

    if (editingEgreso) {
      setConfirmState({ open: true, tipo: 'edicion', entity: 'egreso', target: editingEgreso, advertencia: '' })
      return
    }

    setSaving(true)
    try {
      const catClean = categoria.trim()
      const { data, error } = await supabase
        .from('egresos')
        .insert([
          {
            caja,
            categoria: catClean,
            descripcion: descripcion.trim(),
            monto: montoNum,
            metodo_pago: metodoPago,
            fecha,
            recibo_drive_url: reciboDriveUrl || null,
            estado: 'activo',
          },
        ])
        .select()
        .single()

      if (error) throw error

      await registrarAuditoria({
        usuarioId: user?.id,
        accion: 'REGISTRO_EGRESO',
        detalleJson: {
          descripcion: `Egreso ${montoNum.toFixed(2)} Bs en Caja ${caja} (${catClean}): ${descripcion.trim()}`,
          tabla: 'egresos',
          registro_id: data?.id,
          caja,
          categoria: catClean,
          monto: montoNum,
          metodo_pago: metodoPago,
          fecha,
        },
      })

      setStatusMessage({
        type: 'success',
        text: `¡Egreso de ${montoNum.toFixed(2)} Bs registrado en Caja ${caja === 'servicios' ? 'Servicios' : 'Afiliaciones'}!`,
      })
      setIsNewModalOpen(false)
      await fetchEgresos()
    } catch (err) {
      console.error(err)
      setStatusMessage({ type: 'error', text: 'Error al registrar egreso: ' + err.message })
    } finally {
      setSaving(false)
    }
  }

  const handleAnularEgreso = async (egresoId) => {
    if (!motivoAnulacion.trim()) {
      setStatusMessage({ type: 'error', text: 'El motivo de anulación es obligatorio.' })
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

      await registrarAuditoria({
        usuarioId: user?.id,
        accion: 'ANULACION_EGRESO',
        detalleJson: {
          descripcion: `Anulación de egreso ${egresoId}`,
          tabla: 'egresos',
          registro_id: egresoId,
          motivo: motivoAnulacion.trim(),
        },
      })

      setStatusMessage({ type: 'success', text: 'Egreso anulado correctamente.' })
      setAnulandoEgresoId(null)
      setMotivoAnulacion('')
      await fetchEgresos()
    } catch (err) {
      console.error(err)
      setStatusMessage({ type: 'error', text: 'Error al anular egreso: ' + err.message })
    }
  }

  const openEditGuardiaModal = (pg) => {
    setEditingGuardia(pg)
    setGTipo(pg.tipo || 'adelanto_quincena')
    setGMonto(String(pg.monto ?? ''))
    setGFecha(pg.fecha_pago || getLocalDateStr())
    setGMetodo(pg.metodo_pago || 'efectivo')
    setGObs(pg.observaciones || '')
    setGFotoUrl(pg.foto_vale_url || '')
    setIsGuardiaModalOpen(true)
  }

  const handleSavePagoGuardia = async (e) => {
    e.preventDefault()
    const montoNum = parseFloat(gMonto)
    if (!montoNum || montoNum <= 0) {
      setStatusMessage({ type: 'error', text: 'Ingresa un monto válido mayor a 0.' })
      return
    }

    if (editingGuardia) {
      setConfirmState({
        open: true,
        tipo: 'edicion',
        entity: 'guardia',
        target: editingGuardia,
        advertencia: editingGuardia.egreso_id ? 'También se actualizará el egreso vinculado en Caja Servicios.' : '',
      })
      return
    }

    setSavingGuardia(true)
    try {
      const tipoLabel = TIPOS_GUARDIA.find((t) => t.value === gTipo)?.label || gTipo
      const descEgreso = `${tipoLabel} - ${MESES[guardiaMes]} ${guardiaAnio}${gObs.trim() ? ` (${gObs.trim()})` : ''}`

      const { data: egresoCreado, error: egErr } = await supabase
        .from('egresos')
        .insert([
          {
            caja: 'servicios',
            categoria: 'Sueldo Guardia',
            descripcion: descEgreso,
            monto: montoNum,
            metodo_pago: gMetodo,
            fecha: gFecha,
            recibo_drive_url: gFotoUrl || null,
            estado: 'activo',
          },
        ])
        .select()
        .single()

      if (egErr) throw egErr

      const { error: pgErr } = await supabase.from('pagos_guardia').insert([
        {
          anio: guardiaAnio,
          mes: guardiaMes,
          tipo: gTipo,
          monto: montoNum,
          metodo_pago: gMetodo,
          fecha_pago: gFecha,
          foto_vale_url: gFotoUrl || null,
          observaciones: gObs.trim() || null,
          egreso_id: egresoCreado.id,
          anulado: false,
        },
      ])

      if (pgErr) throw pgErr

      await registrarAuditoria({
        usuarioId: user?.id,
        accion: 'PAGO_SUELDO_GUARDIA',
        detalleJson: {
          descripcion: `${descEgreso} por ${montoNum.toFixed(2)} Bs (${gMetodo})`,
          tabla: 'pagos_guardia',
          egreso_id: egresoCreado.id,
          monto: montoNum,
          tipo: gTipo,
          fecha_pago: gFecha,
        },
      })

      setStatusMessage({
        type: 'success',
        text: `¡${tipoLabel} de ${montoNum.toFixed(2)} Bs registrado y descontado de Caja Servicios!`,
      })
      setIsGuardiaModalOpen(false)
      await Promise.all([fetchGuardiaData(), fetchEgresos()])
    } catch (err) {
      console.error(err)
      setStatusMessage({ type: 'error', text: 'Error al registrar pago al guardia: ' + err.message })
    } finally {
      setSavingGuardia(false)
    }
  }

  const handleAnularPagoGuardia = async (pago) => {
    if (!motivoAnulGuardia.trim()) {
      setStatusMessage({ type: 'error', text: 'El motivo de anulación es obligatorio.' })
      return
    }

    try {
      const { error: pgErr } = await supabase
        .from('pagos_guardia')
        .update({
          anulado: true,
          motivo_anulacion: motivoAnulGuardia.trim(),
        })
        .eq('id', pago.id)
      if (pgErr) throw pgErr

      if (pago.egreso_id) {
        const { error: egErr } = await supabase
          .from('egresos')
          .update({
            estado: 'anulado',
            motivo_anulacion: `Anulación pago guardia: ${motivoAnulGuardia.trim()}`,
          })
          .eq('id', pago.egreso_id)
        if (egErr) throw egErr
      }

      await registrarAuditoria({
        usuarioId: user?.id,
        accion: 'ANULACION_PAGO_GUARDIA',
        detalleJson: {
          descripcion: `Anulación de pago al guardia (${pago.monto} Bs, ${MESES[pago.mes]} ${pago.anio})`,
          tabla: 'pagos_guardia',
          registro_id: pago.id,
          egreso_id: pago.egreso_id,
          motivo: motivoAnulGuardia.trim(),
        },
      })

      setStatusMessage({
        type: 'success',
        text: 'Pago al guardia y su egreso vinculado anulados correctamente.',
      })
      setAnulandoGuardiaId(null)
      setMotivoAnulGuardia('')
      await Promise.all([fetchGuardiaData(), fetchEgresos()])
    } catch (err) {
      console.error(err)
      setStatusMessage({ type: 'error', text: 'Error al anular pago del guardia: ' + err.message })
    }
  }

  const handleConfirmAudit = async (motivo) => {
    const { tipo, entity, target } = confirmState
    if (!target && entity !== 'sueldo') return

    setSaving(true)
    setSavingGuardia(true)
    setSavingSueldo(true)
    setSavingCargaLuz(true)

    try {
      if (entity === 'luz' && tipo === 'edicion') {
        const luzFields = {
          factura_energia_bs: luzEnergiaNum,
          factura_alumbrado_bs: luzAlumbradoNum,
          factura_basura_bs: luzBasuraNum,
          factura_luz_bs: totalFacturaLuzModal,
          factura_luz_kwh: luzKwhNum,
          precio_kwh_calculado: parseFloat(precioKwhModal) || 0,
          factura_luz_drive_url: fotoFacturaLuzInput || null,
        }

        await registrarEdicionAuditoria({
          usuarioId: user?.id,
          modulo: 'Gastos Fijos — Factura de Luz',
          tabla: 'periodos_mensuales',
          registroId: target.id,
          motivo,
          resumen: `Edición de Factura de Luz ${MESES[guardiaMes]} ${guardiaAnio}`,
          datosAnteriores: {
            factura_energia_bs: target.factura_energia_bs,
            factura_alumbrado_bs: target.factura_alumbrado_bs,
            factura_basura_bs: target.factura_basura_bs,
            factura_luz_bs: target.factura_luz_bs,
            factura_luz_kwh: target.factura_luz_kwh,
            precio_kwh_calculado: target.precio_kwh_calculado,
            factura_luz_drive_url: target.factura_luz_drive_url,
          },
          datosNuevos: luzFields,
        })

        const { error } = await supabase
          .from('periodos_mensuales')
          .update(luzFields)
          .eq('id', target.id)
        if (error) throw error

        setIsCargaLuzOpen(false)
        setStatusMessage({
          type: 'success',
          text: `Factura de luz de ${MESES[guardiaMes]} ${guardiaAnio} actualizada (${totalFacturaLuzModal.toFixed(2)} Bs) y auditada.`,
        })
      } else if (entity === 'egreso' && tipo === 'edicion') {
        const montoNum = parseFloat(monto)
        const catClean = categoria.trim()
        const datosNuevos = {
          caja,
          categoria: catClean,
          descripcion: descripcion.trim(),
          monto: montoNum,
          metodo_pago: metodoPago,
          fecha,
          recibo_drive_url: reciboDriveUrl || null,
        }

        await registrarEdicionAuditoria({
          usuarioId: user?.id,
          modulo: 'Egresos Generales',
          tabla: 'egresos',
          registroId: target.id,
          motivo,
          resumen: `Edición de egreso "${target.descripcion}"`,
          datosAnteriores: {
            caja: target.caja,
            categoria: target.categoria,
            descripcion: target.descripcion,
            monto: target.monto,
            metodo_pago: target.metodo_pago,
            fecha: target.fecha,
            recibo_drive_url: target.recibo_drive_url,
          },
          datosNuevos,
        })

        const { error } = await supabase.from('egresos').update(datosNuevos).eq('id', target.id)
        if (error) throw error

        setIsNewModalOpen(false)
        setEditingEgreso(null)
        setStatusMessage({ type: 'success', text: 'Egreso editado y auditado en bitácora.' })
      } else if (entity === 'egreso' && tipo === 'eliminacion') {
        await registrarEliminacionAuditoria({
          usuarioId: user?.id,
          modulo: 'Egresos Generales',
          tabla: 'egresos',
          registroId: target.id,
          motivo,
          resumen: `Eliminación de egreso "${target.descripcion}" (${target.monto} Bs)`,
          datosAnteriores: target,
        })

        const { error } = await supabase.from('egresos').delete().eq('id', target.id)
        if (error) throw error

        setStatusMessage({ type: 'success', text: 'Egreso eliminado y auditado en bitácora.' })
      } else if (entity === 'guardia' && tipo === 'edicion') {
        const montoNum = parseFloat(gMonto)
        const tipoLabel = TIPOS_GUARDIA.find((t) => t.value === gTipo)?.label || gTipo
        const descEgreso = `${tipoLabel} - ${MESES[guardiaMes]} ${guardiaAnio}${gObs.trim() ? ` (${gObs.trim()})` : ''}`
        const datosNuevos = {
          tipo: gTipo,
          monto: montoNum,
          metodo_pago: gMetodo,
          fecha_pago: gFecha,
          foto_vale_url: gFotoUrl || null,
          observaciones: gObs.trim() || null,
        }

        await registrarEdicionAuditoria({
          usuarioId: user?.id,
          modulo: 'Sueldo Guardia',
          tabla: 'pagos_guardia',
          registroId: target.id,
          motivo,
          resumen: `Edición de pago guardia (${MESES[guardiaMes]} ${guardiaAnio})`,
          datosAnteriores: {
            tipo: target.tipo,
            monto: target.monto,
            metodo_pago: target.metodo_pago,
            fecha_pago: target.fecha_pago,
            foto_vale_url: target.foto_vale_url,
            observaciones: target.observaciones,
          },
          datosNuevos,
        })

        const { error: pgErr } = await supabase.from('pagos_guardia').update(datosNuevos).eq('id', target.id)
        if (pgErr) throw pgErr

        if (target.egreso_id) {
          await supabase
            .from('egresos')
            .update({
              descripcion: descEgreso,
              monto: montoNum,
              metodo_pago: gMetodo,
              fecha: gFecha,
              recibo_drive_url: gFotoUrl || null,
            })
            .eq('id', target.egreso_id)
        }

        setIsGuardiaModalOpen(false)
        setEditingGuardia(null)
        setStatusMessage({ type: 'success', text: 'Pago del guardia y egreso vinculado editados con auditoría.' })
      } else if (entity === 'guardia' && tipo === 'eliminacion') {
        await registrarEliminacionAuditoria({
          usuarioId: user?.id,
          modulo: 'Sueldo Guardia',
          tabla: 'pagos_guardia',
          registroId: target.id,
          motivo,
          resumen: `Eliminación de pago guardia (${target.monto} Bs, ${MESES[target.mes]} ${target.anio})`,
          datosAnteriores: target,
        })

        const { error: pgErr } = await supabase.from('pagos_guardia').delete().eq('id', target.id)
        if (pgErr) throw pgErr

        if (target.egreso_id) {
          await supabase.from('egresos').delete().eq('id', target.egreso_id)
        }

        setStatusMessage({ type: 'success', text: 'Pago del guardia y su egreso vinculado eliminados con auditoría.' })
      } else if (entity === 'sueldo' && tipo === 'edicion') {
        const nuevoSueldo = parseFloat(sueldoMensual) || 0
        await registrarEdicionAuditoria({
          usuarioId: user?.id,
          modulo: 'Sueldo Mensual Guardia',
          tabla: 'configuracion_tarifas',
          registroId: tarifaId,
          motivo,
          resumen: `Cambio de sueldo mensual del guardia (${sueldoOriginal} Bs ➔ ${nuevoSueldo} Bs)`,
          datosAnteriores: { sueldo_guardia_mensual: sueldoOriginal },
          datosNuevos: { sueldo_guardia_mensual: nuevoSueldo },
        })

        const { error } = await supabase
          .from('configuracion_tarifas')
          .update({ sueldo_guardia_mensual: nuevoSueldo })
          .eq('id', tarifaId)
        if (error) throw error

        setSueldoOriginal(nuevoSueldo)
        setStatusMessage({ type: 'success', text: `Sueldo mensual guardado (${nuevoSueldo.toFixed(2)} Bs) con auditoría.` })
      }

      setConfirmState({ open: false, tipo: 'edicion', entity: null, target: null, advertencia: '' })
      await Promise.all([fetchEgresos(), fetchGuardiaData()])
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message })
      setConfirmState({ open: false, tipo: 'edicion', entity: null, target: null, advertencia: '' })
    } finally {
      setSaving(false)
      setSavingGuardia(false)
      setSavingSueldo(false)
      setSavingCargaLuz(false)
    }
  }

  const filteredEgresos = egresos.filter((eg) => {
    const term = searchTerm.toLowerCase()
    const matchesSearch = !term || eg.descripcion?.toLowerCase().includes(term) || eg.categoria?.toLowerCase().includes(term)
    if (!matchesSearch) return false
    if (filterCaja !== 'todos' && eg.caja !== filterCaja) return false
    if (filterMetodo !== 'todos' && eg.metodo_pago !== filterMetodo) return false
    return true
  })

  const totalServicios = egresos
    .filter((e) => e.caja === 'servicios' && e.estado === 'activo')
    .reduce((s, e) => s + (parseFloat(e.monto) || 0), 0)

  const totalAfiliaciones = egresos
    .filter((e) => e.caja === 'afiliaciones' && e.estado === 'activo')
    .reduce((s, e) => s + (parseFloat(e.monto) || 0), 0)

  const totalGeneralEgresos = totalServicios + totalAfiliaciones

  const totalAdelantosGuardia = pagosGuardia
    .filter((p) => !p.anulado)
    .reduce((s, p) => s + (parseFloat(p.monto) || 0), 0)
  const saldoPendienteGuardia = Math.max(0, (parseFloat(sueldoMensual) || 0) - totalAdelantosGuardia)

  const openCargaLuzModal = () => {
    const pEn = parseFloat(periodoFijo?.factura_energia_bs) || 0
    const pAl = parseFloat(periodoFijo?.factura_alumbrado_bs) || 0
    const pBa = parseFloat(periodoFijo?.factura_basura_bs) || 0
    const totalLegacy = parseFloat(periodoFijo?.factura_luz_bs) || 0
    const hasDesglose = pEn > 0 || pAl > 0 || pBa > 0

    if (hasDesglose) {
      setLuzEnergiaInput(String(pEn))
      setLuzAlumbradoInput(String(pAl))
      setLuzBasuraInput(String(pBa))
    } else if (totalLegacy > 0) {
      setLuzEnergiaInput(String(totalLegacy))
      setLuzAlumbradoInput('0')
      setLuzBasuraInput('0')
    } else {
      setLuzEnergiaInput('')
      setLuzAlumbradoInput('0')
      setLuzBasuraInput('0')
    }

    setLuzKwhInput(periodoFijo?.factura_luz_kwh ? String(periodoFijo.factura_luz_kwh) : '')
    setFotoFacturaLuzInput(periodoFijo?.factura_luz_drive_url || '')
    setIsCargaLuzOpen(true)
  }

  const luzEnergiaNum = Math.round((parseFloat(luzEnergiaInput) || 0) * 100) / 100
  const luzAlumbradoNum = Math.round((parseFloat(luzAlumbradoInput) || 0) * 100) / 100
  const luzBasuraNum = Math.round((parseFloat(luzBasuraInput) || 0) * 100) / 100
  const totalFacturaLuzModal = Math.round((luzEnergiaNum + luzAlumbradoNum + luzBasuraNum) * 100) / 100
  const luzKwhNum = Math.round((parseFloat(luzKwhInput) || 0) * 100) / 100
  const precioKwhModal = luzKwhNum > 0 ? (luzEnergiaNum / luzKwhNum).toFixed(4) : '0.0000'

  const handleSaveCargaLuz = async (e) => {
    e.preventDefault()
    if (totalFacturaLuzModal <= 0) {
      setStatusMessage({ type: 'error', text: 'El total de la factura de luz debe ser mayor a 0.' })
      return
    }
    if (luzKwhNum <= 0) {
      setStatusMessage({ type: 'error', text: 'Ingresa el total de kWh consumidos mayor a 0.' })
      return
    }

    // Si ya había factura de luz cargada, exigir motivo obligatorio de edición
    if (periodoFijo?.id && (parseFloat(periodoFijo.factura_luz_bs) || 0) > 0) {
      setConfirmState({
        open: true,
        tipo: 'edicion',
        entity: 'luz',
        target: periodoFijo,
        advertencia: 'Recuerda revisar los cobros si ya se abrió el periodo en Cobros Mensuales.',
      })
      return
    }

    setSavingCargaLuz(true)
    try {
      const luzFields = {
        factura_energia_bs: luzEnergiaNum,
        factura_alumbrado_bs: luzAlumbradoNum,
        factura_basura_bs: luzBasuraNum,
        factura_luz_bs: totalFacturaLuzModal,
        factura_luz_kwh: luzKwhNum,
        precio_kwh_calculado: parseFloat(precioKwhModal) || 0,
        factura_luz_drive_url: fotoFacturaLuzInput || null,
        estado_pago_factura: periodoFijo?.estado_pago_factura || 'pendiente_pago',
      }

      if (periodoFijo?.id) {
        const { error } = await supabase.from('periodos_mensuales').update(luzFields).eq('id', periodoFijo.id)
        if (error) throw error

        await registrarAuditoria({
          usuarioId: user?.id,
          accion: 'CARGA_FACTURA_LUZ',
          detalleJson: {
            descripcion: `Factura de Luz ${MESES[guardiaMes]} ${guardiaAnio}: ${totalFacturaLuzModal.toFixed(2)} Bs (${luzKwhNum} kWh, ${precioKwhModal} Bs/kWh)`,
            periodo_id: periodoFijo.id,
            ...luzFields,
          },
        })
      } else {
        const { data: createdP, error } = await supabase
          .from('periodos_mensuales')
          .insert([{ mes: guardiaMes, anio: guardiaAnio, ...luzFields }])
          .select()
          .single()
        if (error) throw error

        await registrarAuditoria({
          usuarioId: user?.id,
          accion: 'CARGA_FACTURA_LUZ',
          detalleJson: {
            descripcion: `Factura de Luz ${MESES[guardiaMes]} ${guardiaAnio}: ${totalFacturaLuzModal.toFixed(2)} Bs (${luzKwhNum} kWh, ${precioKwhModal} Bs/kWh)`,
            periodo_id: createdP?.id,
            ...luzFields,
          },
        })
      }

      setStatusMessage({
        type: 'success',
        text: `Factura de luz (${totalFacturaLuzModal.toFixed(2)} Bs) guardada como Pendiente de Pago.`,
      })
      setIsCargaLuzOpen(false)
      await fetchGuardiaData()
    } catch (err) {
      console.error(err)
      setStatusMessage({ type: 'error', text: 'Error al guardar factura de luz: ' + err.message })
    } finally {
      setSavingCargaLuz(false)
    }
  }

  // Handlers de Gastos Fijos del Mes (Luz y Agua)
  const openPagoLuzModal = () => {
    setFechaPagoLuz(getLocalDateStr())
    setMetodoPagoLuz('efectivo')
    setFotoPagoLuz(periodoFijo?.foto_comprobante_pago_luz || '')
    setIsPagoLuzOpen(true)
  }

  const handleConfirmarPagoLuz = async (e) => {
    e.preventDefault()
    if (!periodoFijo) return
    const montoFactura = parseFloat(periodoFijo.factura_luz_bs) || 0
    if (montoFactura <= 0) {
      setStatusMessage({ type: 'error', text: 'El monto total de la factura de luz debe ser mayor a 0.' })
      return
    }
    setSavingLuzPago(true)
    try {
      const desc = `Pago Factura Luz - ${MESES[guardiaMes]} ${guardiaAnio}`
      const { error: egErr } = await supabase.from('egresos').insert([
        {
          caja: 'servicios',
          categoria: 'Factura Luz General',
          descripcion: desc,
          monto: montoFactura,
          metodo_pago: metodoPagoLuz,
          fecha: fechaPagoLuz,
          recibo_drive_url: fotoPagoLuz || null,
          estado: 'activo',
        },
      ])
      if (egErr) throw egErr

      const { error: pErr } = await supabase
        .from('periodos_mensuales')
        .update({
          estado_pago_factura: 'pagada',
          fecha_pago_factura: fechaPagoLuz,
          metodo_pago_factura: metodoPagoLuz,
          foto_comprobante_pago_luz: fotoPagoLuz || null,
        })
        .eq('id', periodoFijo.id)
      if (pErr) throw pErr

      await registrarAuditoria({
        usuarioId: user?.id,
        accion: 'PAGO_FACTURA_LUZ',
        detalleJson: {
          descripcion: desc,
          periodo_id: periodoFijo.id,
          monto: montoFactura,
          metodo_pago: metodoPagoLuz,
          fecha_pago: fechaPagoLuz,
        },
      })

      setStatusMessage({
        type: 'success',
        text: `¡Factura de luz de ${MESES[guardiaMes]} ${guardiaAnio} pagada y descontada de Caja Servicios!`,
      })
      setIsPagoLuzOpen(false)
      await Promise.all([fetchEgresos(), fetchGuardiaData()])
    } catch (err) {
      console.error(err)
      setStatusMessage({ type: 'error', text: 'Error al registrar pago de luz: ' + err.message })
    } finally {
      setSavingLuzPago(false)
    }
  }

  const openCargaAguaModal = () => {
    const pPot = parseFloat(periodoFijo?.factura_agua_potable_bs) || 0
    const pAlc = parseFloat(periodoFijo?.factura_alcantarillado_bs) || 0
    const pApo = parseFloat(periodoFijo?.factura_agua_aporte_socio_bs) || 0
    const totalLegacy = parseFloat(periodoFijo?.factura_agua_bs) || 0
    const hasDesglose = pPot > 0 || pAlc > 0 || pApo > 0

    if (hasDesglose) {
      setAguaPotableInput(String(pPot))
      setAguaAlcantarilladoInput(String(pAlc))
      setAguaAporteSocioInput(String(pApo))
    } else if (totalLegacy > 0) {
      setAguaPotableInput(String(totalLegacy))
      setAguaAlcantarilladoInput('0')
      setAguaAporteSocioInput('0')
    } else {
      setAguaPotableInput('')
      setAguaAlcantarilladoInput('0')
      setAguaAporteSocioInput('0')
    }

    setFotoFacturaAguaInput(periodoFijo?.foto_factura_agua || '')
    setIsCargaAguaOpen(true)
  }

  const potableNum = Math.round((parseFloat(aguaPotableInput) || 0) * 100) / 100
  const alcantarilladoNum = Math.round((parseFloat(aguaAlcantarilladoInput) || 0) * 100) / 100
  const aporteSocioNum = Math.round((parseFloat(aguaAporteSocioInput) || 0) * 100) / 100
  const totalFacturaAguaModal = Math.round((potableNum + alcantarilladoNum + aporteSocioNum) * 100) / 100

  const handleSaveCargaAgua = async (e) => {
    e.preventDefault()
    if (totalFacturaAguaModal <= 0) {
      setStatusMessage({ type: 'error', text: 'El total de la factura de agua debe ser mayor a 0.' })
      return
    }
    setSavingCargaAgua(true)
    try {
      const aguaFields = {
        factura_agua_potable_bs: potableNum,
        factura_alcantarillado_bs: alcantarilladoNum,
        factura_agua_aporte_socio_bs: aporteSocioNum,
        factura_agua_bs: totalFacturaAguaModal,
        foto_factura_agua: fotoFacturaAguaInput || null,
      }

      if (periodoFijo?.id) {
        const { error } = await supabase
          .from('periodos_mensuales')
          .update({
            ...aguaFields,
            estado_pago_agua: periodoFijo.estado_pago_agua || 'pendiente_pago',
          })
          .eq('id', periodoFijo.id)
        if (error) throw error

        await registrarAuditoria({
          usuarioId: user?.id,
          accion: 'CARGA_FACTURA_AGUA',
          detalleJson: {
            descripcion: `Factura de Agua ${MESES[guardiaMes]} ${guardiaAnio}: ${totalFacturaAguaModal.toFixed(2)} Bs (Potable ${potableNum.toFixed(2)} + Alcantarillado ${alcantarilladoNum.toFixed(2)} + Aporte ${aporteSocioNum.toFixed(2)})`,
            periodo_id: periodoFijo.id,
            ...aguaFields,
          },
        })
      } else {
        const { data: createdP, error } = await supabase
          .from('periodos_mensuales')
          .insert([
            {
              mes: guardiaMes,
              anio: guardiaAnio,
              factura_luz_bs: 0,
              factura_luz_kwh: 0,
              precio_kwh_calculado: 0,
              ...aguaFields,
              estado_pago_agua: 'pendiente_pago',
            },
          ])
          .select()
          .single()
        if (error) throw error

        await registrarAuditoria({
          usuarioId: user?.id,
          accion: 'CARGA_FACTURA_AGUA',
          detalleJson: {
            descripcion: `Factura de Agua ${MESES[guardiaMes]} ${guardiaAnio}: ${totalFacturaAguaModal.toFixed(2)} Bs (Potable ${potableNum.toFixed(2)} + Alcantarillado ${alcantarilladoNum.toFixed(2)} + Aporte ${aporteSocioNum.toFixed(2)})`,
            periodo_id: createdP?.id,
            ...aguaFields,
          },
        })
      }

      setStatusMessage({
        type: 'success',
        text: `Factura de agua (${totalFacturaAguaModal.toFixed(2)} Bs) cargada como Pendiente de Pago (sin descontar caja todavía).`,
      })
      setIsCargaAguaOpen(false)
      await fetchGuardiaData()
    } catch (err) {
      console.error(err)
      setStatusMessage({ type: 'error', text: 'Error al guardar factura de agua: ' + err.message })
    } finally {
      setSavingCargaAgua(false)
    }
  }

  const openPagoAguaModal = () => {
    setFechaPagoAgua(getLocalDateStr())
    setMetodoPagoAgua('efectivo')
    setFotoPagoAgua(periodoFijo?.foto_comprobante_pago_agua || '')
    setIsPagoAguaOpen(true)
  }

  const handleConfirmarPagoAgua = async (e) => {
    e.preventDefault()
    if (!periodoFijo) return
    const montoAgua = Math.round((parseFloat(periodoFijo.factura_agua_bs) || 0) * 100) / 100
    if (montoAgua <= 0) {
      setStatusMessage({ type: 'error', text: 'Primero carga el monto de la factura de agua del mes.' })
      return
    }
    setSavingPagoAgua(true)
    try {
      const desc = `Pago Factura de Agua - ${MESES[guardiaMes]} ${guardiaAnio}`
      const { data: egresoCreado, error: egErr } = await supabase
        .from('egresos')
        .insert([
          {
            caja: 'servicios',
            categoria: 'Factura de Agua',
            descripcion: desc,
            monto: montoAgua,
            metodo_pago: metodoPagoAgua,
            fecha: fechaPagoAgua,
            recibo_drive_url: fotoPagoAgua || null,
            estado: 'activo',
          },
        ])
        .select()
        .single()
      if (egErr) throw egErr

      const { error: pErr } = await supabase
        .from('periodos_mensuales')
        .update({
          estado_pago_agua: 'pagada',
          fecha_pago_agua: fechaPagoAgua,
          metodo_pago_agua: metodoPagoAgua,
          foto_comprobante_pago_agua: fotoPagoAgua || null,
          egreso_agua_id: egresoCreado.id,
        })
        .eq('id', periodoFijo.id)
      if (pErr) throw pErr

      await registrarAuditoria({
        usuarioId: user?.id,
        accion: 'PAGO_FACTURA_AGUA',
        detalleJson: {
          descripcion: desc,
          periodo_id: periodoFijo.id,
          egreso_agua_id: egresoCreado.id,
          monto: montoAgua,
          metodo_pago: metodoPagoAgua,
          fecha_pago: fechaPagoAgua,
        },
      })

      setStatusMessage({
        type: 'success',
        text: `¡Factura de agua de ${MESES[guardiaMes]} ${guardiaAnio} pagada (${montoAgua.toFixed(2)} Bs) y descontada de Caja Servicios!`,
      })
      setIsPagoAguaOpen(false)
      await Promise.all([fetchEgresos(), fetchGuardiaData()])
    } catch (err) {
      console.error(err)
      setStatusMessage({ type: 'error', text: 'Error al registrar pago de agua: ' + err.message })
    } finally {
      setSavingPagoAgua(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-slate-900">Egresos y Control de Guardia</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
              Dos Cajas Separadas
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Registro, edición y eliminación auditada de facturas, sueldos y mantenimiento.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              fetchEgresos()
              fetchGuardiaData()
            }}
            title="Recargar datos"
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading || loadingGuardia ? 'animate-spin text-amber-600' : ''}`} />
          </button>
          {activeTab === 'egresos' ? (
            isAdmin && (
              <button
                onClick={openNewEgresoModal}
                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Registrar Egreso</span>
              </button>
            )
          ) : (
            isAdmin && (
              <button
                onClick={() => {
                  setEditingGuardia(null)
                  setGTipo('adelanto_quincena')
                  setGMonto('')
                  setGFecha(getLocalDateStr())
                  setGMetodo('efectivo')
                  setGObs('')
                  setGFotoUrl('')
                  setIsGuardiaModalOpen(true)
                }}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
              >
                <Shield className="w-4 h-4" />
                <span>Registrar Adelanto / Pago Guardia</span>
              </button>
            )
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('egresos')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'egresos' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Egresos Generales ({egresos.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('guardia')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'guardia' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Sueldo y Adelantos del Guardia</span>
        </button>
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

      {activeTab === 'guardia' ? (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-slate-600">Mes de Control:</span>
              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1">
                <select value={guardiaMes} onChange={(e) => setGuardiaMes(parseInt(e.target.value, 10))} className="bg-transparent font-bold text-slate-800 py-1 px-2 focus:outline-none">
                  {MESES.slice(1).map((m, i) => (
                    <option key={i + 1} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
                <select value={guardiaAnio} onChange={(e) => setGuardiaAnio(parseInt(e.target.value, 10))} className="bg-transparent font-bold text-slate-800 py-1 px-2 border-l border-slate-200 focus:outline-none">
                  {[2024, 2025, 2026, 2027, 2028].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <label className="font-semibold text-slate-700">Sueldo Mensual (Bs):</label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                disabled={!isAdmin}
                value={sueldoMensual}
                onChange={(e) => setSueldoMensual(e.target.value)}
                className="w-28 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900"
              />
              {isAdmin && (
                <button
                  type="button"
                  onClick={() =>
                    setConfirmState({
                      open: true,
                      tipo: 'edicion',
                      entity: 'sueldo',
                      target: { id: tarifaId },
                      advertencia: '',
                    })
                  }
                  disabled={savingSueldo}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center gap-1"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Guardar</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Sueldo Mensual</span>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">
                {(parseFloat(sueldoMensual) || 0).toFixed(2)} <span className="text-xs font-normal text-slate-500">Bs</span>
              </p>
              <span className="text-[11px] text-slate-400">
                {MESES[guardiaMes]} {guardiaAnio}
              </span>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-emerald-200 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">Total Adelantos Entregados</span>
              <p className="text-2xl font-extrabold text-emerald-700 mt-1">
                {totalAdelantosGuardia.toFixed(2)} <span className="text-xs font-normal text-slate-500">Bs</span>
              </p>
              <span className="text-[11px] text-slate-400">Cargado en Egresos Servicios</span>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-amber-200 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">Saldo Pendiente por Pagar</span>
              <p className="text-2xl font-extrabold text-amber-700 mt-1">
                {saldoPendienteGuardia.toFixed(2)} <span className="text-xs font-normal text-slate-500">Bs</span>
              </p>
              <span className="text-[11px] text-slate-400">Restante del sueldo del mes</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Movimientos del Guardia — {MESES[guardiaMes]} {guardiaAnio} ({pagosGuardia.length})
              </span>
            </div>

            {pagosGuardia.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No se registraron adelantos ni pagos al guardia en {MESES[guardiaMes]} {guardiaAnio}.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {pagosGuardia.map((p) => {
                  const tipoLabel = TIPOS_GUARDIA.find((t) => t.value === p.tipo)?.label || p.tipo
                  return (
                    <div key={p.id} className="p-4 text-xs space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[11px]">
                            {tipoLabel}
                          </span>
                          <span className={`font-bold text-sm ${p.anulado ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                            {parseFloat(p.monto).toFixed(2)} Bs
                          </span>
                          <span className="text-slate-500">
                            • {p.fecha_pago} • {p.metodo_pago === 'qr' ? 'QR / Banco' : 'Efectivo'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {p.foto_vale_url && (
                            <a href={p.foto_vale_url} target="_blank" rel="noreferrer" className="p-1.5 bg-blue-50 text-blue-600 rounded-lg inline-flex items-center gap-1 text-[11px] font-semibold">
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Ver Vale</span>
                            </a>
                          )}
                          {p.anulado ? (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-bold">Anulado</span>
                          ) : (
                            isAdmin && (
                              <>
                                <button type="button" onClick={() => openEditGuardiaModal(p)} title="Editar pago" className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg">
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAnulandoGuardiaId(p.id)
                                    setMotivoAnulGuardia('')
                                  }}
                                  className="text-orange-600 hover:bg-orange-50 px-2 py-1 rounded font-semibold"
                                >
                                  Anular
                                </button>
                              </>
                            )
                          )}
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmState({
                                  open: true,
                                  tipo: 'eliminacion',
                                  entity: 'guardia',
                                  target: p,
                                  advertencia: p.egreso_id ? 'Se eliminará también su egreso vinculado en Caja Servicios.' : '',
                                })
                              }
                              title="Eliminar pago guardia"
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {p.observaciones && <p className="text-slate-600">{p.observaciones}</p>}
                      {p.anulado && p.motivo_anulacion && (
                        <p className="text-[11px] text-red-700 bg-red-50 p-2 rounded">
                          <strong>Motivo anulación:</strong> {p.motivo_anulacion}
                        </p>
                      )}

                      {anulandoGuardiaId === p.id && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                          <span className="font-bold text-amber-900 block">
                            Motivo obligatorio (anulará también el egreso vinculado en Caja Servicios)
                          </span>
                          <input
                            type="text"
                            value={motivoAnulGuardia}
                            onChange={(e) => setMotivoAnulGuardia(e.target.value)}
                            placeholder="Escribe el motivo..."
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg"
                          />
                          <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setAnulandoGuardiaId(null)} className="text-slate-600">
                              Cancelar
                            </button>
                            <button type="button" onClick={() => handleAnularPagoGuardia(p)} className="px-3 py-1 bg-red-600 text-white rounded-lg font-bold">
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
          </div>
        </div>
      ) : (
        <>
          {/* Panel Superior: Gastos Fijos del Mes (Luz, Agua, Guardia) */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-600" />
                  <span>Gastos Fijos del Mes — Caja Servicios</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Control mensual de facturas obligatorias (Luz, Agua) y adelantos del guardia.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-slate-600">Mes:</span>
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1">
                  <select
                    value={guardiaMes}
                    onChange={(e) => setGuardiaMes(parseInt(e.target.value, 10))}
                    className="bg-transparent font-bold text-slate-800 py-1 px-2 focus:outline-none"
                  >
                    {MESES.slice(1).map((m, i) => (
                      <option key={i + 1} value={i + 1}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <select
                    value={guardiaAnio}
                    onChange={(e) => setGuardiaAnio(parseInt(e.target.value, 10))}
                    className="bg-transparent font-bold text-slate-800 py-1 px-2 border-l border-slate-200 focus:outline-none"
                  >
                    {[2024, 2025, 2026, 2027, 2028].map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {(() => {
              const montoLuz = parseFloat(periodoFijo?.factura_luz_bs) || 0
              const luzCargada = Boolean(periodoFijo && montoLuz > 0)
              const luzPagada = periodoFijo?.estado_pago_factura === 'pagada'

              const montoAgua = parseFloat(periodoFijo?.factura_agua_bs) || 0
              const aguaCargada = Boolean(periodoFijo && montoAgua > 0)
              const aguaPagada = periodoFijo?.estado_pago_agua === 'pagada'

              return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Tarjeta 1: Factura de Luz */}
                  <div className="rounded-2xl p-4 border border-amber-200 bg-amber-50/40 flex flex-col justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-extrabold text-amber-900 flex items-center gap-1.5">
                          <Zap className="w-4 h-4 text-amber-600" />
                          <span>Factura de Luz</span>
                        </span>
                        {luzPagada ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Pagada
                          </span>
                        ) : luzCargada ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            Pendiente de pago
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
                            Sin cargar
                          </span>
                        )}
                      </div>

                      <p className="text-2xl font-black text-slate-900">
                        {montoLuz.toFixed(2)} <span className="text-xs font-semibold text-slate-500">Bs</span>
                      </p>

                      {luzCargada ? (
                        <div className="text-[11px] text-slate-600 space-y-0.5">
                          {(parseFloat(periodoFijo?.factura_energia_bs) || 0) > 0 && (
                            <p>
                              Energía: {parseFloat(periodoFijo.factura_energia_bs).toFixed(2)} • Alumb:{' '}
                              {parseFloat(periodoFijo.factura_alumbrado_bs || 0).toFixed(2)} • Basura:{' '}
                              {parseFloat(periodoFijo.factura_basura_bs || 0).toFixed(2)}
                            </p>
                          )}
                          {periodoFijo?.factura_luz_drive_url && (
                            <a
                              href={periodoFijo.factura_luz_drive_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-blue-600 font-semibold hover:underline"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Ver factura</span>
                            </a>
                          )}
                          {luzPagada && (
                            <p className="text-emerald-700 font-medium">
                              Pagada el {periodoFijo.fecha_pago_factura} ({periodoFijo.metodo_pago_factura === 'qr' ? 'QR' : 'Efectivo'})
                              {periodoFijo.foto_comprobante_pago_luz && (
                                <>
                                  {' • '}
                                  <a
                                    href={periodoFijo.foto_comprobante_pago_luz}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="underline font-bold"
                                  >
                                    Comprobante
                                  </a>
                                </>
                              )}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-500">
                          Carga la factura de luz al abrir {MESES[guardiaMes]} en <strong>Cobros</strong>.
                        </p>
                      )}
                    </div>

                    {isAdmin && !luzPagada && (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={openCargaLuzModal}
                          className="flex-1 py-2 px-3 bg-white hover:bg-amber-50 text-amber-800 border border-amber-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>{luzCargada ? 'Editar Factura' : 'Cargar Factura'}</span>
                        </button>
                        {luzCargada && (
                          <button
                            type="button"
                            onClick={openPagoLuzModal}
                            className="flex-1 py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-sm"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Registrar Pago de Luz</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Tarjeta 2: Factura de Agua */}
                  <div className="rounded-2xl p-4 border border-blue-200 bg-blue-50/40 flex flex-col justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-extrabold text-blue-900 flex items-center gap-1.5">
                          <Droplets className="w-4 h-4 text-blue-600" />
                          <span>Factura de Agua</span>
                        </span>
                        {aguaPagada ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Pagada
                          </span>
                        ) : aguaCargada ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            Pendiente de pago
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
                            Sin cargar
                          </span>
                        )}
                      </div>

                      <p className="text-2xl font-black text-slate-900">
                        {montoAgua.toFixed(2)} <span className="text-xs font-semibold text-slate-500">Bs</span>
                      </p>

                      <div className="text-[11px] text-slate-600 space-y-0.5">
                        {((parseFloat(periodoFijo?.factura_agua_potable_bs) || 0) > 0 ||
                          (parseFloat(periodoFijo?.factura_alcantarillado_bs) || 0) > 0 ||
                          (parseFloat(periodoFijo?.factura_agua_aporte_socio_bs) || 0) > 0) && (
                          <p>
                            Potable: {parseFloat(periodoFijo.factura_agua_potable_bs || 0).toFixed(2)} • Alcant.:{' '}
                            {parseFloat(periodoFijo.factura_alcantarillado_bs || 0).toFixed(2)} • Aporte:{' '}
                            {parseFloat(periodoFijo.factura_agua_aporte_socio_bs || 0).toFixed(2)}
                          </p>
                        )}
                        {periodoFijo?.foto_factura_agua && (
                          <a
                            href={periodoFijo.foto_factura_agua}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 font-semibold hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Ver factura agua</span>
                          </a>
                        )}
                        {aguaPagada ? (
                          <p className="text-emerald-700 font-medium">
                            Pagada el {periodoFijo.fecha_pago_agua} ({periodoFijo.metodo_pago_agua === 'qr' ? 'QR' : 'Efectivo'})
                            {periodoFijo.foto_comprobante_pago_agua && (
                              <>
                                {' • '}
                                <a
                                  href={periodoFijo.foto_comprobante_pago_agua}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="underline font-bold"
                                >
                                  Comprobante
                                </a>
                              </>
                            )}
                          </p>
                        ) : !aguaCargada ? (
                          <p className="text-slate-500">
                            Carga la factura del mes sin descontar caja hasta pagarla.
                          </p>
                        ) : null}
                      </div>
                    </div>

                    {isAdmin && (
                      <div className="flex flex-wrap gap-2">
                        {!aguaPagada && (
                          <button
                            type="button"
                            onClick={openCargaAguaModal}
                            className="flex-1 py-2 px-3 bg-white hover:bg-blue-50 text-blue-800 border border-blue-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>{aguaCargada ? 'Editar Factura' : 'Cargar Factura'}</span>
                          </button>
                        )}
                        {aguaCargada && !aguaPagada && (
                          <button
                            type="button"
                            onClick={openPagoAguaModal}
                            className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-sm"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Registrar Pago de Agua</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Tarjeta 3: Sueldo del Guardia */}
                  <div className="rounded-2xl p-4 border border-emerald-200 bg-emerald-50/40 flex flex-col justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-extrabold text-emerald-900 flex items-center gap-1.5">
                          <Shield className="w-4 h-4 text-emerald-600" />
                          <span>Sueldo del Guardia</span>
                        </span>
                        {saldoPendienteGuardia <= 0 && (parseFloat(sueldoMensual) || 0) > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Cubierto
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            Saldo pendiente
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 text-[11px] bg-white/80 p-2 rounded-xl border border-emerald-100">
                        <div>
                          <span className="text-slate-400 block">Sueldo</span>
                          <strong className="text-slate-900">{(parseFloat(sueldoMensual) || 0).toFixed(0)} Bs</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Adelantos</span>
                          <strong className="text-emerald-700">{totalAdelantosGuardia.toFixed(0)} Bs</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Pendiente</span>
                          <strong className="text-amber-700">{saldoPendienteGuardia.toFixed(0)} Bs</strong>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveTab('guardia')}
                        className="flex-1 py-2 px-3 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                      >
                        <span>Ir a Guardia</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingGuardia(null)
                            setGTipo('adelanto_quincena')
                            setGMonto('')
                            setGFecha(getLocalDateStr())
                            setGMetodo('efectivo')
                            setGObs('')
                            setGFotoUrl('')
                            setIsGuardiaModalOpen(true)
                          }}
                          className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-sm"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>Adelanto / Pago</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">Egresos Caja Servicios</span>
              <p className="text-xl font-bold text-slate-900 mt-1">
                {totalServicios.toFixed(2)} <span className="text-xs font-normal text-slate-500">Bs</span>
              </p>
              <span className="text-[11px] text-slate-400">Luz, agua, guardia y basura</span>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">Egresos Caja Afiliaciones</span>
              <p className="text-xl font-bold text-slate-900 mt-1">
                {totalAfiliaciones.toFixed(2)} <span className="text-xs font-normal text-slate-500">Bs</span>
              </p>
              <span className="text-[11px] text-slate-400">Limpieza y mantenimiento</span>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 block">Total Egresos General</span>
              <p className="text-xl font-bold text-red-600 mt-1">
                {totalGeneralEgresos.toFixed(2)} <span className="text-xs font-normal text-slate-500">Bs</span>
              </p>
              <span className="text-[11px] text-slate-400">Total descargado en recibos</span>
            </div>
          </div>

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
              <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl">
                <button onClick={() => setFilterCaja('todos')} className={`px-2.5 py-1 rounded-lg ${filterCaja === 'todos' ? 'bg-white font-bold shadow-sm' : 'text-slate-600'}`}>
                  Todas
                </button>
                <button onClick={() => setFilterCaja('servicios')} className={`px-2.5 py-1 rounded-lg ${filterCaja === 'servicios' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-600'}`}>
                  Servicios
                </button>
                <button onClick={() => setFilterCaja('afiliaciones')} className={`px-2.5 py-1 rounded-lg ${filterCaja === 'afiliaciones' ? 'bg-blue-600 text-white font-bold' : 'text-slate-600'}`}>
                  Afiliaciones
                </button>
              </div>

              <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl">
                <button onClick={() => setFilterMetodo('todos')} className={`px-2 py-1 rounded-lg ${filterMetodo === 'todos' ? 'bg-white font-bold shadow-sm' : 'text-slate-600'}`}>
                  Todos
                </button>
                <button onClick={() => setFilterMetodo('efectivo')} className={`px-2 py-1 rounded-lg ${filterMetodo === 'efectivo' ? 'bg-slate-900 text-white font-bold' : 'text-slate-600'}`}>
                  Efectivo
                </button>
                <button onClick={() => setFilterMetodo('qr')} className={`px-2 py-1 rounded-lg ${filterMetodo === 'qr' ? 'bg-slate-900 text-white font-bold' : 'text-slate-600'}`}>
                  QR
                </button>
              </div>
            </div>
          </div>

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
                        <span className={`p-2 rounded-xl mt-0.5 ${isServicios ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                          <ArrowDownCircle className="w-4 h-4" />
                        </span>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${isServicios ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>
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

                      <div className="flex items-center space-x-2 self-end sm:self-center">
                        <div className="text-right mr-1">
                          <span className={`text-sm font-bold block ${isAnulado ? 'line-through text-slate-400' : 'text-red-600'}`}>
                            -{parseFloat(egreso.monto).toFixed(2)} Bs
                          </span>
                          <span className="text-[10px] text-slate-400 uppercase font-medium">
                            {egreso.metodo_pago === 'qr' ? 'QR / Banco' : 'Efectivo'}
                          </span>
                        </div>

                        {egreso.recibo_drive_url && (
                          <a href={egreso.recibo_drive_url} target="_blank" rel="noreferrer" className="p-1.5 text-blue-600 bg-blue-50 rounded-lg" title="Ver foto del recibo">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}

                        {isAnulado ? (
                          <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">Anulado</span>
                        ) : (
                          isAdmin && (
                            <>
                              <button type="button" onClick={() => openEditEgresoModal(egreso)} title="Editar egreso" className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg">
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setAnulandoEgresoId(egreso.id)
                                  setMotivoAnulacion('')
                                }}
                                className="text-[11px] font-semibold text-orange-600 hover:bg-orange-50 px-2 py-1 rounded-lg"
                              >
                                Anular
                              </button>
                            </>
                          )
                        )}

                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmState({
                                open: true,
                                tipo: 'eliminacion',
                                entity: 'egreso',
                                target: egreso,
                                advertencia: '',
                              })
                            }
                            title="Eliminar egreso cargado por error"
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {isAnulado && egreso.motivo_anulacion && (
                      <p className="text-[11px] text-red-700 bg-red-50 p-2 rounded-lg">
                        <strong>Motivo de anulación:</strong> {egreso.motivo_anulacion}
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
                          placeholder="Escribe el motivo de anulación del gasto..."
                          className="w-full px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-lg"
                        />
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => setAnulandoEgresoId(null)} className="text-[11px] text-slate-600">
                            Cancelar
                          </button>
                          <button type="button" onClick={() => handleAnularEgreso(egreso.id)} className="px-3 py-1 bg-red-600 text-white rounded-lg text-[11px] font-bold">
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
        </>
      )}

      {/* Modal Crear / Editar Egreso */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md max-h-[88dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
            <div className="shrink-0 bg-slate-900 px-5 py-3.5 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg shrink-0">
                  <ArrowDownCircle className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm sm:text-base leading-tight truncate">
                    {editingEgreso ? 'Editar Egreso (Auditado)' : 'Registrar Egreso'}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-400 truncate">Descargo de fondos con respaldo fotográfico</p>
                </div>
              </div>
              <button type="button" onClick={() => setIsNewModalOpen(false)} className="p-1.5 text-slate-300 hover:text-white shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEgreso} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Caja *</label>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => handleCajaChange('servicios')} className={`py-2 px-3 rounded-xl border text-xs font-bold ${caja === 'servicios' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 text-slate-700 border-slate-300'}`}>
                    Caja Servicios
                  </button>
                  <button type="button" onClick={() => handleCajaChange('afiliaciones')} className={`py-2 px-3 rounded-xl border text-xs font-bold ${caja === 'afiliaciones' ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-700 border-slate-300'}`}>
                    Caja Afiliaciones
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Categoría / Concepto <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  list="egreso-cat-suggestions"
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  placeholder={
                    caja === 'afiliaciones'
                      ? 'Ej. Pasajes trámite alcaldía, Compra veneno, Imprevistos...'
                      : 'Ej. Factura de Agua, Papelería, Pasajes...'
                  }
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
                <datalist id="egreso-cat-suggestions">
                  {(caja === 'servicios' ? SUGERENCIAS_SERVICIOS : SUGERENCIAS_AFILIACIONES).map((sug) => (
                    <option key={sug} value={sug} />
                  ))}
                </datalist>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(caja === 'servicios' ? SUGERENCIAS_SERVICIOS : SUGERENCIAS_AFILIACIONES).map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => setCategoria(sug)}
                      className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                        categoria === sug
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Descripción *</label>
                <input type="text" required value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Monto (Bs) *</label>
                  <input type="number" inputMode="decimal" step="0.01" min="0.01" required value={monto} onChange={(e) => setMonto(e.target.value)} className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha</label>
                  <input type="date" required value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Pagado con</label>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setMetodoPago('efectivo')} className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${metodoPago === 'efectivo' ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-700 border-slate-300'}`}>
                    <Coins className="w-4 h-4" />
                    <span>Efectivo</span>
                  </button>
                  <button type="button" onClick={() => setMetodoPago('qr')} className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${metodoPago === 'qr' ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-700 border-slate-300'}`}>
                    <QrCode className="w-4 h-4" />
                    <span>QR / Banco</span>
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-600">Foto Recibo (Drive):</span>
                <div className="flex items-center space-x-2">
                  {reciboDriveUrl && (
                    <a href={reciboDriveUrl} target="_blank" rel="noreferrer" className="p-1.5 text-blue-600 bg-blue-50 rounded-lg">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <button type="button" onClick={() => setIsPhotoModalOpen(true)} className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <Camera className="w-3.5 h-3.5 text-slate-500" />
                    <span>{reciboDriveUrl ? 'Cambiar Foto' : 'Adjuntar Recibo'}</span>
                  </button>
                </div>
              </div>

              </div>

              <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex items-center justify-end gap-2">
                <button type="button" onClick={() => setIsNewModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-600">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md">
                  {saving ? 'Guardando...' : editingEgreso ? 'Actualizar Egreso' : 'Confirmar Egreso'}
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

      {/* Modal Crear / Editar Pago Guardia */}
      {isGuardiaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md max-h-[88dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
            <div className="shrink-0 bg-slate-900 px-5 py-3.5 text-white flex items-center justify-between">
              <div className="min-w-0">
                <h3 className="font-bold text-sm sm:text-base truncate">
                  {editingGuardia ? 'Editar Pago Guardia (Auditado)' : 'Adelanto / Pago del Guardia'}
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                  {MESES[guardiaMes]} {guardiaAnio} • Sincronizado con Egresos Servicios
                </p>
              </div>
              <button type="button" onClick={() => setIsGuardiaModalOpen(false)} className="p-1.5 text-slate-300 hover:text-white shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePagoGuardia} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de Pago</label>
                <select value={gTipo} onChange={(e) => setGTipo(e.target.value)} className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-bold">
                  {TIPOS_GUARDIA.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Monto (Bs)</label>
                  <input type="number" inputMode="decimal" step="0.01" min="0.01" required value={gMonto} onChange={(e) => setGMonto(e.target.value)} className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha Real</label>
                  <input type="date" required value={gFecha} onChange={(e) => setGFecha(e.target.value)} className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Método</label>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setGMetodo('efectivo')} className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${gMetodo === 'efectivo' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 text-slate-700 border-slate-300'}`}>
                    <Coins className="w-4 h-4" />
                    <span>Efectivo</span>
                  </button>
                  <button type="button" onClick={() => setGMetodo('qr')} className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${gMetodo === 'qr' ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-700 border-slate-300'}`}>
                    <QrCode className="w-4 h-4" />
                    <span>QR / Banco</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Observaciones</label>
                <input type="text" value={gObs} onChange={(e) => setGObs(e.target.value)} className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl" />
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-600">Foto Vale (Drive):</span>
                <div className="flex items-center gap-2">
                  {gFotoUrl && (
                    <a href={gFotoUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                      Ver
                    </a>
                  )}
                  <button type="button" onClick={() => setIsGuardiaPhotoOpen(true)} className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold text-slate-700 flex items-center gap-1">
                    <Camera className="w-3.5 h-3.5" />
                    <span>{gFotoUrl ? 'Cambiar Foto' : 'Subir Vale'}</span>
                  </button>
                </div>
              </div>

              </div>

              <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex items-center justify-end gap-2">
                <button type="button" onClick={() => setIsGuardiaModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-600">
                  Cancelar
                </button>
                <button type="submit" disabled={savingGuardia} className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{savingGuardia ? 'Guardando...' : editingGuardia ? 'Actualizar Pago' : 'Confirmar Pago'}</span>
                </button>
              </div>
            </form>
          </div>

          <FotoUploaderModal
            isOpen={isGuardiaPhotoOpen}
            onClose={() => setIsGuardiaPhotoOpen(false)}
            onPhotoSaved={(url) => setGFotoUrl(url)}
            currentUrl={gFotoUrl}
            titulo="Foto Vale Firmado Guardia"
            categoria="Egresos_Servicios"
            anio={guardiaAnio}
            mes={guardiaMes}
            customName={`Vale_Guardia_${guardiaAnio}-${guardiaMes}_${Date.now()}.jpg`}
          />
        </div>
      )}

      {/* Modal: Cargar / Editar Factura de Luz */}
      {isCargaLuzOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md max-h-[88dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
            <div className="shrink-0 bg-slate-900 px-5 py-3.5 text-white flex items-center justify-between">
              <div className="min-w-0">
                <h3 className="font-bold text-sm sm:text-base truncate">Factura de Luz del Mes</h3>
                <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                  {MESES[guardiaMes]} {guardiaAnio} • Desglose exacto (precio/kWh usa solo Energía)
                </p>
              </div>
              <button type="button" onClick={() => setIsCargaLuzOpen(false)} className="p-1.5 text-slate-300 hover:text-white shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCargaLuz} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
                <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200 space-y-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 block">
                    Desglose de Factura de Luz (Centavos exactos)
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Consumo Energía (Bs) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        required
                        value={luzEnergiaInput}
                        onChange={(e) => setLuzEnergiaInput(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Alumbrado Público (Bs)
                      </label>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        value={luzAlumbradoInput}
                        onChange={(e) => setLuzAlumbradoInput(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Recojo de Basura (Bs)
                      </label>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        value={luzBasuraInput}
                        onChange={(e) => setLuzBasuraInput(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Total kWh Consumidos <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0.01"
                        required
                        value={luzKwhInput}
                        onChange={(e) => setLuzKwhInput(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-bold"
                      />
                    </div>
                  </div>
                  <div className="pt-2 border-t border-amber-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-amber-950 block">Total Factura de Luz:</span>
                      <span className="text-[10px] text-amber-700">Precio/kWh: {precioKwhModal} Bs</span>
                    </div>
                    <span className="text-base font-extrabold text-amber-800">{totalFacturaLuzModal.toFixed(2)} Bs</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-600">Foto Factura de Luz (Drive):</span>
                  <div className="flex items-center gap-2">
                    {fotoFacturaLuzInput && (
                      <a href={fotoFacturaLuzInput} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                        Ver
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsPhotoFacturaLuzOpen(true)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold text-slate-700 flex items-center gap-1"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>{fotoFacturaLuzInput ? 'Cambiar Foto' : 'Subir Factura'}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex items-center justify-end gap-2">
                <button type="button" onClick={() => setIsCargaLuzOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-600">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingCargaLuz}
                  className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingCargaLuz ? 'Guardando...' : 'Guardar Factura'}</span>
                </button>
              </div>
            </form>
          </div>

          <FotoUploaderModal
            isOpen={isPhotoFacturaLuzOpen}
            onClose={() => setIsPhotoFacturaLuzOpen(false)}
            onPhotoSaved={(url) => setFotoFacturaLuzInput(url)}
            currentUrl={fotoFacturaLuzInput}
            titulo={`Factura de Luz ${MESES[guardiaMes]} ${guardiaAnio}`}
            categoria="Facturas_Generales"
            anio={guardiaAnio}
            mes={guardiaMes}
            customName={`Factura_Luz_${guardiaAnio}-${guardiaMes}.jpg`}
          />
        </div>
      )}

      {/* Modal: Registrar Pago de Factura de Luz */}
      {isPagoLuzOpen && periodoFijo && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md max-h-[88dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
            <div className="shrink-0 bg-slate-900 px-5 py-3.5 text-white flex items-center justify-between">
              <div className="min-w-0">
                <h3 className="font-bold text-sm sm:text-base truncate">Registrar Pago de Factura de Luz</h3>
                <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                  {MESES[guardiaMes]} {guardiaAnio} • Total: {parseFloat(periodoFijo.factura_luz_bs || 0).toFixed(2)} Bs
                </p>
              </div>
              <button type="button" onClick={() => setIsPagoLuzOpen(false)} className="p-1.5 text-slate-300 hover:text-white shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmarPagoLuz} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                Se marcará la factura como <strong>Pagada</strong> y se creará el egreso automático en{' '}
                <strong>Caja Servicios</strong> por <strong>{parseFloat(periodoFijo.factura_luz_bs || 0).toFixed(2)} Bs</strong>.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha Real de Pago</label>
                <input
                  type="date"
                  required
                  value={fechaPagoLuz}
                  onChange={(e) => setFechaPagoLuz(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Método de Pago</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setMetodoPagoLuz('efectivo')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${
                      metodoPagoLuz === 'efectivo'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-50 text-slate-700 border-slate-300'
                    }`}
                  >
                    <Coins className="w-4 h-4" />
                    <span>Efectivo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMetodoPagoLuz('qr')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${
                      metodoPagoLuz === 'qr'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-50 text-slate-700 border-slate-300'
                    }`}
                  >
                    <QrCode className="w-4 h-4" />
                    <span>QR / Banco</span>
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-600">Comprobante Pagado (Drive):</span>
                <div className="flex items-center gap-2">
                  {fotoPagoLuz && (
                    <a href={fotoPagoLuz} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                      Ver
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsPhotoLuzOpen(true)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold text-slate-700 flex items-center gap-1"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>{fotoPagoLuz ? 'Cambiar Foto' : 'Subir Comprobante'}</span>
                  </button>
                </div>
              </div>

              </div>

              <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex items-center justify-end gap-2">
                <button type="button" onClick={() => setIsPagoLuzOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-600">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingLuzPago}
                  className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{savingLuzPago ? 'Registrando...' : 'Confirmar Pago de Luz'}</span>
                </button>
              </div>
            </form>
          </div>

          <FotoUploaderModal
            isOpen={isPhotoLuzOpen}
            onClose={() => setIsPhotoLuzOpen(false)}
            onPhotoSaved={(url) => setFotoPagoLuz(url)}
            currentUrl={fotoPagoLuz}
            titulo="Comprobante de Pago Factura de Luz"
            categoria="Facturas_Generales"
            anio={guardiaAnio}
            mes={guardiaMes}
            customName={`Pago_Factura_Luz_${guardiaAnio}-${guardiaMes}.jpg`}
          />
        </div>
      )}

      {/* Modal: Cargar / Editar Factura de Agua (Pendiente de Pago) */}
      {isCargaAguaOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md max-h-[88dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
            <div className="shrink-0 bg-slate-900 px-5 py-3.5 text-white flex items-center justify-between">
              <div className="min-w-0">
                <h3 className="font-bold text-sm sm:text-base truncate">Factura de Agua del Mes</h3>
                <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                  {MESES[guardiaMes]} {guardiaAnio} • Queda en Pendiente de Pago (sin descontar caja)
                </p>
              </div>
              <button type="button" onClick={() => setIsCargaAguaOpen(false)} className="p-1.5 text-slate-300 hover:text-white shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCargaAgua} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
              <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-200 space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-900 block">
                  Desglose de Factura de Agua (Centavos exactos)
                </span>
                <div className="space-y-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Servicio de Agua Potable (Bs) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      required
                      value={aguaPotableInput}
                      onChange={(e) => setAguaPotableInput(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Servicio de Alcantarillado Sanitario (Bs)
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      value={aguaAlcantarilladoInput}
                      onChange={(e) => setAguaAlcantarilladoInput(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Aporte de Socio (Bs)
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      value={aguaAporteSocioInput}
                      onChange={(e) => setAguaAporteSocioInput(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-bold"
                    />
                  </div>
                </div>
                <div className="pt-2 border-t border-blue-200 flex items-center justify-between text-xs">
                  <span className="font-bold text-blue-950">Total Factura de Agua:</span>
                  <span className="text-base font-extrabold text-blue-700">{totalFacturaAguaModal.toFixed(2)} Bs</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-600">Foto Factura de Agua (Drive):</span>
                <div className="flex items-center gap-2">
                  {fotoFacturaAguaInput && (
                    <a href={fotoFacturaAguaInput} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                      Ver
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsPhotoFacturaAguaOpen(true)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold text-slate-700 flex items-center gap-1"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>{fotoFacturaAguaInput ? 'Cambiar Foto' : 'Subir Factura'}</span>
                  </button>
                </div>
              </div>

              </div>

              <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex items-center justify-end gap-2">
                <button type="button" onClick={() => setIsCargaAguaOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-600">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingCargaAgua}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingCargaAgua ? 'Guardando...' : 'Guardar Factura'}</span>
                </button>
              </div>
            </form>
          </div>

          <FotoUploaderModal
            isOpen={isPhotoFacturaAguaOpen}
            onClose={() => setIsPhotoFacturaAguaOpen(false)}
            onPhotoSaved={(url) => setFotoFacturaAguaInput(url)}
            currentUrl={fotoFacturaAguaInput}
            titulo={`Factura de Agua ${MESES[guardiaMes]} ${guardiaAnio}`}
            categoria="Facturas_Generales"
            anio={guardiaAnio}
            mes={guardiaMes}
            customName={`Factura_Agua_${guardiaAnio}-${guardiaMes}.jpg`}
          />
        </div>
      )}

      {/* Modal: Registrar Pago de Factura de Agua */}
      {isPagoAguaOpen && periodoFijo && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md max-h-[88dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
            <div className="shrink-0 bg-slate-900 px-5 py-3.5 text-white flex items-center justify-between">
              <div className="min-w-0">
                <h3 className="font-bold text-sm sm:text-base truncate">Registrar Pago de Factura de Agua</h3>
                <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                  {MESES[guardiaMes]} {guardiaAnio} • Total: {parseFloat(periodoFijo.factura_agua_bs || 0).toFixed(2)} Bs
                </p>
              </div>
              <button type="button" onClick={() => setIsPagoAguaOpen(false)} className="p-1.5 text-slate-300 hover:text-white shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmarPagoAgua} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900">
                Se marcará la factura como <strong>Pagada</strong> y se creará el egreso automático en{' '}
                <strong>Caja Servicios</strong> (categoría <em>Factura de Agua</em>) por{' '}
                <strong>{parseFloat(periodoFijo.factura_agua_bs || 0).toFixed(2)} Bs</strong>.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha Real de Pago</label>
                <input
                  type="date"
                  required
                  value={fechaPagoAgua}
                  onChange={(e) => setFechaPagoAgua(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Método de Pago</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setMetodoPagoAgua('efectivo')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${
                      metodoPagoAgua === 'efectivo'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-50 text-slate-700 border-slate-300'
                    }`}
                  >
                    <Coins className="w-4 h-4" />
                    <span>Efectivo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMetodoPagoAgua('qr')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${
                      metodoPagoAgua === 'qr'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-50 text-slate-700 border-slate-300'
                    }`}
                  >
                    <QrCode className="w-4 h-4" />
                    <span>QR / Banco</span>
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-600">Comprobante Pagado (Drive):</span>
                <div className="flex items-center gap-2">
                  {fotoPagoAgua && (
                    <a href={fotoPagoAgua} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                      Ver
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsPhotoPagoAguaOpen(true)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold text-slate-700 flex items-center gap-1"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>{fotoPagoAgua ? 'Cambiar Foto' : 'Subir Comprobante'}</span>
                  </button>
                </div>
              </div>

              </div>

              <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex items-center justify-end gap-2">
                <button type="button" onClick={() => setIsPagoAguaOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-600">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingPagoAgua}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{savingPagoAgua ? 'Registrando...' : 'Confirmar Pago de Agua'}</span>
                </button>
              </div>
            </form>
          </div>

          <FotoUploaderModal
            isOpen={isPhotoPagoAguaOpen}
            onClose={() => setIsPhotoPagoAguaOpen(false)}
            onPhotoSaved={(url) => setFotoPagoAgua(url)}
            currentUrl={fotoPagoAgua}
            titulo="Comprobante de Pago Factura de Agua"
            categoria="Facturas_Generales"
            anio={guardiaAnio}
            mes={guardiaMes}
            customName={`Pago_Factura_Agua_${guardiaAnio}-${guardiaMes}.jpg`}
          />
        </div>
      )}

      <ConfirmMotivoModal
        isOpen={confirmState.open}
        onClose={() => setConfirmState({ open: false, tipo: 'edicion', entity: null, target: null, advertencia: '' })}
        onConfirm={handleConfirmAudit}
        tipo={confirmState.tipo}
        titulo={
          confirmState.entity === 'luz'
            ? 'Editar Factura de Luz'
            : confirmState.entity === 'egreso'
            ? confirmState.tipo === 'eliminacion'
              ? 'Eliminar Egreso'
              : 'Editar Egreso'
            : confirmState.entity === 'guardia'
            ? confirmState.tipo === 'eliminacion'
              ? 'Eliminar Pago de Guardia'
              : 'Editar Pago de Guardia'
            : 'Editar Sueldo Mensual del Guardia'
        }
        descripcion="Se guardará el snapshot completo en bitacora_auditoria antes de aplicar la modificación."
        advertencia={confirmState.advertencia}
        loading={saving || savingGuardia || savingSueldo || savingCargaLuz}
      />
    </div>
  )
}
