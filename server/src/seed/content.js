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
  brand: { mark: '✳', name: 'Clinical Trial', suffix: 'ACCESS' },
  // The site opens on the trial search; the rest is reached from the results.
  nav: [{ label: 'Access a Trial', href: '#trials' }],
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
  generalEmailLabel: 'General enquiries',
  generalEmail: 'info@southernstarresearch.com',
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

/**
 * Footer policies. Bodies use a light markup the site renders: a blank line
 * between paragraphs, "## " for a heading, "- " for a list item and **bold**.
 */
const PRIVACY_POLICY = `Clinical Trial Access is operated by Southern Star Research Pty Ltd (“Southern Star Research”, “SSR”, “we”, “us” or “our”).

We respect your privacy and are committed to handling personal information in accordance with applicable Australian privacy requirements, including the Privacy Act 1988 (Cth) and the Australian Privacy Principles.

## Information submitted through Clinical Trial Access

Clinical Trial Access may allow you to submit information to express interest in a clinical trial, make an enquiry or request further information.

Depending on the form you complete, this may include your name, contact details and information relevant to your clinical trial enquiry.

The Clinical Trial Access platform does not retain identifiable information submitted through these forms. Information is securely transmitted to the nominated authorised contact responsible for managing the enquiry. Depending on the nature of your enquiry, this may include clinical study site personnel, an authorised enquiry representative or the designated Privacy Officer.

Southern Star Research does not use information submitted through these forms for unrelated marketing or other purposes.

SSR may retain aggregate, non-identifiable metrics about website and form activity for reporting and service improvement purposes.

## Clinical trial enquiries

Submitting an enquiry through Clinical Trial Access does not mean that you have been accepted into, are eligible for, or will participate in a clinical trial.

The relevant clinical study team or authorised contact will assess your enquiry and, where appropriate, contact you directly regarding potential next steps.

## Website information and analytics

When you visit this website, certain technical information may be processed automatically, such as browser type, device information, pages visited and general website usage information.

We may use cookies and similar technologies to understand how the website is used, maintain website functionality and improve the user experience. Where required, you will be provided with choices about non-essential cookies.

For more information, please see our Cookie Policy.

## Sharing of information

Information submitted through a Clinical Trial Access form will only be transmitted to the authorised recipient or recipients required to manage your enquiry.

Where information may be disclosed to a recipient outside Australia, we will handle that disclosure in accordance with applicable privacy requirements.

## Security

We take reasonable steps to protect personal information handled through Clinical Trial Access from misuse, interference, loss, unauthorised access, modification or disclosure.

## Your privacy rights

If you have questions about how your personal information is handled, would like to make a privacy enquiry or complaint, or would like to exercise any rights available to you under applicable privacy law, please contact Southern Star Research through the contact details provided on this website.

You can also view the Southern Star Research Privacy Policy for further information about our privacy practices.

## Contact us

For privacy-related questions about Clinical Trial Access, please contact:

- **Telephone:** +61 (0)2 9011 6266
- **Email:** info@SouthernstarResearch.com
- **Post:** Privacy Officer, Southern Star Research Pty Ltd

*Effective 30 September 2026*`;

const LEGAL_NOTICE = `Clinical Trial Access, part of Southern Star Research Pty Ltd, is operated in accordance with Southern Star Research’s legal requirements and policies.

The Southern Star Research Legal Notice provides information about the use of website content, including copyright and intellectual property. Reproduction, adaptation or translation of website content without prior written permission is prohibited, except where permitted by applicable copyright laws.

By using the Clinical Trial Access website, you acknowledge that the Southern Star Research Legal Notice applies to the content provided on this website.`;

const COOKIE_POLICY = `*Effective 29 September 2026*

## 1. Introduction

This Cookie Policy explains how the Clinical Trial Access website (https://clinicaltrialaccess.org) uses cookies and similar technologies to recognise you when you visit. It explains what these technologies are, why we use them, and your rights to control our use of them.

## 2. What are cookies?

Cookies are small data files that are placed on your computer or mobile device when you visit a website. Cookies are widely used by website owners to make their websites work, or to work more efficiently, as well as to provide reporting information.

- **Session cookies:** temporary cookies that expire when you close your browser.
- **Persistent cookies:** cookies that remain on your device for a set period or until you delete them manually.

## 3. How we use cookies

Given the nature of our clinical trial website, we prioritise security and user privacy. We use first-party and third-party cookies for several reasons. Some cookies are required for technical reasons in order for our website to operate; we refer to these as “Essential” or “Strictly Necessary” cookies.

We use the following types of cookies:

- **Strictly Necessary cookies:** essential to provide you with the services available through our website and to use its features, such as maintaining security and session integrity. Without these cookies, the services you have asked for cannot be provided.
- **Performance and Analytics cookies:** collect information that is used in aggregate form to help us understand how our website is being used and how effective it is.
- **Functionality cookies:** used to recognise you when you return to our website, so that we can remember your preferences (for example, your choice of language or region).

## 4. Third-party cookies

In addition to our own cookies, we may also use third-party cookies to report usage statistics for the website and to ensure the secure delivery of the website’s infrastructure.

## 5. How can you control cookies?

You have the right to decide whether to accept or reject cookies. You can set or amend your web browser controls to accept or refuse cookies. If you choose to reject cookies, you may still use our website, although access to some of its functionality may be restricted.

You can manage cookies in popular browsers as follows:

- **Google Chrome:** Settings > Privacy and security > Cookies and other site data
- **Mozilla Firefox:** Settings > Privacy & Security > Cookies and Site Data
- **Apple Safari:** Settings > Privacy > Cookies and website data
- **Microsoft Edge:** Settings > Cookies and site permissions

## 6. Updates to this Cookie Policy

We may update this Cookie Policy from time to time to reflect, for example, changes to the cookies we use or for other operational, legal or regulatory reasons. Please revisit this Cookie Policy regularly to stay informed about our use of cookies and related technologies.`;

/**
 * The text every policy carried before approved wording was supplied. A stored
 * policy still holding exactly this is replaced on start-up; one that has been
 * edited in the admin is left alone.
 */
export const PLACEHOLDER_POLICY_BODY =
  'Approved policy content has not yet been supplied. This is a website demonstration.';

export const policies = [
  { slug: 'privacy-policy', title: 'Privacy Policy', body: PRIVACY_POLICY, order: 1, published: true },
  // Formerly "Terms of Use" (slug terms-of-use).
  { slug: 'legal-notice', title: 'Legal Notice', body: LEGAL_NOTICE, order: 2, published: true },
  { slug: 'cookie-policy', title: 'Cookie Policy', body: COOKIE_POLICY, order: 3, published: true },
];

/**
 * Recruiting centres. Each carries the address a registration for it is
 * emailed to — that address is admin-only and never reaches the public API.
 */
const centre = (name, region, email, order) => ({ name, region, email, order, published: true });

export const centres = [
  centre('Royal North Shore Hospital', 'New South Wales', 'Jean.Doyle@health.nsw.gov.au', 1),
  centre('John Hunter Hospital', 'New South Wales', 'Ashley.Kite@hmri.org.au', 2),
  centre('Coffs Harbour Hospital', 'New South Wales', 'amber.carle@health.nsw.gov.au', 3),
  centre('Mackay Hospital and Health Service', 'Queensland', 'Adessa.Daba@health.qld.gov.au', 4),
  centre('Mater Hospital', 'Queensland', 'amy.jones@mater.org.au', 5),
  centre('Monash House Research Centre', 'Victoria', 'research@monashhouse.com.au', 6),
  centre('The Alfred Bayside', 'Victoria', 'justin.bradley@alfred.org.au', 7),
  centre('Sir Charles Gairdner Hospital', 'Western Australia', 'Louise.Ferguson@health.wa.gov.au', 8),
  centre('St John of God', 'Western Australia', 'MI.clinicaltrials@sjog.org.au', 9),
];

/**
 * Where enquiries from the contact form are sent. Admin-only, like the centre
 * addresses: it is stored outside the public content sections.
 */
export const enquirySettings = { notifyEmail: 'info@southernstarresearch.com' };

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
