/**
 * Motor de Cálculos Consolidados de Rendición de Cuentas
 * Secretaría de Hacienda - Mercado Palmira
 *
 * Consolida cualquier rango (Trimestre, Cuatrimestre, Semestre o Año)
 * separando estrictamente Caja Servicios y Caja Afiliaciones,
 * incluyendo deudores de ciclos, aportantes externos y cumplimiento de puestos.
 */
import { getNombreSocioCobro } from './formatters'
import { calcularDesgloseRubrosBase } from './calculosCobro'

function parseFecha(val) {
  if (!val) return null
  if (val instanceof Date) return val
  const s = String(val)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number)
    return new Date(y, m - 1, d, 12, 0, 0, 0)
  }
  return new Date(s)
}

export function calcularConsolidadoRendicion({
  mesInicio,
  anioInicio,
  mesFin,
  anioFin,
  ciclosHacienda = [],
  saldosIniciales = [],
  pagosServicios = [],
  pagosAfiliacion = [],
  pagosDeudoresCiclos = [],
  cobrosExternos = [],
  egresos = [],
  movimientosInternos = [],
  cobrosServicios = [],
  afiliaciones = [],
  unidadesCobro = [],
}) {
  // 1. Fechas límite del rango
  const fechaInicio = new Date(anioInicio, mesInicio - 1, 1, 0, 0, 0, 0)
  const fechaFin = new Date(anioFin, mesFin, 0, 23, 59, 59, 999)

  // 2. Saldos Anteriores (desde el ciclo inicial en ciclos_hacienda o saldos_iniciales + transacciones previas a fechaInicio)
  let antServiciosEf = 0
  let antServiciosQr = 0
  let antAfiliacionesEf = 0
  let antAfiliacionesQr = 0

  const cicloInicial =
    ciclosHacienda.find((c) => c.es_inicial) ||
    [...ciclosHacienda].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))[0] ||
    null

  if (cicloInicial) {
    antServiciosEf = parseFloat(cicloInicial.servicios_efectivo_inicial) || 0
    antServiciosQr = parseFloat(cicloInicial.servicios_qr_inicial) || 0
    antAfiliacionesEf = parseFloat(cicloInicial.afiliaciones_efectivo_inicial) || 0
    antAfiliacionesQr = parseFloat(cicloInicial.afiliaciones_qr_inicial) || 0
  } else {
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
  }

  // Transacciones previas a la fecha de inicio
  pagosServicios
    .filter((p) => p.estado === 'activo' && parseFecha(p.fecha_pago) < fechaInicio)
    .forEach((p) => {
      const m = parseFloat(p.monto) || 0
      if (p.metodo_pago === 'efectivo') antServiciosEf += m
      if (p.metodo_pago === 'qr') antServiciosQr += m
    })

  pagosAfiliacion
    .filter((p) => p.estado === 'activo' && parseFecha(p.fecha_pago) < fechaInicio)
    .forEach((p) => {
      const m = parseFloat(p.monto) || 0
      if (p.metodo_pago === 'efectivo') antAfiliacionesEf += m
      if (p.metodo_pago === 'qr') antAfiliacionesQr += m
    })

  pagosDeudoresCiclos
    .filter((p) => !p.anulado && parseFecha(p.fecha_pago) < fechaInicio)
    .forEach((p) => {
      const m = parseFloat(p.monto) || 0
      const caja = p.deudores_ciclos?.caja || p.caja || 'servicios'
      if (caja === 'servicios') {
        if (p.metodo_pago === 'efectivo') antServiciosEf += m
        if (p.metodo_pago === 'qr') antServiciosQr += m
      } else if (caja === 'afiliaciones') {
        if (p.metodo_pago === 'efectivo') antAfiliacionesEf += m
        if (p.metodo_pago === 'qr') antAfiliacionesQr += m
      }
    })

  cobrosExternos
    .filter((c) => !c.anulado && parseFecha(c.fecha_pago) < fechaInicio)
    .forEach((c) => {
      const m = parseFloat(c.monto_pagado) || 0
      if (c.metodo_pago === 'efectivo') antServiciosEf += m
      if (c.metodo_pago === 'qr') antServiciosQr += m
    })

  egresos
    .filter((e) => e.estado === 'activo' && parseFecha(e.fecha) < fechaInicio)
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
    .filter((m) => m.estado === 'activo' && parseFecha(m.fecha) < fechaInicio)
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
    const f = parseFecha(p.fecha_pago)
    return f >= fechaInicio && f <= fechaFin
  })

  let ingServiciosRegularesEf = 0
  let ingServiciosRegularesQr = 0
  let guardiaSocios = 0
  let aguaSocios = 0
  let luzSocios = 0
  let multasSocios = 0

  pagosServiciosRango.forEach((p) => {
    const m = parseFloat(p.monto) || 0
    if (p.metodo_pago === 'efectivo') ingServiciosRegularesEf += m
    if (p.metodo_pago === 'qr') ingServiciosRegularesQr += m

    if (m <= 0) return
    const c = p.cobros_servicios || {}
    let g = parseFloat(c.monto_guardia)
    let a = parseFloat(c.monto_agua)
    let l = parseFloat(c.monto_luz_grupo)

    if (!Number.isFinite(g) || !Number.isFinite(a) || !Number.isFinite(l)) {
      const baseCalc = calcularDesgloseRubrosBase({
        cantidadPuestos: c.cantidad_puestos_aplicada || 1,
        montoBase: parseFloat(c.monto_base) || 0,
        montoLuzRedondeado: parseFloat(c.monto_luz_redondeado) || 0,
      })
      if (!Number.isFinite(g)) g = baseCalc.montoGuardia
      if (!Number.isFinite(a)) a = baseCalc.montoAgua
      if (!Number.isFinite(l)) l = baseCalc.montoLuzGrupo
    }

    const sumRubros = Math.max(0, g + a + l)
    const totalCobro = Math.max(parseFloat(c.total_a_pagar) || 0, sumRubros)
    if (totalCobro > 0) {
      const ratio = m / totalCobro
      guardiaSocios += g * ratio
      aguaSocios += a * ratio
      luzSocios += l * ratio
      multasSocios += Math.max(0, totalCobro - sumRubros) * ratio
    } else {
      guardiaSocios += m
    }
  })

  // Aportantes Externos (Guardia y Agua) dentro del rango
  const cobrosExternosRango = cobrosExternos.filter((c) => {
    if (c.anulado) return false
    const f = parseFecha(c.fecha_pago)
    return f >= fechaInicio && f <= fechaFin
  })

  let ingExternosEf = 0
  let ingExternosQr = 0
  let guardiaExternos = 0
  let aguaExternos = 0

  cobrosExternosRango.forEach((c) => {
    const m = parseFloat(c.monto_pagado) || 0
    if (c.metodo_pago === 'efectivo') ingExternosEf += m
    if (c.metodo_pago === 'qr') ingExternosQr += m

    if (m <= 0) return
    const g = parseFloat(c.monto_guardia)
    const a = parseFloat(c.monto_agua)
    if (Number.isFinite(g) || Number.isFinite(a)) {
      const gg = Number.isFinite(g) ? g : 0
      const aa = Number.isFinite(a) ? a : 0
      const s = gg + aa
      if (s > 0 && Math.abs(s - m) > 0.01) {
        guardiaExternos += (gg / s) * m
        aguaExternos += (aa / s) * m
      } else {
        guardiaExternos += gg
        aguaExternos += aa
      }
    } else {
      guardiaExternos += m * 0.8
      aguaExternos += m * 0.2
    }
  })
  const totalIngExternos = ingExternosEf + ingExternosQr

  // Pagos de Deudores de Ciclos Anteriores dentro del rango
  const pagosDeudoresRango = pagosDeudoresCiclos.filter((p) => {
    if (p.anulado) return false
    const f = parseFecha(p.fecha_pago)
    return f >= fechaInicio && f <= fechaFin
  })

  let ingDeudoresServiciosEf = 0
  let ingDeudoresServiciosQr = 0
  let ingDeudoresAfiliacionesEf = 0
  let ingDeudoresAfiliacionesQr = 0

  pagosDeudoresRango.forEach((p) => {
    const m = parseFloat(p.monto) || 0
    const caja = p.deudores_ciclos?.caja || p.caja || 'servicios'
    if (caja === 'servicios') {
      if (p.metodo_pago === 'efectivo') ingDeudoresServiciosEf += m
      if (p.metodo_pago === 'qr') ingDeudoresServiciosQr += m
    } else if (caja === 'afiliaciones') {
      if (p.metodo_pago === 'efectivo') ingDeudoresAfiliacionesEf += m
      if (p.metodo_pago === 'qr') ingDeudoresAfiliacionesQr += m
    }
  })

  const totalIngDeudoresServicios = ingDeudoresServiciosEf + ingDeudoresServiciosQr
  const totalIngDeudoresAfiliaciones = ingDeudoresAfiliacionesEf + ingDeudoresAfiliacionesQr

  const ingServiciosEf = ingServiciosRegularesEf + ingExternosEf + ingDeudoresServiciosEf
  const ingServiciosQr = ingServiciosRegularesQr + ingExternosQr + ingDeudoresServiciosQr
  const totalIngServicios = ingServiciosEf + ingServiciosQr

  const pagosAfiliacionRango = pagosAfiliacion.filter((p) => {
    if (p.estado !== 'activo') return false
    const f = parseFecha(p.fecha_pago)
    return f >= fechaInicio && f <= fechaFin
  })

  let ingAfiliacionesRegularesEf = 0
  let ingAfiliacionesRegularesQr = 0
  pagosAfiliacionRango.forEach((p) => {
    const m = parseFloat(p.monto) || 0
    if (p.metodo_pago === 'efectivo') ingAfiliacionesRegularesEf += m
    if (p.metodo_pago === 'qr') ingAfiliacionesRegularesQr += m
  })

  const ingAfiliacionesEf = ingAfiliacionesRegularesEf + ingDeudoresAfiliacionesEf
  const ingAfiliacionesQr = ingAfiliacionesRegularesQr + ingDeudoresAfiliacionesQr
  const totalIngAfiliaciones = ingAfiliacionesEf + ingAfiliacionesQr

  const egresosRango = egresos.filter((e) => {
    if (e.estado !== 'activo') return false
    const f = parseFecha(e.fecha)
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
    const f = parseFecha(m.fecha)
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

  // 5. Deudores al corte del rango (respetando socio histórico tras traspasos)
  const deudoresServicios = cobrosServicios
    .filter((c) => {
      const periodo = c.periodos_mensuales
      if (!periodo) return false
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
        cobroId: c.id,
        unidadId: c.unidad_id,
        socioId: c.socio_id_historico || c.unidades_cobro?.socio_responsable_id || c.unidades_cobro?.socios?.id || null,
        socio: getNombreSocioCobro(c),
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
    .filter((a) => (parseFloat(a.saldo_pendiente) || 0) > 0 && a.estado !== 'anulada')
    .map((a) => {
      const pagosActivos = (a.pagos_afiliacion || []).filter((p) => p.estado === 'activo')
      const totalPagado = pagosActivos.reduce((s, p) => s + (parseFloat(p.monto) || 0), 0)
      return {
        afiliacionId: a.id,
        socioId: a.socio_id || a.socios?.id || null,
        socio: a.socios?.nombre || 'Sin socio',
        telefono: a.socios?.telefono || '',
        totalPlan: a.monto_total || 1500,
        cuotaAcordada: a.cuota_acordada || 100,
        totalPagado,
        saldoPendiente: a.saldo_pendiente || 0,
      }
    })

  // 6. Resumen de Cumplimiento de Puestos en el Rango
  const unidadesActivas = (unidadesCobro || []).filter((u) => u.activo !== false)
  const totalPuestosActivos = unidadesActivas.reduce(
    (sum, u) => sum + (parseInt(u.cantidad_puestos, 10) || 1),
    0
  )
  const sociosRepresentadosSet = new Set(
    unidadesActivas.map((u) => u.socio_responsable_id).filter(Boolean)
  )
  const totalSociosActivos = sociosRepresentadosSet.size

  const cobrosEnRango = cobrosServicios.filter((c) => {
    const p = c.periodos_mensuales
    if (!p) return false
    const pDate = new Date(p.anio, p.mes - 1, 1)
    return pDate >= fechaInicio && pDate <= fechaFin
  })

  // Agrupar cobros del rango por unidad de cobro
  const porUnidad = new Map()
  cobrosEnRango.forEach((c) => {
    const key = c.unidad_id || c.id
    if (!porUnidad.has(key)) {
      porUnidad.set(key, {
        puestos: parseInt(c.cantidad_puestos_aplicada, 10) || parseInt(c.unidades_cobro?.cantidad_puestos, 10) || 1,
        totalAPagar: 0,
        totalPagado: 0,
      })
    }
    const entry = porUnidad.get(key)
    entry.totalAPagar += parseFloat(c.total_a_pagar) || 0
    const pagadoCobro = (c.pagos_servicios || [])
      .filter((p) => p.estado === 'activo')
      .reduce((s, p) => s + (parseFloat(p.monto) || 0), 0)
    entry.totalPagado += pagadoCobro
  })

  let puestosPagados = 0
  let puestosParciales = 0
  let puestosPendientes = 0

  porUnidad.forEach((entry) => {
    if (entry.totalPagado >= entry.totalAPagar && entry.totalAPagar > 0) {
      puestosPagados += entry.puestos
    } else if (entry.totalPagado > 0) {
      puestosParciales += entry.puestos
    } else {
      puestosPendientes += entry.puestos
    }
  })

  const totalPuestosEvaluados = puestosPagados + puestosParciales + puestosPendientes
  const baseCumplimiento = totalPuestosEvaluados > 0 ? totalPuestosEvaluados : totalPuestosActivos
  const porcentajeCumplimiento =
    baseCumplimiento > 0 ? Math.round((puestosPagados / baseCumplimiento) * 1000) / 10 : 0

  const cumplimientoPuestos = {
    totalPuestosActivos,
    totalSociosActivos,
    totalPuestosEvaluados,
    puestosPagados,
    puestosParciales,
    puestosPendientes,
    porcentajeCumplimiento,
  }

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

    // Ingresos rango (con desglose de externos y deudores)
    ingServiciosRegularesEf,
    ingServiciosRegularesQr,
    ingExternosEf,
    ingExternosQr,
    totalIngExternos,
    ingDeudoresServiciosEf,
    ingDeudoresServiciosQr,
    totalIngDeudoresServicios,
    ingDeudoresAfiliacionesEf,
    ingDeudoresAfiliacionesQr,
    totalIngDeudoresAfiliaciones,
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

    // Cumplimiento
    cumplimientoPuestos,

    // Desglose Interno de Ingresos Caja Servicios (Guardia / Agua / Grupo Luz)
    desgloseInternoServicios: {
      guardiaSocios,
      guardiaExternos,
      totalGuardia: guardiaSocios + guardiaExternos,
      aguaSocios,
      aguaExternos,
      totalAgua: aguaSocios + aguaExternos,
      totalLuzGrupo: luzSocios,
      totalMultasSocios: multasSocios,
      totalDeudoresServicios: totalIngDeudoresServicios,
    },

    // Listas
    pagosServiciosRango,
    pagosAfiliacionRango,
    pagosDeudoresRango,
    cobrosExternosRango,
    egresosRango,
    movimientosRango,
    deudoresServicios,
    deudoresAfiliaciones,
  }
}
