import React, { useState, useMemo, useEffect } from 'react'
import { useGrade } from '../../context/GradeContext.jsx'
import {
  GraduationCapIcon,
  PlusIcon,
  TrashIcon,
  SlidersIcon,
  CheckIcon,
  EditIcon,
  SearchIcon,
} from '../../components/Icons.jsx'
import { calculateGradeAndCX } from '../../utils/gradeCalculations.js'
import { searchCatalog } from '../../utils/courseCatalog.js'

export default function GradeReportPage() {
  const {
    courses,
    masterCatalog = [],
    gradeScales,
    addCourse,
    updateCourse,
    deleteCourse,
    deleteCoursesByTerm,
    deleteCoursesByYear,
    updateCoursesTerm,
    updateCourseScale,
    getCumulativeSummary,
    getYearSummary,
    getTermSummary,
  } = useGrade()

  const [selectedYearFilter, setSelectedYearFilter] = useState('all') // 'all', '1', '2', '3', '4'
  const [hopeGrades, setHopeGrades] = useState({}) // { [courseId]: 'A' }
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0
      setIsScrolled(scrollY > 40)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const handleDocumentClick = (e) => {
      if (!e.target.closest('.course-code-search-cell')) {
        setActiveSearchCourseId(null)
      }
    }
    document.addEventListener('mousedown', handleDocumentClick)
    return () => document.removeEventListener('mousedown', handleDocumentClick)
  }, [])

  // Custom added semester tables
  const [customTables, setCustomTables] = useState([]) // [ { year: 1, semester: 1 } ]
  const [deletedTermKeys, setDeletedTermKeys] = useState(new Set())
  const [deletedYearKeys, setDeletedYearKeys] = useState(new Set())

  const [isAddTableOpen, setIsAddTableOpen] = useState(false)
  const [newTableYear, setNewTableYear] = useState(1)
  const [newTableSemester, setNewTableSemester] = useState(1)

  // Edit Term modal state: { oldYear, oldSemester, newYear, newSemester }
  const [editingTerm, setEditingTerm] = useState(null)

  // Course Code Autocomplete Search state
  const [activeSearchCourseId, setActiveSearchCourseId] = useState(null)
  const [courseSearchQuery, setCourseSearchQuery] = useState('')

  // Overall Cumulative Summary
  const cumulative = getCumulativeSummary()

  // Distinct Years
  const availableYears = useMemo(() => {
    const set = new Set(courses.map((c) => c.year || 1))
    customTables.forEach((t) => set.add(t.year))
    deletedYearKeys.forEach((y) => set.delete(y))
    return Array.from(set).sort((a, b) => a - b)
  }, [courses, customTables, deletedYearKeys])

  // Group courses by Year -> Semester
  const groupedData = useMemo(() => {
    const groups = {}
    courses.forEach((course) => {
      const y = course.year || 1
      const s = course.semester || 1
      if (!groups[y]) groups[y] = {}
      if (!groups[y][s]) groups[y][s] = []
      groups[y][s].push(course)
    })

    // Include custom empty tables created
    customTables.forEach((t) => {
      if (!groups[t.year]) groups[t.year] = {}
      if (!groups[t.year][t.semester]) groups[t.year][t.semester] = []
    })

    return groups
  }, [courses, customTables])

  // Helper check if a term is already added in this report
  const isTermAdded = (year, sem) => {
    const y = parseInt(year)
    const s = parseInt(sem)
    const semKey = `${y}_${s}`
    if (deletedTermKeys.has(semKey) || deletedYearKeys.has(y)) return false
    const yearData = groupedData[y]
    if (yearData && yearData[s]) return true
    return customTables.some((t) => t.year === y && t.semester === s)
  }

  // Course suggestions filtered from comprehensive master catalog (all 1254+ REG courses + curriculum)
  const courseSuggestions = useMemo(() => {
    if (!activeSearchCourseId) return []
    return searchCatalog(courseSearchQuery, masterCatalog, 20)
  }, [activeSearchCourseId, courseSearchQuery, masterCatalog])

  const handleSelectCourseSuggestion = (courseId, sug) => {
    let credits = 3
    if (typeof sug.credits === 'number') {
      credits = sug.credits
    } else if (sug.credits) {
      const creditMatch = String(sug.credits).match(/^(\d+)/)
      if (creditMatch) credits = parseInt(creditMatch[1], 10)
    }

    // Check if this course code exists with scores in courses (e.g. from TotalScorePage)
    const normSugCode = (sug.code || '').replace(/\s+/g, '').toUpperCase()
    const existingWithScores = courses.find((c) => {
      const cNorm = (c.code || '').replace(/\s+/g, '').toUpperCase()
      return cNorm === normSugCode && c.id !== courseId
    })

    const updates = {
      code: sug.code,
      name: sug.nameEn || sug.name || sug.nameTh || 'Course',
      credits: credits,
    }

    if (existingWithScores) {
      if (existingWithScores.scores) updates.scores = { ...existingWithScores.scores }
      if (existingWithScores.total !== undefined) updates.total = existingWithScores.total
      if (existingWithScores.grade) updates.grade = existingWithScores.grade
      if (existingWithScores.cx !== undefined) updates.cx = existingWithScores.cx
      if (existingWithScores.gradeScaleId) updates.gradeScaleId = existingWithScores.gradeScaleId
    }

    updateCourse(courseId, updates)
    setActiveSearchCourseId(null)
  }

  // Save Edit Term
  const handleSaveEditTerm = (e) => {
    e.preventDefault()
    if (!editingTerm) return
    const { oldYear, oldSemester, newYear, newSemester } = editingTerm
    const ny = parseInt(newYear)
    const ns = parseInt(newSemester)
    const oy = parseInt(oldYear)
    const os = parseInt(oldSemester)

    if (ny === oy && ns === os) {
      setEditingTerm(null)
      return
    }

    // Move all courses in that semester
    updateCoursesTerm(oy, os, ny, ns)

    // Update customTables
    setCustomTables((prev) => {
      const filtered = prev.filter((t) => !(t.year === oy && t.semester === os))
      if (!filtered.some((t) => t.year === ny && t.semester === ns)) {
        filtered.push({ year: ny, semester: ns })
      }
      return filtered
    })

    // Remove new term from deleted keys if it was previously deleted
    setDeletedYearKeys((prev) => {
      const next = new Set(prev)
      next.delete(ny)
      return next
    })
    setDeletedTermKeys((prev) => {
      const next = new Set(prev)
      next.delete(`${ny}_${ns}`)
      return next
    })

    setEditingTerm(null)
  }

  // Column widths state for Excel-like resizing
  const [colWidths, setColWidths] = useState({
    code: 110,
    name: 210,
    credits: 65,
    total: 95,
    scale: 185,
    grade: 75,
    cx: 60,
    gp: 85,
    hope: 80,
    action: 55,
  })

  const startResize = (colKey, e) => {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const initialWidth = colWidths[colKey] || 80

    const onMouseMove = (moveEvent) => {
      const delta = moveEvent.clientX - startX
      const newWidth = Math.max(45, Math.round(initialWidth + delta))
      setColWidths((prev) => ({
        ...prev,
        [colKey]: newWidth,
      }))
    }

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  // Add a new Semester Table
  const handleCreateSemesterTable = (e) => {
    e.preventDefault()
    const y = parseInt(newTableYear)
    const s = parseInt(newTableSemester)

    setDeletedYearKeys((prev) => {
      const next = new Set(prev)
      next.delete(y)
      return next
    })
    setDeletedTermKeys((prev) => {
      const next = new Set(prev)
      next.delete(`${y}_${s}`)
      return next
    })

    if (!customTables.some((t) => t.year === y && t.semester === s)) {
      setCustomTables((prev) => [...prev, { year: y, semester: s }])
    }
    setIsAddTableOpen(false)
  }

  // Delete a Semester Table
  const handleDeleteSemesterTable = (year, semester) => {
    const key = `${year}_${semester}`
    if (window.confirm(`Are you sure you want to delete Semester ${semester} (Year ${year}) table and all its courses?`)) {
      deleteCoursesByTerm(year, semester)
      setCustomTables((prev) => prev.filter((t) => !(t.year === year && t.semester === semester)))
      setDeletedTermKeys((prev) => new Set([...prev, key]))
    }
  }

  // Delete an entire Year Section
  const handleDeleteYearSection = (year) => {
    if (window.confirm(`Are you sure you want to delete all tables and courses for Academic Year ${year}?`)) {
      deleteCoursesByYear(year)
      setCustomTables((prev) => prev.filter((t) => t.year !== year))
      setDeletedYearKeys((prev) => new Set([...prev, year]))
    }
  }

  // Quick add course row directly inside a semester table
  const handleAddCourseRow = (year, semester) => {
    const defaultScale = gradeScales[0]?.id || ''
    addCourse({
      id: `c_${Date.now()}`,
      year: parseInt(year),
      semester: parseInt(semester),
      code: 'NEW101',
      name: 'New Course',
      credits: 3,
      gradeScaleId: defaultScale,
      scores: {},
      total: 80,
    })
  }

  return (
    <div className="grade-page-container">
      {/* Header */}
      <div className="grade-page-header">
        <div className="grade-page-header-left">
          <div className="grade-header-icon-badge">
            <GraduationCapIcon size={22} color="#B95C44" />
          </div>
          <div>
            <h1 className="grade-page-title">Program GRADE</h1>
            <p className="grade-page-sub">
              SUT Academic Grade Report, Term GPA, and Cumulative GPAX Analysis
            </p>
          </div>
        </div>

        <div className="grade-page-header-actions">
          <button
            type="button"
            className="btn-create-scale"
            onClick={() => setIsAddTableOpen(true)}
          >
            <PlusIcon size={15} />
            <span>+ Add Year / Term Table</span>
          </button>

          {availableYears.length > 0 && (
            <div className="year-filter-tabs">
              <button
                type="button"
                className={`year-filter-tab ${selectedYearFilter === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedYearFilter('all')}
              >
                All Years
              </button>
              {availableYears.map((y) => (
                <button
                  key={y}
                  type="button"
                  className={`year-filter-tab ${selectedYearFilter === String(y) ? 'active' : ''}`}
                  onClick={() => setSelectedYearFilter(String(y))}
                >
                  Year {y}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top Cumulative Summary Cards */}
      <div className={`grade-summary-cards-grid ${isScrolled ? 'is-compact' : ''}`}>
        <div className="summary-card highlight">
          <div className="summary-card-label">Cumulative GPA (GPAX)</div>
          <div className="summary-card-value">
            {cumulative.gpa > 0 ? cumulative.gpa.toFixed(2) : '0.00'}
            <span className="summary-card-full-precision">({cumulative.gpa.toFixed(5)})</span>
          </div>
          <div className="summary-card-sub">
            Calculated across {cumulative.totalCredits} credits
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-card-label">Total Credits Passed</div>
          <div className="summary-card-value">{cumulative.totalCredits}</div>
          <div className="summary-card-sub">Accumulated academic credits</div>
        </div>

        <div className="summary-card">
          <div className="summary-card-label">Grade Points</div>
          <div className="summary-card-value">{cumulative.totalGradePoints.toFixed(1)}</div>
          <div className="summary-card-sub">Total of (Credits &times; CX)</div>
        </div>

        <div className="summary-card">
          <div className="summary-card-label">Registered Courses</div>
          <div className="summary-card-value">{courses.length}</div>
          <div className="summary-card-sub">Active graded courses</div>
        </div>
      </div>

      {/* Year-by-Year Blocks */}
      <div className="grade-years-container">
        {availableYears.length === 0 ? (
          <div className="report-empty-state">
            <GraduationCapIcon size={46} color="#B95C44" />
            <h3>No Academic Tables Yet</h3>
            <p>You can add your semester tables and courses to start tracking and calculating your GPA/GPAX.</p>
            <button
              type="button"
              className="btn-create-scale"
              onClick={() => setIsAddTableOpen(true)}
              style={{ marginTop: '12px' }}
            >
              <PlusIcon size={15} />
              <span>+ Add First Table</span>
            </button>
          </div>
        ) : (
          <>
            {availableYears
            .filter((y) => selectedYearFilter === 'all' || String(y) === selectedYearFilter)
            .map((yearNum) => {
              const yearSummary = getYearSummary(yearNum)
              const yearSemesters = groupedData[yearNum] || {}
              const semKeys = Object.keys(yearSemesters)
                .filter((s) => !deletedTermKeys.has(`${yearNum}_${s}`))
                .sort((a, b) => parseInt(a) - parseInt(b))

              if (semKeys.length === 0) return null

              return (
                <section key={yearNum} className="grade-year-section">
                  {/* Year Header Bar */}
                  <div className="year-section-header">
                    <div className="year-title-wrap">
                      <span className="year-number-badge">Year {yearNum}</span>
                      <h2 className="year-section-title">Academic Year {yearNum} Report</h2>
                    </div>
                    <div className="year-summary-badge">
                      <span>
                        Year GPA: <strong>{yearSummary.gpa > 0 ? yearSummary.gpa.toFixed(2) : '0.00'}</strong>
                      </span>
                      <span className="badge-divider">&bull;</span>
                      <span>{yearSummary.totalCredits} Credits</span>
                      <span className="badge-divider">&bull;</span>
                      <span>Points: {yearSummary.totalGradePoints.toFixed(1)}</span>
                      <button
                        type="button"
                        className="btn-delete-year-section"
                        onClick={() => handleDeleteYearSection(yearNum)}
                        title={`Delete all tables in Year ${yearNum}`}
                      >
                        <TrashIcon size={12} />
                        <span>Delete Year</span>
                      </button>
                    </div>
                  </div>

                  {/* Semesters in this year */}
                  <div className="semesters-grid">
                    {semKeys.map((semNum) => {
                      const semCourses = yearSemesters[semNum] || []
                      const termSummary = getTermSummary(yearNum, semNum)

                      return (
                        <div key={semNum} className="semester-card">
                          <div className="semester-card-header">
                            <div className="sem-header-left">
                              <span className="term-divider-year-tag">ชั้นปีที่ {yearNum}</span>
                              <span className="term-divider-sem-title">ภาคการศึกษาที่ {semNum} (เทอม {semNum})</span>
                            </div>
                            <div className="sem-header-stats">
                              <span className="sem-gpa-badge">
                                GPA: <strong>{termSummary.gpa > 0 ? termSummary.gpa.toFixed(2) : '0.00'}</strong>
                                <span className="sem-full-gpa">({termSummary.gpa.toFixed(4)})</span>
                              </span>
                              <span className="sem-credits-badge">
                                {termSummary.totalCredits} Credits ({termSummary.totalGradePoints.toFixed(1)} Points)
                              </span>
                              <button
                                type="button"
                                className="btn-add-course-term"
                                onClick={() => handleAddCourseRow(yearNum, semNum)}
                                title="Add course to this semester"
                              >
                                <PlusIcon size={12} />
                                <span>+ Add Course</span>
                              </button>
                              <button
                                type="button"
                                className="btn-edit-term-table"
                                onClick={() =>
                                  setEditingTerm({
                                    oldYear: yearNum,
                                    oldSemester: semNum,
                                    newYear: yearNum,
                                    newSemester: semNum,
                                  })
                                }
                                title="Edit this semester/term"
                              >
                                <EditIcon size={12} />
                                <span>Edit Term</span>
                              </button>
                              <button
                                type="button"
                                className="btn-delete-term-table"
                                onClick={() => handleDeleteSemesterTable(yearNum, semNum)}
                                title={`Delete Semester ${semNum} table`}
                              >
                                <TrashIcon size={12} />
                                <span>Delete Table</span>
                              </button>
                            </div>
                          </div>

                          {/* Semester Table with Excel-like resizers */}
                          <div className="semester-table-wrapper">
                            <table className="semester-grade-table" style={{ tableLayout: 'fixed', width: '100%' }}>
                              <colgroup>
                                <col style={{ width: `${colWidths.code || 110}px` }} />
                                <col style={{ width: `${colWidths.name || 210}px` }} />
                                <col style={{ width: `${colWidths.credits || 65}px` }} />
                                <col style={{ width: `${colWidths.total || 95}px` }} />
                                <col style={{ width: `${colWidths.scale || 185}px` }} />
                                <col style={{ width: `${colWidths.grade || 75}px` }} />
                                <col style={{ width: `${colWidths.cx || 60}px` }} />
                                <col style={{ width: `${colWidths.gp || 85}px` }} />
                                <col style={{ width: `${colWidths.hope || 80}px` }} />
                                <col style={{ width: `${colWidths.action || 55}px` }} />
                              </colgroup>
                              <thead>
                                <tr>
                                  <th>
                                    <span>Code</span>
                                    <div className="col-resizer" onMouseDown={(e) => startResize('code', e)} />
                                  </th>
                                  <th>
                                    <span>Course Title</span>
                                    <div className="col-resizer" onMouseDown={(e) => startResize('name', e)} />
                                  </th>
                                  <th style={{ textAlign: 'center' }}>
                                    <span>Credits</span>
                                    <div className="col-resizer" onMouseDown={(e) => startResize('credits', e)} />
                                  </th>
                                  <th style={{ textAlign: 'center' }} title="Pull from Total Score sum or enter score">
                                    <span>TOTAL</span>
                                    <div className="col-resizer" onMouseDown={(e) => startResize('total', e)} />
                                  </th>
                                  <th>
                                    <span>Grading Scale</span>
                                    <div className="col-resizer" onMouseDown={(e) => startResize('scale', e)} />
                                  </th>
                                  <th style={{ textAlign: 'center' }}>
                                    <span>GRADE</span>
                                    <div className="col-resizer" onMouseDown={(e) => startResize('grade', e)} />
                                  </th>
                                  <th style={{ textAlign: 'center' }}>
                                    <span>CX</span>
                                    <div className="col-resizer" onMouseDown={(e) => startResize('cx', e)} />
                                  </th>
                                  <th style={{ textAlign: 'center' }}>
                                    <span>Points</span>
                                    <div className="col-resizer" onMouseDown={(e) => startResize('gp', e)} />
                                  </th>
                                  <th style={{ textAlign: 'center' }} title="Simulate expected grade">
                                    <span>HOPE</span>
                                    <div className="col-resizer" onMouseDown={(e) => startResize('hope', e)} />
                                  </th>
                                  <th style={{ textAlign: 'center' }}>Del</th>
                                </tr>
                              </thead>
                              <tbody>
                                {semCourses.length === 0 ? (
                                  <tr>
                                    <td colSpan={10} className="empty-sem-row">
                                      No courses in this term yet. Click <strong>+ Add Course</strong> above to add one.
                                    </td>
                                  </tr>
                                ) : (
                                  semCourses.map((c, idx) => {
                                    const courseGradePoint = (parseFloat(c.credits) || 0) * (parseFloat(c.cx) || 0)
                                    const isDropup = semCourses.length > 2 && idx >= semCourses.length - 2
                                    return (
                                      <tr key={c.id}>
                                        {/* Editable Code with Autocomplete */}
                                        <td className="cell-code" style={{ position: 'relative' }}>
                                          <div className="course-code-search-cell">
                                            <input
                                              type="text"
                                              value={c.code}
                                              onChange={(e) => {
                                                const val = e.target.value
                                                updateCourse(c.id, { code: val })
                                                setCourseSearchQuery(val)
                                                setActiveSearchCourseId(c.id)
                                              }}
                                              onFocus={() => {
                                                setCourseSearchQuery(c.code || '')
                                                setActiveSearchCourseId(c.id)
                                              }}
                                              onBlur={() => {
                                                const norm = (c.code || '').replace(/\s+/g, '').toUpperCase()
                                                if (norm) {
                                                  const matched = masterCatalog.find(
                                                    (item) => (item.code || '').replace(/\s+/g, '').toUpperCase() === norm
                                                  )
                                                  if (matched && (!c.name || c.name === 'New Course' || c.name === 'Course')) {
                                                    updateCourse(c.id, {
                                                      name: matched.nameEn || matched.name,
                                                      credits: matched.credits || c.credits,
                                                    })
                                                  }
                                                }
                                              }}
                                              className="cell-inline-inp"
                                              placeholder="Search / code"
                                              title="Click to search curriculum or type code"
                                            />
                                            {activeSearchCourseId === c.id && (
                                              <div className={`course-search-popover ${isDropup ? 'is-dropup' : ''}`}>
                                                <div className="course-search-header">
                                                  <span>Select Course ({courseSuggestions.length}):</span>
                                                  <button
                                                    type="button"
                                                    className="btn-close-popover"
                                                    onMouseDown={(e) => {
                                                      e.preventDefault()
                                                      setActiveSearchCourseId(null)
                                                    }}
                                                  >
                                                    &times;
                                                  </button>
                                                </div>
                                                <div className="course-search-list">
                                                  {courseSuggestions.length === 0 ? (
                                                    <div className="course-search-empty">
                                                      No matching curriculum course found. You can keep typing custom code.
                                                    </div>
                                                  ) : (
                                                    courseSuggestions.map((sug) => (
                                                      <div
                                                        key={`${sug.code}-${sug.category || ''}`}
                                                        className="course-search-item"
                                                        onMouseDown={(e) => {
                                                          e.preventDefault()
                                                          handleSelectCourseSuggestion(c.id, sug)
                                                        }}
                                                      >
                                                        <div className="course-search-item-top">
                                                          <span className="search-course-code">{sug.code}</span>
                                                          <span className="search-course-credits">
                                                            {typeof sug.credits === 'number' ? `${sug.credits} Cr` : (sug.credits || '3 Cr')}
                                                          </span>
                                                        </div>
                                                        <div className="search-course-name">{sug.nameEn || sug.name}</div>
                                                        {(sug.nameTh || sug.category) && (
                                                          <div className="search-course-sub">
                                                            {sug.nameTh ? `${sug.nameTh}` : ''}
                                                            {sug.nameTh && sug.category ? ' • ' : ''}
                                                            {sug.category ? `${sug.category}` : ''}
                                                          </div>
                                                        )}
                                                      </div>
                                                    ))
                                                  )}
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        </td>

                                        {/* Editable Name */}
                                        <td className="cell-name">
                                          <input
                                            type="text"
                                            value={c.name}
                                            onChange={(e) => updateCourse(c.id, { name: e.target.value })}
                                            className="cell-inline-inp"
                                            title="Edit course name"
                                          />
                                        </td>

                                        {/* Editable Credits */}
                                        <td className="cell-credits">
                                          <input
                                            type="number"
                                            min="1"
                                            max="10"
                                            value={c.credits}
                                            onChange={(e) =>
                                              updateCourse(c.id, { credits: parseFloat(e.target.value) || 0 })
                                            }
                                            className="cell-inline-inp-center"
                                            title="Edit credits"
                                          />
                                        </td>

                                        {/* TOTAL: Unified input with dropdown preset trigger */}
                                        <td className="cell-total-report">
                                          <div
                                            className="total-combo-box"
                                            title={
                                              c.hasManualScore
                                                ? `Manual score: ${c.total} (Click arrow to revert to Auto: ${c.totalFromScores ?? 0})`
                                                : `Auto from Total: ${c.totalFromScores ?? 0} (Click to edit or arrow for presets)`
                                            }
                                          >
                                            <input
                                              type="number"
                                              step="0.01"
                                              min="0"
                                              max="100"
                                              value={c.total ?? ''}
                                              onChange={(e) => {
                                                const val = e.target.value === '' ? null : parseFloat(e.target.value)
                                                updateCourse(c.id, { totalScore: val })
                                              }}
                                              className={`total-combo-input ${c.hasManualScore ? 'is-manual' : 'is-auto'}`}
                                              placeholder="0"
                                            />
                                            <div className="total-combo-arrow" aria-hidden="true">
                                              <svg width="8" height="5" viewBox="0 0 10 6" fill="none">
                                                <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                              </svg>
                                            </div>
                                            <select
                                              className="total-combo-select"
                                              value={c.hasManualScore ? 'manual' : 'auto'}
                                              onChange={(e) => {
                                                if (e.target.value === 'auto') {
                                                  updateCourse(c.id, { totalScore: null })
                                                } else {
                                                  const num = parseFloat(e.target.value)
                                                  if (!isNaN(num)) {
                                                    updateCourse(c.id, { totalScore: num })
                                                  }
                                                }
                                              }}
                                              title="Choose Auto from TOTAL page or pick preset"
                                            >
                                              <option value="auto">Auto ({c.totalFromScores ?? 0})</option>
                                              {c.hasManualScore && <option value="manual">Custom ({c.total})</option>}
                                              <optgroup label="Preset Score">
                                                <option value="100">100 (A)</option>
                                                <option value="90">90 (A)</option>
                                                <option value="85">85 (A)</option>
                                                <option value="80">80 (A / B+)</option>
                                                <option value="75">75 (B+)</option>
                                                <option value="70">70 (B)</option>
                                                <option value="65">65 (C+)</option>
                                                <option value="60">60 (C)</option>
                                                <option value="55">55 (D+)</option>
                                                <option value="50">50 (D)</option>
                                                <option value="0">0 (F)</option>
                                              </optgroup>
                                            </select>
                                          </div>
                                        </td>

                                        {/* Scale Dropdown */}
                                        <td className="cell-scale-select">
                                          <select
                                            value={c.gradeScaleId}
                                            onChange={(e) => updateCourseScale(c.id, e.target.value)}
                                            className="scale-dropdown"
                                          >
                                            {gradeScales.map((s) => (
                                              <option key={s.id} value={s.id}>
                                                {s.name}
                                              </option>
                                            ))}
                                          </select>
                                        </td>

                                        {/* Calculated Grade Pill */}
                                        <td className="cell-grade">
                                          <span className={`grade-pill grade-${c.grade?.replace('+', '-plus')}`}>
                                            {c.grade}
                                          </span>
                                        </td>

                                        {/* Calculated CX */}
                                        <td className="cell-cx">{c.cx?.toFixed(1) || '0.0'}</td>

                                        {/* Calculated Grade Points */}
                                        <td className="cell-gp">{courseGradePoint.toFixed(1)}</td>

                                        {/* HOPE Dropdown */}
                                        <td className="cell-hope">
                                          <select
                                            value={hopeGrades[c.id] || ''}
                                            onChange={(e) =>
                                              setHopeGrades((prev) => ({
                                                ...prev,
                                                [c.id]: e.target.value,
                                              }))
                                            }
                                            className="hope-dropdown"
                                          >
                                            <option value="">-</option>
                                            <option value="A">A</option>
                                            <option value="B+">B+</option>
                                            <option value="B">B</option>
                                            <option value="C+">C+</option>
                                            <option value="C">C</option>
                                            <option value="D+">D+</option>
                                            <option value="D">D</option>
                                            <option value="F">F</option>
                                          </select>
                                        </td>

                                        {/* Delete Row */}
                                        <td style={{ textAlign: 'center' }}>
                                          <button
                                            type="button"
                                            className="btn-delete-row"
                                            onClick={() => {
                                              if (window.confirm(`Delete course "${c.code} ${c.name}"?`)) {
                                                deleteCourse(c.id)
                                              }
                                            }}
                                            title="Delete course"
                                          >
                                            <TrashIcon size={12} />
                                          </button>
                                        </td>
                                      </tr>
                                    )
                                  })
                                )}
                              </tbody>
                              <tfoot>
                                <tr className="semester-table-footer">
                                  <td colSpan={2} style={{ textAlign: 'right', fontWeight: 600 }}>
                                    Term {semNum} Summary:
                                  </td>
                                  <td className="footer-credits">{termSummary.totalCredits}</td>
                                  <td></td>
                                  <td></td>
                                  <td colSpan={2} style={{ textAlign: 'right', fontWeight: 600 }}>
                                    GPA Term {semNum}:
                                  </td>
                                  <td className="footer-gpa" colSpan={3}>
                                    <strong>{termSummary.gpa.toFixed(2)}</strong> ({termSummary.totalGradePoints.toFixed(1)} / {termSummary.totalCredits * 4} pts)
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </section>
              )
            })}

            {/* Bottom Add New Table Button */}
            <div className="report-bottom-add-section">
              <button
                type="button"
                className="btn-bottom-add-table"
                onClick={() => setIsAddTableOpen(true)}
              >
                <PlusIcon size={16} />
                <span>+ Add New Year / Semester Table</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Modal Add Year / Term Table with Status Indicators */}
      {isAddTableOpen && (
        <div className="modal-backdrop" onClick={() => setIsAddTableOpen(false)}>
          <div className="new-scale-modal" onClick={(e) => e.stopPropagation()}>
            <header className="new-scale-modal-header">
              <h2>Add Year / Semester Table</h2>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setIsAddTableOpen(false)}
              >
                &times;
              </button>
            </header>
            <form onSubmit={handleCreateSemesterTable} className="new-scale-modal-body">
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label>Academic Year</label>
                <select
                  value={newTableYear}
                  onChange={(e) => setNewTableYear(parseInt(e.target.value))}
                >
                  <option value="1">Year 1</option>
                  <option value="2">Year 2</option>
                  <option value="3">Year 3</option>
                  <option value="4">Year 4</option>
                  <option value="5">Year 5</option>
                </select>
              </div>

              <div className="form-group">
                <label>Semester (Term) - Status Overview</label>
                <div className="modal-term-status-cards">
                  {[1, 2, 3].map((s) => {
                    const added = isTermAdded(newTableYear, s)
                    const isSelected = parseInt(newTableSemester) === s
                    return (
                      <button
                        key={s}
                        type="button"
                        className={`term-status-card ${isSelected ? 'selected' : ''} ${added ? 'already-added' : 'available'}`}
                        onClick={() => setNewTableSemester(s)}
                      >
                        <div className="term-status-card-top">
                          <strong>Term {s}</strong>
                          {added ? (
                            <span className="term-status-pill added">✓ Added</span>
                          ) : (
                            <span className="term-status-pill ready">+ Add</span>
                          )}
                        </div>
                        <div className="term-status-card-sub">
                          {added ? 'Table in report' : 'Available'}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '12px' }}>
                <label>Select Term Dropdown</label>
                <select
                  value={newTableSemester}
                  onChange={(e) => setNewTableSemester(parseInt(e.target.value))}
                >
                  {[1, 2, 3].map((s) => (
                    <option key={s} value={s}>
                      Semester {s} {isTermAdded(newTableYear, s) ? '(✓ Already Added)' : '(Available to Add)'}
                    </option>
                  ))}
                </select>
              </div>

              {isTermAdded(newTableYear, newTableSemester) && (
                <div className="term-already-added-alert">
                  ✓ Academic Year {newTableYear} / Semester {newTableSemester} is already added in your report.
                </div>
              )}

              <footer className="new-scale-modal-footer">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setIsAddTableOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-confirm"
                  disabled={isTermAdded(newTableYear, newTableSemester)}
                  title={isTermAdded(newTableYear, newTableSemester) ? 'This semester table is already added' : 'Add table'}
                >
                  {isTermAdded(newTableYear, newTableSemester) ? 'Already Added' : 'Create Table'}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Semester / Term */}
      {editingTerm && (
        <div className="modal-backdrop" onClick={() => setEditingTerm(null)}>
          <div className="new-scale-modal" onClick={(e) => e.stopPropagation()}>
            <header className="new-scale-modal-header">
              <h2>Edit Semester Table</h2>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setEditingTerm(null)}
              >
                &times;
              </button>
            </header>
            <form onSubmit={handleSaveEditTerm} className="new-scale-modal-body">
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Current: <strong>Academic Year {editingTerm.oldYear} / Semester {editingTerm.oldSemester}</strong>
                </p>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>Change to Academic Year</label>
                  <select
                    value={editingTerm.newYear}
                    onChange={(e) =>
                      setEditingTerm((prev) => ({ ...prev, newYear: parseInt(e.target.value) }))
                    }
                  >
                    <option value={1}>Year 1</option>
                    <option value={2}>Year 2</option>
                    <option value={3}>Year 3</option>
                    <option value={4}>Year 4</option>
                    <option value={5}>Year 5</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Change to Semester</label>
                  <select
                    value={editingTerm.newSemester}
                    onChange={(e) =>
                      setEditingTerm((prev) => ({ ...prev, newSemester: parseInt(e.target.value) }))
                    }
                  >
                    <option value={1}>Term 1</option>
                    <option value={2}>Term 2</option>
                    <option value={3}>Term 3</option>
                  </select>
                </div>
              </div>

              {isTermAdded(editingTerm.newYear, editingTerm.newSemester) &&
                !(editingTerm.newYear === editingTerm.oldYear && editingTerm.newSemester === editingTerm.oldSemester) && (
                  <div className="term-conflict-notice">
                    ⚠️ Academic Year {editingTerm.newYear} / Semester {editingTerm.newSemester} already has courses. Saving will merge these courses into that semester.
                  </div>
              )}

              <footer className="new-scale-modal-footer">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setEditingTerm(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-confirm">
                  Save Changes
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
