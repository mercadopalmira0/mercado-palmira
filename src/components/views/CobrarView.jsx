import React from 'react'
import { Receipt, Zap, Clock, ShieldAlert, CheckCircle2 } from 'lucide-react'

export default function CobrarView() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-3 text-emerald-600 mb-2">
          <Receipt className="w-6 h-6" />
          <h2 className="text-xl font-bold text-slate-900">Módulo de Cobro Rápido (Mobile-First)</h2>
        </div>
        <p className="text-sm text-slate-600">
          Diseñado para cobro presencial en pasillos del mercado: cálculo automático con foto de tarifador, prorrogas de 2 días y generación de recibo digital para WhatsApp y talonario físico.
        </p>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="flex items-center text-xs font-semibold text-slate-700 gap-1.5 mb-1">
              <Zap className="w-4 h-4 text-amber-500" />
              Luz & Tarifador
            </span>
            <p className="text-xs text-slate-500">
              Redondeo hacia arriba al 0.50 Bs. Regla 0 kWh = 55 Bs (tarifa fija de puesto cerrado).
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="flex items-center text-xs font-semibold text-slate-700 gap-1.5 mb-1">
              <Clock className="w-4 h-4 text-blue-500" />
              Multas y Vencimientos
            </span>
            <p className="text-xs text-slate-500">
              10 Bs/día desde el 1 del mes con tope 70 Bs. Exención automática abonando al menos 35 Bs.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="flex items-center text-xs font-semibold text-slate-700 gap-1.5 mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Pagos y Anulaciones
            </span>
            <p className="text-xs text-slate-500">
              Abonos parciales, imputación manual y anulación con motivo obligatorio (cero borrados).
            </p>
          </div>
        </div>

        <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-600" />
          <div>
            <strong>Próxima etapa:</strong> Las pantallas operativas de captura de lecturas, cobro rápido y generación de recibos se habilitarán en la <strong>Fase 3</strong>.
          </div>
        </div>
      </div>
    </div>
  )
}
