import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import SaldosInicialesModal from '../modals/SaldosInicialesModal'
import TarifasModal from '../modals/TarifasModal'
import {
  Wallet,
  Settings,
  Users,
  ShieldCheck,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
  Coins,
  QrCode
} from 'lucide-react'

export default function InicioView({ onOpenAuth, onNavigateTab }) {
  const { user, profile, isAdmin } = useAuth()
  const [saldos, setSaldos] = useState({
    serviciosEfectivo: 0,
    serviciosQr: 0,
    afiliacionesEfectivo: 0,
    afiliacionesQr: 0,
  })
  const [sociosCount, setSociosCount] = useState(0)
  const [tarifasVigentes, setTarifasVigentes] = useState(null)
  const [loading, setLoading] = useState(true)

  // Modals state
  const [isSaldosModalOpen, setIsSaldosModalOpen] = useState(false)
  const [isTarifasModalOpen, setIsTarifasModalOpen] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      // 1. Cargar saldos iniciales
      const { data: saldosData } = await supabase.from('saldos_iniciales').select('*')
      if (saldosData) {
        const newSaldos = {
          serviciosEfectivo: 0,
          serviciosQr: 0,
          afiliacionesEfectivo: 0,
          afiliacionesQr: 0,
        }
        saldosData.forEach((item) => {
          if (item.caja === 'servicios' && item.metodo_pago === 'efectivo') {
            newSaldos.serviciosEfectivo = item.monto_inicial
          }
          if (item.caja === 'servicios' && item.metodo_pago === 'qr') {
            newSaldos.serviciosQr = item.monto_inicial
          }
          if (item.caja === 'afiliaciones' && item.metodo_pago === 'efectivo') {
            newSaldos.afiliacionesEfectivo = item.monto_inicial
          }
          if (item.caja === 'afiliaciones' && item.metodo_pago === 'qr') {
            newSaldos.afiliacionesQr = item.monto_inicial
          }
        })
        setSaldos(newSaldos)
      }

      // 2. Conteo de socios
      const { count } = await supabase.from('socios').select('*', { count: 'exact', head: true })
      setSociosCount(count || 0)

      // 3. Tarifas vigentes
      const { data: tarifaData } = await supabase
        .from('configuracion_tarifas')
        .select('*')
        .limit(1)
        .maybeSingle()
      if (tarifaData) {
        setTarifasVigentes(tarifaData)
      }
    } catch (err) {
      console.error('Error al cargar datos de inicio:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const totalServicios = saldos.serviciosEfectivo + saldos.serviciosQr
  const totalAfiliaciones = saldos.afiliacionesEfectivo + saldos.afiliacionesQr
  const totalEfectivo = saldos.serviciosEfectivo + saldos.afiliacionesEfectivo
  const totalQr = saldos.serviciosQr + saldos.afiliacionesQr

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-lg border border-slate-700/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Fase 2 Conectada a Supabase
              </span>
              <span className="text-xs text-slate-400">Padrón • Tarifas • Saldos Iniciales</span>
            </div>
            <h2 className="text-2xl font-bold mt-2 text-white">Secretaría de Hacienda</h2>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Control independiente de fondos: <strong>Caja Servicios Básicos</strong> y <strong>Caja Afiliaciones</strong>, con arqueo estricto de Efectivo en mano y Saldo en QR.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <button
              onClick={loadData}
              title="Recargar datos"
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
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

      {/* RLS Auth Reminder Banner if not signed in */}
      {!user && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Aviso de Seguridad Supabase RLS (Modo Consulta)</p>
              <p className="text-amber-700 mt-0.5">
                Las políticas Row Level Security (RLS) requieren que el Secretario de Hacienda inicie sesión como <strong>Admin</strong> para guardar o modificar saldos, tarifas o socios.
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

      {/* Arqueo Global: Efectivo vs QR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Total Efectivo en Mano
              </span>
              <p className="text-xl font-extrabold text-slate-900">
                {totalEfectivo.toFixed(2)} <span className="text-xs font-normal text-slate-500">Bs</span>
              </p>
            </div>
          </div>
          <span className="text-[11px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg font-medium">
            Billetes físicos
          </span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Total Saldo en QR / Banco
              </span>
              <p className="text-xl font-extrabold text-slate-900">
                {totalQr.toFixed(2)} <span className="text-xs font-normal text-slate-500">Bs</span>
              </p>
            </div>
          </div>
          <span className="text-[11px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg font-medium">
            Cuenta bancaria
          </span>
        </div>
      </div>

      {/* Las 2 Cajas Independientes */}
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
            Ingresos por base variable (58 Bs), cuotas fijas, consumo de luz y multas. Destinado al pago de facturas y gastos operativos.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3 bg-slate-50 rounded-xl p-3 border border-slate-100">
            <div>
              <span className="text-[11px] text-slate-500 font-medium">Efectivo en mano</span>
              <p className="text-lg font-bold text-slate-900">
                {saldos.serviciosEfectivo.toFixed(2)}{' '}
                <span className="text-xs font-normal text-slate-500">Bs</span>
              </p>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 font-medium">Saldo en QR</span>
              <p className="text-lg font-bold text-slate-900">
                {saldos.serviciosQr.toFixed(2)}{' '}
                <span className="text-xs font-normal text-slate-500">Bs</span>
              </p>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Saldo Total Caja Servicios:</span>
            <span className="text-sm font-bold text-emerald-700">{totalServicios.toFixed(2)} Bs</span>
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
            Ingresos por planes de pago de afiliación (1.500 Bs por socio nuevo). Destinado a limpieza general, mejoras y mantenimiento.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3 bg-slate-50 rounded-xl p-3 border border-slate-100">
            <div>
              <span className="text-[11px] text-slate-500 font-medium">Efectivo en mano</span>
              <p className="text-lg font-bold text-slate-900">
                {saldos.afiliacionesEfectivo.toFixed(2)}{' '}
                <span className="text-xs font-normal text-slate-500">Bs</span>
              </p>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 font-medium">Saldo en QR</span>
              <p className="text-lg font-bold text-slate-900">
                {saldos.afiliacionesQr.toFixed(2)}{' '}
                <span className="text-xs font-normal text-slate-500">Bs</span>
              </p>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Saldo Total Caja Afiliaciones:</span>
            <span className="text-sm font-bold text-blue-700">{totalAfiliaciones.toFixed(2)} Bs</span>
          </div>
        </div>
      </div>

      {/* Tarjeta de Acceso Rápido a Socios y Tarifas Vigentes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Padrón resumen */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2.5 mb-2">
              <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">Padrón de Socios</h4>
                <p className="text-xs text-slate-500">~80 socios del Mercado Palmira</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 mt-2">
              Actualmente tienes <strong>{sociosCount}</strong> socios registrados con sus respectivas modalidades y puestos agrupados.
            </p>
          </div>

          <button
            onClick={() => onNavigateTab && onNavigateTab('socios')}
            className="mt-4 w-full py-2 px-3 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
          >
            <span>Ir al Padrón de Socios</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Tarifas vigentes resumen */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2.5 mb-2">
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">Tarifas Vigentes</h4>
                <p className="text-xs text-slate-500">Parámetros actuales de cobro</p>
              </div>
            </div>
            <div className="mt-2 text-xs text-slate-600 space-y-1">
              <p>• Base variable por puesto: <strong>{tarifasVigentes?.base_variable_puesto ?? 58} Bs</strong></p>
              <p>• Multa diaria: <strong>{tarifasVigentes?.multa_diaria ?? 10} Bs</strong> (Tope {tarifasVigentes?.multa_tope_mensual ?? 70} Bs)</p>
              <p>• Costo afiliación: <strong>{tarifasVigentes?.costo_afiliacion ?? 1500} Bs</strong></p>
            </div>
          </div>

          <button
            onClick={() => setIsTarifasModalOpen(true)}
            className="mt-4 w-full py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
          >
            <span>Editar Tarifas (con Bitácora)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Modals */}
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
    </div>
  )
}
