import React, { useState, useEffect, useRef } from 'react';
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
import { saveJseaTemplate, getJseaTemplates, deleteJseaTemplate, updateJseaTemplate, getJseaTemplatesByCompany, savePermitAsTemplate, getTemplates as getPermitTemplates, deleteTemplate as deletePermitTemplate, getPermitTemplatesByCompany, updatePermitTemplate } from '../api/templates';
import { listCompanies } from '../api/companies';
import { listBusinessUnits } from '../api/business_units';
import { getSitesByBusinessUnits } from '../api/sites';
import { getContractorInductionsForCompany } from '../api/inductions';
import { logout } from '../api/contractorAuth';
import JseaEditorScreen from './JseaEditorScreen';
import CompanyAccreditationScreen from './CompanyAccreditationScreen';
import TrainingRecordsScreen from './TrainingRecordsScreen';
import ContractorAuthScreen from './ContractorAuthScreen';

export default function ContractorAdminScreen({ 
  onNavigateBack,
  onReturnToKiosk,
  businessUnitId, 
  styles,
  businessUnits = [],
  activeTab = null,
  setActiveTab = () => {}
}) {
  // Authentication state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loggedInContractor, setLoggedInContractor] = useState(null);
  const [loggedInContractorEmail, setLoggedInContractorEmail] = useState(null);
  const [loggedInContractorPhone, setLoggedInContractorPhone] = useState(null);
  const [loggedInContractorId, setLoggedInContractorId] = useState(null);
  const [loggedInCompanyId, setLoggedInCompanyId] = useState(null);
  const [loggedInCompanyName, setLoggedInCompanyName] = useState(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [jseaTemplates, setJseaTemplates] = useState([]);
  const [permitTemplates, setPermitTemplates] = useState([]);
  const [loadingJsea, setLoadingJsea] = useState(false);
  const [loadingPermits, setLoadingPermits] = useState(false);
  const [showJseaEditor, setShowJseaEditor] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [editingJseaTemplate, setEditingJseaTemplate] = useState(null);
  const [jseaTemplateName, setJseaTemplateName] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);
  const [selectedBusinessUnitIds, setSelectedBusinessUnitIds] = useState([]);
  const [currentJseaSteps, setCurrentJseaSteps] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [loadedBusinessUnits, setLoadedBusinessUnits] = useState([]);
  const [loadingBusinessUnits, setLoadingBusinessUnits] = useState(false);
  // JSEA filter states
  const [jseaFilterCompanyId, setJseaFilterCompanyId] = useState(null);
  const [jseaFilterBusinessUnitIds, setJseaFilterBusinessUnitIds] = useState([]);
  const [jseaFilterSiteIds, setJseaFilterSiteIds] = useState([]);
  const [sites, setSites] = useState([]);
  
  // Ref to access JseaEditorScreen's current steps when buttons are hidden
  const jseaEditorRef = useRef(null);
  const [loadingSites, setLoadingSites] = useState(false);
  // Filter search state
  const [jseaCompanySearch, setJseaCompanySearch] = useState('');
  const [jseaBusinessUnitSearch, setJseaBusinessUnitSearch] = useState('');
  const [jseaSiteSearch, setJseaSiteSearch] = useState('');
  const [openDropdown, setOpenDropdown] = useState(null); // null, 'company', 'businessunit', or 'site'

  // Inductions states
  const [inductedContractors, setInductedContractors] = useState([]);
  const [loadingInductions, setLoadingInductions] = useState(false);

  const [deleteConfirmModal, setDeleteConfirmModal] = useState(null);
  const [deletingTemplateId, setDeletingTemplateId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [logoutConfirmModal, setLogoutConfirmModal] = useState(false);
  const [logoutDestination, setLogoutDestination] = useState(null); // 'kiosk' or 'dashboard'

  // Permit template editing states
  const [editingPermitTemplate, setEditingPermitTemplate] = useState(null);
  const [showPermitTemplateEditor, setShowPermitTemplateEditor] = useState(false);
  const [editedTemplateName, setEditedTemplateName] = useState('');
  const [editedTemplateDescription, setEditedTemplateDescription] = useState('');
  const [savingPermitTemplate, setSavingPermitTemplate] = useState(false);
  
  // Contractor editing states
  const [editingContractor, setEditingContractor] = useState(null);
  const [editContractorName, setEditContractorName] = useState('');
  const [editContractorEmail, setEditContractorEmail] = useState('');
  const [editContractorPhone, setEditContractorPhone] = useState('');
  const [savingContractor, setSavingContractor] = useState(false);

  // Use first business unit if none is provided
  const effectiveBuId = businessUnitId || businessUnits[0]?.id;

  // Handle successful login
  const handleLoginSuccess = async (contractorInfo) => {
    console.log('✅ Contractor logged in:', contractorInfo);
    console.log('   - contractorId:', contractorInfo.contractorId);
    console.log('   - contractorName:', contractorInfo.contractorName);
    console.log('   - companyId:', contractorInfo.companyId);
    
    setLoggedInContractor(contractorInfo.contractorName);
    setLoggedInContractorId(contractorInfo.contractorId);
    setLoggedInContractorEmail(contractorInfo.email);
    setLoggedInCompanyId(contractorInfo.companyId);
    setIsLoggedIn(true);
    setSelectedCompanyId(contractorInfo.companyId);
    
    // Initialize profile editing fields
    setProfileName(contractorInfo.contractorName);
    setProfileEmail(contractorInfo.email || '');
    
    // Update URL to include contractor info for persistence
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      const tabPart = activeTab ? `${activeTab}/` : '';
      const newUrl = `/contractor-admin/${tabPart}?contractorId=${contractorInfo.contractorId}&companyId=${contractorInfo.companyId}`;
      console.log('🔗 Updating URL to:', newUrl);
      window.history.replaceState({}, '', newUrl);
    }
    
    // Fetch company name for filtering templates
    try {
      const { data: company, error } = await supabase
        .from('companies')
        .select('name')
        .eq('id', contractorInfo.companyId)
        .single();
      
      if (!error && company) {
        setLoggedInCompanyName(company.name);
        console.log('✅ Company name fetched:', company.name);
      }
    } catch (error) {
      console.error('Error fetching company name:', error);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      // Call Supabase logout API
      const logoutResult = await logout();
      
      if (logoutResult.success) {
        console.log('✅ Logged out from Supabase successfully');
      } else {
        console.warn('⚠️ Logout warning:', logoutResult.error);
      }
    } catch (error) {
      console.error('❌ Error calling logout:', error);
    }
    
    // Clear local state
    setIsLoggedIn(false);
    setLoggedInContractor(null);
    setLoggedInCompanyId(null);
    setLoggedInCompanyName(null);
    setSelectedCompanyId(null);
    setActiveTab(null);
    
    // Clear contractor info from URL
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', '/contractor-admin/');
      console.log('🔗 Cleared contractor info from URL');
    }
  };

  // Restore login from URL on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && !isLoggedIn) {
      const params = new URLSearchParams(window.location.search);
      const contractorId = params.get('contractorId');
      const companyId = params.get('companyId');
      
      if (contractorId && companyId) {
        console.log('🔍 Restoring contractor login from URL:', { contractorId, companyId });
        // We have contractor info in URL but need contractor name
        // For now, we'll set the logged in state with what we have
        setLoggedInCompanyId(companyId);
        setSelectedCompanyId(companyId);
        
        // Fetch contractor name, email, phone and company name
        const restoreLogin = async () => {
          try {
            // Get ALL contractor fields
            const { data: contractor, error: contractorError } = await supabase
              .from('contractors')
              .select('id, name, email, phone_number')
              .eq('id', contractorId)
              .single();
            
            if (!contractorError && contractor) {
              setLoggedInContractorId(contractor.id);
              setLoggedInContractor(contractor.name);
              setLoggedInContractorEmail(contractor.email || '');
              setLoggedInContractorPhone(contractor.phone_number || '');
              console.log('✅ Restored contractor:', { name: contractor.name, email: contractor.email, phone: contractor.phone_number });
            }
            
            // Get company name
            const { data: company, error: companyError } = await supabase
              .from('companies')
              .select('name')
              .eq('id', companyId)
              .single();
            
            if (!companyError && company) {
              setLoggedInCompanyName(company.name);
              console.log('✅ Restored company name:', company.name);
            }
            
            setIsLoggedIn(true);
            
            // Directly load inductions for the restored company to avoid showing wrong contractors
            try {
              const inductionsData = await getContractorInductionsForCompany(companyId);
              setInductedContractors(inductionsData || []);
              console.log('✅ Loaded inductions for restored company:', inductionsData?.length);
            } catch (inductionErr) {
              console.error('Error loading inductions during restore:', inductionErr);
            }
            
            console.log('✅ Login restored from URL');
          } catch (error) {
            console.error('Error restoring login:', error);
          }
        };
        
        restoreLogin();
      }
    }
  }, []); // Only run on mount

  // Update URL when activeTab or login state changes
  useEffect(() => {
    if (typeof window !== 'undefined' && isLoggedIn && loggedInCompanyId) {
      const tabPart = activeTab ? `${activeTab}/` : '';
      const newUrl = `/contractor-admin/${tabPart}?contractorId=&companyId=${loggedInCompanyId}`;
      if (window.location.pathname !== `/contractor-admin/${tabPart}`) {
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, [activeTab, isLoggedIn, loggedInCompanyId]);

  // Handle back button - go to dashboard or exit with logout warning
  const handleContractorAdminBack = () => {
    if (activeTab !== null) {
      // From a tab - go back to dashboard
      console.log('← [BACK] Navigating to Contractor Admin dashboard');
      setActiveTab(null);
    } else {
      // From dashboard - show logout confirmation
      console.log('← [BACK] From dashboard - showing logout warning');
      setLogoutConfirmModal(true);
    }
  };

  const confirmLogout = (destination) => {
    console.log('← [BACK] Confirmed logout, returning to:', destination);
    setLogoutConfirmModal(false);
    handleLogout();
    
    if (destination === 'kiosk' && onReturnToKiosk) {
      onReturnToKiosk();
    } else {
      onNavigateBack();
    }
  };

  const cancelLogout = () => {
    console.log('← [BACK] Logout cancelled');
    setLogoutConfirmModal(false);
  };

  // Load business units
  const loadBusinessUnits = async () => {
    setLoadingBusinessUnits(true);
    try {
      console.log('📦 Loading business units for save modal...');
      const buData = await listBusinessUnits();
      if (Array.isArray(buData)) {
        console.log('✅ Business units loaded:', buData.length);
        setLoadedBusinessUnits(buData);
      } else {
        console.warn('⚠️ Business units data not array:', buData);
      }
    } catch (error) {
      console.error('❌ Failed to load business units:', error);
    } finally {
      setLoadingBusinessUnits(false);
    }
  };

  // Load companies
  const loadCompanies = async () => {
    setLoadingCompanies(true);
    try {
      const companiesData = await listCompanies();
      if (Array.isArray(companiesData)) {
        setCompanies(companiesData);
        if (companiesData.length > 0 && !selectedCompanyId) {
          setSelectedCompanyId(companiesData[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to load companies:', error);
    } finally {
      setLoadingCompanies(false);
    }
  };

  // Load sites for selected business units
  const loadSites = async () => {
    if (jseaFilterBusinessUnitIds.length === 0 && !effectiveBuId) return;
    setLoadingSites(true);
    try {
      const buIds = jseaFilterBusinessUnitIds.length > 0 ? jseaFilterBusinessUnitIds : [effectiveBuId];
      const sitesData = await getSitesByBusinessUnits(buIds);
      setSites(sitesData || []);
    } catch (error) {
      console.error('Failed to load sites:', error);
    } finally {
      setLoadingSites(false);
    }
  };

  // Load JSEA templates
  const loadJseaTemplates = async () => {
    setLoadingJsea(true);
    try {
      let response;
      if (isLoggedIn && loggedInCompanyId) {
        // Contractor logged in - filter by their company only
        console.log('📚 [CONTRACTOR] Loading JSEA templates for company:', loggedInCompanyId);
        response = await getJseaTemplatesByCompany(loggedInCompanyId);
        console.log('📚 [CONTRACTOR] getJseaTemplatesByCompany response:', response);
      } else {
        // Admin view - filter by business unit
        if (!effectiveBuId) {
          console.log('📚 [ADMIN] No BU ID available, skipping load');
          setLoadingJsea(false);
          return;
        }
        console.log('📚 [ADMIN] Loading JSEA templates for BU:', effectiveBuId);
        response = await getJseaTemplates(effectiveBuId);
        console.log('📚 [ADMIN] getJseaTemplates response:', response);
      }
      
      if (response.success) {
        console.log(`✅ Loaded ${response.data?.length || 0} templates:`, response.data);
        response.data?.forEach((t, i) => {
          console.log(`  Template ${i+1}: id=${t.id}, name=${t.name}, jsea_steps=${t.jsea?.length || 0}`);
        });
        setJseaTemplates(response.data || []);
      } else {
        console.error('❌ Failed to load templates:', response.error);
      }
    } catch (error) {
      console.error('❌ Exception loading templates:', error);
      Alert.alert('Error', 'Failed to load JSEA templates: ' + error.message);
    } finally {
      setLoadingJsea(false);
    }
  };

  // Load Permit templates
  const loadPermitTemplates = async () => {
    setLoadingPermits(true);
    try {
      let response;
      if (isLoggedIn && loggedInCompanyName) {
        // Contractor logged in - filter by their company only
        console.log('📋 [CONTRACTOR] Loading permit templates for company:', loggedInCompanyName);
        response = await getPermitTemplatesByCompany(loggedInCompanyName);
        console.log('📋 [CONTRACTOR] getPermitTemplatesByCompany response:', response);
      } else {
        // Admin view - filter by business unit
        if (!effectiveBuId) {
          console.log('📋 [ADMIN] No BU ID available, skipping load');
          setLoadingPermits(false);
          return;
        }
        console.log('📋 [ADMIN] Loading permit templates for BU:', effectiveBuId);
        response = await getPermitTemplates(effectiveBuId);
        console.log('📋 [ADMIN] getPermitTemplates response:', response);
      }
      
      if (response.success) {
        console.log(`✅ Loaded ${response.data?.length || 0} permit templates`);
        setPermitTemplates(response.data || []);
      } else {
        console.error('❌ Failed to load templates:', response.error);
      }
    } catch (error) {
      console.error('❌ Exception loading templates:', error);
      Alert.alert('Error', 'Failed to load permit templates: ' + error.message);
    } finally {
      setLoadingPermits(false);
    }
  };

  // Load inductions for selected company
  const loadInductions = async () => {
    if (!selectedCompanyId) {
      setInductedContractors([]);
      return;
    }
    setLoadingInductions(true);
    try {
      const data = await getContractorInductionsForCompany(selectedCompanyId);
      setInductedContractors(data || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to load inductions: ' + error.message);
      setInductedContractors([]);
    } finally {
      setLoadingInductions(false);
    }
  };

  useEffect(() => {
    loadCompanies();
    // Load JSEA templates on mount for dashboard count
    loadJseaTemplates();
  }, []);

  useEffect(() => {
    // Reload templates whenever login status changes
    if (isLoggedIn && loggedInCompanyId) {
      loadJseaTemplates();
    }
  }, [isLoggedIn, loggedInCompanyId]);

  useEffect(() => {
    if (activeTab === 'jsea') {
      loadJseaTemplates();
      loadSites();
    } else {
      loadPermitTemplates();
    }
  }, [activeTab, effectiveBuId, jseaFilterBusinessUnitIds]);

  useEffect(() => {
    if (activeTab === 'inductions') {
      loadInductions();
    }
  }, [activeTab, selectedCompanyId]);

  // Auto-load inductions when contractor logs in (for dashboard count)
  useEffect(() => {
    if (isLoggedIn && loggedInCompanyId) {
      loadInductions();
    }
  }, [isLoggedIn, loggedInCompanyId]);

  // Handle save JSEA template - show modal first
  const handleSaveJseaTemplate = async () => {
    console.log('🔴 SAVE CLICKED - Starting handleSaveJseaTemplate');
    console.log('State values:', {
      jseaTemplateName,
      currentJseaSteps_length: currentJseaSteps.length,
      selectedBusinessUnitIds,
      selectedCompanyId
    });

    // Check validation 1
    if (!jseaTemplateName.trim()) {
      console.warn('❌ Validation 1 failed: no template name');
      Alert.alert('Validation', 'Please enter a template name');
      window.alert('⚠️ VALIDATION: Please enter a template name');
      return;
    }

    // Check validation 2
    if (currentJseaSteps.length === 0) {
      console.warn('❌ Validation 2 failed: no JSEA steps');
      Alert.alert('Validation', 'Please add at least one step');
      window.alert('⚠️ VALIDATION: Please add at least one step');
      return;
    }

    // Check validation 3
    if (selectedBusinessUnitIds.length === 0) {
      console.warn('❌ Validation 3 failed: no business units selected');
      Alert.alert('Validation', 'Please select at least one business unit');
      window.alert('⚠️ VALIDATION: Please select at least one business unit');
      return;
    }

    console.log('✅ All validations passed');

    try {
      console.log('💾 Calling template API...');
      console.log('Parameters:', {
        name: jseaTemplateName,
        steps: currentJseaSteps.length,
        businessUnits: selectedBusinessUnitIds,
        company: selectedCompanyId,
        isEditing: !!editingJseaTemplate
      });

      let response;
      if (editingJseaTemplate) {
        // Update existing template
        console.log('📝 Updating existing template ID:', editingJseaTemplate.id);
        response = await updateJseaTemplate(
          editingJseaTemplate.id,
          jseaTemplateName,
          currentJseaSteps,
          selectedBusinessUnitIds,
          selectedCompanyId,
          [] // No sites enabled for JSEA templates
        );
      } else {
        // Create new template
        console.log('✨ Creating new template');
        response = await saveJseaTemplate(
          jseaTemplateName,
          currentJseaSteps,
          selectedBusinessUnitIds,
          selectedCompanyId,
          [] // No sites enabled for JSEA templates
        );
      }

      console.log('📋 API Response received:', response);

      if (response.success) {
        console.log('✅ Save successful!');
        const action = editingJseaTemplate ? 'updated' : 'created';
        Alert.alert('Success', `Template "${jseaTemplateName}" ${action} for ${selectedBusinessUnitIds.length} business unit(s)`);
        window.alert(`✅ SUCCESS: Template "${jseaTemplateName}" ${action}!`);
        setShowSaveModal(false);
        setShowJseaEditor(false);
        resetJseaForm();
        loadJseaTemplates();
      } else {
        console.error('❌ Save failed:', response.error);
        Alert.alert('Error', response.error || 'Failed to save template');
        window.alert(`❌ ERROR: ${response.error || 'Failed to save template'}`);
      }
    } catch (error) {
      console.error('❌ Exception caught:', error);
      console.error('Stack:', error.stack);
      Alert.alert('Error', 'Failed to save template: ' + error.message);
      window.alert(`❌ EXCEPTION: ${error.message}`);
    }
  };

  // Open save modal when JSEA steps are ready
  const handleJseaSaved = (steps) => {
    setCurrentJseaSteps(steps);
    setShowJseaEditor(false);
    setShowSaveModal(true);
  };

  // Handle delete JSEA template
  const handleDeleteJseaTemplate = async (templateId) => {
    console.log('🗑️ DELETE HANDLER CALLED');
    console.log('   templateId param:', templateId);
    console.log('   typeof templateId:', typeof templateId);
    
    if (!templateId) {
      console.error('❌ ERROR: templateId is null/undefined');
      Alert.alert('Error', 'Cannot delete: template ID not found');
      return;
    }
    
    // Use window.confirm for web - more reliable than Alert.alert
    const confirmed = window.confirm('Delete this template? This action cannot be undone.');
    
    if (!confirmed) {
      console.log('❌ Delete cancelled by user');
      return;
    }
    
    try {
      console.log('🗑️ DELETE CONFIRMED - Calling deleteJseaTemplate with id:', templateId);
      const response = await deleteJseaTemplate(templateId);
      console.log('📋 Delete API response:', response);
      
      if (response.success) {
        console.log('✅ Delete successful!');
        Alert.alert('Success', 'Template deleted');
        await loadJseaTemplates();
      } else {
        console.error('❌ Delete failed:', response.error);
        Alert.alert('Error', response.error || 'Failed to delete template');
      }
    } catch (error) {
      console.error('❌ Exception during delete:', error);
      Alert.alert('Error', 'Failed to delete template: ' + error.message);
    }
  };

  // Handle delete permit template
  const handleDeletePermitTemplate = (templateId) => {
    console.log('🗑️ [DELETE] Opening confirmation modal for:', templateId);
    setDeletingTemplateId(templateId);
    setDeleteConfirmModal(true);
  };

  const confirmDeletePermitTemplate = async () => {
    if (!deletingTemplateId) return;
    
    console.log('🗑️ [DELETE CONFIRMED] Deleting template:', deletingTemplateId);
    setIsDeleting(true);
    
    try {
      const response = await deletePermitTemplate(deletingTemplateId);
      console.log('🗑️ [DELETE] Response received:', response);
      
      if (response.success) {
        console.log('✅ [DELETE] Success! Reloading templates...');
        Alert.alert('Success', response.message || 'Template deleted successfully');
        setDeleteConfirmModal(false);
        setDeletingTemplateId(null);
        await loadPermitTemplates();
      } else if (response.error) {
        console.log('❌ [DELETE] Error from API:', response.error);
        Alert.alert('Error', response.error);
      } else {
        console.log('❌ [DELETE] Unknown response structure:', response);
        Alert.alert('Error', 'Failed to delete template');
      }
    } catch (error) {
      console.error('❌ [DELETE] Exception:', error);
      Alert.alert('Error', 'Failed to delete template: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDeletePermitTemplate = () => {
    console.log('🗑️ [DELETE] Cancel clicked');
    setDeleteConfirmModal(false);
    setDeletingTemplateId(null);
  };

  // Open permit template editor
  const handleEditPermitTemplate = (template) => {
    setEditingPermitTemplate(template);
    setEditedTemplateName(template.template_name || '');
    setEditedTemplateDescription(template.description || '');
    setShowPermitTemplateEditor(true);
  };

  // Save updated permit template
  const handleSavePermitTemplate = async () => {
    if (!editedTemplateName.trim()) {
      Alert.alert('Validation', 'Please enter a template name');
      return;
    }

    setSavingPermitTemplate(true);
    try {
      const response = await updatePermitTemplate(
        editingPermitTemplate.id,
        editedTemplateName,
        editedTemplateDescription
      );

      if (response.success) {
        Alert.alert('Success', 'Template updated successfully');
        setShowPermitTemplateEditor(false);
        loadPermitTemplates();
      } else {
        Alert.alert('Error', response.error || 'Failed to save template');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save template: ' + error.message);
    } finally {
      setSavingPermitTemplate(false);
    }
  };

  // Reset JSEA form
  const resetJseaForm = () => {
    setJseaTemplateName('');
    setCurrentJseaSteps([]);
    setEditingJseaTemplate(null);
    setSelectedBusinessUnitIds([]);
    setSelectedCompanyId(null);
    setOpenDropdown(null);
    setJseaCompanySearch('');
    setJseaBusinessUnitSearch('');
    setJseaSiteSearch('');
  };

  // Open JSEA editor for new template
  const handleNewJseaTemplate = () => {
    resetJseaForm();
    setShowJseaEditor(true);
  };

  // Open JSEA editor for editing template
  const handleEditJseaTemplate = (template) => {
    console.log('📝 EDIT BUTTON CLICKED');
    console.log('📝 Template object:', template);
    console.log('📝 Template.name:', template.name);
    console.log('📝 Template.jsea (steps array):', template.jsea);
    console.log('📝 Template.jsea?.length:', template.jsea?.length || 0);
    console.log('📝 Template.business_units:', template.business_units);
    console.log('📝 Template.company_id:', template.company_id);
    
    setEditingJseaTemplate(template);
    setJseaTemplateName(template.name);
    
    // IMPORTANT: Log the value being set
    const stepsToSet = template.jsea || [];
    console.log('📝 About to setCurrentJseaSteps to:', stepsToSet);
    console.log('📝 This is:', stepsToSet.length, 'steps');
    setCurrentJseaSteps(stepsToSet);
    
    // Populate business units and company from template
    console.log('✅ Setting selectedBusinessUnitIds to:', template.business_units || []);
    setSelectedBusinessUnitIds(template.business_units || []);
    console.log('✅ Setting selectedCompanyId to:', template.company_id || null);
    setSelectedCompanyId(template.company_id || null);
    
    console.log('✅ Opening JSEA editor, calling setShowJseaEditor(true)');
    setShowJseaEditor(true);
  };

  // Render JSEA Templates Tab
  const renderJseaTemplates = () => {
    console.log(`🎨 Rendering JSEA Templates - ${jseaTemplates.length} templates available`);
    jseaTemplates.forEach((t, i) => {
      console.log(`  [${i}] Template: id="${t.id}", name="${t.name}"`);
    });
    
    if (loadingJsea) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      );
    }

    return (
      <View style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1, padding: 16 }}>
          <TouchableOpacity 
            style={[styles.addButton, { marginBottom: 16 }]} 
            onPress={handleNewJseaTemplate}
          >
            <Text style={styles.addButtonText}>+ Create New Template</Text>
          </TouchableOpacity>

          {jseaTemplates.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Text style={{ fontSize: 14, color: '#9CA3AF' }}>No JSEA templates created yet</Text>
            </View>
          ) : (
            jseaTemplates.map((template) => (
              <View 
                key={template.id} 
                style={{
                  backgroundColor: 'white',
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 12
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#1F2937' }}>
                      {template.name}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>
                      {template.jsea?.length || 0} step{template.jsea?.length !== 1 ? 's' : ''}
                    </Text>
                    {template.created_at && (
                      <Text style={{ fontSize: 10, color: '#9CA3AF', marginTop: 4 }}>
                        Created: {new Date(template.created_at).toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity 
                      style={{
                        backgroundColor: '#3B82F6',
                        padding: 8,
                        borderRadius: 6,
                        minWidth: 50,
                        alignItems: 'center'
                      }}
                      onPress={() => handleEditJseaTemplate(template)}
                    >
                      <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={{
                        backgroundColor: '#EF4444',
                        padding: 8,
                        borderRadius: 6,
                        minWidth: 50,
                        alignItems: 'center'
                      }}
                      onPress={() => handleDeleteJseaTemplate(template.id)}
                    >
                      <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                {template.jsea && template.jsea.length > 0 && (
                  <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#D1D5DB' }}>
                    <Text style={{ fontSize: 11, color: '#6B7280', marginBottom: 4, fontWeight: '500' }}>Steps:</Text>
                    {template.jsea.slice(0, 3).map((step, idx) => (
                      <Text key={idx} style={{ fontSize: 10, color: '#374151', marginBottom: 2 }}>
                        • {step.description?.substring(0, 70) || 'Step ' + (idx + 1)}
                      </Text>
                    ))}
                    {template.jsea.length > 3 && (
                      <Text style={{ fontSize: 10, color: '#9CA3AF', marginTop: 4 }}>
                        ... and {template.jsea.length - 3} more step{template.jsea.length - 3 !== 1 ? 's' : ''}
                      </Text>
                    )}
                  </View>
                )}
              </View>
            ))
          )}
        </ScrollView>
      </View>
    );
  };

  // Render Permit Templates Tab
  const renderPermitTemplates = () => {
    if (loadingPermits) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      );
    }

    return (
      <ScrollView style={styles.section}>
        <View style={{ padding: 12, backgroundColor: '#FEF3C7', borderRadius: 6, marginBottom: 16 }}>
          <Text style={{ fontSize: 13, color: '#92400E' }}>
            💡 Permit templates are saved from the permit form after fillin in details. To make changes to a template, load the template into the permit screen, make the changes and resave, before deleting the old permit template
          </Text>
        </View>

        {permitTemplates.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Text style={{ fontSize: 16, color: '#9CA3AF', fontStyle: 'italic' }}>
              No permit templates yet
            </Text>
          </View>
        ) : (
          permitTemplates.map((template) => (
            <View 
              key={template.id} 
              style={{
                backgroundColor: '#F9FAFB',
                borderWidth: 1,
                borderColor: '#E5E7EB',
                borderRadius: 8,
                padding: 12,
                marginBottom: 12
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#1F2937' }}>
                    {template.template_name || 'Untitled'}
                  </Text>
                  {template.description && (
                    <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
                      {template.description}
                    </Text>
                  )}
                  {template.company_name && (
                    <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                      Company: {template.company_name}
                    </Text>
                  )}
                  {template.created_at && (
                    <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
                      Created: {new Date(template.created_at).toLocaleDateString()}
                    </Text>
                  )}
                </View>
                <View style={{ flexDirection: 'column', gap: 6 }}>
                  <TouchableOpacity 
                    style={{
                      backgroundColor: '#3B82F6',
                      padding: 8,
                      borderRadius: 6,
                      minWidth: 50,
                      alignItems: 'center'
                    }}
                    onPress={() => handleEditPermitTemplate(template)}
                  >
                    <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={{
                      backgroundColor: '#EF4444',
                      padding: 8,
                      borderRadius: 6,
                      minWidth: 50,
                      alignItems: 'center'
                    }}
                    onPress={() => {
                      console.log('🔴 DELETE BUTTON PRESSED for template:', template.id);
                      handleDeletePermitTemplate(template.id);
                    }}
                  >
                    <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    );
  };

  // Render inductions tab in table format
  const renderInductions = () => {
    if (loadingInductions) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      );
    }

    if (!selectedCompanyId) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center' }}>
            Please select a company to view inductions
          </Text>
        </View>
      );
    }

    if (inductedContractors.length === 0) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center' }}>
            No contractors inducted yet
          </Text>
        </View>
      );
    }

    return (
      <View style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }}>
          {/* Table Wrapper with horizontal scroll for wide table */}
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View style={{ padding: 16 }}>
              {/* Table Header */}
              <View
                style={{
                  flexDirection: 'row',
                  backgroundColor: '#F3F4F6',
                  borderBottomWidth: 2,
                  borderBottomColor: '#D1D5DB',
                  paddingVertical: 10,
                  paddingHorizontal: 8,
                  minWidth: 1000
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#1F2937', width: 150, paddingRight: 8 }}>Name</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#1F2937', width: 180, paddingRight: 8 }}>Email</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#1F2937', width: 200, paddingRight: 8 }}>Inducted Services</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#1F2937', width: 120, paddingRight: 8 }}>Expiry Date</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#1F2937', width: 100, paddingRight: 8 }}>Actions</Text>
              </View>

              {/* Table Rows */}
          {inductedContractors.map((contractor, idx) => (
            <View
              key={contractor.id}
              style={{
                flexDirection: 'row',
                backgroundColor: idx % 2 === 0 ? 'white' : '#F9FAFB',
                borderBottomWidth: 1,
                borderBottomColor: '#E5E7EB',
                paddingVertical: 10,
                paddingHorizontal: 8,
                minWidth: 1000
              }}
            >
              <Text style={{ fontSize: 11, color: '#1F2937', width: 150, paddingRight: 8 }}>
                {contractor.name}
              </Text>
              <Text style={{ fontSize: 11, color: '#6B7280', width: 180, paddingRight: 8 }}>
                {contractor.email || 'N/A'}
              </Text>
              <Text style={{ fontSize: 11, color: '#1F2937', width: 200, paddingRight: 8 }}>
                {contractor.service_names && contractor.service_names.length > 0 ? contractor.service_names.join(', ') : 'None'}
              </Text>
              <Text style={{ fontSize: 11, color: '#1F2937', width: 120, paddingRight: 8 }}>
                {contractor.induction_expiry ? new Date(contractor.induction_expiry).toLocaleDateString('en-NZ') : 'N/A'}
              </Text>
              <View style={{ width: 100, paddingRight: 8, flexDirection: 'row', gap: 6 }}>
                <TouchableOpacity
                  onPress={() => {
                    setEditingContractor(contractor);
                    setEditContractorName(contractor.name);
                    setEditContractorEmail(contractor.email || '');
                    setEditContractorPhone(contractor.phone_number || '');
                  }}
                  style={{ padding: 6, backgroundColor: '#DBEAFE', borderRadius: 4 }}
                >
                  <Text style={{ fontSize: 10, color: '#0369A1', fontWeight: '600' }}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    Alert.alert(
                      'Delete Contractor',
                      `Are you sure you want to delete ${contractor.name}?`,
                      [
                        { text: 'Cancel', onPress: () => {} },
                        {
                          text: 'Delete',
                          onPress: async () => {
                            try {
                              const { error } = await supabase
                                .from('contractors')
                                .delete()
                                .eq('id', contractor.id);
                              if (error) {
                                Alert.alert('Error', 'Failed to delete contractor');
                              } else {
                                loadInductions();
                              }
                            } catch (err) {
                              Alert.alert('Error', 'Failed to delete contractor');
                            }
                          },
                          style: 'destructive'
                        }
                      ]
                    );
                  }}
                  style={{ padding: 6, backgroundColor: '#FEE2E2', borderRadius: 4 }}
                >
                  <Text style={{ fontSize: 10, color: '#DC2626', fontWeight: '600' }}>Delete</Text>
                </TouchableOpacity>
              </View>

            </View>
          ))}
            </View>
          </ScrollView>
        </ScrollView>
      </View>
    );
  };

  // Render contractor edit modal
  const renderEditContractorModal = () => {
    const handleSaveContractor = async () => {
      if (!editContractorName.trim()) {
        Alert.alert('Validation', 'Name cannot be empty');
        return;
      }

      if (editContractorEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editContractorEmail)) {
        Alert.alert('Validation', 'Please enter a valid email address');
        return;
      }

      setSavingContractor(true);
      try {
        const { error } = await supabase
          .from('contractors')
          .update({
            name: editContractorName,
            email: editContractorEmail,
            phone_number: editContractorPhone,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingContractor.id);

        if (error) {
          Alert.alert('Error', 'Failed to update contractor: ' + error.message);
        } else {
          Alert.alert('Success', 'Contractor updated successfully');
          setEditingContractor(null);
          loadInductions();
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to update contractor');
      } finally {
        setSavingContractor(false);
      }
    };

    if (!editingContractor) return null;

    return (
      <Modal
        visible={!!editingContractor}
        transparent={true}
        animationType="slide"
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            padding: 20,
            paddingBottom: 40,
            maxHeight: '80%'
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#1F2937' }}>Edit Contractor</Text>
              <TouchableOpacity onPress={() => setEditingContractor(null)}>
                <Text style={{ fontSize: 24, color: '#6B7280' }}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ marginBottom: 16 }}>
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#1F2937', marginBottom: 6 }}>Name *</Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: '#D1D5DB',
                    borderRadius: 6,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 13,
                    color: '#1F2937'
                  }}
                  value={editContractorName}
                  onChangeText={setEditContractorName}
                  placeholder="Contractor name"
                />
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#1F2937', marginBottom: 6 }}>Email</Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: '#D1D5DB',
                    borderRadius: 6,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 13,
                    color: '#1F2937'
                  }}
                  value={editContractorEmail}
                  onChangeText={setEditContractorEmail}
                  placeholder="Email address"
                  keyboardType="email-address"
                />
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#1F2937', marginBottom: 6 }}>Phone</Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: '#D1D5DB',
                    borderRadius: 6,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 13,
                    color: '#1F2937'
                  }}
                  value={editContractorPhone}
                  onChangeText={setEditContractorPhone}
                  placeholder="Phone number"
                  keyboardType="phone-pad"
                />
              </View>
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={() => setEditingContractor(null)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  backgroundColor: '#E5E7EB',
                  borderRadius: 6,
                  alignItems: 'center'
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveContractor}
                disabled={savingContractor}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  backgroundColor: savingContractor ? '#94A3B8' : '#3B82F6',
                  borderRadius: 6,
                  alignItems: 'center'
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#FFFFFF' }}>
                  {savingContractor ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // Render profile edit
  const renderProfileEdit = () => {
    const handleSaveProfile = async () => {
      if (!profileName.trim()) {
        Alert.alert('Validation', 'Name cannot be empty');
        return;
      }

      if (profileEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileEmail)) {
        Alert.alert('Validation', 'Please enter a valid email address');
        return;
      }

      setSavingProfile(true);
      try {
        // Update contractor record in Supabase
        const { error } = await supabase
          .from('contractors')
          .update({
            name: profileName,
            email: profileEmail || null,
            phone_number: profilePhone || null
          })
          .eq('id', loggedInContractorId);

        if (error) {
          Alert.alert('Error', 'Failed to update profile: ' + error.message);
        } else {
          // Update local state
          setLoggedInContractor(profileName);
          setLoggedInContractorEmail(profileEmail);
          setLoggedInContractorPhone(profilePhone);
          setEditingProfile(false);
          Alert.alert('Success', 'Your profile has been updated');
        }
      } catch (err) {
        Alert.alert('Error', 'Failed to update profile: ' + err.message);
      } finally {
        setSavingProfile(false);
      }
    };

    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, padding: 16 }}>
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 12 }}>
            My Profile
          </Text>
          <Text style={{ fontSize: 14, color: '#6B7280' }}>
            Update your contact information
          </Text>
        </View>

        {!editingProfile ? (
          <View>
            <View style={{ 
              backgroundColor: 'white', 
              borderRadius: 8, 
              padding: 16, 
              borderLeftWidth: 4, 
              borderLeftColor: '#06B6D4',
              marginBottom: 16
            }}>
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '600' }}>Name</Text>
                <Text style={{ fontSize: 16, color: '#1F2937', fontWeight: '500', marginTop: 4 }}>
                  {loggedInContractor}
                </Text>
              </View>
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '600' }}>Email</Text>
                <Text style={{ fontSize: 16, color: '#1F2937', fontWeight: '500', marginTop: 4 }}>
                  {loggedInContractorEmail || 'Not provided'}
                </Text>
              </View>
              <View>
                <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '600' }}>Phone</Text>
                <Text style={{ fontSize: 16, color: '#1F2937', fontWeight: '500', marginTop: 4 }}>
                  {loggedInContractorPhone || 'Not provided'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => setEditingProfile(true)}
              style={{
                backgroundColor: '#06B6D4',
                paddingVertical: 12,
                borderRadius: 8,
                alignItems: 'center'
              }}
            >
              <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
                Edit Profile
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                Name
              </Text>
              <TextInput
                style={{
                  borderWidth: 1.5,
                  borderColor: '#E5E7EB',
                  borderRadius: 8,
                  paddingHorizontal: 14,
                  paddingVertical: 11,
                  fontSize: 15,
                  color: '#1F2937',
                  backgroundColor: '#F9FAFB'
                }}
                value={profileName}
                onChangeText={setProfileName}
                placeholder="Your name"
              />
            </View>

            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                Email
              </Text>
              <TextInput
                style={{
                  borderWidth: 1.5,
                  borderColor: '#E5E7EB',
                  borderRadius: 8,
                  paddingHorizontal: 14,
                  paddingVertical: 11,
                  fontSize: 15,
                  color: '#1F2937',
                  backgroundColor: '#F9FAFB'
                }}
                value={profileEmail}
                onChangeText={setProfileEmail}
                placeholder="your.email@company.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                Phone (Optional)
              </Text>
              <TextInput
                style={{
                  borderWidth: 1.5,
                  borderColor: '#E5E7EB',
                  borderRadius: 8,
                  paddingHorizontal: 14,
                  paddingVertical: 11,
                  fontSize: 15,
                  color: '#1F2937',
                  backgroundColor: '#F9FAFB'
                }}
                value={profilePhone}
                onChangeText={setProfilePhone}
                placeholder="+64 123 456 7890"
                keyboardType="phone-pad"
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={() => {
                  setEditingProfile(false);
                  setProfileName(loggedInContractor);
                  setProfileEmail(loggedInContractorEmail || '');
                  setProfilePhone(loggedInContractorPhone || '');
                }}
                style={{
                  flex: 1,
                  backgroundColor: '#E5E7EB',
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center'
                }}
              >
                <Text style={{ color: '#374151', fontSize: 16, fontWeight: '600' }}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSaveProfile}
                disabled={savingProfile}
                style={{
                  flex: 1,
                  backgroundColor: savingProfile ? '#A0AEC0' : '#06B6D4',
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center'
                }}
              >
                <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
                  {savingProfile ? 'Saving...' : 'Save Changes'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    );
  };

  // Show authentication screen if not logged in
  if (!isLoggedIn) {
    return (
      <ContractorAuthScreen
        onLoginSuccess={handleLoginSuccess}
        styles={styles}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      {/* Header */}
      <View style={styles.header}>
        {!activeTab ? (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <TouchableOpacity onPress={handleContractorAdminBack}>
              <Text style={styles.backButton}>←</Text>
            </TouchableOpacity>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={styles.title}>Contractor Admin</Text>
              <Text style={{ fontSize: 12, color: '#D1D5DB' }}>{loggedInContractor}</Text>
            </View>
            <TouchableOpacity onPress={handleLogout} style={{ paddingHorizontal: 8 }}>
              <Text style={{ fontSize: 14, color: 'white', fontWeight: '600' }}>Logout</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <TouchableOpacity onPress={handleContractorAdminBack}>
              <Text style={styles.backButton}>←</Text>
            </TouchableOpacity>
            <Text style={styles.title}>
              {activeTab === 'jsea' ? 'JSEA Templates' : activeTab === 'permits' ? 'Permit Templates' : activeTab === 'inductions' ? 'Inducted Contractors' : activeTab === 'training-records' ? 'Training Records' : activeTab === 'profile' ? 'My Profile' : 'Accreditation'}
            </Text>
            <TouchableOpacity onPress={() => setActiveTab(null)}>
              <Text style={{ fontSize: 16, color: 'white', fontWeight: '600' }}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Dashboard View - Show cards when no tab selected */}
      {!activeTab ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
          <View style={{ padding: 16, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 }}>
            <TouchableOpacity
              onPress={() => setActiveTab('jsea')}
              style={[styles.dashboardCard, { borderLeftColor: '#8B5CF6', width: '48%' }]}
            >
              <Text style={styles.cardNumber}>{jseaTemplates.length}</Text>
              <Text style={styles.cardLabel}>JSEA Templates</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab('permits')}
              style={[styles.dashboardCard, { borderLeftColor: '#3B82F6', width: '48%' }]}
            >
              <Text style={styles.cardNumber}>{permitTemplates.length}</Text>
              <Text style={styles.cardLabel}>Permit Templates</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab('accreditation')}
              style={[styles.dashboardCard, { borderLeftColor: '#10B981', width: '48%' }]}
            >
              <Text style={styles.cardNumber}>📋</Text>
              <Text style={styles.cardLabel}>Accreditation</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab('inductions')}
              style={[styles.dashboardCard, { borderLeftColor: '#F59E0B', width: '48%' }]}
            >
              <Text style={styles.cardNumber}>{inductedContractors.length}</Text>
              <Text style={styles.cardLabel}>Inducted Contractors</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab('training-records')}
              style={[styles.dashboardCard, { borderLeftColor: '#EC4899', width: '48%' }]}
            >
              <Text style={styles.cardNumber}>🎓</Text>
              <Text style={styles.cardLabel}>Training Records</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab('profile')}
              style={[styles.dashboardCard, { borderLeftColor: '#06B6D4', width: '48%' }]}
            >
              <Text style={styles.cardNumber}>👤</Text>
              <Text style={styles.cardLabel}>My Profile</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        /* Content View - Show selected section */
        !effectiveBuId && activeTab !== 'accreditation' && activeTab !== 'inductions' ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <Text style={{ fontSize: 16, color: '#6B7280', textAlign: 'center', fontStyle: 'italic' }}>
              No business units available. Please contact your administrator.
            </Text>
          </View>
        ) : activeTab === 'accreditation' ? (
          <View style={{ flex: 1 }}>
            <CompanyAccreditationScreen
              companyId={loggedInCompanyId}
              isAdmin={false}
              styles={styles}
              onClose={() => setActiveTab(null)}
              onNavigateToTrainingRecords={() => setActiveTab('training-records')}
            />
          </View>
        ) : activeTab === 'inductions' ? (
          renderInductions()
        ) : activeTab === 'training-records' ? (
          <View style={{ flex: 1 }}>
            <TrainingRecordsScreen
              loggedInCompanyId={loggedInCompanyId}
              styles={styles}
              onClose={() => setActiveTab(null)}
            />
          </View>
        ) : activeTab === 'profile' ? (
          renderProfileEdit()
        ) : (
          activeTab === 'jsea' ? renderJseaTemplates() : renderPermitTemplates()
        )
      )}

      {/* JSEA Editor Modal */}
      {showJseaEditor && (
        <Modal
          visible={showJseaEditor}
          animationType="slide"
          onRequestClose={() => {
            setShowJseaEditor(false);
            resetJseaForm();
          }}
        >
          <View style={{ flex: 1 }}>
            {/* Modal Header */}
            <View style={{
              paddingHorizontal: 12,
              paddingVertical: 12,
              backgroundColor: '#F9FAFB',
              borderBottomWidth: 1,
              borderBottomColor: '#E5E7EB',
              paddingTop: 16
            }}>
              <TouchableOpacity onPress={() => {
                setShowJseaEditor(false);
                resetJseaForm();
              }}>
                <Text style={{ fontSize: 24, color: '#3B82F6', fontWeight: '600' }}>←</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#1F2937', marginTop: 12 }}>
                {editingJseaTemplate ? 'Edit JSEA Template' : 'Create JSEA Template'}
              </Text>

              {/* Template Name Input */}
              <View style={{ marginTop: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 }}>
                  Template Name *
                </Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: '#D1D5DB',
                    borderRadius: 6,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 14,
                    color: '#1F2937'
                  }}
                  placeholder="e.g., Hot Work - Standard Process"
                  value={jseaTemplateName}
                  onChangeText={setJseaTemplateName}
                />
              </View>
            </View>

            {/* JSEA Editor */}
            <JseaEditorScreen
              ref={jseaEditorRef}
              initialJsea={currentJseaSteps}
              onSave={(steps) => {
                console.log('✏️ JSEA EDITOR ONSAVE CALLED');
                console.log('✏️ Steps received from editor:', steps);
                console.log('✏️ Step count:', steps?.length || 0);
                setCurrentJseaSteps(steps);
                console.log('✏️ currentJseaSteps state updated');
              }}
              onCancel={() => {
                console.log('❌ JSEA EDITOR CANCELLED');
                setShowJseaEditor(false);
                resetJseaForm();
              }}
              styles={styles}
              isInModal={true}
              hideButtons={true}
            />

            {/* Bottom Buttons */}
            <View style={{
              paddingHorizontal: 12,
              paddingVertical: 12,
              backgroundColor: '#F9FAFB',
              borderTopWidth: 1,
              borderTopColor: '#E5E7EB',
              flexDirection: 'row',
              gap: 12
            }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  backgroundColor: '#E5E7EB',
                  borderRadius: 6,
                  alignItems: 'center'
                }}
                onPress={() => {
                  setShowJseaEditor(false);
                  resetJseaForm();
                }}
              >
                <Text style={{ color: '#374151', fontWeight: '600', fontSize: 14 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  backgroundColor: '#10B981',
                  borderRadius: 6,
                  alignItems: 'center'
                }}
                onPress={() => {
                  console.log('💾 SAVE TEMPLATE BUTTON PRESSED');
                  
                  // Get current steps from the editor (in case hideButtons=true and onSave wasn't called)
                  if (jseaEditorRef.current) {
                    const editorSteps = jseaEditorRef.current.getSteps();
                    console.log('💾 Got steps from editor ref:', editorSteps);
                    setCurrentJseaSteps(editorSteps);
                  }
                  
                  console.log('💾 Current state:', {
                    jseaTemplateName,
                    currentJseaSteps_count: currentJseaSteps?.length || 0,
                    currentJseaSteps: currentJseaSteps,
                    selectedBusinessUnitIds,
                    selectedCompanyId,
                    editingJseaTemplate_id: editingJseaTemplate?.id
                  });
                  
                  if (!jseaTemplateName.trim()) {
                    Alert.alert('Validation', 'Please enter a template name');
                    return;
                  }
                  // Show the save modal to select company and business units
                  console.log('🔓 Opening save modal...');
                  console.log('Current selections:', {
                    selectedBUs: selectedBusinessUnitIds,
                    selectedCompany: selectedCompanyId
                  });
                  // Always load fresh business units for the modal
                  loadBusinessUnits();
                  setShowSaveModal(true);
                }}
              >
                <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>Save Template</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Save Template Modal - Simple version matching permit modal */}
      {showSaveModal && (
        <Modal
          visible={showSaveModal}
          animationType="slide"
          transparent
          onRequestClose={() => setShowSaveModal(false)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <View style={{
              backgroundColor: 'white',
              borderRadius: 8,
              padding: 24,
              width: '100%',
              maxWidth: 500,
              maxHeight: '90%'
            }}>
              {/* Header */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#1F2937' }}>Save JSEA Template</Text>
                <TouchableOpacity onPress={() => setShowSaveModal(false)}>
                  <Text style={{ fontSize: 24, color: '#9CA3AF' }}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Template Name Input */}
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Template Name *</Text>
                  <TextInput
                    value={jseaTemplateName}
                    onChangeText={setJseaTemplateName}
                    placeholder="e.g., Crane Installation"
                    placeholderTextColor="#9CA3AF"
                    style={{
                      borderWidth: 1,
                      borderColor: '#D1D5DB',
                      borderRadius: 6,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      fontSize: 14,
                      color: '#1F2937'
                    }}
                  />
                </View>

                {/* Business Units Selection */}
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 }}>
                    Business Units * <Text style={{ fontSize: 11, fontWeight: '400', color: '#6B7280' }}>(select one or more)</Text>
                  </Text>
                  
                  {loadingBusinessUnits ? (
                    <ActivityIndicator size="large" color="#3B82F6" />
                  ) : (
                    <View style={{ gap: 10 }}>
                      {(businessUnits && businessUnits.length > 0) || loadedBusinessUnits.length > 0 ? (
                        (businessUnits && businessUnits.length > 0 ? businessUnits : loadedBusinessUnits).map((bu) => (
                          <TouchableOpacity
                            key={bu.id}
                            onPress={() => {
                              const newIds = selectedBusinessUnitIds.includes(bu.id)
                                ? selectedBusinessUnitIds.filter(id => id !== bu.id)
                                : [...selectedBusinessUnitIds, bu.id];
                              setSelectedBusinessUnitIds(newIds);
                            }}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              paddingVertical: 8
                            }}
                          >
                            <View style={{
                              width: 18,
                              height: 18,
                              borderWidth: 1.5,
                              borderColor: selectedBusinessUnitIds.includes(bu.id) ? '#F97316' : '#D1D5DB',
                              borderRadius: 3,
                              marginRight: 10,
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: selectedBusinessUnitIds.includes(bu.id) ? '#F97316' : 'white'
                            }}>
                              {selectedBusinessUnitIds.includes(bu.id) && (
                                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12 }}>✓</Text>
                              )}
                            </View>
                            <Text style={{ fontSize: 14, color: '#1F2937' }}>{bu.name}</Text>
                          </TouchableOpacity>
                        ))
                      ) : (
                        <Text style={{ fontSize: 14, color: '#6B7280' }}>No business units available</Text>
                      )}
                    </View>
                  )}
                </View>

                {/* Company Selection */}
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 }}>
                    Company (Optional) <Text style={{ fontSize: 11, fontWeight: '400', color: '#6B7280' }}>(select one)</Text>
                  </Text>

                  {loadingCompanies ? (
                    <ActivityIndicator size="large" color="#3B82F6" />
                  ) : (
                    <View style={{ gap: 10 }}>
                      {/* All Companies option */}
                      <TouchableOpacity
                        onPress={() => {
                          setSelectedCompanyId(null);
                        }}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingVertical: 8
                        }}
                      >
                        <View style={{
                          width: 18,
                          height: 18,
                          borderWidth: 1.5,
                          borderColor: selectedCompanyId === null ? '#F97316' : '#D1D5DB',
                          borderRadius: 3,
                          marginRight: 10,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: selectedCompanyId === null ? '#F97316' : 'white'
                        }}>
                          {selectedCompanyId === null && (
                            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12 }}>✓</Text>
                          )}
                        </View>
                        <Text style={{ fontSize: 14, color: '#1F2937' }}>All companies (leave blank)</Text>
                      </TouchableOpacity>

                      {/* Individual companies */}
                      {companies && companies.length > 0 ? (
                        companies.map((company) => (
                          <TouchableOpacity
                            key={company.id}
                            onPress={() => {
                              setSelectedCompanyId(selectedCompanyId === company.id ? null : company.id);
                            }}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              paddingVertical: 8
                            }}
                          >
                            <View style={{
                              width: 18,
                              height: 18,
                              borderWidth: 1.5,
                              borderColor: selectedCompanyId === company.id ? '#F97316' : '#D1D5DB',
                              borderRadius: 3,
                              marginRight: 10,
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: selectedCompanyId === company.id ? '#F97316' : 'white'
                            }}>
                              {selectedCompanyId === company.id && (
                                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12 }}>✓</Text>
                              )}
                            </View>
                            <Text style={{ fontSize: 14, color: '#1F2937' }}>{company.name}</Text>
                          </TouchableOpacity>
                        ))
                      ) : (
                        <Text style={{ fontSize: 14, color: '#6B7280' }}>No companies available</Text>
                      )}
                    </View>
                  )}
                </View>
              </ScrollView>

              {/* Action Buttons */}
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB' }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    backgroundColor: '#F3F4F6',
                    borderRadius: 6,
                    alignItems: 'center'
                  }}
                  onPress={() => setShowSaveModal(false)}
                >
                  <Text style={{ color: '#374151', fontWeight: '600', fontSize: 14 }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    backgroundColor: '#F97316',
                    borderRadius: 6,
                    alignItems: 'center'
                  }}
                  onPress={handleSaveJseaTemplate}
                >
                  <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>Save Template</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Permit Template Editor Modal */}
      {showPermitTemplateEditor && editingPermitTemplate && (
        <Modal
          visible={showPermitTemplateEditor}
          animationType="slide"
          transparent
          onRequestClose={() => setShowPermitTemplateEditor(false)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 16 }}>
            <View style={{ backgroundColor: 'white', borderRadius: 12, padding: 20, gap: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#1F2937' }}>Edit Template</Text>
                <TouchableOpacity onPress={() => setShowPermitTemplateEditor(false)}>
                  <Text style={{ fontSize: 24, color: '#9CA3AF', fontWeight: 'bold' }}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Template Name Field */}
              <View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#1F2937', marginBottom: 8 }}>
                  Template Name *
                </Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: editedTemplateName ? '#3B82F6' : '#E5E7EB',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 14,
                    color: '#1F2937'
                  }}
                  placeholder="Enter template name"
                  placeholderTextColor="#A3A3A3"
                  value={editedTemplateName}
                  onChangeText={setEditedTemplateName}
                  editable={!savingPermitTemplate}
                />
              </View>

              {/* Description Field */}
              <View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#1F2937', marginBottom: 8 }}>
                  Description (Optional)
                </Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 14,
                    color: '#1F2937',
                    minHeight: 80
                  }}
                  placeholder="Enter description"
                  placeholderTextColor="#A3A3A3"
                  value={editedTemplateDescription}
                  onChangeText={setEditedTemplateDescription}
                  multiline
                  editable={!savingPermitTemplate}
                  textAlignVertical="top"
                />
              </View>

              {/* Template Info */}
              <View style={{ paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#F3F4F6', borderRadius: 8, gap: 4 }}>
                <Text style={{ fontSize: 11, color: '#6B7280' }}>
                  Company: <Text style={{ fontWeight: '600' }}>{editingPermitTemplate.company_name || 'No company specified'}</Text>
                </Text>
                <Text style={{ fontSize: 11, color: '#6B7280' }}>
                  Created: <Text style={{ fontWeight: '600' }}>{new Date(editingPermitTemplate.created_at).toLocaleDateString()}</Text>
                </Text>
                <Text style={{ fontSize: 11, color: '#6B7280' }}>
                  Last Updated: <Text style={{ fontWeight: '600' }}>{new Date(editingPermitTemplate.updated_at).toLocaleDateString()}</Text>
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    backgroundColor: '#E5E7EB',
                    borderRadius: 8,
                    alignItems: 'center'
                  }}
                  onPress={() => setShowPermitTemplateEditor(false)}
                  disabled={savingPermitTemplate}
                >
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    backgroundColor: editedTemplateName ? '#3B82F6' : '#D1D5DB',
                    borderRadius: 8,
                    alignItems: 'center'
                  }}
                  onPress={handleSavePermitTemplate}
                  disabled={!editedTemplateName || savingPermitTemplate}
                >
                  <Text style={{ fontSize: 14, fontWeight: '600', color: 'white' }}>
                    {savingPermitTemplate ? 'Saving...' : 'Save Changes'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmModal && (
        <Modal
          visible={deleteConfirmModal}
          transparent
          animationType="fade"
          onRequestClose={cancelDeletePermitTemplate}
        >
          <View style={{ 
            flex: 1, 
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20
          }}>
            <View style={{
              backgroundColor: 'white',
              borderRadius: 12,
              padding: 20,
              minWidth: 300,
              maxWidth: 400
            }}>
              <Text style={{ 
                fontSize: 18, 
                fontWeight: '700', 
                color: '#1F2937',
                marginBottom: 12
              }}>
                Delete Template?
              </Text>
              <Text style={{ 
                fontSize: 14, 
                color: '#6B7280',
                marginBottom: 20,
                lineHeight: 20
              }}>
                This action cannot be undone. The template will be permanently deleted.
              </Text>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    backgroundColor: '#E5E7EB',
                    borderRadius: 8,
                    alignItems: 'center'
                  }}
                  onPress={cancelDeletePermitTemplate}
                  disabled={isDeleting}
                >
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151' }}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    backgroundColor: '#EF4444',
                    borderRadius: 8,
                    alignItems: 'center'
                  }}
                  onPress={confirmDeletePermitTemplate}
                  disabled={isDeleting}
                >
                  <Text style={{ fontSize: 14, fontWeight: '600', color: 'white' }}>
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Logout Confirmation Modal */}
      {logoutConfirmModal && (
        <Modal
          visible={logoutConfirmModal}
          transparent
          animationType="fade"
          onRequestClose={cancelLogout}
        >
          <View style={{ 
            flex: 1, 
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20
          }}>
            <View style={{
              backgroundColor: 'white',
              borderRadius: 12,
              padding: 20,
              minWidth: 300,
              maxWidth: 400
            }}>
              <Text style={{ 
                fontSize: 18, 
                fontWeight: '700', 
                color: '#1F2937',
                marginBottom: 12
              }}>
                Exit Contractor Admin?
              </Text>
              <Text style={{ 
                fontSize: 14, 
                color: '#6B7280',
                marginBottom: 20,
                lineHeight: 20
              }}>
                You will be logged out. Are you sure you want to exit?
              </Text>

              <View style={{ flexDirection: 'column', gap: 10 }}>
                <TouchableOpacity
                  style={{
                    paddingVertical: 12,
                    backgroundColor: '#E5E7EB',
                    borderRadius: 8,
                    alignItems: 'center'
                  }}
                  onPress={cancelLogout}
                >
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151' }}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                {onReturnToKiosk && (
                  <TouchableOpacity
                    style={{
                      paddingVertical: 12,
                      backgroundColor: '#3B82F6',
                      borderRadius: 8,
                      alignItems: 'center'
                    }}
                    onPress={() => confirmLogout('kiosk')}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '600', color: 'white' }}>
                      Back to Kiosk
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={{
                    paddingVertical: 12,
                    backgroundColor: '#EF4444',
                    borderRadius: 8,
                    alignItems: 'center'
                  }}
                  onPress={() => confirmLogout('dashboard')}
                >
                  <Text style={{ fontSize: 14, fontWeight: '600', color: 'white' }}>
                    Back to Admin
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Edit Contractor Modal */}
      {renderEditContractorModal()}
    </View>
  );
}
