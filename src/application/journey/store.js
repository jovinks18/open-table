const clone = (value) => structuredClone(value)

export const JOURNEY_STATE_VERSION = 2

export const initialJourneyState = Object.freeze({
  version: JOURNEY_STATE_VERSION,
  mode: 'preview',
  currentScreen: 'welcome',
  applicant: {
    intent: '', marriageTimeline: '', meetingReadiness: '',
    preferredAge: { minimum: 25, maximum: 40 },
    gender: '', genderDescription: '', seeking: '',
    familySearchInvolvement: '', familyDecisionInfluence: '',
    fullName: '', dateOfBirth: { day: '', month: '', year: '' }, phone: '', email: '',
    currentCity: '', livingSituation: '', livingSituationOther: '',
    willingToRelocate: '', relocationCities: [], postMarriageLiving: '', postMarriageLivingOther: '',
    maritalStatus: '', priorRelationshipEnd: { month: '', year: '' },
    hasChildren: '', childrenCount: '', wantsChildren: '', openToPartnerWithChildren: '',
    occupation: '', industry: '', highestDegree: '', annualIncome: '', languages: [],
    height: { unit: 'ft', feet: '', inches: '', centimeters: '' }, linkedinUrl: '',
    faithBackground: '', faithBackgroundOther: '', faithPresence: '', interfaithOpenness: '',
    interfaithConditions: '', familyInterfaithView: '', castePreference: '',
    diet: '', dietOther: '', drinking: '', smoking: '',
    reflectiveEase: '', reflectiveOrdinaryWeek: '', reflectiveConflict: '',
    nonNegotiables: [], familyRequirement: '', familyRequirementDetail: '', boundariesConfirmed: '',
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
    reset() {
      state = clone(initialJourneyState)
      notify({ type: 'reset' })
    },
  })
}

export const journeyStore = createJourneyStore()
