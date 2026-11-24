import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { registrarAuditoria, registrarEdicionAuditoria, registrarEliminacionAuditoria } from '../../lib/auditoria'
import { MESES, getLocalDateStr } from '../../lib/formatters'
import FotoUploaderModal from '../modals/FotoUploaderModal'
import ConfirmMotivoModal from '../modals/ConfirmMotivoModal'
import {
  ArrowDownCircle,
  Coins,
  QrCode,
  CheckCircle2,
  X,
  Camera,
  ExternalLink,
  RefreshCw,
  PlusCircle,
  Search,
  Shield,
  Save,
  Edit2,
  Trash2
} from 'lucide-react'

const CATEGORIAS_SERVICIOS = [
  'Factura Luz General',
  'Factura Agua Potable',
  'Sueldo Guardia',
  'Tasa de Aseo y Basura',
  'Alumbrado Público / Pasillos',
  'Gastos Operativos (Pasajes, Talonarios, Útiles)',
  'Otro Gasto de Servicios',
]

const CATEGORIAS_AFILIACIONES = [
  'Limpieza General del Mercado',
  'Mantenimiento y Plomería',
  'Pintura y Albañilería',
  'Materiales y Compras del Mercado',
  'Mejoras de Infraestructura',
  'Otro Gasto de Afiliaciones',
]

const TIPOS_GUARDIA = [
  { value: 'adelanto_quincena', label: 'Adelanto Quincena (día 15)' },
  { value: 'adelanto_emergencia', label: 'Adelanto Emergencia' },
  { value: 'saldo_fin_mes', label: 'Saldo Fin de Mes' },
]

export default function EgresosView() {
  const { user, isAdmin } = useAuth()
  const today = new Date()

  const [activeTab, setActiveTab] = useState('egresos')
  const [egresos, setEgresos] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterCaja, setFilterCaja] = useState('todos')
  const [filterMetodo, setFilterMetodo] = useState('todos')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusMessage, setStatusMessage] = useState(null)

  // Modal Egreso General (Crear / Editar)
  const [isNewModalOpen, setIsNewModalOpen] = useState(false)
  const [editingEgreso, setEditingEgreso] = useState(null)
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false)
  const [anulandoEgresoId, setAnulandoEgresoId] = useState(null)
  const [motivoAnulacion, setMotivoAnulacion] = useState('')

  const [caja, setCaja] = useState('servicios')
  const [categoria, setCategoria] = useState(CATEGORIAS_SERVICIOS[0])
  const [descripcion, setDescripcion] = useState('')
  const [monto, setMonto] = useState('')
  const [metodoPago, setMetodoPago] = useState('efectivo')
  const [fecha, setFecha] = useState(getLocalDateStr())
  const [reciboDriveUrl, setReciboDriveUrl] = useState('')
  const [saving, setSaving] = useState(false)

  // Sueldo y Adelantos del Guardia
  const [guardiaMes, setGuardiaMes] = useState(today.getMonth() + 1)
  const [guardiaAnio, setGuardiaAnio] = useState(today.getFullYear())
  const [tarifaId, setTarifaId] = useState(null)
  const [sueldoMensual, setSueldoMensual] = useState(0)
  const [sueldoOriginal, setSueldoOriginal] = useState(0)
  const [savingSueldo, setSavingSueldo] = useState(false)
  const [pagosGuardia, setPagosGuardia] = useState([])
  const [loadingGuardia, setLoadingGuardia] = useState(false)

  // Modal Adelanto / Pago Guardia (Crear / Editar)
  const [isGuardiaModalOpen, setIsGuardiaModalOpen] = useState(false)
  const [editingGuardia, setEditingGuardia] = useState(null)
  const [gTipo, setGTipo] = useState('adelanto_quincena')
  const [gMonto, setGMonto] = useState('')
  const [gFecha, setGFecha] = useState(getLocalDateStr())
  const [gMetodo, setGMetodo] = useState('efectivo')
  const [gObs, setGObs] = useState('')
  const [gFotoUrl, setGFotoUrl] = useState('')
  const [isGuardiaPhotoOpen, setIsGuardiaPhotoOpen] = useState(false)
  const [savingGuardia, setSavingGuardia] = useState(false)

  const [anulandoGuardiaId, setAnulandoGuardiaId] = useState(null)
  const [motivoAnulGuardia, setMotivoAnulGuardia] = useState('')

  // Confirmación auditada
  const [confirmState, setConfirmState] = useState({
    open: false,
    tipo: 'edicion',
    entity: null, // 'egreso' | 'guardia' | 'sueldo'
    target: null,
    advertencia: '',
  })

  const fetchEgresos = async () => {
    setLoading(true)
    setStatusMessage(null)
    try {
      const { data, error } = await supabase
        .from('egresos')
        .select('*')
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error
      setEgresos(data || [])
    } catch (err) {
      console.error(err)
      setStatusMessage({ type: 'error', text: 'Error al cargar egresos: ' + err.message })
    } finally {
      setLoading(false)
    }
  }

  const fetchGuardiaData = async () => {
    setLoadingGuardia(true)
    try {
      const [{ data: tData }, { data: pgData, error: pgErr }] = await Promise.all([
        supabase.from('configuracion_tarifas').select('id, sueldo_guardia_mensual').limit(1).maybeSingle(),
        supabase
          .from('pagos_guardia')
          .select('*')
          .eq('mes', guardiaMes)
          .eq('anio', guardiaAnio)
          .order('fecha_pago', { ascending: false })
          .order('created_at', { ascending: false }),
      ])

      if (tData) {
        setTarifaId(tData.id)
        const s = parseFloat(tData.sueldo_guardia_mensual) || 0
        setSueldoMensual(s)
        setSueldoOriginal(s)
      }
      if (pgErr) throw pgErr
      setPagosGuardia(pgData || [])
    } catch (err) {
      console.error(err)
      setStatusMessage({ type: 'error', text: 'Error al cargar pagos del guardia: ' + err.message })
    } finally {
      setLoadingGuardia(false)
    }
  }

  useEffect(() => {
    fetchEgresos()
  }, [])

  useEffect(() => {
    fetchGuardiaData()
  }, [guardiaMes, guardiaAnio])

  const handleCajaChange = (newCaja) => {
    setCaja(newCaja)
    const cats = newCaja === 'servicios' ? CATEGORIAS_SERVICIOS : CATEGORIAS_AFILIACIONES
    if (!cats.includes(categoria)) setCategoria(cats[0])
  }

  const openNewEgresoModal = () => {
    setEditingEgreso(null)
    setCaja('servicios')
    setCategoria(CATEGORIAS_SERVICIOS[0])
    setDescripcion('')
    setMonto('')
    setMetodoPago('efectivo')
    setFecha(getLocalDateStr())
    setReciboDriveUrl('')
    setIsNewModalOpen(true)
  }

  const openEditEgresoModal = (eg) => {
    setEditingEgreso(eg)
    setCaja(eg.caja || 'servicios')
    setCategoria(eg.categoria || CATEGORIAS_SERVICIOS[0])
    setDescripcion(eg.descripcion || '')
    setMonto(String(eg.monto ?? ''))
    setMetodoPago(eg.metodo_pago || 'efectivo')
    setFecha(eg.fecha || getLocalDateStr())
    setReciboDriveUrl(eg.recibo_drive_url || '')
    setIsNewModalOpen(true)
  }

  const handleSaveEgreso = async (e) => {
    e.preventDefault()
    const montoNum = parseFloat(monto)
    if (!montoNum || montoNum <= 0) {
      setStatusMessage({ type: 'error', text: 'Ingresa un monto válido mayor a 0.' })
      return
    }
    if (!descripcion.trim()) {
      setStatusMessage({ type: 'error', text: 'Ingresa una descripción del gasto.' })
      return
    }

    if (editingEgreso) {
      setConfirmState({ open: true, tipo: 'edicion', entity: 'egreso', target: editingEgreso, advertencia: '' })
      return
    }

    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('egresos')
        .insert([
          {
            caja,
            categoria,
            descripcion: descripcion.trim(),
            monto: montoNum,
            metodo_pago: metodoPago,
            fecha,
            recibo_drive_url: reciboDriveUrl || null,
            estado: 'activo',
          },
        ])
        .select()
        .single()

      if (error) throw error

      await registrarAuditoria({
        usuarioId: user?.id,
        accion: 'REGISTRO_EGRESO',
        detalleJson: {
          descripcion: `Egreso ${montoNum.toFixed(2)} Bs en Caja ${caja} (${categoria}): ${descripcion.trim()}`,
          tabla: 'egresos',
          registro_id: data?.id,
          caja,
          categoria,
          monto: montoNum,
          metodo_pago: metodoPago,
          fecha,
        },
      })

      setStatusMessage({
        type: 'success',
        text: `¡Egreso de ${montoNum.toFixed(2)} Bs registrado en Caja ${caja === 'servicios' ? 'Servicios' : 'Afiliaciones'}!`,
      })
      setIsNewModalOpen(false)
      await fetchEgresos()
    } catch (err) {
      console.error(err)
      setStatusMessage({ type: 'error', text: 'Error al registrar egreso: ' + err.message })
    } finally {
      setSaving(false)
    }
  }

  const handleAnularEgreso = async (egresoId) => {
    if (!motivoAnulacion.trim()) {
      setStatusMessage({ type: 'error', text: 'El motivo de anulación es obligatorio.' })
      return
    }

    try {
      const { error } = await supabase
        .from('egresos')
        .update({
          estado: 'anulado',
          motivo_anulacion: motivoAnulacion.trim(),
        })
        .eq('id', egresoId)

      if (error) throw error

      await registrarAuditoria({
        usuarioId: user?.id,
        accion: 'ANULACION_EGRESO',
        detalleJson: {
          descripcion: `Anulación de egreso ${egresoId}`,
          tabla: 'egresos',
          registro_id: egresoId,
          motivo: motivoAnulacion.trim(),
        },
      })

      setStatusMessage({ type: 'success', text: 'Egreso anulado correctamente.' })
      setAnulandoEgresoId(null)
      setMotivoAnulacion('')
      await fetchEgresos()
    } catch (err) {
      console.error(err)
      setStatusMessage({ type: 'error', text: 'Error al anular egreso: ' + err.message })
    }
  }

  const openEditGuardiaModal = (pg) => {
    setEditingGuardia(pg)
    setGTipo(pg.tipo || 'adelanto_quincena')
    setGMonto(String(pg.monto ?? ''))
    setGFecha(pg.fecha_pago || getLocalDateStr())
    setGMetodo(pg.metodo_pago || 'efectivo')
    setGObs(pg.observaciones || '')
    setGFotoUrl(pg.foto_vale_url || '')
    setIsGuardiaModalOpen(true)
  }

  const handleSavePagoGuardia = async (e) => {
    e.preventDefault()
    const montoNum = parseFloat(gMonto)
    if (!montoNum || montoNum <= 0) {
      setStatusMessage({ type: 'error', text: 'Ingresa un monto válido mayor a 0.' })
      return
    }

    if (editingGuardia) {
      setConfirmState({
        open: true,
        tipo: 'edicion',
        entity: 'guardia',
        target: editingGuardia,
        advertencia: editingGuardia.egreso_id ? 'También se actualizará el egreso vinculado en Caja Servicios.' : '',
      })
      return
    }

    setSavingGuardia(true)
    try {
      const tipoLabel = TIPOS_GUARDIA.find((t) => t.value === gTipo)?.label || gTipo
      const descEgreso = `${tipoLabel} - ${MESES[guardiaMes]} ${guardiaAnio}${gObs.trim() ? ` (${gObs.trim()})` : ''}`

      const { data: egresoCreado, error: egErr } = await supabase
        .from('egresos')
        .insert([
          {
            caja: 'servicios',
            categoria: 'Sueldo Guardia',
            descripcion: descEgreso,
            monto: montoNum,
            metodo_pago: gMetodo,
            fecha: gFecha,
            recibo_drive_url: gFotoUrl || null,
            estado: 'activo',
          },
        ])
        .select()
        .single()

      if (egErr) throw egErr

      const { error: pgErr } = await supabase.from('pagos_guardia').insert([
        {
          anio: guardiaAnio,
          mes: guardiaMes,
          tipo: gTipo,
          monto: montoNum,
          metodo_pago: gMetodo,
          fecha_pago: gFecha,
          foto_vale_url: gFotoUrl || null,
          observaciones: gObs.trim() || null,
          egreso_id: egresoCreado.id,
          anulado: false,
        },
      ])

      if (pgErr) throw pgErr

      await registrarAuditoria({
        usuarioId: user?.id,
        accion: 'PAGO_SUELDO_GUARDIA',
        detalleJson: {
          descripcion: `${descEgreso} por ${montoNum.toFixed(2)} Bs (${gMetodo})`,
          tabla: 'pagos_guardia',
          egreso_id: egresoCreado.id,
          monto: montoNum,
          tipo: gTipo,
          fecha_pago: gFecha,
        },
      })

      setStatusMessage({
        type: 'success',
        text: `¡${tipoLabel} de ${montoNum.toFixed(2)} Bs registrado y descontado de Caja Servicios!`,
      })
      setIsGuardiaModalOpen(false)
      await Promise.all([fetchGuardiaData(), fetchEgresos()])
    } catch (err) {
      console.error(err)
      setStatusMessage({ type: 'error', text: 'Error al registrar pago al guardia: ' + err.message })
    } finally {
      setSavingGuardia(false)
    }
  }

  const handleAnularPagoGuardia = async (pago) => {
    if (!motivoAnulGuardia.trim()) {
      setStatusMessage({ type: 'error', text: 'El motivo de anulación es obligatorio.' })
      return
    }

    try {
      const { error: pgErr } = await supabase
        .from('pagos_guardia')
        .update({
          anulado: true,
          motivo_anulacion: motivoAnulGuardia.trim(),
        })
        .eq('id', pago.id)
      if (pgErr) throw pgErr

      if (pago.egreso_id) {
        const { error: egErr } = await supabase
          .from('egresos')
          .update({
            estado: 'anulado',
            motivo_anulacion: `Anulación pago guardia: ${motivoAnulGuardia.trim()}`,
          })
          .eq('id', pago.egreso_id)
        if (egErr) throw egErr
      }

      await registrarAuditoria({
        usuarioId: user?.id,
        accion: 'ANULACION_PAGO_GUARDIA',
        detalleJson: {
          descripcion: `Anulación de pago al guardia (${pago.monto} Bs, ${MESES[pago.mes]} ${pago.anio})`,
          tabla: 'pagos_guardia',
          registro_id: pago.id,
          egreso_id: pago.egreso_id,
          motivo: motivoAnulGuardia.trim(),
        },
      })

      setStatusMessage({
        type: 'success',
        text: 'Pago al guardia y su egreso vinculado anulados correctamente.',
      })
      setAnulandoGuardiaId(null)
      setMotivoAnulGuardia('')
      await Promise.all([fetchGuardiaData(), fetchEgresos()])
    } catch (err) {
      console.error(err)
      setStatusMessage({ type: 'error', text: 'Error al anular pago del guardia: ' + err.message })
    }
  }

  const handleConfirmAudit = async (motivo) => {
    const { tipo, entity, target } = confirmState
    if (!target && entity !== 'sueldo') return

    setSaving(true)
    setSavingGuardia(true)
    setSavingSueldo(true)

    try {
      if (entity === 'egreso' && tipo === 'edicion') {
        const montoNum = parseFloat(monto)
        const datosNuevos = {
          caja,
          categoria,
          descripcion: descripcion.trim(),
          monto: montoNum,
          metodo_pago: metodoPago,
          fecha,
          recibo_drive_url: reciboDriveUrl || null,
        }

        await registrarEdicionAuditoria({
          usuarioId: user?.id,
          modulo: 'Egresos Generales',
          tabla: 'egresos',
          registroId: target.id,
          motivo,
          resumen: `Edición de egreso "${target.descripcion}"`,
          datosAnteriores: {
            caja: target.caja,
            categoria: target.categoria,
            descripcion: target.descripcion,
            monto: target.monto,
            metodo_pago: target.metodo_pago,
            fecha: target.fecha,
            recibo_drive_url: target.recibo_drive_url,
          },
          datosNuevos,
        })

        const { error } = await supabase.from('egresos').update(datosNuevos).eq('id', target.id)
        if (error) throw error

        setIsNewModalOpen(false)
        setEditingEgreso(null)
        setStatusMessage({ type: 'success', text: 'Egreso editado y auditado en bitácora.' })
      } else if (entity === 'egreso' && tipo === 'eliminacion') {
        await registrarEliminacionAuditoria({
          usuarioId: user?.id,
          modulo: 'Egresos Generales',
          tabla: 'egresos',
          registroId: target.id,
          motivo,
          resumen: `Eliminación de egreso "${target.descripcion}" (${target.monto} Bs)`,
          datosAnteriores: target,
        })

        const { error } = await supabase.from('egresos').delete().eq('id', target.id)
        if (error) throw error

        setStatusMessage({ type: 'success', text: 'Egreso eliminado y auditado en bitácora.' })
      } else if (entity === 'guardia' && tipo === 'edicion') {
        const montoNum = parseFloat(gMonto)
        const tipoLabel = TIPOS_GUARDIA.find((t) => t.value === gTipo)?.label || gTipo
        const descEgreso = `${tipoLabel} - ${MESES[guardiaMes]} ${guardiaAnio}${gObs.trim() ? ` (${gObs.trim()})` : ''}`
        const datosNuevos = {
          tipo: gTipo,
          monto: montoNum,
          metodo_pago: gMetodo,
          fecha_pago: gFecha,
          foto_vale_url: gFotoUrl || null,
          observaciones: gObs.trim() || null,
        }

        await registrarEdicionAuditoria({
          usuarioId: user?.id,
          modulo: 'Sueldo Guardia',
          tabla: 'pagos_guardia',
          registroId: target.id,
          motivo,
          resumen: `Edición de pago guardia (${MESES[guardiaMes]} ${guardiaAnio})`,
          datosAnteriores: {
            tipo: target.tipo,
            monto: target.monto,
            metodo_pago: target.metodo_pago,
            fecha_pago: target.fecha_pago,
            foto_vale_url: target.foto_vale_url,
            observaciones: target.observaciones,
          },
          datosNuevos,
        })

        const { error: pgErr } = await supabase.from('pagos_guardia').update(datosNuevos).eq('id', target.id)
        if (pgErr) throw pgErr

        if (target.egreso_id) {
          await supabase
            .from('egresos')
            .update({
              descripcion: descEgreso,
              monto: montoNum,
              metodo_pago: gMetodo,
              fecha: gFecha,
              recibo_drive_url: gFotoUrl || null,
            })
            .eq('id', target.egreso_id)
        }

        setIsGuardiaModalOpen(false)
        setEditingGuardia(null)
        setStatusMessage({ type: 'success', text: 'Pago del guardia y egreso vinculado editados con auditoría.' })
      } else if (entity === 'guardia' && tipo === 'eliminacion') {
        await registrarEliminacionAuditoria({
          usuarioId: user?.id,
          modulo: 'Sueldo Guardia',
          tabla: 'pagos_guardia',
          registroId: target.id,
          motivo,
          resumen: `Eliminación de pago guardia (${target.monto} Bs, ${MESES[target.mes]} ${target.anio})`,
          datosAnteriores: target,
        })

        const { error: pgErr } = await supabase.from('pagos_guardia').delete().eq('id', target.id)
        if (pgErr) throw pgErr

        if (target.egreso_id) {
          await supabase.from('egresos').delete().eq('id', target.egreso_id)
        }

        setStatusMessage({ type: 'success', text: 'Pago del guardia y su egreso vinculado eliminados con auditoría.' })
      } else if (entity === 'sueldo' && tipo === 'edicion') {
        const nuevoSueldo = parseFloat(sueldoMensual) || 0
        await registrarEdicionAuditoria({
          usuarioId: user?.id,
          modulo: 'Sueldo Mensual Guardia',
          tabla: 'configuracion_tarifas',
          registroId: tarifaId,
          motivo,
          resumen: `Cambio de sueldo mensual del guardia (${sueldoOriginal} Bs ➔ ${nuevoSueldo} Bs)`,
          datosAnteriores: { sueldo_guardia_mensual: sueldoOriginal },
          datosNuevos: { sueldo_guardia_mensual: nuevoSueldo },
        })

        const { error } = await supabase
          .from('configuracion_tarifas')
          .update({ sueldo_guardia_mensual: nuevoSueldo })
          .eq('id', tarifaId)
        if (error) throw error

        setSueldoOriginal(nuevoSueldo)
        setStatusMessage({ type: 'success', text: `Sueldo mensual guardado (${nuevoSueldo.toFixed(2)} Bs) con auditoría.` })
      }

      setConfirmState({ open: false, tipo: 'edicion', entity: null, target: null, advertencia: '' })
      await Promise.all([fetchEgresos(), fetchGuardiaData()])
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message })
      setConfirmState({ open: false, tipo: 'edicion', entity: null, target: null, advertencia: '' })
    } finally {
      setSaving(false)
      setSavingGuardia(false)
      setSavingSueldo(false)
    }
  }

  const filteredEgresos = egresos.filter((eg) => {
    const term = searchTerm.toLowerCase()
    const matchesSearch = !term || eg.descripcion?.toLowerCase().includes(term) || eg.categoria?.toLowerCase().includes(term)
    if (!matchesSearch) return false
    if (filterCaja !== 'todos' && eg.caja !== filterCaja) return false
    if (filterMetodo !== 'todos' && eg.metodo_pago !== filterMetodo) return false
    return true
  })

  const totalServicios = egresos
    .filter((e) => e.caja === 'servicios' && e.estado === 'activo')
    .reduce((s, e) => s + (parseFloat(e.monto) || 0), 0)

  const totalAfiliaciones = egresos
    .filter((e) => e.caja === 'afiliaciones' && e.estado === 'activo')
    .reduce((s, e) => s + (parseFloat(e.monto) || 0), 0)

  const totalGeneralEgresos = totalServicios + totalAfiliaciones

  const totalAdelantosGuardia = pagosGuardia
    .filter((p) => !p.anulado)
    .reduce((s, p) => s + (parseFloat(p.monto) || 0), 0)
  const saldoPendienteGuardia = Math.max(0, (parseFloat(sueldoMensual) || 0) - totalAdelantosGuardia)

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-slate-900">Egresos y Control de Guardia</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
              Dos Cajas Separadas
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Registro, edición y eliminación auditada de facturas, sueldos y mantenimiento.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              fetchEgresos()
              fetchGuardiaData()
            }}
            title="Recargar datos"
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading || loadingGuardia ? 'animate-spin text-amber-600' : ''}`} />
          </button>
          {activeTab === 'egresos' ? (
            isAdmin && (
              <button
                onClick={openNewEgresoModal}
                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Registrar Egreso</span>
              </button>
            )
          ) : (
            isAdmin && (
              <button
                onClick={() => {
                  setEditingGuardia(null)
                  setGTipo('adelanto_quincena')
                  setGMonto('')
                  setGFecha(getLocalDateStr())
                  setGMetodo('efectivo')
                  setGObs('')
                  setGFotoUrl('')
                  setIsGuardiaModalOpen(true)
                }}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
              >
                <Shield className="w-4 h-4" />
                <span>Registrar Adelanto / Pago Guardia</span>
              </button>
            )
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('egresos')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'egresos' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Egresos Generales ({egresos.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('guardia')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'guardia' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Sueldo y Adelantos del Guardia</span>
        </button>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center justify-between ${
            statusMessage.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <span>{statusMessage.text}</span>
          <button onClick={() => setStatusMessage(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {activeTab === 'guardia' ? (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-slate-600">Mes de Control:</span>
              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1">
                <select value={guardiaMes} onChange={(e) => setGuardiaMes(parseInt(e.target.value, 10))} className="bg-transparent font-bold text-slate-800 py-1 px-2 focus:outline-none">
                  {MESES.slice(1).map((m, i) => (
                    <option key={i + 1} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
                <select value={guardiaAnio} onChange={(e) => setGuardiaAnio(parseInt(e.target.value, 10))} className="bg-transparent font-bold text-slate-800 py-1 px-2 border-l border-slate-200 focus:outline-none">
                  {[2024, 2025, 2026, 2027, 2028].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <label className="font-semibold text-slate-700">Sueldo Mensual (Bs):</label>
              <input
                type="number"
                step="10"
                min="0"
                disabled={!isAdmin}
                value={sueldoMensual}
                onChange={(e) => setSueldoMensual(e.target.value)}
                className="w-28 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900"
              />
              {isAdmin && (
                <button
                  type="button"
                  onClick={() =>
                    setConfirmState({
                      open: true,
                      tipo: 'edicion',
                      entity: 'sueldo',
                      target: { id: tarifaId },
                      advertencia: '',
                    })
                  }
                  disabled={savingSueldo}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center gap-1"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Guardar</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Sueldo Mensual</span>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">
                {(parseFloat(sueldoMensual) || 0).toFixed(2)} <span className="text-xs font-normal text-slate-500">Bs</span>
              </p>
              <span className="text-[11px] text-slate-400">
                {MESES[guardiaMes]} {guardiaAnio}
              </span>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-emerald-200 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">Total Adelantos Entregados</span>
              <p className="text-2xl font-extrabold text-emerald-700 mt-1">
                {totalAdelantosGuardia.toFixed(2)} <span className="text-xs font-normal text-slate-500">Bs</span>
              </p>
              <span className="text-[11px] text-slate-400">Cargado en Egresos Servicios</span>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-amber-200 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">Saldo Pendiente por Pagar</span>
              <p className="text-2xl font-extrabold text-amber-700 mt-1">
                {saldoPendienteGuardia.toFixed(2)} <span className="text-xs font-normal text-slate-500">Bs</span>
              </p>
              <span className="text-[11px] text-slate-400">Restante del sueldo del mes</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Movimientos del Guardia — {MESES[guardiaMes]} {guardiaAnio} ({pagosGuardia.length})
              </span>
            </div>

            {pagosGuardia.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No se registraron adelantos ni pagos al guardia en {MESES[guardiaMes]} {guardiaAnio}.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {pagosGuardia.map((p) => {
                  const tipoLabel = TIPOS_GUARDIA.find((t) => t.value === p.tipo)?.label || p.tipo
                  return (
                    <div key={p.id} className="p-4 text-xs space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[11px]">
                            {tipoLabel}
                          </span>
                          <span className={`font-bold text-sm ${p.anulado ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                            {parseFloat(p.monto).toFixed(2)} Bs
                          </span>
                          <span className="text-slate-500">
                            • {p.fecha_pago} • {p.metodo_pago === 'qr' ? 'QR / Banco' : 'Efectivo'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {p.foto_vale_url && (
                            <a href={p.foto_vale_url} target="_blank" rel="noreferrer" className="p-1.5 bg-blue-50 text-blue-600 rounded-lg inline-flex items-center gap-1 text-[11px] font-semibold">
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Ver Vale</span>
                            </a>
                          )}
                          {p.anulado ? (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-bold">Anulado</span>
                          ) : (
                            isAdmin && (
                              <>
                                <button type="button" onClick={() => openEditGuardiaModal(p)} title="Editar pago" className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg">
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAnulandoGuardiaId(p.id)
                                    setMotivoAnulGuardia('')
                                  }}
                                  className="text-orange-600 hover:bg-orange-50 px-2 py-1 rounded font-semibold"
                                >
                                  Anular
                                </button>
                              </>
                            )
                          )}
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmState({
                                  open: true,
                                  tipo: 'eliminacion',
                                  entity: 'guardia',
                                  target: p,
                                  advertencia: p.egreso_id ? 'Se eliminará también su egreso vinculado en Caja Servicios.' : '',
                                })
                              }
                              title="Eliminar pago guardia"
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {p.observaciones && <p className="text-slate-600">{p.observaciones}</p>}
                      {p.anulado && p.motivo_anulacion && (
                        <p className="text-[11px] text-red-700 bg-red-50 p-2 rounded">
                          <strong>Motivo anulación:</strong> {p.motivo_anulacion}
                        </p>
                      )}

                      {anulandoGuardiaId === p.id && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                          <span className="font-bold text-amber-900 block">
                            Motivo obligatorio (anulará también el egreso vinculado en Caja Servicios)
                          </span>
                          <input
                            type="text"
                            value={motivoAnulGuardia}
                            onChange={(e) => setMotivoAnulGuardia(e.target.value)}
                            placeholder="Escribe el motivo..."
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg"
                          />
                          <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setAnulandoGuardiaId(null)} className="text-slate-600">
                              Cancelar
                            </button>
                            <button type="button" onClick={() => handleAnularPagoGuardia(p)} className="px-3 py-1 bg-red-600 text-white rounded-lg font-bold">
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
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">Egresos Caja Servicios</span>
              <p className="text-xl font-bold text-slate-900 mt-1">
                {totalServicios.toFixed(2)} <span className="text-xs font-normal text-slate-500">Bs</span>
              </p>
              <span className="text-[11px] text-slate-400">Luz, agua, guardia y basura</span>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">Egresos Caja Afiliaciones</span>
              <p className="text-xl font-bold text-slate-900 mt-1">
                {totalAfiliaciones.toFixed(2)} <span className="text-xs font-normal text-slate-500">Bs</span>
              </p>
              <span className="text-[11px] text-slate-400">Limpieza y mantenimiento</span>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 block">Total Egresos General</span>
              <p className="text-xl font-bold text-red-600 mt-1">
                {totalGeneralEgresos.toFixed(2)} <span className="text-xs font-normal text-slate-500">Bs</span>
              </p>
              <span className="text-[11px] text-slate-400">Total descargado en recibos</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por descripción o categoría..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
              <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl">
                <button onClick={() => setFilterCaja('todos')} className={`px-2.5 py-1 rounded-lg ${filterCaja === 'todos' ? 'bg-white font-bold shadow-sm' : 'text-slate-600'}`}>
                  Todas
                </button>
                <button onClick={() => setFilterCaja('servicios')} className={`px-2.5 py-1 rounded-lg ${filterCaja === 'servicios' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-600'}`}>
                  Servicios
                </button>
                <button onClick={() => setFilterCaja('afiliaciones')} className={`px-2.5 py-1 rounded-lg ${filterCaja === 'afiliaciones' ? 'bg-blue-600 text-white font-bold' : 'text-slate-600'}`}>
                  Afiliaciones
                </button>
              </div>

              <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl">
                <button onClick={() => setFilterMetodo('todos')} className={`px-2 py-1 rounded-lg ${filterMetodo === 'todos' ? 'bg-white font-bold shadow-sm' : 'text-slate-600'}`}>
                  Todos
                </button>
                <button onClick={() => setFilterMetodo('efectivo')} className={`px-2 py-1 rounded-lg ${filterMetodo === 'efectivo' ? 'bg-slate-900 text-white font-bold' : 'text-slate-600'}`}>
                  Efectivo
                </button>
                <button onClick={() => setFilterMetodo('qr')} className={`px-2 py-1 rounded-lg ${filterMetodo === 'qr' ? 'bg-slate-900 text-white font-bold' : 'text-slate-600'}`}>
                  QR
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
              <RefreshCw className="w-8 h-8 mx-auto animate-spin text-amber-600 mb-2" />
              <p className="text-xs text-slate-500">Cargando egresos...</p>
            </div>
          ) : filteredEgresos.length === 0 ? (
            <div className="p-10 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs space-y-2">
              <ArrowDownCircle className="w-10 h-10 mx-auto text-slate-300" />
              <p>No se encontraron egresos con los filtros seleccionados.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm divide-y divide-slate-100">
              {filteredEgresos.map((egreso) => {
                const isAnulado = egreso.estado === 'anulado'
                const isAnulando = anulandoEgresoId === egreso.id
                const isServicios = egreso.caja === 'servicios'

                return (
                  <div key={egreso.id} className="p-4 hover:bg-slate-50 transition-colors space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="flex items-start space-x-3">
                        <span className={`p-2 rounded-xl mt-0.5 ${isServicios ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                          <ArrowDownCircle className="w-4 h-4" />
                        </span>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${isServicios ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>
                              Caja {isServicios ? 'Servicios' : 'Afiliaciones'}
                            </span>
                            <span className="font-semibold text-slate-800">{egreso.categoria}</span>
                            <span className="text-slate-400 text-[11px]">• {egreso.fecha}</span>
                          </div>
                          <p className={`text-slate-600 mt-1 ${isAnulado ? 'line-through text-slate-400' : ''}`}>
                            {egreso.descripcion}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 self-end sm:self-center">
                        <div className="text-right mr-1">
                          <span className={`text-sm font-bold block ${isAnulado ? 'line-through text-slate-400' : 'text-red-600'}`}>
                            -{parseFloat(egreso.monto).toFixed(2)} Bs
                          </span>
                          <span className="text-[10px] text-slate-400 uppercase font-medium">
                            {egreso.metodo_pago === 'qr' ? 'QR / Banco' : 'Efectivo'}
                          </span>
                        </div>

                        {egreso.recibo_drive_url && (
                          <a href={egreso.recibo_drive_url} target="_blank" rel="noreferrer" className="p-1.5 text-blue-600 bg-blue-50 rounded-lg" title="Ver foto del recibo">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}

                        {isAnulado ? (
                          <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">Anulado</span>
                        ) : (
                          isAdmin && (
                            <>
                              <button type="button" onClick={() => openEditEgresoModal(egreso)} title="Editar egreso" className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg">
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setAnulandoEgresoId(egreso.id)
                                  setMotivoAnulacion('')
                                }}
                                className="text-[11px] font-semibold text-orange-600 hover:bg-orange-50 px-2 py-1 rounded-lg"
                              >
                                Anular
                              </button>
                            </>
                          )
                        )}

                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmState({
                                open: true,
                                tipo: 'eliminacion',
                                entity: 'egreso',
                                target: egreso,
                                advertencia: '',
                              })
                            }
                            title="Eliminar egreso cargado por error"
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {isAnulado && egreso.motivo_anulacion && (
                      <p className="text-[11px] text-red-700 bg-red-50 p-2 rounded-lg">
                        <strong>Motivo de anulación:</strong> {egreso.motivo_anulacion}
                      </p>
                    )}

                    {isAnulando && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs">
                        <span className="font-bold text-amber-900 block">Motivo de Anulación Obligatorio</span>
                        <input
                          type="text"
                          required
                          value={motivoAnulacion}
                          onChange={(e) => setMotivoAnulacion(e.target.value)}
                          placeholder="Escribe el motivo de anulación del gasto..."
                          className="w-full px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-lg"
                        />
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => setAnulandoEgresoId(null)} className="text-[11px] text-slate-600">
                            Cancelar
                          </button>
                          <button type="button" onClick={() => handleAnularEgreso(egreso.id)} className="px-3 py-1 bg-red-600 text-white rounded-lg text-[11px] font-bold">
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
        </>
      )}

      {/* Modal Crear / Editar Egreso */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md my-8 overflow-hidden">
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
                  <ArrowDownCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">
                    {editingEgreso ? 'Editar Egreso (Auditado)' : 'Registrar Egreso'}
                  </h3>
                  <p className="text-xs text-slate-400">Descargo de fondos con respaldo fotográfico</p>
                </div>
              </div>
              <button onClick={() => setIsNewModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400 hover:text-white" />
              </button>
            </div>

            <form onSubmit={handleSaveEgreso} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Caja *</label>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => handleCajaChange('servicios')} className={`py-2 px-3 rounded-xl border text-xs font-bold ${caja === 'servicios' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 text-slate-700 border-slate-300'}`}>
                    Caja Servicios
                  </button>
                  <button type="button" onClick={() => handleCajaChange('afiliaciones')} className={`py-2 px-3 rounded-xl border text-xs font-bold ${caja === 'afiliaciones' ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-700 border-slate-300'}`}>
                    Caja Afiliaciones
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Categoría</label>
                <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl">
                  {(caja === 'servicios' ? CATEGORIAS_SERVICIOS : CATEGORIAS_AFILIACIONES).map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Descripción *</label>
                <input type="text" required value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Monto (Bs) *</label>
                  <input type="number" step="0.50" min="0.50" required value={monto} onChange={(e) => setMonto(e.target.value)} className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha</label>
                  <input type="date" required value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Pagado con</label>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setMetodoPago('efectivo')} className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${metodoPago === 'efectivo' ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-700 border-slate-300'}`}>
                    <Coins className="w-4 h-4" />
                    <span>Efectivo</span>
                  </button>
                  <button type="button" onClick={() => setMetodoPago('qr')} className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${metodoPago === 'qr' ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-700 border-slate-300'}`}>
                    <QrCode className="w-4 h-4" />
                    <span>QR / Banco</span>
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-600">Foto Recibo (Drive):</span>
                <div className="flex items-center space-x-2">
                  {reciboDriveUrl && (
                    <a href={reciboDriveUrl} target="_blank" rel="noreferrer" className="p-1.5 text-blue-600 bg-blue-50 rounded-lg">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <button type="button" onClick={() => setIsPhotoModalOpen(true)} className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <Camera className="w-3.5 h-3.5 text-slate-500" />
                    <span>{reciboDriveUrl ? 'Cambiar Foto' : 'Adjuntar Recibo'}</span>
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button type="button" onClick={() => setIsNewModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-600">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md">
                  {saving ? 'Guardando...' : editingEgreso ? 'Actualizar Egreso' : 'Confirmar Egreso'}
                </button>
              </div>
            </form>
          </div>

          <FotoUploaderModal
            isOpen={isPhotoModalOpen}
            onClose={() => setIsPhotoModalOpen(false)}
            onPhotoSaved={(url) => setReciboDriveUrl(url)}
            currentUrl={reciboDriveUrl}
            titulo={`Foto Recibo de Egreso (${caja === 'servicios' ? 'Servicios' : 'Afiliaciones'})`}
            categoria={caja === 'servicios' ? 'Egresos_Servicios' : 'Egresos_Afiliaciones'}
            anio={new Date().getFullYear()}
            mes={new Date().getMonth() + 1}
            customName={`Recibo_${caja}_${Date.now()}.jpg`}
          />
        </div>
      )}

      {/* Modal Crear / Editar Pago Guardia */}
      {isGuardiaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md my-8 overflow-hidden">
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">
                  {editingGuardia ? 'Editar Pago Guardia (Auditado)' : 'Adelanto / Pago del Guardia'}
                </h3>
                <p className="text-xs text-slate-400">
                  {MESES[guardiaMes]} {guardiaAnio} • Sincronizado con Egresos Servicios
                </p>
              </div>
              <button onClick={() => setIsGuardiaModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400 hover:text-white" />
              </button>
            </div>

            <form onSubmit={handleSavePagoGuardia} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de Pago</label>
                <select value={gTipo} onChange={(e) => setGTipo(e.target.value)} className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-bold">
                  {TIPOS_GUARDIA.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Monto (Bs)</label>
                  <input type="number" step="0.50" min="0.50" required value={gMonto} onChange={(e) => setGMonto(e.target.value)} className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha Real</label>
                  <input type="date" required value={gFecha} onChange={(e) => setGFecha(e.target.value)} className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Método</label>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setGMetodo('efectivo')} className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${gMetodo === 'efectivo' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 text-slate-700 border-slate-300'}`}>
                    <Coins className="w-4 h-4" />
                    <span>Efectivo</span>
                  </button>
                  <button type="button" onClick={() => setGMetodo('qr')} className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${gMetodo === 'qr' ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-700 border-slate-300'}`}>
                    <QrCode className="w-4 h-4" />
                    <span>QR / Banco</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Observaciones</label>
                <input type="text" value={gObs} onChange={(e) => setGObs(e.target.value)} className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl" />
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-600">Foto Vale (Drive):</span>
                <div className="flex items-center gap-2">
                  {gFotoUrl && (
                    <a href={gFotoUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                      Ver
                    </a>
                  )}
                  <button type="button" onClick={() => setIsGuardiaPhotoOpen(true)} className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold text-slate-700 flex items-center gap-1">
                    <Camera className="w-3.5 h-3.5" />
                    <span>{gFotoUrl ? 'Cambiar Foto' : 'Subir Vale'}</span>
                  </button>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button type="button" onClick={() => setIsGuardiaModalOpen(false)} className="px-4 py-2 text-xs text-slate-600">
                  Cancelar
                </button>
                <button type="submit" disabled={savingGuardia} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{savingGuardia ? 'Guardando...' : editingGuardia ? 'Actualizar Pago' : 'Confirmar Pago'}</span>
                </button>
              </div>
            </form>
          </div>

          <FotoUploaderModal
            isOpen={isGuardiaPhotoOpen}
            onClose={() => setIsGuardiaPhotoOpen(false)}
            onPhotoSaved={(url) => setGFotoUrl(url)}
            currentUrl={gFotoUrl}
            titulo="Foto Vale Firmado Guardia"
            categoria="Egresos_Servicios"
            anio={guardiaAnio}
            mes={guardiaMes}
            customName={`Vale_Guardia_${guardiaAnio}-${guardiaMes}_${Date.now()}.jpg`}
          />
        </div>
      )}

      <ConfirmMotivoModal
        isOpen={confirmState.open}
        onClose={() => setConfirmState({ open: false, tipo: 'edicion', entity: null, target: null, advertencia: '' })}
        onConfirm={handleConfirmAudit}
        tipo={confirmState.tipo}
        titulo={
          confirmState.entity === 'egreso'
            ? confirmState.tipo === 'eliminacion'
              ? 'Eliminar Egreso'
              : 'Editar Egreso'
            : confirmState.entity === 'guardia'
            ? confirmState.tipo === 'eliminacion'
              ? 'Eliminar Pago de Guardia'
              : 'Editar Pago de Guardia'
            : 'Editar Sueldo Mensual del Guardia'
        }
        descripcion="Se guardará el snapshot completo en bitacora_auditoria antes de aplicar la modificación."
        advertencia={confirmState.advertencia}
        loading={saving || savingGuardia || savingSueldo}
      />
    </div>
  )
}
