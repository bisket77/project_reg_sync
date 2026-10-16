import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import {
  DEFAULT_GRADE_SCALES,
  DEFAULT_SCORE_COLUMNS,
  INITIAL_USER_COURSES,
} from '../data/initialGradeData.js'
import {
  calculateGradeAndCX,
  calculateTermGPA,
  calculateCumulativeGPAX,
  calculateMaxScore,
  calculateMissScoreToA,
  calculateWantToA,
} from '../utils/gradeCalculations.js'
import { useAuth } from './AuthContext.jsx'
import { getGradeData, saveGradeData } from '../services/api.js'
import { fetchAllRegCourses, buildMasterCatalog } from '../utils/courseCatalog.js'

const GradeContext = createContext(null)

export function GradeProvider({ children }) {
  const { user, token } = useAuth()
  const storageKey = user ? `bisket_grade_data_${user.username}` : 'bisket_grade_data_guest'

  // 1. Grade Scales (เกณฑ์การตัดเกรด)
  const [gradeScales, setGradeScales] = useState(() => {
    try {
      const saved = localStorage.getItem(`${storageKey}_scales`)
      return saved ? JSON.parse(saved) : DEFAULT_GRADE_SCALES
    } catch {
      return DEFAULT_GRADE_SCALES
    }
  })

  // 2. Score Columns (คอลัมน์คะแนนเก็บ)
  const [scoreColumns, setScoreColumns] = useState(() => {
    try {
      const saved = localStorage.getItem(`${storageKey}_columns`)
      return saved ? JSON.parse(saved) : DEFAULT_SCORE_COLUMNS
    } catch {
      return DEFAULT_SCORE_COLUMNS
    }
  })

  // 3. User Courses (รายวิชาและคะแนนเก็บ)
  // เริ่มต้นเป็น [] สำหรับผู้ใช้ใหม่ เพื่อให้กรอกข้อมูลเองตามต้องการ
  const [courses, setCourses] = useState(() => {
    try {
      const saved = localStorage.getItem(`${storageKey}_courses`)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState(null)
  const [hasInitialLoaded, setHasInitialLoaded] = useState(false)
  const [regCourses, setRegCourses] = useState([])

  // Load all REG courses from scraped courses.json or backend
  useEffect(() => {
    fetchAllRegCourses()
      .then((items) => {
        if (Array.isArray(items)) {
          setRegCourses(items)
        }
      })
      .catch(() => {})
  }, [])

  // Master catalog combining user courses, curriculum, and REG courses
  const masterCatalog = useMemo(() => {
    return buildMasterCatalog(courses, regCourses)
  }, [courses, regCourses])

  // 0. ดึงข้อมูลจาก Backend API ครั้งแรกเมื่อล็อกอิน
  useEffect(() => {
    if (token && !hasInitialLoaded) {
      getGradeData(token)
        .then((data) => {
          if (data) {
            if (Array.isArray(data.scales) && data.scales.length > 0) {
              setGradeScales(data.scales)
            }
            if (Array.isArray(data.columns) && data.columns.length > 0) {
              setScoreColumns(data.columns)
            }
            if (Array.isArray(data.courses) && data.courses.length > 0) {
              setCourses(data.courses)
            }
            setLastSyncedAt(new Date())
          }
        })
        .catch(() => {
          // Backend offline - ใช้ข้อมูลจาก localStorage ต่อเนื่อง
        })
        .finally(() => {
          setHasInitialLoaded(true)
        })
    }
  }, [token, hasInitialLoaded])

  // บันทึกการเปลี่ยนแปลงลง localStorage ทันที และซิงค์ Backend API ด้วย Debounce
  useEffect(() => {
    if (user) {
      try {
        localStorage.setItem(`${storageKey}_scales`, JSON.stringify(gradeScales))
        localStorage.setItem(`${storageKey}_columns`, JSON.stringify(scoreColumns))
        localStorage.setItem(`${storageKey}_courses`, JSON.stringify(courses))
      } catch (e) {
        console.error('Failed to save to localStorage', e)
      }

      // ซิงค์ไปยัง Backend API ด้วย debounce 1 วินาที
      if (token && hasInitialLoaded) {
        setIsSyncing(true)
        const timer = setTimeout(() => {
          saveGradeData(token, {
            scales: gradeScales,
            columns: scoreColumns,
            courses,
          })
            .then(() => {
              setLastSyncedAt(new Date())
            })
            .catch(() => {
              // ละเว้นหาก backend ไม่ตอบสนอง
            })
            .finally(() => {
              setIsSyncing(false)
            })
        }, 1000)

        return () => clearTimeout(timer)
      }
    }
  }, [gradeScales, scoreColumns, courses, storageKey, user, token, hasInitialLoaded])


  // Helper หา Grade Scale จาก ID
  const getScaleById = useCallback(
    (scaleId) => {
      const found = gradeScales.find((s) => s.id === scaleId)
      return found || gradeScales.find((s) => s.isDefault) || gradeScales[0]
    },
    [gradeScales]
  )

  // คำนวณเกรดและ CX สำหรับแต่ละวิชาแบบ Real-time
  const enrichedCourses = useMemo(() => {
    return courses.map((c) => {
      // 1. คำนวณคะแนนรวม (TOTAL) จาก scores ในหน้า TotalScorePage
      let totalFromScores = 0
      if (c.scores && typeof c.scores === 'object') {
        Object.values(c.scores).forEach((val) => {
          const num = parseFloat(val)
          if (!isNaN(num)) totalFromScores += num
        })
      } else if (c.total !== undefined) {
        totalFromScores = parseFloat(c.total) || 0
      }
      totalFromScores = Math.round(totalFromScores * 100) / 100

      // Effective score: ถ้ากำหนด totalScore เองให้ใช้ค่านั้น ถ้าเป็น null/ว่าง ให้ดึงจาก totalFromScores อัตโนมัติ
      const hasManualScore = c.totalScore !== undefined && c.totalScore !== null && c.totalScore !== ''
      const total = hasManualScore ? (parseFloat(c.totalScore) || 0) : totalFromScores

      // 2. เทียบเกรดกับ Calculator Scale ที่เลือก
      const scaleId = c.gradeScaleId || c.scaleId
      const scale = getScaleById(scaleId)
      const { grade, cx } = calculateGradeAndCX(total, scale?.ranges || [])

      // 3. คำนวณ Helper Columns
      const aRange = (scale?.ranges || []).find((r) => r.grade === 'A')
      const aThreshold = aRange ? parseFloat(aRange.min) : 80
      const maxScore = calculateMaxScore(total)
      const missScoreToA = calculateMissScoreToA(total, aThreshold)
      const wantToA = calculateWantToA(total, aThreshold)

      return {
        ...c,
        total,
        totalFromScores,
        hasManualScore,
        gradeScaleId: scaleId,
        grade,
        cx,
        scaleName: scale?.name || 'มาตรฐาน',
        aThreshold,
        maxScore,
        missScoreToA,
        wantToA,
      }
    })
  }, [courses, getScaleById])

  // ฟังก์ชันจัดการ Grade Scales
  const addGradeScale = useCallback((newScale) => {
    setGradeScales((prev) => [
      ...prev,
      {
        ...newScale,
        id: newScale.id || `scale_${Date.now()}`,
      },
    ])
  }, [])

  const updateGradeScale = useCallback((id, updated) => {
    setGradeScales((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updated } : s))
    )
  }, [])

  const deleteGradeScale = useCallback((id) => {
    setGradeScales((prev) => prev.filter((s) => s.id !== id))
  }, [])

  const resetGradeScales = useCallback(() => {
    setGradeScales(DEFAULT_GRADE_SCALES)
  }, [])

  // ฟังก์ชันจัดการ Score Columns (สำหรับหน้า Total)
  const addScoreColumn = useCallback((col) => {
    setScoreColumns((prev) => [
      ...prev,
      {
        id: col.id || `col_${Date.now()}`,
        name: col.name || 'ช่องคะแนนใหม่',
        maxScore: parseFloat(col.maxScore) || 10,
      },
    ])
  }, [])

  const updateScoreColumn = useCallback((id, updated) => {
    setScoreColumns((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updated } : c))
    )
  }, [])

  const deleteScoreColumn = useCallback((id) => {
    setScoreColumns((prev) => prev.filter((c) => c.id !== id))
    // ลบคะแนนช่องนั้นออกจากทุกวิชาด้วย
    setCourses((prev) =>
      prev.map((course) => {
        if (!course.scores) return course
        const nextScores = { ...course.scores }
        delete nextScores[id]
        return { ...course, scores: nextScores }
      })
    )
  }, [])

  // ฟังก์ชันจัดการรายวิชา (Courses)
  const addCourse = useCallback((newCourse) => {
    setCourses((prev) => [
      ...prev,
      {
        ...newCourse,
        id: newCourse.id || `c_${Date.now()}`,
        scores: newCourse.scores || {},
      },
    ])
  }, [])

  const updateCourse = useCallback((id, updated) => {
    setCourses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updated } : c))
    )
  }, [])

  const deleteCourse = useCallback((id) => {
    setCourses((prev) => prev.filter((c) => c.id !== id))
  }, [])

  const deleteCoursesByTerm = useCallback((year, semester) => {
    setCourses((prev) =>
      prev.filter((c) => !(c.year === parseInt(year) && c.semester === parseInt(semester)))
    )
  }, [])

  const deleteCoursesByYear = useCallback((year) => {
    setCourses((prev) => prev.filter((c) => c.year !== parseInt(year)))
  }, [])

  const updateCoursesTerm = useCallback((oldYear, oldSem, newYear, newSem) => {
    setCourses((prev) =>
      prev.map((c) => {
        if (c.year === parseInt(oldYear) && c.semester === parseInt(oldSem)) {
          return {
            ...c,
            year: parseInt(newYear),
            semester: parseInt(newSem),
          }
        }
        return c
      })
    )
  }, [])

  const updateCourseScore = useCallback((courseId, colId, value) => {
    setCourses((prev) =>
      prev.map((c) => {
        if (c.id !== courseId) return c
        const val = value === '' ? '' : parseFloat(value)
        return {
          ...c,
          scores: {
            ...(c.scores || {}),
            [colId]: isNaN(val) ? '' : val,
          },
        }
      })
    )
  }, [])

  const updateCourseScale = useCallback((courseId, gradeScaleId) => {
    setCourses((prev) =>
      prev.map((c) => (c.id === courseId ? { ...c, gradeScaleId } : c))
    )
  }, [])

  // คำนวณสรุปผลตามเทอม / ชั้นปี / สะสม
  const getTermSummary = useCallback(
    (year, semester) => {
      const termCourses = enrichedCourses.filter(
        (c) => c.year === parseInt(year) && c.semester === parseInt(semester)
      )
      return calculateTermGPA(termCourses)
    },
    [enrichedCourses]
  )

  const getYearSummary = useCallback(
    (year) => {
      const yearCourses = enrichedCourses.filter(
        (c) => c.year === parseInt(year)
      )
      return calculateTermGPA(yearCourses)
    },
    [enrichedCourses]
  )

  const getCumulativeSummary = useCallback(() => {
    return calculateCumulativeGPAX(enrichedCourses)
  }, [enrichedCourses])

  const resetAllGradeData = useCallback(() => {
    setGradeScales(DEFAULT_GRADE_SCALES)
    setScoreColumns(DEFAULT_SCORE_COLUMNS)
    setCourses(INITIAL_USER_COURSES)
  }, [])

  const value = {
    gradeScales,
    scoreColumns,
    courses: enrichedCourses,
    getScaleById,
    addGradeScale,
    updateGradeScale,
    deleteGradeScale,
    resetGradeScales,
    addScoreColumn,
    updateScoreColumn,
    deleteScoreColumn,
    addCourse,
    updateCourse,
    deleteCourse,
    deleteCoursesByTerm,
    deleteCoursesByYear,
    updateCoursesTerm,
    updateCourseScore,
    updateCourseScale,
    getTermSummary,
    getYearSummary,
    getCumulativeSummary,
    resetAllGradeData,
    isSyncing,
    lastSyncedAt,
    masterCatalog,
    regCourses,
  }

  return <GradeContext.Provider value={value}>{children}</GradeContext.Provider>
}

export function useGrade() {
  const ctx = useContext(GradeContext)
  if (!ctx) throw new Error('useGrade must be used within a GradeProvider')
  return ctx
}
