import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

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

  const signIn = async (email, password) => {
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

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) console.error('[Auth] Error al cerrar sesión:', error)
    setSession(null)
    setUser(null)
    setProfile(null)
  }

  const isAdmin = profile?.rol === 'admin' || user?.user_metadata?.rol === 'admin'
  const isDirectiva = profile?.rol === 'directiva' || user?.user_metadata?.rol === 'directiva'

  const value = {
    session,
    user,
    profile,
    isAdmin,
    isDirectiva,
    loading,
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
