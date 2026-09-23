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
      const prompt = action?.text ? `${body}\n\nPress OK for "${action.text}".` : body;
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
