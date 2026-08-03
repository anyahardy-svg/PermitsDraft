import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, Platform } from 'react-native';
import ContractorInductionScreen from './ContractorInductionScreen';
import { inductionScreenStyles } from '../styles/inductionScreenStyles';
import { getPartnerLogoUrls } from '../constants/emailBrandAssets';
import {
  getRouteFromInductionPath,
  inductionRouteToPath,
} from '../utils/inductionLinks';

function PartnerLogo({ logo }) {
  if (Platform.OS === 'web') {
    return (
      <img
        src={logo.url}
        alt={logo.name}
        style={{
          height: 52,
          maxWidth: 150,
          width: 'auto',
          objectFit: 'contain',
          display: 'block',
        }}
      />
    );
  }

  return (
    <Image
      source={{ uri: logo.url }}
      accessibilityLabel={logo.name}
      resizeMode="contain"
      style={{
        height: 52,
        width: 150,
      }}
    />
  );
}

export default function StandaloneInductionScreen() {
  const partnerLogos = getPartnerLogoUrls();
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
          styles={inductionScreenStyles}
          initialRoute={initialRoute}
          standalone
          onSelectInductionType={handleSelectInductionType}
          onBackToSelection={handleBackToSelection}
          onComplete={handleComplete}
          onCancel={handleComplete}
        />
      </View>
      <View style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 20,
        paddingTop: 28,
        paddingBottom: 24,
        paddingHorizontal: 16,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
      }}>
        {partnerLogos.map((logo) => (
          <PartnerLogo key={logo.file} logo={logo} />
        ))}
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
