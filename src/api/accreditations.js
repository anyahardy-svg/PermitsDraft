import { supabase } from '../supabaseClient';

/**
 * Update company accreditation - Sections 2 & 3
 * @param {UUID} companyId - Company UUID
 * @param {Object} accreditationData - Updated accreditation info
 * @returns {Object} Updated company data
 */
export const updateCompanyAccreditation = async (companyId, accreditationData) => {
  try {
    // Validate that companyId is provided
    if (!companyId) {
      throw new Error('Company ID is required');
    }

    const updates = {
      ...accreditationData,
      accreditation_last_updated: new Date().toISOString(),
    };

    console.log('📤 Update request to Supabase:', { companyId, updates });

    const { data, error } = await supabase
      .from('companies')
      .update(updates)
      .eq('id', companyId)
      .select();

    console.log('📥 Supabase response:', { data, error });

    if (error) throw error;
    return { success: true, data: data[0] };
  } catch (error) {
    console.error('Error updating accreditation:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Get company accreditation details
 * @param {UUID} companyId
 * @returns {Object} Company accreditation data
 */
export const getCompanyAccreditation = async (companyId) => {
  try {
    // Validate that companyId is provided
    if (!companyId) {
      throw new Error('Company ID is required');
    }

    const { data, error } = await supabase
      .from('companies')
      .select(`
        id,
        name,
        email,
        contact_name,
        contact_surname,
        contact_email,
        contact_phone,
        approved_services,
        fletcher_business_units,
        business_unit_ids,
        aep_accredited,
        aep_certificate_url,
        aep_certificate_expiry,
        iso_45001_certified,
        iso_45001_certificate_url,
        iso_45001_certificate_expiry,
        totika_prequalified,
        totika_certificate_url,
        totika_certificate_expiry,
        she_prequal_qualified,
        she_prequal_certificate_url,
        she_prequal_certificate_expiry,
        impac_prequalified,
        impac_certificate_url,
        impac_certificate_expiry,
        sitewise_prequalified,
        sitewise_certificate_url,
        sitewise_certificate_expiry,
        rapid_prequalified,
        rapid_certificate_url,
        rapid_certificate_expiry,
        iso_9001_certified,
        iso_9001_certificate_url,
        iso_9001_certificate_expiry,
        iso_14001_certified,
        iso_14001_certificate_url,
        iso_14001_certificate_expiry,
        accreditation_status,
        accreditation_last_updated,
        accreditation_expiry_date,
        health_safety_policy_exists,
        health_safety_policy_url,
        environmental_policy_exists,
        environmental_policy_url,
        drug_alcohol_policy_exists,
        drug_alcohol_policy_url,
        quality_policy_exists,
        quality_policy_url,
        accident_reporting_exists,
        accident_reporting_score,
        accident_reporting_evidence_url,
        accident_investigation_exists,
        accident_investigation_score,
        accident_investigation_evidence_url,
        health_hazard_plan_exists,
        health_hazard_plan_score,
        health_hazard_plan_evidence_url,
        exposure_monitoring_exists,
        exposure_monitoring_frequency,
        exposure_monitoring_score,
        exposure_monitoring_evidence_url,
        respiratory_training_exists,
        respiratory_training_score,
        respiratory_training_evidence_url,
        exhaust_ventilation_exists,
        exhaust_ventilation_score,
        exhaust_ventilation_evidence_url,
        health_monitoring_exists,
        health_monitoring_frequency,
        health_monitoring_score,
        health_monitoring_evidence_url,
        induction_programme_exists,
        induction_programme_score,
        induction_programme_evidence_url,
        induction_records_process_exists,
        induction_records_process_score,
        induction_records_process_evidence_url,
        skills_training_list_exists,
        skills_training_list_score,
        skills_training_list_evidence_url,
        competency_testing_system_exists,
        competency_testing_system_score,
        competency_testing_system_evidence_url,
        hazard_identification_process_exists,
        hazard_identification_process_score,
        hazard_identification_process_evidence_url,
        jha_jsea_system_exists,
        jha_jsea_system_score,
        jha_jsea_system_evidence_url,
        risk_registers_exists,
        risk_registers_score,
        risk_registers_evidence_url,
        ppe_compliance_yesno,
        ppe_training_maintenance_exists,
        ppe_training_maintenance_score,
        ppe_training_maintenance_evidence_url,
        ppe_job_assessment_exists,
        ppe_job_assessment_score,
        ppe_job_assessment_evidence_url,
        ppe_maintenance_schedule_exists,
        ppe_maintenance_schedule_score,
        ppe_maintenance_schedule_evidence_url,
        plant_equipment_onsite_yesno,
        plant_equipment_licenses_exists,
        plant_equipment_licenses_score,
        plant_equipment_licenses_evidence_url,
        plant_equipment_safety_provisions_exists,
        plant_equipment_safety_provisions_score,
        plant_equipment_safety_provisions_evidence_url,
        plant_equipment_maintenance_exists,
        plant_equipment_maintenance_score,
        plant_equipment_maintenance_evidence_url,
        electrical_equipment_onsite_yesno,
        electrical_equipment_testing_exists,
        electrical_equipment_testing_score,
        electrical_equipment_testing_evidence_url,
        electrical_equipment_licenses_exists,
        electrical_equipment_licenses_score,
        electrical_equipment_licenses_evidence_url,
        electrical_equipment_safety_provisions_exists,
        electrical_equipment_safety_provisions_score,
        electrical_equipment_safety_provisions_evidence_url,
        electrical_equipment_maintenance_exists,
        electrical_equipment_maintenance_score,
        electrical_equipment_maintenance_evidence_url,
        emergency_procedures_exists,
        emergency_procedures_score,
        emergency_procedures_evidence_url,
        emergency_first_aid_yesno,
        emergency_first_aid_equipment,
        site_safety_plans_exists,
        site_safety_plans_score,
        site_safety_plans_evidence_url,
        site_induction_process_exists,
        site_induction_process_score,
        site_induction_process_evidence_url,
        contractor_induction_exists,
        contractor_induction_score,
        contractor_induction_evidence_url,
        contractor_compliance_exists,
        contractor_compliance_score,
        contractor_compliance_evidence_url,
        health_wellbeing_program_exists,
        health_wellbeing_program_score,
        health_wellbeing_program_evidence_url,
        fatigue_management_exists,
        fatigue_management_score,
        fatigue_management_evidence_url,
        competency_framework_exists,
        competency_framework_score,
        competency_framework_evidence_url,
        training_records_exists,
        training_records_score,
        training_records_evidence_url,
        safety_communication_exists,
        safety_communication_score,
        safety_communication_evidence_url,
        near_miss_reporting_exists,
        near_miss_reporting_score,
        near_miss_reporting_evidence_url,
        performance_monitoring_exists,
        performance_monitoring_score,
        performance_monitoring_evidence_url,
        regular_audits_exists,
        regular_audits_score,
        regular_audits_evidence_url,
        injury_management_exists,
        injury_management_score,
        injury_management_evidence_url,
        early_intervention_exists,
        early_intervention_score,
        early_intervention_evidence_url,
        quality_manager_and_plan_exists,
        quality_manager_and_plan_score,
        quality_manager_and_plan_evidence_url,
        roles_and_responsibilities_exists,
        roles_and_responsibilities_score,
        roles_and_responsibilities_evidence_url,
        purchasing_procedures_exists,
        purchasing_procedures_score,
        purchasing_procedures_evidence_url,
        subcontractor_evaluation_exists,
        subcontractor_evaluation_score,
        subcontractor_evaluation_evidence_url,
        process_control_plan_exists,
        process_control_plan_score,
        process_control_plan_evidence_url,
        nonconformance_procedure_exists,
        nonconformance_procedure_score,
        nonconformance_procedure_evidence_url,
        product_rejection_exists,
        product_rejection_score,
        product_rejection_evidence_url,
        personnel_induction_exists,
        personnel_induction_score,
        personnel_induction_evidence_url,
        internal_audits_exists,
        internal_audits_score,
        internal_audits_evidence_url,
        continuous_improvement_exists,
        continuous_improvement_score,
        continuous_improvement_evidence_url,
        environmental_aspects_assessment_exists,
        environmental_aspects_assessment_score,
        environmental_aspects_assessment_evidence_url,
        environmental_system_and_plans_exists,
        environmental_system_and_plans_score,
        environmental_system_and_plans_evidence_url,
        waste_management_policy_exists,
        waste_management_policy_score,
        waste_management_policy_evidence_url,
        environmental_improvement_targets_exists,
        environmental_improvement_targets_score,
        environmental_improvement_targets_evidence_url,
        environmental_training_programme_exists,
        environmental_training_programme_score,
        environmental_training_programme_evidence_url,
        fatalities,
        serious_harm,
        lost_time,
        property_damage,
        pending_prosecutions,
        prosecutions_5_years,
        environmental_notices,
        incidents_breaches_score,
        incidents_breaches_evidence_url,
        safety_objectives_exists,
        safety_objectives_score,
        safety_objectives_evidence_url,
        management_review_exists,
        management_review_score,
        management_review_evidence_url
      `)
      .eq('id', companyId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching accreditation:', error.message);
    throw error;
  }
};

/**
 * Get all companies for accreditation dashboard (admin only)
 * @returns {Array} All companies with accreditation status
 */
export const getAllCompaniesAccreditation = async () => {
  try {
    const { data, error } = await supabase
      .from('companies')
      .select(`
        id,
        name,
        nzbn,
        approved_services,
        aep_accredited,
        aep_certificate_expiry,
        iso_45001_certified,
        iso_45001_certificate_expiry,
        accreditation_last_updated,
        accreditation_expiry_date
      `)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching all accreditations:', error.message);
    throw error;
  }
};

/**
 * Upload accreditation certificate to Supabase Storage
 * @param {UUID} companyId
 * @param {string} certificationType - e.g., 'iso_45001', 'aep', 'totika'
 * @param {File} file - File to upload
 * @returns {string} Public URL of uploaded file
 */
export const uploadAccreditationCertificate = async (companyId, certificationType, file) => {
  try {
    if (!file || !file.name) throw new Error('No file provided');

    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop() || 'pdf';
    const fileName = `${companyId}/${certificationType}/${timestamp}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('accreditations')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;

    // Get public URL
    const { data: publicUrl } = supabase.storage
      .from('accreditations')
      .getPublicUrl(fileName);

    return {
      success: true,
      url: publicUrl.publicUrl
    };
  } catch (error) {
    console.error('Error uploading certificate:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Delete accreditation certificate from Supabase Storage
 * @param {string} certificateUrl - Full URL of the certificate to delete
 * @returns {Object} Success status
 */
export const deleteAccreditationCertificate = async (certificateUrl) => {
  try {
    if (!certificateUrl) throw new Error('No certificate URL provided');

    // Extract the file path from the URL
    // URL format: https://...supabase.co/storage/v1/object/public/accreditations/[filePath]
    const urlParts = certificateUrl.split('/accreditations/');
    if (urlParts.length !== 2) throw new Error('Invalid certificate URL format');
    
    const filePath = urlParts[1];

    const { error } = await supabase.storage
      .from('accreditations')
      .remove([filePath]);

    if (error) throw error;

    return {
      success: true,
      message: 'Certificate deleted successfully'
    };
  } catch (error) {
    console.error('Error deleting certificate:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Check expiry status of accreditations
 * Returns 'valid', 'expiring_soon' (< 90 days), or 'expired'
 */
export const getExpiryStatus = (expiryDate) => {
  if (!expiryDate) return null;

  const expiry = new Date(expiryDate);
  const today = new Date();
  const daysUntilExpiry = Math.floor((expiry - today) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry < 0) return 'expired';
  if (daysUntilExpiry < 90) return 'expiring_soon';
  return 'valid';
};
