import { Platform, ToastAndroid } from 'react-native';

const DEFAULT_DURATION_MS = 1500;

let overlayHandler = null;
let progressHandler = null;

export function registerTransientMessageOverlay(handler) {
  overlayHandler = handler;
}

export function registerTransientProgressOverlay(handler) {
  progressHandler = handler;
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

export function showProgressMessage(message) {
  if (!message) return;

  if (progressHandler) {
    progressHandler(message);
    return;
  }

  console.log('[progressMessage]', message);
}

export function clearProgressMessage() {
  if (progressHandler) {
    progressHandler(null);
    return;
  }
}
