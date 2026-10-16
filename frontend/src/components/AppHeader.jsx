import React, { useState } from 'react'
import {
  MenuIcon,
  RefreshIcon,
  LockIcon,
  UserIcon,
  LogoutIcon,
  StatusDotIcon,
} from './Icons.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export default function AppHeader({
  title = 'Bisket Core',
  subtitle = 'ระบบคำนวณเกรด มทส. (SUT Grade System)',
  onToggleMobile,
  onRefresh,
}) {
  const { user, isAuthenticated, logout, openLoginModal } = useAuth()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = () => {
    setIsRefreshing(true)
    if (onRefresh) onRefresh()
    setTimeout(() => setIsRefreshing(false), 600)
  }

  return (
    <header className="sheets-topbar">
      <div className="sheets-topbar-left">
        <button
          type="button"
          className="btn-mobile-sidebar-toggle"
          onClick={onToggleMobile}
          aria-label="เปิดเมนูนำทาง"
          title="เปิดเมนู"
        >
          <MenuIcon size={20} />
        </button>
      </div>

      <div className="sheets-topbar-right">
        <span className="status-badge" title="ระบบคำนวณเกรดพร้อมใช้งาน">
          <StatusDotIcon size={8} color="#16A34A" />
          <span>Ready</span>
        </span>

        {/* Refresh button */}
        <button
          type="button"
          className="btn-refresh"
          onClick={handleRefresh}
          title="รีเฟรชการคำนวณและข้อมูลล่าสุด"
          disabled={isRefreshing}
        >
          <RefreshIcon size={14} spin={isRefreshing} />
          <span>{isRefreshing ? 'กำลังโหลด...' : 'รีเฟรช'}</span>
        </button>

        {/* Authentication button / User Badge */}
        {isAuthenticated ? (
          <button
            type="button"
            className="header-user-badge clickable"
            onClick={logout}
            title="ออกจากระบบ (คลิกเพื่อ Logout)"
          >
            <span className="header-user-avatar">
              <UserIcon size={13} />
            </span>
            <span className="header-username">{user?.username || 'admin'}</span>
          </button>
        ) : (
          <button
            type="button"
            className="btn-header-login"
            onClick={openLoginModal}
            title="เข้าสู่ระบบจัดการเกรด"
          >
            <LockIcon size={13} />
            <span>เข้าสู่ระบบ</span>
          </button>
        )}
      </div>
    </header>
  )
}
