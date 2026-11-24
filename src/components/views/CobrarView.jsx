import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { calcularDesgloseCobro } from '../../lib/calculosCobro'
import { registrarAuditoria } from '../../lib/auditoria'
import { MESES, getLocalDateStr, getNombreSocioCobro, getPerdonazoVigente } from '../../lib/formatters'
import AbrirMesModal from '../modals/AbrirMesModal'
import CobrarModal from '../modals/CobrarModal'
import HistorialPagosModal from '../modals/HistorialPagosModal'
import PerdonarMultaModal from '../modals/PerdonarMultaModal'
import PerdonazoModal from '../modals/PerdonazoModal'
import FotoUploaderModal from '../modals/FotoUploaderModal'
import {
  Receipt,
  Zap,
  Search,
  Clock,
  Coins,
  QrCode,
  RefreshCw,
  Camera,
  ExternalLink,
  AlertCircle,
  Sparkles,
  Users,
  CheckCircle2,
  X,
  ShieldAlert
} from 'lucide-react'

export default function CobrarView() {
  const { user, isAdmin } = useAuth()

  const today = new Date()
  const [selectedMes, setSelectedMes] = useState(today.getMonth() + 1)
  const [selectedAnio, setSelectedAnio] = useState(today.getFullYear())
  const [activeSubTab, setActiveSubTab] = useState('socios') // 'socios' | 'externos'

  const [periodo, setPeriodo] = useState(null)
  const [cobros, setCobros] = useState([])
  const [tarifas, setTarifas] = useState({})
  const [perdonazoActivo, setPerdonazoActivo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterEstado, setFilterEstado] = useState('todos')
  const [statusMessage, setStatusMessage] = useState(null)

  // Externos
  const [externos, setExternos] = useState([])
  const [cobrosExternos, setCobrosExternos] = useState([])
  const [loadingExternos, setLoadingExternos] = useState(false)
  const [selectedExternoPago, setSelectedExternoPago] = useState(null)
  const [extMonto, setExtMonto] = useState('')
  const [extMetodo, setExtMetodo] = useState('efectivo')
  const [extTalonario, setExtTalonario] = useState('')
  const [extFecha, setExtFecha] = useState(getLocalDateStr())
  const [extObs, setExtObs] = useState('')
  const [savingExterno, setSavingExterno] = useState(false)
  const [anulandoExtId, setAnulandoExtId] = useState(null)
  const [motivoAnulExt, setMotivoAnulExt] = useState('')

  // Modales socios
  const [isAbrirMesModalOpen, setIsAbrirMesModalOpen] = useState(false)
  const [isPerdonazoModalOpen, setIsPerdonazoModalOpen] = useState(false)
  const [selectedCobroForPago, setSelectedCobroForPago] = useState(null)
  const [selectedCobroForHistorial, setSelectedCobroForHistorial] = useState(null)
  const [selectedCobroForPerdon, setSelectedCobroForPerdon] = useState(null)
  const [photoModalTarget, setPhotoModalTarget] = useState(null)

  // Modal Pago Factura Luz
  const [isPagoFacturaModalOpen, setIsPagoFacturaModalOpen] = useState(false)
  const [fechaPagoFactura, setFechaPagoFactura] = useState(getLocalDateStr())
  const [metodoPagoFactura, setMetodoPagoFactura] = useState('efectivo')
  const [fotoPagoFactura, setFotoPagoFactura] = useState('')
  const [isPhotoFacturaOpen, setIsPhotoFacturaOpen] = useState(false)
  const [savingFacturaPago, setSavingFacturaPago] = useState(false)

  useEffect(() => {
    supabase
      .from('configuracion_tarifas')
      .select('*')
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setTarifas(data)
      })
  }, [])

  const fetchCampaniasPerdonazo = async () => {
    const { data } = await supabase.from('campañas_perdonazo').select('*')
    const vigente = getPerdonazoVigente(data || [])
    setPerdonazoActivo(vigente)
    return vigente
  }

  const fetchPeriodoYCobros = async () => {
    setLoading(true)
    setStatusMessage(null)
    try {
      const vigente = await fetchCampaniasPerdonazo()

      const { data: pData, error: pError } = await supabase
        .from('periodos_mensuales')
        .select('*')
        .eq('mes', selectedMes)
        .eq('anio', selectedAnio)
        .maybeSingle()

      if (pError) throw pError
      setPeriodo(pData || null)

      if (!pData) {
        setCobros([])
        setLoading(false)
        return
      }

      const { data: cData, error: cError } = await supabase
        .from('cobros_servicios')
        .select(`
          *,
          unidades_cobro (
            id,
            numero_identificador,
            nombres_titulares,
            tipo,
            subtipo_fijo,
            cantidad_puestos,
            codigo_tarifador,
            ultima_lectura,
            socios (
              id,
              nombre,
              telefono,
              fecha_pago_especial,
              activo
            )
          ),
          pagos_servicios (
            id,
            monto,
            metodo_pago,
            nro_talonario_fisico,
            estado,
            fecha_pago
          )
        `)
        .eq('periodo_id', pData.id)
        .order('created_at', { ascending: true })

      if (cError) throw cError

      const processed = (cData || []).map((cobro) => {
        const pagosActivos = (cobro.pagos_servicios || []).filter((p) => p.estado === 'activo')
        const socio = cobro.unidades_cobro?.socios

        const desglose = calcularDesgloseCobro({
          modalidadAplicada: cobro.modalidad_aplicada,
          cantidadPuestos: cobro.cantidad_puestos_aplicada || 1,
          lecturaAnt: cobro.lectura_ant || 0,
          lecturaAct: cobro.lectura_act || 0,
          cambioTarifador: cobro.cambio_tarifador,
          precioKwh: pData.precio_kwh_calculado || 0,
          tarifas,
          diasProrroga: cobro.dias_prorroga || 0,
          fechaPagoEspecial: socio?.fecha_pago_especial,
          multaPerdonada: cobro.multa_perdonada || 0,
          pagosActivos,
          mes: selectedMes,
          anio: selectedAnio,
          perdonazoActivo: vigente,
        })

        return {
          ...cobro,
          ...desglose,
          pagosActivos,
        }
      })

      setCobros(processed)
    } catch (err) {
      console.error(err)
      setStatusMessage({ type: 'error', text: 'Error al cargar cobros: ' + err.message })
    } finally {
      setLoading(false)
    }
  }

  const fetchExternosYMes = async () => {
    setLoadingExternos(true)
    try {
      const [{ data: extData, error: eErr }, { data: cExtData, error: cErr }] = await Promise.all([
        supabase.from('aportantes_externos').select('*').eq('activo', true).order('nombre_completo'),
        supabase
          .from('cobros_externos')
          .select('*')
          .eq('mes', selectedMes)
          .eq('anio', selectedAnio)
          .order('created_at', { ascending: false }),
      ])
      if (eErr) throw eErr
      if (cErr) throw cErr
      setExternos(extData || [])
      setCobrosExternos(cExtData || [])
    } catch (err) {
      console.error(err)
      setStatusMessage({ type: 'error', text: 'Error al cargar aportantes externos: ' + err.message })
    } finally {
      setLoadingExternos(false)
    }
  }

  useEffect(() => {
    if (tarifas.id) {
      fetchPeriodoYCobros()
    }
    fetchExternosYMes()
  }, [selectedMes, selectedAnio, tarifas])

  const handleUpdateLectura = async (cobro, nuevaLectura) => {
    const act = parseFloat(nuevaLectura) || 0
    try {
      const desglose = calcularDesgloseCobro({
        modalidadAplicada: cobro.modalidad_aplicada,
        cantidadPuestos: cobro.cantidad_puestos_aplicada,
        lecturaAnt: cobro.lectura_ant,
        lecturaAct: act,
        cambioTarifador: cobro.cambio_tarifador,
        precioKwh: periodo?.precio_kwh_calculado || 0,
        tarifas,
        diasProrroga: cobro.dias_prorroga,
        fechaPagoEspecial: cobro.unidades_cobro?.socios?.fecha_pago_especial,
        multaPerdonada: cobro.multa_perdonada,
        pagosActivos: cobro.pagosActivos,
        mes: selectedMes,
        anio: selectedAnio,
        perdonazoActivo,
      })

      const { error } = await supabase
        .from('cobros_servicios')
        .update({
          lectura_act: act,
          monto_base: desglose.montoBase,
          monto_luz_redondeado: desglose.montoLuzRedondeado,
          monto_multa: desglose.montoMulta,
          total_a_pagar: desglose.totalAPagar,
          estado: desglose.estado,
        })
        .eq('id', cobro.id)

      if (error) throw error

      await supabase.from('unidades_cobro').update({ ultima_lectura: act }).eq('id', cobro.unidad_id)

      setCobros((prev) =>
        prev.map((c) => (c.id === cobro.id ? { ...c, ...desglose, lectura_act: act } : c))
      )
    } catch (err) {
      console.error(err)
      setStatusMessage({ type: 'error', text: 'Error al actualizar lectura: ' + err.message })
    }
  }

  const handleToggleCambioTarifador = async (cobro) => {
    const nuevoCambio = !cobro.cambio_tarifador
    try {
      const desglose = calcularDesgloseCobro({
        modalidadAplicada: cobro.modalidad_aplicada,
        cantidadPuestos: cobro.cantidad_puestos_aplicada,
        lecturaAnt: cobro.lectura_ant,
        lecturaAct: cobro.lectura_act,
        cambioTarifador: nuevoCambio,
        precioKwh: periodo?.precio_kwh_calculado || 0,
        tarifas,
        diasProrroga: cobro.dias_prorroga,
        fechaPagoEspecial: cobro.unidades_cobro?.socios?.fecha_pago_especial,
        multaPerdonada: cobro.multa_perdonada,
        pagosActivos: cobro.pagosActivos,
        mes: selectedMes,
        anio: selectedAnio,
        perdonazoActivo,
      })

      await supabase
        .from('cobros_servicios')
        .update({
          cambio_tarifador: nuevoCambio,
          monto_base: desglose.montoBase,
          monto_luz_redondeado: desglose.montoLuzRedondeado,
          monto_multa: desglose.montoMulta,
          total_a_pagar: desglose.totalAPagar,
          estado: desglose.estado,
        })
        .eq('id', cobro.id)

      setCobros((prev) =>
        prev.map((c) => (c.id === cobro.id ? { ...c, ...desglose, cambio_tarifador: nuevoCambio } : c))
      )
    } catch (err) {
      console.error(err)
    }
  }

  const handleToggleProrroga = async (cobro) => {
    const nuevaProrroga = cobro.dias_prorroga > 0 ? 0 : 2
    try {
      const desglose = calcularDesgloseCobro({
        modalidadAplicada: cobro.modalidad_aplicada,
        cantidadPuestos: cobro.cantidad_puestos_aplicada,
        lecturaAnt: cobro.lectura_ant,
        lecturaAct: cobro.lectura_act,
        cambioTarifador: cobro.cambio_tarifador,
        precioKwh: periodo?.precio_kwh_calculado || 0,
        tarifas,
        diasProrroga: nuevaProrroga,
        fechaPagoEspecial: cobro.unidades_cobro?.socios?.fecha_pago_especial,
        multaPerdonada: cobro.multa_perdonada,
        pagosActivos: cobro.pagosActivos,
        mes: selectedMes,
        anio: selectedAnio,
        perdonazoActivo,
      })

      await supabase
        .from('cobros_servicios')
        .update({
          dias_prorroga: nuevaProrroga,
          monto_multa: desglose.montoMulta,
          total_a_pagar: desglose.totalAPagar,
          estado: desglose.estado,
        })
        .eq('id', cobro.id)

      setCobros((prev) =>
        prev.map((c) => (c.id === cobro.id ? { ...c, ...desglose, dias_prorroga: nuevaProrroga } : c))
      )
    } catch (err) {
      console.error(err)
    }
  }

  const handleSaveFotoTarifador = async (url) => {
    if (!photoModalTarget?.cobroId) return
    try {
      await supabase.from('cobros_servicios').update({ foto_tarifador_drive_url: url }).eq('id', photoModalTarget.cobroId)
      setCobros((prev) =>
        prev.map((c) => (c.id === photoModalTarget.cobroId ? { ...c, foto_tarifador_drive_url: url } : c))
      )
      setPhotoModalTarget(null)
    } catch (err) {
      console.error(err)
    }
  }

  // Registrar pago real de la factura de luz (crea el egreso en Caja Servicios)
  const handleConfirmarPagoFacturaLuz = async (e) => {
    e.preventDefault()
    if (!periodo) return
    const montoFactura = parseFloat(periodo.factura_luz_bs) || 0
    if (montoFactura <= 0) {
      setStatusMessage({ type: 'error', text: 'El monto total de la factura de luz debe ser mayor a 0.' })
      return
    }

    setSavingFacturaPago(true)
    try {
      const desc = `Pago Factura Luz - ${MESES[selectedMes]} ${selectedAnio}`
      const { error: egErr } = await supabase.from('egresos').insert([
        {
          caja: 'servicios',
          categoria: 'Factura Luz General',
          descripcion: desc,
          monto: montoFactura,
          metodo_pago: metodoPagoFactura,
          fecha: fechaPagoFactura,
          recibo_drive_url: fotoPagoFactura || null,
          estado: 'activo',
        },
      ])
      if (egErr) throw egErr

      const { error: pErr } = await supabase
        .from('periodos_mensuales')
        .update({
          estado_pago_factura: 'pagada',
          fecha_pago_factura: fechaPagoFactura,
          metodo_pago_factura: metodoPagoFactura,
          foto_comprobante_pago_luz: fotoPagoFactura || null,
        })
        .eq('id', periodo.id)
      if (pErr) throw pErr

      await registrarAuditoria({
        usuarioId: user?.id,
        accion: 'PAGO_FACTURA_LUZ',
        detalleJson: {
          descripcion: desc,
          periodo_id: periodo.id,
          monto: montoFactura,
          metodo_pago: metodoPagoFactura,
          fecha_pago: fechaPagoFactura,
        },
      })

      setStatusMessage({
        type: 'success',
        text: `¡Factura de luz de ${MESES[selectedMes]} ${selectedAnio} pagada y descontada de Caja Servicios!`,
      })
      setIsPagoFacturaModalOpen(false)
      await fetchPeriodoYCobros()
    } catch (err) {
      console.error(err)
      setStatusMessage({ type: 'error', text: 'Error al registrar pago de factura: ' + err.message })
    } finally {
      setSavingFacturaPago(false)
    }
  }

  // Cobrar a Aportante Externo (Guardia y Agua, SIN multas)
  const openCobrarExternoModal = (ext) => {
    setSelectedExternoPago(ext)
    setExtMonto(String(parseFloat(ext.monto_mensual_sugerido) || 0))
    setExtMetodo('efectivo')
    setExtTalonario('')
    setExtFecha(getLocalDateStr())
    setExtObs('')
  }

  const handleSaveCobroExterno = async (e) => {
    e.preventDefault()
    if (!selectedExternoPago) return
    const montoNum = parseFloat(extMonto)
    if (!montoNum || montoNum <= 0) {
      setStatusMessage({ type: 'error', text: 'Ingresa un monto válido mayor a 0.' })
      return
    }

    setSavingExterno(true)
    try {
      const { error } = await supabase.from('cobros_externos').insert([
        {
          externo_id: selectedExternoPago.id,
          anio: selectedAnio,
          mes: selectedMes,
          monto_correspondiente: parseFloat(selectedExternoPago.monto_mensual_sugerido) || montoNum,
          monto_pagado: montoNum,
          metodo_pago: extMetodo,
          nro_talonario_fisico: extTalonario.trim() || null,
          fecha_pago: extFecha || getLocalDateStr(),
          observaciones: extObs.trim() || null,
          anulado: false,
        },
      ])
      if (error) throw error

      await registrarAuditoria({
        usuarioId: user?.id,
        accion: 'COBRO_APORTANTE_EXTERNO',
        detalleJson: {
          descripcion: `Cobro Guardia/Agua de ${montoNum.toFixed(2)} Bs a externo ${selectedExternoPago.nombre_completo} (${MESES[selectedMes]} ${selectedAnio})`,
          externo_id: selectedExternoPago.id,
          monto: montoNum,
          metodo_pago: extMetodo,
        },
      })

      setStatusMessage({
        type: 'success',
        text: `¡Cobro externo de ${montoNum.toFixed(2)} Bs registrado y sumado a Caja Servicios!`,
      })
      setSelectedExternoPago(null)
      await fetchExternosYMes()
    } catch (err) {
      console.error(err)
      setStatusMessage({ type: 'error', text: 'Error al cobrar externo: ' + err.message })
    } finally {
      setSavingExterno(false)
    }
  }

  const handleAnularCobroExterno = async (cobroExtId) => {
    if (!motivoAnulExt.trim()) {
      setStatusMessage({ type: 'error', text: 'El motivo de anulación es obligatorio.' })
      return
    }
    try {
      const { error } = await supabase
        .from('cobros_externos')
        .update({
          anulado: true,
          motivo_anulacion: motivoAnulExt.trim(),
        })
        .eq('id', cobroExtId)
      if (error) throw error

      await registrarAuditoria({
        usuarioId: user?.id,
        accion: 'ANULACION_COBRO_EXTERNO',
        detalleJson: {
          descripcion: `Anulación cobro externo ${cobroExtId}`,
          motivo: motivoAnulExt.trim(),
        },
      })

      setStatusMessage({ type: 'success', text: 'Cobro externo anulado y descontado de Caja Servicios.' })
      setAnulandoExtId(null)
      setMotivoAnulExt('')
      await fetchExternosYMes()
    } catch (err) {
      console.error(err)
      setStatusMessage({ type: 'error', text: 'Error al anular cobro externo: ' + err.message })
    }
  }

  // Filtrado de cobros de socios (usando nombre histórico si existe)
  const filteredCobros = cobros.filter((c) => {
    const term = searchTerm.toLowerCase()
    const socioName = getNombreSocioCobro(c).toLowerCase()
    const puestoId = c.unidades_cobro?.numero_identificador?.toLowerCase() || ''
    const tarifadorCode = c.unidades_cobro?.codigo_tarifador?.toLowerCase() || ''

    const matchesSearch = !term || socioName.includes(term) || puestoId.includes(term) || tarifadorCode.includes(term)
    if (!matchesSearch) return false

    if (filterEstado === 'pendiente') return c.estado === 'pendiente'
    if (filterEstado === 'parcial') return c.estado === 'parcial'
    if (filterEstado === 'pagado') return c.estado === 'pagado'
    if (filterEstado === 'con_multa') return c.montoMulta > 0

    return true
  })

  const filteredExternos = externos.filter((e) => {
    const term = searchTerm.toLowerCase()
    return (
      !term ||
      e.nombre_completo?.toLowerCase().includes(term) ||
      e.referencia_ubicacion?.toLowerCase().includes(term)
    )
  })

  const totalCobros = cobros.length
  const pagadosCount = cobros.filter((c) => c.estado === 'pagado').length
  const totalRecaudado = cobros.reduce((sum, c) => sum + (c.totalPagado || 0), 0)
  const totalPendiente = cobros.reduce((sum, c) => sum + (c.saldoPendiente || 0), 0)
  const facturaPagada = periodo?.estado_pago_factura === 'pagada'

  return (
    <div className="space-y-6">
      {/* Top Banner & Month Selector */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Cobro Mensual de Servicios</h2>
            {periodo ? (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                Periodo Abierto
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                Mes No Abierto
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Lectura de tarifadores, desglose real de luz, perdonazos de multas y aportantes externos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 text-xs">
            <select
              value={selectedMes}
              onChange={(e) => setSelectedMes(parseInt(e.target.value, 10))}
              className="bg-transparent font-bold text-slate-800 py-1 px-2 focus:outline-none"
            >
              {MESES.slice(1).map((m, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {m}
                </option>
              ))}
            </select>
            <select
              value={selectedAnio}
              onChange={(e) => setSelectedAnio(parseInt(e.target.value, 10))}
              className="bg-transparent font-bold text-slate-800 py-1 px-2 border-l border-slate-200 focus:outline-none"
            >
              {[2024, 2025, 2026, 2027, 2028].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => {
              fetchPeriodoYCobros()
              fetchExternosYMes()
            }}
            title="Recargar datos"
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsPerdonazoModalOpen(true)}
              className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>Configurar Perdonazo de Multas</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsAbrirMesModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-900/20 transition-all flex items-center gap-1.5"
          >
            <Zap className="w-4 h-4" />
            <span>{periodo ? 'Configurar Factura de Luz' : 'Abrir Mes / Factura de Luz'}</span>
          </button>
        </div>
      </div>

      {/* Tabs Socios vs Externos */}
      <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm w-fit">
        <button
          type="button"
          onClick={() => setActiveSubTab('socios')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'socios'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Puestos de Socios ({cobros.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('externos')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeSubTab === 'externos'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Externos (Guardia y Agua) ({externos.length})</span>
        </button>
      </div>

      {/* Banner Perdonazo Activo */}
      {perdonazoActivo && activeSubTab === 'socios' && (
        <div className="bg-gradient-to-r from-purple-700 to-indigo-700 text-white rounded-2xl p-4 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-white/15 rounded-xl">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-200 block">
                Campaña de Perdonazo Vigente
              </span>
              <h3 className="text-sm font-bold">
                {perdonazoActivo.nombre} — {perdonazoActivo.porcentaje_descuento}% de descuento en multas
              </h3>
              <p className="text-xs text-purple-100 mt-0.5">
                Válido del {perdonazoActivo.fecha_inicio} al {perdonazoActivo.fecha_fin}. Se aplica automáticamente sobre las multas calculadas.
              </p>
            </div>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsPerdonazoModalOpen(true)}
              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-xl text-xs font-bold self-start sm:self-center"
            >
              Gestionar
            </button>
          )}
        </div>
      )}

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
            <AlertCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {activeSubTab === 'externos' ? (
        /* TAB: APORTANTES EXTERNOS (GUARDIA Y AGUA - SIN MULTAS) */
        <div className="space-y-4">
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 text-xs text-indigo-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <p className="font-bold">Aportantes Externos (No Socios) — {MESES[selectedMes]} {selectedAnio}</p>
              <p className="text-indigo-700 mt-0.5">
                Solo aportan para Guardia y Agua según monto individual sugerido (editable al cobrar). <strong>Nunca aplican multas ni retrasos</strong> y suman a Caja Servicios.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar aportante externo por nombre o ubicación..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {loadingExternos ? (
            <div className="p-10 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500">
              Cargando externos...
            </div>
          ) : filteredExternos.length === 0 ? (
            <div className="p-10 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500">
              No hay aportantes externos activos. Regístralos en la pestaña <strong>Socios → Externos (No Socios)</strong>.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredExternos.map((ext) => {
                const pagosDelMes = cobrosExternos.filter((ce) => ce.externo_id === ext.id)
                const pagosActivosMes = pagosDelMes.filter((ce) => !ce.anulado)
                const totalPagadoMes = pagosActivosMes.reduce((s, p) => s + (parseFloat(p.monto_pagado) || 0), 0)

                return (
                  <div key={ext.id} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-slate-900">{ext.nombre_completo}</h4>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">
                            Externo • Sin Multa
                          </span>
                          {totalPagadoMes > 0 && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              Pagado {totalPagadoMes.toFixed(2)} Bs
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {ext.referencia_ubicacion || 'Sin referencia'} • Sugerido:{' '}
                          <strong>{parseFloat(ext.monto_mensual_sugerido || 0).toFixed(2)} Bs/mes</strong>
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => openCobrarExternoModal(ext)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 self-start sm:self-center"
                      >
                        <Coins className="w-3.5 h-3.5" />
                        <span>Registrar Cobro ({MESES[selectedMes]})</span>
                      </button>
                    </div>

                    {pagosDelMes.length > 0 && (
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 divide-y divide-slate-200/70">
                        {pagosDelMes.map((p) => (
                          <div key={p.id} className="py-2 first:pt-0 last:pb-0 text-xs space-y-1.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className={`font-bold ${p.anulado ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                                  {parseFloat(p.monto_pagado).toFixed(2)} Bs
                                </span>
                                <span className="text-slate-500">
                                  ({p.metodo_pago === 'qr' ? 'QR' : 'Efectivo'}) • {p.fecha_pago}
                                </span>
                                {p.nro_talonario_fisico && (
                                  <span className="font-mono text-[10px] bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                    Tal. {p.nro_talonario_fisico}
                                  </span>
                                )}
                              </div>

                              {p.anulado ? (
                                <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded">
                                  Anulado
                                </span>
                              ) : (
                                isAdmin && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAnulandoExtId(p.id)
                                      setMotivoAnulExt('')
                                    }}
                                    className="text-red-600 hover:bg-red-50 px-2 py-0.5 rounded font-semibold"
                                  >
                                    Anular
                                  </button>
                                )
                              )}
                            </div>

                            {p.anulado && p.motivo_anulacion && (
                              <p className="text-[11px] text-red-700">Motivo: {p.motivo_anulacion}</p>
                            )}

                            {anulandoExtId === p.id && (
                              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                                <span className="font-bold text-amber-900 flex items-center gap-1 text-[11px]">
                                  <ShieldAlert className="w-3.5 h-3.5" /> Motivo obligatorio de anulación
                                </span>
                                <input
                                  type="text"
                                  value={motivoAnulExt}
                                  onChange={(e) => setMotivoAnulExt(e.target.value)}
                                  placeholder="Motivo..."
                                  className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded text-xs"
                                />
                                <div className="flex justify-end gap-2">
                                  <button type="button" onClick={() => setAnulandoExtId(null)} className="text-slate-600">
                                    Cancelar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleAnularCobroExterno(p.id)}
                                    className="px-3 py-1 bg-red-600 text-white rounded font-bold"
                                  >
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
                )
              })}
            </div>
          )}
        </div>
      ) : (
        /* TAB: PUESTOS DE SOCIOS */
        <>
          {!periodo && !loading && (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Zap className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="text-base font-bold text-slate-800">
                  El periodo de {MESES[selectedMes]} {selectedAnio} no ha sido abierto
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Configura el desglose de la factura general de luz (Energía, Alumbrado, Basura y kWh) para habilitar los cobros de este mes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAbrirMesModalOpen(true)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all inline-flex items-center gap-2"
              >
                <Zap className="w-4 h-4" />
                <span>Abrir Mes {MESES[selectedMes]} {selectedAnio}</span>
              </button>
            </div>
          )}

          {periodo && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Factura general con Desglose y Estado de Pago */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                      Factura General de Luz
                    </span>
                    {facturaPagada ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Pagada
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                        Pendiente de pago
                      </span>
                    )}
                  </div>

                  <p className="text-lg font-bold text-slate-900">
                    {parseFloat(periodo.factura_luz_bs).toFixed(2)}{' '}
                    <span className="text-xs font-normal text-slate-500">Bs</span>
                  </p>

                  <div className="text-[11px] text-slate-500 space-y-0.5 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <div className="flex justify-between">
                      <span>Energía:</span>
                      <strong className="text-slate-700">{parseFloat(periodo.factura_energia_bs || 0).toFixed(2)} Bs</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Alumbrado / Basura:</span>
                      <span>
                        {parseFloat(periodo.factura_alumbrado_bs || 0).toFixed(0)} /{' '}
                        {parseFloat(periodo.factura_basura_bs || 0).toFixed(0)} Bs
                      </span>
                    </div>
                    <div className="flex justify-between pt-0.5 border-t border-slate-200">
                      <span>{periodo.factura_luz_kwh} kWh</span>
                      <span className="font-mono font-bold text-emerald-700">
                        {periodo.precio_kwh_calculado} Bs/kWh
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    {periodo.factura_luz_drive_url && (
                      <a
                        href={periodo.factura_luz_drive_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Factura</span>
                      </a>
                    )}
                    {facturaPagada ? (
                      <div className="text-[10px] text-emerald-700 font-medium flex items-center gap-1.5">
                        <span>
                          Pagada el {periodo.fecha_pago_factura} ({periodo.metodo_pago_factura})
                        </span>
                        {periodo.foto_comprobante_pago_luz && (
                          <a
                            href={periodo.foto_comprobante_pago_luz}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 underline"
                          >
                            Ver comp.
                          </a>
                        )}
                      </div>
                    ) : (
                      isAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            setFechaPagoFactura(getLocalDateStr())
                            setMetodoPagoFactura('efectivo')
                            setFotoPagoFactura('')
                            setIsPagoFacturaModalOpen(true)
                          }}
                          className="w-full py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[11px] font-bold transition-colors"
                        >
                          Registrar Pago de Factura
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Progreso de Cobro */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Puestos Cobrados
                  </span>
                  <p className="text-lg font-bold text-slate-900 mt-1">
                    {pagadosCount}{' '}
                    <span className="text-xs font-normal text-slate-500">de {totalCobros} puestos</span>
                  </p>
                  <div className="w-full bg-slate-100 rounded-full h-2 mt-2">
                    <div
                      className="bg-emerald-600 h-2 rounded-full transition-all"
                      style={{ width: `${totalCobros > 0 ? (pagadosCount / totalCobros) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {/* Total Recaudado */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                    Total Recaudado (Mes)
                  </span>
                  <p className="text-lg font-bold text-emerald-700 mt-1">
                    {totalRecaudado.toFixed(2)}{' '}
                    <span className="text-xs font-normal text-slate-500">Bs</span>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">Suma de abonos activos recibidos</p>
                </div>

                {/* Total Pendiente */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 block">
                    Saldo Pendiente
                  </span>
                  <p className="text-lg font-bold text-red-600 mt-1">
                    {totalPendiente.toFixed(2)}{' '}
                    <span className="text-xs font-normal text-slate-500">Bs</span>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">Por cobrar a los socios</p>
                </div>
              </div>

              {/* Search & Filter Bar */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar por socio, número de puesto o código de tarifador..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto text-xs font-medium pb-1 sm:pb-0">
                  <button
                    onClick={() => setFilterEstado('todos')}
                    className={`px-3 py-1.5 rounded-xl transition-all ${
                      filterEstado === 'todos' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Todos ({cobros.length})
                  </button>
                  <button
                    onClick={() => setFilterEstado('pendiente')}
                    className={`px-3 py-1.5 rounded-xl transition-all ${
                      filterEstado === 'pendiente' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Pendientes
                  </button>
                  <button
                    onClick={() => setFilterEstado('parcial')}
                    className={`px-3 py-1.5 rounded-xl transition-all ${
                      filterEstado === 'parcial' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    A cuenta
                  </button>
                  <button
                    onClick={() => setFilterEstado('pagado')}
                    className={`px-3 py-1.5 rounded-xl transition-all ${
                      filterEstado === 'pagado' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Pagados
                  </button>
                  <button
                    onClick={() => setFilterEstado('con_multa')}
                    className={`px-3 py-1.5 rounded-xl transition-all ${
                      filterEstado === 'con_multa' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Con Multa
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
                  <RefreshCw className="w-8 h-8 mx-auto animate-spin text-emerald-600 mb-2" />
                  <p className="text-xs text-slate-500 font-medium">Cargando cobros del mes...</p>
                </div>
              ) : filteredCobros.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
                  No se encontraron cobros coincidentes con el filtro.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredCobros.map((cobro) => {
                    const unidad = cobro.unidades_cobro
                    const nombreSocio = getNombreSocioCobro(cobro)
                    const isVariable = cobro.modalidad_aplicada === 'variable'
                    const isPagado = cobro.estado === 'pagado'
                    const isParcial = cobro.estado === 'parcial'

                    return (
                      <div
                        key={cobro.id}
                        className={`bg-white rounded-2xl p-4 border transition-all shadow-sm hover:shadow-md ${
                          isPagado
                            ? 'border-emerald-200 bg-emerald-50/20'
                            : isParcial
                            ? 'border-blue-200 bg-blue-50/20'
                            : cobro.montoMulta > 0
                            ? 'border-red-200'
                            : 'border-slate-200'
                        }`}
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-bold text-sm text-slate-900 truncate">
                                {unidad?.numero_identificador} • {nombreSocio}
                              </h4>
                              {cobro.nombre_socio_historico && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-medium">
                                  Titular histórico
                                </span>
                              )}
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                  isPagado
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : isParcial
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {cobro.estado}
                              </span>
                            </div>

                            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                              <span>
                                Modalidad:{' '}
                                <strong className="text-slate-700 capitalize">
                                  {cobro.modalidad_aplicada.replace('_', ' ')}
                                </strong>
                              </span>
                              {(cobro.cantidad_puestos_aplicada || 1) > 1 && (
                                <span className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-semibold border border-purple-200">
                                  {cobro.cantidad_puestos_aplicada} puestos agrupados
                                </span>
                              )}
                              {unidad?.codigo_tarifador && (
                                <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                                  Tarifador: {unidad.codigo_tarifador}
                                </span>
                              )}
                            </div>

                            {cobro.reglaCeroKwhAplicada && (
                              <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                <span>Regla 0 kWh aplicada: Puesto cerrado (55 Bs)</span>
                              </div>
                            )}
                          </div>

                          {isVariable && (
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-wrap items-center gap-3 text-xs">
                              <div>
                                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Ant. (kWh)</span>
                                <span className="font-mono font-bold text-slate-700">{cobro.lectura_ant || 0}</span>
                              </div>

                              <div>
                                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Act. (kWh)</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  disabled={isPagado}
                                  defaultValue={cobro.lectura_act || cobro.lectura_ant || 0}
                                  onBlur={(e) => handleUpdateLectura(cobro, e.target.value)}
                                  className="w-20 px-2 py-1 text-xs bg-white border border-slate-300 rounded font-mono font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                                />
                              </div>

                              <div>
                                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Consumo</span>
                                <span className="font-mono font-bold text-emerald-700">{cobro.consumoKwh} kWh</span>
                              </div>

                              <div className="flex items-center space-x-1">
                                {cobro.foto_tarifador_drive_url && (
                                  <a
                                    href={cobro.foto_tarifador_drive_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1.5 text-blue-600 hover:text-blue-800 bg-blue-50 rounded-lg"
                                    title="Ver foto del tarifador"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                )}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPhotoModalTarget({
                                      cobroId: cobro.id,
                                      currentUrl: cobro.foto_tarifador_drive_url,
                                      titulo: `Foto Tarifador ${unidad?.codigo_tarifador || unidad?.numero_identificador}`,
                                      customName: `Tarifador_${unidad?.numero_identificador}_${selectedMes}-${selectedAnio}.jpg`,
                                    })
                                  }
                                  className="p-1.5 text-slate-600 hover:text-emerald-700 bg-white border border-slate-200 rounded-lg"
                                  title="Subir foto del medidor"
                                >
                                  <Camera className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <label className="flex items-center space-x-1 text-[11px] text-slate-600 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={cobro.cambio_tarifador}
                                  onChange={() => handleToggleCambioTarifador(cobro)}
                                  className="w-3.5 h-3.5 text-emerald-600 rounded"
                                />
                                <span>Nuevo / 0</span>
                              </label>
                            </div>
                          )}

                          <div className="flex flex-wrap items-center gap-4 text-xs">
                            <div>
                              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Base + Luz</span>
                              <span className="font-bold text-slate-800">
                                {(cobro.montoBase + cobro.montoLuzRedondeado).toFixed(2)} Bs
                              </span>
                              <span className="text-[10px] text-slate-400 block">
                                (Base {cobro.montoBase} + Luz {cobro.montoLuzRedondeado})
                              </span>
                            </div>

                            <div>
                              <span className="text-[10px] text-slate-400 uppercase font-semibold block flex items-center gap-1">
                                Multa Mora
                                {cobro.dias_prorroga > 0 && (
                                  <span className="text-[9px] bg-purple-100 text-purple-700 px-1 rounded">+2d</span>
                                )}
                              </span>
                              {cobro.descuentoPerdonazo > 0 ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="line-through text-slate-400 text-[11px]">
                                    {cobro.montoMulta.toFixed(0)} Bs
                                  </span>
                                  <span className="font-bold text-purple-700 font-mono">
                                    +{cobro.multaNeta.toFixed(2)} Bs
                                  </span>
                                </div>
                              ) : (
                                <span
                                  className={`font-bold ${
                                    cobro.multaNeta > 0 ? 'text-red-600 font-mono' : 'text-slate-500'
                                  }`}
                                >
                                  {cobro.multaNeta > 0 ? `+${cobro.multaNeta.toFixed(2)} Bs` : '0.00 Bs'}
                                </span>
                              )}
                              {cobro.motivoExencion && (
                                <span className="text-[10px] text-emerald-600 block truncate max-w-[120px]">
                                  {cobro.motivoExencion}
                                </span>
                              )}
                            </div>

                            <div className="text-right">
                              <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                                Saldo Pendiente
                              </span>
                              <span
                                className={`text-base font-extrabold ${
                                  cobro.saldoPendiente > 0 ? 'text-red-600' : 'text-emerald-700'
                                }`}
                              >
                                {cobro.saldoPendiente.toFixed(2)} Bs
                              </span>
                              <span className="text-[10px] text-slate-500 block">
                                Total: {cobro.totalAPagar.toFixed(2)} Bs
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 self-end lg:self-center">
                            <button
                              type="button"
                              onClick={() => setSelectedCobroForPago(cobro)}
                              disabled={isPagado}
                              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1"
                            >
                              <Coins className="w-3.5 h-3.5" />
                              <span>Cobrar</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setSelectedCobroForHistorial(cobro)}
                              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                              title="Ver pagos y anular con motivo"
                            >
                              <Receipt className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleProrroga(cobro)}
                              className={`px-2 py-1.5 rounded-xl border text-[11px] font-bold transition-colors ${
                                cobro.dias_prorroga > 0
                                  ? 'bg-purple-600 text-white border-purple-600'
                                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                              }`}
                              title="Conceder prórroga rápida de 2 días sin multa"
                            >
                              +2d
                            </button>

                            {cobro.montoMulta > 0 && (
                              <button
                                type="button"
                                onClick={() => setSelectedCobroForPerdon(cobro)}
                                className="p-2 rounded-xl text-amber-600 hover:bg-amber-50 transition-colors"
                                title="Rebajar o perdonar multa con motivo escrito"
                              >
                                <Clock className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Modal: Registrar Pago Real de Factura de Luz */}
      {isPagoFacturaModalOpen && periodo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md my-8 overflow-hidden">
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Registrar Pago de Factura de Luz</h3>
                <p className="text-xs text-slate-400">
                  {MESES[selectedMes]} {selectedAnio} • Total: {parseFloat(periodo.factura_luz_bs).toFixed(2)} Bs
                </p>
              </div>
              <button onClick={() => setIsPagoFacturaModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400 hover:text-white" />
              </button>
            </div>

            <form onSubmit={handleConfirmarPagoFacturaLuz} className="p-6 space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                Al confirmar, se marcará la factura como <strong>Pagada</strong> y se creará el egreso automático en{' '}
                <strong>Caja Servicios</strong> por <strong>{parseFloat(periodo.factura_luz_bs).toFixed(2)} Bs</strong>.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha Real de Pago</label>
                <input
                  type="date"
                  required
                  value={fechaPagoFactura}
                  onChange={(e) => setFechaPagoFactura(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Método de Pago</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setMetodoPagoFactura('efectivo')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${
                      metodoPagoFactura === 'efectivo'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-50 text-slate-700 border-slate-300'
                    }`}
                  >
                    <Coins className="w-4 h-4" />
                    <span>Efectivo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMetodoPagoFactura('qr')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${
                      metodoPagoFactura === 'qr'
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
                  {fotoPagoFactura && (
                    <a href={fotoPagoFactura} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                      Ver
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsPhotoFacturaOpen(true)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold text-slate-700 flex items-center gap-1"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>{fotoPagoFactura ? 'Cambiar Foto' : 'Subir Comprobante'}</span>
                  </button>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPagoFacturaModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingFacturaPago}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{savingFacturaPago ? 'Registrando...' : 'Confirmar Pago de Factura'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Cobrar a Externo */}
      {selectedExternoPago && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md my-8 overflow-hidden">
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Cobro Externo (Guardia y Agua)</h3>
                <p className="text-xs text-slate-400">
                  {selectedExternoPago.nombre_completo} • {MESES[selectedMes]} {selectedAnio}
                </p>
              </div>
              <button onClick={() => setSelectedExternoPago(null)}>
                <X className="w-5 h-5 text-slate-400 hover:text-white" />
              </button>
            </div>

            <form onSubmit={handleSaveCobroExterno} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Monto Cobrado (Bs)</label>
                  <input
                    type="number"
                    step="0.50"
                    min="0.50"
                    required
                    value={extMonto}
                    onChange={(e) => setExtMonto(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha de Pago</label>
                  <input
                    type="date"
                    required
                    value={extFecha}
                    onChange={(e) => setExtFecha(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Método de Pago</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setExtMetodo('efectivo')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${
                      extMetodo === 'efectivo'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-50 text-slate-700 border-slate-300'
                    }`}
                  >
                    <Coins className="w-4 h-4" />
                    <span>Efectivo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setExtMetodo('qr')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${
                      extMetodo === 'qr'
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">N° Talonario (Opcional)</label>
                <input
                  type="text"
                  value={extTalonario}
                  onChange={(e) => setExtTalonario(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Observaciones (Opcional)</label>
                <input
                  type="text"
                  value={extObs}
                  onChange={(e) => setExtObs(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button type="button" onClick={() => setSelectedExternoPago(null)} className="px-4 py-2 text-xs text-slate-600">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingExterno}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{savingExterno ? 'Guardando...' : 'Confirmar Cobro'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modales existentes */}
      <AbrirMesModal
        isOpen={isAbrirMesModalOpen}
        onClose={() => setIsAbrirMesModalOpen(false)}
        mes={selectedMes}
        anio={selectedAnio}
        periodoExistente={periodo}
        tarifas={tarifas}
        onMonthOpened={() => fetchPeriodoYCobros()}
      />

      <PerdonazoModal
        isOpen={isPerdonazoModalOpen}
        onClose={() => setIsPerdonazoModalOpen(false)}
        onUpdated={() => fetchPeriodoYCobros()}
      />

      <CobrarModal
        isOpen={Boolean(selectedCobroForPago)}
        onClose={() => setSelectedCobroForPago(null)}
        cobro={selectedCobroForPago}
        perdonazoActivo={perdonazoActivo}
        onPaymentSuccess={() => fetchPeriodoYCobros()}
      />

      <HistorialPagosModal
        isOpen={Boolean(selectedCobroForHistorial)}
        onClose={() => setSelectedCobroForHistorial(null)}
        cobro={selectedCobroForHistorial}
        onPaymentUpdated={() => fetchPeriodoYCobros()}
      />

      <PerdonarMultaModal
        isOpen={Boolean(selectedCobroForPerdon)}
        onClose={() => setSelectedCobroForPerdon(null)}
        cobro={selectedCobroForPerdon}
        onMultaUpdated={() => fetchPeriodoYCobros()}
      />

      <FotoUploaderModal
        isOpen={isPhotoFacturaOpen}
        onClose={() => setIsPhotoFacturaOpen(false)}
        onPhotoSaved={(url) => setFotoPagoFactura(url)}
        currentUrl={fotoPagoFactura}
        titulo="Comprobante de Pago Factura de Luz"
        categoria="Facturas_Generales"
        anio={selectedAnio}
        mes={selectedMes}
        customName={`Pago_Factura_Luz_${selectedAnio}-${selectedMes}.jpg`}
      />

      {photoModalTarget && (
        <FotoUploaderModal
          isOpen={Boolean(photoModalTarget)}
          onClose={() => setPhotoModalTarget(null)}
          onPhotoSaved={handleSaveFotoTarifador}
          currentUrl={photoModalTarget.currentUrl}
          titulo={photoModalTarget.titulo}
          categoria="Tarifadores"
          anio={selectedAnio}
          mes={selectedMes}
          customName={photoModalTarget.customName}
        />
      )}
    </div>
  )
}
