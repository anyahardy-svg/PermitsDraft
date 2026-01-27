import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Switch,
  FlatList,
  Modal,
  Dimensions
} from 'react-native';
import { createPermit, listPermits, updatePermit, deletePermit } from './src/api/permits';
import { createCompany, listCompanies, updateCompany, deleteCompany } from './src/api/companies';
import { createUser, listUsers, updateUser, deleteUser } from './src/api/users';
import { createContractor, listContractors, updateContractor, deleteContractor } from './src/api/contractors';

// List of all available sites
const ALL_SITES = [
  'Amisfield Quarry',
  'Belmont Quarry',
  'Flat Top Quarry',
  'Hunua Quarry',
  'Otaki Quarry',
  'Otaika Quarry',
  'Petone Quarry',
  'Pukekawa Quarry',
  'Rangitikei Aggregates - Kakariki',
  'Rangitikei Aggregates - Bull/Campion',
  'Roys Hill Aggregates',
  'Tamahere Quarry',
  'TUQ - Onehunga',
  'TUQ - Henderson',
  'TUQ - Tamahere',
  'Whangaripo Quarry',
  'Wheatsheaf Quarry',
  'Whitehall Quarry',

];

// List of all available services
const ALL_SERVICES = [
  'Hot Work',
  'Confined Space',
  'Electrical',
  'Working at Height',
  'Excavation',
  'Lifting',
  'Blasting',
  'Mobile / Fixed Plant Servicing',
  'Surveying'
];

// CustomDropdown: modal dropdown for site selection
function CustomDropdown({ label, options, selectedValue, onValueChange, style }) {
  const [modalVisible, setModalVisible] = React.useState(false);
  return (
    <>
      <TouchableOpacity
        style={[{
          borderWidth: 1,
          borderColor: '#D1D5DB',
          borderRadius: 6,
          padding: 12,
          backgroundColor: 'white',
          minHeight: 48,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }, style]}
        onPress={() => setModalVisible(true)}
      >
        <Text style={{ color: selectedValue ? '#374151' : '#9CA3AF', fontSize: 16 }}>
          {selectedValue || label || 'Select'}
        </Text>
        <Text style={{ fontSize: 18, color: '#6B7280' }}>▼</Text>
      </TouchableOpacity>
      <Modal visible={modalVisible} transparent animationType="fade">
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }} onPress={() => setModalVisible(false)}>
          <View style={{
            backgroundColor: 'white',
            margin: 40,
            borderRadius: 8,
            padding: 16,
            maxHeight: '60%',
            justifyContent: 'center',
          }}>
            <FlatList
              data={options}
              keyExtractor={item => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}
                  onPress={() => {
                    onValueChange(item);
                    setModalVisible(false);
                  }}
                >
                  <Text style={{ fontSize: 16, color: item === selectedValue ? '#2563EB' : '#374151' }}>{item}</Text>
                </TouchableOpacity>
              )}
              ListFooterComponent={<TouchableOpacity onPress={() => setModalVisible(false)}><Text style={{ color: '#EF4444', textAlign: 'center', marginTop: 12 }}>Cancel</Text></TouchableOpacity>}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

// --- Render questionnaire for a specialized permit ---
function renderQuestionnaire(permitKey, formData, handleQuestionnaireResponse, permitQuestionnaires, styles) {
  const questions = permitQuestionnaires[permitKey] || [];
  const answers = formData.specializedPermits[permitKey]?.questionnaire || {};
  return (
    <View style={styles.questionnaireScroll}>
      {questions.map((q) => {
        const answerObj = answers[q.id] || {};
        const answer = answerObj.answer || '';
        const controls = answerObj.controls || '';
        return (
          <View key={q.id} style={styles.questionContainer}>
            <Text style={styles.questionText}>
              {q.text} {q.required && <Text style={styles.required}>*</Text>}
            </Text>
            {q.note && <Text style={styles.noteText}>{q.note}</Text>}
            {/* Render input based on type */}
            {q.type === 'yesno' && (
              <View style={styles.radioGroup}>
                {['yes', 'no'].map(opt => (
                  <TouchableOpacity
                    key={opt}
                    style={styles.radioOption}
                    onPress={() => handleQuestionnaireResponse(permitKey, q.id, opt, 'answer')}
                  >
                    <View style={[styles.radioCircle, answer === opt && styles.radioSelected]} />
                    <Text style={styles.radioLabel}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {q.type === 'yesno_text' && (
              <View>
                <View style={styles.radioGroup}>
                  {['yes', 'no'].map(opt => (
                    <TouchableOpacity
                      key={opt}
                      style={styles.radioOption}
                      onPress={() => handleQuestionnaireResponse(permitKey, q.id, opt, 'answer')}
                    >
                      <View style={[styles.radioCircle, answer === opt && styles.radioSelected]} />
                      <Text style={styles.radioLabel}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {answer === 'yes' && (
                  <View style={styles.textInputContainer}>
                    <Text style={styles.textLabel}>{q.textLabel || 'Please provide details:'}</Text>
                    <TextInput
                      style={styles.detailTextInput}
                      value={answerObj.text || ''}
                      onChangeText={text => handleQuestionnaireResponse(permitKey, q.id, text, 'text')}
                      placeholder={q.textLabel || 'Enter details'}
                      multiline
                    />
                  </View>
                )}
              </View>
            )}
            {q.type === 'text' && (
              <View style={styles.textInputContainer}>
                <TextInput
                  style={styles.detailTextInput}
                  value={answerObj.text || ''}
                  onChangeText={text => handleQuestionnaireResponse(permitKey, q.id, text, 'text')}
                  placeholder={q.textLabel || 'Enter details'}
                  multiline
                />
              </View>
            )}
            {/* Controls input based on controlsOn field (defaults to 'yes' if not specified) */}
            {!q.noControls && ((q.type === 'yesno' || q.type === 'yesno_text') && answer === (q.controlsOn || 'yes')) && (
              <View style={styles.textInputContainer}>
                <Text style={styles.textLabel}>Controls for this question:</Text>
                <TextInput
                  style={styles.detailTextInput}
                  value={controls}
                  onChangeText={text => handleQuestionnaireResponse(permitKey, q.id, text, 'controls')}
                  placeholder="Describe controls for this hazard/question"
                  multiline
                />
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

// Custom DateTimePicker Component
const DateTimePicker = ({ visible, onClose, onSelect, mode = 'date', currentValue }) => {
  const formatDate = (date) => {
    return date.toISOString().split('T')[0];
  };
  const formatTime = (hour, minute) => {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  };

  const handleConfirm = () => {
    if (mode === 'date') {
      onSelect(formatDate(selectedDate));
    } else {
      onSelect(formatTime(tempHour, tempMinute));
    }
    onClose();
  };

  // Parse time string "HH:MM" if in time mode
  let initialHour, initialMinute;
  if (mode === 'time' && currentValue) {
    const [hour, minute] = currentValue.split(':').map(Number);
    initialHour = hour || new Date().getHours();
    initialMinute = minute || new Date().getMinutes();
  } else {
    const now = new Date();
    initialHour = now.getHours();
    initialMinute = now.getMinutes();
  }

  const [selectedDate, setSelectedDate] = useState(currentValue ? new Date(currentValue) : new Date());
  const [tempHour, setTempHour] = useState(initialHour);
  const [tempMinute, setTempMinute] = useState(initialMinute);

  const renderDatePicker = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const day = selectedDate.getDate();
    // When changing month, keep year and day, but clamp day to max days in new month
    const handleMonthSelect = (newMonth) => {
      const maxDay = new Date(year, newMonth + 1, 0).getDate();
      const newDay = Math.min(day, maxDay);
      setSelectedDate(new Date(year, newMonth, newDay));
    };
    // When changing day, keep year and month
    const handleDaySelect = (newDay) => {
      setSelectedDate(new Date(year, month, newDay));
    };
    // When changing year, keep month and day, clamp day
    const handleYearChange = (delta) => {
      const newYear = year + delta;
      const maxDay = new Date(newYear, month + 1, 0).getDate();
      const newDay = Math.min(day, maxDay);
      setSelectedDate(new Date(newYear, month, newDay));
    };
    return (
      <View style={pickerStyles.dateContainer}>
        <View style={pickerStyles.dateHeader}>
          <TouchableOpacity onPress={() => handleYearChange(-1)}>
            <Text style={pickerStyles.yearButton}>‹</Text>
          </TouchableOpacity>
          <Text style={pickerStyles.currentYear}>{year}</Text>
          <TouchableOpacity onPress={() => handleYearChange(1)}>
            <Text style={pickerStyles.yearButton}>›</Text>
          </TouchableOpacity>
        </View>
        <View style={pickerStyles.monthContainer}>
          {Array.from({ length: 12 }, (_, i) => (
            <TouchableOpacity
              key={i}
              style={[
                pickerStyles.monthButton,
                month === i && pickerStyles.selectedMonth
              ]}
              onPress={() => handleMonthSelect(i)}
            >
              <Text style={[
                pickerStyles.monthText,
                month === i && pickerStyles.selectedMonthText
              ]}>
                {new Date(year, i, 1).toLocaleString('default', { month: 'short' })}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={pickerStyles.dayContainer}>
          {Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, i) => (
            <TouchableOpacity
              key={i}
              style={[
                pickerStyles.dayButton,
                day === i + 1 && pickerStyles.selectedDay
              ]}
              onPress={() => handleDaySelect(i + 1)}
            >
              <Text style={[
                pickerStyles.dayText,
                day === i + 1 && pickerStyles.selectedDayText
              ]}>
                {i + 1}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderTimePicker = () => (
    <View style={{ paddingHorizontal: 20, paddingVertical: 20 }}>
      {/* Hour Section */}
      <View style={{ marginBottom: 40, alignItems: 'center' }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#6B7280', marginBottom: 12 }}>Hour</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
          <TouchableOpacity 
            style={{ padding: 12, backgroundColor: '#2563EB', borderRadius: 8 }}
            onPress={() => setTempHour(Math.max(0, tempHour - 1))}
          >
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: 'white' }}>−</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 56, fontWeight: 'bold', color: '#1F2937', minWidth: 80, textAlign: 'center' }}>
            {tempHour.toString().padStart(2, '0')}
          </Text>
          <TouchableOpacity 
            style={{ padding: 12, backgroundColor: '#2563EB', borderRadius: 8 }}
            onPress={() => setTempHour(Math.min(23, tempHour + 1))}
          >
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: 'white' }}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Minute Section */}
      <View style={{ alignItems: 'center' }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#6B7280', marginBottom: 12 }}>Minute</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
          <TouchableOpacity 
            style={{ paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#2563EB', borderRadius: 8 }}
            onPress={() => setTempMinute(Math.max(0, tempMinute - 15))}
          >
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: 'white' }}>−15</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 56, fontWeight: 'bold', color: '#1F2937', minWidth: 80, textAlign: 'center' }}>
            {tempMinute.toString().padStart(2, '0')}
          </Text>
          <TouchableOpacity 
            style={{ paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#2563EB', borderRadius: 8 }}
            onPress={() => setTempMinute(Math.min(59, tempMinute + 15))}
          >
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: 'white' }}>+15</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={pickerStyles.overlay}>
        <View style={pickerStyles.modal}>
          <View style={pickerStyles.header}>
            <Text style={pickerStyles.title}>
              {mode === 'date' ? 'Select Date' : 'Select Time'}
            </Text>
          </View>
          
          {mode === 'date' ? renderDatePicker() : renderTimePicker()}
          
          <View style={pickerStyles.buttonContainer}>
            <TouchableOpacity style={pickerStyles.cancelButton} onPress={onClose}>
              <Text style={pickerStyles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={pickerStyles.confirmButton} onPress={handleConfirm}>
              <Text style={pickerStyles.confirmButtonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const PermitManagementApp = () => {
  // Helper function to format dates from yyyy-MM-dd to dd/MM/yyyy
  const formatDateNZ = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  // --- Advanced Permit Form State ---
  const specializedPermitTypes = [
    { key: 'hotWork', label: 'Hot Work', description: 'Welding, cutting, grinding, or any activity that generates heat or sparks.' },
    { key: 'confinedSpace', label: 'Confined Space', description: 'Entry into tanks, vessels, pits, or other confined spaces.' },
    { key: 'workingAtHeight', label: 'Working at Height', description: 'Work at height where a fall could occur.' },
    { key: 'electrical', label: 'Electrical', description: 'Electrical work, including panel access and live work.' },
    { key: 'excavation', label: 'Excavation', description: 'Digging, trenching, or disturbing the ground.' },
    { key: 'lifting', label: 'Lifting', description: 'Use of cranes, hoists, or other lifting equipment.' },
    { key: 'blasting', label: 'Blasting', description: 'Use of explosives or blasting agents.' },
    { key: 'plantServicing', label: 'Plant Servicing', description: 'Servicing or maintenance of plant and equipment.' },
    { key: 'stripping', label: 'Stripping', description: 'Stripping campaign to remove overburden.' },
    { key: 'surveying', label: 'Surveying', description: 'Surveying activities in hazardous areas.' }
  ];
  const singleHazardTypes = [
    // Workplace Conditions / Weather
    { key: 'lightingLevels', label: 'Lighting Levels', description: 'Inadequate lighting conditions.' },
    { key: 'dust', label: 'Dust', description: 'Dust generation or exposure.' },
    { key: 'housekeeping', label: 'Housekeeping', description: 'Poor housekeeping or clutter.' },
    { key: 'poorErgonomics', label: 'Poor Ergonomics', description: 'Ergonomic issues affecting work.' },
    { key: 'weather', label: 'Weather', description: 'Adverse weather conditions.' },
    { key: 'visibility', label: 'Visibility', description: 'Poor visibility conditions.' },
    { key: 'sharpEdges', label: 'Sharp Edges', description: 'Exposure to sharp edges or surfaces.' },
    // Interactions / Human Factors
    { key: 'workingAloneRemotely', label: 'Working alone / remotely', description: 'Work being performed alone or remotely.' },
    { key: 'otherWorkersInArea', label: 'Other workers in area', description: 'Other workers present in the work area.' },
    { key: 'mobilePlantInArea', label: 'Mobile plant in area', description: 'Mobile plant or vehicles operating nearby.' },
    { key: 'communications', label: 'Communications', description: 'Communication challenges.' },
    { key: 'externalFactors', label: 'External Factors', description: 'External environmental factors.' },
    { key: 'lateShift', label: 'Late Shift', description: 'Working late, overtime or a very late start.' },
    // Manual handling / Ergonomics
    { key: 'bendingKneelingTwisting', label: 'Repetitive work', description: 'Repetitive bending, kneeling or twisting.' },
    { key: 'loadsLiftPushPull', label: 'Manual handling', description: 'Handling loads by lifting, pulling, pushing or carrying.' },
    { key: 'awkwardPosition', label: 'Awkward position / posture', description: 'Working in awkward positions.' },
    { key: 'forceSpeedVibration', label: 'Repetitive impact or vibration', description: 'High force, speed or vibration exposure.' },
    // Mechanical / Non-Mechanical
    { key: 'entanglement', label: 'Entanglement or Crushing', description: 'Risk of entanglement or crushing in machinery.' },
    { key: 'exposureHazardousEnergy', label: 'Exposure to hazardous energy', description: 'Exposure to hazardous energy sources.' },
    { key: 'exposureElectricity', label: 'Exposure to Electricity', description: 'Risk of electrical shock or electrocution.' },
    { key: 'failureSafetyDevice', label: 'Failure of safety device', description: 'Potential failure of safety devices.' },
    { key: 'equipmentFailure', label: 'Equipment failure', description: 'Risk of equipment failure.' },
    { key: 'slipsTripsAndFalls', label: 'Slips, Trips and Falls', description: 'Risk of slips, trips and falls.' },
    { key: 'powerToolsFitForUse', label: 'Power tools', description: 'Defective or unsuitable power tools.' },
    { key: 'other', label: 'Other', description: 'Other hazards.' }
  ];
  // Complete questionnaires for each specialized permit
  const permitQuestionnaires = {
    confinedSpace: [
      { id: 'isolations', text: 'Are all isolations necessary completed?', type: 'yesno', required: true, controlsOn: 'no' },
      { id: 'training', text: 'Are all workers entering the confined space trained and competent to perform the required task within the confined space as well as entering the confined space? NO CONFINED SPACE TRAINING = NO ENTRY', type: 'yesno', required: true, controlsOn: 'no', blockingQuestion: true },
      { id: 'medical_check', text: 'All workers checked for any potential medical, health, psychological conditions that might pose a risk, prior to entry.', type: 'yesno', required: true, controlsOn: 'no' },
      { id: 'atmosphere_testing', text: 'Is atmosphere testing required?', type: 'yesno', required: true },
      { id: 'testing_gases', text: 'Which gases will be tested?', type: 'multi_checkbox', required: true, options: [
        { label: 'O2', value: 'O2' },
        { label: 'CO', value: 'CO' },
        { label: 'H2S', value: 'H2S' },
        { label: 'Combustibles', value: 'combustibles' },
        { label: 'Other Toxic gases', value: 'other_toxic', textLabel: 'Specify other toxic gases' },
        { label: 'Other asphyxiants', value: 'other_asphyxiants', textLabel: 'Specify other asphyxiants' }
      ], dependsOn: 'atmosphere_testing', dependsOnValue: 'yes' },
      { id: 'ventilation', text: 'Is ventilation of the confined space required?', type: 'yesno', controlsLabel: 'Describe controls' },
      { id: 'engulfment', text: 'Is there a possibility of engulfment, drowning or overhead hazards?', type: 'yesno' },
      { id: 'pressure', text: 'Is there a possibility of extreme suction, pressure or flow occurring while people are in this confined space?', type: 'yesno'},
      { id: 'access_egress', text: 'Is the access and egress to the confined space restricted, difficult or hazardous?', type: 'yesno', required: false },
      { id: 'barrier', text: 'Will a barrier always be placed over the access point when workers leave the area.', type: 'yesno', required: true, controlsOn: 'no' },
      { id: 'vehicles', text: 'Are vehicles or combustion engines likely to be a hazard?', type: 'yesno', required: false },
      { id: 'harnesses', text: 'Are safety harnesses and a method of extraction required?', type: 'yesno', note: 'If yes, Review the Fall Arrest Equipment Checklist.' },
      { id: 'communication_method', text: 'How will you communicate?', type: 'text', required: true, textLabel: 'Phone/Radio/Audible Signal/Visual Signal/Rope Signal' },
      { id: 'safety_watch_name', text: 'Name', type: 'text', required: true, textLabel: 'Enter name' },
      { id: 'emergency_contact', text: 'Name and phone number', type: 'text', required: true, textLabel: 'Enter name and phone number' }
    ],
    hotWork: [
      { id: 'workshop_alternative', text: 'Will the hot work be done in an approved hot work area such as the workshop?', type: 'yesno', required: true, noControls: true },

      { id: 'flammable_materials', text: 'Are there flammable or combustible substances/material evident within 10m of the hot work?  Look for dry vegetation, containers, piping systems, drains, other equipment in the area, or directly above or below the area?', type: 'yesno', required: true, controlsLabel: 'Describe purging/removal/covering methods?' },
      { id: 'fire_extinguishers', text: 'Adequate and suitable fire extinguishers available on the job? A minimum of 3.5kg CO2 or dry powder fire extinguishers must be on hand.', type: 'yesno', required: true, controlsLabel: 'What fire extinguishers do you have available?', controlsOn: 'no'},
      { id: 'hot_marking', text: 'Are there other workers in the area?', type: 'yesno', required: false, note: 'All items must be marked HOT to warn others in the area', controlsLabel: 'How will you protect others from the Hot Work?' },
      { id: 'flashback_arrestors', text: 'Are the correct flash back arrestors fitted to all gas bottles?', type: 'yesnona', required: true, blockingQuestion: true, blockingAnswer: 'no', noControls: true },


      { id: 'ignition_conveyance', text: 'Is it possible for ignition sources from hot work to be conveyed by conveyors, ducting, airflow or wind to combustible materials?', type: 'yesno', required: true, dependsOn: 'workshop_alternative', dependsOnValue: 'no' },
      { id: 'conveyors_nearby', text: 'Are there conveyors, rubber lined chutes and poly deck screens in the immediate area and/or below any hot work?', type: 'yesno', required: true, controlsLabel: 'Describe the protection measure taken?', dependsOn: 'workshop_alternative', dependsOnValue: 'no' },
      { id: 'wet_surfaces', text: 'Does floors and surface areas need to be wetted down?', type: 'yesno', required: true, dependsOn: 'workshop_alternative', dependsOnValue: 'no' },
      { id: 'flammable_gases', text: 'Are flammable gases present in the area?', type: 'yesno', required: true, controlsLabel: 'What gases were tested, and what were the results?', note: 'Gas test required if yes', dependsOn: 'workshop_alternative', dependsOnValue: 'no' },
      { id: 'confined_space', text: 'Is hot work being undertaken in a confined space?', type: 'yesno', note: 'Confined Space permit also required if yes', dependsOn: 'workshop_alternative', dependsOnValue: 'no' },
      { id: 'hdpe_welding', text: 'Is High Density Polyethylene pipe being welded using electrofusion?', type: 'yesno', controlsLabel: 'Describe blanking procedures and cooling time requirements', note: 'Blank off open end and follow manufacturer cooling times', dependsOn: 'workshop_alternative', dependsOnValue: 'no' },
      { id: 'wash_down', text: 'On processing plants, wash down hose in place and pumps turned on before commencing hot work.', type: 'yesno', required: true,  controlsOn: 'no', dependsOn: 'workshop_alternative', dependsOnValue: 'no' },


      { id: 'grinders', text: 'Are disk grinders being used?', type: 'yesno', noControls : true },
            { id: 'eye_protect', text:  'Are the operators aware that double eye protection (visor and glasses) are needed for use of grinders?', type: 'yesno', controlsOn: 'no', dependsOn: 'grinders', dependsOnValue: 'yes', controlsLabel: 'Who will be using the grinder and what extra controls do you have in place?'},
            { id: 'correct_grinder', text:  'Does the grinder have anti-kickback protection and a deadman switch?', type: 'yesno', controlsOn: 'no', dependsOn: 'grinders', dependsOnValue: 'yes', controlsLabel: 'Who will be using the grinder and what extra controls do you have in place?'},
            { id: 'grinder_safety', text:  'Is the guard fitted and side handle in position?', type: 'yesno', controlsOn: 'no', dependsOn: 'grinders', dependsOnValue: 'yes', controlsLabel: 'Who will be using the grinder and what extra controls do you have in place?'},
            { id: '9inch', text: 'Are 9 inch grinders being used?', type: 'yesno', controlsLabel: 'Who will be using the grinder and what extra controls do you have in place?', note: 'Only qualified tradesmen are allowed to use 9" grinders', dependsOn: 'grinders', dependsOnValue: 'yes' },
      
      { id: 'alarm_plan', text: 'Is there a plan to raise the alarm if needed?', type: 'yesno_text', required: true, yesLabel: 'Describe the emergency plan details', noLabel: 'Describe how this will be controlled' },
      { id: 'hw_safety_watch', text: 'Who is the safety watch person?', type: 'text', required: true },
      { id: 'hw_safety_period', text: 'What is the safety watch period?', type: 'radio', options: ['30 minutes (low risk)', '60 minutes (high risk)'], required: true },
      ],

    electrical: [
      { id: 'isolation_requirements', text: 'Isolation requirements completed? Test and prove all isolations. Personal locks to be used and in place during the job, as noted in Isolation Register.', type: 'yesnona', required: true, controlsOn: 'no' },
      { id: 'signage', text: 'Signage required to be placed by job to warn of hazard?', type: 'yesno_text', textLabel: 'Describe signage type and placement', noControls: true },
      { id: 'ladder_required', text: 'Will a ladder be required? If yes, non-metallic ladders to be used in switchyards and around live equipment.', type: 'yesno', required: true, noControls: true },
      { id: 'electrical_ladder_condition', text: 'Is the ladder to be used in good condition?', type: 'yesno', required: true, dependsOn: 'ladder_required', dependsOnValue: 'yes', controlsOn: 'no', inlineOnly: true, note: 'Check: All rubber feet present; All rungs in good condition; All safety catches/locking bars intact; AS/NZS 1892 standard mark present and rated for weight' },
      { id: 'electrical_ladder_non_metallic', text: 'Is the ladder non-metallic?', type: 'yesno', required: true, dependsOn: 'ladder_required', dependsOnValue: 'yes', controlsOn: 'no', inlineOnly: true, note: 'Non-metallic ladders required in switchyards and around live equipment' },
      { id: 'electrical_ladder_angle', text: 'Is the angle of the ladder set up to a ratio of 4 up and 1 out?', type: 'yesno', required: true, dependsOn: 'ladder_required', dependsOnValue: 'yes', controlsOn: 'no', inlineOnly: true },
      { id: 'electrical_ladder_level_ground', text: 'Is the ladder to be footed on level ground?', type: 'yesno', required: true, dependsOn: 'ladder_required', dependsOnValue: 'yes', controlsOn: 'no', inlineOnly: true },
      { id: 'electrical_ladder_secured', text: 'Is the ladder secured against movement at the top and bottom? (Note: you must have someone hold the ladder at the bottom initially to set this up)', type: 'yesno', required: true, dependsOn: 'ladder_required', dependsOnValue: 'yes', controlsOn: 'no', inlineOnly: true },
      { id: 'electrical_ladder_three_points', text: 'Will it be possible to maintain 3 points of contact at all times?', type: 'yesno', required: true, dependsOn: 'ladder_required', dependsOnValue: 'yes', controlsOn: 'no', inlineOnly: true },
      { id: 'electrical_exclusion', text: 'Does an exlusion zone need to be set up?.', type: 'yesno', required: true, noControls: true },
      { id: 'electrical_exclusion_photo', text: 'Exclusion zone photo', type: 'attachment', dependsOn: 'electrical_exclusion', dependsOnValue: 'yes', note: 'Attach photo of exclusion zone setup' },
      { id: 'ppe', text: 'What PPE is required to be worn?', type: 'multi_checkbox', required: true, options: [
        { label: 'CAL rated clothing', value: 'high_viz' },
        { label: 'Flame Retardant Overalls/Clothing', value: 'flame_retardant' },
        { label: 'Safety Boots', value: 'safety_boots' },
        { label: 'Safety Glasses', value: 'safety_glasses' },
        { label: 'CAL rated gloves', value: 'cal_gloves' },
        { label: 'Other', value: 'other', textLabel: 'Specify other PPE' }
      ] },
      { id: 'oil_spillage', text: 'Oil spill kit available for work on transformers or oil filled switch gear.', type: 'yesnona', required: true, controlsOn: 'no' },
      { id: 'competent_personnel', text: 'All personnel undertaking this work are suitably competent (or supervised) to perform the required tasks?', type: 'yesno', required: true, controlsOn: 'no' },
      { id: 'environmental', text: 'Consider: Are there any environmental matters?', type: 'yesno_text', textLabel: 'If yes, describe environmental considerations and precautions', noControls: true },
      { id: 'communication', text: 'All relevant personnel has been notified of the work that is being undertaken? Consider: Production, other site personnel, contractors and external agencies', type: 'yesnona', required: true, controlsOn: 'no' },
      { id: 'job_completion', text: 'Job Completion: Any special requirements at the closure of the job, before handing permit back for sign off?', type: 'yesno_text', textLabel: 'Describe completion requirements', noControls: true }
    ],
    workingAtHeight: [
      { id: 'trained_competent', text: 'Are all workers undertaking the task trained and competent in work at heights?', type: 'yesno', required: true, controlsOn: 'no' },
      { id: 'fitness', text: 'Are all persons fit for work at height? No persons are suffering from any ailment, illness or physical condition that could put any person at risk during work at height.', type: 'yesno', required: true, controlsOn: 'no' },
      { id: 'equip_types', text: 'Which working at height equipment will be used?', type: 'multi_checkbox', required: true, options: [
        { label: 'MEWP', value: 'mewp' },
        { label: 'Scaffold', value: 'scaffold' },
        { label: 'Ladders', value: 'ladder' },
        { label: 'Other', value: 'other', textLabel: 'Specify other systems' },
	{ label: 'No W@H equipment needed, access available', value: 'none' },
      ]},


	{ id: 'fall_prevention', text: 'Fall prevention methods that will be in place?', required: true },
      	{ id: 'protection_system', text: 'Will fall protection systems be used?', type: 'yesnona', required: true, controlsOn: 'no' },
      

      { id: 'system_types', text: 'Which fall protection systems will be used?', type: 'multi_checkbox', required: true, options: [
        { label: 'Total Restraint', value: 'total_restraint' },
        { label: 'Fall Restraint', value: 'fall_restraint' },
        { label: 'Work Positioning', value: 'work_positioning' },
        { label: 'Limited Free Fall Arrest', value: 'limited_free_fall' },
        { label: 'Free Fall Arrest', value: 'free_fall_arrest' },
        { label: 'Physical Barriers', value: 'barriers' },
        { label: 'Other', value: 'other', textLabel: 'Specify other systems' }
      ], dependsOn: 'protection_system', dependsOnValue: 'yes' },
      { id: 'protection_system_controls', text: 'Any other additional controls needed for this equipment?', type: 'text', dependsOn: 'protection_system', dependsOnValue: 'yes' },
      { id: 'safety_equipment', text: 'What extra PPE is needed', type: 'multi_checkbox', required: true, options: [
        { label: 'Harness', value: 'harness' },
        { label: 'Lanyard', value: 'lanyard' },
        { label: 'Working at Heights Helmet', value: 'wah_helmet' },
        { label: 'Other', value: 'other', textLabel: 'Specify other PPE' }
      ] },
      { id: 'ladder_best_method', text: 'Is a ladder the best method to access the work area required? (Ladders should only be used for low-risk, short-duration tasks under 30 minutes)', type: 'yesno', required: true, dependsOn: 'equip_types', dependsOnValue: 'ladder', controlsOn: 'no', inlineOnly: true, note: 'Do not: Go beyond the third rung from the top; Leave tools on the ladder; Allow overreach; Carry loads that will prevent three points of contact; Use with more than one person' },
      { id: 'ladder_condition', text: 'Is the ladder to be used in good condition?', type: 'yesno', required: true, dependsOn: 'equip_types', dependsOnValue: 'ladder', controlsOn: 'no', inlineOnly: true, note: 'Check: All rubber feet present; All rungs in good condition; All safety catches/locking bars intact; AS/NZS 1892 standard mark present and rated for weight' },
      { id: 'ladder_overhang', text: 'If being used as an access way, does the ladder overhang at least one metre beyond the step off point?', type: 'yesno', required: true, dependsOn: 'equip_types', dependsOnValue: 'ladder', controlsOn: 'no', inlineOnly: true },
      { id: 'ladder_secured', text: 'Is the ladder secured against movement at the top and bottom? (Note: you must have someone hold the ladder at the bottom initially to set this up)', type: 'yesno', required: true, dependsOn: 'equip_types', dependsOnValue: 'ladder', controlsOn: 'no', inlineOnly: true },
      { id: 'ladder_level_ground', text: 'Is the ladder to be footed on level ground?', type: 'yesno', required: true, dependsOn: 'equip_types', dependsOnValue: 'ladder', controlsOn: 'no', inlineOnly: true },
      { id: 'ladder_angle', text: 'Is the angle of the ladder set up to a ratio of 4 up and 1 out?', type: 'yesno', required: true, dependsOn: 'equip_types', dependsOnValue: 'ladder', controlsOn: 'no', inlineOnly: true },
      { id: 'ladder_access_way', text: 'Is the ladder in a vehicle or pedestrian access way? (Put up temporary barriers - cones/tape/signage etc)', type: 'yesno', required: true, dependsOn: 'equip_types', dependsOnValue: 'ladder', controlsOn: 'no', inlineOnly: true },
      { id: 'ladder_three_points', text: 'Will it be possible to maintain 3 points of contact at all times?', type: 'yesno', required: true, dependsOn: 'equip_types', dependsOnValue: 'ladder', controlsOn: 'no', inlineOnly: true },
      { id: 'mewp_daily_check', text: 'Has a daily check been performed on the EWP?', type: 'yesno', required: true, dependsOn: 'equip_types', dependsOnValue: 'mewp', controlsOn: 'no', inlineOnly: true },
      { id: 'mewp_operator_trained', text: 'Is the operator trained in the use of this elevating work platform?', type: 'yesno', required: true, dependsOn: 'equip_types', dependsOnValue: 'mewp', controlsOn: 'no', inlineOnly: true },
      { id: 'mewp_inspected', text: 'Has the machine been inspected within the previous 6 months?', type: 'yesno', required: true, dependsOn: 'equip_types', dependsOnValue: 'mewp', controlsOn: 'no', inlineOnly: true },
      { id: 'mewp_controls_identified', text: 'Are all the controls clearly identified with direction of movement and operate correctly when tested?', type: 'yesno', required: true, dependsOn: 'equip_types', dependsOnValue: 'mewp', controlsOn: 'no', inlineOnly: true },
      { id: 'mewp_emergency_stop', text: 'Does the emergency stop operate when activated?', type: 'yesno', required: true, dependsOn: 'equip_types', dependsOnValue: 'mewp', controlsOn: 'no', inlineOnly: true },
      { id: 'mewp_fluid_levels', text: 'Are fuel, water, oil and battery levels adequate?', type: 'yesno', required: true, dependsOn: 'equip_types', dependsOnValue: 'mewp', controlsOn: 'no', inlineOnly: true },
      { id: 'mewp_no_damage', text: 'Is there any visible damage?', type: 'yesno', required: true, dependsOn: 'equip_types', dependsOnValue: 'mewp', inlineOnly: true },
      { id: 'mewp_level_ground', text: 'Is the machine set up on level ground with stabilisers extended to the ground?', type: 'yesno', required: true, dependsOn: 'equip_types', dependsOnValue: 'mewp', controlsOn: 'no', inlineOnly: true },
      { id: 'mewp_exclusion_zone', text: 'Is there a clear exclusion zone set up around the work area?', type: 'yesno', required: true, dependsOn: 'equip_types', dependsOnValue: 'mewp', controlsOn: 'no', inlineOnly: true },
      { id: 'mewp_weight_limit', text: 'Will the weight be kept within the SWL? (A person and their tools calculated at being 100kgs)', type: 'yesno', required: true, dependsOn: 'equip_types', dependsOnValue: 'mewp', controlsOn: 'no', inlineOnly: true },
      { id: 'mewp_horn_check', text: 'If a self-propelled EWP is being used check the horn operates correctly.', type: 'yesno', dependsOn: 'equip_types', dependsOnValue: 'mewp', inlineOnly: true },
      { id: 'scaffold_tag_safe', text: 'Does the scaffold have a tag to confirm it is safe for use?', type: 'yesno', required: true, dependsOn: 'equip_types', dependsOnValue: 'scaffold', controlsOn: 'no', inlineOnly: true },
      { id: 'scaffold_guardrail_toe_board', text: 'All working platforms has a guardrail and toe board?', type: 'yesno', required: true, dependsOn: 'equip_types', dependsOnValue: 'scaffold', controlsOn: 'no', inlineOnly: true },
      { id: 'scaffold_no_damage', text: 'Is there any visible damage to the scaffold?', type: 'yesno', required: true, dependsOn: 'equip_types', dependsOnValue: 'scaffold', controlsOn: 'yes', inlineOnly: true },
      { id: 'scaffold_exclusion_zone', text: 'Is there a clear exclusion zone set up around the work area to prevent incidents from dropped objects?', type: 'yesno', required: true, dependsOn: 'equip_types', dependsOnValue: 'scaffold', controlsOn: 'no', inlineOnly: true },
      { id: 'scaffold_weight_limit', text: 'Will the weight be kept within the SWL?', type: 'yesno', required: true, dependsOn: 'equip_types', dependsOnValue: 'scaffold', controlsOn: 'no', inlineOnly: true },
      { id: 'harness_lanyard_inspected', text: 'All harnesses/lanyards/ropes etc. externally inspected in the last 6 months?', type: 'yesno', required: true, dependsOn: 'safety_equipment', dependsOnValue: ['harness', 'lanyard'] },
      { id: 'anchor_points_certified', text: 'All anchor points certified and inspected in the last 12 months?', type: 'yesno', required: true, dependsOn: 'safety_equipment', dependsOnValue: ['harness', 'lanyard'] },
      { id: 'harness_webbing', text: 'Webbing - No cuts, nicks, tears, fraying, abrasions, burns, mold, mildew, or chemical damage', type: 'yesno', dependsOn: 'safety_equipment', dependsOnValue: 'harness', inlineOnly: true },
      { id: 'harness_stitching', text: 'Stitching - Not broken, burned, pulled, or missing threads', type: 'yesno', dependsOn: 'safety_equipment', dependsOnValue: 'harness', inlineOnly: true },
      { id: 'harness_hardware', text: 'Hardware (D-Rings, Buckles, Pass-Thru) - Check for rust, cracks, corrosion, distortion, sharp edges, or deformation', type: 'yesno', dependsOn: 'safety_equipment', dependsOnValue: 'harness', inlineOnly: true },
      { id: 'harness_impact_indicators', text: 'Impact indicators - Verify tags have not been deployed or torn', type: 'yesno', dependsOn: 'safety_equipment', dependsOnValue: 'harness', inlineOnly: true },
      { id: 'harness_labels', text: 'Labels/Tags - Ensure labels are present and legible, providing manufacturer, model, and serial number', type: 'yesno', dependsOn: 'safety_equipment', dependsOnValue: 'harness', inlineOnly: true },
      { id: 'harness_fit', text: 'Fit/Adjustment - Ensure straps and buckles operate smoothly and can be properly adjusted to the user', type: 'yesno', dependsOn: 'safety_equipment', dependsOnValue: 'harness', inlineOnly: true },
      { id: 'harness_correct_size', text: 'Correct size harness for the person?', type: 'yesno', dependsOn: 'safety_equipment', dependsOnValue: 'harness', inlineOnly: true },
      { id: 'lanyard_webbing', text: 'Webbing/Rope - Inspect for frays, tears, burns, cuts, and chemical/UV degradation', type: 'yesno', dependsOn: 'safety_equipment', dependsOnValue: 'lanyard', inlineOnly: true },
      { id: 'lanyard_shock_absorber', text: 'Shock Absorber/Pack - Check the pouch for tearing, burning, or stitches that have already deployed', type: 'yesno', dependsOn: 'safety_equipment', dependsOnValue: 'lanyard', inlineOnly: true },
      { id: 'lanyard_hardware', text: 'Hardware (Hooks/Carabiners) - Inspect for distortion, cracks, and ensuring gate mechanisms self-lock and close properly', type: 'yesno', dependsOn: 'safety_equipment', dependsOnValue: 'lanyard', inlineOnly: true },
      { id: 'anchor_points', text: 'Specify the anchor point(s)', type: 'text', required: true },
      { id: 'falling_objects', text: 'Provision made to prevent objects from falling below, such as tethering, kickrails etc.', type: 'yesno', controlsOn: 'no' },
      { id: 'tool_count', text: 'Tool count completed before and after work?', type: 'yesno', required: true, controlsOn: 'no' },
      { id: 'initial_tool_count', text: 'How many tools are you taking with you?', type: 'text', dependsOn: 'tool_count', dependsOnValue: 'yes', textLabel: 'Enter number of tools' },
      { id: 'overhead_lines', text: 'Will work at height be conducted within 4 meters of overhead lines? All work closer than 4 meters to overhead conductors must be authorized by the network operator.', type: 'yesno', required: true, note: 'Network operator approval required if within 4m' },
      { id: 'network_operator_approval', text: 'Network operator approval', type: 'attachment', dependsOn: 'overhead_lines', dependsOnValue: 'yes', note: 'Attach network operator approval document' },
      { id: 'emergency_retrieval', text: 'Describe emergency retrieval plan and suspension trauma relief procedures', type: 'text', dependsOn: 'safety_equipment', dependsOnValue: ['harness', 'lanyard'], textLabel: 'Describe emergency retrieval plan and suspension trauma relief procedures', required: true },
      { id: 'safety_watch', text: 'Safety watch required? Safety Watch must be present if harness is in use.', type: 'yesno_text', textLabel: 'Name safety watch person and describe their specific duties', required: true },
      { id: 'exclusion_zone_photo', text: 'Exclusion zone photo', type: 'attachment', dependsOn: ['mewp_exclusion_zone', 'scaffold_exclusion_zone'], dependsOnValue: 'yes', note: 'Attach photo of exclusion zone setup' }
    ],
    excavation: [
      { id: 'before_you_dig', text: 'Before you dig notification completed?', type: 'yesnona', required: true, controlsOn: 'no' },
      { id: 'underground_services', text: 'Underground services identified and marked?', type: 'yesnona', required: true, controlsOn: 'no' },
      { id: 'shoring_required', text: 'Is shoring or slope protection required?', type: 'yesno_text', textLabel: 'Describe shoring/slope protection measures', noControls : true },
      { id: 'competent_person', text: 'Name of competent person assigned to supervise excavation.', type: 'text', required: true, dependsOn: 'shoring_required', dependsOnValue: 'yes' },
      { id: 'emergency_egress', text: 'Describe emergency plan for persons in excavation', type: 'text', required: true, dependsOn: 'shoring_required', dependsOnValue: 'yes', textLabel: 'Describe emergency plan for persons in excavation' }
    ],
    lifting: [
      { id: 'environmental_conditions', text: 'Are the environmental conditions suitable for this activity? (lifts should not proceed if wind exceeds 35 knots, 60 MPH, or 15m/h)', type: 'yesno', required: true, controlsOn: 'no' },
      { id: 'supervisors_oversight', text: 'Are the supervisors in place to oversee work competently?', type: 'yesno', required: true, controlsOn: 'no' },
      { id: 'lighting_provided', text: 'Has adequate lighting been provided for workers? (if natural light is inadequate)', type: 'yesnona', required: true, controlsOn: 'no' },
      { id: 'exclusion_zone', text: 'Has an exclusion zone been established around the area during preparation and lift?', type: 'yesno', required: true, controlsOn: 'no' },
      { id: 'exclusion_zone_photo', text: 'Exclusion zone photo', type: 'attachment', dependsOn: 'exclusion_zone', dependsOnValue: 'yes', note: 'Attach photo of exclusion zone setup' },
      { id: 'personnel_trained', text: 'Are all personnel trained and competent in their respective equipment (i.e., crane driver, dogman, rigger, safety observer etc.)?', type: 'yesno', required: true, controlsOn: 'no' },
      { id: 'safe_working_load', text: 'Is the lift within 80% of the crane/hiab safe working load limit?', type: 'yesno', required: true, controlsOn: 'no' },
      { id: 'complex_lift_procedure', text: 'If over 60% or a complex lift (more people, 2 or more cranes etc), has a Lifting Procedure been signed off by the Crane Controller or Lift Supervisor?', type: 'yesno', required: true, controlsOn: 'no' },
      { id: 'equipment_isolated', text: 'Have all affected plant and equipment been isolated prior to lift?', type: 'yesno', required: true, controlsOn: 'no' },
      { id: 'manufacturer_specs', text: 'Is the lift within the manufacturer\'s specifications for the hoist, sling and chains?', type: 'yesno', required: true, controlsOn: 'no' },
      { id: 'loads_secured', text: 'Are loads adequately secured to ensure they are stable during lift and are all hooks etc. certified?', type: 'yesno', required: true, controlsOn: 'no' },
      { id: 'communication', text: 'Does the dogman/rigger and crane operator able to have visual contact or a defined means of communication? (a designated radio channel is required for a blind lift)', type: 'yesno', required: true, controlsOn: 'no' },
      { id: 'lifting_equipment_certified', text: 'Have all lifting equipment, slings and chains been checked and certified to carry load?', type: 'yesno', required: true, controlsOn: 'no' },
      { id: 'tag_lines', text: 'Are tag lines or piles available to control the load and swing?', type: 'yesno', required: true, controlsOn: 'no' },
      { id: 'boom_positioning', text: 'Is the crew aware that the boom and loads are not to be left positioned over live work areas when left unattended?', type: 'yesno', required: true, controlsOn: 'no' }
    ],
    blasting: [
      
      
      // Marking Section
      { id: 'marking_section', text: 'Marking Requirements', type: 'section' },
      { id: 'marking_hazards_controlled', text: 'Are you aware of any bench condition and face edge hazards and are they controlled?', type: 'yesno', required: true },
      { id: 'marking_lv_parking', text: 'Light vehicles remain in designated LV parking area?', type: 'yesno', required: true, controlsOn: 'no' },
      { id: 'marking_standoff_established', text: 'Minimum 2m stand-off distance from the face established? (If not, RM needs to approve)', type: 'yesno', required: true, controlsOn: 'no' },
      { id: 'marking_standoff_increased', text: 'Does the stand-off distance need to be increased?', type: 'yesno_text', textLabel: 'To how many meters:', noControls: true, dependsOn: 'marking_standoff_established', dependsOnValue: 'yes' },
      { id: 'marking_standoff_marked', text: 'Minimum stand-off distance marked with dazzle, markers, cones, fence posts?', type: 'yesno', required: true, controlsOn: 'no' },
      { id: 'marking_bund_break', text: 'Safe break in bund for drill rig established?', type: 'yesno', required: true, controlsOn: 'no' },
      { id: 'marking_bund_marked', text: 'Break in bund marked with cones?', type: 'yesno', required: true, controlsOn: 'no' },
      { id: 'marking_weather_checked', text: 'Weather checked to avoid significant weather events?', type: 'yesno', required: true, controlsOn: 'no' },
      
      // Marking Documentation
      
      { id: 'marking_edge_protection', text: 'Edge protection marked on drill plan?', type: 'yesno', required: true, controlsOn: 'no' },
      { id: 'marking_plan_approved', text: 'Drill Plan reviewed and approved by Permit Issuer?', type: 'yesno', required: true },
      { id: 'marking_drill_plan_file', text: 'Attach Drill Plan', type: 'attachment', note: 'Attach the drill plan document' }, 
      
      // Drilling Section
      { id: 'drilling_section', text: 'Drilling Requirements', type: 'section' },
      
      { id: 'drilling_inspection_completed', text: 'Drill rig daily inspection sheet completed prior to start-up?', type: 'yesno', required: true, controlsOn: 'no' },
      { id: 'drilling_ground_conditions', text: 'Are ground conditions suitable to prevent drill rigs toppling over?', type: 'yesno', required: true, controlsOn: 'no' },
      { id: 'drilling_oriented_toppling', text: 'Is the drill rig oriented to prevent falling over edge if it should topple over ?', type: 'yesno', required: true, controlsOn: 'no' },
      { id: 'drilling_oriented_distance', text: 'Is the drill rig oriented to maximize distance from face?', type: 'yesno', required: true, controlsOn: 'no' },  
      { id: 'drilling_normal_area', text: 'Is drilling completed in an area where geotechnical information is known?', type: 'yesno', required: true, controlsOn: 'no' },
      
      // Drilling Documentation
      { id: 'drilling_plan_received', text: 'Drill Plan and instructions received from the marker?', type: 'yesno', required: true, controlsOn: 'no' },
      { id: 'drilling_log_attached', text: 'Drill log completed and attached?', type: 'yesno', required: true, controlsOn: 'no' },
           
      { id: 'blasting_section', text: 'Blasting Requirements', type: 'section' },
      { id: 'licensed_shot_firer', text: 'Name of licensed shot firer assigned.', type: 'text', required: true },
      { id: 'blasting_staff_notified', text: 'Staff notified of intended time/date/location of blast and which radio channel to use?', type: 'yesno', required: true, controlsOn: 'no' },
      { id: 'blasting_third_parties_consulted', text: 'Third parties/members of the public consulted/notified?', type: 'yesno', required: true, controlsOn: 'no'},
      { id: 'blasting_third_parties_evacuated', text: 'Third parties/members of the public evacuated if not in the public safety zone?', type: 'yesno', required: true, controlsOn: 'no'},
      { id: 'blasting_access_bench_clear', text: 'Access to bench clear and the Authority to Load inspection completed?', type: 'yesno', required: true, controlsOn: 'no' },
      { id: 'blasting_geological_changes', text: 'There are known geological changes or faults that may impact on the blast?', type: 'yesno', required: true },
      { id: 'blasting_drill_reviewed', text: 'Drill log and bore track results reviewed and discussed with driller?', type: 'yesno', required: true, controlsOn: 'no' },
      { id: 'blasting_burden_bore_tracked', text: 'Has front rows been bore-tracked?', type: 'yesno', required: true, controlsOn: 'no' },
      { id: 'blasting_burden_front_face', text: 'Minimum burden of front face hole bore tracking is (m)', type: 'text', required: true, noControls: true, dependsOn: 'blasting_burden_bore_tracked', dependsOnValue: 'yes' },
      { id: 'blasting_burden_consistent', text: 'Is the actual burden consistent with design burden?', type: 'yesno', required: true, controlsOn: 'no' },
      { id: 'blasting_safety_factor', text: 'Can a safety factor 4x be achieved for personnel positioned in the all in firing position?', type: 'yesno', required: true, controlsOn: 'no' },
      { id: 'blasting_safety_factor_plant', text: 'Can a safety factor 2x be achieved for personnel positioned for all plant and equipment', type: 'yesno', required: true, controlsOn: 'no' },
      { id: 'blasting_manager_signoff_required', text: 'Regional Manager Sign-Off Required: Safety requirements not met', type: 'section', dependsOn: ['blasting_burden_bore_tracked', 'blasting_burden_consistent', 'blasting_safety_factor', 'blasting_safety_factor_plant'], dependsOnValue: ['no', 'no', 'no', 'no'] },
      { id: 'blasting_manager_name', text: 'Regional Manager Name', type: 'text', required: true, dependsOn: ['blasting_burden_bore_tracked', 'blasting_burden_consistent'], dependsOnValue: ['no', 'no'] },
      { id: 'blasting_manager_signoff_file', text: 'Regional Manager Sign-Off Document', type: 'attachment', note: 'Attach signed approval from Regional Manager', dependsOn: ['blasting_burden_bore_tracked', 'blasting_burden_consistent', 'blasting_safety_factor', 'blasting_safety_factor_plant'], dependsOnValue: ['no', 'no', 'no', 'no'] },
      
      { id: 'blasting_safe_distance_personnel', text: 'Safe distance for personnel on site is', type: 'text', textLabel: '_____ m', required: true },
      { id: 'blasting_safe_distance_plant', text: 'Safe location distance for plant/equipment/vehicles is', type: 'text', textLabel: '_____ m', required: true },
      { id: 'blasting_firing_direction', text: 'Firing direction understood?', type: 'yesno', required: true, controlsOn: 'no' },
      { id: 'blasting_monitors_set_up', text: 'Have the blast monitors been set up?', type: 'yesno', required: true, controlsOn: 'no' },
      { id: 'blasting_site_plan', text: 'Site Plan completed with and discussed with Permit Issuer?', type: 'yesno', required: true, controlsOn: 'n' },
      { id: 'blasting_holes_below_midc', text: 'Are holes below or equal to their Maximum instantaneous Design Charge?', type: 'yesno_text', textLabel: 'If no, note the numbers and comment', textLabelOn: 'no', required: true, noControls: true },
      
      { id: 'final_checks_section', text: 'Final Checks Before Blasting', type: 'section' },
      
      
      { id: 'blasting_personnel_accounted', text: 'Visitors/Contractors/Personnel/Plant/Equipment on site all accounted for and in agreed safety zone?', type: 'yesno', required: true, controlsOn: 'no' },
     

      { id: 'blasting_shotfirer_position', text: 'Shotfirer in the established firing position, not in line of sight of the blast?', type: 'yesno', required: true, controlsOn: 'no' },
      { id: 'blasting_mgm_signoff_required', text: 'Blasting Company Operations Manager Sign-Off Required: Safety requirements not met', type: 'section', dependsOn: ['blasting_shotfirer_position'], dependsOnValue: ['no'] },
      { id: 'blasting_mgm_name', text: 'Operations Manager Name', type: 'text', required: true, dependsOn: ['blasting_shotfirer_position'], dependsOnValue: ['no'] },
      { id: 'blasting_mgm_signoff_file', text: 'Regional Manager Sign-Off Document', type: 'attachment', note: 'Attach signed approval from Regional Manager', dependsOn: ['blasting_shotfirer_position'], dependsOnValue: ['no'] },
      



      { id: 'post_blast_section', text: 'Post Blast Inspection', type: 'section' },
      { id: 'blasting_fumex_settled', text: 'Fumex and dust have settled and dissipated before entering?', type: 'yesno', required: true, controlsOn: 'no' },
      { id: 'blasting_faces_inspected', text: 'Faces inspected and deemed safe?', type: 'yesno', required: true, controlsOn: 'no' },
      { id: 'blasting_all_holes_fired', text: 'All holes have fired?', type: 'yesno', required: true },
      { id: 'blasting_all_clear', text: 'All clear given to proceed with normal operations?', type: 'yesno', required: true }
    ],
    plantServicing: [
      { id: 'lockout_recorded', text: 'All people working on mobile/fixed plant have applied a lockout and lockouts and these are recorded in Isolations section the PTW', type: 'yesnona', required: true, controlsOn: 'no' },
      { id: 'zero_energy_confirmed', text: 'A zero-energy state confirmed. (All electrical, hydraulic, pneumatic, mechanical systems de-energized.  Think about hoseburst protection systems, springs, rollaway, flywheels etc.)', type: 'yesno', required: true, controlsOn: 'no' },
      { id: 'workers_trained', text: 'All workers trained, competent and experienced at performing the repair task on the mobile/fixed plant.', type: 'yesnona', required: true, controlsOn: 'no' },
      { id: 'manufacturer_manual', text: 'Is the repair being completed as per the Mobile Plant or Fixed Plant Manufacturers Workshop Manual where applicable or available?', type: 'yesnona', required: true, controlsOn: 'no' },
      { id: 'access_restricted', text: 'Access to the repair area is restricted for pedestrians and vehicles. Only workers engaged in the work and signed on to the permit and the permit issuer have access to the service area.', type: 'yesnona', required: true, controlsOn: 'no' },
      { id: 'fluids_contained', text: 'Are all fluids and other waste materials contained and will it be removed by the end of the task.', type: 'yesnona', required: true, noControls: true, controlsOn: 'no' },
      { id: 'hot_fluids_controls', text: 'Controls for release/draining of hot fluids in place - e.g. engine oil, hydraulic oils etc', type: 'yesnona', required: true, controlsOn: 'no' },
      { id: 'pressurized_controls', text: 'Controls for venting of pressurized fluids or systems in place - e.g. hydraulic oil', type: 'yesnona', required: true, controlsOn: 'no' },
      { id: 'flammable_controls', text: 'Controls for flammables in place - e.g. petrol, diesel', type: 'yesnona', required: true, controlsOn: 'no' },
      { id: 'no_suspended_loads', text: 'Will anyone be under suspended loads?', type: 'yesno', required: true, blockingQuestion: true, blockingAnswer: 'yes', noControls: true },
      { id: 'plant_operation', text: 'If the plant (mobile or fixed) is to be started or moved by the a contractor, are they trained and competent in the operation of the mobile/fixed plant, hold the correct licenses and be trained in the relevant Winsome Aggregates SOPs.', type: 'yesnona', required: true, controlsOn: 'no'},
      { id: 'safe_access_height', text: 'Is there safe access to the work area?', type: 'yesnona', required: true, controlsOn: 'no' },
      { id: 'heavy_lifting_controls', text: 'Controls in place for heavy lifting that might be involved.', type: 'yesnona', required: true, controlsOn: 'no' },
      { id: 'additional_permits', text: 'Are all associated permits completed?  eg. Hot Work, Working at Height, Lifting with Cranes or Hiabs etc.', type: 'yesnona', required: true, controlsOn: 'no'},
      { id: 'tools_equipment', text: 'All tools, equipment used fit for purpose, safe, certified where necessary. Any custom-built items verified.', type: 'yesnona', required: true, controlsOn: 'no' },
      
      // Mobile Plant Section
      { id: 'mobile_plant_section', text: 'Mobile Plant Servicing', type: 'section' },
      { id: 'approved_area', text: 'Mobile Plant repair being done in approved servicing area.', type: 'yesnona', required: true, noControls: true },
      { id: 'traffic_diversion_required', text: 'Traffic Diversion required?', type: 'yesno', dependsOn: 'approved_area', dependsOnValue: 'no', controlsOn: 'no' },
      
      // Traffic Diversion Checklist (inline questions)
      
      { id: 'traffic_areas_described', text: 'Have all staff been informed of the areas of the site that will be affected?', type: 'yesno', required: true, inlineOnly: true, dependsOn: 'traffic_diversion_required', dependsOnValue: 'yes', controlsOn: 'no' },
      { id: 'traffic_period_described', text: 'Have all staff been informed of the likely period of time that site traffic will be disrupted?', type: 'yesno', required: true, inlineOnly: true, dependsOn: 'traffic_diversion_required', dependsOnValue: 'yes', controlsOn: 'no' },
      { id: 'traffic_conflicting_checked', text: 'Have you checked for conflicting work or activity on site roads?', type: 'yesno', required: true, inlineOnly: true, dependsOn: 'traffic_diversion_required', dependsOnValue: 'yes', controlsOn: 'no' },
      { id: 'traffic_emergency_exits', text: 'Will access to emergency exits, or emergency equipment and services be blocked?', type: 'yesno', required: true, inlineOnly: true, dependsOn: 'traffic_diversion_required', dependsOnValue: 'yes' },
      { id: 'traffic_deliveries_communicated', text: 'Have you communicated the likely impact on site deliveries, customer traffic to site?', type: 'yesno', required: true, inlineOnly: true, dependsOn: 'traffic_diversion_required', dependsOnValue: 'yes', controlsOn: 'no' },
      { id: 'traffic_route_checked', text: 'Have you checked the planned route of travel is appropriate for the load size and weight? (E.g. gradient, width, surface etc.)', type: 'yesnona', required: true, inlineOnly: true, dependsOn: 'traffic_diversion_required', dependsOnValue: 'yes', controlsOn: 'no' },
      { id: 'traffic_barriers_planned', text: 'Have you clearly marked the area using barriers, cones and signs etc.?', type: 'yesno', required: true, inlineOnly: true, dependsOn: 'traffic_diversion_required', dependsOnValue: 'yes', controlsOn: 'no' },
      { id: 'traffic_pedestrian_hazards', text: 'Will all pedestrians be safe from traffic inside the marked barriers?', type: 'yesno', required: true, inlineOnly: true, dependsOn: 'traffic_diversion_required', dependsOnValue: 'yes', controlsOn: 'no' },
      
      
      { id: 'tire_safety', text: 'Safety systems in place for inflating tyres.', type: 'yesnona', required: true, noControls: true, controlsOn: 'no'},
      { id: 'batteries_protected', text: 'Batteries protected from arcing.', type: 'yesnona', required: true, controlsOn: 'no' },
      { id: 'wheels_removed', text: 'Will any wheels be removed during this work?', type: 'yesno', required: true, noControls: true },
      
      { id: 'chocks_used', text: 'Suitable chocks being used to prevent movement?', type: 'yesnona', required: true, noControls: true, dependsOn: 'wheels_removed', dependsOnValue: 'yes', controlsOn: 'no' },
      { id: 'retorque_sop', text: 'Aware of retorqueing required on all heavy vehicles after tyre wheel removal?', type: 'yesnona', required: true, noControls: true, dependsOn: 'wheels_removed', dependsOnValue: 'yes', controlsOn: 'no' },
      { id: 'wheel_torque_level', text: 'Correct Wheel torque level known', type: 'text', required: true, noControls: true, textLabel: 'Nm', dependsOn: 'wheels_removed', dependsOnValue: 'yes', controlsOn: 'no' },
      { id: 'retorque_record', text: 'Wheel Retorque Record Completed', type: 'yesnona', required: true, noControls: true, dependsOn: 'wheels_removed', dependsOnValue: 'yes', controlsOn: 'no' },
      
      { id: 'hydraulic_raising', text: 'Will Hydraulic Bins, Buckets or Booms need to be raised?', type: 'yesno', required: true, controlsOn: 'no' },
      { id: 'overhead_check', text: 'Are there any overhead structures/powerlines and wires present?', type: 'yesnona', required: true, noControls: true, dependsOn: 'hydraulic_raising', dependsOnValue: 'yes' },
      { id: 'bins_empty', text: 'Was bins checked to ensure they are empty?', type: 'yesnona', required: true, noControls: true, dependsOn: 'hydraulic_raising', dependsOnValue: 'yes', controlsOn: 'no' },
      { id: 'locks_used', text: 'Approved locks used for securing raised attachments', type: 'yesnona', required: true, noControls: true, dependsOn: 'hydraulic_raising', dependsOnValue: 'yes', controlsOn: 'no' },
      { id: 'pins_props', text: 'Approved pins or props in place before anyone can work under raised attachments/bins/buckets', type: 'yesnona', required: true, noControls: true, dependsOn: 'hydraulic_raising', dependsOnValue: 'yes', controlsOn: 'no' },
      { id: 'no_person_raised_bucket', text: 'Will any person work in or be carried in a raised bucket of mobile plant?', type: 'yesnona', required: true, noControls: true, dependsOn: 'hydraulic_raising', dependsOnValue: 'yes', blockingQuestion: true, blockingAnswer: 'yes' }
    ],




    stripping: [
      { id: 'environmental_clearance', text: 'Environmental consents followed?', type: 'yesno', required: true, controlsOn: 'no'  },
      { id: 'archaeology_survey', text: 'Archaeological survey conditions/restrictions followed?', type: 'yesnona', controlsOn: 'no' },
      { id: 'equipment_inspection', text: 'Stripping equipment pre-start inspections completed daily?', type: 'yesno', required: true, controlsOn: 'no'  },
      { id: 'dust_control', text: 'Dust suppression measures in place?', type: 'yesno', required: true, controlsOn: 'no'  },
      { id: 'traffic_management', text: 'Traffic management plan still relevant and correct?', type: 'yesno', required: true, controlsOn: 'no'  },
      { id: 'overhead_wires', text: 'Overhead wires identified and adequately controlled?', type: 'yesnona', required: true, controlsOn: 'no'  },
      { id: 'speed_limits', text: 'Speed limits defined?', type: 'yesnona', required: true, controlsOn: 'no' },
      { id: 'two_way_traffic', text: '2-way traffic controlled?', type: 'yesnona', required: true, controlsOn: 'no' },
      { id: 'light_vehicle_access', text: 'Light vehicle access controlled?', type: 'yesnona', required: true, controlsOn: 'no'  },
      { id: 'rt_calling_points', text: 'R/T calling points identified?', type: 'yesnona', required: true, controlsOn: 'no'  },
      { id: 'emergency_run_off', text: 'Emergency run off areas provided if needed?', type: 'yesnona', required: true, controlsOn: 'no' },
      { id: 'haul_roads_bunded', text: 'All haul roads and faces adequately bunded?', type: 'yesnona', required: true, controlsOn: 'no' },
      { id: 'haul_road_gradient', text: 'Gradient of all haul roads appropriate for vehicles used?', type: 'yesnona', required: true, controlsOn: 'no'},
      { id: 'passing_points', text: 'Passing points defined on any single lane sections?', type: 'yesnona', required: true, controlsOn: 'no' },
      { id: 'road_maintenance', text: 'Road maintenance adequate?', type: 'yesnona', required: true, controlsOn: 'no' },
      { id: 'pushing_material_controls', text: 'Controls in place if pushing material over faces?', type: 'yesnona', required: true, controlsOn: 'no' },
      { id: 'tipping_procedures', text: 'Tipping procedures followed correctly?', type: 'yesnona', required: true, controlsOn: 'no'},
      { id: 'plant_operators_trained', text: 'All mobile plant operators adequately trained and supervised?', type: 'yesnona', required: true, controlsOn: 'no' },
      { id: 'operator_sign_in', text: 'All operators signed in on site daily?', type: 'yesno', required: true, controlsOn: 'no' },
      { id: 'stripping_comms', text: 'There is an agreed plan of communication in case of emergency?', type: 'yesno', required: true, controlsOn: 'no' },
      { id: 'adverse_weather_controls', text: 'Controls in place to manage hazards arising from environmental conditions (rain/fog/frost/sun)?', type: 'yesnona', required: true, controlsOn: 'no' },
      { id: 'stripping_quarry_interaction', text: 'Access to stripping area, and interaction with quarry vehicles managed?', type: 'yesnona', required: true, controlsOn: 'no' }      
    ],

    surveying: [
      { id: 'survey_plan', text: 'Survey plan and methodology approved?', type: 'yesno', required: true, controlsOn: 'no' },
      { id: 'qualified_surveyor', text: 'Name of Qualified surveyor assigned to task', type: 'text', required: true },
      { id: 'equipment_calibration', text: 'Survey equipment calibration current?', type: 'yesno', required: true, controlsOn: 'no' },
      { id: 'site_access', text: 'Safe site access routes established?', type: 'yesno', required: true, controlsOn: 'no' },
      { id: 'communication', text: 'What is the communication plan while pedestrian is on site?', type: 'text', textLabel: 'Describe communication method and frequency', required: true },
      { id: 'site_plan_advising', text: 'Surveyor given site plan advising of location of all stockpiles and agreed access routes?', type: 'yesnona', required: true, controlsOn: 'no' },
      { id: 'vehicle_flashing_beacon', text: 'Surveyor\'s vehicle fitted with flashing beacon and flag?', type: 'yesnona', required: true, controlsOn: 'no'},
      { id: 'rt_communication', text: 'Surveyor has R/T, is aware of correct channel to use in relevant areas of site, site R/T protocol and need for all calls to be acknowledged?', type: 'yesnona', required: true, controlsOn: 'no' },
      { id: 'driving_procedures', text: 'Surveyor is inducted to site procedures for driving to site stockyards (i.e. give way to mobile plant, flashing light on, one way systems, using R/T calls etc)?', type: 'yesnona', required: true, controlsOn: 'no' },
      { id: 'quarry_vehicles_advised', text: 'All relevant quarry vehicles to be advised of surveyor activity before commencing?', type: 'yesno', required: true, controlsOn: 'no' },
      { id: 'drone_preference', text: 'Is the surveying being done by drone to prevent pedestrian access around stockpiles?', type: 'yesnona', required: true, controlsOn: 'no' },

      { id: 'stockpile_surveying', text: 'Stockpile Surveying', type: 'section', note: 'Only complete this part if you need to access the stockpile on foot' },
      { id: 'loader_operator_advised', text: 'Loader and Dump truck operator(s) advised via R/T of pedestrian presence prior to measuring each stockpile?', type: 'yesnona', required: true, controlsOn: 'no' },
      { id: 'vehicle_parking', text: 'Will the vehicle be parked in load out areas of stockpile to be measured, to restrict mobile plant access?', type: 'yesno', required: true, controlsOn: 'no' },
      { id: 'haul_road_clear', text: 'Pedestrians will keep clear of haul roads or other areas heavy vehicles may be operating and work by stockpile only?', type: 'yesnona', required: true, controlsOn: 'no'  },
      { id: 'avoid_loaded_stockpile', text: 'Surveyor understands not to approach any stockpile currently being loaded on to by dumper, or from by loader - wait in vehicle until the mobile plant has moved clear?', type: 'yesnona', required: true, controlsOn: 'no' },
      { id: 'undercut_faces_clear', text: 'Surveyor aware of what an undercut stockpile face is, and to keep clear and notify any undercuts to QM?', type: 'yesnona', required: true, controlsOn: 'no' },

      { id: 'pit_face_surveying', text: 'Pit and Face Surveying', type: 'section', note: 'Only complete this part if you need to access the pit on foot'  },
      { id: 'no_unprotected_benches', text: 'Does all benches where access is needed have over edge protection?', type: 'yesno', required: true, controlsOn: 'no'  },
      { id: 'no_edge_protection_standing', text: 'Is pedestrian aware that it is not allowed to stand on edge protection bunding?', type: 'yesno', required: true, controlsOn: 'no'  },
      { id: 'face_stability', text: 'Faces has been inspected for stability before approaching closer than 3m to toe?', type: 'yesno', required: true, controlsOn: 'no' },
      { id: 'avoid_operating_vehicles', text: 'Will pedestrians be entering areas where quarry vehicles are operating directly above or next to the pedestrian?', type: 'yesnona', required: true, controlsOn: 'no'  }
    ]
  };
  const initialSpecializedPermits = Object.fromEntries(specializedPermitTypes.map(p => [p.key, { required: false, controls: '', questionnaire: {} }]));
  const initialSingleHazards = Object.fromEntries(singleHazardTypes.map(h => [h.key, { present: false, controls: '' }]));
  const initialJSEA = { taskSteps: [], overallRiskRating: '', additionalPrecautions: '' };
  const initialIsolations = [];
  // Initial sign-ons: empty array
  const initialSignOns = [];
  // Date/time state for new permit
  const now = new Date();
  const pad = (n) => n.toString().padStart(2, '0');
  const defaultDate = now.toISOString().split('T')[0];
  const defaultTime = pad(now.getHours()) + ':' + pad(now.getMinutes());
  const formattedDefaultDate = formatDateNZ(defaultDate);

  const [formData, setFormData] = useState({
    id: '',
    description: '',
    requestedBy: '',
    location: '',
    status: 'pending_approval',
    priority: 'medium',
    startDate: defaultDate,
    startTime: defaultTime,
    endDate: defaultDate,
    endTime: defaultTime,
    specializedPermits: initialSpecializedPermits,
    singleHazards: initialSingleHazards,
    jsea: initialJSEA,
    isolations: initialIsolations,
    signOns: initialSignOns,
    completion: { finalToolCount: '', completionNotes: '' }
  });
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    general: true,
    specialized: false,
    isolations: false,
    hazards: false,
    jsea: false,
    controlsSummary: false,
    signons: false,
    completion: false,
    marking_section: false,
    drilling_section: false,
    blasting_section: true,
    final_checks_section: false,
    post_blast_section: false,
    mobile_plant_section: false
  });
  // --- Handlers for advanced form ---
  const toggleSection = (section) => setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  const handleSpecializedPermitChange = (key, field, value) => {
    setFormData(prev => ({
      ...prev,
      specializedPermits: {
        ...prev.specializedPermits,
        [key]: { ...prev.specializedPermits[key], [field]: value }
      }
    }));
  };
  const handleSingleHazardChange = (key, field, value) => {
    setFormData(prev => ({
      ...prev,
      singleHazards: {
        ...prev.singleHazards,
        [key]: { ...prev.singleHazards[key], [field]: value }
      }
    }));
  };
  // Store both answer and controls for each question
  const handleQuestionnaireResponse = (permitKey, qid, value, field = 'answer') => {
    setFormData(prev => {
      // Update the answer as before
      const updated = {
        ...prev,
        specializedPermits: {
          ...prev.specializedPermits,
          [permitKey]: {
            ...prev.specializedPermits[permitKey],
            questionnaire: {
              ...prev.specializedPermits[permitKey].questionnaire,
              [qid]: {
                ...((prev.specializedPermits[permitKey].questionnaire && prev.specializedPermits[permitKey].questionnaire[qid]) || {}),
                [field]: value
              }
            }
          }
        }
      };
      // If Hot Work's 'confined_space' is answered 'yes', turn on Confined Space permit
      if (
        permitKey === 'hotWork' &&
        qid === 'confined_space' &&
        ((field === 'answer' && value === 'yes') || (field !== 'answer' && (updated.specializedPermits.hotWork.questionnaire['confined_space']?.answer === 'yes')))
      ) {
        updated.specializedPermits = {
          ...updated.specializedPermits,
          confinedSpace: {
            ...updated.specializedPermits.confinedSpace,
            required: true
          }
        };
      }
      return updated;
    });
  };
  const addIsolation = () => {
    setFormData(prev => ({
      ...prev,
      isolations: [...prev.isolations, { what: '', isolatedBy: '', date: defaultDate, time: defaultTime }]
    }));
  };
  const updateIsolation = (idx, field, value) => {
    setFormData(prev => {
      const isolations = [...prev.isolations];
      isolations[idx] = { ...isolations[idx], [field]: value };
      return { ...prev, isolations };
    });
  };
  const removeIsolation = (idx) => {
    setFormData(prev => {
      const isolations = [...prev.isolations];
      isolations.splice(idx, 1);
      return { ...prev, isolations };
    });
  };
  const addJSEAStep = () => {
    setFormData(prev => ({
      ...prev,
      jsea: {
        ...prev.jsea,
        taskSteps: [...prev.jsea.taskSteps, { step: '', hazards: '', controls: '', riskLevel: '' }]
      }
    }));
  };
  const updateJSEAStep = (idx, field, value) => {
    setFormData(prev => {
      const steps = [...prev.jsea.taskSteps];
      steps[idx] = { ...steps[idx], [field]: value };
      return { ...prev, jsea: { ...prev.jsea, taskSteps: steps } };
    });
  };
  const removeJSEAStep = (idx) => {
    setFormData(prev => {
      const steps = [...prev.jsea.taskSteps];
      steps.splice(idx, 1);
      return { ...prev, jsea: { ...prev.jsea, taskSteps: steps } };
    });
  };

  // --- handleSubmit for advanced form ---
  const handleSubmit = async () => {
    if (!formData.description) {
      Alert.alert('Missing Info', 'Please fill in the Description field.');
      return;
    }
    
    try {
      // Prepare permit data for Supabase
      const permitData = {
        permit_type: formData.id || 'general',
        description: formData.description,
        location: formData.location,
        status: formData.status,
        priority: formData.priority,
        start_date: formData.startDate,
        start_time: formData.startTime,
        end_date: formData.endDate,
        end_time: formData.endTime,
        requested_by: formData.requestedBy,
        site_id: null, // Will be set later when user selects a site
        controls_summary: '',
        specialized_permits: formData.specializedPermits,
        single_hazards: formData.singleHazards,
        jsea: formData.jsea,
        sign_ons: formData.signOns
      };

      // Save to Supabase
      const newPermit = await createPermit(permitData);
      
      // Update local state with the new permit
      setPermits([...permits, { ...newPermit, submittedDate: new Date().toISOString().split('T')[0] }]);
      
      setFormData({
        id: '',
        description: '',
        requestedBy: '',
        location: '',
        status: 'pending_approval',
        priority: 'medium',
        specializedPermits: initialSpecializedPermits,
        singleHazards: initialSingleHazards,
        jsea: initialJSEA,
        isolations: initialIsolations,
        signOns: initialSignOns
      });
      setCurrentScreen('dashboard');
      Alert.alert('Permit Created', 'New permit has been saved to the database.');
    } catch (error) {
      console.error('Error creating permit:', error);
      Alert.alert('Error', 'Failed to save permit. Please try again.');
    }
  };
  // JSEA steps state
  const [jseaSteps, setJseaSteps] = useState([]);
  const [jseaStepText, setJseaStepText] = useState('');
  // Single hazards state
  const [singleHazards, setSingleHazards] = useState([]);
  const [hazardText, setHazardText] = useState('');
  const [currentScreen, setCurrentScreen] = useState('dashboard');
  const [permits, setPermits] = useState([]);
  const [isLoadingPermits, setIsLoadingPermits] = useState(true);

  // Load permits from Supabase on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoadingPermits(true);
        
        // Load permits
        const permitsData = await listPermits();
        setPermits(permitsData);
        
        // Load companies
        const companiesData = await listCompanies();
        setCompanies(companiesData);
        
        // Load users
        const usersData = await listUsers();
        setUsers(usersData);
        
        // Load contractors
        const contractorsData = await listContractors();
        setContractors(contractorsData);
      } catch (error) {
        console.error('Error loading data:', error);
        Alert.alert('Error', 'Failed to load data from database');
      } finally {
        setIsLoadingPermits(false);
      }
    };
    loadData();
  }, []);

  // Users state - stores system users with sites they can work at
  const [users, setUsers] = useState([
    { id: 'user-001', name: 'John Smith', email: 'john.smith@company.com', sites: ['Amisfield Quarry', 'Belmont Quarry'], company: 'ABC Contractors', isAdmin: true },
    { id: 'user-002', name: 'Jane Doe', email: 'jane.doe@company.com', sites: ['Wheatsheaf Quarry'], company: 'ABC Contractors', isAdmin: false },
    { id: 'user-003', name: 'Bob Wilson', email: 'bob.wilson@company.com', sites: ['Otaki Quarry', 'Petone Quarry'], company: 'XYZ Services', isAdmin: false }
  ]);

  // Companies state - stores contractor company information
  const [companies, setCompanies] = useState([
    { id: 'company-001', name: 'ABC Contractors Ltd' },
    { id: 'company-002', name: 'XYZ Services Inc' },
    { id: 'company-003', name: 'SafeWork Solutions' }
  ]);

  // Contractors state - stores contractor information
  const [contractors, setContractors] = useState([
    { id: 'contractor-001', name: 'ABC Contractors', email: 'info@abc-contractors.com', services: ['Hot Work', 'Electrical'], company: 'ABC Contractors Ltd', inductionExpiry: '2025-12-15' },
    { id: 'contractor-002', name: 'XYZ Services', email: 'contact@xyz-services.com', services: ['Confined Space', 'Working at Height'], company: 'XYZ Services Inc', inductionExpiry: '2026-03-20' }
  ]);

  const [newPermitData, setNewPermitData] = useState({
    id: '',
    types: [], // array for multiple specialised permits
    description: '',
    requestedBy: '',
    location: '',
    status: 'pending_approval',
    priority: 'medium',
    submittedDate: '',
    assignedApprover: ''
  });
  const [selectedPermit, setSelectedPermit] = useState(null);
  const [editPermitData, setEditPermitData] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editingUser, setEditingUser] = useState(false);
  const [currentUser, setCurrentUser] = useState({ id: '', name: '', email: '', sites: [], company: '', isAdmin: false });
  const [selectedContractor, setSelectedContractor] = useState(null);
  const [editingContractor, setEditingContractor] = useState(false);
  const [currentContractor, setCurrentContractor] = useState({ id: '', name: '', email: '', services: [], company: '', inductionExpiry: '' });
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [editingCompany, setEditingCompany] = useState(false);
  const [currentCompany, setCurrentCompany] = useState({ id: '', name: '' });
  
  // Filter states for contractors and users
  const [contractorSearchText, setContractorSearchText] = useState('');
  const [contractorCompanyFilter, setContractorCompanyFilter] = useState('All');
  const [userSearchText, setUserSearchText] = useState('');
  const [userCompanyFilter, setUserCompanyFilter] = useState('All');
  
  // Filter state for services directory
  const [selectedService, setSelectedService] = useState('Hot Work');
  
  // Induction date picker state
  const [showInductionDatePicker, setShowInductionDatePicker] = useState(false);
  const [inductionPickerDate, setInductionPickerDate] = useState(new Date());

  // Responsive column widths based on screen size
  const screenWidth = Dimensions.get('window').width;
  const isMobile = screenWidth < 600;
  const isTablet = screenWidth >= 600 && screenWidth < 900;
  
  const getColumnWidths = () => {
    if (isMobile) {
      // Mobile: more compact
      return { name: 80, email: 100, company: 80, services: 80, inductionExpiry: 90, actions: 50 };
    } else if (isTablet) {
      // Tablet: medium
      return { name: 100, email: 130, company: 100, services: 120, inductionExpiry: 110, actions: 70 };
    } else {
      // Desktop: full size
      return { name: 120, email: 150, company: 120, services: 150, inductionExpiry: 130, actions: 80 };
    }
  };
  
  const columns = getColumnWidths();

  // Utility functions
  const getStatusText = (status) => {
    switch (status) {
      case 'pending_approval': return 'Pending Approval';
      case 'pending_inspection': return 'Needs Inspection';
      case 'active': return 'Active';
      case 'completed': return 'Completed';
      default: return status;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#DC2626';
      case 'medium': return '#F59E42';
      case 'low': return '#10B981';
      default: return '#D1D5DB';
    }
  };

  // Utility: getStatusColor
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending_approval': return '#2563EB';
      case 'pending_inspection': return '#F59E42';
      case 'active': return '#10B981';
      case 'completed': return '#6B7280';
      default: return '#D1D5DB';
    }
  };

  // Utility: getRiskColor
  const getRiskColor = (risk) => {
    switch (risk) {
      case 'very_high': return '#DC2626';
      case 'high': return '#EA580C';
      case 'medium': return '#FBBF24';
      case 'low': return '#059669';
      default: return '#D1D5DB';
    }
  };

  // New Permit Form
  const specialisedOptions = [
    'Hot Work',
    'Confined Space',
    'Electrical',
    'Working at Height',
    'Excavation',
    'Radiation',
    'Other'
  ];
  const renderNewPermitForm = () => {
    return (
      <View style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setCurrentScreen('dashboard')}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>New Permit</Text>
        </View>
        <ScrollView style={styles.screenContainer} contentContainerStyle={{ flexGrow: 1 }}>
          {/* General Section */}
          <View style={styles.section}>
            <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('general')}>
              <Text style={styles.sectionTitle}>General Details</Text>
              <Text style={styles.expandIcon}>{expandedSections.general ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {expandedSections.general && (
              <View style={styles.sectionContent}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  multiline
                  numberOfLines={3}
                  value={formData.description}
                  onChangeText={text => setFormData({ ...formData, description: text })}
                  placeholder="Describe the work to be performed..."
                />
                <Text style={styles.label}>Site</Text>
                <CustomDropdown
                  label="Select Site"
                  options={ALL_SITES}
                  selectedValue={formData.site || ''}
                  onValueChange={value => setFormData({ ...formData, site: value })}
                  style={styles.input}
                />
                <Text style={styles.label}>Location</Text>
                <TextInput
                  style={styles.input}
                  value={formData.location}
                  onChangeText={text => setFormData({ ...formData, location: text })}
                  placeholder="Work location"
                />
                <Text style={styles.label}>Requested By</Text>
                <TextInput
                  style={styles.input}
                  value={formData.requestedBy}
                  onChangeText={text => setFormData({ ...formData, requestedBy: text })}
                  placeholder="Your name"
                />

                {/* Start Date/Time */}
                <Text style={styles.label}>Start Date</Text>
                <TouchableOpacity style={styles.dateTimeInput} onPress={() => setShowStartDatePicker(true)}>
                  <Text style={formData.startDate ? styles.dateTimeText : styles.placeholderText}>
                    {formData.startDate ? formatDateNZ(formData.startDate) : 'Select start date'}
                  </Text>
                  <Text style={styles.calendarIcon}>📅</Text>
                </TouchableOpacity>
                <DateTimePicker
                  visible={showStartDatePicker}
                  onClose={() => setShowStartDatePicker(false)}
                  onSelect={date => setFormData({ ...formData, startDate: date })}
                  mode="date"
                  currentValue={formData.startDate}
                />
                <Text style={styles.label}>Start Time</Text>
                <TouchableOpacity style={styles.dateTimeInput} onPress={() => setShowStartTimePicker(true)}>
                  <Text style={formData.startTime ? styles.dateTimeText : styles.placeholderText}>
                    {formData.startTime || 'Select start time'}
                  </Text>
                  <Text style={styles.calendarIcon}>⏰</Text>
                </TouchableOpacity>
                <DateTimePicker
                  visible={showStartTimePicker}
                  onClose={() => setShowStartTimePicker(false)}
                  onSelect={time => setFormData({ ...formData, startTime: time })}
                  mode="time"
                  currentValue={formData.startTime}
                />

                {/* End Date/Time */}
                <Text style={styles.label}>End Date</Text>
                <TouchableOpacity style={styles.dateTimeInput} onPress={() => setShowEndDatePicker(true)}>
                  <Text style={formData.endDate ? styles.dateTimeText : styles.placeholderText}>
                    {formData.endDate ? formatDateNZ(formData.endDate) : 'Select end date'}
                  </Text>
                  <Text style={styles.calendarIcon}>📅</Text>
                </TouchableOpacity>
                <DateTimePicker
                  visible={showEndDatePicker}
                  onClose={() => setShowEndDatePicker(false)}
                  onSelect={date => setFormData({ ...formData, endDate: date })}
                  mode="date"
                  currentValue={formData.endDate}
                />
                <Text style={styles.label}>End Time</Text>
                <TouchableOpacity style={styles.dateTimeInput} onPress={() => setShowEndTimePicker(true)}>
                  <Text style={formData.endTime ? styles.dateTimeText : styles.placeholderText}>
                    {formData.endTime || 'Select end time'}
                  </Text>
                  <Text style={styles.calendarIcon}>⏰</Text>
                </TouchableOpacity>
                <DateTimePicker
                  visible={showEndTimePicker}
                  onClose={() => setShowEndTimePicker(false)}
                  onSelect={time => setFormData({ ...formData, endTime: time })}
                  mode="time"
                  currentValue={formData.endTime}
                />

              </View>
            )}
          </View>
          {/* Isolations Section */}
          <View style={styles.section}>
            <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('isolations')}>
              <Text style={styles.sectionTitle}>Isolations</Text>
              <Text style={styles.expandIcon}>{expandedSections.isolations ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {expandedSections.isolations && (
              <View style={styles.sectionContent}>
                <Text style={styles.label}>Isolation Register</Text>
                {formData.isolations.map((isolation, idx) => (
                  <View key={idx} style={{ marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingBottom: 12 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text style={styles.label}>Isolation {idx + 1}</Text>
                      <TouchableOpacity onPress={() => removeIsolation(idx)}>
                        <Text style={styles.removeButton}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={[styles.label, { marginBottom: 4 }]}>What is isolated?</Text>
                    <TextInput
                      style={styles.input}
                      value={isolation.what}
                      onChangeText={text => updateIsolation(idx, 'what', text)}
                      placeholder="Describe what is isolated"
                    />
                    <Text style={[styles.label, { marginBottom: 4 }]}>Isolated by (name)</Text>
                    <TextInput
                      style={styles.input}
                      value={isolation.isolatedBy}
                      onChangeText={text => updateIsolation(idx, 'isolatedBy', text)}
                      placeholder="Name of person who isolated"
                    />
                    <Text style={[styles.label, { marginBottom: 4 }]}>Date</Text>
                    <TouchableOpacity style={styles.dateTimeInput} onPress={() => setShowStartDatePicker(true)}>
                      <Text style={isolation.date ? styles.dateTimeText : styles.placeholderText}>
                        {isolation.date ? formatDateNZ(isolation.date) : 'Select date'}
                      </Text>
                      <Text style={styles.calendarIcon}>📅</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity style={styles.addButton} onPress={addIsolation}>
                  <Text style={styles.addButtonText}>Add Isolation</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
          {/* Specialized Permits Section */}
          <View style={styles.section}>
            <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('specialized')}>
              <Text style={styles.sectionTitle}>Specialized Permits</Text>
              <Text style={styles.expandIcon}>{expandedSections.specialized ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {expandedSections.specialized && (
              <View style={styles.sectionContent}>
                {specializedPermitTypes.map(permit => (
                  <View key={permit.key} style={{ marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingBottom: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <Switch
                        value={formData.specializedPermits[permit.key].required}
                        onValueChange={val => handleSpecializedPermitChange(permit.key, 'required', val)}
                      />
                      <Text style={{ marginLeft: 8, fontWeight: 'bold' }}>{permit.label}</Text>
                    </View>
                    <Text style={{ color: '#6B7280', marginBottom: 4 }}>{permit.description}</Text>
                    {formData.specializedPermits[permit.key].required && (
                      <>
                        {/* Render the new questionnaire with per-question controls */}
                        {renderQuestionnaire(permit.key, formData, handleQuestionnaireResponse, permitQuestionnaires, styles)}
                      </>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
          {/* Single Hazards Section */}
          <View style={styles.section}>
            <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('hazards')}>
              <Text style={styles.sectionTitle}>Single Hazards</Text>
              <Text style={styles.expandIcon}>{expandedSections.hazards ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {expandedSections.hazards && (
              <View style={styles.sectionContent}>
                {singleHazardTypes.map(hazard => (
                  <View key={hazard.key} style={{ marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingBottom: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <Switch
                        value={formData.singleHazards[hazard.key].present}
                        onValueChange={val => handleSingleHazardChange(hazard.key, 'present', val)}
                      />
                      <Text style={{ marginLeft: 8, fontWeight: 'bold' }}>{hazard.label}</Text>
                    </View>
                    <Text style={{ color: '#6B7280', marginBottom: 4 }}>{hazard.description}</Text>
                    {formData.singleHazards[hazard.key].present && (
                      <>
                        <Text style={styles.label}>Controls</Text>
                        <TextInput
                          style={styles.input}
                          value={formData.singleHazards[hazard.key].controls}
                          onChangeText={text => handleSingleHazardChange(hazard.key, 'controls', text)}
                          placeholder="Describe controls for this hazard"
                        />
                      </>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
          {/* JSEA Section */}
          <View style={styles.section}>
            <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('jsea')}>
              <Text style={styles.sectionTitle}>JSEA</Text>
              <Text style={styles.expandIcon}>{expandedSections.jsea ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {expandedSections.jsea && (
              <View style={styles.sectionContent}>
                <Text style={styles.label}>Task Steps</Text>
                {formData.jsea.taskSteps.map((step, idx) => (
                  <View key={idx} style={styles.jseaStep}>
                    <View style={styles.stepHeader}>
                      <Text style={styles.stepTitle}>Step {idx + 1}</Text>
                      <TouchableOpacity onPress={() => removeJSEAStep(idx)}>
                        <Text style={styles.removeButton}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                    <TextInput
                      style={styles.input}
                      value={step.step}
                      onChangeText={text => updateJSEAStep(idx, 'step', text)}
                      placeholder="Describe step"
                    />
                    <TextInput
                      style={styles.input}
                      value={step.hazards}
                      onChangeText={text => updateJSEAStep(idx, 'hazards', text)}
                      placeholder="Hazards for this step"
                    />
                    <TextInput
                      style={styles.input}
                      value={step.controls}
                      onChangeText={text => updateJSEAStep(idx, 'controls', text)}
                      placeholder="Controls for this step"
                    />
                  </View>
                ))}
                <TouchableOpacity style={styles.addButton} onPress={addJSEAStep}>
                  <Text style={styles.addButtonText}>Add Step</Text>
                </TouchableOpacity>
                <Text style={styles.label}>Overall Risk Rating</Text>
                <View style={styles.riskButtons}>
                  {['low', 'medium', 'high', 'very_high'].map(risk => (
                    <TouchableOpacity
                      key={risk}
                      style={[
                        styles.riskButton,
                        { backgroundColor: formData.jsea.overallRiskRating === risk ? getRiskColor(risk) : '#E5E7EB' }
                      ]}
                      onPress={() => setFormData({ ...formData, jsea: { ...formData.jsea, overallRiskRating: risk } })}
                    >
                      <Text style={[
                        styles.riskButtonText,
                        { color: formData.jsea.overallRiskRating === risk ? 'white' : '#374151' }
                      ]}>{risk.toUpperCase()}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.label}>Additional Precautions</Text>
                <TextInput
                  style={styles.input}
                  value={formData.jsea.additionalPrecautions}
                  onChangeText={text => setFormData({ ...formData, jsea: { ...formData.jsea, additionalPrecautions: text } })}
                  placeholder="Any additional precautions..."
                />
              </View>
            )}
          </View>
          {/* Controls Summary Section */}
          <View style={styles.section}>
            <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('controlsSummary')}>
              <Text style={styles.sectionTitle}>Controls Summary</Text>
              <Text style={styles.expandIcon}>{expandedSections.controlsSummary ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {expandedSections.controlsSummary && (
              <View style={styles.sectionContent}>
                {(() => {
                  // Check for any blocking questions that have been triggered
                  const triggeredQuestions = [];
                  Object.keys(formData.specializedPermits).forEach(permitKey => {
                    const questionnaire = permitQuestionnaires[permitKey] || [];
                    questionnaire.forEach(q => {
                      if (q.blockingQuestion) {
                        const answer = formData.specializedPermits[permitKey].questionnaire[q.id];
                        if (answer && answer.answer === (q.blockingAnswer || 'no')) {
                          triggeredQuestions.push(q.text);
                        }
                      }
                    });
                  });
                  
                  return triggeredQuestions.length > 0 && (
                    <View style={{ marginBottom: 16, padding: 12, backgroundColor: '#FEE2E2', borderRadius: 6, borderLeftWidth: 4, borderLeftColor: '#DC2626' }}>
                      <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#DC2626', textAlign: 'center' }}>⚠️ PERMIT CAN NOT BE ISSUED</Text>
                      <Text style={{ fontSize: 12, color: '#991B1B', marginTop: 8, marginBottom: 8 }}>The following critical condition(s) have been triggered:</Text>
                      {triggeredQuestions.map((question, idx) => (
                        <Text key={idx} style={{ fontSize: 11, color: '#991B1B', marginLeft: 8, marginBottom: 4 }}>• {question}</Text>
                      ))}
                    </View>
                  );
                })()}
                {Object.keys(formData.specializedPermits).map(permitKey => {
                  const permit = specializedPermitTypes.find(p => p.key === permitKey);
                  if (!formData.specializedPermits[permitKey].required) return null;
                  const controls = [];
                  const questionnaire = permitQuestionnaires[permitKey] || [];
                  questionnaire.forEach(q => {
                    const answer = formData.specializedPermits[permitKey].questionnaire[q.id];
                    if (answer && answer.controls) {
                      controls.push({ question: q.text, control: answer.controls });
                    }
                  });
                  if (controls.length === 0) return null;
                  return (
                    <View key={permitKey} style={{ marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingBottom: 12 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#1F2937', marginBottom: 8 }}>{permit.label}</Text>
                      {controls.map((item, idx) => (
                        <View key={idx} style={{ marginBottom: 8, paddingLeft: 12, borderLeftWidth: 2, borderLeftColor: '#2563EB' }}>
                          <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 2 }}>{item.question}</Text>
                          <Text style={{ fontSize: 13, color: '#1F2937', fontWeight: '500' }}>{item.control}</Text>
                        </View>
                      ))}
                    </View>
                  );
                })}
                {/* Single Hazards Controls */}
                {Object.keys(formData.singleHazards).some(hazardKey => formData.singleHazards[hazardKey].present && formData.singleHazards[hazardKey].controls) && (
                  <View style={{ marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingBottom: 12 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#1F2937', marginBottom: 8 }}>Single Hazards</Text>
                    {Object.keys(formData.singleHazards).map(hazardKey => {
                      const hazard = singleHazardTypes.find(h => h.key === hazardKey);
                      if (!formData.singleHazards[hazardKey].present || !formData.singleHazards[hazardKey].controls) return null;
                      return (
                        <View key={hazardKey} style={{ marginBottom: 8, paddingLeft: 12, borderLeftWidth: 2, borderLeftColor: '#2563EB' }}>
                          <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 2 }}>{hazard.label}</Text>
                          <Text style={{ fontSize: 13, color: '#1F2937', fontWeight: '500' }}>{formData.singleHazards[hazardKey].controls}</Text>
                        </View>
                      );
                    })}
                  </View>
                )}
                {/* JSEA Task Steps */}
                {formData.jsea.taskSteps && formData.jsea.taskSteps.length > 0 && (
                  <View style={{ marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingBottom: 12 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#1F2937', marginBottom: 8 }}>JSEA - Task Steps</Text>
                    {formData.jsea.taskSteps.map((step, idx) => (
                      <View key={idx} style={{ marginBottom: 12, paddingLeft: 12, borderLeftWidth: 2, borderLeftColor: '#2563EB' }}>
                        <Text style={{ fontSize: 13, color: '#1F2937', fontWeight: '600', marginBottom: 4 }}>Step {idx + 1}: {step.step}</Text>
                        {step.hazards && (
                          <View style={{ marginBottom: 4 }}>
                            <Text style={{ fontSize: 11, color: '#6B7280', marginBottom: 2 }}>Hazards:</Text>
                            <Text style={{ fontSize: 12, color: '#374151', marginLeft: 8 }}>{step.hazards}</Text>
                          </View>
                        )}
                        {step.controls && (
                          <View style={{ marginBottom: 4 }}>
                            <Text style={{ fontSize: 11, color: '#6B7280', marginBottom: 2 }}>Controls:</Text>
                            <Text style={{ fontSize: 12, color: '#374151', marginLeft: 8 }}>{step.controls}</Text>
                          </View>
                        )}
                        {step.riskLevel && (
                          <View>
                            <Text style={{ fontSize: 11, color: '#6B7280', marginBottom: 2 }}>Risk Level:</Text>
                            <Text style={{ fontSize: 12, color: step.riskLevel === 'HIGH' ? '#DC2626' : step.riskLevel === 'MEDIUM' ? '#EA580C' : '#059669', fontWeight: '600', marginLeft: 8 }}>{step.riskLevel}</Text>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                )}
                {/* JSEA Additional Precautions */}
                {formData.jsea.additionalPrecautions && (
                  <View style={{ marginBottom: 16, paddingBottom: 12 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#1F2937', marginBottom: 8 }}>JSEA - Additional Precautions</Text>
                    <View style={{ paddingLeft: 12, borderLeftWidth: 2, borderLeftColor: '#2563EB' }}>
                      <Text style={{ fontSize: 13, color: '#1F2937', fontWeight: '500' }}>{formData.jsea.additionalPrecautions}</Text>
                    </View>
                  </View>
                )}
                {!Object.keys(formData.specializedPermits).some(permitKey => formData.specializedPermits[permitKey].required && permitQuestionnaires[permitKey]?.some(q => formData.specializedPermits[permitKey].questionnaire[q.id]?.controls)) &&
                 !Object.keys(formData.singleHazards).some(hazardKey => formData.singleHazards[hazardKey].present && formData.singleHazards[hazardKey].controls) &&
                 !formData.jsea.additionalPrecautions && (
                  <Text style={{ color: '#9CA3AF', fontStyle: 'italic', fontSize: 14 }}>No controls have been filled in yet.</Text>
                )}
              </View>
            )}
          </View>
          {/* Sign-On Section */}
          <View style={styles.section}>
            <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('signons')}>
              <Text style={styles.sectionTitle}>Sign-On (Other Workers)</Text>
              <Text style={styles.expandIcon}>{expandedSections.signons ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {expandedSections.signons && (
              <View style={styles.sectionContent}>
                {formData.signOns.map((signOn, idx) => (
                  <View key={idx} style={{ marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingBottom: 8 }}>
                    <Text style={styles.label}>Worker Name</Text>
                    <TextInput
                      style={styles.input}
                      value={signOn.name}
                      onChangeText={text => {
                        const updated = [...formData.signOns];
                        updated[idx] = { ...updated[idx], name: text };
                        setFormData({ ...formData, signOns: updated });
                      }}
                      placeholder="Enter worker's name"
                    />
                    <Text style={styles.label}>Signature</Text>
                    <TextInput
                      style={styles.input}
                      value={signOn.signature}
                      onChangeText={text => {
                        const updated = [...formData.signOns];
                        updated[idx] = { ...updated[idx], signature: text };
                        setFormData({ ...formData, signOns: updated });
                      }}
                      placeholder="Signature (type name or initials)"
                    />
                    <TouchableOpacity onPress={() => {
                      const updated = [...formData.signOns];
                      updated.splice(idx, 1);
                      setFormData({ ...formData, signOns: updated });
                    }}>
                      <Text style={styles.removeButton}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity style={styles.addButton} onPress={() => setFormData({ ...formData, signOns: [...formData.signOns, { name: '', signature: '' }] })}>
                  <Text style={styles.addButtonText}>Add Worker</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Permit Completion Section */}
          <View style={styles.section}>
            <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('completion')}>
              <Text style={styles.sectionTitle}>Permit Completion</Text>
              <Text style={styles.expandIcon}>{expandedSections.completion ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {expandedSections.completion && (
              <View style={styles.sectionContent}>
                {/* Show final tool count only if Working at Height tool_count is 'yes' */}
                {formData.specializedPermits.workingAtHeight && 
                 formData.specializedPermits.workingAtHeight.tool_count === 'yes' && (
                  <>
                    <Text style={styles.label}>Final Tool Count</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.completion.finalToolCount}
                      onChangeText={text => setFormData({ 
                        ...formData, 
                        completion: { ...formData.completion, finalToolCount: text } 
                      })}
                      placeholder="Enter final tool count"
                      keyboardType="numeric"
                    />
                  </>
                )}
                <Text style={styles.label}>Completion Notes</Text>
                <TextInput
                  style={[styles.input, { minHeight: 80 }]}
                  value={formData.completion.completionNotes}
                  onChangeText={text => setFormData({ 
                    ...formData, 
                    completion: { ...formData.completion, completionNotes: text } 
                  })}
                  placeholder="Enter any additional completion notes"
                  multiline
                  numberOfLines={4}
                />
              </View>
            )}
          </View>

          {/* Submit Button */}
          <View style={styles.submitSection}>
            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
              <Text style={styles.submitButtonText}>Create Permit</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  };

  // Permit List
  // Permit item for lists (edit or view for approval)
  const renderPermitItem = ({ item }) => (
    <View style={styles.permitListCard}>
      <View style={styles.permitListHeader}>
        <Text style={styles.permitId}>#{item.permitNumber}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}> 
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>
      <Text style={styles.permitType}>{item.type}</Text>
      <Text style={styles.permitDescription}>{item.description}</Text>
      <View style={styles.permitDetails}>
        <Text style={styles.detailText}>Location: {item.location}</Text>
        <Text style={styles.detailText}>Requested by: {item.requestedBy}</Text>
        <Text style={styles.detailText}>Date: {formatDateNZ(item.submittedDate || item.approvedDate || item.completedDate || '')}</Text>
      </View>
      <View style={[styles.priorityIndicator, { backgroundColor: getPriorityColor(item.priority) }]}> 
        <Text style={styles.priorityText}>{item.priority?.toUpperCase?.() || ''}</Text>
      </View>

      {/* CONTROLS SUMMARY - Show controls on list cards for all status except completed */}
      {item.status !== 'completed' && (item.specializedPermits || item.singleHazards || item.jsea?.taskSteps) && (
        <View style={{ marginTop: 12, padding: 10, backgroundColor: '#FEF3C7', borderRadius: 6, borderLeftWidth: 3, borderLeftColor: '#F59E0B' }}>
          <Text style={[styles.label, { marginBottom: 6, color: '#D97706', fontSize: 13 }]}>CONTROLS SUMMARY</Text>
          
          {/* Specialized Permits Controls */}
          {item.specializedPermits && Object.entries(item.specializedPermits).some(([_, val]) => val.required && val.questionnaire) && (
            <View style={{ marginBottom: 8 }}>
              <Text style={{ fontWeight: '600', marginBottom: 4, fontSize: 12, color: '#374151' }}>Specialized Permits:</Text>
              {Object.entries(item.specializedPermits).map(([key, val]) => {
                const permit = specializedPermitTypes.find(p => p.key === key);
                return val.required && val.questionnaire ? (
                  <View key={key} style={{ marginLeft: 6, marginBottom: 4 }}>
                    <Text style={[styles.detailText, { fontWeight: '500', color: '#374151', fontSize: 11 }]}>{permit?.label || key}:</Text>
                    {Object.entries(val.questionnaire).map(([qid, qval]) => 
                      qval.controls ? (
                        <Text key={qid} style={[styles.detailText, { marginLeft: 8, color: '#374151', fontSize: 10 }]}>• {qval.controls}</Text>
                      ) : null
                    )}
                  </View>
                ) : null;
              })}
            </View>
          )}

          {/* Single Hazards Controls */}
          {item.singleHazards && Object.entries(item.singleHazards).some(([_, val]) => val.present && val.controls) && (
            <View style={{ marginBottom: 8 }}>
              <Text style={{ fontWeight: '600', marginBottom: 4, fontSize: 12, color: '#374151' }}>Single Hazards:</Text>
              {Object.entries(item.singleHazards).map(([key, val]) => {
                const hazard = singleHazardTypes.find(h => h.key === key);
                return val.present && val.controls ? (
                  <View key={key} style={{ marginLeft: 6, marginBottom: 3 }}>
                    <Text style={[styles.detailText, { color: '#374151', fontSize: 11 }]}>{hazard?.label || key}:</Text>
                    <Text style={[styles.detailText, { marginLeft: 8, color: '#374151', fontSize: 10 }]}>• {val.controls}</Text>
                  </View>
                ) : null;
              })}
            </View>
          )}

          {/* JSEA Task Steps Controls */}
          {item.jsea?.taskSteps && item.jsea.taskSteps.some(step => step.controls) && (
            <View>
              <Text style={{ fontWeight: '600', marginBottom: 4, fontSize: 12, color: '#374151' }}>JSEA Controls:</Text>
              {item.jsea.taskSteps.map((step, idx) => 
                step.controls ? (
                  <View key={idx} style={{ marginLeft: 6, marginBottom: 3 }}>
                    <Text style={[styles.detailText, { color: '#374151', fontSize: 11 }]}>Step {idx + 1}: • {step.controls}</Text>
                  </View>
                ) : null
              )}
            </View>
          )}
        </View>
      )}

      {item.status === 'pending_approval' ? (
        <TouchableOpacity style={styles.primaryButton} onPress={() => {
          setSelectedPermit(item);
          setCurrentScreen('review_permit');
        }}>
          <Text style={styles.primaryButtonText}>View</Text>
        </TouchableOpacity>
      ) : item.status === 'completed' ? (
        <TouchableOpacity style={styles.primaryButton} onPress={() => {
          setSelectedPermit(item);
          setCurrentScreen('view_completed_permit');
        }}>
          <Text style={styles.primaryButtonText}>View</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.primaryButton} onPress={() => {
          setSelectedPermit(item);
          setEditPermitData(null);
          setCurrentScreen('edit_permit');
        }}>
          <Text style={styles.primaryButtonText}>Edit</Text>
        </TouchableOpacity>
      )}
    </View>
  );
  // Permit Review (read-only, for approval)
  // Editable Permit Review (for approval)
  // ...existing code...

  // --- Render Questionnaire for Specialized Permits ---
  function renderQuestionnaire(permitKey, formData, handleQuestionnaireResponse, permitQuestionnaires, styles) {
    const questions = permitQuestionnaires[permitKey] || [];
    const answers = formData.specializedPermits[permitKey]?.questionnaire || {};
    return (
      <View>
        {questions.map((q) => {
          const value = answers[q.id]?.answer || '';
          const controlsValue = answers[q.id]?.controls || '';
          
          // Check if question belongs to a collapsed section
          let sectionId = null;
          if (permitKey === 'blasting') {
            if (['marking_hazards_controlled', 'marking_lv_parking', 'marking_standoff_established', 'marking_standoff_increased', 'marking_standoff_marked', 'marking_bund_break', 'marking_bund_marked', 'marking_weather_checked', 'marking_drill_plan_file', 'marking_edge_protection', 'marking_plan_approved'].includes(q.id)) {
              sectionId = 'marking_section';
            } else if (['drilling_hazards_controlled', 'drilling_inspection_completed', 'drilling_ground_conditions', 'drilling_oriented_distance', 'drilling_oriented_toppling', 'drilling_normal_area', 'drilling_plan_received', 'drilling_log_attached'].includes(q.id)) {
              sectionId = 'drilling_section';
            } else if (['licensed_shot_firer', 'blasting_hazards_controlled', 'blasting_staff_notified', 'blasting_third_parties_consulted', 'blasting_access_bench_clear', 'blasting_geological_changes', 'blasting_drill_reviewed', 'blasting_burden_bore_tracked', 'blasting_burden_front_face', 'blasting_burden_consistent', 'blasting_manager_signoff_required', 'blasting_manager_name', 'blasting_manager_signoff_file', 'blasting_safety_factor', 'blasting_safe_distance_personnel', 'blasting_safe_distance_plant', 'blasting_firing_direction', 'blasting_monitors_set_up', 'blasting_site_plan', 'blasting_holes_below_midc'].includes(q.id)) {
              sectionId = 'blasting_section';
            } else if (['blasting_shottier_position', 'blasting_mgm_approval', 'blasting_personnel_accounted', 'blasting_witness_signatures'].includes(q.id)) {
              sectionId = 'final_checks_section';
            } else if (['blasting_fumex_settled', 'blasting_faces_inspected', 'blasting_all_holes_fired', 'blasting_all_clear'].includes(q.id)) {
              sectionId = 'post_blast_section';
            }
          } else if (permitKey === 'plantServicing') {
            if (['approved_area', 'traffic_diversion_required', 'traffic_scheduled_outside_hours', 'traffic_areas_described', 'traffic_period_described', 'traffic_conflicting_checked', 'traffic_emergency_exits', 'traffic_deliveries_communicated', 'traffic_route_checked', 'traffic_barriers_planned', 'traffic_pedestrian_hazards', 'traffic_alternate_routes', 'traffic_ehs_notified', 'traffic_disruption_communicated', 'tire_safety', 'batteries_protected', 'wheels_removed', 'chocks_used', 'retorque_sop', 'wheel_torque_level', 'retorque_record', 'hydraulic_raising', 'overhead_check', 'bins_empty', 'locks_used', 'pins_props', 'no_person_raised_bucket'].includes(q.id)) {
              sectionId = 'mobile_plant_section';
            }
          } else if (permitKey === 'surveying') {
            if (['loader_operator_advised', 'vehicle_parking', 'haul_road_clear', 'avoid_loaded_stockpile', 'loader_dump_instruction', 'undercut_faces_clear'].includes(q.id)) {
              sectionId = 'stockpile_surveying';
            } else if (['no_unprotected_benches', 'no_edge_protection_standing', 'face_stability', 'avoid_operating_vehicles'].includes(q.id)) {
              sectionId = 'pit_face_surveying';
            }
          }
          if (sectionId && !expandedSections[sectionId]) {
            return null;
          }
          
          // Yes/No/NA radio group for 'yesnona' type
          if (q.type === 'yesnona') {
            // Check dependencies
            let shouldShow = true;
            if (q.dependsOn) {
              const answerValue = answers[q.dependsOn]?.answer;
              if (Array.isArray(q.dependsOnValue)) {
                // dependsOnValue is an array - check if answer matches any value in it
                if (Array.isArray(answerValue)) {
                  shouldShow = answerValue.some(v => q.dependsOnValue.includes(v));
                } else {
                  shouldShow = q.dependsOnValue.includes(answerValue);
                }
              } else {
                // dependsOnValue is a single string
                if (Array.isArray(answerValue)) {
                  // answerValue is array (from multi_checkbox), check if dependsOnValue is in it
                  shouldShow = answerValue.includes(q.dependsOnValue);
                } else {
                  // both are single values
                  shouldShow = answerValue === q.dependsOnValue;
                }
              }
            }
            if (!shouldShow) return null;
            
            return (
              <View key={q.id} style={{ marginBottom: 12, marginLeft: q.dependsOn === 'grinders' ? 32 : 0 }}>
                <Text style={styles.label}>{q.text}{q.required ? ' *' : ''}</Text>
                <View style={{ flexDirection: 'row', marginVertical: 6 }}>
                  {['yes', 'no', 'n/a'].map(opt => (
                    <TouchableOpacity
                      key={opt}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginRight: 18
                      }}
                      onPress={() => handleQuestionnaireResponse(permitKey, q.id, opt)}
                    >
                      <View style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        borderWidth: 2,
                        borderColor: '#2563EB',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 6
                      }}>
                        {value === opt && (
                          <View style={{
                            width: 12,
                            height: 12,
                            borderRadius: 6,
                            backgroundColor: '#2563EB'
                          }} />
                        )}
                      </View>
                      <Text style={{ textTransform: 'capitalize' }}>{opt === 'n/a' ? 'N/A' : opt.charAt(0).toUpperCase() + opt.slice(1)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {/* Conditional rendering based on answer */}
                {value === 'yes' && q.yesLabel && (
                  <View style={{ marginTop: 6 }}>
                    <Text style={styles.label}>{q.yesLabel}</Text>
                    <TextInput
                      style={styles.input}
                      value={answers[q.id]?.text || ''}
                      onChangeText={text => handleQuestionnaireResponse(permitKey, q.id, text, 'text')}
                      placeholder={q.yesLabel}
                    />
                  </View>
                )}
                {value === 'no' && q.noLabel && (
                  <View style={{ marginTop: 6 }}>
                    <Text style={styles.label}>{q.noLabel}</Text>
                    <TextInput
                      style={styles.input}
                      value={controlsValue}
                      onChangeText={text => handleQuestionnaireResponse(permitKey, q.id, text, 'controls')}
                      placeholder={q.noLabel}
                    />
                  </View>
                )}
                {/* Show controls when answer matches controlsOn (defaults to 'yes') and no yesLabel/noLabel */}
                {!q.noControls && !q.yesLabel && !q.noLabel && value === (q.controlsOn || 'yes') && (
                  <View style={{ marginTop: 6 }}>
                    <Text style={styles.label}>Controls for this question:</Text>
                    <TextInput
                      style={styles.input}
                      value={controlsValue}
                      onChangeText={text => handleQuestionnaireResponse(permitKey, q.id, text, 'controls')}
                      placeholder="Describe controls for this hazard/question"
                    />
                  </View>
                )}
                {/* Blocking warning */}
                {q.blockingQuestion && value === (q.blockingAnswer || 'no') && (
                  <View style={{ marginTop: 12, padding: 12, backgroundColor: '#FEE2E2', borderRadius: 6, borderLeftWidth: 4, borderLeftColor: '#DC2626' }}>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#DC2626', textAlign: 'center' }}>⚠️ PERMIT CAN NOT BE ISSUED</Text>
                    <Text style={{ fontSize: 12, color: '#991B1B', marginTop: 8, marginBottom: 4 }}>Reason:</Text>
                    <Text style={{ fontSize: 11, color: '#991B1B', marginLeft: 8 }}>• {q.text}</Text>
                  </View>
                )}
              </View>
            );
          }
          // Section header
          if (q.type === 'section') {
            // Check dependencies for section header
            let shouldShowSection = true;
            if (q.dependsOn) {
              if (Array.isArray(q.dependsOn)) {
                // Multiple dependencies - check if ANY match (OR logic)
                shouldShowSection = q.dependsOn.some((depId, index) => {
                  const answerValue = answers[depId]?.answer;
                  const depValue = Array.isArray(q.dependsOnValue) ? q.dependsOnValue[index] : q.dependsOnValue;
                  if (Array.isArray(answerValue)) {
                    return answerValue.includes(depValue);
                  } else {
                    return answerValue === depValue;
                  }
                });
              } else {
                // Single dependency
                const answerValue = answers[q.dependsOn]?.answer;
                if (Array.isArray(q.dependsOnValue)) {
                  if (Array.isArray(answerValue)) {
                    shouldShowSection = answerValue.some(v => q.dependsOnValue.includes(v));
                  } else {
                    shouldShowSection = q.dependsOnValue.includes(answerValue);
                  }
                } else {
                  if (Array.isArray(answerValue)) {
                    shouldShowSection = answerValue.includes(q.dependsOnValue);
                  } else {
                    shouldShowSection = answerValue === q.dependsOnValue;
                  }
                }
              }
            }
            if (!shouldShowSection) return null;
            
            return (
              <View key={q.id} style={{ marginTop: 16 }}>
                <TouchableOpacity 
                  style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8 }}
                  onPress={() => toggleSection(q.id)}
                >
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1F2937', borderBottomWidth: 2, borderBottomColor: '#2563EB', paddingBottom: 6, flex: 1 }}>
                    {q.text}
                  </Text>
                  <Text style={{ fontSize: 16, marginLeft: 8 }}>{expandedSections[q.id] ? '▲' : '▼'}</Text>
                </TouchableOpacity>
                {q.note && (
                  <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 6, fontStyle: 'italic' }}>
                    {q.note}
                  </Text>
                )}
              </View>
            );
          }
          // Conditionally render question based on section expansion
          if (q.type !== 'section' && q.type !== 'yesno' && q.type !== 'yesno_text' && q.type !== 'yesnona' && q.type !== 'text' && q.type !== 'radio' && q.type !== 'multi_checkbox' && q.type !== 'attachment') {
            return null;
          }
          // Yes/No radio group
          if (q.type === 'yesno') {
            // Skip if this should only be rendered inline
            if (q.inlineOnly) return null;
            
            // Check dependencies
            let shouldShow = true;
            if (q.dependsOn) {
              const answerValue = answers[q.dependsOn]?.answer;
              if (Array.isArray(q.dependsOnValue)) {
                // dependsOnValue is an array - check if answer matches any value in it
                if (Array.isArray(answerValue)) {
                  shouldShow = answerValue.some(v => q.dependsOnValue.includes(v));
                } else {
                  shouldShow = q.dependsOnValue.includes(answerValue);
                }
              } else {
                // dependsOnValue is a single string
                if (Array.isArray(answerValue)) {
                  // answerValue is array (from multi_checkbox), check if dependsOnValue is in it
                  shouldShow = answerValue.includes(q.dependsOnValue);
                } else {
                  // both are single values
                  shouldShow = answerValue === q.dependsOnValue;
                }
              }
            }
            if (!shouldShow) return null;
            
            return (
              <View key={q.id} style={{ marginBottom: 12, marginLeft: q.dependsOn === 'grinders' ? 32 : 0 }}>
                <Text style={styles.label}>{q.text}{q.required ? ' *' : ''}</Text>
                <View style={{ flexDirection: 'row', marginVertical: 6 }}>
                  {['yes', 'no'].map(opt => (
                    <TouchableOpacity
                      key={opt}
                      style={{ flexDirection: 'row', alignItems: 'center', marginRight: 18 }}
                      onPress={() => handleQuestionnaireResponse(permitKey, q.id, opt)}
                    >
                      <View style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        borderWidth: 2,
                        borderColor: '#2563EB',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 6
                      }}>
                        {value === opt && (
                          <View style={{
                            width: 12,
                            height: 12,
                            borderRadius: 6,
                            backgroundColor: '#2563EB'
                          }} />
                        )}
                      </View>
                      <Text style={{ textTransform: 'capitalize' }}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {q.note && (
                  <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 6, fontStyle: 'italic' }}>
                    {q.note}
                  </Text>
                )}
                {/* Show controls when answer matches controlsOn (defaults to 'yes') */}
                {!q.noControls && value === (q.controlsOn || 'yes') && (
                  <View style={{ marginTop: 6 }}>
                    <Text style={styles.label}>{q.controlsLabel || 'Controls for this question:'}</Text>
                    <TextInput
                      style={styles.input}
                      value={controlsValue}
                      onChangeText={text => handleQuestionnaireResponse(permitKey, q.id, text, 'controls')}
                      placeholder="Describe controls for this hazard/question"
                    />
                  </View>
                )}
                {/* Blocking warning */}
                {q.blockingQuestion && value === (q.blockingAnswer || 'no') && (
                  <View style={{ marginTop: 12, padding: 12, backgroundColor: '#FEE2E2', borderRadius: 6, borderLeftWidth: 4, borderLeftColor: '#DC2626' }}>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#DC2626', textAlign: 'center' }}>⚠️ PERMIT CAN NOT BE ISSUED</Text>
                    <Text style={{ fontSize: 12, color: '#991B1B', marginTop: 8, marginBottom: 4 }}>Reason:</Text>
                    <Text style={{ fontSize: 11, color: '#991B1B', marginLeft: 8 }}>• {q.text}</Text>
                  </View>
                )}
                {/* Render inline dependent questions for yesno */}
                {value === 'yes' && (
                  <View style={{ marginLeft: 36, marginTop: 12 }}>
                    {questions.map((depQ) => {
                      if (depQ.dependsOn === q.id && depQ.dependsOnValue === 'yes' && depQ.inlineOnly) {
                        const depValue = answers[depQ.id]?.answer || '';
                        const depControlsValue = answers[depQ.id]?.controls || '';
                        
                        if (depQ.type === 'yesno') {
                          return (
                            <View key={depQ.id} style={{ marginBottom: 12 }}>
                              <Text style={styles.label}>{depQ.text}{depQ.required ? ' *' : ''}</Text>
                              {depQ.note && <Text style={styles.noteText}>{depQ.note}</Text>}
                              <View style={{ flexDirection: 'row', marginVertical: 6 }}>
                                {['yes', 'no'].map(depOpt => (
                                  <TouchableOpacity
                                    key={depOpt}
                                    style={{ flexDirection: 'row', alignItems: 'center', marginRight: 18 }}
                                    onPress={() => handleQuestionnaireResponse(permitKey, depQ.id, depOpt)}
                                  >
                                    <View style={{
                                      width: 20,
                                      height: 20,
                                      borderRadius: 10,
                                      borderWidth: 2,
                                      borderColor: '#2563EB',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      marginRight: 6
                                    }}>
                                      {depValue === depOpt && (
                                        <View style={{
                                          width: 12,
                                          height: 12,
                                          borderRadius: 6,
                                          backgroundColor: '#2563EB'
                                        }} />
                                      )}
                                    </View>
                                    <Text style={{ textTransform: 'capitalize' }}>{depOpt.charAt(0).toUpperCase() + depOpt.slice(1)}</Text>
                                  </TouchableOpacity>
                                ))}
                              </View>
                              {/* Show controls when answer matches controlsOn (defaults to 'yes') */}
                              {!depQ.noControls && depValue === (depQ.controlsOn || 'yes') && (
                                <View style={{ marginTop: 6 }}>
                                  <Text style={styles.label}>Controls for this question:</Text>
                                  <TextInput
                                    style={styles.input}
                                    value={depControlsValue}
                                    onChangeText={text => handleQuestionnaireResponse(permitKey, depQ.id, text, 'controls')}
                                    placeholder="Describe controls for this hazard/question"
                                  />
                                </View>
                              )}
                            </View>
                          );
                        }
                      }
                      return null;
                    })}
                  </View>
                )}
              </View>
            );
          }
          // Yes/No + text
          if (q.type === 'yesno_text') {
            return (
              <View key={q.id} style={{ marginBottom: 12 }}>
                <Text style={styles.label}>{q.text}{q.required ? ' *' : ''}</Text>
                <View style={{ flexDirection: 'row', marginVertical: 6 }}>
                  {['yes', 'no'].map(opt => (
                    <TouchableOpacity
                      key={opt}
                      style={{ flexDirection: 'row', alignItems: 'center', marginRight: 18 }}
                      onPress={() => handleQuestionnaireResponse(permitKey, q.id, opt)}
                    >
                      <View style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        borderWidth: 2,
                        borderColor: '#2563EB',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 6
                      }}>
                        {value === opt && (
                          <View style={{
                            width: 12,
                            height: 12,
                            borderRadius: 6,
                            backgroundColor: '#2563EB'
                          }} />
                        )}
                      </View>
                      <Text style={{ textTransform: 'capitalize' }}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {/* Conditional rendering based on answer */}
                {value === 'yes' && q.yesLabel && (
                  <View style={{ marginTop: 6 }}>
                    <Text style={styles.label}>{q.yesLabel}</Text>
                    <TextInput
                      style={styles.input}
                      value={answers[q.id]?.text || ''}
                      onChangeText={text => handleQuestionnaireResponse(permitKey, q.id, text, 'text')}
                      placeholder={q.yesLabel}
                    />
                  </View>
                )}
                {value === 'no' && q.noLabel && (
                  <View style={{ marginTop: 6 }}>
                    <Text style={styles.label}>{q.noLabel}</Text>
                    <TextInput
                      style={styles.input}
                      value={controlsValue}
                      onChangeText={text => handleQuestionnaireResponse(permitKey, q.id, text, 'controls')}
                      placeholder={q.noLabel}
                    />
                  </View>
                )}
                {/* Fallback to original behavior if no yesLabel/noLabel */}
                {!q.yesLabel && !q.noLabel && value === (q.textLabelOn || 'yes') && (
                  <>
                    <Text style={styles.label}>{q.textLabel || 'Details'}</Text>
                    <TextInput
                      style={styles.input}
                      value={answers[q.id]?.text || ''}
                      onChangeText={text => handleQuestionnaireResponse(permitKey, q.id, text, 'text')}
                      placeholder={q.textLabel || 'Details'}
                    />
                    {!q.noControls && value === (q.controlsOn || 'yes') && (
                      <View style={{ marginTop: 6 }}>
                        <Text style={styles.label}>Controls for this question:</Text>
                        <TextInput
                          style={styles.input}
                          value={controlsValue}
                          onChangeText={text => handleQuestionnaireResponse(permitKey, q.id, text, 'controls')}
                          placeholder="Describe controls for this hazard/question"
                        />
                      </View>
                    )}
                  </>
                )}
                {/* Render inline dependent questions for yesno_text */}
                {value === 'yes' && (
                  <View style={{ marginLeft: 0, marginTop: 12 }}>
                    {questions.map((depQ) => {
                      if (depQ.dependsOn === q.id && depQ.dependsOnValue === 'yes' && depQ.inlineOnly) {
                        const depValue = answers[depQ.id]?.answer || '';
                        const depControlsValue = answers[depQ.id]?.controls || '';
                        
                        if (depQ.type === 'yesno') {
                          return (
                            <View key={depQ.id} style={{ marginBottom: 12 }}>
                              <Text style={styles.label}>{depQ.text}{depQ.required ? ' *' : ''}</Text>
                              {depQ.note && <Text style={styles.noteText}>{depQ.note}</Text>}
                              <View style={{ flexDirection: 'row', marginVertical: 6 }}>
                                {['yes', 'no'].map(depOpt => (
                                  <TouchableOpacity
                                    key={depOpt}
                                    style={{ flexDirection: 'row', alignItems: 'center', marginRight: 18 }}
                                    onPress={() => handleQuestionnaireResponse(permitKey, depQ.id, depOpt)}
                                  >
                                    <View style={{
                                      width: 20,
                                      height: 20,
                                      borderRadius: 10,
                                      borderWidth: 2,
                                      borderColor: '#2563EB',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      marginRight: 6
                                    }}>
                                      {depValue === depOpt && (
                                        <View style={{
                                          width: 12,
                                          height: 12,
                                          borderRadius: 6,
                                          backgroundColor: '#2563EB'
                                        }} />
                                      )}
                                    </View>
                                    <Text style={{ textTransform: 'capitalize' }}>{depOpt.charAt(0).toUpperCase() + depOpt.slice(1)}</Text>
                                  </TouchableOpacity>
                                ))}
                              </View>
                              {/* Show controls when answer matches controlsOn (defaults to 'yes') */}
                              {!depQ.noControls && depValue === (depQ.controlsOn || 'yes') && (
                                <View style={{ marginTop: 6 }}>
                                  <Text style={styles.label}>Controls for this question:</Text>
                                  <TextInput
                                    style={styles.input}
                                    value={depControlsValue}
                                    onChangeText={text => handleQuestionnaireResponse(permitKey, depQ.id, text, 'controls')}
                                    placeholder="Describe controls for this hazard/question"
                                  />
                                </View>
                              )}
                            </View>
                          );
                        }
                      }
                      return null;
                    })}
                  </View>
                )}
              </View>
            );
          }
          // Radio buttons with custom options
          if (q.type === 'radio') {
            return (
              <View key={q.id} style={{ marginBottom: 12 }}>
                <Text style={styles.label}>{q.text}{q.required ? ' *' : ''}</Text>
                <View style={{ flexDirection: 'row', marginVertical: 6, flexWrap: 'wrap' }}>
                  {(q.options || []).map(opt => (
                    <TouchableOpacity
                      key={opt}
                      style={{ flexDirection: 'row', alignItems: 'center', marginRight: 18, marginBottom: 8 }}
                      onPress={() => handleQuestionnaireResponse(permitKey, q.id, opt)}
                    >
                      <View style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        borderWidth: 2,
                        borderColor: '#2563EB',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 6
                      }}>
                        {value === opt && (
                          <View style={{
                            width: 12,
                            height: 12,
                            borderRadius: 6,
                            backgroundColor: '#2563EB'
                          }} />
                        )}
                      </View>
                      <Text>{opt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            );
          }
          // Multiple checkboxes with optional text inputs
          if (q.type === 'multi_checkbox') {
            let dependencyMet = !q.dependsOn;
            if (q.dependsOn) {
              const answerValue = answers[q.dependsOn]?.answer;
              if (Array.isArray(q.dependsOnValue)) {
                // Check if answer is in array of values
                dependencyMet = Array.isArray(answerValue) 
                  ? answerValue.some(v => q.dependsOnValue.includes(v))
                  : q.dependsOnValue.includes(answerValue);
              } else {
                // Check if answer matches single value
                dependencyMet = answerValue === q.dependsOnValue;
              }
            }
            if (!dependencyMet) return null;
            
            const selectedValues = value ? (Array.isArray(value) ? value : [value]) : [];
            
            return (
              <View key={q.id} style={{ marginBottom: 12 }}>
                <Text style={styles.label}>{q.text}{q.required ? ' *' : ''}</Text>
                <View style={{ marginVertical: 6 }}>
                  {(q.options || []).map((opt) => (
                    <View key={opt.value} style={{ marginBottom: 10 }}>
                      <TouchableOpacity
                        style={{ flexDirection: 'row', alignItems: 'center' }}
                        onPress={() => {
                          const newValues = selectedValues.includes(opt.value)
                            ? selectedValues.filter(v => v !== opt.value)
                            : [...selectedValues, opt.value];
                          handleQuestionnaireResponse(permitKey, q.id, newValues);
                        }}
                      >
                        <View style={{
                          width: 20,
                          height: 20,
                          borderRadius: 4,
                          borderWidth: 2,
                          borderColor: '#2563EB',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 8
                        }}>
                          {selectedValues.includes(opt.value) && (
                            <Text style={{ fontSize: 14, color: '#2563EB', fontWeight: 'bold' }}>✓</Text>
                          )}
                        </View>
                        <Text>{opt.label}</Text>
                      </TouchableOpacity>
                      {selectedValues.includes(opt.value) && opt.textLabel && (
                        <TextInput
                          style={[styles.input, { marginTop: 6, marginLeft: 36 }]}
                          value={answers[q.id]?.[opt.value] || ''}
                          onChangeText={text => {
                            const currentData = answers[q.id] || {};
                            handleQuestionnaireResponse(permitKey, q.id, { ...currentData, [opt.value]: text }, 'answer');
                          }}
                          placeholder={opt.textLabel}
                        />
                      )}
                      {/* Render dependent questions for this checkbox */}
                      {selectedValues.includes(opt.value) && (
                        <View style={{ marginLeft: 36, marginTop: 10 }}>
                          {questions.map((depQ) => {
                            if (depQ.dependsOn === q.id && depQ.dependsOnValue === opt.value) {
                              const depValue = answers[depQ.id]?.answer || '';
                              const depControlsValue = answers[depQ.id]?.controls || '';
                              
                              if (depQ.type === 'yesno') {
                                return (
                                  <View key={depQ.id} style={{ marginBottom: 12 }}>
                                    <Text style={styles.label}>{depQ.text}{depQ.required ? ' *' : ''}</Text>
                                    <View style={{ flexDirection: 'row', marginVertical: 6 }}>
                                      {['yes', 'no'].map(depOpt => (
                                        <TouchableOpacity
                                          key={depOpt}
                                          style={{ flexDirection: 'row', alignItems: 'center', marginRight: 18 }}
                                          onPress={() => handleQuestionnaireResponse(permitKey, depQ.id, depOpt)}
                                        >
                                          <View style={{
                                            width: 20,
                                            height: 20,
                                            borderRadius: 10,
                                            borderWidth: 2,
                                            borderColor: '#2563EB',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            marginRight: 6
                                          }}>
                                            {depValue === depOpt && (
                                              <View style={{
                                                width: 12,
                                                height: 12,
                                                borderRadius: 6,
                                                backgroundColor: '#2563EB'
                                              }} />
                                            )}
                                          </View>
                                          <Text style={{ textTransform: 'capitalize' }}>{depOpt.charAt(0).toUpperCase() + depOpt.slice(1)}</Text>
                                        </TouchableOpacity>
                                      ))}
                                    </View>
                                    {/* Show controls when answer matches controlsOn (defaults to 'yes') */}
                                    {!depQ.noControls && depValue === (depQ.controlsOn || 'yes') && (
                                      <View style={{ marginTop: 6 }}>
                                        <Text style={styles.label}>Controls for this question:</Text>
                                        <TextInput
                                          style={styles.input}
                                          value={depControlsValue}
                                          onChangeText={text => handleQuestionnaireResponse(permitKey, depQ.id, text, 'controls')}
                                          placeholder="Describe controls for this hazard/question"
                                        />
                                      </View>
                                    )}
                                  </View>
                                );
                              }
                              
                              // Handle attachment type questions with dependencies
                              if (depQ.type === 'attachment') {
                                // Check if this attachment depends on a yesno answer
                                let shouldShowAttachment = true;
                                if (depQ.dependsOn) {
                                  const parentAnswerValue = answers[depQ.dependsOn]?.answer;
                                  if (Array.isArray(depQ.dependsOnValue)) {
                                    shouldShowAttachment = Array.isArray(parentAnswerValue) 
                                      ? parentAnswerValue.some(v => depQ.dependsOnValue.includes(v))
                                      : depQ.dependsOnValue.includes(parentAnswerValue);
                                  } else {
                                    shouldShowAttachment = Array.isArray(parentAnswerValue)
                                      ? parentAnswerValue.includes(depQ.dependsOnValue)
                                      : parentAnswerValue === depQ.dependsOnValue;
                                  }
                                }
                                
                                if (!shouldShowAttachment) return null;
                                
                                const fileName = depValue ? (typeof depValue === 'string' ? depValue.split('/').pop() : 'Document attached') : null;
                                
                                return (
                                  <View key={depQ.id} style={{ marginBottom: 12 }}>
                                    <Text style={styles.label}>{depQ.text}{depQ.required ? ' *' : ''}</Text>
                                    {depQ.note && <Text style={styles.noteText}>{depQ.note}</Text>}
                                    <TouchableOpacity style={styles.attachmentButton} onPress={() => pickDocument(permitKey, depQ.id)}>
                                      <Text style={styles.attachmentButtonText}>{fileName ? '📎 ' + fileName : 'Choose File'}</Text>
                                    </TouchableOpacity>
                                    {fileName && (
                                      <TouchableOpacity onPress={() => handleQuestionnaireResponse(permitKey, depQ.id, '')}>
                                        <Text style={styles.removeButton}>Remove</Text>
                                      </TouchableOpacity>
                                    )}
                                  </View>
                                );
                              }
                              return null;
                            }
                            return null;
                          })}
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            );
          }
          // Text only
          if (q.type === 'text') {
            // Check dependencies
            let shouldShow = true;
            if (q.dependsOn) {
              const answerValue = answers[q.dependsOn]?.answer;
              if (Array.isArray(q.dependsOnValue)) {
                // dependsOnValue is an array - check if answer matches any value in it
                if (Array.isArray(answerValue)) {
                  shouldShow = answerValue.some(v => q.dependsOnValue.includes(v));
                } else {
                  shouldShow = q.dependsOnValue.includes(answerValue);
                }
              } else {
                // dependsOnValue is a single string
                if (Array.isArray(answerValue)) {
                  // answerValue is array (from multi_checkbox), check if dependsOnValue is in it
                  shouldShow = answerValue.includes(q.dependsOnValue);
                } else {
                  // both are single values
                  shouldShow = answerValue === q.dependsOnValue;
                }
              }
            }
            if (!shouldShow) return null;
            
            return (
              <View key={q.id} style={{ marginBottom: 12 }}>
                <Text style={styles.label}>{q.text}{q.required ? ' *' : ''}</Text>
                <TextInput
                  style={styles.input}
                  value={value}
                  onChangeText={text => handleQuestionnaireResponse(permitKey, q.id, text)}
                  placeholder={q.textLabel || 'Enter answer'}
                />
              </View>
            );
          }
          // Attachment upload
          if (q.type === 'attachment') {
            // Check dependencies - supports both single and multiple dependsOn
            let shouldShow = true;
            if (q.dependsOn) {
              if (Array.isArray(q.dependsOn)) {
                // Multiple dependencies - OR logic (show if ANY dependency matches)
                shouldShow = q.dependsOn.some(depField => {
                  const answerValue = answers[depField]?.answer;
                  if (Array.isArray(q.dependsOnValue)) {
                    if (Array.isArray(answerValue)) {
                      return answerValue.some(v => q.dependsOnValue.includes(v));
                    } else {
                      return q.dependsOnValue.includes(answerValue);
                    }
                  } else {
                    if (Array.isArray(answerValue)) {
                      return answerValue.includes(q.dependsOnValue);
                    } else {
                      return answerValue === q.dependsOnValue;
                    }
                  }
                });
              } else {
                // Single dependency
                const answerValue = answers[q.dependsOn]?.answer;
                if (Array.isArray(q.dependsOnValue)) {
                  if (Array.isArray(answerValue)) {
                    shouldShow = answerValue.some(v => q.dependsOnValue.includes(v));
                  } else {
                    shouldShow = q.dependsOnValue.includes(answerValue);
                  }
                } else {
                  if (Array.isArray(answerValue)) {
                    shouldShow = answerValue.includes(q.dependsOnValue);
                  } else {
                    shouldShow = answerValue === q.dependsOnValue;
                  }
                }
              }
            }
            if (!shouldShow) return null;
            
            const fileName = value ? (typeof value === 'string' ? value.split('/').pop() : 'Document attached') : null;
            
            return (
              <View key={q.id} style={{ marginBottom: 12 }}>
                <Text style={styles.label}>{q.text}{q.required ? ' *' : ''}</Text>
                {q.note && <Text style={{ color: '#6B7280', marginBottom: 6, fontSize: 12 }}>{q.note}</Text>}
                <TouchableOpacity style={{
                  borderWidth: 2,
                  borderStyle: 'dashed',
                  borderColor: '#D1D5DB',
                  borderRadius: 6,
                  padding: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#F9FAFB'
                }}>
                  <Text style={{ fontSize: 24, marginBottom: 8 }}>📎</Text>
                  <Text style={{ color: '#2563EB', fontWeight: '500', textAlign: 'center' }}>Tap to attach document</Text>
                  {fileName && (
                    <Text style={{ color: '#059669', marginTop: 8, fontSize: 12 }}>✓ {fileName}</Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          }
          // Fallback
          return null;
        })}
      </View>
    );
  }

// Standalone component for reviewing/editing a permit for approval
function ReviewPermitScreen({ permit, setPermits, setCurrentScreen, permits, styles }) {
  const initialSpecializedPermits = Object.fromEntries(specializedPermitTypes.map(p => [p.key, { required: false, controls: '', questionnaire: {} }]));
  const initialSingleHazards = Object.fromEntries(singleHazardTypes.map(h => [h.key, { present: false, controls: '' }]));
  const initialJSEA = { taskSteps: [], overallRiskRating: '', additionalPrecautions: '' };
  const initialIsolations = [];
  const initialSignOns = [];
  const [editData] = React.useState({
    ...permit,
    specializedPermits: permit.specializedPermits || initialSpecializedPermits,
    singleHazards: permit.singleHazards || initialSingleHazards,
    jsea: permit.jsea || initialJSEA,
    isolations: permit.isolations || initialIsolations,
    signOns: permit.signOns || initialSignOns
  });
  const isCompleted = permit.status === 'completed';
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F9FAFB' }} contentContainerStyle={{ padding: 16 }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setCurrentScreen(isCompleted ? 'completed' : 'pending_approval')}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{isCompleted ? `Completed Permit ${permit.id}` : `Review/Edit Permit ${permit.id}`}</Text>
      </View>
      <View style={styles.sectionContent}>
        <Text style={styles.label}>Description:</Text>
        <Text style={styles.detailText}>{editData.description || ''}</Text>
        <Text style={styles.label}>Location:</Text>
        <Text style={styles.detailText}>{editData.location || ''}</Text>
        <Text style={styles.label}>Requested By:</Text>
        <Text style={styles.detailText}>{editData.requestedBy || ''}</Text>
        <Text style={styles.label}>Priority:</Text>
        <Text style={styles.detailText}>{editData.priority || ''}</Text>
        <Text style={styles.label}>Status:</Text>
        <Text style={styles.detailText}>{editData.status || ''}</Text>
        <Text style={styles.label}>Dates:</Text>
        <Text style={styles.detailText}>Start: {editData.startDate} {editData.startTime}</Text>
        <Text style={styles.detailText}>End: {editData.endDate} {editData.endTime}</Text>

        {/* CONTROLS SUMMARY - Show all controls in one place */}
        {(editData.specializedPermits || editData.singleHazards || editData.jsea?.taskSteps) && (
          <View style={{ marginTop: 20, padding: 12, backgroundColor: '#FEF3C7', borderRadius: 8, borderLeftWidth: 4, borderLeftColor: '#F59E0B' }}>
            <Text style={[styles.label, { marginBottom: 8, color: '#D97706' }]}>CONTROLS SUMMARY</Text>
            
            {/* Specialized Permits Controls */}
            {editData.specializedPermits && Object.entries(editData.specializedPermits).some(([_, val]) => val.required && val.questionnaire) && (
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontWeight: 'bold', marginBottom: 6 }}>Specialized Permits:</Text>
                {Object.entries(editData.specializedPermits).map(([key, val]) => {
                  const permit = specializedPermitTypes.find(p => p.key === key);
                  return val.required && val.questionnaire ? (
                    <View key={key} style={{ marginLeft: 8, marginBottom: 8 }}>
                      <Text style={[styles.detailText, { fontWeight: '600', color: '#374151' }]}>{permit?.label || key}:</Text>
                      {Object.entries(val.questionnaire).map(([qid, qval]) => 
                        qval.controls ? (
                          <Text key={qid} style={[styles.detailText, { marginLeft: 8, color: '#374151' }]}>• {qval.controls}</Text>
                        ) : null
                      )}
                    </View>
                  ) : null;
                })}
              </View>
            )}

            {/* Single Hazards Controls */}
            {editData.singleHazards && Object.entries(editData.singleHazards).some(([_, val]) => val.present && val.controls) && (
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontWeight: 'bold', marginBottom: 6 }}>Single Hazards:</Text>
                {Object.entries(editData.singleHazards).map(([key, val]) => {
                  const hazard = singleHazardTypes.find(h => h.key === key);
                  return val.present && val.controls ? (
                    <View key={key} style={{ marginLeft: 8, marginBottom: 6 }}>
                      <Text style={[styles.detailText, { color: '#374151' }]}>{hazard?.label || key}:</Text>
                      <Text style={[styles.detailText, { marginLeft: 8, color: '#374151' }]}>• {val.controls}</Text>
                    </View>
                  ) : null;
                })}
              </View>
            )}

            {/* JSEA Task Steps Controls */}
            {editData.jsea?.taskSteps && editData.jsea.taskSteps.some(step => step.controls) && (
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontWeight: 'bold', marginBottom: 6 }}>JSEA Task Controls:</Text>
                {editData.jsea.taskSteps.map((step, idx) => 
                  step.controls ? (
                    <View key={idx} style={{ marginLeft: 8, marginBottom: 6 }}>
                      <Text style={[styles.detailText, { color: '#374151' }]}>Step {idx + 1} ({step.step}):</Text>
                      <Text style={[styles.detailText, { marginLeft: 8, color: '#374151' }]}>• {step.controls}</Text>
                    </View>
                  ) : null
                )}
              </View>
            )}
          </View>
        )}

        {/* Specialized Permits - always show all, indicate if not required */}
        {editData.specializedPermits && (
          <View style={{ marginTop: 12 }}>
            <Text style={styles.label}>Specialized Permits:</Text>
            {Object.entries(editData.specializedPermits).map(([key, val]) => {
              const permit = specializedPermitTypes.find(p => p.key === key);
              return (
              <View key={key} style={{ marginBottom: 8 }}>
                <Text style={{ fontWeight: 'bold' }}>{permit?.label || key} {val.required ? '' : '(not required)'}</Text>
                {val.required && val.questionnaire && Object.entries(val.questionnaire).map(([qid, qval]) => {
                  // Find the question object to get its text label
                  const questionDef = permitQuestionnaires[key]?.find(q => q.id === qid);
                  const questionLabel = questionDef?.text || qid;
                  return (
                  <View key={qid} style={{ marginLeft: 8 }}>
                    <Text style={styles.detailText}>{questionLabel}: {qval.answer || qval.text || ''} {qval.controls ? `(Controls: ${qval.controls})` : ''}</Text>
                  </View>
                  );
                })}
              </View>
            );
            })}
          </View>
        )}
        {/* Single Hazards */}
        {editData.singleHazards && (
          <View style={{ marginTop: 12 }}>
            <Text style={styles.label}>Single Hazards:</Text>
            {Object.entries(editData.singleHazards).map(([key, val]) => val.present ? (
              <View key={key} style={{ marginBottom: 8 }}>
                <Text style={{ fontWeight: 'bold' }}>{key}</Text>
                <Text style={styles.detailText}>Controls: {val.controls}</Text>
              </View>
            ) : null)}
          </View>
        )}
        {/* Isolations */}
        {editData.isolations && editData.isolations.length > 0 && (
          <View style={{ marginTop: 12 }}>
            <Text style={styles.label}>Isolations:</Text>
            {editData.isolations.map((isolation, idx) => (
              <View key={idx} style={{ marginBottom: 8, marginLeft: 8, padding: 8, backgroundColor: '#F9FAFB', borderRadius: 6 }}>
                <Text style={styles.detailText}>Isolation {idx + 1}: {isolation.what}</Text>
                <Text style={styles.detailText}>Isolated by: {isolation.isolatedBy}</Text>
                <Text style={styles.detailText}>Date: {formatDateNZ(isolation.date)}</Text>
              </View>
            ))}
          </View>
        )}
        {/* JSEA */}
        {editData.jsea && (
          <View style={{ marginTop: 12 }}>
            <Text style={styles.label}>JSEA Task Steps:</Text>
            {editData.jsea.taskSteps && editData.jsea.taskSteps.length > 0 ? editData.jsea.taskSteps.map((step, idx) => (
              <View key={idx} style={{ marginBottom: 8, marginLeft: 8 }}>
                <Text style={styles.detailText}>Step {idx + 1}: {step.step}</Text>
                <Text style={styles.detailText}>Hazards: {step.hazards}</Text>
                <Text style={styles.detailText}>Controls: {step.controls}</Text>
                <Text style={styles.detailText}>Risk: {step.riskLevel}</Text>
              </View>
            )) : <Text style={styles.detailText}>None</Text>}
            <Text style={styles.label}>Overall Risk Rating: <Text style={{ fontWeight: 'normal' }}>{editData.jsea.overallRiskRating}</Text></Text>
            <Text style={styles.label}>Additional Precautions:</Text>
            <Text style={styles.detailText}>{editData.jsea.additionalPrecautions}</Text>
          </View>
        )}
        {/* Sign-Ons */}
        {editData.signOns && editData.signOns.length > 0 && (
          <View style={{ marginTop: 12 }}>
            <Text style={styles.label}>Sign-On (Other Workers):</Text>
            {editData.signOns.map((signOn, idx) => (
              <View key={idx} style={{ marginBottom: 8, marginLeft: 8 }}>
                <Text style={styles.detailText}>Name: {signOn.name}</Text>
                <Text style={styles.detailText}>Signature: {signOn.signature}</Text>
              </View>
            ))}
          </View>
        )}
        {/* Completed Sign-Off */}
        {isCompleted && editData.completedSignOff && (
          <View style={{ marginTop: 24, padding: 12, backgroundColor: '#E5E7EB', borderRadius: 8 }}>
            <Text style={[styles.label, { marginBottom: 8 }]}>Completion Sign-Off</Text>
            <Text style={styles.detailText}>Permit Issuer Name: {editData.completedSignOff.issuerName}</Text>
            <Text style={styles.detailText}>Issuer Signature: {editData.completedSignOff.issuerSignature}</Text>
            {editData.completedSignOff.issuerSignedAt && (
              <Text style={styles.detailText}>Issuer Signed At: {editData.completedSignOff.issuerSignedAt}</Text>
            )}
            <Text style={styles.detailText}>Permit Receiver Name: {editData.completedSignOff.receiverName}</Text>
            <Text style={styles.detailText}>Receiver Signature: {editData.completedSignOff.receiverSignature}</Text>
            {editData.completedSignOff.receiverSignedAt && (
              <Text style={styles.detailText}>Receiver Signed At: {editData.completedSignOff.receiverSignedAt}</Text>
            )}
          </View>
        )}
      </View>
      {/* Only show Approve/Reject if not completed */}
      {!isCompleted && (
        <View style={styles.submitSection}>
          <TouchableOpacity style={styles.submitButton} onPress={async () => {
            Alert.alert('Debug', 'Approve button clicked');
            // Approve: set status to 'pending_inspection' and update permit
            const highRiskSpecials = ['hotWork', 'confinedSpace', 'workingAtHeight', 'electrical', 'lifting', 'blasting'];
            const isHighRisk = ['high', 'very_high'].includes(editData.jsea?.overallRiskRating?.toLowerCase?.()) ||
              (editData.specializedPermits && Object.keys(editData.specializedPermits).some(key => highRiskSpecials.includes(key) && editData.specializedPermits[key]?.required));
            
            const newStatus = isHighRisk ? 'pending_inspection' : 'active';
            const approvedDate = new Date().toISOString().split('T')[0];
            
            try {
              console.log('Approving permit:', editData.id, 'New status:', newStatus);
              // Update in Supabase
              const result = await updatePermit(editData.id, {
                status: newStatus,
                approved_date: approvedDate
              });
              console.log('Update result:', result);
              
              // Reload all permits to get fresh data from database
              const freshPermits = await listPermits();
              setPermits(freshPermits);
              
              setCurrentScreen('dashboard');
              Alert.alert('Permit Approved', isHighRisk ? 'Permit has been approved and moved to Needs Inspection.' : 'Permit has been approved and is now Active.');
            } catch (error) {
              console.error('Error approving permit:', error);
              Alert.alert('Error', 'Failed to approve permit: ' + error.message);
            }
          }}>
            <Text style={styles.submitButtonText}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.submitButton, { backgroundColor: '#EF4444', marginLeft: 12 }]} onPress={async () => {
            // Reject: set status to 'rejected' and update permit
            try {
              await updatePermit(editData.id, {
                status: 'rejected'
              });
              
              const updated = permits.map(p => p.id === editData.id ? { ...editData, status: 'rejected', rejectedDate: new Date().toISOString().split('T')[0] } : p);
              setPermits(updated);
              setCurrentScreen('dashboard');
              Alert.alert('Permit Rejected', 'Permit has been rejected.');
            } catch (error) {
              console.error('Error rejecting permit:', error);
              Alert.alert('Error', 'Failed to reject permit. Please try again.');
            }
          }}>
            <Text style={styles.submitButtonText}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

  const renderPermitList = (status, title) => {
    const filteredPermits = permits.filter(p => p.status === status);
    return (
      <View style={styles.screenContainer}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setCurrentScreen('dashboard')}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{title}</Text>
        </View>
        <View style={styles.permitListContainer}>
          {filteredPermits.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No {title.toLowerCase()} found</Text>
            </View>
          ) : (
            <FlatList
              data={filteredPermits}
              renderItem={renderPermitItem}
              keyExtractor={item => item.id}
            />
          )}
        </View>
      </View>
    );
  };

  // Edit Permit
  const renderEditPermit = () => {
    if (!selectedPermit) return null;
    const permitIndex = permits.findIndex(p => p.id === selectedPermit.id);
    const localEditData = editPermitData || selectedPermit;

    const handleEditChange = (field, value) => {
      setEditPermitData({ ...localEditData, [field]: value });
    };

    const saveEdit = () => {
      const updatedPermits = [...permits];
      updatedPermits[permitIndex] = editPermitData || selectedPermit;
      setPermits(updatedPermits);
      setEditPermitData(null);
      setSelectedPermit(null);
      setCurrentScreen('dashboard');
      Alert.alert('Permit Updated', `Permit ${(editPermitData || selectedPermit).id} has been updated.`);
    };

    return (
      <View style={styles.screenContainer}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setCurrentScreen('dashboard')}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Edit Permit {localEditData.id}</Text>
        </View>
        <View style={styles.section}>
          <View style={styles.sectionContent}>
            <Text style={styles.label}>Work Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              multiline
              numberOfLines={3}
              value={localEditData.description}
              onChangeText={text => handleEditChange('description', text)}
              placeholder="Describe the work to be performed..."
            />
            <Text style={styles.label}>Location</Text>
            <TextInput
              style={styles.input}
              value={localEditData.location}
              onChangeText={text => handleEditChange('location', text)}
              placeholder="Work location"
            />
            <Text style={styles.label}>Requested By</Text>
            <TextInput
              style={styles.input}
              value={localEditData.requestedBy}
              onChangeText={text => handleEditChange('requestedBy', text)}
              placeholder="Your name"
            />
            <Text style={styles.label}>Priority</Text>
            <View style={styles.priorityButtons}>
              {['low', 'medium', 'high'].map(priority => (
                <TouchableOpacity
                  key={priority}
                  style={[
                    styles.priorityButton,
                    { backgroundColor: localEditData.priority === priority ? getPriorityColor(priority) : '#E5E7EB' }
                  ]}
                  onPress={() => handleEditChange('priority', priority)}
                >
                  <Text style={[
                    styles.priorityButtonText,
                    { color: localEditData.priority === priority ? 'white' : '#374151' }
                  ]}>
                    {priority.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>Status</Text>
            <View style={styles.priorityButtons}>
              {['pending_approval', 'pending_inspection', 'active', 'completed'].map(status => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.priorityButton,
                    { backgroundColor: localEditData.status === status ? getStatusColor(status) : '#E5E7EB' }
                  ]}
                  onPress={() => handleEditChange('status', status)}
                >
                  <Text style={[
                    styles.priorityButtonText,
                    { color: localEditData.status === status ? 'white' : '#374151' }
                  ]}>
                    {getStatusText(status)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {/* Specialized Permits - always show all, allow toggling required and show full questionnaire */}
            {localEditData.specializedPermits && (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.label}>Specialized Permits:</Text>
                {Object.entries(localEditData.specializedPermits).map(([key, val]) => {
                  const permit = specializedPermitTypes.find(p => p.key === key);
                  return (
                  <View key={key} style={{ marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingBottom: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <Switch
                        value={val.required}
                        onValueChange={v => handleEditChange('specializedPermits', {
                          ...localEditData.specializedPermits,
                          [key]: { ...val, required: v }
                        })}
                      />
                      <Text style={{ marginLeft: 8, fontWeight: 'bold' }}>{permit?.label || key}</Text>
                    </View>
                    {/* Show full questionnaire for all specialized permits */}
                    {val.questionnaire && Object.entries(val.questionnaire).map(([qid, qval]) => (
                      <View key={qid} style={{ marginLeft: 8, marginBottom: 4 }}>
                        <Text style={styles.detailText}>{qid}:</Text>
                        <TextInput style={styles.input} value={qval.answer || qval.text || ''} onChangeText={text => {
                          const updated = { ...val.questionnaire, [qid]: { ...qval, answer: text } };
                          handleEditChange('specializedPermits', {
                            ...localEditData.specializedPermits,
                            [key]: { ...val, questionnaire: updated }
                          });
                        }} />
                        {qval.controls !== undefined && (
                          <TextInput style={styles.input} value={qval.controls} onChangeText={text => {
                            const updated = { ...val.questionnaire, [qid]: { ...qval, controls: text } };
                            handleEditChange('specializedPermits', {
                              ...localEditData.specializedPermits,
                              [key]: { ...val, questionnaire: updated }
                            });
                          }} placeholder="Controls" />
                        )}
                      </View>
                    ))}
                  </View>
                );
                })}
              </View>
            )}

            {/* Single Hazards - always show all, allow editing */}
            {localEditData.singleHazards && (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.label}>Single Hazards:</Text>
                {Object.entries(localEditData.singleHazards).map(([key, val]) => (
                  <View key={key} style={{ marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <Switch
                        value={val.present}
                        onValueChange={v => handleEditChange('singleHazards', {
                          ...localEditData.singleHazards,
                          [key]: { ...val, present: v }
                        })}
                      />
                      <Text style={{ marginLeft: 8, fontWeight: 'bold' }}>{key}</Text>
                    </View>
                    {val.present && (
                      <TextInput style={styles.input} value={val.controls} onChangeText={text => handleEditChange('singleHazards', {
                        ...localEditData.singleHazards,
                        [key]: { ...val, controls: text }
                      })} placeholder="Controls" />
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* JSEA - allow editing of all fields */}
            {localEditData.jsea && (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.label}>JSEA Task Steps:</Text>
                {localEditData.jsea.taskSteps && localEditData.jsea.taskSteps.length > 0 ? localEditData.jsea.taskSteps.map((step, idx) => (
                  <View key={idx} style={{ marginBottom: 8, marginLeft: 8 }}>
                    <Text style={styles.detailText}>Step {idx + 1}:</Text>
                    <TextInput style={styles.input} value={step.step} onChangeText={text => {
                      const updatedSteps = [...localEditData.jsea.taskSteps];
                      updatedSteps[idx] = { ...step, step: text };
                      handleEditChange('jsea', { ...localEditData.jsea, taskSteps: updatedSteps });
                    }} placeholder="Step" />
                    <TextInput style={styles.input} value={step.hazards} onChangeText={text => {
                      const updatedSteps = [...localEditData.jsea.taskSteps];
                      updatedSteps[idx] = { ...step, hazards: text };
                      handleEditChange('jsea', { ...localEditData.jsea, taskSteps: updatedSteps });
                    }} placeholder="Hazards" />
                    <TextInput style={styles.input} value={step.controls} onChangeText={text => {
                      const updatedSteps = [...localEditData.jsea.taskSteps];
                      updatedSteps[idx] = { ...step, controls: text };
                      handleEditChange('jsea', { ...localEditData.jsea, taskSteps: updatedSteps });
                    }} placeholder="Controls" />
                    <TextInput style={styles.input} value={step.riskLevel} onChangeText={text => {
                      const updatedSteps = [...localEditData.jsea.taskSteps];
                      updatedSteps[idx] = { ...step, riskLevel: text };
                      handleEditChange('jsea', { ...localEditData.jsea, taskSteps: updatedSteps });
                    }} placeholder="Risk Level" />
                  </View>
                )) : <Text style={styles.detailText}>None</Text>}
                <Text style={styles.label}>Overall Risk Rating:</Text>
                <TextInput style={styles.input} value={localEditData.jsea.overallRiskRating || ''} onChangeText={text => handleEditChange('jsea', { ...localEditData.jsea, overallRiskRating: text })} placeholder="Overall Risk Rating" />
                <Text style={styles.label}>Additional Precautions:</Text>
                <TextInput style={styles.input} value={localEditData.jsea.additionalPrecautions || ''} onChangeText={text => handleEditChange('jsea', { ...localEditData.jsea, additionalPrecautions: text })} placeholder="Any additional precautions..." />
              </View>
            )}

            {/* Sign-On (Other Workers) - allow editing */}
            {localEditData.signOns && (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.label}>Sign-On (Other Workers):</Text>
                {localEditData.signOns.map((signOn, idx) => (
                  <View key={idx} style={{ marginBottom: 8, marginLeft: 8 }}>
                    <Text style={styles.detailText}>Name:</Text>
                    <TextInput style={styles.input} value={signOn.name} onChangeText={text => {
                      const updated = [...localEditData.signOns];
                      updated[idx] = { ...signOn, name: text };
                      handleEditChange('signOns', updated);
                    }} placeholder="Worker Name" />
                    <Text style={styles.detailText}>Signature:</Text>
                    <TextInput style={styles.input} value={signOn.signature} onChangeText={text => {
                      const updated = [...localEditData.signOns];
                      updated[idx] = { ...signOn, signature: text };
                      handleEditChange('signOns', updated);
                    }} placeholder="Signature" />
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
        <View style={styles.submitSection}>
          <TouchableOpacity style={styles.submitButton} onPress={saveEdit}>
            <Text style={styles.submitButtonText}>Save Changes</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Dashboard
  const renderDashboard = () => {
    return (
      <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
        <View style={styles.header}>
          <Text style={styles.title}>Permit Dashboard</Text>
        </View>
        <View style={styles.dashboardGrid}>
          <TouchableOpacity style={[styles.dashboardCard, { borderLeftColor: '#2563EB' }]} onPress={() => setCurrentScreen('pending_approval')}>
            <Text style={styles.cardNumber}>{permits.filter(p => p.status === 'pending_approval').length}</Text>
            <Text style={styles.cardLabel}>Pending Approval</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.dashboardCard, { borderLeftColor: '#F59E42' }]} onPress={() => setCurrentScreen('pending_inspection')}>
            <Text style={styles.cardNumber}>{permits.filter(p => p.status === 'pending_inspection').length}</Text>
            <Text style={styles.cardLabel}>Needs Inspection</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.dashboardCard, { borderLeftColor: '#10B981' }]} onPress={() => setCurrentScreen('active')}>
            <Text style={styles.cardNumber}>{permits.filter(p => p.status === 'active').length}</Text>
            <Text style={styles.cardLabel}>Active Permits</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.dashboardCard, { borderLeftColor: '#6B7280' }]} onPress={() => setCurrentScreen('completed')}>
            <Text style={styles.cardNumber}>{permits.filter(p => p.status === 'completed').length}</Text>
            <Text style={styles.cardLabel}>Completed</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.primaryButton} onPress={() => setCurrentScreen('new_permit')}>
          <Text style={styles.primaryButtonText}>Create New Permit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.primaryButton, { backgroundColor: '#7C3AED', marginBottom: 16 }]} onPress={() => setCurrentScreen('admin')}>
          <Text style={styles.primaryButtonText}>⚙️ Admin</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Admin Dashboard - choose between Users or Contractors
  const renderAdminDashboard = () => {
    return (
      <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setCurrentScreen('dashboard')}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Admin Panel</Text>
        </View>
        <View style={styles.dashboardGrid}>
          <TouchableOpacity style={[styles.dashboardCard, { borderLeftColor: '#7C3AED' }]} onPress={() => setCurrentScreen('manage_users')}>
            <Text style={styles.cardNumber}>{users.length}</Text>
            <Text style={styles.cardLabel}>Users</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.dashboardCard, { borderLeftColor: '#10B981' }]} onPress={() => setCurrentScreen('manage_companies')}>
            <Text style={styles.cardNumber}>{companies.length}</Text>
            <Text style={styles.cardLabel}>Companies</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.dashboardCard, { borderLeftColor: '#F59E42' }]} onPress={() => setCurrentScreen('manage_contractors')}>
            <Text style={styles.cardNumber}>{contractors.length}</Text>
            <Text style={styles.cardLabel}>Contractors</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.dashboardCard, { borderLeftColor: '#3B82F6' }]} onPress={() => setCurrentScreen('services_directory')}>
            <Text style={styles.cardNumber}>{ALL_SERVICES.length}</Text>
            <Text style={styles.cardLabel}>Services</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Manage Users Screen
  const renderManageUsers = () => {
    const handleAddUser = async () => {
      if (!currentUser.name || !currentUser.email || !currentUser.company) {
        Alert.alert('Missing Info', 'Please fill in Name, Email, and Company.');
        return;
      }
      try {
        if (editingUser) {
          await updateUser(currentUser.id, {
            name: currentUser.name,
            email: currentUser.email,
            sites: currentUser.sites,
            company: currentUser.company,
            isAdmin: currentUser.isAdmin
          });
          const freshUsers = await listUsers();
          setUsers(freshUsers);
          setEditingUser(false);
          Alert.alert('User Updated', 'User has been updated successfully.');
        } else {
          await createUser({
            name: currentUser.name,
            email: currentUser.email,
            sites: currentUser.sites,
            company: currentUser.company,
            isAdmin: currentUser.isAdmin
          });
          const freshUsers = await listUsers();
          setUsers(freshUsers);
          Alert.alert('User Added', 'New user has been added successfully.');
        }
        setCurrentUser({ id: '', name: '', email: '', sites: [], company: '', isAdmin: false });
        setSelectedUser(null);
      } catch (error) {
        Alert.alert('Error', 'Failed to save user: ' + error.message);
      }
    };

    const handleDeleteUser = (id) => {
      Alert.alert('Delete User', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          onPress: async () => {
            try {
              await deleteUser(id);
              const freshUsers = await listUsers();
              setUsers(freshUsers);
              Alert.alert('Deleted', 'User has been deleted.');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete user: ' + error.message);
            }
          }, 
          style: 'destructive' 
        }
      ]);
    };

    const handleImportUserCSV = () => {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = '.csv,.xlsx,.xls';
      
      fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const csvText = event.target.result;
            const lines = csvText.trim().split('\n');
            
            if (lines.length < 2) {
              Alert.alert('Error', 'File must have header row and at least one data row');
              return;
            }

            const newUsers = [];

            for (let i = 1; i < lines.length; i++) {
              const line = lines[i].trim();
              if (!line) continue;
              
              // Simple CSV parsing
              const values = [];
              let current = '';
              let inQuotes = false;
              
              for (let j = 0; j < line.length; j++) {
                const char = line[j];
                if (char === '"') {
                  inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                  values.push(current.trim().replace(/^"|"$/g, ''));
                  current = '';
                } else {
                  current += char;
                }
              }
              values.push(current.trim().replace(/^"|"$/g, ''));
              
              // Expected format: Name, Email, Company, Sites (comma-separated), IsAdmin (yes/no)
              if (values.length >= 3) {
                const name = values[0];
                const email = values[1];
                const company = values[2];
                const sites = values[3] ? values[3].split(';').map(s => s.trim()).filter(s => s) : [];
                const isAdmin = values[4] ? values[4].toLowerCase() === 'yes' : false;
                
                // Check for duplicates
                if (!newUsers.some(u => u.email.toLowerCase() === email.toLowerCase()) &&
                    !users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
                  newUsers.push({
                    name,
                    email,
                    sites,
                    company,
                    isAdmin
                  });
                }
              }
            }

            if (newUsers.length === 0) {
              Alert.alert('Info', 'No new users to import (duplicates were skipped).');
              return;
            }

            // Save all users to Supabase
            for (const user of newUsers) {
              await createUser(user);
            }

            // Reload users from database
            const freshUsers = await listUsers();
            setUsers(freshUsers);
            Alert.alert('Success', `${newUsers.length} user(s) imported successfully!`);
          } catch (error) {
            Alert.alert('Error', 'Failed to parse file: ' + error.message);
          }
        };
        reader.readAsText(file);
      };
      
      fileInput.click();
    };

    return (
      <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { setCurrentScreen('admin'); setEditingUser(false); setSelectedUser(null); }}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{editingUser ? 'Edit User' : 'Manage Users'}</Text>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, padding: 16 }}>
          {/* Form Section */}
          <View style={styles.section}>
            <View style={styles.sectionContent}>
              <Text style={styles.label}>User Name *</Text>
              <TextInput style={styles.input} value={currentUser.name} onChangeText={text => setCurrentUser({ ...currentUser, name: text })} placeholder="Enter user name" />
              
              <Text style={styles.label}>Email Address *</Text>
              <TextInput style={styles.input} value={currentUser.email} onChangeText={text => setCurrentUser({ ...currentUser, email: text })} placeholder="email@company.com" keyboardType="email-address" />
              
              <Text style={styles.label}>Company Name *</Text>
              <TextInput style={styles.input} value={currentUser.company} onChangeText={text => setCurrentUser({ ...currentUser, company: text })} placeholder="Enter company name" />
              
              <Text style={styles.label}>Available Sites</Text>
              <Text style={{ color: '#6B7280', marginBottom: 8 }}>Tap to toggle sites this user can access:</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }}>
                {ALL_SITES.map(site => (
                  <TouchableOpacity
                    key={site}
                    style={[
                      { padding: 8, margin: 4, borderRadius: 6, borderWidth: 1 },
                      currentUser.sites.includes(site)
                        ? { backgroundColor: '#2563EB', borderColor: '#2563EB' }
                        : { borderColor: '#D1D5DB', backgroundColor: 'white' }
                    ]}
                    onPress={() => {
                      if (currentUser.sites.includes(site)) {
                        setCurrentUser({ ...currentUser, sites: currentUser.sites.filter(s => s !== site) });
                      } else {
                        setCurrentUser({ ...currentUser, sites: [...currentUser.sites, site] });
                      }
                    }}
                  >
                    <Text style={{ color: currentUser.sites.includes(site) ? 'white' : '#374151', fontSize: 12, fontWeight: '500' }}>{site}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, padding: 12, backgroundColor: '#F3F4F6', borderRadius: 8 }}>
                <TouchableOpacity
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 4,
                    borderWidth: 2,
                    borderColor: currentUser.isAdmin ? '#2563EB' : '#D1D5DB',
                    backgroundColor: currentUser.isAdmin ? '#2563EB' : 'white',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 12
                  }}
                  onPress={() => setCurrentUser({ ...currentUser, isAdmin: !currentUser.isAdmin })}
                >
                  {currentUser.isAdmin && <Text style={{ color: 'white', fontSize: 14, fontWeight: 'bold' }}>✓</Text>}
                </TouchableOpacity>
                <Text style={{ flex: 1, fontSize: 14, fontWeight: '500', color: '#374151' }}>Grant admin access to manage users & contractors</Text>
              </View>

              <TouchableOpacity style={styles.addButton} onPress={handleAddUser}>
                <Text style={styles.addButtonText}>{editingUser ? 'Update User' : 'Add User'}</Text>
              </TouchableOpacity>
              {editingUser && (
                <TouchableOpacity style={[styles.addButton, { backgroundColor: '#EF4444' }]} onPress={() => { setEditingUser(false); setCurrentUser({ id: '', name: '', email: '', sites: [], company: '', isAdmin: false }); setSelectedUser(null); }}>
                  <Text style={styles.addButtonText}>Cancel</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Users List Section */}
          <View style={{ marginTop: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { marginLeft: 0, fontSize: 16, fontWeight: 'bold' }]}>Users Database</Text>
              </View>
              <TouchableOpacity style={{ backgroundColor: '#10B981', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, marginLeft: 8 }} onPress={handleImportUserCSV}>
                <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>Import CSV</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ color: '#6B7280', marginBottom: 12 }}>Total: {users.length} users</Text>
            {users.length === 0 ? (
              <Text style={{ textAlign: 'center', marginTop: 20, color: '#9CA3AF' }}>No users yet. Add one using the form above.</Text>
            ) : (
              users.map((user, index) => (
                <View key={user.id} style={[styles.permitListCard, { marginBottom: 12 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={styles.permitId}>{index + 1}. {user.name}</Text>
                    {user.isAdmin && <View style={{ backgroundColor: '#2563EB', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                      <Text style={{ color: 'white', fontSize: 11, fontWeight: 'bold' }}>ADMIN</Text>
                    </View>}
                  </View>
                  <Text style={styles.detailText}>{user.email}</Text>
                  <Text style={styles.detailText}>{user.company}</Text>
                  <Text style={[styles.detailText, { marginTop: 8 }]}>Sites: {user.sites.length > 0 ? user.sites.join(', ') : 'None'}</Text>
                  <View style={{ flexDirection: 'row', marginTop: 12, gap: 8 }}>
                    <TouchableOpacity style={[styles.addButton, { flex: 0.45 }]} onPress={() => { setSelectedUser(user); setEditingUser(true); setCurrentUser(user); }}>
                      <Text style={styles.addButtonText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.addButton, { flex: 0.45, backgroundColor: '#EF4444' }]} onPress={() => handleDeleteUser(user.id)}>
                      <Text style={styles.addButtonText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </View>
    );
  };

  // Manage Companies Screen
  const renderManageCompanies = () => {
    const handleAddCompany = async () => {
      if (!currentCompany.name) {
        Alert.alert('Missing Info', 'Please enter a company name.');
        return;
      }
      try {
        if (editingCompany) {
          await updateCompany(currentCompany.id, { name: currentCompany.name });
          const freshCompanies = await listCompanies();
          setCompanies(freshCompanies);
          setEditingCompany(false);
          Alert.alert('Company Updated', 'Company has been updated successfully.');
        } else {
          const newCompany = await createCompany({ name: currentCompany.name });
          const freshCompanies = await listCompanies();
          setCompanies(freshCompanies);
          Alert.alert('Company Added', 'New company has been added successfully.');
        }
        setCurrentCompany({ id: '', name: '' });
        setSelectedCompany(null);
      } catch (error) {
        Alert.alert('Error', 'Failed to save company: ' + error.message);
      }
    };

    const handleDeleteCompany = (id) => {
      Alert.alert('Delete Company', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          onPress: async () => {
            try {
              await deleteCompany(id);
              const freshCompanies = await listCompanies();
              setCompanies(freshCompanies);
              Alert.alert('Deleted', 'Company has been deleted.');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete company: ' + error.message);
            }
          }, 
          style: 'destructive' 
        }
      ]);
    };

    const handleImportCSV = () => {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = '.csv,.xlsx,.xls';
      
      fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const csvText = event.target.result;
            const lines = csvText.trim().split('\n');
            
            if (lines.length < 2) {
              Alert.alert('Error', 'File must have header row and at least one data row');
              return;
            }

            const newCompanies = [];

            for (let i = 1; i < lines.length; i++) {
              const line = lines[i].trim();
              if (!line) continue;
              
              // Simple CSV parsing
              const values = [];
              let current = '';
              let inQuotes = false;
              
              for (let j = 0; j < line.length; j++) {
                const char = line[j];
                if (char === '"') {
                  inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                  values.push(current.trim().replace(/^"|"$/g, ''));
                  current = '';
                } else {
                  current += char;
                }
              }
              values.push(current.trim().replace(/^"|"$/g, ''));
              
              if (values.length > 0 && values[0]) {
                const companyName = values[0];
                
                // Check for duplicates
                if (!newCompanies.some(c => c.name.toLowerCase() === companyName.toLowerCase()) &&
                    !companies.some(c => c.name.toLowerCase() === companyName.toLowerCase())) {
                  newCompanies.push({
                    name: companyName
                  });
                }
              }
            }

            if (newCompanies.length === 0) {
              Alert.alert('Info', 'No new companies to import (duplicates were skipped).');
              return;
            }

            // Save all companies to Supabase
            for (const company of newCompanies) {
              await createCompany(company);
            }

            // Reload companies from database
            const freshCompanies = await listCompanies();
            setCompanies(freshCompanies);
            Alert.alert('Success', `${newCompanies.length} company/companies imported successfully!`);
          } catch (error) {
            Alert.alert('Error', 'Failed to parse file: ' + error.message);
          }
        };
        reader.readAsText(file);
      };
      
      fileInput.click();
    };

    return (
      <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { setCurrentScreen('admin'); setEditingCompany(false); setSelectedCompany(null); }}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{editingCompany ? 'Edit Company' : 'Manage Companies'}</Text>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, padding: 16 }}>
          {/* Form Section */}
          <View style={styles.section}>
            <View style={styles.sectionContent}>
              <Text style={styles.label}>Company Name *</Text>
              <TextInput 
                style={styles.input} 
                value={currentCompany.name} 
                onChangeText={text => setCurrentCompany({ ...currentCompany, name: text })} 
                placeholder="Enter company name" 
              />

              <TouchableOpacity style={styles.addButton} onPress={handleAddCompany}>
                <Text style={styles.addButtonText}>{editingCompany ? 'Update Company' : 'Add Company'}</Text>
              </TouchableOpacity>
              {editingCompany && (
                <TouchableOpacity style={[styles.addButton, { backgroundColor: '#EF4444' }]} onPress={() => { setEditingCompany(false); setCurrentCompany({ id: '', name: '' }); setSelectedCompany(null); }}>
                  <Text style={styles.addButtonText}>Cancel</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Companies List Section */}
          <View style={{ marginTop: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { marginLeft: 0, fontSize: 16, fontWeight: 'bold' }]}>Companies Database</Text>
              </View>
              <TouchableOpacity style={{ backgroundColor: '#10B981', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, marginLeft: 8 }} onPress={handleImportCSV}>
                <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>Import CSV/Excel</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ color: '#6B7280', marginBottom: 12 }}>Total: {companies.length} companies</Text>
            
            {companies.length === 0 ? (
              <Text style={{ color: '#9CA3AF', textAlign: 'center', paddingVertical: 20 }}>No companies added yet</Text>
            ) : (
              companies.map(company => (
                <TouchableOpacity
                  key={company.id}
                  style={[
                    styles.userCard,
                    selectedCompany?.id === company.id && { backgroundColor: '#EFF6FF', borderColor: '#2563EB' }
                  ]}
                  onPress={() => setSelectedCompany(company)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.userCardName}>{company.name}</Text>
                    <Text style={styles.userCardDetail}>ID: {company.id}</Text>
                  </View>
                  {selectedCompany?.id === company.id && (
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity
                        style={[styles.miniButton, { backgroundColor: '#2563EB' }]}
                        onPress={() => {
                          setCurrentCompany(company);
                          setEditingCompany(true);
                        }}
                      >
                        <Text style={styles.miniButtonText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.miniButton, { backgroundColor: '#EF4444' }]}
                        onPress={() => handleDeleteCompany(company.id)}
                      >
                        <Text style={styles.miniButtonText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </TouchableOpacity>
              ))
            )}
          </View>
        </ScrollView>
      </View>
    );
  };

  // Manage Contractors Screen
  const renderManageContractors = () => {
    const handleAddContractor = async () => {
      if (!currentContractor.name || !currentContractor.email || !currentContractor.company) {
        Alert.alert('Missing Info', 'Please fill in Name, Email, and Company.');
        return;
      }
      try {
        if (editingContractor) {
          await updateContractor(currentContractor.id, {
            name: currentContractor.name,
            email: currentContractor.email,
            services: currentContractor.services,
            company: currentContractor.company,
            induction_expiry: currentContractor.inductionExpiry
          });
          const freshContractors = await listContractors();
          setContractors(freshContractors);
          setEditingContractor(false);
          Alert.alert('Contractor Updated', 'Contractor has been updated successfully.');
        } else {
          await createContractor({
            name: currentContractor.name,
            email: currentContractor.email,
            services: currentContractor.services,
            company: currentContractor.company,
            induction_expiry: currentContractor.inductionExpiry
          });
          const freshContractors = await listContractors();
          setContractors(freshContractors);
          Alert.alert('Contractor Added', 'New contractor has been added successfully.');
        }
        setCurrentContractor({ id: '', name: '', email: '', services: [], company: '', inductionExpiry: '' });
        setSelectedContractor(null);
      } catch (error) {
        Alert.alert('Error', 'Failed to save contractor: ' + error.message);
      }
    };

    const handleDeleteContractor = (id) => {
      Alert.alert('Delete Contractor', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          onPress: async () => {
            try {
              await deleteContractor(id);
              const freshContractors = await listContractors();
              setContractors(freshContractors);
              Alert.alert('Deleted', 'Contractor has been deleted.');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete contractor: ' + error.message);
            }
          }, 
          style: 'destructive' 
        }
      ]);
    };

    const handleImportCSV = () => {
      // Create a hidden file input element
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = '.csv,.xlsx,.xls';
      
      fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const csvText = event.target.result;
            const lines = csvText.trim().split('\n');
            
            if (lines.length < 2) {
              Alert.alert('Error', 'CSV must have header row and at least one data row');
              return;
            }

            const newContractors = [];

            for (let i = 1; i < lines.length; i++) {
              const line = lines[i].trim();
              if (!line) continue; // Skip empty lines
              
              // Simple CSV parsing (handles basic cases)
              const values = [];
              let current = '';
              let inQuotes = false;
              
              for (let j = 0; j < line.length; j++) {
                const char = line[j];
                if (char === '"') {
                  inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                  values.push(current.trim().replace(/^"|"$/g, ''));
                  current = '';
                } else {
                  current += char;
                }
              }
              values.push(current.trim().replace(/^"|"$/g, ''));

              if (values.length >= 3) {
                const contractor = {
                  name: values[0] || '',
                  email: values[1] || '',
                  company: values[2] || '',
                  services: values[3] ? values[3].split(';').map(s => s.trim()) : [],
                  induction_expiry: values[4] || null
                };
                if (contractor.name && contractor.email && contractor.company) {
                  // Check for duplicates
                  if (!newContractors.some(c => c.email.toLowerCase() === contractor.email.toLowerCase()) &&
                      !contractors.some(c => c.email.toLowerCase() === contractor.email.toLowerCase())) {
                    newContractors.push(contractor);
                  }
                }
              }
            }

            if (newContractors.length === 0) {
              Alert.alert('Error', 'No valid contractors found in CSV');
              return;
            }

            // Save all contractors to Supabase
            for (const contractor of newContractors) {
              await createContractor(contractor);
            }

            // Reload contractors from database
            const freshContractors = await listContractors();
            setContractors(freshContractors);
            Alert.alert('Success', `${newContractors.length} contractor(s) imported successfully`);
          } catch (error) {
            Alert.alert('Error', 'Failed to parse CSV: ' + error.message);
          }
        };
        
        reader.readAsText(file);
      };
      
      fileInput.click();
    };

    return (
      <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { setCurrentScreen('admin'); setEditingContractor(false); setSelectedContractor(null); }}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{editingContractor ? 'Edit Contractor' : 'Manage Contractors'}</Text>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, padding: 16 }}>
          {/* Form Section */}
          <View style={styles.section}>
            <View style={styles.sectionContent}>
              <Text style={styles.label}>Contractor Name *</Text>
              <TextInput style={styles.input} value={currentContractor.name} onChangeText={text => setCurrentContractor({ ...currentContractor, name: text })} placeholder="Enter contractor name" />
              
              <Text style={styles.label}>Email Address *</Text>
              <TextInput style={styles.input} value={currentContractor.email} onChangeText={text => setCurrentContractor({ ...currentContractor, email: text })} placeholder="email@contractor.com" keyboardType="email-address" />
              
              <Text style={styles.label}>Company Name *</Text>
              <TextInput style={styles.input} value={currentContractor.company} onChangeText={text => setCurrentContractor({ ...currentContractor, company: text })} placeholder="Enter company name" />
              
              <Text style={styles.label}>Services Offered</Text>
              <Text style={{ color: '#6B7280', marginBottom: 8 }}>Tap to toggle services:</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }}>
                {ALL_SERVICES.map(service => (
                  <TouchableOpacity
                    key={service}
                    style={[
                      { padding: 8, margin: 4, borderRadius: 6, borderWidth: 1 },
                      currentContractor.services.includes(service)
                        ? { backgroundColor: '#F59E42', borderColor: '#F59E42' }
                        : { borderColor: '#D1D5DB', backgroundColor: 'white' }
                    ]}
                    onPress={() => {
                      if (currentContractor.services.includes(service)) {
                        setCurrentContractor({ ...currentContractor, services: currentContractor.services.filter(s => s !== service) });
                      } else {
                        setCurrentContractor({ ...currentContractor, services: [...currentContractor.services, service] });
                      }
                    }}
                  >
                    <Text style={{ color: currentContractor.services.includes(service) ? 'white' : '#374151', fontSize: 12, fontWeight: '500' }}>{service}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Induction Expiry Date</Text>
              <TouchableOpacity 
                style={[styles.input, { justifyContent: 'center', paddingVertical: 12, backgroundColor: '#F3F4F6' }]}
                onPress={() => {
                  setInductionPickerDate(currentContractor.inductionExpiry ? new Date(currentContractor.inductionExpiry) : new Date());
                  setShowInductionDatePicker(true);
                }}
              >
                <Text style={{ color: currentContractor.inductionExpiry ? '#1F2937' : '#9CA3AF', fontSize: 16 }}>
                  {currentContractor.inductionExpiry ? formatDateNZ(currentContractor.inductionExpiry) : 'Select date'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.addButton} onPress={handleAddContractor}>
                <Text style={styles.addButtonText}>{editingContractor ? 'Update Contractor' : 'Add Contractor'}</Text>
              </TouchableOpacity>
              {editingContractor && (
                <TouchableOpacity style={[styles.addButton, { backgroundColor: '#EF4444' }]} onPress={() => { setEditingContractor(false); setCurrentContractor({ id: '', name: '', email: '', services: [], company: '', inductionExpiry: '' }); setSelectedContractor(null); }}>
                  <Text style={styles.addButtonText}>Cancel</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Contractors List Section */}
          <View style={{ marginTop: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { marginLeft: 0, fontSize: 16, fontWeight: 'bold' }]}>Contractors Database</Text>
              </View>
              <TouchableOpacity style={{ backgroundColor: '#10B981', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, marginLeft: 8 }} onPress={handleImportCSV}>
                <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>Import CSV</Text>
              </TouchableOpacity>
            </View>

            {/* Filter and Search Section */}
            {contractors.length > 0 && (
              <View style={{ marginBottom: 16, padding: 12, backgroundColor: 'white', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' }}>
                <Text style={[styles.label, { fontSize: 12, fontWeight: 'bold', marginBottom: 8 }]}>Search by Name or Email:</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Type name, email..."
                  value={contractorSearchText}
                  onChangeText={setContractorSearchText}
                />

                <Text style={[styles.label, { fontSize: 12, marginTop: 12, marginBottom: 8 }]}>Filter by Company:</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  <TouchableOpacity
                    style={[
                      { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1 },
                      contractorCompanyFilter === 'All'
                        ? { backgroundColor: '#3B82F6', borderColor: '#3B82F6' }
                        : { backgroundColor: 'white', borderColor: '#D1D5DB' }
                    ]}
                    onPress={() => setContractorCompanyFilter('All')}
                  >
                    <Text style={{ color: contractorCompanyFilter === 'All' ? 'white' : '#374151', fontWeight: '500', fontSize: 11 }}>All</Text>
                  </TouchableOpacity>
                  {[...new Set(contractors.map(c => c.company))].map(company => (
                    <TouchableOpacity
                      key={company}
                      style={[
                        { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1 },
                        contractorCompanyFilter === company
                          ? { backgroundColor: '#3B82F6', borderColor: '#3B82F6' }
                          : { backgroundColor: 'white', borderColor: '#D1D5DB' }
                      ]}
                      onPress={() => setContractorCompanyFilter(company)}
                    >
                      <Text style={{ color: contractorCompanyFilter === company ? 'white' : '#374151', fontWeight: '500', fontSize: 11 }}>{company}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {contractors.length === 0 ? (
              <View style={{ backgroundColor: 'white', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', padding: 20, alignItems: 'center' }}>
                <Text style={{ color: '#9CA3AF', textAlign: 'center' }}>No contractors yet. Add one using the form above.</Text>
              </View>
            ) : (
              (() => {
                const filteredContractors = contractors.filter(contractor => {
                  const matchesSearch = contractorSearchText === '' || 
                    contractor.name.toLowerCase().includes(contractorSearchText.toLowerCase()) ||
                    contractor.email.toLowerCase().includes(contractorSearchText.toLowerCase());
                  
                  const matchesCompanyFilter = contractorCompanyFilter === 'All' || contractor.company === contractorCompanyFilter;
                  
                  return matchesSearch && matchesCompanyFilter;
                });

                if (filteredContractors.length === 0) {
                  return <View style={{ backgroundColor: 'white', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', padding: 20, alignItems: 'center' }}>
                    <Text style={{ color: '#9CA3AF' }}>No contractors match your search/filter.</Text>
                  </View>;
                }

                return (
                  <ScrollView horizontal style={{ borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: 'white' }}>
                    <View>
                      {/* Table Header */}
                      <View style={{ flexDirection: 'row', backgroundColor: '#3B82F6', borderBottomWidth: 2, borderBottomColor: '#2563EB' }}>
                        <Text style={[{ width: columns.name, padding: 12, fontWeight: 'bold', color: 'white', fontSize: 11 }, styles.tableBorder]}>Name</Text>
                        <Text style={[{ width: columns.email, padding: 12, fontWeight: 'bold', color: 'white', fontSize: 11 }, styles.tableBorder]}>Email</Text>
                        <Text style={[{ width: columns.company, padding: 12, fontWeight: 'bold', color: 'white', fontSize: 11 }, styles.tableBorder]}>Company</Text>
                        <Text style={[{ width: columns.services, padding: 12, fontWeight: 'bold', color: 'white', fontSize: 11 }, styles.tableBorder]}>Services</Text>
                        <Text style={[{ width: columns.inductionExpiry, padding: 12, fontWeight: 'bold', color: 'white', fontSize: 11 }, styles.tableBorder]}>Induction Exp</Text>
                        <Text style={[{ width: columns.actions, padding: 12, fontWeight: 'bold', color: 'white', fontSize: 11, textAlign: 'center' }]}>Actions</Text>
                      </View>

                      {/* Table Rows */}
                      {filteredContractors.map((contractor, index) => (
                        <View 
                          key={contractor.id} 
                          style={{ 
                            flexDirection: 'row', 
                            backgroundColor: index % 2 === 0 ? 'white' : '#F3F4F6',
                            borderBottomWidth: 1,
                            borderBottomColor: '#E5E7EB',
                            alignItems: 'center'
                          }}
                        >
                          <Text style={[{ width: columns.name, padding: 12, fontSize: 12, color: '#1F2937' }, styles.tableBorder]}>{contractor.name}</Text>
                          <Text style={[{ width: columns.email, padding: 12, fontSize: 12, color: '#1F2937' }, styles.tableBorder]}>{contractor.email}</Text>
                          <Text style={[{ width: columns.company, padding: 12, fontSize: 12, color: '#1F2937' }, styles.tableBorder]}>{contractor.company}</Text>
                          <Text style={[{ width: columns.services, padding: 12, fontSize: 11, color: '#1F2937' }, styles.tableBorder]}>
                            {contractor.services.length > 0 ? contractor.services.slice(0, 2).join(', ') + (contractor.services.length > 2 ? '...' : '') : 'None'}
                          </Text>
                          <Text style={[{ width: columns.inductionExpiry, padding: 12, fontSize: 11, color: new Date(contractor.inductionExpiry) < new Date() ? '#EF4444' : '#1F2937' }, styles.tableBorder]}>
                            {contractor.inductionExpiry ? formatDateNZ(contractor.inductionExpiry) : '-'}
                          </Text>
                          <View style={{ width: columns.actions, flexDirection: 'row', justifyContent: 'center', gap: 4, padding: 12 }}>
                            <TouchableOpacity 
                              style={{ paddingHorizontal: 6, paddingVertical: 4, backgroundColor: '#3B82F6', borderRadius: 4 }}
                              onPress={() => { setSelectedContractor(contractor); setEditingContractor(true); setCurrentContractor(contractor); setInductionPickerDate(contractor.inductionExpiry ? new Date(contractor.inductionExpiry) : new Date()); }}
                            >
                              <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>Edit</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                              style={{ paddingHorizontal: 6, paddingVertical: 4, backgroundColor: '#EF4444', borderRadius: 4 }}
                              onPress={() => handleDeleteContractor(contractor.id)}
                            >
                              <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>Del</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                );
              })()
            )}
          </View>
        </ScrollView>
      </View>
    );
  };

  // Services Directory Screen - View contractors in spreadsheet format
  const renderServicesDirectory = () => {
    const contractorsWithService = contractors.filter(c => c.services.includes(selectedService));

    return (
      <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { setCurrentScreen('admin'); setSelectedService('Hot Work'); }}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Services Directory</Text>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, padding: 16 }}>
          {/* Filter Section */}
          <View style={{ backgroundColor: 'white', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', padding: 12, marginBottom: 16 }}>
            <Text style={[styles.label, { fontSize: 12, fontWeight: 'bold', marginBottom: 8 }]}>Filter by Service:</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {ALL_SERVICES.map(service => (
                <TouchableOpacity
                  key={service}
                  style={[
                    { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1.5 },
                    selectedService === service
                      ? { backgroundColor: '#3B82F6', borderColor: '#3B82F6' }
                      : { backgroundColor: 'white', borderColor: '#D1D5DB' }
                  ]}
                  onPress={() => setSelectedService(service)}
                >
                  <Text style={{ color: selectedService === service ? 'white' : '#374151', fontWeight: '500', fontSize: 11 }}>{service}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Table Title and Count */}
          <View style={{ marginBottom: 12 }}>
            <Text style={[styles.label, { fontSize: 14, fontWeight: 'bold' }]}>Contractors - {selectedService}</Text>
            <Text style={{ color: '#6B7280', fontSize: 12, marginTop: 2 }}>Results: {contractorsWithService.length}</Text>
          </View>

          {/* Spreadsheet Table */}
          {contractorsWithService.length === 0 ? (
            <View style={{ backgroundColor: 'white', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', padding: 20, alignItems: 'center' }}>
              <Text style={{ color: '#9CA3AF', textAlign: 'center' }}>No contractors offer "{selectedService}"</Text>
            </View>
          ) : (
            <ScrollView horizontal style={{ borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: 'white' }}>
              <View>
                {/* Table Header */}
                <View style={{ flexDirection: 'row', backgroundColor: '#3B82F6', borderBottomWidth: 2, borderBottomColor: '#2563EB' }}>
                  <Text style={[{ width: columns.name, padding: 12, fontWeight: 'bold', color: 'white', fontSize: 11 }, styles.tableBorder]}>Name</Text>
                  <Text style={[{ width: columns.email, padding: 12, fontWeight: 'bold', color: 'white', fontSize: 11 }, styles.tableBorder]}>Email</Text>
                  <Text style={[{ width: columns.company, padding: 12, fontWeight: 'bold', color: 'white', fontSize: 11 }, styles.tableBorder]}>Company</Text>
                  <Text style={[{ width: columns.services, padding: 12, fontWeight: 'bold', color: 'white', fontSize: 11 }]}>Services</Text>
                </View>

                {/* Table Rows */}
                {contractorsWithService.map((contractor, index) => (
                  <View 
                    key={contractor.id} 
                    style={{ 
                      flexDirection: 'row', 
                      backgroundColor: index % 2 === 0 ? 'white' : '#F3F4F6',
                      borderBottomWidth: 1,
                      borderBottomColor: '#E5E7EB'
                    }}
                  >
                    <Text style={[{ width: columns.name, padding: 12, fontSize: 12, color: '#1F2937' }, styles.tableBorder]}>{contractor.name}</Text>
                    <Text style={[{ width: columns.email, padding: 12, fontSize: 12, color: '#1F2937' }, styles.tableBorder]}>{contractor.email}</Text>
                    <Text style={[{ width: columns.company, padding: 12, fontSize: 12, color: '#1F2937' }, styles.tableBorder]}>{contractor.company}</Text>
                    <Text style={[{ width: columns.services, padding: 12, fontSize: 11, color: '#1F2937' }]}>
                      {contractor.services.length > 0 ? contractor.services.join(', ') : 'None'}
                    </Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
        </ScrollView>
      </View>
    );
  };



  // Editable Approval Permit Screen (for Pending Approval)
  const EditableApprovalPermitScreen = ({ permit, setPermits, setCurrentScreen, permits, styles }) => {
    const [editData, setEditData] = React.useState({
      ...permit,
      specializedPermits: permit.specializedPermits || initialSpecializedPermits,
      singleHazards: permit.singleHazards || initialSingleHazards,
      jsea: permit.jsea || initialJSEA,
      isolations: permit.isolations || initialIsolations,
      signOns: permit.signOns || initialSignOns
    });
    const [expandedSections, setExpandedSections] = React.useState({
      general: true,
      specialized: false,
      hazards: false,
      jsea: false,
      isolations: false,
      controlsSummary: true,
      signons: false
    });
    const toggleSection = (section) => setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    // ...reuse helpers from EditActivePermitScreen for editing fields...
    const handleSpecializedChange = (key, field, value) => {
      setEditData(prev => ({
        ...prev,
        specializedPermits: {
          ...prev.specializedPermits,
          [key]: { ...prev.specializedPermits[key], [field]: value }
        }
      }));
    };
    const handleHazardChange = (key, field, value) => {
      setEditData(prev => ({
        ...prev,
        singleHazards: {
          ...prev.singleHazards,
          [key]: { ...prev.singleHazards[key], [field]: value }
        }
      }));
    };
    const updateJSEAStep = (idx, field, value) => {
      setEditData(prev => {
        const steps = [...prev.jsea.taskSteps];
        steps[idx] = { ...steps[idx], [field]: value };
        return { ...prev, jsea: { ...prev.jsea, taskSteps: steps } };
      });
    };
    const handleSignOnChange = (idx, field, value) => {
      setEditData(prev => {
        const signOns = [...(prev.signOns || [])];
        signOns[idx] = { ...signOns[idx], [field]: value };
        return { ...prev, signOns };
      });
    };
    return (
      <ScrollView style={{ flex: 1, backgroundColor: '#F9FAFB' }} contentContainerStyle={{ padding: 16 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setCurrentScreen('pending_approval')}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Review/Edit Permit #{editData.permitNumber}</Text>
        </View>

        {/* GENERAL DETAILS - COLLAPSIBLE */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('general')}>
            <Text style={styles.sectionTitle}>General Details</Text>
            <Text style={styles.expandIcon}>{expandedSections.general ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {expandedSections.general && (
            <View style={styles.sectionContent}>
              <Text style={styles.label}>Description:</Text>
              <TextInput style={styles.input} value={editData.description || ''} onChangeText={text => setEditData({ ...editData, description: text })} multiline />
              <Text style={styles.label}>Location:</Text>
              <TextInput style={styles.input} value={editData.location || ''} onChangeText={text => setEditData({ ...editData, location: text })} />
              <Text style={styles.label}>Requested By:</Text>
              <TextInput style={styles.input} value={editData.requestedBy || ''} onChangeText={text => setEditData({ ...editData, requestedBy: text })} />
              <Text style={styles.label}>Priority:</Text>
              <TextInput style={styles.input} value={editData.priority || ''} onChangeText={text => setEditData({ ...editData, priority: text })} />
              <Text style={styles.label}>Status:</Text>
              <TextInput style={[styles.input, { backgroundColor: '#F3F4F6', borderColor: '#D1D5DB', color: '#6B7280' }]} value={editData.status || ''} editable={false} />
              <Text style={styles.label}>Dates:</Text>
              <TextInput style={styles.input} value={editData.startDate || ''} onChangeText={text => setEditData({ ...editData, startDate: text })} placeholder="Start Date" />
              <TextInput style={styles.input} value={editData.startTime || ''} onChangeText={text => setEditData({ ...editData, startTime: text })} placeholder="Start Time" />
              <TextInput style={styles.input} value={editData.endDate || ''} onChangeText={text => setEditData({ ...editData, endDate: text })} placeholder="End Date" />
              <TextInput style={styles.input} value={editData.endTime || ''} onChangeText={text => setEditData({ ...editData, endTime: text })} placeholder="End Time" />
            </View>
          )}
        </View>

        {/* SPECIALIZED PERMITS - COLLAPSIBLE */}
        {editData.specializedPermits && permitQuestionnaires && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('specialized')}>
              <Text style={styles.sectionTitle}>Specialized Permits</Text>
              <Text style={styles.expandIcon}>{expandedSections.specialized ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {expandedSections.specialized && (
              <View style={styles.sectionContent}>
                {Object.entries(editData.specializedPermits).map(([key, val]) => {
                  const permit = specializedPermitTypes.find(p => p.key === key);
                  return (
                    <View key={key} style={{ marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingBottom: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <Switch
                          value={val.required}
                          onValueChange={v => handleSpecializedChange(key, 'required', v)}
                        />
                        <Text style={{ marginLeft: 8, fontWeight: 'bold' }}>{permit?.label || key}</Text>
                      </View>
                      {val.required &&
                        renderQuestionnaire(
                          key,
                          editData,
                          (permitKey, qid, value, field = 'answer') => {
                            const updated = {
                              ...val.questionnaire,
                              [qid]: { ...val.questionnaire?.[qid], [field]: value }
                            };
                            handleSpecializedChange(key, 'questionnaire', updated);
                          },
                          permitQuestionnaires,
                          styles
                        )
                      }
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* SINGLE HAZARDS - COLLAPSIBLE */}
        {editData.singleHazards && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('hazards')}>
              <Text style={styles.sectionTitle}>Single Hazards</Text>
              <Text style={styles.expandIcon}>{expandedSections.hazards ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {expandedSections.hazards && (
              <View style={styles.sectionContent}>
                {Object.entries(editData.singleHazards).map(([key, val]) => {
                  const hazard = singleHazardTypes.find(h => h.key === key);
                  return (
                    <View key={key} style={{ marginBottom: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <Switch
                          value={val.present}
                          onValueChange={v => handleHazardChange(key, 'present', v)}
                        />
                        <Text style={{ marginLeft: 8, fontWeight: 'bold' }}>{hazard?.label || key}</Text>
                      </View>
                      {val.present && (
                        <TextInput style={styles.input} value={val.controls} onChangeText={text => handleHazardChange(key, 'controls', text)} placeholder="Controls" />
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* JSEA - COLLAPSIBLE */}
        {editData.jsea && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('jsea')}>
              <Text style={styles.sectionTitle}>JSEA Task Steps</Text>
              <Text style={styles.expandIcon}>{expandedSections.jsea ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {expandedSections.jsea && (
              <View style={styles.sectionContent}>
                {editData.jsea.taskSteps && editData.jsea.taskSteps.length > 0 ? editData.jsea.taskSteps.map((step, idx) => (
                  <View key={idx} style={{ marginBottom: 8, marginLeft: 8 }}>
                    <Text style={styles.detailText}>Step {idx + 1}:</Text>
                    <TextInput style={styles.input} value={step.step} onChangeText={text => updateJSEAStep(idx, 'step', text)} placeholder="Step" />
                    <TextInput style={styles.input} value={step.hazards} onChangeText={text => updateJSEAStep(idx, 'hazards', text)} placeholder="Hazards" />
                    <TextInput style={styles.input} value={step.controls} onChangeText={text => updateJSEAStep(idx, 'controls', text)} placeholder="Controls" />
                    <TextInput style={styles.input} value={step.riskLevel} onChangeText={text => updateJSEAStep(idx, 'riskLevel', text)} placeholder="Risk Level" />
                    <TouchableOpacity onPress={() => {
                      setEditData(prev => {
                        const steps = [...prev.jsea.taskSteps];
                        steps.splice(idx, 1);
                        return { ...prev, jsea: { ...prev.jsea, taskSteps: steps } };
                      });
                    }}>
                      <Text style={styles.removeButton}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                )) : <Text style={styles.detailText}>None</Text>}
                <TouchableOpacity style={styles.addButton} onPress={() => setEditData(prev => ({
                  ...prev,
                  jsea: { ...prev.jsea, taskSteps: [...(prev.jsea.taskSteps || []), { step: '', hazards: '', controls: '', riskLevel: '' }] }
                }))}>
                  <Text style={styles.addButtonText}>Add Step</Text>
                </TouchableOpacity>
                <Text style={[styles.label, { marginTop: 12 }]}>Overall Risk Rating:</Text>
                <TextInput style={styles.input} value={editData.jsea.overallRiskRating || ''} onChangeText={text => setEditData(prev => ({ ...prev, jsea: { ...prev.jsea, overallRiskRating: text } }))} placeholder="Overall Risk Rating" />
                <Text style={styles.label}>Additional Precautions:</Text>
                <TextInput style={styles.input} value={editData.jsea.additionalPrecautions || ''} onChangeText={text => setEditData(prev => ({ ...prev, jsea: { ...prev.jsea, additionalPrecautions: text } }))} placeholder="Any additional precautions..." />
              </View>
            )}
          </View>
        )}

        {/* ISOLATIONS - COLLAPSIBLE */}
        {editData.isolations && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('isolations')}>
              <Text style={styles.sectionTitle}>Isolations</Text>
              <Text style={styles.expandIcon}>{expandedSections.isolations ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {expandedSections.isolations && (
              <View style={styles.sectionContent}>
                {editData.isolations && editData.isolations.length > 0 ? editData.isolations.map((isolation, idx) => (
                  <View key={idx} style={{ marginBottom: 8, marginLeft: 8 }}>
                    <Text style={styles.detailText}>What:</Text>
                    <TextInput style={styles.input} value={isolation.what} onChangeText={text => {
                      const updated = [...editData.isolations];
                      updated[idx] = { ...updated[idx], what: text };
                      setEditData(prev => ({ ...prev, isolations: updated }));
                    }} placeholder="What was isolated" />
                    <Text style={styles.detailText}>Isolated By:</Text>
                    <TextInput style={styles.input} value={isolation.isolatedBy} onChangeText={text => {
                      const updated = [...editData.isolations];
                      updated[idx] = { ...updated[idx], isolatedBy: text };
                      setEditData(prev => ({ ...prev, isolations: updated }));
                    }} placeholder="Isolated By" />
                    <Text style={styles.detailText}>Date:</Text>
                    <TextInput style={styles.input} value={isolation.date} onChangeText={text => {
                      const updated = [...editData.isolations];
                      updated[idx] = { ...updated[idx], date: text };
                      setEditData(prev => ({ ...prev, isolations: updated }));
                    }} placeholder="Date" />
                    <TouchableOpacity onPress={() => {
                      const updated = editData.isolations.filter((_, i) => i !== idx);
                      setEditData(prev => ({ ...prev, isolations: updated }));
                    }}>
                      <Text style={styles.removeButton}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                )) : <Text style={styles.detailText}>None</Text>}
                <TouchableOpacity style={styles.addButton} onPress={() => setEditData(prev => ({ ...prev, isolations: [...(prev.isolations || []), { what: '', isolatedBy: '', date: '' }] }))}>
                  <Text style={styles.addButtonText}>Add Isolation</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* CONTROLS SUMMARY - COLLAPSIBLE */}
        {(editData.specializedPermits || editData.singleHazards || editData.jsea?.taskSteps) && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('controlsSummary')}>
              <Text style={[styles.sectionTitle, { color: '#D97706' }]}>Controls Summary</Text>
              <Text style={styles.expandIcon}>{expandedSections.controlsSummary ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {expandedSections.controlsSummary && (
              <View style={[styles.sectionContent, { backgroundColor: '#FEF3C7', borderLeftWidth: 4, borderLeftColor: '#F59E0B' }]}>
                {/* Specialized Permits Controls */}
                {editData.specializedPermits && Object.entries(editData.specializedPermits).some(([_, val]) => val.required && val.questionnaire) && (
                  <View style={{ marginBottom: 12 }}>
                    <Text style={{ fontWeight: 'bold', marginBottom: 6 }}>Specialized Permits:</Text>
                    {Object.entries(editData.specializedPermits).map(([key, val]) => {
                      const permit = specializedPermitTypes.find(p => p.key === key);
                      return val.required && val.questionnaire ? (
                        <View key={key} style={{ marginLeft: 8, marginBottom: 8 }}>
                          <Text style={[styles.detailText, { fontWeight: '600', color: '#374151' }]}>{permit?.label || key}:</Text>
                          {Object.entries(val.questionnaire).map(([qid, qval]) => 
                            qval.controls ? (
                              <Text key={qid} style={[styles.detailText, { marginLeft: 8, color: '#374151' }]}>• {qval.controls}</Text>
                            ) : null
                          )}
                        </View>
                      ) : null;
                    })}
                  </View>
                )}

                {/* Single Hazards Controls */}
                {editData.singleHazards && Object.entries(editData.singleHazards).some(([_, val]) => val.present && val.controls) && (
                  <View style={{ marginBottom: 12 }}>
                    <Text style={{ fontWeight: 'bold', marginBottom: 6 }}>Single Hazards:</Text>
                    {Object.entries(editData.singleHazards).map(([key, val]) => {
                      const hazard = singleHazardTypes.find(h => h.key === key);
                      return val.present && val.controls ? (
                        <View key={key} style={{ marginLeft: 8, marginBottom: 6 }}>
                          <Text style={[styles.detailText, { color: '#374151' }]}>{hazard?.label || key}:</Text>
                          <Text style={[styles.detailText, { marginLeft: 8, color: '#374151' }]}>• {val.controls}</Text>
                        </View>
                      ) : null;
                    })}
                  </View>
                )}

                {/* JSEA Task Steps Controls */}
                {editData.jsea?.taskSteps && editData.jsea.taskSteps.some(step => step.controls) && (
                  <View>
                    <Text style={{ fontWeight: 'bold', marginBottom: 6 }}>JSEA Task Controls:</Text>
                    {editData.jsea.taskSteps.map((step, idx) => 
                      step.controls ? (
                        <View key={idx} style={{ marginLeft: 8, marginBottom: 6 }}>
                          <Text style={[styles.detailText, { color: '#374151' }]}>Step {idx + 1}: • {step.controls}</Text>
                        </View>
                      ) : null
                    )}
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* SIGN-ONS - COLLAPSIBLE */}
        {editData.signOns && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('signons')}>
              <Text style={styles.sectionTitle}>Sign-On (Other Workers)</Text>
              <Text style={styles.expandIcon}>{expandedSections.signons ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {expandedSections.signons && (
              <View style={styles.sectionContent}>
                {editData.signOns.map((signOn, idx) => (
                  <View key={idx} style={{ marginBottom: 8, marginLeft: 8 }}>
                    <Text style={styles.detailText}>Name:</Text>
                    <TextInput style={styles.input} value={signOn.name} onChangeText={text => handleSignOnChange(idx, 'name', text)} placeholder="Worker Name" />
                    <Text style={styles.detailText}>Signature:</Text>
                    <TextInput style={styles.input} value={signOn.signature} onChangeText={text => handleSignOnChange(idx, 'signature', text)} placeholder="Signature" />
                    <TouchableOpacity onPress={() => {
                      setEditData(prev => {
                        const signOns = prev.signOns.filter((_, i) => i !== idx);
                        return { ...prev, signOns };
                      });
                    }}>
                      <Text style={styles.removeButton}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity style={styles.addButton} onPress={() => setEditData(prev => ({ ...prev, signOns: [...(prev.signOns || []), { name: '', signature: '' }] }))}>
                  <Text style={styles.addButtonText}>Add Worker</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        <View style={styles.submitSection}>
          <TouchableOpacity style={styles.submitButton} onPress={async () => {
            // Approve: set status to 'pending_inspection' or 'active' and update permit
            const highRiskSpecials = ['hotWork', 'confinedSpace', 'workingAtHeight', 'electrical', 'lifting', 'blasting'];
            const isHighRisk = ['high', 'very_high'].includes(editData.jsea?.overallRiskRating?.toLowerCase?.()) ||
              (editData.specializedPermits && Object.keys(editData.specializedPermits).some(key => highRiskSpecials.includes(key) && editData.specializedPermits[key]?.required));
            
            try {
              const newStatus = isHighRisk ? 'pending_inspection' : 'active';
              const approvedDate = new Date().toISOString().split('T')[0];
              
              await updatePermit(editData.id, { 
                status: newStatus, 
                approved_date: approvedDate 
              });
              
              const freshPermits = await listPermits();
              setPermits(freshPermits);
              setCurrentScreen('dashboard');
              Alert.alert('Permit Approved', isHighRisk ? 'Permit has been approved and moved to Needs Inspection.' : 'Permit has been approved and is now Active.');
            } catch (error) {
              Alert.alert('Error', 'Failed to approve permit: ' + error.message);
            }
          }}>
            <Text style={styles.submitButtonText}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.submitButton, { backgroundColor: '#EF4444', marginLeft: 12 }]} onPress={async () => {
            // Reject: set status to 'rejected' and update permit
            try {
              const rejectedDate = new Date().toISOString().split('T')[0];
              
              await updatePermit(editData.id, { 
                status: 'rejected', 
                rejected_date: rejectedDate 
              });
              
              const freshPermits = await listPermits();
              setPermits(freshPermits);
              setCurrentScreen('dashboard');
              Alert.alert('Permit Rejected', 'Permit has been rejected.');
            } catch (error) {
              Alert.alert('Error', 'Failed to reject permit: ' + error.message);
            }
          }}>
            <Text style={styles.submitButtonText}>Reject</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  // Editable Inspection Permit Screen (for Needs Inspection)
  const EditInspectionPermitScreen = ({ permit, setPermits, setCurrentScreen, permits, styles }) => {
    const [editData, setEditData] = React.useState({
      ...permit,
      specializedPermits: permit.specializedPermits || initialSpecializedPermits,
      singleHazards: permit.singleHazards || initialSingleHazards,
      jsea: permit.jsea || initialJSEA,
      isolations: permit.isolations || initialIsolations,
      signOns: permit.signOns || initialSignOns
    });
    const [inspector, setInspector] = React.useState('');
    const [date, setDate] = React.useState(new Date().toISOString().split('T')[0]);
    const [comments, setComments] = React.useState('');
    const [expandedSections, setExpandedSections] = React.useState({
      general: true,
      specialized: false,
      hazards: false,
      jsea: false,
      isolations: false,
      signons: false,
      controlsSummary: false
    });
    const toggleSection = (section) => setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    const handleSpecializedChange = (key, field, value) => {
      setEditData(prev => ({
        ...prev,
        specializedPermits: {
          ...prev.specializedPermits,
          [key]: { ...prev.specializedPermits[key], [field]: value }
        }
      }));
    };
    const handleHazardChange = (key, field, value) => {
      setEditData(prev => ({
        ...prev,
        singleHazards: {
          ...prev.singleHazards,
          [key]: { ...prev.singleHazards[key], [field]: value }
        }
      }));
    };
    const updateJSEAStep = (idx, field, value) => {
      setEditData(prev => {
        const steps = [...prev.jsea.taskSteps];
        steps[idx] = { ...steps[idx], [field]: value };
        return { ...prev, jsea: { ...prev.jsea, taskSteps: steps } };
      });
    };
    const handleSignOnChange = (idx, field, value) => {
      setEditData(prev => {
        const signOns = [...(prev.signOns || [])];
        signOns[idx] = { ...signOns[idx], [field]: value };
        return { ...prev, signOns };
      });
    };
    return (
      <ScrollView style={{ flex: 1, backgroundColor: '#F9FAFB' }} contentContainerStyle={{ padding: 16 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setCurrentScreen('pending_inspection')}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Inspect/Edit Permit #{editData.permitNumber}</Text>
        </View>

        {/* GENERAL DETAILS - COLLAPSIBLE */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('general')}>
            <Text style={styles.sectionTitle}>General Details</Text>
            <Text style={styles.expandIcon}>{expandedSections.general ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {expandedSections.general && (
            <View style={styles.sectionContent}>
              <Text style={styles.label}>Description:</Text>
              <TextInput style={styles.input} value={editData.description || ''} onChangeText={text => setEditData({ ...editData, description: text })} multiline />
              <Text style={styles.label}>Location:</Text>
              <TextInput style={styles.input} value={editData.location || ''} onChangeText={text => setEditData({ ...editData, location: text })} />
              <Text style={styles.label}>Requested By:</Text>
              <TextInput style={styles.input} value={editData.requestedBy || ''} onChangeText={text => setEditData({ ...editData, requestedBy: text })} />
              <Text style={styles.label}>Priority:</Text>
              <TextInput style={styles.input} value={editData.priority || ''} onChangeText={text => setEditData({ ...editData, priority: text })} />
              <Text style={styles.label}>Status:</Text>
              <TextInput style={[styles.input, { backgroundColor: '#F3F4F6', borderColor: '#D1D5DB', color: '#6B7280' }]} value={editData.status || ''} editable={false} />
              <Text style={styles.label}>Dates:</Text>
              <TextInput style={styles.input} value={editData.startDate || ''} onChangeText={text => setEditData({ ...editData, startDate: text })} placeholder="Start Date" />
              <TextInput style={styles.input} value={editData.startTime || ''} onChangeText={text => setEditData({ ...editData, startTime: text })} placeholder="Start Time" />
              <TextInput style={styles.input} value={editData.endDate || ''} onChangeText={text => setEditData({ ...editData, endDate: text })} placeholder="End Date" />
              <TextInput style={styles.input} value={editData.endTime || ''} onChangeText={text => setEditData({ ...editData, endTime: text })} placeholder="End Time" />
            </View>
          )}
        </View>

        {/* SPECIALIZED PERMITS - COLLAPSIBLE */}
        {editData.specializedPermits && permitQuestionnaires && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('specialized')}>
              <Text style={styles.sectionTitle}>Specialized Permits</Text>
              <Text style={styles.expandIcon}>{expandedSections.specialized ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {expandedSections.specialized && (
              <View style={styles.sectionContent}>
                {Object.entries(editData.specializedPermits).map(([key, val]) => {
                  const permit = specializedPermitTypes.find(p => p.key === key);
                  return (
                    <View key={key} style={{ marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingBottom: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <Switch
                          value={val.required}
                          onValueChange={v => handleSpecializedChange(key, 'required', v)}
                        />
                        <Text style={{ marginLeft: 8, fontWeight: 'bold' }}>{permit?.label || key}</Text>
                      </View>
                      {val.required &&
                        renderQuestionnaire(
                          key,
                          editData,
                          (permitKey, qid, value, field = 'answer') => {
                            const updated = {
                              ...val.questionnaire,
                              [qid]: { ...val.questionnaire?.[qid], [field]: value }
                            };
                            handleSpecializedChange(key, 'questionnaire', updated);
                          },
                          permitQuestionnaires,
                          styles
                        )
                      }
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* SINGLE HAZARDS - COLLAPSIBLE */}
        {editData.singleHazards && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('hazards')}>
              <Text style={styles.sectionTitle}>Single Hazards</Text>
              <Text style={styles.expandIcon}>{expandedSections.hazards ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {expandedSections.hazards && (
              <View style={styles.sectionContent}>
                {Object.entries(editData.singleHazards).map(([key, val]) => {
                  const hazard = singleHazardTypes.find(h => h.key === key);
                  return (
                    <View key={key} style={{ marginBottom: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <Switch
                          value={val.present}
                          onValueChange={v => handleHazardChange(key, 'present', v)}
                        />
                        <Text style={{ marginLeft: 8, fontWeight: 'bold' }}>{hazard?.label || key}</Text>
                      </View>
                      {val.present && (
                        <TextInput style={styles.input} value={val.controls} onChangeText={text => handleHazardChange(key, 'controls', text)} placeholder="Controls" />
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* JSEA - COLLAPSIBLE */}
        {editData.jsea && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('jsea')}>
              <Text style={styles.sectionTitle}>JSEA Task Steps</Text>
              <Text style={styles.expandIcon}>{expandedSections.jsea ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {expandedSections.jsea && (
              <View style={styles.sectionContent}>
                {editData.jsea.taskSteps && editData.jsea.taskSteps.length > 0 ? editData.jsea.taskSteps.map((step, idx) => (
                  <View key={idx} style={{ marginBottom: 8, marginLeft: 8 }}>
                    <Text style={styles.detailText}>Step {idx + 1}:</Text>
                    <TextInput style={styles.input} value={step.step} onChangeText={text => updateJSEAStep(idx, 'step', text)} placeholder="Step" />
                    <TextInput style={styles.input} value={step.hazards} onChangeText={text => updateJSEAStep(idx, 'hazards', text)} placeholder="Hazards" />
                    <TextInput style={styles.input} value={step.controls} onChangeText={text => updateJSEAStep(idx, 'controls', text)} placeholder="Controls" />
                    <TextInput style={styles.input} value={step.riskLevel} onChangeText={text => updateJSEAStep(idx, 'riskLevel', text)} placeholder="Risk Level" />
                    <TouchableOpacity onPress={() => {
                      setEditData(prev => {
                        const steps = [...prev.jsea.taskSteps];
                        steps.splice(idx, 1);
                        return { ...prev, jsea: { ...prev.jsea, taskSteps: steps } };
                      });
                    }}>
                      <Text style={styles.removeButton}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                )) : <Text style={styles.detailText}>None</Text>}
                <TouchableOpacity style={styles.addButton} onPress={() => setEditData(prev => ({
                  ...prev,
                  jsea: { ...prev.jsea, taskSteps: [...(prev.jsea.taskSteps || []), { step: '', hazards: '', controls: '', riskLevel: '' }] }
                }))}>
                  <Text style={styles.addButtonText}>Add Step</Text>
                </TouchableOpacity>
                <Text style={[styles.label, { marginTop: 12 }]}>Overall Risk Rating:</Text>
                <TextInput style={styles.input} value={editData.jsea.overallRiskRating || ''} onChangeText={text => setEditData(prev => ({ ...prev, jsea: { ...prev.jsea, overallRiskRating: text } }))} placeholder="Overall Risk Rating" />
                <Text style={styles.label}>Additional Precautions:</Text>
                <TextInput style={styles.input} value={editData.jsea.additionalPrecautions || ''} onChangeText={text => setEditData(prev => ({ ...prev, jsea: { ...prev.jsea, additionalPrecautions: text } }))} placeholder="Any additional precautions..." />
              </View>
            )}
          </View>
        )}

        {/* ISOLATIONS - COLLAPSIBLE */}
        {editData.isolations && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('isolations')}>
              <Text style={styles.sectionTitle}>Isolations</Text>
              <Text style={styles.expandIcon}>{expandedSections.isolations ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {expandedSections.isolations && (
              <View style={styles.sectionContent}>
                {editData.isolations && editData.isolations.length > 0 ? editData.isolations.map((isolation, idx) => (
                  <View key={idx} style={{ marginBottom: 8, marginLeft: 8 }}>
                    <Text style={styles.detailText}>What:</Text>
                    <TextInput style={styles.input} value={isolation.what} onChangeText={text => {
                      const updated = [...editData.isolations];
                      updated[idx] = { ...updated[idx], what: text };
                      setEditData(prev => ({ ...prev, isolations: updated }));
                    }} placeholder="What was isolated" />
                    <Text style={styles.detailText}>Isolated By:</Text>
                    <TextInput style={styles.input} value={isolation.isolatedBy} onChangeText={text => {
                      const updated = [...editData.isolations];
                      updated[idx] = { ...updated[idx], isolatedBy: text };
                      setEditData(prev => ({ ...prev, isolations: updated }));
                    }} placeholder="Isolated By" />
                    <Text style={styles.detailText}>Date:</Text>
                    <TextInput style={styles.input} value={isolation.date} onChangeText={text => {
                      const updated = [...editData.isolations];
                      updated[idx] = { ...updated[idx], date: text };
                      setEditData(prev => ({ ...prev, isolations: updated }));
                    }} placeholder="Date" />
                    <TouchableOpacity onPress={() => {
                      const updated = editData.isolations.filter((_, i) => i !== idx);
                      setEditData(prev => ({ ...prev, isolations: updated }));
                    }}>
                      <Text style={styles.removeButton}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                )) : <Text style={styles.detailText}>None</Text>}
                <TouchableOpacity style={styles.addButton} onPress={() => setEditData(prev => ({ ...prev, isolations: [...(prev.isolations || []), { what: '', isolatedBy: '', date: '' }] }))}>
                  <Text style={styles.addButtonText}>Add Isolation</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* SIGN-ONS - COLLAPSIBLE */}
        {editData.signOns && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('signons')}>
              <Text style={styles.sectionTitle}>Sign-On (Other Workers)</Text>
              <Text style={styles.expandIcon}>{expandedSections.signons ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {expandedSections.signons && (
              <View style={styles.sectionContent}>
                {editData.signOns.map((signOn, idx) => (
                  <View key={idx} style={{ marginBottom: 8, marginLeft: 8 }}>
                    <Text style={styles.detailText}>Name:</Text>
                    <TextInput style={styles.input} value={signOn.name} onChangeText={text => handleSignOnChange(idx, 'name', text)} placeholder="Worker Name" />
                    <Text style={styles.detailText}>Signature:</Text>
                    <TextInput style={styles.input} value={signOn.signature} onChangeText={text => handleSignOnChange(idx, 'signature', text)} placeholder="Signature" />
                    <TouchableOpacity onPress={() => {
                      setEditData(prev => {
                        const signOns = prev.signOns.filter((_, i) => i !== idx);
                        return { ...prev, signOns };
                      });
                    }}>
                      <Text style={styles.removeButton}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity style={styles.addButton} onPress={() => setEditData(prev => ({ ...prev, signOns: [...(prev.signOns || []), { name: '', signature: '' }] }))}>
                  <Text style={styles.addButtonText}>Add Worker</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* CONTROLS SUMMARY - COLLAPSIBLE */}
        {(editData.specializedPermits || editData.singleHazards || editData.jsea?.taskSteps) && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('controlsSummary')}>
              <Text style={[styles.sectionTitle, { color: '#D97706' }]}>Controls Summary</Text>
              <Text style={styles.expandIcon}>{expandedSections.controlsSummary ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {expandedSections.controlsSummary && (
              <View style={[styles.sectionContent, { backgroundColor: '#FEF3C7', borderLeftWidth: 4, borderLeftColor: '#F59E0B' }]}>
                {/* Specialized Permits Controls */}
                {editData.specializedPermits && Object.entries(editData.specializedPermits).some(([_, val]) => val.required && val.questionnaire) && (
                  <View style={{ marginBottom: 12 }}>
                    <Text style={{ fontWeight: 'bold', marginBottom: 6 }}>Specialized Permits:</Text>
                    {Object.entries(editData.specializedPermits).map(([key, val]) => {
                      const permit = specializedPermitTypes.find(p => p.key === key);
                      return val.required && val.questionnaire ? (
                        <View key={key} style={{ marginLeft: 8, marginBottom: 8 }}>
                          <Text style={[styles.detailText, { fontWeight: '600', color: '#374151' }]}>{permit?.label || key}:</Text>
                          {Object.entries(val.questionnaire).map(([qid, qval]) => 
                            qval.controls ? (
                              <Text key={qid} style={[styles.detailText, { marginLeft: 8, color: '#374151' }]}>• {qval.controls}</Text>
                            ) : null
                          )}
                        </View>
                      ) : null;
                    })}
                  </View>
                )}

                {/* Single Hazards Controls */}
                {editData.singleHazards && Object.entries(editData.singleHazards).some(([_, val]) => val.present && val.controls) && (
                  <View style={{ marginBottom: 12 }}>
                    <Text style={{ fontWeight: 'bold', marginBottom: 6 }}>Single Hazards:</Text>
                    {Object.entries(editData.singleHazards).map(([key, val]) => {
                      const hazard = singleHazardTypes.find(h => h.key === key);
                      return val.present && val.controls ? (
                        <View key={key} style={{ marginLeft: 8, marginBottom: 6 }}>
                          <Text style={[styles.detailText, { color: '#374151' }]}>{hazard?.label || key}:</Text>
                          <Text style={[styles.detailText, { marginLeft: 8, color: '#374151' }]}>• {val.controls}</Text>
                        </View>
                      ) : null;
                    })}
                  </View>
                )}

                {/* JSEA Task Steps Controls */}
                {editData.jsea?.taskSteps && editData.jsea.taskSteps.some(step => step.controls) && (
                  <View>
                    <Text style={{ fontWeight: 'bold', marginBottom: 6 }}>JSEA Task Controls:</Text>
                    {editData.jsea.taskSteps.map((step, idx) => 
                      step.controls ? (
                        <View key={idx} style={{ marginLeft: 8, marginBottom: 6 }}>
                          <Text style={[styles.detailText, { color: '#374151' }]}>Step {idx + 1}: • {step.controls}</Text>
                        </View>
                      ) : null
                    )}
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* INSPECTION DETAILS */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Inspection Details</Text>
          </View>
          <View style={styles.sectionContent}>
            <Text style={styles.label}>Inspector Name:</Text>
            <TextInput style={styles.input} value={inspector} onChangeText={setInspector} placeholder="Inspector Name" />
            <Text style={styles.label}>Inspection Date:</Text>
            <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="Date" />
            <Text style={styles.label}>Inspection Comments:</Text>
            <TextInput style={styles.input} value={comments} onChangeText={setComments} placeholder="What was inspected?" multiline />
          </View>
        </View>

        <View style={styles.submitSection}>
          <TouchableOpacity style={styles.submitButton} onPress={() => {
            const updated = permits.map(p => p.id === editData.id ? { ...editData, status: 'active', inspected: { inspector, date, comments } } : p);
            setPermits(updated);
            setCurrentScreen('dashboard');
            Alert.alert('Inspection Complete', 'Permit has been inspected and is now Active.');
          }}>
            <Text style={styles.submitButtonText}>Mark as Inspected</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  // Render list of permits needing inspection
  const renderInspectionList = () => {
    return (
      <View style={styles.screenContainer}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setCurrentScreen('dashboard')}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Needs Inspection</Text>
        </View>
        <View style={styles.permitListContainer}>
          <FlatList
            data={permits.filter(p => p.status === 'pending_inspection')}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View style={styles.permitListCard}>
                <View style={styles.permitListHeader}>
                  <Text style={styles.permitId}>#{item.permitNumber}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}> 
                    <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
                  </View>
                </View>
                <Text style={styles.permitType}>{item.type}</Text>
                <Text style={styles.permitDescription}>{item.description}</Text>
                <View style={styles.permitDetails}>
                  <Text style={styles.detailText}>Location: {item.location}</Text>
                  <Text style={styles.detailText}>Requested by: {item.requestedBy}</Text>
                  <Text style={styles.detailText}>Date: {formatDateNZ(item.submittedDate || item.approvedDate || item.completedDate || '')}</Text>
                </View>
                <TouchableOpacity style={styles.primaryButton} onPress={() => {
                  setSelectedPermit(item);
                  setCurrentScreen('inspect_permit');
                }}>
                  <Text style={styles.primaryButtonText}>Inspect</Text>
                </TouchableOpacity>
              </View>
            )}
            ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 40, color: '#6B7280' }}>No permits need inspection.</Text>}
            contentContainerStyle={{ padding: 16 }}
          />
        </View>
      </View>
    );
  };

  // Active Permit List: editable, with completion sign-off
  const renderActivePermitList = () => {
    return (
      <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setCurrentScreen('dashboard')}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Active Permits</Text>
        </View>
        <FlatList
          data={permits.filter(p => p.status === 'active')}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.permitListCard}>
              <View style={styles.permitListHeader}>
                <Text style={styles.permitId}>#{item.permitNumber}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}> 
                  <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
                </View>
              </View>
              <Text style={styles.permitType}>{item.type}</Text>
              <Text style={styles.permitDescription}>{item.description}</Text>
              <View style={styles.permitDetails}>
                <Text style={styles.detailText}>Location: {item.location}</Text>
                <Text style={styles.detailText}>Requested by: {item.requestedBy}</Text>
                <Text style={styles.detailText}>Date: {formatDateNZ(item.submittedDate || item.approvedDate || item.completedDate || '')}</Text>
              </View>
              <TouchableOpacity style={styles.primaryButton} onPress={() => {
                setSelectedPermit(item);
                setCurrentScreen('edit_active_permit');
              }}>
                <Text style={styles.primaryButtonText}>Edit / Complete</Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 40, color: '#6B7280' }}>No active permits.</Text>}
          contentContainerStyle={{ padding: 16 }}
        />
      </View>
    );
  };

  // Edit/Complete Active Permit Screen
  const EditActivePermitScreen = ({ permit, setPermits, setCurrentScreen, permits, styles }) => {
    // Always get the latest permit from permits array
    const latestPermit = permits.find(p => p.id === permit.id) || permit;
    const [editData, setEditData] = React.useState({
      ...latestPermit,
      specializedPermits: latestPermit.specializedPermits || initialSpecializedPermits,
      singleHazards: latestPermit.singleHazards || initialSingleHazards,
      jsea: latestPermit.jsea || initialJSEA,
      isolations: latestPermit.isolations || initialIsolations,
      signOns: latestPermit.signOns || initialSignOns
    });
    
    // Load existing sign-off if present
    const completedSignOff = latestPermit.completedSignOff || {};
    const [issuerName, setIssuerName] = React.useState(completedSignOff.issuerName || '');
    const [issuerSignature, setIssuerSignature] = React.useState(completedSignOff.issuerSignature || '');
    const [receiverName, setReceiverName] = React.useState(completedSignOff.receiverName || '');
    const [receiverSignature, setReceiverSignature] = React.useState(completedSignOff.receiverSignature || '');
    
    const [expandedSections, setExpandedSections] = React.useState({
      general: true,
      specialized: false,
      hazards: false,
      jsea: false,
      isolations: false,
      signons: false,
      controlsSummary: false,
      completion: true
    });

    const toggleSection = (section) => setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));

    // Sync local state with latest permit when it changes
    React.useEffect(() => {
      setEditData({ ...latestPermit });
      setIssuerName(completedSignOff.issuerName || '');
      setIssuerSignature(completedSignOff.issuerSignature || '');
      setReceiverName(completedSignOff.receiverName || '');
      setReceiverSignature(completedSignOff.receiverSignature || '');
    }, [latestPermit.id, latestPermit.completedSignOff]);

    const handleSpecializedChange = (key, field, value) => {
      setEditData(prev => ({
        ...prev,
        specializedPermits: {
          ...prev.specializedPermits,
          [key]: { ...prev.specializedPermits[key], [field]: value }
        }
      }));
    };
    
    const handleHazardChange = (key, field, value) => {
      setEditData(prev => ({
        ...prev,
        singleHazards: {
          ...prev.singleHazards,
          [key]: { ...prev.singleHazards[key], [field]: value }
        }
      }));
    };
    
    const updateJSEAStep = (idx, field, value) => {
      setEditData(prev => {
        const steps = [...prev.jsea.taskSteps];
        steps[idx] = { ...steps[idx], [field]: value };
        return { ...prev, jsea: { ...prev.jsea, taskSteps: steps } };
      });
    };
    
    const handleSignOnChange = (idx, field, value) => {
      setEditData(prev => {
        const signOns = [...(prev.signOns || [])];
        signOns[idx] = { ...signOns[idx], [field]: value };
        return { ...prev, signOns };
      });
    };

    const canComplete = issuerName && issuerSignature && receiverName && receiverSignature;

    return (
      <ScrollView style={{ flex: 1, backgroundColor: '#F9FAFB' }} contentContainerStyle={{ padding: 16 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setCurrentScreen('active')}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Edit/Complete Permit #{editData.permitNumber}</Text>
        </View>

        {/* GENERAL DETAILS - COLLAPSIBLE */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('general')}>
            <Text style={styles.sectionTitle}>General Details</Text>
            <Text style={styles.expandIcon}>{expandedSections.general ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {expandedSections.general && (
            <View style={styles.sectionContent}>
              <Text style={styles.label}>Description:</Text>
              <TextInput style={styles.input} value={editData.description || ''} onChangeText={text => setEditData({ ...editData, description: text })} multiline />
              <Text style={styles.label}>Location:</Text>
              <TextInput style={styles.input} value={editData.location || ''} onChangeText={text => setEditData({ ...editData, location: text })} />
              <Text style={styles.label}>Requested By:</Text>
              <TextInput style={styles.input} value={editData.requestedBy || ''} onChangeText={text => setEditData({ ...editData, requestedBy: text })} />
              <Text style={styles.label}>Priority:</Text>
              <TextInput style={styles.input} value={editData.priority || ''} onChangeText={text => setEditData({ ...editData, priority: text })} />
              <Text style={styles.label}>Status:</Text>
              <TextInput style={[styles.input, { backgroundColor: '#F3F4F6', borderColor: '#D1D5DB', color: '#6B7280' }]} value={editData.status || ''} editable={false} />
              <Text style={styles.label}>Dates:</Text>
              <TextInput style={styles.input} value={editData.startDate || ''} onChangeText={text => setEditData({ ...editData, startDate: text })} placeholder="Start Date" />
              <TextInput style={styles.input} value={editData.startTime || ''} onChangeText={text => setEditData({ ...editData, startTime: text })} placeholder="Start Time" />
              <TextInput style={styles.input} value={editData.endDate || ''} onChangeText={text => setEditData({ ...editData, endDate: text })} placeholder="End Date" />
              <TextInput style={styles.input} value={editData.endTime || ''} onChangeText={text => setEditData({ ...editData, endTime: text })} placeholder="End Time" />
            </View>
          )}
        </View>

        {/* SPECIALIZED PERMITS - COLLAPSIBLE */}
        {editData.specializedPermits && permitQuestionnaires && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('specialized')}>
              <Text style={styles.sectionTitle}>Specialized Permits</Text>
              <Text style={styles.expandIcon}>{expandedSections.specialized ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {expandedSections.specialized && (
              <View style={styles.sectionContent}>
                {Object.entries(editData.specializedPermits).map(([key, val]) => {
                  const permit = specializedPermitTypes.find(p => p.key === key);
                  return (
                    <View key={key} style={{ marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingBottom: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <Switch
                          value={val.required}
                          onValueChange={v => handleSpecializedChange(key, 'required', v)}
                        />
                        <Text style={{ marginLeft: 8, fontWeight: 'bold' }}>{permit?.label || key}</Text>
                      </View>
                      {val.required &&
                        renderQuestionnaire(
                          key,
                          editData,
                          (permitKey, qid, value, field = 'answer') => {
                            const updated = {
                              ...val.questionnaire,
                              [qid]: { ...val.questionnaire?.[qid], [field]: value }
                            };
                            handleSpecializedChange(key, 'questionnaire', updated);
                          },
                          permitQuestionnaires,
                          styles
                        )
                      }
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* SINGLE HAZARDS - COLLAPSIBLE */}
        {editData.singleHazards && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('hazards')}>
              <Text style={styles.sectionTitle}>Single Hazards</Text>
              <Text style={styles.expandIcon}>{expandedSections.hazards ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {expandedSections.hazards && (
              <View style={styles.sectionContent}>
                {Object.entries(editData.singleHazards).map(([key, val]) => {
                  const hazard = singleHazardTypes.find(h => h.key === key);
                  return (
                    <View key={key} style={{ marginBottom: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <Switch
                          value={val.present}
                          onValueChange={v => handleHazardChange(key, 'present', v)}
                        />
                        <Text style={{ marginLeft: 8, fontWeight: 'bold' }}>{hazard?.label || key}</Text>
                      </View>
                      {val.present && (
                        <TextInput style={styles.input} value={val.controls} onChangeText={text => handleHazardChange(key, 'controls', text)} placeholder="Controls" />
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* JSEA - COLLAPSIBLE */}
        {editData.jsea && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('jsea')}>
              <Text style={styles.sectionTitle}>JSEA Task Steps</Text>
              <Text style={styles.expandIcon}>{expandedSections.jsea ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {expandedSections.jsea && (
              <View style={styles.sectionContent}>
                {editData.jsea.taskSteps && editData.jsea.taskSteps.length > 0 ? editData.jsea.taskSteps.map((step, idx) => (
                  <View key={idx} style={{ marginBottom: 8, marginLeft: 8 }}>
                    <Text style={styles.detailText}>Step {idx + 1}:</Text>
                    <TextInput style={styles.input} value={step.step} onChangeText={text => updateJSEAStep(idx, 'step', text)} placeholder="Step" />
                    <TextInput style={styles.input} value={step.hazards} onChangeText={text => updateJSEAStep(idx, 'hazards', text)} placeholder="Hazards" />
                    <TextInput style={styles.input} value={step.controls} onChangeText={text => updateJSEAStep(idx, 'controls', text)} placeholder="Controls" />
                    <TextInput style={styles.input} value={step.riskLevel} onChangeText={text => updateJSEAStep(idx, 'riskLevel', text)} placeholder="Risk Level" />
                    <TouchableOpacity onPress={() => {
                      setEditData(prev => {
                        const steps = [...prev.jsea.taskSteps];
                        steps.splice(idx, 1);
                        return { ...prev, jsea: { ...prev.jsea, taskSteps: steps } };
                      });
                    }}>
                      <Text style={styles.removeButton}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                )) : <Text style={styles.detailText}>None</Text>}
                <TouchableOpacity style={styles.addButton} onPress={() => setEditData(prev => ({
                  ...prev,
                  jsea: { ...prev.jsea, taskSteps: [...(prev.jsea.taskSteps || []), { step: '', hazards: '', controls: '', riskLevel: '' }] }
                }))}>
                  <Text style={styles.addButtonText}>Add Step</Text>
                </TouchableOpacity>
                <Text style={[styles.label, { marginTop: 12 }]}>Overall Risk Rating:</Text>
                <TextInput style={styles.input} value={editData.jsea.overallRiskRating || ''} onChangeText={text => setEditData(prev => ({ ...prev, jsea: { ...prev.jsea, overallRiskRating: text } }))} placeholder="Overall Risk Rating" />
                <Text style={styles.label}>Additional Precautions:</Text>
                <TextInput style={styles.input} value={editData.jsea.additionalPrecautions || ''} onChangeText={text => setEditData(prev => ({ ...prev, jsea: { ...prev.jsea, additionalPrecautions: text } }))} placeholder="Any additional precautions..." />
              </View>
            )}
          </View>
        )}

        {/* ISOLATIONS - COLLAPSIBLE */}
        {editData.isolations && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('isolations')}>
              <Text style={styles.sectionTitle}>Isolations</Text>
              <Text style={styles.expandIcon}>{expandedSections.isolations ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {expandedSections.isolations && (
              <View style={styles.sectionContent}>
                {editData.isolations && editData.isolations.length > 0 ? editData.isolations.map((isolation, idx) => (
                  <View key={idx} style={{ marginBottom: 8, marginLeft: 8 }}>
                    <Text style={styles.detailText}>What:</Text>
                    <TextInput style={styles.input} value={isolation.what} onChangeText={text => {
                      const updated = [...editData.isolations];
                      updated[idx] = { ...updated[idx], what: text };
                      setEditData(prev => ({ ...prev, isolations: updated }));
                    }} placeholder="What was isolated" />
                    <Text style={styles.detailText}>Isolated By:</Text>
                    <TextInput style={styles.input} value={isolation.isolatedBy} onChangeText={text => {
                      const updated = [...editData.isolations];
                      updated[idx] = { ...updated[idx], isolatedBy: text };
                      setEditData(prev => ({ ...prev, isolations: updated }));
                    }} placeholder="Isolated By" />
                    <Text style={styles.detailText}>Date:</Text>
                    <TextInput style={styles.input} value={isolation.date} onChangeText={text => {
                      const updated = [...editData.isolations];
                      updated[idx] = { ...updated[idx], date: text };
                      setEditData(prev => ({ ...prev, isolations: updated }));
                    }} placeholder="Date" />
                    <TouchableOpacity onPress={() => {
                      const updated = editData.isolations.filter((_, i) => i !== idx);
                      setEditData(prev => ({ ...prev, isolations: updated }));
                    }}>
                      <Text style={styles.removeButton}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                )) : <Text style={styles.detailText}>None</Text>}
                <TouchableOpacity style={styles.addButton} onPress={() => setEditData(prev => ({ ...prev, isolations: [...(prev.isolations || []), { what: '', isolatedBy: '', date: '' }] }))}>
                  <Text style={styles.addButtonText}>Add Isolation</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* SIGN-ONS - COLLAPSIBLE */}
        {editData.signOns && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('signons')}>
              <Text style={styles.sectionTitle}>Sign-On (Other Workers)</Text>
              <Text style={styles.expandIcon}>{expandedSections.signons ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {expandedSections.signons && (
              <View style={styles.sectionContent}>
                {editData.signOns.map((signOn, idx) => (
                  <View key={idx} style={{ marginBottom: 8, marginLeft: 8 }}>
                    <Text style={styles.detailText}>Name:</Text>
                    <TextInput style={styles.input} value={signOn.name} onChangeText={text => handleSignOnChange(idx, 'name', text)} placeholder="Worker Name" />
                    <Text style={styles.detailText}>Signature:</Text>
                    <TextInput style={styles.input} value={signOn.signature} onChangeText={text => handleSignOnChange(idx, 'signature', text)} placeholder="Signature" />
                    <TouchableOpacity onPress={() => {
                      setEditData(prev => {
                        const signOns = prev.signOns.filter((_, i) => i !== idx);
                        return { ...prev, signOns };
                      });
                    }}>
                      <Text style={styles.removeButton}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity style={styles.addButton} onPress={() => setEditData(prev => ({ ...prev, signOns: [...(prev.signOns || []), { name: '', signature: '' }] }))}>
                  <Text style={styles.addButtonText}>Add Worker</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* CONTROLS SUMMARY - COLLAPSIBLE */}
        {(editData.specializedPermits || editData.singleHazards || editData.jsea?.taskSteps) && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('controlsSummary')}>
              <Text style={[styles.sectionTitle, { color: '#D97706' }]}>Controls Summary</Text>
              <Text style={styles.expandIcon}>{expandedSections.controlsSummary ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {expandedSections.controlsSummary && (
              <View style={[styles.sectionContent, { backgroundColor: '#FEF3C7', borderLeftWidth: 4, borderLeftColor: '#F59E0B' }]}>
                {/* Specialized Permits Controls */}
                {editData.specializedPermits && Object.entries(editData.specializedPermits).some(([_, val]) => val.required && val.questionnaire) && (
                  <View style={{ marginBottom: 12 }}>
                    <Text style={{ fontWeight: 'bold', marginBottom: 6 }}>Specialized Permits:</Text>
                    {Object.entries(editData.specializedPermits).map(([key, val]) => {
                      const permit = specializedPermitTypes.find(p => p.key === key);
                      return val.required && val.questionnaire ? (
                        <View key={key} style={{ marginLeft: 8, marginBottom: 8 }}>
                          <Text style={[styles.detailText, { fontWeight: '600', color: '#374151' }]}>{permit?.label || key}:</Text>
                          {Object.entries(val.questionnaire).map(([qid, qval]) => 
                            qval.controls ? (
                              <Text key={qid} style={[styles.detailText, { marginLeft: 8, color: '#374151' }]}>• {qval.controls}</Text>
                            ) : null
                          )}
                        </View>
                      ) : null;
                    })}
                  </View>
                )}

                {/* Single Hazards Controls */}
                {editData.singleHazards && Object.entries(editData.singleHazards).some(([_, val]) => val.present && val.controls) && (
                  <View style={{ marginBottom: 12 }}>
                    <Text style={{ fontWeight: 'bold', marginBottom: 6 }}>Single Hazards:</Text>
                    {Object.entries(editData.singleHazards).map(([key, val]) => {
                      const hazard = singleHazardTypes.find(h => h.key === key);
                      return val.present && val.controls ? (
                        <View key={key} style={{ marginLeft: 8, marginBottom: 6 }}>
                          <Text style={[styles.detailText, { color: '#374151' }]}>{hazard?.label || key}:</Text>
                          <Text style={[styles.detailText, { marginLeft: 8, color: '#374151' }]}>• {val.controls}</Text>
                        </View>
                      ) : null;
                    })}
                  </View>
                )}

                {/* JSEA Task Steps Controls */}
                {editData.jsea?.taskSteps && editData.jsea.taskSteps.some(step => step.controls) && (
                  <View>
                    <Text style={{ fontWeight: 'bold', marginBottom: 6 }}>JSEA Task Controls:</Text>
                    {editData.jsea.taskSteps.map((step, idx) => 
                      step.controls ? (
                        <View key={idx} style={{ marginLeft: 8, marginBottom: 6 }}>
                          <Text style={[styles.detailText, { color: '#374151' }]}>Step {idx + 1}: • {step.controls}</Text>
                        </View>
                      ) : null
                    )}
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* COMPLETION SIGN-OFF - COLLAPSIBLE */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('completion')}>
            <Text style={styles.sectionTitle}>Completion Sign-Off</Text>
            <Text style={styles.expandIcon}>{expandedSections.completion ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {expandedSections.completion && (
            <View style={styles.sectionContent}>
              <Text style={styles.label}>Permit Issuer Name:</Text>
              <TextInput style={styles.input} value={issuerName} onChangeText={text => { setIssuerName(text); }} placeholder="Issuer Name" />
              <Text style={styles.label}>Issuer Signature:</Text>
              <TextInput style={styles.input} value={issuerSignature} onChangeText={text => { setIssuerSignature(text); }} placeholder="Issuer Signature" />
              {latestPermit.completedSignOff?.issuerSignedAt && (
                <Text style={styles.detailText}>Issuer Signed At: {latestPermit.completedSignOff.issuerSignedAt}</Text>
              )}
              <Text style={styles.label}>Permit Receiver Name:</Text>
              <TextInput style={styles.input} value={receiverName} onChangeText={text => { setReceiverName(text); }} placeholder="Receiver Name" />
              <Text style={styles.label}>Receiver Signature:</Text>
              <TextInput style={styles.input} value={receiverSignature} onChangeText={text => { setReceiverSignature(text); }} placeholder="Receiver Signature" />
              {latestPermit.completedSignOff?.receiverSignedAt && (
                <Text style={styles.detailText}>Receiver Signed At: {latestPermit.completedSignOff.receiverSignedAt}</Text>
              )}
              <TouchableOpacity style={[styles.submitButton, { marginTop: 12 }]} onPress={() => {
                const now = new Date();
                const dateStr = now.toISOString().split('T')[0];
                const timeStr = now.toTimeString().split(' ')[0];
                let newSignOff = { ...((latestPermit.completedSignOff) || {}) };
                let completed = false;
                // If issuer fields are filled and not yet timestamped, set timestamp
                if (issuerName && issuerSignature && (!newSignOff.issuerSignedAt || newSignOff.issuerName !== issuerName || newSignOff.issuerSignature !== issuerSignature)) {
                  newSignOff.issuerName = issuerName;
                  newSignOff.issuerSignature = issuerSignature;
                  newSignOff.issuerSignedAt = dateStr + ' ' + timeStr;
                }
                // If receiver fields are filled and not yet timestamped, set timestamp
                if (receiverName && receiverSignature && (!newSignOff.receiverSignedAt || newSignOff.receiverName !== receiverName || newSignOff.receiverSignature !== receiverSignature)) {
                  newSignOff.receiverName = receiverName;
                  newSignOff.receiverSignature = receiverSignature;
                  newSignOff.receiverSignedAt = dateStr + ' ' + timeStr;
                }
                // If all fields are filled, complete the permit
                if (newSignOff.issuerName && newSignOff.issuerSignature && newSignOff.receiverName && newSignOff.receiverSignature) {
                  completed = true;
                }
                const updated = permits.map(p => {
                  if (p.id === editData.id) {
                    if (completed) {
                      return {
                        ...editData,
                        status: 'completed',
                        completedDate: dateStr,
                        completedSignOff: newSignOff
                      };
                    } else {
                      return {
                        ...editData,
                        completedSignOff: newSignOff
                      };
                    }
                  }
                  return p;
                });
                setPermits(updated);
                if (completed) {
                  setCurrentScreen('dashboard');
                  Alert.alert('Permit Completed', 'Permit has been signed off as completed.');
                } else {
                  Alert.alert('Sign-Off Saved', 'Sign-off information has been saved.');
                }
              }}>
                <Text style={styles.submitButtonText}>Save Sign-Off</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.submitSection}>
          <TouchableOpacity style={styles.submitButton} onPress={() => {
            // Save edits only
            const updated = permits.map(p => p.id === editData.id ? { ...editData, completedSignOff: { issuerName, issuerSignature, receiverName, receiverSignature } } : p);
            setPermits(updated);
            setCurrentScreen('active');
            Alert.alert('Permit Updated', 'Permit details have been updated.');
          }}>
            <Text style={styles.submitButtonText}>Save Changes</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  // Date Picker Modal for Induction Expiry
  const InductionDatePickerModal = () => {
    const today = new Date();
    const getFirstDayOfMonth = (date) => {
      const d = new Date(date);
      return new Date(d.getFullYear(), d.getMonth(), 1);
    };
    const [displayMonth, setDisplayMonth] = React.useState(() => getFirstDayOfMonth(inductionPickerDate));
    const year = displayMonth.getFullYear();
    const month = displayMonth.getMonth();

    const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
    const getFirstDayOfWeek = (y, m) => new Date(y, m, 1).getDay();

    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfWeek(year, month);
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);

    return (
      <Modal visible={showInductionDatePicker} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: 'white', borderRadius: 12, padding: 20, width: '90%' }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>Select Induction Expiry Date</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <TouchableOpacity onPress={() => setDisplayMonth(new Date(year, month - 1, 1))}><Text style={{ fontSize: 18, fontWeight: 'bold' }}>{'<'}</Text></TouchableOpacity>
              <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' })}</Text>
              <TouchableOpacity onPress={() => setDisplayMonth(new Date(year, month + 1, 1))}><Text style={{ fontSize: 18, fontWeight: 'bold' }}>{'>'}</Text></TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8 }}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <Text key={d} style={{ fontWeight: 'bold', width: 40, textAlign: 'center' }}>{d}</Text>)}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {days.map((d, i) => (
                <TouchableOpacity
                  key={i}
                  style={{ width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 6 }}
                  disabled={!d}
                  onPress={() => {
                    setInductionPickerDate(new Date(year, month, d));
                    setCurrentContractor({ ...currentContractor, inductionExpiry: new Date(year, month, d).toISOString().split('T')[0] });
                    setShowInductionDatePicker(false);
                  }}
                >
                  {d && <Text style={{ color: d === inductionPickerDate.getDate() && month === inductionPickerDate.getMonth() ? 'white' : '#1F2937', backgroundColor: d === inductionPickerDate.getDate() && month === inductionPickerDate.getMonth() ? '#3B82F6' : 'transparent', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>{d}</Text>}
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
              <TouchableOpacity style={{ flex: 1, backgroundColor: '#EF4444', padding: 12, borderRadius: 6, alignItems: 'center' }} onPress={() => setShowInductionDatePicker(false)}>
                <Text style={{ color: 'white', fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // Main render logic
  switch (currentScreen) {
    case 'dashboard':
      return renderDashboard();
    case 'pending_approval':
      return renderPermitList('pending_approval', 'Pending Approval');
    case 'pending_inspection':
      return renderInspectionList();
    case 'review_permit':
      return (
        <EditableApprovalPermitScreen
          permit={selectedPermit}
          setPermits={setPermits}
          setCurrentScreen={setCurrentScreen}
          permits={permits}
          styles={styles}
        />
      );
    case 'inspect_permit':
      return (
        <EditInspectionPermitScreen
          permit={selectedPermit}
          setPermits={setPermits}
          setCurrentScreen={setCurrentScreen}
          permits={permits}
          styles={styles}
        />
      );
    case 'active':
      return renderActivePermitList();
    case 'edit_active_permit':
      return (
        <EditActivePermitScreen
          permit={selectedPermit}
          setPermits={setPermits}
          setCurrentScreen={setCurrentScreen}
          permits={permits}
          styles={styles}
        />
      );
    case 'completed':
      return renderPermitList('completed', 'Completed Permits');
    case 'view_completed_permit':
      return (
        <ReviewPermitScreen
          permit={selectedPermit}
          setPermits={setPermits}
          setCurrentScreen={setCurrentScreen}
          permits={permits}
          styles={styles}
        />
      );
    case 'edit_permit':
      return renderEditPermit();
    case 'new_permit':
      return renderNewPermitForm();
    case 'admin':
      return renderAdminDashboard();
    case 'manage_users':
      return renderManageUsers();
    case 'manage_companies':
      return renderManageCompanies();
    case 'manage_contractors':
      return (
        <>
          {renderManageContractors()}
          <InductionDatePickerModal />
        </>
      );
    case 'services_directory':
      return renderServicesDirectory();
    default:
      return renderDashboard();
  }
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#2563EB',
    padding: 20,
    paddingTop: 50,
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
  },
  backButton: {
    color: 'white',
    fontSize: 16,
    marginRight: 15,
  },
  content: {
    flex: 1,
  },
  dashboardGrid: {
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  dashboardCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    width: '48%',
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
  },
  cardLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 4,
  },
  primaryButton: {
    backgroundColor: '#2563EB',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  permitList: {
    flex: 1,
  },
  permitListContainer: {
    padding: 16,
  },
  permitListCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    position: 'relative',
  },
  tableBorder: {
    borderRightWidth: 1,
    borderRightColor: '#D1D5DB',
  },
  permitListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  permitId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  permitType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  permitDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  permitDetails: {
    marginBottom: 8,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  detailText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  priorityIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  priorityText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  section: {
    margin: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  sectionHeader: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dangerHeader: {
    backgroundColor: '#FEF2F2',
  },
  warningHeader: {
    backgroundColor: '#FFFBEB',
  },
  infoHeader: {
    backgroundColor: '#EFF6FF',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  dangerTitle: {
    color: '#DC2626',
  },
  warningTitle: {
    color: '#D97706',
  },
  infoTitle: {
    color: '#2563EB',
  },
  expandIcon: {
    fontSize: 16,
    color: '#6B7280',
  },
  sectionContent: {
    padding: 16,
    flexGrow: 1,
    minHeight: 0,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#2563EB',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  permitCard: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    backgroundColor: '#F9FAFB',
  },
  permitHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  permitInfo: {
    flex: 1,
    marginLeft: 12,
  },
  permitLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  questionnaireTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  questionnaireScroll: {
    flexGrow: 1,
    minHeight: 0,
  },
  questionContainer: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  questionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  required: {
    color: '#EF4444',
  },
  noteText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  radioGroup: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  radioCircle: {
    height: 20,
    width: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  radioSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#2563EB',
  },
  radioLabel: {
    fontSize: 14,
    color: '#374151',
  },
  textInputContainer: {
    marginTop: 8,
  },
  textLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 4,
  },
  detailTextInput: {
    borderWidth: 1,
    borderColor: '#2563EB',
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    backgroundColor: 'white',
    textAlignVertical: 'top',
    minHeight: 60,
  },
  addButton: {
    backgroundColor: '#2563EB',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 16,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  jseaStep: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  removeButton: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '500',
  },
  riskButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  riskButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  riskButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  submitSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  draftButton: {
    flex: 0.45,
    padding: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    alignItems: 'center',
  },
  draftButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 0.45,
    padding: 12,
    backgroundColor: '#2563EB',
    borderRadius: 6,
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  dateTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  dateTimeColumn: {
    flex: 0.48,
  },
  dateTimeInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    padding: 12,
    backgroundColor: 'white',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 48,
  },
  dateTimeText: {
    fontSize: 16,
    color: '#374151',
    flex: 1,
  },
  placeholderText: {
    color: '#9CA3AF',
  },
  calendarIcon: {
    fontSize: 18,
  },
  priorityButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  priorityButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  priorityButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

// DateTimePicker Styles
const pickerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    maxHeight: '80%',
    width: '90%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  dateContainer: {
    alignItems: 'center',
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  yearButton: {
    fontSize: 16,
    color: '#2563EB',
    fontWeight: '500',
  },
  currentYear: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  monthContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 20,
  },
  monthButton: {
    padding: 8,
    margin: 4,
    borderRadius: 6,
    minWidth: 50,
    alignItems: 'center',
  },
  selectedMonth: {
    backgroundColor: '#2563EB',
  },
  monthText: {
    fontSize: 14,
    color: '#374151',
  },
  selectedMonthText: {
    color: 'white',
  },
  dayContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    maxWidth: 280,
  },
  dayButton: {
    width: 35,
    height: 35,
    margin: 2,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedDay: {
    backgroundColor: '#2563EB',
  },
  dayText: {
    fontSize: 14,
    color: '#374151',
  },
  selectedDayText: {
    color: 'white',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
  },
  timeSection: {
    alignItems: 'center',
    width: 80,
  },
  timeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 10,
  },
  timeScroll: {
    height: 150,
  },
  timeOption: {
    padding: 8,
    alignItems: 'center',
    borderRadius: 6,
    marginVertical: 2,
  },
  selectedTimeOption: {
    backgroundColor: '#2563EB',
  },
  timeOptionText: {
    fontSize: 16,
    color: '#374151',
  },
  selectedTimeOptionText: {
    color: 'white',
  },
  timeSeparator: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginHorizontal: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
   },
  cancelButton: {
    flex: 0.4,
    padding: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 0.4,
    padding: 12,
    backgroundColor: '#2563EB',
    borderRadius: 6,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PermitManagementApp;
