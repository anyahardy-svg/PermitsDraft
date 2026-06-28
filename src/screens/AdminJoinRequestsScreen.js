import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Modal,
  FlatList,
  TextInput,
  ActivityIndicator
} from 'react-native';
import { supabase } from '../supabaseClient';
import { getAllPendingJoinRequests, approveJoinRequest, rejectJoinRequest } from '../api/joinRequests';
import { listCompanies, searchCompanies } from '../api/companies';

export default function AdminJoinRequestsScreen({
  onNavigateBack,
  adminUser,
  styles
}) {
  const [joinRequests, setJoinRequests] = useState([]);
  const [loadingJoinRequests, setLoadingJoinRequests] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);

  // Modal states for approval
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);
  const [companySearchText, setCompanySearchText] = useState('');
  const [companySearchResults, setCompanySearchResults] = useState([]);
  const [isSearchingCompanies, setIsSearchingCompanies] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  // Modal states for rejection
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  // Load join requests
  const loadJoinRequests = async () => {
    setLoadingJoinRequests(true);
    try {
      const response = await getAllPendingJoinRequests();
      if (response.success) {
        setJoinRequests(response.data || []);
      } else {
        Alert.alert('Error', response.error || 'Failed to load join requests');
        setJoinRequests([]);
      }
    } catch (error) {
      console.error('Error loading join requests:', error);
      Alert.alert('Error', 'Failed to load join requests');
      setJoinRequests([]);
    } finally {
      setLoadingJoinRequests(false);
    }
  };

  // Load companies
  const loadCompanies = async () => {
    setLoadingCompanies(true);
    try {
      const companiesData = await listCompanies();
      setCompanies(companiesData || []);
    } catch (error) {
      console.error('Error loading companies:', error);
      setCompanies([]);
    } finally {
      setLoadingCompanies(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    loadJoinRequests();
    loadCompanies();
  }, []);

  // Handle approval
  const handleApprove = async () => {
    if (!selectedCompanyId) {
      Alert.alert('Error', 'Please select a company');
      return;
    }

    setIsApproving(true);
    try {
      console.log('🔍 Approving request:', { 
        requestId: selectedRequest.id, 
        adminId: adminUser.id, 
        companyId: selectedCompanyId 
      });
      
      const result = await approveJoinRequest(selectedRequest.id, adminUser.id, selectedCompanyId);
      
      console.log('📋 Approval result:', result);
      
      if (result.success) {
        Alert.alert('Success', 'Request approved! ✅\n\nThe request has been marked as approved and the contractor has been notified.');
        setShowApprovalModal(false);
        setSelectedRequest(null);
        setSelectedCompanyId(null);
        setCompanySearchText('');
        
        // Reload after a short delay to ensure DB is updated
        setTimeout(() => {
          loadJoinRequests();
        }, 500);
      } else {
        console.error('❌ Approval failed:', result);
        Alert.alert('Error', result.error || 'Failed to approve request');
      }
    } catch (error) {
      console.error('❌ Error approving request:', error);
      Alert.alert('Error', error.message || 'Failed to approve request');
    } finally {
      setIsApproving(false);
    }
  };

  // Handle rejection
  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      Alert.alert('Error', 'Please enter a rejection reason');
      return;
    }

    setIsRejecting(true);
    try {
      console.log('🔍 Rejecting request:', { 
        requestId: selectedRequest.id, 
        adminId: adminUser.id, 
        reason: rejectionReason 
      });
      
      const result = await rejectJoinRequest(selectedRequest.id, adminUser.id, rejectionReason);
      
      console.log('📋 Rejection result:', result);
      
      if (result.success) {
        Alert.alert('Success', 'Request rejected! ✗\n\nThe contractor has been notified of the rejection.');
        setShowRejectionModal(false);
        setSelectedRequest(null);
        setRejectionReason('');
        
        // Reload after a short delay to ensure DB is updated
        setTimeout(() => {
          loadJoinRequests();
        }, 500);
      } else {
        console.error('❌ Rejection failed:', result);
        Alert.alert('Error', result.error || 'Failed to reject request');
      }
    } catch (error) {
      console.error('❌ Error rejecting request:', error);
      Alert.alert('Error', error.message || 'Failed to reject request');
    } finally {
      setIsRejecting(false);
    }
  };

  // Search companies for approval modal (server-side to support full dataset)
  useEffect(() => {
    let cancelled = false;

    const runSearch = async () => {
      if (!companySearchText.trim()) {
        setCompanySearchResults(companies.slice(0, 50));
        return;
      }

      setIsSearchingCompanies(true);
      try {
        const results = await searchCompanies(companySearchText, { limit: 50 });
        if (!cancelled) {
          setCompanySearchResults(results);
        }
      } catch (error) {
        if (!cancelled) {
          setCompanySearchResults(
            companies
              .filter((company) => company.name.toLowerCase().includes(companySearchText.toLowerCase()))
              .slice(0, 50)
          );
        }
      } finally {
        if (!cancelled) {
          setIsSearchingCompanies(false);
        }
      }
    };

    runSearch();
    return () => {
      cancelled = true;
    };
  }, [companySearchText, companies]);

  const filteredCompanies = companySearchResults;

  if (loadingJoinRequests) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={{ marginTop: 12, color: '#6B7280' }}>Loading requests...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: '#F9FAFB' }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: 40 }]}>
        <TouchableOpacity onPress={onNavigateBack}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Join Requests</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Content */}
      <ScrollView style={{ flex: 1 }}>
        <View style={{ padding: 16 }}>
          {/* Pending Requests Count */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#1F2937' }}>
              Pending Requests ({joinRequests.length})
            </Text>
          </View>

          {/* No Requests Message */}
          {joinRequests.length === 0 && (
            <View style={{
              backgroundColor: '#F0FDF4',
              borderRadius: 8,
              padding: 16,
              borderLeftWidth: 4,
              borderLeftColor: '#10B981'
            }}>
              <Text style={{ color: '#166534', fontSize: 14 }}>
                ✅ No pending requests
              </Text>
            </View>
          )}

          {/* Request Cards */}
          {joinRequests.map(request => (
            <View
              key={request.id}
              style={{
                backgroundColor: 'white',
                borderRadius: 8,
                padding: 16,
                marginBottom: 12,
                borderLeftWidth: 4,
                borderLeftColor: '#F59E0B',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 2
              }}
            >
              {/* Request Info */}
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#1F2937' }}>
                  {request.name}
                </Text>
                <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
                  {request.email}
                </Text>
                {request.phone && (
                  <Text style={{ fontSize: 13, color: '#6B7280' }}>
                    {request.phone}
                  </Text>
                )}
              </View>

              {/* User Type Badge */}
              <View style={{ marginBottom: 12 }}>
                <View style={{
                  backgroundColor: request.will_work_on_site ? '#DBEAFE' : '#FEE2E2',
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 4,
                  alignSelf: 'flex-start'
                }}>
                  <Text style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: request.will_work_on_site ? '#0369A1' : '#991B1B'
                  }}>
                    {request.will_work_on_site ? '👷 Contractor' : '👔 Admin Staff'}
                  </Text>
                </View>
              </View>

              {/* Requested Company */}
              {request.company_name && (
                <View style={{ marginBottom: 12, backgroundColor: '#F9FAFB', padding: 8, borderRadius: 6 }}>
                  <Text style={{ fontSize: 12, color: '#6B7280' }}>
                    Requested Company: <Text style={{ fontWeight: '600' }}>{request.company_name}</Text>
                  </Text>
                </View>
              )}

              {/* Submitted Date */}
              <View style={{ marginBottom: 12, backgroundColor: '#F9FAFB', padding: 8, borderRadius: 6 }}>
                <Text style={{ fontSize: 12, color: '#374151' }}>
                  Submitted: {new Date(request.requested_at).toLocaleDateString('en-NZ', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedRequest(request);
                    setSelectedCompanyId(null);
                    setShowApprovalModal(true);
                  }}
                  style={{
                    flex: 1,
                    backgroundColor: '#DBEAFE',
                    paddingVertical: 10,
                    borderRadius: 6,
                    alignItems: 'center'
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#0369A1' }}>
                    Approve
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedRequest(request);
                    setRejectionReason('');
                    setShowRejectionModal(true);
                  }}
                  style={{
                    flex: 1,
                    backgroundColor: '#FEE2E2',
                    paddingVertical: 10,
                    borderRadius: 6,
                    alignItems: 'center'
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#991B1B' }}>
                    Reject
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Approval Modal */}
      <Modal visible={showApprovalModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{
            backgroundColor: 'white',
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
            padding: 20,
            maxHeight: '80%'
          }}>
            <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 16, color: '#1F2937' }}>
              Approve Join Request
            </Text>

            {selectedRequest && (
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                  {selectedRequest.name}
                </Text>
                <Text style={{ fontSize: 13, color: '#6B7280' }}>
                  {selectedRequest.email}
                </Text>
              </View>
            )}

            <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
              Select Company:
            </Text>

            {/* Company Search */}
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: '#D1D5DB',
                borderRadius: 6,
                padding: 10,
                marginBottom: 12,
                fontSize: 14
              }}
              placeholder="Search companies..."
              value={companySearchText}
              onChangeText={setCompanySearchText}
            />

            {/* Company List */}
            <ScrollView style={{ maxHeight: 250, marginBottom: 16 }}>
              {loadingCompanies || isSearchingCompanies ? (
                <ActivityIndicator color="#3B82F6" />
              ) : (
                filteredCompanies.map(company => (
                  <TouchableOpacity
                    key={company.id}
                    onPress={() => setSelectedCompanyId(company.id)}
                    style={{
                      padding: 12,
                      borderRadius: 6,
                      marginBottom: 8,
                      backgroundColor: selectedCompanyId === company.id ? '#DBEAFE' : '#F9FAFB',
                      borderWidth: 1,
                      borderColor: selectedCompanyId === company.id ? '#0369A1' : '#E5E7EB'
                    }}
                  >
                    <Text style={{
                      fontSize: 14,
                      color: selectedCompanyId === company.id ? '#0369A1' : '#374151',
                      fontWeight: selectedCompanyId === company.id ? '600' : '400'
                    }}>
                      {company.name}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            {/* Action Buttons */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={() => {
                  setShowApprovalModal(false);
                  setSelectedRequest(null);
                  setSelectedCompanyId(null);
                }}
                style={{
                  flex: 1,
                  backgroundColor: '#E5E7EB',
                  paddingVertical: 12,
                  borderRadius: 6,
                  alignItems: 'center'
                }}
                disabled={isApproving}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151' }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleApprove}
                style={{
                  flex: 1,
                  backgroundColor: '#10B981',
                  paddingVertical: 12,
                  borderRadius: 6,
                  alignItems: 'center'
                }}
                disabled={isApproving}
              >
                {isApproving ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={{ fontSize: 14, fontWeight: '600', color: 'white' }}>
                    Approve
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Rejection Modal */}
      <Modal visible={showRejectionModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{
            backgroundColor: 'white',
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
            padding: 20,
            maxHeight: '80%'
          }}>
            <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 16, color: '#1F2937' }}>
              Reject Join Request
            </Text>

            {selectedRequest && (
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                  {selectedRequest.name}
                </Text>
                <Text style={{ fontSize: 13, color: '#6B7280' }}>
                  {selectedRequest.email}
                </Text>
              </View>
            )}

            <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
              Rejection Reason:
            </Text>

            <TextInput
              style={{
                borderWidth: 1,
                borderColor: '#D1D5DB',
                borderRadius: 6,
                padding: 12,
                marginBottom: 16,
                fontSize: 14,
                minHeight: 100,
                textAlignVertical: 'top'
              }}
              placeholder="Enter reason for rejection..."
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
            />

            {/* Action Buttons */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={() => {
                  setShowRejectionModal(false);
                  setSelectedRequest(null);
                  setRejectionReason('');
                }}
                style={{
                  flex: 1,
                  backgroundColor: '#E5E7EB',
                  paddingVertical: 12,
                  borderRadius: 6,
                  alignItems: 'center'
                }}
                disabled={isRejecting}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151' }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleReject}
                style={{
                  flex: 1,
                  backgroundColor: '#EF4444',
                  paddingVertical: 12,
                  borderRadius: 6,
                  alignItems: 'center'
                }}
                disabled={isRejecting}
              >
                {isRejecting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={{ fontSize: 14, fontWeight: '600', color: 'white' }}>
                    Reject
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
