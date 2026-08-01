import React from 'react';
import { View, Image, Platform } from 'react-native';
import { getKioskLogo } from '../utils/kioskBrandLogo';

export default function KioskBrandLogo({
  kioskSubdomain,
  height = 52,
  maxWidth = 180,
  style,
}) {
  const logo = getKioskLogo(kioskSubdomain);
  if (!logo) {
    return null;
  }

  const imageStyle = {
    height,
    maxWidth,
    width: 'auto',
    objectFit: 'contain',
    display: 'block',
  };

  return (
    <View
      style={[
        {
          backgroundColor: 'white',
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 8,
          flexShrink: 0,
        },
        style,
      ]}
    >
      {Platform.OS === 'web' ? (
        <img src={logo.url} alt={`${logo.name} logo`} style={imageStyle} />
      ) : (
        <Image
          source={{ uri: logo.url }}
          accessibilityLabel={`${logo.name} logo`}
          resizeMode="contain"
          style={{
            height,
            width: maxWidth,
          }}
        />
      )}
    </View>
  );
}
