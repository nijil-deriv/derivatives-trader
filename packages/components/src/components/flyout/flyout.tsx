import React from 'react';
import classNames from 'classnames';

import { LegacyMinimize2pxIcon } from '@deriv/quill-icons';

import Text from '../text/text';

type TFlyout = {
    is_open: boolean;
    onClose: () => void;
    title?: string;
    header_content?: React.ReactNode;
    footer_content?: React.ReactNode;
    children: React.ReactNode;
    width?: string;
    className?: string;
};

const Flyout = ({
    is_open,
    onClose,
    title,
    header_content,
    footer_content,
    children,
    width = '30.4rem',
    className,
}: TFlyout) => {
    return (
        <div
            className={classNames('dc-flyout', className, {
                'dc-flyout--open': is_open,
            })}
            style={{ width }}
        >
            <div className='dc-flyout__header'>
                {header_content || (
                    <React.Fragment>
                        <Text color='primary' weight='bold' size='xs'>
                            {title}
                        </Text>
                        <div className='dc-flyout__icon-close' onClick={onClose}>
                            <LegacyMinimize2pxIcon iconSize='xs' fill='var(--color-text-primary)' />
                        </div>
                    </React.Fragment>
                )}
            </div>
            <div
                className={classNames('dc-flyout__body', {
                    'dc-flyout__body--with-footer': !!footer_content,
                })}
            >
                {children}
            </div>
            {footer_content && <div className='dc-flyout__footer'>{footer_content}</div>}
        </div>
    );
};

export default Flyout;
