export interface WebShareCapabilityInput {
  userAgent?: string | null;
  hasNavigatorShare: boolean;
  hasClipboardWriteText: boolean;
  isSecureContext: boolean;
}

export interface WebShareCapabilityState {
  isTelegramWebView: boolean;
  canUseNativeShare: boolean;
  canUseClipboardApi: boolean;
  preferredAction: 'native-share' | 'copy-link';
  shouldShowLimitedShareHint: boolean;
}

const TELEGRAM_WEBVIEW_PATTERN = /\bTelegram(?:Bot)?(?:\/[\d.]+)?\b/i;

export const DEFAULT_WEB_SHARE_CAPABILITY_STATE: WebShareCapabilityState = {
  isTelegramWebView: false,
  canUseNativeShare: false,
  canUseClipboardApi: false,
  preferredAction: 'native-share',
  shouldShowLimitedShareHint: false,
};

export const isTelegramWebView = (userAgent?: string | null): boolean => {
  if (!userAgent) {
    return false;
  }

  return TELEGRAM_WEBVIEW_PATTERN.test(userAgent);
};

export const getWebShareCapabilityState = (
  input: WebShareCapabilityInput
): WebShareCapabilityState => {
  const telegramWebView = isTelegramWebView(input.userAgent);
  const canUseNativeShare = input.hasNavigatorShare;
  const canUseClipboardApi = input.isSecureContext && input.hasClipboardWriteText;

  return {
    isTelegramWebView: telegramWebView,
    canUseNativeShare,
    canUseClipboardApi,
    preferredAction: canUseNativeShare ? 'native-share' : 'copy-link',
    shouldShowLimitedShareHint: telegramWebView && !canUseNativeShare,
  };
};
