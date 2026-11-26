import React from 'react'
import { Layers, Edit2, Unlink } from 'lucide-react'

export default function GruposCobroTab({
  gruposCobro,
  isAdmin,
  onCreateGrupo,
  onEditGrupo,
  onDesagrupar,
}) {
  return (
    <div className="space-y-4">
      <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 text-xs text-purple-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <p className="font-bold">Grupos de Cobro ({gruposCobro.length})</p>
          <p className="text-purple-800 mt-0.5">
            Los puestos agrupados generan una sola boleta mensual a nombre del titular responsable, evitando cobros duplicados.
          </p>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={onCreateGrupo}
            className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold flex items-center gap-1.5 self-start sm:self-center"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>+ Crear Grupo</span>
          </button>
        )}
      </div>

      {gruposCobro.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 text-xs text-slate-500 space-y-2">
          <Layers className="w-10 h-10 mx-auto text-slate-300" />
          <p>Aún no hay grupos de cobro creados. Usa "+ Crear Grupo" para agrupar 2 o más puestos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {gruposCobro.map(({ lider, miembros, resumen }) => (
            <div key={lider.id} className="bg-white rounded-2xl p-4 border border-purple-200 shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-purple-700 text-white text-xs font-black">
                      {resumen.puestosLabel}
                    </span>
                    {lider.nombre_grupo && (
                      <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-900 text-xs font-bold">
                        {lider.nombre_grupo}
                      </span>
                    )}
                  </div>
                  <h4 className="font-extrabold text-sm sm:text-base text-slate-900 mt-1.5">
                    Titular: {lider.socios?.nombre || 'Sin socio'}
                  </h4>
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onEditGrupo({ lider, miembros })}
                      className="px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold flex items-center gap-1"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDesagrupar({ lider, miembros })}
                      className="px-2.5 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 text-xs font-bold flex items-center gap-1"
                    >
                      <Unlink className="w-3.5 h-3.5" />
                      <span>Desagrupar</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1.5 text-xs">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  Integrantes del Grupo ({1 + miembros.length} puestos)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2 py-1 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[11px]">
                    ★ {lider.numero_identificador} • {lider.socios?.nombre}
                  </span>
                  {miembros.map((m) => (
                    <span
                      key={m.id}
                      className="px-2 py-1 rounded-lg bg-white text-slate-700 border border-slate-200 font-medium text-[11px]"
                    >
                      {m.numero_identificador} • {m.socios?.nombre}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-slate-600">
                  Modalidad:{' '}
                  <strong className="text-slate-900 capitalize">
                    {lider.tipo === 'variable'
                      ? `Variable (Tarifador ${lider.codigo_tarifador || 'S/C'})`
                      : lider.subtipo_fijo === 'personalizado'
                      ? `Personalizado (${parseFloat(lider.monto_fijo_personalizado || 0).toFixed(2)} Bs)`
                      : `Fijo (${(lider.subtipo_fijo || 'puesto_abierto').replace('_', ' ')})`}
                  </strong>
                </span>
                <span className="text-[11px] font-bold text-purple-700">1 boleta mensual</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
