import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { registrarAuditoria, registrarEdicionAuditoria, registrarEliminacionAuditoria } from '../../lib/auditoria'
import { getLocalDateStr } from '../../lib/formatters'
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
  Trash2
} from 'lucide-react'

export default function DeudoresView() {
  const { user, isAdmin } = useAuth()
  const [deudas, setDeudas] = useState([])
  const [socios, setSocios] = useState([])
  const [loading, setLoading] = useState(true)
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
      const [{ data: dData, error: dErr }, { data: sData }] = await Promise.all([
        supabase
          .from('deudores_ciclos')
          .select(`
            *,
            pagos_deudores_ciclos (*)
          `)
          .order('created_at', { ascending: false }),
        supabase.from('socios').select('id, nombre, unidades_cobro(numero_identificador)').order('nombre'),
      ])

      if (dErr) throw dErr
      setDeudas(dData || [])
      setSocios(sData || [])
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-slate-900">Deudores Heredados y de Ciclos</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
              Auditoría Activa
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Deudas heredadas, saldos arrastrados de rendiciones y corrección auditada de registros.
          </p>
        </div>

        <div className="flex items-center gap-2">
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

      {/* Modal Agregar / Editar Deuda */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md my-8 overflow-hidden">
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">
                  {editingDeuda ? 'Editar Deuda (Auditado)' : 'Registrar Deudor Heredado'}
                </h3>
                <p className="text-xs text-slate-400">Deuda de gestión anterior o ciclo cerrado</p>
              </div>
              <button onClick={() => setIsNewModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400 hover:text-white" />
              </button>
            </div>

            <form onSubmit={handleSaveNuevaDeuda} className="p-6 space-y-4">
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
                  <input type="number" step="0.50" min="0.50" required value={montoOriginal} onChange={(e) => setMontoOriginal(e.target.value)} className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-bold" />
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

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button type="button" onClick={() => setIsNewModalOpen(false)} className="px-4 py-2 text-xs text-slate-600">
                  Cancelar
                </button>
                <button type="submit" disabled={savingDeuda} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold">
                  {savingDeuda ? 'Guardando...' : editingDeuda ? 'Actualizar Deuda' : 'Guardar Deuda'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Registrar / Editar Pago */}
      {selectedDeudaPago && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md my-8 overflow-hidden">
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">{editingPagoDeuda ? 'Editar Abono (Auditado)' : 'Cobrar Deuda de Ciclo'}</h3>
                <p className="text-xs text-slate-400">
                  {selectedDeudaPago.nombre_deudor} • Caja {selectedDeudaPago.caja}
                </p>
              </div>
              <button onClick={() => setSelectedDeudaPago(null)}>
                <X className="w-5 h-5 text-slate-400 hover:text-white" />
              </button>
            </div>

            <form onSubmit={handleRegistrarPago} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Monto (Bs)</label>
                  <input type="number" step="0.50" min="0.50" required value={pagoMonto} onChange={(e) => setPagoMonto(e.target.value)} className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-bold" />
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

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button type="button" onClick={() => setSelectedDeudaPago(null)} className="px-4 py-2 text-xs text-slate-600">
                  Cancelar
                </button>
                <button type="submit" disabled={savingPago} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg my-8 overflow-hidden">
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Historial de Abonos</h3>
                <p className="text-xs text-slate-400">
                  {selectedDeudaHist.nombre_deudor} • {selectedDeudaHist.detalle_deuda}
                </p>
              </div>
              <button onClick={() => setSelectedDeudaHist(null)}>
                <X className="w-5 h-5 text-slate-400 hover:text-white" />
              </button>
            </div>

            <div className="p-6 space-y-3 max-h-[70vh] overflow-y-auto">
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
