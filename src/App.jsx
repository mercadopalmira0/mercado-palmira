import React, { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import AppLayout from './components/layout/AppLayout'
import AuthModal from './components/auth/AuthModal'
import LoginScreen from './components/auth/LoginScreen'
import InicioView from './components/views/InicioView'
import CobrarView from './components/views/CobrarView'
import DeudoresView from './components/views/DeudoresView'
import SociosView from './components/views/SociosView'
import AfiliacionesView from './components/views/AfiliacionesView'
import EgresosView from './components/views/EgresosView'
import InventarioView from './components/views/InventarioView'
import RendicionView from './components/views/RendicionView'
import BitacoraView from './components/views/BitacoraView'
import { RefreshCw, Store } from 'lucide-react'

function AppContent() {
  const [currentTab, setCurrentTab] = useState('inicio')
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const { session, user, isAdmin, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center mb-3">
          <Store className="w-6 h-6 text-emerald-400" />
        </div>
        <RefreshCw className="w-5 h-5 animate-spin text-emerald-400 mb-2" />
        <p className="text-xs text-slate-400 font-medium">Verificando sesión de Hacienda...</p>
      </div>
    )
  }

  // Auth Gate obligatorio: sin sesión activa se muestra únicamente la pantalla de inicio de sesión
  if (!session || !user) {
    return <LoginScreen />
  }

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
      case 'deudores':
        return <DeudoresView />
      case 'socios':
        return <SociosView onOpenAuth={() => setIsAuthModalOpen(true)} />
      case 'afiliaciones':
        return <AfiliacionesView />
      case 'egresos':
        return <EgresosView />
      case 'inventario':
        return <InventarioView />
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
