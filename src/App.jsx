import React, { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import AppLayout from './components/layout/AppLayout'
import AuthModal from './components/auth/AuthModal'
import InicioView from './components/views/InicioView'
import CobrarView from './components/views/CobrarView'
import SociosView from './components/views/SociosView'
import AfiliacionesView from './components/views/AfiliacionesView'
import EgresosView from './components/views/EgresosView'
import RendicionView from './components/views/RendicionView'
import BitacoraView from './components/views/BitacoraView'

function AppContent() {
  const [currentTab, setCurrentTab] = useState('inicio')
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const { user, isAdmin } = useAuth()

  const renderActiveView = () => {
    switch (currentTab) {
      case 'inicio':
        return (
          <InicioView
            onOpenAuth={() => setIsAuthModalOpen(true)}
            onNavigateTab={setCurrentTab}
          />
        )
      case 'cobrar':
        return <CobrarView />
      case 'socios':
        return <SociosView onOpenAuth={() => setIsAuthModalOpen(true)} />
      case 'afiliaciones':
        return <AfiliacionesView />
      case 'egresos':
        return <EgresosView />
      case 'rendicion':
        return <RendicionView />
      case 'bitacora':
        return <BitacoraView role={isAdmin ? 'admin' : 'directiva'} />
      default:
        return (
          <InicioView
            onOpenAuth={() => setIsAuthModalOpen(true)}
            onNavigateTab={setCurrentTab}
          />
        )
    }
  }

  return (
    <>
      <AppLayout
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenAuth={() => setIsAuthModalOpen(true)}
      >
        {renderActiveView()}
      </AppLayout>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
