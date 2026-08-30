export const applicationFieldPaths = Object.freeze([
  'applicant.intent', 'applicant.marriageTimeline', 'applicant.meetingReadiness',
  'applicant.preferredAge.minimum', 'applicant.preferredAge.maximum',
  'applicant.gender', 'applicant.genderDescription', 'applicant.seeking',
  'applicant.familySearchInvolvement', 'applicant.familyDecisionInfluence',
  'applicant.fullName', 'applicant.dateOfBirth', 'applicant.phone', 'applicant.email',
  'applicant.currentCity', 'applicant.livingSituation', 'applicant.livingSituationOther',
  'applicant.willingToRelocate', 'applicant.relocationCities',
  'applicant.postMarriageLiving', 'applicant.postMarriageLivingOther',
  'applicant.maritalStatus', 'applicant.priorRelationshipEnd', 'applicant.hasChildren',
  'applicant.childrenCount', 'applicant.wantsChildren', 'applicant.openToPartnerWithChildren',
  'applicant.occupation', 'applicant.industry', 'applicant.highestDegree',
  'applicant.annualIncome', 'applicant.languages', 'applicant.height', 'applicant.linkedinUrl',
  'applicant.faithBackground', 'applicant.faithBackgroundOther', 'applicant.faithPresence',
  'applicant.interfaithOpenness', 'applicant.interfaithConditions',
  'applicant.familyInterfaithView', 'applicant.castePreference',
  'applicant.diet', 'applicant.dietOther', 'applicant.drinking', 'applicant.smoking',
  'applicant.reflectiveEase', 'applicant.reflectiveOrdinaryWeek', 'applicant.reflectiveConflict',
  'applicant.nonNegotiables', 'applicant.familyRequirement',
  'applicant.familyRequirementDetail', 'applicant.boundariesConfirmed',
  'applicant.photographs', 'applicant.consents',
])

export const fieldBindings = Object.freeze(applicationFieldPaths.map((path) => Object.freeze({ path })))
