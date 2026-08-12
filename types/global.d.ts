import { TLiveChatWidget } from './livechat';

declare global {
    interface Window {
        Analytics: any;
        dataLayer: object[];
        DerivAppChannel?: DerivAppChannel;
        DerivInterCom: {
            initialize: (config: IntercomConfig) => void;
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Intercom: any;
        navigator: Navigator;
    }
    interface TradingConfigData {
        lang?: string;
        theme?: 'light' | 'dark';
    }
    interface DerivAppChannelMessage {
        event:
            | 'trading:config'
            | 'trading:ready'
            | 'trading:back'
            | 'trading:home'
            | 'trading:transfer'
            | 'trading:account_creation';
        data?: TradingConfigData; // Config data for trading:config event
    }
    interface DerivAppChannel {
        postMessage: (message: string) => void;
    }
    interface IntercomConfig {
        token: string | null;
        hideLauncher?: boolean;
    }
    interface Navigator {
        connection?: NetworkInformation;
    }
    interface NetworkInformation {
        effectiveType?: 'slow-2g' | '2g' | '3g' | '4g';
        rtt?: number;
        downlink?: number;
    }
}

export {};
