import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  Alert,
} from 'react-native';

/**
 * JseaEditorScreen - Table-based JSEA (Job Safety and Environmental Analysis) editor
 * Allows creating/editing JSEA with multiple steps in a table format
 * Each step has: Description, Hazards, Controls
 */
export default function JseaEditorScreen({ 
  initialJsea = null, 
  onSave, 
  onCancel, 
  styles,
  hideButtons = false,
  isInModal = false
}) {
  const [steps, setSteps] = useState(
    initialJsea && initialJsea.length > 0 
      ? initialJsea 
      : [{ id: 1, description: '', hazards: '', controls: '' }]
  );
  const [nextId, setNextId] = useState((initialJsea?.length || 1) + 1);

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
    onSave(steps);
  };

  // Column widths - reduced for better screen fit
  const colWidths = {
    step: 80,
    description: 140,
    hazards: 140,
    controls: 140,
    delete: 44,
  };

  const totalWidth = colWidths.step + colWidths.description + colWidths.hazards + colWidths.controls + colWidths.delete;

  return (
    <View style={[styles.container, { backgroundColor: '#F9FAFB' }]}>
      {!isInModal && (
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>JSEA - Job Safety & Environmental Analysis</Text>
        </View>
      )}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>
          Create a step-by-step analysis. Add as many steps as needed.
        </Text>

        {/* Table */}
        <View style={{ backgroundColor: 'white', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden', marginBottom: 16, flex: 1 }}>
          {/* Header Row - Horizontal Scroll */}
          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <View style={{ flexDirection: 'row', backgroundColor: '#3B82F6', borderBottomWidth: 2, borderBottomColor: '#2563EB', minWidth: totalWidth }}>
              <Text style={{ width: colWidths.step, padding: 8, fontWeight: 'bold', color: 'white', fontSize: 11, borderRightWidth: 1, borderRightColor: '#2563EB' }}>Step</Text>
              <Text style={{ width: colWidths.description, padding: 8, fontWeight: 'bold', color: 'white', fontSize: 11, borderRightWidth: 1, borderRightColor: '#2563EB' }}>Description</Text>
              <Text style={{ width: colWidths.hazards, padding: 8, fontWeight: 'bold', color: 'white', fontSize: 11, borderRightWidth: 1, borderRightColor: '#2563EB' }}>Hazards</Text>
              <Text style={{ width: colWidths.controls, padding: 8, fontWeight: 'bold', color: 'white', fontSize: 11, borderRightWidth: 1, borderRightColor: '#2563EB' }}>Controls</Text>
              <View style={{ width: colWidths.delete, padding: 8, fontWeight: 'bold', color: 'white', justifyContent: 'center', alignItems: 'center' }} />
            </View>
          </ScrollView>

          {/* Steps Container - Vertical Stack with Horizontal Scroll for Rows */}
          <ScrollView style={{ flex: 1 }} nestedScrollEnabled={true} bounces={false}>
            {steps.map((step, index) => {
              return (
                <View key={`step-${step.id}`}>
                  {/* Step Header - Gray background with Step number */}
                  <View style={{ flexDirection: 'row', backgroundColor: '#F3F4F6', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', minHeight: 36, minWidth: totalWidth }}>
                    <View style={{ width: colWidths.step, padding: 8, borderRightWidth: 1, borderRightColor: '#E5E7EB', justifyContent: 'center' }}>
                      <Text style={{ fontWeight: '600', color: '#1F2937', fontSize: 12 }}>Step {index + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }} />
                  </View>

                  {/* Step Data Row - Horizontal Scroll */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled={true}>
                    <View style={{ flexDirection: 'row', minHeight: 100, minWidth: totalWidth, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
                      {/* Step Number Column (empty in data row) */}
                      <View style={{ width: colWidths.step, borderRightWidth: 1, borderRightColor: '#E5E7EB' }} />

                      {/* Description */}
                      <View style={{ width: colWidths.description, borderRightWidth: 1, borderRightColor: '#E5E7EB', padding: 6 }}>
                        <TextInput
                          style={{
                            flex: 1,
                            fontSize: 11,
                            color: '#1F2937',
                            padding: 6,
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
                      <View style={{ width: colWidths.hazards, borderRightWidth: 1, borderRightColor: '#E5E7EB', padding: 6 }}>
                        <TextInput
                          style={{
                            flex: 1,
                            fontSize: 11,
                            color: '#1F2937',
                            padding: 6,
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
                      <View style={{ width: colWidths.controls, borderRightWidth: 1, borderRightColor: '#E5E7EB', padding: 6 }}>
                        <TextInput
                          style={{
                            flex: 1,
                            fontSize: 11,
                            color: '#1F2937',
                            padding: 6,
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
                      <View style={{ width: colWidths.delete, alignItems: 'center', justifyContent: 'center', padding: 6 }}>
                        <TouchableOpacity
                          onPress={() => handleDeleteStep(step.id)}
                          style={{ padding: 6, backgroundColor: '#FEE2E2', borderRadius: 4 }}
                        >
                          <Text style={{ color: '#DC2626', fontWeight: '700', fontSize: 12 }}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </ScrollView>
                </View>
              );
            })}
          </ScrollView>
        </View>

        {/* Add Step Button */}
        <TouchableOpacity
          onPress={handleAddStep}
          style={{ backgroundColor: '#E0E7FF', padding: 12, borderRadius: 8, marginBottom: 16, alignItems: 'center' }}
        >
          <Text style={{ color: '#3B82F6', fontSize: 14, fontWeight: '600' }}>+ Add Another Step</Text>
        </TouchableOpacity>

        {/* Save/Cancel Buttons - Only show if not hideButtons */}
        {!hideButtons && (
          <View style={{ gap: 8, marginBottom: 20 }}>
            <TouchableOpacity
              onPress={handleSave}
              style={{ backgroundColor: '#10B981', padding: 14, borderRadius: 8, alignItems: 'center' }}
            >
              <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>Save JSEA</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onCancel}
              style={{ backgroundColor: '#E5E7EB', padding: 14, borderRadius: 8, alignItems: 'center' }}
            >
              <Text style={{ color: '#374151', fontSize: 16, fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
