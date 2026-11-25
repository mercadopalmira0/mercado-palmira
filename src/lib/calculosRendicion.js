/**
 * Motor de Cálculos Consolidados de Rendición de Cuentas
 * Secretaría de Hacienda - Mercado Palmira
 *
 * Consolida cualquier rango (Trimestre, Cuatrimestre, Semestre o Año)
 * separando estrictamente Caja Servicios y Caja Afiliaciones,
 * incluyendo fecha de corte de Asamblea, deudores heredados,
 * aportantes externos y cumplimiento completo de puestos y socios.
 */
import { getNombreSocioCobro } from './formatters'
import { calcularDesgloseRubrosBase } from './calculosCobro'

export const round2 = (n) => Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100

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

function parseFechaStart(val) {
  const f = parseFecha(val)
  if (!f || Number.isNaN(f.getTime())) return null
  return new Date(f.getFullYear(), f.getMonth(), f.getDate(), 0, 0, 0, 0)
}

function parseFechaEnd(val) {
  const f = parseFecha(val)
  if (!f || Number.isNaN(f.getTime())) return null
  return new Date(f.getFullYear(), f.getMonth(), f.getDate(), 23, 59, 59, 999)
}

function aplicarMovimiento(mov, target) {
  const monto = parseFloat(mov.monto) || 0
  if (mov.tipo === 'retiro_qr_a_efectivo') {
    if (mov.caja_origen === 'servicios') {
      target.serviciosQr -= monto
      target.serviciosEf += monto
    } else if (mov.caja_origen === 'afiliaciones') {
      target.afiliacionesQr -= monto
      target.afiliacionesEf += monto
    }
  } else if (mov.tipo === 'deposito_efectivo_a_qr') {
    if (mov.caja_origen === 'servicios') {
      target.serviciosEf -= monto
      target.serviciosQr += monto
    } else if (mov.caja_origen === 'afiliaciones') {
      target.afiliacionesEf -= monto
      target.afiliacionesQr += monto
    }
  } else if (mov.tipo === 'prestamo_entre_cajas' || mov.tipo === 'reposicion_prestamo') {
    if (mov.caja_origen === 'servicios') target.serviciosEf -= monto
    if (mov.caja_origen === 'afiliaciones') target.afiliacionesEf -= monto
    if (mov.caja_destino === 'servicios') target.serviciosEf += monto
    if (mov.caja_destino === 'afiliaciones') target.afiliacionesEf += monto
  }
}

export function calcularConsolidadoRendicion({
  mesInicio,
  anioInicio,
  mesFin,
  anioFin,
  fechaCorte = null,
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
  deudoresCiclos = [],
  unidadesCobro = [],
}) {
  // 1. Fechas límite del rango de periodos y de corte de caja para Asamblea
  const fechaInicioPeriodo = new Date(anioInicio, mesInicio - 1, 1, 0, 0, 0, 0)
  const fechaFinPeriodo = new Date(anioFin, mesFin, 0, 23, 59, 59, 999)
  const fechaLimiteFin = (fechaCorte && parseFechaEnd(fechaCorte)) || fechaFinPeriodo

  // Límite inferior de movimientos de caja (evita duplicados entre asambleas sucesivas)
  const cicloInicial =
    ciclosHacienda.find((c) => c.es_inicial) ||
    [...ciclosHacienda].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))[0] ||
    null

  const corteDiaInicio = new Date(
    fechaLimiteFin.getFullYear(),
    fechaLimiteFin.getMonth(),
    fechaLimiteFin.getDate(),
    0,
    0,
    0,
    0
  )
  const ventanaMinCierrePrevio = new Date(anioInicio, mesInicio - 2, 1, 0, 0, 0, 0)

  const cicloCerradoPrevio =
    [...ciclosHacienda]
      .filter((c) => {
        if (c.estado !== 'cerrado' || !c.fecha_cierre) return false
        const fc = parseFechaStart(c.fecha_cierre)
        if (!fc) return false
        // Excluir el cierre de la misma fecha de corte (permite re-consultar una rendición ya cerrada)
        return fc < corteDiaInicio && fc >= ventanaMinCierrePrevio
      })
      .sort((a, b) => parseFechaStart(b.fecha_cierre) - parseFechaStart(a.fecha_cierre))[0] || null

  let fechaLimiteInicio = fechaInicioPeriodo
  if (cicloCerradoPrevio?.fecha_cierre) {
    const fc = parseFechaStart(cicloCerradoPrevio.fecha_cierre)
    fechaLimiteInicio = new Date(fc.getFullYear(), fc.getMonth(), fc.getDate() + 1, 0, 0, 0, 0)
  } else {
    // Si es el primer ciclo (es_inicial = true), respetar el 1° día de mesInicio/anioInicio
    // para no perder egresos de cierre previos al arranque (ej. junio 2026).
    const cicloActivo = ciclosHacienda.find((c) => c.estado === 'abierto') || null
    if (cicloActivo && !cicloActivo.es_inicial && cicloActivo.fecha_inicio) {
      const fi = parseFechaStart(cicloActivo.fecha_inicio)
      if (fi && fi > fechaInicioPeriodo && fi <= fechaLimiteFin) {
        fechaLimiteInicio = fi
      }
    }
  }

  // 2. Saldos Anteriores (arranque del ciclo inicial + movimientos previos a fechaLimiteInicio)
  const ant = {
    serviciosEf: 0,
    serviciosQr: 0,
    afiliacionesEf: 0,
    afiliacionesQr: 0,
  }

  if (cicloInicial) {
    ant.serviciosEf = parseFloat(cicloInicial.servicios_efectivo_inicial) || 0
    ant.serviciosQr = parseFloat(cicloInicial.servicios_qr_inicial) || 0
    ant.afiliacionesEf = parseFloat(cicloInicial.afiliaciones_efectivo_inicial) || 0
    ant.afiliacionesQr = parseFloat(cicloInicial.afiliaciones_qr_inicial) || 0
  } else {
    saldosIniciales.forEach((s) => {
      const m = parseFloat(s.monto_inicial) || 0
      if (s.caja === 'servicios') {
        if (s.metodo_pago === 'efectivo') ant.serviciosEf += m
        if (s.metodo_pago === 'qr') ant.serviciosQr += m
      } else if (s.caja === 'afiliaciones') {
        if (s.metodo_pago === 'efectivo') ant.afiliacionesEf += m
        if (s.metodo_pago === 'qr') ant.afiliacionesQr += m
      }
    })
  }

  pagosServicios
    .filter((p) => {
      if (p.estado !== 'activo') return false
      const f = parseFecha(p.fecha_pago)
      return f && f < fechaLimiteInicio
    })
    .forEach((p) => {
      const m = parseFloat(p.monto) || 0
      if (p.metodo_pago === 'efectivo') ant.serviciosEf += m
      if (p.metodo_pago === 'qr') ant.serviciosQr += m
    })

  pagosAfiliacion
    .filter((p) => {
      if (p.estado !== 'activo') return false
      const f = parseFecha(p.fecha_pago)
      return f && f < fechaLimiteInicio
    })
    .forEach((p) => {
      const m = parseFloat(p.monto) || 0
      if (p.metodo_pago === 'efectivo') ant.afiliacionesEf += m
      if (p.metodo_pago === 'qr') ant.afiliacionesQr += m
    })

  pagosDeudoresCiclos
    .filter((p) => {
      if (p.anulado) return false
      const f = parseFecha(p.fecha_pago)
      return f && f < fechaLimiteInicio
    })
    .forEach((p) => {
      const m = parseFloat(p.monto) || 0
      const caja = p.deudores_ciclos?.caja || p.caja || 'servicios'
      if (caja === 'servicios') {
        if (p.metodo_pago === 'efectivo') ant.serviciosEf += m
        if (p.metodo_pago === 'qr') ant.serviciosQr += m
      } else if (caja === 'afiliaciones') {
        if (p.metodo_pago === 'efectivo') ant.afiliacionesEf += m
        if (p.metodo_pago === 'qr') ant.afiliacionesQr += m
      }
    })

  cobrosExternos
    .filter((c) => {
      if (c.anulado) return false
      const f = parseFecha(c.fecha_pago)
      return f && f < fechaLimiteInicio
    })
    .forEach((c) => {
      const m = parseFloat(c.monto_pagado) || 0
      if (c.metodo_pago === 'efectivo') ant.serviciosEf += m
      if (c.metodo_pago === 'qr') ant.serviciosQr += m
    })

  egresos
    .filter((e) => {
      if (e.estado !== 'activo') return false
      const f = parseFecha(e.fecha)
      return f && f < fechaLimiteInicio
    })
    .forEach((e) => {
      const m = parseFloat(e.monto) || 0
      if (e.caja === 'servicios') {
        if (e.metodo_pago === 'efectivo') ant.serviciosEf -= m
        if (e.metodo_pago === 'qr') ant.serviciosQr -= m
      } else if (e.caja === 'afiliaciones') {
        if (e.metodo_pago === 'efectivo') ant.afiliacionesEf -= m
        if (e.metodo_pago === 'qr') ant.afiliacionesQr -= m
      }
    })

  movimientosInternos
    .filter((m) => {
      if (m.estado !== 'activo') return false
      const f = parseFecha(m.fecha)
      return f && f < fechaLimiteInicio
    })
    .forEach((m) => aplicarMovimiento(m, ant))

  const antServiciosEf = round2(ant.serviciosEf)
  const antServiciosQr = round2(ant.serviciosQr)
  const antAfiliacionesEf = round2(ant.afiliacionesEf)
  const antAfiliacionesQr = round2(ant.afiliacionesQr)

  // 3. Transacciones DENTRO del Rango de Caja (fechaLimiteInicio .. fechaLimiteFin)
  const enRangoCaja = (val) => {
    const f = parseFecha(val)
    return Boolean(f && f >= fechaLimiteInicio && f <= fechaLimiteFin)
  }

  const pagosServiciosRango = pagosServicios.filter(
    (p) => p.estado === 'activo' && enRangoCaja(p.fecha_pago)
  )

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
  const cobrosExternosRango = cobrosExternos.filter(
    (c) => !c.anulado && enRangoCaja(c.fecha_pago)
  )

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

  // Pagos de Deudores de Ciclos Anteriores dentro del rango
  const pagosDeudoresRango = pagosDeudoresCiclos.filter(
    (p) => !p.anulado && enRangoCaja(p.fecha_pago)
  )

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

  const pagosAfiliacionRango = pagosAfiliacion.filter(
    (p) => p.estado === 'activo' && enRangoCaja(p.fecha_pago)
  )

  let ingAfiliacionesRegularesEf = 0
  let ingAfiliacionesRegularesQr = 0
  pagosAfiliacionRango.forEach((p) => {
    const m = parseFloat(p.monto) || 0
    if (p.metodo_pago === 'efectivo') ingAfiliacionesRegularesEf += m
    if (p.metodo_pago === 'qr') ingAfiliacionesRegularesQr += m
  })

  const egresosRango = egresos.filter(
    (e) => e.estado === 'activo' && enRangoCaja(e.fecha)
  )

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
      egresosPorCategoriaServicios[e.categoria] = round2(
        (egresosPorCategoriaServicios[e.categoria] || 0) + m
      )
    } else if (e.caja === 'afiliaciones') {
      if (e.metodo_pago === 'efectivo') egAfiliacionesEf += m
      if (e.metodo_pago === 'qr') egAfiliacionesQr += m
      egresosPorCategoriaAfiliaciones[e.categoria] = round2(
        (egresosPorCategoriaAfiliaciones[e.categoria] || 0) + m
      )
    }
  })

  const movimientosRango = movimientosInternos.filter(
    (m) => m.estado === 'activo' && enRangoCaja(m.fecha)
  )

  const mov = {
    serviciosEf: 0,
    serviciosQr: 0,
    afiliacionesEf: 0,
    afiliacionesQr: 0,
  }
  movimientosRango.forEach((m) => aplicarMovimiento(m, mov))

  // Redondeo limpio a 2 decimales en todos los totales y subtotales
  ingServiciosRegularesEf = round2(ingServiciosRegularesEf)
  ingServiciosRegularesQr = round2(ingServiciosRegularesQr)
  ingExternosEf = round2(ingExternosEf)
  ingExternosQr = round2(ingExternosQr)
  const totalIngExternos = round2(ingExternosEf + ingExternosQr)

  ingDeudoresServiciosEf = round2(ingDeudoresServiciosEf)
  ingDeudoresServiciosQr = round2(ingDeudoresServiciosQr)
  const totalIngDeudoresServicios = round2(ingDeudoresServiciosEf + ingDeudoresServiciosQr)

  ingDeudoresAfiliacionesEf = round2(ingDeudoresAfiliacionesEf)
  ingDeudoresAfiliacionesQr = round2(ingDeudoresAfiliacionesQr)
  const totalIngDeudoresAfiliaciones = round2(ingDeudoresAfiliacionesEf + ingDeudoresAfiliacionesQr)

  const ingServiciosEf = round2(ingServiciosRegularesEf + ingExternosEf + ingDeudoresServiciosEf)
  const ingServiciosQr = round2(ingServiciosRegularesQr + ingExternosQr + ingDeudoresServiciosQr)
  const totalIngServicios = round2(ingServiciosEf + ingServiciosQr)

  ingAfiliacionesRegularesEf = round2(ingAfiliacionesRegularesEf)
  ingAfiliacionesRegularesQr = round2(ingAfiliacionesRegularesQr)
  const ingAfiliacionesEf = round2(ingAfiliacionesRegularesEf + ingDeudoresAfiliacionesEf)
  const ingAfiliacionesQr = round2(ingAfiliacionesRegularesQr + ingDeudoresAfiliacionesQr)
  const totalIngAfiliaciones = round2(ingAfiliacionesEf + ingAfiliacionesQr)
  const totalIngresosGeneral = round2(totalIngServicios + totalIngAfiliaciones)

  egServiciosEf = round2(egServiciosEf)
  egServiciosQr = round2(egServiciosQr)
  const totalEgServicios = round2(egServiciosEf + egServiciosQr)

  egAfiliacionesEf = round2(egAfiliacionesEf)
  egAfiliacionesQr = round2(egAfiliacionesQr)
  const totalEgAfiliaciones = round2(egAfiliacionesEf + egAfiliacionesQr)
  const totalEgresosGeneral = round2(totalEgServicios + totalEgAfiliaciones)

  const movServiciosEf = round2(mov.serviciosEf)
  const movServiciosQr = round2(mov.serviciosQr)
  const movAfiliacionesEf = round2(mov.afiliacionesEf)
  const movAfiliacionesQr = round2(mov.afiliacionesQr)

  // 4. Saldos Finales al Corte
  const finServiciosEf = round2(antServiciosEf + ingServiciosEf - egServiciosEf + movServiciosEf)
  const finServiciosQr = round2(antServiciosQr + ingServiciosQr - egServiciosQr + movServiciosQr)
  const totalFinServicios = round2(finServiciosEf + finServiciosQr)

  const finAfiliacionesEf = round2(
    antAfiliacionesEf + ingAfiliacionesEf - egAfiliacionesEf + movAfiliacionesEf
  )
  const finAfiliacionesQr = round2(
    antAfiliacionesQr + ingAfiliacionesQr - egAfiliacionesQr + movAfiliacionesQr
  )
  const totalFinAfiliaciones = round2(finAfiliacionesEf + finAfiliacionesQr)

  const totalEfectivoFinal = round2(finServiciosEf + finAfiliacionesEf)
  const totalQrFinal = round2(finServiciosQr + finAfiliacionesQr)
  const granTotalFinal = round2(totalEfectivoFinal + totalQrFinal)

  // 5. Deudores al corte del rango (Servicios del periodo + Afiliaciones + Deudores heredados)
  const deudoresServicios = cobrosServicios
    .filter((c) => {
      const periodo = c.periodos_mensuales
      if (!periodo) return false
      const pDate = new Date(periodo.anio, periodo.mes - 1, 1)
      if (pDate > fechaFinPeriodo) return false

      const pagosActivos = (c.pagos_servicios || []).filter((p) => p.estado === 'activo')
      const totalPagado = round2(pagosActivos.reduce((s, p) => s + (parseFloat(p.monto) || 0), 0))
      const totalAPagar = round2(parseFloat(c.total_a_pagar) || 0)
      return round2(totalAPagar - totalPagado) > 0
    })
    .map((c) => {
      const pagosActivos = (c.pagos_servicios || []).filter((p) => p.estado === 'activo')
      const totalPagado = round2(pagosActivos.reduce((s, p) => s + (parseFloat(p.monto) || 0), 0))
      const totalAPagar = round2(parseFloat(c.total_a_pagar) || 0)
      const saldo = round2(Math.max(0, totalAPagar - totalPagado))
      return {
        cobroId: c.id,
        unidadId: c.unidad_id,
        socioId:
          c.socio_id_historico ||
          c.unidades_cobro?.socio_responsable_id ||
          c.unidades_cobro?.socios?.id ||
          null,
        socio: getNombreSocioCobro(c),
        telefono: c.unidades_cobro?.socios?.telefono || '',
        puesto: c.unidades_cobro?.numero_identificador || '',
        periodo: `${c.periodos_mensuales?.mes}/${c.periodos_mensuales?.anio}`,
        totalAPagar,
        totalPagado,
        saldoPendiente: saldo,
        multa: round2(parseFloat(c.monto_multa) || 0),
      }
    })

  const deudoresAfiliaciones = afiliaciones
    .filter((a) => round2(parseFloat(a.saldo_pendiente) || 0) > 0 && a.estado !== 'anulada')
    .map((a) => {
      const pagosActivos = (a.pagos_afiliacion || []).filter((p) => p.estado === 'activo')
      const totalPagado = round2(pagosActivos.reduce((s, p) => s + (parseFloat(p.monto) || 0), 0))
      return {
        afiliacionId: a.id,
        socioId: a.socio_id || a.socios?.id || null,
        socio: a.socios?.nombre || 'Sin socio',
        telefono: a.socios?.telefono || '',
        totalPlan: round2(parseFloat(a.monto_total) || 1500),
        cuotaAcordada: round2(parseFloat(a.cuota_acordada) || 100),
        totalPagado,
        saldoPendiente: round2(parseFloat(a.saldo_pendiente) || 0),
      }
    })

  const deudoresAnteriores = (deudoresCiclos || [])
    .filter((d) => {
      if (!['pendiente', 'parcial'].includes(d.estado)) return false
      const orig = round2(parseFloat(d.monto_original) || 0)
      const pag = round2(parseFloat(d.monto_pagado) || 0)
      return round2(orig - pag) > 0
    })
    .map((d) => {
      const montoOriginal = round2(parseFloat(d.monto_original) || 0)
      const montoPagado = round2(parseFloat(d.monto_pagado) || 0)
      const saldoPendiente = round2(Math.max(0, montoOriginal - montoPagado))
      const cajaLabel = d.caja === 'afiliaciones' ? 'Afiliaciones' : 'Servicios'
      const puestoFmt = d.puesto_referencia
        ? `Puesto ${String(d.puesto_referencia).replace(/^puesto\s+/i, '').trim()}`
        : ''
      return {
        deudaId: d.id,
        socioId: d.socio_id || d.socios?.id || null,
        socio: d.nombre_deudor || d.socios?.nombre || 'Sin nombre',
        telefono: d.socios?.telefono || '',
        caja: d.caja || 'servicios',
        tipoDeuda: `Deuda Anterior (${cajaLabel})`,
        puestoReferencia: d.puesto_referencia || '',
        detalleDeuda: d.detalle_deuda || '',
        puestoDetalle: [puestoFmt, d.detalle_deuda].filter(Boolean).join(' — '),
        cicloOrigen: d.ciclo_origen || 'Gestión Anterior',
        montoOriginal,
        montoPagado,
        saldoPendiente,
        multa: 0,
      }
    })

  const subtotalMoraServicios = round2(
    deudoresServicios.reduce((s, d) => s + d.saldoPendiente, 0)
  )
  const subtotalMoraAfiliaciones = round2(
    deudoresAfiliaciones.reduce((s, a) => s + a.saldoPendiente, 0)
  )
  const subtotalMoraPeriodo = round2(subtotalMoraServicios + subtotalMoraAfiliaciones)
  const subtotalDeudasAnteriores = round2(
    deudoresAnteriores.reduce((s, d) => s + d.saldoPendiente, 0)
  )
  const totalGeneralMora = round2(subtotalMoraPeriodo + subtotalDeudasAnteriores)

  // 6. Resumen de Cumplimiento de Puestos en el Rango (evaluado sobre periodos mesInicio..mesFin)
  const unidadesActivas = (unidadesCobro || []).filter((u) => u.activo !== false)
  const unidadesPrincipalesActivas = unidadesActivas.filter((u) => !u.grupo_padre_id)
  const totalPuestosActivos = unidadesPrincipalesActivas.reduce(
    (sum, u) => sum + (parseInt(u.cantidad_puestos, 10) || 1),
    0
  )
  // Contar socios únicos sobre TODAS las unidades activas (principales + miembros de grupos)
  const sociosRepresentadosSet = new Set(
    unidadesActivas.map((u) => u.socio_responsable_id).filter(Boolean)
  )
  const totalSociosActivos = sociosRepresentadosSet.size

  const cobrosEnRango = cobrosServicios.filter((c) => {
    const p = c.periodos_mensuales
    if (!p) return false
    const pDate = new Date(p.anio, p.mes - 1, 1)
    return pDate >= fechaInicioPeriodo && pDate <= fechaFinPeriodo
  })

  // Agrupar cobros del rango por unidad de cobro
  const porUnidad = new Map()
  cobrosEnRango.forEach((c) => {
    const key = c.unidad_id || c.id
    if (!porUnidad.has(key)) {
      porUnidad.set(key, {
        puestos:
          parseInt(c.cantidad_puestos_aplicada, 10) ||
          parseInt(c.unidades_cobro?.cantidad_puestos, 10) ||
          1,
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
    const tot = round2(entry.totalAPagar)
    const pag = round2(entry.totalPagado)
    if (pag >= tot && tot > 0) {
      puestosPagados += entry.puestos
    } else if (pag > 0) {
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
    fechaInicio: fechaLimiteInicio,
    fechaFin: fechaLimiteFin,
    fechaInicioPeriodo,
    fechaFinPeriodo,
    // Saldos anteriores
    antServiciosEf,
    antServiciosQr,
    totalAntServicios: round2(antServiciosEf + antServiciosQr),
    antAfiliacionesEf,
    antAfiliacionesQr,
    totalAntAfiliaciones: round2(antAfiliacionesEf + antAfiliacionesQr),
    totalAntGeneral: round2(
      antServiciosEf + antServiciosQr + antAfiliacionesEf + antAfiliacionesQr
    ),

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
    totalIngresosGeneral,

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
      guardiaSocios: round2(guardiaSocios),
      guardiaExternos: round2(guardiaExternos),
      totalGuardia: round2(guardiaSocios + guardiaExternos),
      aguaSocios: round2(aguaSocios),
      aguaExternos: round2(aguaExternos),
      totalAgua: round2(aguaSocios + aguaExternos),
      totalLuzGrupo: round2(luzSocios),
      totalMultasSocios: round2(multasSocios),
      totalDeudoresServicios,
    },

    // Listas y Mora
    pagosServiciosRango,
    pagosAfiliacionRango,
    pagosDeudoresRango,
    cobrosExternosRango,
    egresosRango,
    movimientosRango,
    deudoresServicios,
    deudoresAfiliaciones,
    deudoresAnteriores,
    resumenMora: {
      subtotalMoraServicios,
      subtotalMoraAfiliaciones,
      subtotalMoraPeriodo,
      subtotalDeudasAnteriores,
      totalGeneralMora,
    },
  }
}
