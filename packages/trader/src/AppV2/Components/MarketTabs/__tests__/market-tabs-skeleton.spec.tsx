import { render, screen } from '@testing-library/react';

import MarketTabsSkeleton from '../market-tabs-skeleton';

jest.mock('@deriv-com/ui', () => ({ useDevice: () => ({ isMobile: true }) }));

describe('MarketTabsSkeleton', () => {
    it('renders the tab-strip skeleton placeholder', () => {
        render(<MarketTabsSkeleton />);
        expect(screen.getByTestId('dt_market_tabs_skeleton')).toBeInTheDocument();
    });

    it('renders placeholder squares for the add button and tabs', () => {
        render(<MarketTabsSkeleton />);
        expect(screen.getAllByTestId('square-skeleton')).toHaveLength(3);
    });
});
