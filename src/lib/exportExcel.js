/**
 * Exportador de Rendición de Cuentas a Excel (.xlsx) con SheetJS
 * Secretaría de Hacienda - Mercado Palmira
 */
import * as XLSX from 'xlsx'
import { getNombreSocioCobro } from './formatters'

export function descargarRendicionExcel(consolidado, metadata = {}) {
  const {
    mesInicio,
    anioInicio,
    mesFin,
    anioFin,
    fechaEmision = new Date().toLocaleDateString('es-BO'),
  } = metadata

  const wb = XLSX.utils.book_new()
  const cp = consolidado.cumplimientoPuestos || {}
  const di = consolidado.desgloseInternoServicios || {}

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
    ['   - Ingresos Externos (Guardia y Agua)', consolidado.totalIngExternos || 0, 0, consolidado.totalIngExternos || 0],
    ['   - Recuperación Deudores de Ciclos', consolidado.totalIngDeudoresServicios || 0, consolidado.totalIngDeudoresAfiliaciones || 0, (consolidado.totalIngDeudoresServicios || 0) + (consolidado.totalIngDeudoresAfiliaciones || 0)],
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
    [],
    ['DESGLOSE INTERNO CAJA SERVICIOS (INGRESOS DEL PERIODO)'],
    ['Total Fondo Guardia (Socios + Externos)', Number((di.totalGuardia || 0).toFixed(2)), `Socios: ${(di.guardiaSocios || 0).toFixed(2)} Bs`, `Externos: ${(di.guardiaExternos || 0).toFixed(2)} Bs`],
    ['Total Fondo Agua (Socios + Externos)', Number((di.totalAgua || 0).toFixed(2)), `Socios: ${(di.aguaSocios || 0).toFixed(2)} Bs`, `Externos: ${(di.aguaExternos || 0).toFixed(2)} Bs`],
    ['Total Fondo Grupo Luz (Consumo + Alumbrado + Basura)', Number((di.totalLuzGrupo || 0).toFixed(2))],
    ['Multas por Mora Cobradas', Number((di.totalMultasSocios || 0).toFixed(2))],
    ['Recuperación Deudores Servicios', Number((di.totalDeudoresServicios || 0).toFixed(2))],
    [],
    ['RESUMEN DE CUMPLIMIENTO DE COBROS (PUESTOS)'],
    ['Total Puestos Activos', cp.totalPuestosActivos || 0, `Representan ${cp.totalSociosActivos || 0} socios`],
    ['Puestos Pagados Completos', cp.puestosPagados || 0],
    ['Puestos con Pago Parcial ("a cuenta")', cp.puestosParciales || 0],
    ['Puestos Pendientes / Falta Pagar', cp.puestosPendientes || 0],
    ['Porcentaje de Cumplimiento (%)', `${cp.porcentajeCumplimiento || 0}%`],
  ]
  const wsResumen = XLSX.utils.aoa_to_sheet(resumenData)
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen_Cajas')

  // 2. Hoja Ingresos_Servicios
  const ingresosServiciosHeaders = [
    ['Fecha Pago', 'Socio', 'Puesto', 'Periodo Cobrado', 'Monto (Bs)', 'Método', 'N° Talonario Físico']
  ]
  const ingresosServiciosRows = consolidado.pagosServiciosRango.map((p) => [
    p.fecha_pago ? new Date(p.fecha_pago).toLocaleDateString('es-BO') : '',
    getNombreSocioCobro(p.cobros_servicios),
    p.cobros_servicios?.unidades_cobro?.numero_identificador || '',
    p.cobros_servicios?.periodos_mensuales ? `${p.cobros_servicios.periodos_mensuales.mes}/${p.cobros_servicios.periodos_mensuales.anio}` : '',
    parseFloat(p.monto) || 0,
    p.metodo_pago === 'qr' ? 'QR / Banco' : 'Efectivo',
    p.nro_talonario_fisico || 'N/A',
  ])
  const wsIngServ = XLSX.utils.aoa_to_sheet([...ingresosServiciosHeaders, ...ingresosServiciosRows])
  XLSX.utils.book_append_sheet(wb, wsIngServ, 'Ingresos_Servicios')

  // 3. Hoja Ingresos_Externos
  if ((consolidado.cobrosExternosRango || []).length > 0) {
    const extHeaders = [['Fecha Pago', 'Aportante Externo', 'Ubicación', 'Periodo', 'Monto Pagado (Bs)', 'Método', 'N° Talonario']]
    const extRows = consolidado.cobrosExternosRango.map((c) => [
      c.fecha_pago || '',
      c.aportantes_externos?.nombre_completo || 'Externo',
      c.aportantes_externos?.referencia_ubicacion || '',
      `${c.mes}/${c.anio}`,
      parseFloat(c.monto_pagado) || 0,
      c.metodo_pago === 'qr' ? 'QR / Banco' : 'Efectivo',
      c.nro_talonario_fisico || 'N/A',
    ])
    const wsExt = XLSX.utils.aoa_to_sheet([...extHeaders, ...extRows])
    XLSX.utils.book_append_sheet(wb, wsExt, 'Ingresos_Externos')
  }

  // 4. Hoja Ingresos_Afiliaciones
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

  // 5. Hoja Egresos_Detallados
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

  // 6. Hoja Deudores_Mora
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

  const fileName = `Rendicion_Cuentas_Palmira_${mesInicio}-${anioInicio}_a_${mesFin}-${anioFin}.xlsx`
  XLSX.writeFile(wb, fileName)
}
