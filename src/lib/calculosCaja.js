/**
 * Utilidad de cálculo de arqueo en tiempo real para las dos cajas
 * Secretaría de Hacienda - Mercado Palmira
 *
 * Regla de negocio:
 * Saldo Actual = Saldo Inicial (del ciclo activo en ciclos_hacienda o saldos_iniciales)
 *              + Ingresos del ciclo (pagos_servicios, pagos_afiliacion, pagos_deudores_ciclos, cobros_externos)
 *              - Egresos Activos del ciclo
 *              ± Movimientos Internos del ciclo
 *
 * Nota Cobros Extras / Campañas:
 * Los pagos (pagos_cobros_extras) y gastos (egresos_cobros_extras) de campañas independientes
 * NO alteran Caja Servicios ni Caja Afiliaciones. Únicamente si el admin cierra una campaña y
 * transfiere el sobrante explícitamente, entra vía movimientos_internos (caja_origen = 'externo').
 */

function parseLocalDateStart(dateStr) {
  if (!dateStr) return null
  const [y, m, d] = String(dateStr).split('T')[0].split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d, 0, 0, 0, 0)
}

function belongsToActiveCycle(recordDate, recordCreatedAt, cicloActivo, hasClosedCycles) {
  if (!cicloActivo || !hasClosedCycles || cicloActivo.es_inicial) return true

  const cycleStartDate = parseLocalDateStart(cicloActivo.fecha_inicio)
  const cycleCreatedAt = cicloActivo.created_at ? new Date(cicloActivo.created_at) : null

  if (recordCreatedAt && cycleCreatedAt && recordDate) {
    const recDateStr = String(recordDate).split('T')[0]
    const cycDateStr = String(cicloActivo.fecha_inicio).split('T')[0]
    // Si la fecha del registro es estrictamente anterior al inicio del ciclo, pertenece a un ciclo cerrado
    if (recDateStr < cycDateStr) return false
    // Si es del mismo día en que se cerró el ciclo anterior y abrió el nuevo, desempatar por created_at
    if (recDateStr === cycDateStr) {
      return new Date(recordCreatedAt) >= cycleCreatedAt
    }
    return true
  }

  if (recordDate && cycleStartDate) {
    return new Date(recordDate) >= cycleStartDate
  }

  return true
}

export function calcularArqueoReal({
  cicloActivo = null,
  hasClosedCycles = false,
  saldosIniciales = [],
  pagosServicios = [],
  pagosAfiliacion = [],
  pagosDeudoresCiclos = [],
  cobrosExternos = [],
  egresos = [],
  movimientosInternos = [],
}) {
  let inicialServiciosEf = 0
  let inicialServiciosQr = 0
  let inicialAfiliacionesEf = 0
  let inicialAfiliacionesQr = 0

  // 1. Saldos iniciales del ciclo activo (prioridad: ciclos_hacienda; respaldo: saldos_iniciales)
  if (cicloActivo) {
    inicialServiciosEf = parseFloat(cicloActivo.servicios_efectivo_inicial) || 0
    inicialServiciosQr = parseFloat(cicloActivo.servicios_qr_inicial) || 0
    inicialAfiliacionesEf = parseFloat(cicloActivo.afiliaciones_efectivo_inicial) || 0
    inicialAfiliacionesQr = parseFloat(cicloActivo.afiliaciones_qr_inicial) || 0
  } else {
    saldosIniciales.forEach((s) => {
      const monto = parseFloat(s.monto_inicial) || 0
      if (s.caja === 'servicios') {
        if (s.metodo_pago === 'efectivo') inicialServiciosEf += monto
        if (s.metodo_pago === 'qr') inicialServiciosQr += monto
      } else if (s.caja === 'afiliaciones') {
        if (s.metodo_pago === 'efectivo') inicialAfiliacionesEf += monto
        if (s.metodo_pago === 'qr') inicialAfiliacionesQr += monto
      }
    })
  }

  let ingresosServiciosEf = 0
  let ingresosServiciosQr = 0
  let ingresosAfiliacionesEf = 0
  let ingresosAfiliacionesQr = 0

  let egresosServiciosEf = 0
  let egresosServiciosQr = 0
  let egresosAfiliacionesEf = 0
  let egresosAfiliacionesQr = 0

  let movServiciosEf = 0
  let movServiciosQr = 0
  let movAfiliacionesEf = 0
  let movAfiliacionesQr = 0

  // 2. Ingresos de Servicios Básicos (pagos activos del ciclo)
  pagosServicios
    .filter(
      (p) =>
        p.estado === 'activo' &&
        belongsToActiveCycle(p.fecha_pago, p.created_at, cicloActivo, hasClosedCycles)
    )
    .forEach((p) => {
      const monto = parseFloat(p.monto) || 0
      if (p.metodo_pago === 'efectivo') ingresosServiciosEf += monto
      if (p.metodo_pago === 'qr') ingresosServiciosQr += monto
    })

  // 3. Ingresos de Afiliaciones (pagos activos del ciclo)
  pagosAfiliacion
    .filter(
      (p) =>
        p.estado === 'activo' &&
        belongsToActiveCycle(p.fecha_pago, p.created_at, cicloActivo, hasClosedCycles)
    )
    .forEach((p) => {
      const monto = parseFloat(p.monto) || 0
      if (p.metodo_pago === 'efectivo') ingresosAfiliacionesEf += monto
      if (p.metodo_pago === 'qr') ingresosAfiliacionesQr += monto
    })

  // 4. Pagos de Deudores de Ciclos Anteriores / Heredados
  pagosDeudoresCiclos
    .filter(
      (p) =>
        !p.anulado &&
        belongsToActiveCycle(p.fecha_pago, p.created_at, cicloActivo, hasClosedCycles)
    )
    .forEach((p) => {
      const monto = parseFloat(p.monto) || 0
      const caja = p.deudores_ciclos?.caja || p.caja || 'servicios'
      if (caja === 'servicios') {
        if (p.metodo_pago === 'efectivo') ingresosServiciosEf += monto
        if (p.metodo_pago === 'qr') ingresosServiciosQr += monto
      } else if (caja === 'afiliaciones') {
        if (p.metodo_pago === 'efectivo') ingresosAfiliacionesEf += monto
        if (p.metodo_pago === 'qr') ingresosAfiliacionesQr += monto
      }
    })

  // 5. Cobros de Aportantes Externos (Guardia y Agua -> Caja Servicios)
  cobrosExternos
    .filter(
      (c) =>
        !c.anulado &&
        belongsToActiveCycle(c.fecha_pago, c.created_at, cicloActivo, hasClosedCycles)
    )
    .forEach((c) => {
      const monto = parseFloat(c.monto_pagado) || 0
      if (c.metodo_pago === 'efectivo') ingresosServiciosEf += monto
      if (c.metodo_pago === 'qr') ingresosServiciosQr += monto
    })

  // 6. Egresos (descuentan de la caja y método correspondiente)
  egresos
    .filter(
      (e) =>
        e.estado === 'activo' &&
        belongsToActiveCycle(e.fecha, e.created_at, cicloActivo, hasClosedCycles)
    )
    .forEach((e) => {
      const monto = parseFloat(e.monto) || 0
      if (e.caja === 'servicios') {
        if (e.metodo_pago === 'efectivo') egresosServiciosEf += monto
        if (e.metodo_pago === 'qr') egresosServiciosQr += monto
      } else if (e.caja === 'afiliaciones') {
        if (e.metodo_pago === 'efectivo') egresosAfiliacionesEf += monto
        if (e.metodo_pago === 'qr') egresosAfiliacionesQr += monto
      }
    })

  // 7. Movimientos Internos (Efectivo <-> QR y Préstamos/Reposiciones entre cajas)
  movimientosInternos
    .filter(
      (m) =>
        m.estado === 'activo' &&
        belongsToActiveCycle(m.fecha, m.created_at, cicloActivo, hasClosedCycles)
    )
    .forEach((m) => {
      const monto = parseFloat(m.monto) || 0

      if (m.tipo === 'retiro_qr_a_efectivo') {
        if (m.caja_origen === 'servicios') {
          movServiciosQr -= monto
          movServiciosEf += monto
        } else if (m.caja_origen === 'afiliaciones') {
          movAfiliacionesQr -= monto
          movAfiliacionesEf += monto
        }
      } else if (m.tipo === 'deposito_efectivo_a_qr') {
        if (m.caja_origen === 'servicios') {
          movServiciosEf -= monto
          movServiciosQr += monto
        } else if (m.caja_origen === 'afiliaciones') {
          movAfiliacionesEf -= monto
          movAfiliacionesQr += monto
        }
      } else if (m.tipo === 'prestamo_entre_cajas' || m.tipo === 'reposicion_prestamo') {
        if (m.caja_origen === 'servicios') movServiciosEf -= monto
        if (m.caja_origen === 'afiliaciones') movAfiliacionesEf -= monto

        if (m.caja_destino === 'servicios') movServiciosEf += monto
        if (m.caja_destino === 'afiliaciones') movAfiliacionesEf += monto
      }
    })

  const serviciosEfectivo = inicialServiciosEf + ingresosServiciosEf - egresosServiciosEf + movServiciosEf
  const serviciosQr = inicialServiciosQr + ingresosServiciosQr - egresosServiciosQr + movServiciosQr
  const totalServicios = serviciosEfectivo + serviciosQr

  const afiliacionesEfectivo = inicialAfiliacionesEf + ingresosAfiliacionesEf - egresosAfiliacionesEf + movAfiliacionesEf
  const afiliacionesQr = inicialAfiliacionesQr + ingresosAfiliacionesQr - egresosAfiliacionesQr + movAfiliacionesQr
  const totalAfiliaciones = afiliacionesEfectivo + afiliacionesQr

  const totalEfectivoEnMano = serviciosEfectivo + afiliacionesEfectivo
  const totalQrEnBanco = serviciosQr + afiliacionesQr
  const granTotal = totalEfectivoEnMano + totalQrEnBanco

  return {
    // Desglose por ciclo para InicioView
    inicialServiciosEf,
    inicialServiciosQr,
    totalInicialServicios: inicialServiciosEf + inicialServiciosQr,
    inicialAfiliacionesEf,
    inicialAfiliacionesQr,
    totalInicialAfiliaciones: inicialAfiliacionesEf + inicialAfiliacionesQr,
    ingresosServiciosEf,
    ingresosServiciosQr,
    totalIngresosServicios: ingresosServiciosEf + ingresosServiciosQr,
    ingresosAfiliacionesEf,
    ingresosAfiliacionesQr,
    totalIngresosAfiliaciones: ingresosAfiliacionesEf + ingresosAfiliacionesQr,
    egresosServiciosEf,
    egresosServiciosQr,
    totalEgresosServicios: egresosServiciosEf + egresosServiciosQr,
    egresosAfiliacionesEf,
    egresosAfiliacionesQr,
    totalEgresosAfiliaciones: egresosAfiliacionesEf + egresosAfiliacionesQr,
    // Saldos finales
    serviciosEfectivo,
    serviciosQr,
    totalServicios,
    afiliacionesEfectivo,
    afiliacionesQr,
    totalAfiliaciones,
    totalEfectivoEnMano,
    totalQrEnBanco,
    granTotal,
  }
}
