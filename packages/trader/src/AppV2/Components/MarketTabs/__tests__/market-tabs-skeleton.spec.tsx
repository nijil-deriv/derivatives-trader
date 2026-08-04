import { render, screen } from '@testing-library/react';

import MarketTabsSkeleton from '../market-tabs-skeleton';

jest.mock('@deriv-com/ui', () => ({ useDevice: () => ({ isMobile: true }) }));

// Mock quill-ui's Skeleton so the test owns its own test IDs and stays decoupled from the library's
// internals (a renamed/removed internal test ID must not silently break this suite).
jest.mock('@deriv-com/quill-ui', () => ({
    Skeleton: {
        Square: ({ width, height }: { width: number; height: number }) => (
            <div data-testid='skeleton-square' data-width={width} data-height={height} />
        ),
    },
}));

describe('MarketTabsSkeleton', () => {
    it('renders the tab-strip skeleton placeholder', () => {
        render(<MarketTabsSkeleton />);
        expect(screen.getByTestId('dt_market_tabs_skeleton')).toBeInTheDocument();
    });

    it('renders placeholder squares for the add button and tabs', () => {
        render(<MarketTabsSkeleton />);
        expect(screen.getAllByTestId('skeleton-square')).toHaveLength(3);
    });
});
