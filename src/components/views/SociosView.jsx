import React from 'react'
import { Users, Layers, UserPlus } from 'lucide-react'

export default function SociosView() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-3 text-emerald-600 mb-2">
          <Users className="w-6 h-6" />
          <h2 className="text-xl font-bold text-slate-900">Padrón de Socios y Unidades de Cobro</h2>
        </div>
        <p className="text-sm text-slate-600">
          Gestión de los ~80 socios y sus puestos de venta, con soporte para <strong>Unidades de Cobro agrupadas</strong> (múltiples puestos compartiendo un solo tarifador).
        </p>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="flex items-center text-xs font-semibold text-slate-700 gap-1.5 mb-1">
              <Layers className="w-4 h-4 text-indigo-500" />
              Puestos Agrupados
            </span>
            <p className="text-xs text-slate-500">
              Multiplica la base variable (58 Bs × N puestos) y asigna un solo consumo medido de energía eléctrica.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="flex items-center text-xs font-semibold text-slate-700 gap-1.5 mb-1">
              <UserPlus className="w-4 h-4 text-emerald-500" />
              Carga Ágil
            </span>
            <p className="text-xs text-slate-500">
              Formulario rápido "Guardar y agregar siguiente" para dar de alta a los socios sin necesidad de un Excel previo.
            </p>
          </div>
        </div>

        <div className="mt-6 p-4 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-600">
          <strong>Fase 2 del proyecto:</strong> Este módulo incluirá la edición mensual rápida del estado de puestos (abierto, cerrado, cambio de titular) sin alterar meses pasados.
        </div>
      </div>
    </div>
  )
}
