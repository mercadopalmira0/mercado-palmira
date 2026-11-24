/**
 * Exportador de Rendición de Cuentas a Excel (.xlsx) con SheetJS
 * Secretaría de Hacienda - Mercado Palmira
 */
import * as XLSX from 'xlsx'

export function descargarRendicionExcel(consolidado, metadata = {}) {
  const {
    mesInicio,
    anioInicio,
    mesFin,
    anioFin,
    fechaEmision = new Date().toLocaleDateString('es-BO'),
  } = metadata

  const wb = XLSX.utils.book_new()

  // 1. Hoja Resumen_Cajas
  const resumenData = [
    ['SECRETARÍA DE HACIENDA - MERCADO PALMIRA'],
    ['INFORME DE RENDICIÓN DE CUENTAS'],
    [`Periodo: ${mesInicio}/${anioInicio} hasta ${mesFin}/${anioFin}`],
    [`Fecha de Emisión: ${fechaEmision}`],
    [],
    ['CONCEPTO', 'CAJA SERVICIOS (Bs)', 'CAJA AFILIACIONES (Bs)', 'TOTAL GENERAL (Bs)'],
    ['1. Saldo Anterior al Periodo', consolidado.totalAntServicios, consolidado.totalAntAfiliaciones, consolidado.totalAntGeneral],
    ['   - Efectivo Físico', consolidado.antServiciosEf, consolidado.antAfiliacionesEf, consolidado.antServiciosEf + consolidado.antAfiliacionesEf],
    ['   - Saldo QR / Banco', consolidado.antServiciosQr, consolidado.antAfiliacionesQr, consolidado.antServiciosQr + consolidado.antAfiliacionesQr],
    [],
    ['2. Total Ingresos del Periodo', consolidado.totalIngServicios, consolidado.totalIngAfiliaciones, consolidado.totalIngresosGeneral],
    ['   - Ingresos Efectivo', consolidado.ingServiciosEf, consolidado.ingAfiliacionesEf, consolidado.ingServiciosEf + consolidado.ingAfiliacionesEf],
    ['   - Ingresos QR / Banco', consolidado.ingServiciosQr, consolidado.ingAfiliacionesQr, consolidado.ingServiciosQr + consolidado.ingAfiliacionesQr],
    [],
    ['3. Total Egresos del Periodo', consolidado.totalEgServicios, consolidado.totalEgAfiliaciones, consolidado.totalEgresosGeneral],
    ['   - Egresos Efectivo', consolidado.egServiciosEf, consolidado.egAfiliacionesEf, consolidado.egServiciosEf + consolidado.egAfiliacionesEf],
    ['   - Egresos QR / Banco', consolidado.egServiciosQr, consolidado.egAfiliacionesQr, consolidado.egServiciosQr + consolidado.egAfiliacionesQr],
    [],
    ['4. Movimientos Internos (Neto)', (consolidado.movServiciosEf + consolidado.movServiciosQr), (consolidado.movAfiliacionesEf + consolidado.movAfiliacionesQr), 0],
    [],
    ['5. SALDO FINAL AL CIERRE', consolidado.totalFinServicios, consolidado.totalFinAfiliaciones, consolidado.granTotalFinal],
    ['   - Efectivo Físico en Mano', consolidado.finServiciosEf, consolidado.finAfiliacionesEf, consolidado.totalEfectivoFinal],
    ['   - Saldo en QR / Banco', consolidado.finServiciosQr, consolidado.finAfiliacionesQr, consolidado.totalQrFinal],
  ]
  const wsResumen = XLSX.utils.aoa_to_sheet(resumenData)
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen_Cajas')

  // 2. Hoja Ingresos_Servicios
  const ingresosServiciosHeaders = [
    ['Fecha Pago', 'Socio', 'Puesto', 'Periodo Cobrado', 'Monto (Bs)', 'Método', 'N° Talonario Físico']
  ]
  const ingresosServiciosRows = consolidado.pagosServiciosRango.map((p) => [
    p.fecha_pago ? new Date(p.fecha_pago).toLocaleDateString('es-BO') : '',
    p.cobros_servicios?.unidades_cobro?.socios?.nombre || 'Socio',
    p.cobros_servicios?.unidades_cobro?.numero_identificador || '',
    p.cobros_servicios?.periodos_mensuales ? `${p.cobros_servicios.periodos_mensuales.mes}/${p.cobros_servicios.periodos_mensuales.anio}` : '',
    parseFloat(p.monto) || 0,
    p.metodo_pago === 'qr' ? 'QR / Banco' : 'Efectivo',
    p.nro_talonario_fisico || 'N/A',
  ])
  const wsIngServ = XLSX.utils.aoa_to_sheet([...ingresosServiciosHeaders, ...ingresosServiciosRows])
  XLSX.utils.book_append_sheet(wb, wsIngServ, 'Ingresos_Servicios')

  // 3. Hoja Ingresos_Afiliaciones
  const ingresosAfiliacionesHeaders = [
    ['Fecha Pago', 'Socio Afiliado', 'Monto Abonado (Bs)', 'Método', 'N° Talonario Físico']
  ]
  const ingresosAfiliacionesRows = consolidado.pagosAfiliacionRango.map((p) => [
    p.fecha_pago ? new Date(p.fecha_pago).toLocaleDateString('es-BO') : '',
    p.afiliaciones?.socios?.nombre || 'Socio',
    parseFloat(p.monto) || 0,
    p.metodo_pago === 'qr' ? 'QR / Banco' : 'Efectivo',
    p.nro_talonario_fisico || 'N/A',
  ])
  const wsIngAf = XLSX.utils.aoa_to_sheet([...ingresosAfiliacionesHeaders, ...ingresosAfiliacionesRows])
  XLSX.utils.book_append_sheet(wb, wsIngAf, 'Ingresos_Afiliaciones')

  // 4. Hoja Egresos_Detallados
  const egresosHeaders = [
    ['Fecha', 'Caja', 'Categoría', 'Descripción', 'Monto (Bs)', 'Método Pago', 'Enlace Recibo Google Drive']
  ]
  const egresosRows = consolidado.egresosRango.map((e) => [
    e.fecha || '',
    e.caja === 'servicios' ? 'Servicios Básicos' : 'Afiliaciones',
    e.categoria || '',
    e.descripcion || '',
    parseFloat(e.monto) || 0,
    e.metodo_pago === 'qr' ? 'QR / Banco' : 'Efectivo',
    e.recibo_drive_url || 'Sin foto adjunta',
  ])
  const wsEgresos = XLSX.utils.aoa_to_sheet([...egresosHeaders, ...egresosRows])
  XLSX.utils.book_append_sheet(wb, wsEgresos, 'Egresos_Detallados')

  // 5. Hoja Deudores_Mora
  const deudoresHeaders = [
    ['Tipo Deuda', 'Socio', 'Teléfono', 'Puesto / Detalle', 'Periodo / Plan', 'Total a Pagar (Bs)', 'Abonado (Bs)', 'Saldo Deuda (Bs)', 'Multa (Bs)']
  ]
  const deudoresServiciosRows = consolidado.deudoresServicios.map((d) => [
    'Servicios Básicos',
    d.socio,
    d.telefono,
    d.puesto,
    d.periodo,
    d.totalAPagar,
    d.totalPagado,
    d.saldoPendiente,
    d.multa,
  ])
  const deudoresAfiliacionesRows = consolidado.deudoresAfiliaciones.map((d) => [
    'Cuota Afiliación',
    d.socio,
    d.telefono,
    `Cuota ${d.cuotaAcordada} Bs/mes`,
    `Plan ${d.totalPlan} Bs`,
    d.totalPlan,
    d.totalPagado,
    d.saldoPendiente,
    0,
  ])
  const wsDeudores = XLSX.utils.aoa_to_sheet([
    ...deudoresHeaders,
    ...deudoresServiciosRows,
    ...deudoresAfiliacionesRows,
  ])
  XLSX.utils.book_append_sheet(wb, wsDeudores, 'Deudores_Mora')

  // Guardar archivo
  const fileName = `Rendicion_Cuentas_Palmira_${mesInicio}-${anioInicio}_a_${mesFin}-${anioFin}.xlsx`
  XLSX.writeFile(wb, fileName)
}
