import React from 'react';
import { View, Text, Image, TouchableOpacity, Linking, Platform } from 'react-native';
import {
  CONTRACTOR_HQ_CONTACT,
  getPartnerLogoUrls,
} from '../constants/emailBrandAssets';

function openExternalUrl(url) {
  Linking.openURL(url).catch(() => {});
}

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

export default function ContractorSiteFooter() {
  const partnerLogos = getPartnerLogoUrls();
  const { addressLine1, addressLine2, email, contactName, phone, phoneTel } = CONTRACTOR_HQ_CONTACT;

  return (
    <View style={{
      marginTop: 32,
      paddingTop: 28,
      borderTopWidth: 1,
      borderTopColor: '#E5E7EB',
    }}>
      <View style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 20,
        marginBottom: 28,
        paddingHorizontal: 8,
      }}>
        {partnerLogos.map((logo) => (
          <PartnerLogo key={logo.file} logo={logo} />
        ))}
      </View>

      <View style={{
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 20,
        borderWidth: 1,
        borderColor: '#E5E7EB',
      }}>
        <Text style={{
          fontSize: 16,
          fontWeight: '700',
          color: '#1F2937',
          marginBottom: 12,
          textAlign: 'center',
        }}>
          Contact Us
        </Text>

        <Text style={{
          fontSize: 14,
          color: '#4B5563',
          textAlign: 'center',
          lineHeight: 22,
          marginBottom: 4,
        }}>
          {addressLine1}
        </Text>
        <Text style={{
          fontSize: 14,
          color: '#4B5563',
          textAlign: 'center',
          lineHeight: 22,
          marginBottom: 12,
        }}>
          {addressLine2}
        </Text>

        <TouchableOpacity onPress={() => openExternalUrl(`mailto:${email}`)}>
          <Text style={{
            fontSize: 14,
            color: '#2563EB',
            textAlign: 'center',
            lineHeight: 22,
            marginBottom: 4,
          }}>
            {email}
          </Text>
        </TouchableOpacity>

        <Text style={{
          fontSize: 14,
          color: '#4B5563',
          textAlign: 'center',
          lineHeight: 22,
          marginBottom: 4,
        }}>
          {contactName}
        </Text>

        <TouchableOpacity onPress={() => openExternalUrl(`tel:${phoneTel}`)}>
          <Text style={{
            fontSize: 14,
            color: '#2563EB',
            textAlign: 'center',
            lineHeight: 22,
          }}>
            {phone}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={{
        fontSize: 11,
        color: '#9CA3AF',
        textAlign: 'center',
        marginTop: 20,
        fontWeight: '500',
      }}>
        © 2026 Contractor HQ Limited. All rights reserved.
      </Text>
    </View>
  );
}
