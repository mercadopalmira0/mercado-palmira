import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { registrarAuditoria, registrarEdicionAuditoria, registrarEliminacionAuditoria } from '../../lib/auditoria'
import { getNombreSocioCobro, formatFechaHoraBolivia } from '../../lib/formatters'
import ConfirmMotivoModal from './ConfirmMotivoModal'
import { Receipt, Coins, QrCode, X, AlertCircle, CheckCircle2, RefreshCw, ExternalLink, ShieldAlert, Edit2, Trash2 } from 'lucide-react'

export default function HistorialPagosModal({
  isOpen,
  onClose,
  cobro,
  onPaymentUpdated,
}) {
  const { user, isAdmin } = useAuth()
  const [pagos, setPagos] = useState([])
  const [loading, setLoading] = useState(true)
  const [anulandoId, setAnulandoId] = useState(null)
  const [motivoAnulacion, setMotivoAnulacion] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Edición de pago
  const [editingPago, setEditingPago] = useState(null)
  const [editMonto, setEditMonto] = useState('')
  const [editMetodo, setEditMetodo] = useState('efectivo')
  const [editTalonario, setEditTalonario] = useState('')

  // Confirmación auditada
  const [confirmState, setConfirmState] = useState({ open: false, tipo: 'edicion', targetPago: null })
  const [processingAudit, setProcessingAudit] = useState(false)

  const fetchPagos = async () => {
    if (!cobro?.id) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('pagos_servicios')
        .select('*')
        .eq('cobro_id', cobro.id)
        .order('fecha_pago', { ascending: false })

      if (error) throw error
      setPagos(data || [])
    } catch (err) {
      console.error(err)
      setErrorMsg('Error al cargar pagos: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchPagos()
      setAnulandoId(null)
      setMotivoAnulacion('')
      setEditingPago(null)
      setErrorMsg('')
      setSuccessMsg('')
    }
  }, [isOpen, cobro])

  if (!isOpen || !cobro) return null

  const nombreSocio = getNombreSocioCobro(cobro)

  const recalcularEstadoCobro = async () => {
    const { data: activePagos, error: aError } = await supabase
      .from('pagos_servicios')
      .select('monto')
      .eq('cobro_id', cobro.id)
      .eq('estado', 'activo')

    if (aError) throw aError

    const nuevoTotalPagado = activePagos?.reduce((sum, p) => sum + (parseFloat(p.monto) || 0), 0) || 0
    const totalCobro = parseFloat(cobro.totalAPagar ?? cobro.total_a_pagar) || 0
    const nuevoSaldo = totalCobro - nuevoTotalPagado
    const nuevoEstado = nuevoTotalPagado <= 0 ? 'pendiente' : nuevoSaldo <= 0 ? 'pagado' : 'parcial'

    await supabase
      .from('cobros_servicios')
      .update({ estado: nuevoEstado })
      .eq('id', cobro.id)
  }

  const handleAnular = async (pagoId) => {
    if (!motivoAnulacion.trim()) {
      setErrorMsg('El motivo de anulación es obligatorio.')
      return
    }

    try {
      setErrorMsg('')
      const { error: pError } = await supabase
        .from('pagos_servicios')
        .update({
          estado: 'anulado',
          motivo_anulacion: motivoAnulacion.trim(),
        })
        .eq('id', pagoId)

      if (pError) throw pError

      await recalcularEstadoCobro()

      await registrarAuditoria({
        usuarioId: user?.id,
        accion: 'ANULACION_PAGO_SERVICIO',
        detalleJson: {
          descripcion: `Anulación de pago de ${nombreSocio} (${cobro.unidades_cobro?.numero_identificador})`,
          tabla: 'pagos_servicios',
          registro_id: pagoId,
          motivo: motivoAnulacion.trim(),
        },
      })

      setSuccessMsg('Pago anulado correctamente con registro de auditoría.')
      setAnulandoId(null)
      setMotivoAnulacion('')
      await fetchPagos()
      if (onPaymentUpdated) onPaymentUpdated()
    } catch (err) {
      console.error(err)
      setErrorMsg('Error al anular el pago: ' + err.message)
    }
  }

  const handleConfirmAudit = async (motivo) => {
    const { tipo, targetPago } = confirmState
    if (!targetPago) return

    setProcessingAudit(true)
    setErrorMsg('')
    try {
      if (tipo === 'edicion') {
        const nuevoMonto = parseFloat(editMonto)
        if (!nuevoMonto || nuevoMonto <= 0) {
          throw new Error('Ingresa un monto válido mayor a 0.')
        }

        const datosAnteriores = {
          monto: parseFloat(targetPago.monto) || 0,
          metodo_pago: targetPago.metodo_pago,
          nro_talonario_fisico: targetPago.nro_talonario_fisico || null,
        }
        const datosNuevos = {
          monto: nuevoMonto,
          metodo_pago: editMetodo,
          nro_talonario_fisico: editTalonario.trim() || null,
        }

        await registrarEdicionAuditoria({
          usuarioId: user?.id,
          modulo: 'Cobros / Pagos de Servicios',
          tabla: 'pagos_servicios',
          registroId: targetPago.id,
          motivo,
          resumen: `Edición de pago de ${nombreSocio} (${cobro.unidades_cobro?.numero_identificador})`,
          datosAnteriores,
          datosNuevos,
        })

        const { error } = await supabase
          .from('pagos_servicios')
          .update(datosNuevos)
          .eq('id', targetPago.id)
        if (error) throw error

        await recalcularEstadoCobro()
        setEditingPago(null)
        setSuccessMsg('Pago editado y recalculado con auditoría en bitácora.')
      } else {
        await registrarEliminacionAuditoria({
          usuarioId: user?.id,
          modulo: 'Cobros / Pagos de Servicios',
          tabla: 'pagos_servicios',
          registroId: targetPago.id,
          motivo,
          resumen: `Eliminación de pago (${targetPago.monto} Bs) de ${nombreSocio} (${cobro.unidades_cobro?.numero_identificador})`,
          datosAnteriores: targetPago,
        })

        const { error } = await supabase.from('pagos_servicios').delete().eq('id', targetPago.id)
        if (error) throw error

        await recalcularEstadoCobro()
        setSuccessMsg('Pago eliminado y saldo recalculado con auditoría en bitácora.')
      }

      setConfirmState({ open: false, tipo: 'edicion', targetPago: null })
      await fetchPagos()
      if (onPaymentUpdated) onPaymentUpdated()
    } catch (err) {
      console.error(err)
      setErrorMsg(err.message)
      setConfirmState({ open: false, tipo: 'edicion', targetPago: null })
    } finally {
      setProcessingAudit(false)
    }
  }

  const subtitulo = cobro.resumenGrupo?.esGrupo
    ? `${cobro.resumenGrupo.puestosLabel} • ${cobro.resumenGrupo.sociosLabel}`
    : `${cobro.unidades_cobro?.numero_identificador || ''} • ${nombreSocio}`

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg max-h-[88dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
        <div className="shrink-0 bg-slate-900 px-5 py-3.5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base leading-tight truncate">Historial de Pagos</h3>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                {subtitulo}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-500">
              <RefreshCw className="w-5 h-5 mx-auto animate-spin mb-2 text-slate-400" />
              Cargando historial de pagos...
            </div>
          ) : pagos.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No hay pagos registrados para este cobro en el mes.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {pagos.map((pago) => {
                const isAnulado = pago.estado === 'anulado'
                const isThisAnulando = anulandoId === pago.id
                const isThisEditing = editingPago?.id === pago.id

                return (
                  <div key={pago.id} className="py-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`p-1.5 rounded-lg ${
                            pago.metodo_pago === 'qr' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                          }`}
                        >
                          {pago.metodo_pago === 'qr' ? <QrCode className="w-3.5 h-3.5" /> : <Coins className="w-3.5 h-3.5" />}
                        </span>
                        <div>
                          <p className={`font-bold ${isAnulado ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                            {parseFloat(pago.monto).toFixed(2)} Bs
                          </p>
                          <span className="text-[10px] text-slate-400">
                            {formatFechaHoraBolivia(pago.fecha_pago)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5">
                        {pago.nro_talonario_fisico && (
                          <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-mono">
                            N° {pago.nro_talonario_fisico}
                          </span>
                        )}

                        {pago.comprobante_drive_url && (
                          <a href={pago.comprobante_drive_url} target="_blank" rel="noreferrer" className="p-1 text-blue-600">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}

                        {isAnulado ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">
                            Anulado
                          </span>
                        ) : (
                          isAdmin && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingPago(pago)
                                  setEditMonto(String(pago.monto))
                                  setEditMetodo(pago.metodo_pago || 'efectivo')
                                  setEditTalonario(pago.nro_talonario_fisico || '')
                                  setAnulandoId(null)
                                }}
                                title="Editar pago"
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setAnulandoId(pago.id)
                                  setMotivoAnulacion('')
                                  setEditingPago(null)
                                }}
                                className="px-2 py-1 text-[11px] font-semibold text-orange-600 hover:bg-orange-50 rounded-lg"
                              >
                                Anular
                              </button>
                            </>
                          )
                        )}

                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => setConfirmState({ open: true, tipo: 'eliminacion', targetPago: pago })}
                            title="Eliminar pago cargado por error"
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {isThisEditing && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-2 text-xs">
                        <span className="font-bold text-blue-900 block">Editar Pago (Auditado)</span>
                        <div className="grid grid-cols-3 gap-2">
                          <input
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            min="0.01"
                            value={editMonto}
                            onChange={(e) => setEditMonto(e.target.value)}
                            className="px-2 py-1 bg-white border border-slate-300 rounded-lg font-bold"
                            placeholder="Monto"
                          />
                          <select
                            value={editMetodo}
                            onChange={(e) => setEditMetodo(e.target.value)}
                            className="px-2 py-1 bg-white border border-slate-300 rounded-lg"
                          >
                            <option value="efectivo">Efectivo</option>
                            <option value="qr">QR / Banco</option>
                          </select>
                          <input
                            type="text"
                            value={editTalonario}
                            onChange={(e) => setEditTalonario(e.target.value)}
                            className="px-2 py-1 bg-white border border-slate-300 rounded-lg"
                            placeholder="N° Talonario"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => setEditingPago(null)} className="text-slate-600">
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmState({ open: true, tipo: 'edicion', targetPago: pago })}
                            className="px-3 py-1 bg-blue-600 text-white rounded-lg font-bold"
                          >
                            Guardar Edición
                          </button>
                        </div>
                      </div>
                    )}

                    {isAnulado && pago.motivo_anulacion && (
                      <div className="p-2 bg-red-50 border border-red-100 rounded-lg text-[11px] text-red-700">
                        <strong>Motivo de anulación:</strong> {pago.motivo_anulacion}
                      </div>
                    )}

                    {isThisAnulando && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs">
                        <div className="flex items-center gap-1.5 text-amber-800 font-bold">
                          <ShieldAlert className="w-4 h-4 text-amber-600" />
                          <span>Anulación con Motivo Obligatorio</span>
                        </div>
                        <input
                          type="text"
                          required
                          value={motivoAnulacion}
                          onChange={(e) => setMotivoAnulacion(e.target.value)}
                          placeholder="Escribe el motivo de la anulación..."
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                        />
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button type="button" onClick={() => setAnulandoId(null)} className="px-2.5 py-1 text-slate-600 text-[11px]">
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAnular(pago.id)}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[11px] font-bold"
                          >
                            Confirmar Anulación
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <ConfirmMotivoModal
        isOpen={confirmState.open}
        onClose={() => setConfirmState({ open: false, tipo: 'edicion', targetPago: null })}
        onConfirm={handleConfirmAudit}
        tipo={confirmState.tipo}
        titulo={confirmState.tipo === 'eliminacion' ? 'Eliminar Pago de Servicios' : 'Editar Pago de Servicios'}
        descripcion={
          confirmState.targetPago
            ? `${confirmState.tipo === 'eliminacion' ? 'Se eliminará' : 'Se actualizará'} el abono de ${confirmState.targetPago.monto} Bs (${nombreSocio}) y se recalculará el saldo del puesto y las cajas.`
            : ''
        }
        loading={processingAudit}
      />
    </div>
  )
}
