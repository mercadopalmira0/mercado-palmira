import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { registrarAuditoria, registrarEdicionAuditoria, registrarEliminacionAuditoria } from '../../lib/auditoria'
import { getLocalDateStr } from '../../lib/formatters'
import { buildMatrizDeudores, round2 } from '../../lib/calculosRendicion'
import ConfirmMotivoModal from '../modals/ConfirmMotivoModal'
import {
  UserX,
  PlusCircle,
  Search,
  RefreshCw,
  Coins,
  QrCode,
  CheckCircle2,
  X,
  ShieldAlert,
  History,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronRight,
  Layers,
  AlertCircle
} from 'lucide-react'

export default function DeudoresView() {
  const { user, isAdmin } = useAuth()
  const [activeTab, setActiveTab] = useState('consolidado') // 'consolidado' | 'heredados'
  const [deudas, setDeudas] = useState([])
  const [cobrosServiciosPend, setCobrosServiciosPend] = useState([])
  const [cobrosExternosPend, setCobrosExternosPend] = useState([])
  const [afiliacionesPend, setAfiliacionesPend] = useState([])
  const [cobrosExtrasPend, setCobrosExtrasPend] = useState([])
  const [socios, setSocios] = useState([])
  const [loading, setLoading] = useState(true)
  const [consolidadoSearch, setConsolidadoSearch] = useState('')
  const [consolidadoFilter, setConsolidadoFilter] = useState('todos') // 'todos' | 'mensual' | 'heredado' | 'afiliacion'
  const [expandedConsolidado, setExpandedConsolidado] = useState({})
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCaja, setFilterCaja] = useState('todos')
  const [filterOrigen, setFilterOrigen] = useState('todos')
  const [filterEstado, setFilterEstado] = useState('activos')
  const [statusMessage, setStatusMessage] = useState(null)

  // Modal Agregar / Editar Deuda
  const [isNewModalOpen, setIsNewModalOpen] = useState(false)
  const [editingDeuda, setEditingDeuda] = useState(null)
  const [selectedSocioId, setSelectedSocioId] = useState('')
  const [nombreDeudor, setNombreDeudor] = useState('')
  const [puestoRef, setPuestoRef] = useState('')
  const [caja, setCaja] = useState('servicios')
  const [cicloOrigen, setCicloOrigen] = useState('Tesorero Anterior')
  const [detalleDeuda, setDetalleDeuda] = useState('')
  const [montoOriginal, setMontoOriginal] = useState('')
  const [savingDeuda, setSavingDeuda] = useState(false)

  // Modal Registrar / Editar Pago
  const [selectedDeudaPago, setSelectedDeudaPago] = useState(null)
  const [editingPagoDeuda, setEditingPagoDeuda] = useState(null)
  const [pagoMonto, setPagoMonto] = useState('')
  const [pagoMetodo, setPagoMetodo] = useState('efectivo')
  const [pagoTalonario, setPagoTalonario] = useState('')
  const [pagoFecha, setPagoFecha] = useState(getLocalDateStr())
  const [pagoObs, setPagoObs] = useState('')
  const [savingPago, setSavingPago] = useState(false)

  // Modal Historial de Pagos & Anulación
  const [selectedDeudaHist, setSelectedDeudaHist] = useState(null)
  const [anulandoPagoId, setAnulandoPagoId] = useState(null)
  const [motivoAnulPago, setMotivoAnulPago] = useState('')

  // Anular deuda completa
  const [anulandoDeudaId, setAnulandoDeudaId] = useState(null)
  const [motivoAnulDeuda, setMotivoAnulDeuda] = useState('')

  // Confirmación auditada
  const [confirmState, setConfirmState] = useState({
    open: false,
    tipo: 'edicion',
    entity: null, // 'deuda' | 'pago'
    target: null,
    advertencia: '',
  })

  const fetchData = async () => {
    setLoading(true)
    setStatusMessage(null)
    try {
      const [
        { data: dData, error: dErr },
        { data: sData },
        { data: csData, error: csErr },
        { data: ceData, error: ceErr },
        { data: afData, error: afErr },
        { data: extCuotasData, error: extCuotasErr },
      ] = await Promise.all([
        supabase
          .from('deudores_ciclos')
          .select(`
            *,
            socios (id, nombre, telefono),
            pagos_deudores_ciclos (*)
          `)
          .order('created_at', { ascending: false }),
        supabase.from('socios').select('id, nombre, unidades_cobro(numero_identificador)').order('nombre'),
        supabase
          .from('cobros_servicios')
          .select(`
            id, unidad_id, total_a_pagar, monto_multa, estado, cantidad_puestos_aplicada,
            socio_id_historico, nombre_socio_historico,
            periodos_mensuales (mes, anio),
            unidades_cobro (
              id, numero_identificador, cantidad_puestos, socio_responsable_id,
              socios (id, nombre, telefono)
            ),
            pagos_servicios (id, monto, estado)
          `)
          .in('estado', ['pendiente', 'parcial']),
        supabase
          .from('cobros_externos')
          .select(`
            id, externo_id, anio, mes, monto_correspondiente, monto_pagado, anulado,
            aportantes_externos (id, nombre_completo, referencia_ubicacion)
          `)
          .eq('anulado', false),
        supabase
          .from('afiliaciones')
          .select(`
            id, socio_id, monto_total, cuota_acordada, saldo_pendiente, estado,
            socios (id, nombre, telefono),
            pagos_afiliacion (id, monto, estado)
          `)
          .neq('estado', 'anulada')
          .gt('saldo_pendiente', 0),
        supabase
          .from('cobros_extras_cuotas')
          .select(`
            id, campana_id, unidad_id, externo_id, nombre_titular, puesto_referencia, cantidad_puestos, monto_esperado, monto_pagado, estado,
            cobros_extras_campanas (id, nombre, estado),
            unidades_cobro (id, numero_identificador, socio_responsable_id, socios (id, nombre, telefono)),
            aportantes_externos (id, nombre_completo, telefono)
          `)
          .in('estado', ['pendiente', 'parcial']),
      ])

      if (dErr) throw dErr
      if (csErr) throw csErr
      if (ceErr) throw ceErr
      if (afErr) throw afErr
      if (extCuotasErr) throw extCuotasErr

      setDeudas(dData || [])
      setSocios(sData || [])
      setCobrosServiciosPend(csData || [])
      setCobrosExternosPend(ceData || [])
      setAfiliacionesPend(afData || [])
      setCobrosExtrasPend(extCuotasData || [])
    } catch (err) {
      console.error(err)
      setStatusMessage({ type: 'error', text: 'Error al cargar deudores: ' + err.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const recalcularDeuda = async (deudaId, montoOrigRef) => {
    const { data: activePagos, error: rErr } = await supabase
      .from('pagos_deudores_ciclos')
      .select('monto')
      .eq('deuda_id', deudaId)
      .eq('anulado', false)
    if (rErr) throw rErr

    const totalPagado = (activePagos || []).reduce((s, p) => s + (parseFloat(p.monto) || 0), 0)
    const orig = parseFloat(montoOrigRef) || 0
    const nuevoEstado = totalPagado >= orig && orig > 0 ? 'pagado' : totalPagado > 0 ? 'parcial' : 'pendiente'

    await supabase
      .from('deudores_ciclos')
      .update({ monto_pagado: totalPagado, estado: nuevoEstado })
      .eq('id', deudaId)
  }

  const handleSelectSocio = (socioId) => {
    setSelectedSocioId(socioId)
    if (!socioId) return
    const socio = socios.find((s) => s.id === socioId)
    if (socio) {
      setNombreDeudor(socio.nombre)
      setPuestoRef(socio.unidades_cobro?.[0]?.numero_identificador || '')
    }
  }

  const openNewDeudaModal = () => {
    setEditingDeuda(null)
    setSelectedSocioId('')
    setNombreDeudor('')
    setPuestoRef('')
    setCaja('servicios')
    setCicloOrigen('Tesorero Anterior')
    setDetalleDeuda('')
    setMontoOriginal('')
    setIsNewModalOpen(true)
  }

  const openEditDeudaModal = (deuda) => {
    setEditingDeuda(deuda)
    setSelectedSocioId(deuda.socio_id || '')
    setNombreDeudor(deuda.nombre_deudor || '')
    setPuestoRef(deuda.puesto_referencia || '')
    setCaja(deuda.caja || 'servicios')
    setCicloOrigen(deuda.ciclo_origen || 'Tesorero Anterior')
    setDetalleDeuda(deuda.detalle_deuda || '')
    setMontoOriginal(String(deuda.monto_original ?? ''))
    setIsNewModalOpen(true)
  }

  const handleSaveNuevaDeuda = async (e) => {
    e.preventDefault()
    const montoNum = parseFloat(montoOriginal)
    if (!nombreDeudor.trim() || !detalleDeuda.trim() || !montoNum || montoNum <= 0) {
      setStatusMessage({ type: 'error', text: 'Completa nombre, detalle y monto mayor a 0.' })
      return
    }

    if (editingDeuda) {
      setConfirmState({ open: true, tipo: 'edicion', entity: 'deuda', target: editingDeuda, advertencia: '' })
      return
    }

    setSavingDeuda(true)
    try {
      const payload = {
        socio_id: selectedSocioId || null,
        nombre_deudor: nombreDeudor.trim(),
        puesto_referencia: puestoRef.trim() || null,
        caja,
        origen: 'tesorero_anterior',
        ciclo_origen: cicloOrigen.trim() || 'Tesorero Anterior',
        detalle_deuda: detalleDeuda.trim(),
        monto_original: montoNum,
        monto_pagado: 0,
        estado: 'pendiente',
      }

      const { data, error } = await supabase.from('deudores_ciclos').insert([payload]).select().single()
      if (error) throw error

      await registrarAuditoria({
        usuarioId: user?.id,
        accion: 'ALTA_DEUDOR_HEREDADO',
        detalleJson: {
          descripcion: `Deudor heredado registrado: ${payload.nombre_deudor} (${montoNum.toFixed(2)} Bs - Caja ${caja})`,
          tabla: 'deudores_ciclos',
          registro_id: data?.id,
          ...payload,
        },
      })

      setStatusMessage({ type: 'success', text: `Deuda de "${payload.nombre_deudor}" registrada correctamente.` })
      setIsNewModalOpen(false)
      await fetchData()
    } catch (err) {
      console.error(err)
      setStatusMessage({ type: 'error', text: 'Error al registrar deudor: ' + err.message })
    } finally {
      setSavingDeuda(false)
    }
  }

  const openPagoModal = (deuda) => {
    const saldo = Math.max(0, (parseFloat(deuda.monto_original) || 0) - (parseFloat(deuda.monto_pagado) || 0))
    setEditingPagoDeuda(null)
    setSelectedDeudaPago(deuda)
    setPagoMonto(saldo > 0 ? saldo.toFixed(2) : '')
    setPagoMetodo('efectivo')
    setPagoTalonario('')
    setPagoFecha(getLocalDateStr())
    setPagoObs('')
  }

  const openEditPagoModal = (deuda, pago) => {
    setEditingPagoDeuda(pago)
    setSelectedDeudaPago(deuda)
    setPagoMonto(String(pago.monto))
    setPagoMetodo(pago.metodo_pago || 'efectivo')
    setPagoTalonario(pago.nro_talonario_fisico || '')
    setPagoFecha(pago.fecha_pago || getLocalDateStr())
    setPagoObs(pago.observaciones || '')
  }

  const handleRegistrarPago = async (e) => {
    e.preventDefault()
    if (!selectedDeudaPago) return
    const montoNum = parseFloat(pagoMonto)
    if (!montoNum || montoNum <= 0) {
      setStatusMessage({ type: 'error', text: 'Ingresa un monto válido mayor a 0.' })
      return
    }

    if (editingPagoDeuda) {
      setConfirmState({ open: true, tipo: 'edicion', entity: 'pago', target: editingPagoDeuda, advertencia: '' })
      return
    }

    setSavingPago(true)
    try {
      const { error: pErr } = await supabase.from('pagos_deudores_ciclos').insert([
        {
          deuda_id: selectedDeudaPago.id,
          monto: montoNum,
          metodo_pago: pagoMetodo,
          nro_talonario_fisico: pagoTalonario.trim() || null,
          fecha_pago: pagoFecha || getLocalDateStr(),
          observaciones: pagoObs.trim() || null,
          anulado: false,
        },
      ])
      if (pErr) throw pErr

      await recalcularDeuda(selectedDeudaPago.id, selectedDeudaPago.monto_original)

      await registrarAuditoria({
        usuarioId: user?.id,
        accion: 'PAGO_DEUDOR_CICLO',
        detalleJson: {
          descripcion: `Cobro de ${montoNum.toFixed(2)} Bs a ${selectedDeudaPago.nombre_deudor} (Caja ${selectedDeudaPago.caja})`,
          tabla: 'pagos_deudores_ciclos',
          deuda_id: selectedDeudaPago.id,
          monto: montoNum,
          metodo_pago: pagoMetodo,
          caja: selectedDeudaPago.caja,
        },
      })

      setStatusMessage({
        type: 'success',
        text: `Pago de ${montoNum.toFixed(2)} Bs sumado a Caja ${selectedDeudaPago.caja === 'servicios' ? 'Servicios' : 'Afiliaciones'}.`,
      })
      setSelectedDeudaPago(null)
      await fetchData()
    } catch (err) {
      console.error(err)
      setStatusMessage({ type: 'error', text: 'Error al registrar pago: ' + err.message })
    } finally {
      setSavingPago(false)
    }
  }

  const handleAnularPago = async (pago) => {
    if (!motivoAnulPago.trim()) {
      setStatusMessage({ type: 'error', text: 'El motivo de anulación es obligatorio.' })
      return
    }

    try {
      const { error: pErr } = await supabase
        .from('pagos_deudores_ciclos')
        .update({
          anulado: true,
          motivo_anulacion: motivoAnulPago.trim(),
        })
        .eq('id', pago.id)
      if (pErr) throw pErr

      await recalcularDeuda(selectedDeudaHist.id, selectedDeudaHist.monto_original)

      await registrarAuditoria({
        usuarioId: user?.id,
        accion: 'ANULACION_PAGO_DEUDOR',
        detalleJson: {
          descripcion: `Anulación de pago de ${pago.monto} Bs de ${selectedDeudaHist.nombre_deudor}`,
          tabla: 'pagos_deudores_ciclos',
          registro_id: pago.id,
          deuda_id: selectedDeudaHist.id,
          motivo: motivoAnulPago.trim(),
        },
      })

      setStatusMessage({ type: 'success', text: 'Pago anulado y saldo de la deuda recalculado.' })
      setAnulandoPagoId(null)
      setMotivoAnulPago('')
      setSelectedDeudaHist(null)
      await fetchData()
    } catch (err) {
      console.error(err)
      setStatusMessage({ type: 'error', text: 'Error al anular pago: ' + err.message })
    }
  }

  const handleAnularDeuda = async (deudaId) => {
    if (!motivoAnulDeuda.trim()) {
      setStatusMessage({ type: 'error', text: 'El motivo de anulación es obligatorio.' })
      return
    }

    try {
      const { error } = await supabase
        .from('deudores_ciclos')
        .update({
          estado: 'anulado',
          motivo_anulacion: motivoAnulDeuda.trim(),
        })
        .eq('id', deudaId)
      if (error) throw error

      await registrarAuditoria({
        usuarioId: user?.id,
        accion: 'ANULACION_DEUDOR_CICLO',
        detalleJson: {
          descripcion: `Anulación de registro de deuda ${deudaId}`,
          tabla: 'deudores_ciclos',
          registro_id: deudaId,
          motivo: motivoAnulDeuda.trim(),
        },
      })

      setStatusMessage({ type: 'success', text: 'Deuda marcada como anulada.' })
      setAnulandoDeudaId(null)
      setMotivoAnulDeuda('')
      await fetchData()
    } catch (err) {
      console.error(err)
      setStatusMessage({ type: 'error', text: 'Error al anular deuda: ' + err.message })
    }
  }

  const handleConfirmAudit = async (motivo) => {
    const { tipo, entity, target } = confirmState
    if (!target) return
    setSavingDeuda(true)
    setSavingPago(true)

    try {
      if (entity === 'deuda' && tipo === 'edicion') {
        const montoNum = parseFloat(montoOriginal)
        const pagado = parseFloat(target.monto_pagado) || 0
        const nuevoEstado =
          target.estado === 'anulado'
            ? 'anulado'
            : pagado >= montoNum
            ? 'pagado'
            : pagado > 0
            ? 'parcial'
            : 'pendiente'

        const datosNuevos = {
          socio_id: selectedSocioId || null,
          nombre_deudor: nombreDeudor.trim(),
          puesto_referencia: puestoRef.trim() || null,
          caja,
          ciclo_origen: cicloOrigen.trim() || 'Tesorero Anterior',
          detalle_deuda: detalleDeuda.trim(),
          monto_original: montoNum,
          estado: nuevoEstado,
        }

        await registrarEdicionAuditoria({
          usuarioId: user?.id,
          modulo: 'Deudores de Ciclos',
          tabla: 'deudores_ciclos',
          registroId: target.id,
          motivo,
          resumen: `Edición de deuda de "${target.nombre_deudor}"`,
          datosAnteriores: {
            socio_id: target.socio_id,
            nombre_deudor: target.nombre_deudor,
            puesto_referencia: target.puesto_referencia,
            caja: target.caja,
            ciclo_origen: target.ciclo_origen,
            detalle_deuda: target.detalle_deuda,
            monto_original: target.monto_original,
            estado: target.estado,
          },
          datosNuevos,
        })

        const { error } = await supabase.from('deudores_ciclos').update(datosNuevos).eq('id', target.id)
        if (error) throw error

        setIsNewModalOpen(false)
        setEditingDeuda(null)
        setStatusMessage({ type: 'success', text: 'Deuda actualizada y auditada en bitácora.' })
      } else if (entity === 'deuda' && tipo === 'eliminacion') {
        await registrarEliminacionAuditoria({
          usuarioId: user?.id,
          modulo: 'Deudores de Ciclos',
          tabla: 'deudores_ciclos',
          registroId: target.id,
          motivo,
          resumen: `Eliminación de deuda de "${target.nombre_deudor}" (${target.monto_original} Bs)`,
          datosAnteriores: target,
        })

        const { error } = await supabase.from('deudores_ciclos').delete().eq('id', target.id)
        if (error) throw error

        setStatusMessage({ type: 'success', text: `Deuda de "${target.nombre_deudor}" eliminada y auditada.` })
      } else if (entity === 'pago' && tipo === 'edicion') {
        const montoNum = parseFloat(pagoMonto)
        const datosNuevos = {
          monto: montoNum,
          metodo_pago: pagoMetodo,
          nro_talonario_fisico: pagoTalonario.trim() || null,
          fecha_pago: pagoFecha || getLocalDateStr(),
          observaciones: pagoObs.trim() || null,
        }

        await registrarEdicionAuditoria({
          usuarioId: user?.id,
          modulo: 'Pagos de Deudores',
          tabla: 'pagos_deudores_ciclos',
          registroId: target.id,
          motivo,
          resumen: `Edición de abono de ${selectedDeudaPago?.nombre_deudor}`,
          datosAnteriores: {
            monto: target.monto,
            metodo_pago: target.metodo_pago,
            nro_talonario_fisico: target.nro_talonario_fisico,
            fecha_pago: target.fecha_pago,
            observaciones: target.observaciones,
          },
          datosNuevos,
        })

        const { error } = await supabase.from('pagos_deudores_ciclos').update(datosNuevos).eq('id', target.id)
        if (error) throw error

        await recalcularDeuda(selectedDeudaPago.id, selectedDeudaPago.monto_original)
        setSelectedDeudaPago(null)
        setEditingPagoDeuda(null)
        setSelectedDeudaHist(null)
        setStatusMessage({ type: 'success', text: 'Abono editado, deuda recalculada y auditada.' })
      } else if (entity === 'pago' && tipo === 'eliminacion') {
        await registrarEliminacionAuditoria({
          usuarioId: user?.id,
          modulo: 'Pagos de Deudores',
          tabla: 'pagos_deudores_ciclos',
          registroId: target.id,
          motivo,
          resumen: `Eliminación de abono (${target.monto} Bs) de ${selectedDeudaHist?.nombre_deudor}`,
          datosAnteriores: target,
        })

        const { error } = await supabase.from('pagos_deudores_ciclos').delete().eq('id', target.id)
        if (error) throw error

        await recalcularDeuda(selectedDeudaHist.id, selectedDeudaHist.monto_original)
        setSelectedDeudaHist(null)
        setStatusMessage({ type: 'success', text: 'Abono eliminado y saldo recalculado con auditoría.' })
      }

      setConfirmState({ open: false, tipo: 'edicion', entity: null, target: null, advertencia: '' })
      await fetchData()
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message })
      setConfirmState({ open: false, tipo: 'edicion', entity: null, target: null, advertencia: '' })
    } finally {
      setSavingDeuda(false)
      setSavingPago(false)
    }
  }

  const filteredDeudas = deudas.filter((d) => {
    const term = searchTerm.toLowerCase()
    const matchesSearch =
      !term ||
      d.nombre_deudor?.toLowerCase().includes(term) ||
      d.puesto_referencia?.toLowerCase().includes(term) ||
      d.detalle_deuda?.toLowerCase().includes(term)
    if (!matchesSearch) return false
    if (filterCaja !== 'todos' && d.caja !== filterCaja) return false
    if (filterOrigen !== 'todos' && d.origen !== filterOrigen) return false
    if (filterEstado === 'activos') return d.estado === 'pendiente' || d.estado === 'parcial'
    if (filterEstado === 'pagado') return d.estado === 'pagado'
    if (filterEstado === 'anulado') return d.estado === 'anulado'
    return true
  })

  const deudasActivas = deudas.filter((d) => d.estado !== 'anulado')
  const saldoServiciosPend = deudasActivas
    .filter((d) => d.caja === 'servicios')
    .reduce((s, d) => s + Math.max(0, (parseFloat(d.monto_original) || 0) - (parseFloat(d.monto_pagado) || 0)), 0)
  const saldoAfiliacionesPend = deudasActivas
    .filter((d) => d.caja === 'afiliaciones')
    .reduce((s, d) => s + Math.max(0, (parseFloat(d.monto_original) || 0) - (parseFloat(d.monto_pagado) || 0)), 0)
  const totalRecuperado = deudasActivas.reduce((s, d) => s + (parseFloat(d.monto_pagado) || 0), 0)

  const deudasPorId = useMemo(() => {
    const map = new Map()
    deudas.forEach((d) => map.set(d.id, d))
    return map
  }, [deudas])

  const matrizConsolidada = useMemo(
    () =>
      buildMatrizDeudores({
        cobrosServicios: cobrosServiciosPend,
        cobrosExternos: cobrosExternosPend,
        deudoresCiclos: deudas,
        afiliaciones: afiliacionesPend,
        cobrosExtrasCuotas: cobrosExtrasPend,
        origenCobroServicioDefault: 'Mes pendiente',
      }),
    [cobrosServiciosPend, cobrosExternosPend, deudas, afiliacionesPend, cobrosExtrasPend]
  )

  const resumenConsolidadoFiltrado = useMemo(() => {
    const q = consolidadoSearch.trim().toLowerCase()
    return (matrizConsolidada.resumenPorDeudor || []).filter((d) => {
      if (consolidadoFilter === 'mensual' && !d.tieneMensual && !d.tieneExterno) return false
      if (consolidadoFilter === 'heredado' && !d.tieneHeredado) return false
      if (consolidadoFilter === 'afiliacion' && !d.tieneAfiliacion) return false
      if (consolidadoFilter === 'cobro_extra' && !d.tieneCobroExtra) return false
      if (!q) return true
      return (
        String(d.nombre || '').toLowerCase().includes(q) ||
        String(d.puestoRef || '').toLowerCase().includes(q) ||
        d.items.some(
          (it) =>
            String(it.detalle || '').toLowerCase().includes(q) ||
            String(it.puesto || '').toLowerCase().includes(q)
        )
      )
    })
  }, [matrizConsolidada, consolidadoSearch, consolidadoFilter])

  const totalesConsolidadoFiltrado = useMemo(() => {
    const totalOriginal = round2(
      resumenConsolidadoFiltrado.reduce(
        (s, d) => s + d.items.reduce((si, it) => si + it.montoEsperado, 0),
        0
      )
    )
    const totalAbonado = round2(
      resumenConsolidadoFiltrado.reduce(
        (s, d) => s + d.items.reduce((si, it) => si + it.abonado, 0),
        0
      )
    )
    const totalMultas = round2(resumenConsolidadoFiltrado.reduce((s, d) => s + d.multas, 0))
    const totalACobrar = round2(resumenConsolidadoFiltrado.reduce((s, d) => s + d.totalACobrar, 0))
    const cantidadItems = resumenConsolidadoFiltrado.reduce((s, d) => s + d.cantidadItems, 0)
    return {
      cantidadDeudores: resumenConsolidadoFiltrado.length,
      cantidadItems,
      totalOriginal,
      totalAbonado,
      totalMultas,
      totalACobrar,
    }
  }, [resumenConsolidadoFiltrado])

  const toggleExpandConsolidado = (groupKey) => {
    setExpandedConsolidado((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }))
  }

  const getOrigenLabelDetalle = (fuente) => {
    if (fuente === 'mensual') return 'Mes pendiente'
    if (fuente === 'heredado') return 'Heredado'
    if (fuente === 'externo') return 'Externo'
    if (fuente === 'cobro_extra') return 'Cobro Extra'
    return 'Afiliación'
  }

  const getOrigenBadgeClass = (fuente) => {
    if (fuente === 'mensual') return 'bg-red-100 text-red-800 border-red-200'
    if (fuente === 'heredado') return 'bg-amber-100 text-amber-900 border-amber-200'
    if (fuente === 'externo') return 'bg-indigo-100 text-indigo-800 border-indigo-200'
    if (fuente === 'cobro_extra') return 'bg-purple-100 text-purple-800 border-purple-200'
    return 'bg-blue-100 text-blue-800 border-blue-200'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Central de Deudas</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
              Auditoría Activa
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Consolidado general de todas las fuentes pendientes del mercado y gestión auditada de deudas heredadas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchData}
            title="Recargar deudores"
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
          {isAdmin && (
            <button
              onClick={openNewDeudaModal}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Agregar Deudor Heredado</span>
            </button>
          )}
        </div>
      </div>

      {/* Pestañas internas */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('consolidado')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
            activeTab === 'consolidado'
              ? 'bg-red-700 text-white border-red-700 shadow-sm'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Consolidado General ({matrizConsolidada.totales.cantidadDeudores})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('heredados')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
            activeTab === 'heredados'
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <AlertCircle className="w-4 h-4" />
          <span>Heredados y de Ciclos ({deudas.filter((d) => d.estado === 'pendiente' || d.estado === 'parcial').length})</span>
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

      {activeTab === 'consolidado' ? (
        <div className="space-y-6">
          {/* Tarjetas KPI Consolidado General */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-4 border-2 border-red-200 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 block">
                Total General Por Cobrar (Bs)
              </span>
              <p className="text-2xl font-black text-red-600 mt-1">
                {matrizConsolidada.totales.totalACobrar.toFixed(2)}{' '}
                <span className="text-xs font-bold">Bs</span>
              </p>
              <span className="text-[11px] text-slate-500 font-medium block">
                {matrizConsolidada.totales.cantidadDeudores}{' '}
                {matrizConsolidada.totales.cantidadDeudores === 1 ? 'persona con deuda' : 'personas con deuda'} •{' '}
                {matrizConsolidada.totales.cantidadItems} ítems
              </span>
              {(matrizConsolidada.totales.totalCobrosExtras || 0) > 0 && (
                <span className="text-[10px] font-bold text-purple-700 block mt-0.5">
                  Incluye {matrizConsolidada.totales.totalCobrosExtras.toFixed(2)} Bs de Cobros Extras
                </span>
              )}
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                Servicios Mensuales y Externos (Bs)
              </span>
              <p className="text-xl font-bold text-slate-900 mt-1">
                {matrizConsolidada.totales.totalMensualesYExternos.toFixed(2)}{' '}
                <span className="text-xs font-normal text-slate-500">Bs</span>
              </p>
              <span className="text-[11px] text-slate-400">
                Cobros mensuales + aportantes externos
              </span>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
                Deudas Heredadas / Ciclos (Bs)
              </span>
              <p className="text-xl font-bold text-slate-900 mt-1">
                {matrizConsolidada.totales.totalHeredados.toFixed(2)}{' '}
                <span className="text-xs font-normal text-slate-500">Bs</span>
              </p>
              <span className="text-[11px] text-slate-400">
                Saldos arrastrados y tesorero anterior
              </span>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">
                Afiliaciones Pendientes (Bs)
              </span>
              <p className="text-xl font-bold text-slate-900 mt-1">
                {matrizConsolidada.totales.totalAfiliaciones.toFixed(2)}{' '}
                <span className="text-xs font-normal text-slate-500">Bs</span>
              </p>
              <span className="text-[11px] text-slate-400">
                Planes de afiliación con saldo activo
              </span>
            </div>
          </div>

          {/* Buscador y Filtros Rápidos */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={consolidadoSearch}
                onChange={(e) => setConsolidadoSearch(e.target.value)}
                placeholder="Buscar por nombre, N° puesto o detalle de deuda..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              {[
                { id: 'todos', label: 'Todos' },
                { id: 'mensual', label: 'Con Deuda Mensual' },
                { id: 'heredado', label: 'Con Deuda Heredada' },
                { id: 'afiliacion', label: 'Con Afiliación' },
                { id: 'cobro_extra', label: 'Con Cobro Extra' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setConsolidadoFilter(opt.id)}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    consolidadoFilter === opt.id
                      ? 'bg-white text-slate-900 shadow-sm font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Lista Consolidada por Persona */}
          {loading ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
              <RefreshCw className="w-8 h-8 mx-auto animate-spin text-red-600 mb-2" />
              <p className="text-xs text-slate-500">Consolidando todas las fuentes de deuda...</p>
            </div>
          ) : resumenConsolidadoFiltrado.length === 0 ? (
            <div className="p-10 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs space-y-2">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400" />
              <p>No hay deudas pendientes para los filtros seleccionados.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {resumenConsolidadoFiltrado.map((d) => {
                const isExpanded = Boolean(expandedConsolidado[d.groupKey])
                return (
                  <div
                    key={d.groupKey}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
                  >
                    {/* Cabecera de Persona */}
                    <div className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-bold text-sm sm:text-base text-slate-900">
                            {d.nombre}
                          </h4>
                          {d.puestoRef && d.puestoRef !== '-' && (
                            <span className="px-2.5 py-0.5 bg-slate-100 text-slate-800 border border-slate-200 rounded-lg text-[11px] font-bold">
                              {d.puestoRef}
                            </span>
                          )}
                          {d.tieneMensual && (
                            <span className="px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase bg-red-100 text-red-800 border-red-200">
                              Mensual
                            </span>
                          )}
                          {d.tieneExterno && (
                            <span className="px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase bg-indigo-100 text-indigo-800 border-indigo-200">
                              Externo
                            </span>
                          )}
                          {d.tieneHeredado && (
                            <span className="px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase bg-amber-100 text-amber-900 border-amber-200">
                              Heredado
                            </span>
                          )}
                          {d.tieneAfiliacion && (
                            <span className="px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase bg-blue-100 text-blue-800 border-blue-200">
                              Afiliación
                            </span>
                          )}
                          {d.tieneCobroExtra && (
                            <span className="px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase bg-purple-100 text-purple-800 border-purple-200">
                              Cobro Extra
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
                          <span>
                            <strong>{d.cantidadItems}</strong>{' '}
                            {d.cantidadItems === 1 ? 'ítem pendiente' : 'ítems pendientes'}
                          </span>
                          {d.telefono && d.telefono !== '-' && (
                            <span>Tel: {d.telefono}</span>
                          )}
                          {d.multas > 0 && (
                            <span className="text-orange-700 font-semibold">
                              Incluye multas: {d.multas.toFixed(2)} Bs
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between lg:justify-end gap-4 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                        <div className="text-left lg:text-right">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            Total a Cobrar
                          </span>
                          <span className="text-lg sm:text-xl font-black text-red-600 font-mono">
                            {d.totalACobrar.toFixed(2)}{' '}
                            <span className="text-xs font-bold">Bs</span>
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleExpandConsolidado(d.groupKey)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors shrink-0"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                          <span>{isExpanded ? 'Ocultar detalle' : 'Ver detalle'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Acordeón Desplegable */}
                    {isExpanded && (
                      <div className="border-t border-slate-200 bg-slate-50/80 p-3 sm:p-4 space-y-2">
                        <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                          Detalle de conceptos pendientes ({d.cantidadItems})
                        </div>

                        {/* Vista Tabla Desktop */}
                        <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 bg-white">
                          <table className="w-full text-xs text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                                <th className="p-2.5">Origen</th>
                                <th className="p-2.5">Periodo / Detalle</th>
                                <th className="p-2.5 text-right">Monto Original</th>
                                <th className="p-2.5 text-right">Abonado</th>
                                <th className="p-2.5 text-right">Multa</th>
                                <th className="p-2.5 text-right">Saldo Pendiente (Bs)</th>
                                {isAdmin && <th className="p-2.5 text-center">Acción</th>}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {d.items.map((it) => {
                                const deudaCicloObj =
                                  it.fuente === 'heredado' ? deudasPorId.get(it.recordId) : null
                                return (
                                  <tr key={it.id} className="hover:bg-slate-50/80">
                                    <td className="p-2.5 whitespace-nowrap">
                                      <span
                                        className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${getOrigenBadgeClass(
                                          it.fuente
                                        )}`}
                                      >
                                        {getOrigenLabelDetalle(it.fuente)}
                                      </span>
                                    </td>
                                    <td className="p-2.5 text-slate-800">
                                      <span className="font-semibold">{it.detalle}</span>
                                      {it.puesto && it.puesto !== '-' && it.puesto !== d.puestoRef && (
                                        <span className="ml-2 text-[11px] text-slate-500">
                                          ({it.puesto})
                                        </span>
                                      )}
                                    </td>
                                    <td className="p-2.5 text-right font-mono text-slate-700">
                                      {it.montoEsperado.toFixed(2)} Bs
                                    </td>
                                    <td className="p-2.5 text-right font-mono text-emerald-700">
                                      {it.abonado.toFixed(2)} Bs
                                    </td>
                                    <td className="p-2.5 text-right font-mono text-orange-700">
                                      {it.multa > 0 ? `${it.multa.toFixed(2)} Bs` : '—'}
                                    </td>
                                    <td className="p-2.5 text-right font-mono font-extrabold text-red-600">
                                      {it.saldoPendiente.toFixed(2)} Bs
                                    </td>
                                    {isAdmin && (
                                      <td className="p-2.5 text-center whitespace-nowrap">
                                        {deudaCicloObj ? (
                                          <button
                                            type="button"
                                            onClick={() => openPagoModal(deudaCicloObj)}
                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold shadow-sm"
                                          >
                                            <Coins className="w-3.5 h-3.5" />
                                            <span>Cobrar</span>
                                          </button>
                                        ) : (
                                          <span className="text-[11px] text-slate-400">—</span>
                                        )}
                                      </td>
                                    )}
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Vista Tarjetas Móvil */}
                        <div className="md:hidden space-y-2">
                          {d.items.map((it) => {
                            const deudaCicloObj =
                              it.fuente === 'heredado' ? deudasPorId.get(it.recordId) : null
                            return (
                              <div
                                key={it.id}
                                className="bg-white border border-slate-200 rounded-xl p-3 text-xs space-y-2"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="space-y-1 min-w-0">
                                    <span
                                      className={`inline-block px-2 py-0.5 rounded-md border text-[10px] font-bold ${getOrigenBadgeClass(
                                        it.fuente
                                      )}`}
                                    >
                                      {getOrigenLabelDetalle(it.fuente)}
                                    </span>
                                    <p className="font-semibold text-slate-800 break-words">
                                      {it.detalle}
                                    </p>
                                    {it.puesto && it.puesto !== '-' && it.puesto !== d.puestoRef && (
                                      <p className="text-[11px] text-slate-500">{it.puesto}</p>
                                    )}
                                  </div>
                                  <div className="text-right shrink-0">
                                    <span className="text-[10px] text-slate-400 uppercase block">
                                      Saldo
                                    </span>
                                    <span className="font-mono font-extrabold text-red-600 text-sm">
                                      {it.saldoPendiente.toFixed(2)} Bs
                                    </span>
                                  </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-[11px]">
                                  <div>
                                    <span className="text-slate-400 block">Original</span>
                                    <span className="font-mono font-semibold text-slate-700">
                                      {it.montoEsperado.toFixed(2)} Bs
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block">Abonado</span>
                                    <span className="font-mono font-semibold text-emerald-700">
                                      {it.abonado.toFixed(2)} Bs
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block">Multa</span>
                                    <span className="font-mono font-semibold text-orange-700">
                                      {it.multa > 0 ? `${it.multa.toFixed(2)} Bs` : '—'}
                                    </span>
                                  </div>
                                </div>

                                {isAdmin && deudaCicloObj && (
                                  <div className="pt-1 flex justify-end">
                                    <button
                                      type="button"
                                      onClick={() => openPagoModal(deudaCicloObj)}
                                      className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm"
                                    >
                                      <Coins className="w-3.5 h-3.5" />
                                      <span>Cobrar</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Barra / Fila Final de Totales Filtrados */}
              <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Totales del Consolidado Filtrado
                  </span>
                  <p className="text-sm font-bold mt-0.5">
                    {totalesConsolidadoFiltrado.cantidadDeudores}{' '}
                    {totalesConsolidadoFiltrado.cantidadDeudores === 1 ? 'deudor' : 'deudores'} •{' '}
                    {totalesConsolidadoFiltrado.cantidadItems}{' '}
                    {totalesConsolidadoFiltrado.cantidadItems === 1 ? 'ítem' : 'ítems'}
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">Original</span>
                    <span className="font-mono font-bold">
                      {totalesConsolidadoFiltrado.totalOriginal.toFixed(2)} Bs
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">Abonado</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {totalesConsolidadoFiltrado.totalAbonado.toFixed(2)} Bs
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">Multas</span>
                    <span className="font-mono font-bold text-amber-300">
                      {totalesConsolidadoFiltrado.totalMultas.toFixed(2)} Bs
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-red-300 uppercase block font-bold">
                      Total Por Cobrar
                    </span>
                    <span className="font-mono font-black text-base text-red-400">
                      {totalesConsolidadoFiltrado.totalACobrar.toFixed(2)} Bs
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>

      {/* Tarjetas Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 block">Por Cobrar Total</span>
          <p className="text-xl font-bold text-red-600 mt-1">
            {(saldoServiciosPend + saldoAfiliacionesPend).toFixed(2)} <span className="text-xs font-normal">Bs</span>
          </p>
          <span className="text-[11px] text-slate-400">Suma de saldos pendientes</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">Pendiente Caja Servicios</span>
          <p className="text-xl font-bold text-slate-900 mt-1">
            {saldoServiciosPend.toFixed(2)} <span className="text-xs font-normal text-slate-500">Bs</span>
          </p>
          <span className="text-[11px] text-slate-400">Al cobrarse suma a Servicios</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">Pendiente Caja Afiliaciones</span>
          <p className="text-xl font-bold text-slate-900 mt-1">
            {saldoAfiliacionesPend.toFixed(2)} <span className="text-xs font-normal text-slate-500">Bs</span>
          </p>
          <span className="text-[11px] text-slate-400">Al cobrarse suma a Afiliaciones</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">Total Recuperado</span>
          <p className="text-xl font-bold text-emerald-700 mt-1">
            {totalRecuperado.toFixed(2)} <span className="text-xs font-normal text-slate-500">Bs</span>
          </p>
          <span className="text-[11px] text-slate-400">Abonos recibidos en caja</span>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col lg:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, puesto o detalle de deuda..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select value={filterCaja} onChange={(e) => setFilterCaja(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700">
            <option value="todos">Todas las Cajas</option>
            <option value="servicios">Caja Servicios</option>
            <option value="afiliaciones">Caja Afiliaciones</option>
          </select>

          <select value={filterOrigen} onChange={(e) => setFilterOrigen(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700">
            <option value="todos">Todos los Orígenes</option>
            <option value="tesorero_anterior">Tesorero Anterior</option>
            <option value="cierre_ciclo">Cierre de Ciclo</option>
          </select>

          <select value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700">
            <option value="activos">Pendientes / Parciales</option>
            <option value="pagado">Pagados</option>
            <option value="anulado">Anulados</option>
            <option value="todos">Todos</option>
          </select>
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <RefreshCw className="w-8 h-8 mx-auto animate-spin text-emerald-600 mb-2" />
          <p className="text-xs text-slate-500">Cargando registro de deudores...</p>
        </div>
      ) : filteredDeudas.length === 0 ? (
        <div className="p-10 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs space-y-2">
          <UserX className="w-10 h-10 mx-auto text-slate-300" />
          <p>No existen registros de deudas con los filtros seleccionados.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDeudas.map((d) => {
            const orig = parseFloat(d.monto_original) || 0
            const pag = parseFloat(d.monto_pagado) || 0
            const saldo = Math.max(0, orig - pag)
            const isAnulado = d.estado === 'anulado'
            const isPagado = d.estado === 'pagado'

            return (
              <div
                key={d.id}
                className={`bg-white rounded-2xl p-4 border shadow-sm space-y-2 ${
                  isAnulado ? 'border-red-200 bg-red-50/30 opacity-80' : isPagado ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className={`font-bold text-sm ${isAnulado ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                        {d.nombre_deudor}
                      </h4>
                      {d.puesto_referencia && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-semibold">
                          {d.puesto_referencia}
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          d.caja === 'servicios' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        Caja {d.caja}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                        {d.origen === 'cierre_ciclo' ? `Cierre: ${d.ciclo_origen || 'Ciclo'}` : `Heredado: ${d.ciclo_origen || 'Tesorero Anterior'}`}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          isAnulado ? 'bg-red-100 text-red-700' : isPagado ? 'bg-emerald-100 text-emerald-800' : d.estado === 'parcial' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {d.estado}
                      </span>
                    </div>
                    <p className={`text-xs text-slate-600 ${isAnulado ? 'line-through' : ''}`}>
                      <strong>Detalle:</strong> {d.detalle_deuda}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Original</span>
                      <span className="font-bold text-slate-800">{orig.toFixed(2)} Bs</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Pagado</span>
                      <span className="font-bold text-emerald-700">{pag.toFixed(2)} Bs</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Saldo</span>
                      <span className={`text-base font-extrabold ${saldo > 0 && !isAnulado ? 'text-red-600' : 'text-emerald-700'}`}>
                        {isAnulado ? '0.00' : saldo.toFixed(2)} Bs
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {!isAnulado && !isPagado && isAdmin && (
                        <button
                          type="button"
                          onClick={() => openPagoModal(d)}
                          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1 shadow-sm"
                        >
                          <Coins className="w-3.5 h-3.5" />
                          <span>Cobrar</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDeudaHist(d)
                          setAnulandoPagoId(null)
                          setMotivoAnulPago('')
                        }}
                        className="p-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50"
                        title="Historial de abonos"
                      >
                        <History className="w-4 h-4" />
                      </button>
                      {isAdmin && (
                        <>
                          <button
                            type="button"
                            onClick={() => openEditDeudaModal(d)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl"
                            title="Editar deuda"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {!isAnulado && (
                            <button
                              type="button"
                              onClick={() => {
                                setAnulandoDeudaId(d.id)
                                setMotivoAnulDeuda('')
                              }}
                              className="px-2 py-1.5 text-orange-600 hover:bg-orange-50 rounded-xl font-semibold"
                            >
                              Anular
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmState({
                                open: true,
                                tipo: 'eliminacion',
                                entity: 'deuda',
                                target: d,
                                advertencia:
                                  (d.pagos_deudores_ciclos || []).length > 0
                                    ? `¡Atención! Tiene ${d.pagos_deudores_ciclos.length} abono(s) registrado(s) que también se eliminarán y afectarán el saldo de caja.`
                                    : '',
                              })
                            }
                            className="p-2 text-red-600 hover:bg-red-50 rounded-xl"
                            title="Eliminar deuda cargada por error"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {isAnulado && d.motivo_anulacion && (
                  <p className="text-[11px] text-red-700 bg-red-50 p-2 rounded-lg">
                    <strong>Motivo anulación:</strong> {d.motivo_anulacion}
                  </p>
                )}

                {anulandoDeudaId === d.id && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs">
                    <span className="font-bold text-amber-900 block">Motivo de Anulación Obligatorio</span>
                    <input
                      type="text"
                      value={motivoAnulDeuda}
                      onChange={(e) => setMotivoAnulDeuda(e.target.value)}
                      placeholder="Indica por qué se anula esta deuda..."
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg"
                    />
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setAnulandoDeudaId(null)} className="text-slate-600">
                        Cancelar
                      </button>
                      <button type="button" onClick={() => handleAnularDeuda(d.id)} className="px-3 py-1 bg-red-600 text-white rounded-lg font-bold">
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

      {/* Modal Agregar / Editar Deuda */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md max-h-[88dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
            <div className="shrink-0 bg-slate-900 px-5 py-3.5 text-white flex items-center justify-between">
              <div className="min-w-0">
                <h3 className="font-bold text-sm sm:text-base truncate">
                  {editingDeuda ? 'Editar Deuda (Auditado)' : 'Registrar Deudor Heredado'}
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-400 truncate">Deuda de gestión anterior o ciclo cerrado</p>
              </div>
              <button type="button" onClick={() => setIsNewModalOpen(false)} className="p-1.5 text-slate-300 hover:text-white shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNuevaDeuda} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Vincular con Socio Existente (Opcional)</label>
                  <select value={selectedSocioId} onChange={(e) => handleSelectSocio(e.target.value)} className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl">
                    <option value="">-- Ingresar manualmente / Deudor externo --</option>
                    {socios.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nombre} {s.unidades_cobro?.[0]?.numero_identificador ? `(${s.unidades_cobro[0].numero_identificador})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre / Socio *</label>
                    <input type="text" required value={nombreDeudor} onChange={(e) => setNombreDeudor(e.target.value)} className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Puesto Referencia</label>
                    <input type="text" value={puestoRef} onChange={(e) => setPuestoRef(e.target.value)} className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Caja Destino</label>
                    <select value={caja} onChange={(e) => setCaja(e.target.value)} className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-bold">
                      <option value="servicios">Caja Servicios</option>
                      <option value="afiliaciones">Caja Afiliaciones</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Monto Adeudado (Bs)</label>
                    <input type="number" inputMode="decimal" step="0.01" min="0.01" required value={montoOriginal} onChange={(e) => setMontoOriginal(e.target.value)} className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-bold" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ciclo / Gestión Origen</label>
                  <input type="text" value={cicloOrigen} onChange={(e) => setCicloOrigen(e.target.value)} className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Detalle / Meses Adeudados *</label>
                  <textarea rows={2} required value={detalleDeuda} onChange={(e) => setDetalleDeuda(e.target.value)} className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl" />
                </div>
              </div>

              <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex items-center justify-end gap-2">
                <button type="button" onClick={() => setIsNewModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-600">
                  Cancelar
                </button>
                <button type="submit" disabled={savingDeuda} className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold">
                  {savingDeuda ? 'Guardando...' : editingDeuda ? 'Actualizar Deuda' : 'Guardar Deuda'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Registrar / Editar Pago */}
      {selectedDeudaPago && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md max-h-[88dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
            <div className="shrink-0 bg-slate-900 px-5 py-3.5 text-white flex items-center justify-between">
              <div className="min-w-0">
                <h3 className="font-bold text-sm sm:text-base truncate">{editingPagoDeuda ? 'Editar Abono (Auditado)' : 'Cobrar Deuda de Ciclo'}</h3>
                <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                  {selectedDeudaPago.nombre_deudor} • Caja {selectedDeudaPago.caja}
                </p>
              </div>
              <button type="button" onClick={() => setSelectedDeudaPago(null)} className="p-1.5 text-slate-300 hover:text-white shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegistrarPago} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Monto (Bs)</label>
                    <input type="number" inputMode="decimal" step="0.01" min="0.01" required value={pagoMonto} onChange={(e) => setPagoMonto(e.target.value)} className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-bold" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha de Pago</label>
                    <input type="date" required value={pagoFecha} onChange={(e) => setPagoFecha(e.target.value)} className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Método de Pago</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPagoMetodo('efectivo')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${
                        pagoMetodo === 'efectivo' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 text-slate-700 border-slate-300'
                      }`}
                    >
                      <Coins className="w-4 h-4" />
                      <span>Efectivo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPagoMetodo('qr')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${
                        pagoMetodo === 'qr' ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-700 border-slate-300'
                      }`}
                    >
                      <QrCode className="w-4 h-4" />
                      <span>QR / Banco</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">N° Talonario Físico (Opcional)</label>
                  <input type="text" value={pagoTalonario} onChange={(e) => setPagoTalonario(e.target.value)} className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Observaciones (Opcional)</label>
                  <input type="text" value={pagoObs} onChange={(e) => setPagoObs(e.target.value)} className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl" />
                </div>
              </div>

              <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex items-center justify-end gap-2">
                <button type="button" onClick={() => setSelectedDeudaPago(null)} className="px-4 py-2 text-xs font-semibold text-slate-600">
                  Cancelar
                </button>
                <button type="submit" disabled={savingPago} className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{savingPago ? 'Guardando...' : editingPagoDeuda ? 'Actualizar Abono' : 'Confirmar Pago'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Historial de Abonos */}
      {selectedDeudaHist && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg max-h-[88dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
            <div className="shrink-0 bg-slate-900 px-5 py-3.5 text-white flex items-center justify-between">
              <div className="min-w-0">
                <h3 className="font-bold text-sm sm:text-base truncate">Historial de Abonos</h3>
                <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                  {selectedDeudaHist.nombre_deudor} • {selectedDeudaHist.detalle_deuda}
                </p>
              </div>
              <button type="button" onClick={() => setSelectedDeudaHist(null)} className="p-1.5 text-slate-300 hover:text-white shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-3">
              {(selectedDeudaHist.pagos_deudores_ciclos || []).length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">No hay pagos registrados aún para esta deuda.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {selectedDeudaHist.pagos_deudores_ciclos.map((p) => (
                    <div key={p.id} className="py-3 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className={`font-bold ${p.anulado ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                            {parseFloat(p.monto).toFixed(2)} Bs
                          </span>
                          <span className="text-slate-500 ml-2">
                            ({p.metodo_pago === 'qr' ? 'QR' : 'Efectivo'}) • {p.fecha_pago}
                          </span>
                          {p.nro_talonario_fisico && (
                            <span className="ml-2 font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">
                              Tal. {p.nro_talonario_fisico}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          {p.anulado ? (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-bold">
                              Anulado
                            </span>
                          ) : (
                            isAdmin && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openEditPagoModal(selectedDeudaHist, p)}
                                  className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                  title="Editar abono"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAnulandoPagoId(p.id)
                                    setMotivoAnulPago('')
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
                                  entity: 'pago',
                                  target: p,
                                  advertencia: '',
                                })
                              }
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                              title="Eliminar abono"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {p.anulado && p.motivo_anulacion && (
                        <p className="text-[11px] text-red-700 bg-red-50 p-2 rounded">Motivo: {p.motivo_anulacion}</p>
                      )}

                      {anulandoPagoId === p.id && (
                        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                          <span className="font-bold text-amber-900 flex items-center gap-1">
                            <ShieldAlert className="w-3.5 h-3.5" /> Motivo obligatorio
                          </span>
                          <input
                            type="text"
                            value={motivoAnulPago}
                            onChange={(e) => setMotivoAnulPago(e.target.value)}
                            placeholder="Motivo de anulación del pago..."
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                          />
                          <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setAnulandoPagoId(null)} className="text-slate-600">
                              Cancelar
                            </button>
                            <button type="button" onClick={() => handleAnularPago(p)} className="px-3 py-1 bg-red-600 text-white rounded-lg font-bold">
                              Confirmar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex justify-end">
              <button type="button" onClick={() => setSelectedDeudaHist(null)} className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 rounded-xl">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmMotivoModal
        isOpen={confirmState.open}
        onClose={() => setConfirmState({ open: false, tipo: 'edicion', entity: null, target: null, advertencia: '' })}
        onConfirm={handleConfirmAudit}
        tipo={confirmState.tipo}
        titulo={
          confirmState.entity === 'deuda'
            ? confirmState.tipo === 'eliminacion'
              ? 'Eliminar Deuda de Ciclo'
              : 'Editar Deuda de Ciclo'
            : confirmState.tipo === 'eliminacion'
            ? 'Eliminar Abono de Deuda'
            : 'Editar Abono de Deuda'
        }
        descripcion={
          confirmState.target
            ? `${confirmState.tipo === 'eliminacion' ? 'Se eliminará' : 'Se actualizará'} el registro y se guardará el historial en bitacora_auditoria.`
            : ''
        }
        advertencia={confirmState.advertencia}
        loading={savingDeuda || savingPago}
      />
    </div>
  )
}
