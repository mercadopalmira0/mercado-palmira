import React from 'react'
import { ArrowDownCircle, CloudUpload, ArrowRightLeft } from 'lucide-react'

export default function EgresosView() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-3 text-emerald-600 mb-2">
          <ArrowDownCircle className="w-6 h-6" />
          <h2 className="text-xl font-bold text-slate-900">Egresos y Movimientos Internos</h2>
        </div>
        <p className="text-sm text-slate-600">
          Registro estricto de egresos clasificados por caja y transferencias internas (Efectivo ↔ QR y préstamos/reposiciones).
        </p>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="flex items-center text-xs font-semibold text-slate-700 gap-1.5 mb-1">
              <CloudUpload className="w-4 h-4 text-sky-500" />
              Respaldo en Google Drive
            </span>
            <p className="text-xs text-slate-500">
              Compresión automática en cliente (~200 KB) y subida a carpetas ordenadas por mes vía Google Apps Script.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="flex items-center text-xs font-semibold text-slate-700 gap-1.5 mb-1">
              <ArrowRightLeft className="w-4 h-4 text-indigo-500" />
              Movimientos Internos
            </span>
            <p className="text-xs text-slate-500">
              Retiros de cajero (QR a Efectivo) y préstamos entre cajas para asegurar que el arqueo nunca se descuadre.
            </p>
          </div>
        </div>

        <div className="mt-6 p-4 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-600">
          <strong>Fase 4 del proyecto:</strong> Programación del formulario de egresos con selector de categoría y captura de recibo.
        </div>
      </div>
    </div>
  )
}
