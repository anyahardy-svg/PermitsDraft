import React from 'react';
import { View } from 'react-native';
import KioskScreen from './screens/KioskScreen';
import TransientMessageOverlay from './components/TransientMessageOverlay';
import { getKioskInitialRoute } from './utils/kioskBoot';

export default function KioskApp() {
  const initialRoute = getKioskInitialRoute();

  return (
    <View style={{ flex: 1 }}>
      <KioskScreen initialRoute={initialRoute} />
      <TransientMessageOverlay />
    </View>
  );
}
