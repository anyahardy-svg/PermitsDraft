export function getApplicableBusinessUnitIds(service) {
  return service?.applicable_business_unit_ids || service?.applicableBusinessUnitIds || [];
}

export function isServiceApplicableToBusinessUnits(service, businessUnitIds = []) {
  if (!service || !Array.isArray(businessUnitIds) || businessUnitIds.length === 0) {
    return false;
  }

  const applicableIds = getApplicableBusinessUnitIds(service);
  if (!applicableIds.length) {
    return true;
  }

  return businessUnitIds.some((id) => applicableIds.includes(id));
}

export function filterServicesForBusinessUnits(services = [], businessUnitIds = []) {
  if (!Array.isArray(services) || !Array.isArray(businessUnitIds) || businessUnitIds.length === 0) {
    return [];
  }

  return services.filter((service) => isServiceApplicableToBusinessUnits(service, businessUnitIds));
}
