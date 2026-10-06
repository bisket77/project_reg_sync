import React from 'react'

function getPillClass(termDisplay) {
  if (!termDisplay) return 'term-pill no-data'
  if (termDisplay.includes('เปิดทุกเทอม')) return 'term-pill all-terms'
  if (termDisplay.includes('เทอม 1')) return 'term-pill term-1'
  if (termDisplay.includes('เทอม 2')) return 'term-pill term-2'
  if (termDisplay.includes('เทอม 3')) return 'term-pill term-3'
  return 'term-pill no-data'
}

export default function CourseTable({ items }) {
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
            <th className="col-name align-left">ชื่อวิชา</th>
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
                <td className="col-code">{code}</td>
                <td className="col-name">
                  <div className="name-en">{nameEn}</div>
                  {nameTh && <div className="name-th">{nameTh}</div>}
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
