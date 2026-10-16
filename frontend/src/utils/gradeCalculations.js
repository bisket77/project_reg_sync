/**
 * @file gradeCalculations.js
 * Pure functions สำหรับการคำนวณเกรด, CX, GPA, GPAX, และการตรวจสอบช่วงเกณฑ์คะแนน มทส.
 */

/**
 * คำนวณเกรดและค่า CX (Grade Point) จากคะแนนรวมเทียบกับเกณฑ์ (Grade Ranges)
 * @param {number} score - คะแนนรวม 0-100
 * @param {Array<{min: number, max: number, grade: string, cx: number}>} ranges - รายการช่วงคะแนน
 * @returns {{ grade: string, cx: number }} เกรดและเกรดพอยต์
 */
export function calculateGradeAndCX(score, scaleOrRanges = []) {
  const ranges = Array.isArray(scaleOrRanges) ? scaleOrRanges : (scaleOrRanges?.ranges || [])
  if (score === null || score === undefined || isNaN(score) || ranges.length === 0) {
    return { grade: '-', cx: 0 }
  }

  const numScore = parseFloat(score)

  // ค้นหาช่วงที่คะแนนตกอยู่
  for (const r of ranges) {
    const min = parseFloat(r.min)
    const max = parseFloat(r.max)
    // รองรับช่วงปิด [min, max] สำหรับทุกระดับ
    if (numScore >= min && numScore <= max) {
      return {
        grade: r.grade,
        cx: parseFloat(r.cx),
      }
    }
  }

  // หากคะแนนต่ำกว่า min ต่ำสุด ให้ได้เกรดของช่วงต่ำสุด (ปกติคือ F = 0)
  const sorted = [...ranges].sort((a, b) => parseFloat(a.min) - parseFloat(b.min))
  if (numScore < parseFloat(sorted[0].min)) {
    return { grade: sorted[0].grade, cx: parseFloat(sorted[0].cx) }
  }

  // หากคะแนนเกิน 100 หรือเกินช่วงสูงสุด ให้ได้เกรดสูงสุด (A = 4.0)
  const highest = sorted[sorted.length - 1]
  return { grade: highest.grade, cx: parseFloat(highest.cx) }
}

/**
 * ตรวจสอบความถูกต้องของช่วงคะแนน (ไม่มีช่วงทับซ้อน และครอบคลุมช่วง 0 ถึง 100)
 * @param {Array<{min: number, max: number, grade: string, cx: number}>} ranges
 * @returns {{ isValid: boolean, errors: string[] }}
 */
export function validateGradeRanges(ranges = []) {
  const errors = []
  if (!ranges || ranges.length === 0) {
    return { isValid: false, errors: ['ต้องมีช่วงคะแนนอย่างน้อย 1 ช่วง'] }
  }

  const sorted = [...ranges].sort((a, b) => parseFloat(a.min) - parseFloat(b.min))

  // ตรวจสอบ min เริ่มต้นควรเป็น 0
  if (parseFloat(sorted[0].min) > 0) {
    errors.push(`ช่วงคะแนนต่ำสุดเริ่มต้นที่ ${sorted[0].min} ควรเริ่มต้นที่ 0`)
  }

  // ตรวจสอบ max สูงสุดควรเป็น 100
  if (parseFloat(sorted[sorted.length - 1].max) < 100) {
    errors.push(`ช่วงคะแนนสูงสุดสิ้นสุดที่ ${sorted[sorted.length - 1].max} ควรครอบคลุมถึง 100`)
  }

  // ตรวจสอบการทับซ้อนและช่องว่างระหว่างช่วง
  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i]
    const next = sorted[i + 1]
    const curMin = parseFloat(current.min)
    const curMax = parseFloat(current.max)
    const nextMin = parseFloat(next.min)
    const nextMax = parseFloat(next.max)

    if (curMin > curMax) {
      errors.push(`เกรด ${current.grade} มีค่าเริ่มต้น (${curMin}) มากกว่าค่าสิ้นสุด (${curMax})`)
    }

    if (curMax >= nextMin) {
      errors.push(`ช่วงเกรด ${current.grade} (${curMin}-${curMax}) ทับซ้อนกับ ${next.grade} (${nextMin}-${nextMax})`)
    } else if (nextMin - curMax > 1.01) {
      errors.push(`มีช่องว่างคะแนนระหว่างเกรด ${current.grade} (สิ้นสุดที่ ${curMax}) และ ${next.grade} (เริ่มที่ ${nextMin})`)
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * คำนวณ Grade Point และ GPA ประจำเทอม
 * @param {Array<{credits: number, cx: number}>} courses
 * @returns {{ totalCredits: number, totalGradePoints: number, gpa: number }}
 */
export function calculateTermGPA(courses = []) {
  let totalCredits = 0
  let totalGradePoints = 0

  for (const c of courses) {
    const cred = parseFloat(c.credits) || 0
    const cx = parseFloat(c.cx) || 0
    if (cred > 0) {
      totalCredits += cred
      totalGradePoints += cred * cx
    }
  }

  const gpa = totalCredits > 0 ? totalGradePoints / totalCredits : 0
  return {
    totalCredits,
    totalGradePoints: Math.round(totalGradePoints * 1000) / 1000,
    gpa,
  }
}

/**
 * คำนวณ GPAX สะสมจากทุกเทอม
 * @param {Array<{credits: number, cx: number}>} allCourses
 * @returns {{ totalCredits: number, totalGradePoints: number, gpax: number }}
 */
export function calculateCumulativeGPAX(allCourses = []) {
  return calculateTermGPA(allCourses)
}

/**
 * คำนวณ MAX SCORE (คะแนนที่หายไปจาก 100)
 * @param {number} totalScore
 * @returns {number}
 */
export function calculateMaxScore(totalScore) {
  const score = parseFloat(totalScore) || 0
  return Math.round((score - 100) * 100) / 100
}

/**
 * คำนวณ MISS SCORE TO A (คะแนนที่ขาดเพื่อจะได้ A)
 * @param {number} totalScore
 * @param {number} aThreshold - คะแนนขั้นต่ำของเกรด A เช่น 75 หรือ 80
 * @returns {string|number} 'PASS' ถ้าถึงแล้ว หรือจำนวนคะแนนที่ขาด
 */
export function calculateMissScoreToA(totalScore, aThreshold = 80) {
  const score = parseFloat(totalScore) || 0
  const threshold = parseFloat(aThreshold) || 80
  if (score >= threshold) {
    return 'PASS'
  }
  return Math.round((threshold - score) * 100) / 100
}

/**
 * คำนวณ WANT TO A (ผลต่างคะแนนถึงเกรด A)
 * @param {number} totalScore
 * @param {number} aThreshold
 * @returns {number}
 */
export function calculateWantToA(totalScore, aThreshold = 80) {
  const score = parseFloat(totalScore) || 0
  const threshold = parseFloat(aThreshold) || 80
  return Math.round((threshold - score) * 100) / 100
}
