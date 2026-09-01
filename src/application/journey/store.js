const clone = (value) => structuredClone(value)

export const JOURNEY_STATE_VERSION = 3

export const initialJourneyState = Object.freeze({
  version: JOURNEY_STATE_VERSION,
  mode: 'preview',
  currentScreen: 'signup-choice',
  path: '',
  nominator: {
    fullName: '', email: '', linkedinUrl: '',
    nomineeName: '', nomineeSeeking: '', nomineeReason: '', nomineeRelationship: '',
    sealed: false,
  },
  applicant: {
    relationshipIntent: '', marriageTimeline: '', meetingReadiness: '',
    preferredAge: { minimum: 25, maximum: 40 },
    gender: '', seeking: '',
    familyDecisionInfluence: '',
    fullName: '', dateOfBirth: { day: '', month: '', year: '' }, phone: '', email: '',
    currentCity: '', currentCityOther: '', willingToRelocate: '', relocationCities: [], postMarriageLiving: '',
    maritalStatus: '', hasChildren: '', wantsChildren: '',
    occupation: '', highestDegree: '', annualIncome: '', languages: [],
    height: { unit: 'ft', feet: '', inches: '', centimeters: '' }, linkedinUrl: '',
    faithBackground: '', faithPresence: '', interfaithOpenness: '',
    familyInterfaithView: '', castePreference: '', castePreferenceDetail: '',
    diet: '',
    reflectiveTuesday: '', reflectiveOrdinaryWeek: '', reflectiveLearning: '', reflectiveEase: '',
    nonNegotiables: '', familyRequirement: '', familyRequirementDetail: '',
    photographs: { face: null, fullLength: null, ordinaryLife: null },
    consents: {
      informationAccurate: false,
      personReadsApplication: false,
      photographStorage: false,
      writtenAnswers: false,
      noGuarantee: false,
      legalDocuments: false,
    },
  },
})

function setAtPath(target, path, value) {
  const parts = path.split('.')
  const finalPart = parts.pop()
  const parent = parts.reduce((cursor, part) => cursor[part], target)
  parent[finalPart] = value
}

export function valueAtPath(target, path) {
  return path.split('.').reduce((value, part) => value?.[part], target)
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
    hydrate(next) {
      state = clone(next)
      notify({ type: 'hydrate' })
    },
    reset() {
      state = clone(initialJourneyState)
      notify({ type: 'reset' })
    },
  })
}

export const journeyStore = createJourneyStore()
