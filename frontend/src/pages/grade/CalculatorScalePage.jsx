import React, { useState } from 'react'
import { useGrade } from '../../context/GradeContext.jsx'
import { validateGradeRanges, calculateGradeAndCX } from '../../utils/gradeCalculations.js'
import {
  CalculatorIcon,
  PlusIcon,
  TrashIcon,
  EditIcon,
  CheckIcon,
  AlertCircleIcon,
  RefreshIcon,
} from '../../components/Icons.jsx'

export default function CalculatorScalePage() {
  const {
    gradeScales,
    addGradeScale,
    updateGradeScale,
    deleteGradeScale,
    resetGradeScales,
  } = useGrade()

  const [selectedScaleId, setSelectedScaleId] = useState(() => gradeScales[0]?.id || '')
  const [testScore, setTestScore] = useState(75)
  const [isEditingScale, setIsEditingScale] = useState(false)
  const [editScaleName, setEditScaleName] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editDescription, setEditDescription] = useState('')

  // Quick edit A threshold state
  const [editingACutoffId, setEditingACutoffId] = useState(null)
  const [tempACutoff, setTempACutoff] = useState(80)

  // New Scale Modal state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false)
  const [newScaleName, setNewScaleName] = useState('')
  const [newScaleCategory, setNewScaleCategory] = useState('General')
  const [newScaleDesc, setNewScaleDesc] = useState('')
  const [newScaleBaseType, setNewScaleBaseType] = useState('80') // '80', '75', '70'

  const activeScale = gradeScales.find((s) => s.id === selectedScaleId) || gradeScales[0]

  // Validate the active scale's ranges
  const validation = activeScale ? validateGradeRanges(activeScale.ranges) : { isValid: true, errors: [] }

  // Preview result for the test score
  const previewResult = activeScale
    ? calculateGradeAndCX(testScore, activeScale.ranges)
    : { grade: '-', cx: 0 }

  const handleAddRange = () => {
    if (!activeScale) return
    const ranges = [...activeScale.ranges]
    const highestMax = ranges.reduce((acc, r) => Math.max(acc, parseFloat(r.max) || 0), 0)
    const newMin = highestMax + 1
    const newMax = Math.min(newMin + 5, 100)
    ranges.push({
      min: newMin,
      max: newMax,
      grade: 'New',
      cx: 0,
    })
    updateGradeScale(activeScale.id, { ranges })
  }

  const handleUpdateRange = (index, field, value) => {
    if (!activeScale) return
    const ranges = activeScale.ranges.map((r, i) => {
      if (i !== index) return r
      return {
        ...r,
        [field]: field === 'grade' ? value : parseFloat(value) || 0,
      }
    })
    updateGradeScale(activeScale.id, { ranges })
  }

  const handleDeleteRange = (index) => {
    if (!activeScale || activeScale.ranges.length <= 1) return
    const ranges = activeScale.ranges.filter((_, i) => i !== index)
    updateGradeScale(activeScale.id, { ranges })
  }

  const handleQuickUpdateACutoff = (scaleId, newMinA) => {
    const scale = gradeScales.find((s) => s.id === scaleId)
    if (!scale) return
    const minVal = parseFloat(newMinA) || 80
    const ranges = scale.ranges.map((r) => {
      if (r.grade === 'A') {
        return { ...r, min: minVal }
      }
      if (r.grade === 'B+') {
        return { ...r, max: minVal - 1 }
      }
      return r
    })
    updateGradeScale(scaleId, { ranges })
    setEditingACutoffId(null)
  }

function getScaleDescription(scale) {
  if (scale.description && scale.description.trim()) {
    return scale.description
  }
  const name = (scale.name || '').toLowerCase()
  const id = (scale.id || '').toLowerCase()
  if (id.includes('flab') || name.includes('flab') || name.includes('แล็บ') || name.includes('75')) {
    return 'วิชาปฏิบัติการและวิชาเฉพาะ (เช่น LN, CN, FLAB, แล็บฟิสิกส์/เคมี ตัด A ที่ 75)'
  }
  if (id.includes('physics_1') || name.includes('physics i') || name.includes('ฟิสิกส์ 1')) {
    return 'เกณฑ์เฉพาะวิชาฟิสิกส์ 1 (PHYSICS I) กำหนดตัด A ที่ 80 และผ่านเกณฑ์ D ที่ 34'
  }
  if (id.includes('physics_2') || name.includes('physics ii') || name.includes('ฟิสิกส์ 2')) {
    return 'เกณฑ์เฉพาะวิชาฟิสิกส์ 2 (PHYSICS II) กำหนดตัด A ที่ 75 และผ่านเกณฑ์ D ที่ 34'
  }
  if (id.includes('80') || name.includes('80') || name.includes('มาตรฐาน')) {
    return 'เกณฑ์มาตรฐานมหาวิทยาลัยเทคโนโลยีสุรนารี (มทส.) ตัด A ที่ 80 และผ่าน D ที่ 50'
  }
  return 'เกณฑ์ตัดเกรดสำหรับรายวิชาในหลักสูตร'
}

  const handleCreateNewScale = (e) => {
    e.preventDefault()
    if (!newScaleName.trim()) return

    const minA = parseFloat(newScaleBaseType) || 80
    let templateRanges = []

    if (minA === 75) {
      templateRanges = [
        { min: 0, max: 39, grade: 'F', cx: 0 },
        { min: 40, max: 44, grade: 'D', cx: 1.0 },
        { min: 45, max: 50, grade: 'D+', cx: 1.5 },
        { min: 51, max: 56, grade: 'C', cx: 2.0 },
        { min: 57, max: 62, grade: 'C+', cx: 2.5 },
        { min: 63, max: 68, grade: 'B', cx: 3.0 },
        { min: 69, max: 74, grade: 'B+', cx: 3.5 },
        { min: 75, max: 100, grade: 'A', cx: 4.0 },
      ]
    } else if (minA === 70) {
      templateRanges = [
        { min: 0, max: 39, grade: 'F', cx: 0 },
        { min: 40, max: 44, grade: 'D', cx: 1.0 },
        { min: 45, max: 49, grade: 'D+', cx: 1.5 },
        { min: 50, max: 54, grade: 'C', cx: 2.0 },
        { min: 55, max: 59, grade: 'C+', cx: 2.5 },
        { min: 60, max: 64, grade: 'B', cx: 3.0 },
        { min: 65, max: 69, grade: 'B+', cx: 3.5 },
        { min: 70, max: 100, grade: 'A', cx: 4.0 },
      ]
    } else if (minA === 80) {
      templateRanges = [
        { min: 0, max: 49, grade: 'F', cx: 0 },
        { min: 50, max: 54, grade: 'D', cx: 1.0 },
        { min: 55, max: 59, grade: 'D+', cx: 1.5 },
        { min: 60, max: 64, grade: 'C', cx: 2.0 },
        { min: 65, max: 69, grade: 'C+', cx: 2.5 },
        { min: 70, max: 74, grade: 'B', cx: 3.0 },
        { min: 75, max: 79, grade: 'B+', cx: 3.5 },
        { min: 80, max: 100, grade: 'A', cx: 4.0 },
      ]
    } else {
      const step = Math.max(3, Math.round((minA - 40) / 7))
      templateRanges = [
        { min: 0, max: Math.max(30, minA - step * 7 - 1), grade: 'F', cx: 0 },
        { min: Math.max(31, minA - step * 7), max: minA - step * 6 - 1, grade: 'D', cx: 1.0 },
        { min: minA - step * 6, max: minA - step * 5 - 1, grade: 'D+', cx: 1.5 },
        { min: minA - step * 5, max: minA - step * 4 - 1, grade: 'C', cx: 2.0 },
        { min: minA - step * 4, max: minA - step * 3 - 1, grade: 'C+', cx: 2.5 },
        { min: minA - step * 3, max: minA - step * 2 - 1, grade: 'B', cx: 3.0 },
        { min: minA - step * 2, max: minA - 1, grade: 'B+', cx: 3.5 },
        { min: minA, max: 100, grade: 'A', cx: 4.0 },
      ]
    }

    const newId = `scale_${Date.now()}`
    addGradeScale({
      id: newId,
      name: newScaleName.trim(),
      category: newScaleCategory.trim() || 'General',
      description: newScaleDesc.trim() || `เกณฑ์ตัดเกรด A ที่ ≥ ${minA} คะแนน`,
      ranges: templateRanges,
      isDefault: false,
    })

    setSelectedScaleId(newId)
    setIsNewModalOpen(false)
    setNewScaleName('')
    setNewScaleDesc('')
  }

  // Get standard 8 grades summary for the 2 rows x 4 columns grid
  const standardGrades = ['A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'F']
  const cutoffGridData = standardGrades.map((g) => {
    const range = activeScale?.ranges?.find((r) => r.grade === g)
    return {
      grade: g,
      cx: range?.cx ?? (g === 'A' ? 4.0 : g === 'B+' ? 3.5 : g === 'B' ? 3.0 : g === 'C+' ? 2.5 : g === 'C' ? 2.0 : g === 'D+' ? 1.5 : g === 'D' ? 1.0 : 0),
      min: range ? range.min : (g === 'A' ? 80 : 0),
      max: range ? range.max : 100,
    }
  })

  return (
    <div className="grade-page-container">
      {/* Page Header */}
      <div className="grade-page-header">
        <div className="grade-page-header-left">
          <div className="grade-header-icon-badge">
            <CalculatorIcon size={22} color="#B95C44" />
          </div>
          <div>
            <h1 className="grade-page-title">Grade Calculator & Cutoffs</h1>
            <p className="grade-page-sub">
              Manage custom grading scales, cutoff thresholds, and instant course grade conversions
            </p>
          </div>
        </div>

        <div className="grade-page-header-actions">
          <button
            type="button"
            className="btn-create-scale"
            onClick={() => setIsNewModalOpen(true)}
          >
            <PlusIcon size={15} />
            <span>+ New Scale</span>
          </button>
          <button
            type="button"
            className="btn-reset-scales"
            onClick={() => {
              if (window.confirm('Reset all grading scales to default SUT system?')) {
                resetGradeScales()
              }
            }}
            title="Reset to default grading scales"
          >
            <RefreshIcon size={14} />
            <span>Reset Defaults</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left sidebar of scales, Right active scale editor */}
      <div className="calc-layout-grid">
        {/* Left Column: Grade Scale Profiles */}
        <div className="calc-scale-list-card">
          <div className="calc-scale-list-header">
            <h3>Grading Scales ({gradeScales.length})</h3>
          </div>
          <div className="calc-scale-items">
            {gradeScales.map((scale) => {
              const aItem = scale.ranges.find((r) => r.grade === 'A')
              const isSelected = scale.id === activeScale?.id
              const catClass = (scale.category || '').toLowerCase().includes('eng')
                ? 'engineering'
                : (scale.category || '').toLowerCase().includes('spec')
                ? 'special'
                : 'general'

              return (
                <div
                  key={scale.id}
                  className={`calc-scale-item-card ${isSelected ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedScaleId(scale.id)
                    setIsEditingScale(false)
                  }}
                  role="button"
                  tabIndex={0}
                >
                  {/* Row 1: Scale Title + Category Badge */}
                  <div className="scale-card-row-title">
                    <span className="scale-title-text">{scale.name}</span>
                    <span className={`scale-cat-badge ${catClass}`}>
                      {scale.category || 'General'}
                    </span>
                  </div>

                  {/* Row 2: Courses Description */}
                  <div className="scale-card-row-desc">
                    <span className="scale-desc-prefix">คำอธิบายเกณฑ์:</span>
                    <span className="scale-desc-text">{getScaleDescription(scale)}</span>
                  </div>

                  {/* Row 3: A Cutoff Pill (Editable) */}
                  <div className="scale-card-row-cutoff">
                    {editingACutoffId === scale.id ? (
                      <div className="quick-cutoff-edit" onClick={(e) => e.stopPropagation()}>
                        <span className="cutoff-tag-label">A ≥</span>
                        <input
                          type="number"
                          value={tempACutoff}
                          onChange={(e) => setTempACutoff(e.target.value)}
                          className="quick-cutoff-inp"
                          autoFocus
                        />
                        <button
                          type="button"
                          className="btn-quick-save"
                          onClick={() => handleQuickUpdateACutoff(scale.id, tempACutoff)}
                        >
                          <CheckIcon size={11} />
                        </button>
                      </div>
                    ) : (
                      <div
                        className="scale-a-cut-pill"
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingACutoffId(scale.id)
                          setTempACutoff(aItem ? aItem.min : 80)
                        }}
                        title="Click to quickly modify A threshold"
                      >
                        <span className="cut-highlight">A ≥ {aItem ? aItem.min : 80}</span>
                        <span className="cut-edit-hint">Click to edit</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right Column: Scale Details, Interactive Tester, F-A 2x4 Grid, and Range Editor */}
        <div className="calc-editor-column">
          {activeScale ? (
            <>
              {/* Active Scale Info Header */}
              <div className="calc-active-banner">
                <div className="calc-banner-info">
                  {isEditingScale ? (
                    <div className="calc-scale-inline-edit">
                      <input
                        type="text"
                        value={editScaleName}
                        onChange={(e) => setEditScaleName(e.target.value)}
                        placeholder="Scale Name"
                        className="scale-name-input"
                      />
                      <input
                        type="text"
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        placeholder="Category"
                        className="scale-cat-input"
                      />
                      <input
                        type="text"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="Description of applicable courses"
                        className="scale-desc-input"
                      />
                      <button
                        type="button"
                        className="btn-save-scale-name"
                        onClick={() => {
                          updateGradeScale(activeScale.id, {
                            name: editScaleName.trim() || activeScale.name,
                            category: editCategory.trim() || activeScale.category,
                            description: editDescription.trim() || activeScale.description,
                          })
                          setIsEditingScale(false)
                        }}
                      >
                        <CheckIcon size={14} /> Save
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="calc-title-row">
                        <h2>{activeScale.name}</h2>
                        <button
                          type="button"
                          className="btn-edit-scale-title"
                          onClick={() => {
                            setEditScaleName(activeScale.name)
                            setEditCategory(activeScale.category || 'General')
                            setEditDescription(activeScale.description || '')
                            setIsEditingScale(true)
                          }}
                          title="Edit scale details"
                        >
                          <EditIcon size={14} />
                        </button>
                        {!activeScale.isDefault && gradeScales.length > 1 && (
                          <button
                            type="button"
                            className="btn-delete-scale"
                            onClick={() => {
                              if (window.confirm(`Delete grading scale "${activeScale.name}"?`)) {
                                deleteGradeScale(activeScale.id)
                                setSelectedScaleId(gradeScales[0].id)
                              }
                            }}
                            title="Delete this scale"
                          >
                            <TrashIcon size={14} />
                          </button>
                        )}
                      </div>
                      <p className="calc-desc-text">
                        <strong>Category:</strong> {activeScale.category || 'General'} &bull;{' '}
                        <strong>Courses:</strong> {activeScale.description || 'Major & core courses'}
                      </p>
                    </>
                  )}
                </div>

                {/* Instant Grade Test Box */}
                <div className="calc-interactive-preview">
                  <div className="preview-label">Instant Grade Test:</div>
                  <div className="preview-input-row">
                    <label htmlFor="test-score-input">Total Score:</label>
                    <input
                      id="test-score-input"
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      value={testScore}
                      onChange={(e) => setTestScore(e.target.value)}
                      className="test-score-input"
                    />
                    <div className="preview-outcome-badge">
                      <span className="preview-grade">
                        Grade: <strong>{previewResult.grade}</strong>
                      </span>
                      <span className="preview-cx">
                        CX: <strong>{previewResult.cx}</strong>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Validation Warning Alert */}
              {!validation.isValid && (
                <div className="calc-validation-alert">
                  <AlertCircleIcon size={18} />
                  <div>
                    <strong>Scale Range Warning:</strong>
                    <ul>
                      {validation.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* F-A Cutoff Summary Grid: 2 Rows x 4 Columns */}
              <div className="grade-cutoff-section">
                <div className="section-title-wrap">
                  <h3 className="section-title">Grade Cutoff Summary (F - A Breakdown)</h3>
                  <span className="section-sub">Minimum score threshold required for each letter grade</span>
                </div>
                <div className="grade-cutoff-grid-2x4">
                  {cutoffGridData.map((item) => (
                    <div key={item.grade} className={`cutoff-grid-box grade-box-${item.grade.replace('+', '-plus')}`}>
                      <div className="cutoff-box-header">
                        <span className="cutoff-grade-letter">{item.grade}</span>
                        <span className="cutoff-cx-badge">CX {item.cx.toFixed(1)}</span>
                      </div>
                      <div className="cutoff-box-value">
                        {item.grade === 'F' ? (
                          <span>&lt; {item.max + 1}</span>
                        ) : (
                          <span>&ge; {item.min}</span>
                        )}
                      </div>
                      <div className="cutoff-box-range">
                        Score: {item.min} &ndash; {item.max}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Detailed Score Ranges Table */}
              <div className="calc-ranges-card">
                <div className="calc-ranges-table-header">
                  <h3>Score Ranges & CX Points Detail</h3>
                  <button
                    type="button"
                    className="btn-add-range"
                    onClick={handleAddRange}
                  >
                    <PlusIcon size={14} />
                    <span>+ Add Score Range</span>
                  </button>
                </div>

                <div className="calc-table-wrapper">
                  <table className="calc-ranges-table">
                    <thead>
                      <tr>
                        <th style={{ width: '70px' }}>#</th>
                        <th>Min Score</th>
                        <th>Max Score</th>
                        <th>Grade</th>
                        <th>Grade Points (CX)</th>
                        <th style={{ width: '70px', textAlign: 'center' }}>Delete</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeScale.ranges.map((range, idx) => (
                        <tr key={idx}>
                          <td className="range-idx-cell">{idx + 1}</td>
                          <td>
                            <input
                              type="number"
                              step="0.5"
                              value={range.min}
                              onChange={(e) => handleUpdateRange(idx, 'min', e.target.value)}
                              className="range-number-input"
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              step="0.5"
                              value={range.max}
                              onChange={(e) => handleUpdateRange(idx, 'max', e.target.value)}
                              className="range-number-input"
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={range.grade}
                              onChange={(e) => handleUpdateRange(idx, 'grade', e.target.value)}
                              className="range-grade-input"
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              max="4"
                              value={range.cx}
                              onChange={(e) => handleUpdateRange(idx, 'cx', e.target.value)}
                              className="range-cx-input"
                            />
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              className="btn-del-range"
                              onClick={() => handleDeleteRange(idx)}
                              disabled={activeScale.ranges.length <= 1}
                              title="Delete range"
                            >
                              <TrashIcon size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="calc-empty-state">Please select a grading scale from the list on the left</div>
          )}
        </div>
      </div>

      {/* Modal Create New Scale */}
      {isNewModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsNewModalOpen(false)}>
          <div className="new-scale-modal" onClick={(e) => e.stopPropagation()}>
            <header className="new-scale-modal-header">
              <h2>Create New Grading Scale</h2>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setIsNewModalOpen(false)}
              >
                &times;
              </button>
            </header>
            <form onSubmit={handleCreateNewScale} className="new-scale-modal-body">
              <div className="form-group">
                <label>Scale Name (e.g. Major Electives A &ge; 70, Physics II)</label>
                <input
                  type="text"
                  value={newScaleName}
                  onChange={(e) => setNewScaleName(e.target.value)}
                  placeholder="e.g. Engineering Core (A &ge; 70)"
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label>Category</label>
                <input
                  type="text"
                  value={newScaleCategory}
                  onChange={(e) => setNewScaleCategory(e.target.value)}
                  placeholder="e.g. General, Engineering, Mathematics, Science"
                />
              </div>

              <div className="form-group">
                <label>Applicable Courses Description</label>
                <input
                  type="text"
                  value={newScaleDesc}
                  onChange={(e) => setNewScaleDesc(e.target.value)}
                  placeholder="e.g. Physics 1, Mechanics, Electronics"
                />
              </div>

              <div className="form-group">
                <label>Base Grade Cutoff Template (พิมพ์คะแนนตัด A เอง หรือเลือกสำเร็จรูป)</label>
                <div className="cutoff-template-input-group">
                  <div className="cutoff-number-wrap">
                    <span className="cutoff-prefix">A &ge;</span>
                    <input
                      type="number"
                      min="40"
                      max="100"
                      step="0.5"
                      value={newScaleBaseType}
                      onChange={(e) => setNewScaleBaseType(e.target.value)}
                      className="cutoff-number-inp"
                      placeholder="80"
                      title="พิมพ์คะแนนตัด A เองได้ เช่น 75, 80, 72"
                    />
                    <span className="cutoff-suffix">pts</span>
                  </div>
                  <select
                    className="cutoff-template-select"
                    value={['80', '75', '70', '65', '85'].includes(String(newScaleBaseType)) ? String(newScaleBaseType) : 'custom'}
                    onChange={(e) => {
                      if (e.target.value !== 'custom') {
                        setNewScaleBaseType(e.target.value)
                      }
                    }}
                  >
                    <option value="80">A &ge; 80 (Standard SUT System)</option>
                    <option value="75">A &ge; 75 (Physics II, Laboratory, LN/CN)</option>
                    <option value="70">A &ge; 70 (Special Major Cutoff)</option>
                    <option value="65">A &ge; 65 (Applied Technical Cutoff)</option>
                    <option value="85">A &ge; 85 (High Distinction Cutoff)</option>
                    {!['80', '75', '70', '65', '85'].includes(String(newScaleBaseType)) && (
                      <option value="custom">Custom: A &ge; {newScaleBaseType}</option>
                    )}
                  </select>
                </div>
                <span className="form-hint-sub">พิมพ์คะแนนตัดเกรด A ตามใจชอบ หรือเลือกเกณฑ์สำเร็จรูปจากเมนูได้</span>
              </div>

              <footer className="new-scale-modal-footer">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setIsNewModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-confirm">
                  Create Scale
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
