import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  Alert,
  Dimensions,
} from 'react-native';

/**
 * JseaEditorScreen - Table-based JSEA (Job Safety and Environmental Analysis) editor
 * Allows creating/editing JSEA with multiple steps in a table format
 * Each step has: Description, Hazards, Controls
 * 
 * Can be used with or without buttons (hideButtons prop)
 * If buttons are hidden, use ref to get steps: editorRef.current.getSteps()
 */
const JseaEditorScreen = forwardRef(({ 
  initialJsea = null, 
  onSave, 
  onCancel, 
  styles,
  hideButtons = false,
  isInModal = false
}, ref) => {
  const [steps, setSteps] = useState(
    initialJsea && initialJsea.length > 0 
      ? initialJsea 
      : [{ id: 1, description: '', hazards: '', controls: '' }]
  );
  const [nextId, setNextId] = useState((initialJsea?.length || 1) + 1);
  
  // CRITICAL FIX: Watch for changes to initialJsea prop and update local state
  useEffect(() => {
    console.log('🔄 JseaEditorScreen.useEffect - initialJsea changed');
    console.log('   initialJsea:', initialJsea);
    console.log('   initialJsea?.length:', initialJsea?.length);
    if (initialJsea && initialJsea.length > 0) {
      console.log('   Updating steps state to:', initialJsea);
      setSteps(initialJsea);
      setNextId((initialJsea?.length || 1) + 1);
      console.log('   Steps updated! nextId set to:', (initialJsea?.length || 1) + 1);
    } else {
      console.log('   initialJsea is empty, keeping current steps');
    }
  }, [initialJsea]);
  
  // EXPOSE getSteps method so parent can access current steps when buttons are hidden
  useImperativeHandle(ref, () => ({
    getSteps: () => {
      console.log('📤 getSteps() called from parent, returning:', steps);
      return steps;
    }
  }), [steps]);
  
  // Responsive design - switch to cards on mobile
  const windowWidth = Dimensions.get('window').width;
  const isMobile = windowWidth < 768;

  const handleAddStep = () => {
    console.log('Add step clicked. Current steps:', steps.length);
    const newStep = { id: nextId, description: '', hazards: '', controls: '' };
    setSteps([...steps, newStep]);
    setNextId(nextId + 1);
    console.log('Step added. New total:', steps.length + 1);
  };

  const handleDeleteStep = (id) => {
    if (steps.length <= 1) {
      Alert.alert('Error', 'You must have at least one step');
      return;
    }
    setSteps(steps.filter(step => step.id !== id));
  };

  const handleUpdateStep = (id, field, value) => {
    setSteps(steps.map(step =>
      step.id === id ? { ...step, [field]: value } : step
    ));
  };

  const handleSave = () => {
    // Validate that all steps have at least a description
    if (steps.some(step => !step.description.trim())) {
      Alert.alert('Error', 'All steps must have a description');
      return;
    }
    // Auto-save before closing
    onSave(steps);
  };

  return (
    <View style={[styles.container, { backgroundColor: '#F9FAFB' }]}>
      {!isInModal && (
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel}>
            <Text style={styles.backButton}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>JSEA - Job Safety & Environmental Analysis</Text>
        </View>
      )}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        <Text style={{ fontSize: 15, color: '#6B7280', marginBottom: 16 }}>
          Create a step-by-step analysis. Add as many steps as needed.
        </Text>

        {isMobile ? (
          // MOBILE CARD LAYOUT
          <View style={{ marginBottom: 16 }}>
            {steps.map((step, index) => (
              <View key={`step-${step.id}`} style={{ backgroundColor: 'white', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', padding: 16, marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={{ fontWeight: '700', color: '#1F2937', fontSize: 14 }}>Step {index + 1}</Text>
                  <TouchableOpacity
                    onPress={() => handleDeleteStep(step.id)}
                    style={{ padding: 8, backgroundColor: '#FEE2E2', borderRadius: 4 }}
                  >
                    <Text style={{ color: '#DC2626', fontWeight: '700', fontSize: 14 }}>✕</Text>
                  </TouchableOpacity>
                </View>

                {/* Description */}
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#6B7280', marginBottom: 6 }}>Description</Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: '#D1D5DB',
                    borderRadius: 6,
                    padding: 12,
                    marginBottom: 12,
                    fontSize: 15,
                    color: '#1F2937',
                    minHeight: 80,
                    textAlignVertical: 'top',
                  }}
                  placeholder="E.g., Drive to site"
                  placeholderTextColor="#9CA3AF"
                  value={step.description}
                  onChangeText={(value) => handleUpdateStep(step.id, 'description', value)}
                  multiline
                />

                {/* Hazards */}
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#6B7280', marginBottom: 6 }}>Hazards</Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: '#D1D5DB',
                    borderRadius: 6,
                    padding: 12,
                    marginBottom: 12,
                    fontSize: 15,
                    color: '#1F2937',
                    minHeight: 80,
                    textAlignVertical: 'top',
                  }}
                  placeholder="E.g., Collisions, Fatigue"
                  placeholderTextColor="#9CA3AF"
                  value={step.hazards}
                  onChangeText={(value) => handleUpdateStep(step.id, 'hazards', value)}
                  multiline
                />

                {/* Controls */}
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#6B7280', marginBottom: 6 }}>Controls</Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: '#D1D5DB',
                    borderRadius: 6,
                    padding: 12,
                    fontSize: 15,
                    color: '#1F2937',
                    minHeight: 80,
                    textAlignVertical: 'top',
                  }}
                  placeholder="E.g., RT, Flags, Beacons"
                  placeholderTextColor="#9CA3AF"
                  value={step.controls}
                  onChangeText={(value) => handleUpdateStep(step.id, 'controls', value)}
                  multiline
                />
              </View>
            ))}
          </View>
        ) : (
          // DESKTOP TABLE LAYOUT
          <View style={{ backgroundColor: 'white', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden', marginBottom: 16 }}>
            {/* Header Row */}
            <View style={{ flexDirection: 'row', backgroundColor: '#3B82F6', borderBottomWidth: 2, borderBottomColor: '#2563EB', paddingVertical: 12, paddingHorizontal: 16 }}>
              <Text style={{ flex: 0.8, fontWeight: 'bold', color: 'white', fontSize: 14 }}>Step</Text>
              <Text style={{ flex: 2, fontWeight: 'bold', color: 'white', fontSize: 14 }}>Description</Text>
              <Text style={{ flex: 2, fontWeight: 'bold', color: 'white', fontSize: 14 }}>Hazards</Text>
              <Text style={{ flex: 2, fontWeight: 'bold', color: 'white', fontSize: 14 }}>Controls</Text>
              <View style={{ width: 50, alignItems: 'center' }} />
            </View>

            {/* Steps Container - No nested ScrollView, let outer scroll handle everything */}
            {steps.map((step, index) => (
              <View key={`step-${step.id}`}>
                {/* Step Header Row */}
                <View style={{ flexDirection: 'row', backgroundColor: '#F3F4F6', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center', minHeight: 40 }}>
                  <Text style={{ flex: 0.8, fontWeight: '600', color: '#1F2937', fontSize: 15 }}>Step {index + 1}</Text>
                  <View style={{ flex: 6.8 }} />
                </View>

                {/* Step Data Row */}
                <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', minHeight: 100, paddingVertical: 8, paddingHorizontal: 16, alignItems: 'flex-start', gap: 8 }}>
                  <View style={{ flex: 0.8 }} />

                  {/* Description */}
                  <View style={{ flex: 2 }}>
                    <TextInput
                      style={{
                        flex: 1,
                        fontSize: 14,
                        color: '#1F2937',
                        padding: 8,
                        borderWidth: 1,
                        borderColor: '#D1D5DB',
                        borderRadius: 4,
                        textAlignVertical: 'top',
                      }}
                      placeholder="E.g., Drive to site"
                      placeholderTextColor="#9CA3AF"
                      value={step.description}
                      onChangeText={(value) => handleUpdateStep(step.id, 'description', value)}
                      multiline
                    />
                  </View>

                  {/* Hazards */}
                  <View style={{ flex: 2 }}>
                    <TextInput
                      style={{
                        flex: 1,
                        fontSize: 14,
                        color: '#1F2937',
                        padding: 8,
                        borderWidth: 1,
                        borderColor: '#D1D5DB',
                        borderRadius: 4,
                        textAlignVertical: 'top',
                      }}
                      placeholder="E.g., Collisions, Fatigue"
                      placeholderTextColor="#9CA3AF"
                      value={step.hazards}
                      onChangeText={(value) => handleUpdateStep(step.id, 'hazards', value)}
                      multiline
                    />
                  </View>

                  {/* Controls */}
                  <View style={{ flex: 2 }}>
                    <TextInput
                      style={{
                        flex: 1,
                        fontSize: 14,
                        color: '#1F2937',
                        padding: 8,
                        borderWidth: 1,
                        borderColor: '#D1D5DB',
                        borderRadius: 4,
                        textAlignVertical: 'top',
                      }}
                      placeholder="E.g., RT, Flags, Beacons"
                      placeholderTextColor="#9CA3AF"
                      value={step.controls}
                      onChangeText={(value) => handleUpdateStep(step.id, 'controls', value)}
                      multiline
                    />
                  </View>

                  {/* Delete Button */}
                  <View style={{ width: 50, alignItems: 'center', justifyContent: 'center' }}>
                    <TouchableOpacity
                      onPress={() => handleDeleteStep(step.id)}
                      style={{ padding: 8, backgroundColor: '#FEE2E2', borderRadius: 4 }}
                    >
                      <Text style={{ color: '#DC2626', fontWeight: '700', fontSize: 12 }}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Add Step Button */}
        <TouchableOpacity
          onPress={handleAddStep}
          style={{ backgroundColor: '#E0E7FF', padding: 12, borderRadius: 8, marginBottom: 16, alignItems: 'center' }}
        >
          <Text style={{ color: '#3B82F6', fontSize: 14, fontWeight: '600' }}>+ Add Another Step</Text>
        </TouchableOpacity>

        {/* Close Button - Auto-saves on close */}
        {!hideButtons && (
          <View style={{ gap: 8, marginBottom: 20 }}>
            <TouchableOpacity
              onPress={handleSave}
              style={{ backgroundColor: '#3B82F6', padding: 14, borderRadius: 8, alignItems: 'center' }}
            >
              <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>Done Editing</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
});

JseaEditorScreen.displayName = 'JseaEditorScreen';

export default JseaEditorScreen;
