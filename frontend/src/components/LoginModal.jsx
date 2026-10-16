import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { CloseIcon, LockIcon, UserIcon, AlertCircleIcon } from './Icons.jsx'

export default function LoginModal() {
  const { isLoginModalOpen, closeLoginModal, login, authError, isLoading } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  if (!isLoginModalOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) return
    await login(username.trim(), password.trim())
  }

  return (
    <div className="modal-backdrop" onClick={closeLoginModal}>
      <div
        className="login-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-modal-title"
      >
        <header className="login-modal-header">
          <div className="login-modal-header-left">
            <div className="login-modal-icon-badge">
              <LockIcon size={20} color="#B95C44" />
            </div>
            <div>
              <h2 id="login-modal-title" className="login-modal-title">
                เข้าสู่ระบบ Bisket Core
              </h2>
              <p className="login-modal-sub">เข้าถึงระบบจัดการและคำนวณเกรด มทส.</p>
            </div>
          </div>
          <button
            type="button"
            className="login-modal-close"
            onClick={closeLoginModal}
            aria-label="ปิดหน้าต่างเข้าสู่ระบบ"
          >
            <CloseIcon size={14} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="login-modal-body">
          {authError && (
            <div className="login-error-alert" role="alert">
              <AlertCircleIcon size={16} />
              <span>{authError}</span>
            </div>
          )}

          <div className="login-field-group">
            <label htmlFor="login-username">ชื่อผู้ใช้งาน (Username)</label>
            <div className="login-input-wrap">
              <span className="login-input-icon">
                <UserIcon size={16} />
              </span>
              <input
                id="login-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="กรอกชื่อผู้ใช้งาน"
                required
                autoFocus
              />
            </div>
          </div>

          <div className="login-field-group">
            <label htmlFor="login-password">รหัสผ่าน (Password)</label>
            <div className="login-input-wrap">
              <span className="login-input-icon">
                <LockIcon size={16} />
              </span>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="กรอกรหัสผ่าน"
                required
              />
            </div>
          </div>

          <footer className="login-modal-footer">
            <button
              type="button"
              className="btn-login-cancel"
              onClick={closeLoginModal}
              disabled={isLoading}
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="btn-login-submit"
              disabled={isLoading}
            >
              {isLoading ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}
