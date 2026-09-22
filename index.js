import { registerRootComponent } from 'expo';

import { redirectKioskSupplierFormIfNeeded } from './src/utils/supplierFormRoute';
import { shouldBootKioskApp } from './src/utils/kioskBoot';

redirectKioskSupplierFormIfNeeded();

async function boot() {
  const rootModule = shouldBootKioskApp()
    ? await import('./src/KioskApp')
    : await import('./App');

  registerRootComponent(rootModule.default);
}

boot();
