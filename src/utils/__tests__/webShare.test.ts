import { describe, expect, it } from 'vitest';
import {
  DEFAULT_WEB_SHARE_CAPABILITY_STATE,
  getWebShareCapabilityState,
  isTelegramWebView,
} from '../webShare';

describe('isTelegramWebView', () => {
  it('detects Telegram user agent', () => {
    expect(
      isTelegramWebView(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Telegram-Android/10.13.1'
      )
    ).toBe(true);
  });

  it('returns false for regular mobile Safari', () => {
    expect(
      isTelegramWebView(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1'
      )
    ).toBe(false);
  });
});

describe('getWebShareCapabilityState', () => {
  it('prefers native share when browser supports it', () => {
    expect(
      getWebShareCapabilityState({
        userAgent: 'Mozilla/5.0',
        hasNavigatorShare: true,
        hasClipboardWriteText: true,
        isSecureContext: true,
      })
    ).toEqual({
      isTelegramWebView: false,
      canUseNativeShare: true,
      canUseClipboardApi: true,
      preferredAction: 'native-share',
      shouldShowLimitedShareHint: false,
    });
  });

  it('switches to copy-link when native share is unavailable', () => {
    expect(
      getWebShareCapabilityState({
        userAgent: 'Mozilla/5.0',
        hasNavigatorShare: false,
        hasClipboardWriteText: true,
        isSecureContext: true,
      })
    ).toEqual({
      isTelegramWebView: false,
      canUseNativeShare: false,
      canUseClipboardApi: true,
      preferredAction: 'copy-link',
      shouldShowLimitedShareHint: false,
    });
  });

  it('marks Telegram WebView as limited when native share is absent', () => {
    expect(
      getWebShareCapabilityState({
        userAgent: 'Mozilla/5.0 Telegram-Android/10.13.1',
        hasNavigatorShare: false,
        hasClipboardWriteText: true,
        isSecureContext: true,
      })
    ).toEqual({
      isTelegramWebView: true,
      canUseNativeShare: false,
      canUseClipboardApi: true,
      preferredAction: 'copy-link',
      shouldShowLimitedShareHint: true,
    });
  });

  it('keeps clipboard API disabled outside secure context', () => {
    expect(
      getWebShareCapabilityState({
        userAgent: 'Mozilla/5.0',
        hasNavigatorShare: false,
        hasClipboardWriteText: true,
        isSecureContext: false,
      })
    ).toEqual({
      isTelegramWebView: false,
      canUseNativeShare: false,
      canUseClipboardApi: false,
      preferredAction: 'copy-link',
      shouldShowLimitedShareHint: false,
    });
  });

  it('exposes a stable default state for SSR/client hydration', () => {
    expect(DEFAULT_WEB_SHARE_CAPABILITY_STATE).toEqual({
      isTelegramWebView: false,
      canUseNativeShare: false,
      canUseClipboardApi: false,
      preferredAction: 'native-share',
      shouldShowLimitedShareHint: false,
    });
  });
});
