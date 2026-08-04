import { useMemo } from 'react';

import { getContractTypesConfig } from '@deriv/shared';

import useAutoStrategies from './useAutoStrategies';

// Trade-type → API contract types mapping. Pre-computed at module load:
// `getContractTypesConfig` is symbol-agnostic for the `trade_types` field
// we read, so the result never changes after the first import.
const TRADE_TYPE_API_TYPES: ReadonlyArray<readonly [string, readonly string[]]> = Object.entries(
    getContractTypesConfig('')
).map(([trade_type, cfg]) => [trade_type, cfg.trade_types] as const);

/**
 * Returns the set of UI trade types automation supports — every trade type
 * whose constituent API contract types appear in any strategy descriptor's
 * `supported_contract_types`. Calling this from a top-level component (e.g.
 * `trade-desktop.tsx`) also kicks off the strategies fetch via
 * `useAutoStrategies`, avoiding the circular dependency where only
 * `AutomationPanel` would trigger it but the panel itself was gated on a
 * non-empty supported set.
 */
const useAutomationSupportedTradeTypes = (): { supported_trade_types: Set<string>; is_loading: boolean } => {
    const { strategies: server_strategies, isLoading } = useAutoStrategies();

    const supported_trade_types = useMemo(() => {
        if (server_strategies.length === 0) return new Set<string>();

        const supported_api_types = new Set(server_strategies.flatMap(strategy => strategy.supported_contract_types));

        return new Set(
            TRADE_TYPE_API_TYPES.filter(([, api_types]) => api_types.some(t => supported_api_types.has(t))).map(
                ([trade_type]) => trade_type
            )
        );
    }, [server_strategies]);

    return { supported_trade_types, is_loading: isLoading };
};

export default useAutomationSupportedTradeTypes;
