export const GATEWAY_STEP = -1

export function clampApplicationStep(stepIndex, totalSteps) {
  return Math.max(GATEWAY_STEP, Math.min(stepIndex, totalSteps - 1))
}

export function buildProgressLabel({ current, total }) {
  return Object.freeze({
    current,
    total,
    ariaLabel: `Application progress: step ${current} of ${total}`,
  })
}
