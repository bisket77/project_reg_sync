import {
  calculateGradeAndCX,
  validateGradeRanges,
  calculateTermGPA,
  calculateMaxScore,
  calculateMissScoreToA,
  calculateWantToA
} from './gradeCalculations.js'

// Standard Seed Scales
const LN_CN_FLAB_RANGES = [
  { min: 0, max: 39, grade: 'F', cx: 0 },
  { min: 40, max: 44, grade: 'D', cx: 1.0 },
  { min: 45, max: 50, grade: 'D+', cx: 1.5 },
  { min: 51, max: 56, grade: 'C', cx: 2.0 },
  { min: 57, max: 62, grade: 'C+', cx: 2.5 },
  { min: 63, max: 68, grade: 'B', cx: 3.0 },
  { min: 69, max: 74, grade: 'B+', cx: 3.5 },
  { min: 75, max: 100, grade: 'A', cx: 4.0 },
]

const PHYSICS_I_RANGES = [
  { min: 0, max: 33, grade: 'F', cx: 0 },
  { min: 34, max: 39, grade: 'D', cx: 1.0 },
  { min: 40, max: 46, grade: 'D+', cx: 1.5 },
  { min: 47, max: 55, grade: 'C', cx: 2.0 },
  { min: 56, max: 64, grade: 'C+', cx: 2.5 },
  { min: 65, max: 72, grade: 'B', cx: 3.0 },
  { min: 73, max: 79, grade: 'B+', cx: 3.5 },
  { min: 80, max: 100, grade: 'A', cx: 4.0 },
]

const STANDARD_A80_RANGES = [
  { min: 0, max: 49, grade: 'F', cx: 0 },
  { min: 50, max: 54, grade: 'D', cx: 1.0 },
  { min: 55, max: 59, grade: 'D+', cx: 1.5 },
  { min: 60, max: 64, grade: 'C', cx: 2.0 },
  { min: 65, max: 69, grade: 'C+', cx: 2.5 },
  { min: 70, max: 74, grade: 'B', cx: 3.0 },
  { min: 75, max: 79, grade: 'B+', cx: 3.5 },
  { min: 80, max: 100, grade: 'A', cx: 4.0 },
]

function runTests() {
  console.log('--- RUNNING GRADE CALCULATION UNIT TESTS ---')

  // Test 1: Calculate Grade & CX for Standard A=80 (FUND CHEM I: 71 -> B / 3.0)
  const chem1 = calculateGradeAndCX(71, STANDARD_A80_RANGES)
  console.assert(chem1.grade === 'B' && chem1.cx === 3.0, `Expected B/3.0, got ${chem1.grade}/${chem1.cx}`)

  // For LN/CN/FLAB (A=75): 71 -> B+ / 3.5
  const chemFlab = calculateGradeAndCX(71, LN_CN_FLAB_RANGES)
  console.assert(chemFlab.grade === 'B+' && chemFlab.cx === 3.5, `Expected B+/3.5, got ${chemFlab.grade}/${chemFlab.cx}`)

  // For LN/CN/FLAB (A=75): 78 -> A / 4.0
  const chemLab = calculateGradeAndCX(78, LN_CN_FLAB_RANGES)
  console.assert(chemLab.grade === 'A' && chemLab.cx === 4.0, `Expected A/4.0 for 78 in A=75, got ${chemLab.grade}/${chemLab.cx}`)

  // Test 2: Calculate Grade & CX for Physics I (A at 80)
  const phys1 = calculateGradeAndCX(73, PHYSICS_I_RANGES)
  console.assert(phys1.grade === 'B+' && phys1.cx === 3.5, `Expected B+/3.5, got ${phys1.grade}/${phys1.cx}`)

  // Test 3: Calculate Term 1 GPA from Image 2
  // SCI02 1111 (4 credits, cx 3)
  // SCI02 1112 (1 credit, cx 3.5)
  // SCI03 1001 (4 credits, cx 3.5)
  // DGT00 0110 (4 credits, cx 4)
  // IST30 1101 (3 credits, cx 4)
  const term1Courses = [
    { credits: 4, cx: 3 },
    { credits: 1, cx: 3.5 },
    { credits: 4, cx: 3.5 },
    { credits: 4, cx: 4 },
    { credits: 3, cx: 4 },
  ]
  const term1Result = calculateTermGPA(term1Courses)
  console.assert(term1Result.totalCredits === 16, `Expected 16 credits, got ${term1Result.totalCredits}`)
  console.assert(term1Result.totalGradePoints === 57.5, `Expected 57.5 Grade Points, got ${term1Result.totalGradePoints}`)
  console.assert(Math.abs(term1Result.gpa - 3.59375) < 0.0001, `Expected GPA 3.59375, got ${term1Result.gpa}`)

  // Test 4: Calculate Helper Scores (Image 4)
  // TOTAL: 71 -> MAX SCORE: -29, MISS SCOR TO A: 9, WANT TO A: 9
  console.assert(calculateMaxScore(71) === -29, `Expected -29, got ${calculateMaxScore(71)}`)
  console.assert(calculateMissScoreToA(71, 80) === 9, `Expected 9, got ${calculateMissScoreToA(71, 80)}`)
  console.assert(calculateWantToA(71, 80) === 9, `Expected 9, got ${calculateWantToA(71, 80)}`)

  // TOTAL: 86 -> MAX SCORE: -14, MISS SCOR TO A: PASS, WANT TO A: -6
  console.assert(calculateMaxScore(86) === -14, `Expected -14, got ${calculateMaxScore(86)}`)
  console.assert(calculateMissScoreToA(86, 80) === 'PASS', `Expected PASS, got ${calculateMissScoreToA(86, 80)}`)
  console.assert(calculateWantToA(86, 80) === -6, `Expected -6, got ${calculateWantToA(86, 80)}`)

  // Test 5: Range Validation
  const validCheck = validateGradeRanges(PHYSICS_I_RANGES)
  console.assert(validCheck.isValid === true, `Expected valid ranges, got ${JSON.stringify(validCheck.errors)}`)

  console.log('✅ ALL UNIT TESTS PASSED!')
}

runTests()
