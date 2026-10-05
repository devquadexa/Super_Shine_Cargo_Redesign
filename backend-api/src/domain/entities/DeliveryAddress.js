/**
 * DeliveryAddress Domain Entity
 * Represents a customer delivery location / warehouse
 */
class DeliveryAddress {
  constructor({
    deliveryAddressId,
    customerId,
    label,
    addressNumber,
    addressStreet1,
    addressStreet2,
    addressDistrict,
    addressCity,
    addressCountry = 'Sri Lanka',
    isSameAsResidential = false
  }) {
    this.deliveryAddressId = deliveryAddressId;
    this.customerId = customerId;
    this.label = label || 'Delivery Address';
    this.addressNumber = addressNumber;
    this.addressStreet1 = addressStreet1;
    this.addressStreet2 = addressStreet2;
    this.addressDistrict = addressDistrict;
    this.addressCity = addressCity;
    this.addressCountry = addressCountry || 'Sri Lanka';
    this.isSameAsResidential = Boolean(isSameAsResidential);
  }

  validate() {
    const errors = [];
    if (!this.isSameAsResidential) {
      if (!this.addressNumber || this.addressNumber.trim().length === 0) {
        errors.push('Address number is required');
      }
      if (!this.addressStreet1 || this.addressStreet1.trim().length === 0) {
        errors.push('Street name 1 is required');
      }
      if (!this.addressDistrict || this.addressDistrict.trim().length === 0) {
        errors.push('District is required');
      }
      if (!this.addressCity || this.addressCity.trim().length === 0) {
        errors.push('City is required');
      }
    }
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = DeliveryAddress;
