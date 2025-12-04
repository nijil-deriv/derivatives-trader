# Mobile Trade Types Filtering Implementation

## Overview

This implementation restricts trade types shown in the native mobile app WebView to only 4 categories:

- Accumulators
- Multipliers
- Vanillas
- Turbos

## Implementation Details

### ✅ Files Created

1. **`packages/trader/src/AppV2/Hooks/useMobileTradeTypesFilter.ts`**
    - New hook that detects native mobile WebView using `isBridgeAvailable()`
    - Filters contract types to intersection of backend-available and mobile-allowed types
    - Reads configuration from remote config (Firebase)
    - Falls back to hardcoded defaults if remote config fails

### ✅ Files Modified

2. **`packages/trader/src/AppV2/Utils/trade-types-utils.tsx`**
    - Updated `getTradeTypesList()` function signature
    - Now accepts optional `mobile_filtered_list` parameter
    - Maintains backward compatibility

3. **`packages/trader/src/AppV2/Hooks/useContractsFor.ts`**
    - Added import for `useMobileTradeTypesFilter`
    - Updated `getTradeTypes()` callback to apply mobile filtering
    - Filters contract types before processing

4. **`packages/trader/src/AppV2/Hooks/useGuideContractTypes.ts`**
    - Added import for `useMobileTradeTypesFilter`
    - Updated to apply mobile filtering to Guide component
    - Maintains same API as before

5. **`packages/api/src/remote_config.json`**
    - Added `mobile_app_allowed_categories` array
    - Added `mobile_app_allowed_trade_types` array
    - Can be overridden by Firebase remote config

## How It Works

### Detection Flow

```
1. App loads in WebView
2. Native app injects window.DerivAppChannel
3. useMobileBridge().isBridgeAvailable() returns true
4. useMobileTradeTypesFilter detects native app mode
5. Filtering is applied to all trade type lists
```

### Filtering Logic

```
Backend API (contracts_for)
    ↓ Returns available contracts for symbol
[Accumulator, Multiplier, Vanilla, Rise/Fall, High/Low]
    ↓
useMobileTradeTypesFilter.filterContractTypesList()
    ↓ Intersection with mobile allowed types
[Accumulator, Multiplier, Vanilla, Turbos]
    ↓ Final result (intersection)
[Accumulator, Multiplier, Vanilla] ✅
```

**Key Point:** Only shows trade types that are:

- ✅ Available from backend API for the current symbol
- ✅ Allowed in mobile app configuration

## Configuration

### Remote Config (Firebase)

```json
{
    "mobile_app_allowed_categories": ["Accumulators", "Multipliers", "Vanillas", "Turbos"],
    "mobile_app_allowed_trade_types": [
        "accumulator",
        "multiplier",
        "vanillalong",
        "vanillashort",
        "turboslong",
        "turbosshort"
    ]
}
```

### Changing Allowed Types

1. Update Firebase remote config
2. No code deployment needed
3. Changes take effect immediately for new sessions

## Testing

### Test Scenarios

#### ✅ Scenario 1: Native Mobile App

- **Environment:** WebView with DerivAppChannel injected
- **Expected:** Only shows 4 allowed trade types (if backend supports them)
- **Test:** Open app in native mobile WebView

#### ✅ Scenario 2: Mobile Browser

- **Environment:** Mobile Safari/Chrome
- **Expected:** Shows all backend-available trade types
- **Test:** Open https://app.deriv.com in mobile browser

#### ✅ Scenario 3: Desktop Browser

- **Environment:** Desktop Chrome/Firefox/Safari
- **Expected:** Shows all backend-available trade types (App folder unaffected)
- **Test:** Open https://app.deriv.com on desktop

#### ✅ Scenario 4: Symbol with Limited Types

- **Symbol:** EUR/USD (supports Multiplier + Vanilla only)
- **Expected Mobile:** Shows only Multiplier + Vanilla
- **Expected Web:** Shows all available types

#### ✅ Scenario 5: Symbol with No Allowed Types

- **Symbol:** Volatility 10 Index (no mobile-allowed types)
- **Expected Mobile:** Shows empty state or fallback message
- **Expected Web:** Shows all available types

### Manual Testing Commands

```bash
# Run TypeScript type checking
cd packages/trader
npx tsc --noEmit

# Run tests
npm run test:jest -- AppV2/Hooks

# Build trader package
npm run build --workspace=@deriv/trader

# Start dev server
npm run serve --workspace=@deriv/trader
```

## Technical Details

### Bridge Detection

```typescript
const { isBridgeAvailable } = useMobileBridge();
// Returns true only when:
// - Running on mobile device
// - window.DerivAppChannel.postMessage exists
```

### Type Safety

All code is fully typed with TypeScript:

- `TContractTypesList` type for contract types
- Type guards for remote config values
- Proper null checking throughout

### Performance

- No additional API calls
- Memoized filtering logic
- Only processes when `isBridgeAvailable()` changes

## Benefits

1. ✅ **Backend Authority** - Respects API availability
2. ✅ **Safe Intersection** - Can't show unavailable contracts
3. ✅ **Remote Configurable** - Change types without deployment
4. ✅ **Isolated to AppV2** - Desktop app unaffected
5. ✅ **Fallback Safe** - Degrades gracefully
6. ✅ **No Breaking Changes** - Backward compatible

## Rollout Plan

### Phase 1: Testing

1. Deploy to staging environment
2. Test with native mobile app in development
3. Verify all scenarios work correctly

### Phase 2: Remote Config

1. Update Firebase remote config
2. Test config changes take effect
3. Verify fallback to defaults works

### Phase 3: Production

1. Deploy code to production
2. Monitor analytics for mobile vs web usage
3. Adjust allowed types via remote config as needed

## Future Enhancements

### Possible Improvements

1. **Per-Symbol Configuration**: Different allowed types per symbol
2. **User Preferences**: Let users customize which types they see
3. **A/B Testing**: Test different type combinations
4. **Analytics**: Track which types are most used in mobile app

### Remote Config Extensions

```json
{
    "mobile_app_allowed_types_per_symbol": {
        "frxEURUSD": ["multiplier", "vanilla"],
        "default": ["accumulator", "multiplier", "vanilla", "turbos"]
    }
}
```

## Support & Maintenance

### Debugging

To check if filtering is active:

```javascript
// In browser console
window.DerivAppChannel ? 'Native App' : 'Web Browser';
```

### Logs

The hook logs are minimal. To add debugging:

```typescript
console.log('Mobile filtering active:', isNativeApp);
console.log('Allowed types:', allowedTradeTypes);
```

### Common Issues

**Issue:** Types not filtering in mobile app

- Check `window.DerivAppChannel` exists
- Verify `isBridgeAvailable()` returns true
- Check remote config is loading

**Issue:** Wrong types showing

- Verify remote config values
- Check type mapping in `mapConfigToTradeTypes()`
- Ensure backend API is returning correct types

## Documentation Links

- [Bridge Detection Hook](packages/trader/src/App/Hooks/useMobileBridge.ts)
- [Remote Config](packages/api/src/remote_config.json)
- [Contract Types Constants](packages/shared/src/utils/constants/contract.ts)

---

**Implementation Date:** 2025-12-04
**Scope:** AppV2 only (mobile UI)
**Status:** ✅ Complete and Ready for Testing
