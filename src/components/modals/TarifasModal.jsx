import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Settings, CheckCircle2, AlertCircle, X, ShieldAlert, Zap, Clock, UserPlus, Layers } from 'lucide-react'

export default function TarifasModal({ isOpen, onClose, onUpdated }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [tarifaId, setTarifaId] = useState(null)

  // Valores originales para comparar cambios e insertar en bitacora
  const [originalValues, setOriginalValues] = useState({})

  // Form State
  const [tarifaFijaCerrado, setTarifaFijaCerrado] = useState(55)
  const [tarifaFijaAbierto, setTarifaFijaAbierto] = useState(70)
  const [tarifaFijaAmbulante, setTarifaFijaAmbulante] = useState(50)
  const [tarifaFijaNoSocio, setTarifaFijaNoSocio] = useState(50)
  const [baseVariablePuesto, setBaseVariablePuesto] = useState(58)
  const [multaDiaria, setMultaDiaria] = useState(10)
  const [multaTopeMensual, setMultaTopeMensual] = useState(70)
  const [multaMinimoExento, setMultaMinimoExento] = useState(35)
  const [costoAfiliacion, setCostoAfiliacion] = useState(1500)
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
      tipo_redondeo_luz: tipoRedondeoLuz,
      dias_prorroga_max: parseInt(diasProrrogaMax, 10) || 2,
    }

    // Identificar cambios exactos para la bitácora
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
      let savedId = tarifaId

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
        savedId = data.id
        setTarifaId(data.id)
      }

      // Registro estricto en bitacora_auditoria si hubo cambios
      if (cambios.length > 0) {
        const { error: auditError } = await supabase.from('bitacora_auditoria').insert([
          {
            usuario_id: user?.id || null,
            accion: 'ACTUALIZACION_TARIFAS',
            detalle_json: {
              descripcion: `Modificación de ${cambios.length} parámetro(s) de tarifas`,
              cambios,
              valores_anteriores: originalValues,
              valores_nuevos: newValues,
            },
            device_id: window.navigator.userAgent,
            user_agent: window.navigator.userAgent,
            es_sospechoso: false,
          },
        ])
        if (auditError) {
          console.warn('Aviso: no se pudo registrar en bitácora:', auditError.message)
        }
      }

      setSuccessMsg(
        `¡Tarifas actualizadas correctamente! ${
          cambios.length > 0 ? `(${cambios.length} cambio(s) registrado(s) en la bitácora de auditoría)` : ''
        }`
      )
      if (onUpdated) onUpdated()
      setTimeout(() => {
        onClose()
      }, 1200)
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl my-8 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Configuración de Tarifas del Mercado</h3>
              <p className="text-xs text-slate-400">Rastreo automático en bitácora de auditoría</p>
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
        <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {!user && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <span>
                Los cambios de tarifas solo pueden ser ejecutados por el <strong>Secretario de Hacienda (Admin)</strong>.
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

          {/* Grupo 1: Tarifas Fijas */}
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
                    step="0.50"
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
                    step="0.50"
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
                    step="0.50"
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
                    step="0.50"
                    value={tarifaFijaNoSocio}
                    onChange={(e) => setTarifaFijaNoSocio(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-bold"
                  />
                  <span className="ml-1 text-xs text-slate-500">Bs</span>
                </div>
              </div>
            </div>
          </div>

          {/* Grupo 2: Base Variable y Luz */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5 border-b pb-1">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              2. Modalidad Variable (Luz con Tarifador)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Base Mensual por Puesto (Bs)
                </label>
                <input
                  type="number"
                  step="0.50"
                  value={baseVariablePuesto}
                  onChange={(e) => setBaseVariablePuesto(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-xl font-bold"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Regla: 40 Bs guardia + 5 Bs agua + 5 Bs alumbrado + 8 Bs basura = 58 Bs.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tipo de Redondeo de Luz (Bs)
                </label>
                <select
                  value={tipoRedondeoLuz}
                  onChange={(e) => setTipoRedondeoLuz(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl font-medium"
                >
                  <option value="arriba_0_50">Hacia arriba al 0,50 Bs más cercano (Recomendado)</option>
                  <option value="arriba_1_00">Hacia arriba al +1,00 Bs más cercano</option>
                </select>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  El cálculo de luz nunca redondea hacia abajo.
                </span>
              </div>
            </div>
          </div>

          {/* Grupo 3: Multas, Vencimientos y Prórrogas */}
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
                  step="1"
                  value={multaDiaria}
                  onChange={(e) => setMultaDiaria(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tope Mensual (Bs)</label>
                <input
                  type="number"
                  step="1"
                  value={multaTopeMensual}
                  onChange={(e) => setMultaTopeMensual(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Mínimo Exento (Bs)</label>
                <input
                  type="number"
                  step="1"
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
            <p className="text-[10px] text-slate-500">
              A partir del 1° del mes suma 10 Bs/día hasta tope de 70 Bs. Si el socio abona al menos 35 Bs antes del vencimiento, no genera multa.
            </p>
          </div>

          {/* Grupo 4: Afiliaciones */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-800 flex items-center gap-1.5 border-b pb-1">
              <UserPlus className="w-3.5 h-3.5 text-purple-500" />
              4. Afiliación de Nuevos Socios
            </span>
            <div className="max-w-xs">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Costo Total de Afiliación (Bs)</label>
              <input
                type="number"
                step="50"
                value={costoAfiliacion}
                onChange={(e) => setCostoAfiliacion(e.target.value)}
                className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-xl font-bold"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">Plan estándar: 1.500 Bs por socio nuevo.</span>
            </div>
          </div>

          {/* Botones */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
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
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-900/20 transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{saving ? 'Guardando en Supabase...' : 'Guardar y Registrar en Bitácora'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
