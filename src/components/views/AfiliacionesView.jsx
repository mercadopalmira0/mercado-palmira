import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { registrarAuditoria, registrarEdicionAuditoria, registrarEliminacionAuditoria } from '../../lib/auditoria'
import FotoUploaderModal from '../modals/FotoUploaderModal'
import ConfirmMotivoModal from '../modals/ConfirmMotivoModal'
import {
  UserPlus,
  Search,
  Receipt,
  Coins,
  QrCode,
  X,
  RefreshCw,
  ExternalLink,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2
} from 'lucide-react'

export default function AfiliacionesView() {
  const { user, isAdmin } = useAuth()
  const [afiliaciones, setAfiliaciones] = useState([])
  const [socios, setSocios] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterEstado, setFilterEstado] = useState('todos')
  const [statusMessage, setStatusMessage] = useState(null)

  // Modales Plan (Crear / Editar)
  const [isNewPlanModalOpen, setIsNewPlanModalOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState(null)
  const [isAbonoModalOpen, setIsAbonoModalOpen] = useState(false)
  const [editingAbono, setEditingAbono] = useState(null)
  const [isHistorialModalOpen, setIsHistorialModalOpen] = useState(false)
  const [selectedAfiliacion, setSelectedAfiliacion] = useState(null)

  const [selectedSocioId, setSelectedSocioId] = useState('')
  const [montoTotal, setMontoTotal] = useState(1500)
  const [cuotaAcordada, setCuotaAcordada] = useState(100)
  const [savingPlan, setSavingPlan] = useState(false)

  const [abonoMonto, setAbonoMonto] = useState('')
  const [abonoMetodo, setAbonoMetodo] = useState('efectivo')
  const [abonoTalonario, setAbonoTalonario] = useState('')
  const [abonoComprobanteUrl, setAbonoComprobanteUrl] = useState('')
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false)
  const [savingAbono, setSavingAbono] = useState(false)

  const [pagosAfiliacion, setPagosAfiliacion] = useState([])
  const [anulandoPagoId, setAnulandoPagoId] = useState(null)
  const [motivoAnulacion, setMotivoAnulacion] = useState('')

  // Confirmación auditada
  const [confirmState, setConfirmState] = useState({
    open: false,
    tipo: 'edicion',
    entity: null, // 'plan' | 'abono'
    target: null,
    advertencia: '',
  })

  const fetchData = async () => {
    setLoading(true)
    setStatusMessage(null)
    try {
      const [{ data: tData }, { data: sData }, { data: aData, error: aError }] = await Promise.all([
        supabase.from('configuracion_tarifas').select('*').limit(1).maybeSingle(),
        supabase.from('socios').select('id, nombre, telefono').eq('activo', true).order('nombre'),
        supabase
          .from('afiliaciones')
          .select(`
            *,
            socios (id, nombre, telefono),
            pagos_afiliacion (id, monto, metodo_pago, nro_talonario_fisico, estado, fecha_pago, comprobante_drive_url, motivo_anulacion)
          `)
          .order('created_at', { ascending: false }),
      ])

      if (tData) setMontoTotal(tData.costo_afiliacion || 1500)
      setSocios(sData || [])
      if (aError) throw aError
      setAfiliaciones(aData || [])
    } catch (err) {
      console.error(err)
      setStatusMessage({ type: 'error', text: 'Error al cargar afiliaciones: ' + err.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const recalcularPlan = async (afiliacionId, totalPlanRef) => {
    const { data: actPagos, error: aError } = await supabase
      .from('pagos_afiliacion')
      .select('monto')
      .eq('afiliacion_id', afiliacionId)
      .eq('estado', 'activo')
    if (aError) throw aError

    const totalActivo = actPagos?.reduce((sum, p) => sum + (parseFloat(p.monto) || 0), 0) || 0
    const nuevoSaldo = Math.max(0, (parseFloat(totalPlanRef) || 0) - totalActivo)
    const nuevoEstado = nuevoSaldo <= 0 ? 'completada' : 'en_curso'

    await supabase
      .from('afiliaciones')
      .update({ saldo_pendiente: nuevoSaldo, estado: nuevoEstado })
      .eq('id', afiliacionId)
  }

  const openNewPlanModal = () => {
    setEditingPlan(null)
    setSelectedSocioId('')
    setCuotaAcordada(100)
    setIsNewPlanModalOpen(true)
  }

  const openEditPlanModal = (af) => {
    setEditingPlan(af)
    setSelectedSocioId(af.socio_id || '')
    setMontoTotal(af.monto_total || 1500)
    setCuotaAcordada(af.cuota_acordada || 100)
    setIsNewPlanModalOpen(true)
  }

  const handleCreatePlan = async (e) => {
    e.preventDefault()
    if (!selectedSocioId) {
      setStatusMessage({ type: 'error', text: 'Selecciona un socio.' })
      return
    }

    if (editingPlan) {
      setConfirmState({ open: true, tipo: 'edicion', entity: 'plan', target: editingPlan, advertencia: '' })
      return
    }

    setSavingPlan(true)
    try {
      const totalNum = parseFloat(montoTotal) || 1500
      const cuotaNum = parseFloat(cuotaAcordada) || 100

      const { error } = await supabase.from('afiliaciones').insert([
        {
          socio_id: selectedSocioId,
          monto_total: totalNum,
          cuota_acordada: cuotaNum,
          saldo_pendiente: totalNum,
          estado: 'en_curso',
        },
      ])

      if (error) throw error

      setStatusMessage({ type: 'success', text: '¡Plan de afiliación iniciado con éxito!' })
      setIsNewPlanModalOpen(false)
      setSelectedSocioId('')
      await fetchData()
    } catch (err) {
      console.error(err)
      setStatusMessage({ type: 'error', text: 'Error al crear plan de afiliación: ' + err.message })
    } finally {
      setSavingPlan(false)
    }
  }

  const requestDeletePlan = (af) => {
    const pagosCount = (af.pagos_afiliacion || []).length
    if (pagosCount > 0) {
      setStatusMessage({
        type: 'error',
        text: `Este plan de "${af.socios?.nombre}" tiene ${pagosCount} abono(s) registrado(s). Elimina primero los abonos desde "Ver abonos" si fue cargado por error.`,
      })
      return
    }
    setConfirmState({ open: true, tipo: 'eliminacion', entity: 'plan', target: af, advertencia: '' })
  }

  const handleRegisterAbono = async (e) => {
    e.preventDefault()
    const montoNum = parseFloat(abonoMonto)
    if (!montoNum || montoNum <= 0) {
      setStatusMessage({ type: 'error', text: 'Ingresa un monto válido mayor a 0.' })
      return
    }

    if (editingAbono) {
      setConfirmState({ open: true, tipo: 'edicion', entity: 'abono', target: editingAbono, advertencia: '' })
      return
    }

    setSavingAbono(true)
    try {
      const { error: pagoError } = await supabase.from('pagos_afiliacion').insert([
        {
          afiliacion_id: selectedAfiliacion.id,
          monto: montoNum,
          metodo_pago: abonoMetodo,
          nro_talonario_fisico: abonoTalonario.trim() || null,
          comprobante_drive_url: abonoComprobanteUrl || null,
          estado: 'activo',
          fecha_pago: new Date().toISOString(),
        },
      ])

      if (pagoError) throw pagoError

      await recalcularPlan(selectedAfiliacion.id, selectedAfiliacion.monto_total)

      setStatusMessage({ type: 'success', text: `¡Abono de ${montoNum.toFixed(2)} Bs registrado en Caja Afiliaciones!` })
      setIsAbonoModalOpen(false)
      setAbonoMonto('')
      setAbonoTalonario('')
      setAbonoComprobanteUrl('')
      await fetchData()
    } catch (err) {
      console.error(err)
      setStatusMessage({ type: 'error', text: 'Error al registrar abono: ' + err.message })
    } finally {
      setSavingAbono(false)
    }
  }

  const openHistorialModal = (afiliacion) => {
    setSelectedAfiliacion(afiliacion)
    setPagosAfiliacion(afiliacion.pagos_afiliacion || [])
    setAnulandoPagoId(null)
    setMotivoAnulacion('')
    setIsHistorialModalOpen(true)
  }

  const openEditAbonoModal = (pago) => {
    setEditingAbono(pago)
    setAbonoMonto(String(pago.monto ?? ''))
    setAbonoMetodo(pago.metodo_pago || 'efectivo')
    setAbonoTalonario(pago.nro_talonario_fisico || '')
    setAbonoComprobanteUrl(pago.comprobante_drive_url || '')
    setIsAbonoModalOpen(true)
  }

  const handleAnularPago = async (pagoId) => {
    if (!motivoAnulacion.trim()) {
      setStatusMessage({ type: 'error', text: 'El motivo de anulación es obligatorio.' })
      return
    }

    try {
      const { error: pError } = await supabase
        .from('pagos_afiliacion')
        .update({ estado: 'anulado', motivo_anulacion: motivoAnulacion.trim() })
        .eq('id', pagoId)

      if (pError) throw pError

      await recalcularPlan(selectedAfiliacion.id, selectedAfiliacion.monto_total)

      await registrarAuditoria({
        usuarioId: user?.id,
        accion: 'ANULACION_PAGO_AFILIACION',
        detalleJson: {
          descripcion: `Anulación de abono de afiliación de ${selectedAfiliacion.socios?.nombre}`,
          tabla: 'pagos_afiliacion',
          registro_id: pagoId,
          motivo: motivoAnulacion.trim(),
        },
      })

      setStatusMessage({ type: 'success', text: 'Pago anulado y descontado de Caja Afiliaciones con registro en bitácora.' })
      setIsHistorialModalOpen(false)
      await fetchData()
    } catch (err) {
      console.error(err)
      setStatusMessage({ type: 'error', text: 'Error al anular pago: ' + err.message })
    }
  }

  const handleConfirmAudit = async (motivo) => {
    const { tipo, entity, target } = confirmState
    if (!target) return
    setSavingPlan(true)
    setSavingAbono(true)

    try {
      if (entity === 'plan' && tipo === 'edicion') {
        const totalNum = parseFloat(montoTotal) || 1500
        const cuotaNum = parseFloat(cuotaAcordada) || 100
        const pagosActivos = (target.pagos_afiliacion || [])
          .filter((p) => p.estado === 'activo')
          .reduce((s, p) => s + (parseFloat(p.monto) || 0), 0)
        const nuevoSaldo = Math.max(0, totalNum - pagosActivos)
        const nuevoEstado = nuevoSaldo <= 0 ? 'completada' : 'en_curso'

        const datosNuevos = {
          socio_id: selectedSocioId,
          monto_total: totalNum,
          cuota_acordada: cuotaNum,
          saldo_pendiente: nuevoSaldo,
          estado: nuevoEstado,
        }

        await registrarEdicionAuditoria({
          usuarioId: user?.id,
          modulo: 'Afiliaciones',
          tabla: 'afiliaciones',
          registroId: target.id,
          motivo,
          resumen: `Edición de plan de afiliación de "${target.socios?.nombre}"`,
          datosAnteriores: {
            socio_id: target.socio_id,
            monto_total: target.monto_total,
            cuota_acordada: target.cuota_acordada,
            saldo_pendiente: target.saldo_pendiente,
            estado: target.estado,
          },
          datosNuevos,
        })

        const { error } = await supabase.from('afiliaciones').update(datosNuevos).eq('id', target.id)
        if (error) throw error

        setIsNewPlanModalOpen(false)
        setEditingPlan(null)
        setStatusMessage({ type: 'success', text: 'Plan de afiliación editado y auditado en bitácora.' })
      } else if (entity === 'plan' && tipo === 'eliminacion') {
        await registrarEliminacionAuditoria({
          usuarioId: user?.id,
          modulo: 'Afiliaciones',
          tabla: 'afiliaciones',
          registroId: target.id,
          motivo,
          resumen: `Eliminación de plan de afiliación de "${target.socios?.nombre}"`,
          datosAnteriores: target,
        })

        const { error } = await supabase.from('afiliaciones').delete().eq('id', target.id)
        if (error) throw error

        setStatusMessage({ type: 'success', text: 'Plan de afiliación eliminado y auditado.' })
      } else if (entity === 'abono' && tipo === 'edicion') {
        const montoNum = parseFloat(abonoMonto)
        const datosNuevos = {
          monto: montoNum,
          metodo_pago: abonoMetodo,
          nro_talonario_fisico: abonoTalonario.trim() || null,
          comprobante_drive_url: abonoComprobanteUrl || null,
        }

        await registrarEdicionAuditoria({
          usuarioId: user?.id,
          modulo: 'Abonos de Afiliación',
          tabla: 'pagos_afiliacion',
          registroId: target.id,
          motivo,
          resumen: `Edición de abono de afiliación (${selectedAfiliacion?.socios?.nombre})`,
          datosAnteriores: {
            monto: target.monto,
            metodo_pago: target.metodo_pago,
            nro_talonario_fisico: target.nro_talonario_fisico,
            comprobante_drive_url: target.comprobante_drive_url,
          },
          datosNuevos,
        })

        const { error } = await supabase.from('pagos_afiliacion').update(datosNuevos).eq('id', target.id)
        if (error) throw error

        await recalcularPlan(selectedAfiliacion.id, selectedAfiliacion.monto_total)
        setIsAbonoModalOpen(false)
        setEditingAbono(null)
        setIsHistorialModalOpen(false)
        setStatusMessage({ type: 'success', text: 'Abono editado, saldo recalculado y auditado.' })
      } else if (entity === 'abono' && tipo === 'eliminacion') {
        await registrarEliminacionAuditoria({
          usuarioId: user?.id,
          modulo: 'Abonos de Afiliación',
          tabla: 'pagos_afiliacion',
          registroId: target.id,
          motivo,
          resumen: `Eliminación de abono (${target.monto} Bs) de ${selectedAfiliacion?.socios?.nombre}`,
          datosAnteriores: target,
        })

        const { error } = await supabase.from('pagos_afiliacion').delete().eq('id', target.id)
        if (error) throw error

        await recalcularPlan(selectedAfiliacion.id, selectedAfiliacion.monto_total)
        setIsHistorialModalOpen(false)
        setStatusMessage({ type: 'success', text: 'Abono eliminado y saldo recalculado con auditoría.' })
      }

      setConfirmState({ open: false, tipo: 'edicion', entity: null, target: null, advertencia: '' })
      await fetchData()
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message })
      setConfirmState({ open: false, tipo: 'edicion', entity: null, target: null, advertencia: '' })
    } finally {
      setSavingPlan(false)
      setSavingAbono(false)
    }
  }

  const filteredAfiliaciones = afiliaciones.filter((a) => {
    const term = searchTerm.toLowerCase()
    const socioName = a.socios?.nombre?.toLowerCase() || ''
    const matchesSearch = !term || socioName.includes(term)
    if (!matchesSearch) return false
    if (filterEstado === 'en_curso') return a.estado === 'en_curso'
    if (filterEstado === 'completada') return a.estado === 'completada'
    return true
  })

  const totalEnCurso = afiliaciones.filter((a) => a.estado === 'en_curso').length
  const totalCompletadas = afiliaciones.filter((a) => a.estado === 'completada').length
  const totalRecaudadoGlobal = afiliaciones.reduce((sum, a) => {
    const pagados = (a.pagos_afiliacion || []).filter((p) => p.estado === 'activo').reduce((s, p) => s + (parseFloat(p.monto) || 0), 0)
    return sum + pagados
  }, 0)
  const totalSaldoPendienteGlobal = afiliaciones.reduce((sum, a) => sum + (parseFloat(a.saldo_pendiente) || 0), 0)

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-slate-900">Módulo de Afiliaciones (Nuevos Socios)</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
              Caja Afiliaciones
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Planes de pago (1.500 Bs), cuotas y edición/eliminación auditada de errores.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button onClick={fetchData} title="Recargar afiliaciones" className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
          {isAdmin && (
            <button onClick={openNewPlanModal} className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5">
              <UserPlus className="w-4 h-4" />
              <span>+ Iniciar Nueva Afiliación</span>
            </button>
          )}
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center justify-between ${
            statusMessage.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Planes en Curso</span>
          <p className="text-xl font-bold text-blue-700 mt-1">{totalEnCurso} socios</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">Completadas</span>
          <p className="text-xl font-bold text-emerald-700 mt-1">{totalCompletadas} socios</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Total Recaudado</span>
          <p className="text-xl font-bold text-slate-900 mt-1">{totalRecaudadoGlobal.toFixed(2)} Bs</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">Saldo por Amortizar</span>
          <p className="text-xl font-bold text-amber-700 mt-1">{totalSaldoPendienteGlobal.toFixed(2)} Bs</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre de socio afiliado..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center space-x-1.5 text-xs font-medium">
          <button onClick={() => setFilterEstado('todos')} className={`px-3 py-1.5 rounded-xl ${filterEstado === 'todos' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>
            Todos ({afiliaciones.length})
          </button>
          <button onClick={() => setFilterEstado('en_curso')} className={`px-3 py-1.5 rounded-xl ${filterEstado === 'en_curso' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
            En Curso
          </button>
          <button onClick={() => setFilterEstado('completada')} className={`px-3 py-1.5 rounded-xl ${filterEstado === 'completada' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
            Completadas
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500">Cargando afiliaciones...</div>
      ) : filteredAfiliaciones.length === 0 ? (
        <div className="p-10 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs space-y-3">
          <UserPlus className="w-10 h-10 mx-auto text-slate-300" />
          <p>No se encontraron planes de afiliación con los filtros actuales.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAfiliaciones.map((afiliacion) => {
            const socio = afiliacion.socios
            const pagosActivos = (afiliacion.pagos_afiliacion || []).filter((p) => p.estado === 'activo')
            const totalPagado = pagosActivos.reduce((sum, p) => sum + (parseFloat(p.monto) || 0), 0)
            const porcentaje = Math.min(100, Math.round((totalPagado / (afiliacion.monto_total || 1500)) * 100))
            const isCompletada = afiliacion.estado === 'completada' || afiliacion.saldo_pendiente <= 0

            return (
              <div
                key={afiliacion.id}
                className={`bg-white rounded-2xl p-5 border shadow-sm transition-all flex flex-col justify-between ${
                  isCompletada ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200 hover:border-blue-300'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{socio?.nombre || 'Socio sin nombre'}</h4>
                      {socio?.telefono && <p className="text-xs text-slate-400">Tel: {socio.telefono}</p>}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${isCompletada ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>
                        {isCompletada ? 'Completada' : 'En Curso'}
                      </span>
                      {isAdmin && (
                        <>
                          <button type="button" onClick={() => openEditPlanModal(afiliacion)} title="Editar plan" className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button type="button" onClick={() => requestDeletePlan(afiliacion)} title="Eliminar plan" className="p-1 text-red-600 hover:bg-red-50 rounded">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-600">
                        Abonado: <strong className="text-emerald-700">{totalPagado.toFixed(2)} Bs</strong>
                      </span>
                      <span className="text-slate-500">
                        Total: {parseFloat(afiliacion.monto_total).toFixed(2)} Bs ({porcentaje}%)
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div className={`h-2.5 rounded-full transition-all duration-500 ${isCompletada ? 'bg-emerald-500' : 'bg-blue-600'}`} style={{ width: `${porcentaje}%` }} />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span>Cuota acordada: {afiliacion.cuota_acordada || 100} Bs/mes</span>
                      <span className="font-bold text-red-600">Saldo restante: {parseFloat(afiliacion.saldo_pendiente).toFixed(2)} Bs</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => openHistorialModal(afiliacion)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>Ver {(afiliacion.pagos_afiliacion || []).length} abonos</span>
                  </button>

                  {isAdmin && (
                    <button
                      type="button"
                      disabled={isCompletada}
                      onClick={() => {
                        setEditingAbono(null)
                        setSelectedAfiliacion(afiliacion)
                        setAbonoMonto(afiliacion.cuota_acordada || '')
                        setAbonoMetodo('efectivo')
                        setAbonoTalonario('')
                        setAbonoComprobanteUrl('')
                        setIsAbonoModalOpen(true)
                      }}
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1"
                    >
                      <Coins className="w-3.5 h-3.5" />
                      <span>Registrar Abono</span>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Iniciar / Editar Plan */}
      {isNewPlanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md max-h-[88dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
            <div className="shrink-0 bg-slate-900 px-5 py-3.5 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg shrink-0">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm sm:text-base leading-tight truncate">
                    {editingPlan ? 'Editar Plan de Afiliación (Auditado)' : 'Nueva Afiliación de Socio'}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-400 truncate">Plan de pago para nuevo socio</p>
                </div>
              </div>
              <button type="button" onClick={() => setIsNewPlanModalOpen(false)} className="p-1.5 text-slate-300 hover:text-white shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePlan} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Seleccionar Socio *</label>
                  <select required value={selectedSocioId} onChange={(e) => setSelectedSocioId(e.target.value)} className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl">
                    <option value="">-- Elige un socio registrado --</option>
                    {socios.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nombre} {s.telefono ? `(${s.telefono})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Costo Total (Bs)</label>
                    <input type="number" inputMode="decimal" step="0.01" min="0.01" required value={montoTotal} onChange={(e) => setMontoTotal(e.target.value)} className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-bold" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Cuota Acordada (Bs/mes)</label>
                    <input type="number" inputMode="decimal" step="0.01" min="0.01" required value={cuotaAcordada} onChange={(e) => setCuotaAcordada(e.target.value)} className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-bold" />
                  </div>
                </div>
              </div>

              <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex items-center justify-end gap-2">
                <button type="button" onClick={() => setIsNewPlanModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-600">
                  Cancelar
                </button>
                <button type="submit" disabled={savingPlan} className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md">
                  {savingPlan ? 'Guardando...' : editingPlan ? 'Actualizar Plan' : 'Iniciar Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Registrar / Editar Abono */}
      {isAbonoModalOpen && selectedAfiliacion && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md max-h-[88dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
            <div className="shrink-0 bg-slate-900 px-5 py-3.5 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg shrink-0">
                  <Coins className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm sm:text-base leading-tight truncate">
                    {editingAbono ? 'Editar Abono de Afiliación (Auditado)' : 'Abonar Cuota de Afiliación'}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-400 truncate">{selectedAfiliacion.socios?.nombre}</p>
                </div>
              </div>
              <button type="button" onClick={() => setIsAbonoModalOpen(false)} className="p-1.5 text-slate-300 hover:text-white shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterAbono} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Monto a Abonar (Bs) *</label>
                  <input type="number" inputMode="decimal" step="0.01" min="0.01" required value={abonoMonto} onChange={(e) => setAbonoMonto(e.target.value)} className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-bold" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Método de Pago</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => setAbonoMetodo('efectivo')} className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${abonoMetodo === 'efectivo' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 text-slate-700 border-slate-300'}`}>
                      <Coins className="w-4 h-4" />
                      <span>Efectivo</span>
                    </button>
                    <button type="button" onClick={() => setAbonoMetodo('qr')} className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${abonoMetodo === 'qr' ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-700 border-slate-300'}`}>
                      <QrCode className="w-4 h-4" />
                      <span>QR / Banco</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">N° Recibo Talonario Físico (Opcional)</label>
                  <input type="text" value={abonoTalonario} onChange={(e) => setAbonoTalonario(e.target.value)} className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl" />
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-600">Comprobante Drive:</span>
                  <div className="flex items-center space-x-2">
                    {abonoComprobanteUrl && (
                      <a href={abonoComprobanteUrl} target="_blank" rel="noreferrer" className="p-1.5 text-blue-600 bg-blue-50 rounded-lg">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button type="button" onClick={() => setIsPhotoModalOpen(true)} className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-700">
                      {abonoComprobanteUrl ? 'Cambiar Foto' : 'Adjuntar Foto'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex items-center justify-end gap-2">
                <button type="button" onClick={() => setIsAbonoModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-600">
                  Cancelar
                </button>
                <button type="submit" disabled={savingAbono} className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md">
                  {savingAbono ? 'Guardando...' : editingAbono ? 'Actualizar Abono' : 'Confirmar Abono'}
                </button>
              </div>
            </form>
          </div>

          <FotoUploaderModal
            isOpen={isPhotoModalOpen}
            onClose={() => setIsPhotoModalOpen(false)}
            onPhotoSaved={(url) => setAbonoComprobanteUrl(url)}
            currentUrl={abonoComprobanteUrl}
            titulo="Foto Recibo Afiliación"
            categoria="Egresos_Afiliaciones"
            anio={new Date().getFullYear()}
            mes={new Date().getMonth() + 1}
            customName={`Recibo_Afiliacion_${Date.now()}.jpg`}
          />
        </div>
      )}

      {/* Modal Historial de Abonos */}
      {isHistorialModalOpen && selectedAfiliacion && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg max-h-[88dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
            <div className="shrink-0 bg-slate-900 px-5 py-3.5 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg shrink-0">
                  <Receipt className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm sm:text-base leading-tight truncate">Historial de Abonos de Afiliación</h3>
                  <p className="text-[11px] sm:text-xs text-slate-400 truncate">{selectedAfiliacion.socios?.nombre}</p>
                </div>
              </div>
              <button type="button" onClick={() => setIsHistorialModalOpen(false)} className="p-1.5 text-slate-300 hover:text-white shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-3">
              {pagosAfiliacion.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No hay abonos registrados para este socio.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {pagosAfiliacion.map((pago) => {
                    const isAnulado = pago.estado === 'anulado'
                    const isAnulando = anulandoPagoId === pago.id

                    return (
                      <div key={pago.id} className="py-2.5 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-2">
                            <span className={`p-1 rounded-lg ${pago.metodo_pago === 'qr' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                              {pago.metodo_pago === 'qr' ? <QrCode className="w-3.5 h-3.5" /> : <Coins className="w-3.5 h-3.5" />}
                            </span>
                            <div>
                              <p className={`font-bold ${isAnulado ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                                {parseFloat(pago.monto).toFixed(2)} Bs
                              </p>
                              <span className="text-[10px] text-slate-400">
                                {new Date(pago.fecha_pago).toLocaleDateString('es-BO')}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-1.5">
                            {pago.nro_talonario_fisico && (
                              <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                                N° {pago.nro_talonario_fisico}
                              </span>
                            )}
                            {pago.comprobante_drive_url && (
                              <a href={pago.comprobante_drive_url} target="_blank" rel="noreferrer" className="text-blue-600">
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                            {isAnulado ? (
                              <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">Anulado</span>
                            ) : (
                              isAdmin && (
                                <>
                                  <button type="button" onClick={() => openEditAbonoModal(pago)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Editar abono">
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAnulandoPagoId(pago.id)
                                      setMotivoAnulacion('')
                                    }}
                                    className="text-[11px] font-semibold text-orange-600 hover:bg-orange-50 px-2 py-0.5 rounded"
                                  >
                                    Anular
                                  </button>
                                </>
                              )
                            )}
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => setConfirmState({ open: true, tipo: 'eliminacion', entity: 'abono', target: pago, advertencia: '' })}
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                                title="Eliminar abono"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {isAnulado && pago.motivo_anulacion && (
                          <p className="text-[10px] text-red-700 bg-red-50 p-1.5 rounded">Motivo: {pago.motivo_anulacion}</p>
                        )}

                        {isAnulando && (
                          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs">
                            <span className="font-bold text-amber-900 block">Motivo de Anulación Obligatorio</span>
                            <input
                              type="text"
                              required
                              value={motivoAnulacion}
                              onChange={(e) => setMotivoAnulacion(e.target.value)}
                              placeholder="Escribe el motivo..."
                              className="w-full px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-lg"
                            />
                            <div className="flex justify-end gap-2">
                              <button type="button" onClick={() => setAnulandoPagoId(null)} className="text-[11px] text-slate-600">
                                Cancelar
                              </button>
                              <button type="button" onClick={() => handleAnularPago(pago.id)} className="px-3 py-1 bg-red-600 text-white rounded-lg text-[11px] font-bold">
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

            <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex justify-end">
              <button type="button" onClick={() => setIsHistorialModalOpen(false)} className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 rounded-xl">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmMotivoModal
        isOpen={confirmState.open}
        onClose={() => setConfirmState({ open: false, tipo: 'edicion', entity: null, target: null, advertencia: '' })}
        onConfirm={handleConfirmAudit}
        tipo={confirmState.tipo}
        titulo={
          confirmState.entity === 'plan'
            ? confirmState.tipo === 'eliminacion'
              ? 'Eliminar Plan de Afiliación'
              : 'Editar Plan de Afiliación'
            : confirmState.tipo === 'eliminacion'
            ? 'Eliminar Abono de Afiliación'
            : 'Editar Abono de Afiliación'
        }
        descripcion="Se registrará el snapshot completo en bitacora_auditoria y se recalcularán el saldo del plan y Caja Afiliaciones."
        loading={savingPlan || savingAbono}
      />
    </div>
  )
}
