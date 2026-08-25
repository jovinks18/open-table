const previewResult = Object.freeze({
  ok: false,
  status: 'preview-only',
  message: 'Application transport is not configured.',
})

// This is the only boundary the journey should use for a future backend.
// It intentionally performs no network, storage, or upload operations today.
export const journeyApi = Object.freeze({
  configured: false,
  saveDraft: async () => previewResult,
  submitApplication: async () => previewResult,
  createPhotoUpload: async () => previewResult,
})
