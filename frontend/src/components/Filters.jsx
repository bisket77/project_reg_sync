export default function Filters({ terms, year, semester, q, onChange }) {
  const years = [...new Set(terms.map((t) => t.year))]
  const sems = [...new Set(terms.filter((t) => !year || t.year === year).map((t) => t.semester))]
  return (
    <div style={{ display: 'flex', gap: 8, margin: '12px 0' }}>
      <select value={year} onChange={(e) => onChange({ year: e.target.value, semester: '' })}>
        <option value="">ทุกปี</option>
        {years.map((y) => <option key={y}>{y}</option>)}
      </select>
      <select value={semester} onChange={(e) => onChange({ semester: e.target.value })}>
        <option value="">ทุกเทอม</option>
        {sems.map((s) => <option key={s}>{s}</option>)}
      </select>
      <input
        placeholder="ค้นหารหัสหรือชื่อวิชา"
        value={q}
        onChange={(e) => onChange({ q: e.target.value })}
        style={{ flex: 1 }}
      />
    </div>
  )
}
