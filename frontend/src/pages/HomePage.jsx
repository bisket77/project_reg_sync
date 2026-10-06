import React, { useState, useEffect, useMemo } from 'react'
import CourseTable from '../components/CourseTable.jsx'
import SheetTabs from '../components/SheetTabs.jsx'
import { ELECTIVE_COURSES } from '../data/electivesData.js'
import { getCourses, getStatus } from '../services/api.js'

export default function HomePage() {
  const [activeTab, setActiveTab] = useState('ALL') // 'ALL', '1', '2', '3'
  const [search, setSearch] = useState('')
  const [courses, setCourses] = useState(ELECTIVE_COURSES)
  const [status, setStatus] = useState(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [backendConnected, setBackendConnected] = useState(false)

  // Fetch status and sync with backend DB if available
  const syncWithBackend = async () => {
    setIsSyncing(true)
    try {
      const [statusRes, coursesRes] = await Promise.allSettled([
        getStatus(),
        getCourses(),
      ])

      if (statusRes.status === 'fulfilled') {
        setStatus(statusRes.value)
        setBackendConnected(true)
      }

      if (coursesRes.status === 'fulfilled' && coursesRes.value?.items?.length > 0) {
        setBackendConnected(true)
        const scrapedItems = coursesRes.value.items

        // Group scraped items by course code (normalized without spaces)
        const scrapedByCode = new Map()
        scrapedItems.forEach((c) => {
          const normCode = (c.code || '').replace(/\s+/g, '').toUpperCase()
          if (!normCode) return
          if (!scrapedByCode.has(normCode)) {
            scrapedByCode.set(normCode, new Set())
          }
          if (c.semester) {
            scrapedByCode.get(normCode).add(String(c.semester))
          }
        })

        // Merge with master courses
        const updated = ELECTIVE_COURSES.map((master) => {
          const normCode = master.code.replace(/\s+/g, '').toUpperCase()
          const termSet = scrapedByCode.get(normCode)

          if (!termSet || termSet.size === 0) {
            return master
          }

          const terms = Array.from(termSet).sort()
          let termDisplay = 'ไม่มีข้อมูล'

          if (terms.includes('1') && terms.includes('2') && terms.includes('3')) {
            termDisplay = 'เปิดทุกเทอม'
          } else if (terms.length === 1) {
            termDisplay = `เทอม ${terms[0]}`
          } else if (terms.length > 0) {
            termDisplay = terms.map((t) => `เทอม ${t}`).join(', ')
          }

          return {
            ...master,
            terms,
            termDisplay,
          }
        })

        setCourses(updated)
      }
    } catch {
      // Backend not reached, keep default ELECTIVE_COURSES
      setBackendConnected(false)
    } finally {
      setIsSyncing(false)
    }
  }

  useEffect(() => {
    syncWithBackend()
    const timer = setInterval(syncWithBackend, 60_000)
    return () => clearInterval(timer)
  }, [])

  // Title changes based on active tab
  const pageTitle = useMemo(() => {
    switch (activeTab) {
      case '1':
        return 'วิชาเลือกสาขาวิศวกรรมศาสตร์ เทอม 1'
      case '2':
        return 'วิชาเลือกสาขาวิศวกรรมศาสตร์ เทอม 2'
      case '3':
        return 'วิชาเลือกสาขาวิศวกรรมศาสตร์ เทอม 3'
      case 'ALL':
      default:
        return 'วิชาเลือกสาขาวิศวกรรมศาสตร์'
    }
  }, [activeTab])

  // Filter courses by active tab and search query
  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      // 1. Tab filter
      if (activeTab === '1') {
        const matchesTerm1 = c.terms?.includes('1') || c.termDisplay === 'เปิดทุกเทอม'
        if (!matchesTerm1) return false
      } else if (activeTab === '2') {
        const matchesTerm2 = c.terms?.includes('2') || c.termDisplay === 'เปิดทุกเทอม'
        if (!matchesTerm2) return false
      } else if (activeTab === '3') {
        const matchesTerm3 = c.terms?.includes('3') || c.termDisplay === 'เปิดทุกเทอม'
        if (!matchesTerm3) return false
      }

      // 2. Search keyword filter
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        const codeMatch = c.code.toLowerCase().includes(q)
        const nameEnMatch = c.nameEn?.toLowerCase().includes(q)
        const nameThMatch = c.nameTh?.toLowerCase().includes(q)
        const credMatch = c.credits?.toLowerCase().includes(q)
        const termMatch = c.termDisplay?.toLowerCase().includes(q)
        return codeMatch || nameEnMatch || nameThMatch || credMatch || termMatch
      }

      return true
    })
  }, [courses, activeTab, search])

  return (
    <div className="sheets-container">
      {/* Top bar */}
      <header className="sheets-topbar">
        <div className="sheets-topbar-left">
          <div className="sheets-icon" title="REG Sync Spreadsheet">
            📊
          </div>
          <div>
            <div className="sheets-filename">
              <span>วิชาเลือกสาขาวิศวกรรมศาสตร์</span>
              <span
                className={`status-badge ${isSyncing ? 'syncing' : ''}`}
                title={backendConnected ? 'เชื่อมต่อฐานข้อมูล REG สำเร็จ' : 'แสดงข้อมูลจากหลักสูตร'}
              >
                {isSyncing
                  ? 'กำลังซิงค์...'
                  : backendConnected
                  ? '● ซิงค์กับ REG แล้ว'
                  : 'โหมดออฟไลน์ (Master Data)'}
              </span>
            </div>
          </div>
        </div>

        <div className="sheets-topbar-right">
          <div className="search-box">
            <span>🔍</span>
            <input
              type="text"
              placeholder="ค้นหารหัส หรือชื่อวิชา..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  color: '#94A3B8',
                  fontSize: 14,
                }}
              >
                ✕
              </button>
            )}
          </div>

          <button
            type="button"
            className="btn-refresh"
            onClick={syncWithBackend}
            title="รีเฟรชข้อมูล"
            disabled={isSyncing}
          >
            ↻ {isSyncing ? 'กำลังโหลด...' : 'รีเฟรช'}
          </button>
        </div>
      </header>

      {/* Main Sheet View */}
      <main className="sheet-content">
        <h1 className="sheet-title">{pageTitle}</h1>
        <CourseTable items={filteredCourses} />
      </main>

      {/* Sticky Google Sheets Bottom Bar */}
      <SheetTabs
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        counts={{
          showing: filteredCourses.length,
          total: courses.length,
        }}
      />
    </div>
  )
}
