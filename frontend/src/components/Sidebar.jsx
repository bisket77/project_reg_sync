import React, { useState, useEffect } from 'react'
import {
  MenuIcon,
  BookOpenIcon,
  GraduationCapIcon,
  TableIcon,
  CalculatorIcon,
  LockIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CloseIcon,
  LayersIcon,
  CalendarIcon,
} from './Icons.jsx'
import { useAuth } from '../context/AuthContext.jsx'

const SIDEBAR_STORAGE_KEY = 'bisket_sidebar_collapsed'

export default function Sidebar({
  activeView,
  onSelectView,
  isMobileOpen,
  onCloseMobile,
}) {
  const { isAuthenticated, openLoginModal } = useAuth()
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  })

  // State สำหรับเปิด/ปิดเมนูย่อยของระบบเกรด
  const [isGradeMenuOpen, setIsGradeMenuOpen] = useState(true)

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next))
      return next
    })
  }

  const handleGradeNav = (viewName) => {
    if (!isAuthenticated) {
      openLoginModal()
      return
    }
    onSelectView(viewName)
    if (onCloseMobile) onCloseMobile()
  }

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="sidebar-mobile-backdrop"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`bisket-sidebar ${isCollapsed ? 'collapsed' : 'expanded'} ${
          isMobileOpen ? 'mobile-open' : ''
        }`}
        aria-label="เมนูหลัก"
      >
        {/* Sidebar Header */}
        <div className="sidebar-header">
          <button
            type="button"
            className="sidebar-toggle-btn"
            onClick={toggleCollapse}
            aria-label={isCollapsed ? 'ขยายแถบเมนู' : 'ย่อแถบเมนู'}
            title={isCollapsed ? 'ขยายเมนู' : 'ย่อเมนู'}
          >
            <MenuIcon size={20} />
          </button>

          {!isCollapsed && (
            <div className="sidebar-brand-wrapper">
              <div className="sidebar-brand-badge" title="Bisket Core">
                B
              </div>
              <div className="sidebar-brand-text">
                <span className="sidebar-brand-main">Bisket Core</span>
                <span className="sidebar-brand-sub">Cloud for CPE</span>
              </div>
            </div>
          )}

          {isMobileOpen && (
            <button
              type="button"
              className="sidebar-mobile-close"
              onClick={onCloseMobile}
              aria-label="ปิดเมนู"
            >
              <CloseIcon size={16} />
            </button>
          )}
        </div>

        {/* Navigation List */}
        <nav className="sidebar-nav">
          {/* Section 1: Curriculum / Courses */}
          <div className="sidebar-group">
            {!isCollapsed && <span className="sidebar-group-title">Curriculum</span>}
            <button
              type="button"
              className={`sidebar-item ${activeView === 'courses' ? 'active' : ''}`}
              onClick={() => {
                onSelectView('courses')
                if (onCloseMobile) onCloseMobile()
              }}
              title={isCollapsed ? 'ดูรายวิชา (Courses)' : undefined}
            >
              <span className="sidebar-item-icon">
                <BookOpenIcon size={19} />
              </span>
              {!isCollapsed && <span className="sidebar-item-text">ดูรายวิชา (Courses)</span>}
              {!isCollapsed && (
                <span className="sidebar-item-badge public">Public</span>
              )}
            </button>

            {/* Structure / Flowchart */}
            <button
              type="button"
              className={`sidebar-item ${activeView === 'curriculum' ? 'active' : ''}`}
              onClick={() => {
                onSelectView('curriculum')
                if (onCloseMobile) onCloseMobile()
              }}
              title={isCollapsed ? 'โครงสร้างวิศวะคอมฯ' : undefined}
            >
              <span className="sidebar-item-icon">
                <LayersIcon size={19} />
              </span>
              {!isCollapsed && <span className="sidebar-item-text">โครงสร้างวิศวะคอมฯ</span>}
              {!isCollapsed && (
                <span className="sidebar-item-badge public">2567</span>
              )}
            </button>

            {/* Term Timetable */}
            <button
              type="button"
              className={`sidebar-item ${activeView === 'timetable' ? 'active' : ''}`}
              onClick={() => {
                onSelectView('timetable')
                if (onCloseMobile) onCloseMobile()
              }}
              title={isCollapsed ? 'ตารางเรียนแต่ละเทอม' : undefined}
            >
              <span className="sidebar-item-icon">
                <CalendarIcon size={19} />
              </span>
              {!isCollapsed && <span className="sidebar-item-text">ตารางเรียนแต่ละเทอม</span>}
              {!isCollapsed && (
                <span className="sidebar-item-badge public">REG</span>
              )}
            </button>
          </div>

          {/* Section 2: Grade System */}
          <div className="sidebar-group">
            {!isCollapsed && (
              <div className="sidebar-group-header">
                <span className="sidebar-group-title">Grade System</span>
                {!isAuthenticated && (
                  <span className="sidebar-lock-tag" title="Sign in required">
                    <LockIcon size={11} />
                  </span>
                )}
              </div>
            )}

            {/* Menu Header Button */}
            <button
              type="button"
              className={`sidebar-item grade-parent ${
                ['grade_total', 'grade_calc', 'grade_report'].includes(activeView)
                  ? 'active'
                  : ''
              }`}
              onClick={() => {
                if (isCollapsed) {
                  handleGradeNav('grade_report')
                } else {
                  setIsGradeMenuOpen((prev) => !prev)
                }
              }}
              title={isCollapsed ? 'Grade Calculator (Sign In required)' : undefined}
            >
              <span className="sidebar-item-icon">
                <GraduationCapIcon size={20} />
              </span>
              {!isCollapsed && (
                <>
                  <span className="sidebar-item-text">Grade Calculator</span>
                  <span className="sidebar-item-chevron">
                    {isGradeMenuOpen ? (
                      <ChevronDownIcon size={12} />
                    ) : (
                      <ChevronRightIcon size={12} />
                    )}
                  </span>
                </>
              )}
            </button>

            {/* Sub-items (Total Score, Grade Scales, Grade Report) */}
            {(isGradeMenuOpen || isCollapsed) && (
              <div className={`sidebar-sub-menu ${isCollapsed ? 'collapsed-sub' : ''}`}>
                {/* 1. Total Score */}
                <button
                  type="button"
                  className={`sidebar-sub-item ${
                    activeView === 'grade_total' ? 'active' : ''
                  }`}
                  onClick={() => handleGradeNav('grade_total')}
                  title={isCollapsed ? 'Total Score' : undefined}
                >
                  <span className="sidebar-sub-icon">
                    <TableIcon size={16} />
                  </span>
                  {!isCollapsed && <span>Total Score</span>}
                  {!isAuthenticated && !isCollapsed && (
                    <span className="sub-lock-icon">
                      <LockIcon size={10} />
                    </span>
                  )}
                </button>

                {/* 2. Grade Scales */}
                <button
                  type="button"
                  className={`sidebar-sub-item ${
                    activeView === 'grade_calc' ? 'active' : ''
                  }`}
                  onClick={() => handleGradeNav('grade_calc')}
                  title={isCollapsed ? 'Grade Scales' : undefined}
                >
                  <span className="sidebar-sub-icon">
                    <CalculatorIcon size={16} />
                  </span>
                  {!isCollapsed && <span>Grade Scales</span>}
                  {!isAuthenticated && !isCollapsed && (
                    <span className="sub-lock-icon">
                      <LockIcon size={10} />
                    </span>
                  )}
                </button>

                {/* 3. Grade Report */}
                <button
                  type="button"
                  className={`sidebar-sub-item ${
                    activeView === 'grade_report' ? 'active' : ''
                  }`}
                  onClick={() => handleGradeNav('grade_report')}
                  title={isCollapsed ? 'Grade Report' : undefined}
                >
                  <span className="sidebar-sub-icon">
                    <GraduationCapIcon size={16} />
                  </span>
                  {!isCollapsed && <span>Grade Report</span>}
                  {!isAuthenticated && !isCollapsed && (
                    <span className="sub-lock-icon">
                      <LockIcon size={10} />
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          {isAuthenticated ? (
            <div className={`sidebar-user-card ${isCollapsed ? 'compact' : ''}`}>
              <div className="sidebar-user-avatar" title="Signed In">
                A
              </div>
              {!isCollapsed && (
                <div className="sidebar-user-meta">
                  <span className="sidebar-user-name">admin</span>
                  <span className="sidebar-user-role">Administrator</span>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              className="sidebar-login-prompt-btn"
              onClick={openLoginModal}
              title={isCollapsed ? 'Sign In' : undefined}
            >
              <LockIcon size={16} />
              {!isCollapsed && <span>Sign In</span>}
            </button>
          )}
        </div>
      </aside>
    </>
  )
}
