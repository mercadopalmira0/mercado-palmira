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

-- ============================================================
-- GRUPOS DE COBRO Y TARIFA FIJA PERSONALIZADA
-- ============================================================
ALTER TABLE unidades_cobro
  ADD COLUMN IF NOT EXISTS grupo_padre_id UUID REFERENCES unidades_cobro(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS nombre_grupo TEXT;

CREATE INDEX IF NOT EXISTS idx_unidades_cobro_grupo_padre
  ON unidades_cobro(grupo_padre_id);

ALTER TABLE unidades_cobro
  ADD COLUMN IF NOT EXISTS monto_fijo_personalizado NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS monto_guardia_personalizado NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS monto_agua_personalizado NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS monto_luz_personalizado NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS detalle_tarifa_personalizada TEXT;

DO $$ DECLARE c RECORD; BEGIN FOR c IN SELECT conname FROM pg_constraint WHERE conrelid = 'public.unidades_cobro'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) ILIKE '%subtipo_fijo%' LOOP EXECUTE format('ALTER TABLE public.unidades_cobro DROP CONSTRAINT IF EXISTS %I;', c.conname); END LOOP; END $$;

-- Recargar caché de Supabase
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- MÓDULO: COBROS EXTRAS / CAMPAÑAS (FONDO INDEPENDIENTE)
-- ============================================================

-- 1. Campañas de Cobros Extras (ej. Aguinaldo Guardia 2026, Aniversario 2026)
CREATE TABLE IF NOT EXISTS cobros_extras_campanas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  monto_por_puesto NUMERIC(10,2) NOT NULL,
  incluye_ambulantes BOOLEAN NOT NULL DEFAULT FALSE,
  incluye_externos BOOLEAN NOT NULL DEFAULT FALSE,
  fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_limite DATE,
  estado TEXT NOT NULL DEFAULT 'abierta', -- 'abierta' | 'cerrada' | 'anulada'
  sobrante_transferido NUMERIC(10,2) DEFAULT 0,
  caja_destino_sobrante TEXT, -- 'servicios' | 'afiliaciones' | NULL
  fecha_cierre DATE,
  motivo_anulacion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Cuotas generadas por puesto/unidad o externo dentro de cada campaña
CREATE TABLE IF NOT EXISTS cobros_extras_cuotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campana_id UUID NOT NULL REFERENCES cobros_extras_campanas(id) ON DELETE CASCADE,
  unidad_id UUID REFERENCES unidades_cobro(id) ON DELETE SET NULL,
  externo_id UUID REFERENCES aportantes_externos(id) ON DELETE SET NULL,
  nombre_titular TEXT NOT NULL,
  puesto_referencia TEXT NOT NULL,
  cantidad_puestos INT NOT NULL DEFAULT 1,
  monto_esperado NUMERIC(10,2) NOT NULL, -- monto_por_puesto * cantidad_puestos
  monto_pagado NUMERIC(10,2) NOT NULL DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'pendiente', -- 'pendiente' | 'parcial' | 'pagado' | 'anulado'
  observaciones TEXT,
  motivo_anulacion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Pagos / Abonos de cada cuota extra (Efectivo o QR)
CREATE TABLE IF NOT EXISTS pagos_cobros_extras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cuota_id UUID NOT NULL REFERENCES cobros_extras_cuotas(id) ON DELETE CASCADE,
  campana_id UUID NOT NULL REFERENCES cobros_extras_campanas(id) ON DELETE CASCADE,
  monto NUMERIC(10,2) NOT NULL,
  metodo_pago TEXT NOT NULL DEFAULT 'efectivo', -- 'efectivo' | 'qr'
  nro_talonario_fisico TEXT,
  fecha_pago DATE NOT NULL DEFAULT CURRENT_DATE,
  observaciones TEXT,
  anulado BOOLEAN NOT NULL DEFAULT FALSE,
  motivo_anulacion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Gastos / Egresos propios de la campaña (ej. Pago Aguinaldo al Guardia, compras Aniversario)
CREATE TABLE IF NOT EXISTS egresos_cobros_extras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campana_id UUID NOT NULL REFERENCES cobros_extras_campanas(id) ON DELETE CASCADE,
  descripcion TEXT NOT NULL,
  monto NUMERIC(10,2) NOT NULL,
  metodo_pago TEXT NOT NULL DEFAULT 'efectivo', -- 'efectivo' | 'qr'
  fecha_egreso DATE NOT NULL DEFAULT CURRENT_DATE,
  foto_url TEXT,
  observaciones TEXT,
  anulado BOOLEAN NOT NULL DEFAULT FALSE,
  motivo_anulacion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS para usuarios autenticados
ALTER TABLE cobros_extras_campanas ENABLE ROW LEVEL SECURITY;
ALTER TABLE cobros_extras_cuotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos_cobros_extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE egresos_cobros_extras ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE t TEXT; BEGIN FOREACH t IN ARRAY ARRAY[ 'cobros_extras_campanas', 'cobros_extras_cuotas', 'pagos_cobros_extras', 'egresos_cobros_extras' ] LOOP EXECUTE format('DROP POLICY IF EXISTS "allow_auth_all_%s" ON %I;', t, t); EXECUTE format('CREATE POLICY "allow_auth_all_%s" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true);', t, t); END LOOP; END $$;

NOTIFY pgrst, 'reload schema';

-- ============================================================
-- BLINDAJE RLS ESTRICTO POR ROL (ADMIN vs DIRECTIVA SOLO LECTURA)
-- ============================================================

-- Funciones auxiliares SECURITY DEFINER (evitan recursión RLS sobre perfiles_usuarios)
CREATE OR REPLACE FUNCTION public.es_admin_activo()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.perfiles_usuarios
    WHERE id = auth.uid() AND rol = 'admin' AND activo = true
  );
$$;

CREATE OR REPLACE FUNCTION public.es_usuario_activo()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.perfiles_usuarios
    WHERE id = auth.uid() AND activo = true
  );
$$;

-- Mantener compatibilidad con public.es_admin() usada en schema.sql
CREATE OR REPLACE FUNCTION public.es_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT public.es_admin_activo();
$$;

-- Aplicar políticas restrictivas por rol en todas las tablas operativas de migraciones:
--   * SELECT: cualquier usuario activo (admin o directiva)
--   * INSERT / UPDATE / DELETE: únicamente admin activo
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'ciclos_hacienda',
    'deudores_ciclos',
    'pagos_deudores_ciclos',
    'campañas_perdonazo',
    'pagos_guardia',
    'aportantes_externos',
    'cobros_externos',
    'inventario_mercado',
    'traspasos_puestos',
    'cobros_extras_campanas',
    'cobros_extras_cuotas',
    'pagos_cobros_extras',
    'egresos_cobros_extras'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS "allow_auth_all_%s" ON public.%I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "rls_lectura_activos_%s" ON public.%I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "rls_admin_escritura_%s" ON public.%I;', t, t);

    EXECUTE format(
      'CREATE POLICY "rls_lectura_activos_%s" ON public.%I FOR SELECT TO authenticated USING (public.es_usuario_activo());',
      t, t
    );
    EXECUTE format(
      'CREATE POLICY "rls_admin_escritura_%s" ON public.%I FOR ALL TO authenticated USING (public.es_admin_activo()) WITH CHECK (public.es_admin_activo());',
      t, t
    );
  END LOOP;
END $$;

-- Reforzar inmutabilidad y acceso exclusivo de bitacora_auditoria
ALTER TABLE public.bitacora_auditoria ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bitacora_lectura_solo_admin" ON public.bitacora_auditoria;
DROP POLICY IF EXISTS "bitacora_insercion_usuarios" ON public.bitacora_auditoria;

CREATE POLICY "bitacora_lectura_solo_admin" ON public.bitacora_auditoria
  FOR SELECT TO authenticated
  USING (public.es_admin_activo());

CREATE POLICY "bitacora_insercion_usuarios" ON public.bitacora_auditoria
  FOR INSERT TO authenticated
  WITH CHECK (public.es_usuario_activo());

NOTIFY pgrst, 'reload schema';


