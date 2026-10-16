const BASE = import.meta.env.VITE_API_URL || '/api'

async function get(path) {
  const res = await fetch(BASE + path)
  if (!res.ok) throw new Error('HTTP ' + res.status)
  return res.json()
}

export const getTerms = () => get('/terms')
export const getStatus = () => get('/status')
export const getCourses = ({ year, semester, q } = {}) => {
  const p = new URLSearchParams({ limit: '1000' })
  if (year) p.set('year', year)
  if (semester) p.set('semester', semester)
  if (q) p.set('q', q)
  return get('/courses?' + p.toString())
}

export const triggerScrape = (token) => {
  return fetch(BASE + '/scrape', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Token': token || '',
    },
  }).then((res) => {
    if (!res.ok) throw new Error('HTTP ' + res.status)
    return res.json()
  })
}

export const getGradeData = async (token) => {
  const res = await fetch(BASE + '/grade/data', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  if (!res.ok) throw new Error('HTTP ' + res.status)
  return res.json()
}

export const saveGradeData = async (token, data) => {
  const res = await fetch(BASE + '/grade/data', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('HTTP ' + res.status)
  return res.json()
}

export const resetGradeData = async (token) => {
  const res = await fetch(BASE + '/grade/reset', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  if (!res.ok) throw new Error('HTTP ' + res.status)
  return res.json()
}

