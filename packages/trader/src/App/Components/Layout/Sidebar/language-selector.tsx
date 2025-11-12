import React from 'react';
import classNames from 'classnames';

import { UNSUPPORTED_LANGUAGES } from '@deriv/shared';
import { observer, useStore } from '@deriv/stores';
import { getAllowedLanguages, useTranslations } from '@deriv-com/translations';

const LanguageSelector = observer(() => {
    const { common } = useStore();
    const { currentLang, switchLanguage } = useTranslations();
    const { changeSelectedLanguage } = common;
    const allowed_languages = getAllowedLanguages(UNSUPPORTED_LANGUAGES);

    const handleLanguageChange = async (lang: string) => {
        await changeSelectedLanguage(lang);
        switchLanguage(lang);
    };

    return (
        <div className='flyout-selector'>
            {Object.keys(allowed_languages).map(lang => {
                const isActive = lang === currentLang;
                return (
                    <button
                        key={lang}
                        className={classNames('flyout-selector__option', {
                            'flyout-selector__option--active': isActive,
                        })}
                        onClick={() => !isActive && handleLanguageChange(lang)}
                        disabled={isActive}
                    >
                        <span>{allowed_languages[lang]}</span>
                    </button>
                );
            })}
        </div>
    );
});

export default LanguageSelector;
