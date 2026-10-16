import React, { useState } from 'react'
import { AuthProvider } from './context/AuthContext.jsx'
import { GradeProvider } from './context/GradeContext.jsx'
import Sidebar from './components/Sidebar.jsx'
import AppHeader from './components/AppHeader.jsx'
import LoginModal from './components/LoginModal.jsx'
import GradeRouteGuard from './components/GradeRouteGuard.jsx'

// Pages
import HomePage from './pages/HomePage.jsx'
import CurriculumStructurePage from './pages/CurriculumStructurePage.jsx'
import TotalScorePage from './pages/grade/TotalScorePage.jsx'
import CalculatorScalePage from './pages/grade/CalculatorScalePage.jsx'
import GradeReportPage from './pages/grade/GradeReportPage.jsx'

function MainLayout() {
  const [activeView, setActiveView] = useState('courses') // 'courses', 'curriculum', 'timetable', 'grade_total', 'grade_calc', 'grade_report'
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  return (
    <div className="bisket-app-root">
      {/* Collapsible Left Sidebar */}
      <Sidebar
        activeView={activeView}
        onSelectView={setActiveView}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Main View Area */}
      <div className="bisket-app-main">
        {activeView === 'courses' && (
          <HomePage onToggleMobile={() => setIsMobileOpen(true)} />
        )}

        {activeView === 'curriculum' && (
          <CurriculumStructurePage
            defaultTab="flowchart"
            onToggleMobile={() => setIsMobileOpen(true)}
          />
        )}

        {activeView === 'timetable' && (
          <CurriculumStructurePage
            defaultTab="timetable"
            onToggleMobile={() => setIsMobileOpen(true)}
          />
        )}

        {activeView === 'grade_total' && (
          <GradeRouteGuard>
            <div className="grade-view-container">
              <AppHeader onToggleMobile={() => setIsMobileOpen(true)} />
              <TotalScorePage />
            </div>
          </GradeRouteGuard>
        )}

        {activeView === 'grade_calc' && (
          <GradeRouteGuard>
            <div className="grade-view-container">
              <AppHeader onToggleMobile={() => setIsMobileOpen(true)} />
              <CalculatorScalePage />
            </div>
          </GradeRouteGuard>
        )}

        {activeView === 'grade_report' && (
          <GradeRouteGuard>
            <div className="grade-view-container">
              <AppHeader onToggleMobile={() => setIsMobileOpen(true)} />
              <GradeReportPage />
            </div>
          </GradeRouteGuard>
        )}
      </div>

      {/* Login Modal */}
      <LoginModal />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <GradeProvider>
        <MainLayout />
      </GradeProvider>
    </AuthProvider>
  )
}
