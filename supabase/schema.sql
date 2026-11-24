-- ==============================================================================
-- HACIENDA MERCADO PALMIRA - ESQUEMA DE BASE DE DATOS SUPABASE
-- FASE 1: Base de datos, Tablas, Restricciones y Políticas RLS
-- Generado para ejecutar en el SQL Editor de Supabase
-- ==============================================================================

-- 1. EXTENSIONES Y FUNCIONES DE UTILIDAD
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 2. TABLAS DE SEGURIDAD, AUDITORÍA Y PERFILES
-- ==============================================================================

-- Perfiles de usuarios vinculados a Supabase Auth
CREATE TABLE IF NOT EXISTS public.perfiles_usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre VARCHAR(150),
  cargo VARCHAR(100),
  rol VARCHAR(20) NOT NULL DEFAULT 'directiva' CHECK (rol IN ('admin', 'directiva')),
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  sesion_actual_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Dispositivos conocidos para control de cuentas compartidas
CREATE TABLE IF NOT EXISTS public.dispositivos_conocidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES public.perfiles_usuarios(id) ON DELETE CASCADE,
  device_id VARCHAR(100) NOT NULL,
  info_dispositivo TEXT,
  autorizado BOOLEAN NOT NULL DEFAULT TRUE,
  primer_acceso TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ultimo_acceso TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_usuario_dispositivo UNIQUE (usuario_id, device_id)
);

-- Bitácora de auditoría inmutable (solo visible para admin)
CREATE TABLE IF NOT EXISTS public.bitacora_auditoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES public.perfiles_usuarios(id) ON DELETE SET NULL,
  accion VARCHAR(100) NOT NULL,
  detalle_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  device_id VARCHAR(100),
  ip_address VARCHAR(50),
  user_agent TEXT,
  es_sospechoso BOOLEAN NOT NULL DEFAULT FALSE,
  fecha_hora TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 3. FUNCIONES DE VALIDACIÓN DE ROL Y ESTADO (SECURITY DEFINER)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.es_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
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
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.perfiles_usuarios
    WHERE id = auth.uid() AND activo = true
  );
$$;

-- Trigger para sincronizar auth.users con perfiles_usuarios al crearse usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.perfiles_usuarios (id, nombre, cargo, rol, activo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'cargo', 'Miembro Directiva'),
    COALESCE(NEW.raw_user_meta_data->>'rol', 'directiva'),
    TRUE
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 4. CONFIGURACIÓN DE TARIFAS Y SALDOS INICIALES
-- ==============================================================================

-- Configuración de tarifas (valores vigentes y rastreo)
CREATE TABLE IF NOT EXISTS public.configuracion_tarifas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tarifa_fija_cerrado NUMERIC(10,2) NOT NULL DEFAULT 55.00,
  tarifa_fija_abierto NUMERIC(10,2) NOT NULL DEFAULT 70.00,
  tarifa_fija_ambulante NUMERIC(10,2) NOT NULL DEFAULT 50.00,
  tarifa_fija_no_socio NUMERIC(10,2) NOT NULL DEFAULT 50.00,
  base_variable_puesto NUMERIC(10,2) NOT NULL DEFAULT 58.00,
  multa_diaria NUMERIC(10,2) NOT NULL DEFAULT 10.00,
  multa_tope_mensual NUMERIC(10,2) NOT NULL DEFAULT 70.00,
  multa_minimo_exento NUMERIC(10,2) NOT NULL DEFAULT 35.00,
  costo_afiliacion NUMERIC(10,2) NOT NULL DEFAULT 1500.00,
  tipo_redondeo_luz VARCHAR(20) NOT NULL DEFAULT 'arriba_0_50' CHECK (tipo_redondeo_luz IN ('arriba_0_50', 'arriba_1_00')),
  dias_prorroga_max INT NOT NULL DEFAULT 2,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Saldos iniciales de arranque (Caja Servicios y Caja Afiliaciones)
CREATE TABLE IF NOT EXISTS public.saldos_iniciales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caja VARCHAR(20) NOT NULL CHECK (caja IN ('servicios', 'afiliaciones')),
  metodo_pago VARCHAR(10) NOT NULL CHECK (metodo_pago IN ('efectivo', 'qr')),
  monto_inicial NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (monto_inicial >= 0),
  fecha_arranque DATE NOT NULL DEFAULT CURRENT_DATE,
  observaciones TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_caja_metodo UNIQUE (caja, metodo_pago)
);

-- ==============================================================================
-- 5. PADRÓN DE SOCIOS Y UNIDADES DE COBRO
-- ==============================================================================

-- Socios del mercado (~80 socios)
CREATE TABLE IF NOT EXISTS public.socios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(150) NOT NULL,
  telefono VARCHAR(30),
  fecha_pago_especial DATE,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unidades de cobro (permite agrupar 2 o más puestos bajo un mismo cobro y tarifador)
CREATE TABLE IF NOT EXISTS public.unidades_cobro (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  socio_responsable_id UUID REFERENCES public.socios(id) ON DELETE SET NULL,
  numero_identificador VARCHAR(50) NOT NULL,
  nombres_titulares TEXT,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('fijo', 'variable')),
  subtipo_fijo VARCHAR(30) CHECK (subtipo_fijo IN ('puesto_cerrado', 'puesto_abierto', 'ambulante', 'no_socio')),
  cantidad_puestos INT NOT NULL DEFAULT 1 CHECK (cantidad_puestos >= 1),
  codigo_tarifador VARCHAR(50),
  ultima_lectura NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 6. PERIODOS MENSUALES Y COBROS DE SERVICIOS
-- ==============================================================================

-- Periodos mensuales (factura general de luz y estado de rendición)
CREATE TABLE IF NOT EXISTS public.periodos_mensuales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mes INT NOT NULL CHECK (mes BETWEEN 1 AND 12),
  anio INT NOT NULL CHECK (anio >= 2020),
  factura_luz_bs NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (factura_luz_bs >= 0),
  factura_luz_kwh NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (factura_luz_kwh >= 0),
  precio_kwh_calculado NUMERIC(10,4) NOT NULL DEFAULT 0.0000,
  factura_luz_drive_url TEXT,
  rendido_en_asamblea BOOLEAN NOT NULL DEFAULT FALSE,
  fecha_rendicion TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_periodo_mes_anio UNIQUE (mes, anio)
);

-- Cobros de servicios (foto histórica mensual por puesto / unidad)
CREATE TABLE IF NOT EXISTS public.cobros_servicios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unidad_id UUID NOT NULL REFERENCES public.unidades_cobro(id) ON DELETE RESTRICT,
  periodo_id UUID NOT NULL REFERENCES public.periodos_mensuales(id) ON DELETE RESTRICT,
  modalidad_aplicada VARCHAR(30) NOT NULL,
  cantidad_puestos_aplicada INT NOT NULL DEFAULT 1 CHECK (cantidad_puestos_aplicada >= 1),
  lectura_ant NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  lectura_act NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  cambio_tarifador BOOLEAN NOT NULL DEFAULT FALSE,
  monto_base NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (monto_base >= 0),
  monto_luz_redondeado NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (monto_luz_redondeado >= 0),
  dias_prorroga INT NOT NULL DEFAULT 0 CHECK (dias_prorroga >= 0),
  monto_multa NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (monto_multa >= 0),
  multa_perdonada NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (multa_perdonada >= 0),
  motivo_perdon_multa TEXT,
  total_a_pagar NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (total_a_pagar >= 0),
  foto_tarifador_drive_url TEXT,
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'parcial', 'pagado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_cobro_unidad_periodo UNIQUE (unidad_id, periodo_id)
);

-- Pagos de servicios (abonos parciales o totales, anulaciones con motivo)
CREATE TABLE IF NOT EXISTS public.pagos_servicios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cobro_id UUID NOT NULL REFERENCES public.cobros_servicios(id) ON DELETE RESTRICT,
  monto NUMERIC(10,2) NOT NULL CHECK (monto > 0),
  metodo_pago VARCHAR(10) NOT NULL CHECK (metodo_pago IN ('efectivo', 'qr')),
  nro_talonario_fisico VARCHAR(50),
  estado VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'anulado')),
  motivo_anulacion TEXT,
  comprobante_drive_url TEXT,
  fecha_pago TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 7. AFILIACIONES Y PAGOS DE AFILIACIÓN
-- ==============================================================================

-- Afiliaciones (plan de pagos para socios nuevos)
CREATE TABLE IF NOT EXISTS public.afiliaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  socio_id UUID NOT NULL REFERENCES public.socios(id) ON DELETE RESTRICT,
  monto_total NUMERIC(10,2) NOT NULL DEFAULT 1500.00 CHECK (monto_total > 0),
  cuota_acordada NUMERIC(10,2) NOT NULL DEFAULT 100.00 CHECK (cuota_acordada > 0),
  saldo_pendiente NUMERIC(10,2) NOT NULL DEFAULT 1500.00 CHECK (saldo_pendiente >= 0),
  estado VARCHAR(20) NOT NULL DEFAULT 'en_curso' CHECK (estado IN ('en_curso', 'completada', 'anulada')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pagos de afiliación
CREATE TABLE IF NOT EXISTS public.pagos_afiliacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  afiliacion_id UUID NOT NULL REFERENCES public.afiliaciones(id) ON DELETE RESTRICT,
  monto NUMERIC(10,2) NOT NULL CHECK (monto > 0),
  metodo_pago VARCHAR(10) NOT NULL CHECK (metodo_pago IN ('efectivo', 'qr')),
  nro_talonario_fisico VARCHAR(50),
  estado VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'anulado')),
  motivo_anulacion TEXT,
  comprobante_drive_url TEXT,
  fecha_pago TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 8. EGRESOS Y MOVIMIENTOS INTERNOS
-- ==============================================================================

-- Egresos (Caja Servicios Básicos vs Caja Afiliaciones)
CREATE TABLE IF NOT EXISTS public.egresos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caja VARCHAR(20) NOT NULL CHECK (caja IN ('servicios', 'afiliaciones')),
  categoria VARCHAR(100) NOT NULL,
  descripcion TEXT NOT NULL,
  monto NUMERIC(10,2) NOT NULL CHECK (monto > 0),
  metodo_pago VARCHAR(10) NOT NULL CHECK (metodo_pago IN ('efectivo', 'qr')),
  estado VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'anulado')),
  motivo_anulacion TEXT,
  recibo_drive_url TEXT,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Movimientos internos (QR <-> Efectivo y préstamos/reposiciones)
CREATE TABLE IF NOT EXISTS public.movimientos_internos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo VARCHAR(40) NOT NULL CHECK (tipo IN ('retiro_qr_a_efectivo', 'deposito_efectivo_a_qr', 'prestamo_entre_cajas', 'reposicion_prestamo')),
  caja_origen VARCHAR(20) NOT NULL CHECK (caja_origen IN ('servicios', 'afiliaciones', 'externo')),
  caja_destino VARCHAR(20) NOT NULL CHECK (caja_destino IN ('servicios', 'afiliaciones', 'externo')),
  monto NUMERIC(10,2) NOT NULL CHECK (monto > 0),
  descripcion TEXT NOT NULL,
  fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  estado VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'anulado')),
  motivo_anulacion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 9. TRIGGERS AUTOMÁTICOS PARA UPDATED_AT
-- ==============================================================================

DO $$
BEGIN
  CREATE TRIGGER trg_perfiles_updated_at BEFORE UPDATE ON public.perfiles_usuarios FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  CREATE TRIGGER trg_configuracion_updated_at BEFORE UPDATE ON public.configuracion_tarifas FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  CREATE TRIGGER trg_saldos_updated_at BEFORE UPDATE ON public.saldos_iniciales FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  CREATE TRIGGER trg_socios_updated_at BEFORE UPDATE ON public.socios FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  CREATE TRIGGER trg_unidades_updated_at BEFORE UPDATE ON public.unidades_cobro FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  CREATE TRIGGER trg_periodos_updated_at BEFORE UPDATE ON public.periodos_mensuales FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  CREATE TRIGGER trg_cobros_updated_at BEFORE UPDATE ON public.cobros_servicios FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  CREATE TRIGGER trg_afiliaciones_updated_at BEFORE UPDATE ON public.afiliaciones FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ==============================================================================
-- 10. HABILITACIÓN DE ROW LEVEL SECURITY (RLS) EN TODAS LAS TABLAS
-- ==============================================================================

ALTER TABLE public.perfiles_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispositivos_conocidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bitacora_auditoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion_tarifas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saldos_iniciales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.socios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unidades_cobro ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.periodos_mensuales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cobros_servicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos_servicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.afiliaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos_afiliacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.egresos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_internos ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 11. POLÍTICAS RLS (ROL ADMIN: CONTROL TOTAL | ROL DIRECTIVA: SOLO LECTURA)
-- ==============================================================================

-- 11.1 perfiles_usuarios
CREATE POLICY "perfiles_lectura_autenticados" ON public.perfiles_usuarios
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.es_admin());

CREATE POLICY "perfiles_admin_modificacion" ON public.perfiles_usuarios
  FOR ALL TO authenticated
  USING (public.es_admin())
  WITH CHECK (public.es_admin());

-- 11.2 dispositivos_conocidos
CREATE POLICY "dispositivos_lectura" ON public.dispositivos_conocidos
  FOR SELECT TO authenticated
  USING (usuario_id = auth.uid() OR public.es_admin());

CREATE POLICY "dispositivos_registro" ON public.dispositivos_conocidos
  FOR INSERT TO authenticated
  WITH CHECK (usuario_id = auth.uid() OR public.es_admin());

CREATE POLICY "dispositivos_admin_gestion" ON public.dispositivos_conocidos
  FOR UPDATE TO authenticated
  USING (public.es_admin())
  WITH CHECK (public.es_admin());

-- 11.3 bitacora_auditoria (VISIBLE ÚNICAMENTE PARA ADMIN)
CREATE POLICY "bitacora_lectura_solo_admin" ON public.bitacora_auditoria
  FOR SELECT TO authenticated
  USING (public.es_admin());

CREATE POLICY "bitacora_insercion_usuarios" ON public.bitacora_auditoria
  FOR INSERT TO authenticated
  WITH CHECK (public.es_usuario_activo());

-- INMUTABILIDAD: No se crean políticas de UPDATE ni DELETE para bitacora_auditoria.

-- 11.4 configuracion_tarifas
CREATE POLICY "configuracion_lectura_todos" ON public.configuracion_tarifas
  FOR SELECT TO authenticated
  USING (public.es_usuario_activo());

CREATE POLICY "configuracion_admin_todo" ON public.configuracion_tarifas
  FOR ALL TO authenticated
  USING (public.es_admin())
  WITH CHECK (public.es_admin());

-- 11.5 saldos_iniciales
CREATE POLICY "saldos_lectura_todos" ON public.saldos_iniciales
  FOR SELECT TO authenticated
  USING (public.es_usuario_activo());

CREATE POLICY "saldos_admin_todo" ON public.saldos_iniciales
  FOR ALL TO authenticated
  USING (public.es_admin())
  WITH CHECK (public.es_admin());

-- 11.6 socios
CREATE POLICY "socios_lectura_todos" ON public.socios
  FOR SELECT TO authenticated
  USING (public.es_usuario_activo());

CREATE POLICY "socios_admin_todo" ON public.socios
  FOR ALL TO authenticated
  USING (public.es_admin())
  WITH CHECK (public.es_admin());

-- 11.7 unidades_cobro
CREATE POLICY "unidades_lectura_todos" ON public.unidades_cobro
  FOR SELECT TO authenticated
  USING (public.es_usuario_activo());

CREATE POLICY "unidades_admin_todo" ON public.unidades_cobro
  FOR ALL TO authenticated
  USING (public.es_admin())
  WITH CHECK (public.es_admin());

-- 11.8 periodos_mensuales
CREATE POLICY "periodos_lectura_todos" ON public.periodos_mensuales
  FOR SELECT TO authenticated
  USING (public.es_usuario_activo());

CREATE POLICY "periodos_admin_todo" ON public.periodos_mensuales
  FOR ALL TO authenticated
  USING (public.es_admin())
  WITH CHECK (public.es_admin());

-- 11.9 cobros_servicios
CREATE POLICY "cobros_lectura_todos" ON public.cobros_servicios
  FOR SELECT TO authenticated
  USING (public.es_usuario_activo());

CREATE POLICY "cobros_admin_todo" ON public.cobros_servicios
  FOR ALL TO authenticated
  USING (public.es_admin())
  WITH CHECK (public.es_admin());

-- 11.10 pagos_servicios
CREATE POLICY "pagos_servicios_lectura_todos" ON public.pagos_servicios
  FOR SELECT TO authenticated
  USING (public.es_usuario_activo());

CREATE POLICY "pagos_servicios_admin_todo" ON public.pagos_servicios
  FOR ALL TO authenticated
  USING (public.es_admin())
  WITH CHECK (public.es_admin());

-- 11.11 afiliaciones
CREATE POLICY "afiliaciones_lectura_todos" ON public.afiliaciones
  FOR SELECT TO authenticated
  USING (public.es_usuario_activo());

CREATE POLICY "afiliaciones_admin_todo" ON public.afiliaciones
  FOR ALL TO authenticated
  USING (public.es_admin())
  WITH CHECK (public.es_admin());

-- 11.12 pagos_afiliacion
CREATE POLICY "pagos_afiliacion_lectura_todos" ON public.pagos_afiliacion
  FOR SELECT TO authenticated
  USING (public.es_usuario_activo());

CREATE POLICY "pagos_afiliacion_admin_todo" ON public.pagos_afiliacion
  FOR ALL TO authenticated
  USING (public.es_admin())
  WITH CHECK (public.es_admin());

-- 11.13 egresos
CREATE POLICY "egresos_lectura_todos" ON public.egresos
  FOR SELECT TO authenticated
  USING (public.es_usuario_activo());

CREATE POLICY "egresos_admin_todo" ON public.egresos
  FOR ALL TO authenticated
  USING (public.es_admin())
  WITH CHECK (public.es_admin());

-- 11.14 movimientos_internos
CREATE POLICY "movimientos_lectura_todos" ON public.movimientos_internos
  FOR SELECT TO authenticated
  USING (public.es_usuario_activo());

CREATE POLICY "movimientos_admin_todo" ON public.movimientos_internos
  FOR ALL TO authenticated
  USING (public.es_admin())
  WITH CHECK (public.es_admin());

-- ==============================================================================
-- 12. DATOS SEMILLA INICIALES (REGLAS DE NEGOCIO POR DEFECTO)
-- ==============================================================================

-- Inserción de configuración inicial si la tabla está vacía
INSERT INTO public.configuracion_tarifas (
  tarifa_fija_cerrado,
  tarifa_fija_abierto,
  tarifa_fija_ambulante,
  tarifa_fija_no_socio,
  base_variable_puesto,
  multa_diaria,
  multa_tope_mensual,
  multa_minimo_exento,
  costo_afiliacion,
  tipo_redondeo_luz,
  dias_prorroga_max
)
SELECT 55.00, 70.00, 50.00, 50.00, 58.00, 10.00, 70.00, 35.00, 1500.00, 'arriba_0_50', 2
WHERE NOT EXISTS (SELECT 1 FROM public.configuracion_tarifas);

-- Saldos iniciales por defecto en 0.00 Bs (listos para ser actualizados en módulo de arranque)
INSERT INTO public.saldos_iniciales (caja, metodo_pago, monto_inicial, observaciones)
VALUES 
  ('servicios', 'efectivo', 0.00, 'Saldo inicial efectivo arranque'),
  ('servicios', 'qr', 0.00, 'Saldo inicial QR arranque'),
  ('afiliaciones', 'efectivo', 0.00, 'Saldo inicial efectivo arranque'),
  ('afiliaciones', 'qr', 0.00, 'Saldo inicial QR arranque')
ON CONFLICT (caja, metodo_pago) DO NOTHING;

-- ==============================================================================
-- FIN DEL ESQUEMA
-- ==============================================================================
