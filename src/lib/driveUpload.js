/**
 * Servicio de Compresión y Subida de Fotos a Google Drive
 * Hacienda Mercado Palmira
 * 
 * - Comprime imágenes en el navegador usando HTML5 Canvas a JPEG calidad ~0.7, máx 1200px (~150-250 KB)
 * - Envía la imagen base64 vía POST al Web App de Google Apps Script
 * - Fallback inteligente: si no hay script configurado o falla la red, permite ingresar URLs manualmente.
 */

/**
 * Comprime un archivo de imagen en el cliente sin requerir librerías pesadas.
 * @param {File|Blob} file 
 * @param {Object} options 
 * @returns {Promise<{ base64: string, dataUrl: string, blob: Blob, originalSizeKb: number, compressedSizeKb: number }>}
 */
export async function compressImage(file, options = {}) {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.7,
  } = options

  return new Promise((resolve, reject) => {
    const originalSizeKb = Math.round(file.size / 1024)
    const reader = new FileReader()

    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        let { width, height } = img

        // Mantener proporción de aspecto
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width)
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height)
            height = maxHeight
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, width, height)
        ctx.drawImage(img, 0, 0, width, height)

        const dataUrl = canvas.toDataURL('image/jpeg', quality)
        const base64 = dataUrl.split(',')[1]

        // Calcular tamaño comprimido aproximado
        const compressedSizeKb = Math.round((base64.length * 3) / 4 / 1024)

        canvas.toBlob(
          (blob) => {
            resolve({
              base64,
              dataUrl,
              blob: blob || file,
              originalSizeKb,
              compressedSizeKb,
              width,
              height,
            })
          },
          'image/jpeg',
          quality
        )
      }

      img.onerror = (err) => reject(new Error('No se pudo cargar la imagen para compresión: ' + err))
      img.src = e.target.result
    }

    reader.onerror = (err) => reject(new Error('Error al leer el archivo: ' + err))
    reader.readAsDataURL(file)
  })
}

/**
 * Sube una imagen al Web App de Google Apps Script.
 * @param {Object} params
 * @param {File} params.file
 * @param {number|string} params.anio
 * @param {number|string} params.mes
 * @param {string} params.categoria - 'Tarifadores' | 'Facturas_Generales' | 'Egresos_Servicios' | 'Egresos_Afiliaciones' | 'Comprobantes'
 * @param {string} [params.customName]
 * @returns {Promise<{ url: string, compressedSizeKb: number, originalSizeKb: number }>}
 */
export async function uploadPhotoToDrive({ file, anio, mes, categoria = 'Tarifadores', customName }) {
  const scriptUrl = import.meta.env.VITE_DRIVE_SCRIPT_URL

  // 1. Comprimir en cliente
  const compression = await compressImage(file)

  const mesStr = String(mes).padStart(2, '0')
  const timestamp = Date.now()
  const cleanCategory = categoria.replace(/[^a-zA-Z0-9_-]/g, '_')
  const fileName = customName || `${cleanCategory}_${anio}-${mesStr}_${timestamp}.jpg`

  // 2. Si no hay Script URL configurado, retornamos la data comprimida y avisamos
  if (!scriptUrl || scriptUrl.includes('TU_SCRIPT_ID')) {
    console.warn('[DriveUpload] VITE_DRIVE_SCRIPT_URL no está configurado en .env.')
    return {
      url: null,
      isLocal: true,
      dataUrl: compression.dataUrl,
      compressedSizeKb: compression.compressedSizeKb,
      originalSizeKb: compression.originalSizeKb,
      fileName,
    }
  }

  // 3. Enviar a Google Apps Script
  try {
    const payload = {
      base64: compression.base64,
      mimeType: 'image/jpeg',
      fileName,
      anio: String(anio),
      mes: mesStr,
      categoria,
    }

    const response = await fetch(scriptUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    })

    const rawText = await response.text()
    let result

    try {
      result = JSON.parse(rawText)
    } catch (parseError) {
      console.error(
        '[DriveUpload] La respuesta no es JSON válido. Primeros 300 caracteres:\n',
        rawText.slice(0, 300)
      )
      throw new Error(`Respuesta no válida de Google Apps Script: ${rawText.slice(0, 150)}`)
    }

    const isOk =
      result.status === 'success' ||
      result.success === true ||
      result.ok === true ||
      Boolean(result.url)

    if (isOk && result.url) {
      return {
        url: result.url,
        compressedSizeKb: compression.compressedSizeKb,
        originalSizeKb: compression.originalSizeKb,
        fileName,
      }
    } else {
      console.error(
        '[DriveUpload] Respuesta con error o sin URL. Primeros 300 caracteres:\n',
        rawText.slice(0, 300)
      )
      throw new Error(result.message || result.error || 'Respuesta inválida de Google Apps Script (sin URL)')
    }
  } catch (error) {
    console.error('[DriveUpload] Error al enviar a Drive:', error)
    throw error
  }
}
