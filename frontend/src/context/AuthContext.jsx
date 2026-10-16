import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

const AuthContext = createContext(null)

const TOKEN_KEY = 'bisket_auth_token'
const USER_KEY = 'bisket_auth_user'

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || null)
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(USER_KEY)
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [authError, setAuthError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // ตรวจสอบ token เมื่อ mount
  useEffect(() => {
    if (token) {
      // สามารถเรียก /api/auth/me เพื่อ verify กับ backend ได้
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => {
          if (res.ok) return res.json()
          throw new Error('Token expired')
        })
        .then((data) => {
          if (data.user) {
            setUser(data.user)
            localStorage.setItem(USER_KEY, JSON.stringify(data.user))
          }
        })
        .catch(() => {
          // หาก backend ไม่พร้อมใช้งานแต่มี token เก่าในเครื่อง ให้อนุญาตใช้งานต่อในโหมด offline/client
        })
    }
  }, [token])

  const login = useCallback(async (username, password) => {
    setIsLoading(true)
    setAuthError('')

    const cleanUser = username.trim()
    const cleanPass = password.trim()

    try {
      // 1. ลอง Login กับ Backend API ก่อน
      let apiSuccess = false
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: cleanUser, password: cleanPass }),
        })

        if (res.ok) {
          const data = await res.json()
          if (data.token && data.user) {
            setToken(data.token)
            setUser(data.user)
            localStorage.setItem(TOKEN_KEY, data.token)
            localStorage.setItem(USER_KEY, JSON.stringify(data.user))
            setIsLoginModalOpen(false)
            apiSuccess = true
          }
        }
      } catch {
        // Backend offline (เช่น รันบน GitHub Pages โหมด Static)
      }

      // 2. หาก Backend ไม่สำเร็จ หรือโหมด Static ตรวจสอบกับรหัสเริ่มต้น
      if (!apiSuccess) {
        if (cleanUser === 'admin' && (cleanPass === 'adminZ01' || cleanPass === 'adminZ0')) {
          const mockUser = { id: 1, username: 'admin', role: 'admin', name: 'ผู้ดูแลระบบ (Admin)' }
          const mockToken = 'client_token_' + btoa(`admin:${Date.now()}`)
          setToken(mockToken)
          setUser(mockUser)
          localStorage.setItem(TOKEN_KEY, mockToken)
          localStorage.setItem(USER_KEY, JSON.stringify(mockUser))
          setIsLoginModalOpen(false)
          setIsLoading(false)
          return true
        } else {
          setAuthError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง')
          setIsLoading(false)
          return false
        }
      }

      setIsLoading(false)
      return true
    } catch (err) {
      setAuthError('เกิดข้อผิดพลาดในการเข้าสู่ระบบ: ' + (err.message || ''))
      setIsLoading(false)
      return false
    }
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }, [])

  const openLoginModal = useCallback(() => {
    setAuthError('')
    setIsLoginModalOpen(true)
  }, [])

  const closeLoginModal = useCallback(() => {
    setAuthError('')
    setIsLoginModalOpen(false)
  }, [])

  const value = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    isLoading,
    authError,
    isLoginModalOpen,
    login,
    logout,
    openLoginModal,
    closeLoginModal,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
