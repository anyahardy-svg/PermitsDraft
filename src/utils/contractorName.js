export const validateContractorFullName = (name) => {
  const trimmed = String(name || '').trim();
  if (!trimmed) {
    return 'Full name is required';
  }
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length < 2) {
    return 'Please enter your first and last name';
  }
  return null;
};
