import React from 'react';
import { View, Image, Platform } from 'react-native';
import { Text } from 'react-native';
import { CONTRACTOR_HQ_LOGO, CONTRACTOR_HQ_LOGO_LIGHT } from '../constants/contractorHQBrand';

function resolveLogoUri(asset) {
  if (typeof asset === 'string') {
    return asset;
  }
  if (asset?.uri) {
    return asset.uri;
  }
  if (asset?.default) {
    return asset.default;
  }
  return null;
}

export default function ContractorHQLogo({
  height = 56,
  maxWidth = 280,
  variant = 'default',
  style,
}) {
  const isOnDark = variant === 'onDark';
  const uri = resolveLogoUri(isOnDark ? CONTRACTOR_HQ_LOGO_LIGHT : CONTRACTOR_HQ_LOGO);

  const imageStyle =
    Platform.OS === 'web'
      ? {
          height,
          maxWidth,
          width: 'auto',
          objectFit: 'contain',
          display: 'block',
        }
      : {
          height,
          width: maxWidth,
        };

  if (!uri) {
    return (
      <View style={style}>
        <TextFallback height={height} onDark={isOnDark} />
      </View>
    );
  }

  return (
    <View style={[{ alignItems: 'flex-start' }, style]}>
      {Platform.OS === 'web' ? (
        <img src={uri} alt="Contractor HQ" style={imageStyle} />
      ) : (
        <Image source={{ uri }} accessibilityLabel="Contractor HQ" resizeMode="contain" style={imageStyle} />
      )}
    </View>
  );
}

function TextFallback({ height, onDark }) {
  const color = onDark ? '#FFFFFF' : '#0F172A';
  return (
    <View style={{ minHeight: height, justifyContent: 'center' }}>
      <Text style={{ fontSize: 22, fontWeight: '800', color }}>
        Contractor <Text style={{ color: onDark ? '#C7D2FE' : '#2563EB' }}>HQ</Text>
      </Text>
    </View>
  );
}
