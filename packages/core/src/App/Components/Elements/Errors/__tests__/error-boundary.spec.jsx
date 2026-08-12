import React from 'react';

import { Analytics } from '@deriv-com/analytics';
import { render, screen } from '@testing-library/react';

import ErrorBoundary from '../error-boundary';

// Keep the fallback UI trivial so these tests stay focused on the analytics
// reporting call site rather than the full PageErrorContainer render tree.
jest.mock('../index', () => {
    const MockErrorFallback = () => <div data-testid='error-fallback'>Error fallback</div>;
    return MockErrorFallback;
});

const Bomb = ({ error }) => {
    throw error;
};

describe('ErrorBoundary', () => {
    const trackEvent = Analytics.trackEvent;
    let console_error_spy;

    beforeEach(() => {
        jest.clearAllMocks();
        // React logs caught render errors to console.error; silence it so the
        // test output stays clean and so we can assert on our own error log.
        console_error_spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        console_error_spy.mockRestore();
    });

    it('renders children when nothing throws and does not report anything', () => {
        render(
            <ErrorBoundary>
                <div>safe content</div>
            </ErrorBoundary>
        );

        expect(screen.getByText('safe content')).toBeInTheDocument();
        expect(trackEvent).not.toHaveBeenCalled();
    });

    it('reports the caught error to analytics and renders the fallback UI', () => {
        const error = new Error('boom');
        error.name = 'TestError';

        render(
            <ErrorBoundary>
                <Bomb error={error} />
            </ErrorBoundary>
        );

        expect(screen.getByTestId('error-fallback')).toBeInTheDocument();
        expect(trackEvent).toHaveBeenCalledTimes(1);
        expect(trackEvent).toHaveBeenCalledWith(
            'error_boundary',
            expect.objectContaining({
                message: 'boom',
                name: 'TestError',
                stack: error.stack,
                component_stack: expect.any(String),
            })
        );
    });

    it('still renders the fallback UI when analytics reporting itself throws', () => {
        trackEvent.mockImplementationOnce(() => {
            throw new Error('analytics down');
        });

        render(
            <ErrorBoundary>
                <Bomb error={new Error('boom')} />
            </ErrorBoundary>
        );

        expect(screen.getByTestId('error-fallback')).toBeInTheDocument();
        expect(console_error_spy).toHaveBeenCalledWith('Failed to report error to analytics:', expect.any(Error));
    });
});
