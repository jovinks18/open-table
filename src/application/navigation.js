export const GATEWAY_STEP = -1

export function getProgressState(stepIndex, totalSteps) {
  if (stepIndex === GATEWAY_STEP) return null
  if (!Number.isInteger(stepIndex) || stepIndex < 0 || stepIndex >= totalSteps) return null

  const current = stepIndex + 1
  return Object.freeze({
    current,
    total: totalSteps,
    label: `Step ${current} of ${totalSteps}`,
    ariaLabel: `Application progress: step ${current} of ${totalSteps}`,
  })
}

export function clampApplicationStep(stepIndex, totalSteps) {
  return Math.max(GATEWAY_STEP, Math.min(stepIndex, totalSteps - 1))
}
