import React, { useState, useMemo, useEffect } from 'react'
import { useGrade } from '../../context/GradeContext.jsx'
import {
  TableIcon,
  PlusIcon,
  TrashIcon,
  EditIcon,
  CheckIcon,
  CloseIcon,
  SlidersIcon,
  SearchIcon,
} from '../../components/Icons.jsx'
import { searchCatalog } from '../../utils/courseCatalog.js'

export default function TotalScorePage() {
  const {
    courses,
    masterCatalog = [],
    scoreColumns,
    addScoreColumn,
    updateScoreColumn,
    deleteScoreColumn,
    addCourse,
    updateCourse,
    deleteCourse,
    updateCourseScore,
    gradeScales,
  } = useGrade()

  const [filterYear, setFilterYear] = useState('all') // 'all', '1', '2', '3', '4'
  const [filterSemester, setFilterSemester] = useState('all') // 'all', '1', '2', '3'

  // Autocomplete states for Add Course Modal & inline table
  const [modalSearchQuery, setModalSearchQuery] = useState('')
  const [isModalSearchOpen, setIsModalSearchOpen] = useState(false)
  const [activeInlineSearchId, setActiveInlineSearchId] = useState(null)
  const [inlineSearchQuery, setInlineSearchQuery] = useState('')

  useEffect(() => {
    const handleDocClick = (e) => {
      if (!e.target.closest('.course-code-search-cell')) {
        setActiveInlineSearchId(null)
      }
      if (!e.target.closest('.modal-code-input-cell')) {
        setIsModalSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handleDocClick)
    return () => document.removeEventListener('mousedown', handleDocClick)
  }, [])

  const modalSuggestions = useMemo(() => {
    if (!modalSearchQuery) return []
    return searchCatalog(modalSearchQuery, masterCatalog, 8)
  }, [modalSearchQuery, masterCatalog])

  const inlineSuggestions = useMemo(() => {
    if (!activeInlineSearchId) return []
    return searchCatalog(inlineSearchQuery, masterCatalog, 12)
  }, [activeInlineSearchId, inlineSearchQuery, masterCatalog])

  // Add Course Modal State
  const [isAddCourseOpen, setIsAddCourseOpen] = useState(false)
  const [newCourseCode, setNewCourseCode] = useState('')
  const [newCourseName, setNewCourseName] = useState('')
  const [newCourseCredits, setNewCourseCredits] = useState(4)
  const [newCourseYear, setNewCourseYear] = useState(1)
  const [newCourseSemester, setNewCourseSemester] = useState(1)
  const [newCourseScaleId, setNewCourseScaleId] = useState(gradeScales[0]?.id || '')

  // Add Column Modal State
  const [isAddColOpen, setIsAddColOpen] = useState(false)
  const [newColName, setNewColName] = useState('')
  const [newColMax, setNewColMax] = useState(10)

  // Edit Column Name/Max State
  const [editingColId, setEditingColId] = useState(null)
  const [editColName, setEditColName] = useState('')
  const [editColMax, setEditColMax] = useState(10)

  // Column widths state for Excel-like draggable column resizing
  const [colWidths, setColWidths] = useState({
    code: 105,
    name: 200,
    credits: 60,
    total: 70,
    maxScore: 70,
    missToA: 78,
    wantToA: 78,
    del: 60,
  })

  // Customizable summary column names
  const [summaryTitles, setSummaryTitles] = useState({
    total: 'TOTAL',
    maxScore: 'MAX SCOR',
    missToA: 'MISS TO A',
    wantToA: 'WANT TO A',
  })
  const [editingSummaryKey, setEditingSummaryKey] = useState(null)
  const [tempSummaryTitle, setTempSummaryTitle] = useState('')

  const startResize = (colKey, e) => {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const initialWidth = colWidths[colKey] || (String(colKey).startsWith('col_') ? 68 : 70)

    const onMouseMove = (moveEvent) => {
      const delta = moveEvent.clientX - startX
      const newWidth = Math.max(36, Math.round(initialWidth + delta))
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

  // Filtered Columns for Year / Semester
  const activeScoreColumns = useMemo(() => {
    return scoreColumns.filter((col) => {
      if (col.year && col.year !== 'all' && filterYear !== 'all' && String(col.year) !== filterYear) return false
      if (col.semester && col.semester !== 'all' && filterSemester !== 'all' && String(col.semester) !== filterSemester) return false
      return true
    })
  }, [scoreColumns, filterYear, filterSemester])

  // Filtered and Sorted Courses (sorted by year and semester)
  const displayedCourses = useMemo(() => {
    return courses
      .filter((c) => {
        if (filterYear !== 'all' && String(c.year) !== filterYear) return false
        if (filterSemester !== 'all' && String(c.semester) !== filterSemester) return false
        return true
      })
      .sort((a, b) => {
        const yA = parseInt(a.year) || 1
        const yB = parseInt(b.year) || 1
        if (yA !== yB) return yA - yB
        const sA = parseInt(a.semester) || 1
        const sB = parseInt(b.semester) || 1
        return sA - sB
      })
  }, [courses, filterYear, filterSemester])

  const openAddCourseModal = () => {
    setNewCourseYear(filterYear !== 'all' ? parseInt(filterYear) : 1)
    setNewCourseSemester(filterSemester !== 'all' ? parseInt(filterSemester) : 1)
    setIsAddCourseOpen(true)
  }

  const handleCreateCourse = (e) => {
    e.preventDefault()
    if (!newCourseCode.trim() || !newCourseName.trim()) return

    addCourse({
      id: `c_${Date.now()}`,
      year: parseInt(newCourseYear),
      semester: parseInt(newCourseSemester),
      code: newCourseCode.trim(),
      name: newCourseName.trim(),
      credits: parseFloat(newCourseCredits) || 3,
      gradeScaleId: newCourseScaleId || gradeScales[0]?.id,
      scores: {},
    })

    setNewCourseCode('')
    setNewCourseName('')
    setIsAddCourseOpen(false)
  }

  const [newColScope, setNewColScope] = useState('all') // 'all' or 'current'

  const handleCreateColumn = (e) => {
    e.preventDefault()
    if (!newColName.trim()) return

    addScoreColumn({
      id: `col_${Date.now()}`,
      name: newColName.trim(),
      maxScore: parseFloat(newColMax) || 10,
      year: newColScope === 'current' && filterYear !== 'all' ? filterYear : 'all',
      semester: newColScope === 'current' && filterSemester !== 'all' ? filterSemester : 'all',
    })

    setNewColName('')
    setIsAddColOpen(false)
  }

  return (
    <div className="grade-page-container">
      {/* Header */}
      <div className="grade-page-header">
        <div className="grade-page-header-left">
          <div className="grade-header-icon-badge">
            <TableIcon size={22} color="#B95C44" />
          </div>
          <div>
            <h1 className="grade-page-title">TOTAL</h1>
            <p className="grade-page-sub">
              Course score tracker & automatic sum calculation
            </p>
          </div>
        </div>

        <div className="grade-page-header-actions">
          <button
            type="button"
            className="btn-create-scale"
            onClick={openAddCourseModal}
          >
            <PlusIcon size={15} />
            <span>+ เพิ่มรายวิชา (แถว)</span>
          </button>
          <button
            type="button"
            className="btn-secondary-action"
            onClick={() => setIsAddColOpen(true)}
          >
            <PlusIcon size={15} />
            <span>+ เพิ่มช่องคะแนน (คอลัมน์)</span>
          </button>
        </div>
      </div>

      {/* Row 1: ชั้นปี */}
      <div className="year-selector-wrapper">
        <span className="filter-group-label" style={{ minWidth: '52px', display: 'inline-block' }}>ชั้นปี:</span>
        <div className="year-tabs-group equal-frame">
          {['all', '1', '2', '3', '4'].map((y) => (
            <button
              key={y}
              type="button"
              className={`year-tab-btn ${filterYear === y ? 'active' : ''}`}
              onClick={() => setFilterYear(y)}
            >
              {y === 'all' ? 'ทุกชั้นปี' : `ปี ${y}`}
            </button>
          ))}
        </div>
      </div>

      {/* Row 2: เทอม */}
      <div className="term-selector-wrapper">
        <span className="filter-group-label" style={{ minWidth: '52px', display: 'inline-block' }}>เทอม:</span>
        <div className="year-tabs-group equal-frame">
          {['all', '1', '2', '3'].map((s) => (
            <button
              key={s}
              type="button"
              className={`year-tab-btn ${filterSemester === s ? 'active' : ''}`}
              onClick={() => setFilterSemester(s)}
            >
              {s === 'all' ? 'ทุกเทอม' : `เทอม ${s}`}
            </button>
          ))}
        </div>
        <div className="filter-count-badge" style={{ marginLeft: 'auto' }}>
          แสดง <strong>{displayedCourses.length}</strong> วิชา
        </div>
      </div>

      {/* Spreadsheet Table */}
      <div className="total-spreadsheet-wrapper">
        <table className="total-spreadsheet-table">
          <colgroup>
            <col style={{ width: `${colWidths.code || 105}px` }} />
            <col style={{ width: `${colWidths.name || 200}px` }} />
            <col style={{ width: `${colWidths.credits || 60}px` }} />
            {activeScoreColumns.map((col) => (
              <col key={col.id} style={{ width: `${colWidths[col.id] || 68}px` }} />
            ))}
            <col style={{ width: `${colWidths.total || 70}px` }} />
            <col style={{ width: `${colWidths.maxScore || 70}px` }} />
            <col style={{ width: `${colWidths.missToA || 78}px` }} />
            <col style={{ width: `${colWidths.wantToA || 78}px` }} />
            <col style={{ width: `${colWidths.del || 60}px` }} />
          </colgroup>
          <thead>
            {/* Top row: Column groups */}
            <tr className="header-group-row">
              <th colSpan={3} className="th-grp-info">ข้อมูลรายวิชา</th>
              <th colSpan={activeScoreColumns.length} className="th-grp-scores">
                คะแนนเก็บแต่ละส่วน (คลิกหัวคอลัมน์เพื่อแก้ไข)
              </th>
              <th colSpan={4} className="th-grp-calc">ผลการวิเคราะห์คะแนน (คลิกเพื่อแก้ไขชื่อ)</th>
              <th style={{ width: `${colWidths.del || 60}px` }}>ลบ</th>
            </tr>
            {/* Main column headers */}
            <tr className="header-columns-row">
              <th style={{ width: `${colWidths.code || 105}px` }}>
                <span>รหัสวิชา</span>
                <div
                  className="col-resizer"
                  onMouseDown={(e) => startResize('code', e)}
                  title="ลากเพื่อปรับขนาดคอลัมน์"
                />
              </th>
              <th style={{ width: `${colWidths.name || 200}px` }}>
                <span>ชื่อวิชา</span>
                <div
                  className="col-resizer"
                  onMouseDown={(e) => startResize('name', e)}
                  title="ลากเพื่อปรับขนาดคอลัมน์"
                />
              </th>
              <th style={{ width: `${colWidths.credits || 60}px`, textAlign: 'center' }}>
                <span>หน่วยกิต</span>
                <div
                  className="col-resizer"
                  onMouseDown={(e) => startResize('credits', e)}
                  title="ลากเพื่อปรับขนาดคอลัมน์"
                />
              </th>

              {/* Dynamic Score Columns */}
              {activeScoreColumns.map((col) => (
                <th key={col.id} className="th-score-col" style={{ width: `${colWidths[col.id] || 68}px` }}>
                  {editingColId === col.id ? (
                    <div className="col-inline-edit" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editColName}
                        onChange={(e) => setEditColName(e.target.value)}
                        className="col-name-inp"
                        autoFocus
                      />
                      <input
                        type="number"
                        value={editColMax}
                        onChange={(e) => setEditColMax(e.target.value)}
                        className="col-max-inp"
                        title="คะแนนเต็ม"
                      />
                      <button
                        type="button"
                        className="btn-col-save"
                        onClick={() => {
                          updateScoreColumn(col.id, {
                            name: editColName.trim() || col.name,
                            maxScore: parseFloat(editColMax) || col.maxScore,
                          })
                          setEditingColId(null)
                        }}
                      >
                        <CheckIcon size={11} />
                      </button>
                    </div>
                  ) : (
                    <div className="col-header-content">
                      <span
                        className="col-title-text"
                        onClick={() => {
                          setEditingColId(col.id)
                          setEditColName(col.name)
                          setEditColMax(col.maxScore)
                        }}
                        title="คลิกเพื่อแก้ไขชื่อหรือคะแนนเต็ม"
                      >
                        {col.name}
                      </span>
                      <span className="col-max-sub">({col.maxScore})</span>
                      <button
                        type="button"
                        className="btn-col-del"
                        onClick={() => {
                          if (window.confirm(`ลบคอลัมน์ "${col.name}" ออกจากทุกวิชาหรือไม่?`)) {
                            deleteScoreColumn(col.id)
                          }
                        }}
                        title="ลบคอลัมน์นี้"
                      >
                        <TrashIcon size={11} />
                      </button>
                    </div>
                  )}
                  <div
                    className="col-resizer"
                    onMouseDown={(e) => startResize(col.id, e)}
                    title="ลากเพื่อปรับขนาดคอลัมน์"
                  />
                </th>
              ))}

              {/* Summary Columns (Editable titles) */}
              {[
                { key: 'total', cls: 'th-total-col', tip: 'คะแนนรวมทั้งหมด' },
                { key: 'maxScore', cls: 'th-calc-col', tip: 'คะแนนที่หายไปจาก 100 (Total - 100)' },
                { key: 'missToA', cls: 'th-calc-col', tip: 'ขาดอีกกี่คะแนนถึงจะได้เกรด A' },
                { key: 'wantToA', cls: 'th-calc-col', tip: 'ผลต่างเทียบเกรด A' },
              ].map((sCol) => (
                <th
                  key={sCol.key}
                  className={sCol.cls}
                  style={{ width: `${colWidths[sCol.key] || 75}px` }}
                  title={sCol.tip}
                >
                  {editingSummaryKey === sCol.key ? (
                    <div className="col-inline-edit" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={tempSummaryTitle}
                        onChange={(e) => setTempSummaryTitle(e.target.value)}
                        className="col-name-inp"
                        autoFocus
                      />
                      <button
                        type="button"
                        className="btn-col-save"
                        onClick={() => {
                          if (tempSummaryTitle.trim()) {
                            setSummaryTitles((prev) => ({
                              ...prev,
                              [sCol.key]: tempSummaryTitle.trim(),
                            }))
                          }
                          setEditingSummaryKey(null)
                        }}
                      >
                        <CheckIcon size={11} />
                      </button>
                    </div>
                  ) : (
                    <span
                      className="col-title-text"
                      onClick={() => {
                        setEditingSummaryKey(sCol.key)
                        setTempSummaryTitle(summaryTitles[sCol.key])
                      }}
                      title="คลิกเพื่อแก้ไขชื่อคอลัมน์"
                    >
                      {summaryTitles[sCol.key]}
                    </span>
                  )}
                  <div
                    className="col-resizer"
                    onMouseDown={(e) => startResize(sCol.key, e)}
                    title="ลากเพื่อปรับขนาดคอลัมน์"
                  />
                </th>
              ))}
              <th style={{ width: `${colWidths.del || 60}px`, textAlign: 'center' }}>ลบ</th>
            </tr>
          </thead>
          <tbody>
            {displayedCourses.length === 0 ? (
              <tr>
                <td colSpan={activeScoreColumns.length + 8} className="empty-table-cell">
                  ไม่พบข้อมูลรายวิชาในชั้นปีและเทอมที่เลือก
                </td>
              </tr>
            ) : (
              displayedCourses.map((c, idx) => {
                const prev = idx > 0 ? displayedCourses[idx - 1] : null
                const isNewTerm = !prev || prev.year !== c.year || prev.semester !== c.semester
                const termCount = displayedCourses.filter((item) => item.year === c.year && item.semester === c.semester).length

                return (
                  <React.Fragment key={c.id}>
                    {isNewTerm && (
                      <tr className="term-divider-row" key={`term_divider_${c.year}_${c.semester}`}>
                        <td colSpan={activeScoreColumns.length + 8}>
                          <div className="term-divider-content">
                            <div className="term-divider-left">
                              <span className="term-divider-year-tag">ชั้นปีที่ {c.year}</span>
                              <span className="term-divider-sem-title">ภาคการศึกษาที่ {c.semester} (เทอม {c.semester})</span>
                            </div>
                            <div className="term-divider-right">
                              <span className="term-divider-count">{termCount} รายวิชา</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                    <tr className="course-data-row">
                      <td className="cell-code" style={{ position: 'relative' }}>
                        <div className="course-code-search-cell">
                          <input
                            type="text"
                            className="cell-inline-inp cell-code-inp"
                            value={c.code}
                            onChange={(e) => {
                              const val = e.target.value
                              updateCourse(c.id, { code: val })
                              setInlineSearchQuery(val)
                              setActiveInlineSearchId(c.id)
                            }}
                            onFocus={() => {
                              setInlineSearchQuery(c.code || '')
                              setActiveInlineSearchId(c.id)
                            }}
                            onBlur={() => {
                              const norm = (c.code || '').replace(/\s+/g, '').toUpperCase()
                              if (norm) {
                                const matched = masterCatalog.find(
                                  (item) => (item.code || '').replace(/\s+/g, '').toUpperCase() === norm
                                )
                                if (matched && (!c.name || c.name === 'New Course' || c.name === 'Course' || c.name === '')) {
                                  updateCourse(c.id, {
                                    name: matched.nameEn || matched.name,
                                    credits: matched.credits || c.credits,
                                  })
                                }
                              }
                            }}
                            placeholder="รหัสวิชา"
                            title="คลิกเพื่อแก้ไขรหัสวิชา หรือเลือกจาก REG"
                          />
                          {activeInlineSearchId === c.id && inlineSuggestions.length > 0 && (
                            <div className="course-search-popover">
                              <div className="course-search-header">
                                <span>เลือกวิชาจาก REG ({inlineSuggestions.length}):</span>
                                <button
                                  type="button"
                                  className="btn-close-popover"
                                  onMouseDown={(e) => {
                                    e.preventDefault()
                                    setActiveInlineSearchId(null)
                                  }}
                                >
                                  &times;
                                </button>
                              </div>
                              <div className="course-search-list">
                                {inlineSuggestions.map((sug) => (
                                  <div
                                    key={`${sug.code}-${sug.category || ''}`}
                                    className="course-search-item"
                                    onMouseDown={(e) => {
                                      e.preventDefault()
                                      const cr = typeof sug.credits === 'number' ? sug.credits : 3
                                      updateCourse(c.id, {
                                        code: sug.code,
                                        name: sug.name || sug.nameEn || c.name,
                                        credits: cr,
                                      })
                                      setActiveInlineSearchId(null)
                                    }}
                                  >
                                    <div className="course-search-item-top">
                                      <span className="search-course-code">{sug.code}</span>
                                      <span className="search-course-credits">
                                        {typeof sug.credits === 'number' ? `${sug.credits} Cr` : (sug.credits || '3 Cr')}
                                      </span>
                                    </div>
                                    <div className="search-course-name">{sug.name || sug.nameEn}</div>
                                    {(sug.nameTh || sug.category) && (
                                      <div className="search-course-sub">
                                        {sug.nameTh ? `${sug.nameTh} • ` : ''}{sug.category}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="cell-name">
                        <input
                          type="text"
                          className="cell-inline-inp"
                          value={c.name}
                          onChange={(e) => updateCourse(c.id, { name: e.target.value })}
                          placeholder="ชื่อวิชา"
                          title="คลิกเพื่อแก้ไขชื่อวิชา"
                        />
                      </td>
                      <td className="cell-credits">
                        <input
                          type="number"
                          min="1"
                          max="15"
                          className="cell-inline-inp-center"
                          value={c.credits}
                          onChange={(e) =>
                            updateCourse(c.id, { credits: parseFloat(e.target.value) || 0 })
                          }
                          title="คลิกเพื่อแก้ไขหน่วยกิต"
                        />
                      </td>

                      {/* Score Cells */}
                      {activeScoreColumns.map((col) => {
                        const val = c.scores?.[col.id] ?? ''
                        return (
                          <td key={col.id} className="cell-score-input">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max={col.maxScore}
                              value={val}
                              onChange={(e) => updateCourseScore(c.id, col.id, e.target.value)}
                              placeholder="-"
                              className="score-cell-inp"
                            />
                          </td>
                        )
                      })}

                      {/* Calculated Outcomes */}
                      <td className="cell-outcome total-val">
                        <strong>{c.total}</strong>
                      </td>
                      <td className="cell-outcome max-scor">
                        {c.maxScore}
                      </td>
                      <td className={`cell-outcome miss-to-a ${c.missScoreToA === 'PASS' ? 'pass' : ''}`}>
                        {c.missScoreToA === 'PASS' ? <span className="pass-badge">PASS</span> : c.missScoreToA}
                      </td>
                      <td className="cell-outcome want-to-a">
                        {c.wantToA}
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn-delete-row"
                          onClick={() => {
                            if (window.confirm(`คุณต้องการลบวิชา "${c.code} ${c.name}" หรือไม่?`)) {
                              deleteCourse(c.id)
                            }
                          }}
                          title="ลบวิชานี้"
                        >
                          <TrashIcon size={13} />
                        </button>
                      </td>
                    </tr>
                  </React.Fragment>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal เพิ่มรายวิชา */}
      {isAddCourseOpen && (
        <div className="modal-backdrop" onClick={() => setIsAddCourseOpen(false)}>
          <div className="total-modal-card" onClick={(e) => e.stopPropagation()}>
            <header className="new-scale-modal-header">
              <h2>เพิ่มรายวิชาใหม่ (แถว)</h2>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setIsAddCourseOpen(false)}
              >
                ×
              </button>
            </header>
            <form onSubmit={handleCreateCourse} className="new-scale-modal-body">
              <div className="form-row-2">
                <div className="form-group">
                  <label>ชั้นปี</label>
                  <select
                    value={newCourseYear}
                    onChange={(e) => setNewCourseYear(e.target.value)}
                  >
                    <option value="1">ปี 1</option>
                    <option value="2">ปี 2</option>
                    <option value="3">ปี 3</option>
                    <option value="4">ปี 4</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>ภาคการศึกษา (เทอม)</label>
                  <select
                    value={newCourseSemester}
                    onChange={(e) => setNewCourseSemester(e.target.value)}
                  >
                    <option value="1">เทอม 1</option>
                    <option value="2">เทอม 2</option>
                    <option value="3">เทอม 3</option>
                  </select>
                </div>
              </div>

              <div className="form-group modal-code-input-cell" style={{ position: 'relative' }}>
                <label>รหัสวิชา (ค้นหาจากระบบ REG หรือหลักสูตร)</label>
                <input
                  type="text"
                  value={newCourseCode}
                  onChange={(e) => {
                    const val = e.target.value
                    setNewCourseCode(val)
                    setModalSearchQuery(val)
                    setIsModalSearchOpen(true)
                  }}
                  onFocus={() => {
                    if (newCourseCode) {
                      setModalSearchQuery(newCourseCode)
                      setIsModalSearchOpen(true)
                    }
                  }}
                  placeholder="เช่น ENG20 1110, ENG23 2031, SCI05 1001"
                  required
                  autoFocus
                />
                {isModalSearchOpen && modalSuggestions.length > 0 && (
                  <div className="course-search-popover modal-course-popover">
                    <div className="course-search-header">
                      <span>เลือกวิชาจาก REG / หลักสูตร ({modalSuggestions.length}):</span>
                      <button
                        type="button"
                        className="btn-close-popover"
                        onMouseDown={(e) => {
                          e.preventDefault()
                          setIsModalSearchOpen(false)
                        }}
                      >
                        &times;
                      </button>
                    </div>
                    <div className="course-search-list">
                      {modalSuggestions.map((sug) => (
                        <div
                          key={`${sug.code}-${sug.category || ''}`}
                          className="course-search-item"
                          onMouseDown={(e) => {
                            e.preventDefault()
                            setNewCourseCode(sug.code)
                            setNewCourseName(sug.name || sug.nameEn || '')
                            setNewCourseCredits(typeof sug.credits === 'number' ? sug.credits : 3)
                            setIsModalSearchOpen(false)
                          }}
                        >
                          <div className="course-search-item-top">
                            <span className="search-course-code">{sug.code}</span>
                            <span className="search-course-credits">
                              {typeof sug.credits === 'number' ? `${sug.credits} Cr` : (sug.credits || '3 Cr')}
                            </span>
                          </div>
                          <div className="search-course-name">{sug.name || sug.nameEn}</div>
                          {(sug.nameTh || sug.category) && (
                            <div className="search-course-sub">
                              {sug.nameTh ? `${sug.nameTh} • ` : ''}{sug.category}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>ชื่อวิชา</label>
                <input
                  type="text"
                  value={newCourseName}
                  onChange={(e) => setNewCourseName(e.target.value)}
                  placeholder="เช่น DATA STRUCTURES AND ALGORITHMS"
                  required
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>หน่วยกิต</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={newCourseCredits}
                    onChange={(e) => setNewCourseCredits(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>เกณฑ์ตัดเกรดที่ใช้</label>
                  <select
                    value={newCourseScaleId}
                    onChange={(e) => setNewCourseScaleId(e.target.value)}
                  >
                    {gradeScales.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <footer className="new-scale-modal-footer">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setIsAddCourseOpen(false)}
                >
                  ยกเลิก
                </button>
                <button type="submit" className="btn-confirm">
                  บันทึกรายวิชา
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {/* Modal เพิ่มช่องคะแนน */}
      {isAddColOpen && (
        <div className="modal-backdrop" onClick={() => setIsAddColOpen(false)}>
          <div className="total-modal-card" onClick={(e) => e.stopPropagation()}>
            <header className="new-scale-modal-header">
              <h2>เพิ่มช่องคะแนนเก็บ (คอลัมน์)</h2>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setIsAddColOpen(false)}
              >
                ×
              </button>
            </header>
            <form onSubmit={handleCreateColumn} className="new-scale-modal-body">
              <div className="form-group">
                <label>ชื่อช่องคะแนน</label>
                <input
                  type="text"
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  placeholder="เช่น Project, Lab Test, Quiz 3"
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label>คะแนนเต็ม (Max Score)</label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="100"
                  value={newColMax}
                  onChange={(e) => setNewColMax(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>ขอบเขตการใช้งานคอลัมน์นี้</label>
                <select
                  value={newColScope}
                  onChange={(e) => setNewColScope(e.target.value)}
                  className="scale-dropdown"
                >
                  <option value="all">ใช้กับทุกชั้นปีและทุกเทอม (All Semesters)</option>
                  <option value="current">
                    เฉพาะ {filterYear !== 'all' ? `ชั้นปี ${filterYear}` : 'ทุกปี'} {filterSemester !== 'all' ? `เทอม ${filterSemester}` : 'ทุกเทอม'}
                  </option>
                </select>
              </div>

              <footer className="new-scale-modal-footer">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setIsAddColOpen(false)}
                >
                  ยกเลิก
                </button>
                <button type="submit" className="btn-confirm">
                  เพิ่มคอลัมน์
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
