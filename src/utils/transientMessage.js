import { Platform, ToastAndroid } from 'react-native';

const DEFAULT_DURATION_MS = 1500;

let overlayHandler = null;

export function registerTransientMessageOverlay(handler) {
  overlayHandler = handler;
}

export function showTransientMessage(message, durationMs = DEFAULT_DURATION_MS) {
  if (!message) return;

  if (overlayHandler) {
    overlayHandler(message, durationMs);
    return;
  }

  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
    return;
  }

  console.log('[transientMessage]', message);
}
