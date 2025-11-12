import React from 'react';
import classNames from 'classnames';

import { StandaloneMoonRegularIcon, StandaloneSunBrightRegularIcon } from '@deriv/quill-icons';
import { observer, useStore } from '@deriv/stores';
import { localize } from '@deriv-com/translations';

const ThemeSelector = observer(() => {
    const { ui } = useStore();
    const { is_dark_mode_on, setDarkMode } = ui;

    const handleThemeChange = (isDark: boolean) => {
        setDarkMode(isDark);
    };

    return (
        <div className='flyout-selector'>
            <button
                className={classNames('flyout-selector__option', {
                    'flyout-selector__option--active': !is_dark_mode_on,
                })}
                onClick={() => handleThemeChange(false)}
            >
                <StandaloneSunBrightRegularIcon iconSize='sm' fill='var(--color-text-primary)' />
                <span>{localize('Light')}</span>
            </button>
            <button
                className={classNames('flyout-selector__option', {
                    'flyout-selector__option--active': is_dark_mode_on,
                })}
                onClick={() => handleThemeChange(true)}
            >
                <StandaloneMoonRegularIcon iconSize='sm' fill='var(--color-text-primary)' />
                <span>{localize('Dark')}</span>
            </button>
        </div>
    );
});

export default ThemeSelector;
