export const nominatorFieldPaths = Object.freeze([
  'nominator.nomineeName', 'nominator.nomineeContact', 'nominator.nomineeReason',
  'nominator.fullName', 'nominator.contact',
])

export const applicationFieldPaths = Object.freeze([
  'applicant.relationshipIntent', 'applicant.marriageTimeline', 'applicant.meetingReadiness',
  'applicant.preferredAge.minimum', 'applicant.preferredAge.maximum',
  'applicant.gender', 'applicant.seeking', 'applicant.familyDecisionInfluence',
  'applicant.fullName', 'applicant.dateOfBirth', 'applicant.phone', 'applicant.email',
  'applicant.currentCity', 'applicant.currentCityOther',
  'applicant.willingToRelocate', 'applicant.relocationCities', 'applicant.postMarriageLiving',
  'applicant.maritalStatus', 'applicant.hasChildren',
  'applicant.wantsChildren',
  'applicant.occupation', 'applicant.highestDegree',
  'applicant.annualIncome', 'applicant.languages', 'applicant.height', 'applicant.linkedinUrl',
  'applicant.faithBackground', 'applicant.faithPresence',
  'applicant.interfaithOpenness', 'applicant.familyInterfaithView',
  'applicant.castePreference', 'applicant.castePreferenceDetail',
  'applicant.diet',
  'applicant.reflectiveTuesday', 'applicant.reflectiveOrdinaryWeek',
  'applicant.reflectiveLearning', 'applicant.reflectiveEase',
  'applicant.nonNegotiables', 'applicant.familyRequirement', 'applicant.familyRequirementDetail',
  'applicant.photographs', 'applicant.consents',
])

export const fieldBindings = Object.freeze(applicationFieldPaths.map((path) => Object.freeze({ path })))
