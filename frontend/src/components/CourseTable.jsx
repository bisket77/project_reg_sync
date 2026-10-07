import React, { useState } from 'react'
import { CopyIcon, CheckIcon } from './Icons.jsx'

function getPillClass(termDisplay) {
  if (!termDisplay || termDisplay.includes('ยังไม่มีข้อมูล') || termDisplay.includes('ไม่มีข้อมูล')) {
    return 'term-pill no-data'
  }
  if (termDisplay.includes('เปิดทุกเทอม') || (termDisplay.includes('1') && termDisplay.includes('2') && termDisplay.includes('3'))) {
    return 'term-pill all-terms'
  }
  if (termDisplay.includes('เทอม 1') && termDisplay.includes('เทอม 2')) {
    return 'term-pill all-terms'
  }
  if (termDisplay.includes('เทอม 1')) return 'term-pill term-1'
  if (termDisplay.includes('เทอม 2')) return 'term-pill term-2'
  if (termDisplay.includes('เทอม 3')) return 'term-pill term-3'
  return 'term-pill no-data'
}

export default function CourseTable({ items, onSelectCourse }) {
  const [copiedCode, setCopiedCode] = useState(null)

  const handleCopyCode = (e, code) => {
    e.stopPropagation()
    if (!code || code === '-') return

    const onSuccess = () => {
      setCopiedCode(code)
      setTimeout(() => {
        setCopiedCode((prev) => (prev === code ? null : prev))
      }, 1600)
    }

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(code).then(onSuccess).catch(() => fallbackCopy(code, onSuccess))
    } else {
      fallbackCopy(code, onSuccess)
    }
  }

  const fallbackCopy = (code, cb) => {
    try {
      const el = document.createElement('textarea')
      el.value = code
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      cb?.()
    } catch (err) {
      console.error('Failed to copy', err)
    }
  }

  if (!items || items.length === 0) {
    return (
      <div className="sheet-table-wrapper">
        <div className="empty-state">ไม่พบข้อมูลรายวิชาที่ค้นหา</div>
      </div>
    )
  }

  return (
    <div className="sheet-table-wrapper">
      <table className="sheet-table">
        <thead>
          <tr>
            <th className="col-code">รหัสวิชา</th>
            <th className="col-name align-left">ชื่อวิชา (คลิกเพื่อดูรายละเอียด)</th>
            <th className="col-credits">จำนวนหน่วยกิต</th>
            <th className="col-term">เทอมที่เปิด</th>
          </tr>
        </thead>
        <tbody>
          {items.map((course, idx) => {
            const code = course.code || course.raw?.['รหัสวิชา'] || '-'
            const nameEn = course.nameEn || course.name || course.raw?.['ชื่อวิชา'] || ''
            const nameTh = course.nameTh || course.raw?.['ชื่อวิชา_ไทย'] || ''
            const credits = course.credits || course.raw?.['หน่วยกิต'] || course.raw?.['จำนวนหน่วยกิต'] || '-'
            const termDisplay = course.termDisplay || (course.semester ? `เทอม ${course.semester}` : 'ไม่มีข้อมูล')

            return (
              <tr key={course.id || `${code}-${idx}`}>
                <td
                  className="col-code copyable-cell"
                  onClick={(e) => handleCopyCode(e, code)}
                  title="คลิกเพื่อคัดลอกรหัสวิชา"
                >
                  <div className="code-pill">
                    <span className="code-text-val">{code}</span>
                    <span className="code-copy-icon-slot" aria-hidden="true">
                      {copiedCode === code ? (
                        <CheckIcon size={12} className="copy-check-icon" />
                      ) : (
                        <CopyIcon size={12} className="copy-hint-icon" />
                      )}
                    </span>
                    {copiedCode === code && (
                      <span className="copied-bubble">
                        คัดลอกแล้ว!
                      </span>
                    )}
                  </div>
                </td>
                <td
                  className="col-name clickable-cell"
                  onClick={() => onSelectCourse?.(course)}
                  title="คลิกเพื่อดูรายละเอียดรายวิชาและข้อมูลกลุ่มเรียน"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span className="name-en course-title-interactive">{nameEn}</span>
                    {course.programType && (
                      <span className={`program-badge ${course.programType === 'นานาชาติ' ? 'inter' : 'regular'}`}>
                        หลักสูตร{course.programType}
                      </span>
                    )}
                  </div>
                  {nameTh && <div className="name-th">{nameTh}</div>}
                  {(course.subCategory || course.year) && (
                    <div style={{ marginTop: 4, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {course.year && (
                        <span className="year-tag">ชั้นปี {course.year}</span>
                      )}
                      {course.subCategory && (
                        <span className="sub-category-tag">{course.subCategory}</span>
                      )}
                    </div>
                  )}
                </td>
                <td className="col-credits">{credits}</td>
                <td className="col-term">
                  <span className={getPillClass(termDisplay)}>
                    {termDisplay}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
