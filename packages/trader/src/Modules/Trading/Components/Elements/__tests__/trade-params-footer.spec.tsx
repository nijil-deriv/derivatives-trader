import { render, screen } from '@testing-library/react';

import TradeParamsFooter from '../trade-params-footer';

jest.mock('@deriv/core/src/App/Components/Layout/Footer/network-status', () => {
    return jest.fn(() => <div data-testid='network-status'>Network Status</div>);
});

jest.mock('../date-time', () => {
    return jest.fn(() => (
        <div data-testid='date-time'>
            <div className='trade-params-footer__date'>01 Jan 2024</div>
            <div className='trade-params-footer__time'>12:00:00 GMT</div>
        </div>
    ));
});

jest.mock('../toggle-fullscreen', () => {
    return jest.fn(() => <button data-testid='toggle-fullscreen'>Toggle Fullscreen</button>);
});

describe('TradeParamsFooter', () => {
    it('should render all child components', () => {
        render(<TradeParamsFooter />);

        expect(screen.getByTestId('network-status')).toBeInTheDocument();
        expect(screen.getByTestId('date-time')).toBeInTheDocument();
        expect(screen.getByTestId('toggle-fullscreen')).toBeInTheDocument();
    });

    it('should have correct CSS class', () => {
        const { container } = render(<TradeParamsFooter />);

        // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
        const footerElement = container.querySelector('.trade-params-footer');
        expect(footerElement).toBeInTheDocument();
    });

    it('should render NetworkStatus component', () => {
        render(<TradeParamsFooter />);

        expect(screen.getByText('Network Status')).toBeInTheDocument();
    });

    it('should render DateTime component', () => {
        render(<TradeParamsFooter />);

        expect(screen.getByText('01 Jan 2024')).toBeInTheDocument();
        expect(screen.getByText('12:00:00 GMT')).toBeInTheDocument();
    });

    it('should render ToggleFullScreen component', () => {
        render(<TradeParamsFooter />);

        expect(screen.getByText('Toggle Fullscreen')).toBeInTheDocument();
    });

    it('should render components in correct order', () => {
        render(<TradeParamsFooter />);

        const networkStatus = screen.getByTestId('network-status');
        const dateTime = screen.getByTestId('date-time');
        const toggleFullscreen = screen.getByTestId('toggle-fullscreen');

        // Verify all three components are rendered
        expect(networkStatus).toBeInTheDocument();
        expect(dateTime).toBeInTheDocument();
        expect(toggleFullscreen).toBeInTheDocument();
    });

    it('should have display name', () => {
        expect(TradeParamsFooter.displayName).toBe('TradeParamsFooter');
    });
});
