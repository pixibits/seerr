import Alert from '@app/components/Common/Alert';
import CachedImage from '@app/components/Common/CachedImage';
import Tooltip from '@app/components/Common/Tooltip';
import useSettings from '@app/hooks/useSettings';
import { useUser } from '@app/hooks/useUser';
import defineMessages from '@app/utils/defineMessages';
import type { WatchProviderDetails } from '@server/models/common';
import type { MovieDetails } from '@server/models/Movie';
import type { TvDetails } from '@server/models/Tv';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';

const messages = defineMessages('components.RequestModal', {
  streamingproviders: 'This is currently streaming on:',
  unreleased:
    'Warning: This title is not available yet. This request will be fulfilled when it is available.',
  unreleaseddate:
    'Warning: This title is not available yet. This request will be fulfilled when it becomes available on {date}.',
});

interface RequestModalMediaInfoProps {
  mediaType: 'movie' | 'tv';
  data?: MovieDetails | TvDetails;
}

const DEFAULT_REGION = 'US';
const AT_HOME_RELEASE_TYPES = [4, 5];

const isMovieData = (
  mediaType: RequestModalMediaInfoProps['mediaType'],
  data?: MovieDetails | TvDetails
): data is MovieDetails => mediaType === 'movie' && !!data;

const isTvData = (
  mediaType: RequestModalMediaInfoProps['mediaType'],
  data?: MovieDetails | TvDetails
): data is TvDetails => mediaType === 'tv' && !!data;

const getTimestamp = (dateString?: string): number | null => {
  if (!dateString) {
    return null;
  }

  const timestamp = new Date(dateString).getTime();

  return Number.isNaN(timestamp) ? null : timestamp;
};

const isPastOrToday = (dateString?: string): boolean => {
  const timestamp = getTimestamp(dateString);

  return timestamp !== null && timestamp <= Date.now();
};

const isFutureDate = (dateString?: string): boolean => {
  const timestamp = getTimestamp(dateString);

  return timestamp !== null && timestamp > Date.now();
};

const sortByDate = (left: string, right: string): number => {
  return (
    (getTimestamp(left) ?? Number.MAX_SAFE_INTEGER) -
    (getTimestamp(right) ?? Number.MAX_SAFE_INTEGER)
  );
};

const dedupeProviders = (
  providers: WatchProviderDetails[] = []
): WatchProviderDetails[] => {
  const uniqueProviders = new Map<number, WatchProviderDetails>();

  providers.forEach((provider) => {
    if (provider.logoPath && !uniqueProviders.has(provider.id)) {
      uniqueProviders.set(provider.id, provider);
    }
  });

  return [...uniqueProviders.values()].sort(
    (left, right) =>
      (left.displayPriority ?? Number.MAX_SAFE_INTEGER) -
      (right.displayPriority ?? Number.MAX_SAFE_INTEGER)
  );
};

const getPreferredMovieReleaseDates = (
  movie: MovieDetails,
  discoverRegion: string
): string[] => {
  const releases = movie.releases.results ?? [];
  const prioritizedRegions = [discoverRegion, DEFAULT_REGION].filter(
    (region, index, allRegions) =>
      region && allRegions.indexOf(region) === index
  );
  const prioritizedReleaseGroups = prioritizedRegions
    .map((region) =>
      releases.find((releaseGroup) => releaseGroup.iso_3166_1 === region)
    )
    .filter(
      (
        releaseGroup
      ): releaseGroup is MovieDetails['releases']['results'][number] =>
        releaseGroup !== undefined
    );
  const remainingReleaseGroups = releases.filter(
    (releaseGroup) => !prioritizedRegions.includes(releaseGroup.iso_3166_1)
  );
  const selectedReleaseGroup = [
    ...prioritizedReleaseGroups,
    ...remainingReleaseGroups,
  ].find((releaseGroup) =>
    releaseGroup.release_dates.some((releaseDate) =>
      AT_HOME_RELEASE_TYPES.includes(releaseDate.type)
    )
  );

  if (!selectedReleaseGroup) {
    return [];
  }

  return selectedReleaseGroup.release_dates
    .filter((releaseDate) => AT_HOME_RELEASE_TYPES.includes(releaseDate.type))
    .map((releaseDate) => releaseDate.release_date)
    .filter((releaseDate) => releaseDate)
    .sort(sortByDate);
};

const RequestModalMediaInfo = ({
  mediaType,
  data,
}: RequestModalMediaInfoProps) => {
  const intl = useIntl();
  const settings = useSettings();
  const { user } = useUser();

  const streamingRegion =
    user?.settings?.streamingRegion ||
    settings.currentSettings.streamingRegion ||
    DEFAULT_REGION;
  const discoverRegion =
    user?.settings?.discoverRegion ||
    settings.currentSettings.discoverRegion ||
    DEFAULT_REGION;

  const providers = useMemo(() => {
    if (!data?.watchProviders) {
      return [];
    }

    return dedupeProviders(
      data.watchProviders.find(
        (providerRegion) => providerRegion.iso_3166_1 === streamingRegion
      )?.flatrate
    );
  }, [data?.watchProviders, streamingRegion]);

  const warningDate = useMemo(() => {
    if (!data) {
      return undefined;
    }

    if (isMovieData(mediaType, data)) {
      const releaseDates = getPreferredMovieReleaseDates(data, discoverRegion);

      if (releaseDates.some((releaseDate) => isPastOrToday(releaseDate))) {
        return null;
      }

      return (
        releaseDates.find((releaseDate) => isFutureDate(releaseDate)) ??
        undefined
      );
    }

    if (isTvData(mediaType, data) && isFutureDate(data.firstAirDate)) {
      return data.firstAirDate;
    }

    return null;
  }, [data, discoverRegion, mediaType]);

  const shouldShowWarning = useMemo(() => {
    if (!data) {
      return false;
    }

    if (isMovieData(mediaType, data)) {
      const releaseDates = getPreferredMovieReleaseDates(data, discoverRegion);

      return (
        releaseDates.length === 0 ||
        !releaseDates.some((releaseDate) => isPastOrToday(releaseDate))
      );
    }

    return isTvData(mediaType, data) && isFutureDate(data.firstAirDate);
  }, [data, discoverRegion, mediaType]);

  if (!shouldShowWarning && providers.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {shouldShowWarning && (
        <Alert
          type="warning"
          title={
            <span data-testid="request-modal-release-warning">
              {warningDate
                ? intl.formatMessage(messages.unreleaseddate, {
                    date: intl.formatDate(warningDate, {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    }),
                  })
                : intl.formatMessage(messages.unreleased)}
            </span>
          }
        />
      )}
      {providers.length > 0 && (
        <div data-testid="request-modal-streaming-providers">
          <div className="text-sm font-medium text-gray-100">
            {intl.formatMessage(messages.streamingproviders)}
          </div>
          <div className="mt-3 flex flex-row flex-wrap gap-4">
            {providers.map((provider) => (
              <Tooltip content={provider.name} key={`provider-${provider.id}`}>
                <span className="opacity-80 transition duration-300 hover:opacity-100">
                  <CachedImage
                    type="tmdb"
                    src={`https://image.tmdb.org/t/p/w45/${provider.logoPath}`}
                    alt={provider.name}
                    width={32}
                    height={32}
                    className="rounded-md"
                  />
                </span>
              </Tooltip>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestModalMediaInfo;
