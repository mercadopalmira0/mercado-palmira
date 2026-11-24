import {
  Wallet,
  Receipt,
  Users,
  UserPlus,
  UserX,
  ArrowDownCircle,
  Package,
  FileSpreadsheet,
  ShieldAlert
} from 'lucide-react'

export const NAVIGATION_ITEMS = [
  { id: 'inicio', label: 'Inicio / Cajas', icon: Wallet, description: 'Arqueo de fondos, saldos iniciales y balance rápido de las 2 cajas.' },
  { id: 'cobrar', label: 'Cobrar', icon: Receipt, description: 'Cobro rápido de servicios básicos, externos, tarifadores de luz y multas.' },
  { id: 'deudores', label: 'Deudores', icon: UserX, description: 'Deudas heredadas del tesorero anterior y saldos arrastrados de ciclos cerrados.' },
  { id: 'socios', label: 'Socios', icon: Users, description: 'Padrón de socios, externos, puestos agrupados y traspasos.' },
  { id: 'afiliaciones', label: 'Afiliaciones', icon: UserPlus, description: 'Plan de pagos (1.500 Bs), cuotas y saldos de nuevos socios.' },
  { id: 'egresos', label: 'Egresos', icon: ArrowDownCircle, description: 'Gastos operativos, facturas, sueldo del guardia y mantenimiento.' },
  { id: 'inventario', label: 'Inventario', icon: Package, description: 'Bienes, insumos, herramientas y acta de entrega de directiva.' },
  { id: 'rendicion', label: 'Rendición', icon: FileSpreadsheet, description: 'Informes trimestrales para asamblea, exportación PDF y Excel.' },
  { id: 'bitacora', label: 'Bitácora', icon: ShieldAlert, description: 'Auditoría estricta, trazabilidad y control de cuentas compartidas (Solo Admin).' },
]
