export const APPLICATION_GATEWAY = Object.freeze({
  eyebrow: 'Private application · 25+',
  title: 'A thoughtful introduction starts with being known.',
  supportingCopy: 'Tell donna enough to understand who you are, what matters to you and who may genuinely fit. Every application is reviewed by a person—not an algorithm.',
  pilotDisclaimer: 'donna is a limited, manually operated pilot. Applying does not guarantee acceptance, a match or an introduction.',
  beforeBegin: Object.freeze([
    'About twelve minutes, in one sitting.',
    'Your LinkedIn profile URL.',
    'Two recent photographs — one clear photo of your face, one from everyday life.',
  ]),
  privacyCopy: 'Your details stay private, you approve every introduction, and you can withdraw at any time.',
  nextSteps: Object.freeze([
    Object.freeze({ title: 'donna reviews', copy: 'Your application and LinkedIn profile are reviewed privately and manually.' }),
    Object.freeze({ title: 'donna asks', copy: 'If there may be a thoughtful introduction, donna approaches each person separately.' }),
    Object.freeze({ title: 'You decide', copy: 'Your profile is shared only after you agree. Mutual interest leads to an introduction.' }),
  ]),
})

const INDUSTRY_OPTIONS = Object.freeze([
  ['technology', 'Technology and software'],
  ['financial_services', 'Financial services'],
  ['consulting', 'Consulting'],
  ['healthcare', 'Healthcare and life sciences'],
  ['legal', 'Legal'],
  ['academia_research', 'Academia and research'],
  ['media_creative', 'Media, design and creative'],
  ['manufacturing_industrial', 'Manufacturing and industrial'],
  ['retail_consumer', 'Retail and consumer'],
  ['real_estate_construction', 'Real estate and construction'],
  ['education', 'Education'],
  ['government_public', 'Government and public sector'],
  ['nonprofit', 'Non-profit and social sector'],
  ['entrepreneurship', 'Founder or self-employed'],
  ['other', 'Other'],
])

const LANGUAGE_OPTIONS = Object.freeze([
  ['english', 'English'],
  ['hindi', 'Hindi'],
  ['kannada', 'Kannada'],
  ['tamil', 'Tamil'],
  ['telugu', 'Telugu'],
  ['malayalam', 'Malayalam'],
  ['marathi', 'Marathi'],
  ['bengali', 'Bengali'],
  ['gujarati', 'Gujarati'],
  ['punjabi', 'Punjabi'],
  ['urdu', 'Urdu'],
  ['konkani', 'Konkani'],
  ['tulu', 'Tulu'],
  ['odia', 'Odia'],
  ['assamese', 'Assamese'],
  ['other', 'Other'],
])

const FAITH_OPTIONS = Object.freeze([
  ['hindu', 'Hindu'],
  ['muslim', 'Muslim'],
  ['christian', 'Christian'],
  ['sikh', 'Sikh'],
  ['jain', 'Jain'],
  ['buddhist', 'Buddhist'],
  ['parsi', 'Parsi'],
  ['jewish', 'Jewish'],
  ['spiritual_not_religious', 'Spiritual but not religious'],
  ['agnostic_atheist', 'Agnostic or atheist'],
  ['other', 'Other'],
  ['prefer_not_to_say', 'Prefer not to say'],
])

const CITY_OPTIONS = Object.freeze([
  ['bangalore', 'Bangalore'],
  ['mumbai', 'Mumbai'],
  ['delhi_ncr', 'Delhi NCR'],
  ['hyderabad', 'Hyderabad'],
  ['chennai', 'Chennai'],
  ['pune', 'Pune'],
  ['kolkata', 'Kolkata'],
  ['ahmedabad', 'Ahmedabad'],
  ['jaipur', 'Jaipur'],
  ['chandigarh', 'Chandigarh'],
  ['kochi', 'Kochi'],
  ['other', 'Other'],
])

const AGE_OPTIONS = Object.freeze(Array.from({ length: 46 }, (_, index) => {
  const age = String(index + 25)
  return [age, age]
}))

export const APPLICATION_STEPS = Object.freeze([
  Object.freeze({
    id: 'eligibility',
    title: 'Eligibility',
    description: 'A few basics to check that donna is the right fit right now.',
    framing: 'Before anything else — a few quick questions to make sure donna can actually help you right now. Under a minute.',
    durationNote: "This takes about twelve minutes. It's longer than an app because a person reads every answer.",
    fields: Object.freeze([
      { name: 'dateOfBirth', label: 'Date of birth', type: 'date', required: true, autocomplete: 'bday' },
      { name: 'currentCity', label: 'Current city', type: 'single_select', required: true, options: CITY_OPTIONS },
      { name: 'currentCityOther', label: 'Which city?', type: 'text', required: true, condition: { field: 'currentCity', equals: 'other' } },
      { name: 'gender', label: 'I am', type: 'single_select', required: true, options: [['woman', 'Woman'], ['man', 'Man'], ['self_describe', "I'd rather describe it myself"]] },
      { name: 'genderSelfDescribe', label: 'How would you describe it?', type: 'text', required: true, condition: { field: 'gender', equals: 'self_describe' } },
      { name: 'interestedIn', label: 'I would like to meet', type: 'single_select', required: true, options: [['women', 'Women'], ['men', 'Men'], ['both', 'Both']] },
      { name: 'intent', label: 'What are you looking for?', type: 'single_select', required: true, options: [['marriage', 'Marriage'], ['longterm_open_to_marriage', "A long-term relationship, and I'm open to marriage"]] },
      { name: 'timeline', label: 'If you met the right person, what feels like the right timeline?', type: 'single_select', required: true, options: [['within_year', 'Within the next year'], ['one_to_two_years', 'In the next one to two years'], ['not_sure', "I'm not sure yet, but I'm looking seriously"]] },
      { name: 'availableWithinFourWeeks', label: 'Are you realistically available to meet someone in person within the next four weeks?', type: 'single_select', required: true, options: [['yes', 'Yes'], ['not_right_now', 'Not right now']] },
    ]),
  }),
  Object.freeze({
    id: 'about-you',
    title: 'About you',
    description: "A person reads every application. This is how they'll reach you.",
    fields: Object.freeze([
      { name: 'fullName', label: 'Full name', type: 'text', required: true, autocomplete: 'name' },
      { name: 'sharedFirstName', label: "First name you'd be comfortable sharing with an approved introduction", type: 'text', required: true, autocomplete: 'given-name' },
      { name: 'email', label: 'Email address', type: 'email', required: true, autocomplete: 'email' },
      { name: 'phone', label: 'Phone or WhatsApp number, including country code', type: 'tel', required: true, autocomplete: 'tel', placeholder: '+91 98765 43210' },
      { name: 'linkedinUrl', label: 'LinkedIn profile URL', type: 'url', required: true, autocomplete: 'url', helpText: 'donna reviews your LinkedIn to confirm you are who you say you are. It is never shared without your permission.', placeholder: 'https://www.linkedin.com/in/your-name' },
    ]),
  }),
  Object.freeze({
    id: 'your-life',
    title: 'Your life',
    description: "None of this is used to filter you out. It's how donna understands who you are.",
    fields: Object.freeze([
      { name: 'occupation', label: 'Occupation or current role', type: 'text', required: true, autocomplete: 'organization-title' },
      { name: 'employer', label: 'Employer or organisation', type: 'text', required: true, autocomplete: 'organization' },
      { name: 'industry', label: 'Industry', type: 'single_select', required: true, options: INDUSTRY_OPTIONS },
      { name: 'industryOther', label: 'Which industry?', type: 'text', required: true, condition: { field: 'industry', equals: 'other' } },
      { name: 'highestDegree', label: 'Highest degree', type: 'single_select', required: true, options: [['bachelors', "Bachelor's"], ['masters', "Master's"], ['doctorate', 'Doctorate'], ['professional', 'Professional qualification'], ['other', 'Other']] },
      { name: 'institution', label: 'Where did you study?', type: 'text', required: false },
      { name: 'languages', label: "Languages you're comfortable in", type: 'multi_select', required: true, minSelections: 1, options: LANGUAGE_OPTIONS },
      { name: 'languagesOther', label: 'Which other languages?', type: 'text', required: true, condition: { field: 'languages', includes: 'other' } },
      { name: 'heightCm', inputNames: ['heightFeet', 'heightInches'], label: 'Height', type: 'height', required: true },
      { name: 'faithBackground', label: 'Faith or community background', type: 'single_select', required: true, options: FAITH_OPTIONS, helpText: "donna doesn't filter anyone out on background. Your answer below tells us how much weight it carries for you." },
      { name: 'faithBackgroundOther', label: 'How would you describe it?', type: 'text', required: false, condition: { field: 'faithBackground', equals: 'other' } },
      { name: 'sharedBackgroundImportance', label: 'How much does shared background matter to you?', type: 'single_select', required: true, options: [['a_lot', 'A lot'], ['somewhat', 'Somewhat'], ['not_much', 'Not much'], ['prefer_not_to_say', 'Prefer not to say']] },
      { name: 'diet', label: 'Diet', type: 'single_select', required: true, options: [['vegetarian', 'Vegetarian'], ['non_vegetarian', 'Non-vegetarian'], ['eggetarian', 'Eggetarian'], ['jain', 'Jain'], ['vegan', 'Vegan']] },
      { name: 'drinking', label: 'Drinking', type: 'single_select', required: true, options: [['never', 'Never'], ['socially', 'Socially'], ['regularly', 'Regularly']] },
      { name: 'smoking', label: 'Smoking', type: 'single_select', required: true, options: [['never', 'Never'], ['socially', 'Socially'], ['regularly', 'Regularly']] },
      { name: 'livingSituation', label: 'Living situation', type: 'single_select', required: true, options: [['alone', 'On my own'], ['with_family', 'With family'], ['with_flatmates', 'With flatmates']] },
      { name: 'maritalStatus', label: 'Have you been married before?', type: 'single_select', required: true, options: [['never_married', 'Never married'], ['divorced', 'Divorced'], ['widowed', 'Widowed']] },
    ]),
  }),
  Object.freeze({
    id: 'what-wouldnt-work',
    title: "What wouldn't work",
    description: "donna doesn't match on checklists. This section is the exception — these are the things that genuinely rule someone out.",
    fields: Object.freeze([
      { name: 'ageRangeMin', label: 'From', group: 'ageRange', groupLabel: "Age range you'd consider", type: 'single_select', required: true, options: AGE_OPTIONS },
      { name: 'ageRangeMax', label: 'To', group: 'ageRange', type: 'single_select', required: true, options: AGE_OPTIONS },
      { name: 'citiesConsidered', label: "Cities you'd consider", type: 'multi_select', required: true, minSelections: 1, options: CITY_OPTIONS },
      { name: 'citiesConsideredOther', label: 'Which other cities?', type: 'text', required: true, condition: { field: 'citiesConsidered', includes: 'other' } },
      { name: 'willingToRelocate', label: 'Would you relocate for the right person?', type: 'single_select', required: true, options: [['yes', 'Yes'], ['for_the_right_person', 'For the right person'], ['no', 'No']] },
      { name: 'hasChildren', label: 'Do you have children?', type: 'single_select', required: true, options: [['no', 'No'], ['yes_living_with_me', 'Yes, living with me'], ['yes_not_living_with_me', 'Yes, not living with me']] },
      { name: 'wantsChildren', label: 'Would you like children in the future?', type: 'single_select', required: true, options: [['yes', 'Yes'], ['no', 'No'], ['open', 'Open to it'], ['not_sure', 'Not sure yet']] },
      { name: 'childrenNonNegotiable', label: "Is this something you'd consider non-negotiable?", type: 'single_select', required: true, options: [['yes', 'Yes, this would rule someone out'], ['no', "No, I'd stay open"]] },
      { name: 'nonNegotiables', label: 'Up to three things that would genuinely rule someone out', type: 'string[]', required: false, maxItems: 3, maxLength: 120, helpText: "Be honest and be specific. This is the only place donna takes a preference literally. Everything else you've told us is used to understand you, not to filter." },
    ]),
  }),
  Object.freeze({
    id: 'in-your-words',
    title: 'In your words',
    description: 'This is the part a person actually reads. Take your time — four questions, and there are no right answers.',
    fields: Object.freeze([
      { name: 'partnerRole', label: "What does your partner's role in your life look like?", type: 'textarea', required: true, maxLength: 600, rows: 6 },
      { name: 'friendsDescribe', label: 'How would your closest friends describe you? And what would they tease you about?', type: 'textarea', required: true, maxLength: 600, rows: 6 },
      { name: 'tuesdayEvening', label: 'What does an ordinary Tuesday evening look like for you?', type: 'textarea', required: true, maxLength: 600, rows: 6 },
      { name: 'learnedAboutSelf', label: 'What have you learned about yourself from a past relationship, or from looking for one?', type: 'textarea', required: true, maxLength: 600, rows: 6 },
      { name: 'anythingElse', label: 'Anything else donna should understand before considering an introduction?', type: 'textarea', required: false, maxLength: 600, rows: 6 },
    ]),
  }),
  Object.freeze({ id: 'photographs', title: 'Photographs', description: "Two are required. They're stored privately and reviewed by a person, never published.", fields: Object.freeze([]) }),
  Object.freeze({ id: 'review-and-consent', title: 'Review and consent', description: '', fields: Object.freeze([]) }),
])

export const PHOTO_SLOTS = Object.freeze([
  { id: 'photoFace', label: 'A recent, clear photograph of your face', required: true },
  { id: 'photoEveryday', label: 'A recent photograph from everyday life', required: true },
  { id: 'photoOptionalOne', label: 'An additional photograph', required: false },
  { id: 'photoOptionalTwo', label: 'An additional photograph', required: false },
])

export const PHOTO_SHARE_CONSENT = 'donna may share this photograph with a person it is considering introducing you to.'

export const CONSENT_SCHEMA = Object.freeze([
  { name: 'informationAccurate', required: true, label: "The information I've given is accurate." },
  { name: 'personReadsApplication', required: true, label: 'I understand a person at donna will read my application and consider me for introductions.' },
  { name: 'linkedinReview', required: true, label: 'I understand donna may review my LinkedIn profile to confirm my identity.' },
  { name: 'photographStorage', required: true, label: 'I consent to donna storing my photographs privately for review.' },
  { name: 'writtenAnswers', required: true, label: "I understand my written answers are read by donna's team and are used to consider and describe potential introductions." },
  { name: 'noGuarantee', required: true, label: 'I understand applying does not guarantee acceptance or an introduction.' },
  { name: 'legalDocuments', required: true, label: 'I have read the Privacy Notice and the Pilot Terms.', legal: true },
  { name: 'updates', required: false, label: 'Send me occasional updates from donna.', optional: true },
])

export const ACCEPTED_PHOTO_TYPES = Object.freeze(['image/jpeg', 'image/png', 'image/webp'])
export const MAX_PHOTO_SIZE_BYTES = 10 * 1024 * 1024

export const DATA_FIELDS = Object.freeze(
  APPLICATION_STEPS.flatMap((step) => step.fields.map((field) => field.name)),
)
