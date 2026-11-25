import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { registrarAuditoria } from '../../lib/auditoria'
import { Settings, CheckCircle2, AlertCircle, X, ShieldAlert, Zap, Clock, UserPlus, Shield } from 'lucide-react'

export default function TarifasModal({ isOpen, onClose, onUpdated }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [tarifaId, setTarifaId] = useState(null)
  const [originalValues, setOriginalValues] = useState({})

  const [tarifaFijaCerrado, setTarifaFijaCerrado] = useState(55)
  const [tarifaFijaAbierto, setTarifaFijaAbierto] = useState(70)
  const [tarifaFijaAmbulante, setTarifaFijaAmbulante] = useState(50)
  const [tarifaFijaNoSocio, setTarifaFijaNoSocio] = useState(50)
  const [baseVariablePuesto, setBaseVariablePuesto] = useState(58)
  const [multaDiaria, setMultaDiaria] = useState(10)
  const [multaTopeMensual, setMultaTopeMensual] = useState(70)
  const [multaMinimoExento, setMultaMinimoExento] = useState(35)
  const [costoAfiliacion, setCostoAfiliacion] = useState(1500)
  const [sueldoGuardiaMensual, setSueldoGuardiaMensual] = useState(0)
  const [tipoRedondeoLuz, setTipoRedondeoLuz] = useState('arriba_0_50')
  const [diasProrrogaMax, setDiasProrrogaMax] = useState(2)

  useEffect(() => {
    if (!isOpen) return

    const loadTarifas = async () => {
      setLoading(true)
      setErrorMsg('')
      setSuccessMsg('')
      try {
        const { data, error } = await supabase
          .from('configuracion_tarifas')
          .select('*')
          .limit(1)
          .maybeSingle()

        if (error) throw error

        if (data) {
          setTarifaId(data.id)
          setTarifaFijaCerrado(data.tarifa_fija_cerrado)
          setTarifaFijaAbierto(data.tarifa_fija_abierto)
          setTarifaFijaAmbulante(data.tarifa_fija_ambulante)
          setTarifaFijaNoSocio(data.tarifa_fija_no_socio)
          setBaseVariablePuesto(data.base_variable_puesto)
          setMultaDiaria(data.multa_diaria)
          setMultaTopeMensual(data.multa_tope_mensual)
          setMultaMinimoExento(data.multa_minimo_exento)
          setCostoAfiliacion(data.costo_afiliacion)
          setSueldoGuardiaMensual(data.sueldo_guardia_mensual ?? 0)
          setTipoRedondeoLuz(data.tipo_redondeo_luz || 'arriba_0_50')
          setDiasProrrogaMax(data.dias_prorroga_max || 2)

          setOriginalValues({
            tarifa_fija_cerrado: data.tarifa_fija_cerrado,
            tarifa_fija_abierto: data.tarifa_fija_abierto,
            tarifa_fija_ambulante: data.tarifa_fija_ambulante,
            tarifa_fija_no_socio: data.tarifa_fija_no_socio,
            base_variable_puesto: data.base_variable_puesto,
            multa_diaria: data.multa_diaria,
            multa_tope_mensual: data.multa_tope_mensual,
            multa_minimo_exento: data.multa_minimo_exento,
            costo_afiliacion: data.costo_afiliacion,
            sueldo_guardia_mensual: data.sueldo_guardia_mensual ?? 0,
            tipo_redondeo_luz: data.tipo_redondeo_luz,
            dias_prorroga_max: data.dias_prorroga_max,
          })
        }
      } catch (err) {
        console.error('Error cargando tarifas:', err)
        setErrorMsg('Error al leer tarifas: ' + (err.message || 'Error desconocido'))
      } finally {
        setLoading(false)
      }
    }

    loadTarifas()
  }, [isOpen])

  if (!isOpen) return null

  const handleSave = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')
    setSaving(true)

    const newValues = {
      tarifa_fija_cerrado: parseFloat(tarifaFijaCerrado) || 0,
      tarifa_fija_abierto: parseFloat(tarifaFijaAbierto) || 0,
      tarifa_fija_ambulante: parseFloat(tarifaFijaAmbulante) || 0,
      tarifa_fija_no_socio: parseFloat(tarifaFijaNoSocio) || 0,
      base_variable_puesto: parseFloat(baseVariablePuesto) || 0,
      multa_diaria: parseFloat(multaDiaria) || 0,
      multa_tope_mensual: parseFloat(multaTopeMensual) || 0,
      multa_minimo_exento: parseFloat(multaMinimoExento) || 0,
      costo_afiliacion: parseFloat(costoAfiliacion) || 0,
      sueldo_guardia_mensual: parseFloat(sueldoGuardiaMensual) || 0,
      tipo_redondeo_luz: tipoRedondeoLuz,
      dias_prorroga_max: parseInt(diasProrrogaMax, 10) || 2,
    }

    const cambios = []
    Object.keys(newValues).forEach((key) => {
      if (originalValues[key] !== undefined && originalValues[key] !== newValues[key]) {
        cambios.push({
          campo: key,
          valor_anterior: originalValues[key],
          valor_nuevo: newValues[key],
        })
      }
    })

    try {
      if (tarifaId) {
        const { error } = await supabase
          .from('configuracion_tarifas')
          .update(newValues)
          .eq('id', tarifaId)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('configuracion_tarifas')
          .insert([newValues])
          .select()
          .single()
        if (error) throw error
        setTarifaId(data.id)
      }

      if (cambios.length > 0) {
        await registrarAuditoria({
          usuarioId: user?.id,
          accion: 'ACTUALIZACION_TARIFAS',
          detalleJson: {
            descripcion: `Modificación de ${cambios.length} parámetro(s) de tarifas`,
            cambios,
            valores_anteriores: originalValues,
            valores_nuevos: newValues,
          },
        })
      }

      setSuccessMsg(
        `¡Tarifas actualizadas correctamente! ${
          cambios.length > 0 ? `(${cambios.length} cambio(s) registrado(s) en la bitácora)` : ''
        }`
      )
      if (onUpdated) onUpdated()
      setTimeout(() => {
        onClose()
      }, 1000)
    } catch (err) {
      console.error('Error guardando tarifas:', err)
      const isRlsError = err.message?.includes('violates row-level security policy') || err.code === '42501'
      setErrorMsg(
        isRlsError
          ? 'Bloqueado por política RLS: debes iniciar sesión como Administrador para modificar las tarifas.'
          : 'Error al guardar tarifas: ' + (err.message || 'Error desconocido')
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-xl max-h-[88dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
        <div className="shrink-0 bg-slate-900 px-5 py-3.5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg shrink-0">
              <Settings className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base leading-tight truncate">Configuración de Tarifas del Mercado</h3>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">Rastreo automático en bitácora de auditoría</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
          {loading && <p className="text-xs text-slate-500 text-center">Cargando configuración...</p>}

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

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block border-b pb-1">
              1. Tarifas Fijas Mensuales
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Puesto Abierto</label>
                <div className="flex items-center">
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    value={tarifaFijaAbierto}
                    onChange={(e) => setTarifaFijaAbierto(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-bold"
                  />
                  <span className="ml-1 text-xs text-slate-500">Bs</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Puesto Cerrado</label>
                <div className="flex items-center">
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    value={tarifaFijaCerrado}
                    onChange={(e) => setTarifaFijaCerrado(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-bold"
                  />
                  <span className="ml-1 text-xs text-slate-500">Bs</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Ambulante</label>
                <div className="flex items-center">
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    value={tarifaFijaAmbulante}
                    onChange={(e) => setTarifaFijaAmbulante(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-bold"
                  />
                  <span className="ml-1 text-xs text-slate-500">Bs</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">No Socio</label>
                <div className="flex items-center">
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    value={tarifaFijaNoSocio}
                    onChange={(e) => setTarifaFijaNoSocio(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-bold"
                  />
                  <span className="ml-1 text-xs text-slate-500">Bs</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5 border-b pb-1">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              2. Modalidad Variable (Luz con Tarifador)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Base Mensual por Puesto (Bs)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={baseVariablePuesto}
                  onChange={(e) => setBaseVariablePuesto(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-xl font-bold"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  40 Bs guardia + 5 Bs agua + 5 Bs alumbrado + 8 Bs basura = 58 Bs.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de Redondeo de Luz (Bs)</label>
                <select
                  value={tipoRedondeoLuz}
                  onChange={(e) => setTipoRedondeoLuz(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl font-medium"
                >
                  <option value="arriba_0_50">Hacia arriba al 0,50 Bs más cercano</option>
                  <option value="arriba_1_00">Hacia arriba al +1,00 Bs más cercano</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-800 flex items-center gap-1.5 border-b pb-1">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              3. Multas por Retraso y Prórrogas
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Multa Diaria (Bs)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={multaDiaria}
                  onChange={(e) => setMultaDiaria(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tope Mensual (Bs)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={multaTopeMensual}
                  onChange={(e) => setMultaTopeMensual(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Mínimo Exento (Bs)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={multaMinimoExento}
                  onChange={(e) => setMultaMinimoExento(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Prórroga Rápida</label>
                <input
                  type="number"
                  step="1"
                  value={diasProrrogaMax}
                  onChange={(e) => setDiasProrrogaMax(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-bold"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-800 flex items-center gap-1.5 border-b pb-1">
                <UserPlus className="w-3.5 h-3.5 text-purple-500" />
                4. Afiliación
              </span>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Costo Total (Bs)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={costoAfiliacion}
                  onChange={(e) => setCostoAfiliacion(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-xl font-bold"
                />
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5 border-b pb-1">
                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                5. Sueldo Guardia
              </span>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Sueldo Mensual (Bs)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={sueldoGuardiaMensual}
                  onChange={(e) => setSueldoGuardiaMensual(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-xl font-bold"
                />
              </div>
            </div>
          </div>

          </div>

          <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-900/20 transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{saving ? 'Guardando...' : 'Guardar y Registrar'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
