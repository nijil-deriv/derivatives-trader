import { Analytics } from '@deriv-com/analytics';
import { logError } from '../logging';

jest.mock('@deriv-com/analytics', () => ({
    Analytics: {
        trackEvent: jest.fn(),
    },
}));

describe('logError', () => {
    const mockAnalytics = Analytics as jest.Mocked<typeof Analytics>;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('reports the message and data via Analytics.trackEvent', () => {
        const testMessage = 'test error message';
        const testData = { foo: 'bar', userId: '123' };

        logError(testMessage, testData);

        expect(mockAnalytics.trackEvent).toHaveBeenCalledWith('log_error', {
            message: testMessage,
            ...testData,
        });
    });

    it('handles an empty data object', () => {
        const testMessage = 'test error without data';

        logError(testMessage);

        expect(mockAnalytics.trackEvent).toHaveBeenCalledWith('log_error', {
            message: testMessage,
        });
    });

    it('swallows analytics errors so callers never break', () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        (mockAnalytics.trackEvent as jest.Mock).mockImplementation(() => {
            throw new Error('analytics error');
        });

        expect(() => logError('test message')).not.toThrow();
        expect(consoleSpy).toHaveBeenCalledWith('Failed to report error to analytics:', expect.any(Error));

        consoleSpy.mockRestore();
    });
});
