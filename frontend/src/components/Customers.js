import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { customerService } from '../api/services/customerService';
import { jobService } from '../api/services/jobService';
import Pagination from './Pagination';

function Customers() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [cities, setCities] = useState([]);
  const [filteredCities, setFilteredCities] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [viewCustomerModal, setViewCustomerModal] = useState(null); // Customer object being viewed
  const [formData, setFormData] = useState({
    name: '',
    mainPhone: '',
    email: '',
    addressNumber: '',
    addressStreet1: '',
    addressStreet2: '',
    addressDistrict: '',
    addressCity: '',
    addressCountry: 'Sri Lanka',
    deliveryAddresses: [
      {
        label: 'Main Delivery Address',
        addressNumber: '',
        addressStreet1: '',
        addressStreet2: '',
        addressDistrict: '',
        addressCity: '',
        addressCountry: 'Sri Lanka',
        isSameAsResidential: false
      }
    ],
    website: '',
    registrationDate: new Date().toISOString().split('T')[0],
    creditPeriodDays: 30,
    contactPersons: [{ name: '', phone: '', email: '', designation: '' }],
    categories: [],
    isActive: true
  });
  const [formErrors, setFormErrors] = useState({});
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(20);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdminOrSuperAdmin = () => {
    return user && (user.role === 'Admin' || user.role === 'Super Admin' || user.role === 'Manager' || user.role === 'Office Executive');
  };

  useEffect(() => {
    fetchCustomers();
    fetchCategories();
    fetchDistricts();
    fetchAllCities();
  }, []);

  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showModal]);

  const getAPIBase = () => process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${getAPIBase()}/api/customers/categories/all`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchDistricts = async () => {
    try {
      const response = await fetch(`${getAPIBase()}/api/locations/districts`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setDistricts(data);
    } catch (error) {
      console.error('Error fetching districts:', error);
    }
  };


  const fetchAllCities = async () => {
    try {
      const response = await fetch(`${getAPIBase()}/api/locations/cities`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setCities(data);
    } catch (error) {
      console.error('Error fetching all cities:', error);
      setCities([]);
    }
  };

  const fetchCustomers = async () => {
    try {
      const data = await customerService.getAll();
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      if (error.response?.status === 403) {
        setMessage('Access denied. Please contact administrator.');
      } else {
        setMessage('Error loading customers. Please refresh the page.');
      }
      setTimeout(() => setMessage(''), 5000);
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    } else if (!/^[a-zA-Z\s-]+$/.test(formData.name)) {
      errors.name = 'Name can only contain letters, spaces, and hyphens (-)';
    }
    
    if (!formData.mainPhone.trim()) {
      errors.mainPhone = 'Main phone number is required';
    } else if (!/^\d{10}$/.test(formData.mainPhone.replace(/\s/g, ''))) {
      errors.mainPhone = 'Phone number must be exactly 10 digits';
    }
    
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    const creditPeriodValue = String(formData.creditPeriodDays ?? '').trim();
    if (!creditPeriodValue) {
      errors.creditPeriodDays = 'Credit period is required';
    } else if (!/^\d+$/.test(creditPeriodValue)) {
      errors.creditPeriodDays = 'Credit period must contain numbers only';
    } else {
      const creditPeriodDays = parseInt(creditPeriodValue, 10);
      if (Number.isNaN(creditPeriodDays) || creditPeriodDays < 1 || creditPeriodDays > 365) {
        errors.creditPeriodDays = 'Credit period must be between 1 and 365 days';
      }
    }
    
    if (!formData.addressNumber.trim()) {
      errors.addressNumber = 'Address number is required';
    }
    
    if (!formData.addressStreet1.trim()) {
      errors.addressStreet1 = 'Street name is required';
    }
    
    if (!formData.addressDistrict.trim()) {
      errors.addressDistrict = 'District is required';
    }
    
    if (!formData.addressCity.trim()) {
      errors.addressCity = 'City is required';
    }

    if (!formData.addressCountry.trim()) {
      errors.addressCountry = 'Country is required';
    }

    if (formData.deliveryAddresses && formData.deliveryAddresses.length > 0) {
      formData.deliveryAddresses.forEach((da, index) => {
        if (!da.isSameAsResidential) {
          if (!da.addressNumber || !da.addressNumber.trim()) {
            errors[`deliveryAddress_${index}_addressNumber`] = 'Address number is required';
          }
          if (!da.addressStreet1 || !da.addressStreet1.trim()) {
            errors[`deliveryAddress_${index}_addressStreet1`] = 'Street name is required';
          }
          if (!da.addressDistrict || !da.addressDistrict.trim()) {
            errors[`deliveryAddress_${index}_addressDistrict`] = 'District is required';
          }
          if (!da.addressCity || !da.addressCity.trim()) {
            errors[`deliveryAddress_${index}_addressCity`] = 'City is required';
          }
          if (!da.addressCountry || !da.addressCountry.trim()) {
            errors[`deliveryAddress_${index}_addressCountry`] = 'Country is required';
          }
        }
      });
    }
    
    const validContactPersons = formData.contactPersons.filter(
      cp => cp.name.trim() !== '' || cp.phone.trim() !== ''
    );
    
    if (validContactPersons.length === 0) {
      errors.contactPersons = 'At least one contact person is required';
    } else {
      formData.contactPersons.forEach((cp, index) => {
        if (cp.name.trim() !== '' || cp.phone.trim() !== '' || cp.email.trim() !== '' || cp.designation.trim() !== '') {
          if (!cp.name.trim()) {
            errors[`contactPerson${index}Name`] = 'Contact person name is required';
          } else if (!/^[a-zA-Z\s-]+$/.test(cp.name)) {
            errors[`contactPerson${index}Name`] = 'Name can only contain letters, spaces, and hyphens (-)';
          }
          
          if (!cp.phone.trim()) {
            errors[`contactPerson${index}Phone`] = 'Contact person phone is required';
          } else if (!/^\d{10}$/.test(cp.phone.replace(/\s/g, ''))) {
            errors[`contactPerson${index}Phone`] = 'Phone number must be exactly 10 digits';
          }
          
          if (cp.email.trim() !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cp.email)) {
            errors[`contactPerson${index}Email`] = 'Please enter a valid email address';
          }
        }
      });
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setMessage('Please fix the errors in the form');
      setTimeout(() => setMessage(''), 5000);
      return;
    }
    
    try {
      setIsSubmitting(true);
      const filteredContactPersons = formData.contactPersons.filter(
        cp => cp.name.trim() !== '' && cp.phone.trim() !== ''
      );
      
      const validDeliveryAddresses = (formData.deliveryAddresses || []).map((da, idx) => ({
        deliveryAddressId: idx + 1,
        label: da.label || `Delivery Address ${idx + 1}`,
        addressNumber: da.isSameAsResidential ? formData.addressNumber : da.addressNumber,
        addressStreet1: da.isSameAsResidential ? formData.addressStreet1 : da.addressStreet1,
        addressStreet2: da.isSameAsResidential ? formData.addressStreet2 : da.addressStreet2,
        addressDistrict: da.isSameAsResidential ? formData.addressDistrict : da.addressDistrict,
        addressCity: da.isSameAsResidential ? formData.addressCity : da.addressCity,
        addressCountry: da.isSameAsResidential ? formData.addressCountry : (da.addressCountry || 'Sri Lanka'),
        isSameAsResidential: Boolean(da.isSameAsResidential)
      }));

      const submitData = {
        ...formData,
        creditPeriodDays: parseInt(formData.creditPeriodDays, 10) || 30,
        contactPersons: filteredContactPersons,
        deliveryAddresses: validDeliveryAddresses,
        officeAddressNumber: validDeliveryAddresses[0]?.addressNumber || formData.addressNumber,
        officeAddressStreet1: validDeliveryAddresses[0]?.addressStreet1 || formData.addressStreet1,
        officeAddressStreet2: validDeliveryAddresses[0]?.addressStreet2 || formData.addressStreet2,
        officeAddressDistrict: validDeliveryAddresses[0]?.addressDistrict || formData.addressDistrict,
        officeAddressCity: validDeliveryAddresses[0]?.addressCity || formData.addressCity,
        officeAddressCountry: validDeliveryAddresses[0]?.addressCountry || formData.addressCountry,
        isOfficeAddressSame: Boolean(validDeliveryAddresses[0]?.isSameAsResidential)
      };
      
      if (editingCustomer) {
        const updated = await customerService.update(editingCustomer.customerId, submitData);
        setMessage('Customer updated successfully!');
        setCustomers(prev => prev.map(c => c.customerId === editingCustomer.customerId ? { ...c, ...submitData, ...(updated || {}) } : c));
      } else {
        const created = await customerService.create(submitData);
        setMessage('Customer registered successfully!');
        if (created) {
          setCustomers(prev => [created, ...prev]);
        }
      }
      
      resetForm();
      setShowModal(false);
      setEditingCustomer(null);
      fetchCustomers();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error saving customer:', error);
      const errorMessage = error.response?.data?.message || 'Error saving customer';
      setMessage(errorMessage);
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({ 
      name: '', 
      mainPhone: '', 
      email: '', 
      addressNumber: '',
      addressStreet1: '',
      addressStreet2: '',
      addressDistrict: '',
      addressCity: '',
      addressCountry: 'Sri Lanka',
      deliveryAddresses: [
        {
          label: 'Main Delivery Address',
          addressNumber: '',
          addressStreet1: '',
          addressStreet2: '',
          addressDistrict: '',
          addressCity: '',
          addressCountry: 'Sri Lanka',
          isSameAsResidential: false
        }
      ],
      website: '',
      contactPersons: [{ name: '', phone: '' }],
      categories: [],
      isActive: true
    });
    setFormErrors({});
    setEditingCustomer(null);
    setFilteredCities([]);
  };

  const handleEdit = (customer) => {
    if (!isAdminOrSuperAdmin()) {
      setMessage('Only Admin, Super Admin, Manager, or Office Executive can edit customers');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    
    setEditingCustomer(customer);
    const existingDAs = (customer.deliveryAddresses && customer.deliveryAddresses.length > 0)
      ? customer.deliveryAddresses.map(da => ({
          label: da.label || 'Delivery Address',
          addressNumber: da.addressNumber || '',
          addressStreet1: da.addressStreet1 || '',
          addressStreet2: da.addressStreet2 || '',
          addressDistrict: da.addressDistrict || '',
          addressCity: da.addressCity || '',
          addressCountry: da.addressCountry || 'Sri Lanka',
          isSameAsResidential: Boolean(da.isSameAsResidential)
        }))
      : (customer.officeAddressStreet1 || customer.addressStreet1)
        ? [{
            label: 'Primary Delivery Address',
            addressNumber: customer.officeAddressNumber || customer.addressNumber || '',
            addressStreet1: customer.officeAddressStreet1 || customer.addressStreet1 || '',
            addressStreet2: customer.officeAddressStreet2 || customer.addressStreet2 || '',
            addressDistrict: customer.officeAddressDistrict || customer.addressDistrict || '',
            addressCity: customer.officeAddressCity || customer.addressCity || '',
            addressCountry: customer.officeAddressCountry || customer.addressCountry || 'Sri Lanka',
            isSameAsResidential: Boolean(customer.isOfficeAddressSame)
          }]
        : [{
            label: 'Main Delivery Address',
            addressNumber: '',
            addressStreet1: '',
            addressStreet2: '',
            addressDistrict: '',
            addressCity: '',
            addressCountry: 'Sri Lanka',
            isSameAsResidential: false
          }];

    setFormData({
      name: customer.name || '',
      mainPhone: customer.mainPhone || '',
      email: customer.email || '',
      addressNumber: customer.addressNumber || '',
      addressStreet1: customer.addressStreet1 || '',
      addressStreet2: customer.addressStreet2 || '',
      addressDistrict: customer.addressDistrict || '',
      addressCity: customer.addressCity || '',
      addressCountry: customer.addressCountry || 'Sri Lanka',
      deliveryAddresses: existingDAs,
      website: customer.website || '',
      registrationDate: customer.registrationDate ? new Date(customer.registrationDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      creditPeriodDays: customer.creditPeriodDays || 30,
      contactPersons: customer.contactPersons && customer.contactPersons.length > 0 
        ? customer.contactPersons.map(cp => ({ 
            name: cp.name, 
            phone: cp.phone,
            email: cp.email || '',
            designation: cp.designation || ''
          }))
        : [{ name: '', phone: '', email: '', designation: '' }],
      categories: customer.categories ? customer.categories.map(cat => cat.categoryId) : [],
      isActive: customer.isActive !== undefined ? customer.isActive : true
    });
    
    if (customer.addressDistrict) {
      const selectedDistrict = districts.find(d => d.districtName === customer.addressDistrict);
      if (selectedDistrict) {
        setFilteredCities(cities.filter(c => c.districtId === selectedDistrict.districtId));
      }
    }
    
    setShowModal(true);
  };

  const handleDeactivate = async (customerId) => {
    if (!isAdminOrSuperAdmin()) {
      setMessage('Only Admin, Super Admin, Manager, or Office Executive can deactivate customers');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    if (!window.confirm('Are you sure you want to deactivate this customer?')) {
      return;
    }

    try {
      setCustomers(prev => prev.map(c => c.customerId === customerId ? { ...c, isActive: false } : c));
      setMessage('Customer deactivated successfully');
      setTimeout(() => setMessage(''), 3000);

      await customerService.delete(customerId);
      fetchCustomers();
    } catch (error) {
      console.error('Error deactivating customer:', error);
      setMessage('Failed to deactivate customer');
      fetchCustomers();
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const getCitiesForDistrict = (districtName) => {
    if (!districtName) return [];
    const d = districts.find(dist => dist.districtName === districtName);
    if (!d) return [];
    return cities.filter(c => c.districtId === d.districtId);
  };

  const addDeliveryAddress = () => {
    setFormData(prev => ({
      ...prev,
      deliveryAddresses: [
        ...prev.deliveryAddresses,
        {
          label: `Delivery Location ${prev.deliveryAddresses.length + 1}`,
          addressNumber: '',
          addressStreet1: '',
          addressStreet2: '',
          addressDistrict: '',
          addressCity: '',
          addressCountry: 'Sri Lanka',
          isSameAsResidential: false
        }
      ]
    }));
  };

  const removeDeliveryAddress = (index) => {
    setFormData(prev => ({
      ...prev,
      deliveryAddresses: prev.deliveryAddresses.filter((_, i) => i !== index)
    }));
  };

  const handleDeliveryAddressChange = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.deliveryAddresses];
      if (field === 'isSameAsResidential') {
        const isSame = Boolean(value);
        updated[index] = {
          ...updated[index],
          isSameAsResidential: isSame,
          addressNumber: isSame ? prev.addressNumber : updated[index].addressNumber,
          addressStreet1: isSame ? prev.addressStreet1 : updated[index].addressStreet1,
          addressStreet2: isSame ? prev.addressStreet2 : updated[index].addressStreet2,
          addressDistrict: isSame ? prev.addressDistrict : updated[index].addressDistrict,
          addressCity: isSame ? prev.addressCity : updated[index].addressCity,
          addressCountry: isSame ? prev.addressCountry : (updated[index].addressCountry || 'Sri Lanka')
        };
      } else {
        updated[index] = {
          ...updated[index],
          [field]: value
        };
        if (field === 'addressDistrict') {
          updated[index].addressCity = '';
        }
      }
      return {
        ...prev,
        deliveryAddresses: updated
      };
    });

    if (formErrors[`deliveryAddress_${index}_${field}`]) {
      setFormErrors(prev => {
        const errs = { ...prev };
        delete errs[`deliveryAddress_${index}_${field}`];
        return errs;
      });
    }
  };

  const handleDistrictChange = (districtName) => {
    const selectedDistrict = districts.find(d => d.districtName === districtName);
    
    if (selectedDistrict) {
      const districtCities = cities.filter(c => c.districtId === selectedDistrict.districtId);
      setFilteredCities(districtCities);
      setFormData(prev => ({ 
        ...prev, 
        addressDistrict: districtName,
        addressCity: ''
      }));
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === 'creditPeriodDays') {
      const digitsOnly = value.replace(/\D/g, '');
      const normalizedValue = digitsOnly === '' ? '' : String(Math.min(parseInt(digitsOnly, 10), 365));
      setFormData({ ...formData, creditPeriodDays: normalizedValue });
      if (formErrors.creditPeriodDays) {
        setFormErrors({ ...formErrors, creditPeriodDays: '' });
      }
      return;
    }
    
    if (type === 'checkbox') {
      setFormData({ ...formData, [name]: checked });
    } else {
      const updatedFormData = { ...formData, [name]: value };
      
      if (name === 'addressDistrict') {
        handleDistrictChange(value);
      }

      // Auto-sync changes to any delivery address marked as same as residential
      if (['addressNumber', 'addressStreet1', 'addressStreet2', 'addressDistrict', 'addressCity', 'addressCountry'].includes(name)) {
        updatedFormData.deliveryAddresses = (formData.deliveryAddresses || []).map(da => {
          if (!da.isSameAsResidential) return da;
          return {
            ...da,
            [name]: value
          };
        });
      }
      
      setFormData(updatedFormData);
    }
    
    if (formErrors[name]) {
      setFormErrors({ ...formErrors, [name]: '' });
    }
  };

  const validateNameInput = (e) => {
    const value = e.target.value;
    if (value === '' || /^[a-zA-Z\s-]*$/.test(value)) {
      return true;
    }
    e.preventDefault();
    return false;
  };

  const validatePhoneInput = (e) => {
    const value = e.target.value;
    if (value === '' || (/^\d*$/.test(value) && value.length <= 10)) {
      return true;
    }
    e.preventDefault();
    return false;
  };

  const handleContactPersonChange = (index, field, value) => {
    const updatedContactPersons = [...formData.contactPersons];
    updatedContactPersons[index][field] = value;
    setFormData({ ...formData, contactPersons: updatedContactPersons });
    
    const errorKey = `contactPerson${index}${field.charAt(0).toUpperCase() + field.slice(1)}`;
    if (formErrors[errorKey]) {
      setFormErrors({ ...formErrors, [errorKey]: '', contactPersons: '' });
    }
  };

  const addContactPerson = () => {
    if (formData.contactPersons.length < 3) {
      setFormData({
        ...formData,
        contactPersons: [...formData.contactPersons, { name: '', phone: '', email: '', designation: '' }]
      });
    }
  };

  const removeContactPerson = (index) => {
    if (formData.contactPersons.length > 1) {
      const updatedContactPersons = formData.contactPersons.filter((_, i) => i !== index);
      setFormData({ ...formData, contactPersons: updatedContactPersons });
      const newErrors = { ...formErrors };
      delete newErrors[`contactPerson${index}Name`];
      delete newErrors[`contactPerson${index}Phone`];
      setFormErrors(newErrors);
    }
  };

  const handleCategoryChange = (categoryId) => {
    const updatedCategories = formData.categories.includes(categoryId)
      ? formData.categories.filter(id => id !== categoryId)
      : [...formData.categories, categoryId];
    setFormData({ ...formData, categories: updatedCategories });
  };

  const filteredCustomers = customers.filter(customer =>
    (customer.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (customer.customerId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (customer.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredCustomers.length / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const paginatedCustomers = filteredCustomers.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRecordsPerPageChange = (newRecordsPerPage) => {
    setRecordsPerPage(newRecordsPerPage);
    setCurrentPage(1);
  };

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {user?.role === 'Waff Clerk' ? 'Assigned Customers' : 'Customer Management'}
          </h1>
          <p className="text-gray-600 mt-1">
            {user?.role === 'Waff Clerk' ? 'View customers associated with your assigned jobs' : 'Manage customer information and registrations'}
          </p>
        </div>
        {isAdminOrSuperAdmin() && (
          <button 
            onClick={() => setShowModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
          >
            + New Customer
          </button>
        )}
      </div>

      {message && (message.toLowerCase().includes('error') || message.toLowerCase().includes('failed') || message.toLowerCase().includes('denied') || message.toLowerCase().includes('fix')) && (
        <div className="mb-6 p-4 rounded-lg border-l-4 bg-red-50 border-red-500 text-red-700 flex items-center justify-between shadow-sm animate-fade-in">
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="text-red-500 hover:text-red-700 font-bold ml-4 text-sm">✕</button>
        </div>
      )}

      <div className="bg-white rounded-xl border-2 border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {user?.role === 'Waff Clerk' ? 'Assigned Customers' : 'All Customers'} ({filteredCustomers.length})
          </h2>
          <div className="relative">
            <svg className="absolute left-3 top-3 text-gray-400" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input
              type="text"
              placeholder="Search by name, ID, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
        </div>

        {filteredCustomers.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="mx-auto mb-4 text-gray-400" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <p className="text-gray-600">{searchTerm ? 'No customers found matching your search' : 'No customers registered yet'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Customer ID</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Phone</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Registered</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedCustomers.map(customer => (
                  <React.Fragment key={customer.customerId}>
                    <tr className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm font-semibold text-blue-600">{customer.customerId}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{customer.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{customer.mainPhone}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{customer.email}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{new Date(customer.registrationDate).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          {isAdminOrSuperAdmin() && (
                            <button
                              onClick={() => handleEdit(customer)}
                              title="Edit Customer"
                              className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={() => setViewCustomerModal(customer)}
                            title="View Details"
                            className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 transition"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                              <circle cx="12" cy="12" r="3"/>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filteredCustomers.length > 0 && (
          <Pagination currentPage={currentPage} totalPages={totalPages} totalRecords={filteredCustomers.length} recordsPerPage={recordsPerPage} onPageChange={handlePageChange} onRecordsPerPageChange={handleRecordsPerPageChange} />
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-4xl w-full my-8">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-2xl font-bold text-gray-900">{editingCustomer ? 'Edit Customer' : 'Register New Customer'}</h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="text-gray-500 hover:text-gray-700 text-2xl font-bold">×</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-96 overflow-y-auto">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Customer / Company Name <span className="text-red-600">*</span></label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} onKeyPress={validateNameInput} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${formErrors.name ? 'border-red-500' : 'border-gray-300'}`} placeholder="Enter name" required />
                    {formErrors.name && <p className="text-red-600 text-xs mt-1">{formErrors.name}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Main Phone <span className="text-red-600">*</span></label>
                    <input type="tel" name="mainPhone" value={formData.mainPhone} onChange={handleChange} onKeyPress={validatePhoneInput} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${formErrors.mainPhone ? 'border-red-500' : 'border-gray-300'}`} maxLength="10" required />
                    {formErrors.mainPhone && <p className="text-red-600 text-xs mt-1">{formErrors.mainPhone}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-600">*</span></label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${formErrors.email ? 'border-red-500' : 'border-gray-300'}`} required />
                    {formErrors.email && <p className="text-red-600 text-xs mt-1">{formErrors.email}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Registration Date <span className="text-red-600">*</span></label>
                    <input type="date" name="registrationDate" value={formData.registrationDate} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Credit Period (Days) <span className="text-red-600">*</span></label>
                    <input type="text" name="creditPeriodDays" value={formData.creditPeriodDays} onChange={handleChange} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${formErrors.creditPeriodDays ? 'border-red-500' : 'border-gray-300'}`} required />
                    {formErrors.creditPeriodDays && <p className="text-red-600 text-xs mt-1">{formErrors.creditPeriodDays}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                    <input type="url" name="website" value={formData.website} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Residential Address</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address Number <span className="text-red-600">*</span></label>
                    <input type="text" name="addressNumber" value={formData.addressNumber} onChange={handleChange} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${formErrors.addressNumber ? 'border-red-500' : 'border-gray-300'}`} required />
                    {formErrors.addressNumber && <p className="text-red-600 text-xs mt-1">{formErrors.addressNumber}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Street Name 1 <span className="text-red-600">*</span></label>
                    <input type="text" name="addressStreet1" value={formData.addressStreet1} onChange={handleChange} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${formErrors.addressStreet1 ? 'border-red-500' : 'border-gray-300'}`} required />
                    {formErrors.addressStreet1 && <p className="text-red-600 text-xs mt-1">{formErrors.addressStreet1}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Street Name 2 (Optional)</label>
                    <input type="text" name="addressStreet2" value={formData.addressStreet2} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">District <span className="text-red-600">*</span></label>
                    <select name="addressDistrict" value={formData.addressDistrict} onChange={handleChange} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${formErrors.addressDistrict ? 'border-red-500' : 'border-gray-300'}`} required>
                      <option value="">Select District</option>
                      {districts.map(district => (<option key={district.districtId} value={district.districtName}>{district.districtName}</option>))}
                    </select>
                    {formErrors.addressDistrict && <p className="text-red-600 text-xs mt-1">{formErrors.addressDistrict}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City/Town <span className="text-red-600">*</span></label>
                    <select name="addressCity" value={formData.addressCity} onChange={handleChange} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${formErrors.addressCity ? 'border-red-500' : 'border-gray-300'}`} disabled={!formData.addressDistrict} required>
                      <option value="">Select City</option>
                      {filteredCities.map(city => (<option key={city.cityId} value={city.cityName}>{city.cityName}</option>))}
                    </select>
                    {formErrors.addressCity && <p className="text-red-600 text-xs mt-1">{formErrors.addressCity}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Country <span className="text-red-600">*</span></label>
                    <input type="text" name="addressCountry" value={formData.addressCountry} onChange={handleChange} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${formErrors.addressCountry ? 'border-red-500' : 'border-gray-300'}`} required />
                    {formErrors.addressCountry && <p className="text-red-600 text-xs mt-1">{formErrors.addressCountry}</p>}
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Delivery Addresses
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">Add one or multiple delivery warehouses, factories, or site addresses</p>
                  </div>
                  <button
                    type="button"
                    onClick={addDeliveryAddress}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium text-xs rounded-lg transition flex items-center gap-1.5 shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Add Delivery Address
                  </button>
                </div>

                <div className="space-y-4">
                  {formData.deliveryAddresses.map((da, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-xl bg-gray-50/60 shadow-sm relative">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 flex-1 max-w-md">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold shrink-0">
                            {index + 1}
                          </span>
                          <input
                            type="text"
                            placeholder="Location Name (e.g. Main Warehouse, Kelaniya Plant)"
                            value={da.label || ''}
                            onChange={(e) => handleDeliveryAddressChange(index, 'label', e.target.value)}
                            className="text-sm font-semibold text-gray-800 bg-white border border-gray-300 rounded px-2.5 py-1 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none w-full"
                          />
                        </div>
                        {formData.deliveryAddresses.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeDeliveryAddress(index)}
                            className="text-red-500 hover:text-red-700 text-xs font-semibold flex items-center gap-1 transition px-2.5 py-1 rounded-lg hover:bg-red-50"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Remove
                          </button>
                        )}
                      </div>

                      <label className="flex items-center mb-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={da.isSameAsResidential}
                          onChange={(e) => handleDeliveryAddressChange(index, 'isSameAsResidential', e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm font-medium text-gray-700">Delivery address is same as residential address</span>
                      </label>

                      {!da.isSameAsResidential ? (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Address Number <span className="text-red-600">*</span></label>
                              <input
                                type="text"
                                value={da.addressNumber}
                                onChange={(e) => handleDeliveryAddressChange(index, 'addressNumber', e.target.value)}
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white ${formErrors[`deliveryAddress_${index}_addressNumber`] ? 'border-red-500' : 'border-gray-300'}`}
                                placeholder="e.g. 12/A"
                                required
                              />
                              {formErrors[`deliveryAddress_${index}_addressNumber`] && <p className="text-red-600 text-xs mt-1">{formErrors[`deliveryAddress_${index}_addressNumber`]}</p>}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Street Name 1 <span className="text-red-600">*</span></label>
                              <input
                                type="text"
                                value={da.addressStreet1}
                                onChange={(e) => handleDeliveryAddressChange(index, 'addressStreet1', e.target.value)}
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white ${formErrors[`deliveryAddress_${index}_addressStreet1`] ? 'border-red-500' : 'border-gray-300'}`}
                                placeholder="e.g. Harbor Road"
                                required
                              />
                              {formErrors[`deliveryAddress_${index}_addressStreet1`] && <p className="text-red-600 text-xs mt-1">{formErrors[`deliveryAddress_${index}_addressStreet1`]}</p>}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Street Name 2 (Optional)</label>
                              <input
                                type="text"
                                value={da.addressStreet2}
                                onChange={(e) => handleDeliveryAddressChange(index, 'addressStreet2', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                                placeholder="e.g. Industrial Zone"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">District <span className="text-red-600">*</span></label>
                              <select
                                value={da.addressDistrict}
                                onChange={(e) => handleDeliveryAddressChange(index, 'addressDistrict', e.target.value)}
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white ${formErrors[`deliveryAddress_${index}_addressDistrict`] ? 'border-red-500' : 'border-gray-300'}`}
                                required
                              >
                                <option value="">Select District</option>
                                {districts.map(district => (
                                  <option key={district.districtId} value={district.districtName}>{district.districtName}</option>
                                ))}
                              </select>
                              {formErrors[`deliveryAddress_${index}_addressDistrict`] && <p className="text-red-600 text-xs mt-1">{formErrors[`deliveryAddress_${index}_addressDistrict`]}</p>}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">City/Town <span className="text-red-600">*</span></label>
                              <select
                                value={da.addressCity}
                                onChange={(e) => handleDeliveryAddressChange(index, 'addressCity', e.target.value)}
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white ${formErrors[`deliveryAddress_${index}_addressCity`] ? 'border-red-500' : 'border-gray-300'}`}
                                disabled={!da.addressDistrict}
                                required
                              >
                                <option value="">Select City</option>
                                {getCitiesForDistrict(da.addressDistrict).map(city => (
                                  <option key={city.cityId} value={city.cityName}>{city.cityName}</option>
                                ))}
                              </select>
                              {formErrors[`deliveryAddress_${index}_addressCity`] && <p className="text-red-600 text-xs mt-1">{formErrors[`deliveryAddress_${index}_addressCity`]}</p>}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Country <span className="text-red-600">*</span></label>
                              <input
                                type="text"
                                value={da.addressCountry}
                                onChange={(e) => handleDeliveryAddressChange(index, 'addressCountry', e.target.value)}
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white ${formErrors[`deliveryAddress_${index}_addressCountry`] ? 'border-red-500' : 'border-gray-300'}`}
                                required
                              />
                              {formErrors[`deliveryAddress_${index}_addressCountry`] && <p className="text-red-600 text-xs mt-1">{formErrors[`deliveryAddress_${index}_addressCountry`]}</p>}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-lg text-xs text-blue-800 flex items-center gap-2">
                          <svg className="w-4 h-4 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>This location matches residential address: <strong>{formData.addressNumber || '[No.]'} {formData.addressStreet1 || '[Street]'}, {formData.addressCity || '[City]'}, {formData.addressDistrict || '[District]'}</strong></span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Categories</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {categories.map(category => (
                    <label key={category.categoryId} className="flex items-center p-2 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input type="checkbox" checked={formData.categories.includes(category.categoryId)} onChange={() => handleCategoryChange(category.categoryId)} className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500" />
                      <span className="ml-2 text-sm font-medium text-gray-700">{category.categoryName}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Persons <span className="text-red-600">*</span></h3>
                {formErrors.contactPersons && <p className="text-red-600 text-sm mb-4">{formErrors.contactPersons}</p>}
                <div className="space-y-4">
                  {formData.contactPersons.map((cp, index) => (
                    <div key={index} className="p-4 border border-gray-300 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">Contact Person {index + 1}</h4>
                        {formData.contactPersons.length > 1 && <button type="button" onClick={() => removeContactPerson(index)} className="text-red-600 hover:text-red-700 text-sm font-medium">Remove</button>}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-600">*</span></label>
                          <input type="text" placeholder="Full Name" value={cp.name} onChange={(e) => handleContactPersonChange(index, 'name', e.target.value)} onKeyPress={validateNameInput} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${formErrors[`contactPerson${index}Name`] ? 'border-red-500' : 'border-gray-300'}`} />
                          {formErrors[`contactPerson${index}Name`] && <p className="text-red-600 text-xs mt-1">{formErrors[`contactPerson${index}Name`]}</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                          <input type="text" placeholder="Manager, Director" value={cp.designation} onChange={(e) => handleContactPersonChange(index, 'designation', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Phone <span className="text-red-600">*</span></label>
                          <input type="tel" placeholder="0771234567" value={cp.phone} onChange={(e) => handleContactPersonChange(index, 'phone', e.target.value)} onKeyPress={validatePhoneInput} maxLength="10" className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${formErrors[`contactPerson${index}Phone`] ? 'border-red-500' : 'border-gray-300'}`} />
                          {formErrors[`contactPerson${index}Phone`] && <p className="text-red-600 text-xs mt-1">{formErrors[`contactPerson${index}Phone`]}</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                          <input type="email" placeholder="email@example.com" value={cp.email} onChange={(e) => handleContactPersonChange(index, 'email', e.target.value)} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${formErrors[`contactPerson${index}Email`] ? 'border-red-500' : 'border-gray-300'}`} />
                          {formErrors[`contactPerson${index}Email`] && <p className="text-red-600 text-xs mt-1">{formErrors[`contactPerson${index}Email`]}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {formData.contactPersons.length < 3 && <button type="button" onClick={addContactPerson} className="mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition font-medium text-sm">+ Add Contact Person</button>}
              </div>

              {editingCustomer && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Status</h3>
                  <label className="flex items-center">
                    <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500" />
                    <span className="ml-2 text-sm font-medium text-gray-700">Customer is Active</span>
                  </label>
                </div>
              )}
            </form>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button onClick={() => { setShowModal(false); resetForm(); }} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition font-medium">Cancel</button>
              <button 
                onClick={handleSubmit} 
                disabled={isSubmitting}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg transition font-medium flex items-center gap-2"
              >
                {isSubmitting && (
                  <svg className="animate-spin w-4 h-4 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                )}
                {isSubmitting ? (editingCustomer ? 'Updating...' : 'Registering...') : (editingCustomer ? 'Update' : 'Register')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Customer Details Modal */}
      {viewCustomerModal && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] px-[2.5vw] py-4">
          <div className="bg-white rounded-2xl shadow-2xl flex flex-col" style={{ width: '90vw', maxWidth: '1400px', height: '92vh' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-10 py-5 rounded-t-2xl shrink-0" style={{ background: 'linear-gradient(135deg,#1E3F63 0%,#2f5e8f 100%)' }}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Customer Details</h2>
                  <p className="text-blue-200 text-xs mt-0.5">View complete customer information</p>
                </div>
              </div>
              <button onClick={() => setViewCustomerModal(null)} className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 min-h-0 overflow-y-auto px-14 py-5">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* LEFT COLUMN: Basic Information & Categories */}
                <div className="space-y-4">
                  {/* Basic Information */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50">
                      <svg viewBox="0 0 24 24" fill="none" stroke="#1E3F63" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                        <line x1="3" y1="9" x2="21" y2="9"/>
                        <line x1="9" y1="21" x2="9" y2="9"/>
                      </svg>
                      <span className="text-xs font-bold text-[#1E3F63] uppercase tracking-wider">Basic Information</span>
                    </div>
                    <table className="w-full text-sm border-collapse">
                      <tbody>
                        <tr className="border-b border-gray-100 hover:bg-gray-50 transition">
                          <td className="px-4 py-3 text-gray-600 font-medium">Customer ID</td>
                          <td className="px-4 py-3 text-gray-900 font-semibold">{viewCustomerModal.customerId}</td>
                        </tr>
                        <tr className="border-b border-gray-100 hover:bg-gray-50 transition">
                          <td className="px-4 py-3 text-gray-600 font-medium">Name</td>
                          <td className="px-4 py-3 text-gray-900">{viewCustomerModal.name}</td>
                        </tr>
                        <tr className="border-b border-gray-100 hover:bg-gray-50 transition">
                          <td className="px-4 py-3 text-gray-600 font-medium">Main Phone</td>
                          <td className="px-4 py-3 text-gray-900">{viewCustomerModal.mainPhone}</td>
                        </tr>
                        <tr className="border-b border-gray-100 hover:bg-gray-50 transition">
                          <td className="px-4 py-3 text-gray-600 font-medium">Email</td>
                          <td className="px-4 py-3 text-gray-900">{viewCustomerModal.email}</td>
                        </tr>
                        <tr className="border-b border-gray-100 hover:bg-gray-50 transition">
                          <td className="px-4 py-3 text-gray-600 font-medium">Registration Date</td>
                          <td className="px-4 py-3 text-gray-900">{viewCustomerModal.registrationDate ? new Date(viewCustomerModal.registrationDate).toLocaleDateString() : 'N/A'}</td>
                        </tr>
                        <tr className="border-b border-gray-100 hover:bg-gray-50 transition">
                          <td className="px-4 py-3 text-gray-600 font-medium">Credit Period</td>
                          <td className="px-4 py-3 text-gray-900">{viewCustomerModal.creditPeriodDays} days</td>
                        </tr>
                        {viewCustomerModal.website && (
                          <tr className="border-b border-gray-100 hover:bg-gray-50 transition">
                            <td className="px-4 py-3 text-gray-600 font-medium">Website</td>
                            <td className="px-4 py-3 text-blue-600"><a href={viewCustomerModal.website} target="_blank" rel="noopener noreferrer">{viewCustomerModal.website}</a></td>
                          </tr>
                        )}
                        <tr className="hover:bg-gray-50 transition">
                          <td className="px-4 py-3 text-gray-600 font-medium">Status</td>
                          <td className="px-4 py-3">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${viewCustomerModal.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {viewCustomerModal.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Categories within Basic Information */}
                    {viewCustomerModal.categories && viewCustomerModal.categories.length > 0 && (
                      <div className="border-t border-gray-100">
                        <div className="flex items-center gap-2 px-4 py-3 bg-gray-50">
                          <svg viewBox="0 0 24 24" fill="none" stroke="#1E3F63" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                            <polyline points="22,6 12,13 2,6"/>
                          </svg>
                          <span className="text-xs font-bold text-[#1E3F63] uppercase tracking-wider">Categories</span>
                        </div>
                        <div className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            {viewCustomerModal.categories.map(cat => (
                              <span key={cat.categoryId} className="inline-block bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1.5 rounded-full">
                                {cat.categoryName}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* RIGHT COLUMN: Addresses & Contact Persons */}
                <div className="space-y-4">
                  {/* Residential Address */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50">
                      <svg viewBox="0 0 24 24" fill="none" stroke="#1E3F63" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                        <polyline points="9 22 9 12 15 12 15 22"/>
                      </svg>
                      <span className="text-xs font-bold text-[#1E3F63] uppercase tracking-wider">Residential Address</span>
                    </div>
                    <div className="px-4 py-4">
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {viewCustomerModal.addressNumber}, {viewCustomerModal.addressStreet1}
                        {viewCustomerModal.addressStreet2 && <>, {viewCustomerModal.addressStreet2}</>}
                        <br/>{viewCustomerModal.addressCity}, {viewCustomerModal.addressDistrict}
                        <br/>{viewCustomerModal.addressCountry}
                      </p>
                    </div>
                  </div>

                  {/* Delivery Addresses */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
                      <div className="flex items-center gap-2">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#1E3F63" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0">
                          <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-xs font-bold text-[#1E3F63] uppercase tracking-wider">Delivery Addresses</span>
                      </div>
                      {viewCustomerModal.deliveryAddresses && (
                        <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded-full">
                          {viewCustomerModal.deliveryAddresses.length} {viewCustomerModal.deliveryAddresses.length === 1 ? 'Location' : 'Locations'}
                        </span>
                      )}
                    </div>
                    <div className="p-4 space-y-3">
                      {viewCustomerModal.deliveryAddresses && viewCustomerModal.deliveryAddresses.length > 0 ? (
                        viewCustomerModal.deliveryAddresses.map((da, idx) => (
                          <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-100 text-sm">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-gray-900 text-xs uppercase tracking-wide">
                                {da.label || `Delivery Location ${idx + 1}`}
                              </span>
                              {da.isSameAsResidential && (
                                <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">
                                  Matches Residential
                                </span>
                              )}
                            </div>
                            <p className="text-gray-700 leading-relaxed text-sm">
                              {da.addressNumber}, {da.addressStreet1}
                              {da.addressStreet2 && <>, {da.addressStreet2}</>}
                              <br/>{da.addressCity}, {da.addressDistrict}
                              <br/>{da.addressCountry || 'Sri Lanka'}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500 italic">No delivery addresses recorded.</p>
                      )}
                    </div>
                  </div>

                  {/* Contact Persons */}
                  {viewCustomerModal.contactPersons && viewCustomerModal.contactPersons.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#1E3F63" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                          <circle cx="9" cy="7" r="4"/>
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                        </svg>
                        <span className="text-xs font-bold text-[#1E3F63] uppercase tracking-wider">Contact Persons</span>
                      </div>
                      <div className="px-4 py-4 space-y-3">
                        {viewCustomerModal.contactPersons.map((cp, idx) => (
                          <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                            <p className="font-semibold text-gray-900 text-sm">{cp.name}</p>
                            <p className="text-gray-600 text-sm mt-1">📞 {cp.phone}</p>
                            {cp.email && <p className="text-gray-600 text-sm">✉️ {cp.email}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Fixed Footer with Action Buttons */}
            {isAdminOrSuperAdmin() && (
              <div className="flex items-center justify-end gap-3 px-14 py-4 border-t border-gray-200 rounded-b-2xl bg-gray-50 shrink-0">
                <button 
                  onClick={() => {
                    setViewCustomerModal(null);
                    handleEdit(viewCustomerModal);
                  }} 
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium flex items-center gap-2"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  Edit Customer
                </button>
                <button 
                  onClick={() => {
                    if (window.confirm(`Are you sure you want to deactivate ${viewCustomerModal.name}?`)) {
                      handleDeactivate(viewCustomerModal.customerId);
                      setViewCustomerModal(null);
                    }
                  }} 
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition font-medium flex items-center gap-2"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                  </svg>
                  Deactivate
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default Customers;
