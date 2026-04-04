import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
} from 'react-native';

export default function AdminDashboard({
  adminUser,
  onLogout,
  onNavigate,
  styles,
}) {
  const isSuperAdmin = adminUser?.role === 'super_admin';

  // Menu items available to all admin roles
  const commonMenuItems = [
    {
      id: 'contractors',
      title: 'Contractors',
      description: 'View and manage contractor profiles',
      icon: '👷',
      color: '#3B82F6',
    },
    {
      id: 'companies',
      title: 'Companies',
      description: 'View and manage company information',
      icon: '🏢',
      color: '#10B981',
    },
    {
      id: 'visitor-inductions',
      title: 'Visitor Inductions',
      description: 'Manage visitor induction records',
      icon: '📋',
      color: '#F59E0B',
    },
    {
      id: 'isolation-registers',
      title: 'Isolation Registers',
      description: 'View isolation register data',
      icon: '📊',
      color: '#8B5CF6',
    },
  ];

  // Menu items only for super_admins
  const superAdminMenuItems = [
    {
      id: 'inductions',
      title: 'Inductions',
      description: 'Create and manage induction content',
      icon: '🎓',
      color: '#EF4444',
    },
    {
      id: 'permit-issuers',
      title: 'Permit Issuers',
      description: 'Manage permit issuer organizations',
      icon: '📜',
      color: '#EC4899',
    },
    {
      id: 'business-units',
      title: 'Business Units',
      description: 'Manage business unit organization',
      icon: '🏭',
      color: '#06B6D4',
    },
    {
      id: 'sites',
      title: 'Sites',
      description: 'Manage work sites',
      icon: '📍',
      color: '#14B8A6',
    },
    {
      id: 'services',
      title: 'Services',
      description: 'Manage services and categorization',
      icon: '⚙️',
      color: '#6366F1',
    },
    {
      id: 'admin-users',
      title: 'Admin Users',
      description: 'Create and manage admin accounts',
      icon: '👥',
      color: '#F97316',
    },
  ];

  const menuItems = isSuperAdmin ? [...commonMenuItems, ...superAdminMenuItems] : commonMenuItems;

  const handleMenuPress = (menuId) => {
    onNavigate(menuId);
  };

  const renderMenuItem = ({ item }) => (
    <TouchableOpacity
      style={{
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderLeftWidth: 4,
        borderLeftColor: item.color,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      }}
      onPress={() => handleMenuPress(item.id)}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Text style={{ fontSize: 28 }}>{item.icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#1F2937' }}>
            {item.title}
          </Text>
          <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
            {item.description}
          </Text>
        </View>
        <Text style={{ fontSize: 18, color: '#9CA3AF' }}>→</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={{ padding: 16, backgroundColor: '#1F2937', paddingTop: 40 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 24, fontWeight: '700', color: 'white' }}>Admin Dashboard</Text>
            <Text style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>
              {adminUser?.name} {isSuperAdmin && '(Super Admin)'}
            </Text>
          </View>
          <TouchableOpacity
            style={{ backgroundColor: '#EF4444', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6 }}
            onPress={onLogout}
          >
            <Text style={{ color: 'white', fontSize: 13, fontWeight: '600' }}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <FlatList
        data={menuItems}
        renderItem={renderMenuItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        scrollIndicatorInsets={{ right: 1 }}
      />
    </View>
  );
}
