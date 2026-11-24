/**
 * Motor de Cálculos Consolidados de Rendición de Cuentas
 * Secretaría de Hacienda - Mercado Palmira
 * 
 * Permite consolidar cualquier rango (Trimestre, Cuatrimestre, Semestre o Año)
 * separando estrictamente Caja Servicios y Caja Afiliaciones.
 */

export function calcularConsolidadoRendicion({
  mesInicio,
  anioInicio,
  mesFin,
  anioFin,
  saldosIniciales = [],
  pagosServicios = [],
  pagosAfiliacion = [],
  egresos = [],
  movimientosInternos = [],
  cobrosServicios = [],
  afiliaciones = [],
}) {
  // 1. Fechas límite del rango
  const fechaInicio = new Date(anioInicio, mesInicio - 1, 1, 0, 0, 0, 0)
  const fechaFin = new Date(anioFin, mesFin, 0, 23, 59, 59, 999)

  // 2. Saldos Anteriores (antes de fechaInicio)
  let antServiciosEf = 0
  let antServiciosQr = 0
  let antAfiliacionesEf = 0
  let antAfiliacionesQr = 0

  saldosIniciales.forEach((s) => {
    const m = parseFloat(s.monto_inicial) || 0
    if (s.caja === 'servicios') {
      if (s.metodo_pago === 'efectivo') antServiciosEf += m
      if (s.metodo_pago === 'qr') antServiciosQr += m
    } else if (s.caja === 'afiliaciones') {
      if (s.metodo_pago === 'efectivo') antAfiliacionesEf += m
      if (s.metodo_pago === 'qr') antAfiliacionesQr += m
    }
  })

  // Transacciones previas a la fecha de inicio
  pagosServicios
    .filter((p) => p.estado === 'activo' && new Date(p.fecha_pago) < fechaInicio)
    .forEach((p) => {
      const m = parseFloat(p.monto) || 0
      if (p.metodo_pago === 'efectivo') antServiciosEf += m
      if (p.metodo_pago === 'qr') antServiciosQr += m
    })

  pagosAfiliacion
    .filter((p) => p.estado === 'activo' && new Date(p.fecha_pago) < fechaInicio)
    .forEach((p) => {
      const m = parseFloat(p.monto) || 0
      if (p.metodo_pago === 'efectivo') antAfiliacionesEf += m
      if (p.metodo_pago === 'qr') antAfiliacionesQr += m
    })

  egresos
    .filter((e) => e.estado === 'activo' && new Date(e.fecha) < fechaInicio)
    .forEach((e) => {
      const m = parseFloat(e.monto) || 0
      if (e.caja === 'servicios') {
        if (e.metodo_pago === 'efectivo') antServiciosEf -= m
        if (e.metodo_pago === 'qr') antServiciosQr -= m
      } else if (e.caja === 'afiliaciones') {
        if (e.metodo_pago === 'efectivo') antAfiliacionesEf -= m
        if (e.metodo_pago === 'qr') antAfiliacionesQr -= m
      }
    })

  movimientosInternos
    .filter((m) => m.estado === 'activo' && new Date(m.fecha) < fechaInicio)
    .forEach((m) => {
      const monto = parseFloat(m.monto) || 0
      if (m.tipo === 'retiro_qr_a_efectivo') {
        if (m.caja_origen === 'servicios') {
          antServiciosQr -= monto
          antServiciosEf += monto
        } else if (m.caja_origen === 'afiliaciones') {
          antAfiliacionesQr -= monto
          antAfiliacionesEf += monto
        }
      } else if (m.tipo === 'deposito_efectivo_a_qr') {
        if (m.caja_origen === 'servicios') {
          antServiciosEf -= monto
          antServiciosQr += monto
        } else if (m.caja_origen === 'afiliaciones') {
          antAfiliacionesEf -= monto
          antAfiliacionesQr += monto
        }
      } else if (m.tipo === 'prestamo_entre_cajas' || m.tipo === 'reposicion_prestamo') {
        if (m.caja_origen === 'servicios') antServiciosEf -= monto
        if (m.caja_origen === 'afiliaciones') antAfiliacionesEf -= monto
        if (m.caja_destino === 'servicios') antServiciosEf += monto
        if (m.caja_destino === 'afiliaciones') antAfiliacionesEf += monto
      }
    })

  // 3. Transacciones DENTRO del Rango Seleccionado
  const pagosServiciosRango = pagosServicios.filter((p) => {
    if (p.estado !== 'activo') return false
    const f = new Date(p.fecha_pago)
    return f >= fechaInicio && f <= fechaFin
  })

  let ingServiciosEf = 0
  let ingServiciosQr = 0
  pagosServiciosRango.forEach((p) => {
    const m = parseFloat(p.monto) || 0
    if (p.metodo_pago === 'efectivo') ingServiciosEf += m
    if (p.metodo_pago === 'qr') ingServiciosQr += m
  })
  const totalIngServicios = ingServiciosEf + ingServiciosQr

  const pagosAfiliacionRango = pagosAfiliacion.filter((p) => {
    if (p.estado !== 'activo') return false
    const f = new Date(p.fecha_pago)
    return f >= fechaInicio && f <= fechaFin
  })

  let ingAfiliacionesEf = 0
  let ingAfiliacionesQr = 0
  pagosAfiliacionRango.forEach((p) => {
    const m = parseFloat(p.monto) || 0
    if (p.metodo_pago === 'efectivo') ingAfiliacionesEf += m
    if (p.metodo_pago === 'qr') ingAfiliacionesQr += m
  })
  const totalIngAfiliaciones = ingAfiliacionesEf + ingAfiliacionesQr

  const egresosRango = egresos.filter((e) => {
    if (e.estado !== 'activo') return false
    const f = new Date(e.fecha)
    return f >= fechaInicio && f <= fechaFin
  })

  let egServiciosEf = 0
  let egServiciosQr = 0
  let egAfiliacionesEf = 0
  let egAfiliacionesQr = 0

  const egresosPorCategoriaServicios = {}
  const egresosPorCategoriaAfiliaciones = {}

  egresosRango.forEach((e) => {
    const m = parseFloat(e.monto) || 0
    if (e.caja === 'servicios') {
      if (e.metodo_pago === 'efectivo') egServiciosEf += m
      if (e.metodo_pago === 'qr') egServiciosQr += m
      egresosPorCategoriaServicios[e.categoria] = (egresosPorCategoriaServicios[e.categoria] || 0) + m
    } else if (e.caja === 'afiliaciones') {
      if (e.metodo_pago === 'efectivo') egAfiliacionesEf += m
      if (e.metodo_pago === 'qr') egAfiliacionesQr += m
      egresosPorCategoriaAfiliaciones[e.categoria] = (egresosPorCategoriaAfiliaciones[e.categoria] || 0) + m
    }
  })

  const totalEgServicios = egServiciosEf + egServiciosQr
  const totalEgAfiliaciones = egAfiliacionesEf + egAfiliacionesQr
  const totalEgresosGeneral = totalEgServicios + totalEgAfiliaciones

  const movimientosRango = movimientosInternos.filter((m) => {
    if (m.estado !== 'activo') return false
    const f = new Date(m.fecha)
    return f >= fechaInicio && f <= fechaFin
  })

  let movServiciosEf = 0
  let movServiciosQr = 0
  let movAfiliacionesEf = 0
  let movAfiliacionesQr = 0

  movimientosRango.forEach((m) => {
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

  // 4. Saldos Finales al Corte
  const finServiciosEf = antServiciosEf + ingServiciosEf - egServiciosEf + movServiciosEf
  const finServiciosQr = antServiciosQr + ingServiciosQr - egServiciosQr + movServiciosQr
  const totalFinServicios = finServiciosEf + finServiciosQr

  const finAfiliacionesEf = antAfiliacionesEf + ingAfiliacionesEf - egAfiliacionesEf + movAfiliacionesEf
  const finAfiliacionesQr = antAfiliacionesQr + ingAfiliacionesQr - egAfiliacionesQr + movAfiliacionesQr
  const totalFinAfiliaciones = finAfiliacionesEf + finAfiliacionesQr

  const totalEfectivoFinal = finServiciosEf + finAfiliacionesEf
  const totalQrFinal = finServiciosQr + finAfiliacionesQr
  const granTotalFinal = totalEfectivoFinal + totalQrFinal

  // 5. Deudores al corte del rango
  const deudoresServicios = cobrosServicios
    .filter((c) => {
      const periodo = c.periodos_mensuales
      if (!periodo) return false
      // Periodos incluidos en o hasta el fin del rango
      const pDate = new Date(periodo.anio, periodo.mes - 1, 1)
      if (pDate > fechaFin) return false

      const pagosActivos = (c.pagos_servicios || []).filter((p) => p.estado === 'activo')
      const totalPagado = pagosActivos.reduce((s, p) => s + (parseFloat(p.monto) || 0), 0)
      return (c.total_a_pagar || 0) > totalPagado
    })
    .map((c) => {
      const pagosActivos = (c.pagos_servicios || []).filter((p) => p.estado === 'activo')
      const totalPagado = pagosActivos.reduce((s, p) => s + (parseFloat(p.monto) || 0), 0)
      const saldo = Math.max(0, (c.total_a_pagar || 0) - totalPagado)
      return {
        socio: c.unidades_cobro?.socios?.nombre || 'Sin socio',
        telefono: c.unidades_cobro?.socios?.telefono || '',
        puesto: c.unidades_cobro?.numero_identificador || '',
        periodo: `${c.periodos_mensuales?.mes}/${c.periodos_mensuales?.anio}`,
        totalAPagar: c.total_a_pagar || 0,
        totalPagado,
        saldoPendiente: saldo,
        multa: c.monto_multa || 0,
      }
    })

  const deudoresAfiliaciones = afiliaciones
    .filter((a) => (parseFloat(a.saldo_pendiente) || 0) > 0)
    .map((a) => {
      const pagosActivos = (a.pagos_afiliacion || []).filter((p) => p.estado === 'activo')
      const totalPagado = pagosActivos.reduce((s, p) => s + (parseFloat(p.monto) || 0), 0)
      return {
        socio: a.socios?.nombre || 'Sin socio',
        telefono: a.socios?.telefono || '',
        totalPlan: a.monto_total || 1500,
        cuotaAcordada: a.cuota_acordada || 100,
        totalPagado,
        saldoPendiente: a.saldo_pendiente || 0,
      }
    })

  return {
    fechaInicio,
    fechaFin,
    // Saldos anteriores
    antServiciosEf,
    antServiciosQr,
    totalAntServicios: antServiciosEf + antServiciosQr,
    antAfiliacionesEf,
    antAfiliacionesQr,
    totalAntAfiliaciones: antAfiliacionesEf + antAfiliacionesQr,
    totalAntGeneral: antServiciosEf + antServiciosQr + antAfiliacionesEf + antAfiliacionesQr,

    // Ingresos rango
    ingServiciosEf,
    ingServiciosQr,
    totalIngServicios,
    ingAfiliacionesEf,
    ingAfiliacionesQr,
    totalIngAfiliaciones,
    totalIngresosGeneral: totalIngServicios + totalIngAfiliaciones,

    // Egresos rango
    egServiciosEf,
    egServiciosQr,
    totalEgServicios,
    egAfiliacionesEf,
    egAfiliacionesQr,
    totalEgAfiliaciones,
    totalEgresosGeneral,
    egresosPorCategoriaServicios,
    egresosPorCategoriaAfiliaciones,

    // Movimientos rango
    movServiciosEf,
    movServiciosQr,
    movAfiliacionesEf,
    movAfiliacionesQr,

    // Saldos finales
    finServiciosEf,
    finServiciosQr,
    totalFinServicios,
    finAfiliacionesEf,
    finAfiliacionesQr,
    totalFinAfiliaciones,
    totalEfectivoFinal,
    totalQrFinal,
    granTotalFinal,

    // Listas
    pagosServiciosRango,
    pagosAfiliacionRango,
    egresosRango,
    movimientosRango,
    deudoresServicios,
    deudoresAfiliaciones,
  }
}
