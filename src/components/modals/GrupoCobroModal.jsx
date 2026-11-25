import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { registrarAuditoria, registrarEdicionAuditoria } from '../../lib/auditoria'
import { calcularAutorellenoPersonalizado } from '../../lib/calculosCobro'
import ConfirmMotivoModal from './ConfirmMotivoModal'
import { Layers, Search, CheckCircle2, AlertCircle, X, Zap, Crown } from 'lucide-react'

export default function GrupoCobroModal({
  isOpen,
  onClose,
  socios = [],
  editingGroup = null, // { lider, miembros }
  onSaved,
}) {
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [liderId, setLiderId] = useState('')
  const [nombreGrupo, setNombreGrupo] = useState('')
  const [tipo, setTipo] = useState('fijo')
  const [subtipoFijo, setSubtipoFijo] = useState('puesto_abierto')
  const [codigoTarifador, setCodigoTarifador] = useState('')
  const [ultimaLectura, setUltimaLectura] = useState(0)

  // Tarifa fija personalizada
  const [montoFijoPers, setMontoFijoPers] = useState('')
  const [guardiaPers, setGuardiaPers] = useState('')
  const [aguaPers, setAguaPers] = useState('')
  const [luzPers, setLuzPers] = useState('')
  const [detallePers, setDetallePers] = useState('')

  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [confirmEditOpen, setConfirmEditOpen] = useState(false)

  // Aplanar unidades con info de su socio
  const allUnidades = socios.flatMap((s) =>
    (s.unidades_cobro || []).map((u) => ({
      ...u,
      socio_id: s.id,
      socio_nombre: s.nombre,
      socio_telefono: s.telefono,
    }))
  )

  const hijosCountMap = {}
  allUnidades.forEach((u) => {
    if (u.grupo_padre_id) {
      hijosCountMap[u.grupo_padre_id] = (hijosCountMap[u.grupo_padre_id] || 0) + 1
    }
  })

  const availableUnits = allUnidades.filter((u) => {
    if (u.activo === false) return false
    if (editingGroup) {
      const esDelGrupo = u.id === editingGroup.lider.id || u.grupo_padre_id === editingGroup.lider.id
      if (esDelGrupo) return true
    }
    return !u.grupo_padre_id && !hijosCountMap[u.id]
  })

  useEffect(() => {
    if (!isOpen) return
    setSearchTerm('')
    setErrorMsg('')
    setConfirmEditOpen(false)

    if (editingGroup?.lider) {
      const l = editingGroup.lider
      const miembros = editingGroup.miembros || []
      const ids = [l.id, ...miembros.map((m) => m.id)]
      setSelectedIds(ids)
      setLiderId(l.id)
      setNombreGrupo(l.nombre_grupo || '')
      setTipo(l.tipo || 'fijo')
      setSubtipoFijo(l.subtipo_fijo || 'puesto_abierto')
      setCodigoTarifador(l.codigo_tarifador || '')
      setUltimaLectura(l.ultima_lectura || 0)
      setMontoFijoPers(l.monto_fijo_personalizado != null ? String(l.monto_fijo_personalizado) : '')
      setGuardiaPers(l.monto_guardia_personalizado != null ? String(l.monto_guardia_personalizado) : '')
      setAguaPers(l.monto_agua_personalizado != null ? String(l.monto_agua_personalizado) : '')
      setLuzPers(l.monto_luz_personalizado != null ? String(l.monto_luz_personalizado) : '')
      setDetallePers(l.detalle_tarifa_personalizada || '')
    } else {
      setSelectedIds([])
      setLiderId('')
      setNombreGrupo('')
      setTipo('fijo')
      setSubtipoFijo('puesto_abierto')
      setCodigoTarifador('')
      setUltimaLectura(0)
      setMontoFijoPers('')
      setGuardiaPers('')
      setAguaPers('')
      setLuzPers('')
      setDetallePers('')
    }
  }, [isOpen, editingGroup])

  if (!isOpen) return null

  const toggleUnit = (unitId) => {
    setSelectedIds((prev) => {
      const exists = prev.includes(unitId)
      const next = exists ? prev.filter((id) => id !== unitId) : [...prev, unitId]
      if (exists && liderId === unitId) {
        setLiderId(next[0] || '')
      } else if (!exists && !liderId) {
        setLiderId(unitId)
      }
      return next
    })
  }

  const handleMontoTotalPersChange = (val) => {
    setMontoFijoPers(val)
    const auto = calcularAutorellenoPersonalizado(val)
    setGuardiaPers(val === '' ? '' : String(auto.montoGuardia))
    setAguaPers(val === '' ? '' : String(auto.montoAgua))
    setLuzPers(val === '' ? '' : String(auto.montoLuzGrupo))
  }

  const handleDesglosePersChange = (field, val) => {
    const nextG = field === 'g' ? val : guardiaPers
    const nextA = field === 'a' ? val : aguaPers
    const nextL = field === 'l' ? val : luzPers
    if (field === 'g') setGuardiaPers(val)
    if (field === 'a') setAguaPers(val)
    if (field === 'l') setLuzPers(val)
    const sum = Math.round(((parseFloat(nextG) || 0) + (parseFloat(nextA) || 0) + (parseFloat(nextL) || 0)) * 100) / 100
    setMontoFijoPers(String(sum))
  }

  const filteredUnits = availableUnits.filter((u) => {
    const term = searchTerm.toLowerCase()
    return (
      !term ||
      u.socio_nombre?.toLowerCase().includes(term) ||
      u.numero_identificador?.toLowerCase().includes(term) ||
      u.codigo_tarifador?.toLowerCase().includes(term)
    )
  })

  const selectedUnits = availableUnits.filter((u) => selectedIds.includes(u.id))

  const buildTariffPayload = () => {
    const isPers = tipo === 'fijo' && subtipoFijo === 'personalizado'
    const mTotal = isPers ? Math.round((parseFloat(montoFijoPers) || 0) * 100) / 100 : null
    const mG = isPers ? Math.round((parseFloat(guardiaPers) || 0) * 100) / 100 : null
    const mA = isPers ? Math.round((parseFloat(aguaPers) || 0) * 100) / 100 : null
    const mL = isPers ? Math.round((parseFloat(luzPers) || 0) * 100) / 100 : null
    return {
      tipo,
      subtipo_fijo: tipo === 'fijo' ? subtipoFijo : null,
      codigo_tarifador: tipo === 'variable' ? codigoTarifador.trim() || null : null,
      ultima_lectura: tipo === 'variable' ? parseFloat(ultimaLectura) || 0 : 0,
      monto_fijo_personalizado: mTotal,
      monto_guardia_personalizado: mG,
      monto_agua_personalizado: mA,
      monto_luz_personalizado: mL,
      detalle_tarifa_personalizada: isPers ? detallePers.trim() || null : null,
    }
  }

  const executeSave = async (motivo = '') => {
    setSaving(true)
    setErrorMsg('')
    try {
      const tariff = buildTariffPayload()
      const liderUnit = selectedUnits.find((u) => u.id === liderId) || selectedUnits[0]
      const childUnits = selectedUnits.filter((u) => u.id !== liderUnit.id)
      const otrosNombres = childUnits
        .map((c) => `${c.socio_nombre} (${c.numero_identificador})`)
        .join(', ')

      const liderPayload = {
        grupo_padre_id: null,
        cantidad_puestos: selectedUnits.length,
        nombre_grupo: nombreGrupo.trim() || null,
        nombres_titulares: otrosNombres || null,
        ...tariff,
      }

      if (editingGroup?.lider) {
        const prevIds = [editingGroup.lider.id, ...(editingGroup.miembros || []).map((m) => m.id)]
        const removedIds = prevIds.filter((id) => !selectedIds.includes(id))

        await registrarEdicionAuditoria({
          usuarioId: user?.id,
          modulo: 'Grupos de Cobro',
          tabla: 'unidades_cobro',
          registroId: liderUnit.id,
          motivo,
          resumen: `Edición de grupo "${nombreGrupo.trim() || liderUnit.numero_identificador}" (${selectedUnits.length} puestos)`,
          datosAnteriores: {
            lider_id: editingGroup.lider.id,
            miembros_ids: prevIds,
            nombre_grupo: editingGroup.lider.nombre_grupo,
            tipo: editingGroup.lider.tipo,
            subtipo_fijo: editingGroup.lider.subtipo_fijo,
            monto_fijo_personalizado: editingGroup.lider.monto_fijo_personalizado,
          },
          datosNuevos: {
            lider_id: liderUnit.id,
            miembros_ids: selectedIds,
            nombre_grupo: liderPayload.nombre_grupo,
            tipo: liderPayload.tipo,
            subtipo_fijo: liderPayload.subtipo_fijo,
            monto_fijo_personalizado: liderPayload.monto_fijo_personalizado,
          },
        })

        // Liberar puestos quitados o al líder anterior si cambió el titular
        const idsToReset = [...removedIds]
        if (editingGroup.lider.id !== liderUnit.id && !idsToReset.includes(editingGroup.lider.id)) {
          idsToReset.push(editingGroup.lider.id)
        }
        if (idsToReset.length > 0) {
          const { error: remErr } = await supabase
            .from('unidades_cobro')
            .update({
              grupo_padre_id: null,
              cantidad_puestos: 1,
              nombre_grupo: null,
              nombres_titulares: null,
            })
            .in('id', idsToReset)
          if (remErr) throw remErr
        }
      } else {
        await registrarAuditoria({
          usuarioId: user?.id,
          accion: 'CREACION_GRUPO_COBRO',
          detalleJson: {
            descripcion: `Creación de grupo "${nombreGrupo.trim() || liderUnit.numero_identificador}" con ${selectedUnits.length} puestos (Titular: ${liderUnit.socio_nombre})`,
            tabla: 'unidades_cobro',
            registro_id: liderUnit.id,
            miembros_ids: selectedIds,
            ...liderPayload,
          },
        })
      }

      // Actualizar unidad líder
      const { error: lErr } = await supabase
        .from('unidades_cobro')
        .update(liderPayload)
        .eq('id', liderUnit.id)
      if (lErr) throw lErr

      // Actualizar miembros hijos
      if (childUnits.length > 0) {
        const { error: cErr } = await supabase
          .from('unidades_cobro')
          .update({
            grupo_padre_id: liderUnit.id,
            cantidad_puestos: 1,
            nombre_grupo: null,
            nombres_titulares: null,
          })
          .in(
            'id',
            childUnits.map((c) => c.id)
          )
        if (cErr) throw cErr
      }

      setConfirmEditOpen(false)
      if (onSaved) await onSaved(nombreGrupo.trim() || `${liderUnit.socio_nombre} (${selectedUnits.length} puestos)`)
      onClose()
    } catch (err) {
      console.error(err)
      setErrorMsg(err.message || 'Error al guardar grupo de cobro')
      setConfirmEditOpen(false)
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (selectedIds.length < 2) {
      setErrorMsg('Selecciona al menos 2 puestos o socios para formar un grupo de cobro.')
      return
    }
    if (!liderId || !selectedIds.includes(liderId)) {
      setErrorMsg('Elige cuál de los seleccionados será el Socio Responsable / Titular del cobro.')
      return
    }
    if (tipo === 'fijo' && subtipoFijo === 'personalizado') {
      const mTotal = parseFloat(montoFijoPers) || 0
      if (mTotal <= 0) {
        setErrorMsg('Ingresa un monto mensual personalizado mayor a 0.')
        return
      }
    }

    if (editingGroup) {
      setConfirmEditOpen(true)
    } else {
      executeSave()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-2xl max-h-[88dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
        <div className="shrink-0 bg-slate-900 px-5 py-3.5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="p-2 bg-purple-500/20 text-purple-300 rounded-lg shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base leading-tight truncate">
                {editingGroup ? 'Editar Grupo de Cobro (Auditado)' : 'Crear Grupo de Cobro'}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                Agrupa 2 o más puestos bajo un solo cobro mensual sin duplicar boletas
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* 1. Seleccionar Miembros */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  1. Seleccionar Puestos / Socios ({selectedIds.length} seleccionados)
                </span>
                {selectedIds.length >= 2 && (
                  <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                    {selectedIds.length} puestos en grupo
                  </span>
                )}
              </div>

              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar socio o número de puesto disponible..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl bg-slate-50">
                {filteredUnits.length === 0 ? (
                  <p className="p-4 text-center text-xs text-slate-400">No hay puestos disponibles sin grupo.</p>
                ) : (
                  filteredUnits.map((u) => {
                    const checked = selectedIds.includes(u.id)
                    const isLeader = checked && liderId === u.id
                    return (
                      <div
                        key={u.id}
                        className={`p-2.5 flex items-center justify-between gap-2 text-xs transition-colors ${
                          checked ? 'bg-purple-50/70' : 'hover:bg-white'
                        }`}
                      >
                        <label className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleUnit(u.id)}
                            className="w-4 h-4 text-purple-600 rounded shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="px-1.5 py-0.5 bg-slate-900 text-white rounded font-bold text-[11px] shrink-0">
                                {u.numero_identificador}
                              </span>
                              <span className="font-bold text-slate-900 truncate">{u.socio_nombre}</span>
                            </div>
                          </div>
                        </label>

                        {checked && (
                          <button
                            type="button"
                            onClick={() => setLiderId(u.id)}
                            className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 shrink-0 transition-colors ${
                              isLeader
                                ? 'bg-amber-500 text-white shadow-sm'
                                : 'bg-white text-slate-600 border border-slate-300 hover:bg-amber-50'
                            }`}
                          >
                            <Crown className="w-3 h-3" />
                            <span>{isLeader ? 'Titular' : 'Hacer Titular'}</span>
                          </button>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* 2. Nombre opcional y Titular */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre del Grupo (Opcional)
                </label>
                <input
                  type="text"
                  value={nombreGrupo}
                  onChange={(e) => setNombreGrupo(e.target.value)}
                  placeholder="Ej. Esquina Pasillo 2"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Socio Responsable / Titular del Cobro <span className="text-red-500">*</span>
                </label>
                <select
                  value={liderId}
                  onChange={(e) => setLiderId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-amber-50 border border-amber-300 rounded-xl font-bold text-slate-900"
                >
                  <option value="">-- Seleccionar titular --</option>
                  {selectedUnits.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.numero_identificador} — {u.socio_nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 3. Modalidad de Cobro del Grupo */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                2. Modalidad de Cobro del Grupo
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Modalidad</label>
                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-bold"
                  >
                    <option value="fijo">Fijo (Sin tarifador)</option>
                    <option value="variable">Variable (Con tarifador de luz)</option>
                  </select>
                </div>

                {tipo === 'fijo' ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Subtipo Tarifa Fija</label>
                    <select
                      value={subtipoFijo}
                      onChange={(e) => setSubtipoFijo(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-semibold"
                    >
                      <option value="puesto_abierto">Puesto Abierto (70 Bs × puesto)</option>
                      <option value="puesto_cerrado">Puesto Cerrado (55 Bs × puesto)</option>
                      <option value="ambulante">Ambulante (50 Bs × puesto)</option>
                      <option value="no_socio">No Socio (50 Bs × puesto)</option>
                      <option value="personalizado">Personalizado (Monto manual)</option>
                    </select>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                        <Zap className="w-3 h-3 text-amber-500" />
                        Tarifador
                      </label>
                      <input
                        type="text"
                        value={codigoTarifador}
                        onChange={(e) => setCodigoTarifador(e.target.value)}
                        placeholder="TAR-12"
                        className="w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-xl font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Lectura (kWh)</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        value={ultimaLectura}
                        onChange={(e) => setUltimaLectura(e.target.value)}
                        className="w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-xl font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {tipo === 'fijo' && subtipoFijo === 'personalizado' && (
                <div className="bg-white p-3 rounded-xl border border-blue-200 space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-blue-900 mb-1">
                        Monto Total Mensual del Grupo (Bs) *
                      </label>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0.01"
                        required
                        value={montoFijoPers}
                        onChange={(e) => handleMontoTotalPersChange(e.target.value)}
                        placeholder="Ej. 110.00"
                        className="w-full px-3 py-2 text-sm bg-blue-50/50 border border-blue-300 rounded-xl font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Motivo / Detalle Tarifa Especial
                      </label>
                      <input
                        type="text"
                        value={detallePers}
                        onChange={(e) => setDetallePers(e.target.value)}
                        placeholder="Ej. Acuerdo directiva grupo 2 puestos"
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-1">Guardia (Bs)</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        value={guardiaPers}
                        onChange={(e) => handleDesglosePersChange('g', e.target.value)}
                        className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-1">Agua (Bs)</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        value={aguaPers}
                        onChange={(e) => handleDesglosePersChange('a', e.target.value)}
                        className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-1">Grupo Luz (Bs)</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        value={luzPers}
                        onChange={(e) => handleDesglosePersChange('l', e.target.value)}
                        className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-bold"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-600">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{saving ? 'Guardando...' : editingGroup ? 'Actualizar Grupo' : 'Crear Grupo'}</span>
            </button>
          </div>
        </form>
      </div>

      <ConfirmMotivoModal
        isOpen={confirmEditOpen}
        onClose={() => setConfirmEditOpen(false)}
        onConfirm={executeSave}
        tipo="edicion"
        titulo="Editar Grupo de Cobro"
        descripcion="Se guardará el cambio de integrantes o tarifa en bitacora_auditoria antes de actualizar el grupo."
        loading={saving}
      />
    </div>
  )
}
