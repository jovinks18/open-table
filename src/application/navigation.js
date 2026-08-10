export const GATEWAY_STEP = -1

export function getProgressState(stepIndex, steps) {
  if (stepIndex === GATEWAY_STEP) return null
  const totalSteps = Array.isArray(steps) ? steps.length : steps
  if (!Number.isInteger(stepIndex) || stepIndex < 0 || stepIndex >= totalSteps) return null

  const current = stepIndex + 1
  const title = Array.isArray(steps) ? steps[stepIndex].title : ''
  return Object.freeze({
    current,
    total: totalSteps,
    title,
    label: title ? `Section ${current} of ${totalSteps} — ${title}` : `Section ${current} of ${totalSteps}`,
    ariaLabel: title
      ? `Application progress: section ${current} of ${totalSteps}, ${title}`
      : `Application progress: section ${current} of ${totalSteps}`,
  })
}

export function clampApplicationStep(stepIndex, totalSteps) {
  return Math.max(GATEWAY_STEP, Math.min(stepIndex, totalSteps - 1))
}
