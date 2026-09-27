import { Alert, Platform } from 'react-native';

/**
 * Reliable alerts on web (RN Alert.alert is easy to miss) and native.
 */
export function showUserAlert(title, message, buttons) {
  const body = [title, message].filter(Boolean).join('\n\n');

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    if (Array.isArray(buttons) && buttons.length > 1 && typeof window.confirm === 'function') {
      const cancel = buttons.find((b) => b.style === 'cancel');
      const action = buttons.find((b) => b.style !== 'cancel') || buttons[0];
      const prompt = action?.text
        ? `${body}\n\n• Cancel — ${cancel?.text || 'go back'}\n• OK — ${action.text}`
        : body;
      if (window.confirm(prompt)) {
        action?.onPress?.();
      } else {
        cancel?.onPress?.();
      }
      return;
    }
    window.alert(body);
    if (Array.isArray(buttons) && buttons.length === 1) {
      buttons[0]?.onPress?.();
    }
    return;
  }

  if (Array.isArray(buttons) && buttons.length > 0) {
    Alert.alert(title, message, buttons);
    return;
  }

  Alert.alert(title, message);
}

/**
 * Two-choice prompt that resolves on web and native (avoid Alert.alert + async Promise on web).
 * @returns {Promise<boolean>} true when the user picks the confirm (non-cancel) action
 */
export function promptUserConfirm(title, message, { confirmText = 'OK', cancelText = 'Cancel' } = {}) {
  return new Promise((resolve) => {
    showUserAlert(title, message, [
      { text: cancelText, style: 'cancel', onPress: () => resolve(false) },
      { text: confirmText, onPress: () => resolve(true) },
    ]);
  });
}
