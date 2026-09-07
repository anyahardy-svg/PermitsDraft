import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import ManagerContractorsPanel from './ManagerContractorsPanel';
import ManagerSignInsPanel from './ManagerSignInsPanel';
import ManagerCompaniesPanel from './ManagerCompaniesPanel';

const TABS = [
  { id: 'contractors', label: 'Contractors' },
  { id: 'signins', label: 'Sign-ins' },
  { id: 'companies', label: 'Companies' },
];

export default function ManagerHubScreen({
  loggedInAdmin,
  sites = [],
  onLogout,
  onOpenAdminPanel,
  isSuperAdmin = false,
}) {
  const [activeTab, setActiveTab] = useState('contractors');
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [showSitePicker, setShowSitePicker] = useState(false);

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

  const selectedSiteName = siteIdToName[selectedSiteId] || 'Select site';

  return (
    <View style={{ flex: 1, backgroundColor: '#F3F4F6' }}>
      <View style={{
        backgroundColor: '#1D4ED8',
        paddingHorizontal: 16,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '700' }}>Site Manager Hub</Text>
          {loggedInAdmin?.name ? (
            <Text style={{ color: '#DBEAFE', fontSize: 13, marginTop: 2 }}>{loggedInAdmin.name}</Text>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {isSuperAdmin && onOpenAdminPanel ? (
            <TouchableOpacity
              onPress={onOpenAdminPanel}
              style={{ paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#1E40AF', borderRadius: 6 }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 12 }}>Admin Panel</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity onPress={onLogout}>
            <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        onPress={() => setShowSitePicker(true)}
        style={{
          margin: 16,
          marginBottom: 8,
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

      {availableSites.length === 0 ? (
        <View style={{ padding: 16 }}>
          <Text style={{ color: '#B45309' }}>
            No sites are assigned to your account. Contact a super admin to assign sites.
          </Text>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 }}>
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 8,
                backgroundColor: active ? '#2563EB' : '#E5E7EB',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: active ? '#FFFFFF' : '#374151', fontWeight: '700' }}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
        {activeTab === 'contractors' && (
          <ManagerContractorsPanel siteId={selectedSiteId} siteIdToName={siteIdToName} />
        )}
        {activeTab === 'signins' && (
          <ManagerSignInsPanel siteId={selectedSiteId} />
        )}
        {activeTab === 'companies' && (
          <ManagerCompaniesPanel siteId={selectedSiteId} />
        )}
      </View>

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
