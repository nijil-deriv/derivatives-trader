import { configure } from 'mobx';

import { TActiveSymbolsResponse } from '@deriv/api';
import { dayjs, findSymbolForTradeType, TRADE_TYPES, WS } from '@deriv/shared';
import { mockStore } from '@deriv/stores';

import { TRADE_PANEL_TABS } from 'AppV2/Components/AutomationPanel/automation-config';
import { OPEN_MARKETS_STORAGE_KEYS, TOpenMarket } from 'AppV2/Utils/open-markets-utils';
import { TRootStore } from 'Types';

import { ContractType } from '../Helpers/contract-type';
import TradeStore from '../trade-store';

configure({ safeDescriptors: false });

// Mock ServerTime
jest.mock('_common/base/server_time', () => {
    const actualDayjs = jest.requireActual('dayjs');
    return {
        get: () => actualDayjs('2024-02-26T11:59:59.488Z'),
        timePromise: () => Promise.resolve(actualDayjs('2024-02-26T11:59:59.488Z')),
    };
});

// Mock shared utilities
jest.mock('@deriv/shared', () => ({
    ...jest.requireActual('@deriv/shared'),
    pickDefaultSymbol: jest.fn(() => Promise.resolve('1HZ100V')),
    isMarketClosed: jest.fn(() => false),
    findSymbolForTradeType: jest.fn(() => Promise.resolve('')),
    WS: {
        authorized: {
            activeSymbols: () =>
                Promise.resolve({
                    active_symbols: [
                        {
                            symbol: '1HZ100V',
                            exchange_is_open: 1,
                            market: 'synthetic_index',
                            display_name: 'Volatility 100 (1s) Index',
                        },
                    ],
                }),
        },
        contractsFor: () =>
            Promise.resolve({
                contracts_for: {
                    available: [],
                    non_available: [],
                },
            }),
        storage: {
            contractsFor: () =>
                Promise.resolve({
                    contracts_for: {
                        available: [],
                        non_available: [],
                    },
                }),
        },
        subscribeProposal: jest.fn(),
        forgetAll: jest.fn(),
        wait: jest.fn(() => Promise.resolve({})),
    },
}));

// Mock ContractType helper
jest.mock('../Helpers/contract-type', () => ({
    ContractType: {
        buildContractTypesConfig: jest.fn(() => Promise.resolve()),
        getContractCategories: () => ({
            contract_types_list: {},
            non_available_contract_types_list: {},
        }),
        getContractValues: () => ({}),
    },
}));

// Mock ContractType Actions
jest.mock('../Actions/contract-type', () => ({
    ContractType: {
        getContractType: jest.fn(() => ({ categories: [], contract_types: [] })),
    },
}));

// Mock process helpers
jest.mock('../Helpers/process', () => ({
    processContractsForApi: jest.fn(() => Promise.resolve()),
    processPurchase: jest.fn(() => Promise.resolve()),
    processProposal: jest.fn(() => Promise.resolve()),
    processTradeParams: jest.fn(() => Promise.resolve()),
}));

describe('TradeStore', () => {
    let tradeStore: TradeStore, mockRootStore: TRootStore;

    beforeEach(() => {
        mockRootStore = mockStore({
            common: {
                server_time: dayjs('2024-02-26T11:59:59.488Z'),
                setServicesError: jest.fn(),
                setSelectedContractType: jest.fn(),
                showError: jest.fn(),
                is_language_changing: false,
            },
            client: {
                currency: 'USD',
                default_currency: 'USD',
                is_logged_in: false,
                is_logging_in: false,
                selectCurrency: jest.fn(),
            },
            ui: {
                advanced_expiry_type: 'duration',
                advanced_duration_unit: 'm',
                simple_duration_unit: 'm',
                is_mobile: false,
                is_advanced_duration: false,
                toggleUrlUnavailableModal: jest.fn(),
                openPositionsDrawer: jest.fn(),
                resetPurchaseStates: jest.fn(),
                toggleServicesErrorModal: jest.fn(),
            },
            active_symbols: {
                setActiveSymbols: jest.fn(),
            },
            notifications: {
                removeTradeNotifications: jest.fn(),
                setShouldShowPopups: jest.fn(),
                addTradeNotification: jest.fn(),
                is_notifications_visible: false,
                toggleNotificationsModal: jest.fn(),
            },
            contract_trade: {
                contracts: [],
                clearAccumulatorBarriersData: jest.fn(),
                addContract: jest.fn(),
                chart_type: 'mountain',
                granularity: 0,
                updateChartType: jest.fn(),
                updateGranularity: jest.fn(),
                savePreviousChartMode: jest.fn(),
                onUnmount: jest.fn(),
                updateAccumulatorBarriersData: jest.fn(),
            },
            portfolio: {
                barriers: [],
                setContractType: jest.fn(),
                onBuyResponse: jest.fn(),
                open_accu_contract: null,
                active_positions: [],
            },
            gtm: {
                pushDataLayer: jest.fn(),
            },
        }) as unknown as TRootStore;

        tradeStore = new TradeStore({ root_store: mockRootStore });
    });

    describe('Initialization', () => {
        it('should initialize with correct default values', () => {
            expect(tradeStore.amount).toBe(2);
            expect(tradeStore.duration).toBe(5);
            expect(tradeStore.is_trade_component_mounted).toBe(false);
            expect(tradeStore.is_purchase_enabled).toBe(false);
            expect(tradeStore.is_trade_enabled).toBe(false);
            expect(tradeStore.currency).toBe('');
            expect(tradeStore.basis).toBe('');
            expect(tradeStore.contract_type).toBe('');
            expect(tradeStore.symbol).toBe('');
        });

        it('should have MobX observable properties', () => {
            // Test that properties are observable by changing them
            const originalAmount = tradeStore.amount;
            tradeStore.amount = 50;
            expect(tradeStore.amount).toBe(50);
            expect(tradeStore.amount).not.toBe(originalAmount);
        });
    });

    describe('Contract Type Identification', () => {
        it('should identify accumulator contracts', () => {
            tradeStore.contract_type = TRADE_TYPES.ACCUMULATOR;
            expect(tradeStore.is_accumulator).toBe(true);
            expect(tradeStore.is_multiplier).toBe(false);
            expect(tradeStore.is_vanilla).toBe(false);
            expect(tradeStore.is_turbos).toBe(false);
        });

        it('should identify multiplier contracts', () => {
            tradeStore.contract_type = TRADE_TYPES.MULTIPLIER;
            expect(tradeStore.is_multiplier).toBe(true);
            expect(tradeStore.is_accumulator).toBe(false);
            expect(tradeStore.is_vanilla).toBe(false);
            expect(tradeStore.is_turbos).toBe(false);
        });

        it('should identify vanilla contracts', () => {
            tradeStore.contract_type = 'vanillalongcall';
            expect(tradeStore.is_vanilla).toBe(true);
            expect(tradeStore.is_accumulator).toBe(false);
            expect(tradeStore.is_multiplier).toBe(false);
            expect(tradeStore.is_turbos).toBe(false);
        });

        it('should identify turbos contracts', () => {
            tradeStore.contract_type = 'turboslong';
            expect(tradeStore.is_turbos).toBe(true);
            expect(tradeStore.is_accumulator).toBe(false);
            expect(tradeStore.is_multiplier).toBe(false);
            expect(tradeStore.is_vanilla).toBe(false);
        });

        it('should identify crypto multiplier contracts', () => {
            tradeStore.contract_type = TRADE_TYPES.MULTIPLIER;
            tradeStore.symbol = 'cryBTCUSD';
            expect(tradeStore.is_crypto_multiplier).toBe(true);

            tradeStore.symbol = '1HZ100V';
            expect(tradeStore.is_crypto_multiplier).toBe(false);
        });
    });

    describe('Basic Setters', () => {
        describe('setDigitStats', () => {
            it('should set digit stats array', () => {
                const stats = [120, 86, 105, 94, 85, 86, 124, 107, 90, 103];
                tradeStore.setDigitStats(stats);
                expect(tradeStore.digit_stats).toEqual(stats);
            });

            it('should handle empty array', () => {
                tradeStore.setDigitStats([]);
                expect(tradeStore.digit_stats).toEqual([]);
            });
        });

        describe('setTickData', () => {
            it('should set tick data', () => {
                const tickData = {
                    ask: 405.76,
                    bid: 405.56,
                    epoch: 1721636565,
                    id: 'test-id',
                    pip_size: 2,
                    quote: 405.66,
                    symbol: '1HZ100V',
                };

                tradeStore.setTickData(tickData);
                expect(tradeStore.tick_data).toEqual(tickData);
            });

            it('should handle null tick data', () => {
                tradeStore.setTickData(null);
                expect(tradeStore.tick_data).toBeNull();
            });
        });

        describe('setActiveSymbolsV2', () => {
            it('should set active symbols for V2', () => {
                const symbols: NonNullable<TActiveSymbolsResponse['active_symbols']> = [
                    {
                        underlying_symbol: 'R_100',
                        display_order: 1,
                        exchange_is_open: 1,
                        market: 'synthetic_index',
                        submarket: 'random_index',
                        is_trading_suspended: 0,
                        subgroup: 'volatility',
                    },
                ];

                tradeStore.setActiveSymbolsV2(symbols);
                expect(tradeStore.active_symbols).toEqual(symbols);
                expect(tradeStore.has_symbols_for_v2).toBe(true);
            });

            it('should set has_symbols_for_v2 to false for empty array', () => {
                tradeStore.setActiveSymbolsV2([]);
                expect(tradeStore.has_symbols_for_v2).toBe(false);
            });
        });

        describe('setTradeTypeTab', () => {
            it('should set trade type tab', () => {
                tradeStore.setTradeTypeTab('rise_fall');
                expect(tradeStore.trade_type_tab).toBe('rise_fall');
            });

            it('should handle undefined parameter', () => {
                tradeStore.setTradeTypeTab();
                expect(tradeStore.trade_type_tab).toBe('');
            });
        });

        describe('setDefaultStake', () => {
            it('should set default stake', () => {
                tradeStore.setDefaultStake(25);
                expect(tradeStore.default_stake).toBe(25);
            });

            it('should handle undefined stake', () => {
                tradeStore.setDefaultStake(undefined);
                expect(tradeStore.default_stake).toBeUndefined();
            });
        });
    });

    describe('V2 Parameters Management', () => {
        beforeEach(() => {
            tradeStore.clearV2ParamsInitialValues();
        });

        it('should set growth rate in v2_params_initial_values', () => {
            tradeStore.setV2ParamsInitialValues({ name: 'growth_rate', value: 0.03 });
            expect(tradeStore.v2_params_initial_values.growth_rate).toBe(0.03);
        });

        it('should set strike price in v2_params_initial_values', () => {
            tradeStore.setV2ParamsInitialValues({ name: 'strike', value: '+1.30' });
            expect(tradeStore.v2_params_initial_values.strike).toBe('+1.30');
        });

        it('should set multiplier in v2_params_initial_values', () => {
            tradeStore.setV2ParamsInitialValues({ name: 'multiplier', value: 100 });
            expect(tradeStore.v2_params_initial_values.multiplier).toBe(100);
        });

        it('should update existing values', () => {
            tradeStore.setV2ParamsInitialValues({ name: 'growth_rate', value: 0.03 });
            tradeStore.setV2ParamsInitialValues({ name: 'growth_rate', value: 0.05 });
            expect(tradeStore.v2_params_initial_values.growth_rate).toBe(0.05);
        });

        it('should clear all values', () => {
            tradeStore.setV2ParamsInitialValues({ name: 'strike', value: '+1.00' });
            tradeStore.setV2ParamsInitialValues({ name: 'growth_rate', value: 0.05 });

            expect(tradeStore.v2_params_initial_values).toEqual({
                strike: '+1.00',
                growth_rate: 0.05,
            });

            tradeStore.clearV2ParamsInitialValues();
            expect(tradeStore.v2_params_initial_values).toEqual({});
        });
    });

    describe('Store State Management', () => {
        describe('Purchase Management', () => {
            it('should enable purchase', () => {
                tradeStore.is_purchase_enabled = false;
                tradeStore.enablePurchase();
                expect(tradeStore.is_purchase_enabled).toBe(true);
            });

            it('should clear purchase info', () => {
                tradeStore.purchase_info = { contract_id: 123 };
                tradeStore.proposal_requests = { CALL: {} };
                tradeStore.proposal_info = { CALL: {} as any };

                tradeStore.clearPurchaseInfo();

                expect(tradeStore.purchase_info).toEqual({});
                expect(tradeStore.proposal_requests).toEqual({});
                expect(tradeStore.proposal_info).toEqual({});
            });
        });

        describe('Market Status', () => {
            it('should set market status', () => {
                tradeStore.setMarketStatus(true);
                expect(tradeStore.is_market_closed).toBe(true);

                tradeStore.setMarketStatus(false);
                expect(tradeStore.is_market_closed).toBe(false);
            });
        });

        describe('Trade Status', () => {
            it('should set trade status', () => {
                tradeStore.setTradeStatus(true);
                expect(tradeStore.is_trade_enabled).toBe(true);

                tradeStore.setTradeStatus(false);
                expect(tradeStore.is_trade_enabled).toBe(false);
            });
        });

        describe('Store Refresh', () => {
            it('should refresh store state', () => {
                // Set up some state
                tradeStore.proposal_info = { CALL: {} as any };
                tradeStore.purchase_info = { contract_id: 123 };
                tradeStore.proposal_requests = { CALL: {} };

                // Refresh should clear everything
                tradeStore.refresh();

                expect(tradeStore.proposal_info).toEqual({});
                expect(tradeStore.purchase_info).toEqual({});
                expect(tradeStore.proposal_requests).toEqual({});
            });
        });
    });

    describe('Barrier Management', () => {
        describe('setBarrierChoices', () => {
            it('should set barrier choices', () => {
                const barriers = ['+0.1', '+0.2', '+0.3', '-0.1', '-0.2'];
                tradeStore.setBarrierChoices(barriers);
                expect(tradeStore.barrier_choices).toEqual(barriers);
            });

            it('should handle empty array', () => {
                tradeStore.setBarrierChoices([]);
                expect(tradeStore.barrier_choices).toEqual([]);
            });

            it('should handle null/undefined', () => {
                tradeStore.setBarrierChoices(null as any);
                expect(tradeStore.barrier_choices).toEqual([]);
            });

            it('should set strike price choices for vanilla contracts', () => {
                tradeStore.contract_type = 'vanillalongcall';
                const barriers = ['+0.1', '+0.2', '+0.3'];
                tradeStore.barrier_1 = '+0.1';

                tradeStore.setBarrierChoices(barriers);

                expect(tradeStore.barrier_choices).toEqual(barriers);
                expect(tradeStore.strike_price_choices).toEqual({
                    barrier: '+0.1',
                    barrier_choices: barriers,
                });
            });
        });

        describe('setPayoutChoices', () => {
            it('should set payout choices for long turbos', () => {
                tradeStore.contract_type = 'turboslong';
                const payouts = ['1', '2', '3', '4'];
                tradeStore.barrier_1 = '+0.1';

                tradeStore.setPayoutChoices(payouts);

                expect(tradeStore.payout_choices).toEqual(payouts);
                expect(tradeStore.long_barriers).toEqual({
                    barrier: '+0.1',
                    payout_choices: payouts,
                });
            });

            it('should set payout choices for short turbos', () => {
                tradeStore.contract_type = 'turbosshort';
                const payouts = ['1', '2', '3', '4'];
                tradeStore.barrier_1 = '-0.1';

                tradeStore.setPayoutChoices(payouts);

                expect(tradeStore.payout_choices).toEqual(payouts);
                expect(tradeStore.short_barriers).toEqual({
                    barrier: '-0.1',
                    payout_choices: payouts,
                });
            });
        });

        describe('findClosestBarrierValue', () => {
            it('should find exact match', () => {
                const choices = ['+0.1', '+0.2', '+0.5', '+1.0'];
                const result = tradeStore.findClosestBarrierValue('+0.5', choices);
                expect(result).toBe('+0.5');
            });

            it('should find closest relative barrier', () => {
                const choices = ['+0.1', '+0.2', '+0.5', '+1.0'];
                const result = tradeStore.findClosestBarrierValue('+0.3', choices);
                expect(result).toBe('+0.2');
            });

            it('should handle empty choices', () => {
                const result = tradeStore.findClosestBarrierValue('+0.3', []);
                expect(result).toBe('+0.3');
            });

            it('should return current value if already in choices', () => {
                const choices = ['+0.1', '+0.2', '+0.5'];
                const result = tradeStore.findClosestBarrierValue('+0.2', choices);
                expect(result).toBe('+0.2');
            });
        });
    });

    describe('Accumulator Methods', () => {
        describe('setDefaultGrowthRate', () => {
            it('should set growth rate when accumulator and rate not in range', () => {
                tradeStore.contract_type = TRADE_TYPES.ACCUMULATOR;
                tradeStore.accumulator_range_list = [0.01, 0.02, 0.03, 0.04, 0.05];
                tradeStore.growth_rate = 0.1; // Not in range

                tradeStore.setDefaultGrowthRate();

                expect(tradeStore.growth_rate).toBe(0.01); // First in range
            });

            it('should not change growth rate if already in range', () => {
                tradeStore.contract_type = TRADE_TYPES.ACCUMULATOR;
                tradeStore.accumulator_range_list = [0.01, 0.02, 0.03, 0.04, 0.05];
                tradeStore.growth_rate = 0.03; // In range

                tradeStore.setDefaultGrowthRate();

                expect(tradeStore.growth_rate).toBe(0.03); // Unchanged
            });

            it('should not change growth rate for non-accumulator contracts', () => {
                tradeStore.contract_type = TRADE_TYPES.MULTIPLIER;
                tradeStore.accumulator_range_list = [0.01, 0.02, 0.03];
                tradeStore.growth_rate = 0.1;

                tradeStore.setDefaultGrowthRate();

                expect(tradeStore.growth_rate).toBe(0.1); // Unchanged
            });
        });

        describe('resetAccumulatorData', () => {
            it('should call clearAccumulatorBarriersData', () => {
                tradeStore.resetAccumulatorData();
                expect(mockRootStore.contract_trade.clearAccumulatorBarriersData).toHaveBeenCalledWith(false, true);
            });
        });
    });

    describe('Mobile and UI State', () => {
        describe('setMobileDigitView', () => {
            it('should set mobile digit view', () => {
                tradeStore.setMobileDigitView(true);
                expect(tradeStore.is_mobile_digit_view_selected).toBe(true);

                tradeStore.setMobileDigitView(false);
                expect(tradeStore.is_mobile_digit_view_selected).toBe(false);
            });
        });

        describe('setIsTradeParamsExpanded', () => {
            it('should set trade params expanded state', () => {
                tradeStore.setIsTradeParamsExpanded(false);
                expect(tradeStore.is_trade_params_expanded).toBe(false);

                tradeStore.setIsTradeParamsExpanded(true);
                expect(tradeStore.is_trade_params_expanded).toBe(true);
            });
        });

        describe('setIsDigitsWidgetActive', () => {
            it('should set digits widget active state', () => {
                tradeStore.setIsDigitsWidgetActive(true);
                expect(tradeStore.is_digits_widget_active).toBe(true);

                tradeStore.setIsDigitsWidgetActive(false);
                expect(tradeStore.is_digits_widget_active).toBe(false);
            });
        });

        describe('togglePayoutWheelPicker', () => {
            it('should toggle payout wheel picker', () => {
                expect(tradeStore.open_payout_wheelpicker).toBe(false);

                tradeStore.togglePayoutWheelPicker();
                expect(tradeStore.open_payout_wheelpicker).toBe(true);

                tradeStore.togglePayoutWheelPicker();
                expect(tradeStore.open_payout_wheelpicker).toBe(false);
            });
        });

        describe('setPayoutPerPoint', () => {
            it('should set payout per point', () => {
                tradeStore.setPayoutPerPoint('10');
                expect(tradeStore.payout_per_point).toBe('10');
            });

            it('should not update if value is same', () => {
                tradeStore.payout_per_point = '10';
                const spy = jest.spyOn(tradeStore, 'onChange');

                tradeStore.setPayoutPerPoint('10');
                expect(spy).not.toHaveBeenCalled();

                spy.mockRestore();
            });

            it('should call onChange when value changes', () => {
                tradeStore.payout_per_point = '5';
                const spy = jest.spyOn(tradeStore, 'onChange');

                tradeStore.setPayoutPerPoint('10');
                expect(spy).toHaveBeenCalledWith({
                    target: {
                        name: 'payout_per_point',
                        value: '10',
                    },
                });

                spy.mockRestore();
            });
        });
    });

    describe('Chart and Status Methods', () => {
        describe('setChartStatus', () => {
            it('should set chart loading status directly', () => {
                tradeStore.setChartStatus(true);
                expect(tradeStore.is_chart_loading).toBe(true);

                tradeStore.setChartStatus(false);
                expect(tradeStore.is_chart_loading).toBe(false);
            });

            it('should use debounced method when called from chart', () => {
                const spy = jest.spyOn(tradeStore, 'debouncedSetChartStatus');

                tradeStore.setChartStatus(true, true);
                expect(spy).toHaveBeenCalledWith(true);

                spy.mockRestore();
            });

            it('should call ui.setIsChartLoading immediately when isFromChart is falsy', () => {
                const setIsChartLoadingMock = jest.fn();
                tradeStore.root_store.ui.setIsChartLoading = setIsChartLoadingMock;

                tradeStore.setChartStatus(true);
                expect(setIsChartLoadingMock).toHaveBeenCalledWith(true);
            });

            it('should NOT call ui.setIsChartLoading immediately when isFromChart is true (debounced)', () => {
                const setIsChartLoadingMock = jest.fn();
                tradeStore.root_store.ui.setIsChartLoading = setIsChartLoadingMock;

                tradeStore.setChartStatus(true, true);
                expect(setIsChartLoadingMock).not.toHaveBeenCalled();
            });
        });

        describe('setSkipPrePostLifecycle', () => {
            it('should set skip lifecycle flag', () => {
                tradeStore.setSkipPrePostLifecycle(true);
                expect(tradeStore.should_skip_prepost_lifecycle).toBe(true);

                tradeStore.setSkipPrePostLifecycle(false);
                expect(tradeStore.should_skip_prepost_lifecycle).toBe(false);
            });

            it('should not update if value is same', () => {
                tradeStore.should_skip_prepost_lifecycle = true;
                tradeStore.setSkipPrePostLifecycle(true);
                expect(tradeStore.should_skip_prepost_lifecycle).toBe(true);
            });
        });

        describe('onUnmount', () => {
            it('should reset is_chart_loading and ui.is_chart_loading', () => {
                const setIsChartLoadingMock = jest.fn();
                tradeStore.root_store.ui.setIsChartLoading = setIsChartLoadingMock;

                tradeStore.is_chart_loading = true;
                tradeStore.onUnmount();

                expect(tradeStore.is_chart_loading).toBe(false);
                expect(setIsChartLoadingMock).toHaveBeenCalledWith(false);
            });
        });
    });

    describe('Symbol and Previous Symbol Management', () => {
        describe('setPreviousSymbol', () => {
            it('should set previous symbol', () => {
                tradeStore.setPreviousSymbol('R_100');
                expect(tradeStore.previous_symbol).toBe('R_100');
            });

            it('should not update if symbol is same', () => {
                tradeStore.previous_symbol = 'R_100';
                tradeStore.setPreviousSymbol('R_100');
                expect(tradeStore.previous_symbol).toBe('R_100');
            });
        });

        describe('is_symbol_in_active_symbols', () => {
            beforeEach(() => {
                tradeStore.active_symbols = [
                    {
                        underlying_symbol: 'R_100',
                        display_order: 1,
                        exchange_is_open: 1,
                        market: 'synthetic_index',
                        submarket: 'random_index',
                        is_trading_suspended: 0,
                        subgroup: 'volatility',
                    },
                    {
                        underlying_symbol: '1HZ100V',
                        display_order: 2,
                        exchange_is_open: 1,
                        market: 'synthetic_index',
                        submarket: 'random_index',
                        is_trading_suspended: 0,
                        subgroup: 'volatility',
                    },
                ] as NonNullable<TActiveSymbolsResponse['active_symbols']>;
            });

            it('should return true for existing symbol', () => {
                tradeStore.symbol = 'R_100';
                expect(tradeStore.is_symbol_in_active_symbols).toBe(true);
            });

            it('should return false for non-existing symbol', () => {
                tradeStore.symbol = 'NON_EXISTENT';
                expect(tradeStore.is_symbol_in_active_symbols).toBe(false);
            });

            it('should return false when exchange is closed', () => {
                tradeStore.active_symbols = [
                    {
                        underlying_symbol: 'R_100',
                        display_order: 1,
                        exchange_is_open: 0, // Closed
                        market: 'synthetic_index',
                        submarket: 'random_index',
                        is_trading_suspended: 0,
                        subgroup: 'volatility',
                    },
                ] as NonNullable<TActiveSymbolsResponse['active_symbols']>;
                tradeStore.symbol = 'R_100';
                expect(tradeStore.is_symbol_in_active_symbols).toBe(false);
            });
        });
    });

    describe('Computed Properties', () => {
        describe('show_digits_stats', () => {
            it('should return true for digit trade types', () => {
                // Mock the isDigitTradeType function to return true
                const mockIsDigitTradeType = jest.fn(() => true);
                jest.doMock('AppV2/Utils/digits', () => ({
                    isDigitTradeType: mockIsDigitTradeType,
                }));

                tradeStore.contract_type = 'even_odd';
                expect(tradeStore.show_digits_stats).toBe(true);
            });
        });

        describe('is_dtrader_v2', () => {
            it('should always return true', () => {
                mockRootStore.ui.is_mobile = true;
                expect(tradeStore.is_dtrader_v2).toBe(true);
                mockRootStore.ui.is_mobile = false;
                expect(tradeStore.is_dtrader_v2).toBe(true);
            });
        });

        describe('is_synthetics_available', () => {
            it('should return true when synthetics market exists', () => {
                tradeStore.active_symbols = [
                    {
                        market: 'synthetic_index',
                        underlying_symbol: 'R_100',
                        display_order: 1,
                        exchange_is_open: 1,
                        submarket: 'random_index',
                        is_trading_suspended: 0,
                        subgroup: 'volatility',
                    },
                ] as NonNullable<TActiveSymbolsResponse['active_symbols']>;
                expect(tradeStore.is_synthetics_available).toBe(true);
            });

            it('should return false when no synthetics market', () => {
                tradeStore.active_symbols = [
                    {
                        market: 'forex',
                        underlying_symbol: 'EURUSD',
                        display_order: 1,
                        exchange_is_open: 1,
                        submarket: 'major_pairs',
                        is_trading_suspended: 0,
                        subgroup: 'none',
                    },
                ] as NonNullable<TActiveSymbolsResponse['active_symbols']>;
                expect(tradeStore.is_synthetics_available).toBe(false);
            });
        });
    });

    describe('URL trade_type reconciliation (contract_types_list_v2 when-reaction)', () => {
        const setUrlTradeType = (trade_type: string) => window.history.pushState({}, '', `/?trade_type=${trade_type}`);
        // setImmediate fires only after the entire microtask queue has drained, so this settles the
        // reconciliation's chained awaits (when → findSymbolForTradeType → onChange → when → onChange)
        // regardless of how many hops the chain has — unlike a fixed number of setTimeout(0) rounds.
        const flushPromises = () => new Promise(resolve => jest.requireActual('timers').setImmediate(resolve));

        afterEach(() => {
            window.history.pushState({}, '', '/');
            (findSymbolForTradeType as jest.Mock).mockResolvedValue('');
            // The valid-trade-type path persists contract_type to sessionStorage; clear it so a later
            // test's fresh store doesn't restore a leaked contract_type via retrieveFromStorage.
            sessionStorage.clear();
        });

        it('applies a valid URL trade type that the current market supports', () => {
            setUrlTradeType(TRADE_TYPES.RISE_FALL);
            tradeStore.contract_types_list_v2 = {
                'Ups & Downs': {
                    name: 'Ups & Downs',
                    categories: [{ value: TRADE_TYPES.RISE_FALL, text: 'Rise/Fall' }],
                },
            } as typeof tradeStore.contract_types_list_v2;

            expect(tradeStore.contract_type).toBe(TRADE_TYPES.RISE_FALL);
            expect(tradeStore.url_trade_type).toBe(TRADE_TYPES.RISE_FALL);
            expect(mockRootStore.ui.toggleUrlUnavailableModal).not.toHaveBeenCalled();
        });

        it('shows the URL-unavailable modal for an unknown/invalid trade type', () => {
            setUrlTradeType('not_a_real_trade_type');
            tradeStore.contract_types_list_v2 = {
                'Ups & Downs': {
                    name: 'Ups & Downs',
                    categories: [{ value: TRADE_TYPES.RISE_FALL, text: 'Rise/Fall' }],
                },
            } as typeof tradeStore.contract_types_list_v2;

            expect(mockRootStore.ui.toggleUrlUnavailableModal).toHaveBeenCalledWith(true);
        });

        it('switches to a compatible symbol and applies the URL trade type once the new market offers it', async () => {
            // e.g. arriving from Deriv Home with trade_type=rise_fall while the last-used market was
            // Boom 1000 (Multipliers only). The URL trade type wins: switch to a market that offers it,
            // then apply the trade type once the new market's list has loaded.
            (findSymbolForTradeType as jest.Mock).mockResolvedValue('1HZ100V');
            const onChangeSpy = jest.spyOn(tradeStore, 'onChange').mockResolvedValue(undefined);
            setUrlTradeType(TRADE_TYPES.RISE_FALL);
            tradeStore.symbol = 'BOOM1000';
            tradeStore.active_symbols = [
                { underlying_symbol: 'BOOM1000', exchange_is_open: 1 },
                { underlying_symbol: '1HZ100V', exchange_is_open: 1 },
            ] as NonNullable<TActiveSymbolsResponse['active_symbols']>;
            // Current market (Boom 1000) offers only Multipliers.
            tradeStore.contract_types_list_v2 = {
                Multipliers: {
                    name: 'Multipliers',
                    categories: [{ value: TRADE_TYPES.MULTIPLIER, text: 'Multipliers' }],
                },
            } as unknown as typeof tradeStore.contract_types_list_v2;

            await flushPromises();

            // The symbol switch is requested and the URL landing recorded, but the trade type isn't
            // applied yet because the new market's list hasn't arrived.
            expect(findSymbolForTradeType).toHaveBeenCalledWith(tradeStore.active_symbols, TRADE_TYPES.RISE_FALL);
            expect(tradeStore.url_trade_type).toBe(TRADE_TYPES.RISE_FALL);
            expect(onChangeSpy).toHaveBeenCalledWith({ target: { name: 'symbol', value: '1HZ100V' } });
            expect(onChangeSpy).not.toHaveBeenCalledWith({
                target: { name: 'contract_type', value: TRADE_TYPES.RISE_FALL },
            });
            // The loader flag stays set while the switch is in progress so the page keeps its loader.
            expect(tradeStore.is_reconciling_url_trade_type).toBe(true);

            // Simulate useContractsFor loading the new market's list (which offers Rise/Fall).
            tradeStore.contract_types_list_v2 = {
                'Ups & Downs': {
                    name: 'Ups & Downs',
                    categories: [{ value: TRADE_TYPES.RISE_FALL, text: 'Rise/Fall' }],
                },
            } as unknown as typeof tradeStore.contract_types_list_v2;

            await flushPromises();

            expect(onChangeSpy).toHaveBeenCalledWith({
                target: { name: 'contract_type', value: TRADE_TYPES.RISE_FALL },
            });
            expect(mockRootStore.ui.toggleUrlUnavailableModal).not.toHaveBeenCalled();
            // Reconciliation finished — the loader flag is cleared so the page renders.
            expect(tradeStore.is_reconciling_url_trade_type).toBe(false);
        });

        it('shows the URL-unavailable modal when no open market offers the requested trade type', async () => {
            (findSymbolForTradeType as jest.Mock).mockResolvedValue('');
            setUrlTradeType(TRADE_TYPES.MATCH_DIFF);
            tradeStore.active_symbols = [{ underlying_symbol: '1HZ100V', exchange_is_open: 1 }] as NonNullable<
                TActiveSymbolsResponse['active_symbols']
            >;
            tradeStore.contract_types_list_v2 = {
                'Ups & Downs': { name: 'Ups & Downs', categories: [TRADE_TYPES.RISE_FALL] },
            } as unknown as typeof tradeStore.contract_types_list_v2;

            await flushPromises();

            expect(mockRootStore.ui.toggleUrlUnavailableModal).toHaveBeenCalledWith(true);
        });

        it('fails fast to the modal when the compatible symbol is already current but its V2 list lacks the type', async () => {
            // The search (raw contracts_for) resolves to the current symbol, but its processed V2 list
            // doesn't expose the trade type (e.g. native-app/region filtering). No symbol change means
            // nothing will refetch, so we must not wait out the timeout — show the modal immediately.
            (findSymbolForTradeType as jest.Mock).mockResolvedValue('1HZ100V');
            const onChangeSpy = jest.spyOn(tradeStore, 'onChange').mockResolvedValue(undefined);
            setUrlTradeType(TRADE_TYPES.RISE_FALL);
            tradeStore.symbol = '1HZ100V';
            tradeStore.active_symbols = [{ underlying_symbol: '1HZ100V', exchange_is_open: 1 }] as NonNullable<
                TActiveSymbolsResponse['active_symbols']
            >;
            tradeStore.contract_types_list_v2 = {
                Multipliers: {
                    name: 'Multipliers',
                    categories: [{ value: TRADE_TYPES.MULTIPLIER, text: 'Multipliers' }],
                },
            } as unknown as typeof tradeStore.contract_types_list_v2;

            await flushPromises();

            expect(mockRootStore.ui.toggleUrlUnavailableModal).toHaveBeenCalledWith(true);
            expect(onChangeSpy).not.toHaveBeenCalled();
            // The loader flag is released rather than left blocking the page for the full timeout.
            expect(tradeStore.is_reconciling_url_trade_type).toBe(false);
        });

        it('clearUrlTradeType consumes the signal', () => {
            tradeStore.url_trade_type = TRADE_TYPES.RISE_FALL;
            tradeStore.clearUrlTradeType();
            expect(tradeStore.url_trade_type).toBeNull();
        });
    });

    describe('processContractsForV2 duration reconciliation', () => {
        // State right after a new symbol's contracts_for is applied, with a duration
        // retained from the previous symbol that is out of range for the new one.
        const setStaleDurationState = (duration: number, duration_unit: string) => {
            tradeStore.contract_type = TRADE_TYPES.RISE_FALL;
            tradeStore.duration = duration;
            tradeStore.duration_unit = duration_unit;
            tradeStore.duration_min_max = {
                intraday: { min: 900, max: 86400 }, // 15 minutes to 1 day
                daily: { min: 86400, max: 8640000 },
            };
            tradeStore.duration_units_list = [
                { value: 'm', text: 'Minutes' },
                { value: 'h', text: 'Hours' },
                { value: 'd', text: 'Days' },
            ];
        };

        it('resets a retained duration that is out of range for the new symbol to the smallest supported one', async () => {
            setStaleDurationState(2, 'm'); // 2 minutes < intraday minimum of 15 minutes

            await tradeStore.processContractsForV2();

            expect(tradeStore.duration).toBe(15);
            expect(tradeStore.duration_unit).toBe('m');
            expect(tradeStore.expiry_type).toBe('duration');
        });

        it('applies the configured per-trade-type default when the symbol supports it', async () => {
            tradeStore.contract_type = TRADE_TYPES.RISE_FALL; // configured default: 5 ticks
            tradeStore.duration = 2;
            tradeStore.duration_unit = 'm'; // 2 min < 15 min intraday minimum -> invalid
            tradeStore.duration_min_max = {
                tick: { min: 1, max: 10 },
                intraday: { min: 900, max: 86400 },
            };
            tradeStore.duration_units_list = [
                { value: 't', text: 'Ticks' },
                { value: 'm', text: 'Minutes' },
            ];

            await tradeStore.processContractsForV2();

            expect(tradeStore.duration).toBe(5);
            expect(tradeStore.duration_unit).toBe('t');
        });

        it('applies the configured default on first activation even when the retained duration is valid', async () => {
            tradeStore.contract_type = TRADE_TYPES.RISE_FALL; // configured default: 5 ticks
            tradeStore.duration = 8; // valid tick duration, but not the configured default
            tradeStore.duration_unit = 't';
            tradeStore.duration_min_max = { tick: { min: 1, max: 10 }, intraday: { min: 900, max: 86400 } };
            tradeStore.duration_units_list = [
                { value: 't', text: 'Ticks' },
                { value: 'm', text: 'Minutes' },
            ];
            // duration_default_applied_for starts '' -> this is the first time the type is active.

            await tradeStore.processContractsForV2();

            expect(tradeStore.duration).toBe(5);
            expect(tradeStore.duration_unit).toBe('t');
            expect(tradeStore.duration_default_applied_for).toBe(TRADE_TYPES.RISE_FALL);
        });

        it('leaves a valid manual duration unchanged on a later symbol change for the same type', async () => {
            tradeStore.contract_type = TRADE_TYPES.RISE_FALL;
            tradeStore.duration = 8; // manually chosen, valid for the tick range
            tradeStore.duration_unit = 't';
            tradeStore.duration_min_max = { tick: { min: 1, max: 10 } };
            tradeStore.duration_units_list = [{ value: 't', text: 'Ticks' }];
            // The default was already applied for this type on an earlier run.
            tradeStore.duration_default_applied_for = TRADE_TYPES.RISE_FALL;

            await tradeStore.processContractsForV2();

            expect(tradeStore.duration).toBe(8);
            expect(tradeStore.duration_unit).toBe('t');
        });

        it('leaves a retained duration unchanged when it is valid for the new symbol', async () => {
            setStaleDurationState(30, 'm'); // 30 minutes is within [15 minutes, 1 day]
            // Default already applied for this type -> a valid retained value is preserved.
            tradeStore.duration_default_applied_for = TRADE_TYPES.RISE_FALL;

            await tradeStore.processContractsForV2();

            expect(tradeStore.duration).toBe(30);
            expect(tradeStore.duration_unit).toBe('m');
        });

        it('does not reconcile the duration before a contract type is set', async () => {
            setStaleDurationState(2, 'm');
            tradeStore.contract_type = '';

            await tradeStore.processContractsForV2();

            expect(tradeStore.duration).toBe(2);
            expect(tradeStore.duration_unit).toBe('m');
        });

        it('releases the proposal hold once contract values are applied', async () => {
            setStaleDurationState(2, 'm');
            expect(tradeStore.is_awaiting_contracts_for).toBe(true);

            await tradeStore.processContractsForV2();

            expect(tradeStore.is_awaiting_contracts_for).toBe(false);
        });

        it('re-validates the corrected duration so a stale validation error cannot block the proposal', async () => {
            setStaleDurationState(2, 'm');
            tradeStore.contract_expiry_type = 'intraday';
            tradeStore.form_components = ['duration', 'amount'];
            tradeStore.validation_rules = {
                duration: { rules: [['number', { min: 15, max: 1440 }]] },
            } as unknown as typeof tradeStore.validation_rules;
            // The shared Validator isn't initialised in this unit context — spy instead.
            const validate_spy = jest.spyOn(tradeStore, 'validateProperty').mockImplementation(() => undefined);

            await tradeStore.processContractsForV2();

            expect(tradeStore.duration).toBe(15);
            expect(validate_spy).toHaveBeenCalledWith('duration', 15);
        });
    });

    describe('applyDefaultDuration', () => {
        it('applies the configured default for the current type and records its group', async () => {
            tradeStore.contract_type = TRADE_TYPES.HIGH_LOW; // configured default: 10 ticks
            tradeStore.duration_min_max = { tick: { min: 1, max: 10 } };
            tradeStore.duration_units_list = [{ value: 't', text: 'Ticks' }];
            const on_change_multiple_spy = jest
                .spyOn(tradeStore, 'onChangeMultiple')
                .mockResolvedValue(undefined as never);

            await tradeStore.applyDefaultDuration();

            expect(on_change_multiple_spy).toHaveBeenCalledWith({
                duration_unit: 't',
                duration: 10,
                expiry_time: null,
                expiry_type: 'duration',
            });
            // Tracked by trade-type group key, not the raw contract type.
            expect(tradeStore.duration_default_applied_for).toBe('higher_lower');
        });

        it('records the shared group for Up/Down turbos sub-types', async () => {
            tradeStore.contract_type = TRADE_TYPES.TURBOS.SHORT; // configured default: 10 ticks
            tradeStore.duration_min_max = { tick: { min: 5, max: 10 } };
            tradeStore.duration_units_list = [{ value: 't', text: 'Ticks' }];
            jest.spyOn(tradeStore, 'onChangeMultiple').mockResolvedValue(undefined as never);

            await tradeStore.applyDefaultDuration();

            expect(tradeStore.duration_default_applied_for).toBe('turbos');
        });

        it('does nothing when no contract type is set', async () => {
            tradeStore.contract_type = '';
            const on_change_multiple_spy = jest
                .spyOn(tradeStore, 'onChangeMultiple')
                .mockResolvedValue(undefined as never);

            await tradeStore.applyDefaultDuration();

            expect(on_change_multiple_spy).not.toHaveBeenCalled();
            expect(tradeStore.duration_default_applied_for).toBe('');
        });
    });

    describe('onChange trade-type switch applies the default duration', () => {
        beforeEach(() => {
            // Isolate the switch logic: let processNewValuesAsync just commit the incoming value.
            jest.spyOn(tradeStore, 'processNewValuesAsync').mockImplementation(async values => {
                Object.assign(tradeStore, values);
            });
            jest.spyOn(tradeStore, 'validateAllProperties').mockImplementation(() => undefined);
        });

        it('applies the default when switching to a different trade-type group', async () => {
            tradeStore.contract_type = TRADE_TYPES.RISE_FALL;
            const apply_spy = jest.spyOn(tradeStore, 'applyDefaultDuration').mockResolvedValue(undefined);

            await tradeStore.onChange({ target: { name: 'contract_type', value: TRADE_TYPES.HIGH_LOW } });

            expect(apply_spy).toHaveBeenCalled();
        });

        it('does not re-apply the default on an Up/Down sub-toggle within the same group', async () => {
            tradeStore.contract_type = TRADE_TYPES.TURBOS.LONG;
            const apply_spy = jest.spyOn(tradeStore, 'applyDefaultDuration').mockResolvedValue(undefined);

            await tradeStore.onChange({ target: { name: 'contract_type', value: TRADE_TYPES.TURBOS.SHORT } });

            expect(apply_spy).not.toHaveBeenCalled();
        });
    });

    describe('proposal hold until contracts_for is applied', () => {
        const subscribe_mock = WS.subscribeProposal as jest.Mock;

        const setProposalReadyState = () => {
            tradeStore.symbol = 'frxXAUUSD';
            tradeStore.currency = 'USD';
            tradeStore.trade_types = { CALL: 'Higher' } as unknown as typeof tradeStore.trade_types;
        };

        beforeEach(() => {
            subscribe_mock.mockClear();
        });

        it('does not send proposals while awaiting contracts_for values for the symbol', () => {
            setProposalReadyState();

            tradeStore.requestProposal();

            expect(subscribe_mock).not.toHaveBeenCalled();
        });

        it('sends proposals once processContractsForV2 has applied the contract values', async () => {
            setProposalReadyState();
            await tradeStore.processContractsForV2();

            tradeStore.requestProposal();

            expect(subscribe_mock).toHaveBeenCalled();
        });

        it('re-arms the hold when the symbol changes', async () => {
            setProposalReadyState();
            await tradeStore.processContractsForV2();
            expect(tradeStore.is_awaiting_contracts_for).toBe(false);

            tradeStore.updateStore({ symbol: '1HZ100V' } as Partial<TradeStore>);

            expect(tradeStore.is_awaiting_contracts_for).toBe(true);
            tradeStore.requestProposal();
            expect(subscribe_mock).not.toHaveBeenCalled();
        });

        it('re-arms the hold when the symbol is assigned directly, bypassing updateStore', async () => {
            // The URL when-block and loadActiveSymbols assign this.symbol directly —
            // the symbol reaction must re-arm or a stale-config proposal goes out.
            setProposalReadyState();
            await tradeStore.processContractsForV2();
            expect(tradeStore.is_awaiting_contracts_for).toBe(false);

            tradeStore.symbol = '1HZ100V';

            expect(tradeStore.is_awaiting_contracts_for).toBe(true);
            tradeStore.requestProposal();
            expect(subscribe_mock).not.toHaveBeenCalled();
        });

        it('setIsAwaitingContractsFor(false) releases the hold when contracts_for fails', () => {
            // Called by useContractsFor on failure so errors surface instead of a dead page.
            setProposalReadyState();
            tradeStore.setIsAwaitingContractsFor(false);

            tradeStore.requestProposal();

            expect(subscribe_mock).toHaveBeenCalled();
        });

        it('keeps holding when the symbol changes mid-processContractsForV2', async () => {
            setProposalReadyState();
            const values_spy = jest.spyOn(ContractType, 'getContractValues').mockImplementation(() => {
                // Simulate the user switching symbols while the old symbol's run is in flight.
                tradeStore.symbol = '1HZ100V';
                return {};
            });

            await tradeStore.processContractsForV2();

            expect(tradeStore.is_awaiting_contracts_for).toBe(true);
            tradeStore.requestProposal();
            expect(subscribe_mock).not.toHaveBeenCalled();
            values_spy.mockRestore();
        });
    });

    describe('is_automation_params_locked', () => {
        const setRunActive = (is_active: boolean) => {
            const root = tradeStore.root_store as unknown as { modules: { automation?: { is_active: boolean } } };
            root.modules = { ...root.modules, automation: { is_active } };
        };
        const setMobile = (is_mobile: boolean) => {
            (tradeStore.root_store.ui as unknown as { is_mobile: boolean }).is_mobile = is_mobile;
        };

        it('is false in manual trading even while a run is active (desktop)', () => {
            setRunActive(true);
            setMobile(false);
            tradeStore.setActiveTradePanelTab(TRADE_PANEL_TABS.TRADE);
            tradeStore.setIsAutomationPage(false);
            expect(tradeStore.is_automation_params_locked).toBe(false);
        });

        it('is true on the desktop automation tab while a run is active', () => {
            setRunActive(true);
            setMobile(false);
            tradeStore.setActiveTradePanelTab(TRADE_PANEL_TABS.AUTOMATION);
            expect(tradeStore.is_automation_params_locked).toBe(true);
        });

        it('is true in the mobile automation view while a run is active', () => {
            setRunActive(true);
            setMobile(true);
            tradeStore.setIsAutomationPage(true);
            expect(tradeStore.is_automation_params_locked).toBe(true);
        });

        it('is false on the mobile manual page even when the panel tab persisted as automation', () => {
            // Regression: the desktop-only panel tab must not leak onto mobile (no switcher resets it).
            setRunActive(true);
            setMobile(true);
            tradeStore.setActiveTradePanelTab(TRADE_PANEL_TABS.AUTOMATION);
            tradeStore.setIsAutomationPage(false);
            expect(tradeStore.is_automation_params_locked).toBe(false);
        });

        it('ignores the mobile view flag on desktop', () => {
            setRunActive(true);
            setMobile(false);
            tradeStore.setActiveTradePanelTab(TRADE_PANEL_TABS.TRADE);
            tradeStore.setIsAutomationPage(true);
            expect(tradeStore.is_automation_params_locked).toBe(false);
        });

        it('is false in the automation view when no run is active', () => {
            setRunActive(false);
            setMobile(true);
            tradeStore.setIsAutomationPage(true);
            expect(tradeStore.is_automation_params_locked).toBe(false);
        });

        describe('non-automatable symbol', () => {
            const AUTOMATABLE = 'R_100';
            const NON_AUTOMATABLE = 'cryBTCUSD';
            beforeEach(() => {
                tradeStore.active_symbols = [
                    {
                        underlying_symbol: AUTOMATABLE,
                        display_order: 1,
                        exchange_is_open: 1,
                        market: 'synthetic_index',
                        submarket: 'random_index',
                        is_trading_suspended: 0,
                        subgroup: 'volatility',
                    },
                    {
                        underlying_symbol: NON_AUTOMATABLE,
                        display_order: 2,
                        exchange_is_open: 1,
                        market: 'cryptocurrency',
                        submarket: 'non_stable_coin',
                        is_trading_suspended: 0,
                        subgroup: 'none',
                    },
                ] as NonNullable<TActiveSymbolsResponse['active_symbols']>;
                setRunActive(false);
                setMobile(false);
                tradeStore.setActiveTradePanelTab(TRADE_PANEL_TABS.AUTOMATION);
            });

            it('flags is_symbol_automatable false for a Crypto/Crash-Boom symbol', () => {
                tradeStore.symbol = NON_AUTOMATABLE;
                expect(tradeStore.is_symbol_automatable).toBe(false);
                tradeStore.symbol = AUTOMATABLE;
                expect(tradeStore.is_symbol_automatable).toBe(true);
            });

            it('locks the params (is_automation_params_locked) for a non-automatable symbol with no run', () => {
                tradeStore.symbol = NON_AUTOMATABLE;
                expect(tradeStore.is_automation_params_locked).toBe(true);
                // ...but the RUN-only lock stays false, so market/tab switching isn't blocked.
                expect(tradeStore.is_automation_market_locked).toBe(false);
            });

            it('does not lock params for a non-automatable symbol in manual mode', () => {
                tradeStore.setActiveTradePanelTab(TRADE_PANEL_TABS.TRADE);
                tradeStore.symbol = NON_AUTOMATABLE;
                expect(tradeStore.is_automation_params_locked).toBe(false);
            });

            it('is_automation_market_locked reflects only a live run', () => {
                tradeStore.symbol = NON_AUTOMATABLE;
                expect(tradeStore.is_automation_market_locked).toBe(false);
                setRunActive(true);
                expect(tradeStore.is_automation_market_locked).toBe(true);
            });
        });
    });

    describe('automation open-markets guard', () => {
        const rise_market: TOpenMarket = { symbol: 'R_100', contract_type: 'rise_fall' };
        const turbos_market: TOpenMarket = { symbol: 'R_100', contract_type: 'turboslong' };
        // Set the mode flags directly (not via setIsAutomationPage) so we exercise the guard in
        // isolation, without the reconcile-on-mode-switch cascade. `is_automation_mode` is
        // `is_mobile ? is_automation_page : is_automation_tab`.
        const setAutomationMode = (on: boolean) => {
            (tradeStore.root_store.ui as unknown as { is_mobile: boolean }).is_mobile = true;
            tradeStore.is_automation_page = on;
        };
        // setActiveOpenMarkets persists to localStorage — clear it so a written collection can't leak
        // into a later test's store construction.
        afterEach(() => {
            Object.values(OPEN_MARKETS_STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
        });

        it('setActiveOpenMarkets drops unsupported trade types once the supported set is known', () => {
            setAutomationMode(true);
            tradeStore.automation_supported_trade_types = new Set(['rise_fall']);
            tradeStore.setActiveOpenMarkets([rise_market, turbos_market]);
            expect(tradeStore.open_markets_automation).toEqual([rise_market]);
        });

        it('setActiveOpenMarkets passes through unfiltered while the supported set is empty (loading)', () => {
            setAutomationMode(true);
            tradeStore.automation_supported_trade_types = new Set();
            tradeStore.setActiveOpenMarkets([rise_market, turbos_market]);
            expect(tradeStore.open_markets_automation).toEqual([rise_market, turbos_market]);
        });

        it('matches on contract_type, not symbol (guards against a wrong-field regression)', () => {
            setAutomationMode(true);
            // Both tabs share a symbol; only the supported contract_type must survive.
            tradeStore.automation_supported_trade_types = new Set(['rise_fall']);
            tradeStore.setActiveOpenMarkets([turbos_market, rise_market]);
            expect(tradeStore.open_markets_automation).toEqual([rise_market]);
        });

        it('setAutomationSupportedTradeTypes flushes existing unsupported tabs in automation mode', () => {
            setAutomationMode(true);
            tradeStore.open_markets_automation = [rise_market, turbos_market];
            tradeStore.setAutomationSupportedTradeTypes(new Set(['rise_fall']));
            expect(tradeStore.open_markets_automation).toEqual([rise_market]);
        });

        it('setAutomationSupportedTradeTypes does not flush the strip outside automation mode', () => {
            setAutomationMode(false);
            tradeStore.open_markets_automation = [rise_market, turbos_market];
            tradeStore.setAutomationSupportedTradeTypes(new Set(['rise_fall']));
            expect(tradeStore.open_markets_automation).toEqual([rise_market, turbos_market]);
        });

        it('setAutomationSupportedTradeTypes is a no-op when the same Set reference is passed', () => {
            setAutomationMode(true);
            const set = new Set(['rise_fall']);
            tradeStore.automation_supported_trade_types = set;
            const spy = jest.spyOn(tradeStore, 'setActiveOpenMarkets');
            tradeStore.setAutomationSupportedTradeTypes(set);
            expect(spy).not.toHaveBeenCalled();
            spy.mockRestore();
        });
    });

    describe('automation_run_market', () => {
        const setRun = (is_active: boolean, contract_template: unknown, analytics: unknown = null) => {
            const root = tradeStore.root_store as unknown as { modules: { automation?: unknown } };
            root.modules = {
                ...root.modules,
                automation: {
                    is_active,
                    active_run: contract_template ? { contract_template } : null,
                    active_run_analytics: analytics,
                },
            };
        };

        it('returns the run market (symbol + app-format trade type) while a run is active', () => {
            setRun(true, { underlying_symbol: 'R_100', contract_type: 'CALL' }, { trade_type: 'rise_fall' });
            expect(tradeStore.automation_run_market).toEqual({ symbol: 'R_100', contract_type: 'rise_fall' });
        });

        it('has a null trade type for a recovered run (no analytics payload)', () => {
            setRun(true, { underlying_symbol: 'R_100', contract_type: 'CALL' }, null);
            expect(tradeStore.automation_run_market).toEqual({ symbol: 'R_100', contract_type: null });
        });

        it('is null when no run is active', () => {
            setRun(false, { underlying_symbol: 'R_100', contract_type: 'CALL' }, { trade_type: 'rise_fall' });
            expect(tradeStore.automation_run_market).toBeNull();
        });

        it('is null when the active run has no contract template', () => {
            setRun(true, null, { trade_type: 'rise_fall' });
            expect(tradeStore.automation_run_market).toBeNull();
        });
    });
});
