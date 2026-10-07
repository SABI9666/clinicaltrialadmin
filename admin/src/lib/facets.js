/**
 * Shared access to the "Search filters" section (conditions, countries with
 * their states, and age ranges).
 *
 * The public site matches a trial to a filter by exact text, so a trial whose
 * condition is typed by hand never appears under any condition filter. Every
 * editor therefore picks from this one list instead of offering a free-text
 * box, and new options are added here — from wherever the admin happens to be.
 *
 * The list is cached at module level and shared between editors, so an option
 * added while editing a trial is immediately offered by the next trial too.
 */
import { api } from './api.js';
import { useCallback, useEffect, useState } from 'react';

const EMPTY = { conditions: [], countries: [], ageRanges: [] };

let cache = null;
let inFlight = null;
const listeners = new Set();

const normalise = (raw) => ({
  ...raw,
  conditions: Array.isArray(raw?.conditions) ? raw.conditions : [],
  countries: Array.isArray(raw?.countries) ? raw.countries : [],
  ageRanges: Array.isArray(raw?.ageRanges) ? raw.ageRanges : [],
});

function publish(next) {
  cache = next;
  listeners.forEach((fn) => fn(next));
}

/** Load once, then serve every later caller from the cache. */
function loadFacets() {
  if (cache) return Promise.resolve(cache);
  if (!inFlight) {
    inFlight = api
      .getSection('facets')
      .then((raw) => {
        publish(normalise(raw));
        return cache;
      })
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}

/** Drop the cache so the next reader re-reads the saved section. */
export function invalidateFacets() {
  cache = null;
}

/** Push an edited section straight into the cache (used by the facets editor). */
export function primeFacets(raw) {
  publish(normalise(raw));
}

async function persist(next) {
  const saved = normalise(await api.saveSection('facets', next));
  publish(saved);
  return saved;
}

/** The states a country offers, or an empty list when the country is unknown. */
export function statesOf(facets, countryName) {
  if (!countryName) return [];
  return facets?.countries?.find((c) => c.name === countryName)?.states ?? [];
}

/**
 * React access to the filter options.
 *
 * `add*` helpers save the section immediately: adding an option is a small,
 * deliberate act, and making it survive without a second "save" elsewhere is
 * what keeps the flow understandable.
 */
export function useFacets() {
  const [facets, setFacets] = useState(cache ?? EMPTY);
  const [ready, setReady] = useState(Boolean(cache));
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    listeners.add(setFacets);

    loadFacets()
      .then(() => active && setReady(true))
      .catch((err) => active && setError(err.message));

    return () => {
      active = false;
      listeners.delete(setFacets);
    };
  }, []);

  const addCondition = useCallback(async (name) => {
    const value = name.trim();
    if (!value) return;
    const current = cache ?? EMPTY;
    if (current.conditions.includes(value)) return;
    await persist({ ...current, conditions: [...current.conditions, value] });
  }, []);

  const addAgeRange = useCallback(async (name) => {
    const value = name.trim();
    if (!value) return;
    const current = cache ?? EMPTY;
    if (current.ageRanges.includes(value)) return;
    await persist({ ...current, ageRanges: [...current.ageRanges, value] });
  }, []);

  const addCountry = useCallback(async (name) => {
    const value = name.trim();
    if (!value) return;
    const current = cache ?? EMPTY;
    if (current.countries.some((c) => c.name === value)) return;
    await persist({ ...current, countries: [...current.countries, { name: value, states: [] }] });
  }, []);

  /** Add a state/territory under a country, creating the country if needed. */
  const addState = useCallback(async (countryName, state) => {
    const country = countryName.trim();
    const value = state.trim();
    if (!country || !value) return;
    const current = cache ?? EMPTY;
    const known = current.countries.some((c) => c.name === country);

    const countries = known
      ? current.countries.map((c) =>
          c.name === country && !(c.states ?? []).includes(value)
            ? { ...c, states: [...(c.states ?? []), value] }
            : c,
        )
      : [...current.countries, { name: country, states: [value] }];

    await persist({ ...current, countries });
  }, []);

  return { facets, ready, error, addCondition, addCountry, addState, addAgeRange };
}
