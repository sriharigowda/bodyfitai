export type Gender = 'Male' | 'Female'
export type ActivityLevel = 'Sedentary' | 'Lightly active' | 'Moderately active' | 'Very active'
export type Goal = 'Weight loss' | 'Muscle gain' | 'Maintain weight' | 'Athletic performance'
export type DietType = 'Vegetarian' | 'Non-vegetarian' | 'Mixed'

export interface DietDays {
  type: DietType
  nonVegDays: string[] // e.g. ['Monday','Wednesday','Saturday']
}

export interface Measurements {
  // Personal
  name: string
  age: number
  gender: Gender
  // Basic
  height: number   // cm
  weight: number   // kg
  // Upper body
  neck: number
  aroundShoulder: number  // renamed from shoulder
  chest: number
  bicep: number
  forearm: number
  wrist: number           // new
  stomach: number
  // Lower body
  hip: number
  thigh: number
  knee: number            // new
  calf: number
  ankle: number           // new
  // Goals
  goal: Goal
  targetWeight: number
  activityLevel: ActivityLevel
  // Diet
  diet: DietDays
}

export interface TargetMetrics {
  targetBodyFat: number
  targetLeanMass: number
  targetFatMass: number
  targetFFMI: number
  targetBodyFatCategory: string
}

export interface FitnessResults {
  // Current
  bodyFatPercent: number
  bodyFatCategory: string
  leanMass: number
  fatMass: number
  leanMassPercent: number
  ffmi: number
  ffmiCategory: string
  bmr: number
  tdee: number
  dailyCalories: number
  deficit: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  caloriesToBurn: number
  weeksToGoal: number
  // Target
  target: TargetMetrics
}

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  'Sedentary': 1.2,
  'Lightly active': 1.375,
  'Moderately active': 1.55,
  'Very active': 1.725,
}

export function calculateBodyFat(gender: Gender, neck: number, stomach: number, hip: number, height: number): number {
  let bf: number
  if (gender === 'Female') {
    bf = 163.205 * Math.log10(stomach + hip - neck) - 97.684 * Math.log10(height) - 78.387
  } else {
    bf = 86.010 * Math.log10(stomach - neck) - 70.041 * Math.log10(height) + 36.76
  }
  return Math.max(3, Math.min(60, parseFloat(bf.toFixed(1))))
}

export function getBodyFatCategory(bf: number, gender: Gender): string {
  if (gender === 'Female') {
    if (bf < 14) return 'Essential fat'
    if (bf < 21) return 'Athletic'
    if (bf < 25) return 'Fitness'
    if (bf < 32) return 'Average'
    return 'Above average'
  } else {
    if (bf < 6)  return 'Essential fat'
    if (bf < 14) return 'Athletic'
    if (bf < 18) return 'Fitness'
    if (bf < 25) return 'Average'
    return 'Above average'
  }
}

// FFMI = Fat Free Mass / (height in m)^2
// Normalised FFMI = FFMI + 6.1 * (1.8 - height in m)
export function calculateFFMI(leanMassKg: number, heightCm: number): number {
  const heightM = Math.max(heightCm / 100, 1.0)  // prevent division by tiny number
  const ffmi = leanMassKg / (heightM * heightM)
  const normalised = ffmi + 6.1 * (1.8 - heightM)
  // Cap to realistic human range (10–35)
  return parseFloat(Math.min(Math.max(normalised, 10), 35).toFixed(1))
}

export function getFFMICategory(ffmi: number, gender: Gender): string {
  if (gender === 'Female') {
    if (ffmi < 14) return 'Below average'
    if (ffmi < 17) return 'Average'
    if (ffmi < 20) return 'Above average'
    if (ffmi < 22) return 'Excellent'
    return 'Elite / Near genetic limit'
  } else {
    if (ffmi < 17) return 'Below average'
    if (ffmi < 20) return 'Average'
    if (ffmi < 22) return 'Above average'
    if (ffmi < 25) return 'Excellent'
    return 'Elite / Near genetic limit'
  }
}

export function calculateTargetMetrics(m: Measurements): TargetMetrics {
  // Estimate target body fat based on goal
  const currentBF = calculateBodyFat(m.gender, m.neck, m.stomach, m.hip, m.height)

  let targetBF: number
  if (m.goal === 'Weight loss') {
    targetBF = Math.max(currentBF - ((m.weight - m.targetWeight) / m.weight) * 20, m.gender === 'Female' ? 14 : 6)
  } else if (m.goal === 'Muscle gain') {
    targetBF = Math.min(currentBF + 2, m.gender === 'Female' ? 28 : 20)
  } else {
    targetBF = currentBF
  }
  targetBF = parseFloat(targetBF.toFixed(1))

  const targetFatMass  = parseFloat(((m.targetWeight * targetBF) / 100).toFixed(1))
  const targetLeanMass = parseFloat((m.targetWeight - targetFatMass).toFixed(1))
  const targetFFMI     = calculateFFMI(targetLeanMass, m.height)

  return {
    targetBodyFat: targetBF,
    targetLeanMass,
    targetFatMass,
    targetFFMI,
    targetBodyFatCategory: getBodyFatCategory(targetBF, m.gender),
  }
}

export function sanitizeMeasurements(m: Measurements): Measurements {
  // Clamp all values to realistic human ranges
  return {
    ...m,
    height:        Math.min(Math.max(m.height, 100), 250),   // 100–250cm
    weight:        Math.min(Math.max(m.weight, 30), 300),    // 30–300kg
    age:           Math.min(Math.max(m.age, 10), 100),
    targetWeight:  Math.min(Math.max(m.targetWeight, 30), 300),
    neck:          Math.min(Math.max(m.neck, 20), 80),
    stomach:       Math.min(Math.max(m.stomach, 40), 200),
    hip:           Math.min(Math.max(m.hip, 40), 200),
  }
}

export function calculateResults(m: Measurements): FitnessResults {
  m = sanitizeMeasurements(m)
  const bodyFatPercent  = calculateBodyFat(m.gender, m.neck, m.stomach, m.hip, m.height)
  const bodyFatCategory = getBodyFatCategory(bodyFatPercent, m.gender)
  const fatMass         = parseFloat(((m.weight * bodyFatPercent) / 100).toFixed(1))
  const leanMass        = parseFloat((m.weight - fatMass).toFixed(1))
  const leanMassPercent = parseFloat((100 - bodyFatPercent).toFixed(1))
  const ffmi            = calculateFFMI(leanMass, m.height)
  const ffmiCategory    = getFFMICategory(ffmi, m.gender)

  // BMR — Mifflin-St Jeor
  const bmr = m.gender === 'Female'
      ? 10 * m.weight + 6.25 * m.height - 5 * m.age - 161
      : 10 * m.weight + 6.25 * m.height - 5 * m.age + 5

  const tdee = bmr * ACTIVITY_MULTIPLIERS[m.activityLevel]

  let deficit = 0
  if (m.goal === 'Weight loss')          deficit = -400
  else if (m.goal === 'Muscle gain')     deficit = 300
  else if (m.goal === 'Athletic performance') deficit = 200

  const dailyCalories  = tdee + deficit
  const caloriesToBurn = Math.abs(deficit)
  const protein        = Math.round(m.weight * (m.goal === 'Muscle gain' ? 2.2 : 2.0))
  const fat            = Math.round(dailyCalories * 0.25 / 9)
  const fiber          = m.gender === 'Female' ? 25 : 38
  const carbs          = Math.max(0, Math.round((dailyCalories - protein * 4 - fat * 9) / 4))

  const weightDiff  = Math.abs(m.weight - m.targetWeight)
  const weeksToGoal = weightDiff > 0.5 ? Math.round(weightDiff / 0.5) : 0

  const target = calculateTargetMetrics(m)

  return {
    bodyFatPercent, bodyFatCategory, leanMass, fatMass, leanMassPercent,
    ffmi, ffmiCategory,
    bmr: Math.round(bmr), tdee: Math.round(tdee),
    dailyCalories: Math.round(dailyCalories), deficit,
    protein, carbs, fat, fiber, caloriesToBurn, weeksToGoal,
    target,
  }
}

export function convertToMetric(value: number, type: 'weight' | 'length'): number {
  if (type === 'weight') return parseFloat((value * 0.453592).toFixed(1))
  return parseFloat((value * 2.54).toFixed(1))
}