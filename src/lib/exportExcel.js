/**
 * Exportador de Rendición de Cuentas a Excel (.xlsx) con SheetJS
 * Secretaría de Hacienda - Mercado Palmira
 */
import * as XLSX from 'xlsx'
import { getNombreSocioCobro } from './formatters'
import { round2 } from './calculosRendicion'

function formatFechaDMY(fechaStr) {
  if (!fechaStr) return ''
  const [y, m, d] = String(fechaStr).split('T')[0].split('-')
  if (y && m && d) return `${d}/${m}/${y}`
  return fechaStr
}

/**
 * Aplica formato numérico `#,##0.00` y redondeo limpio a las columnas monetarias indicadas.
 */
function formatMoneyColumns(ws, colIndices, startRow = 1, endRow = null) {
  if (!ws || !ws['!ref']) return
  const range = XLSX.utils.decode_range(ws['!ref'])
  const lastRow = endRow != null ? Math.min(endRow, range.e.r) : range.e.r

  for (let r = startRow; r <= lastRow; r += 1) {
    colIndices.forEach((c) => {
      const addr = XLSX.utils.encode_cell({ r, c })
      const cell = ws[addr]
      if (cell && typeof cell.v === 'number' && Number.isFinite(cell.v)) {
        cell.v = round2(cell.v)
        cell.t = 'n'
        cell.z = '#,##0.00'
      }
    })
  }
}

export function descargarRendicionExcel(consolidado, metadata = {}) {
  const {
    mesInicio,
    anioInicio,
    mesFin,
    anioFin,
    fechaCorte = '',
    fechaEmision = new Date().toLocaleDateString('es-BO'),
  } = metadata

  const wb = XLSX.utils.book_new()
  const cp = consolidado.cumplimientoPuestos || {}
  const di = consolidado.desgloseInternoServicios || {}
  const rm = consolidado.resumenMora || {}
  const fechaCorteLabel = fechaCorte
    ? formatFechaDMY(fechaCorte)
    : consolidado.fechaFin
      ? new Date(consolidado.fechaFin).toLocaleDateString('es-BO')
      : ''

  // 1. Hoja Resumen_Cajas
  const resumenData = [
    ['SECRETARÍA DE HACIENDA - MERCADO PALMIRA'],
    ['INFORME DE RENDICIÓN DE CUENTAS'],
    [`Periodo Rendido: ${mesInicio}/${anioInicio} hasta ${mesFin}/${anioFin}`],
    [`Fecha de Corte de Caja: ${fechaCorteLabel}`],
    [`Fecha de Emisión: ${fechaEmision}`],
    [],
    ['CONCEPTO', 'CAJA SERVICIOS (Bs)', 'CAJA AFILIACIONES (Bs)', 'TOTAL GENERAL (Bs)'],
    ['1. Saldo Anterior al Periodo', round2(consolidado.totalAntServicios), round2(consolidado.totalAntAfiliaciones), round2(consolidado.totalAntGeneral)],
    ['   - Efectivo Físico', round2(consolidado.antServiciosEf), round2(consolidado.antAfiliacionesEf), round2(consolidado.antServiciosEf + consolidado.antAfiliacionesEf)],
    ['   - Saldo QR / Banco', round2(consolidado.antServiciosQr), round2(consolidado.antAfiliacionesQr), round2(consolidado.antServiciosQr + consolidado.antAfiliacionesQr)],
    [],
    ['2. Total Ingresos del Periodo', round2(consolidado.totalIngServicios), round2(consolidado.totalIngAfiliaciones), round2(consolidado.totalIngresosGeneral)],
    ['   - Ingresos Efectivo', round2(consolidado.ingServiciosEf), round2(consolidado.ingAfiliacionesEf), round2(consolidado.ingServiciosEf + consolidado.ingAfiliacionesEf)],
    ['   - Ingresos QR / Banco', round2(consolidado.ingServiciosQr), round2(consolidado.ingAfiliacionesQr), round2(consolidado.ingServiciosQr + consolidado.ingAfiliacionesQr)],
    ['   - Ingresos Externos (Guardia y Agua)', round2(consolidado.totalIngExternos), 0, round2(consolidado.totalIngExternos)],
    ['   - Recuperación Deudores de Ciclos', round2(consolidado.totalIngDeudoresServicios), round2(consolidado.totalIngDeudoresAfiliaciones), round2((consolidado.totalIngDeudoresServicios || 0) + (consolidado.totalIngDeudoresAfiliaciones || 0))],
    [],
    ['3. Total Egresos del Periodo', round2(consolidado.totalEgServicios), round2(consolidado.totalEgAfiliaciones), round2(consolidado.totalEgresosGeneral)],
    ['   - Egresos Efectivo', round2(consolidado.egServiciosEf), round2(consolidado.egAfiliacionesEf), round2(consolidado.egServiciosEf + consolidado.egAfiliacionesEf)],
    ['   - Egresos QR / Banco', round2(consolidado.egServiciosQr), round2(consolidado.egAfiliacionesQr), round2(consolidado.egServiciosQr + consolidado.egAfiliacionesQr)],
    [],
    ['4. Movimientos Internos (Neto)', round2(consolidado.movServiciosEf + consolidado.movServiciosQr), round2(consolidado.movAfiliacionesEf + consolidado.movAfiliacionesQr), 0],
    [],
    ['5. SALDO FINAL AL CIERRE', round2(consolidado.totalFinServicios), round2(consolidado.totalFinAfiliaciones), round2(consolidado.granTotalFinal)],
    ['   - Efectivo Físico en Mano', round2(consolidado.finServiciosEf), round2(consolidado.finAfiliacionesEf), round2(consolidado.totalEfectivoFinal)],
    ['   - Saldo en QR / Banco', round2(consolidado.finServiciosQr), round2(consolidado.finAfiliacionesQr), round2(consolidado.totalQrFinal)],
    [],
    ['DESGLOSE INTERNO CAJA SERVICIOS (INGRESOS DEL PERIODO)'],
    ['Total Fondo Guardia (Socios + Externos)', round2(di.totalGuardia), `Socios: ${round2(di.guardiaSocios).toFixed(2)} Bs`, `Externos: ${round2(di.guardiaExternos).toFixed(2)} Bs`],
    ['Total Fondo Agua (Socios + Externos)', round2(di.totalAgua), `Socios: ${round2(di.aguaSocios).toFixed(2)} Bs`, `Externos: ${round2(di.aguaExternos).toFixed(2)} Bs`],
    ['Total Fondo Grupo Luz (Consumo + Alumbrado + Basura)', round2(di.totalLuzGrupo)],
    ['Multas por Mora Cobradas', round2(di.totalMultasSocios)],
    ['Recuperación Deudores Servicios', round2(di.totalDeudoresServicios)],
    [],
    ['RESUMEN DE CUMPLIMIENTO DE COBROS (PUESTOS)'],
    ['Total Puestos Activos', cp.totalPuestosActivos || 0, `Representan ${cp.totalSociosActivos || 0} socios`],
    ['Puestos Pagados Completos', cp.puestosPagados || 0],
    ['Puestos con Pago Parcial ("a cuenta")', cp.puestosParciales || 0],
    ['Puestos Pendientes / Falta Pagar', cp.puestosPendientes || 0],
    ['Porcentaje de Cumplimiento (%)', `${cp.porcentajeCumplimiento || 0}%`],
  ]
  const wsResumen = XLSX.utils.aoa_to_sheet(resumenData)
  // Formatear con #,##0.00 las filas monetarias (índices 7..25 en cols 1..3 y filas 28..32 en col 1)
  formatMoneyColumns(wsResumen, [1, 2, 3], 7, 25)
  formatMoneyColumns(wsResumen, [1], 28, 32)
  wsResumen['!cols'] = [{ wch: 48 }, { wch: 22 }, { wch: 26 }, { wch: 24 }]
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen_Cajas')

  // 2. Hoja Ingresos_Servicios
  const ingresosServiciosHeaders = [
    ['Fecha Pago', 'Socio', 'Puesto', 'Periodo Cobrado', 'Monto (Bs)', 'Método', 'N° Talonario Físico'],
  ]
  const ingresosServiciosRows = (consolidado.pagosServiciosRango || []).map((p) => [
    p.fecha_pago ? new Date(p.fecha_pago).toLocaleDateString('es-BO') : '',
    getNombreSocioCobro(p.cobros_servicios),
    p.cobros_servicios?.unidades_cobro?.numero_identificador || '',
    p.cobros_servicios?.periodos_mensuales
      ? `${p.cobros_servicios.periodos_mensuales.mes}/${p.cobros_servicios.periodos_mensuales.anio}`
      : '',
    round2(parseFloat(p.monto) || 0),
    p.metodo_pago === 'qr' ? 'QR / Banco' : 'Efectivo',
    p.nro_talonario_fisico || 'N/A',
  ])
  const totalIngServMonto = round2(ingresosServiciosRows.reduce((s, r) => s + r[4], 0))
  const wsIngServ = XLSX.utils.aoa_to_sheet([
    ...ingresosServiciosHeaders,
    ...ingresosServiciosRows,
    ['TOTAL', `${ingresosServiciosRows.length} pagos`, '', '', totalIngServMonto, '', ''],
  ])
  formatMoneyColumns(wsIngServ, [4], 1)
  wsIngServ['!cols'] = [{ wch: 14 }, { wch: 28 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 20 }]
  XLSX.utils.book_append_sheet(wb, wsIngServ, 'Ingresos_Servicios')

  // 3. Hoja Ingresos_Externos
  if ((consolidado.cobrosExternosRango || []).length > 0) {
    const extHeaders = [
      ['Fecha Pago', 'Aportante Externo', 'Ubicación', 'Periodo', 'Monto Pagado (Bs)', 'Método', 'N° Talonario'],
    ]
    const extRows = consolidado.cobrosExternosRango.map((c) => [
      c.fecha_pago || '',
      c.aportantes_externos?.nombre_completo || 'Externo',
      c.aportantes_externos?.referencia_ubicacion || '',
      `${c.mes}/${c.anio}`,
      round2(parseFloat(c.monto_pagado) || 0),
      c.metodo_pago === 'qr' ? 'QR / Banco' : 'Efectivo',
      c.nro_talonario_fisico || 'N/A',
    ])
    const totalExtMonto = round2(extRows.reduce((s, r) => s + r[4], 0))
    const wsExt = XLSX.utils.aoa_to_sheet([
      ...extHeaders,
      ...extRows,
      ['TOTAL', `${extRows.length} cobros`, '', '', totalExtMonto, '', ''],
    ])
    formatMoneyColumns(wsExt, [4], 1)
    wsExt['!cols'] = [{ wch: 14 }, { wch: 26 }, { wch: 24 }, { wch: 12 }, { wch: 18 }, { wch: 14 }, { wch: 16 }]
    XLSX.utils.book_append_sheet(wb, wsExt, 'Ingresos_Externos')
  }

  // 4. Hoja Ingresos_Afiliaciones
  const ingresosAfiliacionesHeaders = [
    ['Fecha Pago', 'Socio Afiliado', 'Monto Abonado (Bs)', 'Método', 'N° Talonario Físico'],
  ]
  const ingresosAfiliacionesRows = (consolidado.pagosAfiliacionRango || []).map((p) => [
    p.fecha_pago ? new Date(p.fecha_pago).toLocaleDateString('es-BO') : '',
    p.afiliaciones?.socios?.nombre || 'Socio',
    round2(parseFloat(p.monto) || 0),
    p.metodo_pago === 'qr' ? 'QR / Banco' : 'Efectivo',
    p.nro_talonario_fisico || 'N/A',
  ])
  const totalIngAfMonto = round2(ingresosAfiliacionesRows.reduce((s, r) => s + r[2], 0))
  const wsIngAf = XLSX.utils.aoa_to_sheet([
    ...ingresosAfiliacionesHeaders,
    ...ingresosAfiliacionesRows,
    ['TOTAL', `${ingresosAfiliacionesRows.length} pagos`, totalIngAfMonto, '', ''],
  ])
  formatMoneyColumns(wsIngAf, [2], 1)
  wsIngAf['!cols'] = [{ wch: 14 }, { wch: 28 }, { wch: 20 }, { wch: 14 }, { wch: 20 }]
  XLSX.utils.book_append_sheet(wb, wsIngAf, 'Ingresos_Afiliaciones')

  // 5. Hoja Egresos_Detallados
  const egresosHeaders = [
    ['Fecha', 'Caja', 'Categoría', 'Descripción', 'Monto (Bs)', 'Método Pago', 'Enlace Recibo Google Drive'],
  ]
  const egresosRows = (consolidado.egresosRango || []).map((e) => [
    e.fecha || '',
    e.caja === 'servicios' ? 'Servicios Básicos' : 'Afiliaciones',
    e.categoria || '',
    e.descripcion || '',
    round2(parseFloat(e.monto) || 0),
    e.metodo_pago === 'qr' ? 'QR / Banco' : 'Efectivo',
    e.recibo_drive_url || 'Sin foto adjunta',
  ])
  const totalEgMonto = round2(egresosRows.reduce((s, r) => s + r[4], 0))
  const wsEgresos = XLSX.utils.aoa_to_sheet([
    ...egresosHeaders,
    ...egresosRows,
    ['TOTAL', `${egresosRows.length} egresos`, '', '', totalEgMonto, '', ''],
  ])
  formatMoneyColumns(wsEgresos, [4], 1)
  wsEgresos['!cols'] = [{ wch: 13 }, { wch: 18 }, { wch: 22 }, { wch: 52 }, { wch: 15 }, { wch: 14 }, { wch: 28 }]
  XLSX.utils.book_append_sheet(wb, wsEgresos, 'Egresos_Detallados')

  // 6. Hoja Deudores_Mora (Periodo + Afiliaciones + Deudas Anteriores Heredadas)
  const deudoresHeaders = [
    [
      'Tipo Deuda',
      'Socio',
      'Teléfono',
      'Puesto / Detalle',
      'Periodo / Ciclo Origen',
      'Total a Pagar (Bs)',
      'Abonado (Bs)',
      'Saldo Deuda (Bs)',
      'Multa (Bs)',
    ],
  ]
  const deudoresServiciosRows = (consolidado.deudoresServicios || []).map((d) => [
    'Servicios Básicos',
    d.socio,
    d.telefono || '',
    d.puesto,
    d.periodo,
    round2(d.totalAPagar),
    round2(d.totalPagado),
    round2(d.saldoPendiente),
    round2(d.multa),
  ])
  const deudoresAfiliacionesRows = (consolidado.deudoresAfiliaciones || []).map((d) => [
    'Cuota Afiliación',
    d.socio,
    d.telefono || '',
    `Cuota ${round2(d.cuotaAcordada)} Bs/mes`,
    `Plan ${round2(d.totalPlan)} Bs`,
    round2(d.totalPlan),
    round2(d.totalPagado),
    round2(d.saldoPendiente),
    0,
  ])
  const deudoresAnterioresRows = (consolidado.deudoresAnteriores || []).map((d) => [
    d.tipoDeuda,
    d.socio,
    d.telefono || '',
    d.puestoDetalle || d.detalleDeuda,
    d.cicloOrigen,
    round2(d.montoOriginal),
    round2(d.montoPagado),
    round2(d.saldoPendiente),
    0,
  ])

  const periodRowsAll = [...deudoresServiciosRows, ...deudoresAfiliacionesRows]
  const sumCol = (rows, idx) => round2(rows.reduce((s, r) => s + (Number(r[idx]) || 0), 0))

  const subPeriodoTotal = sumCol(periodRowsAll, 5)
  const subPeriodoPagado = sumCol(periodRowsAll, 6)
  const subPeriodoSaldo = rm.subtotalMoraPeriodo != null ? round2(rm.subtotalMoraPeriodo) : sumCol(periodRowsAll, 7)
  const subPeriodoMulta = sumCol(periodRowsAll, 8)

  const subAntTotal = sumCol(deudoresAnterioresRows, 5)
  const subAntPagado = sumCol(deudoresAnterioresRows, 6)
  const subAntSaldo =
    rm.subtotalDeudasAnteriores != null
      ? round2(rm.subtotalDeudasAnteriores)
      : sumCol(deudoresAnterioresRows, 7)

  const totalGeneralTotal = round2(subPeriodoTotal + subAntTotal)
  const totalGeneralPagado = round2(subPeriodoPagado + subAntPagado)
  const totalGeneralSaldo =
    rm.totalGeneralMora != null ? round2(rm.totalGeneralMora) : round2(subPeriodoSaldo + subAntSaldo)

  const allMoraRows = [...periodRowsAll, ...deudoresAnterioresRows]
  const wsDeudores = XLSX.utils.aoa_to_sheet([
    ...deudoresHeaders,
    ...allMoraRows,
    ['SUBTOTAL MORA DEL PERIODO', `${periodRowsAll.length} registros`, '', '', '', subPeriodoTotal, subPeriodoPagado, subPeriodoSaldo, subPeriodoMulta],
    ['SUBTOTAL DEUDAS ANTERIORES', `${deudoresAnterioresRows.length} registros`, '', '', '', subAntTotal, subAntPagado, subAntSaldo, 0],
    ['TOTAL GENERAL DE MORA', `${allMoraRows.length} registros`, '', '', '', totalGeneralTotal, totalGeneralPagado, totalGeneralSaldo, subPeriodoMulta],
  ])
  formatMoneyColumns(wsDeudores, [5, 6, 7, 8], 1)
  wsDeudores['!cols'] = [{ wch: 26 }, { wch: 24 }, { wch: 14 }, { wch: 40 }, { wch: 24 }, { wch: 17 }, { wch: 15 }, { wch: 17 }, { wch: 13 }]
  XLSX.utils.book_append_sheet(wb, wsDeudores, 'Deudores_Mora')

  const fileName = `Rendicion_Cuentas_Palmira_${mesInicio}-${anioInicio}_a_${mesFin}-${anioFin}.xlsx`
  XLSX.writeFile(wb, fileName)
}
