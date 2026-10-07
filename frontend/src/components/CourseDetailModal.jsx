import React, { useEffect } from 'react'
import { CloseIcon, ExternalLinkIcon, InfoIcon, UserIcon } from './Icons.jsx'

const dayMap = {
  Mo: 'จันทร์',
  Tu: 'อังคาร',
  We: 'พุธ',
  Th: 'พฤหัสบดี',
  Fr: 'ศุกร์',
  Sa: 'เสาร์',
  Su: 'อาทิตย์',
}

function parseSchedule(rawTime) {
  if (!rawTime || !rawTime.trim() || rawTime === '-') return []
  const regex = /(Mo|Tu|We|Th|Fr|Sa|Su)\s*(\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2})\s*(.*?)(?=(?:Mo|Tu|We|Th|Fr|Sa|Su)\s*\d{1,2}:\d{2}|$)/gi
  const results = []
  let match
  while ((match = regex.exec(rawTime)) !== null) {
    const day = dayMap[match[1]] || match[1]
    const time = match[2].trim()
    const room = match[3].trim()
    results.push({ day, time, room })
  }
  return results
}

const academicTitles = [
  'รองศาสตราจารย์ ดร\\.',
  'รองศาสตราจารย์',
  'ผู้ช่วยศาสตราจารย์ ดร\\.',
  'ผู้ช่วยศาสตราจารย์',
  'ศาสตราจารย์ ดร\\.',
  'ศาสตราจารย์',
  'อาจารย์ ดร\\.',
  'อาจารย์',
  'รศ\\. ดร\\.',
  'รศ\\.ดร\\.',
  'รศ\\.',
  'ผศ\\. ดร\\.',
  'ผศ\\.ดร\\.',
  'ผศ\\.',
  '(?<!พ\\.)ศ\\. ดร\\.',
  '(?<!พ\\.)ศ\\.ดร\\.',
  '(?<!พ\\.)ศ\\.',
  'ดร\\.',
  'นางสาว',
  'นาง',
  'นาย',
  'ว่าที่ ร\\.ต\\.',
  'น\\.ส\\.',
]
const titlePattern = new RegExp('(' + academicTitles.join('|') + ')', 'g')

function parseInstructorNote(rawText) {
  if (!rawText || !rawText.trim() || rawText === '-') return { note: '', instructors: [] }

  const matches = []
  let m
  titlePattern.lastIndex = 0
  while ((m = titlePattern.exec(rawText)) !== null) {
    matches.push({ index: m.index, title: m[0] })
  }

  if (matches.length === 0) {
    return { note: rawText.trim(), instructors: [] }
  }

  const note = rawText.substring(0, matches[0].index).trim()
  const instructors = []

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index
    const end = i + 1 < matches.length ? matches[i + 1].index : rawText.length
    const nameStr = rawText.substring(start, end).trim()
    if (nameStr) {
      instructors.push(nameStr)
    }
  }

  return { note, instructors }
}

function formatNote(rawNote) {
  if (!rawNote) return ''
  return rawNote
    .replace(/สำหรับหลักสูตรปรับปรุง\s*พ\.ศ\.\s*/gi, 'หลักสูตรปรับปรุง ')
    .replace(/หลักสูตรปรับปรุง\s*พ\.ศ\.\s*/gi, 'หลักสูตรปรับปรุง ')
    .replace(/สำหรับหลักสูตร\s*พ\.ศ\.\s*/gi, 'หลักสูตร ')
    .replace(/หลักสูตร\s*พ\.ศ\.\s*/gi, 'หลักสูตร ')
    .replace(/\(\s+/g, ' (')
    .replace(/\s+\)/g, ')')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export default function CourseDetailModal({ course, sections = [], onClose }) {
  if (!course) return null

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const code = course.code || course.raw?.['รหัสวิชา'] || '-'
  const nameEn = course.nameEn || course.name || course.raw?.['ชื่อวิชา'] || ''
  const nameTh = course.nameTh || course.raw?.['ชื่อวิชา_ไทย'] || ''
  const credits = course.credits || course.raw?.['หน่วยกิต'] || course.raw?.['จำนวนหน่วยกิต'] || '-'
  const category = course.category || 'รายวิชา'
  const subCategory = course.subCategory || null
  const year = course.year || null
  const termDisplay = course.termDisplay || (course.terms?.length > 0 ? course.terms.map(t => `เทอม ${t}`).join(', ') : 'ยังไม่มีข้อมูลเปิดสอน')

  // REG SUT direct link URL
  const regUrl = 'https://reg2.sut.ac.th/registrar/class_info_1.asp'

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-course-title"
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-info">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
              <div className="modal-code-badge">{code}</div>
              {course.programType && (
                <span className={`program-badge ${course.programType === 'นานาชาติ' ? 'inter' : 'regular'}`}>
                  หลักสูตร{course.programType}
                </span>
              )}
            </div>
            <h2 id="modal-course-title" className="modal-title-en">
              {nameEn}
            </h2>
            {nameTh && <div className="modal-title-th">{nameTh}</div>}
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            title="ปิดหน้าต่าง (ESC)"
          >
            <CloseIcon size={14} />
          </button>
        </div>

        {/* Content Body */}
        <div className="modal-body">
          {/* Metadata Cards */}
          <div className="modal-meta-grid">
            <div className="modal-meta-card">
              <span className="meta-card-label">จำนวนหน่วยกิต</span>
              <span className="meta-card-value highlight">{credits}</span>
            </div>
            <div className="modal-meta-card">
              <span className="meta-card-label">หมวดหมู่วิชา</span>
              <span className="meta-card-value">{category}</span>
            </div>
            {course.programType && (
              <div className="modal-meta-card">
                <span className="meta-card-label">ประเภทหลักสูตร</span>
                <span className={`meta-card-value ${course.programType === 'นานาชาติ' ? 'inter-text' : ''}`}>
                  {course.programType === 'นานาชาติ' ? 'นานาชาติ (International Program)' : 'ปกติ (Regular Program)'}
                </span>
              </div>
            )}
            {year && (
              <div className="modal-meta-card">
                <span className="meta-card-label">แผนการเรียน</span>
                <span className="meta-card-value">ชั้นปีที่ {year}</span>
              </div>
            )}
            {subCategory && (
              <div className="modal-meta-card">
                <span className="meta-card-label">กลุ่มวิชา</span>
                <span className="meta-card-value">{subCategory}</span>
              </div>
            )}
            <div className="modal-meta-card">
              <span className="meta-card-label">เทอมที่เปิดสอน</span>
              <span className="meta-card-value">{termDisplay}</span>
            </div>
          </div>

          {/* Section Information from SUT REG */}
          <div className="modal-sections-area">
            <div className="modal-section-title-row">
              <h3 className="modal-section-title">
                ข้อมูลกลุ่มเรียนจากระบบ REG มทส. ({sections.length} กลุ่ม)
              </h3>
            </div>

            {sections.length > 0 ? (
              <div className="modal-sections-table-wrapper">
                <table className="modal-sections-table">
                  <thead>
                    <tr>
                      <th>กลุ่ม</th>
                      <th>ปี/ภาค</th>
                      <th>วัน-เวลาเรียน และสถานที่</th>
                      <th>อาจารย์ผู้สอน / หมายเหตุ</th>
                      <th className="align-center">สอบกลางภาค</th>
                      <th className="align-center">สอบปลายภาค</th>
                      <th className="align-center">ที่นั่ง (รับ/ลง/เหลือ)</th>
                      <th className="align-center">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sections.map((sec, idx) => {
                      const secGroup = sec.section || sec.raw?.['กลุ่ม'] || '-'
                      const secYear = sec.year ? `${sec.year}/${sec.semester}` : '-'
                      const secTime = sec.raw?.['เวลาเรียน'] || '-'
                      const secInstructor = sec.raw?.['อาจารย์_หมายเหตุ'] || '-'
                      const maxSeat = sec.raw?.['จำนวนรับ'] || '-'
                      const enrolled = sec.raw?.['ลงทะเบียน'] || '-'
                      const remain = sec.raw?.['ที่นั่งเหลือ'] || '-'
                      const status = sec.raw?.['สถานะ'] || 'W'

                      const scheduleSlots = parseSchedule(secTime)
                      const parsedInst = parseInstructorNote(secInstructor)
                      const midtermExam = sec.raw?.['สอบกลางภาค'] || sec.midterm || null
                      const finalExam = sec.raw?.['สอบปลายภาค'] || sec.final || null

                      return (
                        <tr key={idx}>
                          <td className="sec-col-group">
                            <strong>{secGroup}</strong>
                          </td>
                          <td className="sec-col-term">{secYear}</td>
                          <td className="sec-col-time">
                            {scheduleSlots.length > 0 ? (
                              <div className="schedule-list">
                                {scheduleSlots.map((slot, sIdx) => (
                                  <div key={sIdx} className="schedule-slot">
                                    <span className={`schedule-day-pill day-${slot.day}`}>
                                      {slot.day}
                                    </span>
                                    <span className="schedule-time-range">{slot.time} น.</span>
                                    {slot.room ? (
                                      <span className="schedule-room-pill" title="ห้องเรียน / สถานที่">
                                        {slot.room}
                                      </span>
                                    ) : (
                                      <span className="schedule-room-pill none" title="ยังไม่ระบุห้องเรียน">
                                        -
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="schedule-fallback-text">{secTime || '-'}</span>
                            )}
                          </td>
                          <td className="sec-col-instructor">
                            {parsedInst.note && (
                              <div className="sec-note-text" title={parsedInst.note}>
                                {formatNote(parsedInst.note)}
                              </div>
                            )}
                            {parsedInst.instructors.length > 0 ? (
                              <div className="sec-instructor-list">
                                {parsedInst.instructors.map((inst, instIdx) => (
                                  <div key={instIdx} className="sec-instructor-item">
                                    <UserIcon size={13} className="instructor-icon" />
                                    <span className="instructor-name">{inst}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              !parsedInst.note && <span className="text-muted">-</span>
                            )}
                          </td>
                          <td className="sec-col-exam align-center">
                            {midtermExam && midtermExam !== '-' ? (
                              <span className="exam-badge midterm">{midtermExam}</span>
                            ) : (
                              <span className="exam-none">-</span>
                            )}
                          </td>
                          <td className="sec-col-exam align-center">
                            {finalExam && finalExam !== '-' ? (
                              <span className="exam-badge final">{finalExam}</span>
                            ) : (
                              <span className="exam-none">-</span>
                            )}
                          </td>
                          <td className="sec-col-seats align-center">
                            <span className="seat-fraction">
                              {enrolled} / {maxSeat}
                            </span>
                            <span className="seat-remain" title="ที่นั่งคงเหลือ">
                              (เหลือ {remain})
                            </span>
                          </td>
                          <td className="sec-col-status align-center">
                            <span className={`status-pill ${status === 'W' ? 'open' : 'closed'}`}>
                              {status === 'W' ? 'เปิดรับ' : status}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="modal-empty-sections">
                <InfoIcon size={16} />
                <span>
                  ขณะนี้ยังไม่พบข้อมูลกลุ่มเรียนที่เปิดสอนในรอบการดึงข้อมูลล่าสุด หรือวิชานี้อาจเปิดในภาคการศึกษาอื่น
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="modal-footer">
          <div className="modal-footer-left">
            <span className="modal-footer-note">
              * ข้อมูลอัปเดตจากระบบบริการการศึกษา มหาวิทยาลัยเทคโนโลยีสุรนารี
            </span>
          </div>
          <div className="modal-footer-right">
            <a
              href={regUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-reg-link"
              title="เปิดหน้าระบบบริการการศึกษา มทส. (class_info_1.asp)"
            >
              <span>ดูข้อมูลในระบบ REG มทส.</span>
              <ExternalLinkIcon size={14} />
            </a>
            <button type="button" className="btn-modal-close" onClick={onClose}>
              ปิด
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
