import { Analytics } from '@deriv-com/analytics';

import WS from '../ws-methods';
import BinarySocketGeneral from '../socket-general';

jest.mock('@deriv/shared', () => ({
    getPropertyValue: jest.fn(),
    getSocketURL: jest.fn(() => 'wss://test.example/websockets/v3'),
    mapErrorMessage: jest.fn(),
}));

jest.mock('../ws-methods', () => ({
    __esModule: true,
    default: {
        setOnReconnect: jest.fn(),
        get: jest.fn(),
        subscribeBalance: jest.fn(),
        forgetAll: jest.fn(),
    },
}));

jest.mock('_common/base/server_time', () => ({
    __esModule: true,
    default: {
        init: jest.fn(),
        get: jest.fn(),
    },
}));

describe('BinarySocketGeneral onOpen response timeout reporting', () => {
    const trackEvent = Analytics.trackEvent;
    let onOpen;
    let console_error_spy;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
        console_error_spy = jest.spyOn(console, 'error').mockImplementation(() => {});

        WS.get.mockReturnValue({
            expect_response_types: {
                ping: { state: 'pending' },
                time: { state: 'resolved' },
            },
        });

        const store = {
            client: { loginid: 'CR123' },
            common: { setIsSocketOpened: jest.fn(), setServerTime: jest.fn() },
            gtm: {},
        };

        ({ onOpen } = BinarySocketGeneral.init(store));
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
        console_error_spy.mockRestore();
    });

    it('reports a websocket_timeout event with the pending response types after 30s', () => {
        onOpen(true);

        jest.advanceTimersByTime(30000);

        expect(trackEvent).toHaveBeenCalledTimes(1);
        expect(trackEvent).toHaveBeenCalledWith('websocket_timeout', {
            message: 'deriv-api: no message received after 30s',
            websocketUrl: 'wss://test.example/websockets/v3',
            pendingResponseTypes: ['ping'],
        });
    });

    it('does not report before the 30s timeout has elapsed', () => {
        onOpen(true);

        jest.advanceTimersByTime(29999);

        expect(trackEvent).not.toHaveBeenCalled();
    });

    it('swallows analytics reporting failures without throwing from the timer callback', () => {
        trackEvent.mockImplementationOnce(() => {
            throw new Error('analytics down');
        });

        onOpen(true);

        expect(() => jest.advanceTimersByTime(30000)).not.toThrow();
        expect(console_error_spy).toHaveBeenCalledWith('Failed to report error to analytics:', expect.any(Error));
    });
});
