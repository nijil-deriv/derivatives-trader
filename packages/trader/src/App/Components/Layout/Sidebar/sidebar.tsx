import React from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import classNames from 'classnames';

import { Flyout } from '@deriv/components';
import {
    StandaloneClockThreeRegularIcon,
    StandaloneFileRegularIcon,
    StandaloneGlobeRegularIcon,
    StandaloneMoonRegularIcon,
    StandaloneSunBrightRegularIcon,
} from '@deriv/quill-icons';
import { routes } from '@deriv/shared';
import { observer, useStore } from '@deriv/stores';
import { localize } from '@deriv-com/translations';

import { PositionsDrawerContent, PositionsDrawerFooter } from '../../Elements/PositionsDrawer';
import BrandShortLogo from '../brand-short-logo';

import LanguageSelector from './language-selector';
import ThemeSelector from './theme-selector';

type TSidebarItem = {
    id: string;
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    isActive: boolean;
    badge?: number;
    dataTestId?: string;
};

const Sidebar = observer(() => {
    const { ui, client, portfolio } = useStore();
    const { is_dark_mode_on, active_sidebar_flyout, setSidebarFlyout, closeSidebarFlyout } = ui;
    const { is_logged_in } = client;
    const { active_positions_count } = portfolio;
    const location = useLocation();
    const history = useHistory();

    const isActiveRoute = (path: string) => {
        if (path === routes.index) {
            return location.pathname === routes.index;
        }
        return location.pathname.startsWith(path);
    };

    const handleThemeToggle = () => {
        setSidebarFlyout(active_sidebar_flyout === 'theme' ? null : 'theme');
    };

    const handleLanguageToggle = () => {
        setSidebarFlyout(active_sidebar_flyout === 'language' ? null : 'language');
    };

    const handlePositionsToggle = () => {
        setSidebarFlyout(active_sidebar_flyout === 'positions' ? null : 'positions');
    };

    const handleReportsClick = () => {
        setSidebarFlyout(null);
        history.push(routes.reports);
    };

    const closeFlyout = () => {
        closeSidebarFlyout();
    };

    // Main navigation items
    const navigationItems: TSidebarItem[] = [
        {
            id: 'positions',
            icon: <StandaloneClockThreeRegularIcon fill='var(--color-text-primary)' iconSize='sm' />,
            label: localize('Positions'),
            onClick: handlePositionsToggle,
            isActive: active_sidebar_flyout === 'positions',
            badge: active_positions_count,
            dataTestId: 'dt_sidebar_positions',
        },
        {
            id: 'reports',
            icon: <StandaloneFileRegularIcon fill='var(--color-text-primary)' iconSize='sm' />,
            label: localize('Reports'),
            onClick: handleReportsClick,
            isActive: isActiveRoute(routes.reports),
            dataTestId: 'dt_sidebar_reports',
        },
    ];

    // Utility items (bottom section)
    const utilityItems = [
        {
            id: 'theme',
            icon: is_dark_mode_on ? (
                <StandaloneSunBrightRegularIcon fill='var(--color-text-primary)' iconSize='sm' />
            ) : (
                <StandaloneMoonRegularIcon fill='var(--color-text-primary)' iconSize='sm' />
            ),
            label: localize('Theme'),
            onClick: handleThemeToggle,
            isActive: active_sidebar_flyout === 'theme',
            dataTestId: 'dt_sidebar_theme',
        },
        {
            id: 'language',
            icon: <StandaloneGlobeRegularIcon fill='var(--color-text-primary)' iconSize='sm' />,
            label: localize('Language'),
            onClick: handleLanguageToggle,
            isActive: active_sidebar_flyout === 'language',
            dataTestId: 'dt_sidebar_language',
        },
    ];

    const getFlyoutContent = () => {
        switch (active_sidebar_flyout) {
            case 'theme':
                return {
                    title: localize('Theme'),
                    content: <ThemeSelector />,
                    footer: null,
                };
            case 'language':
                return {
                    title: localize('Language'),
                    content: <LanguageSelector />,
                    footer: null,
                };
            case 'positions':
                return {
                    title: localize('Open positions'),
                    content: <PositionsDrawerContent />,
                    footer: <PositionsDrawerFooter />,
                };
            default:
                return null;
        }
    };

    const flyoutContent = getFlyoutContent();

    return (
        <React.Fragment>
            <aside
                className={classNames('sidebar', {
                    sidebar__hidden: !isActiveRoute(routes.index),
                })}
            >
                {/* Logo Section */}
                <div className='sidebar__header'>
                    <BrandShortLogo />
                </div>

                {/* Main Navigation */}
                <nav className='sidebar__nav'>
                    <div className='sidebar__nav-main'>
                        {is_logged_in &&
                            navigationItems.map(item => (
                                <button
                                    key={item.id}
                                    className={classNames('sidebar__item', {
                                        'sidebar__item--active': item.isActive,
                                    })}
                                    onClick={item.onClick}
                                    data-testid={item.dataTestId}
                                    aria-label={item.label}
                                >
                                    <span className='sidebar__item-icon'>{item.icon}</span>
                                    <span className='sidebar__item-label'>{item.label}</span>
                                    {item.badge !== undefined && item.badge > 0 && (
                                        <span className='sidebar__item-badge'>{item.badge}</span>
                                    )}
                                </button>
                            ))}
                    </div>

                    {/* Utility Section */}
                    <div className='sidebar__nav-utility'>
                        <div className='sidebar__separator' />
                        {utilityItems.map(item => (
                            <button
                                key={item.id}
                                className={classNames('sidebar__item', {
                                    'sidebar__item--active': item.isActive,
                                })}
                                onClick={item.onClick}
                                data-testid={item.dataTestId}
                                aria-label={item.label}
                            >
                                <span className='sidebar__item-icon'>{item.icon}</span>
                                <span className='sidebar__item-label'>{item.label}</span>
                            </button>
                        ))}
                    </div>
                </nav>
            </aside>

            {/* Single Flyout with conditional content */}
            <Flyout
                is_open={active_sidebar_flyout !== null}
                onClose={closeFlyout}
                title={flyoutContent?.title || ''}
                footer_content={flyoutContent?.footer}
            >
                {flyoutContent?.content}
            </Flyout>
        </React.Fragment>
    );
});

export default Sidebar;
