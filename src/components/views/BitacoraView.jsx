import React from 'react'
import { ShieldAlert, AlertTriangle, Fingerprint, Lock } from 'lucide-react'

export default function BitacoraView({ role }) {
  if (role !== 'admin') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-800">
        <div className="flex items-center gap-3">
          <Lock className="w-6 h-6 text-red-600" />
          <h2 className="text-lg font-bold">Acceso Restringido por Política RLS</h2>
        </div>
        <p className="text-xs text-red-700 mt-2">
          La bitácora de auditoría inmutable es visible únicamente para el Secretario de Hacienda (rol Admin).
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-3 text-red-600 mb-2">
          <ShieldAlert className="w-6 h-6" />
          <h2 className="text-xl font-bold text-slate-900">Bitácora de Auditoría (Exclusivo Admin)</h2>
        </div>
        <p className="text-sm text-slate-600">
          Registro inmutable protegido por Row Level Security (RLS). Registra inicios de sesión, descargas, anulaciones y cambios de tarifa.
        </p>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="flex items-center text-xs font-semibold text-slate-700 gap-1.5 mb-1">
              <Fingerprint className="w-4 h-4 text-red-500" />
              Huella de Dispositivo & IP
            </span>
            <p className="text-xs text-slate-500">
              Captura de `device_id`, navegador y dirección IP vía Supabase para identificar el equipo utilizado.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="flex items-center text-xs font-semibold text-slate-700 gap-1.5 mb-1">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Alerta de Cuentas Compartidas
            </span>
            <p className="text-xs text-slate-500">
              Detección de accesos simultáneos o saltos de dispositivo sospechosos entre miembros de la directiva.
            </p>
          </div>
        </div>

        <div className="mt-6 p-4 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-600">
          <strong>Fase 6 del proyecto:</strong> Panel de visualización de eventos de auditoría y alertas rojas anti-cuentas compartidas.
        </div>
      </div>
    </div>
  )
}
