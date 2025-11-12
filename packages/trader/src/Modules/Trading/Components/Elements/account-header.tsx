import React from 'react';
import { observer } from 'mobx-react-lite';

import { Text } from '@deriv/components';
import AccountInfoIcon from '@deriv/core/src/App/Components/Layout/Header/account-info-icon';
import { getCurrencyDisplayCode, redirectToLogin } from '@deriv/shared';
import { useStore } from '@deriv/stores';
import { Localize, useTranslations } from '@deriv-com/translations';

type AccountHeaderProps = {
    balance?: string;
    currency?: string;
    is_logged_in?: boolean;
    is_virtual?: boolean;
};

const AccountHeader = observer(
    ({
        balance: balanceProp,
        currency: currencyProp,
        is_logged_in: isLoggedInProp,
        is_virtual: isVirtualProp,
    }: AccountHeaderProps = {}) => {
        const { localize } = useTranslations();
        const { client } = useStore();

        // Use props if provided, otherwise fall back to store
        const balance = balanceProp ?? client.balance;
        const currency = currencyProp ?? client.currency;
        const is_logged_in = isLoggedInProp ?? client.is_logged_in;
        const is_virtual = isVirtualProp ?? client.is_virtual;

        const currency_lower = currency?.toLowerCase();
        const accountTypeHeader = is_virtual ? localize('Demo') : localize('Real');
        const isDemoAccount = is_virtual;

        return (
            <div className='account-header'>
                {is_logged_in && (
                    <div className='account-header__info'>
                        <span className='account-header__icon'>
                            <AccountInfoIcon is_demo={isDemoAccount} currency={currency_lower} />
                        </span>
                        <div className='account-header__content'>
                            <Text as='p' size='xxs' className='account-header__type'>
                                {accountTypeHeader}
                            </Text>
                            {(typeof balance !== 'undefined' || !currency) && (
                                <p className='account-header__balance'>
                                    {!currency ? (
                                        <Localize i18n_default_text='No currency assigned' />
                                    ) : (
                                        `${balance} ${getCurrencyDisplayCode(currency)}`
                                    )}
                                </p>
                            )}
                        </div>
                    </div>
                )}
                {is_logged_in ? (
                    <button
                        className='account-header__logout'
                        onClick={client.logout}
                        type='button'
                        aria-label={localize('Log out')}
                    >
                        <Text size='xs' weight='bold'>
                            <Localize i18n_default_text='Log out' />
                        </Text>
                    </button>
                ) : (
                    <button
                        className='account-header__login'
                        onClick={redirectToLogin}
                        type='button'
                        aria-label={localize('Log in')}
                    >
                        <Text size='xs' weight='bold'>
                            <Localize i18n_default_text='Log in' />
                        </Text>
                    </button>
                )}
            </div>
        );
    }
);

AccountHeader.displayName = 'AccountHeader';

export default AccountHeader;
