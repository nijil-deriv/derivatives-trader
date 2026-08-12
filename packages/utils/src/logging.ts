import { Analytics } from '@deriv-com/analytics';

export type TLogData = Record<string, unknown>;

export const logError = (message: string, data: TLogData = {}): void => {
    // Report the error to PostHog via the analytics wrapper. Wrapped in a
    // try/catch so a logging failure never breaks the calling code path.
    try {
        Analytics.trackEvent('log_error', { message, ...data });
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to report error to analytics:', error);
    }
};
