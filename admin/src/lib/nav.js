/**
 * The sidebar menu.
 *
 * The console has twenty-odd editors, which as one flat list was more of a
 * wall than a menu. They are grouped here by the job someone came to do
 * rather than by how they are stored, so the things you change together sit
 * together: a trial, the filters visitors find it with, and the wording
 * around the search are one group, even though the first is a collection and
 * the other two are page sections.
 *
 * Only the group holding the open page is expanded, so the menu stays about
 * six lines long until you reach for something.
 */

/** Groups, in menu order. An entry with no `items` is a page of its own. */
export const NAV = [
  {
    id: 'overview',
    label: 'Overview',
    icon: '◱',
    target: { kind: 'dashboard' },
    hint: 'Counts, quick links and where to start',
  },
  {
    id: 'guide',
    label: 'How-to guide',
    icon: '?',
    target: { kind: 'guide' },
    hint: 'Step-by-step instructions for every job',
  },
  {
    id: 'trials',
    label: 'Trials',
    icon: '✚',
    hint: 'The trials themselves, and how visitors find them',
    items: [
      {
        label: 'All trials',
        target: { kind: 'collection', key: 'trials' },
        hint: 'Add, edit, publish and order the trials',
      },
      {
        label: 'Search filter options',
        target: { kind: 'section', key: 'facets' },
        hint: 'The conditions, countries, states and age ranges visitors can pick',
      },
      {
        label: 'Trial search wording',
        target: { kind: 'section', key: 'trialsSection' },
        hint: 'Headings and helper text above the results',
      },
    ],
  },
  {
    id: 'insights',
    label: 'Insights & news',
    icon: '◈',
    hint: 'The Reports, FAQs and News tabs',
    items: [
      { label: 'Reports', target: { kind: 'collection', key: 'reports' } },
      { label: 'FAQs', target: { kind: 'collection', key: 'faqs' } },
      { label: 'News', target: { kind: 'collection', key: 'news' } },
      {
        label: 'Insights wording',
        target: { kind: 'section', key: 'insights' },
        hint: 'The headings above the three tabs',
      },
    ],
  },
  {
    id: 'home',
    label: 'Home page',
    icon: '▤',
    hint: 'The rest of the home page, top to bottom',
    items: [
      { label: 'Hero banner', target: { kind: 'section', key: 'hero' } },
      { label: 'Wide banner image', target: { kind: 'section', key: 'heroWide' } },
      { label: 'Finding a trial', target: { kind: 'section', key: 'journey' } },
      { label: 'Why join', target: { kind: 'section', key: 'why' } },
      { label: 'About', target: { kind: 'section', key: 'about' } },
      { label: 'Contact', target: { kind: 'section', key: 'contact' } },
    ],
  },
  {
    id: 'enquiries',
    label: 'Enquiries',
    icon: '✉',
    target: { kind: 'enquiries' },
    hint: 'Messages sent through the contact form',
  },
  {
    id: 'setup',
    label: 'Site setup',
    icon: '⚙',
    hint: 'Header, footer, pictures, legal text and sign-ins',
    items: [
      {
        label: 'Header & site name',
        target: { kind: 'section', key: 'settings' },
        hint: 'Brand, top banner, menu links and page metadata',
      },
      { label: 'Footer', target: { kind: 'section', key: 'footer' } },
      {
        label: 'Pictures',
        target: { kind: 'media' },
        hint: 'Everything uploaded, reusable anywhere on the site',
      },
      {
        label: 'Policies',
        target: { kind: 'collection', key: 'policies' },
        hint: 'Privacy, terms and cookie text',
      },
      {
        label: 'Users',
        target: { kind: 'users' },
        adminOnly: true,
        hint: 'Who can sign in to this console',
      },
    ],
  },
];

const sameTarget = (a, b) =>
  a.kind === b.kind && (a.key === undefined ? b.key === undefined : a.key === b.key);

/** Drop the entries this role may not open, and any group left empty. */
export function navFor(role) {
  return NAV.map((group) =>
    group.items
      ? { ...group, items: group.items.filter((i) => !i.adminOnly || role === 'admin') }
      : group,
  ).filter((group) => !group.items || group.items.length > 0);
}

/** The id of the group holding a view, so the menu can open it. */
export function groupIdFor(view, role = 'admin') {
  const match = navFor(role).find((group) =>
    group.items
      ? group.items.some((i) => sameTarget(i.target, view))
      : sameTarget(group.target, view),
  );
  return match?.id ?? null;
}

export { sameTarget };
