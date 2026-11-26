import React from 'react'
import { ExternalLink } from 'lucide-react'

export default function TraspasosTab({ traspasos }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
          Registro Histórico de Traspasos / Venta de Puestos ({traspasos.length})
        </span>
      </div>

      {traspasos.length === 0 ? (
        <div className="p-10 text-center text-xs text-slate-500">
          No se han registrado traspasos de puestos todavía.
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {traspasos.map((tr) => (
            <div key={tr.id} className="p-4 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-bold">{tr.puesto_referencia}</span>
                  <span className="font-bold text-red-700">{tr.nombre_socio_anterior}</span>
                  <span className="text-slate-400">➔</span>
                  <span className="font-bold text-emerald-700">{tr.nombre_socio_nuevo}</span>
                  {tr.incluye_afiliacion_nueva && (
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                      Con Afiliación Nueva
                    </span>
                  )}
                </div>
                {tr.observaciones && <p className="text-slate-600">{tr.observaciones}</p>}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-slate-500 font-mono">{tr.fecha_traspaso}</span>
                {tr.documento_respaldo_url && (
                  <a
                    href={tr.documento_respaldo_url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg font-semibold inline-flex items-center gap-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Acta</span>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
