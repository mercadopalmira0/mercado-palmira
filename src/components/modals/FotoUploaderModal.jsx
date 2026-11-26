import React, { useState } from 'react'
import { uploadPhotoToDrive, compressImage } from '../../lib/driveUpload'
import { Camera, Link, CheckCircle2, AlertCircle, X, RefreshCw, ExternalLink } from 'lucide-react'

export default function FotoUploaderModal({
  isOpen,
  onClose,
  onPhotoSaved,
  currentUrl,
  titulo = 'Respaldo Fotográfico',
  categoria = 'Tarifadores',
  anio,
  mes,
  customName,
}) {
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(currentUrl || null)
  const [manualUrl, setManualUrl] = useState(currentUrl || '')
  const [compressionInfo, setCompressionInfo] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [mode, setMode] = useState('camera') // 'camera' | 'manual'

  if (!isOpen) return null

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setSelectedFile(file)
    setErrorMsg('')
    setSuccessMsg('')

    try {
      // Previsualizar y comprimir inmediatamente en cliente
      const comp = await compressImage(file)
      setPreviewUrl(comp.dataUrl)
      setCompressionInfo({
        original: comp.originalSizeKb,
        compressed: comp.compressedSizeKb,
      })
    } catch (err) {
      console.error(err)
      setErrorMsg('No se pudo procesar la imagen seleccionada')
    }
  }

  const handleUpload = async () => {
    if (mode === 'manual') {
      if (!manualUrl.trim()) {
        setErrorMsg('Ingresa un enlace válido de Google Drive')
        return
      }
      onPhotoSaved(manualUrl.trim())
      onClose()
      return
    }

    if (!selectedFile) {
      setErrorMsg('Selecciona o toma una foto primero')
      return
    }

    setUploading(true)
    setErrorMsg('')
    try {
      const result = await uploadPhotoToDrive({
        file: selectedFile,
        anio,
        mes,
        categoria,
        customName,
      })

      if (result.url) {
        setSuccessMsg('¡Foto subida a Google Drive con éxito!')
        onPhotoSaved(result.url)
        setTimeout(() => onClose(), 800)
      } else {
        // Fallback: Si no hay Web App configurado, se guarda el dataUrl comprimido o se solicita link
        setSuccessMsg('Foto comprimida lista. Como no hay Google Apps Script configurado en .env, guardaremos la previsualización local.')
        onPhotoSaved(result.dataUrl)
        setTimeout(() => onClose(), 1000)
      }
    } catch (err) {
      console.error(err)
      setErrorMsg(
        'Error al conectar con Google Drive. Puedes usar la pestaña "Enlace Manual" para pegar el link directo: ' +
          (err.message || 'Error desconocido')
      )
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md max-h-[88dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="shrink-0 bg-slate-900 px-5 py-3.5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg shrink-0">
              <Camera className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base leading-tight truncate">{titulo}</h3>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">Carpeta Drive: Hacienda_Mercado / {categoria}</p>
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

        {/* Mode Selector */}
        <div className="shrink-0 flex border-b border-slate-200 text-xs font-semibold bg-slate-50">
          <button
            type="button"
            onClick={() => setMode('camera')}
            className={`flex-1 py-2.5 text-center transition-colors flex items-center justify-center gap-1.5 ${
              mode === 'camera'
                ? 'bg-white text-emerald-700 border-b-2 border-emerald-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Cámara / Archivo</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('manual')}
            className={`flex-1 py-2.5 text-center transition-colors flex items-center justify-center gap-1.5 ${
              mode === 'manual'
                ? 'bg-white text-emerald-700 border-b-2 border-emerald-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Link className="w-3.5 h-3.5" />
            <span>Pegar Enlace Directo</span>
          </button>
        </div>

        {/* Content */}
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

          {mode === 'camera' ? (
            <div className="space-y-4">
              {/* Image Preview Box */}
              <div className="relative border-2 border-dashed border-slate-300 rounded-2xl p-4 text-center bg-slate-50 hover:bg-slate-100 transition-colors">
                {previewUrl ? (
                  <div className="space-y-2">
                    <img
                      src={previewUrl}
                      alt="Vista previa"
                      className="max-h-56 mx-auto rounded-xl object-contain shadow-sm border border-slate-200"
                    />
                    {compressionInfo && (
                      <p className="text-[11px] text-emerald-700 font-medium">
                        Comprimido en cliente: de {compressionInfo.original} KB a{' '}
                        <strong>{compressionInfo.compressed} KB</strong> (~
                        {Math.round((1 - compressionInfo.compressed / compressionInfo.original) * 100)}% ahorro)
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="py-8 space-y-2">
                    <Camera className="w-10 h-10 mx-auto text-slate-400" />
                    <p className="text-xs font-semibold text-slate-700">Toca para tomar foto o elegir de la galería</p>
                    <p className="text-[10px] text-slate-500">Se comprimirá automáticamente a ~180 KB</p>
                  </div>
                )}

                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>

              {previewUrl && (
                <div className="text-center">
                  <label className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 cursor-pointer inline-flex items-center gap-1">
                    <Camera className="w-3.5 h-3.5" />
                    <span>Tomar otra foto o cambiar imagen</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Enlace de Google Drive (o URL pública de la foto)
                </label>
                <input
                  type="url"
                  value={manualUrl}
                  onChange={(e) => setManualUrl(e.target.value)}
                  placeholder="https://drive.google.com/file/d/..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Puedes subir la foto directamente a tu Google Drive personal y pegar el enlace de compartir aquí.
              </p>

              {manualUrl && (
                <div className="pt-2">
                  <a
                    href={manualUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Verificar enlace en pestaña nueva</span>
                  </a>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Action Buttons */}
        <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={uploading || (mode === 'camera' && !selectedFile && !previewUrl)}
            onClick={handleUpload}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-900/20 transition-all flex items-center gap-1.5"
          >
            {uploading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Subiendo a Drive...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Guardar Foto</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
