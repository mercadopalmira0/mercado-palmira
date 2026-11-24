import React from 'react'
import {
  Wallet,
  Receipt,
  Users,
  UserPlus,
  ArrowDownCircle,
  FileSpreadsheet,
  ShieldAlert,
  Menu,
  X
} from 'lucide-react'

export const NAVIGATION_ITEMS = [
  { id: 'inicio', label: 'Inicio / Cajas', icon: Wallet, description: 'Arqueo de fondos, saldos iniciales y balance rápido de las 2 cajas.' },
  { id: 'cobrar', label: 'Cobrar', icon: Receipt, description: 'Cobro rápido de servicios básicos, tarifadores de luz y multas.' },
  { id: 'socios', label: 'Socios', icon: Users, description: 'Padrón de socios, puestos y unidades de cobro agrupadas.' },
  { id: 'afiliaciones', label: 'Afiliaciones', icon: UserPlus, description: 'Plan de pagos (1.500 Bs), cuotas y saldos de nuevos socios.' },
  { id: 'egresos', label: 'Egresos', icon: ArrowDownCircle, description: 'Gastos operativos, facturas y mantenimiento (Caja Servicios vs Afiliaciones).' },
  { id: 'rendicion', label: 'Rendición', icon: FileSpreadsheet, description: 'Informes trimestrales para asamblea, exportación PDF y Excel.' },
  { id: 'bitacora', label: 'Bitácora', icon: ShieldAlert, description: 'Auditoría estricta, trazabilidad y control de cuentas compartidas (Solo Admin).' },
]
