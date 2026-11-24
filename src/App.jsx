import React, { useState } from 'react'
import AppLayout from './components/layout/AppLayout'
import InicioView from './components/views/InicioView'
import CobrarView from './components/views/CobrarView'
import SociosView from './components/views/SociosView'
import AfiliacionesView from './components/views/AfiliacionesView'
import EgresosView from './components/views/EgresosView'
import RendicionView from './components/views/RendicionView'
import BitacoraView from './components/views/BitacoraView'

export default function App() {
  const [currentTab, setCurrentTab] = useState('inicio')
  const [role, setRole] = useState('admin') // 'admin' | 'directiva'

  const handleToggleRole = () => {
    setRole((prev) => (prev === 'admin' ? 'directiva' : 'admin'))
    // If switching to directiva while in bitacora, redirect to inicio
    if (role === 'admin' && currentTab === 'bitacora') {
      setCurrentTab('inicio')
    }
  }

  const renderActiveView = () => {
    switch (currentTab) {
      case 'inicio':
        return <InicioView role={role} />
      case 'cobrar':
        return <CobrarView role={role} />
      case 'socios':
        return <SociosView role={role} />
      case 'afiliaciones':
        return <AfiliacionesView role={role} />
      case 'egresos':
        return <EgresosView role={role} />
      case 'rendicion':
        return <RendicionView role={role} />
      case 'bitacora':
        return <BitacoraView role={role} />
      default:
        return <InicioView role={role} />
    }
  }

  return (
    <AppLayout
      currentTab={currentTab}
      onSelectTab={setCurrentTab}
      role={role}
      onToggleRole={handleToggleRole}
    >
      {renderActiveView()}
    </AppLayout>
  )
}
