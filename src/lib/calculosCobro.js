/**
 * Reglas de Cálculo de Cobros, Tarifas, Luz y Multas
 * Secretaría de Hacienda - Mercado Palmira
 * 
 * Cumple estrictamente con contexto_hacienda_mercado_palmira.md
 */

/**
 * Redondea el monto de luz siempre hacia arriba según la configuración.
 * @param {number} monto 
 * @param {string} tipoRedondeo - 'arriba_0_50' | 'arriba_1_00'
 * @returns {number}
 */
export function roundLuz(monto, tipoRedondeo = 'arriba_0_50') {
  if (!monto || monto <= 0) return 0
  if (tipoRedondeo === 'arriba_1_00') {
    return Math.ceil(monto)
  }
  // arriba_0_50: redondeo hacia arriba al múltiplo de 0.50 más cercano
  return Math.ceil(monto * 2) / 2
}

/**
 * Calcula el consumo de energía en kWh.
 * @param {number} lecturaAnt 
 * @param {number} lecturaAct 
 * @param {boolean} cambioTarifador 
 * @returns {number}
 */
export function calcularConsumo(lecturaAnt, lecturaAct, cambioTarifador = false) {
  const ant = parseFloat(lecturaAnt) || 0
  const act = parseFloat(lecturaAct) || 0
  if (cambioTarifador) {
    return Math.max(0, act)
  }
  return Math.max(0, act - ant)
}

/**
 * Calcula la fecha de vencimiento base del mes (último día del mes correspondiente).
 * @param {number} mes - 1 a 12
 * @param {number} anio 
 * @param {number} diasProrroga - Días de extensión (máx 2)
 * @returns {Date}
 */
export function calcularFechaVencimiento(mes, anio, diasProrroga = 0) {
  // Último día del mes: new Date(anio, mes, 0)
  const finDeMes = new Date(anio, mes, 0, 23, 59, 59, 999)
  if (diasProrroga > 0) {
    finDeMes.setDate(finDeMes.getDate() + diasProrroga)
  }
  return finDeMes
}

/**
 * Calcula la multa por mora según las reglas de negocio:
 * - Inicia el 1 del mes siguiente a razón de 10 Bs por día.
 * - Tope máximo de 70 Bs por mes.
 * - Exención si abonó al menos 35 Bs (o mínimo exento configurado) antes del vencimiento.
 * - Exención si cuenta con fecha_pago_especial vigente aprobada por directiva.
 * - Prórroga de hasta 2 días sin multa.
 * 
 * @param {Object} params
 * @param {number} params.mes
 * @param {number} params.anio
 * @param {number} params.diasProrroga
 * @param {string|null} params.fechaPagoEspecial - 'YYYY-MM-DD'
 * @param {Array} params.pagosActivos - Lista de pagos no anulados
 * @param {Object} params.tarifas - Configuración de tarifas vigentes
 * @param {Date} [params.fechaActual] - Fecha de cálculo (default: hoy)
 * @returns {{ diasRetraso: number, multaCalculada: number, motivoExencion: string|null }}
 */
export function calcularMultaMora({
  mes,
  anio,
  diasProrroga = 0,
  fechaPagoEspecial = null,
  pagosActivos = [],
  tarifas = {},
  fechaActual = new Date(),
}) {
  const multaDiaria = parseFloat(tarifas.multa_diaria) || 10
  const multaTope = parseFloat(tarifas.multa_tope_mensual) || 70
  const minimoExento = parseFloat(tarifas.multa_minimo_exento) || 35

  const fechaVencimiento = calcularFechaVencimiento(mes, anio, diasProrroga)

  // 1. Exención por Fecha de Pago Especial acordada con la directiva
  if (fechaPagoEspecial) {
    const [y, m, d] = fechaPagoEspecial.split('-').map(Number)
    const fechaEspecial = new Date(y, m - 1, d, 23, 59, 59)
    if (fechaActual <= fechaEspecial) {
      return {
        diasRetraso: 0,
        multaCalculada: 0,
        motivoExencion: `Exento por acuerdo con mesa directiva (límite: ${fechaPagoEspecial})`,
      }
    }
  }

  // 2. Exención si ya abonó al menos el monto mínimo exento (35 Bs)
  const totalAbonadoAntes = pagosActivos
    .filter((p) => new Date(p.fecha_pago) <= fechaVencimiento)
    .reduce((sum, p) => sum + (parseFloat(p.monto) || 0), 0)

  if (totalAbonadoAntes >= minimoExento) {
    return {
      diasRetraso: 0,
      multaCalculada: 0,
      motivoExencion: `Exento de multa: abonó ${totalAbonadoAntes.toFixed(2)} Bs (mínimo ${minimoExento} Bs)`,
    }
  }

  // 3. Cálculo de días de retraso a partir del vencimiento
  if (fechaActual <= fechaVencimiento) {
    return {
      diasRetraso: 0,
      multaCalculada: 0,
      motivoExencion: 'Dentro del periodo hábil de cobro',
    }
  }

  const diffMs = fechaActual.getTime() - fechaVencimiento.getTime()
  const diasRetraso = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
  const multaCalculada = Math.min(diasRetraso * multaDiaria, multaTope)

  return {
    diasRetraso,
    multaCalculada,
    motivoExencion: null,
  }
}

/**
 * Calcula el desglose completo del cobro para una unidad de cobro en un mes dado.
 * @param {Object} params
 * @returns {Object} Desglose detallado
 */
export function calcularDesgloseCobro({
  modalidadAplicada,
  cantidadPuestos = 1,
  lecturaAnt = 0,
  lecturaAct = 0,
  cambioTarifador = false,
  precioKwh = 0,
  tarifas = {},
  diasProrroga = 0,
  fechaPagoEspecial = null,
  multaPerdonada = 0,
  pagosActivos = [],
  mes,
  anio,
}) {
  const baseVariable = parseFloat(tarifas.base_variable_puesto) || 58
  const tarifaCerrado = parseFloat(tarifas.tarifa_fija_cerrado) || 55
  const tarifaAbierto = parseFloat(tarifas.tarifa_fija_abierto) || 70
  const tarifaAmbulante = parseFloat(tarifas.tarifa_fija_ambulante) || 50
  const tarifaNoSocio = parseFloat(tarifas.tarifa_fija_no_socio) || 50
  const tipoRedondeo = tarifas.tipo_redondeo_luz || 'arriba_0_50'

  let montoBase = 0
  let consumoKwh = 0
  let montoLuzRedondeado = 0
  let reglaCeroKwhAplicada = false

  if (modalidadAplicada === 'variable') {
    consumoKwh = calcularConsumo(lecturaAnt, lecturaAct, cambioTarifador)

    // REGLA 0 KWH: Si el consumo marca 0 kWh, se cobra automáticamente la tarifa fija de puesto cerrado (55 Bs)
    if (consumoKwh === 0) {
      montoBase = tarifaCerrado
      montoLuzRedondeado = 0
      reglaCeroKwhAplicada = true
    } else {
      // Puestos agrupados: multiplica la base variable por los puestos
      montoBase = baseVariable * (parseInt(cantidadPuestos, 10) || 1)
      const luzCruda = consumoKwh * (parseFloat(precioKwh) || 0)
      montoLuzRedondeado = roundLuz(luzCruda, tipoRedondeo)
    }
  } else if (modalidadAplicada === 'puesto_cerrado') {
    montoBase = tarifaCerrado
  } else if (modalidadAplicada === 'puesto_abierto') {
    montoBase = tarifaAbierto
  } else if (modalidadAplicada === 'ambulante') {
    montoBase = tarifaAmbulante
  } else if (modalidadAplicada === 'no_socio') {
    montoBase = tarifaNoSocio
  } else {
    montoBase = baseVariable
  }

  // Multa
  const { diasRetraso, multaCalculada, motivoExencion } = calcularMultaMora({
    mes,
    anio,
    diasProrroga,
    fechaPagoEspecial,
    pagosActivos,
    tarifas,
  })

  const multaNeta = Math.max(0, multaCalculada - (parseFloat(multaPerdonada) || 0))
  const totalAPagar = montoBase + montoLuzRedondeado + multaNeta

  const totalPagado = pagosActivos.reduce((sum, p) => sum + (parseFloat(p.monto) || 0), 0)
  const saldoPendiente = Math.max(0, totalAPagar - totalPagado)

  let estado = 'pendiente'
  if (totalPagado >= totalAPagar && totalAPagar > 0) {
    estado = 'pagado'
  } else if (totalPagado > 0) {
    estado = 'parcial'
  }

  return {
    montoBase,
    consumoKwh,
    montoLuzRedondeado,
    reglaCeroKwhAplicada,
    diasRetraso,
    montoMulta: multaCalculada,
    multaPerdonada: parseFloat(multaPerdonada) || 0,
    multaNeta,
    motivoExencion,
    totalAPagar,
    totalPagado,
    saldoPendiente,
    estado,
  }
}
