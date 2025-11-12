import React from 'react';

import NetworkStatus from '@deriv/core/src/App/Components/Layout/Footer/network-status';
import { ToggleFullScreen } from '@deriv/core/src/App/Components/Layout/Footer/toggle-fullscreen';

import DateTime from './date-time';

const TradeParamsFooter: React.FC = () => {
    return (
        <div className='trade-params-footer'>
            <NetworkStatus />
            <DateTime />
            <ToggleFullScreen showPopover={false} />
        </div>
    );
};

TradeParamsFooter.displayName = 'TradeParamsFooter';

export default TradeParamsFooter;
