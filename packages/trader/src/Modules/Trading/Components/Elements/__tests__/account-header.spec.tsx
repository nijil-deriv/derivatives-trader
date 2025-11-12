import { redirectToLogin } from '@deriv/shared';
import { mockStore, StoreProvider } from '@deriv/stores';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import AccountHeader from '../account-header';

jest.mock('@deriv/shared', () => ({
    ...jest.requireActual('@deriv/shared'),
    getCurrencyDisplayCode: jest.fn((currency: string) => currency),
    redirectToLogin: jest.fn(),
}));

jest.mock('@deriv/core/src/App/Components/Layout/Header/account-info-icon', () => {
    return jest.fn(() => <div data-testid='account-info-icon'>Icon</div>);
});

describe('AccountHeader', () => {
    const default_mock_store = mockStore({
        client: {
            balance: '10000.00',
            currency: 'USD',
            is_logged_in: true,
            is_virtual: false,
            logout: jest.fn(),
        },
    });

    const renderComponent = (store = default_mock_store, props = {}) => {
        return render(
            <StoreProvider store={store}>
                <AccountHeader {...props} />
            </StoreProvider>
        );
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Logged in state', () => {
        it('should render account info with balance for logged in real account', () => {
            renderComponent();

            expect(screen.getByText('Real')).toBeInTheDocument();
            expect(screen.getByText('10000.00 USD')).toBeInTheDocument();
            expect(screen.getByTestId('account-info-icon')).toBeInTheDocument();
        });

        it('should render account info with balance for logged in demo account', () => {
            const demo_store = mockStore({
                client: {
                    balance: '5000.00',
                    currency: 'USD',
                    is_logged_in: true,
                    is_virtual: true,
                    logout: jest.fn(),
                },
            });

            renderComponent(demo_store);

            expect(screen.getByText('Demo')).toBeInTheDocument();
            expect(screen.getByText('5000.00 USD')).toBeInTheDocument();
        });

        it('should render "No currency assigned" when currency is not set', () => {
            const no_currency_store = mockStore({
                client: {
                    balance: '0.00',
                    currency: '',
                    is_logged_in: true,
                    is_virtual: false,
                    logout: jest.fn(),
                },
            });

            renderComponent(no_currency_store);

            expect(screen.getByText('No currency assigned')).toBeInTheDocument();
        });

        it('should render logout button for logged in users', () => {
            renderComponent();

            const logoutButton = screen.getByRole('button', { name: /log out/i });
            expect(logoutButton).toBeInTheDocument();
            expect(logoutButton).toHaveAttribute('type', 'button');
            expect(logoutButton).toHaveClass('account-header__logout');
        });

        it('should call logout function when logout button is clicked', async () => {
            const logout_mock = jest.fn();
            const store_with_logout = mockStore({
                client: {
                    balance: '10000.00',
                    currency: 'USD',
                    is_logged_in: true,
                    is_virtual: false,
                    logout: logout_mock,
                },
            });

            renderComponent(store_with_logout);

            const logoutButton = screen.getByRole('button', { name: /log out/i });
            await userEvent.click(logoutButton);

            expect(logout_mock).toHaveBeenCalledTimes(1);
        });
    });

    describe('Logged out state', () => {
        it('should not render account info for logged out users', () => {
            const logged_out_store = mockStore({
                client: {
                    balance: '',
                    currency: '',
                    is_logged_in: false,
                    is_virtual: false,
                    logout: jest.fn(),
                },
            });

            renderComponent(logged_out_store);

            expect(screen.queryByTestId('account-info-icon')).not.toBeInTheDocument();
            expect(screen.queryByText('Real')).not.toBeInTheDocument();
            expect(screen.queryByText('Demo')).not.toBeInTheDocument();
        });

        it('should render login button for logged out users', () => {
            const logged_out_store = mockStore({
                client: {
                    balance: '',
                    currency: '',
                    is_logged_in: false,
                    is_virtual: false,
                    logout: jest.fn(),
                },
            });

            renderComponent(logged_out_store);

            const loginButton = screen.getByRole('button', { name: /log in/i });
            expect(loginButton).toBeInTheDocument();
            expect(loginButton).toHaveAttribute('type', 'button');
            expect(loginButton).toHaveClass('account-header__login');
        });

        it('should call redirectToLogin when login button is clicked', async () => {
            const logged_out_store = mockStore({
                client: {
                    balance: '',
                    currency: '',
                    is_logged_in: false,
                    is_virtual: false,
                    logout: jest.fn(),
                },
            });

            renderComponent(logged_out_store);

            const loginButton = screen.getByRole('button', { name: /log in/i });
            await userEvent.click(loginButton);

            expect(redirectToLogin).toHaveBeenCalledTimes(1);
        });
    });

    describe('Props override', () => {
        it('should use props values when provided instead of store values', () => {
            renderComponent(default_mock_store, {
                balance: '5000.00',
                currency: 'EUR',
                is_logged_in: true,
                is_virtual: true,
            });

            expect(screen.getByText('Demo')).toBeInTheDocument();
            expect(screen.getByText('5000.00 EUR')).toBeInTheDocument();
        });

        it('should fall back to store values when props are not provided', () => {
            renderComponent();

            expect(screen.getByText('Real')).toBeInTheDocument();
            expect(screen.getByText('10000.00 USD')).toBeInTheDocument();
        });

        it('should handle mixed props and store values correctly', () => {
            renderComponent(default_mock_store, {
                balance: '2500.00',
                // currency and is_logged_in will come from store
            });

            expect(screen.getByText('2500.00 USD')).toBeInTheDocument();
            expect(screen.getByText('Real')).toBeInTheDocument();
        });
    });

    describe('Accessibility', () => {
        it('should have proper aria-label for logout button with correct value', () => {
            renderComponent();

            const logoutButton = screen.getByRole('button', { name: /log out/i });
            expect(logoutButton).toHaveAttribute('aria-label', 'Log out');
        });

        it('should have proper aria-label for login button with correct value', () => {
            const logged_out_store = mockStore({
                client: {
                    balance: '',
                    currency: '',
                    is_logged_in: false,
                    is_virtual: false,
                    logout: jest.fn(),
                },
            });

            renderComponent(logged_out_store);

            const loginButton = screen.getByRole('button', { name: /log in/i });
            expect(loginButton).toHaveAttribute('aria-label', 'Log in');
        });

        it('should have type="button" on logout button', () => {
            renderComponent();

            const logoutButton = screen.getByRole('button', { name: /log out/i });
            expect(logoutButton).toHaveAttribute('type', 'button');
        });

        it('should have type="button" on login button', () => {
            const logged_out_store = mockStore({
                client: {
                    balance: '',
                    currency: '',
                    is_logged_in: false,
                    is_virtual: false,
                    logout: jest.fn(),
                },
            });

            renderComponent(logged_out_store);

            const loginButton = screen.getByRole('button', { name: /log in/i });
            expect(loginButton).toHaveAttribute('type', 'button');
        });

        it('should have display name', () => {
            expect(AccountHeader.displayName).toBe('AccountHeader');
        });
    });
});
