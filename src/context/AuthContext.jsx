import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutos
const INACTIVITY_REASON_KEY = 'palmira_inactivity_logout'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [inactivityMessage, setInactivityMessage] = useState(() => {
    try {
      return sessionStorage.getItem(INACTIVITY_REASON_KEY) || ''
    } catch {
      return ''
    }
  })

  const lastActivityRef = useRef(Date.now())
  const logoutInProgressRef = useRef(false)

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('perfiles_usuarios')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        console.warn('[Auth] Error al obtener perfil:', error.message)
        return null
      }
      return data
    } catch (err) {
      console.warn('[Auth] Excepción al leer perfil:', err)
      return null
    }
  }

  useEffect(() => {
    let mounted = true

    // Leer sesión activa
    supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
      if (!mounted) return
      setSession(currentSession)
      setUser(currentSession?.user ?? null)
      if (currentSession?.user) {
        const userProfile = await fetchProfile(currentSession.user.id)
        if (mounted) setProfile(userProfile)
      }
      setLoading(false)
    })

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!mounted) return
        setSession(newSession)
        setUser(newSession?.user ?? null)
        if (newSession?.user) {
          const userProfile = await fetchProfile(newSession.user.id)
          if (mounted) setProfile(userProfile)
        } else {
          setProfile(null)
        }
        setLoading(false)
      }
    )

    return () => {
      mounted = false
      subscription?.unsubscribe()
    }
  }, [])

  const clearInactivityMessage = useCallback(() => {
    setInactivityMessage('')
    try {
      sessionStorage.removeItem(INACTIVITY_REASON_KEY)
    } catch {
      // ignorar errores de storage
    }
  }, [])

  const signIn = async (email, password) => {
    clearInactivityMessage()
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    if (data?.user) {
      const p = await fetchProfile(data.user.id)
      setProfile(p)
    }
    return data
  }

  const signUp = async (email, password, nombre, cargo = 'Secretario de Hacienda', rol = 'admin') => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nombre,
          cargo,
          rol,
        },
      },
    })
    if (error) throw error
    return data
  }

  const signOut = useCallback(async ({ reason = '' } = {}) => {
    if (reason) {
      setInactivityMessage(reason)
      try {
        sessionStorage.setItem(INACTIVITY_REASON_KEY, reason)
      } catch {
        // ignorar errores de storage
      }
    }
    const { error } = await supabase.auth.signOut()
    if (error) console.error('[Auth] Error al cerrar sesión:', error)
    setSession(null)
    setUser(null)
    setProfile(null)
  }, [])

  // Cierre de sesión automático tras 30 minutos continuos de inactividad
  useEffect(() => {
    if (!session || !user) return undefined

    let timerId = null
    logoutInProgressRef.current = false
    lastActivityRef.current = Date.now()

    const handleInactivityLogout = async () => {
      if (logoutInProgressRef.current) return
      logoutInProgressRef.current = true
      await signOut({
        reason: 'Tu sesión se cerró por inactividad para proteger los datos.',
      })
    }

    const scheduleTimer = () => {
      if (timerId) clearTimeout(timerId)
      const elapsed = Date.now() - lastActivityRef.current
      const remaining = Math.max(0, INACTIVITY_TIMEOUT_MS - elapsed)
      timerId = setTimeout(handleInactivityLogout, remaining)
    }

    let lastResetAt = Date.now()
    const handleActivity = () => {
      const now = Date.now()
      // Si el dispositivo estuvo suspendido > 30 min, cerrar sesión de inmediato
      if (now - lastActivityRef.current >= INACTIVITY_TIMEOUT_MS) {
        handleInactivityLogout()
        return
      }
      // Throttle de 1 segundo para eventos frecuentes como mousemove o scroll
      if (now - lastResetAt < 1000) return
      lastResetAt = now
      lastActivityRef.current = now
      scheduleTimer()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (Date.now() - lastActivityRef.current >= INACTIVITY_TIMEOUT_MS) {
          handleInactivityLogout()
        } else {
          scheduleTimer()
        }
      }
    }

    const activityEvents = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll']
    activityEvents.forEach((evt) => {
      window.addEventListener(evt, handleActivity, { passive: true })
    })
    document.addEventListener('visibilitychange', handleVisibilityChange)
    scheduleTimer()

    return () => {
      if (timerId) clearTimeout(timerId)
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, handleActivity)
      })
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [session, user, signOut])

  const isAdmin = profile?.rol === 'admin' || user?.user_metadata?.rol === 'admin'
  const isDirectiva = profile?.rol === 'directiva' || user?.user_metadata?.rol === 'directiva'

  const value = {
    session,
    user,
    profile,
    isAdmin,
    isDirectiva,
    loading,
    inactivityMessage,
    clearInactivityMessage,
    signIn,
    signUp,
    signOut,
    refreshProfile: () => user && fetchProfile(user.id).then(setProfile),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider')
  }
  return context
}
