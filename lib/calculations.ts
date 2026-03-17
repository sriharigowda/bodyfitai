export type Gender = 'Male' | 'Female'
export type ActivityLevel = 'Sedentary' | 'Lightly active' | 'Moderately active' | 'Very active'
export type Goal = 'Weight loss' | 'Muscle gain' | 'Maintain weight' | 'Athletic performance'

export interface Measurements {
  age: number
  gender: Gender
  height: number   // cm
  weight: number   // kg
  neck: number     // cm
  shoulder: number
  chest: number
  bicep: number
  forearm: number
  stomach: number
  hip: number
  thigh: number
  calf: number
  goal: Goal
  targetWeight: number // kg
  activityLevel: ActivityLevel
}

export interface FitnessResults {
  bodyFatPercent: number
  bodyFatCategory: string
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
  leanMass: number
  fatMass: number
}

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  'Sedentary': 1.2,
  'Lightly active': 1.375,
  'Moderately active': 1.55,
  'Very active': 1.725,
}

export function calculateBodyFat(m: Measurements): number {
  const { gender, neck, stomach, hip, height } = m
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
    if (bf < 6) return 'Essential fat'
    if (bf < 14) return 'Athletic'
    if (bf < 18) return 'Fitness'
    if (bf < 25) return 'Average'
    return 'Above average'
  }
}

export function calculateBMR(m: Measurements): number {
  const { weight, height, age, gender } = m
  if (gender === 'Female') {
    return 10 * weight + 6.25 * height - 5 * age - 161
  }
  return 10 * weight + 6.25 * height - 5 * age + 5
}

export function calculateResults(m: Measurements): FitnessResults {
  const bodyFatPercent = calculateBodyFat(m)
  const bodyFatCategory = getBodyFatCategory(bodyFatPercent, m.gender)
  const bmr = calculateBMR(m)
  const tdee = bmr * ACTIVITY_MULTIPLIERS[m.activityLevel]

  let deficit = 0
  if (m.goal === 'Weight loss') deficit = -400
  else if (m.goal === 'Muscle gain') deficit = 300
  else if (m.goal === 'Athletic performance') deficit = 200

  const dailyCalories = tdee + deficit
  const caloriesToBurn = Math.abs(deficit)

  const protein = Math.round(m.weight * (m.goal === 'Muscle gain' ? 2.2 : 2.0))
  const fat = Math.round(dailyCalories * 0.25 / 9)
  const fiber = m.gender === 'Female' ? 25 : 38
  const carbs = Math.max(0, Math.round((dailyCalories - protein * 4 - fat * 9) / 4))

  const weightDiff = Math.abs(m.weight - m.targetWeight)
  const weeklyLoss = 0.5
  const weeksToGoal = weightDiff > 0.5 ? Math.round(weightDiff / weeklyLoss) : 0

  const fatMass = parseFloat(((m.weight * bodyFatPercent) / 100).toFixed(1))
  const leanMass = parseFloat((m.weight - fatMass).toFixed(1))

  return {
    bodyFatPercent, bodyFatCategory, bmr: Math.round(bmr),
    tdee: Math.round(tdee), dailyCalories: Math.round(dailyCalories),
    deficit, protein, carbs, fat, fiber, caloriesToBurn, weeksToGoal,
    leanMass, fatMass
  }
}

export function convertToMetric(value: number, type: 'weight' | 'height' | 'measurement'): number {
  if (type === 'weight') return parseFloat((value * 0.453592).toFixed(1))
  if (type === 'height') return parseFloat((value * 2.54).toFixed(1))
  return parseFloat((value * 2.54).toFixed(1))
}
