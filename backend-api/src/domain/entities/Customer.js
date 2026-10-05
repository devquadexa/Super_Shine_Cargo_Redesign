/**
 * Customer Domain Entity
 * Represents the core business concept of a Customer
 * Independent of database or framework
 */
class Customer {
  constructor({
    customerId,
    name,
    mainPhone,
    email,
    // Residential Address (Standard Sri Lankan Format)
    addressNumber,
    addressStreet1,
    addressStreet2,
    addressDistrict, // District (left side)
    addressCity, // City (right side)
    addressCountry = 'Sri Lanka', // Country with default
    // Office Address (Same structure - kept for backward compatibility)
    officeAddressNumber,
    officeAddressStreet1,
    officeAddressStreet2,
    officeAddressDistrict, // District (left side)
    officeAddressCity, // City (right side)
    officeAddressCountry = 'Sri Lanka', // Country with default
    isOfficeAddressSame = false,
    deliveryAddresses = [], // Array of delivery address objects
    website,
    registrationDate = new Date(),
    creditPeriodDays = 30,
    isActive = true,
    contactPersons = [], // Array of contact person objects
    categories = [] // Array of category IDs
  }) {
    this.customerId = customerId;
    this.name = name;
    this.mainPhone = mainPhone;
    this.email = email;
    // Residential Address
    this.addressNumber = addressNumber;
    this.addressStreet1 = addressStreet1;
    this.addressStreet2 = addressStreet2;
    this.addressDistrict = addressDistrict; // District (left side)
    this.addressCity = addressCity; // City (right side)
    this.addressCountry = addressCountry; // Country
    
    // Delivery Addresses (Multiple delivery locations)
    if (deliveryAddresses && deliveryAddresses.length > 0) {
      this.deliveryAddresses = deliveryAddresses;
      const primaryDA = deliveryAddresses[0];
      this.officeAddressNumber = officeAddressNumber || primaryDA.addressNumber || addressNumber;
      this.officeAddressStreet1 = officeAddressStreet1 || primaryDA.addressStreet1 || addressStreet1;
      this.officeAddressStreet2 = officeAddressStreet2 || primaryDA.addressStreet2 || addressStreet2;
      this.officeAddressDistrict = officeAddressDistrict || primaryDA.addressDistrict || addressDistrict;
      this.officeAddressCity = officeAddressCity || primaryDA.addressCity || addressCity;
      this.officeAddressCountry = officeAddressCountry || primaryDA.addressCountry || addressCountry || 'Sri Lanka';
      this.isOfficeAddressSame = isOfficeAddressSame !== undefined ? isOfficeAddressSame : Boolean(primaryDA.isSameAsResidential);
    } else {
      this.officeAddressNumber = officeAddressNumber;
      this.officeAddressStreet1 = officeAddressStreet1;
      this.officeAddressStreet2 = officeAddressStreet2;
      this.officeAddressDistrict = officeAddressDistrict;
      this.officeAddressCity = officeAddressCity;
      this.officeAddressCountry = officeAddressCountry;
      this.isOfficeAddressSame = isOfficeAddressSame;
      this.deliveryAddresses = officeAddressStreet1 ? [{
        deliveryAddressId: 1,
        label: 'Primary Delivery Address',
        addressNumber: officeAddressNumber,
        addressStreet1: officeAddressStreet1,
        addressStreet2: officeAddressStreet2,
        addressDistrict: officeAddressDistrict,
        addressCity: officeAddressCity,
        addressCountry: officeAddressCountry || 'Sri Lanka',
        isSameAsResidential: Boolean(isOfficeAddressSame)
      }] : [];
    }

    this.website = website;
    this.registrationDate = registrationDate;
    this.creditPeriodDays = (creditPeriodDays !== undefined && creditPeriodDays !== null && creditPeriodDays !== '')
      ? (parseInt(creditPeriodDays, 10) || 30)
      : 30;
    this.isActive = isActive;
    this.contactPersons = contactPersons;
    this.categories = categories;
  }

  // Business logic methods
  validate() {
    const errors = [];
    
    if (!this.name || this.name.trim().length === 0) {
      errors.push('Customer/Company name is required');
    }
    
    if (!this.mainPhone || this.mainPhone.trim().length === 0) {
      errors.push('Main phone number is required');
    }
    
    if (!this.email || !this.isValidEmail(this.email)) {
      errors.push('Valid email is required');
    }

    // Residential address validation
    if (!this.addressNumber || this.addressNumber.trim().length === 0) {
      errors.push('Address number is required');
    }
    
    if (!this.addressStreet1 || this.addressStreet1.trim().length === 0) {
      errors.push('Street name is required');
    }
    
    if (!this.addressDistrict || this.addressDistrict.trim().length === 0) {
      errors.push('District is required');
    }
    
    if (!this.addressCity || this.addressCity.trim().length === 0) {
      errors.push('City is required');
    }

    if (!this.addressCountry || this.addressCountry.trim().length === 0) {
      errors.push('Country is required');
    }

    // Delivery addresses validation
    if (this.deliveryAddresses && this.deliveryAddresses.length > 0) {
      this.deliveryAddresses.forEach((da, idx) => {
        if (!da.isSameAsResidential) {
          if (!da.addressNumber || !da.addressNumber.trim()) {
            errors.push(`Delivery Address ${idx + 1}: Address number is required`);
          }
          if (!da.addressStreet1 || !da.addressStreet1.trim()) {
            errors.push(`Delivery Address ${idx + 1}: Street name 1 is required`);
          }
          if (!da.addressDistrict || !da.addressDistrict.trim()) {
            errors.push(`Delivery Address ${idx + 1}: District is required`);
          }
          if (!da.addressCity || !da.addressCity.trim()) {
            errors.push(`Delivery Address ${idx + 1}: City is required`);
          }
        }
      });
    } else if (!this.isOfficeAddressSame && this.officeAddressStreet1) {
      if (!this.officeAddressNumber || this.officeAddressNumber.trim().length === 0) {
        errors.push('Delivery address number is required');
      }
      if (!this.officeAddressStreet1 || this.officeAddressStreet1.trim().length === 0) {
        errors.push('Delivery street name is required');
      }
      if (!this.officeAddressDistrict || this.officeAddressDistrict.trim().length === 0) {
        errors.push('Delivery district is required');
      }
      if (!this.officeAddressCity || this.officeAddressCity.trim().length === 0) {
        errors.push('Delivery city is required');
      }
    }

    // Validate contact persons (max 3)
    if (this.contactPersons && this.contactPersons.length > 3) {
      errors.push('Maximum 3 contact persons allowed');
    }

    // Validate each contact person
    if (this.contactPersons && this.contactPersons.length > 0) {
      this.contactPersons.forEach((cp, index) => {
        if (!cp.name || cp.name.trim().length === 0) {
          errors.push(`Contact person ${index + 1}: Name is required`);
        }
        if (!cp.phone || cp.phone.trim().length === 0) {
          errors.push(`Contact person ${index + 1}: Phone is required`);
        }
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Get formatted residential address string
  getFormattedResidentialAddress() {
    let address = '';
    if (this.addressNumber) address += this.addressNumber;
    if (this.addressStreet1) address += (address ? ', ' : '') + this.addressStreet1;
    if (this.addressStreet2) address += (address ? ', ' : '') + this.addressStreet2;
    if (this.addressDistrict) address += (address ? ', ' : '') + this.addressDistrict;
    if (this.addressCity) address += (address ? ', ' : '') + this.addressCity;
    if (this.addressCountry) address += (address ? ', ' : '') + this.addressCountry;
    return address;
  }

  // Get formatted office address string
  getFormattedOfficeAddress() {
    if (this.isOfficeAddressSame) {
      return this.getFormattedResidentialAddress();
    }
    
    let address = '';
    if (this.officeAddressNumber) address += this.officeAddressNumber;
    if (this.officeAddressStreet1) address += (address ? ', ' : '') + this.officeAddressStreet1;
    if (this.officeAddressStreet2) address += (address ? ', ' : '') + this.officeAddressStreet2;
    if (this.officeAddressDistrict) address += (address ? ', ' : '') + this.officeAddressDistrict;
    if (this.officeAddressCity) address += (address ? ', ' : '') + this.officeAddressCity;
    if (this.officeAddressCountry) address += (address ? ', ' : '') + this.officeAddressCountry;
    return address;
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  deactivate() {
    this.isActive = false;
  }

  activate() {
    this.isActive = true;
  }

  updateContactInfo(mainPhone, email) {
    if (mainPhone) this.mainPhone = mainPhone;
    if (email && this.isValidEmail(email)) this.email = email;
  }
}

module.exports = Customer;
