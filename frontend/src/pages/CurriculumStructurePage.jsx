import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import {
  INITIAL_CURRICULUM_STRUCTURE,
  CURRICULUM_CATEGORIES,
} from '../data/cpeCurriculum2567Data.js'
import { CORE_COURSES } from '../data/coreCoursesData.js'
import { ELECTIVE_COURSES } from '../data/electivesData.js'
import { GE_ELECTIVE_COURSES } from '../data/geElectivesData.js'
import { FREE_ELECTIVE_COURSES } from '../data/freeElectivesData.js'
import { cleanCourseName, parseCredits } from '../utils/courseCatalog.js'
import CourseDetailModal from '../components/CourseDetailModal.jsx'
import {
  SearchIcon,
  CloseIcon,
  RefreshIcon,
  ExternalLinkIcon,
  MenuIcon,
  LockIcon,
  CheckIcon,
  CopyIcon,
  LayersIcon,
  CalendarIcon,
  InfoIcon,
  EditIcon,
  TrashIcon,
} from '../components/Icons.jsx'
import { useAuth } from '../context/AuthContext.jsx'

// Known common General Education courses mapping with clean bilingual metadata
const SUT_KNOWN_COURSES = {
  IST201001: {
    code: 'IST20 1001',
    nameEn: 'DIGITAL LITERACY',
    nameTh: 'การรู้ดิจิทัล',
    credits: 3,
    creditsFull: '3 (3-0-6)',
    category: 'ge_eng',
  },
  IST201002: {
    code: 'IST20 1002',
    nameEn: 'CITIZENSHIP AND GLOBAL PERSPECTIVES',
    nameTh: 'ความเป็นพลเมืองและมุมมองระดับโลก',
    credits: 3,
    creditsFull: '3 (3-0-6)',
    category: 'ge_eng',
  },
  IST201003: {
    code: 'IST20 1003',
    nameEn: 'DESIGN THINKING',
    nameTh: 'การคิดเชิงออกแบบ',
    credits: 3,
    creditsFull: '3 (3-0-6)',
    category: 'ge_eng',
  },
  IST201004: {
    code: 'IST20 1004',
    nameEn: 'CREATIVE THINKING',
    nameTh: 'การคิดสร้างสรรค์',
    credits: 3,
    creditsFull: '3 (3-0-6)',
    category: 'ge_eng',
  },
  IST201005: {
    code: 'IST20 1005',
    nameEn: 'CRITICAL THINKING',
    nameTh: 'การคิดเชิงวิพากษ์',
    credits: 3,
    creditsFull: '3 (3-0-6)',
    category: 'ge_eng',
  },
  IST201006: {
    code: 'IST20 1006',
    nameEn: 'LEARNING COMPETENCIES',
    nameTh: 'สมรรถนะการเรียนรู้',
    credits: 3,
    creditsFull: '3 (3-0-6)',
    category: 'ge_eng',
  },
  IST201007: {
    code: 'IST20 1007',
    nameEn: 'EMOTIONAL INTELLIGENCE AND WELL-BEING',
    nameTh: 'ความฉลาดทางอารมณ์และสุขภาวะ',
    credits: 3,
    creditsFull: '3 (3-0-6)',
    category: 'ge_eng',
  },
  IST202001: {
    code: 'IST20 2001',
    nameEn: 'LEADERSHIP AND PUBLIC SPEAKING',
    nameTh: 'ภาวะผู้นำและการพูดในที่สาธารณะ',
    credits: 3,
    creditsFull: '3 (3-0-6)',
    category: 'ge_eng',
  },
  IST202002: {
    code: 'IST20 2002',
    nameEn: 'ENTREPRENEURSHIP',
    nameTh: 'ความเป็นผู้ประกอบการ',
    credits: 3,
    creditsFull: '3 (3-0-6)',
    category: 'ge_eng',
  },
  ENG201110: {
    code: 'ENG20 1110',
    nameEn: 'PERSONAL FINANCE',
    nameTh: 'การเงินส่วนบุคคล',
    credits: 2,
    creditsFull: '2 (2-0-4)',
    category: 'ge_eng',
  },
}

function detectCategoryForCourse(code, defaultCategory) {
  if (defaultCategory && CURRICULUM_CATEGORIES[defaultCategory]) {
    return defaultCategory
  }
  const c = String(code || '').toUpperCase().replace(/\s+/g, '')
  if (c.startsWith('SCI') || c.startsWith('103') || c.startsWith('105') || c.startsWith('102') || c.startsWith('104')) return 'sci_math'
  if (c.startsWith('IST') || c.startsWith('LNG') || c.startsWith('SOC') || c.startsWith('HUM') || c.startsWith('202') || c.startsWith('214')) return 'ge_eng'
  if (c.startsWith('ENG20') || c.startsWith('ENG21') || c.startsWith('ENG22') || c.startsWith('ENG24') || c.startsWith('ENG25') || c.startsWith('525') || c.startsWith('5231')) return 'basic_eng'
  if (c.startsWith('ENG2349') || c.includes('COOP') || c.includes('CAPSTONE')) return 'coop'
  if (c.startsWith('ENG23')) return 'cpe_elec'
  return 'free_elec'
}

/**
 * Generate smooth orthogonal SVG paths with filleted rounded corners
 */
function createRoundedOrthogonalPath(points, radius = 10) {
  if (!points || points.length < 2) return ''
  if (points.length === 2) {
    return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)} L ${points[1].x.toFixed(1)} ${points[1].y.toFixed(1)}`
  }

  // Filter out duplicate or zero-distance collinear points
  const clean = [points[0]]
  for (let i = 1; i < points.length; i++) {
    const prev = clean[clean.length - 1]
    const curr = points[i]
    if (Math.hypot(curr.x - prev.x, curr.y - prev.y) > 0.8) {
      clean.push(curr)
    }
  }

  if (clean.length === 2) {
    return `M ${clean[0].x.toFixed(1)} ${clean[0].y.toFixed(1)} L ${clean[1].x.toFixed(1)} ${clean[1].y.toFixed(1)}`
  }

  let d = `M ${clean[0].x.toFixed(1)} ${clean[0].y.toFixed(1)}`
  for (let i = 1; i < clean.length - 1; i++) {
    const pPrev = clean[i - 1]
    const pCurr = clean[i]
    const pNext = clean[i + 1]

    const v1 = { x: pCurr.x - pPrev.x, y: pCurr.y - pPrev.y }
    const len1 = Math.hypot(v1.x, v1.y)
    const v2 = { x: pNext.x - pCurr.x, y: pNext.y - pCurr.y }
    const len2 = Math.hypot(v2.x, v2.y)

    const r = Math.min(radius, len1 / 2, len2 / 2)
    const startX = pCurr.x - (v1.x / len1) * r
    const startY = pCurr.y - (v1.y / len1) * r
    const endX = pCurr.x + (v2.x / len2) * r
    const endY = pCurr.y + (v2.y / len2) * r

    d += ` L ${startX.toFixed(1)} ${startY.toFixed(1)} Q ${pCurr.x.toFixed(1)} ${pCurr.y.toFixed(1)} ${endX.toFixed(1)} ${endY.toFixed(1)}`
  }
  const last = clean[clean.length - 1]
  d += ` L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`
  return d
}

const STORAGE_KEY = 'bisket_cpe_curriculum_2567_v1'

const DAY_ORDER = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์']

const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00',
]

function parseDayAndTime(scheduleStr) {
  if (!scheduleStr || scheduleStr === '-') return []
  const dayMap = {
    Mo: 'จันทร์',
    Tu: 'อังคาร',
    We: 'พุธ',
    Th: 'พฤหัสบดี',
    Fr: 'ศุกร์',
    Sa: 'เสาร์',
    Su: 'อาทิตย์',
  }
  const regex = /(Mo|Tu|We|Th|Fr|Sa|Su)\s*(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})\s*(.*?)(?=(?:Mo|Tu|We|Th|Fr|Sa|Su)\s*\d{1,2}:\d{2}|$)/gi
  const results = []
  let match
  while ((match = regex.exec(scheduleStr)) !== null) {
    const day = dayMap[match[1]] || match[1]
    results.push({
      day,
      startTime: match[2].trim(),
      endTime: match[3].trim(),
      room: match[4]?.trim() || '',
    })
  }
  return results
}

function timeToMinutes(tStr) {
  if (!tStr) return 0
  const [h, m] = tStr.split(':').map((x) => parseInt(x, 10))
  return (h || 0) * 60 + (m || 0)
}

export default function CurriculumStructurePage({ onToggleMobile, defaultTab = 'flowchart' }) {
  const { user, isAuthenticated, openLoginModal } = useAuth()
  const boardRef = useRef(null)

  // 1. Curriculum State (persisted to localStorage if edited by admin)
  const [curriculumData, setCurriculumData] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) return JSON.parse(saved)
    } catch (e) {
      console.warn('Failed to load custom curriculum, using default', e)
    }
    return INITIAL_CURRICULUM_STRUCTURE
  })

  // 2. Active Tab: 'flowchart' or 'timetable'
  const [activeTab, setActiveTab] = useState(defaultTab || 'flowchart')

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab)
    }
  }, [defaultTab])

  // 3. Selection & Highlights
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [hoveredCourseId, setHoveredCourseId] = useState(null)

  // 4. Timetable filters
  const [selectedYear, setSelectedYear] = useState(2) // 1, 2, 3, 4
  const [selectedTerm, setSelectedTerm] = useState(1) // 1, 2, 3

  // 5. REG Scraped Data & Quick Search
  const [scrapedCourses, setScrapedCourses] = useState([])
  const [regSearchQuery, setRegSearchQuery] = useState('')
  const [isRegSearchOpen, setIsRegSearchOpen] = useState(false)
  const [copiedCode, setCopiedCode] = useState(null)

  // 6. Admin Edit Mode & Arrow Linker State
  const [isAdminMode, setIsAdminMode] = useState(false)
  const [linkingSourceCourse, setLinkingSourceCourse] = useState(null)
  const [editCourseModal, setEditCourseModal] = useState(null) // { mode: 'edit'|'add', yearId, termId, course }
  const [saveToast, setSaveToast] = useState(null)

  // 7. Dynamic SVG Arrows & Drag-and-Drop Reorder
  const [arrowConnections, setArrowConnections] = useState([])
  const [arrowJunctionDots, setArrowJunctionDots] = useState([])
  const [draggedItem, setDraggedItem] = useState(null)
  const [dragOverTarget, setDragOverTarget] = useState(null)

  // 8. Interactive Curve Bending & Angle Control State
  const CURVES_STORAGE_KEY = 'cpe_curriculum_line_curves_2567'
  const [lineCurves, setLineCurves] = useState(() => {
    try {
      const saved = localStorage.getItem(CURVES_STORAGE_KEY)
      return saved ? JSON.parse(saved) : {}
    } catch (e) {
      return {}
    }
  })
  const [activeDragConnId, setActiveDragConnId] = useState(null)
  const [dragStartPos, setDragStartPos] = useState(null)
  const [initialCurveOffset, setInitialCurveOffset] = useState({ dx: 0, dy: 0 })
  const [selectedConnection, setSelectedConnection] = useState(null)
  const isDraggingCurveRef = useRef(false)

  // Handle start dragging a curve bend handle
  const handleStartCurveDrag = (e, connId) => {
    e.stopPropagation()
    isDraggingCurveRef.current = false
    setActiveDragConnId(connId)
    setDragStartPos({ x: e.clientX, y: e.clientY })
    const current = lineCurves[connId] || { dx: 0, dy: 0 }
    setInitialCurveOffset(current)
  }

  // Handle clicking a connection line to view options or delete
  const handleLineClick = (e, conn) => {
    e.stopPropagation()
    if (isDraggingCurveRef.current) {
      isDraggingCurveRef.current = false
      return
    }

    if (linkingSourceCourse) {
      setLinkingSourceCourse(null)
    }

    let popupX = conn.handleX
    let popupY = conn.handleY

    if (boardRef.current) {
      const rect = boardRef.current.getBoundingClientRect()
      popupX = e.clientX - rect.left
      popupY = e.clientY - rect.top
    }

    setSelectedConnection({
      ...conn,
      popupX,
      popupY,
    })
  }

  // Handle single curve reset
  const handleResetSingleCurve = (connId) => {
    setLineCurves((prev) => {
      const next = { ...prev }
      delete next[connId]
      try {
        localStorage.setItem(CURVES_STORAGE_KEY, JSON.stringify(next))
      } catch (e) {}
      return next
    })
    showToast('รีเซ็ตความโค้งของเส้นเป็นค่าเริ่มต้นแล้ว')
  }

  // Handle all curves reset
  const handleResetAllCurves = () => {
    if (window.confirm('คุณต้องการรีเซ็ตมุมและความโค้งของเส้นทั้งหมดกลับเป็นค่าเริ่มต้นหรือไม่?')) {
      setLineCurves({})
      try {
        localStorage.removeItem(CURVES_STORAGE_KEY)
      } catch (e) {}
      showToast('รีเซ็ตเส้นทั้งหมดเป็นค่าเริ่มต้นแล้ว')
    }
  }

  // Window mouse tracking for dragging curve handles smoothly
  useEffect(() => {
    if (!activeDragConnId) return

    const handleMouseMove = (e) => {
      if (!dragStartPos) return
      const deltaX = e.clientX - dragStartPos.x
      const deltaY = e.clientY - dragStartPos.y
      if (Math.hypot(deltaX, deltaY) > 4) {
        isDraggingCurveRef.current = true
      }
      setLineCurves((prev) => ({
        ...prev,
        [activeDragConnId]: {
          dx: (initialCurveOffset.dx || 0) + deltaX,
          dy: (initialCurveOffset.dy || 0) + deltaY,
        },
      }))
    }

    const handleMouseUp = () => {
      setActiveDragConnId(null)
      setDragStartPos(null)
      try {
        localStorage.setItem(CURVES_STORAGE_KEY, JSON.stringify(lineCurves))
      } catch (e) {}
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [activeDragConnId, dragStartPos, initialCurveOffset, lineCurves])

  // Load scraped courses from /courses.json
  useEffect(() => {
    fetch('/courses.json?t=' + Date.now())
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.items) {
          setScrapedCourses(data.items)
        }
      })
      .catch((err) => console.warn('Could not load courses.json', err))
  }, [])

  // Flatten all courses for quick code lookup (skip spacers)
  const allCoursesMap = useMemo(() => {
    const map = new Map()
    curriculumData.forEach((year) => {
      year.terms.forEach((term) => {
        term.courses.forEach((c) => {
          if (c.isSpacer) return
          map.set(c.id, { ...c, yearId: year.yearId, termId: term.termId })
          const normCode = c.code ? c.code.replace(/\s+/g, '').toUpperCase() : ''
          if (normCode) {
            map.set(normCode, { ...c, yearId: year.yearId, termId: term.termId })
          }
        })
      })
    })
    return map
  }, [curriculumData])

  // Active highlighted course (hovered only)
  const activeFocusCourse = useMemo(() => {
    if (!hoveredCourseId) return null
    return allCoursesMap.get(hoveredCourseId) || null
  }, [hoveredCourseId, allCoursesMap])

  // Calculate prerequisites (ancestors) & dependencies (descendants)
  const dependencyInfo = useMemo(() => {
    if (!activeFocusCourse) {
      return { prereqs: new Set(), dependents: new Set() }
    }

    const prereqs = new Set()
    const dependents = new Set()

    // 1. Find all ancestors (prereqs)
    const findPrereqs = (code) => {
      const norm = code.replace(/\s+/g, '').toUpperCase()
      const c = allCoursesMap.get(norm)
      if (!c || !c.prereq) return
      c.prereq.forEach((pCode) => {
        const normP = pCode.replace(/\s+/g, '').toUpperCase()
        if (!prereqs.has(normP)) {
          prereqs.add(normP)
          findPrereqs(normP)
        }
      })
    }
    findPrereqs(activeFocusCourse.code)

    // 2. Find all descendants (dependents / ตัวต่อ) recursively
    const findDependents = (code) => {
      const norm = code.replace(/\s+/g, '').toUpperCase()
      allCoursesMap.forEach((c) => {
        if (c.prereq && c.prereq.some((p) => p.replace(/\s+/g, '').toUpperCase() === norm)) {
          const cNorm = c.code.replace(/\s+/g, '').toUpperCase()
          if (!dependents.has(cNorm)) {
            dependents.add(cNorm)
            findDependents(c.code)
          }
        }
      })
    }
    findDependents(activeFocusCourse.code)

    return { prereqs, dependents }
  }, [activeFocusCourse, allCoursesMap])

  // Calculate coordinates for visual SVG arrows with strict obstacle avoidance & channel routing
  const updateArrows = useCallback(() => {
    if (!boardRef.current) return
    const boardRect = boardRef.current.getBoundingClientRect()
    const conns = []

    // 1. Collect all card obstacles (non-spacer cards)
    const cardObstacles = []
    const spacerChannels = []
    const rowGapYLevels = []

    curriculumData.forEach((year) => {
      year.terms.forEach((term) => {
        const colCards = []
        term.courses.forEach((c) => {
          const el = document.getElementById(`flow-node-${c.id}`)
          if (!el) return
          const r = el.getBoundingClientRect()
          const item = {
            id: c.id,
            code: c.code,
            isSpacer: !!c.isSpacer,
            left: r.left - boardRect.left,
            right: r.right - boardRect.left,
            top: r.top - boardRect.top,
            bottom: r.bottom - boardRect.top,
            cx: (r.left + r.right) / 2 - boardRect.left,
            cy: (r.top + r.bottom) / 2 - boardRect.top,
            yearId: year.yearId,
            termId: term.termId,
          }
          if (c.isSpacer) {
            spacerChannels.push(item)
          } else {
            cardObstacles.push(item)
            colCards.push(item)
          }
        })

        // Find midpoints between consecutive stacked cards in this term column
        colCards.sort((a, b) => a.top - b.top)
        for (let i = 0; i < colCards.length - 1; i++) {
          rowGapYLevels.push((colCards[i].bottom + colCards[i + 1].top) / 2)
        }
      })
    })

    const allTops = cardObstacles.map((o) => o.top)
    const allBottoms = cardObstacles.map((o) => o.bottom)
    const minTop = allTops.length > 0 ? Math.min(...allTops) : 50
    const maxBottom = allBottoms.length > 0 ? Math.max(...allBottoms) : 600
    const topCorridor = Math.max(12, minTop - 20)
    const bottomCorridor = maxBottom + 22

    // 2. Group all connections by source course to support 1-to-Many Shared Trunk & Branch Junctions
    const linksBySource = new Map()

    curriculumData.forEach((year) => {
      year.terms.forEach((term) => {
        term.courses.forEach((tgtCourse) => {
          if (tgtCourse.isSpacer || !tgtCourse.prereq) return

          tgtCourse.prereq.forEach((prereqCode) => {
            const normP = prereqCode.replace(/\s+/g, '').toUpperCase()
            const srcCourse = allCoursesMap.get(normP)
            if (!srcCourse || srcCourse.isSpacer) return

            if (!linksBySource.has(srcCourse.id)) {
              linksBySource.set(srcCourse.id, {
                srcCourse,
                targets: [],
              })
            }
            linksBySource.get(srcCourse.id).targets.push({
              tgtCourse,
              yearId: year.yearId,
              termId: term.termId,
            })
          })
        })
      })
    })

    const junctionDots = []

    // 3. Plan routing for each source course and its downstream target courses
    linksBySource.forEach(({ srcCourse, targets }) => {
      const srcEl = document.getElementById(`flow-node-${srcCourse.id}`)
      if (!srcEl) return
      const srcRect = srcEl.getBoundingClientRect()
      const x1 = srcRect.right - boardRect.left
      const y1 = srcRect.top + srcRect.height / 2 - boardRect.top

      const measuredTargets = []
      targets.forEach(({ tgtCourse, yearId, termId }) => {
        const tgtEl = document.getElementById(`flow-node-${tgtCourse.id}`)
        if (!tgtEl) return
        const tgtRect = tgtEl.getBoundingClientRect()
        const x2 = tgtRect.left - boardRect.left
        const y2 = tgtRect.top + tgtRect.height / 2 - boardRect.top
        const tgtCat =
          CURRICULUM_CATEGORIES[tgtCourse.category] || CURRICULUM_CATEGORIES.free_elec
        const isSameCol =
          (srcCourse.yearId === yearId && srcCourse.termId === termId) ||
          Math.abs(srcRect.left - tgtRect.left) < 25

        measuredTargets.push({
          tgtCourse,
          tgtRect,
          x2,
          y2,
          tgtCat,
          isSameCol,
          yearId,
          termId,
        })
      })

      if (measuredTargets.length === 0) return

      // Separate same-column downward targets from forward targets
      const sameColTargets = measuredTargets.filter(
        (t) => t.isSameCol && t.tgtRect.top > srcRect.bottom - 10
      )
      const forwardTargets = measuredTargets.filter(
        (t) => !t.isSameCol || t.tgtRect.top <= srcRect.bottom - 10
      )

      // A. Process same-column targets
      sameColTargets.forEach((t) => {
        const connId = `${srcCourse.id}->${t.tgtCourse.id}`
        const curveOffset = lineCurves[connId] || { dx: 0, dy: 0 }
        const dx = curveOffset.dx || 0
        const dy = curveOffset.dy || 0

        const sx = srcRect.left + srcRect.width / 2 - boardRect.left
        const sy = srcRect.bottom - boardRect.top
        const tx = t.tgtRect.left + t.tgtRect.width / 2 - boardRect.left
        const ty = t.tgtRect.top - boardRect.top - 2

        const hasColObstacle = cardObstacles.some((obs) => {
          if (obs.id === srcCourse.id || obs.id === t.tgtCourse.id) return false
          const isSameColX = Math.abs(obs.cx - sx) < 35
          const isBetweenY = obs.top >= sy - 2 && obs.bottom <= ty + 2
          return isSameColX && isBetweenY
        })

        let points = []
        let handleX = 0
        let handleY = 0

        if (!hasColObstacle && dx === 0 && dy === 0) {
          points = [
            { x: sx, y: sy },
            { x: tx, y: ty },
          ]
          handleX = (sx + tx) / 2
          handleY = (sy + ty) / 2
        } else if (!hasColObstacle) {
          points = [
            { x: sx, y: sy },
            { x: sx + dx, y: (sy + ty) / 2 + dy },
            { x: tx, y: ty },
          ]
          handleX = sx + dx
          handleY = (sy + ty) / 2 + dy
        } else {
          const channelX = x1 + 16 + dx
          points = [
            { x: x1, y: y1 },
            { x: channelX, y: y1 },
            { x: channelX, y: t.y2 },
            { x: x1, y: t.y2 },
          ]
          handleX = channelX
          handleY = (y1 + t.y2) / 2 + dy
        }

        conns.push({
          id: connId,
          sourceId: srcCourse.id,
          targetId: t.tgtCourse.id,
          sourceCode: srcCourse.code,
          targetCode: t.tgtCourse.code,
          targetCategory: t.tgtCourse.category || 'free_elec',
          targetColor: t.tgtCat.color,
          pathD: createRoundedOrthogonalPath(points, 10),
          handleX,
          handleY,
          hasCustomCurve: dx !== 0 || dy !== 0,
        })
      })

      // B. Process forward targets (with 1-to-many branch and junction dot support!)
      if (forwardTargets.length === 0) return

      // Group forward targets by whether they are in the adjacent term column or farther away
      const adjacentTargets = forwardTargets.filter(
        (t) => t.x2 >= x1 && t.x2 - x1 < 160
      )
      const distantTargets = forwardTargets.filter(
        (t) => !(t.x2 >= x1 && t.x2 - x1 < 160)
      )

      if (adjacentTargets.length > 1) {
        // 1-to-MANY BRANCHING for adjacent targets!
        // Single trunk exits source -> enters vertical channel Xtrunk
        // Farthest target draws the full trunk; intermediate targets branch off at (Xtrunk, y2) with junction dot ●!
        const minTargetX = Math.min(...adjacentTargets.map((t) => t.x2))
        const midGap = (x1 + minTargetX) / 2
        const Xtrunk = Math.max(x1 + 8, Math.min(minTargetX - 8, midGap))

        const upper = adjacentTargets.filter((t) => t.y2 < y1).sort((a, b) => a.y2 - b.y2) // farthest up first
        const lower = adjacentTargets.filter((t) => t.y2 > y1).sort((a, b) => b.y2 - a.y2) // farthest down first
        const same = adjacentTargets.filter((t) => t.y2 === y1)

        // If there are branches going both up and down, or level and up/down:
        if (
          (upper.length > 0 && lower.length > 0) ||
          (same.length > 0 && (upper.length > 0 || lower.length > 0))
        ) {
          junctionDots.push({
            id: `${srcCourse.id}-junc-split`,
            x: Xtrunk,
            y: y1,
            color: adjacentTargets[0].tgtCat.color,
            sourceCode: srcCourse.code,
            targetCodes: adjacentTargets.map((t) => t.tgtCourse.code),
          })
        }

        // 1. Process Upper targets
        if (upper.length > 0) {
          const farthest = upper[0]
          const connId = `${srcCourse.id}->${farthest.tgtCourse.id}`
          const curveOffset = lineCurves[connId] || { dx: 0, dy: 0 }
          const dx = curveOffset.dx || 0
          const dy = curveOffset.dy || 0
          const branchX = Xtrunk + dx

          // Farthest upper gets full trunk from source
          const pts = [
            { x: x1, y: y1 },
            { x: branchX, y: y1 },
            { x: branchX, y: farthest.y2 + dy },
            { x: farthest.x2, y: farthest.y2 },
          ]
          conns.push({
            id: connId,
            sourceId: srcCourse.id,
            targetId: farthest.tgtCourse.id,
            sourceCode: srcCourse.code,
            targetCode: farthest.tgtCourse.code,
            targetCategory: farthest.tgtCourse.category || 'free_elec',
            targetColor: farthest.tgtCat.color,
            pathD: createRoundedOrthogonalPath(pts, 10),
            handleX: branchX,
            handleY: (y1 + farthest.y2) / 2 + dy,
            hasCustomCurve: dx !== 0 || dy !== 0,
          })

          // Intermediate upper targets branch off at branchX with junction dot ●!
          for (let i = 1; i < upper.length; i++) {
            const t = upper[i]
            const tConnId = `${srcCourse.id}->${t.tgtCourse.id}`
            const tOffset = lineCurves[tConnId] || { dx: 0, dy: 0 }
            const tBranchX = branchX + (tOffset.dx || 0)

            junctionDots.push({
              id: `${srcCourse.id}-junc-${t.tgtCourse.id}`,
              x: tBranchX,
              y: t.y2,
              color: t.tgtCat.color,
              sourceCode: srcCourse.code,
              targetCodes: [t.tgtCourse.code],
            })

            const tPts = [
              { x: tBranchX, y: t.y2 },
              { x: t.x2, y: t.y2 },
            ]
            conns.push({
              id: tConnId,
              sourceId: srcCourse.id,
              targetId: t.tgtCourse.id,
              sourceCode: srcCourse.code,
              targetCode: t.tgtCourse.code,
              targetCategory: t.tgtCourse.category || 'free_elec',
              targetColor: t.tgtCat.color,
              pathD: createRoundedOrthogonalPath(tPts, 10),
              handleX: (tBranchX + t.x2) / 2,
              handleY: t.y2,
              hasCustomCurve: (tOffset.dx || 0) !== 0 || (tOffset.dy || 0) !== 0,
            })
          }
        }

        // 2. Process Lower targets
        if (lower.length > 0) {
          const farthest = lower[0]
          const connId = `${srcCourse.id}->${farthest.tgtCourse.id}`
          const curveOffset = lineCurves[connId] || { dx: 0, dy: 0 }
          const dx = curveOffset.dx || 0
          const dy = curveOffset.dy || 0
          const branchX = Xtrunk + dx

          // If upper already drew trunk from x1 to branchX, lower starts at (branchX, y1)
          const pts =
            upper.length > 0
              ? [
                  { x: branchX, y: y1 },
                  { x: branchX, y: farthest.y2 + dy },
                  { x: farthest.x2, y: farthest.y2 },
                ]
              : [
                  { x: x1, y: y1 },
                  { x: branchX, y: y1 },
                  { x: branchX, y: farthest.y2 + dy },
                  { x: farthest.x2, y: farthest.y2 },
                ]

          conns.push({
            id: connId,
            sourceId: srcCourse.id,
            targetId: farthest.tgtCourse.id,
            sourceCode: srcCourse.code,
            targetCode: farthest.tgtCourse.code,
            targetCategory: farthest.tgtCourse.category || 'free_elec',
            targetColor: farthest.tgtCat.color,
            pathD: createRoundedOrthogonalPath(pts, 10),
            handleX: branchX,
            handleY: (y1 + farthest.y2) / 2 + dy,
            hasCustomCurve: dx !== 0 || dy !== 0,
          })

          // Intermediate lower targets branch off with junction dot ●!
          for (let i = 1; i < lower.length; i++) {
            const t = lower[i]
            const tConnId = `${srcCourse.id}->${t.tgtCourse.id}`
            const tOffset = lineCurves[tConnId] || { dx: 0, dy: 0 }
            const tBranchX = branchX + (tOffset.dx || 0)

            junctionDots.push({
              id: `${srcCourse.id}-junc-${t.tgtCourse.id}`,
              x: tBranchX,
              y: t.y2,
              color: t.tgtCat.color,
              sourceCode: srcCourse.code,
              targetCodes: [t.tgtCourse.code],
            })

            const tPts = [
              { x: tBranchX, y: t.y2 },
              { x: t.x2, y: t.y2 },
            ]
            conns.push({
              id: tConnId,
              sourceId: srcCourse.id,
              targetId: t.tgtCourse.id,
              sourceCode: srcCourse.code,
              targetCode: t.tgtCourse.code,
              targetCategory: t.tgtCourse.category || 'free_elec',
              targetColor: t.tgtCat.color,
              pathD: createRoundedOrthogonalPath(tPts, 10),
              handleX: (tBranchX + t.x2) / 2,
              handleY: t.y2,
              hasCustomCurve: (tOffset.dx || 0) !== 0 || (tOffset.dy || 0) !== 0,
            })
          }
        }

        // 3. Process Same-level targets
        same.forEach((t) => {
          const tConnId = `${srcCourse.id}->${t.tgtCourse.id}`
          const tOffset = lineCurves[tConnId] || { dx: 0, dy: 0 }
          const pts =
            upper.length === 0 && lower.length === 0
              ? [
                  { x: x1, y: y1 },
                  { x: t.x2, y: t.y2 },
                ]
              : [
                  { x: Xtrunk, y: y1 },
                  { x: t.x2, y: t.y2 },
                ]

          conns.push({
            id: tConnId,
            sourceId: srcCourse.id,
            targetId: t.tgtCourse.id,
            sourceCode: srcCourse.code,
            targetCode: t.tgtCourse.code,
            targetCategory: t.tgtCourse.category || 'free_elec',
            targetColor: t.tgtCat.color,
            pathD: createRoundedOrthogonalPath(pts, 10),
            handleX: (Xtrunk + t.x2) / 2,
            handleY: y1,
            hasCustomCurve: (tOffset.dx || 0) !== 0 || (tOffset.dy || 0) !== 0,
          })
        })
      } else {
        // Single adjacent target: process individually
        adjacentTargets.forEach((t) => {
          const connId = `${srcCourse.id}->${t.tgtCourse.id}`
          const curveOffset = lineCurves[connId] || { dx: 0, dy: 0 }
          const dx = curveOffset.dx || 0
          const dy = curveOffset.dy || 0
          const midGapX = Math.max(x1 + 8, Math.min(t.x2 - 8, (x1 + t.x2) / 2 + dx))

          const pts =
            Math.abs(y1 - t.y2) < 4
              ? [
                  { x: x1, y: y1 },
                  { x: t.x2, y: t.y2 },
                ]
              : [
                  { x: x1, y: y1 },
                  { x: midGapX, y: y1 },
                  { x: midGapX, y: t.y2 },
                  { x: t.x2, y: t.y2 },
                ]

          conns.push({
            id: connId,
            sourceId: srcCourse.id,
            targetId: t.tgtCourse.id,
            sourceCode: srcCourse.code,
            targetCode: t.tgtCourse.code,
            targetCategory: t.tgtCourse.category || 'free_elec',
            targetColor: t.tgtCat.color,
            pathD: createRoundedOrthogonalPath(pts, 10),
            handleX: midGapX,
            handleY: (y1 + t.y2) / 2 + dy,
            hasCustomCurve: dx !== 0 || dy !== 0,
          })
        })
      }

      // Process distant targets (multiple columns away or backward)
      distantTargets.forEach((t) => {
        const connId = `${srcCourse.id}->${t.tgtCourse.id}`
        const curveOffset = lineCurves[connId] || { dx: 0, dy: 0 }
        const dx = curveOffset.dx || 0
        const dy = curveOffset.dy || 0

        let points = []
        let handleX = 0
        let handleY = 0

        if (t.x2 >= x1 + 100) {
          const Xv1 = x1 + 16
          const Xv2 = t.x2 - 16
          const inBetweenObs = cardObstacles.filter(
            (obs) =>
              obs.id !== srcCourse.id &&
              obs.id !== t.tgtCourse.id &&
              obs.right > x1 + 4 &&
              obs.left < t.x2 - 4
          )

          if (inBetweenObs.length === 0) {
            const midX = (x1 + t.x2) / 2 + dx
            points = [
              { x: x1, y: y1 },
              { x: midX, y: y1 },
              { x: midX, y: t.y2 },
              { x: t.x2, y: t.y2 },
            ]
            handleX = midX
            handleY = (y1 + t.y2) / 2 + dy
          } else {
            const isCorridorClear = (yLev) => {
              return inBetweenObs.every((obs) => yLev < obs.top - 8 || yLev > obs.bottom + 8)
            }
            const candidateYList = [
              y1,
              t.y2,
              (y1 + t.y2) / 2,
              ...rowGapYLevels,
              ...spacerChannels.map((s) => s.cy),
              bottomCorridor,
              topCorridor,
            ].filter(isCorridorClear)

            const targetY = (y1 + t.y2) / 2 + dy
            candidateYList.sort((a, b) => Math.abs(a - targetY) - Math.abs(b - targetY))
            const chosenCorridorY = candidateYList[0] ?? (dy > 0 ? bottomCorridor : topCorridor)

            points = [
              { x: x1, y: y1 },
              { x: Xv1, y: y1 },
              { x: Xv1, y: chosenCorridorY },
              { x: Xv2, y: chosenCorridorY },
              { x: Xv2, y: t.y2 },
              { x: t.x2, y: t.y2 },
            ]
            handleX = (Xv1 + Xv2) / 2 + dx
            handleY = chosenCorridorY
          }
        } else {
          const Xv1 = x1 + 16 + dx
          const Xv2 = t.x2 - 16
          const Yloop = bottomCorridor + (dy > 0 ? dy : 0)

          points = [
            { x: x1, y: y1 },
            { x: Xv1, y: y1 },
            { x: Xv1, y: Yloop },
            { x: Xv2, y: Yloop },
            { x: Xv2, y: t.y2 },
            { x: t.x2, y: t.y2 },
          ]
          handleX = (Xv1 + Xv2) / 2 + dx
          handleY = Yloop
        }

        conns.push({
          id: connId,
          sourceId: srcCourse.id,
          targetId: t.tgtCourse.id,
          sourceCode: srcCourse.code,
          targetCode: t.tgtCourse.code,
          sourceNameTh: srcCourse.nameTh || srcCourse.name || '',
          sourceNameEn: srcCourse.nameEn || '',
          targetNameTh: t.tgtCourse.nameTh || t.tgtCourse.name || '',
          targetNameEn: t.tgtCourse.nameEn || '',
          targetCategory: t.tgtCourse.category || 'free_elec',
          targetColor: t.tgtCat.color,
          pathD: createRoundedOrthogonalPath(points, 10),
          handleX,
          handleY,
          hasCustomCurve: dx !== 0 || dy !== 0,
        })
      })
    })

    setArrowConnections(conns)
    setArrowJunctionDots(junctionDots)
  }, [curriculumData, allCoursesMap, lineCurves])

  // Recalculate arrows when tab, data, or size changes
  useEffect(() => {
    if (activeTab !== 'flowchart') return
    const timer1 = setTimeout(() => {
      updateArrows()
    }, 40)
    const timer2 = setTimeout(() => {
      updateArrows()
    }, 180)

    const handleResize = () => updateArrows()
    window.addEventListener('resize', handleResize)
    const boardEl = boardRef.current
    if (boardEl) {
      boardEl.addEventListener('scroll', handleResize)
    }

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      window.removeEventListener('resize', handleResize)
      if (boardEl) {
        boardEl.removeEventListener('scroll', handleResize)
      }
    }
  }, [activeTab, curriculumData, updateArrows])

  // Courses for the selected year and term in Timetable
  const currentTermCourses = useMemo(() => {
    const yearObj = curriculumData.find((y) => y.yearId === selectedYear)
    if (!yearObj) return []
    const termObj = yearObj.terms.find((t) => t.termId === selectedTerm)
    return termObj ? termObj.courses : []
  }, [curriculumData, selectedYear, selectedTerm])

  // Map current term courses with REG schedule info
  const scheduledCoursesWithReg = useMemo(() => {
    return currentTermCourses.map((c) => {
      const norm = c.code.replace(/\s+/g, '').toUpperCase()
      const regMatches = scrapedCourses.filter(
        (sc) => (sc.code || '').replace(/\s+/g, '').toUpperCase() === norm
      )

      const sections = []
      const events = []

      regMatches.forEach((match) => {
        const rawTime = match.raw?.['วันเวลาเรียน'] || match.raw?.['เวลา'] || ''
        const rawInstructor = match.raw?.['อาจารย์ผู้สอน'] || match.name || ''
        const secNum = match.raw?.['กลุ่ม'] || match.raw?.['section'] || '1'
        const slots = parseDayAndTime(rawTime)

        sections.push({
          section: secNum,
          rawTime,
          instructor: rawInstructor,
          slots,
        })

        slots.forEach((slot) => {
          events.push({
            code: c.code,
            nameEn: c.nameEn,
            nameTh: c.nameTh,
            category: c.category,
            credits: c.credits,
            section: secNum,
            day: slot.day,
            startTime: slot.startTime,
            endTime: slot.endTime,
            room: slot.room,
            instructor: rawInstructor,
          })
        })
      })

      return {
        ...c,
        regMatches,
        sections,
        events,
      }
    })
  }, [currentTermCourses, scrapedCourses])

  // Flattened events for the weekly timetable grid
  const timetableEvents = useMemo(() => {
    const list = []
    scheduledCoursesWithReg.forEach((c) => {
      c.events.forEach((ev) => list.push(ev))
    })
    return list
  }, [scheduledCoursesWithReg])

  // REG Live Search Filter (Supports Wildcards like 102* or *program*)
  const regSearchResults = useMemo(() => {
    if (!regSearchQuery.trim()) return []
    const rawQ = regSearchQuery.trim()
    let regexQ

    try {
      if (rawQ.includes('*')) {
        const regexStr = rawQ.replace(/\*/g, '.*')
        regexQ = new RegExp(regexStr, 'i')
      } else {
        regexQ = new RegExp(rawQ.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      }
    } catch {
      regexQ = new RegExp(rawQ.replace(/[*+?^${}()|[\]\\]/g, ''), 'i')
    }

    return scrapedCourses
      .filter((c) => {
        const code = c.code || ''
        const nameEn = c.name || ''
        const nameTh = c.raw?.['ชื่อวิชา'] || ''
        return regexQ.test(code) || regexQ.test(nameEn) || regexQ.test(nameTh)
      })
      .slice(0, 30)
  }, [regSearchQuery, scrapedCourses])

  // Handlers for Admin actions
  const handleToggleAdminMode = () => {
    if (!isAuthenticated) {
      openLoginModal()
      return
    }
    setIsAdminMode((prev) => {
      const next = !prev
      if (!next) setLinkingSourceCourse(null)
      return next
    })
  }

  const handleSaveCurriculum = (newData) => {
    setCurriculumData(newData)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newData))
      showToast('บันทึกโครงสร้างหลักสูตรเรียบร้อยแล้ว')
    } catch (e) {
      console.error(e)
    }
    setEditCourseModal(null)
  }

  // Handle deleting a single connection line (Pre-requisite link)
  const handleDeleteConnection = (conn) => {
    if (!conn) return
    const { sourceCode, targetCode, targetId } = conn
    const normSource = sourceCode.replace(/\s+/g, '').toUpperCase()
    const normTarget = targetCode.replace(/\s+/g, '').toUpperCase()

    const nextCurriculum = curriculumData.map((y) => {
      return {
        ...y,
        terms: y.terms.map((t) => {
          return {
            ...t,
            courses: t.courses.map((c) => {
              const currentNorm = c.code ? c.code.replace(/\s+/g, '').toUpperCase() : ''
              if (c.id === targetId || currentNorm === normTarget) {
                const currentPrereqs = c.prereq || []
                const filtered = currentPrereqs.filter(
                  (p) => p.replace(/\s+/g, '').toUpperCase() !== normSource
                )
                return { ...c, prereq: filtered }
              }
              return c
            }),
          }
        }),
      }
    })

    // Also clean up any custom curve offset stored for this line
    setLineCurves((prev) => {
      const next = { ...prev }
      delete next[conn.id]
      try {
        localStorage.setItem(CURVES_STORAGE_KEY, JSON.stringify(next))
      } catch (e) {}
      return next
    })

    handleSaveCurriculum(nextCurriculum)
    setSelectedConnection(null)
    showToast(`ยกเลิกการต่อเส้น: ${sourceCode} -> ${targetCode} เรียบร้อยแล้ว`)
  }

  // Keyboard shortcuts (Esc to cancel linking or deselect line, Delete/Backspace to delete selected line)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (selectedConnection) {
          setSelectedConnection(null)
        }
        if (linkingSourceCourse) {
          setLinkingSourceCourse(null)
          showToast('ยกเลิกการต่อเส้นแล้ว')
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        const activeTag = document.activeElement?.tagName?.toLowerCase()
        if (activeTag === 'input' || activeTag === 'textarea') return

        if (selectedConnection) {
          if (isAdminMode) {
            handleDeleteConnection(selectedConnection)
          } else {
            showToast('กรุณาเปิดโหมด Admin เพื่อลบเส้นเชื่อมโยง')
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedConnection, linkingSourceCourse, isAdminMode, curriculumData])

  const handleResetToDefault = () => {
    if (window.confirm('คุณต้องการรีเซ็ตโครงสร้างหลักสูตรกลับเป็นค่าเริ่มต้นปี 2565/2567 หรือไม่?')) {
      localStorage.removeItem(STORAGE_KEY)
      setCurriculumData(INITIAL_CURRICULUM_STRUCTURE)
      setLinkingSourceCourse(null)
      showToast('รีเซ็ตโครงสร้างเป็นค่าเริ่มต้นแล้ว')
    }
  }

  const showToast = (msg) => {
    setSaveToast(msg)
    setTimeout(() => setSaveToast(null), 3200)
  }

  const handleCopyCode = (e, code) => {
    e.stopPropagation()
    if (!code || code.includes('XXXX')) return
    navigator?.clipboard?.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode((prev) => (prev === code ? null : prev)), 1500)
  }

  const openRegOfficialSearch = () => {
    const url = `https://reg2.sut.ac.th/registrar/class_info.asp?backto=home&acadyear=2569&semester=2`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  // Handle course card click (Supports interactive arrow creation in Admin Mode)
  const handleCourseCardClick = (course) => {
    if (selectedConnection) {
      setSelectedConnection(null)
    }
    if (isAdminMode) {
      if (!linkingSourceCourse) {
        // Step 1: Select this course as the prerequisite source
        setLinkingSourceCourse(course)
        showToast(`เลือกวิชาต้นทาง: ${course.code} (คลิกวิชาถัดไปเพื่อสร้าง/ลบลูกศร)`)
      } else if (linkingSourceCourse.id === course.id) {
        // Clicked itself: cancel selection
        setLinkingSourceCourse(null)
      } else {
        // Step 2: Clicked target course -> Add or Remove arrow
        const sourceCode = linkingSourceCourse.code.trim()
        const targetCode = course.code.trim()
        const currentPrereqs = course.prereq || []
        const normSource = sourceCode.replace(/\s+/g, '').toUpperCase()

        const alreadyLinked = currentPrereqs.some(
          (p) => p.replace(/\s+/g, '').toUpperCase() === normSource
        )

        let nextPrereqs
        if (alreadyLinked) {
          nextPrereqs = currentPrereqs.filter(
            (p) => p.replace(/\s+/g, '').toUpperCase() !== normSource
          )
          showToast(`ยกเลิกลูกศร: ${sourceCode} -> ${targetCode}`)
        } else {
          nextPrereqs = [...currentPrereqs, sourceCode]
          showToast(`สร้างลูกศรเชื่อมโยง: ${sourceCode} -> ${targetCode} สำเร็จ`)
        }

        const nextCurriculum = curriculumData.map((y) => {
          return {
            ...y,
            terms: y.terms.map((t) => {
              return {
                ...t,
                courses: t.courses.map((c) => {
                  if (c.id === course.id) {
                    return { ...c, prereq: nextPrereqs }
                  }
                  return c
                }),
              }
            }),
          }
        })

        handleSaveCurriculum(nextCurriculum)
        setLinkingSourceCourse(null)
      }
    } else {
      // Normal read mode: open course detail modal directly (hover handles the spotlight)
      setSelectedCourse(course)
    }
  }

  // Drag and Drop reordering between rows / terms
  const handleDragStart = (e, item) => {
    if (!isAdminMode) return
    setDraggedItem(item)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', item.course.id)
  }

  const handleDragOver = (e, target) => {
    if (!isAdminMode || !draggedItem) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverTarget?.id !== target.course.id) {
      setDragOverTarget(target.course)
    }
  }

  const handleDrop = (e, target) => {
    if (!isAdminMode || !draggedItem) return
    e.preventDefault()
    setDragOverTarget(null)

    const srcYear = draggedItem.yearId
    const srcTerm = draggedItem.termId
    const srcIdx = draggedItem.index
    const tgtYear = target.yearId
    const tgtTerm = target.termId
    const tgtIdx = target.index

    if (srcYear === tgtYear && srcTerm === tgtTerm && srcIdx === tgtIdx) {
      setDraggedItem(null)
      return
    }

    const nextCurriculum = curriculumData.map((y) => {
      return {
        ...y,
        terms: y.terms.map((t) => {
          let courses = [...t.courses]

          // 1. Remove from source term
          if (y.yearId === srcYear && t.termId === srcTerm) {
            courses.splice(srcIdx, 1)
          }

          // 2. Insert into target term
          if (y.yearId === tgtYear && t.termId === tgtTerm) {
            let insertIdx = tgtIdx
            if (srcYear === tgtYear && srcTerm === tgtTerm && srcIdx < tgtIdx) {
              insertIdx = tgtIdx
            }
            courses.splice(insertIdx, 0, draggedItem.course)
          }

          return { ...t, courses }
        }),
      }
    })

    handleSaveCurriculum(nextCurriculum)
    setDraggedItem(null)
    showToast(`ย้าย [${draggedItem.course.code || 'ช่องว่าง'}] ไปยังตำแหน่งใหม่สำเร็จ`)
  }

  // Move a course up (-1) or down (+1) within its term
  const handleMoveCourse = (yearId, termId, index, direction) => {
    const nextCurriculum = curriculumData.map((y) => {
      if (y.yearId !== yearId) return y
      return {
        ...y,
        terms: y.terms.map((t) => {
          if (t.termId !== termId) return t
          const newCourses = [...t.courses]
          const targetIndex = index + direction
          if (targetIndex < 0 || targetIndex >= newCourses.length) return t
          const temp = newCourses[index]
          newCourses[index] = newCourses[targetIndex]
          newCourses[targetIndex] = temp
          return { ...t, courses: newCourses }
        }),
      }
    })

    handleSaveCurriculum(nextCurriculum)
  }

  // Add an empty slot (Spacer) for clean line routing
  const handleAddSpacer = (yearId, termId, insertAfterIndex = null) => {
    const newSpacer = {
      id: 'SPACER_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      isSpacer: true,
      code: '',
      nameEn: '',
      nameTh: '',
      credits: 0,
      prereq: [],
    }

    const nextCurriculum = curriculumData.map((y) => {
      if (y.yearId !== yearId) return y
      return {
        ...y,
        terms: y.terms.map((t) => {
          if (t.termId !== termId) return t
          const courses = [...t.courses]
          if (insertAfterIndex !== null && insertAfterIndex >= 0) {
            courses.splice(insertAfterIndex + 1, 0, newSpacer)
          } else {
            courses.push(newSpacer)
          }
          return { ...t, courses }
        }),
      }
    })

    handleSaveCurriculum(nextCurriculum)
    showToast('เพิ่มช่องว่าง (Spacer) สำหรับเดินเส้นแล้ว')
  }

  // Delete an empty spacer slot
  const handleDeleteSpacer = (yearId, termId, spacerId) => {
    const nextCurriculum = curriculumData.map((y) => {
      if (y.yearId !== yearId) return y
      return {
        ...y,
        terms: y.terms.map((t) => {
          if (t.termId !== termId) return t
          return {
            ...t,
            courses: t.courses.filter((c) => c.id !== spacerId),
          }
        }),
      }
    })

    handleSaveCurriculum(nextCurriculum)
    showToast('ลบช่องว่างแล้ว')
  }

  return (
    <div className="curriculum-page-container">
      {/* Top Header Bar */}
      <header className="curriculum-topbar">
        <div className="curriculum-topbar-left">
          {onToggleMobile && (
            <button
              type="button"
              className="btn-mobile-sidebar-toggle"
              onClick={onToggleMobile}
              aria-label="เปิดเมนู"
            >
              <MenuIcon size={20} />
            </button>
          )}
          <div className="curriculum-brand-badge">CPE</div>
          <div>
            <h1 className="curriculum-title">
              ผังโครงสร้างหลักสูตรวิศวกรรมคอมพิวเตอร์ (ปี 2565 / ปรับปรุง 2567)
            </h1>
            <p className="curriculum-subtitle">
              Bachelor of Engineering in Computer Engineering : SUT Curriculum Flowchart & Timetable
            </p>
          </div>
        </div>

        <div className="curriculum-topbar-actions">
          {/* Quick REG Wildcard Search Button */}
          <button
            type="button"
            className="curriculum-btn secondary"
            onClick={() => setIsRegSearchOpen(true)}
            title="ค้นหารายวิชาในระบบ REG พร้อมรองรับการใช้ * (Wildcard)"
          >
            <SearchIcon size={14} />
            <span>ค้นหา REG (*)</span>
          </button>

          {/* Admin Edit Mode Toggle */}
          <button
            type="button"
            className={`curriculum-btn ${isAdminMode ? 'admin-active' : 'admin-inactive'}`}
            onClick={handleToggleAdminMode}
            title={
              isAdminMode
                ? 'คลิกเพื่อยกเลิกโหมดแก้ไข'
                : 'คลิกเพื่อเข้าสู่โหมดแก้ไขโครงสร้าง (ต้องใช้สิทธิ์ Admin)'
            }
          >
            <LockIcon size={13} />
            <span>{isAdminMode ? 'ยกเลิกแก้ไข' : 'โหมดแก้ไข (Admin)'}</span>
          </button>
        </div>
      </header>

      {/* Main Mode Tabs Switcher */}
      <div className="curriculum-nav-tabs">
        <button
          type="button"
          className={`curriculum-tab-btn ${activeTab === 'flowchart' ? 'active' : ''}`}
          onClick={() => setActiveTab('flowchart')}
        >
          <LayersIcon size={16} />
          <span>ผังโครงสร้างหลักสูตร (Flowchart & Pre-requisite)</span>
        </button>

        <button
          type="button"
          className={`curriculum-tab-btn ${activeTab === 'timetable' ? 'active' : ''}`}
          onClick={() => setActiveTab('timetable')}
        >
          <CalendarIcon size={16} />
          <span>ตารางเรียนแต่ละเทอม (Term Timetable)</span>
          <span className="tab-badge">เชื่อมโครงสร้าง</span>
        </button>
      </div>

      {/* Save Notification Toast */}
      {saveToast && <div className="curriculum-save-toast">{saveToast}</div>}

      {/* ========================================================================= */}
      {/* VIEW 1: FLOWCHART & PREREQUISITE TREE                                    */}
      {/* ========================================================================= */}
      {activeTab === 'flowchart' && (
        <div className="flowchart-view-area">
          {/* Top Instruction Banner */}
          <div className="flowchart-instruction-bar">
            <InfoIcon size={16} className="info-icon-slot" />
            {isAdminMode ? (
              <span className="instruction-text">
                {linkingSourceCourse ? (
                  <>
                    เลือกวิชาต้นทางแล้ว: <strong>[{linkingSourceCourse.code}]</strong> &mdash; กรุณาคลิกวิชาปลายทางที่ต้องการเชื่อมโยงเส้น (หรือกด Esc / คลิกที่ว่างเพื่อยกเลิก)
                  </>
                ) : (
                  <>
                    <strong>โหมดแก้ไขเปิดอยู่:</strong> คลิกวิชาแรกแล้วคลิกวิชาถัดไปเพื่อสร้างเส้น | <strong>คลิกที่เส้น 1 ครั้งเพื่อดูตัวเลือกหรือลบเส้น</strong> | ลากเส้นเพื่อดัดมุมความโค้ง
                  </>
                )}
              </span>
            ) : (
              <span className="instruction-text">
                นำเมาส์ชี้ที่การ์ดวิชาเพื่อเน้นเส้นทาง{' '}
                <strong style={{ color: '#DC2626' }}>วิชาบังคับก่อน (Pre-requisite)</strong> และ{' '}
                <strong style={{ color: '#059669' }}>วิชาต่อเนื่องที่ต้องใช้</strong> |
                คลิกเพื่อเปิดดูรายละเอียดและเชื่อมต่อฐานข้อมูล REG
              </span>
            )}

            {linkingSourceCourse && (
              <button
                type="button"
                className="clear-pin-btn"
                onClick={() => {
                  setLinkingSourceCourse(null)
                  showToast('ยกเลิกการต่อเส้นแล้ว')
                }}
              >
                ยกเลิกการเลือก [{linkingSourceCourse.code}]
              </button>
            )}

            {isAdminMode && Object.keys(lineCurves).length > 0 && (
              <div style={{ marginLeft: 'auto' }}>
                <button
                  type="button"
                  className="btn-reset-curves"
                  onClick={handleResetAllCurves}
                  title="รีเซ็ตความโค้งและมุมของเส้นทั้งหมดกลับเป็นค่ามาตรฐาน"
                >
                  <RefreshIcon size={12} />
                  <span>รีเซ็ตมุมเส้น ({Object.keys(lineCurves).length})</span>
                </button>
              </div>
            )}
          </div>

          {/* 4 Years Flowchart Container with dynamic SVG arrows overlay */}
          <div
            className="flowchart-board-scroll"
            onClick={() => {
              if (selectedConnection) setSelectedConnection(null)
              if (linkingSourceCourse) {
                setLinkingSourceCourse(null)
                showToast('ยกเลิกการต่อเส้นแล้ว')
              }
            }}
            onContextMenu={(e) => {
              if (linkingSourceCourse || selectedConnection) {
                e.preventDefault()
                setLinkingSourceCourse(null)
                setSelectedConnection(null)
                showToast('ยกเลิกการต่อเส้นแล้ว')
              }
            }}
          >
            <div className="flowchart-board" ref={boardRef}>
              {/* Dynamic SVG Arrows Overlay Layer */}
              <svg className="flowchart-svg-overlay" aria-hidden="true">
                <defs>
                  <marker
                    id="arrow-default"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#475569" />
                  </marker>
                  <marker
                    id="arrow-highlight-prereq"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#DC2626" />
                  </marker>
                  <marker
                    id="arrow-highlight-dep"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#059669" />
                  </marker>

                  {/* Category-matched Arrow Markers */}
                  {Object.entries(CURRICULUM_CATEGORIES).map(([catKey, catVal]) => (
                    <marker
                      key={catKey}
                      id={`arrow-cat-${catKey}`}
                      viewBox="0 0 10 10"
                      refX="8"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill={catVal.color} />
                    </marker>
                  ))}
                </defs>

                {arrowConnections.map((conn) => {
                  const isFocusPrereq =
                    activeFocusCourse &&
                    conn.targetCode.replace(/\s+/g, '').toUpperCase() ===
                      activeFocusCourse.code.replace(/\s+/g, '').toUpperCase()
                  const isFocusDep =
                    activeFocusCourse &&
                    conn.sourceCode.replace(/\s+/g, '').toUpperCase() ===
                      activeFocusCourse.code.replace(/\s+/g, '').toUpperCase()

                  const isSelected = selectedConnection?.id === conn.id

                  // Line and arrow color matches the course it enters ("ตามสีที่จะเข้า")
                  let strokeColor = conn.targetColor || '#475569'
                  let strokeWidth = 2.0
                  let markerId = conn.targetCategory ? `arrow-cat-${conn.targetCategory}` : 'arrow-default'
                  let opacity = 0.9

                  if (isSelected) {
                    strokeColor = '#DC2626'
                    strokeWidth = 3.5
                    markerId = 'arrow-highlight-prereq'
                    opacity = 1
                  } else if (isFocusPrereq) {
                    strokeColor = '#DC2626'
                    strokeWidth = 3.0
                    markerId = 'arrow-highlight-prereq'
                    opacity = 1
                  } else if (isFocusDep) {
                    strokeColor = '#059669'
                    strokeWidth = 3.0
                    markerId = 'arrow-highlight-dep'
                    opacity = 1
                  } else if (activeFocusCourse) {
                    opacity = 0.15
                  }

                  const isDraggingThis = activeDragConnId === conn.id

                  return (
                    <g key={conn.id} className={`arrow-connection-group ${isSelected ? 'is-selected-conn' : ''}`}>
                      {/* Selection Glow Indicator */}
                      {isSelected && (
                        <path
                          d={conn.pathD}
                          fill="none"
                          stroke="#EF4444"
                          strokeWidth="8"
                          strokeOpacity="0.35"
                          strokeLinecap="round"
                        />
                      )}

                      {/* Visible Arrow Line (Colored by target course) */}
                      <path
                        d={conn.pathD}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                        strokeOpacity={opacity}
                        strokeDasharray={isSelected ? '6 4' : undefined}
                        markerEnd={`url(#${markerId})`}
                      />

                      {/* Wide Clickable Hitbox for Line: Click to view options/delete, or drag in Admin mode */}
                      <path
                        d={conn.pathD}
                        fill="none"
                        stroke="transparent"
                        strokeWidth="20"
                        style={{
                          pointerEvents: 'stroke',
                          cursor: 'pointer',
                        }}
                        onMouseDown={isAdminMode ? (e) => handleStartCurveDrag(e, conn.id) : undefined}
                        onClick={(e) => handleLineClick(e, conn)}
                        onDoubleClick={(e) => {
                          if (isAdminMode) {
                            e.stopPropagation()
                            handleResetSingleCurve(conn.id)
                          }
                        }}
                      />

                      {/* In Admin Mode: Curve Bend Handle */}
                      {isAdminMode && (
                        <circle
                          cx={conn.handleX}
                          cy={conn.handleY}
                          r={isDraggingThis ? 8 : isSelected ? 7 : conn.hasCustomCurve ? 6 : 5}
                          fill={isSelected ? '#DC2626' : isDraggingThis ? strokeColor : '#FFFFFF'}
                          stroke={isSelected ? '#FFFFFF' : strokeColor}
                          strokeWidth={isSelected ? '2.5' : '2'}
                          className="curve-control-handle"
                          style={{
                            pointerEvents: 'auto',
                            cursor: isDraggingThis ? 'grabbing' : 'grab',
                          }}
                          onMouseDown={(e) => handleStartCurveDrag(e, conn.id)}
                          onClick={(e) => handleLineClick(e, conn)}
                          onDoubleClick={(e) => {
                            e.stopPropagation()
                            handleResetSingleCurve(conn.id)
                          }}
                        />
                      )}
                    </g>
                  )
                })}

                {/* Branch Junction Dots (●) for 1-to-Many Connections */}
                {arrowJunctionDots.map((dot) => {
                  const isFocusPrereq =
                    activeFocusCourse &&
                    dot.sourceCode?.replace(/\s+/g, '').toUpperCase() ===
                      activeFocusCourse.code?.replace(/\s+/g, '').toUpperCase()
                  const isFocusDep =
                    activeFocusCourse &&
                    dot.targetCodes?.some(
                      (tc) =>
                        tc.replace(/\s+/g, '').toUpperCase() ===
                        activeFocusCourse.code?.replace(/\s+/g, '').toUpperCase()
                    )

                  let dotColor = dot.color || '#475569'
                  let opacity = 0.95
                  if (isFocusPrereq) {
                    dotColor = '#059669'
                    opacity = 1
                  } else if (isFocusDep) {
                    dotColor = '#DC2626'
                    opacity = 1
                  } else if (activeFocusCourse) {
                    opacity = 0.15
                  }

                  return (
                    <circle
                      key={dot.id}
                      cx={dot.x}
                      cy={dot.y}
                      r="4.5"
                      fill={dotColor}
                      stroke="#FFFFFF"
                      strokeWidth="1.8"
                      className="arrow-junction-dot"
                      style={{
                        opacity,
                        pointerEvents: 'none',
                        filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.25))',
                      }}
                    />
                  )
                })}
              </svg>

              {/* Floating Popover on Line Click: Delete Connection Options */}
              {selectedConnection && (
                <div
                  className="connection-delete-popover"
                  style={{
                    left: `${selectedConnection.popupX}px`,
                    top: `${selectedConnection.popupY}px`,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="conn-popover-header">
                    <div className="conn-popover-title">
                      <span className="conn-popover-badge">การเชื่อมโยง</span>
                      <span className="conn-popover-codes">
                        {selectedConnection.sourceCode} -&gt; {selectedConnection.targetCode}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="conn-popover-close-btn"
                      onClick={() => setSelectedConnection(null)}
                      title="ปิด (Esc)"
                    >
                      <CloseIcon size={14} />
                    </button>
                  </div>

                  <div className="conn-popover-details">
                    <div className="conn-detail-row">
                      <span className="conn-detail-label">วิชาต้นทาง:</span>
                      <span className="conn-detail-val">
                        <strong>{selectedConnection.sourceCode}</strong>
                        {selectedConnection.sourceNameTh ? ` (${selectedConnection.sourceNameTh})` : ''}
                      </span>
                    </div>
                    <div className="conn-detail-row">
                      <span className="conn-detail-label">เป็นเงื่อนไขของ:</span>
                      <span className="conn-detail-val">
                        <strong>{selectedConnection.targetCode}</strong>
                        {selectedConnection.targetNameTh ? ` (${selectedConnection.targetNameTh})` : ''}
                      </span>
                    </div>
                  </div>

                  <div className="conn-popover-actions">
                    {isAdminMode ? (
                      <>
                        <button
                          type="button"
                          className="conn-delete-action-btn"
                          onClick={() => handleDeleteConnection(selectedConnection)}
                          title="ลบลูกศรเชื่อมโยงนี้ออก (หรือกดปุ่ม Delete/Backspace)"
                        >
                          <TrashIcon size={14} />
                          <span>ลบเส้นเชื่อมโยงนี้</span>
                        </button>
                        {selectedConnection.hasCustomCurve && (
                          <button
                            type="button"
                            className="conn-reset-curve-action-btn"
                            onClick={() => {
                              handleResetSingleCurve(selectedConnection.id)
                              setSelectedConnection((prev) => (prev ? { ...prev, hasCustomCurve: false } : null))
                            }}
                            title="รีเซ็ตมุมดัดเส้นกลับเป็นค่าเริ่มต้น"
                          >
                            <RefreshIcon size={12} />
                            <span>รีเซ็ตมุม</span>
                          </button>
                        )}
                      </>
                    ) : (
                      <button
                        type="button"
                        className="conn-admin-switch-btn"
                        onClick={handleToggleAdminMode}
                        title="เข้าสู่โหมด Admin เพื่อแก้ไขหรือลบเส้น"
                      >
                        <EditIcon size={14} />
                        <span>เปิดโหมด Admin เพื่อลบเส้น</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {curriculumData.map((year) => (
                <div key={year.yearId} className="year-column-card">
                  {/* Year Header */}
                  <div className="year-header-band">
                    <span className="year-label-en">{year.yearLabel}</span>
                    <span className="year-label-th">{year.yearTh}</span>
                  </div>

                  {/* 3 Terms Columns */}
                  <div className="terms-grid">
                    {year.terms.map((term) => (
                      <div key={term.termId} className="term-sub-col">
                        <div className="term-sub-header">
                          <span className="term-sub-title">{term.termLabel}</span>
                          <span className="term-sub-badge">
                            {term.courses.filter((c) => !c.isSpacer).length} วิชา
                          </span>
                        </div>

                        {/* Course Cards inside this Term */}
                        <div className="courses-stack">
                          {term.courses.map((course, courseIndex) => {
                            if (course.isSpacer) {
                              const isDragTarget = dragOverTarget?.id === course.id
                              return (
                                <div
                                  key={course.id}
                                  id={`flow-node-${course.id}`}
                                  className={`flow-course-spacer ${isAdminMode ? 'edit-mode' : ''} ${isDragTarget ? 'is-drag-target' : ''}`}
                                  draggable={isAdminMode}
                                  onDragStart={(e) =>
                                    handleDragStart(e, {
                                      yearId: year.yearId,
                                      termId: term.termId,
                                      index: courseIndex,
                                      course,
                                    })
                                  }
                                  onDragOver={(e) =>
                                    handleDragOver(e, {
                                      yearId: year.yearId,
                                      termId: term.termId,
                                      index: courseIndex,
                                      course,
                                    })
                                  }
                                  onDrop={(e) =>
                                    handleDrop(e, {
                                      yearId: year.yearId,
                                      termId: term.termId,
                                      index: courseIndex,
                                      course,
                                    })
                                  }
                                >
                                  {isAdminMode && (
                                    <>
                                      <span className="spacer-label">ช่องว่างเดินเส้น (Spacer)</span>
                                      <div className="spacer-actions">
                                        <button
                                          type="button"
                                          className="btn-slot-move"
                                          disabled={courseIndex === 0}
                                          onClick={() =>
                                            handleMoveCourse(year.yearId, term.termId, courseIndex, -1)
                                          }
                                          title="เลื่อนขึ้น"
                                        >
                                          ▲
                                        </button>
                                        <button
                                          type="button"
                                          className="btn-slot-move"
                                          disabled={courseIndex === term.courses.length - 1}
                                          onClick={() =>
                                            handleMoveCourse(year.yearId, term.termId, courseIndex, 1)
                                          }
                                          title="เลื่อนลง"
                                        >
                                          ▼
                                        </button>
                                        <button
                                          type="button"
                                          className="btn-slot-delete"
                                          onClick={() =>
                                            handleDeleteSpacer(year.yearId, term.termId, course.id)
                                          }
                                          title="ลบช่องว่างนี้"
                                        >
                                          ×
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              )
                            }

                            const cat =
                              CURRICULUM_CATEGORIES[course.category] ||
                              CURRICULUM_CATEGORIES.free_elec
                            const normCode = course.code.replace(/\s+/g, '').toUpperCase()

                            const isCurrentFocus =
                              activeFocusCourse &&
                              activeFocusCourse.code.replace(/\s+/g, '').toUpperCase() === normCode
                            const isPrereq = dependencyInfo.prereqs.has(normCode)
                            const isDependent = dependencyInfo.dependents.has(normCode)
                            const isLinkingSource =
                              linkingSourceCourse && linkingSourceCourse.id === course.id
                            const isDragTarget = dragOverTarget?.id === course.id
                            const isDimmed =
                              activeFocusCourse && !isCurrentFocus && !isPrereq && !isDependent

                            let highlightClass = ''
                            if (isLinkingSource) highlightClass = 'is-linking-source'
                            else if (isCurrentFocus) highlightClass = 'is-focused'
                            else if (isPrereq) highlightClass = 'is-prereq'
                            else if (isDependent) highlightClass = 'is-dependent'
                            else if (isDimmed) highlightClass = 'is-dimmed'

                            return (
                              <div
                                key={course.id}
                                id={`flow-node-${course.id}`}
                                className={`flow-course-box ${highlightClass} ${isDragTarget ? 'is-drag-target' : ''}`}
                                draggable={isAdminMode}
                                onDragStart={(e) =>
                                  handleDragStart(e, {
                                    yearId: year.yearId,
                                    termId: term.termId,
                                    index: courseIndex,
                                    course,
                                  })
                                }
                                onDragOver={(e) =>
                                  handleDragOver(e, {
                                    yearId: year.yearId,
                                    termId: term.termId,
                                    index: courseIndex,
                                    course,
                                  })
                                }
                                onDrop={(e) =>
                                  handleDrop(e, {
                                    yearId: year.yearId,
                                    termId: term.termId,
                                    index: courseIndex,
                                    course,
                                  })
                                }
                                style={{
                                  backgroundColor: cat.bg,
                                  borderColor: isLinkingSource
                                    ? '#2563EB'
                                    : isCurrentFocus
                                    ? '#2563EB'
                                    : isPrereq
                                    ? '#DC2626'
                                    : isDependent
                                    ? '#059669'
                                    : cat.border,
                                }}
                                onMouseEnter={() => !isAdminMode && setHoveredCourseId(course.id)}
                                onMouseLeave={() => !isAdminMode && setHoveredCourseId(null)}
                                onClick={() => handleCourseCardClick(course)}
                                title={
                                  isAdminMode
                                    ? linkingSourceCourse
                                      ? `คลิกเพื่อเชื่อมโยง/ยกเลิกลูกศรจาก ${linkingSourceCourse.code} มายังวิชานี้`
                                      : 'คลิกเพื่อเลือกวิชานี้เป็นวิชาต้นทางในการสร้างลูกศร (หรือกดค้างเพื่อลากย้ายตำแหน่ง)'
                                    : 'คลิกเพื่อดูรายละเอียดและตารางเรียน'
                                }
                              >
                                {/* ROW 1: รหัสวิชา และ หน่วยกิต / ปุ่มเลื่อนตำแหน่ง Admin */}
                                <div
                                  className="course-card-row1"
                                  style={{
                                    backgroundColor: cat.color,
                                    color: '#FFFFFF',
                                  }}
                                >
                                  <span className="course-code-text">{course.code}</span>
                                  {isLinkingSource && (
                                    <button
                                      type="button"
                                      className="cancel-linking-card-btn"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setLinkingSourceCourse(null)
                                        showToast('ยกเลิกการต่อเส้นแล้ว')
                                      }}
                                      title="ยกเลิกการต่อเส้นจากวิชานี้ (Esc)"
                                    >
                                      <CloseIcon size={11} />
                                      <span>ยกเลิกต่อเส้น</span>
                                    </button>
                                  )}
                                  {isAdminMode ? (
                                    <div
                                      className="admin-card-actions"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <button
                                        type="button"
                                        className="admin-card-action-btn"
                                        disabled={courseIndex === 0}
                                        onClick={() =>
                                          handleMoveCourse(year.yearId, term.termId, courseIndex, -1)
                                        }
                                        title="เลื่อนขึ้น 1 แถว"
                                      >
                                        ▲
                                      </button>
                                      <button
                                        type="button"
                                        className="admin-card-action-btn"
                                        disabled={courseIndex === term.courses.length - 1}
                                        onClick={() =>
                                          handleMoveCourse(year.yearId, term.termId, courseIndex, 1)
                                        }
                                        title="เลื่อนลง 1 แถว"
                                      >
                                        ▼
                                      </button>
                                      <button
                                        type="button"
                                        className="admin-card-action-btn"
                                        onClick={() =>
                                          setEditCourseModal({
                                            mode: 'edit',
                                            yearId: year.yearId,
                                            termId: term.termId,
                                            course,
                                          })
                                        }
                                        title="แก้ไขข้อมูลวิชานี้"
                                      >
                                        <EditIcon size={10} />
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="course-cr-text">{course.credits} cr</span>
                                  )}
                                </div>

                                {/* ROW 2: ชื่อภาษาอังกฤษ (แสดงเต็ม ไม่ตัดคำ) */}
                                <div className="course-card-row2">
                                  {course.nameEn}
                                </div>

                                {/* ROW 3: ชื่อภาษาไทย (แสดงเต็ม ไม่ตัดคำ) */}
                                <div className="course-card-row3">
                                  {course.nameTh || '-'}
                                </div>
                              </div>
                            )
                          })}

                          {/* Admin Add Course & Spacer buttons in this term */}
                          {isAdminMode && (
                            <div className="admin-term-buttons-group">
                              <button
                                type="button"
                                className="admin-add-course-btn"
                                onClick={() =>
                                  setEditCourseModal({
                                    mode: 'add',
                                    yearId: year.yearId,
                                    termId: term.termId,
                                    course: {
                                      id: 'NEW_' + Date.now(),
                                      code: 'ENG23 XXXX',
                                      nameEn: 'Course Name',
                                      nameTh: '',
                                      credits: 4,
                                      creditsFull: '4 (4-0-8)',
                                      category: 'cpe_elec',
                                      prereq: [],
                                      desc: '',
                                    },
                                  })
                                }
                              >
                                + เพิ่มวิชาในเทอมนี้
                              </button>
                              <button
                                type="button"
                                className="admin-add-spacer-btn"
                                onClick={() => handleAddSpacer(year.yearId, term.termId)}
                                title="เพิ่มช่องว่างสำหรับเว้นแถวให้เส้นลูกศรวิ่งผ่านได้สวยงาม"
                              >
                                + เพิ่มช่องว่าง (Spacer)
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Floating Pill when Linking: Quick Cancel Button */}
          {linkingSourceCourse && (
            <div className="linking-status-floating-pill">
              <div className="linking-status-content">
                <span className="linking-pulse-dot"></span>
                <span>
                  กำลังต่อเส้นจาก: <strong>{linkingSourceCourse.code}</strong> &mdash; คลิกวิชาปลายทางเพื่อเชื่อมโยงเส้น
                </span>
              </div>
              <button
                type="button"
                className="linking-cancel-pill-btn"
                onClick={() => {
                  setLinkingSourceCourse(null)
                  showToast('ยกเลิกการต่อเส้นแล้ว')
                }}
                title="กด Esc หรือคลิกเพื่อยกเลิกการต่อเส้น"
              >
                <CloseIcon size={12} />
                <span>ยกเลิกต่อเส้น (Esc)</span>
              </button>
            </div>
          )}

          {/* Flowchart Legend */}
          <footer className="flowchart-legend-panel">
            <div className="legend-title">คำอธิบายกลุ่มวิชา (Curriculum Categories)</div>
            <div className="legend-items-grid">
              {Object.values(CURRICULUM_CATEGORIES).map((cat) => (
                <div key={cat.id} className="legend-item">
                  <span
                    className="legend-color-box"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="legend-text-label">{cat.nameEn}</span>
                </div>
              ))}
              <div className="legend-item connector">
                <span className="legend-arrow-symbol">&mdash;&gt;</span>
                <span className="legend-text-label">Pre-Requisite (วิชาบังคับก่อน)</span>
              </div>
            </div>

            {isAdminMode && (
              <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
                <span style={{ fontSize: 12, color: '#6B7280' }}>จัดการโครงสร้าง (Admin):</span>
                <button
                  type="button"
                  className="curriculum-btn reset"
                  onClick={handleResetToDefault}
                  title="รีเซ็ตกลับเป็นค่าเริ่มต้นตามหลักสูตร มทส."
                >
                  <RefreshIcon size={13} />
                  <span>รีเซ็ตโครงสร้างเป็นค่าเริ่มต้น</span>
                </button>
              </div>
            )}
          </footer>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: TERM TIMETABLE VIEW (เชื่อมโยงกับโครงสร้างหลักสูตร)              */}
      {/* ========================================================================= */}
      {activeTab === 'timetable' && (
        <div className="timetable-view-area">
          {/* Term Selector Header */}
          <div className="timetable-control-panel">
            <div className="term-selector-group">
              <span className="control-label">เลือกชั้นปี:</span>
              <div className="btn-segmented">
                {[1, 2, 3, 4].map((y) => (
                  <button
                    key={y}
                    type="button"
                    className={`segmented-btn ${selectedYear === y ? 'active' : ''}`}
                    onClick={() => setSelectedYear(y)}
                  >
                    ชั้นปี {y}
                  </button>
                ))}
              </div>
            </div>

            <div className="term-selector-group">
              <span className="control-label">เลือกภาคการศึกษา:</span>
              <div className="btn-segmented">
                {[1, 2, 3].map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`segmented-btn ${selectedTerm === t ? 'active' : ''}`}
                    onClick={() => setSelectedTerm(t)}
                  >
                    เทอม {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="timetable-stats-pill">
              วิชาตามโครงสร้าง: <strong>{currentTermCourses.length}</strong> วิชา | คาบเรียนที่พบใน REG:{' '}
              <strong>{timetableEvents.length}</strong> คาบ
            </div>
          </div>

          {/* Timetable Weekly Visual Grid */}
          <div className="timetable-grid-wrapper">
            <table className="timetable-grid">
              <thead>
                <tr>
                  <th className="day-col-header">วัน / เวลา</th>
                  {TIME_SLOTS.map((slot) => (
                    <th key={slot} className="time-col-header">
                      {slot}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAY_ORDER.map((dayName) => {
                  const dayEvents = timetableEvents.filter((ev) => ev.day === dayName)

                  return (
                    <tr key={dayName}>
                      <td className="day-name-cell">{dayName}</td>
                      <td colSpan={TIME_SLOTS.length} className="day-timeline-lane">
                        <div className="timeline-relative-container">
                          {dayEvents.map((ev, idx) => {
                            const startM = timeToMinutes(ev.startTime)
                            const endM = timeToMinutes(ev.endTime)
                            const baseM = 8 * 60 // 08:00
                            const totalM = 12 * 60 // 08:00 - 20:00 = 720 mins

                            const leftPercent = Math.max(0, ((startM - baseM) / totalM) * 100)
                            const widthPercent = Math.max(
                              4,
                              Math.min(100 - leftPercent, ((endM - startM) / totalM) * 100)
                            )
                            const cat =
                              CURRICULUM_CATEGORIES[ev.category] ||
                              CURRICULUM_CATEGORIES.tech_app

                            return (
                              <div
                                key={`${ev.code}-${ev.section}-${idx}`}
                                className="timeline-event-block"
                                style={{
                                  left: `${leftPercent}%`,
                                  width: `${widthPercent}%`,
                                  backgroundColor: cat.bg,
                                  borderColor: cat.border,
                                  borderLeftColor: cat.color,
                                }}
                                onClick={() => setSelectedCourse(ev)}
                                title={`${ev.code} ${ev.nameEn}\nSec ${ev.section} (${ev.startTime}-${ev.endTime})\nห้อง: ${ev.room || '-'}\nผู้สอน: ${ev.instructor || '-'}`}
                              >
                                <div className="event-top-line">
                                  <span className="event-code" style={{ color: cat.text }}>
                                    {ev.code}
                                  </span>
                                  <span className="event-sec">Sec {ev.section}</span>
                                </div>
                                <div className="event-name">{ev.nameEn}</div>
                                <div className="event-meta">
                                  <span>
                                    {ev.startTime}-{ev.endTime}
                                  </span>
                                  {ev.room && <span>ห้อง: {ev.room}</span>}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* List of Courses in this Term */}
          <div className="term-courses-table-container">
            <h3 className="section-heading">
              รายวิชาบังคับและเลือกตามแผนการเรียน : ชั้นปีที่ {selectedYear} เทอม {selectedTerm}
            </h3>

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
                {scheduledCoursesWithReg.map((c) => {
                  const cat =
                    CURRICULUM_CATEGORIES[c.category] || CURRICULUM_CATEGORIES.free_elec

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
                      >
                        <div className="name-en-text">{c.nameEn}</div>
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
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td>
                        {c.sections && c.sections.length > 0 ? (
                          <div className="section-schedules-list">
                            {c.sections.slice(0, 2).map((sec, i) => (
                              <div key={i} className="sec-item">
                                <strong>Sec {sec.section}:</strong> {sec.rawTime || 'ไม่ระบุวันเวลา'}
                              </div>
                            ))}
                            {c.sections.length > 2 && (
                              <span className="more-sec-badge">
                                + อีก {c.sections.length - 2} กลุ่ม
                              </span>
                            )}
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="search-reg-online-btn"
                            onClick={() => openRegOfficialSearch()}
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
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: REG QUICK WILDCARD SEARCH MODAL (*)                             */}
      {/* ========================================================================= */}
      {isRegSearchOpen && (
        <div className="modal-backdrop" onClick={() => setIsRegSearchOpen(false)}>
          <div
            className="modal-container reg-search-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <SearchIcon size={18} />
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                    ค้นหารายวิชาในระบบ REG (รองรับ Wildcard *)
                  </h3>
                  <span style={{ fontSize: 12, color: '#6B7280' }}>
                    ตัวอย่าง: ป้อน <code>ENG23*</code>, <code>102*</code>, หรือ{' '}
                    <code>*network*</code>
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsRegSearchOpen(false)}
              >
                <CloseIcon size={16} />
              </button>
            </div>

            <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB' }}>
              <div className="reg-search-input-box">
                <SearchIcon size={16} />
                <input
                  type="text"
                  placeholder="ป้อนรหัสวิชา หรือชื่อวิชา เช่น ENG23*, SCI*, *Program*..."
                  value={regSearchQuery}
                  onChange={(e) => setRegSearchQuery(e.target.value)}
                  autoFocus
                />
                {regSearchQuery && (
                  <button
                    type="button"
                    className="clear-text-btn"
                    onClick={() => setRegSearchQuery('')}
                  >
                    <CloseIcon size={12} />
                  </button>
                )}
              </div>
            </div>

            <div className="reg-search-results-list">
              {regSearchQuery.trim() === '' ? (
                <div className="empty-search-prompt">
                  พิมพ์คำค้นหาเพื่อดึงรายวิชาจากฐานข้อมูล REG (1,254 วิชา)
                  <div style={{ marginTop: 8 }}>
                    <a
                      href="https://reg2.sut.ac.th/registrar/class_info.asp?backto=home&acadyear=2569&semester=2"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="direct-reg-link"
                    >
                      <ExternalLinkIcon size={14} />
                      เปิดหน้าค้นหารายวิชาบน REG SUT โดยตรง
                    </a>
                  </div>
                </div>
              ) : regSearchResults.length === 0 ? (
                <div className="empty-search-prompt">
                  ไม่พบรายวิชาที่ตรงกับ &ldquo;{regSearchQuery}&rdquo;
                </div>
              ) : (
                regSearchResults.map((item, idx) => (
                  <div
                    key={`${item.code}-${idx}`}
                    className="reg-search-result-row"
                    onClick={() => {
                      setSelectedCourse(item)
                      setIsRegSearchOpen(false)
                    }}
                  >
                    <div className="result-code-badge">{item.code}</div>
                    <div className="result-info">
                      <div className="result-name-en">{item.name}</div>
                      {item.raw?.['ชื่อวิชา'] && (
                        <div className="result-name-th">{item.raw['ชื่อวิชา']}</div>
                      )}
                      <div className="result-sub-meta">
                        <span>หน่วยกิต: {item.credits || item.raw?.['หน่วยกิต']}</span>
                        {item.semester && <span>เทอม {item.semester}</span>}
                        {item.raw?.['วันเวลาเรียน'] && (
                          <span>ตาราง: {item.raw['วันเวลาเรียน']}</span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="view-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedCourse(item)
                        setIsRegSearchOpen(false)
                      }}
                    >
                      ดูข้อมูล
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADMIN EDIT COURSE MODAL                                         */}
      {/* ========================================================================= */}
      {editCourseModal && (
        <AdminEditCourseModal
          initial={editCourseModal}
          categories={CURRICULUM_CATEGORIES}
          scrapedCourses={scrapedCourses}
          allCoursesMap={allCoursesMap}
          onClose={() => setEditCourseModal(null)}
          onSave={(updatedCourse) => {
            const nextCurriculum = curriculumData.map((year) => {
              if (year.yearId !== editCourseModal.yearId) return year
              return {
                ...year,
                terms: year.terms.map((term) => {
                  if (term.termId !== editCourseModal.termId) return term
                  let newCourses = [...term.courses]
                  if (editCourseModal.mode === 'add') {
                    newCourses.push(updatedCourse)
                  } else {
                    newCourses = newCourses.map((c) =>
                      c.id === updatedCourse.id ? updatedCourse : c
                    )
                  }
                  return { ...term, courses: newCourses }
                }),
              }
            })
            handleSaveCurriculum(nextCurriculum)
          }}
          onDelete={(courseId) => {
            if (window.confirm('คุณต้องการลบวิชานี้ออกจากโครงสร้างหรือไม่?')) {
              const nextCurriculum = curriculumData.map((year) => {
                if (year.yearId !== editCourseModal.yearId) return year
                return {
                  ...year,
                  terms: year.terms.map((term) => {
                    if (term.termId !== editCourseModal.termId) return term
                    return {
                      ...term,
                      courses: term.courses.filter((c) => c.id !== courseId),
                    }
                  }),
                }
              })
              handleSaveCurriculum(nextCurriculum)
              setEditCourseModal(null)
              showToast('ลบวิชาออกจากโครงสร้างเรียบร้อยแล้ว')
            }
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: COURSE DETAIL MODAL (เชื่อมต่อ REG)                             */}
      {/* ========================================================================= */}
      {selectedCourse && (
        <CourseDetailModal
          course={selectedCourse}
          sections={scrapedCourses.filter(
            (sc) =>
              (sc.code || '').replace(/\s+/g, '').toUpperCase() ===
              (selectedCourse.code || '').replace(/\s+/g, '').toUpperCase()
          )}
          onClose={() => setSelectedCourse(null)}
        />
      )}
    </div>
  )
}

function AdminEditCourseModal({
  initial,
  categories,
  onClose,
  onSave,
  onDelete,
  scrapedCourses = [],
  allCoursesMap = new Map(),
}) {
  const [form, setForm] = useState({ ...initial.course })
  const [prereqInput, setPrereqInput] = useState(
    (initial.course.prereq || []).join(', ')
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [showCodeSuggestions, setShowCodeSuggestions] = useState(false)
  const [showTopSuggestions, setShowTopSuggestions] = useState(false)
  const [autofillSuccess, setAutofillSuccess] = useState('')

  // Build unified course catalog from all available curriculum datasets
  const masterCatalog = useMemo(() => {
    const map = new Map()

    const addCourseItem = (c, defaultCat) => {
      if (!c || !c.code) return
      const rawCode = String(c.code).trim()
      const norm = rawCode.replace(/\s+/g, '').toUpperCase()
      if (!norm) return

      const cleanEn = cleanCourseName(c.nameEn || c.name || '')
      const cleanTh = cleanCourseName(c.nameTh || c.raw?.['ชื่อวิชา'] || '')
      const crFull = String(c.creditsFull || c.credits || c.raw?.['หน่วยกิต'] || '3 (3-0-6)')
      const crNum = typeof c.credits === 'number' ? c.credits : parseCredits(crFull)
      const cat = detectCategoryForCourse(rawCode, c.category || defaultCat)

      if (!map.has(norm)) {
        map.set(norm, {
          code: rawCode,
          nameEn: cleanEn,
          nameTh: cleanTh,
          credits: crNum,
          creditsFull: crFull,
          category: cat,
          desc: c.desc || '',
          prereq: c.prereq || [],
        })
      } else {
        const existing = map.get(norm)
        if (!existing.nameEn && cleanEn) existing.nameEn = cleanEn
        if (!existing.nameTh && cleanTh) existing.nameTh = cleanTh
        if (!existing.credits && crNum) existing.credits = crNum
        if (!existing.creditsFull && crFull) existing.creditsFull = crFull
        if ((!existing.category || existing.category === 'free_elec') && cat) {
          existing.category = cat
        }
      }
    }

    // 1. Known common SUT general education courses
    Object.values(SUT_KNOWN_COURSES).forEach((c) => addCourseItem(c, 'ge_eng'))

    // 2. Official 2567 CPE curriculum courses
    INITIAL_CURRICULUM_STRUCTURE.forEach((year) => {
      year.terms.forEach((term) => {
        term.courses.forEach((c) => addCourseItem(c, c.category))
      })
    })

    // 3. Official Department & Faculty datasets
    CORE_COURSES.forEach((c) => addCourseItem(c, 'tech_soft'))
    ELECTIVE_COURSES.forEach((c) => addCourseItem(c, 'cpe_elec'))
    GE_ELECTIVE_COURSES.forEach((c) => addCourseItem(c, 'ge_eng'))
    FREE_ELECTIVE_COURSES.forEach((c) => addCourseItem(c, 'free_elec'))

    // 4. Current board courses
    allCoursesMap.forEach((c) => addCourseItem(c, c.category))

    // 5. Scraped REG courses from courses.json (494 unique courses)
    if (Array.isArray(scrapedCourses)) {
      scrapedCourses.forEach((sc) => {
        const rawCode = sc.code || sc.raw?.['รหัสวิชา'] || ''
        const rawName = sc.name || sc.raw?.['ชื่อวิชา'] || ''
        const clean = cleanCourseName(rawName)
        const isThai = /[\u0E00-\u0E7F]/.test(clean)
        const creditsFull = sc.credits || sc.raw?.['หน่วยกิต'] || '3 (3-0-6)'
        const creditsNum = parseCredits(creditsFull)
        const cat = detectCategoryForCourse(rawCode)

        const norm = String(rawCode).replace(/\s+/g, '').toUpperCase()
        if (!norm) return

        if (!map.has(norm)) {
          map.set(norm, {
            code: rawCode,
            nameEn: isThai ? '' : clean,
            nameTh: isThai ? clean : (sc.raw?.['ชื่อวิชา'] ? cleanCourseName(sc.raw['ชื่อวิชา']) : ''),
            credits: creditsNum,
            creditsFull: creditsFull,
            category: cat,
            desc: '',
            prereq: [],
          })
        } else {
          const ex = map.get(norm)
          if (!ex.nameEn && !isThai && clean) ex.nameEn = clean
          if (!ex.nameTh && isThai && clean) ex.nameTh = clean
        }
      })
    }

    return Array.from(map.values())
  }, [scrapedCourses, allCoursesMap])

  // Filter suggestions by query
  const getSuggestions = useCallback((q) => {
    if (!q || !q.trim()) return []
    const cleanQ = q.trim().toLowerCase()
    const normQ = cleanQ.replace(/\s+/g, '')

    return masterCatalog
      .filter((c) => {
        const cCode = (c.code || '').toLowerCase()
        const cNorm = cCode.replace(/\s+/g, '')
        const cNameEn = (c.nameEn || '').toLowerCase()
        const cNameTh = (c.nameTh || '').toLowerCase()
        return (
          cCode.includes(cleanQ) ||
          cNorm.includes(normQ) ||
          cNameEn.includes(cleanQ) ||
          cNameTh.includes(cleanQ)
        )
      })
      .slice(0, 8)
  }, [masterCatalog])

  const codeSuggestions = useMemo(() => {
    return getSuggestions(form.code)
  }, [form.code, getSuggestions])

  const topSuggestions = useMemo(() => {
    return getSuggestions(searchQuery)
  }, [searchQuery, getSuggestions])

  const handleSelectCourse = (selected) => {
    if (!selected) return
    const credNum =
      typeof selected.credits === 'number'
        ? selected.credits
        : parseInt(selected.credits, 10) || 3
    const credFull =
      selected.creditsFull || `${credNum} (${credNum}-0-${credNum * 2})`

    setForm((prev) => ({
      ...prev,
      code: selected.code || '',
      nameEn: selected.nameEn || '',
      nameTh: selected.nameTh || '',
      credits: credNum,
      creditsFull: credFull,
      category: selected.category || detectCategoryForCourse(selected.code, prev.category),
      desc: selected.desc || '',
    }))

    if (Array.isArray(selected.prereq) && selected.prereq.length > 0) {
      setPrereqInput(selected.prereq.join(', '))
    } else {
      setPrereqInput('')
    }

    setAutofillSuccess(
      `ดึงข้อมูลสำเร็จ: [${selected.code}] ${selected.nameEn}${selected.nameTh ? ` (${selected.nameTh})` : ''}`
    )
    setShowCodeSuggestions(false)
    setShowTopSuggestions(false)
    setSearchQuery('')
  }

  const handleTriggerQuickAutoFill = (input) => {
    const raw = (input || '').trim()
    if (!raw) {
      setAutofillSuccess('กรุณากรอกรหัสหรือชื่อวิชาก่อนกดดึงข้อมูล')
      return
    }
    const norm = raw.replace(/\s+/g, '').toUpperCase()
    const lower = raw.toLowerCase()

    // 1. Exact match code
    let match = masterCatalog.find(
      (c) => (c.code || '').replace(/\s+/g, '').toUpperCase() === norm
    )

    // 2. Starts with / partial code match
    if (!match) {
      match = masterCatalog.find(
        (c) => (c.code || '').replace(/\s+/g, '').toUpperCase().includes(norm)
      )
    }

    // 3. Name EN exact or contains
    if (!match) {
      match =
        masterCatalog.find((c) => (c.nameEn || '').toLowerCase() === lower) ||
        masterCatalog.find((c) => (c.nameEn || '').toLowerCase().includes(lower))
    }

    // 4. Name TH exact or contains
    if (!match) {
      match = masterCatalog.find((c) =>
        (c.nameTh || '').toLowerCase().includes(lower)
      )
    }

    // 5. Fallback: check SUT_KNOWN_COURSES directly by code or key
    if (!match) {
      const knownKey = Object.keys(SUT_KNOWN_COURSES).find((k) => {
        const item = SUT_KNOWN_COURSES[k]
        return (
          k.toUpperCase() === norm ||
          item.code.replace(/\s+/g, '').toUpperCase() === norm ||
          item.code.replace(/\s+/g, '').toUpperCase().includes(norm)
        )
      })
      if (knownKey) {
        match = SUT_KNOWN_COURSES[knownKey]
      }
    }

    if (match) {
      handleSelectCourse(match)
    } else {
      setAutofillSuccess(`ไม่พบข้อมูลวิชาสำหรับ "${raw}" ในระบบ กรุณาพิมพ์ระบุข้อมูลเอง`)
    }
  }

  const handleClearForm = () => {
    setForm({
      ...form,
      code: '',
      nameEn: '',
      nameTh: '',
      credits: 3,
      creditsFull: '3 (3-0-6)',
      category: 'ge_eng',
      desc: '',
    })
    setPrereqInput('')
    setSearchQuery('')
    setAutofillSuccess('ล้างข้อมูลในแบบฟอร์มเรียบร้อยแล้ว')
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const prereqList = prereqInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    onSave({
      ...form,
      prereq: prereqList,
      credits: parseInt(form.credits, 10) || 4,
    })
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container admin-edit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h3>
              {initial.mode === 'add' ? 'เพิ่มวิชาในโครงสร้าง' : 'แก้ไขวิชาในโครงสร้าง'} (ปี{' '}
              {initial.yearId} เทอม {initial.termId})
            </h3>
            {initial.mode === 'edit' && (
              <button
                type="button"
                className="btn-danger-delete-header"
                onClick={() => onDelete(form.id)}
                title="ลบวิชานี้ออกจากโครงสร้าง"
              >
                <TrashIcon size={13} />
                <span>ลบวิชา</span>
              </button>
            )}
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <CloseIcon size={16} />
          </button>
        </div>

        {/* Quick Search & Auto-Fill Header */}
        <div className="admin-autofill-banner">
          <div className="autofill-label">
            <span>ค้นหารหัสหรือชื่อวิชาเพื่อดึงข้อมูลอัตโนมัติ (หรือพิมพ์กรอกข้อมูลเองด้านล่าง):</span>
          </div>
          <div className="autofill-search-input-wrap">
            <SearchIcon size={15} className="autofill-search-icon" />
            <input
              type="text"
              className="autofill-search-input"
              placeholder="พิมพ์รหัสหรือชื่อ เช่น IST20 1006, ENG23 2071, ฟิสิกส์, LEARNING..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setShowTopSuggestions(true)
              }}
              onFocus={() => setShowTopSuggestions(true)}
            />
            {searchQuery && (
              <button
                type="button"
                className="autofill-clear-btn"
                onClick={() => {
                  setSearchQuery('')
                  setShowTopSuggestions(false)
                }}
              >
                <CloseIcon size={13} />
              </button>
            )}
            <button
              type="button"
              className="btn-trigger-autofill"
              onClick={() => handleTriggerQuickAutoFill(searchQuery || form.code)}
            >
              ดึงข้อมูล
            </button>
          </div>

          {/* Floating Dropdown for Top Quick Search */}
          {showTopSuggestions && topSuggestions.length > 0 && (
            <div className="course-autocomplete-dropdown">
              <div className="autocomplete-header">
                พบ {topSuggestions.length} รายการที่ตรงกัน (คลิกเพื่อเติมข้อมูลทันที)
              </div>
              {topSuggestions.map((item) => {
                const catObj = categories[item.category] || categories.free_elec
                return (
                  <div
                    key={item.code}
                    className="course-autocomplete-item"
                    onClick={() => handleSelectCourse(item)}
                  >
                    <span
                      className="autocomplete-badge-code"
                      style={{
                        backgroundColor: catObj?.badge || '#EFF6FF',
                        color: catObj?.text || '#1E40AF',
                        borderColor: catObj?.border || '#BFDBFE',
                      }}
                    >
                      {item.code}
                    </span>
                    <div className="autocomplete-item-details">
                      <div className="autocomplete-item-name-en">{item.nameEn || item.code}</div>
                      {item.nameTh && (
                        <div className="autocomplete-item-name-th">{item.nameTh}</div>
                      )}
                    </div>
                    <div className="autocomplete-item-meta">
                      <span className="autocomplete-cr-tag">{item.creditsFull || `${item.credits} cr`}</span>
                      <span className="autocomplete-cat-tag">{catObj?.nameTh || item.category}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Success / Alert Banner */}
        {autofillSuccess && (
          <div className="autofill-feedback-banner">
            <span>{autofillSuccess}</span>
            <button
              type="button"
              className="banner-dismiss-btn"
              onClick={() => setAutofillSuccess('')}
            >
              ×
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="admin-edit-form">
          <div className="form-row" style={{ position: 'relative' }}>
            <label>
              รหัสวิชา (Code): <span style={{ fontSize: 11, fontWeight: 'normal', color: '#6B7280' }}>(พิมพ์รหัสแล้วเลือกจากตัวเลือกเพื่อเติมอัตโนมัติ)</span>
            </label>
            <div className="code-input-with-action">
              <input
                type="text"
                required
                placeholder="เช่น IST20 1006 หรือ ENG23 2071"
                value={form.code}
                onChange={(e) => {
                  setForm({ ...form, code: e.target.value })
                  setShowCodeSuggestions(true)
                }}
                onFocus={() => setShowCodeSuggestions(true)}
              />
              <button
                type="button"
                className="btn-lookup-code"
                onClick={() => handleTriggerQuickAutoFill(form.code)}
                title="ค้นหาและดึงข้อมูลจากรหัสวิชาที่พิมพ์"
              >
                ดึงข้อมูล
              </button>
            </div>

            {/* Inline Auto-complete Dropdown on Code Input */}
            {showCodeSuggestions && codeSuggestions.length > 0 && (
              <div className="course-autocomplete-dropdown inline-code-dropdown">
                {codeSuggestions.map((item) => {
                  const catObj = categories[item.category] || categories.free_elec
                  return (
                    <div
                      key={item.code}
                      className="course-autocomplete-item"
                      onClick={() => handleSelectCourse(item)}
                    >
                      <span
                        className="autocomplete-badge-code"
                        style={{
                          backgroundColor: catObj?.badge || '#EFF6FF',
                          color: catObj?.text || '#1E40AF',
                          borderColor: catObj?.border || '#BFDBFE',
                        }}
                      >
                        {item.code}
                      </span>
                      <div className="autocomplete-item-details">
                        <div className="autocomplete-item-name-en">{item.nameEn || item.code}</div>
                        {item.nameTh && (
                          <div className="autocomplete-item-name-th">{item.nameTh}</div>
                        )}
                      </div>
                      <div className="autocomplete-item-meta">
                        <span className="autocomplete-cr-tag">{item.creditsFull || `${item.credits} cr`}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="form-row">
            <label>ชื่อวิชาภาษาอังกฤษ (Name EN):</label>
            <input
              type="text"
              required
              placeholder="เช่น LEARNING COMPETENCIES"
              value={form.nameEn}
              onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
            />
          </div>

          <div className="form-row">
            <label>ชื่อวิชาภาษาไทย (Name TH):</label>
            <input
              type="text"
              placeholder="เช่น สมรรถนะการเรียนรู้"
              value={form.nameTh || ''}
              onChange={(e) => setForm({ ...form, nameTh: e.target.value })}
            />
          </div>

          <div className="form-row-grid">
            <div>
              <label>จำนวนหน่วยกิต:</label>
              <input
                type="number"
                min="1"
                max="12"
                value={form.credits}
                onChange={(e) => setForm({ ...form, credits: e.target.value })}
              />
            </div>
            <div>
              <label>รูปแบบหน่วยกิตเต็ม (เช่น 3 (3-0-6)):</label>
              <input
                type="text"
                placeholder="เช่น 3 (3-0-6)"
                value={form.creditsFull || ''}
                onChange={(e) => setForm({ ...form, creditsFull: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <label>กลุ่มหมวดหมู่วิชา (Category):</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {Object.values(categories).map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.nameEn} ({cat.nameTh})
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <label>วิชาบังคับก่อน (Pre-requisites คั่นด้วยจุลภาค ,):</label>
            <input
              type="text"
              placeholder="เช่น ENG23 2001, ENG23 2003"
              value={prereqInput}
              onChange={(e) => setPrereqInput(e.target.value)}
            />
          </div>

          <div className="form-row">
            <label>คำอธิบายรายวิชา (Course Description):</label>
            <textarea
              rows={3}
              placeholder="รายละเอียดเนื้อหารายวิชา (ถ้ามี)..."
              value={form.desc || ''}
              onChange={(e) => setForm({ ...form, desc: e.target.value })}
            />
          </div>

          <div className="modal-actions-footer">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {initial.mode === 'edit' && (
                <button
                  type="button"
                  className="btn-danger-delete"
                  onClick={() => onDelete(form.id)}
                  title="ลบวิชานี้ออกจากโครงสร้างหลักสูตร"
                >
                  <TrashIcon size={14} />
                  <span>ลบวิชานี้</span>
                </button>
              )}
              <button
                type="button"
                className="btn-clear-form"
                onClick={handleClearForm}
                title="ล้างข้อมูลทุกช่องในแบบฟอร์ม"
              >
                ล้างข้อมูล
              </button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
              <button type="button" className="btn-cancel" onClick={onClose}>
                ยกเลิก
              </button>
              <button type="submit" className="btn-primary-save">
                บันทึกการเปลี่ยนแปลง
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
