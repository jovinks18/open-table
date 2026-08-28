export const PREFERRED_AGE_FLOOR = 22

function clampOffset(value) {
  return Math.max(0, Math.min(20, Number(value) || 0))
}

export function calculateAnchoredAgeRange(age, yearsYounger, yearsOlder) {
  const anchorAge = Number(age)
  const younger = clampOffset(yearsYounger)
  const older = clampOffset(yearsOlder)
  const rawMinimum = anchorAge - younger
  const rawMaximum = anchorAge + older
  const minimum = Math.max(PREFERRED_AGE_FLOOR, rawMinimum)
  const maximum = Math.max(minimum + 1, rawMaximum)

  return { minimum, maximum }
}
