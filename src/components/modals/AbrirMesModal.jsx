import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { MESES } from '../../lib/formatters'
import { calcularDesgloseRubrosBase } from '../../lib/calculosCobro'
import FotoUploaderModal from './FotoUploaderModal'
import { Zap, Camera, CheckCircle2, AlertCircle, X, ExternalLink } from 'lucide-react'

export default function AbrirMesModal({
  isOpen,
  onClose,
  mes,
  anio,
  periodoExistente,
  tarifas = {},
  onMonthOpened,
}) {
  const [facturaEnergia, setFacturaEnergia] = useState('')
  const [facturaAlumbrado, setFacturaAlumbrado] = useState('')
  const [facturaBasura, setFacturaBasura] = useState('')
  const [facturaKwh, setFacturaKwh] = useState('')
  const [facturaUrl, setFacturaUrl] = useState('')
  const [unidades, setUnidades] = useState([])
  const [unidadesModalidad, setUnidadesModalidad] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false)

  const energiaNum = parseFloat(facturaEnergia) || 0
  const alumbradoNum = parseFloat(facturaAlumbrado) || 0
  const basuraNum = parseFloat(facturaBasura) || 0
  const totalFacturaBs = energiaNum + alumbradoNum + basuraNum
  const kwhNum = parseFloat(facturaKwh) || 0

  // REGLA CRÍTICA: Precio por kWh = ÚNICAMENTE Consumo de Energía / Total kWh
  const precioKwhCalculado = kwhNum > 0 ? (energiaNum / kwhNum).toFixed(4) : '0.0000'

  useEffect(() => {
    if (!isOpen) return

    if (periodoExistente) {
      const hasDesglose =
        (parseFloat(periodoExistente.factura_energia_bs) || 0) > 0 ||
        (parseFloat(periodoExistente.factura_alumbrado_bs) || 0) > 0 ||
        (parseFloat(periodoExistente.factura_basura_bs) || 0) > 0
      setFacturaEnergia(
        hasDesglose
          ? periodoExistente.factura_energia_bs ?? ''
          : periodoExistente.factura_luz_bs ?? ''
      )
      setFacturaAlumbrado(periodoExistente.factura_alumbrado_bs ?? 0)
      setFacturaBasura(periodoExistente.factura_basura_bs ?? 0)
      setFacturaKwh(periodoExistente.factura_luz_kwh || '')
      setFacturaUrl(periodoExistente.factura_luz_drive_url || '')
    } else {
      setFacturaEnergia('')
      setFacturaAlumbrado('0')
      setFacturaBasura('0')
      setFacturaKwh('')
      setFacturaUrl('')
    }

    setErrorMsg('')
    setSuccessMsg('')

    const loadUnidades = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('unidades_cobro')
          .select(`
            *,
            socios (id, nombre, activo)
          `)
          .eq('activo', true)
          .order('numero_identificador')

        if (error) throw error

        setUnidades(data || [])
        const mods = {}
        data?.forEach((u) => {
          mods[u.id] = u.tipo === 'variable' ? 'variable' : u.subtipo_fijo || 'puesto_abierto'
        })
        setUnidadesModalidad(mods)
      } catch (err) {
        console.error(err)
        setErrorMsg('Error al cargar unidades de cobro activas: ' + err.message)
      } finally {
        setLoading(false)
      }
    }

    loadUnidades()
  }, [isOpen, periodoExistente, mes, anio])

  if (!isOpen) return null

  const handleModalityChange = (unidadId, newMod) => {
    setUnidadesModalidad((prev) => ({
      ...prev,
      [unidadId]: newMod,
    }))
  }

  const handleConfirm = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')
    setSaving(true)

    try {
      const periodoPayload = {
        mes: parseInt(mes, 10),
        anio: parseInt(anio, 10),
        factura_energia_bs: energiaNum,
        factura_alumbrado_bs: alumbradoNum,
        factura_basura_bs: basuraNum,
        factura_luz_bs: totalFacturaBs,
        factura_luz_kwh: kwhNum,
        precio_kwh_calculado: parseFloat(precioKwhCalculado) || 0,
        factura_luz_drive_url: facturaUrl || null,
        estado_pago_factura: periodoExistente?.estado_pago_factura || 'pendiente_pago',
      }

      let periodoId = periodoExistente?.id

      if (periodoId) {
        const { error: pError } = await supabase
          .from('periodos_mensuales')
          .update(periodoPayload)
          .eq('id', periodoId)
        if (pError) throw pError
      } else {
        const { data: newP, error: pError } = await supabase
          .from('periodos_mensuales')
          .insert([periodoPayload])
          .select()
          .single()
        if (pError) throw pError
        periodoId = newP.id
      }

      // Generar foto histórica de cobros_servicios para cada unidad activa sin sobrescribir existentes
      const baseVariable = parseFloat(tarifas.base_variable_puesto) || 58
      const tarifaCerrado = parseFloat(tarifas.tarifa_fija_cerrado) || 55
      const tarifaAbierto = parseFloat(tarifas.tarifa_fija_abierto) || 70
      const tarifaAmbulante = parseFloat(tarifas.tarifa_fija_ambulante) || 50
      const tarifaNoSocio = parseFloat(tarifas.tarifa_fija_no_socio) || 50

      const { data: existingCobros } = await supabase
        .from('cobros_servicios')
        .select('unidad_id, id')
        .eq('periodo_id', periodoId)

      const existingMap = new Set(existingCobros?.map((c) => c.unidad_id) || [])
      const cobrosToInsert = []

      for (const unidad of unidades) {
        if (!existingMap.has(unidad.id)) {
          const mod = unidadesModalidad[unidad.id] || (unidad.tipo === 'variable' ? 'variable' : 'puesto_abierto')
          const puestos = unidad.cantidad_puestos || 1

          let montoBase = 0
          if (mod === 'variable') {
            montoBase = baseVariable * puestos
          } else if (mod === 'puesto_cerrado') {
            montoBase = tarifaCerrado
          } else if (mod === 'puesto_abierto') {
            montoBase = tarifaAbierto
          } else if (mod === 'ambulante') {
            montoBase = tarifaAmbulante
          } else if (mod === 'no_socio') {
            montoBase = tarifaNoSocio
          }

          const rubros = calcularDesgloseRubrosBase({
            cantidadPuestos: puestos,
            montoBase,
            montoLuzRedondeado: 0,
            reglaCeroKwhAplicada: false,
          })

          cobrosToInsert.push({
            unidad_id: unidad.id,
            periodo_id: periodoId,
            modalidad_aplicada: mod,
            cantidad_puestos_aplicada: puestos,
            lectura_ant: unidad.ultima_lectura || 0,
            lectura_act: unidad.ultima_lectura || 0,
            cambio_tarifador: false,
            monto_base: montoBase,
            monto_luz_redondeado: 0,
            monto_guardia: rubros.montoGuardia,
            monto_agua: rubros.montoAgua,
            monto_luz_grupo: rubros.montoLuzGrupo,
            es_monto_editado: false,
            dias_prorroga: 0,
            monto_multa: 0,
            multa_perdonada: 0,
            total_a_pagar: montoBase,
            estado: 'pendiente',
          })
        }
      }

      if (cobrosToInsert.length > 0) {
        const { error: cError } = await supabase.from('cobros_servicios').insert(cobrosToInsert)
        if (cError) throw cError
      }

      setSuccessMsg(
        `¡Periodo ${MESES[mes]} ${anio} guardado (estado: Pendiente de pago hasta cancelar la factura)!`
      )
      if (onMonthOpened) onMonthOpened(periodoId)
      setTimeout(() => {
        onClose()
      }, 900)
    } catch (err) {
      console.error(err)
      setErrorMsg('Error al abrir periodo mensual: ' + (err.message || 'Error desconocido'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl my-8 overflow-hidden">
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                Apertura de Periodo: {MESES[mes]} {anio}
              </h3>
              <p className="text-xs text-slate-400">
                Desglose real de factura de luz (no descuenta de caja hasta que se registre su pago)
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

        <form onSubmit={handleConfirm} className="p-6 space-y-5 max-h-[78vh] overflow-y-auto">
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

          {/* Sección 1: Desglose de la Factura de Luz */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5 border-b pb-1">
              <Zap className="w-4 h-4 text-amber-500" />
              1. Desglose Factura General de Luz (CRE / Cooperativa)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Consumo Energía (Bs) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={facturaEnergia}
                  onChange={(e) => setFacturaEnergia(e.target.value)}
                  placeholder="Ej. 2850.00"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Alumbrado Público (Bs)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={facturaAlumbrado}
                  onChange={(e) => setFacturaAlumbrado(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Recojo de Basura (Bs)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={facturaBasura}
                  onChange={(e) => setFacturaBasura(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Total Consumo (kWh) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={facturaKwh}
                  onChange={(e) => setFacturaKwh(e.target.value)}
                  placeholder="Ej. 3200"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Totales calculados */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    Total Factura (Energía + Alumbrado + Basura)
                  </span>
                  <span className="text-[10px] text-slate-500">Monto real a pagar en caja al vencer</span>
                </div>
                <span className="text-base font-extrabold text-slate-900">
                  {totalFacturaBs.toFixed(2)} Bs
                </span>
              </div>

              <div className="px-3.5 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-emerald-700 block">
                    Precio por kWh (Sólo Energía ÷ kWh)
                  </span>
                  <span className="text-[10px] text-emerald-600">
                    Alumbrado y basura ya están en los 58 Bs fijos
                  </span>
                </div>
                <span className="text-base font-mono font-extrabold text-emerald-800">
                  {precioKwhCalculado} Bs/kWh
                </span>
              </div>
            </div>

            {/* Subida de Foto de Factura a Google Drive */}
            <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-slate-200 text-xs">
              <div>
                <span className="font-semibold text-slate-700 block">Foto de la Factura de Luz (Opcional)</span>
                <span className="text-[11px] text-slate-500">
                  Respaldo fotográfico en carpeta Google Drive: Facturas_Generales
                </span>
              </div>

              <div className="flex items-center space-x-2">
                {facturaUrl && (
                  <a
                    href={facturaUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 text-blue-600 hover:text-blue-800 bg-blue-50 rounded-lg inline-flex items-center gap-1 text-[11px] font-semibold"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Ver Foto</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setIsPhotoModalOpen(true)}
                  className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors"
                >
                  <Camera className="w-4 h-4 text-emerald-600" />
                  <span>{facturaUrl ? 'Cambiar Foto' : 'Subir Foto Factura'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Sección 2: Foto Histórica de Unidades */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b pb-1">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                  2. Foto Histórica de Unidades Activas ({unidades.length})
                </span>
                <span className="text-[11px] text-slate-500">
                  Revisa si algún puesto estuvo cerrado todo el mes para ajustar su cobro antes de confirmar.
                </span>
              </div>
            </div>

            {loading ? (
              <p className="text-xs text-slate-400 py-3 text-center">Cargando unidades de cobro...</p>
            ) : (
              <div className="max-h-52 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl bg-slate-50">
                {unidades.map((unidad) => {
                  const currentMod = unidadesModalidad[unidad.id] || 'variable'
                  return (
                    <div key={unidad.id} className="p-2.5 flex items-center justify-between text-xs gap-3">
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-slate-800 block truncate">
                          {unidad.numero_identificador} • {unidad.socios?.nombre || 'Sin socio'}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {unidad.cantidad_puestos > 1
                            ? `${unidad.cantidad_puestos} puestos agrupados`
                            : '1 puesto'}{' '}
                          {unidad.codigo_tarifador && `• Tarifador: ${unidad.codigo_tarifador}`}
                        </span>
                      </div>

                      <select
                        value={currentMod}
                        onChange={(e) => handleModalityChange(unidad.id, e.target.value)}
                        className="px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-lg font-medium focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                      >
                        <option value="variable">Variable (Luz)</option>
                        <option value="puesto_cerrado">Cerrado (55 Bs)</option>
                        <option value="puesto_abierto">Fijo Abierto (70 Bs)</option>
                        <option value="ambulante">Ambulante (50 Bs)</option>
                        <option value="no_socio">No Socio (50 Bs)</option>
                      </select>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

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
              disabled={saving || loading}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-900/20 transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{saving ? 'Guardando Periodo...' : 'Guardar Periodo y Generar Cobros'}</span>
            </button>
          </div>
        </form>
      </div>

      <FotoUploaderModal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        onPhotoSaved={(url) => setFacturaUrl(url)}
        currentUrl={facturaUrl}
        titulo="Foto Factura General de Luz"
        categoria="Facturas_Generales"
        anio={anio}
        mes={mes}
        customName={`Factura_Luz_${anio}-${mes}.jpg`}
      />
    </div>
  )
}
