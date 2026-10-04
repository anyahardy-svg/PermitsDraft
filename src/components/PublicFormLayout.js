import React from 'react';
import { View, Text, ScrollView, Platform, Linking } from 'react-native';
import ContractorHQLogo from './ContractorHQLogo';
import { CONTRACTOR_HQ_CONTACT, PUBLIC_PAGE_THEME } from '../constants/contractorHQBrand';

export default function PublicFormLayout({
  title,
  subtitle,
  children,
  heroExtra = null,
  compact = false,
}) {
  const theme = PUBLIC_PAGE_THEME;

  const pageStyle =
    Platform.OS === 'web' && !compact
      ? {
          minHeight: '100vh',
          background: theme.pageBackground,
        }
      : {
          flex: 1,
          backgroundColor: theme.pageBackground,
        };

  const heroStyle =
    Platform.OS === 'web' && !compact
      ? {
          background: theme.heroGradientWeb,
          paddingTop: 40,
          paddingBottom: 48,
          paddingHorizontal: 24,
          alignItems: 'center',
        }
      : {
          backgroundColor: '#4338CA',
          paddingTop: 32,
          paddingBottom: 40,
          paddingHorizontal: 20,
          alignItems: 'center',
        };

  return (
    <ScrollView
      style={pageStyle}
      contentContainerStyle={{
        flexGrow: 1,
        paddingBottom: compact ? 16 : 32,
      }}
    >
      {!compact ? (
        <View style={heroStyle}>
          <ContractorHQLogo variant="onDark" height={52} maxWidth={300} />
          {title ? (
            <Text
              style={{
                marginTop: 28,
                fontSize: 26,
                fontWeight: '800',
                color: '#FFFFFF',
                textAlign: 'center',
                letterSpacing: -0.3,
              }}
            >
              {title}
            </Text>
          ) : null}
          {subtitle ? (
            <Text
              style={{
                marginTop: 10,
                fontSize: 16,
                lineHeight: 24,
                color: 'rgba(255,255,255,0.92)',
                textAlign: 'center',
                maxWidth: 520,
              }}
            >
              {subtitle}
            </Text>
          ) : null}
          {heroExtra}
        </View>
      ) : null}

      <View
        style={{
          paddingHorizontal: 16,
          marginTop: compact ? 0 : -28,
          maxWidth: 560,
          width: '100%',
          alignSelf: 'center',
        }}
      >
        <View
          style={{
            backgroundColor: theme.cardBackground,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: theme.cardBorder,
            padding: compact ? 16 : 24,
            ...(Platform.OS === 'web'
              ? { boxShadow: '0 18px 40px rgba(15, 23, 42, 0.08)' }
              : {
                  shadowColor: '#0F172A',
                  shadowOpacity: 0.08,
                  shadowRadius: 16,
                  shadowOffset: { width: 0, height: 8 },
                  elevation: 4,
                }),
          }}
        >
          {compact && title ? (
            <View style={{ marginBottom: 16 }}>
              <ContractorHQLogo height={44} maxWidth={240} style={{ marginBottom: 12 }} />
              <Text style={{ fontSize: 20, fontWeight: '700', color: theme.textPrimary }}>{title}</Text>
              {subtitle ? (
                <Text style={{ marginTop: 6, fontSize: 14, lineHeight: 20, color: theme.textSecondary }}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
          ) : null}
          {children}
        </View>

        {!compact ? (
          <View style={{ marginTop: 24, paddingHorizontal: 8 }}>
            <Text
              style={{
                textAlign: 'center',
                fontSize: 15,
                fontWeight: '700',
                color: theme.textPrimary,
                marginBottom: 8,
              }}
            >
              Need help?
            </Text>
            <Text style={{ textAlign: 'center', fontSize: 14, color: theme.textSecondary, lineHeight: 22 }}>
              {CONTRACTOR_HQ_CONTACT.addressLine1}
              {'\n'}
              {CONTRACTOR_HQ_CONTACT.addressLine2}
            </Text>
            <Text
              style={{ textAlign: 'center', marginTop: 10, fontSize: 14, color: theme.accent, fontWeight: '600' }}
              onPress={() => Linking.openURL(`mailto:${CONTRACTOR_HQ_CONTACT.email}`)}
            >
              {CONTRACTOR_HQ_CONTACT.email}
            </Text>
            <Text style={{ textAlign: 'center', marginTop: 4, fontSize: 13, color: theme.textSecondary }}>
              {CONTRACTOR_HQ_CONTACT.contactName} · {CONTRACTOR_HQ_CONTACT.phone}
            </Text>
            <Text style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#94A3B8' }}>
              © {new Date().getFullYear()} Contractor HQ Limited
            </Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}
