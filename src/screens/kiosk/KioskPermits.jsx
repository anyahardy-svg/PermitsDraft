import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useNavigate } from 'react-router-dom';
import { KioskContext } from '../KioskScreen';
import { listPermits } from '../../api/permits';

const KioskPermits = () => {
  const navigate = useNavigate();
  const { siteId, site, styles } = useContext(KioskContext);
  
  const [permits, setPermits] = useState([]);
  const [permitsLoading, setPermitsLoading] = useState(true);

  useEffect(() => {
    loadPermits();
  }, [siteId]);

  const loadPermits = async () => {
    if (!siteId) return;
    setPermitsLoading(true);
    try {
      const data = await listPermits();
      // Filter permits for this site
      const sitePermits = data.filter(p => p.site_id === siteId);
      setPermits(sitePermits);
    } catch (error) {
      console.error('Failed to load permits:', error);
    } finally {
      setPermitsLoading(false);
    }
  };

  if (permitsLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading Permits...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigate('/')}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Permits - {site?.name}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.formContent}>
        <View style={{ 
          flexDirection: 'row', 
          flexWrap: 'wrap', 
          gap: 12, 
          marginBottom: 20
        }}>
          <TouchableOpacity style={{
            flex: 1,
            minWidth: '45%',
            backgroundColor: 'white',
            borderRadius: 8,
            padding: 16,
            borderLeftWidth: 4,
            borderLeftColor: '#9CA3AF'
          }}>
            <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#1F2937' }}>
              {permits.filter(p => p.status === 'draft').length}
            </Text>
            <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>Drafts</Text>
          </TouchableOpacity>

          <TouchableOpacity style={{
            flex: 1,
            minWidth: '45%',
            backgroundColor: 'white',
            borderRadius: 8,
            padding: 16,
            borderLeftWidth: 4,
            borderLeftColor: '#F59E0B'
          }}>
            <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#1F2937' }}>
              {permits.filter(p => p.status === 'pending_approval').length}
            </Text>
            <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>Pending</Text>
          </TouchableOpacity>

          <TouchableOpacity style={{
            flex: 1,
            minWidth: '45%',
            backgroundColor: 'white',
            borderRadius: 8,
            padding: 16,
            borderLeftWidth: 4,
            borderLeftColor: '#06B6D4'
          }}>
            <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#1F2937' }}>
              {permits.filter(p => p.status === 'active').length}
            </Text>
            <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>Active</Text>
          </TouchableOpacity>

          <TouchableOpacity style={{
            flex: 1,
            minWidth: '45%',
            backgroundColor: 'white',
            borderRadius: 8,
            padding: 16,
            borderLeftWidth: 4,
            borderLeftColor: '#EC4899'
          }}>
            <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#1F2937' }}>
              {permits.filter(p => p.status === 'completed').length}
            </Text>
            <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>Completed</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={{
          backgroundColor: '#2563EB',
          padding: 16,
          borderRadius: 8,
          marginBottom: 12,
          alignItems: 'center'
        }}>
          <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>Create New Permit</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export default KioskPermits;
