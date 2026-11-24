import React from 'react'
import { FileSpreadsheet, Lock, Printer, Download } from 'lucide-react'

export default function RendicionView() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-3 text-emerald-600 mb-2">
          <FileSpreadsheet className="w-6 h-6" />
          <h2 className="text-xl font-bold text-slate-900">Rendición de Cuentas (Vista Laptop)</h2>
        </div>
        <p className="text-sm text-slate-600">
          Consolidación de periodos trimestrales (3 a 4 meses) para asambleas de socios, con exportación a PDF imprimible y Excel.
        </p>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="flex items-center text-xs font-semibold text-slate-700 gap-1.5 mb-1">
              <Printer className="w-4 h-4 text-emerald-600" />
              Informe Completo
            </span>
            <p className="text-xs text-slate-500">
              Arqueo de fondos, desglose de ingresos y egresos con links directos a Drive, lista de morosos y pie de firmas.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="flex items-center text-xs font-semibold text-slate-700 gap-1.5 mb-1">
              <Lock className="w-4 h-4 text-amber-600" />
              Bloqueo Post-Asamblea
            </span>
            <p className="text-xs text-slate-500">
              Botón "Rendido en Asamblea" para sellar y congelar los meses aprobados contra modificaciones accidentales.
            </p>
          </div>
        </div>

        <div className="mt-6 p-4 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-600">
          <strong>Fase 5 del proyecto:</strong> Implementación de las plantillas PDF con jsPDF y exportación de libros con SheetJS.
        </div>
      </div>
    </div>
  )
}
