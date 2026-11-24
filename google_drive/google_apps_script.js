/**
 * CÓDIGO PARA GOOGLE APPS SCRIPT - RESPALDOS FOTOGRÁFICOS HACIENDA MERCADO PALMIRA
 * 
 * Instrucciones de despliegue (100% gratis):
 * 1. Abre https://script.google.com/ con la cuenta Gmail del mercado (ej. hacienda.mercadopalmira@gmail.com).
 * 2. Crea un "Nuevo proyecto" y nómbralo "Respaldo_Fotos_Hacienda".
 * 3. Borra el código existente y pega todo este archivo.
 * 4. Haz clic en "Implementar" -> "Nueva implementación".
 * 5. Selecciona tipo: "Aplicación web".
 * 6. Configura:
 *    - Ejecutar como: "Yo" (tu cuenta de correo).
 *    - Quién tiene acceso: "Cualquier persona" (Anyone).
 * 7. Haz clic en "Implementar", autoriza los permisos y copia la "URL de la aplicación web".
 * 8. Pega esa URL en tu archivo .env local como:
 *    VITE_DRIVE_SCRIPT_URL=https://script.google.com/macros/s/AKfycb.../exec
 */

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var base64Data = data.base64;
    var fileName = data.fileName || ("foto_" + new Date().getTime() + ".jpg");
    var mimeType = data.mimeType || "image/jpeg";
    var anio = data.anio || String(new Date().getFullYear());
    var mes = data.mes || String(new Date().getMonth() + 1);
    var categoria = data.categoria || "Otros";

    // 1. Obtener o crear carpeta raíz: "Hacienda_Mercado"
    var rootFolder = getOrCreateFolder(DriveApp.getRootFolder(), "Hacienda_Mercado");

    // 2. Obtener o crear carpeta de Año: "2026"
    var yearFolder = getOrCreateFolder(rootFolder, String(anio));

    // 3. Obtener o crear carpeta de Mes: "2026-11"
    var mesStr = (mes < 10 && String(mes).indexOf("0") !== 0) ? ("0" + mes) : String(mes);
    var monthFolderName = anio + "-" + mesStr;
    var monthFolder = getOrCreateFolder(yearFolder, monthFolderName);

    // 4. Obtener o crear carpeta de Categoría (Tarifadores, Facturas_Generales, etc.)
    var targetFolder = getOrCreateFolder(monthFolder, categoria);

    // 5. Decodificar imagen y guardarla
    var decoded = Utilities.base64Decode(base64Data);
    var blob = Utilities.newBlob(decoded, mimeType, fileName);
    var file = targetFolder.createFile(blob);

    // 6. Hacer que cualquier persona con el enlace pueda ver la imagen
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    var fileUrl = file.getUrl();

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      ok: true,
      success: true,
      url: fileUrl,
      id: file.getId(),
      fileName: fileName
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function getOrCreateFolder(parent, name) {
  var folders = parent.getFoldersByName(name);
  if (folders.hasNext()) {
    return folders.next();
  }
  return parent.createFolder(name);
}
