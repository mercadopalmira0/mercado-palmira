import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { registrarAuditoria } from '../../lib/auditoria'
import { getLocalDateStr } from '../../lib/formatters'
import FotoUploaderModal from './FotoUploaderModal'
import { ArrowRightLeft, UserPlus, CheckCircle2, AlertCircle, X, Camera, ExternalLink } from 'lucide-react'

export default function TraspasoPuestoModal({
  isOpen,
  onClose,
  socioAnterior,
  unidad,
  socios = [],
  costoAfiliacion = 1500,
  onSuccess,
}) {
  const { user } = useAuth()
  const [modoComprador, setModoComprador] = useState('existente') // 'existente' | 'nuevo'
  const [socioNuevoId, setSocioNuevoId] = useState('')
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoTelefono, setNuevoTelefono] = useState('')
  const [fechaTraspaso, setFechaTraspaso] = useState(getLocalDateStr())
  const [incluyeAfiliacion, setIncluyeAfiliacion] = useState(false)
  const [documentoUrl, setDocumentoUrl] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [isPhotoOpen, setIsPhotoOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (isOpen) {
      setModoComprador('existente')
      setSocioNuevoId('')
      setNuevoNombre('')
      setNuevoTelefono('')
      setFechaTraspaso(getLocalDateStr())
      setIncluyeAfiliacion(false)
      setDocumentoUrl('')
      setObservaciones('')
      setErrorMsg('')
    }
  }, [isOpen])

  if (!isOpen || !unidad || !socioAnterior) return null

  const sociosDisponibles = socios.filter((s) => s.id !== socioAnterior.id && s.activo !== false)

  const handleConfirmTraspaso = async (e) => {
    e.preventDefault()
    setErrorMsg('')

    if (modoComprador === 'existente' && !socioNuevoId) {
      setErrorMsg('Selecciona el socio comprador de la lista.')
      return
    }
    if (modoComprador === 'nuevo' && !nuevoNombre.trim()) {
      setErrorMsg('Ingresa el nombre completo del comprador.')
      return
    }

    setSaving(true)
    try {
      let compradorId = socioNuevoId
      let compradorNombre = ''

      if (modoComprador === 'nuevo') {
        const { data: createdSocio, error: sErr } = await supabase
          .from('socios')
          .insert([
            {
              nombre: nuevoNombre.trim(),
              telefono: nuevoTelefono.trim() || null,
              activo: true,
              notas: `Comprador del puesto ${unidad.numero_identificador} (${fechaTraspaso})`,
            },
          ])
          .select()
          .single()
        if (sErr) throw sErr
        compradorId = createdSocio.id
        compradorNombre = createdSocio.nombre
      } else {
        const found = socios.find((s) => s.id === socioNuevoId)
        compradorNombre = found?.nombre || 'Nuevo Socio'
      }

      // REGLA CRÍTICA DE INTEGRIDAD HISTÓRICA:
      // Congelar socio_id_historico y nombre_socio_historico en todos los cobros previos que aún no tengan histórico fijado
      const { error: histErr } = await supabase
        .from('cobros_servicios')
        .update({
          socio_id_historico: socioAnterior.id,
          nombre_socio_historico: socioAnterior.nombre,
        })
        .eq('unidad_id', unidad.id)
        .is('nombre_socio_historico', null)

      if (histErr) throw histErr

      // Actualizar dueño actual de la unidad de cobro
      const { error: uErr } = await supabase
        .from('unidades_cobro')
        .update({ socio_responsable_id: compradorId })
        .eq('id', unidad.id)

      if (uErr) throw uErr

      // Registrar en traspasos_puestos
      const { error: tErr } = await supabase.from('traspasos_puestos').insert([
        {
          unidad_cobro_id: unidad.id,
          puesto_referencia: unidad.numero_identificador,
          socio_anterior_id: socioAnterior.id,
          nombre_socio_anterior: socioAnterior.nombre,
          socio_nuevo_id: compradorId,
          nombre_socio_nuevo: compradorNombre,
          fecha_traspaso: fechaTraspaso,
          incluye_afiliacion_nueva: incluyeAfiliacion,
          documento_respaldo_url: documentoUrl || null,
          observaciones: observaciones.trim() || null,
        },
      ])

      if (tErr) throw tErr

      // Iniciar plan de Afiliación si está marcado
      if (incluyeAfiliacion) {
        const montoAf = parseFloat(costoAfiliacion) || 1500
        const { error: afErr } = await supabase.from('afiliaciones').insert([
          {
            socio_id: compradorId,
            monto_total: montoAf,
            cuota_acordada: 100,
            saldo_pendiente: montoAf,
            estado: 'en_curso',
          },
        ])
        if (afErr) throw afErr
      }

      await registrarAuditoria({
        usuarioId: user?.id,
        accion: 'TRASPASO_PUESTO',
        detalleJson: {
          descripcion: `Traspaso de puesto ${unidad.numero_identificador}: ${socioAnterior.nombre} ➔ ${compradorNombre}`,
          unidad_cobro_id: unidad.id,
          puesto: unidad.numero_identificador,
          socio_anterior: socioAnterior.nombre,
          socio_nuevo: compradorNombre,
          fecha_traspaso: fechaTraspaso,
          incluye_afiliacion_nueva: incluyeAfiliacion,
        },
      })

      if (onSuccess) onSuccess(compradorNombre)
      onClose()
    } catch (err) {
      console.error(err)
      setErrorMsg('Error al realizar traspaso: ' + (err.message || 'Error desconocido'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg my-8 overflow-hidden">
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-500/20 text-indigo-300 rounded-lg">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Transferir / Vender Puesto</h3>
              <p className="text-xs text-slate-400">
                {unidad.numero_identificador} • Titular actual: {socioAnterior.nombre}
              </p>
            </div>
          </div>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-slate-400 hover:text-white" />
          </button>
        </div>

        <form onSubmit={handleConfirmTraspaso} className="p-6 space-y-4 max-h-[78vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900">
            <strong>Protección histórica:</strong> Todos los cobros y deudas previas de este puesto quedarán congelados a nombre de{' '}
            <strong>{socioAnterior.nombre}</strong>. El comprador asumirá los cobros desde los meses nuevos en adelante.
          </div>

          {/* Selección de Comprador */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nuevo Dueño (Comprador)</label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                onClick={() => setModoComprador('existente')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold ${
                  modoComprador === 'existente'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-700 border-slate-300'
                }`}
              >
                Socio Existente
              </button>
              <button
                type="button"
                onClick={() => setModoComprador('nuevo')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1 ${
                  modoComprador === 'nuevo'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-slate-50 text-slate-700 border-slate-300'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Crear Nuevo Socio</span>
              </button>
            </div>

            {modoComprador === 'existente' ? (
              <select
                value={socioNuevoId}
                onChange={(e) => setSocioNuevoId(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-semibold"
              >
                <option value="">-- Seleccionar socio comprador --</option>
                {sociosDisponibles.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre} {s.telefono ? `(${s.telefono})` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Nombre Completo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={nuevoNombre}
                    onChange={(e) => setNuevoNombre(e.target.value)}
                    placeholder="Nombre del comprador"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={nuevoTelefono}
                    onChange={(e) => setNuevoTelefono(e.target.value)}
                    placeholder="71234567"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha de Traspaso</label>
              <input
                type="date"
                required
                value={fechaTraspaso}
                onChange={(e) => setFechaTraspaso(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
              />
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 p-2.5 w-full bg-blue-50 border border-blue-200 rounded-xl text-xs font-semibold text-blue-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={incluyeAfiliacion}
                  onChange={(e) => setIncluyeAfiliacion(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span>Iniciar Afiliación ({costoAfiliacion} Bs)</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Observaciones</label>
            <textarea
              rows={2}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Detalle del acta o acuerdo de transferencia..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
            />
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-600">Documento / Acta de Transferencia (Drive):</span>
            <div className="flex items-center gap-2">
              {documentoUrl && (
                <a href={documentoUrl} target="_blank" rel="noreferrer" className="text-blue-600 flex items-center gap-1">
                  <ExternalLink className="w-3.5 h-3.5" /> Ver
                </a>
              )}
              <button
                type="button"
                onClick={() => setIsPhotoOpen(true)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold text-slate-700 flex items-center gap-1"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{documentoUrl ? 'Cambiar Foto' : 'Subir Documento'}</span>
              </button>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs text-slate-600">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{saving ? 'Procesando Traspaso...' : 'Confirmar Traspaso'}</span>
            </button>
          </div>
        </form>
      </div>

      <FotoUploaderModal
        isOpen={isPhotoOpen}
        onClose={() => setIsPhotoOpen(false)}
        onPhotoSaved={(url) => setDocumentoUrl(url)}
        currentUrl={documentoUrl}
        titulo="Documento / Acta de Transferencia"
        categoria="Traspasos_Puestos"
        anio={new Date().getFullYear()}
        mes={new Date().getMonth() + 1}
        customName={`Traspaso_${unidad.numero_identificador}_${Date.now()}.jpg`}
      />
    </div>
  )
}
