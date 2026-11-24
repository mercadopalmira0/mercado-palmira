/**
 * Reglas de Cálculo de Cobros, Tarifas, Luz, Multas y Desglose Interno (Guardia / Agua / Grupo Luz)
 * Secretaría de Hacienda - Mercado Palmira
 */

export function roundLuz(monto, tipoRedondeo = 'arriba_0_50') {
  if (!monto || monto <= 0) return 0
  if (tipoRedondeo === 'arriba_1_00') {
    return Math.ceil(monto)
  }
  return Math.ceil(monto * 2) / 2
}

export function calcularConsumo(lecturaAnt, lecturaAct, cambioTarifador = false) {
  const ant = parseFloat(lecturaAnt) || 0
  const act = parseFloat(lecturaAct) || 0
  if (cambioTarifador) {
    return Math.max(0, act)
  }
  return Math.max(0, act - ant)
}

export function calcularFechaVencimiento(mes, anio, diasProrroga = 0) {
  const finDeMes = new Date(anio, mes, 0, 23, 59, 59, 999)
  if (diasProrroga > 0) {
    finDeMes.setDate(finDeMes.getDate() + diasProrroga)
  }
  return finDeMes
}

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
 * Calcula el desglose interno automático por rubros (Guardia, Agua y Grupo Luz):
 * - Base por puesto: 40 Bs Guardia + 5 Bs Agua.
 * - Resto de la cuota fija (ej. 25 Bs en tarifa 70, 10 Bs en tarifa 55, 13 Bs en variable) + consumo de luz -> Grupo Luz.
 * - Si agrupa varios puestos (excepto regla 0 kWh que cobra 1 puesto cerrado de 55 Bs), multiplica Guardia y Agua por N puestos.
 */
export function calcularDesgloseRubrosBase({
  cantidadPuestos = 1,
  montoBase = 0,
  montoLuzRedondeado = 0,
  reglaCeroKwhAplicada = false,
}) {
  const puestosEfectivos = reglaCeroKwhAplicada ? 1 : Math.max(1, parseInt(cantidadPuestos, 10) || 1)
  const baseNum = parseFloat(montoBase) || 0
  const luzNum = parseFloat(montoLuzRedondeado) || 0

  const montoGuardia = 40 * puestosEfectivos
  const montoAgua = 5 * puestosEfectivos
  const restoFijo = Math.max(0, baseNum - montoGuardia - montoAgua)
  const montoLuzGrupo = restoFijo + luzNum

  return {
    montoGuardia,
    montoAgua,
    montoLuzGrupo,
  }
}

/**
 * Calcula el desglose completo del cobro para una unidad de cobro en un mes dado.
 * Respeta ediciones manuales por emergencia/reposición (esMontoEditado = true).
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
  perdonazoActivo = null,
  esMontoEditado = false,
  montoGuardiaEditado = null,
  montoAguaEditado = null,
  montoLuzGrupoEditado = null,
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

    if (consumoKwh === 0) {
      montoBase = tarifaCerrado
      montoLuzRedondeado = 0
      reglaCeroKwhAplicada = true
    } else {
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

  let montoGuardia = 0
  let montoAgua = 0
  let montoLuzGrupo = 0

  if (esMontoEditado) {
    montoGuardia = parseFloat(montoGuardiaEditado) || 0
    montoAgua = parseFloat(montoAguaEditado) || 0
    montoLuzGrupo = parseFloat(montoLuzGrupoEditado) || 0
  } else {
    const rubros = calcularDesgloseRubrosBase({
      cantidadPuestos,
      montoBase,
      montoLuzRedondeado,
      reglaCeroKwhAplicada,
    })
    montoGuardia = rubros.montoGuardia
    montoAgua = rubros.montoAgua
    montoLuzGrupo = rubros.montoLuzGrupo
  }

  const subtotalRubros = esMontoEditado
    ? montoGuardia + montoAgua + montoLuzGrupo
    : montoBase + montoLuzRedondeado

  const { diasRetraso, multaCalculada, motivoExencion } = calcularMultaMora({
    mes,
    anio,
    diasProrroga,
    fechaPagoEspecial,
    pagosActivos,
    tarifas,
  })

  const manualPerdon = parseFloat(multaPerdonada) || 0
  const multaDespuesManual = Math.max(0, multaCalculada - manualPerdon)

  const totalPagado = pagosActivos.reduce((sum, p) => sum + (parseFloat(p.monto) || 0), 0)
  const yaPagadoCompletoSinPerdonazo = totalPagado >= subtotalRubros + multaDespuesManual && totalPagado > 0

  let descuentoPerdonazo = 0
  let porcentajePerdonazo = 0
  if (perdonazoActivo && multaDespuesManual > 0 && !yaPagadoCompletoSinPerdonazo) {
    porcentajePerdonazo = parseFloat(perdonazoActivo.porcentaje_descuento) || 0
    descuentoPerdonazo = Math.round(multaDespuesManual * (porcentajePerdonazo / 100) * 100) / 100
  }

  const multaNeta = Math.max(0, multaDespuesManual - descuentoPerdonazo)
  const totalAPagar = subtotalRubros + multaNeta
  const saldoPendiente = Math.max(0, totalAPagar - totalPagado)

  let estado = 'pendiente'
  if (totalPagado >= totalAPagar && totalAPagar > 0) {
    estado = 'pagado'
  } else if (totalPagado > 0) {
    estado = 'parcial'
  }

  return {
    montoBase: esMontoEditado ? subtotalRubros : montoBase,
    consumoKwh,
    montoLuzRedondeado: esMontoEditado ? 0 : montoLuzRedondeado,
    reglaCeroKwhAplicada,
    montoGuardia,
    montoAgua,
    montoLuzGrupo,
    esMontoEditado: Boolean(esMontoEditado),
    diasRetraso,
    montoMulta: multaCalculada,
    multaPerdonada: manualPerdon,
    descuentoPerdonazo,
    porcentajePerdonazo,
    multaNeta,
    motivoExencion,
    totalAPagar,
    totalPagado,
    saldoPendiente,
    estado,
  }
}
