import React, { useState, useEffect, useMemo } from 'react'
import CourseTable from '../components/CourseTable.jsx'
import CourseDetailModal from '../components/CourseDetailModal.jsx'
import SheetTabs from '../components/SheetTabs.jsx'
import { ELECTIVE_COURSES } from '../data/electivesData.js'
import { CORE_COURSES } from '../data/coreCoursesData.js'
import { GE_ELECTIVE_COURSES } from '../data/geElectivesData.js'
import { FREE_ELECTIVE_COURSES } from '../data/freeElectivesData.js'
import { INITIAL_CURRICULUM_STRUCTURE, CURRICULUM_CATEGORIES } from '../data/cpeCurriculum2567Data.js'
import { getCourses, getStatus } from '../services/api.js'
import {
  SearchIcon,
  RefreshIcon,
  CloseIcon,
  StatusDotIcon,
  MenuIcon,
  LockIcon,
  UserIcon,
  LogoutIcon,
  ExternalLinkIcon,
} from '../components/Icons.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export default function HomePage({ onToggleMobile }) {
  const { user, isAuthenticated, logout, openLoginModal } = useAuth()
  const [mainCategory, setMainCategory] = useState('plan') // 'plan', 'core', 'elective', 'ge_elective', 'free_elective'
  const [selectedYear, setSelectedYear] = useState('2') // 'all', '1', '2', '3', '4'
  const [selectedSubCat, setSelectedSubCat] = useState('all')
  const [activeTab, setActiveTab] = useState('1') // 'ALL', '1', '2', '3'
  const [search, setSearch] = useState('')
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [copiedCode, setCopiedCode] = useState(null)
  const [allScrapedItems, setAllScrapedItems] = useState([])
  const [electiveList, setElectiveList] = useState(ELECTIVE_COURSES)
  const [coreList, setCoreList] = useState(CORE_COURSES)
  const [geElectiveList, setGeElectiveList] = useState(GE_ELECTIVE_COURSES)
  const [freeElectiveList, setFreeElectiveList] = useState(FREE_ELECTIVE_COURSES)
  const [status, setStatus] = useState(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [backendConnected, setBackendConnected] = useState(false)

  // Load saved or initial CPE curriculum plan (compulsory + electives by term)
  const curriculumPlanData = useMemo(() => {
    try {
      const saved = localStorage.getItem('cpe_curriculum_structure_2567')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch (e) {
      console.warn('Failed to parse saved curriculum plan', e)
    }
    return INITIAL_CURRICULUM_STRUCTURE
  }, [])

  // Flattened courses from the curriculum plan across all years and terms
  const allPlanCourses = useMemo(() => {
    const list = []
    curriculumPlanData.forEach((y) => {
      y.terms.forEach((t) => {
        t.courses.forEach((c) => {
          list.push({
            ...c,
            yearId: y.yearId,
            yearLabel: y.yearLabel,
            yearTh: y.yearTh,
            termId: t.termId,
            termLabel: t.termLabel,
            termTh: t.termTh,
          })
        })
      })
    })
    return list
  }, [curriculumPlanData])

  const handleCopyCode = (e, code) => {
    e.stopPropagation()
    if (!code || code.includes('XXXX') || code === '-') return
    navigator?.clipboard?.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode((prev) => (prev === code ? null : prev)), 1500)
  }

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
      {
        id: 'ศึกษาทั่วไปและพื้นฐานบังคับ',
        label: `ศึกษาทั่วไป & พื้นฐาน (${coreList.filter((c) => c.subCategory === 'ศึกษาทั่วไปและพื้นฐานบังคับ').length})`,
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
  const d = date instanceof Date ? date : new Date(date)
  const day = d.getDate()
  const month = d.getMonth() + 1
  const year2 = String(d.getFullYear() + 543).slice(-2)
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${day}/${month}/${year2} ${hours}.${minutes} น.`
}

function formatShortThaiTime(val) {
  if (!val) return ''
  const thaiMonths = {
    'ม.ค.': 1, 'ก.พ.': 2, 'มี.ค.': 3, 'เม.ย.': 4, 'พ.ค.': 5, 'มิ.ย.': 6,
    'ก.ค.': 7, 'ส.ค.': 8, 'ก.ย.': 9, 'ต.ค.': 10, 'พ.ย.': 11, 'ธ.ค.': 12
  }
  const match = String(val).match(/(\d{1,2})\s+([^\s]+)\s+(\d{4})\s+(\d{1,2})[:.](\d{2})/)
  if (match) {
    const [, d, mStr, yStr, h, min] = match
    const m = thaiMonths[mStr] || mStr
    const y2 = yStr.slice(-2)
    return `${d}/${m}/${y2} ${String(h).padStart(2, '0')}.${min} น.`
  }
  const parsed = new Date(val)
  if (!isNaN(parsed.getTime())) {
    return formatThaiDateTime(parsed)
  }
  return String(val)
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
      case 'plan':
        if (selectedYear !== 'all') {
          baseTitle = `วิชาชีพบังคับและเลือก ชั้นปีที่ ${selectedYear} ตามแผนการเรียน 2567`
        } else {
          baseTitle = 'วิชาชีพบังคับและเลือก ตามแผนการเรียนวิศวกรรมคอมพิวเตอร์ (ปี 2567)'
        }
        break
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
      case 'plan':
        return allPlanCourses
      case 'core':
        return coreList
      case 'elective':
        return electiveList
      case 'ge_elective':
        return geElectiveList
      case 'free_elective':
        return freeElectiveList
      default:
        return allPlanCourses
    }
  }, [mainCategory, allPlanCourses, coreList, electiveList, geElectiveList, freeElectiveList])

  const currentTotal = currentList.length

  // Filter courses from curriculum plan
  const filteredPlanCourses = useMemo(() => {
    if (mainCategory !== 'plan') return []

    return allPlanCourses.filter((c) => {
      // 1. Year filter
      if (selectedYear !== 'all') {
        if (String(c.yearId) !== String(selectedYear)) return false
      }

      // 2. Term filter
      if (activeTab !== 'ALL') {
        if (String(c.termId) !== String(activeTab)) return false
      }

      // 3. Search keyword filter
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        const codeMatch = c.code?.toLowerCase().includes(q)
        const nameEnMatch = c.nameEn?.toLowerCase().includes(q)
        const nameThMatch = c.nameTh?.toLowerCase().includes(q)
        const credMatch = (c.creditsFull || String(c.credits))?.toLowerCase().includes(q)
        const catObj = CURRICULUM_CATEGORIES[c.category]
        const catMatch = catObj
          ? (catObj.nameEn.toLowerCase().includes(q) || catObj.nameTh.toLowerCase().includes(q))
          : false
        const prereqMatch = c.prereq?.some((p) => p.toLowerCase().includes(q))
        return codeMatch || nameEnMatch || nameThMatch || credMatch || catMatch || prereqMatch
      }

      return true
    })
  }, [allPlanCourses, mainCategory, selectedYear, activeTab, search])

  // Filter courses by category, year, sub-category, active tab and search query
  const filteredCourses = useMemo(() => {
    if (mainCategory === 'plan') return filteredPlanCourses

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
      return { text: 'Syncing...', color: '#D97706' }
    }
    if (backendConnected) {
      const timeStr = status?.last_run_thai ? ` (${formatShortThaiTime(status.last_run_thai)})` : ''
      return { text: `Synced${timeStr}`, color: '#16A34A' }
    }
    return { text: 'Master Data', color: '#B95C44' }
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
      {/* Top bar (Bisket Core Terracotta Theme) */}
      <header className="sheets-topbar">
        <div className="sheets-topbar-left">
          {onToggleMobile && (
            <button
              type="button"
              className="btn-mobile-sidebar-toggle"
              onClick={onToggleMobile}
              aria-label="เปิดเมนูนำทาง"
              title="เปิดเมนู"
            >
              <MenuIcon size={20} />
            </button>
          )}
          <div className="sheets-brand-badge" title="Bisket Core">
            B
          </div>
          <div className="sheets-brand-info">
            <span className="sheets-brand-title">Bisket Core</span>
            <span className="sheets-brand-sub">ดูรายวิชา (Course Viewer)</span>
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

      {/* Main Sheet View */}
      <main className="sheet-content">
        {/* Category Navigation (4 หมวดหลัก) */}
        <div className="category-nav-wrapper">
          <div className="category-nav-tabs">
            <button
              type="button"
              className={`cat-tab-btn ${mainCategory === 'plan' ? 'active' : ''}`}
              onClick={() => {
                setMainCategory('plan')
                setSelectedYear('2')
                setActiveTab('1')
                setSelectedSubCat('all')
              }}
            >
              วิชาชีพบังคับ & เลือก ({allPlanCourses.length} วิชา)
            </button>
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

        {/* Row 1: ชั้นปี (สำหรับวิชาชีพบังคับ & เลือกตามแผน และวิชาชีพบังคับ) */}
        {(mainCategory === 'core' || mainCategory === 'plan') && (
          <div className="year-selector-wrapper">
            <span className="filter-group-label">ชั้นปี:</span>
            <div className="year-tabs-group">
              {[
                {
                  id: 'all',
                  label: 'ทั้งหมด',
                  count: mainCategory === 'plan' ? allPlanCourses.length : coreList.length,
                },
                {
                  id: '1',
                  label: 'ชั้นปีที่ 1',
                  count: mainCategory === 'plan'
                    ? allPlanCourses.filter((c) => c.yearId === 1).length
                    : coreList.filter((c) => String(c.year) === '1').length,
                },
                {
                  id: '2',
                  label: 'ชั้นปีที่ 2',
                  count: mainCategory === 'plan'
                    ? allPlanCourses.filter((c) => c.yearId === 2).length
                    : coreList.filter((c) => String(c.year) === '2').length,
                },
                {
                  id: '3',
                  label: 'ชั้นปีที่ 3',
                  count: mainCategory === 'plan'
                    ? allPlanCourses.filter((c) => c.yearId === 3).length
                    : coreList.filter((c) => String(c.year) === '3').length,
                },
                {
                  id: '4',
                  label: 'ชั้นปีที่ 4',
                  count: mainCategory === 'plan'
                    ? allPlanCourses.filter((c) => c.yearId === 4).length
                    : coreList.filter((c) => String(c.year) === '4').length,
                },
              ].map((yo) => (
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

        {/* Row 2: เทอม (SheetTabs - Tag เทอม) */}
        <div className="term-selector-wrapper">
          <span className="filter-group-label">เทอม:</span>
          <SheetTabs
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            counts={{
              showing: mainCategory === 'plan' ? filteredPlanCourses.length : filteredCourses.length,
              total: mainCategory === 'plan' ? allPlanCourses.length : currentTotal,
            }}
          />
        </div>

        {/* Row 3: กลุ่มวิชา (สำหรับวิชาชีพบังคับแบบเดิม) */}
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

        {/* Full-width Search Bar */}
        <div className="sheet-search-wrapper">
          <div className="search-bar-full">
            <span className="search-bar-icon">
              <SearchIcon size={18} />
            </span>
            <input
              type="text"
              placeholder={
                mainCategory === 'plan'
                  ? 'ค้นหารหัสวิชา หรือชื่อวิชาในแผน เช่น ENG23 2071, Electronics, ฟิสิกส์...'
                  : mainCategory === 'core'
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
              แสดง {mainCategory === 'plan' ? filteredPlanCourses.length : filteredCourses.length} จาก {mainCategory === 'plan' ? allPlanCourses.length : currentTotal} วิชา
            </span>
          </div>
        </div>

        {/* Course Table: When mainCategory === 'plan', render the rich timetable-style table (Image 2) */}
        {mainCategory === 'plan' ? (
          <div className="term-courses-table-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 className="section-heading" style={{ margin: 0 }}>
                รายวิชาบังคับและเลือกตามแผนการเรียน : {
                  selectedYear === 'all' && activeTab === 'ALL'
                    ? 'ทุกชั้นปี ทุกภาคการศึกษา (หลักสูตร CPE 2567)'
                    : selectedYear === 'all'
                    ? `ทุกชั้นปี เทอม ${activeTab}`
                    : activeTab === 'ALL'
                    ? `ชั้นปีที่ ${selectedYear} ทุกเทอม`
                    : `ชั้นปีที่ ${selectedYear} เทอม ${activeTab}`
                }
              </h3>
              <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 600 }}>
                {filteredPlanCourses.length} รายวิชา
              </span>
            </div>

            {filteredPlanCourses.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px 20px', textAlign: 'center', color: '#6B7280' }}>
                ไม่พบรายวิชาตามเงื่อนไขที่เลือก
              </div>
            ) : (
              <table className="term-courses-table">
                <thead>
                  <tr>
                    <th>รหัสวิชา</th>
                    <th>ชื่อวิชา (คลิกเพื่อดูรายละเอียด)</th>
                    <th>หน่วยกิต</th>
                    <th>กลุ่มวิชา</th>
                    <th>วิชาบังคับก่อน</th>
                    <th>กลุ่ม/เวลาเรียนจาก REG</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPlanCourses.map((c) => {
                    const cat =
                      CURRICULUM_CATEGORIES[c.category] || CURRICULUM_CATEGORIES.free_elec

                    const norm = c.code.replace(/\s+/g, '').toUpperCase()
                    const regMatches = allScrapedItems.filter(
                      (sc) => (sc.code || '').replace(/\s+/g, '').toUpperCase() === norm
                    )

                    return (
                      <tr key={c.id}>
                        <td className="code-cell">
                          <span
                            className="code-tag"
                            onClick={(e) => handleCopyCode(e, c.code)}
                            title="คลิกเพื่อคัดลอกรหัสวิชา"
                          >
                            {c.code}
                            {copiedCode === c.code && <span className="copy-ok">คัดลอก!</span>}
                          </span>
                        </td>
                        <td
                          className="name-cell clickable"
                          onClick={() => setSelectedCourse(c)}
                          title="คลิกเพื่อดูรายละเอียดรายวิชาและข้อมูลกลุ่มเรียน"
                        >
                          <div className="name-en-text">
                            {c.nameEn}
                            {(selectedYear === 'all' || activeTab === 'ALL') && (
                              <span
                                style={{
                                  marginLeft: 8,
                                  fontSize: 10,
                                  fontWeight: 600,
                                  color: '#6B7280',
                                  background: '#F3F4F6',
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                }}
                              >
                                ปี {c.yearId} เทอม {c.termId}
                              </span>
                            )}
                          </div>
                          {c.nameTh && <div className="name-th-text">{c.nameTh}</div>}
                        </td>
                        <td className="credits-cell">{c.creditsFull || `${c.credits} cr`}</td>
                        <td>
                          <span
                            className="category-pill"
                            style={{
                              backgroundColor: cat.badge,
                              color: cat.text,
                              borderColor: cat.border,
                            }}
                          >
                            {cat.nameEn}
                          </span>
                        </td>
                        <td>
                          {c.prereq && c.prereq.length > 0 ? (
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              {c.prereq.map((p) => (
                                <span key={p} className="prereq-pill">
                                  {p}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span style={{ color: '#9CA3AF' }}>-</span>
                          )}
                        </td>
                        <td>
                          {regMatches && regMatches.length > 0 ? (
                            <div className="section-schedules-list">
                              {regMatches.slice(0, 2).map((m, i) => (
                                <div key={i} className="sec-item">
                                  <strong>Sec {m.raw?.['กลุ่ม'] || m.raw?.['section'] || i + 1}:</strong>{' '}
                                  {m.raw?.['วันเวลาเรียน'] || m.raw?.['เวลา'] || 'ไม่ระบุวันเวลา'}
                                </div>
                              ))}
                              {regMatches.length > 2 && (
                                <span className="more-sec-badge">
                                  + อีก {regMatches.length - 2} กลุ่ม
                                </span>
                              )}
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="search-reg-online-btn"
                              onClick={() => {
                                const url = `https://reg2.sut.ac.th/registrar/class_info.asp?backto=home&acadyear=2569&semester=2`
                                window.open(url, '_blank', 'noopener,noreferrer')
                              }}
                              title="เปิดค้นหาตารางเรียนใน REG SUT"
                            >
                              <ExternalLinkIcon size={12} />
                              <span>ตรวจใน REG SUT</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <CourseTable items={filteredCourses} onSelectCourse={setSelectedCourse} />
        )}
      </main>

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
