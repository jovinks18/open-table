export const nominatorFieldPaths = Object.freeze([
  'nominator.fullName', 'nominator.email', 'nominator.linkedinUrl',
  'nominator.nomineeName', 'nominator.nomineeSeeking',
  'nominator.nomineeReason', 'nominator.nomineeRelationship',
])

export const applicationFieldPaths = Object.freeze([
  'applicant.marriageTimeline', 'applicant.meetingReadiness',
  'applicant.preferredAge.minimum', 'applicant.preferredAge.maximum',
  'applicant.gender', 'applicant.seeking',
  'applicant.familySearchInvolvement', 'applicant.familyDecisionInfluence',
  'applicant.fullName', 'applicant.dateOfBirth', 'applicant.phone', 'applicant.email',
  'applicant.currentCity', 'applicant.currentCityOther', 'applicant.livingSituation',
  'applicant.willingToRelocate', 'applicant.relocationCities',
  'applicant.postMarriageLiving',
  'applicant.maritalStatus', 'applicant.hasChildren',
  'applicant.wantsChildren', 'applicant.bothWorking',
  'applicant.occupation', 'applicant.highestDegree',
  'applicant.annualIncome', 'applicant.languages', 'applicant.height', 'applicant.linkedinUrl',
  'applicant.faithBackground', 'applicant.faithPresence',
  'applicant.interfaithOpenness', 'applicant.familyInterfaithView',
  'applicant.castePreference', 'applicant.castePreferenceDetail',
  'applicant.diet',
  'applicant.reflectiveTuesday', 'applicant.reflectiveOrdinaryWeek',
  'applicant.reflectiveEase', 'applicant.reflectiveConflict',
  'applicant.oneThingToKnow',
  'applicant.nonNegotiables', 'applicant.familyRequirement',
  'applicant.photographs', 'applicant.consents',
])

export const fieldBindings = Object.freeze(applicationFieldPaths.map((path) => Object.freeze({ path })))
