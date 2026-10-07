import React, { useState, useEffect, useMemo } from 'react'
import CourseTable from '../components/CourseTable.jsx'
import CourseDetailModal from '../components/CourseDetailModal.jsx'
import SheetTabs from '../components/SheetTabs.jsx'
import { ELECTIVE_COURSES } from '../data/electivesData.js'
import { CORE_COURSES } from '../data/coreCoursesData.js'
import { GE_ELECTIVE_COURSES } from '../data/geElectivesData.js'
import { FREE_ELECTIVE_COURSES } from '../data/freeElectivesData.js'
import { getCourses, getStatus } from '../services/api.js'
import { SearchIcon, RefreshIcon, CloseIcon, StatusDotIcon } from '../components/Icons.jsx'

export default function HomePage() {
  const [mainCategory, setMainCategory] = useState('core') // 'core', 'elective', 'ge_elective', 'free_elective'
  const [selectedYear, setSelectedYear] = useState('all') // 'all', '1', '2', '3', '4'
  const [selectedSubCat, setSelectedSubCat] = useState('all')
  const [activeTab, setActiveTab] = useState('ALL') // 'ALL', '1', '2', '3'
  const [search, setSearch] = useState('')
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [allScrapedItems, setAllScrapedItems] = useState([])
  const [electiveList, setElectiveList] = useState(ELECTIVE_COURSES)
  const [coreList, setCoreList] = useState(CORE_COURSES)
  const [geElectiveList, setGeElectiveList] = useState(GE_ELECTIVE_COURSES)
  const [freeElectiveList, setFreeElectiveList] = useState(FREE_ELECTIVE_COURSES)
  const [status, setStatus] = useState(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [backendConnected, setBackendConnected] = useState(false)

  // Dynamic sub-categories for core courses
  const coreSubCategories = useMemo(() => {
    return [
      { id: 'all', label: 'ทั้งหมด' },
      {
        id: 'ฮาร์ดแวร์และสถาปัตยกรรมคอมพิวเตอร์',
        label: `ฮาร์ดแวร์ & สถาปัตยกรรม (${coreList.filter((c) => c.subCategory === 'ฮาร์ดแวร์และสถาปัตยกรรมคอมพิวเตอร์').length})`,
      },
      {
        id: 'เทคโนโลยีและวิธีการทางซอฟต์แวร์',
        label: `ซอฟต์แวร์ (${coreList.filter((c) => c.subCategory === 'เทคโนโลยีและวิธีการทางซอฟต์แวร์').length})`,
      },
      {
        id: 'โครงสร้างพื้นฐานของระบบ',
        label: `โครงสร้างพื้นฐาน (${coreList.filter((c) => c.subCategory === 'โครงสร้างพื้นฐานของระบบ').length})`,
      },
      {
        id: 'เทคโนโลยีเพื่องานประยุกต์',
        label: `เทคโนโลยีประยุกต์ (${coreList.filter((c) => c.subCategory === 'เทคโนโลยีเพื่องานประยุกต์').length})`,
      },
      {
        id: 'พื้นฐานการโปรแกรมและสถิติ',
        label: `พื้นฐานโปรแกรม & สถิติ (${coreList.filter((c) => c.subCategory === 'พื้นฐานการโปรแกรมและสถิติ').length})`,
      },
      {
        id: 'โครงงานและสหกิจศึกษา',
        label: `โครงงาน & สหกิจ (${coreList.filter((c) => c.subCategory === 'โครงงานและสหกิจศึกษา').length})`,
      },
    ]
  }, [coreList])

  const applyScrapedCourses = (scrapedItems) => {
    setAllScrapedItems(scrapedItems || [])
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

    const mergeList = (targetList) => {
      return targetList.map((item) => {
        const normCode = item.code.replace(/\s+/g, '').toUpperCase()
        const termSet = scrapedByCode.get(normCode)

        if (!termSet || termSet.size === 0) {
          return {
            ...item,
            terms: [],
            termDisplay: 'ยังไม่มีข้อมูลเปิดสอน',
          }
        }

        const terms = Array.from(termSet).sort()
        let termDisplay = 'ยังไม่มีข้อมูลเปิดสอน'

        if (terms.includes('1') && terms.includes('2') && terms.includes('3')) {
          termDisplay = 'เปิดทุกเทอม'
        } else if (terms.length === 1) {
          termDisplay = `เทอม ${terms[0]}`
        } else if (terms.length > 0) {
          termDisplay = terms.map((t) => `เทอม ${t}`).join(', ')
        }

        return {
          ...item,
          terms,
          termDisplay,
        }
      })
    }

    setCoreList(CORE_COURSES) // วิชาชีพบังคับยึดตามแผนการศึกษาจริง ไม่ถูกทับด้วยข้อมูลเปิดสอบซ้ำ
    setElectiveList(mergeList(ELECTIVE_COURSES))
    setGeElectiveList(mergeList(GE_ELECTIVE_COURSES))
    setFreeElectiveList(mergeList(FREE_ELECTIVE_COURSES))
  }

function formatThaiDateTime(date = new Date()) {
  const thaiMonths = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ]
  const day = date.getDate()
  const month = thaiMonths[date.getMonth()]
  const year = date.getFullYear() + 543
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${day} ${month} ${year} ${hours}:${minutes} น.`
}

  // Fetch status and sync with courses.json or backend DB if available
  const syncWithBackend = async (isManual = false) => {
    setIsSyncing(true)
    let dataLoaded = false

    const minDelay = isManual
      ? new Promise((resolve) => setTimeout(resolve, 500))
      : Promise.resolve()

    try {
      // 1. Try static courses.json first (GitHub Pages mode)
      try {
        const jsonRes = await fetch('./courses.json?t=' + Date.now())
        if (jsonRes.ok) {
          const json = await jsonRes.json()
          if (json.items && json.items.length > 0) {
            applyScrapedCourses(json.items)
            const currentTimeThai = formatThaiDateTime(new Date())
            setStatus({
              last_run: isManual ? new Date().toISOString() : (json.updated_at || new Date().toISOString()),
              last_run_thai: isManual ? currentTimeThai : (json.updated_at_thai || currentTimeThai),
              last_count: json.total_scraped,
            })
            setBackendConnected(true)
            dataLoaded = true
          }
        }
      } catch {
        // Fallback to API
      }

      // 2. If API is available (Local dev mode / Docker)
      if (!dataLoaded) {
        try {
          const [statusRes, coursesRes] = await Promise.allSettled([
            getStatus(),
            getCourses(),
          ])

          if (statusRes.status === 'fulfilled') {
            const currentTimeThai = formatThaiDateTime(new Date())
            setStatus({
              ...statusRes.value,
              last_run_thai: isManual ? currentTimeThai : (statusRes.value.last_run_thai || currentTimeThai),
            })
            setBackendConnected(true)
          }

          if (coursesRes.status === 'fulfilled' && coursesRes.value?.items?.length > 0) {
            applyScrapedCourses(coursesRes.value.items)
            setBackendConnected(true)
            dataLoaded = true
          }
        } catch {
          // Ignore
        }
      }

      if (!dataLoaded) {
        setBackendConnected(false)
      }
    } finally {
      await minDelay
      setIsSyncing(false)
    }
  }

  useEffect(() => {
    syncWithBackend(false)
    const timer = setInterval(() => syncWithBackend(false), 60_000)
    return () => clearInterval(timer)
  }, [])

  // Year options for core courses
  const yearOptions = useMemo(
    () => [
      { id: 'all', label: 'ทุกชั้นปี', count: coreList.length },
      { id: '2', label: 'ชั้นปี 2', count: coreList.filter((c) => c.year === 2).length },
      { id: '3', label: 'ชั้นปี 3', count: coreList.filter((c) => c.year === 3).length },
      { id: '4', label: 'ชั้นปี 4', count: coreList.filter((c) => c.year === 4).length },
      { id: '1', label: 'ชั้นปี 1', count: coreList.filter((c) => c.year === 1).length },
    ],
    [coreList]
  )

  // Title changes based on category, year, and active tab
  const pageTitle = useMemo(() => {
    let baseTitle = ''
    switch (mainCategory) {
      case 'core':
        if (selectedYear !== 'all') {
          baseTitle = `วิชาชีพบังคับ ชั้นปีที่ ${selectedYear} สาขาวิศวกรรมคอมพิวเตอร์`
        } else {
          baseTitle = 'วิชาชีพบังคับสาขาวิศวกรรมคอมพิวเตอร์'
        }
        break
      case 'elective':
        baseTitle = 'วิชาเลือกสาขาวิศวกรรมคอมพิวเตอร์'
        break
      case 'ge_elective':
        baseTitle = 'กลุ่มวิชาศึกษาทั่วไปแบบเลือก (1.3)'
        break
      case 'free_elective':
        baseTitle = 'หมวดวิชาเลือกเสรี (4)'
        break
      default:
        baseTitle = 'รายวิชา'
    }

    switch (activeTab) {
      case '1':
        return `${baseTitle} เทอม 1`
      case '2':
        return `${baseTitle} เทอม 2`
      case '3':
        return `${baseTitle} เทอม 3`
      case 'ALL':
      default:
        return baseTitle
    }
  }, [mainCategory, selectedYear, activeTab])

  // Current list based on category
  const currentList = useMemo(() => {
    switch (mainCategory) {
      case 'core':
        return coreList
      case 'elective':
        return electiveList
      case 'ge_elective':
        return geElectiveList
      case 'free_elective':
        return freeElectiveList
      default:
        return coreList
    }
  }, [mainCategory, coreList, electiveList, geElectiveList, freeElectiveList])

  const currentTotal = currentList.length

  // Filter courses by category, year, sub-category, active tab and search query
  const filteredCourses = useMemo(() => {
    return currentList.filter((c) => {
      // 1. Year filter (only applicable for core courses)
      if (mainCategory === 'core' && selectedYear !== 'all') {
        if (String(c.year) !== selectedYear) return false
      }

      // 2. Sub-category filter (only applicable for core courses)
      if (mainCategory === 'core' && selectedSubCat !== 'all') {
        if (c.subCategory !== selectedSubCat) return false
      }

      // 3. Tab filter
      if (activeTab !== 'ALL') {
        if (mainCategory === 'core') {
          // วิชาชีพบังคับ ยึดตามภาคการศึกษาตามแผนการเรียนจริงของสาขา
          if (String(c.semester) !== activeTab) return false
        } else {
          // วิชาเลือกและอื่นๆ ยึดตามข้อมูลเทอมที่เปิดสอนจริง
          if (!c.terms || !c.terms.includes(activeTab)) return false
        }
      }

      // 4. Search keyword filter
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        const codeMatch = c.code.toLowerCase().includes(q)
        const nameEnMatch = c.nameEn?.toLowerCase().includes(q)
        const nameThMatch = c.nameTh?.toLowerCase().includes(q)
        const credMatch = c.credits?.toLowerCase().includes(q)
        const termMatch = c.termDisplay?.toLowerCase().includes(q)
        const subCatMatch = c.subCategory?.toLowerCase().includes(q)
        const progMatch = c.programType?.toLowerCase().includes(q)
        return codeMatch || nameEnMatch || nameThMatch || credMatch || termMatch || subCatMatch || progMatch
      }

      return true
    })
  }, [currentList, mainCategory, selectedYear, selectedSubCat, activeTab, search])

  // Status badge config
  const statusConfig = useMemo(() => {
    if (isSyncing) {
      return { text: 'กำลังซิงค์ข้อมูล...', color: '#D97706' }
    }
    if (backendConnected) {
      const timeStr = status?.last_run_thai ? ` (${status.last_run_thai})` : ''
      return { text: `ซิงค์กับ REG มทส. แล้ว${timeStr}`, color: '#16A34A' }
    }
    return { text: 'โหมด Master Data', color: '#B95C44' }
  }, [isSyncing, backendConnected, status])

  // Get sections from scraped data for the currently selected course
  const courseSections = useMemo(() => {
    if (!selectedCourse) return []
    const targetCode = (selectedCourse.code || selectedCourse.raw?.['รหัสวิชา'] || '')
      .replace(/\s+/g, '')
      .toUpperCase()
    return allScrapedItems.filter((item) => {
      const itemCode = (item.code || item.raw?.['รหัสวิชา'] || '')
        .replace(/\s+/g, '')
        .toUpperCase()
      return itemCode === targetCode
    })
  }, [selectedCourse, allScrapedItems])

  return (
    <div className="sheets-container">
      {/* Top bar (Caesar Cluster Terracotta Theme) */}
      <header className="sheets-topbar">
        <div className="sheets-topbar-left">
          <div className="sheets-brand-badge" title="Caesar Cluster">
            C
          </div>
          <div className="sheets-brand-info">
            <span className="sheets-brand-title">Caesar Cluster</span>
            <span className="sheets-brand-sub">Cloud for CPE · แผนการเรียนวิศวกรรมคอมพิวเตอร์ (REG Sync)</span>
          </div>
        </div>

        <div className="sheets-topbar-right">
          <span
            className={`status-badge ${isSyncing ? 'syncing' : ''}`}
            title={backendConnected ? 'เชื่อมต่อฐานข้อมูล REG สำเร็จ' : 'แสดงข้อมูลจากหลักสูตร'}
          >
            <StatusDotIcon size={8} color={statusConfig.color} />
            <span>{statusConfig.text}</span>
          </span>

          <button
            type="button"
            className="btn-refresh"
            onClick={() => syncWithBackend(true)}
            title="รีเฟรชข้อมูลล่าสุด"
            disabled={isSyncing}
          >
            <RefreshIcon size={14} spin={isSyncing} />
            <span>{isSyncing ? 'กำลังโหลด...' : 'รีเฟรช'}</span>
          </button>
        </div>
      </header>

      {/* Main Sheet View */}
      <main className="sheet-content">
        {/* Category Navigation (4 หมวดหลัก) */}
        <div className="category-nav-wrapper">
          <div className="category-nav-tabs">
            <button
              type="button"
              className={`cat-tab-btn ${mainCategory === 'core' ? 'active' : ''}`}
              onClick={() => {
                setMainCategory('core')
                setSelectedYear('all')
                setSelectedSubCat('all')
              }}
            >
              วิชาชีพบังคับ ({coreList.length} วิชา)
            </button>
            <button
              type="button"
              className={`cat-tab-btn ${mainCategory === 'elective' ? 'active' : ''}`}
              onClick={() => {
                setMainCategory('elective')
                setSelectedYear('all')
                setSelectedSubCat('all')
              }}
            >
              วิชาเลือกสาขา ({electiveList.length} วิชา)
            </button>
            <button
              type="button"
              className={`cat-tab-btn ${mainCategory === 'ge_elective' ? 'active' : ''}`}
              onClick={() => {
                setMainCategory('ge_elective')
                setSelectedYear('all')
                setSelectedSubCat('all')
              }}
            >
              ศึกษาทั่วไปแบบเลือก ({geElectiveList.length} วิชา)
            </button>
            <button
              type="button"
              className={`cat-tab-btn ${mainCategory === 'free_elective' ? 'active' : ''}`}
              onClick={() => {
                setMainCategory('free_elective')
                setSelectedYear('all')
                setSelectedSubCat('all')
              }}
            >
              หมวดวิชาเลือกเสรี ({freeElectiveList.length} วิชา)
            </button>
          </div>
        </div>

        {/* Title */}
        <h1 className="sheet-title">{pageTitle}</h1>

        {/* Year Filter Buttons (ONLY for Core Compulsory courses) */}
        {mainCategory === 'core' && (
          <div className="year-selector-wrapper">
            <span className="filter-group-label">ชั้นปี:</span>
            <div className="year-tabs-group">
              {yearOptions.map((yo) => (
                <button
                  key={yo.id}
                  type="button"
                  className={`year-tab-btn ${selectedYear === yo.id ? 'active' : ''}`}
                  onClick={() => setSelectedYear(yo.id)}
                >
                  {yo.label} ({yo.count})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sub-category Filter Chips (Only for Core Compulsory courses) */}
        {mainCategory === 'core' && (
          <div className="subcat-chips-wrapper">
            <span className="filter-group-label">กลุ่มวิชา:</span>
            {coreSubCategories.map((sc) => (
              <button
                key={sc.id}
                type="button"
                className={`subcat-chip ${selectedSubCat === sc.id ? 'active' : ''}`}
                onClick={() => setSelectedSubCat(sc.id)}
              >
                {sc.label}
              </button>
            ))}
          </div>
        )}

        {/* Full-width Search Bar placed directly under the title, spanning to the table */}
        <div className="sheet-search-wrapper">
          <div className="search-bar-full">
            <span className="search-bar-icon">
              <SearchIcon size={18} />
            </span>
            <input
              type="text"
              placeholder={
                mainCategory === 'core'
                  ? 'ค้นหารหัสวิชา หรือชื่อวิชาชีพบังคับ เช่น ENG23 2031, Data Structures, สถาปัตยกรรม...'
                  : mainCategory === 'elective'
                  ? 'ค้นหารหัสวิชา หรือชื่อวิชาเลือกสาขา เช่น ENG23 3012, Machine Learning, โครงงาน...'
                  : mainCategory === 'ge_elective'
                  ? 'ค้นหาวิชาศึกษาทั่วไปแบบเลือก เช่น IST20 1501, Thai, Design Thinking...'
                  : 'ค้นหาวิชาเลือกเสรี เช่น 114100, กีฬา, สุนัขและแมว, ไวน์...'
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus={false}
            />
            {search && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearch('')}
                title="ล้างข้อความค้นหา"
              >
                <CloseIcon size={12} />
              </button>
            )}
            <span className="search-count-pill">
              แสดง {filteredCourses.length} จาก {currentTotal} วิชา
            </span>
          </div>
        </div>

        {/* Course Table */}
        <CourseTable items={filteredCourses} onSelectCourse={setSelectedCourse} />
      </main>

      {/* Sticky Google Sheets Bottom Bar */}
      <SheetTabs
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        counts={{
          showing: filteredCourses.length,
          total: currentTotal,
        }}
      />

      {/* Course Detail Modal */}
      {selectedCourse && (
        <CourseDetailModal
          course={selectedCourse}
          sections={courseSections}
          onClose={() => setSelectedCourse(null)}
        />
      )}
    </div>
  )
}
