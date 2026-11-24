# Contexto Maestro del Proyecto: Secretaría de Hacienda – Mercado Palmira

> **Instrucción para retomar en un nuevo chat o en Antigravity IDE:**
> Este documento contiene la especificación completa (metodología Spec Kit) del sistema de gestión para la Secretaría de Hacienda del Mercado Palmira (~80 socios). Respeta estrictamente el alcance, las reglas de negocio, el stack 100% gratuito y el plan por fases descritos aquí.

---

## 1. Constitución del Proyecto (`constitution.md`)

1. **Alcance estricto:** El sistema controla únicamente los fondos que maneja el Secretario de Hacienda: **Servicios Básicos** (agua, luz, guardia, alumbrado, basura), **multas por retraso** en servicios, **afiliaciones** de nuevos socios y los **egresos** correspondientes a esos rubros. Cualquier otro dinero del mercado queda fuera. *(Proyecto completamente separado de la tienda de barrio del usuario).*
2. **Uso personal y directivo:** Diseñado principalmente para el Secretario de Hacienda (`admin`). Se podrá compartir con la mesa directiva únicamente en modo **solo lectura** y bajo auditoría estricta. No existen cuentas ni accesos para los 80 socios en esta versión.
3. **Mobile-first para cobrar, escritorio para reportar:** En el celular se prioriza velocidad (buscar socio, cobrar, sacar foto y emitir recibo en pocos toques). En la laptop se priorizan tablas amplias, arqueos y generación de informes de rendición de cuentas.
4. **Dos cajas independientes:** El dinero de *Caja Servicios Básicos* y *Caja Afiliaciones* nunca se mezcla en el mismo saldo.
5. **Costo cero ($0/mes):** Toda la arquitectura debe operar sobre capas gratuitas, sin servidores backend de pago ni publicación en tiendas de apps (usar PWA).
6. **Cero borrados (trazabilidad total):** Ningún cobro, egreso o cambio de tarifa se elimina; todo error se anula dejando motivo escrito y registro en bitácora.
7. **Entorno de desarrollo:** El usuario conoce programación básica y depuración, y construirá el sistema apoyado principalmente en **Antigravity IDE**.

---

## 2. Especificación Funcional (`spec.md`)

### A. Padrón de Socios, Puestos y Unidades de Cobro
* **Cantidad aproximada:** 80 socios. Actualmente **no existe Excel**, por lo que el módulo de carga inicial debe contar con un formulario ágil ("Guardar y agregar siguiente").
* **Unidades de Cobro (Puestos agrupados):** Un tarifador de luz puede ser compartido por 2 (o más) puestos atendidos por la misma persona pero registrados a nombre de distintos socios. El sistema agrupa esos puestos en una sola **Unidad de Cobro**:
  * Multiplica la base variable por la cantidad de puestos agrupados (ej. 2 puestos = `80 Bs` guardia + `10 Bs` agua + `10 Bs` alumbrado + `16 Bs` basura = `116 Bs`).
  * Suma una sola lectura de consumo de luz para esa unidad.
* **Modalidades de cobro mensual:**
  * **Fijo:**
    * Puesto cerrado: `55 Bs`
    * Puesto abierto: `70 Bs`
    * Ambulante: `50 Bs`
    * No socio: `50 Bs`
  * **Variable (con tarifador de luz):**
    * Base mensual por puesto: **`58 Bs`** (`40 Bs` guardia + `5 Bs` agua + `5 Bs` alumbrado calle y pasillo + `8 Bs` basura) **+** consumo de luz.
* **Regla de tarifador en cero:** Si un puesto con tarifador estuvo cerrado todo el mes y su consumo marca **`0 kWh`**, se le cobra automáticamente la tarifa fija de **puesto cerrado (`55 Bs`)** en lugar de los `58 Bs` de base variable. También debe permitir registrar **Cambio de tarifador** (cuando se quema y el nuevo arranca en 0).
* **Foto histórica mensual:** Como el estado de los puestos cambia frecuentemente (abierto ↔ cerrado, cambio de titular o modalidad), al abrir cada mes se puede editar el estado de cada puesto antes de confirmar los cobros. Los meses anteriores **nunca se alteran**, ya que cada cobro guarda su propia foto de la tarifa aplicada ese mes.

### B. Cálculo Mensual de Luz y Redondeo
* Al iniciar cada mes se ingresan dos datos de la factura general de luz: `Monto total (Bs)` y `Total kWh consumidos` (con opción de adjuntar foto de la factura).
* Fórmula automática: `Precio por kWh = Monto total / Total kWh`.
* Por cada tarifador se ingresa la `Lectura actual` (el sistema arrastra automáticamente la `Lectura anterior`) y se adjunta la **foto del tarifador**.
* Cálculo: `(Lectura actual - Lectura anterior) × Precio por kWh`.
* **Redondeo:** Siempre **hacia arriba** al `0,50 Bs` o `+1 Bs` más cercano (configurable).

### C. Calendario, Multas y Excepciones
* **Periodo normal de cobro:** Del **25 a fin de mes**.
* **Inicio y cálculo de multa:** A partir del **1 del mes siguiente**, suma **`10 Bs` por día de retraso**, con un **tope máximo de `70 Bs` por cada mes adeudado** (se calcula mes por mes).
* **Exención por pago mínimo:** Si el socio abonó al menos **`35 Bs`** (monto configurable) antes del vencimiento, **no genera multa**.
* **Excepciones controladas:**
  * **Prórroga rápida:** Botón para que el tesorero extienda el vencimiento hasta **2 días** sin generar multa.
  * **Fecha especial:** Campo de fecha límite personalizada para socios con acuerdo aprobado por la mesa directiva.
  * **Rebaja o perdón de multa:** Botón para reducir o condonar una multa, exigiendo siempre un **motivo escrito**.

### D. Cobros, Pagos Parciales, Recibos y Anulaciones
* **Pagos parciales y adelantos:** Un cobro de servicios admite múltiples abonos ("a cuenta") hasta quedar en `0 Bs`, y permite cobrar meses futuros por adelantado.
* **Imputación manual:** Si un socio debe varios meses, el Secretario de Hacienda elige **manualmente** a qué mes (o meses) asignar el dinero recibido.
* **Recibos (Digital + Talonario Físico):**
  * Genera un **recibo digital sencillo** (imagen descargable o lista para compartir por WhatsApp) con número, fecha, socio/puestos, desglose (base, lectura de luz, multa) y saldo pendiente.
  * Incluye un campo opcional para anotar el **N° de recibo del talonario físico** (muy usado para socios mayores).
* **Anulaciones con motivo:** Ningún pago ni egreso se borra. Si hay un error, se usa el botón **Anular** con motivo escrito obligatorio; el registro queda tachado en el historial sin sumar a caja.

### E. Afiliaciones (Plan de Pagos)
* Costo total por socio nuevo: **`1.500 Bs`**.
* Se registra el monto mensual acordado por cada socio, permitiendo abonos parciales y mostrando siempre el **saldo restante** hasta llegar a `0 Bs`.

### F. Control de Dos Cajas, Efectivo vs. QR y Movimientos Internos
1. **Caja Servicios Básicos:**
   * *Ingresos:* Cobros fijos, variables, consumo de luz y multas.
   * *Egresos:* Pago de facturas (luz, agua, guardia, basura) y **gastos operativos** (pasajes para ir a pagar, talonarios, material de escritorio, etc.).
2. **Caja Afiliaciones:**
   * *Ingresos:* Cuotas y abonos de afiliación.
   * *Egresos:* Limpieza general del mercado, mantenimiento y compras varias del mercado.
* **Control Efectivo vs. QR:** Todo ingreso y egreso exige indicar si fue en **Efectivo** o **QR**, para que el arqueo muestre exactamente cuánto hay en billetes en mano y cuánto en cuenta bancaria.
* **Movimientos Internos:**
  * **Retiro/Depósito (`QR ↔ Efectivo`):** Permite registrar el monto parcial retirado del cajero (dejando el saldo restante en QR) para que el arqueo nunca se descuadre.
  * **Préstamos y Reposiciones:** Permite registrar cuando se toma dinero ahorrado de meses anteriores, de la otra caja o del bolsillo propio para cubrir una factura a tiempo, y luego registrar su devolución.

### G. Módulo de Arranque (Saldo Inicial)
* Pantalla de uso único al iniciar el sistema para cargar:
  * Saldo inicial en **Caja Servicios** (desglosado en Efectivo y QR).
  * Saldo inicial en **Caja Afiliaciones** (desglosado en Efectivo y QR).
  * Deudas arrastradas de meses anteriores por socio.
  * Saldos ya amortizados de afiliaciones en curso.

### H. Configuración de Tarifas con Rastro
* Pantalla editable para actualizar tarifas a futuro (montos fijos, base variable, multa diaria, tope de multa, mínimo exención de `35 Bs`, costo de afiliación, regla de redondeo).
* Los cambios solo afectan a meses nuevos y **se registran automáticamente en la bitácora** con fecha, hora, valor anterior y valor nuevo.

### I. Respaldos Fotográficos en Google Drive
* Cuenta personal de Google dedicada exclusivamente al mercado (15 GB gratis, ej. `hacienda.mercadopalmira@gmail.com`).
* Las fotos (tarifadores, recibos de egresos, facturas generales) se **comprimen automáticamente en el navegador/celular** (~200 KB) antes de enviarse a un **Google Apps Script**, que crea la estructura de carpetas y devuelve el enlace directo para guardarlo en la base de datos:
  ```text
  Hacienda_Mercado/
   └── 2026/
        └── 2026-11/
             ├── Tarifadores/
             ├── Egresos_Servicios/
             ├── Egresos_Afiliaciones/
             └── Facturas_Generales/
  ```

### J. Rendición de Cuentas (Cada 3 o 4 meses – Vista Laptop)
* Selector de rango flexible (`Desde [Mes/Año] hasta [Mes/Año]`) para consolidar 3, 4 o más meses en un solo informe exportable a **PDF imprimible** y **Excel**.
* Contenido del informe:
  1. Saldo de arrastre inicial por caja.
  2. Detalle de ingresos mes por mes (Servicios y Afiliaciones).
  3. Detalle de egresos agrupados por rubro, con **enlaces directos a Google Drive** de cada recibo/foto.
  4. Resumen de movimientos internos (`QR ↔ Efectivo` y préstamos/reposiciones).
  5. Saldo final y arqueo (`Efectivo en mano` vs. `Saldo en QR`).
  6. Anexo de socios morosos y saldos pendientes de afiliación.
  7. Pie de firmas para Secretario de Hacienda y Mesa Directiva.
* **Cierre de periodo rendido:** Botón *"Marcar como Rendido en Asamblea"* que registra la fecha en bitácora y bloquea esos meses contra ediciones accidentales.

### K. Seguridad, Roles y Bitácora Anti-Cuentas Compartidas
* **Autenticación y Roles (Supabase Auth + RLS):**
  * `admin` (solo el Secretario de Hacienda): control total.
  * `directiva`: **solo lectura estricta a nivel de base de datos** (sin posibilidad de modificar ni borrar nada). Sin registro público; el `admin` crea y desactiva cuentas.
* **Bitácora inmutable (solo visible para `admin`):**
  * Registra inicios de sesión, vistas de reportes, descargas de PDF/Excel, anulaciones y cambios de tarifas.
  * Captura `device_id` (huella persistente del navegador/dispositivo), `user_agent` (modelo/SO/navegador) e `ip_address` (vía Supabase Edge Function).
  * **Detección de cuenta compartida:** Alerta visual en rojo en el panel de `admin` cuando un directivo entra desde un dispositivo nuevo o desde IPs distintas en corto tiempo, más soporte para **sesión única** (un nuevo inicio de sesión cierra la sesión anterior y registra el choque).

---

## 3. Arquitectura y Plan Técnico (`plan.md`)

### Stack Tecnológico ($0/mes)
| Capa | Tecnología | Notas de capa gratuita |
|---|---|---|
| **Frontend (Celular + Laptop)** | **React + Vite + Tailwind CSS (PWA)** | Instalable en celular. Compresión de imágenes en cliente antes de subir. |
| **Hosting Web** | **Render (Static Site)** | Gratis, HTTPS, carga instantánea y sin pausas (no usar Web Service backend). |
| **Base de Datos y Seguridad** | **Supabase** (PostgreSQL + Auth + RLS + Edge Functions) | 500 MB gratis. **Anti-pausa:** ping cada 4 días con `cron-job.org` + botón manual de respaldo JSON/Excel mensual. |
| **Almacenamiento de Fotos** | **Google Drive + Google Apps Script** | 15 GB gratis en cuenta Gmail personal del mercado. |
| **Recibos y Reportes** | `html-to-image` (WhatsApp), `jsPDF` (PDF) y `SheetJS` (Excel) | Generación 100% en el navegador del usuario. |
| **Modo Offline (Opcional/Final)** | Service Worker (PWA) + caché local | No urgente; se implementa al final si se necesita. |

### Esquema Base de Tablas (Supabase PostgreSQL)
* `configuracion_tarifas`: valores vigentes (fijos, base variable, multa diaria, tope multa, mínimo exención, afiliación, redondeo).
* `saldos_iniciales`: saldo inicial de arranque por caja (`servicios`/`afiliaciones`) y método (`efectivo`/`qr`).
* `socios`: `id`, `nombre`, `telefono`, `fecha_pago_especial`, `activo`.
* `unidades_cobro`: `id`, `socio_responsable_id`, `nombres_titulares`, `tipo` (`fijo`/`variable`), `subtipo_fijo`, `cantidad_puestos`, `tarifador_codigo`, `ultima_lectura`, `activo`.
* `periodos_mensuales`: `id`, `mes`, `anio`, `factura_luz_bs`, `factura_luz_kwh`, `precio_kwh_calculado`, `factura_luz_url`, `rendido_en_asamblea` (`bool`), `fecha_rendicion`.
* `cobros_servicios`: `id`, `unidad_id`, `periodo_id`, `tipo_aplicado`, `cantidad_puestos_aplicada`, `lectura_ant`, `lectura_act`, `foto_tarifador_url`, `monto_base`, `monto_luz`, `dias_prorroga`, `monto_multa`, `multa_condonada_motivo`, `total_a_pagar`, `estado` (`pendiente`/`parcial`/`pagado`).
* `pagos_servicios`: `id`, `cobro_id`, `monto`, `metodo_pago` (`efectivo`/`qr`), `nro_talonario_fisico`, `fecha_pago`, `estado` (`activo`/`anulado`), `motivo_anulacion`.
* `afiliaciones`: `id`, `socio_id`, `monto_total` (`1500`), `cuota_acordada`, `saldo_pendiente`, `estado`.
* `pagos_afiliacion`: `id`, `afiliacion_id`, `monto`, `metodo_pago` (`efectivo`/`qr`), `nro_talonario_fisico`, `fecha_pago`, `estado` (`activo`/`anulado`), `motivo_anulacion`.
* `egresos`: `id`, `caja` (`servicios`/`afiliaciones`), `categoria`, `descripcion`, `monto`, `metodo_pago` (`efectivo`/`qr`), `fecha`, `enlace_drive`, `estado` (`activo`/`anulado`), `motivo_anulacion`.
* `movimientos_internos`: `id`, `tipo` (`retiro_qr_a_efectivo`/`deposito_efectivo_a_qr`/`prestamo`/`reposicion`), `caja_origen`, `caja_destino`, `monto`, `descripcion`, `fecha`, `estado`, `motivo_anulacion`.
* `perfiles_usuarios`: `id`, `nombre`, `cargo`, `rol` (`admin`/`directiva`), `activo`, `sesion_actual_id`.
* `dispositivos_conocidos`: `id`, `usuario_id`, `device_id`, `info_dispositivo`, `autorizado`, `primer_acceso`, `ultimo_acceso`.
* `bitacora_auditoria`: `id`, `usuario_id`, `accion`, `detalle_json`, `device_id`, `ip_address`, `user_agent`, `es_sospechoso` (`bool`), `fecha_hora`.

---

## 4. Plan de Implementación por Fases (`tasks.md`)

1. **Fase 1 – Base, Arranque y Conexión:** Inicializar React + Vite + Tailwind + PWA, configurar Supabase, crear todas las tablas SQL con políticas RLS, pantalla de **Configuración de Tarifas** y pantalla de **Saldos Iniciales**.
2. **Fase 2 – Padrón, Puestos Agrupados y Tarifadores:** Formulario ágil para cargar los 80 socios y sus unidades de cobro (fijos, variables y puestos agrupados bajo un mismo tarifador) con edición rápida mensual.
3. **Fase 3 – Puente Google Drive + Cobros Mensuales (Celular):** Desplegar Google Apps Script para subida de fotos comprimidas; crear flujo mensual (factura de luz, lecturas + foto de tarifador, regla `0 kWh = 55 Bs`, redondeo hacia arriba, multas con tope `70 Bs` y exención `≥ 35 Bs`, prórroga de 2 días, pagos parciales con imputación manual, N° talonario físico, recibo WhatsApp y anulaciones con motivo).
4. **Fase 4 – Afiliaciones, Egresos y Movimientos Internos:** Módulo de afiliaciones (`1.500 Bs`), registro de egresos en las 2 cajas con foto a Drive, y registro de movimientos `QR ↔ Efectivo` y préstamos/reposiciones.
5. **Fase 5 – Dashboard Laptop y Rendición de Cuentas (3-4 meses):** Panel de arqueo (`Efectivo` vs. `QR` por caja), consolidado por rango de meses en PDF imprimible y Excel con enlaces a Drive, bloqueo *"Rendido en Asamblea"* y botón de respaldo manual completo.
6. **Fase 6 – Seguridad, Roles y Bitácora:** Activación de usuarios `directiva` (solo lectura), Edge Function para capturar IP/dispositivo, sesión única, alertas en rojo de cuentas compartidas y panel privado de Bitácora para el `admin`.