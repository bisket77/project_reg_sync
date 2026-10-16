import { CORE_COURSES } from '../data/coreCoursesData.js'
import { ELECTIVE_COURSES } from '../data/electivesData.js'
import { GE_ELECTIVE_COURSES } from '../data/geElectivesData.js'
import { FREE_ELECTIVE_COURSES } from '../data/freeElectivesData.js'
import { INITIAL_USER_COURSES } from '../data/initialGradeData.js'

const INSTRUCTOR_TITLE_REGEX = /(?:รองศาสตราจารย์|ผู้ช่วยศาสตราจารย์|ศาสตราจารย์|อาจารย์|รศ\.|ผศ\.|ศ\.|ดร\.|นางสาว|นาง|นาย|ว่าที่ ร\.ต\.|น\.ส\.).*$/

export function cleanCourseName(rawName) {
  if (!rawName) return ''
  return String(rawName).replace(INSTRUCTOR_TITLE_REGEX, '').trim()
}

export function parseCredits(rawCredits) {
  if (typeof rawCredits === 'number') return rawCredits
  if (!rawCredits) return 3
  const match = String(rawCredits).match(/^(\d+)/)
  return match ? parseInt(match[1], 10) : 3
}

let cachedRegCourses = null
let fetchPromise = null

export async function fetchAllRegCourses() {
  if (cachedRegCourses) return cachedRegCourses
  if (fetchPromise) return fetchPromise

  fetchPromise = (async () => {
    let items = []

    // 1. Try static /courses.json (works on both Dev and GitHub Pages)
    try {
      const res = await fetch('./courses.json?t=' + Date.now())
      if (res.ok) {
        const json = await res.json()
        if (json.items && Array.isArray(json.items)) {
          items = json.items
        } else if (Array.isArray(json)) {
          items = json
        }
      }
    } catch {
      // fallback to backend API below
    }

    // 2. If empty, try backend API /api/courses
    if (items.length === 0) {
      try {
        const apiRes = await fetch('/api/courses?limit=2000')
        if (apiRes.ok) {
          const apiJson = await apiRes.json()
          if (apiJson.items && Array.isArray(apiJson.items)) {
            items = apiJson.items
          } else if (Array.isArray(apiJson)) {
            items = apiJson
          }
        }
      } catch {
        // Backend not available
      }
    }

    // Deduplicate items by normalized course code
    const map = new Map()
    for (const item of items) {
      const rawCode = (item.code || item.raw?.['รหัสวิชา'] || '').trim()
      const norm = rawCode.replace(/\s+/g, '').toUpperCase()
      if (!norm) continue

      const cleanName = cleanCourseName(item.name || item.raw?.['ชื่อวิชา'])
      const credits = parseCredits(item.credits || item.raw?.['หน่วยกิต'])

      if (!map.has(norm)) {
        map.set(norm, {
          code: rawCode,
          name: cleanName,
          nameEn: cleanName,
          nameTh: item.raw?.['ชื่อวิชา'] ? cleanCourseName(item.raw['ชื่อวิชา']) : '',
          credits: credits,
          category: 'วิชาในระบบ REG',
          year: item.year,
          semester: item.semester,
        })
      }
    }

    cachedRegCourses = Array.from(map.values())
    return cachedRegCourses
  })()

  return fetchPromise
}

export function buildMasterCatalog(userCourses = [], regCourses = []) {
  const map = new Map()

  // 1. First, register all official curriculum & REG courses as authoritative truth
  const addOfficialItems = (list, defaultCat) => {
    if (!Array.isArray(list)) return
    list.forEach((item) => {
      if (!item || !item.code) return
      const rawCode = String(item.code).trim()
      const norm = rawCode.replace(/\s+/g, '').toUpperCase()
      if (!norm) return

      const cleanName = cleanCourseName(item.nameEn || item.name || '')
      const credits = parseCredits(item.credits)

      if (!map.has(norm)) {
        map.set(norm, {
          code: rawCode,
          name: cleanName,
          nameEn: cleanName,
          nameTh: item.nameTh || (item.raw?.['ชื่อวิชา'] ? cleanCourseName(item.raw['ชื่อวิชา']) : ''),
          credits: credits,
          category: item.category || defaultCat || 'วิชาในหลักสูตร',
          isOfficial: true,
        })
      } else {
        const existing = map.get(norm)
        if ((!existing.nameEn || existing.nameEn === 'New Course') && cleanName) {
          existing.name = cleanName
          existing.nameEn = cleanName
        }
        if (!existing.nameTh && item.nameTh) {
          existing.nameTh = item.nameTh
        }
        if ((!existing.category || existing.category === 'วิชาในระบบ REG') && item.category) {
          existing.category = item.category
        }
        if (!existing.credits && credits) {
          existing.credits = credits
        }
      }
    })
  }

  // Load official curriculum lists first (ensures official English names are preserved!)
  addOfficialItems(CORE_COURSES, 'วิชาชีพบังคับ')
  addOfficialItems(ELECTIVE_COURSES, 'วิชาเลือก')
  addOfficialItems(GE_ELECTIVE_COURSES, 'ศึกษาทั่วไปแบบเลือก')
  addOfficialItems(FREE_ELECTIVE_COURSES, 'วิชาเลือกเสรี')
  addOfficialItems(INITIAL_USER_COURSES, 'วิชาในหลักสูตร')
  addOfficialItems(regCourses, 'วิชาในระบบ REG')

  // 2. Overlay user courses: attach scores and add any purely custom courses
  if (Array.isArray(userCourses)) {
    userCourses.forEach((u) => {
      if (!u || !u.code) return
      const rawCode = String(u.code).trim()
      const norm = rawCode.replace(/\s+/g, '').toUpperCase()
      if (!norm) return

      if (map.has(norm)) {
        const existing = map.get(norm)
        // Attach user scores
        if (u.scores) existing.scores = { ...u.scores }
        if (u.total !== undefined) existing.total = u.total
        if (u.totalFromScores !== undefined) existing.totalFromScores = u.totalFromScores
        if (u.grade) existing.grade = u.grade
        if (u.cx !== undefined) existing.cx = u.cx
        if (u.gradeScaleId) existing.gradeScaleId = u.gradeScaleId
        existing.hasUserScores = true
      } else {
        // Purely custom user course not found in official curriculum/REG
        const cleanName = cleanCourseName(u.name || '')
        map.set(norm, {
          code: rawCode,
          name: cleanName || 'Custom Course',
          nameEn: cleanName || 'Custom Course',
          nameTh: '',
          credits: parseCredits(u.credits),
          category: 'วิชาที่คุณบันทึกคะแนนไว้',
          scores: u.scores ? { ...u.scores } : undefined,
          total: u.total,
          totalFromScores: u.totalFromScores,
          grade: u.grade,
          cx: u.cx,
          gradeScaleId: u.gradeScaleId,
          hasUserScores: true,
          isOfficial: false,
        })
      }
    })
  }

  return Array.from(map.values())
}

export function searchCatalog(query, masterList, limit = 15) {
  if (!query || !query.trim()) return masterList.slice(0, limit)
  const q = query.toLowerCase().trim()
  const qCompact = q.replace(/\s+/g, '')

  return masterList
    .filter((c) => {
      const cCode = (c.code || '').toLowerCase()
      const cNorm = cCode.replace(/\s+/g, '')
      const cName = (c.name || c.nameEn || '').toLowerCase()
      const cNameTh = (c.nameTh || '').toLowerCase()

      return (
        cCode.includes(q) ||
        cNorm.includes(qCompact) ||
        cName.includes(q) ||
        cNameTh.includes(q)
      )
    })
    .slice(0, limit)
}
