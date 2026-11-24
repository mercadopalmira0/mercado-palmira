import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { calcularArqueoReal } from '../../lib/calculosCaja'
import { registrarAuditoria } from '../../lib/auditoria'
import SaldosInicialesModal from '../modals/SaldosInicialesModal'
import TarifasModal from '../modals/TarifasModal'
import MovimientoInternoModal from '../modals/MovimientoInternoModal'
import {
  Wallet,
  Settings,
  RefreshCw,
  Coins,
  QrCode,
  ArrowRightLeft,
  Calendar,
  X,
  TrendingUp,
  TrendingDown,
  Layers,
  History
} from 'lucide-react'

export default function InicioView() {
  const { user, isAdmin } = useAuth()
  const [arqueo, setArqueo] = useState({
    inicialServiciosEf: 0,
    inicialServiciosQr: 0,
    totalInicialServicios: 0,
    inicialAfiliacionesEf: 0,
    inicialAfiliacionesQr: 0,
    totalInicialAfiliaciones: 0,
    ingresosServiciosEf: 0,
    ingresosServiciosQr: 0,
    totalIngresosServicios: 0,
    ingresosAfiliacionesEf: 0,
    ingresosAfiliacionesQr: 0,
    totalIngresosAfiliaciones: 0,
    egresosServiciosEf: 0,
    egresosServiciosQr: 0,
    totalEgresosServicios: 0,
    egresosAfiliacionesEf: 0,
    egresosAfiliacionesQr: 0,
    totalEgresosAfiliaciones: 0,
    serviciosEfectivo: 0,
    serviciosQr: 0,
    totalServicios: 0,
    afiliacionesEfectivo: 0,
    afiliacionesQr: 0,
    totalAfiliaciones: 0,
    totalEfectivoEnMano: 0,
    totalQrEnBanco: 0,
    granTotal: 0,
  })
  const [cicloActivo, setCicloActivo] = useState(null)
  const [ciclosCerrados, setCiclosCerrados] = useState([])
  const [movimientos, setMovimientos] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusMessage, setStatusMessage] = useState(null)

  const [isSaldosModalOpen, setIsSaldosModalOpen] = useState(false)
  const [isTarifasModalOpen, setIsTarifasModalOpen] = useState(false)
  const [isMovimientoModalOpen, setIsMovimientoModalOpen] = useState(false)

  const [anulandoMovId, setAnulandoMovId] = useState(null)
  const [motivoAnulacion, setMotivoAnulacion] = useState('')

  const loadData = async () => {
    setLoading(true)
    setStatusMessage(null)
    try {
      const [
        { data: ciclosData },
        { data: saldosData },
        { data: pagosServiciosData },
        { data: pagosAfiliacionData },
        { data: pagosDeudoresData },
        { data: cobrosExternosData },
        { data: egresosData },
        { data: movAllData },
      ] = await Promise.all([
        supabase.from('ciclos_hacienda').select('*').order('created_at', { ascending: false }),
        supabase.from('saldos_iniciales').select('*'),
        supabase.from('pagos_servicios').select('monto, metodo_pago, estado, fecha_pago, created_at'),
        supabase.from('pagos_afiliacion').select('monto, metodo_pago, estado, fecha_pago, created_at'),
        supabase
          .from('pagos_deudores_ciclos')
          .select('monto, metodo_pago, fecha_pago, anulado, created_at, deudores_ciclos(caja)'),
        supabase
          .from('cobros_externos')
          .select('monto_pagado, metodo_pago, fecha_pago, anulado, created_at'),
        supabase.from('egresos').select('caja, metodo_pago, monto, estado, fecha, created_at'),
        supabase.from('movimientos_internos').select('*').order('fecha', { ascending: false }),
      ])

      const allCiclos = ciclosData || []
      const abierto = allCiclos.find((c) => c.estado === 'abierto') || null
      const cerrados = allCiclos.filter((c) => c.estado === 'cerrado')

      setCicloActivo(abierto)
      setCiclosCerrados(cerrados)
      setMovimientos((movAllData || []).slice(0, 10))

      const resultadoArqueo = calcularArqueoReal({
        cicloActivo: abierto,
        hasClosedCycles: cerrados.length > 0,
        saldosIniciales: saldosData || [],
        pagosServicios: pagosServiciosData || [],
        pagosAfiliacion: pagosAfiliacionData || [],
        pagosDeudoresCiclos: pagosDeudoresData || [],
        cobrosExternos: cobrosExternosData || [],
        egresos: egresosData || [],
        movimientosInternos: movAllData || [],
      })

      setArqueo(resultadoArqueo)
    } catch (err) {
      console.error('Error al cargar datos de arqueo:', err)
      setStatusMessage({ type: 'error', text: 'Error al cargar arqueo en tiempo real: ' + err.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleAnularMovimiento = async (movId) => {
    if (!motivoAnulacion.trim()) {
      setStatusMessage({ type: 'error', text: 'El motivo de anulación es obligatorio (regla de cero borrados).' })
      return
    }

    try {
      const { error } = await supabase
        .from('movimientos_internos')
        .update({
          estado: 'anulado',
          motivo_anulacion: motivoAnulacion.trim(),
        })
        .eq('id', movId)

      if (error) throw error

      await registrarAuditoria({
        usuarioId: user?.id,
        accion: 'ANULACION_MOVIMIENTO_INTERNO',
        detalleJson: {
          descripcion: `Anulación de movimiento interno ${movId}`,
          motivo: motivoAnulacion.trim(),
        },
      })

      setStatusMessage({ type: 'success', text: 'Movimiento interno anulado. Los saldos de caja se recalcularon.' })
      setAnulandoMovId(null)
      setMotivoAnulacion('')
      await loadData()
    } catch (err) {
      console.error(err)
      setStatusMessage({ type: 'error', text: 'Error al anular movimiento: ' + err.message })
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-lg border border-slate-700/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Sistema Activo
              </span>
              <span className="text-xs text-slate-400">Arqueo Real • Ciclos • Servicios • Afiliaciones</span>
            </div>
            <h2 className="text-2xl font-bold mt-2 text-white">Secretaría de Hacienda</h2>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Control de saldo inicial entregado por tesorero anterior, ingresos del ciclo actual (incluidos externos y deudores) y egresos.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <button
              onClick={loadData}
              title="Recargar arqueo en tiempo real"
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
            <button
              onClick={() => setIsMovimientoModalOpen(true)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>Movimiento Interno</span>
            </button>
            <button
              onClick={() => setIsSaldosModalOpen(true)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
            >
              <Wallet className="w-4 h-4" />
              <span>Configurar Saldo Inicial / Entrega Tesorero Anterior</span>
            </button>
            {isAdmin && (
              <button
                onClick={() => setIsTarifasModalOpen(true)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <Settings className="w-4 h-4" />
                <span>Tarifas</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tarjeta destacada del Ciclo Actual */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-emerald-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Ciclo en Curso
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800">
                {cicloActivo ? (cicloActivo.es_inicial ? 'Entrega Tesorero Anterior' : 'Arrastre de Asamblea') : 'Sin ciclo configurado'}
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">
              {cicloActivo ? cicloActivo.nombre : 'Configura el Saldo Inicial / Entrega Tesorero Anterior'}
            </h3>
            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              {cicloActivo ? (
                <span>
                  Inicio del ciclo: <strong>{cicloActivo.fecha_inicio}</strong>
                  {cicloActivo.observaciones ? ` • ${cicloActivo.observaciones}` : ''}
                </span>
              ) : (
                <span>Usa el botón verde superior para registrar el dinero recibido al iniciar la gestión.</span>
              )}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsSaldosModalOpen(true)}
          className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-colors self-start sm:self-center"
        >
          {cicloActivo ? 'Editar Saldo Inicial del Ciclo' : 'Configurar Saldo Inicial'}
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

      {/* Arqueo Global: Efectivo Físico vs QR Bancario */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Efectivo Físico en Mano
              </span>
              <p className="text-xl font-extrabold text-slate-900">
                {arqueo.totalEfectivoEnMano.toFixed(2)}{' '}
                <span className="text-xs font-normal text-slate-500">Bs</span>
              </p>
            </div>
          </div>
          <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg font-semibold">
            Billetes Mercado
          </span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Saldo en Cuenta QR / Banco
              </span>
              <p className="text-xl font-extrabold text-slate-900">
                {arqueo.totalQrEnBanco.toFixed(2)}{' '}
                <span className="text-xs font-normal text-slate-500">Bs</span>
              </p>
            </div>
          </div>
          <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-1 rounded-lg font-semibold">
            Cuenta Banco
          </span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center justify-between sm:col-span-2 lg:col-span-1">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Patrimonio Total en Cajas
              </span>
              <p className="text-xl font-extrabold text-slate-900">
                {arqueo.granTotal.toFixed(2)}{' '}
                <span className="text-xs font-normal text-slate-500">Bs</span>
              </p>
            </div>
          </div>
          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded-lg font-semibold">
            Ambas Cajas
          </span>
        </div>
      </div>

      {/* Las 2 Cajas con Desglose Inicial + Entrando en Ciclo + Total */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Caja Servicios */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Caja 1</span>
              <h3 className="text-lg font-bold text-slate-900">Servicios Básicos</h3>
            </div>
            <span className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <Wallet className="w-5 h-5" />
            </span>
          </div>

          {/* Desglose Ciclo: Inicial vs Entrando vs Egresos */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
              <span className="text-[10px] font-semibold text-slate-500 block">Dinero Inicial</span>
              <p className="font-bold text-slate-800 mt-0.5">{arqueo.totalInicialServicios.toFixed(2)} Bs</p>
              <span className="text-[10px] text-slate-400">
                Ef: {arqueo.inicialServiciosEf.toFixed(0)} | QR: {arqueo.inicialServiciosQr.toFixed(0)}
              </span>
            </div>
            <div className="bg-emerald-50/70 rounded-xl p-2.5 border border-emerald-100">
              <span className="text-[10px] font-semibold text-emerald-700 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Entrando Ciclo
              </span>
              <p className="font-bold text-emerald-800 mt-0.5">+{arqueo.totalIngresosServicios.toFixed(2)} Bs</p>
              <span className="text-[10px] text-emerald-600">
                Ef: {arqueo.ingresosServiciosEf.toFixed(0)} | QR: {arqueo.ingresosServiciosQr.toFixed(0)}
              </span>
            </div>
            <div className="bg-red-50/70 rounded-xl p-2.5 border border-red-100">
              <span className="text-[10px] font-semibold text-red-700 flex items-center gap-1">
                <TrendingDown className="w-3 h-3" /> Egresos Ciclo
              </span>
              <p className="font-bold text-red-700 mt-0.5">-{arqueo.totalEgresosServicios.toFixed(2)} Bs</p>
              <span className="text-[10px] text-red-500">
                Ef: {arqueo.egresosServiciosEf.toFixed(0)} | QR: {arqueo.egresosServiciosQr.toFixed(0)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 bg-slate-50 rounded-xl p-3 border border-slate-100">
            <div>
              <span className="text-[11px] text-slate-500 font-medium">Efectivo en mano</span>
              <p className="text-lg font-bold text-slate-900">
                {arqueo.serviciosEfectivo.toFixed(2)}{' '}
                <span className="text-xs font-normal text-slate-500">Bs</span>
              </p>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 font-medium">Saldo en QR</span>
              <p className="text-lg font-bold text-slate-900">
                {arqueo.serviciosQr.toFixed(2)}{' '}
                <span className="text-xs font-normal text-slate-500">Bs</span>
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Saldo Total Caja Servicios:</span>
            <span className="text-base font-bold text-emerald-700">
              {arqueo.totalServicios.toFixed(2)} Bs
            </span>
          </div>
        </div>

        {/* Caja Afiliaciones */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Caja 2</span>
              <h3 className="text-lg font-bold text-slate-900">Afiliaciones Nuevos Socios</h3>
            </div>
            <span className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <Wallet className="w-5 h-5" />
            </span>
          </div>

          {/* Desglose Ciclo: Inicial vs Entrando vs Egresos */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
              <span className="text-[10px] font-semibold text-slate-500 block">Dinero Inicial</span>
              <p className="font-bold text-slate-800 mt-0.5">{arqueo.totalInicialAfiliaciones.toFixed(2)} Bs</p>
              <span className="text-[10px] text-slate-400">
                Ef: {arqueo.inicialAfiliacionesEf.toFixed(0)} | QR: {arqueo.inicialAfiliacionesQr.toFixed(0)}
              </span>
            </div>
            <div className="bg-blue-50/70 rounded-xl p-2.5 border border-blue-100">
              <span className="text-[10px] font-semibold text-blue-700 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Entrando Ciclo
              </span>
              <p className="font-bold text-blue-800 mt-0.5">+{arqueo.totalIngresosAfiliaciones.toFixed(2)} Bs</p>
              <span className="text-[10px] text-blue-600">
                Ef: {arqueo.ingresosAfiliacionesEf.toFixed(0)} | QR: {arqueo.ingresosAfiliacionesQr.toFixed(0)}
              </span>
            </div>
            <div className="bg-red-50/70 rounded-xl p-2.5 border border-red-100">
              <span className="text-[10px] font-semibold text-red-700 flex items-center gap-1">
                <TrendingDown className="w-3 h-3" /> Egresos Ciclo
              </span>
              <p className="font-bold text-red-700 mt-0.5">-{arqueo.totalEgresosAfiliaciones.toFixed(2)} Bs</p>
              <span className="text-[10px] text-red-500">
                Ef: {arqueo.egresosAfiliacionesEf.toFixed(0)} | QR: {arqueo.egresosAfiliacionesQr.toFixed(0)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 bg-slate-50 rounded-xl p-3 border border-slate-100">
            <div>
              <span className="text-[11px] text-slate-500 font-medium">Efectivo en mano</span>
              <p className="text-lg font-bold text-slate-900">
                {arqueo.afiliacionesEfectivo.toFixed(2)}{' '}
                <span className="text-xs font-normal text-slate-500">Bs</span>
              </p>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 font-medium">Saldo en QR</span>
              <p className="text-lg font-bold text-slate-900">
                {arqueo.afiliacionesQr.toFixed(2)}{' '}
                <span className="text-xs font-normal text-slate-500">Bs</span>
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Saldo Total Caja Afiliaciones:</span>
            <span className="text-base font-bold text-blue-700">
              {arqueo.totalAfiliaciones.toFixed(2)} Bs
            </span>
          </div>
        </div>
      </div>

      {/* Ciclos Cerrados Recientes (si existen) */}
      {ciclosCerrados.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
            <History className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Historial de Ciclos Rendidos ({ciclosCerrados.length})
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            {ciclosCerrados.slice(0, 5).map((c) => (
              <div key={c.id} className="p-3.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-slate-800">{c.nombre}</span>
                  <span className="text-slate-500 ml-2">
                    ({c.fecha_inicio} → {c.fecha_cierre || 'Cerrado'})
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-[11px]">
                  <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-semibold">
                    Cierre Servicios: {((parseFloat(c.servicios_efectivo_final) || 0) + (parseFloat(c.servicios_qr_final) || 0)).toFixed(2)} Bs
                  </span>
                  <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-semibold">
                    Cierre Afiliaciones: {((parseFloat(c.afiliaciones_efectivo_final) || 0) + (parseFloat(c.afiliaciones_qr_final) || 0)).toFixed(2)} Bs
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historial de Movimientos Internos Recientes */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Movimientos Internos Recientes ({movimientos.length})
            </span>
          </div>
          <button
            onClick={() => setIsMovimientoModalOpen(true)}
            className="text-xs text-indigo-600 font-bold hover:underline"
          >
            + Nuevo Movimiento
          </button>
        </div>

        {movimientos.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No se han registrado movimientos de cajero ni préstamos entre cajas aún.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {movimientos.map((mov) => {
              const isAnulado = mov.estado === 'anulado'
              const isThisAnulando = anulandoMovId === mov.id

              return (
                <div key={mov.id} className="p-3.5 text-xs hover:bg-slate-50 transition-colors space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold font-mono px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] uppercase">
                        {mov.tipo.replace(/_/g, ' ')}
                      </span>
                      <span className={`font-bold ${isAnulado ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                        {parseFloat(mov.monto).toFixed(2)} Bs
                      </span>
                      <span className="text-slate-400 text-[10px]">
                        ({mov.caja_origen} ➔ {mov.caja_destino})
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-slate-400 text-[10px]">
                        {new Date(mov.fecha).toLocaleDateString('es-BO')}
                      </span>
                      {isAnulado ? (
                        <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">
                          Anulado
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setAnulandoMovId(mov.id)
                            setMotivoAnulacion('')
                          }}
                          className="text-[10px] font-semibold text-red-600 hover:bg-red-50 px-2 py-0.5 rounded"
                        >
                          Anular
                        </button>
                      )}
                    </div>
                  </div>

                  <p className={`text-slate-600 ${isAnulado ? 'line-through text-slate-400' : ''}`}>
                    {mov.descripcion}
                  </p>

                  {isAnulado && mov.motivo_anulacion && (
                    <p className="text-[10px] text-red-700 bg-red-50 p-1.5 rounded">
                      Motivo: {mov.motivo_anulacion}
                    </p>
                  )}

                  {isThisAnulando && (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg space-y-2 text-xs">
                      <span className="font-bold text-amber-900 block text-[11px]">Motivo de Anulación</span>
                      <input
                        type="text"
                        required
                        value={motivoAnulacion}
                        onChange={(e) => setMotivoAnulacion(e.target.value)}
                        placeholder="Ej. Error en monto / Movimiento duplicado..."
                        className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setAnulandoMovId(null)}
                          className="text-[11px] text-slate-600"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAnularMovimiento(mov.id)}
                          className="px-3 py-1 bg-red-600 text-white rounded text-[11px] font-bold"
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

      {/* Modales */}
      <SaldosInicialesModal
        isOpen={isSaldosModalOpen}
        onClose={() => setIsSaldosModalOpen(false)}
        onUpdated={loadData}
      />
      <TarifasModal
        isOpen={isTarifasModalOpen}
        onClose={() => setIsTarifasModalOpen(false)}
        onUpdated={loadData}
      />
      <MovimientoInternoModal
        isOpen={isMovimientoModalOpen}
        onClose={() => setIsMovimientoModalOpen(false)}
        onMovementRegistered={loadData}
      />
    </div>
  )
}
