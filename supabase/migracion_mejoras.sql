-- ============================================================
-- PARTE 1: PAQUETE DE 9 MEJORAS OPERATIVAS
-- ============================================================

-- 1. Desglose real de Factura de Luz y control de pago (Puntos 5 y 6)
ALTER TABLE periodos_mensuales
  ADD COLUMN IF NOT EXISTS factura_energia_bs NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS factura_alumbrado_bs NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS factura_basura_bs NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estado_pago_factura TEXT DEFAULT 'pendiente_pago', -- 'pendiente_pago' | 'pagada'
  ADD COLUMN IF NOT EXISTS fecha_pago_factura DATE,
  ADD COLUMN IF NOT EXISTS metodo_pago_factura TEXT,
  ADD COLUMN IF NOT EXISTS foto_comprobante_pago_luz TEXT;

-- 2. Sueldo del guardia configurable (Punto 7)
ALTER TABLE configuracion_tarifas
  ADD COLUMN IF NOT EXISTS sueldo_guardia_mensual NUMERIC(10,2) DEFAULT 0;

-- 3. Control de Ciclos / Saldos Iniciales y Cierres de Rendición (Punto 2)
CREATE TABLE IF NOT EXISTS ciclos_hacienda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_cierre DATE,
  es_inicial BOOLEAN DEFAULT FALSE,
  estado TEXT NOT NULL DEFAULT 'abierto', -- 'abierto' | 'cerrado'
  servicios_efectivo_inicial NUMERIC(10,2) NOT NULL DEFAULT 0,
  servicios_qr_inicial NUMERIC(10,2) NOT NULL DEFAULT 0,
  afiliaciones_efectivo_inicial NUMERIC(10,2) NOT NULL DEFAULT 0,
  afiliaciones_qr_inicial NUMERIC(10,2) NOT NULL DEFAULT 0,
  servicios_efectivo_final NUMERIC(10,2),
  servicios_qr_final NUMERIC(10,2),
  afiliaciones_efectivo_final NUMERIC(10,2),
  afiliaciones_qr_final NUMERIC(10,2),
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Deudores Heredados y de Ciclos Anteriores (Punto 3)
CREATE TABLE IF NOT EXISTS deudores_ciclos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  socio_id UUID REFERENCES socios(id) ON DELETE SET NULL,
  nombre_deudor TEXT NOT NULL,
  puesto_referencia TEXT,
  caja TEXT NOT NULL DEFAULT 'servicios', -- 'servicios' | 'afiliaciones'
  origen TEXT NOT NULL DEFAULT 'tesorero_anterior', -- 'tesorero_anterior' | 'cierre_ciclo'
  ciclo_origen TEXT,
  detalle_deuda TEXT NOT NULL,
  monto_original NUMERIC(10,2) NOT NULL,
  monto_pagado NUMERIC(10,2) NOT NULL DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'pendiente', -- 'pendiente' | 'parcial' | 'pagado' | 'anulado'
  motivo_anulacion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pagos_deudores_ciclos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deuda_id UUID NOT NULL REFERENCES deudores_ciclos(id) ON DELETE CASCADE,
  monto NUMERIC(10,2) NOT NULL,
  metodo_pago TEXT NOT NULL DEFAULT 'efectivo', -- 'efectivo' | 'qr'
  nro_talonario_fisico TEXT,
  fecha_pago DATE NOT NULL DEFAULT CURRENT_DATE,
  observaciones TEXT,
  anulado BOOLEAN NOT NULL DEFAULT FALSE,
  motivo_anulacion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Campañas de Perdonazo de Multas (Punto 4)
CREATE TABLE IF NOT EXISTS campañas_perdonazo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  porcentaje_descuento NUMERIC(5,2) NOT NULL CHECK (porcentaje_descuento > 0 AND porcentaje_descuento <= 100),
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Adelantos y Sueldo del Guardia (Punto 7)
CREATE TABLE IF NOT EXISTS pagos_guardia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anio INT NOT NULL,
  mes INT NOT NULL,
  tipo TEXT NOT NULL, -- 'adelanto_quincena' | 'adelanto_emergencia' | 'saldo_fin_mes'
  monto NUMERIC(10,2) NOT NULL,
  metodo_pago TEXT NOT NULL DEFAULT 'efectivo',
  fecha_pago DATE NOT NULL DEFAULT CURRENT_DATE,
  foto_vale_url TEXT,
  observaciones TEXT,
  egreso_id UUID,
  anulado BOOLEAN NOT NULL DEFAULT FALSE,
  motivo_anulacion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Aportantes Externos (No Socios - Guardia y Agua) (Punto 9)
CREATE TABLE IF NOT EXISTS aportantes_externos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_completo TEXT NOT NULL,
  telefono TEXT,
  referencia_ubicacion TEXT,
  monto_mensual_sugerido NUMERIC(10,2) NOT NULL DEFAULT 0,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cobros_externos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  externo_id UUID NOT NULL REFERENCES aportantes_externos(id) ON DELETE CASCADE,
  anio INT NOT NULL,
  mes INT NOT NULL,
  monto_correspondiente NUMERIC(10,2) NOT NULL,
  monto_pagado NUMERIC(10,2) NOT NULL DEFAULT 0,
  metodo_pago TEXT NOT NULL DEFAULT 'efectivo',
  nro_talonario_fisico TEXT,
  fecha_pago DATE NOT NULL DEFAULT CURRENT_DATE,
  observaciones TEXT,
  anulado BOOLEAN NOT NULL DEFAULT FALSE,
  motivo_anulacion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PARTE 2: INVENTARIO DEL MERCADO Y TRASPASO/VENTA DE PUESTOS
-- ============================================================

-- 8. Inventario / Bienes del Mercado
CREATE TABLE IF NOT EXISTS inventario_mercado (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'Útiles / Insumos',
  cantidad NUMERIC(10,2) NOT NULL DEFAULT 1,
  unidad_medida TEXT DEFAULT 'unidades',
  origen TEXT NOT NULL DEFAULT 'comprado_gestion', -- 'directiva_anterior' | 'comprado_gestion'
  fecha_adquisicion DATE NOT NULL DEFAULT CURRENT_DATE,
  costo_referencial NUMERIC(10,2) DEFAULT 0,
  responsable_ubicacion TEXT,
  estado TEXT NOT NULL DEFAULT 'en_uso', -- 'en_uso' | 'en_deposito' | 'agotado' | 'danado_baja'
  foto_url TEXT,
  observaciones TEXT,
  motivo_baja TEXT,
  anulado BOOLEAN NOT NULL DEFAULT FALSE,
  motivo_anulacion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Historial de Traspasos / Venta de Puestos
CREATE TABLE IF NOT EXISTS traspasos_puestos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unidad_cobro_id UUID NOT NULL,
  puesto_referencia TEXT NOT NULL,
  socio_anterior_id UUID REFERENCES socios(id) ON DELETE SET NULL,
  nombre_socio_anterior TEXT NOT NULL,
  socio_nuevo_id UUID REFERENCES socios(id) ON DELETE SET NULL,
  nombre_socio_nuevo TEXT NOT NULL,
  fecha_traspaso DATE NOT NULL DEFAULT CURRENT_DATE,
  incluye_afiliacion_nueva BOOLEAN NOT NULL DEFAULT FALSE,
  documento_respaldo_url TEXT,
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Columnas históricas en cobros_servicios
ALTER TABLE cobros_servicios
  ADD COLUMN IF NOT EXISTS socio_id_historico UUID,
  ADD COLUMN IF NOT EXISTS nombre_socio_historico TEXT;

-- 11. Permisos para roles Supabase
GRANT USAGE ON SCHEMA public TO authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

-- ============================================================
-- DESGLOSE INTERNO (GUARDIA / AGUA / LUZ) Y MONTOS EDITABLES
-- ============================================================

-- 1. Desglose interno y ajuste manual en cobros de socios
ALTER TABLE cobros_servicios
  ADD COLUMN IF NOT EXISTS monto_guardia NUMERIC(10,2) DEFAULT 40,
  ADD COLUMN IF NOT EXISTS monto_agua NUMERIC(10,2) DEFAULT 5,
  ADD COLUMN IF NOT EXISTS monto_luz_grupo NUMERIC(10,2) DEFAULT 0, -- incluye consumo + alumbrado + basura / apoyo luz
  ADD COLUMN IF NOT EXISTS es_monto_editado BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS motivo_edicion_monto TEXT;

-- 2. Desglose interno en aportantes externos (Otra asociación: 40 Guardia + 10 Agua)
ALTER TABLE aportantes_externos
  ADD COLUMN IF NOT EXISTS monto_guardia_base NUMERIC(10,2) DEFAULT 40,
  ADD COLUMN IF NOT EXISTS monto_agua_base NUMERIC(10,2) DEFAULT 10;

ALTER TABLE cobros_externos
  ADD COLUMN IF NOT EXISTS monto_guardia NUMERIC(10,2) DEFAULT 40,
  ADD COLUMN IF NOT EXISTS monto_agua NUMERIC(10,2) DEFAULT 10,
  ADD COLUMN IF NOT EXISTS es_monto_editado BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS motivo_edicion_monto TEXT;

-- Recargar caché de Supabase
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- FACTURA DE AGUA MENSUAL + CATEGORÍA LIBRE EN EGRESOS
-- ============================================================

-- 1. Control mensual de Factura de Agua en periodos_mensuales
ALTER TABLE periodos_mensuales
  ADD COLUMN IF NOT EXISTS factura_agua_bs NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estado_pago_agua TEXT DEFAULT 'pendiente_pago', -- 'pendiente_pago' | 'pagada'
  ADD COLUMN IF NOT EXISTS fecha_pago_agua DATE,
  ADD COLUMN IF NOT EXISTS metodo_pago_agua TEXT,
  ADD COLUMN IF NOT EXISTS foto_factura_agua TEXT,
  ADD COLUMN IF NOT EXISTS foto_comprobante_pago_agua TEXT,
  ADD COLUMN IF NOT EXISTS egreso_agua_id UUID;

-- 2. Asegurar que la categoría de egresos acepte escritura libre (sin restricciones cerradas)
ALTER TABLE egresos
  ALTER COLUMN categoria TYPE TEXT;

-- ============================================================
-- DESGLOSE DE 3 RUBROS EN FACTURA DE AGUA
-- ============================================================
ALTER TABLE periodos_mensuales
  ADD COLUMN IF NOT EXISTS factura_agua_potable_bs NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS factura_alcantarillado_bs NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS factura_agua_aporte_socio_bs NUMERIC(10,2) DEFAULT 0;

-- Recargar caché de Supabase
NOTIFY pgrst, 'reload schema';


