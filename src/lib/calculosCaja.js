/**
 * Utilidad de cálculo de arqueo en tiempo real para las dos cajas
 * Secretaría de Hacienda - Mercado Palmira
 * 
 * Regla de negocio:
 * Saldo Actual = Saldos Iniciales + Ingresos Activos - Egresos Activos ± Movimientos Internos
 */

export function calcularArqueoReal({
  saldosIniciales = [],
  pagosServicios = [],
  pagosAfiliacion = [],
  egresos = [],
  movimientosInternos = [],
}) {
  let serviciosEfectivo = 0
  let serviciosQr = 0
  let afiliacionesEfectivo = 0
  let afiliacionesQr = 0

  // 1. Saldos iniciales
  saldosIniciales.forEach((s) => {
    const monto = parseFloat(s.monto_inicial) || 0
    if (s.caja === 'servicios') {
      if (s.metodo_pago === 'efectivo') serviciosEfectivo += monto
      if (s.metodo_pago === 'qr') serviciosQr += monto
    } else if (s.caja === 'afiliaciones') {
      if (s.metodo_pago === 'efectivo') afiliacionesEfectivo += monto
      if (s.metodo_pago === 'qr') afiliacionesQr += monto
    }
  })

  // 2. Ingresos de Servicios Básicos (pagos activos)
  pagosServicios
    .filter((p) => p.estado === 'activo')
    .forEach((p) => {
      const monto = parseFloat(p.monto) || 0
      if (p.metodo_pago === 'efectivo') serviciosEfectivo += monto
      if (p.metodo_pago === 'qr') serviciosQr += monto
    })

  // 3. Ingresos de Afiliaciones (pagos activos)
  pagosAfiliacion
    .filter((p) => p.estado === 'activo')
    .forEach((p) => {
      const monto = parseFloat(p.monto) || 0
      if (p.metodo_pago === 'efectivo') afiliacionesEfectivo += monto
      if (p.metodo_pago === 'qr') afiliacionesQr += monto
    })

  // 4. Egresos (descuentan de la caja y método correspondiente)
  egresos
    .filter((e) => e.estado === 'activo')
    .forEach((e) => {
      const monto = parseFloat(e.monto) || 0
      if (e.caja === 'servicios') {
        if (e.metodo_pago === 'efectivo') serviciosEfectivo -= monto
        if (e.metodo_pago === 'qr') serviciosQr -= monto
      } else if (e.caja === 'afiliaciones') {
        if (e.metodo_pago === 'efectivo') afiliacionesEfectivo -= monto
        if (e.metodo_pago === 'qr') afiliacionesQr -= monto
      }
    })

  // 5. Movimientos Internos (Efectivo <-> QR y Préstamos/Reposiciones entre cajas)
  movimientosInternos
    .filter((m) => m.estado === 'activo')
    .forEach((m) => {
      const monto = parseFloat(m.monto) || 0

      if (m.tipo === 'retiro_qr_a_efectivo') {
        // Retiro del cajero/banco (QR) a efectivo físico en mano
        if (m.caja_origen === 'servicios') {
          serviciosQr -= monto
          serviciosEfectivo += monto
        } else if (m.caja_origen === 'afiliaciones') {
          afiliacionesQr -= monto
          afiliacionesEfectivo += monto
        }
      } else if (m.tipo === 'deposito_efectivo_a_qr') {
        // Depósito de efectivo físico a cuenta bancaria/QR
        if (m.caja_origen === 'servicios') {
          serviciosEfectivo -= monto
          serviciosQr += monto
        } else if (m.caja_origen === 'afiliaciones') {
          afiliacionesEfectivo -= monto
          afiliacionesQr += monto
        }
      } else if (m.tipo === 'prestamo_entre_cajas') {
        // Préstamo de una caja a otra
        if (m.caja_origen === 'servicios') serviciosEfectivo -= monto
        if (m.caja_origen === 'afiliaciones') afiliacionesEfectivo -= monto

        if (m.caja_destino === 'servicios') serviciosEfectivo += monto
        if (m.caja_destino === 'afiliaciones') afiliacionesEfectivo += monto
      } else if (m.tipo === 'reposicion_prestamo') {
        // Devolución / reposición del préstamo
        if (m.caja_origen === 'servicios') serviciosEfectivo -= monto
        if (m.caja_origen === 'afiliaciones') afiliacionesEfectivo -= monto

        if (m.caja_destino === 'servicios') serviciosEfectivo += monto
        if (m.caja_destino === 'afiliaciones') afiliacionesEfectivo += monto
      }
    })

  const totalServicios = serviciosEfectivo + serviciosQr
  const totalAfiliaciones = afiliacionesEfectivo + afiliacionesQr
  const totalEfectivoEnMano = serviciosEfectivo + afiliacionesEfectivo
  const totalQrEnBanco = serviciosQr + afiliacionesQr
  const granTotal = totalEfectivoEnMano + totalQrEnBanco

  return {
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
