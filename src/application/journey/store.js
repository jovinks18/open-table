const clone = (value) => structuredClone(value)

export const JOURNEY_STATE_VERSION = 1

export const initialJourneyState = Object.freeze({
  version: JOURNEY_STATE_VERSION,
  mode: 'preview',
  currentScreen: 'welcome',
  applicant: {
    fullName: '',
    introductionName: '',
    dateOfBirth: { day: '', month: '', year: '' },
    gender: '',
    seeking: '',
    interestedIn: '',
    currentCity: '',
    email: '',
    countryCode: '🇮🇳 +91',
    phone: '',
    chapterOne: {
      intent: '',
      marriageTimeline: '',
      familySearchInvolvement: '',
      familyDecisionInfluence: '',
      meetingReadiness: '',
    },
    intent: '',
    marriageTimeline: '',
    availableWithinFourWeeks: '',
    preferredAge: { minimum: 25, maximum: 40 },
    occupation: '',
    employer: '',
    industry: '',
    highestDegree: '',
    institution: '',
    languages: [],
    height: { unit: 'ft', feet: '', inches: '', centimeters: '' },
    linkedinUrl: '',
    livingSituation: '',
    livingSituationOther: '',
    relocationCities: [],
    willingToRelocate: '',
    hasChildren: '',
    wantsChildren: '',
    childrenNonNegotiable: '',
    maritalStatus: '',
    faithBackground: '',
    sharedBackgroundImportance: 50,
    diet: '',
    drinking: '',
    smoking: '',
    nonNegotiables: '',
    partnershipRole: '',
    friendsDescribe: '',
    friendsTease: '',
    ordinaryEvening: '',
    relationshipLearning: '',
    anythingElse: '',
  },
})

function setAtPath(target, path, value) {
  const parts = path.split('.')
  const finalPart = parts.pop()
  const parent = parts.reduce((cursor, part) => cursor[part], target)
  parent[finalPart] = value
}

export function createJourneyStore(seed = initialJourneyState) {
  let state = clone(seed)
  const subscribers = new Set()

  const notify = (change) => {
    const snapshot = clone(state)
    subscribers.forEach((subscriber) => subscriber(snapshot, change))
  }

  return Object.freeze({
    getState: () => clone(state),
    setField(path, value) {
      setAtPath(state, path, value)
      notify({ type: 'field', path, value: clone(value) })
    },
    setScreen(screenId) {
      state.currentScreen = screenId
      notify({ type: 'screen', screenId })
    },
    subscribe(subscriber) {
      subscribers.add(subscriber)
      return () => subscribers.delete(subscriber)
    },
    serialize: () => JSON.stringify(state),
    reset() {
      state = clone(initialJourneyState)
      notify({ type: 'reset' })
    },
  })
}

export const journeyStore = createJourneyStore()
