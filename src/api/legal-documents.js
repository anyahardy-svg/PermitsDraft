import supabase from './supabaseClient';

/**
 * Fetch a legal document by type (gets the active version)
 */
export async function getLegalDocument(documentType) {
  try {
    const { data, error } = await supabase
      .from('legal_documents')
      .select('*')
      .eq('document_type', documentType)
      .eq('is_active', true)
      .order('version_number', { ascending: false })
      .limit(1);

    if (error) throw error;
    return data && data.length > 0 ? data[0] : null;
  } catch (err) {
    console.error('Error fetching legal document:', err);
    throw err;
  }
}

/**
 * Get all versions of a legal document
 */
export async function getLegalDocumentVersions(documentType) {
  try {
    const { data, error } = await supabase
      .from('legal_documents')
      .select('*')
      .eq('document_type', documentType)
      .order('version_number', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching legal document versions:', err);
    throw err;
  }
}

/**
 * Update a legal document (creates new version, deactivates old)
 */
export async function updateLegalDocument(documentType, updates) {
  try {
    const { data: user } = await supabase.auth.getUser();
    
    // Get current active version
    const currentDoc = await getLegalDocument(documentType);
    const newVersion = (currentDoc?.version_number || 0) + 1;

    // Deactivate old version
    if (currentDoc) {
      await supabase
        .from('legal_documents')
        .update({ is_active: false })
        .eq('id', currentDoc.id);
    }

    // Insert new version
    const { data, error } = await supabase
      .from('legal_documents')
      .insert([
        {
          document_type: documentType,
          document_title: updates.document_title || currentDoc?.document_title || 'Legal Document',
          document_content: updates.document_content,
          version_number: newVersion,
          is_active: true,
          updated_by: user?.user?.id,
        },
      ])
      .select();

    if (error) throw error;
    return data?.[0] || null;
  } catch (err) {
    console.error('Error updating legal document:', err);
    throw err;
  }
}

/**
 * Record H&S agreement acceptance for a company
 */
export async function recordHSAgreementAcceptance(companyId, acceptanceData) {
  try {
    const { data, error } = await supabase
      .from('companies')
      .update({
        hs_agreement_accepted: true,
        hs_agreement_signed_date: new Date().toISOString(),
        hs_agreement_signature: acceptanceData.signature, // base64 canvas drawing
        hs_agreement_accepted_by: acceptanceData.acceptedBy, // name of person
      })
      .eq('id', companyId)
      .select();

    if (error) throw error;
    return data?.[0] || null;
  } catch (err) {
    console.error('Error recording H&S agreement acceptance:', err);
    throw err;
  }
}

/**
 * Get H&S agreement acceptance status for a company
 */
export async function getHSAgreementStatus(companyId) {
  try {
    const { data, error } = await supabase
      .from('companies')
      .select('hs_agreement_accepted, hs_agreement_signed_date, hs_agreement_accepted_by')
      .eq('id', companyId)
      .single();

    if (error) throw error;
    return data || {};
  } catch (err) {
    console.error('Error fetching H&S agreement status:', err);
    throw err;
  }
}
