import { registerRootComponent } from 'expo';

import App from './App';

// Load Quill CSS for rich text editor (web only)
try {
  if (typeof window !== 'undefined') {
    require('react-quill/dist/quill.snow.css');
  }
} catch (e) {
  // Quill CSS not available in this environment
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
