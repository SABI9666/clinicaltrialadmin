/**
 * Field schemas describing every editable part of the public site.
 *
 * The editors are generated from these, so adding a field to a section means
 * adding one entry here — there is no per-section form to keep in step.
 *
 * Field types: text, textarea, boolean, number, stringList, textList,
 * image, cta, group, objectList, countryList.
 */

const cta = (key, label) => ({ key, label, type: 'cta' });

export const SECTION_SCHEMAS = {
  settings: {
    title: 'Site settings',
    blurb: 'Brand, top banner, main navigation and page metadata.',
    fields: [
      { key: 'bannerEnabled', label: 'Show top banner', type: 'boolean' },
      { key: 'banner', label: 'Top banner text', type: 'text' },
      {
        key: 'brand',
        label: 'Brand',
        type: 'group',
        fields: [
          { key: 'mark', label: 'Logo character', type: 'text' },
          { key: 'name', label: 'Name', type: 'text' },
          { key: 'suffix', label: 'Sub-name', type: 'text' },
        ],
      },
      {
        key: 'nav',
        label: 'Navigation links',
        type: 'objectList',
        itemLabel: 'Link',
        fields: [
          { key: 'label', label: 'Label', type: 'text' },
          { key: 'href', label: 'Target', type: 'text', hint: 'e.g. #trials' },
        ],
      },
      cta('navCta', 'Navigation button'),
      {
        key: 'seo',
        label: 'Page metadata',
        type: 'group',
        fields: [
          { key: 'title', label: 'Browser title', type: 'text' },
          { key: 'description', label: 'Meta description', type: 'textarea' },
        ],
      },
    ],
  },

  hero: {
    title: 'Hero',
    blurb: 'The banner at the top of the home page.',
    fields: [
      { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
      { key: 'titleLines', label: 'Heading lines', type: 'stringList', hint: 'One line per row.' },
      { key: 'paragraphs', label: 'Paragraphs', type: 'textList' },
      cta('primaryCta', 'Primary button'),
      cta('secondaryCta', 'Secondary button'),
      { key: 'footnote', label: 'Footnote', type: 'text' },
      { key: 'image', label: 'Hero image', type: 'image' },
      {
        key: 'note',
        label: 'Photo note',
        type: 'group',
        fields: [
          { key: 'title', label: 'Title', type: 'text' },
          { key: 'body', label: 'Body', type: 'text' },
        ],
      },
      { key: 'trust', label: 'Trust badges', type: 'stringList' },
    ],
  },

  heroWide: {
    title: 'Wide banner image',
    blurb: 'The full-width image below the hero.',
    fields: [
      { key: 'image', label: 'Image', type: 'image' },
      { key: 'caption', label: 'Caption', type: 'text' },
    ],
  },

  trialsSection: {
    title: 'Trials section',
    blurb: 'Headings and helper text around the trial search. Trials themselves live under Trials.',
    fields: [
      { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
      { key: 'title', label: 'Heading', type: 'text' },
      { key: 'intro', label: 'Intro', type: 'textarea' },
      { key: 'aside', label: 'Aside text', type: 'text' },
      { key: 'searchLabel', label: 'Search button label', type: 'text' },
      { key: 'disclaimer', label: 'Disclaimer', type: 'textarea' },
      { key: 'emptyTitle', label: 'No-results heading', type: 'text' },
      { key: 'emptyBody', label: 'No-results body', type: 'textarea' },
      { key: 'resetLabel', label: 'Reset link label', type: 'text' },
    ],
  },

  facets: {
    title: 'Search filters',
    blurb: 'The options offered in the trial search dropdowns.',
    fields: [
      { key: 'conditions', label: 'Conditions', type: 'stringList' },
      { key: 'countries', label: 'Countries and states', type: 'countryList' },
      { key: 'ageRanges', label: 'Age ranges', type: 'stringList' },
    ],
  },

  journey: {
    title: 'Finding a trial',
    blurb: 'The numbered steps explaining the process.',
    fields: [
      { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
      { key: 'title', label: 'Heading', type: 'text' },
      { key: 'intro', label: 'Intro', type: 'textarea' },
      {
        key: 'steps',
        label: 'Steps',
        type: 'objectList',
        itemLabel: 'Step',
        fields: [
          { key: 'number', label: 'Number', type: 'text' },
          { key: 'title', label: 'Title', type: 'text' },
          { key: 'body', label: 'Body', type: 'textarea' },
        ],
      },
      { key: 'note', label: 'Footnote', type: 'textarea' },
    ],
  },

  why: {
    title: 'Why join',
    blurb: 'The "Why participate" section.',
    fields: [
      { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
      { key: 'titleLines', label: 'Heading lines', type: 'stringList' },
      { key: 'paragraphs', label: 'Paragraphs', type: 'textList' },
      cta('cta', 'Button'),
      { key: 'image', label: 'Image', type: 'image' },
    ],
  },

  insights: {
    title: 'Insights',
    blurb: 'Headings for the Reports / FAQs / News tabs. The entries are edited separately.',
    fields: [
      { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
      { key: 'title', label: 'Heading', type: 'text' },
      { key: 'intro', label: 'Intro', type: 'textarea' },
      { key: 'newsEmptyTitle', label: 'Empty news heading', type: 'text' },
      { key: 'newsEmptyBody', label: 'Empty news body', type: 'textarea' },
    ],
  },

  about: {
    title: 'About',
    blurb: 'The dark "About Clinical Trial Access" panel.',
    fields: [
      { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
      { key: 'title', label: 'Heading', type: 'text' },
      { key: 'paragraphs', label: 'Paragraphs', type: 'textList' },
      cta('cta', 'Button'),
      {
        key: 'wordmark',
        label: 'Side panel',
        type: 'group',
        fields: [
          { key: 'lines', label: 'Large lines', type: 'stringList' },
          { key: 'small', label: 'Small caps line', type: 'text' },
          { key: 'body', label: 'Body', type: 'textarea' },
        ],
      },
    ],
  },

  contact: {
    title: 'Contact',
    blurb: 'Copy around the enquiry form, and the messages shown after submitting.',
    fields: [
      { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
      { key: 'title', label: 'Heading', type: 'text' },
      { key: 'paragraphs', label: 'Paragraphs', type: 'textList' },
      { key: 'note', label: 'Medical-advice note', type: 'textarea' },
      { key: 'formNote', label: 'Note above the button', type: 'text' },
      { key: 'submitLabel', label: 'Submit button label', type: 'text' },
      { key: 'successMessage', label: 'Success message', type: 'textarea' },
      { key: 'errorMessage', label: 'Error message', type: 'textarea' },
    ],
  },

  footer: {
    title: 'Footer',
    blurb: 'Footer links, legal paragraphs and copyright.',
    fields: [
      { key: 'tagline', label: 'Tagline', type: 'textarea' },
      {
        key: 'links',
        label: 'Footer links',
        type: 'objectList',
        itemLabel: 'Link',
        fields: [
          { key: 'label', label: 'Label', type: 'text' },
          { key: 'href', label: 'Target', type: 'text' },
        ],
      },
      { key: 'legal', label: 'Legal paragraphs', type: 'textList' },
      { key: 'copyright', label: 'Copyright line', type: 'text' },
    ],
  },
};

/** Order the sections appear in the sidebar. */
export const SECTION_ORDER = [
  'settings',
  'hero',
  'heroWide',
  'trialsSection',
  'facets',
  'journey',
  'why',
  'insights',
  'about',
  'contact',
  'footer',
];

export const COLLECTION_SCHEMAS = {
  trials: {
    title: 'Trials',
    singular: 'Trial',
    blurb: 'Clinical trials listed in the search results.',
    titleField: 'title',
    blank: {
      slug: '',
      title: '',
      tag: '',
      condition: '',
      country: '',
      states: [],
      ageRange: '',
      featured: false,
      published: true,
      summary: [''],
      image: { src: '', alt: '' },
      learnMoreLabel: 'Learn more about this trial ↗',
      detail: {
        eyebrow: 'Clinical trial overview',
        title: '',
        tag: '',
        paragraphs: [''],
        note: '',
        ctaLabel: 'Enquire about this trial ↗',
        enquiryPrefill: '',
      },
    },
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      {
        key: 'slug',
        label: 'URL slug',
        type: 'text',
        required: true,
        hint: 'Lowercase letters, numbers and hyphens only.',
      },
      { key: 'published', label: 'Published', type: 'boolean' },
      { key: 'featured', label: 'Featured', type: 'boolean' },
      { key: 'tag', label: 'Card tag', type: 'text' },
      { key: 'condition', label: 'Condition', type: 'text' },
      { key: 'country', label: 'Country', type: 'text' },
      {
        key: 'states',
        label: 'States / territories',
        type: 'stringList',
        hint: 'Leave empty if locations are not yet confirmed.',
      },
      { key: 'ageRange', label: 'Age range', type: 'text' },
      { key: 'summary', label: 'Card paragraphs', type: 'textList' },
      { key: 'image', label: 'Card image', type: 'image' },
      { key: 'learnMoreLabel', label: '"Learn more" label', type: 'text' },
      {
        key: 'detail',
        label: 'Detail dialog',
        type: 'group',
        fields: [
          { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
          { key: 'title', label: 'Heading', type: 'text' },
          { key: 'tag', label: 'Tag', type: 'text' },
          { key: 'paragraphs', label: 'Paragraphs', type: 'textList' },
          { key: 'note', label: 'Eligibility note', type: 'textarea' },
          { key: 'ctaLabel', label: 'Enquiry button label', type: 'text' },
          { key: 'enquiryPrefill', label: 'Prefilled enquiry text', type: 'textarea' },
        ],
      },
    ],
  },

  reports: {
    title: 'Reports',
    singular: 'Report',
    blurb: 'Cards under the Insights → Reports tab.',
    titleField: 'title',
    blank: { eyebrow: '', title: '', body: '', footnote: '', published: true },
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
      { key: 'body', label: 'Body', type: 'textarea' },
      { key: 'footnote', label: 'Footnote', type: 'text' },
      { key: 'published', label: 'Published', type: 'boolean' },
    ],
  },

  faqs: {
    title: 'FAQs',
    singular: 'FAQ',
    blurb: 'Questions under the Insights → FAQs tab.',
    titleField: 'question',
    blank: { question: '', answer: '', published: true },
    fields: [
      { key: 'question', label: 'Question', type: 'text', required: true },
      { key: 'answer', label: 'Answer', type: 'textarea' },
      { key: 'published', label: 'Published', type: 'boolean' },
    ],
  },

  news: {
    title: 'News',
    singular: 'News item',
    blurb: 'Updates under the Insights → News tab.',
    titleField: 'title',
    blank: { title: '', date: '', summary: '', body: '', image: { src: '', alt: '' }, published: true },
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'date', label: 'Date label', type: 'text', hint: 'Free text, e.g. "March 2026".' },
      { key: 'summary', label: 'Summary', type: 'textarea' },
      { key: 'body', label: 'Full text', type: 'textarea' },
      { key: 'image', label: 'Image', type: 'image' },
      { key: 'published', label: 'Published', type: 'boolean' },
    ],
  },

  policies: {
    title: 'Policies',
    singular: 'Policy',
    blurb: 'Privacy, terms and cookie content shown in the footer dialogs.',
    titleField: 'title',
    blank: { slug: '', title: '', body: '', published: true },
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'slug', label: 'URL slug', type: 'text', required: true },
      {
        key: 'body',
        label: 'Content',
        type: 'textarea',
        rows: 14,
        hint: 'Separate paragraphs with a blank line.',
      },
      { key: 'published', label: 'Published', type: 'boolean' },
    ],
  },
};

export const COLLECTION_ORDER = ['trials', 'reports', 'faqs', 'news', 'policies'];
