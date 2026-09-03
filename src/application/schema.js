export const APPLICATION_GATEWAY = Object.freeze({
  eyebrow: 'Private application · 25+',
  title: 'A thoughtful introduction starts with being known.',
  supportingCopy: 'Tell donna enough to understand who you are, what matters to you and who may genuinely fit. Every application is reviewed by a person—not an algorithm.',
  pilotDisclaimer: 'donna is manually operated. Applying does not guarantee acceptance, a match or an introduction.',
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

// Verbatim per Part B4 of the redesign spec. 'Not financially independent' is
// intentionally excluded — see the redesign report.
const NON_NEGOTIABLE_CHIPS = Object.freeze([
  'Smoking',
  'Heavy drinking',
  'Unwillingness to relocate',
  "Doesn't want children",
  'Different views on marriage timeline',
  'Long-distance',
  'Different faith background',
])

// Each chapter is presented as several short screens (Part A2 of the redesign
// spec). Chapter and screen structure is presentation-only grouping; field
// keys, options, labels and validation are unchanged from the prior schema
// except the Part A5 split of friendsDescribe into friendsDescribe/friendsTease.
const CHAPTER_DEFS = Object.freeze([
  Object.freeze({
    roman: 'I',
    title: "Let's start with you",
    screens: Object.freeze([
      Object.freeze({
        id: 'ch1-s1',
        headline: 'Who are we talking to?',
        donnaLine: "Hi, I'm donna. Let's start with the basics — who are we talking to?",
        framing: 'A person reads every answer. This takes about twelve minutes — take it at your own pace.',
        fields: Object.freeze([
          { name: 'fullName', label: 'Full name', type: 'text', required: true, autocomplete: 'name' },
          { name: 'sharedFirstName', label: "First name you'd be comfortable sharing with an approved introduction", type: 'text', required: true, autocomplete: 'given-name' },
          { name: 'dateOfBirth', label: 'Date of birth', type: 'date', required: true, autocomplete: 'bday' },
          { name: 'gender', label: 'I am', type: 'single_select', required: true, options: [['woman', 'Woman'], ['man', 'Man'], ['self_describe', "I'd rather describe it myself"]] },
          { name: 'genderSelfDescribe', label: 'How would you describe it?', type: 'text', required: true, condition: { field: 'gender', equals: 'self_describe' } },
          { name: 'interestedIn', label: 'I would like to meet', type: 'single_select', required: true, options: [['women', 'Women'], ['men', 'Men'], ['both', 'Both']] },
        ]),
      }),
      Object.freeze({
        id: 'ch1-s2',
        headline: 'Last thing for now',
        donnaLine: 'Last stretch — where should I picture you, and how do we reach you?',
        framing: 'Private, and only ever used by our team to reach you.',
        fields: Object.freeze([
          { name: 'currentCity', label: 'Current city', type: 'single_select', required: true, options: CITY_OPTIONS },
          { name: 'currentCityOther', label: 'Which city?', type: 'text', required: true, condition: { field: 'currentCity', equals: 'other' } },
          { name: 'email', label: 'Email address', type: 'email', required: true, autocomplete: 'email' },
          { name: 'phone', label: 'Phone or WhatsApp number, including country code', type: 'tel', required: true, autocomplete: 'tel', placeholder: '+91 98765 43210' },
        ]),
        interstitial: Object.freeze({
          heading: 'Chapter one, done.',
          body: "Two quick screens, and that's the easy part out of the way. Next, I want to understand why you're really here.",
          buttonLabel: 'Continue to Chapter II',
        }),
      }),
    ]),
  }),
  Object.freeze({
    roman: 'II',
    title: 'Why are you here?',
    screens: Object.freeze([
      Object.freeze({
        id: 'ch2-s1',
        headline: 'Why are you here?',
        donnaLine: "Let's talk about why you're actually here — no need to overthink this one.",
        framing: 'This helps me understand the kind of introduction you\'re ready for.',
        fields: Object.freeze([
          { name: 'intent', label: 'What are you looking for?', type: 'single_select', required: true, options: [['marriage', 'Marriage'], ['longterm_open_to_marriage', "A long-term relationship, and I'm open to marriage"]] },
          { name: 'timeline', label: 'If you met the right person, what feels like the right timeline?', type: 'single_select', required: true, options: [['within_year', 'Within the next year'], ['one_to_two_years', 'In the next one to two years'], ['not_sure', "I'm not sure yet, but I'm looking seriously"]] },
          { name: 'availableWithinFourWeeks', label: 'Are you realistically available to meet someone in person within the next four weeks?', type: 'single_select', required: true, options: [['yes', 'Yes'], ['not_right_now', 'Not right now']] },
          { name: 'ageRangeMin', label: 'From', group: 'ageRange', groupLabel: "Age range you'd consider", type: 'single_select', required: true, options: AGE_OPTIONS },
          { name: 'ageRangeMax', label: 'To', group: 'ageRange', type: 'single_select', required: true, options: AGE_OPTIONS },
        ]),
      }),
    ]),
  }),
  Object.freeze({
    roman: 'III',
    title: 'Your world',
    screens: Object.freeze([
      Object.freeze({
        id: 'ch3-s1',
        headline: 'What do you do?',
        donnaLine: 'Now tell me a little about what fills your days.',
        framing: "Career and education say a lot about the life you've built.",
        fields: Object.freeze([
          { name: 'occupation', label: 'Occupation or current role', type: 'text', required: true, autocomplete: 'organization-title' },
          { name: 'employer', label: 'Employer or organisation', type: 'text', required: true, autocomplete: 'organization' },
          { name: 'industry', label: 'Industry', type: 'single_select', required: true, options: INDUSTRY_OPTIONS },
          { name: 'industryOther', label: 'Which industry?', type: 'text', required: true, condition: { field: 'industry', equals: 'other' } },
          { name: 'highestDegree', label: 'Highest degree', type: 'single_select', required: true, options: [['bachelors', "Bachelor's"], ['masters', "Master's"], ['doctorate', 'Doctorate'], ['professional', 'Professional qualification'], ['other', 'Other']] },
          { name: 'institution', label: 'Where did you study?', type: 'text', required: false },
        ]),
      }),
      Object.freeze({
        id: 'ch3-s2',
        headline: 'A few more details',
        donnaLine: 'Almost through this chapter — a couple more practical things.',
        framing: 'donna reviews your LinkedIn to confirm you are who you say you are. It is never shared without your permission.',
        fields: Object.freeze([
          { name: 'languages', label: "Languages you're comfortable in", type: 'multi_select', required: true, minSelections: 1, options: LANGUAGE_OPTIONS },
          { name: 'languagesOther', label: 'Which other languages?', type: 'text', required: true, condition: { field: 'languages', includes: 'other' } },
          { name: 'heightCm', inputNames: ['heightFeet', 'heightInches'], label: 'Height', type: 'height', required: true },
          { name: 'linkedinUrl', label: 'LinkedIn profile URL', type: 'url', required: true, autocomplete: 'url', helpText: 'donna reviews your LinkedIn to confirm you are who you say you are. It is never shared without your permission.', placeholder: 'https://www.linkedin.com/in/your-name' },
        ]),
      }),
    ]),
  }),
  Object.freeze({
    roman: 'IV',
    title: "The life you're building",
    screens: Object.freeze([
      Object.freeze({
        id: 'ch4-s1',
        headline: "Where's home, really?",
        donnaLine: "Let's talk about where life is taking you.",
        framing: 'This helps me think about geography honestly, not just on paper.',
        fields: Object.freeze([
          { name: 'livingSituation', label: 'Living situation', type: 'single_select', required: true, options: [['alone', 'On my own'], ['with_family', 'With family'], ['with_flatmates', 'With flatmates']] },
          { name: 'citiesConsidered', label: "Cities you'd consider", type: 'multi_select', required: true, minSelections: 1, options: CITY_OPTIONS },
          { name: 'citiesConsideredOther', label: 'Which other cities?', type: 'text', required: true, condition: { field: 'citiesConsidered', includes: 'other' } },
          { name: 'willingToRelocate', label: 'Would you relocate for the right person?', type: 'single_select', required: true, options: [['yes', 'Yes'], ['for_the_right_person', 'For the right person'], ['no', 'No']] },
        ]),
      }),
      Object.freeze({
        id: 'ch4-s2',
        headline: 'On children',
        donnaLine: 'This next one matters — take your time with it.',
        framing: "There's no right answer here — just an honest one.",
        fields: Object.freeze([
          { name: 'hasChildren', label: 'Do you have children?', type: 'single_select', required: true, options: [['no', 'No'], ['yes_living_with_me', 'Yes, living with me'], ['yes_not_living_with_me', 'Yes, not living with me']] },
          { name: 'wantsChildren', label: 'Would you like children in the future?', type: 'single_select', required: true, options: [['yes', 'Yes'], ['no', 'No'], ['open', 'Open to it'], ['not_sure', 'Not sure yet']] },
          { name: 'childrenNonNegotiable', label: "Is this something you'd consider non-negotiable?", type: 'single_select', required: true, options: [['yes', 'Yes, this would rule someone out'], ['no', "No, I'd stay open"]] },
        ]),
      }),
    ]),
  }),
  Object.freeze({
    roman: 'V',
    title: 'What matters to you',
    screens: Object.freeze([
      Object.freeze({
        id: 'ch5-s1',
        headline: 'Background & values',
        donnaLine: "I'm not filtering you out here — just understanding what matters.",
        framing: "donna doesn't filter anyone out on background. Your answers tell me how much weight it carries for you.",
        fields: Object.freeze([
          { name: 'maritalStatus', label: 'Have you been married before?', type: 'single_select', required: true, options: [['never_married', 'Never married'], ['divorced', 'Divorced'], ['widowed', 'Widowed']] },
          { name: 'faithBackground', label: 'Faith or community background', type: 'single_select', required: true, options: FAITH_OPTIONS, helpText: "donna doesn't filter anyone out on background. Your answer below tells us how much weight it carries for you." },
          { name: 'faithBackgroundOther', label: 'How would you describe it?', type: 'text', required: false, condition: { field: 'faithBackground', equals: 'other' } },
          { name: 'sharedBackgroundImportance', label: 'How much does shared background matter to you?', type: 'single_select', required: true, options: [['a_lot', 'A lot'], ['somewhat', 'Somewhat'], ['not_much', 'Not much'], ['prefer_not_to_say', 'Prefer not to say']] },
        ]),
      }),
      Object.freeze({
        id: 'ch5-s2',
        headline: 'A little about your lifestyle',
        donnaLine: "Just a few lifestyle basics, then we're through this chapter.",
        framing: 'Nothing judged here, just noted.',
        fields: Object.freeze([
          { name: 'diet', label: 'Diet', type: 'single_select', required: true, options: [['vegetarian', 'Vegetarian'], ['non_vegetarian', 'Non-vegetarian'], ['eggetarian', 'Eggetarian'], ['jain', 'Jain'], ['vegan', 'Vegan']] },
          { name: 'drinking', label: 'Drinking', type: 'single_select', required: true, options: [['never', 'Never'], ['socially', 'Socially'], ['regularly', 'Regularly']] },
          { name: 'smoking', label: 'Smoking', type: 'single_select', required: true, options: [['never', 'Never'], ['socially', 'Socially'], ['regularly', 'Regularly']] },
        ]),
      }),
    ]),
  }),
  Object.freeze({
    roman: 'VI',
    title: 'Your boundaries',
    screens: Object.freeze([
      Object.freeze({
        id: 'ch6-s1',
        headline: 'Your non-negotiables',
        donnaLine: 'Now for the part where I get a little more direct — what would genuinely rule someone out?',
        framing: 'Up to three things — be specific. This is what keeps introductions worth your time.',
        fields: Object.freeze([
          {
            name: 'nonNegotiables',
            label: 'Up to three things that would genuinely rule someone out',
            type: 'string[]',
            required: false,
            maxItems: 3,
            maxLength: 120,
            helpText: "Be honest and be specific. This is the only place donna takes a preference literally. Everything else you've told us is used to understand you, not to filter.",
            chipHelperText: "Tap any that apply — they'll drop straight into the box above.",
            suggestionChips: NON_NEGOTIABLE_CHIPS,
          },
        ]),
      }),
    ]),
  }),
  Object.freeze({
    roman: 'VII',
    title: "The part donna can't put in a dropdown",
    screens: Object.freeze([
      Object.freeze({
        id: 'ch7-s1',
        headline: "What does your partner's role in your life look like?",
        donnaLine: "Okay, enough of the basics. I have the practical picture now — tell me a little about the person behind it.",
        framing: "This one's less about logistics — tell me what partnership actually means to you.",
        fields: Object.freeze([
          { name: 'partnerRole', label: "What does your partner's role in your life look like?", type: 'textarea', required: true, maxLength: 600, rows: 6 },
        ]),
      }),
      Object.freeze({
        id: 'ch7-s2',
        headline: 'How would your closest friends describe you?',
        fields: Object.freeze([
          { name: 'friendsDescribe', label: 'How would your closest friends describe you?', type: 'textarea', required: true, maxLength: 600, rows: 6, helpText: "Not how you'd describe yourself — how they would, if I asked them directly." },
        ]),
      }),
      Object.freeze({
        id: 'ch7-s3',
        headline: 'And what would they lovingly tease you about?',
        fields: Object.freeze([
          { name: 'friendsTease', label: 'And what would they lovingly tease you about?', type: 'textarea', required: true, maxLength: 600, rows: 6, helpText: 'Everyone has one. This tells me more than most questions do.' },
        ]),
      }),
      Object.freeze({
        id: 'ch7-s4',
        headline: 'What does an ordinary Tuesday evening look like for you?',
        framing: 'Not a highlight reel — just an honest, regular evening.',
        fields: Object.freeze([
          { name: 'tuesdayEvening', label: 'What does an ordinary Tuesday evening look like for you?', type: 'textarea', required: true, maxLength: 600, rows: 6 },
        ]),
      }),
      Object.freeze({
        id: 'ch7-s5',
        headline: 'What have you learned about yourself from a past relationship — or from looking for one?',
        framing: "Take your time with this — it's one of the more useful things I'll know about you.",
        fields: Object.freeze([
          { name: 'learnedAboutSelf', label: 'What have you learned about yourself from a past relationship, or from looking for one?', type: 'textarea', required: true, maxLength: 600, rows: 6 },
        ]),
      }),
      Object.freeze({
        id: 'ch7-s6',
        headline: 'Is there anything else you think donna should understand before considering an introduction?',
        framing: 'Last one. Anything at all — this is your space.',
        fields: Object.freeze([
          { name: 'anythingElse', label: 'Anything else donna should understand before considering an introduction?', type: 'textarea', required: false, maxLength: 600, rows: 6 },
        ]),
      }),
    ]),
  }),
])

function flattenChapters(chapterDefs) {
  const screens = []
  chapterDefs.forEach((chapter, chapterIndex) => {
    chapter.screens.forEach((screen, screenIndex) => {
      screens.push(Object.freeze({
        id: screen.id,
        chapterNumber: chapterIndex + 1,
        chapterRoman: chapter.roman,
        chapterTitle: chapter.title,
        title: chapter.title,
        headline: screen.headline,
        screenInChapter: screenIndex + 1,
        screensInChapter: chapter.screens.length,
        donnaLine: screen.donnaLine || '',
        framing: screen.framing || '',
        description: screen.framing || '',
        interstitial: screen.interstitial || null,
        fields: screen.fields,
      }))
    })
  })
  return screens
}

export const APPLICATION_CHAPTERS = Object.freeze(CHAPTER_DEFS.map((chapter, index) => Object.freeze({
  number: index + 1,
  roman: chapter.roman,
  title: chapter.title,
})))

export const APPLICATION_STEPS = Object.freeze([
  ...flattenChapters(CHAPTER_DEFS),
  Object.freeze({ id: 'photographs', title: 'Photographs', description: "Two are required. They're stored privately and reviewed by a person, never published.", donnaLine: '', framing: '', fields: Object.freeze([]) }),
  Object.freeze({ id: 'review-and-consent', title: 'Review and consent', description: '', donnaLine: '', framing: '', fields: Object.freeze([]) }),
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
  { name: 'legalDocuments', required: true, label: 'I have read the Privacy Notice and the Terms.', legal: true },
  { name: 'updates', required: false, label: 'Send me occasional updates from donna.', optional: true },
])

export const ACCEPTED_PHOTO_TYPES = Object.freeze(['image/jpeg', 'image/png', 'image/webp'])
export const MAX_PHOTO_SIZE_BYTES = 10 * 1024 * 1024

export const DATA_FIELDS = Object.freeze(
  APPLICATION_STEPS.flatMap((step) => step.fields.map((field) => field.name)),
)
