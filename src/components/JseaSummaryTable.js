import React from 'react';
import { View, Text, Dimensions } from 'react-native';

export function getStepDescription(step) {
  return step?.description || step?.step || step?.task || '';
}

export function stepHasContent(step) {
  if (!step) return false;
  return Boolean(
    getStepDescription(step) ||
    step.hazards ||
    step.controls ||
    step.riskLevel
  );
}

export function buildJseaSummaryGroups({ jseas, jsea, currentJsea, includeCurrent = true }) {
  const groups = [];

  if (jsea?.taskSteps?.some(stepHasContent)) {
    groups.push({
      key: jsea.id || 'jsea-single',
      label: jsea.title ? `JSEA: ${jsea.title}` : 'JSEA 1',
      steps: jsea.taskSteps.filter(stepHasContent),
      additionalPrecautions: jsea.additionalPrecautions,
    });
  }

  if (Array.isArray(jseas)) {
    jseas.forEach((item, index) => {
      if (item?.taskSteps?.some(stepHasContent)) {
        groups.push({
          key: item.id || `jsea-${index}`,
          label: `JSEA ${index + 1}${item.title ? `: ${item.title}` : ''}`,
          steps: item.taskSteps.filter(stepHasContent),
          additionalPrecautions: item.additionalPrecautions,
        });
      }
    });
  }

  if (includeCurrent && currentJsea?.taskSteps?.some(stepHasContent)) {
    groups.push({
      key: 'jsea-current',
      label: 'JSEA (editing)',
      steps: currentJsea.taskSteps.filter(stepHasContent),
      isEditing: true,
    });
  }

  return groups;
}

const EMPTY_HAZARDS = 'None identified';
const EMPTY_CONTROLS = 'None specified';
const EMPTY_STEP = 'No description';

function StepTable({ steps, showRiskLevel, detailTextStyle, isMobile, variant }) {
  const isCompleted = variant === 'completed';
  const headerBg = isCompleted ? '#B45309' : '#3B82F6';
  const headerBorder = isCompleted ? '#92400E' : '#2563EB';
  const rowBorder = isCompleted ? '#FED7AA' : '#E5E7EB';
  const stepTextColor = isCompleted ? '#92400E' : '#1F2937';
  const hazardsTextColor = isCompleted ? '#B45309' : '#374151';
  const controlsTextColor = isCompleted ? '#78350F' : '#374151';

  if (isMobile) {
    return (
      <View>
        {steps.map((step, index) => (
          <View
            key={step.id || index}
            style={{
              backgroundColor: 'white',
              borderRadius: 8,
              borderWidth: 1,
              borderColor: rowBorder,
              padding: 12,
              marginBottom: 10,
            }}
          >
            <Text style={{ fontWeight: '700', color: stepTextColor, fontSize: 14, marginBottom: 10 }}>
              Step {index + 1}
            </Text>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#6B7280', marginBottom: 4 }}>Step</Text>
            <Text style={{ fontSize: 14, color: stepTextColor, marginBottom: 10 }}>
              {getStepDescription(step) || EMPTY_STEP}
            </Text>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#6B7280', marginBottom: 4 }}>Hazards</Text>
            <Text style={{ fontSize: 14, color: hazardsTextColor, marginBottom: 10 }}>
              {step.hazards || EMPTY_HAZARDS}
            </Text>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#6B7280', marginBottom: 4 }}>Controls</Text>
            <Text style={{ fontSize: 14, color: controlsTextColor, marginBottom: showRiskLevel && step.riskLevel ? 8 : 0 }}>
              {step.controls || EMPTY_CONTROLS}
            </Text>
            {showRiskLevel && step.riskLevel && (
              <Text
                style={[
                  detailTextStyle,
                  {
                    color:
                      step.riskLevel === 'HIGH'
                        ? '#DC2626'
                        : step.riskLevel === 'MEDIUM'
                          ? '#EA580C'
                          : '#059669',
                    fontWeight: '600',
                    fontSize: 13,
                    marginTop: 4,
                  },
                ]}
              >
                Risk Level: {step.riskLevel}
              </Text>
            )}
          </View>
        ))}
      </View>
    );
  }

  return (
    <View
      style={{
        backgroundColor: 'white',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: rowBorder,
        overflow: 'hidden',
        width: '100%',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: headerBg,
          borderBottomWidth: 2,
          borderBottomColor: headerBorder,
          paddingVertical: 10,
          paddingHorizontal: 12,
        }}
      >
        <Text style={{ flex: 2, fontWeight: 'bold', color: 'white', fontSize: 13, minWidth: 120 }}>Step</Text>
        <Text style={{ flex: 2, fontWeight: 'bold', color: 'white', fontSize: 13, minWidth: 120 }}>Hazards</Text>
        <Text style={{ flex: 2, fontWeight: 'bold', color: 'white', fontSize: 13, minWidth: 120 }}>Controls</Text>
      </View>

      {steps.map((step, index) => (
        <View
          key={step.id || index}
          style={{
            flexDirection: 'row',
            borderBottomWidth: index < steps.length - 1 ? 1 : 0,
            borderBottomColor: rowBorder,
            paddingVertical: 10,
            paddingHorizontal: 12,
            alignItems: 'flex-start',
            gap: 8,
            minHeight: 48,
          }}
        >
          <View style={{ flex: 2, minWidth: 120 }}>
            <Text style={{ fontWeight: '600', color: stepTextColor, fontSize: 13, marginBottom: 4 }}>
              Step {index + 1}
            </Text>
            <Text style={{ fontSize: 13, color: stepTextColor }}>
              {getStepDescription(step) || EMPTY_STEP}
            </Text>
            {showRiskLevel && step.riskLevel && (
              <Text
                style={[
                  detailTextStyle,
                  {
                    color:
                      step.riskLevel === 'HIGH'
                        ? '#DC2626'
                        : step.riskLevel === 'MEDIUM'
                          ? '#EA580C'
                          : '#059669',
                    fontWeight: '600',
                    fontSize: 12,
                    marginTop: 6,
                  },
                ]}
              >
                Risk: {step.riskLevel}
              </Text>
            )}
          </View>
          <Text style={{ flex: 2, minWidth: 120, fontSize: 13, color: hazardsTextColor }}>
            {step.hazards || EMPTY_HAZARDS}
          </Text>
          <Text style={{ flex: 2, minWidth: 120, fontSize: 13, color: controlsTextColor }}>
            {step.controls || EMPTY_CONTROLS}
          </Text>
        </View>
      ))}
    </View>
  );
}

export default function JseaSummaryTable({
  jseas,
  jsea,
  currentJsea,
  title = 'JSEA Details',
  showRiskLevel = false,
  detailTextStyle,
  variant = 'default',
  includeCurrent = true,
  style,
}) {
  const windowWidth = Dimensions.get('window').width;
  const isMobile = windowWidth < 768;
  const groups = buildJseaSummaryGroups({ jseas, jsea, currentJsea, includeCurrent });

  if (groups.length === 0) {
    return null;
  }

  const isCompleted = variant === 'completed';
  const groupTitleColor = isCompleted ? '#92400E' : '#1F2937';
  const groupBorderColor = isCompleted ? '#F59E0B' : '#2563EB';

  return (
    <View style={[{ marginBottom: 12 }, style]}>
      {title ? (
        <Text
          style={{
            fontSize: isCompleted ? 16 : 14,
            fontWeight: isCompleted ? '700' : '600',
            color: isCompleted ? '#B45309' : '#1F2937',
            marginBottom: 8,
          }}
        >
          {title}
        </Text>
      ) : null}

      {groups.map((group) => (
        <View
          key={group.key}
          style={{
            marginBottom: 12,
            marginLeft: isCompleted ? 12 : 0,
            paddingLeft: isCompleted ? 0 : 0,
            borderLeftWidth: isCompleted ? 0 : 0,
          }}
        >
          {groups.length > 1 || group.label ? (
            <Text
              style={{
                fontSize: 13,
                fontWeight: '600',
                color: groupTitleColor,
                marginBottom: 6,
                marginLeft: isCompleted ? 0 : 8,
              }}
            >
              {group.label}
              {group.isEditing ? '' : ''}
            </Text>
          ) : null}

          <View
            style={{
              marginLeft: isCompleted ? 16 : 8,
              borderLeftWidth: group.isEditing ? 2 : 0,
              borderLeftColor: group.isEditing ? '#F59E0B' : groupBorderColor,
              paddingLeft: group.isEditing ? 8 : 0,
            }}
          >
            <StepTable
              steps={group.steps}
              showRiskLevel={showRiskLevel}
              detailTextStyle={detailTextStyle}
              isMobile={isMobile}
              variant={variant}
            />
          </View>

          {group.additionalPrecautions ? (
            <View
              style={{
                marginTop: 8,
                marginLeft: isCompleted ? 16 : 8,
                paddingTop: 6,
                borderTopWidth: 1,
                borderTopColor: '#E5E7EB',
              }}
            >
              <Text style={[detailTextStyle, { fontWeight: '500', color: '#6B7280', fontSize: 13, marginBottom: 3 }]}>
                Additional Precautions:
              </Text>
              <View style={{ paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: '#F59E0B' }}>
                <Text style={[detailTextStyle, { color: '#1F2937', fontWeight: '500', fontSize: 13 }]}>
                  {group.additionalPrecautions}
                </Text>
              </View>
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
}
