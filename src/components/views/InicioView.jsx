import React from 'react'
import { Wallet, ArrowUpRight, ArrowDownRight, RefreshCw, AlertCircle, ShieldCheck } from 'lucide-react'

export default function InicioView({ role }) {
  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-lg border border-slate-700/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Fase 1 Activa
              </span>
              <span className="text-xs text-slate-400">Esquema SQL & PWA Listo</span>
            </div>
            <h2 className="text-2xl font-bold mt-2 text-white">Cajas y Estado Financiero</h2>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Control independiente de las dos cajas: <strong>Caja Servicios Básicos</strong> y <strong>Caja Afiliaciones</strong>, con arqueo separado de Efectivo en mano y Saldo en QR.
            </p>
          </div>
          <div className="flex items-center space-x-2 self-start sm:self-auto">
            <div className="text-right hidden sm:block">
              <span className="text-xs text-slate-400 block">Modo actual:</span>
              <span className="text-sm font-bold text-emerald-400 capitalize">{role}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Two Independent Cash Boxes Overview (Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Caja Servicios */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Caja 1</span>
              <h3 className="text-lg font-bold text-slate-800">Servicios Básicos</h3>
            </div>
            <span className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <Wallet className="w-5 h-5" />
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Recaudación de cuotas fijas, consumo de luz, base variable (58 Bs) y multas por mora. Egresos de luz, agua, guardia y basura.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 pt-3 bg-slate-50 rounded-xl p-3">
            <div>
              <span className="text-[11px] text-slate-500 uppercase font-medium">Efectivo en mano</span>
              <p className="text-lg font-bold text-slate-800">0.00 <span className="text-xs font-normal text-slate-500">Bs</span></p>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 uppercase font-medium">Saldo en QR</span>
              <p className="text-lg font-bold text-slate-800">0.00 <span className="text-xs font-normal text-slate-500">Bs</span></p>
            </div>
          </div>
        </div>

        {/* Caja Afiliaciones */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Caja 2</span>
              <h3 className="text-lg font-bold text-slate-800">Afiliaciones Nuevos Socios</h3>
            </div>
            <span className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <Wallet className="w-5 h-5" />
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Recaudación de cuotas de afiliación (1.500 Bs por socio nuevo). Destinado a limpieza general, mantenimiento y mejoras del mercado.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 pt-3 bg-slate-50 rounded-xl p-3">
            <div>
              <span className="text-[11px] text-slate-500 uppercase font-medium">Efectivo en mano</span>
              <p className="text-lg font-bold text-slate-800">0.00 <span className="text-xs font-normal text-slate-500">Bs</span></p>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 uppercase font-medium">Saldo en QR</span>
              <p className="text-lg font-bold text-slate-800">0.00 <span className="text-xs font-normal text-slate-500">Bs</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* Info Card - Spec Checklist */}
      <div className="bg-slate-100 border border-slate-200 rounded-2xl p-5">
        <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          Especificación de la Fase 1 Completada
        </h4>
        <ul className="mt-3 text-xs text-slate-600 space-y-1.5 list-disc list-inside">
          <li><strong>PWA Mobile-First:</strong> Instalable en pantalla de inicio de Android/iOS con icono y soporte offline inicial.</li>
          <li><strong>Esquema Supabase:</strong> 14 tablas creadas con RLS estricto (Admin control total, Directiva solo lectura).</li>
          <li><strong>Configuración de Tarifas y Saldos Iniciales:</strong> Valores por defecto listos (58 Bs base variable, 1.500 Bs afiliación, 10 Bs/día multa).</li>
        </ul>
      </div>
    </div>
  )
}
