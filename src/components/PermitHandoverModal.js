import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert
} from 'react-native';
import { supabase } from '../supabaseClient';
import { handoverPermit, getPermitHandoverHistory } from '../api/permitHandovers';

export default function PermitHandoverModal({
  visible,
  onClose,
  permit,
  currentReceiverId,
  currentReceiverName,
  availableReceivers = [],
  onHandoverComplete,
  styles,
  migrationRequired
}) {
  const [selectedReceiverId, setSelectedReceiverId] = useState(null);
  const [selectedReceiverName, setSelectedReceiverName] = useState(null);
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showReceiverDropdown, setShowReceiverDropdown] = useState(false);
  const [handoverHistory, setHandoverHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  // Load handover history when modal opens
  useEffect(() => {
    if (visible && permit?.id) {
      console.log('🎯 Modal opened for permit:', permit.id);
      console.log('   Current receiver name:', currentReceiverName);
      console.log('   Available receivers:', availableReceivers?.length || 0);
      loadHandoverHistory();
    }
  }, [visible, permit?.id]);

  const loadHandoverHistory = async () => {
    try {
      console.log('📜 Loading handover history for permit:', permit.id);
      const { data, error } = await supabase
        .from('permit_handovers')
        .select('*')
        .eq('permit_id', permit.id)
        .order('handover_timestamp', { ascending: false });
      
      if (error) throw error;
      setHandoverHistory(data || []);
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const handleHandover = async () => {
    if (!selectedReceiverId) {
      Alert.alert('Error', 'Please select a receiver');
      return;
    }

    if (!reason.trim()) {
      Alert.alert('Error', 'Please provide a reason for the handover');
      return;
    }

    setIsLoading(true);
    try {
      console.log(`🔄 Handing over permit ${permit.id} from "${currentReceiverName}" to "${selectedReceiverName}"`);
      
      const result = await handoverPermit(
        permit.id,
        currentReceiverName,  // Current receiver name (from permit)
        selectedReceiverName,  // Selected receiver name
        reason
      );

      if (result.success) {
        Alert.alert('Success', `Permit handed over to ${selectedReceiverName}`);
        onHandoverComplete?.(result.handover);
        handleClose();
      } else {
        Alert.alert('Error', result.error || 'Failed to hand over permit');
      }
    } catch (error) {
      console.error('Error during handover:', error);
      Alert.alert('Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedReceiverId(null);
    setSelectedReceiverName(null);
    setReason('');
    setShowReceiverDropdown(false);
    setShowHistory(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={handleClose}
      transparent={true}
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={{
          backgroundColor: 'white',
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          padding: 20,
          maxHeight: '90%',
          ...styles?.modalContent
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1F2937' }}>
              Hand Over Permit
            </Text>
            <TouchableOpacity onPress={handleClose}>
              <Text style={{ fontSize: 24, color: '#6B7280' }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Permit Info */}
            <View style={{ backgroundColor: '#F3F4F6', padding: 12, borderRadius: 8, marginBottom: 16 }}>
              <Text style={{ fontSize: 12, color: '#6B7280' }}>Current Permit</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#1F2937', marginTop: 4 }}>
                {permit?.description || 'Untitled'}
              </Text>
              <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
                Type: {permit?.permit_type?.replace(/([A-Z])/g, ' $1').trim() || 'General'}
              </Text>
            </View>

            {/* Current Receiver Info */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#1F2937', marginBottom: 8 }}>
                Current Receiver
              </Text>
              <View style={{ 
                backgroundColor: '#E0E7FF', 
                padding: 12, 
                borderRadius: 8,
                borderLeftWidth: 4,
                borderLeftColor: '#3B82F6'
              }}>
                <Text style={{ fontSize: 13, color: '#1E40AF', fontWeight: '500' }}>
                  {currentReceiverName}
                </Text>
              </View>
            </View>

            {/* New Receiver Selection */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#1F2937', marginBottom: 8 }}>
                Hand Over To
              </Text>
              
              <TouchableOpacity
                onPress={() => setShowReceiverDropdown(!showReceiverDropdown)}
                style={{
                  borderWidth: 1,
                  borderColor: '#D1D5DB',
                  padding: 12,
                  borderRadius: 8,
                  backgroundColor: selectedReceiverId ? '#F0FDF4' : 'white',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <Text style={{
                  fontSize: 13,
                  color: selectedReceiverId ? '#1F2937' : '#9CA3AF'
                }}>
                  {selectedReceiverName || 'Select receiver...'}
                </Text>
                <Text style={{ fontSize: 16, color: '#6B7280' }}>
                  {showReceiverDropdown ? '▲' : '▼'}
                </Text>
              </TouchableOpacity>

              {showReceiverDropdown && (
                <View style={{
                  borderWidth: 1,
                  borderColor: '#D1D5DB',
                  borderTopWidth: 0,
                  borderBottomLeftRadius: 8,
                  borderBottomRightRadius: 8,
                  backgroundColor: 'white',
                  maxHeight: 200,
                  marginTop: -1
                }}>
                  <ScrollView nestedScrollEnabled>
                    {availableReceivers && availableReceivers.length > 0 ? (
                      availableReceivers
                        .filter(r => r.name !== currentReceiverName) // Don't show current receiver
                        .map(receiver => (
                          <TouchableOpacity
                            key={receiver.id}
                            onPress={() => {
                              setSelectedReceiverId(receiver.id);
                              setSelectedReceiverName(receiver.name || 'Unknown');
                              setShowReceiverDropdown(false);
                            }}
                            style={{
                              padding: 12,
                              borderBottomWidth: 1,
                              borderBottomColor: '#E5E7EB',
                              backgroundColor: selectedReceiverName === receiver.name ? '#F0FDF4' : 'white'
                            }}
                          >
                            <Text style={{
                              fontSize: 13,
                              color: selectedReceiverName === receiver.name ? '#059669' : '#1F2937',
                              fontWeight: selectedReceiverName === receiver.name ? '600' : '400'
                            }}>
                              {receiver.name || 'Unknown'}
                            </Text>
                            {receiver.company_name && (
                              <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                                {receiver.company_name}
                              </Text>
                            )}
                          </TouchableOpacity>
                        ))
                    ) : (
                      <View style={{ padding: 12, alignItems: 'center' }}>
                        <Text style={{ color: '#9CA3AF', fontSize: 12 }}>
                          No available receivers
                        </Text>
                      </View>
                    )}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Reason for Handover */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#1F2937', marginBottom: 8 }}>
                Reason for Handover
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: '#D1D5DB',
                  padding: 12,
                  borderRadius: 8,
                  backgroundColor: 'white',
                  fontSize: 13,
                  color: '#1F2937',
                  minHeight: 80,
                  textAlignVertical: 'top'
                }}
                placeholder="e.g., Contractor called to another job, Medical emergency, etc."
                placeholderTextColor="#9CA3AF"
                value={reason}
                onChangeText={setReason}
                multiline
              />
            </View>

            {/* Handover History Button */}
            {handoverHistory.length > 0 && (
              <TouchableOpacity
                onPress={() => setShowHistory(!showHistory)}
                style={{ marginBottom: 16 }}
              >
                <Text style={{ fontSize: 12, color: '#3B82F6', fontWeight: '600', textDecorationLine: 'underline' }}>
                  📜 View Handover History ({handoverHistory.length})
                </Text>
              </TouchableOpacity>
            )}

            {/* Handover History Display */}
            {showHistory && handoverHistory.length > 0 && (
              <View style={{ 
                backgroundColor: '#F9FAFB', 
                padding: 12, 
                borderRadius: 8, 
                marginBottom: 16,
                borderLeftWidth: 3,
                borderLeftColor: '#9CA3AF'
              }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#1F2937', marginBottom: 8 }}>
                  Handover History
                </Text>
                {handoverHistory.map((handover, index) => (
                  <View key={handover.id} style={{ marginBottom: index < handoverHistory.length - 1 ? 12 : 0 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 11, fontWeight: '500', color: '#374151' }}>
                        Handover #{index + 1}
                      </Text>
                      {handover.acknowledged_at && (
                        <Text style={{ fontSize: 10, color: '#10B981', fontWeight: '600' }}>
                          ✓ Acknowledged
                        </Text>
                      )}
                    </View>
                    {handover.reason && (
                      <Text style={{ fontSize: 10, color: '#6B7280', marginTop: 4 }}>
                        Reason: {handover.reason}
                      </Text>
                    )}
                    <Text style={{ fontSize: 9, color: '#9CA3AF', marginTop: 4 }}>
                      {new Date(handover.handover_timestamp).toLocaleString()}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          {/* Action Buttons */}
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
            <TouchableOpacity
              onPress={handleClose}
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#D1D5DB',
                alignItems: 'center',
                backgroundColor: '#F3F4F6'
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151' }}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleHandover}
              disabled={isLoading || !selectedReceiverId || !reason.trim()}
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 8,
                alignItems: 'center',
                backgroundColor: isLoading || !selectedReceiverId || !reason.trim() ? '#9CA3AF' : '#3B82F6'
              }}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={{ fontSize: 13, fontWeight: '600', color: 'white' }}>
                  Hand Over
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
