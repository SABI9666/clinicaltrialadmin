/**
 * Default site content, extracted verbatim from the supplied
 * "Clinical Trial Access — Updated Website Demo" HTML.
 *
 * This is the shape the admin edits and the public site renders. On first
 * boot the API writes these documents to Firestore; afterwards the stored
 * documents win and this file is only a fallback/reset source.
 */

export const MEDIA = {
  heroConsult: { src: '/media/hero-consult.jpg', webp: '/media/hero-consult.webp' },
  heroWide: { src: '/media/hero-wide.jpg', webp: '/media/hero-wide.webp' },
  trialDiabetes: { src: '/media/trial-diabetes.jpg', webp: '/media/trial-diabetes.webp' },
  whyJoin: { src: '/media/why-join.jpg', webp: '/media/why-join.webp' },
};

export const settings = {
  // The original demo banner said enquiries were not sent. They now reach the
  // API and appear in the admin inbox, so the copy reflects that. Editable in
  // the admin, and switch off with bannerEnabled.
  banner: 'Clinical Trial Access · Information on this site is general in nature',
  bannerEnabled: true,
  brand: { mark: '✳', name: 'Clinical Trial', suffix: 'ACCESS' },
  nav: [
    { label: 'Access a Trial', href: '#trials' },
    { label: 'Why Join', href: '#why' },
    { label: 'Insights', href: '#insights' },
    { label: 'About Us', href: '#about' },
  ],
  navCta: { label: 'Contact Us ↗', href: '#contact' },
  seo: {
    title: 'Clinical Trial Access — Updated Website Demo',
    description: 'Clinical Trial Access website demonstration',
  },
};

export const hero = {
  eyebrow: 'Clinical Trial Access',
  titleLines: ['Helping you access', 'clinical trials.'],
  paragraphs: [
    'Clinical trials help researchers explore potential new treatments and improve our understanding of different health conditions.',
    'We connect people interested in participating in clinical trials with research sites across Australia and Asia.',
  ],
  primaryCta: { label: 'Access a Trial', href: '#trials', icon: '↗' },
  secondaryCta: { label: 'Learn About Clinical Trials', href: '#journey' },
  footnote: 'For you, a family member or someone you care for.',
  image: {
    ...MEDIA.heroConsult,
    alt: 'Illustrative image of a research coordinator speaking with an older adult',
  },
  note: {
    title: 'Your questions. Your choice.',
    body: 'Understand what participation involves.',
  },
  trust: ['Australia & Asia', 'Connect with research teams', 'Participation is your choice'],
};

export const heroWide = {
  image: {
    ...MEDIA.heroWide,
    alt: 'Illustrative consultation between a clinical research coordinator and a participant',
  },
  caption: 'Supporting informed conversations about clinical trial participation.',
};

export const trialsSection = {
  eyebrow: 'Access a trial',
  title: 'Find a clinical trial.',
  intro:
    'Search current opportunities by condition and location to find a clinical trial that may be relevant to you.',
  aside: 'Explore • Learn • Connect',
  disclaimer:
    'Trial locations, age criteria and recruitment status require confirmation by the research team.',
  emptyTitle: 'No matching trials',
  emptyBody: 'Try widening your search — select All conditions or clear the location filters.',
  resetLabel: 'Reset filters',
  searchLabel: 'Search Trials ↗',
};

export const facets = {
  conditions: ['Diabetes', 'Oncology', 'Central Nervous System', 'Rare Diseases', 'Vaccines'],
  countries: [
    {
      name: 'Australia',
      states: [
        'Australian Capital Territory',
        'New South Wales',
        'Northern Territory',
        'Queensland',
        'South Australia',
        'Tasmania',
        'Victoria',
        'Western Australia',
      ],
    },
  ],
  ageRanges: ['18 to 50', '18 to 80'],
};

export const trials = [
  {
    slug: 'diabetic-foot-ulcers',
    title: 'Diabetic Foot Ulcers',
    tag: 'DIABETES · FEATURED TRIAL',
    condition: 'Diabetes',
    country: 'Australia',
    states: [],
    ageRange: '',
    featured: true,
    published: true,
    order: 1,
    summary: [
      'This clinical trial is looking at a possible investigational treatment called CYWC628 for diabetic foot ulcers that are hard to heal.',
      'Researchers will compare standard wound care with standard wound care plus an investigational treatment.',
    ],
    image: {
      ...MEDIA.trialDiabetes,
      alt: 'Illustrative clinical researchers reviewing information in a laboratory',
    },
    learnMoreLabel: 'Learn more about this trial ↗',
    detail: {
      eyebrow: 'Clinical trial overview',
      title: 'Diabetic Foot Ulcer Clinical Trial',
      tag: 'INVESTIGATIONAL TREATMENT · CYWC628',
      paragraphs: [
        'This clinical trial is looking at a possible investigational treatment called CYWC628 for diabetic foot ulcers that are hard to heal. The treatment aims to determine whether CYWC628 can support wound healing by promoting tissue regeneration, reducing inflammation, and improving blood flow to the affected area.',
        'In this clinical trial, researchers will compare standard wound care with standard wound care plus an investigational treatment.',
        'Site locations, eligible ages, visits and detailed participation requirements were not supplied. These must be confirmed by the research team.',
      ],
      note: 'Registering your interest does not mean you are eligible or enrolled. Eligibility can only be determined by the research team.',
      ctaLabel: 'Enquire about this trial ↗',
      enquiryPrefill:
        'I would like to learn more about the Diabetic Foot Ulcer Clinical Trial.',
    },
  },
];

export const journey = {
  eyebrow: 'Finding a clinical trial',
  title: 'Finding a clinical trial',
  intro: 'We want to make exploring clinical trials as straightforward as possible.',
  steps: [
    {
      number: '01',
      title: 'Explore',
      body: 'Browse clinical trials currently looking for participants across Australia and Asia.',
    },
    {
      number: '02',
      title: 'Register your interest',
      body: 'If you find a trial that may be relevant to you, you can register your interest.',
    },
    {
      number: '03',
      title: 'Connect',
      body: 'Your information will be securely provided to the research site conducting the trial. The site team may contact you to discuss the trial and ask initial questions.',
    },
    {
      number: '04',
      title: 'Learn more',
      body: 'The research site will explain visits, assessments, potential risks and potential benefits if the trial may be suitable for you.',
    },
    {
      number: '05',
      title: 'Decide',
      body: 'Taking part is your choice. You can ask questions before deciding whether you would like to participate.',
    },
  ],
  note: 'Registering your interest does not mean you are eligible or enrolled in a clinical trial. Eligibility can only be determined by the research team responsible for the trial.',
};

export const why = {
  eyebrow: 'Why join',
  titleLines: ['Why participate in', 'a clinical trial?'],
  paragraphs: [
    'Every advancement in healthcare starts with research, and people who volunteer for clinical trials play an important part.',
    'You may want to contribute to research into a condition that affects you or someone close to you. You may be interested in learning more about your condition or exploring an investigational treatment through a clinical trial.',
    'Whatever your reason, choosing to participate is a personal decision.',
  ],
  cta: { label: 'Explore Clinical Trials ↗', href: '#trials' },
  image: {
    ...MEDIA.whyJoin,
    alt: 'Illustrative conversation about clinical research participation',
  },
};

export const insights = {
  eyebrow: 'Insights & resources',
  title: 'Understanding clinical trials',
  intro:
    'Clinical trials can sometimes feel complicated. We want to make them easier to understand.',
  newsEmptyTitle: 'News & updates',
  newsEmptyBody:
    'No news articles were included in the supplied content. Approved updates can be added here.',
};

export const reports = [
  {
    eyebrow: '01 / Guide',
    title: 'Understanding clinical trials',
    body: 'Explore straightforward information, guides and resources designed to help you understand clinical trials, what participation may involve and the questions you may want to ask along the way.',
    footnote: '',
    published: true,
    order: 1,
  },
  {
    eyebrow: '02 / The essentials',
    title: 'Clinical Trials 101',
    body: 'Understand what clinical trials are and how they work.',
    footnote: 'Full report content to be supplied.',
    published: true,
    order: 2,
  },
];

export const faqs = [
  {
    question: 'Questions to Ask Before Joining',
    answer:
      'Know what to ask the research team before deciding whether a clinical trial is right for you. Full FAQ content to be supplied.',
    published: true,
    order: 1,
  },
  {
    question: 'Understanding Informed Consent',
    answer:
      'Learn about your rights and the information you should receive before making a decision. Full FAQ content to be supplied.',
    published: true,
    order: 2,
  },
  {
    question: 'Clinical Trial Safety',
    answer:
      'Understand how participant safety, rights and wellbeing are considered throughout a clinical trial. Full FAQ content to be supplied.',
    published: true,
    order: 3,
  },
  {
    question: 'Where are Clinical Trial Access trials available?',
    answer:
      'The supplied website content covers Australia and Asia. Specific trial locations are to be confirmed by the research team.',
    published: true,
    order: 4,
  },
  {
    question: 'Can I register for a trial in another country?',
    answer:
      'This answer has not yet been supplied. Contact the research team to discuss location requirements for the particular trial.',
    published: true,
    order: 5,
  },
];

export const news = [];

export const about = {
  eyebrow: 'About us',
  title: 'About Clinical Trial Access',
  paragraphs: [
    'Clinical Trial Access is an initiative of Southern Star Research, an Australian-headquartered contract research organisation supporting clinical trials across Australia and the Asia-Pacific region.',
    'We created Clinical Trial Access to help make clinical trial opportunities easier to find and understand, while providing a simple way for people to connect with research sites looking for participants.',
  ],
  cta: { label: 'Explore Clinical Trials ↗', href: '#trials' },
  wordmark: {
    lines: ['Across countries.', 'Across communities.'],
    small: 'AN INITIATIVE OF SOUTHERN STAR RESEARCH',
    body: 'Through Southern Star Research’s established presence across Australia and Asia, Clinical Trial Access can support access to clinical trial opportunities across multiple countries and communities.',
  },
};

export const contact = {
  eyebrow: 'Contact us',
  title: 'Have a question?',
  paragraphs: [
    'Have a question about Clinical Trial Access or one of the clinical trials featured on our website? Get in touch with us using the form.',
    'If your enquiry relates to a particular clinical trial, please include the trial or condition name and your country/location so your enquiry can be directed appropriately.',
  ],
  note: 'Please do not use this form to provide detailed medical information or seek medical advice. For questions about your health or treatment, please speak with your doctor or healthcare professional.',
  formNote: 'Your enquiry is sent to the Clinical Trial Access team.',
  submitLabel: 'Send Enquiry ↗',
  successMessage:
    'Thank you — your enquiry has been received. The team will be in touch if a response is needed.',
  errorMessage: 'Sorry, your enquiry could not be sent. Please try again shortly.',
};

export const footer = {
  tagline: 'Connecting people with clinical trial opportunities across Australia and Asia.',
  links: [
    { label: 'Access a Trial', href: '#trials' },
    { label: 'Why Join', href: '#why' },
    { label: 'Insights', href: '#insights' },
    { label: 'FAQs', href: '#insights', action: 'faqs' },
    { label: 'Contact Us', href: '#contact' },
  ],
  legal: [
    'Clinical Trial Access is an initiative of Southern Star Research, an Australian-headquartered contract research organisation supporting clinical trials across the Asia-Pacific region.',
    'Information provided on this website is general in nature and is not intended to replace medical advice from your doctor or healthcare professional. Information about a clinical trial on this website does not guarantee eligibility or participation. Eligibility is determined by the research team responsible for each clinical trial.',
    'Images are AI-generated illustrations, not photographs of actual trial participants, staff or facilities.',
  ],
  copyright: '© 2026 Clinical Trial Access / Southern Star Research Pty Ltd.',
};

export const policies = [
  {
    slug: 'privacy-policy',
    title: 'Privacy Policy',
    body: 'Approved policy content has not yet been supplied. This is a website demonstration.',
    order: 1,
    published: true,
  },
  {
    slug: 'terms-of-use',
    title: 'Terms of Use',
    body: 'Approved policy content has not yet been supplied. This is a website demonstration.',
    order: 2,
    published: true,
  },
  {
    slug: 'cookie-policy',
    title: 'Cookie Policy',
    body: 'Approved policy content has not yet been supplied. This is a website demonstration.',
    order: 3,
    published: true,
  },
];

/**
 * Recruiting centres. Each carries the address a registration for it is
 * emailed to — that address is admin-only and never reaches the public API.
 */
export const centres = [
  {
    name: 'Royal North Shore Hospital',
    region: 'New South Wales',
    email: '',
    order: 1,
    published: true,
  },
  {
    name: 'Monash House Research Centre',
    region: 'Victoria',
    email: '',
    order: 2,
    published: true,
  },
];

/** Singleton documents, keyed by their document id in the `content` collection. */
export const SINGLETONS = {
  settings,
  hero,
  heroWide,
  trialsSection,
  facets,
  journey,
  why,
  insights,
  about,
  contact,
  footer,
};

/** List collections, keyed by their Firestore collection name. */
export const COLLECTIONS = { trials, reports, faqs, news, policies, centres };
