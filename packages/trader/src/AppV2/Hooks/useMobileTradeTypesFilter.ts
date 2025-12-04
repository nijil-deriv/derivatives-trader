import { useMemo } from 'react';

import { useRemoteConfig } from '@deriv/api';
import { TRADE_TYPES } from '@deriv/shared';

import { useMobileBridge } from 'App/Hooks/useMobileBridge';

const DEFAULT_MOBILE_ALLOWED_CATEGORIES = ['Accumulators', 'Multipliers', 'Vanillas', 'Turbos'];

const DEFAULT_MOBILE_ALLOWED_TYPES = [
    TRADE_TYPES.ACCUMULATOR,
    TRADE_TYPES.MULTIPLIER,
    TRADE_TYPES.VANILLA.CALL,
    TRADE_TYPES.VANILLA.PUT,
    TRADE_TYPES.TURBOS.LONG,
    TRADE_TYPES.TURBOS.SHORT,
];

type TContractTypesList = Record<
    string,
    {
        name: string;
        categories: Array<{ value: string; text: string }>;
    }
>;

/**
 * Hook to filter trade types for native mobile app WebView
 * Only applies filtering when app is opened in native mobile WebView
 * Creates intersection between backend-available types and mobile-allowed types
 */
export const useMobileTradeTypesFilter = () => {
    const { isBridgeAvailable } = useMobileBridge();
    const { data: remoteConfig } = useRemoteConfig(true);

    const isNativeApp = isBridgeAvailable();

    // Get allowed categories from remote config
    const allowedCategories = useMemo(() => {
        if (!isNativeApp) return null;

        const configCategories = remoteConfig?.mobile_app_allowed_categories;
        return configCategories && Array.isArray(configCategories)
            ? configCategories
            : DEFAULT_MOBILE_ALLOWED_CATEGORIES;
    }, [isNativeApp, remoteConfig]);

    // Get allowed trade types from remote config
    const allowedTradeTypes = useMemo(() => {
        if (!isNativeApp) return null;

        const configTypes = remoteConfig?.mobile_app_allowed_trade_types;
        if (configTypes && Array.isArray(configTypes)) {
            return mapConfigToTradeTypes(configTypes);
        }
        return DEFAULT_MOBILE_ALLOWED_TYPES;
    }, [isNativeApp, remoteConfig]);

    /**
     * Filters contract types list to create intersection of:
     * - Backend available types (from contracts_for API)
     * - Mobile allowed types (from remote config)
     *
     * @param backendContractTypesList - Contract types available from backend API
     * @returns Filtered contract types list (intersection of backend + mobile allowed)
     */
    const filterContractTypesList = (backendContractTypesList: TContractTypesList): TContractTypesList => {
        // Not in native mobile app - return all backend types unchanged
        if (!isNativeApp || !allowedCategories || !allowedTradeTypes) {
            return backendContractTypesList;
        }

        const filteredList: TContractTypesList = {};

        Object.keys(backendContractTypesList).forEach(categoryKey => {
            const category = backendContractTypesList[categoryKey];

            // Skip categories not allowed for mobile
            if (!allowedCategories.includes(categoryKey)) {
                return;
            }

            // Filter to only include trade types allowed for mobile
            const availableTypes = category.categories.filter(contractType =>
                allowedTradeTypes.includes(contractType.value)
            );

            // Only include category if it has at least one available type
            // This ensures we show intersection of backend + mobile allowed
            if (availableTypes.length > 0) {
                filteredList[categoryKey] = {
                    ...category,
                    categories: availableTypes,
                };
            }
        });

        return filteredList;
    };

    return {
        isNativeApp,
        shouldFilterTradeTypes: isNativeApp,
        filterContractTypesList,
        allowedCategories,
        allowedTradeTypes,
    };
};

/**
 * Maps remote config strings to TRADE_TYPES constants
 */
const mapConfigToTradeTypes = (config: string[]): string[] => {
    const typeMap: Record<string, string> = {
        accumulator: TRADE_TYPES.ACCUMULATOR,
        multiplier: TRADE_TYPES.MULTIPLIER,
        vanillalong: TRADE_TYPES.VANILLA.CALL,
        vanillashort: TRADE_TYPES.VANILLA.PUT,
        turboslong: TRADE_TYPES.TURBOS.LONG,
        turbosshort: TRADE_TYPES.TURBOS.SHORT,
    };
    return config.map(type => typeMap[type.toLowerCase()]).filter(Boolean);
};
