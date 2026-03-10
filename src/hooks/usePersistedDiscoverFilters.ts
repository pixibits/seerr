import type { FilterOptions } from '@app/components/Discover/constants';
import { prepareFilterValues } from '@app/components/Discover/constants';
import { mergeQueryString } from '@app/hooks/useUpdateQueryParams';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';

const discoverStorageKeys = {
  movie: 'discover-movie-settings',
  tv: 'discover-tv-settings',
} as const;

const isFilterStateEmpty = (filterValues: FilterOptions): boolean =>
  Object.keys(filterValues).length === 0;

const parseStoredFilterValues = (
  filterString: string | null
): FilterOptions | null => {
  if (!filterString) {
    return null;
  }

  try {
    return prepareFilterValues(JSON.parse(filterString));
  } catch {
    return null;
  }
};

const usePersistedDiscoverFilters = (
  type: keyof typeof discoverStorageKeys
): {
  preparedFilters: FilterOptions;
  isRestored: boolean;
} => {
  const router = useRouter();
  const [isRestored, setIsRestored] = useState(false);
  const storageKey = discoverStorageKeys[type];
  const preparedFilters = useMemo(
    () => prepareFilterValues(router.query),
    [router.query]
  );

  useEffect(() => {
    if (!router.isReady || isRestored || typeof window === 'undefined') {
      return;
    }

    if (!isFilterStateEmpty(preparedFilters)) {
      setIsRestored(true);
      return;
    }

    const storedFilters = parseStoredFilterValues(
      window.localStorage.getItem(storageKey)
    );

    if (!storedFilters || isFilterStateEmpty(storedFilters)) {
      window.localStorage.removeItem(storageKey);
      setIsRestored(true);
      return;
    }

    const newRoute = mergeQueryString(router, storedFilters);

    if (newRoute.path === router.asPath) {
      setIsRestored(true);
      return;
    }

    void router.replace(newRoute.pathname, newRoute.path).finally(() => {
      setIsRestored(true);
    });
  }, [isRestored, preparedFilters, router, storageKey]);

  useEffect(() => {
    if (!router.isReady || !isRestored || typeof window === 'undefined') {
      return;
    }

    if (isFilterStateEmpty(preparedFilters)) {
      window.localStorage.removeItem(storageKey);
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(preparedFilters));
  }, [isRestored, preparedFilters, router.isReady, storageKey]);

  return {
    preparedFilters,
    isRestored,
  };
};

export default usePersistedDiscoverFilters;
