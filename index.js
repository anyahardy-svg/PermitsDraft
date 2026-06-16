import { registerRootComponent } from 'expo';

import App from './App';
import { redirectKioskSupplierFormIfNeeded } from './src/utils/supplierFormRoute';

redirectKioskSupplierFormIfNeeded();

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
