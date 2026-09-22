/**
 * Field schemas describing every editable part of the public site.
 *
 * The editors are generated from these, so adding a field to a section means
 * adding one entry here — there is no per-section form to keep in step.
 *
 * Each schema also carries the words shown to whoever is editing:
 *   blurb  — one line under the page title saying what the screen controls.
 *   where  — where the result shows up on the public site.
 *   steps  — the "How this page works" panel, in order.
 *   groups — splits the form into numbered panels, so a long form reads as a
 *            short sequence of decisions rather than a wall of inputs.
 *
 * Field types: text, textarea, boolean, number, stringList, textList,
 * image, cta, group, objectList, countryList, taxonomy, taxonomyStates.
 */

const cta = (key, label) => ({ key, label, type: 'cta' });

export const SECTION_SCHEMAS = {
  settings: {
    title: 'Header & site name',
    blurb: 'Brand name, the strip across the very top, the menu, and the text search engines show.',
    where: 'The header on every page, plus the browser tab title.',
    steps: [
      'Change any text box, then press "Save changes" at the top right.',
      'Navigation links point at a part of the page: "#trials" jumps to the trial search, "#contact" to the enquiry form.',
      '"Page metadata" is what Google and the browser tab show — keep the title under about 60 characters.',
    ],
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
    title: 'Hero banner',
    blurb: 'The big banner visitors see first, at the top of the home page.',
    where: 'Top of the home page, above everything else.',
    steps: [
      'Each "Heading line" is one line of the large heading — press "+ Add" for another line.',
      'The buttons need a label and a target, e.g. "#trials" to jump down to the trial search.',
      'For the image, use "Choose or upload…" and always fill in alt text describing the picture.',
    ],
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
    blurb: 'The single wide photo that sits under the hero banner.',
    where: 'Home page, directly below the hero.',
    steps: ['Pick or upload an image, then describe it in the alt text so screen readers can announce it.'],
    fields: [
      { key: 'image', label: 'Image', type: 'image' },
      { key: 'caption', label: 'Caption', type: 'text' },
    ],
  },

  trialsSection: {
    title: 'Trial search wording',
    blurb: 'The wording around the trial search box. The trials themselves live under Trials → All trials.',
    where: 'The "Find a clinical trial" block on the home page.',
    steps: [
      'This page only changes words, never which trials are listed.',
      'To add or edit a trial, go to Trials → All trials. To change what the dropdowns offer, go to Trials → Search filter options.',
      '"No-results" text is what a visitor sees when their search matches nothing.',
    ],
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
    title: 'Search filter options',
    blurb: 'The master list of conditions, countries, states/territories and age ranges visitors can search by.',
    where: 'The four dropdowns above the trial results on the home page.',
    steps: [
      'These lists fill the site\u2019s search dropdowns — nothing more.',
      'A trial only turns up under a filter when its value matches an entry here exactly, so spelling and capitals matter.',
      'You can also add an option without coming here: Trials → All trials has "+ Add a new condition / country / state or territory" built in, and it saves back to this page.',
      'Removing an option here does not delete any trial — it only stops visitors searching by it.',
    ],
    fields: [
      {
        key: 'conditions',
        label: 'Conditions',
        type: 'stringList',
        hint: 'One per row, e.g. "Diabetes". These fill the "Condition" dropdown.',
      },
      {
        key: 'countries',
        label: 'Countries, and the states / territories in each',
        type: 'countryList',
        hint: 'Add a country, then list its states or territories underneath.',
      },
      {
        key: 'ageRanges',
        label: 'Age ranges',
        type: 'stringList',
        hint: 'One per row, written exactly as visitors should read it, e.g. "18 to 50".',
      },
    ],
  },

  journey: {
    title: 'Finding a trial',
    blurb: 'The numbered steps that explain how taking part works.',
    where: 'The "Finding a trial" block on the home page.',
    steps: ['Each step has its own number, title and body. Use the ↑ ↓ arrows to reorder, ✕ to remove.'],
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
    blurb: 'The "Why participate" block, with its own picture and button.',
    where: 'Home page, under "Why Join" in the menu.',
    steps: ['Heading lines stack one above the other. Paragraphs are the body text under them.'],
    fields: [
      { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
      { key: 'titleLines', label: 'Heading lines', type: 'stringList' },
      { key: 'paragraphs', label: 'Paragraphs', type: 'textList' },
      cta('cta', 'Button'),
      { key: 'image', label: 'Image', type: 'image' },
    ],
  },

  insights: {
    title: 'Insights wording',
    blurb: 'The headings above the Reports / FAQs / News tabs.',
    where: 'The "Insights" block on the home page.',
    steps: [
      'This page sets the wording only. The cards inside the tabs are edited under Insights & news → Reports, FAQs and News.',
    ],
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
    where: 'Home page, under "About Us" in the menu.',
    steps: ['"Side panel" is the large wordmark block beside the text.'],
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
    blurb: 'The words around the enquiry form, and the messages shown after someone sends it.',
    where: 'The "Contact Us" block at the bottom of the home page.',
    steps: [
      'Submitted enquiries arrive under "Enquiries" in the menu; this page only changes the wording visitors read.',
      'Keep the medical-advice note in place — it tells visitors the site is not medical advice.',
    ],
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
    blurb: 'Footer links, legal paragraphs and the copyright line.',
    where: 'The bottom strip of every page.',
    steps: [
      'A footer link can point at a policy using its slug, e.g. "#privacy" opens the policy whose slug is "privacy" (Site setup → Policies).',
    ],
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

/** Order the sections appear in, used where every section is listed. */
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
    blurb: 'Every clinical trial listed on the site, and everything a visitor reads about it.',
    where: 'The result cards under "Find a clinical trial", and the pop-up that opens from "Learn more".',
    steps: [
      'Pick a trial on the left to edit it, or press "+ New trial" to add one.',
      'Condition, country, states and age range are dropdowns fed by the Search filter options page — that is how a visitor finds the trial. If the option you need is missing, use the "+ Add a new …" link right there and it is created for you.',
      'Leave a filter as "Not specified" when it is not confirmed yet: the trial then shows up whatever the visitor picks, rather than being hidden.',
      '"Card paragraphs" are what shows in the list. The "Detail pop-up" panel is what opens when a visitor presses "Learn more".',
      'Nothing is public until you press "Save changes" and the trial is marked Live.',
    ],
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
    groups: [
      {
        title: 'The basics',
        blurb: 'What the trial is called, and whether anyone can see it yet.',
        keys: ['title', 'slug', 'published', 'featured'],
      },
      {
        title: 'How visitors find it',
        blurb:
          'These four answers decide which searches this trial turns up in. Every option comes from the Search filter options page — add a missing one right here and it is saved there too.',
        keys: ['condition', 'country', 'states', 'ageRange'],
      },
      {
        title: 'The card in the list',
        blurb: 'What a visitor sees before they open the trial.',
        keys: ['tag', 'summary', 'image', 'learnMoreLabel'],
      },
      {
        title: 'The detail pop-up',
        blurb: 'What opens when a visitor presses "Learn more" on the card.',
        keys: ['detail'],
      },
    ],
    fields: [
      {
        key: 'title',
        label: 'Trial title',
        type: 'text',
        required: true,
        hint: 'The heading on the card, e.g. "Diabetic Foot Ulcers".',
      },
      {
        key: 'slug',
        label: 'Web address name (slug)',
        type: 'text',
        required: true,
        hint: 'Filled in from the title automatically. Lowercase letters, numbers and hyphens only.',
      },
      {
        key: 'published',
        label: 'Published — visible on the public site',
        type: 'boolean',
        hint: 'Untick to keep the trial as a draft only you can see.',
      },
      {
        key: 'featured',
        label: 'Featured — highlight this trial',
        type: 'boolean',
      },
      {
        key: 'condition',
        label: 'Condition',
        type: 'taxonomy',
        source: 'conditions',
        anyLabel: 'Not specified — show for every condition',
        addLabel: 'Add a new condition',
        addPlaceholder: 'e.g. Cardiology',
        hint: 'Matches the visitor\u2019s "Condition" dropdown.',
      },
      {
        key: 'country',
        label: 'Country',
        type: 'taxonomy',
        source: 'countries',
        anyLabel: 'Not specified — show for every country',
        addLabel: 'Add a new country',
        addPlaceholder: 'e.g. New Zealand',
        hint: 'Choosing a country decides which states and territories you can tick below.',
      },
      {
        key: 'states',
        label: 'States / territories',
        type: 'taxonomyStates',
      },
      {
        key: 'ageRange',
        label: 'Age range',
        type: 'taxonomy',
        source: 'ageRanges',
        anyLabel: 'Not specified — show for every age',
        addLabel: 'Add a new age range',
        addPlaceholder: 'e.g. 18 to 65',
        hint: 'The research team confirms eligibility, so this is a guide only.',
      },
      {
        key: 'tag',
        label: 'Card tag',
        type: 'text',
        hint: 'The small line above the title, e.g. "DIABETES \u00b7 FEATURED TRIAL".',
      },
      {
        key: 'summary',
        label: 'Card paragraphs',
        type: 'textList',
        hint: 'One or two short paragraphs shown on the card. Press "+ Add" for another.',
      },
      { key: 'image', label: 'Card image', type: 'image' },
      {
        key: 'learnMoreLabel',
        label: 'Label on the "Learn more" button',
        type: 'text',
      },
      {
        key: 'detail',
        label: 'Detail pop-up',
        type: 'group',
        blurb: 'Leave the heading empty to reuse the trial title above.',
        fields: [
          { key: 'eyebrow', label: 'Small line above the heading', type: 'text' },
          { key: 'title', label: 'Heading', type: 'text' },
          { key: 'tag', label: 'Tag', type: 'text' },
          { key: 'paragraphs', label: 'Paragraphs', type: 'textList' },
          {
            key: 'note',
            label: 'Eligibility note',
            type: 'textarea',
            hint: 'The grey note reminding visitors the research team confirms eligibility.',
          },
          { key: 'ctaLabel', label: 'Enquiry button label', type: 'text' },
          {
            key: 'enquiryPrefill',
            label: 'Text put into the enquiry form',
            type: 'textarea',
            hint: 'Filled into the visitor\u2019s message when they enquire about this trial.',
          },
        ],
      },
    ],
  },

  reports: {
    title: 'Reports',
    singular: 'Report',
    blurb: 'The cards shown under Insights → Reports on the public site.',
    where: 'Insights block, "Reports" tab.',
    steps: [
      'Press "+ New report", fill in a title and body, then "Create report".',
      'Use the ● / ◯ button in the list to take a report off the site without deleting it.',
    ],
    titleField: 'title',
    blank: { eyebrow: '', title: '', body: '', footnote: '', published: true },
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'eyebrow', label: 'Small line above the title', type: 'text' },
      { key: 'body', label: 'Body', type: 'textarea' },
      { key: 'footnote', label: 'Footnote', type: 'text' },
      { key: 'published', label: 'Published — visible on the public site', type: 'boolean' },
    ],
  },

  faqs: {
    title: 'FAQs',
    singular: 'FAQ',
    blurb: 'The questions and answers under Insights → FAQs.',
    where: 'Insights block, "FAQs" tab.',
    steps: [
      'One question per entry. The ↑ ↓ arrows set the order visitors read them in.',
    ],
    titleField: 'question',
    blank: { question: '', answer: '', published: true },
    fields: [
      { key: 'question', label: 'Question', type: 'text', required: true },
      { key: 'answer', label: 'Answer', type: 'textarea' },
      { key: 'published', label: 'Published — visible on the public site', type: 'boolean' },
    ],
  },

  news: {
    title: 'News',
    singular: 'News item',
    blurb: 'Updates under Insights → News.',
    where: 'Insights block, "News" tab.',
    steps: [
      'The date is free text, so write it however it should read, e.g. "March 2026".',
      'The summary shows in the list; the full text opens when a visitor selects the item.',
    ],
    titleField: 'title',
    blank: { title: '', date: '', summary: '', body: '', image: { src: '', alt: '' }, published: true },
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'date', label: 'Date label', type: 'text', hint: 'Free text, e.g. "March 2026".' },
      { key: 'summary', label: 'Summary', type: 'textarea', hint: 'Shown in the news list.' },
      { key: 'body', label: 'Full text', type: 'textarea' },
      { key: 'image', label: 'Image', type: 'image' },
      { key: 'published', label: 'Published — visible on the public site', type: 'boolean' },
    ],
  },

  policies: {
    title: 'Policies',
    singular: 'Policy',
    blurb: 'Privacy, terms and cookie text, opened from the footer links.',
    where: 'The pop-ups behind the footer links at the bottom of every page.',
    steps: [
      'The slug connects a policy to its footer link: a policy with the slug "privacy" opens from the footer link "#privacy".',
      'Separate paragraphs with a blank line.',
    ],
    titleField: 'title',
    blank: { slug: '', title: '', body: '', published: true },
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      {
        key: 'slug',
        label: 'Web address name (slug)',
        type: 'text',
        required: true,
        hint: 'Must match the footer link, e.g. slug "privacy" for the link "#privacy".',
      },
      {
        key: 'body',
        label: 'Content',
        type: 'textarea',
        rows: 14,
        hint: 'Separate paragraphs with a blank line.',
      },
      { key: 'published', label: 'Published — visible on the public site', type: 'boolean' },
    ],
  },
};

export const COLLECTION_ORDER = ['trials', 'reports', 'faqs', 'news', 'policies'];
