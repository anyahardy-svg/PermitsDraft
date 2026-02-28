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
    setSteps([
      ...steps,
      { id: nextId, description: '', hazards: '', controls: '' }
    ]);
    setNextId(nextId + 1);
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

  // Column widths
  const colWidths = {
    step: 120,
    description: 200,
    hazards: 200,
    controls: 250,
    delete: 50,
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
        <View style={{ backgroundColor: 'white', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden', marginBottom: 16 }}>
          <ScrollView horizontal contentContainerStyle={{ minWidth: totalWidth }}>
            {/* Header Row */}
            <View style={{ flexDirection: 'row', backgroundColor: '#3B82F6', borderBottomWidth: 2, borderBottomColor: '#2563EB' }}>
              <Text style={{ width: colWidths.step, padding: 12, fontWeight: 'bold', color: 'white', fontSize: 12, borderRightWidth: 1, borderRightColor: '#2563EB' }}>Step</Text>
              <Text style={{ width: colWidths.description, padding: 12, fontWeight: 'bold', color: 'white', fontSize: 12, borderRightWidth: 1, borderRightColor: '#2563EB' }}>Description</Text>
              <Text style={{ width: colWidths.hazards, padding: 12, fontWeight: 'bold', color: 'white', fontSize: 12, borderRightWidth: 1, borderRightColor: '#2563EB' }}>Hazards</Text>
              <Text style={{ width: colWidths.controls, padding: 12, fontWeight: 'bold', color: 'white', fontSize: 12, borderRightWidth: 1, borderRightColor: '#2563EB' }}>Controls</Text>
              <View style={{ width: colWidths.delete, padding: 12, fontWeight: 'bold', color: 'white', justifyContent: 'center', alignItems: 'center' }} />
            </View>

            {/* Data Rows */}
            {steps.map((step, index) => {
              // Calculate row height based on content
              const descriptionLines = Math.max(1, (step.description.match(/\n/g) || []).length + 1);
              const hazardsLines = Math.max(1, (step.hazards.match(/\n/g) || []).length + 1);
              const controlsLines = Math.max(1, (step.controls.match(/\n/g) || []).length + 1);
              const maxLines = Math.max(descriptionLines, hazardsLines, controlsLines);
              const rowHeight = Math.max(60, 40 + maxLines * 18);

              return (
                <View key={step.id} style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', minHeight: rowHeight }}>
                  {/* Step Number */}
                  <View style={{ width: colWidths.step, padding: 12, borderRightWidth: 1, borderRightColor: '#E5E7EB', justifyContent: 'center' }}>
                    <Text style={{ fontWeight: '600', color: '#1F2937', fontSize: 13 }}>Step {index + 1}</Text>
                  </View>

                  {/* Description */}
                  <View style={{ width: colWidths.description, borderRightWidth: 1, borderRightColor: '#E5E7EB', padding: 8 }}>
                    <TextInput
                      style={{
                        flex: 1,
                        fontSize: 12,
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
                  <View style={{ width: colWidths.hazards, borderRightWidth: 1, borderRightColor: '#E5E7EB', padding: 8 }}>
                    <TextInput
                      style={{
                        flex: 1,
                        fontSize: 12,
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
                  <View style={{ width: colWidths.controls, borderRightWidth: 1, borderRightColor: '#E5E7EB', padding: 8 }}>
                    <TextInput
                      style={{
                        flex: 1,
                        fontSize: 12,
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
                  <View style={{ width: colWidths.delete, borderRightColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center', padding: 8 }}>
                    <TouchableOpacity
                      onPress={() => handleDeleteStep(step.id)}
                      style={{ padding: 8, backgroundColor: '#FEE2E2', borderRadius: 4 }}
                    >
                      <Text style={{ color: '#DC2626', fontWeight: '700', fontSize: 14 }}>✕</Text>
                    </TouchableOpacity>
                  </View>
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
