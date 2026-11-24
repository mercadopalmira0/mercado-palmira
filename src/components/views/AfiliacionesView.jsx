import React from 'react'
import { UserPlus, Calendar, CreditCard } from 'lucide-react'

export default function AfiliacionesView() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-3 text-emerald-600 mb-2">
          <UserPlus className="w-6 h-6" />
          <h2 className="text-xl font-bold text-slate-900">Módulo de Afiliaciones (Nuevos Socios)</h2>
        </div>
        <p className="text-sm text-slate-600">
          Control del plan de pagos de <strong>1.500 Bs</strong> por afiliación para socios nuevos, cuotas acordadas, abonos a cuenta y saldo restante.
        </p>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="flex items-center text-xs font-semibold text-slate-700 gap-1.5 mb-1">
              <Calendar className="w-4 h-4 text-blue-500" />
              Cuotas Mensuales
            </span>
            <p className="text-xs text-slate-500">
              Registro de cuotas fijadas y seguimiento del saldo pendiente hasta su amortización total en 0 Bs.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="flex items-center text-xs font-semibold text-slate-700 gap-1.5 mb-1">
              <CreditCard className="w-4 h-4 text-emerald-500" />
              Ingresos a Caja Afiliaciones
            </span>
            <p className="text-xs text-slate-500">
              El dinero ingresa estrictamente a Caja Afiliaciones (Efectivo o QR) y se destina a mantenimiento general.
            </p>
          </div>
        </div>

        <div className="mt-6 p-4 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-600">
          <strong>Fase 4 del proyecto:</strong> Este módulo incluirá la ficha individual de amortización y el recibo digital descargable.
        </div>
      </div>
    </div>
  )
}
