import clsx from 'clsx';

import { Skeleton } from '@deriv-com/quill-ui';
import { useDevice } from '@deriv-com/ui';

import './market-tabs.scss';

/**
 * Placeholder for the market-tabs strip, shown in Automate while the supported-strategies list is
 * still loading. Until that set is known the strip can't be filtered, so a stale/unsupported tab
 * would otherwise flash as a normal tappable tab; the skeleton holds the strip's shape (an add
 * button + a couple of collapsed tabs) until the real strip can render safely.
 */
const MarketTabsSkeleton = () => {
    const { isMobile } = useDevice();
    return (
        <div
            className={clsx('market-tabs', 'market-tabs--skeleton', { 'market-tabs--desktop': !isMobile })}
            data-testid='dt_market_tabs_skeleton'
        >
            <Skeleton.Square width={56} height={56} rounded />
            <Skeleton.Square width={56} height={56} rounded />
            <Skeleton.Square width={56} height={56} rounded />
        </div>
    );
};

export default MarketTabsSkeleton;
