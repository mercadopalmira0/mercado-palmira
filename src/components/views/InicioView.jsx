import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { calcularArqueoReal } from '../../lib/calculosCaja'
import SaldosInicialesModal from '../modals/SaldosInicialesModal'
import TarifasModal from '../modals/TarifasModal'
import MovimientoInternoModal from '../modals/MovimientoInternoModal'
import {
  Wallet,
  Settings,
  Users,
  ShieldCheck,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
  Coins,
  QrCode,
  ArrowRightLeft,
  Calendar,
  AlertCircle,
  CheckCircle2,
  X,
  FileSpreadsheet
} from 'lucide-react'

export default function InicioView({ onOpenAuth, onNavigateTab }) {
  const { user } = useAuth()
  const [arqueo, setArqueo] = useState({
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
  const [sociosCount, setSociosCount] = useState(0)
  const [tarifasVigentes, setTarifasVigentes] = useState(null)
  const [movimientos, setMovimientos] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusMessage, setStatusMessage] = useState(null)

  // Modales
  const [isSaldosModalOpen, setIsSaldosModalOpen] = useState(false)
  const [isTarifasModalOpen, setIsTarifasModalOpen] = useState(false)
  const [isMovimientoModalOpen, setIsMovimientoModalOpen] = useState(false)

  // Anulación de movimiento interno
  const [anulandoMovId, setAnulandoMovId] = useState(null)
  const [motivoAnulacion, setMotivoAnulacion] = useState('')

  const loadData = async () => {
    setLoading(true)
    setStatusMessage(null)
    try {
      // 1. Saldos iniciales
      const { data: saldosData } = await supabase.from('saldos_iniciales').select('*')

      // 2. Pagos de Servicios
      const { data: pagosServiciosData } = await supabase
        .from('pagos_servicios')
        .select('monto, metodo_pago, estado')

      // 3. Pagos de Afiliaciones
      const { data: pagosAfiliacionData } = await supabase
        .from('pagos_afiliacion')
        .select('monto, metodo_pago, estado')

      // 4. Egresos
      const { data: egresosData } = await supabase
        .from('egresos')
        .select('caja, metodo_pago, monto, estado')

      // 5. Movimientos Internos
      const { data: movData } = await supabase
        .from('movimientos_internos')
        .select('*')
        .order('fecha', { ascending: false })
        .limit(10)

      setMovimientos(movData || [])

      // 6. Cálculo integral de arqueo en tiempo real
      const resultadoArqueo = calcularArqueoReal({
        saldosIniciales: saldosData || [],
        pagosServicios: pagosServiciosData || [],
        pagosAfiliacion: pagosAfiliacionData || [],
        egresos: egresosData || [],
        movimientosInternos: movData || [],
      })

      setArqueo(resultadoArqueo)

      // 7. Conteo de socios
      const { count } = await supabase.from('socios').select('*', { count: 'exact', head: true })
      setSociosCount(count || 0)

      // 8. Tarifas vigentes
      const { data: tData } = await supabase.from('configuracion_tarifas').select('*').limit(1).maybeSingle()
      if (tData) setTarifasVigentes(tData)
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

  // Anular movimiento interno con motivo
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
                Fase 4 Activa
              </span>
              <span className="text-xs text-slate-400">Arqueo Real • Servicios • Afiliaciones</span>
            </div>
            <h2 className="text-2xl font-bold mt-2 text-white">Secretaría de Hacienda</h2>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Arqueo en tiempo real de <strong>Caja Servicios</strong> y <strong>Caja Afiliaciones</strong>: ingresos cobrados, egresos con foto a Drive y movimientos QR ↔ Efectivo.
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
              <span>Saldos Iniciales</span>
            </button>
            <button
              onClick={() => setIsTarifasModalOpen(true)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <Settings className="w-4 h-4" />
              <span>Tarifas</span>
            </button>
          </div>
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

      {/* RLS Auth Reminder Banner if not signed in */}
      {!user && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Aviso de Seguridad Supabase RLS</p>
              <p className="text-amber-700 mt-0.5">
                Para registrar movimientos internos o modificar fondos, inicia sesión como <strong>Administrador</strong>.
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

      {/* Arqueo Global: Efectivo Físico vs QR Bancario */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Efectivo físico */}
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

        {/* QR Bancario */}
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

        {/* Gran Total */}
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

      {/* Las 2 Cajas con sus Saldos Reales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Caja Servicios */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Caja 1</span>
              <h3 className="text-lg font-bold text-slate-900">Servicios Básicos</h3>
            </div>
            <span className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <Wallet className="w-5 h-5" />
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2.5">
            Ingresos por base variable (58 Bs), cuotas fijas, luz y multas menos pagos de facturas (luz, agua, guardia).
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3 bg-slate-50 rounded-xl p-3 border border-slate-100">
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

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Saldo Total Caja Servicios:</span>
            <span className="text-base font-bold text-emerald-700">
              {arqueo.totalServicios.toFixed(2)} Bs
            </span>
          </div>
        </div>

        {/* Caja Afiliaciones */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Caja 2</span>
              <h3 className="text-lg font-bold text-slate-900">Afiliaciones Nuevos Socios</h3>
            </div>
            <span className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <Wallet className="w-5 h-5" />
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2.5">
            Ingresos por cuotas de afiliación (1.500 Bs por nuevo socio) menos gastos de limpieza general y mejoras.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3 bg-slate-50 rounded-xl p-3 border border-slate-100">
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

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Saldo Total Caja Afiliaciones:</span>
            <span className="text-base font-bold text-blue-700">
              {arqueo.totalAfiliaciones.toFixed(2)} Bs
            </span>
          </div>
        </div>
      </div>

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
