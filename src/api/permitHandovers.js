import { supabase } from '../supabaseClient';

// Transfer permit to a different receiver
export const handoverPermit = async (permitId, fromReceiverId, toReceiverId, reason = '') => {
  try {
    console.log(`🔄 Handing over permit ${permitId} from ${fromReceiverId} to ${toReceiverId}`);
    
    // Create handover record
    const { data: handover, error: handoverError } = await supabase
      .from('permit_handovers')
      .insert([{
        permit_id: permitId,
        from_receiver_id: fromReceiverId,
        to_receiver_id: toReceiverId,
        reason: reason,
        handover_timestamp: new Date().toISOString()
      }])
      .select();
    
    if (handoverError) throw handoverError;
    
    // Update permit to reflect new receiver
    const { data: permit, error: permitError } = await supabase
      .from('permits')
      .update({
        current_permit_receiver_id: toReceiverId,
        last_receiver_id: fromReceiverId,
        permitted_issuer: toReceiverId, // Keep this updated for backwards compatibility
        updated_at: new Date().toISOString()
      })
      .eq('id', permitId)
      .select();
    
    if (permitError) throw permitError;
    
    console.log('✅ Handover complete:', handover);
    return { success: true, handover: handover[0], permit: permit[0] };
  } catch (error) {
    console.error('Error handing over permit:', error);
    return { success: false, error: error.message };
  }
};

// Acknowledge receipt of a handover
export const acknowledgeHandover = async (handoverId, receiverId) => {
  try {
    console.log(`👤 ${receiverId} acknowledging handover ${handoverId}`);
    
    const { data, error } = await supabase
      .from('permit_handovers')
      .update({
        acknowledged_by: receiverId,
        acknowledged_at: new Date().toISOString()
      })
      .eq('id', handoverId)
      .select();
    
    if (error) throw error;
    
    console.log('✅ Handover acknowledged');
    return { success: true, data: data[0] };
  } catch (error) {
    console.error('Error acknowledging handover:', error);
    return { success: false, error: error.message };
  }
};

// Get handover history for a permit
export const getPermitHandoverHistory = async (permitId) => {
  try {
    console.log(`📜 Fetching handover history for permit ${permitId}`);
    
    const { data, error } = await supabase
      .from('permit_handovers')
      .select(`
        id,
        permit_id,
        from_receiver_id,
        to_receiver_id,
        reason,
        handover_timestamp,
        acknowledged_by,
        acknowledged_at,
        created_at
      `)
      .eq('permit_id', permitId)
      .order('handover_timestamp', { ascending: false });
    
    if (error) throw error;
    
    console.log(`✅ Found ${data?.length || 0} handovers`);
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching handover history:', error);
    return { success: false, error: error.message, data: [] };
  }
};

// Get pending handovers (not yet acknowledged)
export const getPendingHandovers = async (receiverId) => {
  try {
    console.log(`📋 Fetching pending handovers for receiver ${receiverId}`);
    
    const { data, error } = await supabase
      .from('permit_handovers')
      .select(`
        id,
        permit_id,
        from_receiver_id,
        to_receiver_id,
        reason,
        handover_timestamp,
        permits!inner(
          id,
          description,
          permit_type,
          site_id,
          status
        )
      `)
      .eq('to_receiver_id', receiverId)
      .is('acknowledged_at', null)
      .order('handover_timestamp', { ascending: false });
    
    if (error) throw error;
    
    console.log(`✅ Found ${data?.length || 0} pending handovers`);
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching pending handovers:', error);
    return { success: false, error: error.message, data: [] };
  }
};

// Get all handovers involving a receiver (sent or received)
export const getReceiverHandovers = async (receiverId) => {
  try {
    console.log(`📊 Fetching all handovers for receiver ${receiverId}`);
    
    const { data, error } = await supabase
      .from('permit_handovers')
      .select(`
        id,
        permit_id,
        from_receiver_id,
        to_receiver_id,
        reason,
        handover_timestamp,
        acknowledged_at,
        permits!inner(
          id,
          description,
          permit_type
        )
      `)
      .or(`from_receiver_id.eq.${receiverId},to_receiver_id.eq.${receiverId}`)
      .order('handover_timestamp', { ascending: false });
    
    if (error) throw error;
    
    console.log(`✅ Found ${data?.length || 0} handovers`);
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching receiver handovers:', error);
    return { success: false, error: error.message, data: [] };
  }
};
