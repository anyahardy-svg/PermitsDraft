import React, { lazy, Suspense, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import KioskScreen from './screens/KioskScreen';
import TransientMessageOverlay from './components/TransientMessageOverlay';
import { getKioskInitialRoute } from './utils/kioskBoot';
import { kioskPermitsEnabled } from './utils/kioskBrandLogo';

const PermitManagementApp = lazy(() =>
  import('../App').then((module) => ({ default: module.PermitManagementApp }))
);

export default function KioskApp() {
  const initialRoute = getKioskInitialRoute();
  const [viewingPermits, setViewingPermits] = useState(false);
  const [kioskSiteId, setKioskSiteId] = useState(null);

  const handleViewPermits = (siteId) => {
    const subdomain = typeof window !== 'undefined' ? window.location.hostname.split('.')[0] : null;
    if (!kioskPermitsEnabled(subdomain)) {
      return;
    }

    setKioskSiteId(siteId);
    setViewingPermits(true);
  };

  if (viewingPermits && kioskPermitsEnabled(
    typeof window !== 'undefined' ? window.location.hostname.split('.')[0] : null
  )) {
    return (
      <View style={{ flex: 1 }}>
        <Suspense fallback={<ActivityIndicator size="large" style={{ flex: 1 }} />}>
          <PermitManagementApp
            initialSiteId={kioskSiteId}
            onBackToKiosk={() => setViewingPermits(false)}
          />
        </Suspense>
        <TransientMessageOverlay />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <KioskScreen initialRoute={initialRoute} onViewPermits={handleViewPermits} />
      <TransientMessageOverlay />
    </View>
  );
}
