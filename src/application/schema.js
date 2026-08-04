export const APPLICATION_GATEWAY = Object.freeze({
  eyebrow: 'PRIVATE APPLICATION · 25+',
  title: 'A thoughtful introduction starts with being known.',
  supportingCopy: 'Tell donna enough to understand who you are, what matters to you and who may genuinely fit. Every application is reviewed by a person—not an algorithm.',
  preparation: '5–7 minutes · LinkedIn profile · 3 recent photographs',
  pilotDisclaimer: 'donna is a limited, manually operated pilot. Applying does not guarantee acceptance, a match or an introduction.',
  checklist: Object.freeze([
    'Your LinkedIn profile URL.',
    'Three recent photographs.',
    'A few uninterrupted minutes.',
    'Honest preferences about what you are looking for.',
  ]),
  nextSteps: Object.freeze([
    Object.freeze({
      title: 'donna reviews',
      copy: 'Your application and LinkedIn profile are reviewed privately and manually.',
    }),
    Object.freeze({
      title: 'donna asks',
      copy: 'If there may be a thoughtful introduction, donna approaches each person separately.',
    }),
    Object.freeze({
      title: 'You decide',
      copy: 'Your profile is shared only after you agree. Mutual interest leads to an introduction.',
    }),
  ]),
  controls: Object.freeze([
    Object.freeze({
      title: 'Private by default',
      copy: 'Your application is never placed in a public or browsable profile directory.',
    }),
    Object.freeze({
      title: 'Permission each time',
      copy: 'Applying does not give donna permission to share your profile with another applicant.',
    }),
    Object.freeze({
      title: 'Decline quietly',
      copy: 'You may decline a proposed introduction. donna will not disclose your reason to the other person.',
    }),
  ]),
  withdrawalCopy: 'You can withdraw your application by contacting donna. Data requests are handled according to the Privacy Notice.',
})

export const APPLICATION_STEPS = Object.freeze([
  {
    id: 'eligibility',
    title: 'First, a few eligibility details.',
    description: 'donna’s current pilot is for people aged 25 and above who are ready to meet in person.',
    fields: [
      { name: 'date_of_birth', label: 'Date of birth', type: 'date', required: true, autocomplete: 'bday' },
      { name: 'current_city', label: 'Current city', type: 'text', required: true, autocomplete: 'address-level2' },
      {
        name: 'age_confirmation',
        label: 'I confirm that I am at least 25 years old.',
        type: 'checkbox',
        required: true,
        uiOnly: true,
      },
      {
        name: 'relationship_intent',
        label: 'What are you hoping to find?',
        type: 'radio',
        required: true,
        options: [
          ['long_term_relationship', 'Long-term relationship'],
          ['marriage', 'Marriage'],
          ['open_to_either', 'Open to either'],
        ],
      },
      {
        name: 'available_to_meet',
        label: 'Are you realistically available to meet someone in person within the next four weeks?',
        type: 'radio',
        required: true,
        options: [
          ['yes', 'Yes'],
          ['not_right_now', 'Not right now'],
        ],
      },
    ],
  },
  {
    id: 'basics',
    title: 'The basics.',
    description: 'This information is reviewed privately by the donna team.',
    fields: [
      { name: 'full_name', label: 'Full name', type: 'text', required: true, autocomplete: 'name', maxLength: 120 },
      { name: 'display_first_name', label: 'First name you would be comfortable sharing with an approved introduction', type: 'text', required: true, autocomplete: 'given-name', maxLength: 60 },
      { name: 'email', label: 'Email address', type: 'email', required: true, autocomplete: 'email', maxLength: 160 },
      { name: 'phone', label: 'Phone or WhatsApp number, including country code', type: 'tel', required: true, autocomplete: 'tel', maxLength: 24, placeholder: '+91 98765 43210' },
      {
        name: 'linkedin_url',
        label: 'LinkedIn profile URL',
        type: 'url',
        required: true,
        autocomplete: 'url',
        maxLength: 240,
        helpText: 'donna manually reviews the LinkedIn profile you provide as a supporting consistency check. This is not identity or age verification.',
        placeholder: 'https://www.linkedin.com/in/your-name',
      },
      { name: 'occupation', label: 'Occupation or current role', type: 'text', required: true, autocomplete: 'organization-title', maxLength: 120 },
      { name: 'industry', label: 'Industry', type: 'text', required: true, maxLength: 120 },
    ],
  },
  {
    id: 'about',
    title: 'A little more about you.',
    description: 'Short, honest answers are more useful than polished ones.',
    fields: [
      { name: 'about', label: 'About you', type: 'textarea', required: true, maxLength: 600, rows: 6 },
      { name: 'weekend_prompt', label: 'A good weekend for me looks like…', type: 'textarea', required: true, maxLength: 300, rows: 4 },
      { name: 'values_prompt', label: 'Something I care deeply about is…', type: 'textarea', required: true, maxLength: 300, rows: 4 },
      { name: 'languages', label: 'Languages spoken', type: 'text', required: true, maxLength: 180, helpText: 'Separate multiple languages with commas.' },
      {
        name: 'cultural_background',
        label: 'Religion or cultural background',
        type: 'text-with-optout',
        required: false,
        maxLength: 200,
        optOutLabel: 'Prefer not to say',
      },
      {
        name: 'cultural_compatibility_importance',
        label: 'How important is cultural or religious compatibility?',
        type: 'radio',
        required: true,
        options: [
          ['important', 'Important'],
          ['somewhat_important', 'Somewhat important'],
          ['not_important', 'Not important'],
          ['prefer_not_to_say', 'Prefer not to say'],
        ],
      },
    ],
  },
  {
    id: 'preferences',
    title: 'Who would you like to meet?',
    description: 'A few useful preferences are enough. This is not an exhaustive compatibility questionnaire.',
    fields: [
      {
        name: 'gender_identity',
        label: 'Gender identity',
        type: 'choice-with-other',
        required: true,
        options: [
          ['woman', 'Woman'],
          ['man', 'Man'],
          ['non_binary', 'Non-binary'],
          ['self_describe', 'Self-describe'],
          ['prefer_not_to_say', 'Prefer not to say'],
        ],
      },
      { name: 'pronouns', label: 'Pronouns', type: 'text', required: false, maxLength: 60, placeholder: 'Optional' },
      {
        name: 'interested_in',
        label: 'Who are you interested in meeting?',
        type: 'checkbox-group-with-other',
        required: true,
        options: [
          ['women', 'Women'],
          ['men', 'Men'],
          ['non_binary_people', 'Non-binary people'],
          ['self_describe', 'Self-describe'],
        ],
      },
      { name: 'preferred_age_min', label: 'Preferred minimum age', type: 'number', required: true, min: 25, max: 100, inputmode: 'numeric', group: 'preferred-age' },
      { name: 'preferred_age_max', label: 'Preferred maximum age', type: 'number', required: true, min: 25, max: 100, inputmode: 'numeric', group: 'preferred-age' },
      { name: 'preferred_locations', label: 'Preferred match location or locations', type: 'text', required: true, maxLength: 200 },
      {
        name: 'relationship_goal',
        label: 'Relationship goal',
        type: 'radio',
        required: true,
        options: [
          ['long_term_relationship', 'Long-term relationship'],
          ['marriage', 'Marriage'],
          ['open_to_either', 'Open to either'],
        ],
      },
      {
        name: 'smoking_preference',
        label: 'Smoking preference',
        type: 'select',
        required: true,
        options: [
          ['comfortable', 'Comfortable'],
          ['occasionally_okay', 'Occasionally is okay'],
          ['prefer_non_smoker', 'Prefer a non-smoker'],
          ['no_preference', 'No preference'],
        ],
      },
      {
        name: 'drinking_preference',
        label: 'Drinking preference',
        type: 'select',
        required: true,
        options: [
          ['comfortable', 'Comfortable'],
          ['socially_okay', 'Socially is okay'],
          ['prefer_non_drinker', 'Prefer a non-drinker'],
          ['no_preference', 'No preference'],
        ],
      },
      { name: 'dietary_preference', label: 'Dietary preference', type: 'text', required: false, maxLength: 120, placeholder: 'Optional' },
      {
        name: 'has_children',
        label: 'Do you have children?',
        type: 'select',
        required: false,
        options: [['yes', 'Yes'], ['no', 'No'], ['prefer_not_to_say', 'Prefer not to say']],
      },
      {
        name: 'wants_children',
        label: 'Would you like children in the future?',
        type: 'select',
        required: false,
        options: [['yes', 'Yes'], ['no', 'No'], ['open_to_it', 'Open to it'], ['unsure', 'Unsure'], ['prefer_not_to_say', 'Prefer not to say']],
      },
      { name: 'non_negotiables', label: 'Up to three genuine non-negotiables', type: 'textarea', required: false, maxLength: 300, rows: 4, helpText: 'Keep the total response to 300 characters.' },
      { name: 'additional_context', label: 'Anything else donna should understand when considering an introduction?', type: 'textarea', required: false, maxLength: 500, rows: 5 },
    ],
  },
  {
    id: 'photographs',
    title: 'Four photographs, kept private.',
    description: 'Photographs remain private during application review and are never placed in a browsable gallery.',
    fields: [],
  },
  {
    id: 'review',
    title: 'Review your application.',
    description: 'Nothing has been submitted. Check your answers and confirm each consent separately.',
    fields: [],
  },
])

export const PHOTO_SLOTS = Object.freeze([
  { id: 'face_photo', label: 'A recent, clear face photograph', required: true },
  { id: 'body_photo', label: 'A recent half- or full-body photograph', required: true },
  { id: 'everyday_photo', label: 'A recent photograph showing something from everyday life', required: true },
  { id: 'additional_photo', label: 'One optional additional photograph', required: false },
])

export const CONSENT_SCHEMA = Object.freeze([
  { name: 'age_and_accuracy', required: true, label: 'I confirm that I am at least 25 years old and that the information I provided is accurate.' },
  { name: 'manual_review', required: true, label: 'I consent to donna processing my application for manual review and matchmaking consideration.' },
  { name: 'linkedin_review', required: true, label: 'I understand that donna may manually review the LinkedIn URL I provided as a supporting consistency check.' },
  { name: 'photograph_review', required: true, label: 'I consent to donna privately storing and reviewing the photographs I provide.' },
  { name: 'no_guarantee', required: true, label: 'I understand that applying does not guarantee acceptance, a match or an introduction.' },
  { name: 'legal_documents', required: true, label: 'I have read the Privacy Notice and Pilot Terms.', legal: true },
  { name: 'product_updates', required: false, label: 'I would like to receive occasional donna product updates.', optional: true },
])

export const ACCEPTED_PHOTO_TYPES = Object.freeze(['image/jpeg', 'image/png', 'image/webp'])
export const MAX_PHOTO_SIZE_BYTES = 10 * 1024 * 1024

export const DATA_FIELDS = Object.freeze(
  APPLICATION_STEPS.flatMap((step) => step.fields)
    .filter((field) => !field.uiOnly)
    .map((field) => field.name),
)
