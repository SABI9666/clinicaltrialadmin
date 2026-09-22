/**
 * The sidebar: a short list of headings, each opening to reveal its pages.
 *
 * One group is open at a time — the one holding the current page — so the
 * menu never grows back into the long list it replaced.
 */
import { useEffect, useState } from 'react';
import { groupIdFor, navFor, sameTarget } from '../lib/nav.js';

export default function SideNav({ view, role, onNavigate }) {
  const groups = navFor(role);
  const [openId, setOpenId] = useState(() => groupIdFor(view, role));

  // Following a link from elsewhere (the guide, a card) must open the group
  // that link landed in, so the menu always shows where you are.
  useEffect(() => {
    const id = groupIdFor(view, role);
    if (id) setOpenId(id);
  }, [view, role]);

  return (
    <div className="nav">
      {groups.map((group) => {
        if (!group.items) {
          const active = sameTarget(group.target, view);
          return (
            <button
              key={group.id}
              type="button"
              className={`nav-link${active ? ' active' : ''}`}
              title={group.hint}
              onClick={() => onNavigate(group.target)}
            >
              <span className="nav-icon" aria-hidden="true">
                {group.icon}
              </span>
              <span className="nav-label">{group.label}</span>
            </button>
          );
        }

        const open = openId === group.id;
        const holdsView = group.items.some((i) => sameTarget(i.target, view));

        return (
          <div className={`nav-section${open ? ' open' : ''}`} key={group.id}>
            <button
              type="button"
              className={`nav-link${holdsView && !open ? ' active' : ''}`}
              aria-expanded={open}
              title={group.hint}
              onClick={() => setOpenId(open ? null : group.id)}
            >
              <span className="nav-icon" aria-hidden="true">
                {group.icon}
              </span>
              <span className="nav-label">{group.label}</span>
              <span className="nav-chevron" aria-hidden="true">
                ▾
              </span>
            </button>

            {open && (
              <div className="nav-children">
                {group.hint && <p className="nav-note">{group.hint}.</p>}
                {group.items.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    className={sameTarget(item.target, view) ? 'active' : ''}
                    title={item.hint}
                    onClick={() => onNavigate(item.target)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
