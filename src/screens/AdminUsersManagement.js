import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
} from 'react-native';
import {
  getAllAdminUsers,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
} from '../api/adminAuth';
import { listSites } from '../api/sites';

export default function AdminUsersManagement({ onBack, styles }) {
  const [admins, setAdmins] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    role: 'manager',
    siteIds: [],
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadAdmins();
  }, []);

  const loadAdmins = async () => {
    try {
      setLoading(true);
      const [data, sitesData] = await Promise.all([
        getAllAdminUsers(),
        listSites(),
      ]);
      setAdmins(data);
      setSites(sitesData || []);
    } catch (err) {
      console.error('❌ Error loading admins:', err);
      Alert.alert('Error', 'Failed to load admin users');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        email: user.email,
        name: user.name,
        password: '',
        role: user.role,
        siteIds: user.site_ids || user.siteIds || [],
      });
    } else {
      setEditingUser(null);
      setFormData({
        email: '',
        name: '',
        password: '',
        role: 'manager',
        siteIds: [],
      });
    }
    setError('');
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setEditingUser(null);
    setFormData({ email: '', name: '', password: '', role: 'manager', siteIds: [] });
    setError('');
  };

  const handleSaveUser = async () => {
    setError('');

    if (!formData.email || !formData.name) {
      setError('Email and name are required');
      return;
    }

    if (!editingUser && !formData.password) {
      setError('Password is required for new users');
      return;
    }

    setSubmitting(true);
    try {
      if (editingUser) {
        // Update user
        const updatePayload = {
          name: formData.name,
          role: formData.role,
          siteIds: formData.siteIds || [],
        };
        if (formData.password) {
          updatePayload.password = formData.password;
        }

        const result = await updateAdminUser(editingUser.id, updatePayload);
        if (result.success) {
          Alert.alert('Success', 'Admin user updated');
          await loadAdmins();
          handleCloseModal();
        } else {
          setError(result.error || 'Failed to update user');
        }
      } else {
        // Create new user
        const result = await createAdminUser(
          formData.email,
          formData.name,
          formData.password,
          formData.role,
          formData.siteIds || []
        );
        if (result.success) {
          Alert.alert('Success', 'Admin user created');
          await loadAdmins();
          handleCloseModal();
        } else {
          setError(result.error || 'Failed to create user');
        }
      }
    } catch (err) {
      console.error('❌ Error saving user:', err);
      setError('An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const getSiteNames = (siteIds = []) => {
    if (!siteIds || siteIds.length === 0) return 'No sites assigned';
    return siteIds
      .map(siteId => sites.find(site => site.id === siteId)?.name)
      .filter(Boolean)
      .join(', ') || 'No matching sites';
  };

  const handleDeleteUser = (user) => {
    Alert.alert(
      'Delete Admin User?',
      `Are you sure you want to delete ${user.name}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await deleteAdminUser(user.id);
              if (result.success) {
                Alert.alert('Deleted', 'Admin user deleted');
                await loadAdmins();
              } else {
                Alert.alert('Error', result.error || 'Failed to delete');
              }
            } catch (err) {
              Alert.alert('Error', 'Failed to delete user');
            }
          },
        },
      ]
    );
  };

  const renderAdminItem = ({ item }) => (
    <View
      style={{
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
        borderLeftWidth: 4,
        borderLeftColor: item.role === 'super_admin' ? '#DC2626' : '#3B82F6',
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#1F2937' }}>
            {item.name}
          </Text>
          <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
            {item.email}
          </Text>
          <View style={{ marginTop: 8 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: item.role === 'super_admin' ? '#DC2626' : '#3B82F6',
                backgroundColor: item.role === 'super_admin' ? '#FEE2E2' : '#DBEAFE',
                paddingVertical: 4,
                paddingHorizontal: 8,
                borderRadius: 4,
                alignSelf: 'flex-start',
              }}
            >
              {item.role === 'super_admin' ? 'Super Admin' : 'Manager'}
            </Text>
            <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 6 }}>
              Sites: {getSiteNames(item.site_ids || item.siteIds || [])}
            </Text>
          </View>
        </View>
        <View style={{ gap: 8 }}>
          <TouchableOpacity
            style={{
              backgroundColor: '#3B82F6',
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 6,
            }}
            onPress={() => handleOpenModal(item)}
          >
            <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              backgroundColor: '#EF4444',
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 6,
            }}
            onPress={() => handleDeleteUser(item)}
          >
            <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={{ padding: 16, backgroundColor: '#1F2937', paddingTop: 40 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <TouchableOpacity onPress={onBack} style={{ marginBottom: 12 }}>
              <Text style={{ color: '#3B82F6', fontSize: 14, fontWeight: '600' }}>← Back</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 24, fontWeight: '700', color: 'white' }}>Admin Users</Text>
          </View>
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : (
        <>
          <FlatList
            data={admins}
            renderItem={renderAdminItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16 }}
            scrollIndicatorInsets={{ right: 1 }}
          />

          {/* Add New Button */}
          <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB' }}>
            <TouchableOpacity
              style={{
                backgroundColor: '#10B981',
                paddingVertical: 14,
                borderRadius: 8,
                alignItems: 'center',
              }}
              onPress={() => handleOpenModal()}
            >
              <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
                + Add New Admin User
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View
            style={{
              flex: 1,
              backgroundColor: 'white',
              marginTop: 80,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
            }}
          >
            <ScrollView contentContainerStyle={{ padding: 24 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#1F2937' }}>
                  {editingUser ? 'Edit Admin User' : 'Create Admin User'}
                </Text>
                <TouchableOpacity onPress={handleCloseModal}>
                  <Text style={{ fontSize: 20, color: '#9CA3AF' }}>✕</Text>
                </TouchableOpacity>
              </View>

              {error && (
                <View
                  style={{
                    backgroundColor: '#FEE2E2',
                    padding: 12,
                    borderRadius: 8,
                    marginBottom: 16,
                    borderLeftWidth: 4,
                    borderLeftColor: '#DC2626',
                  }}
                >
                  <Text style={{ color: '#991B1B', fontSize: 14 }}>{error}</Text>
                </View>
              )}

              {/* Email */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                  Email {editingUser && <Text style={{ color: '#9CA3AF' }}>(cannot edit)</Text>}
                </Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: '#D1D5DB',
                    borderRadius: 8,
                    paddingVertical: 12,
                    paddingHorizontal: 12,
                    fontSize: 14,
                    backgroundColor: editingUser ? '#F3F4F6' : '#F9FAFB',
                  }}
                  placeholder="admin@company.com"
                  value={formData.email}
                  onChangeText={(text) => setFormData({ ...formData, email: text })}
                  editable={!editingUser}
                  keyboardType="email-address"
                />
              </View>

              {/* Name */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                  Name
                </Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: '#D1D5DB',
                    borderRadius: 8,
                    paddingVertical: 12,
                    paddingHorizontal: 12,
                    fontSize: 14,
                    backgroundColor: '#F9FAFB',
                  }}
                  placeholder="Full Name"
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                />
              </View>

              {/* Password */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                  Password {editingUser && <Text style={{ color: '#9CA3AF' }}>(leave blank to keep current)</Text>}
                </Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: '#D1D5DB',
                    borderRadius: 8,
                    paddingVertical: 12,
                    paddingHorizontal: 12,
                    fontSize: 14,
                    backgroundColor: '#F9FAFB',
                  }}
                  placeholder={editingUser ? 'Leave blank to keep current' : 'Enter password'}
                  value={formData.password}
                  onChangeText={(text) => setFormData({ ...formData, password: text })}
                  secureTextEntry
                />
              </View>

              {/* Role */}
              <View style={{ marginBottom: 24 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                  Role
                </Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      borderRadius: 8,
                      backgroundColor: formData.role === 'super_admin' ? '#DC2626' : '#F3F4F6',
                      borderWidth: 2,
                      borderColor: formData.role === 'super_admin' ? '#DC2626' : '#D1D5DB',
                    }}
                    onPress={() => setFormData({ ...formData, role: 'super_admin' })}
                  >
                    <Text
                      style={{
                        color: formData.role === 'super_admin' ? 'white' : '#374151',
                        fontSize: 14,
                        fontWeight: '600',
                        textAlign: 'center',
                      }}
                    >
                      Super Admin
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      borderRadius: 8,
                      backgroundColor: formData.role === 'manager' ? '#3B82F6' : '#F3F4F6',
                      borderWidth: 2,
                      borderColor: formData.role === 'manager' ? '#3B82F6' : '#D1D5DB',
                    }}
                    onPress={() => setFormData({ ...formData, role: 'manager' })}
                  >
                    <Text
                      style={{
                        color: formData.role === 'manager' ? 'white' : '#374151',
                        fontSize: 14,
                        fontWeight: '600',
                        textAlign: 'center',
                      }}
                    >
                      Manager
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Sites */}
              <View style={{ marginBottom: 24 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                  Sites this admin can be visited at
                </Text>
                <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>
                  Contractors and visitors will only see this admin in the Visiting Person lookup at selected sites.
                </Text>
                <View style={{ gap: 8 }}>
                  {sites.map(site => {
                    const isSelected = (formData.siteIds || []).includes(site.id);
                    return (
                      <TouchableOpacity
                        key={site.id}
                        onPress={() => {
                          const nextSiteIds = isSelected
                            ? formData.siteIds.filter(id => id !== site.id)
                            : [...(formData.siteIds || []), site.id];
                          setFormData({ ...formData, siteIds: nextSiteIds });
                        }}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingVertical: 10,
                          paddingHorizontal: 12,
                          borderRadius: 8,
                          backgroundColor: isSelected ? '#E0E7FF' : '#F3F4F6',
                        }}
                      >
                        <View style={{
                          width: 18,
                          height: 18,
                          borderRadius: 3,
                          borderWidth: 2,
                          borderColor: '#3B82F6',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: isSelected ? '#3B82F6' : 'white',
                          marginRight: 10,
                        }}>
                          {isSelected && <Text style={{ color: 'white', fontWeight: '700', fontSize: 12 }}>✓</Text>}
                        </View>
                        <Text style={{ fontSize: 14, color: '#1F2937', fontWeight: isSelected ? '600' : '400' }}>{site.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Buttons */}
              <View style={{ gap: 12 }}>
                <TouchableOpacity
                  style={{
                    backgroundColor: '#3B82F6',
                    paddingVertical: 14,
                    borderRadius: 8,
                    alignItems: 'center',
                    opacity: submitting ? 0.6 : 1,
                  }}
                  onPress={handleSaveUser}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
                      {editingUser ? 'Update User' : 'Create User'}
                    </Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    backgroundColor: '#F3F4F6',
                    paddingVertical: 14,
                    borderRadius: 8,
                    alignItems: 'center',
                  }}
                  onPress={handleCloseModal}
                  disabled={submitting}
                >
                  <Text style={{ color: '#374151', fontSize: 16, fontWeight: '600' }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
