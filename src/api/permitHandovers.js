import { supabase } from '../supabaseClient';

// Transfer permit to a different receiver
export const handoverPermit = async (permitId, fromReceiverName, toReceiverName, reason = '') => {
  try {
    console.log(`🔄 Handing over permit ${permitId} from "${fromReceiverName}" to "${toReceiverName}"`);
    
    // Get current permit to access last_receiver_id log
    const { data: permit, error: getError } = await supabase
      .from('permits')
      .select('current_permit_receiver_id, last_receiver_id')
      .eq('id', permitId)
      .single();

    if (getError) throw getError;

    // Build the handover log entry: "Name (YYYY-MM-DD HH:MM:SS)"
    const now = new Date().toISOString();
    const timestamp = now.split('T')[0] + ' ' + now.split('T')[1].substring(0, 8);
    const logEntry = `${fromReceiverName} (${timestamp})`;
    
    // Append to last_receiver_id log, or create it if empty
    const updatedLog = permit.last_receiver_id 
      ? `${permit.last_receiver_id}, ${logEntry}`
      : logEntry;

    // Update permit: set new receiver, update requested_by, and append to log
    const { data: updatedPermit, error: updateError } = await supabase
      .from('permits')
      .update({
        requested_by: toReceiverName,
        current_permit_receiver_id: toReceiverName,
        last_receiver_id: updatedLog,
        updated_at: new Date().toISOString()
      })
      .eq('id', permitId)
      .select();

    if (updateError) throw updateError;

    console.log('✅ Handover complete. Log:', updatedLog);
    return { success: true, handover: { from: fromReceiverName, to: toReceiverName, reason, timestamp }, permit: updatedPermit[0] };
  } catch (error) {
    console.error('Error handing over permit:', error);
    return { success: false, error: error.message };
  }
};

// Get handover history for a permit (read from last_receiver_id field)
export const getPermitHandoverHistory = async (permitId) => {
  try {
    console.log(`📜 Fetching handover history for permit ${permitId}`);
    
    const { data: permit, error } = await supabase
      .from('permits')
      .select('current_permit_receiver_id, last_receiver_id')
      .eq('id', permitId)
      .single();

    if (error) throw error;
    
    // Parse the log from last_receiver_id
    const history = [];
    if (permit?.last_receiver_id) {
      const entries = permit.last_receiver_id.split(', ');
      entries.forEach((entry, index) => {
        history.push({
          id: `${permitId}-${index}`,
          from_receiver: entry,
          to_receiver: index === entries.length - 1 ? permit.current_permit_receiver_id : entries[index + 1]?.split('(')[0]?.trim()
        });
      });
    }
    
    console.log(`✅ Found ${history.length} handovers`);
    return { success: true, data: history };
  } catch (error) {
    console.error('Error fetching handover history:', error);
    return { success: false, error: error.message, data: [] };
  }
};
