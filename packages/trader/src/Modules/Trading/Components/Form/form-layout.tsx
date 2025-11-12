import React from 'react';
import Loadable from 'react-loadable';

import { observer, useStore } from '@deriv/stores';

import { useTraderStore } from 'Stores/useTraderStores.js';

type TFormLayout = {
    is_market_closed: ReturnType<typeof useTraderStore>['is_market_closed'];
    is_trade_enabled: boolean;
};

const FormLayout = observer(({ is_market_closed, is_trade_enabled }: TFormLayout) => {
    const { common, client } = useStore();
    const { current_language } = common;
    const { is_logging_in } = client;

    const Screen = React.useMemo(() => {
        return Loadable({
            loader: () => import(/* webpackChunkName: "screen-large" */ './screen-large'),
            loading: () => null,
            render(loaded, props) {
                const Component = loaded.default;
                return <Component {...props} />;
            },
        });
    }, []);

    return (
        <React.Fragment key={current_language}>
            <Screen
                is_trade_enabled={is_trade_enabled}
                is_market_closed={is_market_closed}
                is_single_logging_in={is_logging_in}
            />
        </React.Fragment>
    );
});

export default React.memo(FormLayout);
