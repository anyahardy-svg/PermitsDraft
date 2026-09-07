import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { listContractorsBySite } from '../../api/contractors';
import { listCompaniesAtSite } from '../../api/managerHub';
import { getSiteInductionStatus } from '../../utils/siteInductionStatus';
import ManagerContractorsPanel from './ManagerContractorsPanel';
import ManagerSignInsPanel from './ManagerSignInsPanel';
import ManagerCompaniesPanel from './ManagerCompaniesPanel';

export default function ManagerHubScreen({
  loggedInAdmin,
  sites = [],
  onLogout,
  onOpenAdminPanel,
  isSuperAdmin = false,
  styles,
}) {
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [showSitePicker, setShowSitePicker] = useState(false);
  const [countsLoading, setCountsLoading] = useState(false);
  const [counts, setCounts] = useState({ inducted: 0, expired: 0, companies: 0 });

  const availableSites = useMemo(() => {
    const adminSiteIds = loggedInAdmin?.site_ids || loggedInAdmin?.siteIds || [];
    if (isSuperAdmin) {
      return sites;
    }
    if (!adminSiteIds.length) {
      return [];
    }
    return sites.filter((site) => adminSiteIds.includes(site.id));
  }, [isSuperAdmin, loggedInAdmin, sites]);

  const siteIdToName = useMemo(
    () => Object.fromEntries((sites || []).map((site) => [site.id, site.name])),
    [sites]
  );

  useEffect(() => {
    if (!availableSites.length) {
      setSelectedSiteId('');
      return;
    }

    const stillValid = availableSites.some((site) => site.id === selectedSiteId);
    if (!selectedSiteId || !stillValid) {
      setSelectedSiteId(availableSites[0].id);
    }
  }, [availableSites, selectedSiteId]);

  const loadCounts = useCallback(async () => {
    if (!selectedSiteId) {
      setCounts({ inducted: 0, expired: 0, companies: 0 });
      return;
    }

    setCountsLoading(true);
    try {
      const [contractors, companies] = await Promise.all([
        listContractorsBySite(selectedSiteId),
        listCompaniesAtSite(selectedSiteId),
      ]);

      let inducted = 0;
      let expired = 0;
      contractors.forEach((contractor) => {
        const status = getSiteInductionStatus(contractor, selectedSiteId);
        if (status === 'inducted') inducted += 1;
        if (status === 'expired') expired += 1;
      });

      setCounts({
        inducted,
        expired,
        companies: companies.length,
      });
    } catch (error) {
      console.error('Failed to load manager hub counts:', error);
      setCounts({ inducted: 0, expired: 0, companies: 0 });
    } finally {
      setCountsLoading(false);
    }
  }, [selectedSiteId]);

  useEffect(() => {
    if (currentView === 'dashboard') {
      loadCounts();
    }
  }, [currentView, loadCounts]);

  const selectedSiteName = siteIdToName[selectedSiteId] || 'Select site';

  const goToDashboard = () => setCurrentView('dashboard');

  if (currentView === 'inducted') {
    return (
      <ManagerContractorsPanel
        siteId={selectedSiteId}
        siteIdToName={siteIdToName}
        mode="inducted"
        onBack={goToDashboard}
        styles={styles}
      />
    );
  }

  if (currentView === 'expired') {
    return (
      <ManagerContractorsPanel
        siteId={selectedSiteId}
        siteIdToName={siteIdToName}
        mode="expired"
        onBack={goToDashboard}
        styles={styles}
      />
    );
  }

  if (currentView === 'signins') {
    return (
      <ManagerSignInsPanel
        siteId={selectedSiteId}
        onBack={goToDashboard}
        styles={styles}
      />
    );
  }

  if (currentView === 'companies') {
    return (
      <ManagerCompaniesPanel
        siteId={selectedSiteId}
        mode="at_site"
        onBack={goToDashboard}
        styles={styles}
      />
    );
  }

  if (currentView === 'add_company') {
    return (
      <ManagerCompaniesPanel
        siteId={selectedSiteId}
        siteName={selectedSiteName}
        mode="add"
        onBack={goToDashboard}
        onCompanyAdded={loadCounts}
        styles={styles}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onLogout}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Site Manager Hub</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {isSuperAdmin && onOpenAdminPanel ? (
            <TouchableOpacity
              onPress={onOpenAdminPanel}
              style={{ paddingHorizontal: 10, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 6 }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 12 }}>Admin</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity onPress={onLogout} style={{ paddingHorizontal: 8, paddingVertical: 8 }}>
            <Text style={{ fontSize: 14, color: 'white', fontWeight: '600' }}>LOGOUT</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        onPress={() => setShowSitePicker(true)}
        style={{
          margin: 16,
          marginBottom: 0,
          backgroundColor: '#FFFFFF',
          borderWidth: 1,
          borderColor: '#D1D5DB',
          borderRadius: 8,
          paddingHorizontal: 14,
          paddingVertical: 12,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text style={{ color: '#374151', fontWeight: '600' }}>Site</Text>
        <Text style={{ color: '#111827', fontWeight: '700' }}>{selectedSiteName}</Text>
      </TouchableOpacity>

      {loggedInAdmin?.name ? (
        <Text style={{ color: '#6B7280', fontSize: 13, paddingHorizontal: 16, paddingTop: 8 }}>
          {loggedInAdmin.name}
        </Text>
      ) : null}

      {availableSites.length === 0 ? (
        <View style={{ padding: 16 }}>
          <Text style={{ color: '#B45309' }}>
            No sites are assigned to your account. Contact a super admin to assign sites.
          </Text>
        </View>
      ) : null}

      {countsLoading ? (
        <View style={{ padding: 16, alignItems: 'center' }}>
          <ActivityIndicator color="#2563EB" />
        </View>
      ) : null}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, padding: 16 }}>
        <View style={styles.dashboardGrid}>
          <TouchableOpacity
            style={[styles.dashboardCard, { borderLeftColor: '#10B981' }]}
            onPress={() => setCurrentView('inducted')}
            disabled={!selectedSiteId}
          >
            <Text style={styles.cardNumber}>{counts.inducted}</Text>
            <Text style={styles.cardLabel}>Inducted Contractors</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.dashboardCard, { borderLeftColor: '#EF4444' }]}
            onPress={() => setCurrentView('expired')}
            disabled={!selectedSiteId}
          >
            <Text style={styles.cardNumber}>{counts.expired}</Text>
            <Text style={styles.cardLabel}>Expired Inductions</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.dashboardCard, { borderLeftColor: '#3B82F6' }]}
            onPress={() => setCurrentView('signins')}
            disabled={!selectedSiteId}
          >
            <Text style={styles.cardNumber}>📋</Text>
            <Text style={styles.cardLabel}>Sign-in History</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.dashboardCard, { borderLeftColor: '#059669' }]}
            onPress={() => setCurrentView('companies')}
            disabled={!selectedSiteId}
          >
            <Text style={styles.cardNumber}>{counts.companies}</Text>
            <Text style={styles.cardLabel}>Companies at Site</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.dashboardCard, { borderLeftColor: '#8B5CF6' }]}
            onPress={() => setCurrentView('add_company')}
            disabled={!selectedSiteId}
          >
            <Text style={styles.cardNumber}>+</Text>
            <Text style={styles.cardLabel}>Add Company to Site</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={showSitePicker} transparent animationType="fade" onRequestClose={() => setShowSitePicker(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, maxHeight: '70%' }}>
            <Text style={{ fontSize: 18, fontWeight: '700', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
              Select site
            </Text>
            <ScrollView>
              {availableSites.map((site) => (
                <TouchableOpacity
                  key={site.id}
                  onPress={() => {
                    setSelectedSiteId(site.id);
                    setShowSitePicker(false);
                  }}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    borderBottomWidth: 1,
                    borderBottomColor: '#F3F4F6',
                    backgroundColor: site.id === selectedSiteId ? '#EFF6FF' : '#FFFFFF',
                  }}
                >
                  <Text style={{ fontWeight: site.id === selectedSiteId ? '700' : '500', color: '#111827' }}>
                    {site.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              onPress={() => setShowSitePicker(false)}
              style={{ padding: 16, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#E5E7EB' }}
            >
              <Text style={{ color: '#2563EB', fontWeight: '700' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
