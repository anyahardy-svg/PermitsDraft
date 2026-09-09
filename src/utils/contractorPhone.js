export const formatPhoneForDisplay = (phone) => {
  if (!phone) return '';
  const phoneStr = String(phone).trim();
  if (!phoneStr) return '';
  if (phoneStr.startsWith('0')) return phoneStr;
  return `0${phoneStr}`;
};

export const normalizePhoneForSave = (phone) => {
  const trimmed = String(phone || '').trim();
  if (!trimmed) return '';
  return trimmed.startsWith('0') ? trimmed.substring(1) : trimmed;
};

export const normalizePhoneDigits = (phone) => String(phone || '').replace(/\D/g, '');

export const validateContractorPhone = (phone) => {
  const trimmed = String(phone || '').trim();
  if (!trimmed) {
    return 'Please enter your phone number';
  }
  if (normalizePhoneDigits(trimmed).length < 8) {
    return 'Please enter a valid phone number';
  }
  return null;
};

export const contractorPhoneNeedsUpdate = (existingPhone, editedPhone) => {
  const phoneToSave = normalizePhoneForSave(editedPhone);
  if (!phoneToSave) return false;
  if (!existingPhone || !String(existingPhone).trim()) return true;
  return normalizePhoneDigits(phoneToSave) !== normalizePhoneDigits(existingPhone);
};
