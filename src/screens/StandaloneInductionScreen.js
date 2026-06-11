import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import ContractorInductionScreen from './ContractorInductionScreen';
import { inductionScreenStyles } from '../styles/inductionScreenStyles';
import {
  getRouteFromInductionPath,
  inductionRouteToPath,
} from '../utils/inductionLinks';

export default function StandaloneInductionScreen() {
  const [routeKey, setRouteKey] = useState(0);
  const [initialRoute, setInitialRoute] = useState(() => {
    if (typeof window === 'undefined') {
      return null;
    }
    return getRouteFromInductionPath(window.location.pathname);
  });

  const syncRouteFromUrl = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }
    setInitialRoute(getRouteFromInductionPath(window.location.pathname));
    setRouteKey((current) => current + 1);
  }, []);

  const updatePath = useCallback((route) => {
    if (typeof window === 'undefined') {
      return;
    }

    const newPath = inductionRouteToPath(route);
    if (window.location.pathname !== newPath) {
      window.history.pushState(null, '', newPath);
    }
    setInitialRoute(route);
    setRouteKey((current) => current + 1);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handlePopState = () => {
      syncRouteFromUrl();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [syncRouteFromUrl]);

  const handleSelectInductionType = useCallback((type) => {
    updatePath(type);
  }, [updatePath]);

  const handleBackToSelection = useCallback(() => {
    updatePath(null);
  }, [updatePath]);

  const handleComplete = useCallback(() => {
    updatePath(null);
  }, [updatePath]);

  return (
    <View style={styles.wrapper}>
      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>Contractor Induction</Text>
        <Text style={styles.bannerText}>
          Complete your induction online. No login or site kiosk required.
        </Text>
      </View>
      <View style={styles.content}>
        <ContractorInductionScreen
          key={routeKey}
          styles={inductionScreenStyles}
          initialRoute={initialRoute}
          standalone
          onSelectInductionType={handleSelectInductionType}
          onBackToSelection={handleBackToSelection}
          onComplete={handleComplete}
          onCancel={handleComplete}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  banner: {
    backgroundColor: '#1E3A8A',
    paddingTop: 24,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  bannerTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  bannerText: {
    color: '#DBEAFE',
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
});
