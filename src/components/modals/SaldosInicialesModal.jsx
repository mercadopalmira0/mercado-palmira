import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { registrarAuditoria } from '../../lib/auditoria'
import { getLocalDateStr } from '../../lib/formatters'
import { Wallet, CheckCircle2, AlertCircle, X, ShieldAlert, Calendar, FileText } from 'lucide-react'

export default function SaldosInicialesModal({ isOpen, onClose, onUpdated }) {
  const { user, isAdmin } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const [cicloId, setCicloId] = useState(null)
  const [esInicial, setEsInicial] = useState(true)
  const [nombreCiclo, setNombreCiclo] = useState('Ciclo Inicial - Entrega Tesorero Anterior')
  const [serviciosEfectivo, setServiciosEfectivo] = useState(0)
  const [serviciosQr, setServiciosQr] = useState(0)
  const [afiliacionesEfectivo, setAfiliacionesEfectivo] = useState(0)
  const [afiliacionesQr, setAfiliacionesQr] = useState(0)
  const [fechaArranque, setFechaArranque] = useState(getLocalDateStr())
  const [observaciones, setObservaciones] = useState('')

  useEffect(() => {
    if (!isOpen) return

    const loadSaldos = async () => {
      setLoading(true)
      setErrorMsg('')
      setSuccessMsg('')
      try {
        // 1. Buscar ciclo abierto en ciclos_hacienda
        const { data: cicloAbierto, error: cError } = await supabase
          .from('ciclos_hacienda')
          .select('*')
          .eq('estado', 'abierto')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (cError) throw cError

        if (cicloAbierto) {
          setCicloId(cicloAbierto.id)
          setEsInicial(Boolean(cicloAbierto.es_inicial))
          setNombreCiclo(cicloAbierto.nombre || 'Ciclo Actual')
          setServiciosEfectivo(cicloAbierto.servicios_efectivo_inicial ?? 0)
          setServiciosQr(cicloAbierto.servicios_qr_inicial ?? 0)
          setAfiliacionesEfectivo(cicloAbierto.afiliaciones_efectivo_inicial ?? 0)
          setAfiliacionesQr(cicloAbierto.afiliaciones_qr_inicial ?? 0)
          setFechaArranque(cicloAbierto.fecha_inicio || getLocalDateStr())
          setObservaciones(cicloAbierto.observaciones || '')
          setLoading(false)
          return
        }

        // 2. Respaldo desde saldos_iniciales si aún no hay ciclo creado
        setCicloId(null)
        setEsInicial(true)
        setNombreCiclo('Ciclo Inicial - Entrega Tesorero Anterior')
        const { data, error } = await supabase.from('saldos_iniciales').select('*')
        if (error) throw error

        if (data && data.length > 0) {
          data.forEach((item) => {
            if (item.caja === 'servicios' && item.metodo_pago === 'efectivo') {
              setServiciosEfectivo(item.monto_inicial)
              if (item.fecha_arranque) setFechaArranque(item.fecha_arranque)
              if (item.observaciones) setObservaciones(item.observaciones)
            }
            if (item.caja === 'servicios' && item.metodo_pago === 'qr') {
              setServiciosQr(item.monto_inicial)
            }
            if (item.caja === 'afiliaciones' && item.metodo_pago === 'efectivo') {
              setAfiliacionesEfectivo(item.monto_inicial)
            }
            if (item.caja === 'afiliaciones' && item.metodo_pago === 'qr') {
              setAfiliacionesQr(item.monto_inicial)
            }
          })
        }
      } catch (err) {
        console.error('Error cargando saldos iniciales:', err)
        setErrorMsg('Error al leer saldos iniciales: ' + (err.message || 'Error desconocido'))
      } finally {
        setLoading(false)
      }
    }

    loadSaldos()
  }, [isOpen])

  if (!isOpen) return null

  const handleSave = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')
    setSaving(true)

    const servEf = parseFloat(serviciosEfectivo) || 0
    const servQr = parseFloat(serviciosQr) || 0
    const afilEf = parseFloat(afiliacionesEfectivo) || 0
    const afilQr = parseFloat(afiliacionesQr) || 0

    try {
      const cicloPayload = {
        nombre: nombreCiclo.trim() || 'Ciclo Inicial - Entrega Tesorero Anterior',
        fecha_inicio: fechaArranque,
        es_inicial: esInicial,
        estado: 'abierto',
        servicios_efectivo_inicial: servEf,
        servicios_qr_inicial: servQr,
        afiliaciones_efectivo_inicial: afilEf,
        afiliaciones_qr_inicial: afilQr,
        observaciones: observaciones.trim() || 'Entrega de saldo inicial de tesorero anterior',
      }

      if (cicloId) {
        const { error } = await supabase
          .from('ciclos_hacienda')
          .update(cicloPayload)
          .eq('id', cicloId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('ciclos_hacienda')
          .insert([cicloPayload])
        if (error) throw error
      }

      // Mantener sincronizada saldos_iniciales cuando es ciclo inicial
      if (esInicial) {
        const legacyPayload = [
          {
            caja: 'servicios',
            metodo_pago: 'efectivo',
            monto_inicial: servEf,
            fecha_arranque: fechaArranque,
            observaciones: observaciones.trim() || 'Entrega Tesorero Anterior - Servicios Efectivo',
          },
          {
            caja: 'servicios',
            metodo_pago: 'qr',
            monto_inicial: servQr,
            fecha_arranque: fechaArranque,
            observaciones: observaciones.trim() || 'Entrega Tesorero Anterior - Servicios QR',
          },
          {
            caja: 'afiliaciones',
            metodo_pago: 'efectivo',
            monto_inicial: afilEf,
            fecha_arranque: fechaArranque,
            observaciones: observaciones.trim() || 'Entrega Tesorero Anterior - Afiliaciones Efectivo',
          },
          {
            caja: 'afiliaciones',
            metodo_pago: 'qr',
            monto_inicial: afilQr,
            fecha_arranque: fechaArranque,
            observaciones: observaciones.trim() || 'Entrega Tesorero Anterior - Afiliaciones QR',
          },
        ]
        await supabase.from('saldos_iniciales').upsert(legacyPayload, { onConflict: 'caja,metodo_pago' })
      }

      await registrarAuditoria({
        usuarioId: user?.id,
        accion: 'CONFIGURACION_SALDO_INICIAL_CICLO',
        detalleJson: {
          descripcion: `Configuración de saldo inicial (${cicloPayload.nombre})`,
          ...cicloPayload,
        },
      })

      setSuccessMsg('¡Saldos iniciales del ciclo guardados correctamente!')
      if (onUpdated) onUpdated()
      setTimeout(() => {
        onClose()
      }, 900)
    } catch (err) {
      console.error('Error guardando saldos iniciales:', err)
      const isRlsError = err.message?.includes('violates row-level security policy') || err.code === '42501'
      setErrorMsg(
        isRlsError
          ? 'Bloqueado por política RLS: debes iniciar sesión como Administrador para modificar los saldos iniciales.'
          : 'Error al guardar saldos iniciales: ' + (err.message || 'Error desconocido')
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg my-8 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                Saldo Inicial / Entrega Tesorero Anterior
              </h3>
              <p className="text-xs text-slate-400">
                Dinero inicial recibido en ambas cajas para el ciclo abierto
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[78vh] overflow-y-auto">
          {!isAdmin && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <span>
                Solo el usuario con rol <strong>Admin</strong> puede modificar los saldos iniciales de ciclo.
              </span>
            </div>
          )}

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
            <div className="py-6 text-center text-xs text-slate-500">Cargando ciclo actual...</div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre del Ciclo</label>
                  <input
                    type="text"
                    required
                    value={nombreCiclo}
                    onChange={(e) => setNombreCiclo(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Fecha de Inicio / Entrega
                  </label>
                  <input
                    type="date"
                    required
                    value={fechaArranque}
                    onChange={(e) => setFechaArranque(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Caja 1: Servicios Básicos */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                    1. Caja Servicios Básicos
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">Recibido inicial</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Efectivo en Mano (Bs)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={serviciosEfectivo}
                      onChange={(e) => setServiciosEfectivo(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Saldo en QR / Banco (Bs)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={serviciosQr}
                      onChange={(e) => setServiciosQr(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold text-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* Caja 2: Afiliaciones */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
                    2. Caja Afiliaciones
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">Recibido inicial</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Efectivo en Mano (Bs)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={afiliacionesEfectivo}
                      onChange={(e) => setAfiliacionesEfectivo(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Saldo en QR / Banco (Bs)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={afiliacionesQr}
                      onChange={(e) => setAfiliacionesQr(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold text-slate-900"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  Observaciones / Acta de Entrega
                </label>
                <textarea
                  rows={2}
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Ej. Entrega de caja por tesorero saliente según acta de fecha..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </>
          )}

          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || loading || !isAdmin}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-900/20 transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{saving ? 'Guardando...' : 'Guardar Saldos del Ciclo'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
