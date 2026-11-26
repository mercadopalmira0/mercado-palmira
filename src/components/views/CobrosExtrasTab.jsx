import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { registrarAuditoria } from '../../lib/auditoria'
import { getLocalDateStr, formatResumenGrupo } from '../../lib/formatters'
import { round2 } from '../../lib/calculosRendicion'
import FotoUploaderModal from '../modals/FotoUploaderModal'
import {
  Sparkles,
  PlusCircle,
  Search,
  RefreshCw,
  Coins,
  QrCode,
  CheckCircle2,
  X,
  ShieldAlert,
  History,
  Camera,
  ExternalLink,
  Lock,
  Share2,
  Copy,
  ArrowDownCircle,
  Wallet,
  Calendar,
} from 'lucide-react'

function buildWhatsAppReceiptUrl({ telefono, campanaNombre, cuota, pago }) {
  const saldo = round2(
    Math.max(0, (parseFloat(cuota.monto_esperado) || 0) - (parseFloat(cuota.monto_pagado) || 0))
  )
  const lines = [
    '*SECRETARÍA DE HACIENDA - MERCADO PALMIRA*',
    '*RECIBO DE COBRO EXTRA / CAMPAÑA*',
    `Campaña: ${campanaNombre}`,
    `Titular: ${cuota.nombre_titular}`,
    `Puesto / Ref: ${cuota.puesto_referencia} (${cuota.cantidad_puestos} ${
      cuota.cantidad_puestos === 1 ? 'puesto' : 'puestos'
    })`,
    `Fecha: ${pago.fecha_pago}`,
    `Monto Pagado: *${parseFloat(pago.monto).toFixed(2)} Bs* (${
      pago.metodo_pago === 'qr' ? 'QR / Banco' : 'Efectivo'
    })`,
    pago.nro_talonario_fisico ? `N° Talonario: ${pago.nro_talonario_fisico}` : null,
    `Total Cuota: ${parseFloat(cuota.monto_esperado).toFixed(2)} Bs`,
    `Saldo Pendiente: ${saldo.toFixed(2)} Bs`,
  ].filter(Boolean)

  const text = encodeURIComponent(lines.join('\n'))
  const cleanPhone = String(telefono || '').replace(/\D/g, '')
  if (cleanPhone.length >= 8) {
    const withCode = cleanPhone.startsWith('591') ? cleanPhone : `591${cleanPhone}`
    return `https://wa.me/${withCode}?text=${text}`
  }
  return `https://wa.me/?text=${text}`
}

export default function CobrosExtrasTab({ onCountChange }) {
  const { user, isAdmin } = useAuth()

  const [campanas, setCampanas] = useState([])
  const [selectedCampanaId, setSelectedCampanaId] = useState('')
  const [cuotas, setCuotas] = useState([])
  const [pagos, setPagos] = useState([])
  const [egresos, setEgresos] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingDetalle, setLoadingDetalle] = useState(false)
  const [statusMessage, setStatusMessage] = useState(null)

  // Sub-vistas dentro de campaña: 'cuotas' | 'gastos'
  const [subVista, setSubVista] = useState('cuotas')
  const [searchCuotas, setSearchCuotas] = useState('')
  const [filterCuotas, setFilterCuotas] = useState('todos') // 'todos' | 'pendientes' | 'pagados'

  // Modal Nueva Campaña
  const [isNewCampanaOpen, setIsNewCampanaOpen] = useState(false)
  const [campNombre, setCampNombre] = useState('')
  const [campDescripcion, setCampDescripcion] = useState('')
  const [campMontoPuesto, setCampMontoPuesto] = useState('')
  const [campFechaInicio, setCampFechaInicio] = useState(getLocalDateStr())
  const [campFechaLimite, setCampFechaLimite] = useState('')
  const [campIncluyeAmbulantes, setCampIncluyeAmbulantes] = useState(false)
  const [campIncluyeExternos, setCampIncluyeExternos] = useState(false)
  const [savingCampana, setSavingCampana] = useState(false)

  // Modal Cobrar Cuota
  const [selectedCuotaPago, setSelectedCuotaPago] = useState(null)
  const [pagoMonto, setPagoMonto] = useState('')
  const [pagoMetodo, setPagoMetodo] = useState('efectivo')
  const [pagoTalonario, setPagoTalonario] = useState('')
  const [pagoFecha, setPagoFecha] = useState(getLocalDateStr())
  const [pagoObs, setPagoObs] = useState('')
  const [savingPago, setSavingPago] = useState(false)
  const [ultimoRecibo, setUltimoRecibo] = useState(null)
  const [copiedReceipt, setCopiedReceipt] = useState(false)

  // Modal Historial Cuota & Anulación
  const [selectedCuotaHist, setSelectedCuotaHist] = useState(null)
  const [anulandoPagoId, setAnulandoPagoId] = useState(null)
  const [motivoAnulPago, setMotivoAnulPago] = useState('')
  const [anulandoCuotaId, setAnulandoCuotaId] = useState(null)
  const [motivoAnulCuota, setMotivoAnulCuota] = useState('')

  // Modal Gasto de Campaña
  const [isNewGastoOpen, setIsNewGastoOpen] = useState(false)
  const [gastoDesc, setGastoDesc] = useState('')
  const [gastoMonto, setGastoMonto] = useState('')
  const [gastoMetodo, setGastoMetodo] = useState('efectivo')
  const [gastoFecha, setGastoFecha] = useState(getLocalDateStr())
  const [gastoObs, setGastoObs] = useState('')
  const [gastoFotoUrl, setGastoFotoUrl] = useState('')
  const [isGastoPhotoOpen, setIsGastoPhotoOpen] = useState(false)
  const [savingGasto, setSavingGasto] = useState(false)
  const [anulandoGastoId, setAnulandoGastoId] = useState(null)
  const [motivoAnulGasto, setMotivoAnulGasto] = useState('')

  // Modal Cerrar Campaña y Transferir Sobrante
  const [isCerrarModalOpen, setIsCerrarModalOpen] = useState(false)
  const [cierreOpcion, setCierreOpcion] = useState('informativo') // 'informativo' | 'servicios' | 'afiliaciones'
  const [cierreFecha, setCierreFecha] = useState(getLocalDateStr())
  const [closingCampana, setClosingCampana] = useState(false)

  // Anular campaña completa
  const [isAnularCampanaOpen, setIsAnularCampanaOpen] = useState(false)
  const [motivoAnulCampana, setMotivoAnulCampana] = useState('')

  const fetchCampanas = async (preferId = null) => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('cobros_extras_campanas')
        .select('*')
        .neq('estado', 'anulada')
        .order('created_at', { ascending: false })

      if (error) throw error
      const list = data || []
      setCampanas(list)
      if (onCountChange) {
        onCountChange(list.filter((c) => c.estado === 'abierta').length)
      }

      if (preferId && list.some((c) => c.id === preferId)) {
        setSelectedCampanaId(preferId)
      } else if (selectedCampanaId && list.some((c) => c.id === selectedCampanaId)) {
        // mantener selección actual
      } else {
        const abierta = list.find((c) => c.estado === 'abierta') || list[0]
        setSelectedCampanaId(abierta ? abierta.id : '')
      }
    } catch (err) {
      console.error(err)
      setStatusMessage({ type: 'error', text: 'Error al cargar campañas: ' + err.message })
    } finally {
      setLoading(false)
    }
  }

  const fetchDetalleCampana = async (campanaId) => {
    if (!campanaId) {
      setCuotas([])
      setPagos([])
      setEgresos([])
      return
    }
    setLoadingDetalle(true)
    try {
      const [
        { data: cuData, error: cuErr },
        { data: pData, error: pErr },
        { data: eData, error: eErr },
      ] = await Promise.all([
        supabase
          .from('cobros_extras_cuotas')
          .select(`
            *,
            unidades_cobro (id, numero_identificador, socios (id, nombre, telefono)),
            aportantes_externos (id, nombre_completo, telefono)
          `)
          .eq('campana_id', campanaId)
          .order('puesto_referencia', { ascending: true }),
        supabase
          .from('pagos_cobros_extras')
          .select('*')
          .eq('campana_id', campanaId)
          .order('created_at', { ascending: false }),
        supabase
          .from('egresos_cobros_extras')
          .select('*')
          .eq('campana_id', campanaId)
          .order('fecha_egreso', { ascending: false }),
      ])

      if (cuErr) throw cuErr
      if (pErr) throw pErr
      if (eErr) throw eErr

      setCuotas(cuData || [])
      setPagos(pData || [])
      setEgresos(eData || [])
    } catch (err) {
      console.error(err)
      setStatusMessage({ type: 'error', text: 'Error al cargar detalle de campaña: ' + err.message })
    } finally {
      setLoadingDetalle(false)
    }
  }

  useEffect(() => {
    fetchCampanas()
  }, [])

  useEffect(() => {
    fetchDetalleCampana(selectedCampanaId)
  }, [selectedCampanaId])

  const campanaActual = useMemo(
    () => campanas.find((c) => c.id === selectedCampanaId) || null,
    [campanas, selectedCampanaId]
  )

  const kpis = useMemo(() => {
    const pagosActivos = pagos.filter((p) => !p.anulado)
    const recaudadoEf = round2(
      pagosActivos
        .filter((p) => p.metodo_pago === 'efectivo')
        .reduce((s, p) => s + (parseFloat(p.monto) || 0), 0)
    )
    const recaudadoQr = round2(
      pagosActivos
        .filter((p) => p.metodo_pago === 'qr')
        .reduce((s, p) => s + (parseFloat(p.monto) || 0), 0)
    )
    const totalRecaudado = round2(recaudadoEf + recaudadoQr)

    const cuotasActivas = cuotas.filter((c) => c.estado !== 'anulado')
    const cuotasPagadas = cuotasActivas.filter((c) => c.estado === 'pagado').length
    const porCobrar = round2(
      cuotasActivas.reduce(
        (s, c) =>
          s + Math.max(0, (parseFloat(c.monto_esperado) || 0) - (parseFloat(c.monto_pagado) || 0)),
        0
      )
    )

    const egresosActivos = egresos.filter((e) => !e.anulado)
    const gastadoEf = round2(
      egresosActivos
        .filter((e) => e.metodo_pago === 'efectivo')
        .reduce((s, e) => s + (parseFloat(e.monto) || 0), 0)
    )
    const gastadoQr = round2(
      egresosActivos
        .filter((e) => e.metodo_pago === 'qr')
        .reduce((s, e) => s + (parseFloat(e.monto) || 0), 0)
    )
    const totalGastado = round2(gastadoEf + gastadoQr)
    const saldoDisponible = round2(totalRecaudado - totalGastado)

    return {
      recaudadoEf,
      recaudadoQr,
      totalRecaudado,
      cuotasPagadas,
      totalCuotasActivas: cuotasActivas.length,
      porCobrar,
      gastadoEf,
      gastadoQr,
      totalGastado,
      saldoDisponible,
    }
  }, [cuotas, pagos, egresos])

  const filteredCuotas = useMemo(() => {
    const q = searchCuotas.trim().toLowerCase()
    return cuotas.filter((c) => {
      const matchesSearch =
        !q ||
        String(c.nombre_titular || '').toLowerCase().includes(q) ||
        String(c.puesto_referencia || '').toLowerCase().includes(q)
      if (!matchesSearch) return false
      if (filterCuotas === 'pendientes') return c.estado === 'pendiente' || c.estado === 'parcial'
      if (filterCuotas === 'pagados') return c.estado === 'pagado'
      return true
    })
  }, [cuotas, searchCuotas, filterCuotas])

  const openNewCampanaModal = () => {
    setCampNombre('')
    setCampDescripcion('')
    setCampMontoPuesto('')
    setCampFechaInicio(getLocalDateStr())
    setCampFechaLimite('')
    setCampIncluyeAmbulantes(false)
    setCampIncluyeExternos(false)
    setIsNewCampanaOpen(true)
  }

  const handleCreateCampana = async (e) => {
    e.preventDefault()
    const montoPorPuesto = round2(parseFloat(campMontoPuesto))
    if (!campNombre.trim() || !montoPorPuesto || montoPorPuesto <= 0) {
      setStatusMessage({ type: 'error', text: 'Ingresa un nombre y monto por puesto mayor a 0.' })
      return
    }

    setSavingCampana(true)
    setStatusMessage(null)
    try {
      // 1. Crear campaña
      const campanaPayload = {
        nombre: campNombre.trim(),
        descripcion: campDescripcion.trim() || null,
        monto_por_puesto: montoPorPuesto,
        incluye_ambulantes: campIncluyeAmbulantes,
        incluye_externos: campIncluyeExternos,
        fecha_inicio: campFechaInicio || getLocalDateStr(),
        fecha_limite: campFechaLimite || null,
        estado: 'abierta',
      }

      const { data: nuevaCamp, error: cErr } = await supabase
        .from('cobros_extras_campanas')
        .insert([campanaPayload])
        .select()
        .single()
      if (cErr) throw cErr

      // 2. Generar cuotas por unidades activas principales (grupo_padre_id IS NULL)
      const [{ data: uData, error: uErr }, extRes] = await Promise.all([
        supabase
          .from('unidades_cobro')
          .select('*, socios(id, nombre)')
          .eq('activo', true)
          .order('numero_identificador'),
        campIncluyeExternos
          ? supabase.from('aportantes_externos').select('*').eq('activo', true).order('nombre_completo')
          : Promise.resolve({ data: [], error: null }),
      ])

      if (uErr) throw uErr
      if (extRes.error) throw extRes.error

      const todasUnidades = uData || []
      const hijosPorPadre = {}
      todasUnidades.forEach((u) => {
        if (u.grupo_padre_id) {
          if (!hijosPorPadre[u.grupo_padre_id]) hijosPorPadre[u.grupo_padre_id] = []
          hijosPorPadre[u.grupo_padre_id].push(u)
        }
      })

      const principales = todasUnidades.filter((u) => {
        if (u.grupo_padre_id) return false
        if (!campIncluyeAmbulantes && u.subtipo_fijo === 'ambulante') return false
        return true
      })

      const cuotasPayload = principales.map((u) => {
        const hijos = hijosPorPadre[u.id] || []
        const resumen = formatResumenGrupo(u, hijos)
        const cantidadPuestos = Math.max(1, parseInt(u.cantidad_puestos, 10) || 1 + hijos.length)
        const puestoRef =
          hijos.length > 0 ? resumen.puestosLabel : u.numero_identificador || 'Sin puesto'
        const nombreTitular =
          hijos.length > 0 ? resumen.sociosLabel : u.socios?.nombre || 'Sin socio'

        return {
          campana_id: nuevaCamp.id,
          unidad_id: u.id,
          externo_id: null,
          nombre_titular: nombreTitular,
          puesto_referencia: puestoRef,
          cantidad_puestos: cantidadPuestos,
          monto_esperado: round2(montoPorPuesto * cantidadPuestos),
          monto_pagado: 0,
          estado: 'pendiente',
        }
      })

      if (campIncluyeExternos) {
        ;(extRes.data || []).forEach((ext) => {
          cuotasPayload.push({
            campana_id: nuevaCamp.id,
            unidad_id: null,
            externo_id: ext.id,
            nombre_titular: ext.nombre_completo,
            puesto_referencia: ext.referencia_ubicacion
              ? `Externo (${ext.referencia_ubicacion})`
              : 'Externo',
            cantidad_puestos: 1,
            monto_esperado: round2(montoPorPuesto),
            monto_pagado: 0,
            estado: 'pendiente',
          })
        })
      }

      if (cuotasPayload.length > 0) {
        const { error: insErr } = await supabase.from('cobros_extras_cuotas').insert(cuotasPayload)
        if (insErr) throw insErr
      }

      await registrarAuditoria({
        usuarioId: user?.id,
        accion: 'ALTA_CAMPANA_COBRO_EXTRA',
        detalleJson: {
          descripcion: `Campaña extra creada: "${nuevaCamp.nombre}" (${montoPorPuesto.toFixed(2)} Bs/puesto, ${cuotasPayload.length} cuotas generadas)`,
          tabla: 'cobros_extras_campanas',
          registro_id: nuevaCamp.id,
          cuotas_generadas: cuotasPayload.length,
          incluye_ambulantes: campIncluyeAmbulantes,
          incluye_externos: campIncluyeExternos,
        },
      })

      setStatusMessage({
        type: 'success',
        text: `Campaña "${nuevaCamp.nombre}" creada con ${cuotasPayload.length} cuotas generadas automáticamente.`,
      })
      setIsNewCampanaOpen(false)
      await fetchCampanas(nuevaCamp.id)
    } catch (err) {
      console.error(err)
      setStatusMessage({ type: 'error', text: 'Error al crear campaña: ' + err.message })
    } finally {
      setSavingCampana(false)
    }
  }

  const recalcularCuota = async (cuotaId, montoEsperadoRef) => {
    const { data: activePagos, error: pErr } = await supabase
      .from('pagos_cobros_extras')
      .select('monto')
      .eq('cuota_id', cuotaId)
      .eq('anulado', false)
    if (pErr) throw pErr

    const totalPagado = round2(
      (activePagos || []).reduce((s, p) => s + (parseFloat(p.monto) || 0), 0)
    )
    const esperado = round2(parseFloat(montoEsperadoRef) || 0)
    const nuevoEstado =
      totalPagado >= esperado && esperado > 0
        ? 'pagado'
        : totalPagado > 0
        ? 'parcial'
        : 'pendiente'

    const { error: uErr } = await supabase
      .from('cobros_extras_cuotas')
      .update({ monto_pagado: totalPagado, estado: nuevoEstado })
      .eq('id', cuotaId)
    if (uErr) throw uErr

    return { totalPagado, nuevoEstado }
  }

  const openCobrarCuotaModal = (cuota) => {
    const saldo = round2(
      Math.max(0, (parseFloat(cuota.monto_esperado) || 0) - (parseFloat(cuota.monto_pagado) || 0))
    )
    setSelectedCuotaPago(cuota)
    setPagoMonto(saldo > 0 ? saldo.toFixed(2) : '')
    setPagoMetodo('efectivo')
    setPagoTalonario('')
    setPagoFecha(getLocalDateStr())
    setPagoObs('')
    setUltimoRecibo(null)
    setCopiedReceipt(false)
  }

  const handleRegistrarPagoCuota = async (e) => {
    e.preventDefault()
    if (!selectedCuotaPago || !campanaActual) return
    const montoNum = round2(parseFloat(pagoMonto))
    if (!montoNum || montoNum <= 0) {
      setStatusMessage({ type: 'error', text: 'Ingresa un monto válido mayor a 0.' })
      return
    }

    setSavingPago(true)
    try {
      const pagoPayload = {
        cuota_id: selectedCuotaPago.id,
        campana_id: campanaActual.id,
        monto: montoNum,
        metodo_pago: pagoMetodo,
        nro_talonario_fisico: pagoTalonario.trim() || null,
        fecha_pago: pagoFecha || getLocalDateStr(),
        observaciones: pagoObs.trim() || null,
        anulado: false,
      }

      const { data: newPago, error: pErr } = await supabase
        .from('pagos_cobros_extras')
        .insert([pagoPayload])
        .select()
        .single()
      if (pErr) throw pErr

      const { totalPagado } = await recalcularCuota(
        selectedCuotaPago.id,
        selectedCuotaPago.monto_esperado
      )

      await registrarAuditoria({
        usuarioId: user?.id,
        accion: 'PAGO_COBRO_EXTRA',
        detalleJson: {
          descripcion: `Cobro extra de ${montoNum.toFixed(2)} Bs a ${selectedCuotaPago.nombre_titular} (${campanaActual.nombre})`,
          tabla: 'pagos_cobros_extras',
          registro_id: newPago?.id,
          cuota_id: selectedCuotaPago.id,
          campana_id: campanaActual.id,
          monto: montoNum,
          metodo_pago: pagoMetodo,
        },
      })

      const telefono =
        selectedCuotaPago.unidades_cobro?.socios?.telefono ||
        selectedCuotaPago.aportantes_externos?.telefono ||
        ''

      setUltimoRecibo({
        pago: newPago || pagoPayload,
        cuota: { ...selectedCuotaPago, monto_pagado: totalPagado },
        telefono,
      })

      setStatusMessage({
        type: 'success',
        text: `Cobro de ${montoNum.toFixed(2)} Bs registrado en "${campanaActual.nombre}" (Fondo Independiente).`,
      })
      await fetchDetalleCampana(campanaActual.id)
    } catch (err) {
      console.error(err)
      setStatusMessage({ type: 'error', text: 'Error al registrar pago extra: ' + err.message })
    } finally {
      setSavingPago(false)
    }
  }

  const handleAnularPagoCuota = async (pago) => {
    if (!motivoAnulPago.trim()) {
      setStatusMessage({ type: 'error', text: 'El motivo de anulación es obligatorio.' })
      return
    }
    try {
      const { error: uErr } = await supabase
        .from('pagos_cobros_extras')
        .update({ anulado: true, motivo_anulacion: motivoAnulPago.trim() })
        .eq('id', pago.id)
      if (uErr) throw uErr

      await recalcularCuota(selectedCuotaHist.id, selectedCuotaHist.monto_esperado)

      await registrarAuditoria({
        usuarioId: user?.id,
        accion: 'ANULACION_PAGO_COBRO_EXTRA',
        detalleJson: {
          descripcion: `Anulación de pago extra de ${pago.monto} Bs (${selectedCuotaHist.nombre_titular})`,
          tabla: 'pagos_cobros_extras',
          registro_id: pago.id,
          motivo: motivoAnulPago.trim(),
        },
      })

      setStatusMessage({ type: 'success', text: 'Pago anulado y saldo de cuota recalculado.' })
      setAnulandoPagoId(null)
      setMotivoAnulPago('')
      setSelectedCuotaHist(null)
      await fetchDetalleCampana(campanaActual.id)
    } catch (err) {
      console.error(err)
      setStatusMessage({ type: 'error', text: 'Error al anular pago: ' + err.message })
    }
  }

  const handleAnularCuota = async (cuota) => {
    if (!motivoAnulCuota.trim()) {
      setStatusMessage({ type: 'error', text: 'El motivo de anulación de la cuota es obligatorio.' })
      return
    }
    try {
      const { error } = await supabase
        .from('cobros_extras_cuotas')
        .update({ estado: 'anulado', motivo_anulacion: motivoAnulCuota.trim() })
        .eq('id', cuota.id)
      if (error) throw error

      await registrarAuditoria({
        usuarioId: user?.id,
        accion: 'ANULACION_CUOTA_COBRO_EXTRA',
        detalleJson: {
          descripcion: `Anulación de cuota extra de ${cuota.nombre_titular} (${cuota.puesto_referencia})`,
          tabla: 'cobros_extras_cuotas',
          registro_id: cuota.id,
          motivo: motivoAnulCuota.trim(),
        },
      })

      setStatusMessage({ type: 'success', text: 'Cuota marcada como anulada.' })
      setAnulandoCuotaId(null)
      setMotivoAnulCuota('')
      await fetchDetalleCampana(campanaActual.id)
    } catch (err) {
      console.error(err)
      setStatusMessage({ type: 'error', text: 'Error al anular cuota: ' + err.message })
    }
  }

  const openNewGastoModal = () => {
    setGastoDesc('')
    setGastoMonto('')
    setGastoMetodo('efectivo')
    setGastoFecha(getLocalDateStr())
    setGastoObs('')
    setGastoFotoUrl('')
    setIsNewGastoOpen(true)
  }

  const handleSaveGasto = async (e) => {
    e.preventDefault()
    if (!campanaActual) return
    const montoNum = round2(parseFloat(gastoMonto))
    if (!gastoDesc.trim() || !montoNum || montoNum <= 0) {
      setStatusMessage({ type: 'error', text: 'Ingresa descripción y monto mayor a 0.' })
      return
    }

    setSavingGasto(true)
    try {
      const payload = {
        campana_id: campanaActual.id,
        descripcion: gastoDesc.trim(),
        monto: montoNum,
        metodo_pago: gastoMetodo,
        fecha_egreso: gastoFecha || getLocalDateStr(),
        foto_url: gastoFotoUrl || null,
        observaciones: gastoObs.trim() || null,
        anulado: false,
      }

      const { data: newEg, error } = await supabase
        .from('egresos_cobros_extras')
        .insert([payload])
        .select()
        .single()
      if (error) throw error

      await registrarAuditoria({
        usuarioId: user?.id,
        accion: 'ALTA_EGRESO_COBRO_EXTRA',
        detalleJson: {
          descripcion: `Gasto campaña "${campanaActual.nombre}": ${payload.descripcion} (${montoNum.toFixed(2)} Bs - ${gastoMetodo})`,
          tabla: 'egresos_cobros_extras',
          registro_id: newEg?.id,
          campana_id: campanaActual.id,
          monto: montoNum,
        },
      })

      setStatusMessage({ type: 'success', text: 'Gasto de campaña registrado correctamente.' })
      setIsNewGastoOpen(false)
      await fetchDetalleCampana(campanaActual.id)
    } catch (err) {
      console.error(err)
      setStatusMessage({ type: 'error', text: 'Error al registrar gasto: ' + err.message })
    } finally {
      setSavingGasto(false)
    }
  }

  const handleAnularGasto = async (gasto) => {
    if (!motivoAnulGasto.trim()) {
      setStatusMessage({ type: 'error', text: 'El motivo de anulación es obligatorio.' })
      return
    }
    try {
      const { error } = await supabase
        .from('egresos_cobros_extras')
        .update({ anulado: true, motivo_anulacion: motivoAnulGasto.trim() })
        .eq('id', gasto.id)
      if (error) throw error

      await registrarAuditoria({
        usuarioId: user?.id,
        accion: 'ANULACION_EGRESO_COBRO_EXTRA',
        detalleJson: {
          descripcion: `Anulación de gasto "${gasto.descripcion}" (${gasto.monto} Bs) en "${campanaActual?.nombre}"`,
          tabla: 'egresos_cobros_extras',
          registro_id: gasto.id,
          motivo: motivoAnulGasto.trim(),
        },
      })

      setStatusMessage({ type: 'success', text: 'Gasto de campaña anulado con auditoría.' })
      setAnulandoGastoId(null)
      setMotivoAnulGasto('')
      await fetchDetalleCampana(campanaActual.id)
    } catch (err) {
      console.error(err)
      setStatusMessage({ type: 'error', text: 'Error al anular gasto: ' + err.message })
    }
  }

  const handleCerrarCampana = async (e) => {
    e.preventDefault()
    if (!campanaActual) return

    setClosingCampana(true)
    try {
      const sobrante = round2(Math.max(0, kpis.saldoDisponible))
      const transfiere =
        sobrante > 0 && (cierreOpcion === 'servicios' || cierreOpcion === 'afiliaciones')
      const destino = transfiere ? cierreOpcion : null
      const fechaCierreVal = cierreFecha || getLocalDateStr()

      if (transfiere) {
        const { error: mErr } = await supabase.from('movimientos_internos').insert([
          {
            tipo: 'reposicion_prestamo',
            caja_origen: 'externo',
            caja_destino: destino,
            monto: sobrante,
            descripcion: `Traspaso sobrante campaña "${campanaActual.nombre}" (Fondo Independiente)`,
            estado: 'activo',
            fecha: new Date(`${fechaCierreVal}T12:00:00`).toISOString(),
          },
        ])
        if (mErr) throw mErr
      }

      const { error: uErr } = await supabase
        .from('cobros_extras_campanas')
        .update({
          estado: 'cerrada',
          sobrante_transferido: transfiere ? sobrante : 0,
          caja_destino_sobrante: destino,
          fecha_cierre: fechaCierreVal,
        })
        .eq('id', campanaActual.id)
      if (uErr) throw uErr

      await registrarAuditoria({
        usuarioId: user?.id,
        accion: 'CIERRE_CAMPANA_COBRO_EXTRA',
        detalleJson: {
          descripcion: transfiere
            ? `Cierre de campaña "${campanaActual.nombre}" y traspaso de sobrante (${sobrante.toFixed(2)} Bs) a Caja ${destino}`
            : `Cierre informativo de campaña "${campanaActual.nombre}" (sobrante sin transferir: ${sobrante.toFixed(2)} Bs)`,
          tabla: 'cobros_extras_campanas',
          registro_id: campanaActual.id,
          recaudado: kpis.totalRecaudado,
          gastado: kpis.totalGastado,
          sobrante_transferido: transfiere ? sobrante : 0,
          caja_destino_sobrante: destino,
          fecha_cierre: fechaCierreVal,
        },
      })

      setStatusMessage({
        type: 'success',
        text: transfiere
          ? `Campaña cerrada y sobrante de ${sobrante.toFixed(2)} Bs transferido a Caja ${destino === 'servicios' ? 'Servicios' : 'Afiliaciones'}.`
          : `Campaña "${campanaActual.nombre}" cerrada de forma informativa.`,
      })
      setIsCerrarModalOpen(false)
      await fetchCampanas(campanaActual.id)
    } catch (err) {
      console.error(err)
      setStatusMessage({ type: 'error', text: 'Error al cerrar campaña: ' + err.message })
    } finally {
      setClosingCampana(false)
    }
  }

  const handleAnularCampana = async (e) => {
    e.preventDefault()
    if (!campanaActual || !motivoAnulCampana.trim()) {
      setStatusMessage({ type: 'error', text: 'El motivo de anulación es obligatorio.' })
      return
    }
    try {
      const { error } = await supabase
        .from('cobros_extras_campanas')
        .update({ estado: 'anulada', motivo_anulacion: motivoAnulCampana.trim() })
        .eq('id', campanaActual.id)
      if (error) throw error

      await registrarAuditoria({
        usuarioId: user?.id,
        accion: 'ANULACION_CAMPANA_COBRO_EXTRA',
        detalleJson: {
          descripcion: `Anulación de campaña extra "${campanaActual.nombre}"`,
          tabla: 'cobros_extras_campanas',
          registro_id: campanaActual.id,
          motivo: motivoAnulCampana.trim(),
        },
      })

      setStatusMessage({ type: 'success', text: 'Campaña marcada como anulada.' })
      setIsAnularCampanaOpen(false)
      setMotivoAnulCampana('')
      await fetchCampanas()
    } catch (err) {
      console.error(err)
      setStatusMessage({ type: 'error', text: 'Error al anular campaña: ' + err.message })
    }
  }

  const handleCopyReceiptText = (recibo) => {
    const saldo = round2(
      Math.max(
        0,
        (parseFloat(recibo.cuota.monto_esperado) || 0) -
          (parseFloat(recibo.cuota.monto_pagado) || 0)
      )
    )
    const texto = [
      'SECRETARÍA DE HACIENDA - MERCADO PALMIRA',
      'RECIBO DE COBRO EXTRA / CAMPAÑA',
      `Campaña: ${campanaActual?.nombre || ''}`,
      `Titular: ${recibo.cuota.nombre_titular}`,
      `Puesto / Ref: ${recibo.cuota.puesto_referencia}`,
      `Fecha: ${recibo.pago.fecha_pago}`,
      `Monto Pagado: ${parseFloat(recibo.pago.monto).toFixed(2)} Bs (${
        recibo.pago.metodo_pago === 'qr' ? 'QR / Banco' : 'Efectivo'
      })`,
      recibo.pago.nro_talonario_fisico ? `N° Talonario: ${recibo.pago.nro_talonario_fisico}` : null,
      `Saldo Pendiente: ${saldo.toFixed(2)} Bs`,
    ]
      .filter(Boolean)
      .join('\n')

    navigator.clipboard?.writeText(texto)
    setCopiedReceipt(true)
    setTimeout(() => setCopiedReceipt(false), 2000)
  }

  return (
    <div className="space-y-4">
      {/* Encabezado de Campañas y Selector */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <span>Cobros Extras / Campañas (Fondo Independiente)</span>
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Campañas extraordinarias (Aguinaldo, Aniversario, etc.). Sus fondos no se mezclan con Caja Servicios ni Afiliaciones hasta el cierre.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fetchCampanas(selectedCampanaId)}
              title="Recargar campañas"
              className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading || loadingDetalle ? 'animate-spin text-amber-600' : ''}`} />
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={openNewCampanaModal}
                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Nueva Campaña de Cobro Extra</span>
              </button>
            )}
          </div>
        </div>

        {/* Selector de campañas */}
        {campanas.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
            {campanas.map((c) => {
              const active = c.id === selectedCampanaId
              const isCerrada = c.estado === 'cerrada'
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCampanaId(c.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${
                    active
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>{c.nombre}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                      isCerrada
                        ? 'bg-slate-200 text-slate-700'
                        : active
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {isCerrada ? 'Cerrada' : 'Abierta'}
                  </span>
                </button>
              )
            })}
          </div>
        )}
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
          <button type="button" onClick={() => setStatusMessage(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <RefreshCw className="w-8 h-8 mx-auto animate-spin text-amber-600 mb-2" />
          <p className="text-xs text-slate-500">Cargando campañas de cobros extras...</p>
        </div>
      ) : !campanaActual ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
          <Sparkles className="w-10 h-10 mx-auto text-amber-400" />
          <h4 className="text-sm font-bold text-slate-800">No hay campañas de cobros extras registradas</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Crea una campaña (ej. Aguinaldo Guardia o Aniversario) para generar automáticamente las cuotas por puesto y administrar su fondo independiente.
          </p>
          {isAdmin && (
            <button
              type="button"
              onClick={openNewCampanaModal}
              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Nueva Campaña de Cobro Extra</span>
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Info de campaña seleccionada + acciones de cierre */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-bold text-sm sm:text-base text-slate-900">{campanaActual.nombre}</h4>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    campanaActual.estado === 'cerrada'
                      ? 'bg-slate-200 text-slate-700'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {campanaActual.estado === 'cerrada' ? 'Cerrada' : 'Abierta'}
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-900 text-[10px] font-bold">
                  {parseFloat(campanaActual.monto_por_puesto).toFixed(2)} Bs / puesto
                </span>
              </div>
              {campanaActual.descripcion && (
                <p className="text-xs text-slate-600">{campanaActual.descripcion}</p>
              )}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Inicio: {campanaActual.fecha_inicio}
                </span>
                {campanaActual.fecha_limite && <span>Límite: {campanaActual.fecha_limite}</span>}
                <span>Ambulantes: {campanaActual.incluye_ambulantes ? 'Sí' : 'No'}</span>
                <span>Externos: {campanaActual.incluye_externos ? 'Sí' : 'No'}</span>
              </div>
            </div>

            {isAdmin && (
              <div className="flex flex-wrap items-center gap-2">
                {campanaActual.estado === 'abierta' && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setCierreOpcion(kpis.saldoDisponible > 0 ? 'servicios' : 'informativo')
                        setCierreFecha(getLocalDateStr())
                        setIsCerrarModalOpen(true)
                      }}
                      className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Cerrar Campaña y Transferir Sobrante</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMotivoAnulCampana('')
                        setIsAnularCampanaOpen(true)
                      }}
                      className="px-3 py-2 text-xs font-semibold text-orange-700 hover:bg-orange-50 border border-orange-200 rounded-xl"
                    >
                      Anular Campaña
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {campanaActual.estado === 'cerrada' && (
            <div className="bg-slate-50 border border-slate-300 rounded-2xl p-3.5 text-xs text-slate-700 flex flex-wrap items-center justify-between gap-2">
              <div>
                <strong>Campaña Cerrada ({campanaActual.fecha_cierre || '-'}):</strong>{' '}
                {campanaActual.caja_destino_sobrante ? (
                  <span>
                    Sobrante de{' '}
                    <strong className="text-emerald-700">
                      {parseFloat(campanaActual.sobrante_transferido || 0).toFixed(2)} Bs
                    </strong>{' '}
                    transferido a{' '}
                    <strong>
                      Caja {campanaActual.caja_destino_sobrante === 'servicios' ? 'Servicios' : 'Afiliaciones'}
                    </strong>
                    .
                  </span>
                ) : (
                  <span>Cierre informativo sin transferencia a cajas.</span>
                )}
              </div>
            </div>
          )}

          {/* 4 Tarjetas KPI del Fondo Independiente */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                Recaudado (Bs)
              </span>
              <p className="text-xl font-black text-slate-900 mt-1">
                {kpis.totalRecaudado.toFixed(2)} <span className="text-xs font-normal text-slate-500">Bs</span>
              </p>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                Ef: {kpis.recaudadoEf.toFixed(2)} • QR: {kpis.recaudadoQr.toFixed(2)}
              </span>
              <span className="text-[11px] font-semibold text-emerald-700 block">
                {kpis.cuotasPagadas} de {kpis.totalCuotasActivas} cuotas pagadas
              </span>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 block">
                Por Cobrar (Bs)
              </span>
              <p className="text-xl font-black text-red-600 mt-1">
                {kpis.porCobrar.toFixed(2)} <span className="text-xs font-normal">Bs</span>
              </p>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Saldos pendientes de esta campaña
              </span>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
                Gastado (Bs)
              </span>
              <p className="text-xl font-black text-slate-900 mt-1">
                {kpis.totalGastado.toFixed(2)} <span className="text-xs font-normal text-slate-500">Bs</span>
              </p>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                Ef: {kpis.gastadoEf.toFixed(2)} • QR: {kpis.gastadoQr.toFixed(2)}
              </span>
            </div>

            <div className="bg-emerald-50/60 rounded-2xl p-4 border border-emerald-200 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                Saldo Disponible / Sobrante (Bs)
              </span>
              <p className="text-xl font-black text-emerald-700 mt-1">
                {kpis.saldoDisponible.toFixed(2)} <span className="text-xs font-bold">Bs</span>
              </p>
              <span className="text-[11px] text-emerald-700 block mt-0.5">
                Recaudado - Gastado (Fondo independiente)
              </span>
            </div>
          </div>

          {/* Sub-vistas: Lista de Cuotas vs Gastos de la Campaña */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
              <button
                type="button"
                onClick={() => setSubVista('cuotas')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  subVista === 'cuotas'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>Lista de Cuotas ({cuotas.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setSubVista('gastos')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  subVista === 'gastos'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <ArrowDownCircle className="w-3.5 h-3.5" />
                <span>Gastos de la Campaña ({egresos.filter((e) => !e.anulado).length})</span>
              </button>
            </div>

            {subVista === 'gastos' && isAdmin && campanaActual.estado === 'abierta' && (
              <button
                type="button"
                onClick={openNewGastoModal}
                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Registrar Gasto de Campaña</span>
              </button>
            )}
          </div>

          {subVista === 'cuotas' ? (
            <div className="space-y-4">
              {/* Buscador y Filtros Cuotas */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={searchCuotas}
                    onChange={(e) => setSearchCuotas(e.target.value)}
                    placeholder="Buscar por titular o N° puesto..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold w-full sm:w-auto">
                  {[
                    { id: 'todos', label: 'Todos' },
                    { id: 'pendientes', label: 'Pendientes / Parciales' },
                    { id: 'pagados', label: 'Pagados' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setFilterCuotas(opt.id)}
                      className={`px-3 py-1.5 rounded-lg transition-all ${
                        filterCuotas === opt.id
                          ? 'bg-white text-slate-900 shadow-sm font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {loadingDetalle ? (
                <div className="p-10 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500">
                  Cargando cuotas...
                </div>
              ) : filteredCuotas.length === 0 ? (
                <div className="p-10 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500">
                  No se encontraron cuotas para los filtros seleccionados.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredCuotas.map((c) => {
                    const esperado = round2(parseFloat(c.monto_esperado) || 0)
                    const pagado = round2(parseFloat(c.monto_pagado) || 0)
                    const saldo = round2(Math.max(0, esperado - pagado))
                    const isAnulado = c.estado === 'anulado'
                    const isPagado = c.estado === 'pagado'
                    const pagosCuota = pagos.filter((p) => p.cuota_id === c.id)

                    return (
                      <div
                        key={c.id}
                        className={`bg-white rounded-2xl p-4 border shadow-sm space-y-2 ${
                          isAnulado
                            ? 'border-red-200 bg-red-50/30 opacity-80'
                            : isPagado
                            ? 'border-emerald-200 bg-emerald-50/20'
                            : 'border-slate-200'
                        }`}
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="px-2 py-0.5 rounded-lg bg-slate-900 text-white text-xs font-extrabold">
                                {c.puesto_referencia}
                              </span>
                              <h4
                                className={`font-bold text-sm ${
                                  isAnulado ? 'line-through text-slate-400' : 'text-slate-900'
                                }`}
                              >
                                {c.nombre_titular}
                              </h4>
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                                {c.cantidad_puestos}{' '}
                                {c.cantidad_puestos === 1 ? 'puesto' : 'puestos'}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  isAnulado
                                    ? 'bg-red-100 text-red-700'
                                    : isPagado
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : c.estado === 'parcial'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {c.estado}
                              </span>
                            </div>
                            {isAnulado && c.motivo_anulacion && (
                              <p className="text-[11px] text-red-700">
                                <strong>Motivo anulación:</strong> {c.motivo_anulacion}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-4 text-xs">
                            <div>
                              <span className="text-[10px] text-slate-400 uppercase block">Esperado</span>
                              <span className="font-bold text-slate-800">{esperado.toFixed(2)} Bs</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 uppercase block">Pagado</span>
                              <span className="font-bold text-emerald-700">{pagado.toFixed(2)} Bs</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 uppercase block">Saldo</span>
                              <span
                                className={`text-base font-extrabold ${
                                  saldo > 0 && !isAnulado ? 'text-red-600' : 'text-emerald-700'
                                }`}
                              >
                                {isAnulado ? '0.00' : saldo.toFixed(2)} Bs
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {isAdmin &&
                                campanaActual.estado === 'abierta' &&
                                !isAnulado &&
                                saldo > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => openCobrarCuotaModal(c)}
                                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1 shadow-sm"
                                  >
                                    <Coins className="w-3.5 h-3.5" />
                                    <span>Cobrar</span>
                                  </button>
                                )}

                              {pagosCuota.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedCuotaHist(c)
                                    setAnulandoPagoId(null)
                                    setMotivoAnulPago('')
                                  }}
                                  className="px-2.5 py-2 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 font-semibold inline-flex items-center gap-1"
                                  title="Ver historial / recibo WhatsApp"
                                >
                                  <History className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Historial / Recibo</span>
                                </button>
                              )}

                              {isAdmin && campanaActual.estado === 'abierta' && !isAnulado && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAnulandoCuotaId(c.id)
                                    setMotivoAnulCuota('')
                                  }}
                                  className="px-2.5 py-2 text-orange-600 hover:bg-orange-50 rounded-xl font-semibold"
                                >
                                  Anular
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {anulandoCuotaId === c.id && (
                          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs">
                            <span className="font-bold text-amber-900 flex items-center gap-1">
                              <ShieldAlert className="w-3.5 h-3.5" /> Motivo obligatorio de anulación de cuota
                            </span>
                            <input
                              type="text"
                              value={motivoAnulCuota}
                              onChange={(e) => setMotivoAnulCuota(e.target.value)}
                              placeholder="Indica por qué se anula esta cuota..."
                              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg"
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setAnulandoCuotaId(null)}
                                className="text-slate-600"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAnularCuota(c)}
                                className="px-3 py-1 bg-red-600 text-white rounded-lg font-bold"
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
            </div>
          ) : (
            /* Sub-vista B: Gastos de la Campaña */
            <div className="space-y-3">
              {egresos.length === 0 ? (
                <div className="p-10 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500">
                  No se han registrado gastos en esta campaña todavía.
                </div>
              ) : (
                egresos.map((g) => (
                  <div
                    key={g.id}
                    className={`bg-white rounded-2xl p-4 border shadow-sm space-y-2 ${
                      g.anulado ? 'border-red-200 bg-red-50/30 opacity-80' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded font-semibold text-slate-700">
                            {g.fecha_egreso}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              g.metodo_pago === 'qr'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {g.metodo_pago === 'qr' ? 'QR / Banco' : 'Efectivo'}
                          </span>
                          {g.anulado && (
                            <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-bold uppercase">
                              Anulado
                            </span>
                          )}
                        </div>
                        <h4
                          className={`font-bold text-sm ${
                            g.anulado ? 'line-through text-slate-400' : 'text-slate-900'
                          }`}
                        >
                          {g.descripcion}
                        </h4>
                        {g.observaciones && (
                          <p className="text-xs text-slate-500">{g.observaciones}</p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <span
                          className={`text-base font-extrabold font-mono ${
                            g.anulado ? 'line-through text-slate-400' : 'text-red-600'
                          }`}
                        >
                          {parseFloat(g.monto).toFixed(2)} Bs
                        </span>

                        {g.foto_url && (
                          <a
                            href={g.foto_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold hover:bg-blue-100"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Ver Foto</span>
                          </a>
                        )}

                        {isAdmin && !g.anulado && campanaActual.estado === 'abierta' && (
                          <button
                            type="button"
                            onClick={() => {
                              setAnulandoGastoId(g.id)
                              setMotivoAnulGasto('')
                            }}
                            className="px-2.5 py-1.5 text-xs font-semibold text-orange-600 hover:bg-orange-50 rounded-xl"
                          >
                            Anular
                          </button>
                        )}
                      </div>
                    </div>

                    {g.anulado && g.motivo_anulacion && (
                      <p className="text-[11px] text-red-700 bg-red-50 p-2 rounded-lg">
                        <strong>Motivo anulación:</strong> {g.motivo_anulacion}
                      </p>
                    )}

                    {anulandoGastoId === g.id && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs">
                        <span className="font-bold text-amber-900 flex items-center gap-1">
                          <ShieldAlert className="w-3.5 h-3.5" /> Motivo obligatorio de anulación
                        </span>
                        <input
                          type="text"
                          value={motivoAnulGasto}
                          onChange={(e) => setMotivoAnulGasto(e.target.value)}
                          placeholder="Indica por qué se anula este gasto..."
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setAnulandoGastoId(null)}
                            className="text-slate-600"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAnularGasto(g)}
                            className="px-3 py-1 bg-red-600 text-white rounded-lg font-bold"
                          >
                            Confirmar Anulación
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}

      {/* Modal: Nueva Campaña de Cobro Extra */}
      {isNewCampanaOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md max-h-[88dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
            <div className="shrink-0 bg-slate-900 px-5 py-3.5 text-white flex items-center justify-between">
              <div className="min-w-0">
                <h3 className="font-bold text-sm sm:text-base truncate">Nueva Campaña de Cobro Extra</h3>
                <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                  Generación automática por puestos activos (fondo independiente)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewCampanaOpen(false)}
                className="p-1.5 text-slate-300 hover:text-white shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCampana} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nombre de la Campaña *</label>
                  <input
                    type="text"
                    required
                    value={campNombre}
                    onChange={(e) => setCampNombre(e.target.value)}
                    placeholder="Ej. Aguinaldo Guardia 2026 / Aniversario 2026"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Descripción (Opcional)</label>
                  <textarea
                    rows={2}
                    value={campDescripcion}
                    onChange={(e) => setCampDescripcion(e.target.value)}
                    placeholder="Motivo aprobado en reunión o detalle..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Monto por Puesto (Bs) *</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0.01"
                      required
                      value={campMontoPuesto}
                      onChange={(e) => setCampMontoPuesto(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Fecha Inicio *</label>
                    <input
                      type="date"
                      required
                      value={campFechaInicio}
                      onChange={(e) => setCampFechaInicio(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Fecha Límite</label>
                    <input
                      type="date"
                      value={campFechaLimite}
                      onChange={(e) => setCampFechaLimite(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                    <input
                      type="checkbox"
                      checked={campIncluyeAmbulantes}
                      onChange={(e) => setCampIncluyeAmbulantes(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-600"
                    />
                    <span>Incluir Ambulantes</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                    <input
                      type="checkbox"
                      checked={campIncluyeExternos}
                      onChange={(e) => setCampIncluyeExternos(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-600"
                    />
                    <span>Incluir Aportantes Externos (1 puesto c/u)</span>
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Los grupos de cobro se generan 1 sola vez por unidad principal multiplicando por su cantidad de puestos.
                  </p>
                </div>
              </div>

              <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewCampanaOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingCampana}
                  className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold"
                >
                  {savingCampana ? 'Generando cuotas...' : 'Crear Campaña y Generar Cuotas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Cobrar Cuota Extra + Recibo WhatsApp */}
      {selectedCuotaPago && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md max-h-[88dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
            <div className="shrink-0 bg-slate-900 px-5 py-3.5 text-white flex items-center justify-between">
              <div className="min-w-0">
                <h3 className="font-bold text-sm sm:text-base truncate">
                  {ultimoRecibo ? 'Recibo de Cobro Extra' : 'Cobrar Cuota Extra'}
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                  {selectedCuotaPago.puesto_referencia} • {selectedCuotaPago.nombre_titular}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCuotaPago(null)}
                className="p-1.5 text-slate-300 hover:text-white shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {ultimoRecibo ? (
              <div className="p-5 space-y-4 text-xs">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-1.5">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>¡Pago registrado en Fondo Independiente!</span>
                  </div>
                  <p>
                    <strong>Campaña:</strong> {campanaActual?.nombre}
                  </p>
                  <p>
                    <strong>Titular:</strong> {ultimoRecibo.cuota.nombre_titular} (
                    {ultimoRecibo.cuota.puesto_referencia})
                  </p>
                  <p>
                    <strong>Monto pagado:</strong>{' '}
                    {parseFloat(ultimoRecibo.pago.monto).toFixed(2)} Bs (
                    {ultimoRecibo.pago.metodo_pago === 'qr' ? 'QR / Banco' : 'Efectivo'})
                  </p>
                  <p>
                    <strong>Saldo pendiente cuota:</strong>{' '}
                    {round2(
                      Math.max(
                        0,
                        (parseFloat(ultimoRecibo.cuota.monto_esperado) || 0) -
                          (parseFloat(ultimoRecibo.cuota.monto_pagado) || 0)
                      )
                    ).toFixed(2)}{' '}
                    Bs
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <a
                    href={buildWhatsAppReceiptUrl({
                      telefono: ultimoRecibo.telefono,
                      campanaNombre: campanaActual?.nombre || '',
                      cuota: ultimoRecibo.cuota,
                      pago: ultimoRecibo.pago,
                    })}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-2"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Enviar por WhatsApp</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => handleCopyReceiptText(ultimoRecibo)}
                    className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold flex items-center justify-center gap-1.5"
                  >
                    <Copy className="w-4 h-4" />
                    <span>{copiedReceipt ? 'Copiado' : 'Copiar'}</span>
                  </button>
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSelectedCuotaPago(null)}
                    className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRegistrarPagoCuota} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Monto (Bs)</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0.01"
                        required
                        value={pagoMonto}
                        onChange={(e) => setPagoMonto(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha de Pago</label>
                      <input
                        type="date"
                        required
                        value={pagoFecha}
                        onChange={(e) => setPagoFecha(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Método de Pago</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setPagoMetodo('efectivo')}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${
                          pagoMetodo === 'efectivo'
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-slate-50 text-slate-700 border-slate-300'
                        }`}
                      >
                        <Coins className="w-4 h-4" />
                        <span>Efectivo</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPagoMetodo('qr')}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${
                          pagoMetodo === 'qr'
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
                      N° Talonario Físico (Opcional)
                    </label>
                    <input
                      type="text"
                      value={pagoTalonario}
                      onChange={(e) => setPagoTalonario(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Observaciones (Opcional)
                    </label>
                    <input
                      type="text"
                      value={pagoObs}
                      onChange={(e) => setPagoObs(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>

                <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedCuotaPago(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingPago}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{savingPago ? 'Guardando...' : 'Confirmar Pago'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal: Historial de Pagos de Cuota + WhatsApp + Anular */}
      {selectedCuotaHist && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg max-h-[88dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
            <div className="shrink-0 bg-slate-900 px-5 py-3.5 text-white flex items-center justify-between">
              <div className="min-w-0">
                <h3 className="font-bold text-sm sm:text-base truncate">Historial y Recibo de Cuota</h3>
                <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                  {selectedCuotaHist.puesto_referencia} • {selectedCuotaHist.nombre_titular}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCuotaHist(null)}
                className="p-1.5 text-slate-300 hover:text-white shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-3">
              {pagos.filter((p) => p.cuota_id === selectedCuotaHist.id).length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">No hay pagos registrados para esta cuota.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {pagos
                    .filter((p) => p.cuota_id === selectedCuotaHist.id)
                    .map((p) => {
                      const tel =
                        selectedCuotaHist.unidades_cobro?.socios?.telefono ||
                        selectedCuotaHist.aportantes_externos?.telefono ||
                        ''
                      return (
                        <div key={p.id} className="py-3 text-xs space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <span
                                className={`font-bold ${
                                  p.anulado ? 'line-through text-slate-400' : 'text-slate-900'
                                }`}
                              >
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

                            <div className="flex items-center gap-1.5">
                              {p.anulado ? (
                                <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-bold">
                                  Anulado
                                </span>
                              ) : (
                                <>
                                  <a
                                    href={buildWhatsAppReceiptUrl({
                                      telefono: tel,
                                      campanaNombre: campanaActual?.nombre || '',
                                      cuota: selectedCuotaHist,
                                      pago: p,
                                    })}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg font-bold hover:bg-emerald-100"
                                  >
                                    <Share2 className="w-3 h-3" />
                                    <span>WhatsApp</span>
                                  </a>
                                  {isAdmin && campanaActual?.estado === 'abierta' && (
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
                                  )}
                                </>
                              )}
                            </div>
                          </div>

                          {p.anulado && p.motivo_anulacion && (
                            <p className="text-[11px] text-red-700 bg-red-50 p-2 rounded">
                              Motivo: {p.motivo_anulacion}
                            </p>
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
                                <button
                                  type="button"
                                  onClick={() => setAnulandoPagoId(null)}
                                  className="text-slate-600"
                                >
                                  Cancelar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAnularPagoCuota(p)}
                                  className="px-3 py-1 bg-red-600 text-white rounded-lg font-bold"
                                >
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
            </div>

            <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedCuotaHist(null)}
                className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Registrar Gasto de Campaña */}
      {isNewGastoOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md max-h-[88dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
            <div className="shrink-0 bg-slate-900 px-5 py-3.5 text-white flex items-center justify-between">
              <div className="min-w-0">
                <h3 className="font-bold text-sm sm:text-base truncate">Registrar Gasto de Campaña</h3>
                <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                  {campanaActual?.nombre} (Fondo Independiente)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewGastoOpen(false)}
                className="p-1.5 text-slate-300 hover:text-white shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGasto} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Descripción del Gasto *</label>
                  <input
                    type="text"
                    required
                    value={gastoDesc}
                    onChange={(e) => setGastoDesc(e.target.value)}
                    placeholder="Ej. Pago Aguinaldo al Guardia / Compra tortas y sonido"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Monto (Bs) *</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0.01"
                      required
                      value={gastoMonto}
                      onChange={(e) => setGastoMonto(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Fecha *</label>
                    <input
                      type="date"
                      required
                      value={gastoFecha}
                      onChange={(e) => setGastoFecha(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Método de Pago</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setGastoMetodo('efectivo')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${
                        gastoMetodo === 'efectivo'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-slate-50 text-slate-700 border-slate-300'
                      }`}
                    >
                      <Coins className="w-4 h-4" />
                      <span>Efectivo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setGastoMetodo('qr')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${
                        gastoMetodo === 'qr'
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
                  <label className="block font-semibold text-slate-700 mb-1">Observaciones (Opcional)</label>
                  <input
                    type="text"
                    value={gastoObs}
                    onChange={(e) => setGastoObs(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-slate-600 font-semibold">Respaldo Drive (Carpeta Cobros_Extras):</span>
                  <div className="flex items-center gap-2">
                    {gastoFotoUrl && (
                      <a
                        href={gastoFotoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 underline font-semibold"
                      >
                        Ver
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsGastoPhotoOpen(true)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold text-slate-700 flex items-center gap-1"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>{gastoFotoUrl ? 'Cambiar Foto' : 'Subir Foto'}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewGastoOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingGasto}
                  className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold"
                >
                  {savingGasto ? 'Guardando...' : 'Guardar Gasto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <FotoUploaderModal
        isOpen={isGastoPhotoOpen}
        onClose={() => setIsGastoPhotoOpen(false)}
        onPhotoSaved={(url) => setGastoFotoUrl(url)}
        currentUrl={gastoFotoUrl}
        titulo="Respaldo de Gasto — Cobros Extras"
        categoria="Cobros_Extras"
        anio={new Date().getFullYear()}
        mes={new Date().getMonth() + 1}
        customName={`CobroExtra_${Date.now()}.jpg`}
      />

      {/* Modal: Cerrar Campaña y Transferir Sobrante */}
      {isCerrarModalOpen && campanaActual && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md max-h-[88dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
            <div className="shrink-0 bg-slate-900 px-5 py-3.5 text-white flex items-center justify-between">
              <div className="min-w-0">
                <h3 className="font-bold text-sm sm:text-base truncate">Cerrar Campaña</h3>
                <p className="text-[11px] sm:text-xs text-slate-400 truncate">{campanaActual.nombre}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCerrarModalOpen(false)}
                className="p-1.5 text-slate-300 hover:text-white shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCerrarCampana} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4 text-xs">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Total Recaudado:</span>
                    <strong className="font-mono text-slate-900">{kpis.totalRecaudado.toFixed(2)} Bs</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Total Gastado:</span>
                    <strong className="font-mono text-red-700">{kpis.totalGastado.toFixed(2)} Bs</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Cuotas aún por cobrar:</span>
                    <strong className="font-mono text-slate-700">{kpis.porCobrar.toFixed(2)} Bs</strong>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200 text-sm">
                    <span className="font-bold text-slate-900">Saldo Sobrante Final:</span>
                    <strong className="font-mono font-black text-emerald-700">
                      {kpis.saldoDisponible.toFixed(2)} Bs
                    </strong>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Fecha de Cierre</label>
                  <input
                    type="date"
                    required
                    value={cierreFecha}
                    onChange={(e) => setCierreFecha(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                {kpis.saldoDisponible > 0 ? (
                  <div className="space-y-2">
                    <span className="font-bold text-slate-800 block">
                      ¿Qué deseas hacer con el sobrante de {kpis.saldoDisponible.toFixed(2)} Bs?
                    </span>

                    {[
                      {
                        id: 'informativo',
                        title: 'Dejar como cierre informativo',
                        desc: 'No suma dinero a Caja Servicios ni a Caja Afiliaciones.',
                      },
                      {
                        id: 'servicios',
                        title: 'Transferir a Caja Servicios',
                        desc: 'Registra un ingreso auditable en Caja Servicios (tras avisar en Asamblea).',
                      },
                      {
                        id: 'afiliaciones',
                        title: 'Transferir a Caja Afiliaciones',
                        desc: 'Registra un ingreso auditable en Caja Afiliaciones (tras avisar en Asamblea).',
                      },
                    ].map((opt) => (
                      <label
                        key={opt.id}
                        className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer ${
                          cierreOpcion === opt.id
                            ? 'bg-emerald-50 border-emerald-400'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="cierreOpcion"
                          checked={cierreOpcion === opt.id}
                          onChange={() => setCierreOpcion(opt.id)}
                          className="mt-0.5"
                        />
                        <div>
                          <span className="font-bold text-slate-900 block">{opt.title}</span>
                          <span className="text-[11px] text-slate-500">{opt.desc}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900">
                    No hay saldo sobrante positivo para transferir. Se registrará el cierre informativo de la campaña.
                  </div>
                )}
              </div>

              <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCerrarModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={closingCampana}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
                >
                  <Lock className="w-4 h-4" />
                  <span>{closingCampana ? 'Cerrando...' : 'Confirmar Cierre'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Anular Campaña */}
      {isAnularCampanaOpen && campanaActual && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 px-5 py-3.5 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Anular Campaña (Cero Borrados)</h3>
              <button type="button" onClick={() => setIsAnularCampanaOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAnularCampana} className="p-5 space-y-4 text-xs">
              <p className="text-slate-600">
                La campaña <strong>{campanaActual.nombre}</strong> quedará marcada como anulada con registro en bitácora.
              </p>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Motivo obligatorio *</label>
                <input
                  type="text"
                  required
                  value={motivoAnulCampana}
                  onChange={(e) => setMotivoAnulCampana(e.target.value)}
                  placeholder="Ej. Creada por error / duplicada..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAnularCampanaOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600"
                >
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 bg-red-600 text-white rounded-xl font-bold">
                  Confirmar Anulación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
