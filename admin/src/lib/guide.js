/**
 * The admin handbook, shown on the Guide page.
 *
 * It is written for someone opening this console for the first time, so it
 * avoids words like "field", "record" and "collection" and names the buttons
 * exactly as they appear on screen. Each chapter can point at the page it
 * describes, so reading and doing stay one click apart.
 */

export const GUIDE = [
  {
    id: 'start',
    title: 'Start here',
    intro:
      'This console controls everything on the public Clinical Trial Access website. Nothing you change is live until you press a Save button, and every change can be edited again afterwards.',
    steps: [
      'The menu on the left is a short list of headings. Press one — "Trials", "Insights & news", "Home page", "Site setup" — and it opens to show the pages inside it. Only one heading is open at a time, so the menu stays short.',
      'Each heading holds the things you change together: "Trials" has the trials themselves, the options visitors search by, and the wording around the search.',
      'Open a page, change what you need, then press the blue button at the top right ("Save changes") or, for a new entry, "Create".',
      'A blue "Save changes" button means you have unsaved edits. When it reads "Saved", everything is stored.',
      'Use "View site ↗" on the Overview page to check the result on the real website. Refresh that tab after saving.',
    ],
    note: 'If you are unsure whether a change is safe, save it as a draft first: untick "Published" so only the admin team can see it.',
  },
  {
    id: 'trials',
    title: 'Add or update a trial',
    intro:
      'Trials are the heart of the site. Each one is a card in the search results plus a pop-up with the full description.',
    goto: { kind: 'collection', key: 'trials' },
    gotoLabel: 'Open Trials',
    steps: [
      'Open "Trials" in the menu, then "All trials". The list shows every trial with a "Live" or "Draft" tag.',
      'To change an existing trial, select it in the list. To add one, press "+ New trial" at the top right.',
      'Fill in "The basics": the trial title, and whether it is published. The web address name fills itself in from the title.',
      'In "How visitors find it", choose the condition, country, states/territories and age range from the dropdowns. These are what the search on the website filters by.',
      'In "The card in the list", write the short paragraphs visitors read in the results, and choose a picture.',
      'In "The detail pop-up", write the full description that opens when a visitor presses "Learn more".',
      'Press "Save changes" (or "Create trial"). The trial appears on the site as soon as it is saved and marked Live.',
    ],
    note:
      'Leave a filter on "Not specified" when the detail is not confirmed. A blank filter never hides the trial — it shows up whatever the visitor searches for, which is safer than guessing.',
  },
  {
    id: 'filters',
    title: 'Add a new condition, country or state / territory',
    intro:
      'The four dropdowns on the website — Condition, Country, State / territory and Age range — are one shared list. A trial only appears under a filter when it uses exactly the same option, so options are always picked from this list, never typed freehand.',
    goto: { kind: 'section', key: 'facets' },
    gotoLabel: 'Open Search filter options',
    steps: [
      'The quick way, while editing a trial: under "How visitors find it", press "+ Add a new condition" (or country, or state / territory) under the matching dropdown, type the name, and press "Add". It is saved to the site’s filters straight away and selected for the trial you are editing.',
      'The full way: open "Trials" in the menu, then "Search filter options", where all four lists live together.',
      'For a condition or an age range, press "+ Add" at the bottom of the list and type it in.',
      'For a country, press "+ Add country", type its name, then press "+ Add" under it for each state or territory.',
      'Press "Save changes" at the top right. The website dropdowns update immediately.',
    ],
    note:
      'Spelling and capitals must match between a trial and the filter list. If a trial shows a red warning saying its value is "not in the filter list", press the "Add … to the filters" link in that warning to fix it in one step.',
  },
  {
    id: 'registrations',
    title: 'Registrations, centres and where the emails go',
    intro:
      'When someone presses the button on a trial, a three-step registration form opens. What they fill in is emailed to the centre they choose — it is never stored in this console.',
    goto: { kind: 'collection', key: 'centres' },
    gotoLabel: 'Open Centres & emails',
    steps: [
      'Open Trials \u2192 Centres & emails and add one entry per centre or region, each with the email address its registrations should go to. That address is never shown on the website.',
      'Open the trial under Trials \u2192 All trials and scroll to "The registration form". Tick which centres recruit for it, and write the questions you want asked.',
      'Each question can have answer choices (Yes / No / Unsure) or, with no choices, a plain box for the person to type in.',
      'A visitor now sees: step 1 consent, step 2 their name, email and phone, step 3 your questions and the centre dropdown.',
      'On submit, the centre gets an email with their details and answers. When the centre presses Reply, the reply goes straight to the person \u2014 not to you.',
      'Trials \u2192 Registrations shows that each one was delivered. It holds no personal details at all, only the date, the trial, the centre, and whether the email got through.',
    ],
    note:
      'Nothing is emailed anywhere if a centre has no address saved, so check Centres & emails first. If the Registrations page warns that email sending is not set up, the server still needs its mail settings \u2014 ask whoever deployed it.',
  },
  {
    id: 'publish',
    title: 'Publishing, drafts and deleting',
    intro: 'Every trial, report, FAQ, news item and policy is either Live or Draft.',
    steps: [
      'Live means the public website shows it. Draft means only this console can see it.',
      'Tick or untick "Published — visible on the public site" in the editor, or press the ● / ◯ button beside the entry in the list for the same result without opening it.',
      'The ↑ and ↓ buttons beside an entry change the order visitors see it in.',
      '✕ deletes permanently and cannot be undone. Prefer making something a draft over deleting it.',
    ],
  },
  {
    id: 'sections',
    title: 'Change the wording on the home page',
    intro:
      'Open "Home page" in the menu for the blocks down the page — the hero banner at the top, then "Finding a trial", "Why join", "About" and "Contact".',
    steps: [
      'The header, the footer and the site name are under "Site setup". The wording around the trial search is under "Trials", and the Insights headings under "Insights & news" — each sits with the thing it belongs to.',
      'Pick the section you want from the menu. The note under its title tells you where it appears on the site.',
      'Change the text boxes, then press "Save changes".',
      'Lists of lines — headings, paragraphs, trust badges — have "+ Add" to add one, ↑ ↓ to reorder and ✕ to remove.',
      '"Reset to default" puts a whole section back to the original wording it shipped with. It cannot be undone, and only an admin can do it.',
    ],
  },
  {
    id: 'images',
    title: 'Pictures',
    intro: 'Pictures are uploaded once and can then be reused anywhere on the site.',
    goto: { kind: 'media' },
    gotoLabel: 'Open Pictures',
    steps: [
      'Wherever you see a picture box, press "Choose or upload…" to pick an existing image or add a new one.',
      'Always write alt text: a short description of what the picture shows, read aloud to visitors using a screen reader.',
      'Site setup → Pictures lists everything uploaded, where you can rename the alt text or delete unused ones.',
    ],
  },
  {
    id: 'enquiries',
    title: 'Enquiries from visitors',
    intro: 'Messages sent through the contact form on the website arrive here.',
    goto: { kind: 'enquiries' },
    gotoLabel: 'Open Enquiries',
    steps: [
      '"Enquiries" in the menu lists them newest first, with tabs for New, Read and Archived.',
      'Change an enquiry’s status with the dropdown on it, so the team can see what has been handled.',
      'The Overview page shows how many new enquiries are waiting.',
    ],
  },
  {
    id: 'users',
    title: 'Who can sign in',
    intro: 'There are two kinds of account.',
    steps: [
      'An editor can change all content, pictures and enquiries.',
      'An admin can do all of that, plus add or remove accounts, change passwords and use "Reset to default".',
      'Admins manage accounts under Site setup → Users.',
    ],
  },
  {
    id: 'trouble',
    title: 'If something looks wrong',
    intro: 'The usual causes, in the order worth checking.',
    steps: [
      'A change is not on the website: check you pressed Save, then refresh the website tab.',
      'A trial is missing from a search: its condition, country, state or age range probably does not match the Search filter options list exactly. Open the trial and look for a red warning under the dropdowns.',
      'A trial is missing from the site entirely: it is likely a Draft. Tick "Published".',
      'You are asked to sign in again: sessions end when you close the tab. Sign back in — nothing saved is lost.',
      'A red message appears when saving: it names the box that needs attention. Required boxes are marked with a red *.',
    ],
  },
];
