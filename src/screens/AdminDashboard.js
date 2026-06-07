import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';

export default function AdminDashboard({
  adminSessionActive,
  onLogout,
  onNavigate,
  onNavigateToSupplier,
  onShowAddAdminModal,
  styles,
  pendingJoinRequestsCount = 0,
  permitIssuersCount = 0,
  companiesCount = 0,
  contractorsCount = 0,
  sitesCount = 0,
  servicesCount = 0,
  isolationRegistersCount = 0,
  businessUnitsCount = 0,
  isSuperAdmin = false,
}) {
  return (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          if (adminSessionActive) {
            onLogout();
          } else {
            onNavigate('dashboard');
          }
        }}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Admin Panel</Text>
        <TouchableOpacity
          onPress={onLogout}
          style={{ paddingHorizontal: 16, paddingVertical: 8 }}
        >
          <Text style={{ fontSize: 14, color: 'white', fontWeight: '600' }}>LOGOUT</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, padding: 16 }}>
        <View style={styles.dashboardGrid}>
          <TouchableOpacity style={[styles.dashboardCard, { borderLeftColor: '#F59E0B' }]} onPress={() => onNavigate('join-requests')}>
            <Text style={styles.cardNumber}>{pendingJoinRequestsCount}</Text>
            <Text style={styles.cardLabel}>Join Requests</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.dashboardCard, { borderLeftColor: '#7C3AED' }]} onPress={() => onNavigate('manage_issuers')}>
            <Text style={styles.cardNumber}>{permitIssuersCount}</Text>
            <Text style={styles.cardLabel}>Permit Issuers</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.dashboardCard, { borderLeftColor: '#10B981' }]} onPress={() => onNavigate('manage_companies')}>
            <Text style={styles.cardNumber}>{companiesCount}</Text>
            <Text style={styles.cardLabel}>Companies</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.dashboardCard, { borderLeftColor: '#F59E42' }]} onPress={() => onNavigate('manage_contractors')}>
            <Text style={styles.cardNumber}>{contractorsCount}</Text>
            <Text style={styles.cardLabel}>Contractors</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.dashboardCard, { borderLeftColor: '#3B82F6' }]} onPress={() => onNavigate('manage_sites')}>
            <Text style={styles.cardNumber}>{sitesCount}</Text>
            <Text style={styles.cardLabel}>Sites</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.dashboardCard, { borderLeftColor: '#8B5CF6' }]} onPress={() => onNavigate('manage_services')}>
            <Text style={styles.cardNumber}>{servicesCount}</Text>
            <Text style={styles.cardLabel}>Services</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.dashboardCard, { borderLeftColor: '#EF4444' }]} onPress={() => onNavigate('manage_isolations')}>
            <Text style={styles.cardNumber}>{isolationRegistersCount}</Text>
            <Text style={styles.cardLabel}>Isolation Register</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.dashboardCard, { borderLeftColor: '#06B6D4' }]} onPress={() => onNavigate('manage_visitor_inductions')}>
            <Text style={styles.cardNumber}>{sitesCount}</Text>
            <Text style={styles.cardLabel}>Visitor Inductions</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.dashboardCard, { borderLeftColor: '#EC4899' }]} onPress={() => onNavigate('manage_inductions')}>
            <Text style={styles.cardNumber}>📚</Text>
            <Text style={styles.cardLabel}>Inductions</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.dashboardCard, { borderLeftColor: '#14B8A6' }]} onPress={() => onNavigate('manage_business_units')}>
            <Text style={styles.cardNumber}>{businessUnitsCount}</Text>
            <Text style={styles.cardLabel}>Business Units</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.dashboardCard, { borderLeftColor: '#8B5CF6' }]} onPress={() => onNavigate('legal_documents')}>
            <Text style={styles.cardNumber}>📋</Text>
            <Text style={styles.cardLabel}>Legal Documents</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.dashboardCard, { borderLeftColor: '#06B6D4' }]} onPress={() => onNavigate('manage_email_templates')}>
            <Text style={styles.cardNumber}>📧</Text>
            <Text style={styles.cardLabel}>Email Templates</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.dashboardCard, { borderLeftColor: '#6366F1' }]}
            onPress={() => onNavigateToSupplier({ supplierId: 'test-123' })}
          >
            <Text style={styles.cardNumber}>0</Text>
            <Text style={styles.cardLabel}>Suppliers</Text>
          </TouchableOpacity>
          {isSuperAdmin && (
            <TouchableOpacity style={[styles.dashboardCard, { borderLeftColor: '#F97316' }]} onPress={onShowAddAdminModal}>
              <Text style={styles.cardNumber}>+</Text>
              <Text style={styles.cardLabel}>Add Admin</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
