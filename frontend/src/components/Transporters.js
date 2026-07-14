import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import { transporterService } from '../api/services/transporterService';
import { jobService } from '../api/services/jobService';
import { billingService } from '../api/services/billingService';
import { formatDate, formatDateWithMonth } from '../utils/dateFormatter';

const initialFormData = {
  name: '',
  mainPhone: '',
  email: '',
  lorryNumber: '',
  registrationDate: new Date().toISOString().split('T')[0],
  addressNumber: '',
  addressStreet1: '',
  addressStreet2: '',
  addressDistrict: '',
  addressCity: '',
  addressCountry: 'Sri Lanka',
  contactPersons: [{ name: '', phone: '', email: '' }],
  transporterType: 'Non FCL',
  driverName: '',
  size: '',
  isActive: true,
};

function Transporters() {
  const { user } = useAuth();
  const formatAmount = (amount) => {
    return parseFloat(amount || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const [transporters, setTransporters] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [bills, setBills] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [cities, setCities] = useState([]);
  const [filteredCities, setFilteredCities] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewTransporterModal, setViewTransporterModal] = useState(null); // Transporter object being viewed
  const [showModal, setShowModal] = useState(false);
  const [editingTransporter, setEditingTransporter] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [formErrors, setFormErrors] = useState({});
  const [message, setMessage] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedJobForPayment, setSelectedJobForPayment] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentMode, setPaymentMode] = useState('full');
  const [partialPaymentAmount, setPartialPaymentAmount] = useState('');
  const [chequeNumber, setChequeNumber] = useState('');
  const [chequeDate, setChequeDate] = useState('');
  const [chequeAmount, setChequeAmount] = useState('');
  const [bankName, setBankName] = useState('Commercial Bank');
  const [expandedPaymentDetails, setExpandedPaymentDetails] = useState(null);
  const [showBreakdownModal, setShowBreakdownModal] = useState(false);
  const [breakdownJob, setBreakdownJob] = useState(null);
  const [selectedChequeId, setSelectedChequeId] = useState('');
  const [dateRangeFilter, setDateRangeFilter] = useState({
    startDate: '',
    endDate: ''
  });

  const canViewTransporters = user && (
    user.role === 'Admin' ||
    user.role === 'Super Admin' ||
    user.role === 'Manager' ||
    user.role === 'Office Executive'
  );
  const canManageTransporters = user && (
    user.role === 'Admin' ||
    user.role === 'Super Admin' ||
    user.role === 'Manager'
  );
  const canPayTransporterCosts = user && (
    user.role === 'Admin' ||
    user.role === 'Super Admin' ||
    user.role === 'Manager'
  );

  useEffect(() => {
    if (canViewTransporters) {
      fetchTransporters();
      fetchJobs();
      fetchBills();
      fetchDistricts();
      fetchAllCities();
    }
  }, [canViewTransporters]);

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

  const fetchTransporters = async () => {
    try {
      const data = await transporterService.getAll();
      setTransporters(data);
    } catch (error) {
      console.error('Error fetching transporters:', error);
      setMessage(error.response?.data?.message || 'Error loading transporters');
    }
  };

  const fetchJobs = async () => {
    try {
      const data = await jobService.getAll();
      setJobs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      setJobs([]);
    }
  };

  const fetchBills = async () => {
    try {
      const data = await billingService.getBills();
      setBills(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching bills:', error);
      setBills([]);
    }
  };

  const fetchDistricts = async () => {
    try {
      const response = await apiClient.get('/locations/districts');
      setDistricts(response.data);
    } catch (error) {
      console.error('Error fetching districts:', error);
    }
  };

  const fetchAllCities = async () => {
    try {
      const response = await apiClient.get('/locations/cities');
      setCities(response.data);
    } catch (error) {
      console.error('Error fetching cities:', error);
      setCities([]);
    }
  };

  const getFilteredCities = (districtName) => {
    const matchedDistrict = districts.find((district) => district.districtName === districtName);
    if (!matchedDistrict) {
      return [];
    }

    return cities.filter((city) => city.districtId === matchedDistrict.districtId);
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingTransporter(null);
    setFormErrors({});
  };

  const openCreateModal = () => {
    resetForm();
    setFilteredCities([]);
    setShowModal(true);
  };

  const openEditModal = (transporter) => {
    setFilteredCities(getFilteredCities(transporter.addressDistrict || ''));
    setEditingTransporter(transporter);
    setFormData({
      name: transporter.name || '',
      mainPhone: transporter.mainPhone || transporter.phone || '',
      email: transporter.email || '',
      lorryNumber: transporter.lorryNumber || '',
      registrationDate: transporter.registrationDate
        ? new Date(transporter.registrationDate).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      addressNumber: transporter.addressNumber || '',
      addressStreet1: transporter.addressStreet1 || '',
      addressStreet2: transporter.addressStreet2 || '',
      addressDistrict: transporter.addressDistrict || '',
      addressCity: transporter.addressCity || '',
      addressCountry: transporter.addressCountry || 'Sri Lanka',
      contactPersons:
        transporter.contactPersons && transporter.contactPersons.length > 0
          ? transporter.contactPersons.map((contactPerson) => ({
              name: contactPerson.name || '',
              phone: contactPerson.phone || '',
              email: contactPerson.email || '',
            }))
          : [{ name: transporter.contactPerson || '', phone: '', email: '' }],
      transporterType: transporter.transporterType || 'Non FCL',
      driverName: transporter.driverName || '',
      size: transporter.size || '',
      isActive: transporter.isActive,
    });
    setFormErrors({});
    setShowModal(true);
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = 'Transporter name is required';
    } else if (!/^[a-zA-Z\s-]+$/.test(formData.name.trim())) {
      errors.name = 'Transporter name can only contain letters, spaces, and hyphens (-)';
    }

    if (!formData.mainPhone.trim()) {
      errors.mainPhone = 'Main phone number is required';
    } else if (!/^\d{10}$/.test(formData.mainPhone.replace(/\s/g, ''))) {
      errors.mainPhone = 'Phone number must be exactly 10 digits';
    }

    if (!formData.lorryNumber.trim()) {
      errors.lorryNumber = 'Lorry number is required';
    }

    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!formData.addressNumber.trim()) {
      errors.addressNumber = 'Address number is required';
    }

    if (!formData.addressStreet1.trim()) {
      errors.addressStreet1 = 'Street name 1 is required';
    }

    if (!formData.addressDistrict.trim()) {
      errors.addressDistrict = 'District is required';
    }

    if (!formData.addressCity.trim()) {
      errors.addressCity = 'City/Town is required';
    }

    if (!formData.addressCountry.trim()) {
      errors.addressCountry = 'Country is required';
    }

    // FCL-specific validations
    if (formData.transporterType === 'FCL') {
      if (!formData.driverName.trim()) {
        errors.driverName = 'Driver name is required for FCL transporters';
      } else if (!/^[a-zA-Z\s-]+$/.test(formData.driverName.trim())) {
        errors.driverName = 'Driver name can only contain letters, spaces, and hyphens (-)';
      }

      if (!formData.size.trim()) {
        errors.size = 'Size is required for FCL transporters';
      }
    }

    const validContactPersons = formData.contactPersons.filter(
      (contactPerson) => contactPerson.name.trim() || contactPerson.phone.trim() || contactPerson.email.trim()
    );

    if (validContactPersons.length === 0) {
      errors.contactPersons = 'At least one contact person is required';
    }

    if (validContactPersons.length > 2) {
      errors.contactPersons = 'Maximum 2 contact persons allowed';
    }

    validContactPersons.forEach((contactPerson, index) => {
      if (!contactPerson.name.trim()) {
        errors[`contactPersonName${index}`] = 'Contact person name is required';
        } else if (!/^[a-zA-Z\s-]+$/.test(contactPerson.name.trim())) {
          errors[`contactPersonName${index}`] = 'Name can only contain letters, spaces, and hyphens (-)';
      }

      if (!contactPerson.phone.trim()) {
        errors[`contactPersonPhone${index}`] = 'Contact person phone is required';
      } else if (!/^\d{10}$/.test(contactPerson.phone.replace(/\s/g, ''))) {
        errors[`contactPersonPhone${index}`] = 'Phone number must be exactly 10 digits';
      }

      if (contactPerson.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactPerson.email)) {
        errors[`contactPersonEmail${index}`] = 'Please enter a valid email address';
      }
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    if (name === 'name') {
      const sanitizedName = value.replace(/[^a-zA-Z\s-]/g, '');
      setFormData((prev) => ({
        ...prev,
        name: sanitizedName,
      }));
      if (formErrors.name) {
        setFormErrors((prev) => ({ ...prev, name: '' }));
      }
      return;
    }

    if (name === 'mainPhone') {
      const sanitizedPhone = value.replace(/\D/g, '').slice(0, 10);
      setFormData((prev) => ({
        ...prev,
        mainPhone: sanitizedPhone,
      }));
      if (formErrors.mainPhone) {
        setFormErrors((prev) => ({ ...prev, mainPhone: '' }));
      }
      return;
    }

    if (name === 'driverName') {
      const sanitizedName = value.replace(/[^a-zA-Z\s-]/g, '');
      setFormData((prev) => ({
        ...prev,
        driverName: sanitizedName,
      }));
      if (formErrors.driverName) {
        setFormErrors((prev) => ({ ...prev, driverName: '' }));
      }
      return;
    }

    if (name === 'addressDistrict') {
      setFilteredCities(getFilteredCities(value));
      setFormData((prev) => ({
        ...prev,
        addressDistrict: value,
        addressCity: '',
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleContactPersonChange = (index, field, value) => {
    let sanitizedValue = value;
    if (field === 'name') {
      sanitizedValue = value.replace(/[^a-zA-Z\s-]/g, '');
    } else if (field === 'phone') {
      sanitizedValue = value.replace(/\D/g, '').slice(0, 10);
    }

    setFormData((prev) => ({
      ...prev,
      contactPersons: prev.contactPersons.map((contactPerson, contactPersonIndex) =>
        contactPersonIndex === index ? { ...contactPerson, [field]: sanitizedValue } : contactPerson
      ),
    }));

    const errorKey = field === 'name' ? `contactPersonName${index}` : field === 'phone' ? `contactPersonPhone${index}` : '';
    if (errorKey && formErrors[errorKey]) {
      setFormErrors((prev) => ({ ...prev, [errorKey]: '' }));
    }
  };

  const validateNameInput = (event) => {
    const { key } = event;
    if (key.length > 1) {
      return true;
    }
    if (!/^[a-zA-Z\s-]$/.test(key)) {
      event.preventDefault();
      return false;
    }
    return true;
  };

  const validatePhoneInput = (event) => {
    const { key } = event;
    if (key.length > 1) {
      return true;
    }
    if (!/^\d$/.test(key)) {
      event.preventDefault();
      return false;
    }
    return true;
  };

  const addContactPerson = () => {
    if (formData.contactPersons.length >= 2) {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      contactPersons: [...prev.contactPersons, { name: '', phone: '', email: '' }],
    }));
  };

  const removeContactPerson = (index) => {
    if (formData.contactPersons.length === 1) {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      contactPersons: prev.contactPersons.filter((_, contactPersonIndex) => contactPersonIndex !== index),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateForm()) {
      return;
    }

    try {
      if (editingTransporter) {
        await transporterService.update(editingTransporter.transporterId, formData);
        setMessage('Transporter updated successfully');
      } else {
        await transporterService.create(formData);
        setMessage('Transporter created successfully');
      }

      setShowModal(false);
      resetForm();
      fetchTransporters();
    } catch (error) {
      console.error('Error saving transporter:', error);
      setMessage(error.response?.data?.message || 'Error saving transporter');
    }
  };

  const handleDeactivate = async (transporterId) => {
    if (!window.confirm('Are you sure you want to deactivate this transporter?')) {
      return;
    }

    try {
      await transporterService.delete(transporterId);
      setMessage('Transporter deactivated successfully');
      fetchTransporters();
    } catch (error) {
      console.error('Error deactivating transporter:', error);
      setMessage(error.response?.data?.message || 'Error deactivating transporter');
    }
  };

  const filteredTransporters = transporters.filter((transporter) => {
    const isActive = transporter.isActive === undefined || transporter.isActive === null
      ? true
      : Boolean(transporter.isActive);

    if (!isActive) {
      return false;
    }

    const haystack = [
      transporter.transporterId,
      transporter.name,
      transporter.contactPerson,
      transporter.mainPhone || transporter.phone,
      transporter.email,
      transporter.registrationDate,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return haystack.includes(searchTerm.toLowerCase());
  });

  const getAssignedJobs = (transporter) => {
    const transporterName = (transporter?.name || '').trim().toLowerCase();
    const transporterId = (transporter?.transporterId || '').trim().toLowerCase();

    return jobs.filter((job) => {
      const jobTransporter = (job?.transporter || '').trim().toLowerCase();
      const jobTransporterId = (job?.transporterId || '').trim().toLowerCase();

      if (transporterId && jobTransporterId && jobTransporterId === transporterId) {
        return true;
      }

      if (transporterName && jobTransporter && jobTransporter === transporterName) {
        return true;
      }

      return false;
    });
  };

  const getJobPaymentStatus = (jobId) => {
    if (!jobId) return 'Not Billed';

    const jobBills = bills.filter((bill) => bill.jobId === jobId);
    if (jobBills.length === 0) {
      return 'Not Billed';
    }

    const latestBill = [...jobBills].sort((a, b) => {
      const aDate = new Date(a.billDate || a.createdDate || 0).getTime();
      const bDate = new Date(b.billDate || b.createdDate || 0).getTime();
      return bDate - aDate;
    })[0];

    return latestBill.paymentStatus || 'Not Billed';
  };

  const getBillingAmount = (jobId) => {
    if (!jobId) return 0;

    // Find the job with this ID
    const job = jobs.find(j => j.jobId === jobId);
    if (!job || !job.payItems) return 0;

    // Get only transporter cost billing amount from job's pay items
    const payItems = Array.isArray(job.payItems) ? job.payItems : [];
    const transporterCostItems = payItems.filter((item) => {
      const label = (item?.description || item?.name || '').toLowerCase().trim();
      // Only check for new format with place names
      return label.startsWith('transporter cost (from');
    });

    if (!transporterCostItems.length) return 0;

    return transporterCostItems.reduce((sum, item) => {
      return sum + (parseFloat(item.billingAmount || item.amount || item.actualCost || 0) || 0);
    }, 0);
  };

  const getPaymentStatusClassName = (status) => {
    return String(status || 'Not Billed').toLowerCase().replace(/\s+/g, '-');
  };

  const getTransporterCostItems = (job) => {
    const payItems = Array.isArray(job?.payItems) ? job.payItems : [];
    return payItems.filter((item) => {
      const label = (item?.description || item?.name || '').toLowerCase().trim();
      // Only check for new format with place names
      return label.startsWith('transporter cost (from');
    });
  };

  const getTransporterCostAmount = (job) => {
    const transporterCostItems = getTransporterCostItems(job);
    if (!transporterCostItems.length) return 0;

    return transporterCostItems.reduce((sum, item) => {
      return sum + (parseFloat(item.actualCost || item.amount || 0) || 0);
    }, 0);
  };

  const isTransporterCostPaid = (job) => {
    const transporterCostItems = getTransporterCostItems(job);
    if (!transporterCostItems.length) return false;

    return transporterCostItems.every((item) => {
      const totalAmount = parseFloat(item.actualCost || item.amount || item.billingAmount || 0) || 0;
      const paidAmount = parseFloat(item.paidAmount || 0) || 0;
      return totalAmount > 0 && paidAmount >= totalAmount;
    });
  };

  const isTransporterCostPartiallyPaid = (job) => {
    const transporterCostItems = getTransporterCostItems(job);
    if (!transporterCostItems.length) return false;

    // Only partially paid if NOT fully paid AND has some payment
    return !isTransporterCostPaid(job) && transporterCostItems.some((item) => {
      const paidAmount = parseFloat(item.paidAmount || 0) || 0;
      return paidAmount > 0;
    });
  };

  const getPaidByLabel = (job) => {
    const transporterCostItems = getTransporterCostItems(job);
    if (!transporterCostItems.length) return '';

    const paidByLabels = [...new Set(
      transporterCostItems
        .map((item) => {
          const name = item.paidByName || item.paidBy || '';
          const method = item.paymentMethod || '';
          if (name && method) return `${name} (${method})`;
          return name;
        })
        .filter(Boolean)
    )];

    return paidByLabels.join(', ');
  };

  const getPaymentDetails = (job) => {
    const transporterCostItems = getTransporterCostItems(job);
    if (!transporterCostItems.length) return null;
    return transporterCostItems[0];
  };

  const getRemainingTransporterCost = (job) => {
    const transporterCostItems = getTransporterCostItems(job);
    if (!transporterCostItems.length) return 0;

    let totalRemaining = 0;
    transporterCostItems.forEach((item) => {
      const totalAmount = parseFloat(item.actualCost || item.amount || 0) || 0;
      const paidAmount = parseFloat(item.paidAmount || 0) || 0;
      totalRemaining += Math.max(0, totalAmount - paidAmount);
    });
    return totalRemaining;
  };

  const getAllPaymentRecords = (job) => {
    const transporterCostItems = getTransporterCostItems(job);
    if (!transporterCostItems.length) return [];
    
    const item = transporterCostItems[0];
    
    // If paymentRecords array exists, return it
    if (Array.isArray(item.paymentRecords) && item.paymentRecords.length > 0) {
      return item.paymentRecords;
    }
    
    // Otherwise, create a single record from the item's payment data
    if (item.paidAmount > 0) {
      return [{
        paymentDate: item.paidAt,
        paymentMethod: item.paymentMethod,
        chequeNumber: item.chequeNumber,
        chequeDate: item.chequeDate,
        bankName: item.bankName,
        amount: item.paidAmount,
        paidByName: item.paidByName
      }];
    }
    
    return [];
  };

  const getAvailableChequesWithBalance = () => {
    const chequeMap = new Map();

    // Collect all cheques from all jobs
    jobs.forEach((job) => {
      const paymentRecords = getAllPaymentRecords(job);
      paymentRecords.forEach((payment) => {
        if (payment.paymentMethod === 'Cheque' && payment.chequeNumber) {
          const key = `${payment.chequeNumber}-${payment.chequeDate}`;
          if (!chequeMap.has(key)) {
            chequeMap.set(key, {
              chequeNumber: payment.chequeNumber,
              chequeDate: payment.chequeDate,
              chequeAmount: parseFloat(payment.chequeAmount || 0),
              bankName: payment.bankName,
              totalUsed: 0
            });
          }
        }
      });
    });

    // Calculate used amount for each cheque
    jobs.forEach((job) => {
      const paymentRecords = getAllPaymentRecords(job);
      paymentRecords.forEach((payment) => {
        if (payment.paymentMethod === 'Cheque' && payment.chequeNumber) {
          const key = `${payment.chequeNumber}-${payment.chequeDate}`;
          if (chequeMap.has(key)) {
            const cheque = chequeMap.get(key);
            cheque.totalUsed += parseFloat(payment.amount || 0);
          }
        }
      });
    });

    // Filter cheques with remaining balance
    const availableCheques = Array.from(chequeMap.values()).filter(
      (cheque) => cheque.chequeAmount > cheque.totalUsed
    );

    return availableCheques;
  };

  const calculateTransporterSummary = () => {
    const summary = {
      totalTransporters: transporters.filter(t => t.isActive).length,
      transportersWithJobs: new Set(),
      paidTransporters: new Set(),
      unpaidTransporters: new Set(),
      totalPaidAmount: 0,
      totalUnpaidAmount: 0,
    };

    jobs.forEach((job) => {
      const transporterName = (job?.transporter || '').trim().toLowerCase();
      const transporterId = (job?.transporterId || '').trim().toLowerCase();

      if (!transporterName && !transporterId) return;

      const matchingTransporter = transporters.find((t) => {
        const tName = (t?.name || '').trim().toLowerCase();
        const tId = (t?.transporterId || '').trim().toLowerCase();
        return (transporterId && tId === transporterId) || (transporterName && tName === transporterName);
      });

      if (!matchingTransporter) return;

      summary.transportersWithJobs.add(matchingTransporter.transporterId);

      const costAmount = getTransporterCostAmount(job);
      if (costAmount > 0) {
        if (isTransporterCostPaid(job)) {
          summary.paidTransporters.add(matchingTransporter.transporterId);
          summary.totalPaidAmount += costAmount;
        } else {
          summary.unpaidTransporters.add(matchingTransporter.transporterId);
          summary.totalUnpaidAmount += costAmount;
        }
      }
    });

    return {
      totalTransporters: summary.totalTransporters,
      transportersWithJobs: summary.transportersWithJobs.size,
      paidTransporters: summary.paidTransporters.size,
      unpaidTransporters: summary.unpaidTransporters.size,
      totalPaidAmount: summary.totalPaidAmount,
      totalUnpaidAmount: summary.totalUnpaidAmount,
    };
  };

  const openPaymentModal = (job) => {
    const transporterCostItems = getTransporterCostItems(job);
    if (!transporterCostItems.length) {
      setMessage('Transporter cost not found for this job');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    const amount = getTransporterCostAmount(job);
    if (amount <= 0) {
      setMessage('Transporter cost amount is not set yet');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    setSelectedJobForPayment(job);
    setPaymentMethod('Cash');
    setPaymentMode('full');
    setPartialPaymentAmount('');
    setChequeNumber('');
    setChequeDate('');
    setChequeAmount('');
    setBankName('Commercial Bank');
    setSelectedChequeId('');
    setShowPaymentModal(true);
  };

  const handleViewPaymentDetails = (job) => {
    if (window.innerWidth <= 768) {
      setBreakdownJob(job);
      setShowBreakdownModal(true);
    } else {
      setExpandedPaymentDetails(expandedPaymentDetails === job.jobId ? null : job.jobId);
    }
  };

  const submitTransporterPayment = async () => {
    if (!selectedJobForPayment) return;

    // Validate payment amount
    let paymentAmount = 0;
    if (paymentMode === 'full') {
      paymentAmount = getRemainingTransporterCost(selectedJobForPayment);
    } else {
      paymentAmount = parseFloat(partialPaymentAmount);
      if (isNaN(paymentAmount) || paymentAmount <= 0) {
        setMessage('âŒ Please enter a valid payment amount');
        setTimeout(() => setMessage(''), 5000);
        return;
      }
    }

    if (paymentMethod === 'Cheque') {
      if (!chequeNumber || !chequeDate || !chequeAmount) {
        setMessage('âŒ Please fill in all cheque details (Number, Date, Amount)');
        setTimeout(() => setMessage(''), 5000);
        return;
      }
      if (isNaN(parseFloat(chequeAmount)) || parseFloat(chequeAmount) <= 0) {
        setMessage('âŒ Please enter a valid cheque amount');
        setTimeout(() => setMessage(''), 5000);
        return;
      }
    }

    try {
      // Record payment using dedicated transporter payment endpoint
      const paymentData = {
        amount: paymentAmount,
        paymentMethod,
        ...(paymentMethod === 'Cheque' && { 
          chequeNumber, 
          chequeDate, 
          chequeAmount: parseFloat(chequeAmount) 
        }),
        ...(paymentMethod === 'Bank Transfer' && { bankName }),
      };

      const paymentResponse = await transporterService.recordPayment(
        selectedJobForPayment.jobId,
        paymentData
      );

      // Also update the job pay items for UI consistency
      const latestJob = jobs.find(j => j.jobId === selectedJobForPayment.jobId) || selectedJobForPayment;
      
      const updatedPayItems = (Array.isArray(latestJob.payItems) ? latestJob.payItems : []).map((item) => {
        const label = (item?.description || item?.name || '').toLowerCase().trim();
        // Match both old format "transporter cost" and new format "transporter cost (from ...)"
        if (label !== 'transporter cost' && !label.startsWith('transporter cost (from')) return item;

        const itemAmount = parseFloat(item.billingAmount || item.amount || item.actualCost || 0) || 0;
        const currentPaidAmount = parseFloat(item.paidAmount || 0) || 0;
        const totalPaidAmount = currentPaidAmount + paymentAmount;
        const isPaid = totalPaidAmount >= itemAmount;

        // Create new payment record
        const newPaymentRecord = {
          paymentDate: new Date().toISOString(),
          paymentMethod,
          amount: paymentAmount,
          paidByName: user?.name || user?.fullName || user?.username || user?.userId || 'System',
          ...(paymentMethod === 'Cheque' && { chequeNumber, chequeDate, chequeAmount: parseFloat(chequeAmount) }),
          ...(paymentMethod === 'Bank Transfer' && { bankName }),
        };

        // Get existing payment records or create new array
        const existingRecords = Array.isArray(item.paymentRecords) ? item.paymentRecords : [];
        const updatedRecords = [...existingRecords, newPaymentRecord];

        return {
          ...item,
          paymentStatus: isPaid ? 'Paid' : 'Partially Paid',
          isPaid: isPaid,
          paidAmount: totalPaidAmount,
          paidAt: new Date().toISOString(),
          paidBy: user?.userId || user?.username || user?.name || 'System',
          paidByName: user?.name || user?.fullName || user?.username || user?.userId || 'System',
          paymentMethod,
          paymentRecords: updatedRecords,
          ...(paymentMethod === 'Cheque' && { chequeNumber, chequeDate, chequeAmount: parseFloat(chequeAmount) }),
          ...(paymentMethod === 'Bank Transfer' && { bankName }),
        };
      });

      await jobService.replacePayItems(selectedJobForPayment.jobId, updatedPayItems);

      setJobs((prevJobs) => prevJobs.map((currentJob) => (
        currentJob.jobId === selectedJobForPayment.jobId ? { ...currentJob, payItems: updatedPayItems } : currentJob
      )));

      setShowPaymentModal(false);
      setSelectedJobForPayment(null);
      const paymentTypeText = paymentMode === 'full' ? 'Full payment' : `Partial payment (LKR ${formatAmount(paymentAmount)})`;
      setMessage(`âœ… ${paymentTypeText} recorded for ${selectedJobForPayment.jobId} via ${paymentMethod}`);
      setTimeout(() => setMessage(''), 4000);
    } catch (error) {
      console.error('Error paying transporter cost:', error);
      setMessage(error.response?.data?.message || 'âŒ Error recording payment');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  if (!canViewTransporters) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 py-6">
        <div className="bg-red-100 text-red-800 px-4 py-3 rounded-lg border border-red-300">Access Denied</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Transporters</h1>
          <p className="text-gray-600 mt-1">Manage transporter details and contact information</p>
        </div>
        {canManageTransporters && (
          <button onClick={openCreateModal} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition">
            + New Transporter
          </button>
        )}
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg border-l-4 ${message.includes('Error') ? 'bg-red-50 border-red-500 text-red-700' : 'bg-green-50 border-green-500 text-green-700'}`}>
          {message}
        </div>
      )}

      {(() => {
        const summary = calculateTransporterSummary();
        return (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="text-xl">ðŸ‘¥</span>
                <div>
                  <div className="text-xs font-medium text-gray-500">Total Transporters</div>
                  <div className="text-xl font-bold text-gray-900">{summary.totalTransporters}</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="text-xl">ðŸ“‹</span>
                <div>
                  <div className="text-xs font-medium text-gray-500">With Jobs</div>
                  <div className="text-xl font-bold text-gray-900">{summary.transportersWithJobs}</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg border-l-4 border-l-green-500 border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="text-xl">âœ…</span>
                <div>
                  <div className="text-xs font-medium text-gray-500">Paid</div>
                  <div className="text-xl font-bold text-gray-900">{summary.paidTransporters}</div>
                  <div className="text-xs text-green-600 mt-0.5">LKR {formatAmount(summary.totalPaidAmount)}</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg border-l-4 border-l-orange-500 border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="text-xl">â³</span>
                <div>
                  <div className="text-xs font-medium text-gray-500">Unpaid</div>
                  <div className="text-xl font-bold text-gray-900">{summary.unpaidTransporters}</div>
                  <div className="text-xs text-orange-600 mt-0.5">LKR {formatAmount(summary.totalUnpaidAmount)}</div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <div className="bg-white rounded-xl border-2 border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">All Transporters ({filteredTransporters.length})</h2>
          <div className="relative">
            <svg className="absolute left-3 top-3 text-gray-400" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input
              type="text"
              placeholder="Search by transporter, contact, phone, email, or date..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
        </div>

        {filteredTransporters.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="mx-auto mb-4 text-gray-400" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 1 0 4 0m0 0a2 2 0 1 1 4 0m-6 9l2 2m0 0l2-2m-2 2v-6"></path>
            </svg>
            <p className="text-gray-600">{searchTerm ? 'No transporters found matching your search' : 'No transporters added yet'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Transporter ID</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Main Phone</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Registration Date</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Contact Person</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTransporters.map((transporter) => (
                  (() => {
                    const assignedJobs = getAssignedJobs(transporter);
                    return (
                  <React.Fragment key={transporter.transporterId}>
                    <tr className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm font-semibold text-blue-600">{transporter.transporterId}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{transporter.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{transporter.mainPhone || transporter.phone}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{transporter.email || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{formatDate(transporter.registrationDate)}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{transporter.contactPersons?.[0]?.name || transporter.contactPerson || '-'}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${transporter.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {transporter.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          {canManageTransporters && (
                            <button
                              onClick={() => openEditModal(transporter)}
                              title="Edit Transporter"
                              className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={() => setViewTransporterModal(transporter)}
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
                    );
                  })()
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-200 px-6 py-4">
              <h2 className="text-xl font-bold text-gray-900">{editingTransporter ? 'Edit Transporter' : 'New Transporter'}</h2>
              <button className="text-gray-400 hover:text-gray-600 text-2xl" onClick={() => setShowModal(false)}>Ã—</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="border-b border-gray-200 px-0 py-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Transporter Name <span className="text-red-600">*</span></label>
                    <input
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      onKeyPress={validateNameInput}
                      placeholder="Enter name (letters, spaces, and hyphens only)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {formErrors.name && <span className="text-red-600 text-sm mt-1 block">{formErrors.name}</span>}
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Main Phone Number <span className="text-red-600">*</span></label>
                    <input
                      name="mainPhone"
                      value={formData.mainPhone}
                      onChange={handleChange}
                      onKeyPress={validatePhoneInput}
                      placeholder="0771234567"
                      maxLength="10"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {formErrors.mainPhone && <span className="text-red-600 text-sm mt-1 block">{formErrors.mainPhone}</span>}
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Lorry Number <span className="text-red-600">*</span></label>
                    <input
                      name="lorryNumber"
                      value={formData.lorryNumber}
                      onChange={handleChange}
                      placeholder="e.g., ABC-1234"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {formErrors.lorryNumber && <span className="text-red-600 text-sm mt-1 block">{formErrors.lorryNumber}</span>}
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    <input
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="email@example.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {formErrors.email && <span className="text-red-600 text-sm mt-1 block">{formErrors.email}</span>}
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Transporter Type <span className="text-red-600">*</span></label>
                    <select
                      name="transporterType"
                      value={formData.transporterType}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="FCL">FCL</option>
                      <option value="Non FCL">Non FCL</option>
                    </select>
                  </div>

                  {formData.transporterType === 'FCL' && (
                    <>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Driver Name <span className="text-red-600">*</span></label>
                        <input
                          name="driverName"
                          value={formData.driverName}
                          onChange={handleChange}
                          onKeyPress={validateNameInput}
                          placeholder="Enter driver name"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {formErrors.driverName && <span className="text-red-600 text-sm mt-1 block">{formErrors.driverName}</span>}
                      </div>

                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Size <span className="text-red-600">*</span></label>
                        <input
                          name="size"
                          value={formData.size}
                          onChange={handleChange}
                          placeholder="e.g., 20ft, 40ft"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {formErrors.size && <span className="text-red-600 text-sm mt-1 block">{formErrors.size}</span>}
                      </div>
                    </>
                  )}

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Registration Date <span className="text-red-600">*</span></label>
                    <input
                      type="date"
                      name="registrationDate"
                      value={formData.registrationDate}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="mb-4 flex items-center">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleChange} className="w-4 h-4 rounded" />
                      <span className="text-sm font-medium text-gray-700">Active Transporter</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="border-b border-gray-200 px-0 py-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Address Information</h3>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address Number <span className="text-red-600">*</span></label>
                    <input
                      name="addressNumber"
                      value={formData.addressNumber}
                      onChange={handleChange}
                      placeholder="e.g., 45, 123/2A"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {formErrors.addressNumber && <span className="text-red-600 text-sm mt-1 block">{formErrors.addressNumber}</span>}
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Street Name 1 <span className="text-red-600">*</span></label>
                    <input
                      name="addressStreet1"
                      value={formData.addressStreet1}
                      onChange={handleChange}
                      placeholder="e.g., Galle Road, Temple Road"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {formErrors.addressStreet1 && <span className="text-red-600 text-sm mt-1 block">{formErrors.addressStreet1}</span>}
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Street Name 2</label>
                    <input
                      name="addressStreet2"
                      value={formData.addressStreet2}
                      onChange={handleChange}
                      placeholder="e.g., Lane 3, Near School"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">District <span className="text-red-600">*</span></label>
                    <select
                      name="addressDistrict"
                      value={formData.addressDistrict}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select District</option>
                      {districts.map((district) => (
                        <option key={district.districtId} value={district.districtName}>
                          {district.districtName}
                        </option>
                      ))}
                    </select>
                    {formErrors.addressDistrict && <span className="text-red-600 text-sm mt-1 block">{formErrors.addressDistrict}</span>}
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">City / Town <span className="text-red-600">*</span></label>
                    <select
                      name="addressCity"
                      value={formData.addressCity}
                      onChange={handleChange}
                      disabled={!formData.addressDistrict}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    >
                      <option value="">Select City / Town</option>
                      {filteredCities.map((city) => (
                        <option key={city.cityId} value={city.cityName}>
                          {city.cityName}
                        </option>
                      ))}
                    </select>
                    {formErrors.addressCity && <span className="text-red-600 text-sm mt-1 block">{formErrors.addressCity}</span>}
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Country <span className="text-red-600">*</span></label>
                    <input
                      name="addressCountry"
                      value={formData.addressCountry}
                      onChange={handleChange}
                      placeholder="Sri Lanka"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {formErrors.addressCountry && <span className="text-red-600 text-sm mt-1 block">{formErrors.addressCountry}</span>}
                  </div>
                </div>
              </div>

              <div className="border-b border-gray-200 px-0 py-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Contact Persons <span className="text-red-600">*</span> (At least 1 required, up to 2)</h3>
                  {formData.contactPersons.length < 2 && (
                    <button type="button" className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded text-sm font-medium" onClick={addContactPerson}>
                      + Add Contact Person
                    </button>
                  )}
                </div>

                {formErrors.contactPersons && <span className="text-red-600 text-sm mb-4 block">{formErrors.contactPersons}</span>}

                {formData.contactPersons.map((contactPerson, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg border border-gray-200 p-4 mb-4">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-semibold text-gray-900">Contact Person {index + 1}</h4>
                      {formData.contactPersons.length > 1 && (
                        <button
                          type="button"
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium"
                          onClick={() => removeContactPerson(index)}
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-600">*</span></label>
                        <input
                          value={contactPerson.name}
                          onChange={(event) => handleContactPersonChange(index, 'name', event.target.value)}
                          onKeyPress={validateNameInput}
                          placeholder="Enter contact person name"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {formErrors[`contactPersonName${index}`] && (
                          <span className="text-red-600 text-sm mt-1 block">{formErrors[`contactPersonName${index}`]}</span>
                        )}
                      </div>

                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone <span className="text-red-600">*</span></label>
                        <input
                          value={contactPerson.phone}
                          onChange={(event) => handleContactPersonChange(index, 'phone', event.target.value)}
                          onKeyPress={validatePhoneInput}
                          placeholder="0771234567"
                          maxLength="10"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {formErrors[`contactPersonPhone${index}`] && (
                          <span className="text-red-600 text-sm mt-1 block">{formErrors[`contactPersonPhone${index}`]}</span>
                        )}
                      </div>

                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                          value={contactPerson.email}
                          onChange={(event) => handleContactPersonChange(index, 'email', event.target.value)}
                          placeholder="email@example.com"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {formErrors[`contactPersonEmail${index}`] && (
                          <span className="text-red-600 text-sm mt-1 block">{formErrors[`contactPersonEmail${index}`]}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 mt-6">
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">
                  {editingTransporter ? 'Update Transporter' : 'Create Transporter'}
                </button>
                <button type="button" className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPaymentModal && selectedJobForPayment && (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center" onClick={() => setShowPaymentModal(false)}>
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

          {/* â”€â”€ Title bar â”€â”€ */}
          <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{flexShrink:0}}>
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
              </svg>
              <div>
                <span className="font-bold text-gray-900">Record Payment</span>
                <span className="text-sm text-gray-600 block">Job&nbsp;#{selectedJobForPayment.jobId}</span>
              </div>
            </div>
            <button className="text-gray-400 hover:text-gray-600 text-2xl" onClick={() => setShowPaymentModal(false)} aria-label="Close">Ã—</button>
          </div>

          {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
              ROW 1 â€” Job details (horizontal strip)
          â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
          <div className="p-6">
          <div className="flex gap-4 flex-wrap mb-6 pb-6 border-b border-gray-200">
            <div className="flex-1 min-w-32">
              <span className="text-xs font-bold text-gray-600 uppercase">Job ID</span>
              <span className="block text-gray-900 font-mono">{selectedJobForPayment.jobId}</span>
            </div>
            <div className="flex-1 min-w-32">
              <span className="text-xs font-bold text-gray-600 uppercase">Category</span>
              <span className="block text-gray-900">{selectedJobForPayment.shipmentCategory || '-'}</span>
            </div>
            <div className="flex-1 min-w-32">
              <span className="text-xs font-bold text-gray-600 uppercase">Transporter Cost</span>
              <span className="block text-lg font-bold text-gray-900">LKR {formatAmount(getTransporterCostAmount(selectedJobForPayment))}</span>
            </div>
            {parseFloat(getPaymentDetails(selectedJobForPayment)?.paidAmount || 0) > 0 && (
              <div className="flex-1 min-w-32">
                <span className="text-xs font-bold text-gray-600 uppercase">Already Paid</span>
                <span className="block text-lg font-bold text-green-600">LKR {formatAmount(getPaymentDetails(selectedJobForPayment)?.paidAmount || 0)}</span>
              </div>
            )}
            <div className={`flex-1 min-w-32 ${parseFloat(getPaymentDetails(selectedJobForPayment)?.paidAmount || 0) > 0 ? '' : ''}`}>
              <span className="text-xs font-bold text-gray-600 uppercase">Amount Due</span>
              <span className="block text-lg font-bold text-orange-600">
                LKR {formatAmount(getRemainingTransporterCost(selectedJobForPayment))}
              </span>
            </div>
          </div>

          {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
              ROW 2 â€” Payment type + amount
          â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
          <div className="grid grid-cols-2 gap-6 mb-6 pb-6 border-b border-gray-200">

            {/* Left: radio buttons */}
            <div>
              <p className="text-sm font-bold text-gray-700 mb-3">Payment Type</p>
              <div className="space-y-2">
                <label
                  className={`flex items-center p-3 border rounded-lg cursor-pointer transition ${paymentMode === 'full' ? 'bg-blue-50 border-blue-300' : 'border-gray-200 hover:border-gray-300'}`}
                  onClick={() => { setPaymentMode('full'); setPartialPaymentAmount(''); }}
                >
                  <input
                    type="radio" name="pmMode" value="full"
                    checked={paymentMode === 'full'}
                    onChange={() => { setPaymentMode('full'); setPartialPaymentAmount(''); }}
                    className="w-4 h-4 mr-3"
                  />
                  <span>
                    <strong className="block text-gray-900 text-sm">Full Payment</strong>
                    <small className="text-gray-600 text-xs">Settle entire balance</small>
                  </span>
                </label>
                <label
                  className={`flex items-center p-3 border rounded-lg cursor-pointer transition ${paymentMode === 'partial' ? 'bg-blue-50 border-blue-300' : 'border-gray-200 hover:border-gray-300'}`}
                  onClick={() => setPaymentMode('partial')}
                >
                  <input
                    type="radio" name="pmMode" value="partial"
                    checked={paymentMode === 'partial'}
                    onChange={() => setPaymentMode('partial')}
                    className="w-4 h-4 mr-3"
                  />
                  <span>
                    <strong className="block text-gray-900 text-sm">Partial Payment</strong>
                    <small className="text-gray-600 text-xs">Pay a portion now</small>
                  </span>
                </label>
              </div>
            </div>

            {/* Right: amount area */}
            <div>
              {paymentMode === 'full' ? (
                <div>
                  <p className="text-sm font-bold text-gray-700 mb-3">Amount to Collect</p>
                  <div className="text-3xl font-bold text-gray-900 mb-1">
                    LKR {formatAmount(getRemainingTransporterCost(selectedJobForPayment))}
                  </div>
                  <span className="text-xs text-gray-600 inline-block px-2 py-1 bg-gray-100 rounded">{isTransporterCostPartiallyPaid(selectedJobForPayment) ? 'Remaining balance' : 'Full balance'}</span>
                </div>
              ) : (
                <div>
                  <div className="mb-3">
                    <label className="block text-sm font-bold text-gray-700 mb-1">Enter Amount (LKR) <span className="text-red-600">*</span></label>
                    <input
                      type="number" step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={partialPaymentAmount}
                      onChange={e => setPartialPaymentAmount(e.target.value)}
                      placeholder="0.00"
                      autoFocus
                    />
                  </div>
                  {/* Mini breakdown */}
                  <div className="bg-gray-50 rounded p-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Amount</span>
                      <span className="text-gray-900">LKR {formatAmount(getTransporterCostAmount(selectedJobForPayment))}</span>
                    </div>
                    {parseFloat(getPaymentDetails(selectedJobForPayment)?.paidAmount || 0) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Already Paid</span>
                        <span className="text-green-600">LKR {formatAmount(parseFloat(getPaymentDetails(selectedJobForPayment)?.paidAmount || 0))}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">This Payment</span>
                      <span className="text-blue-600">LKR {formatAmount(parseFloat(partialPaymentAmount) || 0)}</span>
                    </div>
                    <div className="border-t border-gray-200 pt-2 flex justify-between text-sm font-semibold">
                      <span className="text-gray-900">Remaining After</span>
                      <span className="text-gray-900">LKR {formatAmount(Math.max(0, getRemainingTransporterCost(selectedJobForPayment) - (parseFloat(partialPaymentAmount) || 0)))}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>{/* end ROW 2 */}

          {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
              ROW 3 â€” Payment method + details
          â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
          <div className="grid grid-cols-2 gap-6 mb-6">

            {/* Left: method selector */}
            <div>
              <p className="text-sm font-bold text-gray-700 mb-3">Payment Method</p>
              <div className="flex gap-2 mb-3">
                {['Cash','Cheque','Bank Transfer'].map(m => (
                  <button
                    key={m}
                    type="button"
                    className={`flex-1 py-2 px-3 rounded-lg border-2 transition text-sm font-medium flex items-center justify-center gap-2 ${paymentMethod === m ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'}`}
                    onClick={() => {
                      setPaymentMethod(m);
                      setChequeNumber('');
                      setChequeDate('');
                      setChequeAmount('');
                      setBankName('Commercial Bank');
                      setSelectedChequeId('');
                    }}
                  >
                    {m === 'Cash' && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/></svg>}
                    {m === 'Cheque' && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></svg>}
                    {m === 'Bank Transfer' && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
                    {m}
                  </button>
                ))}
              </div>

              {/* Cash â€” no extra fields */}
              {paymentMethod === 'Cash' && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-sm text-green-800">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                  Cash payment â€” no additional details required.
                </div>
              )}
            </div>

            {/* Right: cheque / bank fields */}
            <div>

              {/* â”€â”€ Cheque â”€â”€ */}
              {paymentMethod === 'Cheque' && (
                <>
                  <p className="text-sm font-bold text-gray-700 mb-3">Cheque Details</p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Select Cheque <span className="text-red-600">*</span></label>
                      <select 
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        value={selectedChequeId}
                        onChange={(e) => {
                          const selected = e.target.value;
                          setSelectedChequeId(selected);
                          if (selected) {
                            const availableCheques = getAvailableChequesWithBalance();
                            const cheque = availableCheques.find(c => `${c.chequeNumber}-${c.chequeDate}` === selected);
                            if (cheque) {
                              setChequeNumber(cheque.chequeNumber);
                              setChequeDate(cheque.chequeDate);
                              setChequeAmount(String(cheque.chequeAmount - cheque.totalUsed));
                              setBankName(cheque.bankName || 'Commercial Bank');
                            }
                          } else {
                            setChequeNumber('');
                            setChequeDate('');
                            setChequeAmount('');
                          }
                        }}
                      >
                        <option value="">-- New Cheque --</option>
                        {getAvailableChequesWithBalance().map((cheque) => {
                          const remaining = cheque.chequeAmount - cheque.totalUsed;
                          return (
                            <option key={`${cheque.chequeNumber}-${cheque.chequeDate}`} value={`${cheque.chequeNumber}-${cheque.chequeDate}`}>
                              CHQ {cheque.chequeNumber} ({cheque.chequeDate}) - Remaining: LKR {formatAmount(remaining)}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    {selectedChequeId && (
                      <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Remaining Balance</label>
                        <input 
                          type="text" 
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
                          value={`LKR ${formatAmount(chequeAmount)}`}
                          disabled
                        />
                      </div>
                    )}
                    {!selectedChequeId && (
                      <>
                        <div>
                          <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Cheque Number <span className="text-red-600">*</span></label>
                          <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            value={chequeNumber}
                            onChange={e => setChequeNumber(e.target.value)}
                            placeholder="e.g. 001234"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Cheque Date <span className="text-red-600">*</span></label>
                          <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            value={chequeDate}
                            onChange={e => setChequeDate(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Cheque Amount (LKR) <span className="text-red-600">*</span></label>
                          <input type="number" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            value={chequeAmount}
                            onChange={e => setChequeAmount(e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                      </>
                    )}
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Bank Name</label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" value={bankName} onChange={e => setBankName(e.target.value)}>
                        <option>Commercial Bank</option>
                        <option>Peoples Bank</option>
                        <option>Bank of Ceylon</option>
                        <option>Hatton National Bank</option>
                        <option>Sampath Bank</option>
                        <option>Nations Trust Bank</option>
                        <option>DFCC Bank</option>
                        <option>Other</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* â”€â”€ Bank Transfer â”€â”€ */}
              {paymentMethod === 'Bank Transfer' && (
                <>
                  <p className="text-sm font-bold text-gray-700 mb-3">Transfer Details</p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Bank Name <span className="text-red-600">*</span></label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" value={bankName} onChange={e => setBankName(e.target.value)}>
                        <option>Commercial Bank</option>
                        <option>Peoples Bank</option>
                        <option>Bank of Ceylon</option>
                        <option>Hatton National Bank</option>
                        <option>Sampath Bank</option>
                        <option>Nations Trust Bank</option>
                        <option>DFCC Bank</option>
                        <option>Other</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* â”€â”€ Cash placeholder â”€â”€ */}
              {paymentMethod === 'Cash' && (
                <div className="text-center py-6">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" className="mx-auto mb-2"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/></svg>
                  <p className="text-sm text-gray-600">No additional details needed for cash.</p>
                </div>
              )}

            </div>{/* end pm-details-panel */}

          </div>{/* end ROW 3 */}
          </div>{/* end pm-body */}

          {/* â”€â”€ Footer â”€â”€ */}
          <div className="border-t border-gray-200 px-6 py-4 flex gap-3 justify-end">
            <button className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium" onClick={() => setShowPaymentModal(false)}>Cancel</button>
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2" onClick={submitTransporterPayment}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              Confirm Payment
            </button>
          </div>

        </div>
      </div>
    )}

    {showBreakdownModal && breakdownJob && (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center" onClick={() => setShowBreakdownModal(false)}>
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{flexShrink:0}}>
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
              </svg>
              <div>
                <span className="font-bold text-gray-900">Payment Breakdown</span>
                <span className="text-sm text-gray-600 block">Job #{breakdownJob.jobId}</span>
              </div>
            </div>
            <button className="text-gray-400 hover:text-gray-600 text-2xl" onClick={() => setShowBreakdownModal(false)} aria-label="Close">Ã—</button>
          </div>

          <div className="p-6">
            <div>
              <div className="border border-gray-200 rounded bg-white overflow-hidden">
                <div className="bg-gray-50 border-b border-gray-200 grid gap-0" style={{gridTemplateColumns: '1fr 1fr'}}>
                  <div className="px-4 py-2 text-xs font-bold text-gray-700 uppercase">Description</div>
                  <div className="px-4 py-2 text-xs font-bold text-gray-700 uppercase">Amount</div>
                </div>
                
                <div className="divide-y divide-gray-200">
                  <div className="grid gap-0" style={{gridTemplateColumns: '1fr 1fr'}}>
                    <div className="px-4 py-2 text-sm">
                      <span className="text-gray-700">Total Amount</span>
                    </div>
                    <div className="px-4 py-2 text-sm">
                      <span className="text-gray-900 font-medium">LKR {formatAmount(getTransporterCostAmount(breakdownJob))}</span>
                    </div>
                  </div>
                  
                  <div className="grid gap-0" style={{gridTemplateColumns: '1fr 1fr'}}>
                    <div className="px-4 py-2 text-sm">
                      <span className="text-gray-700">Paid Amount</span>
                    </div>
                    <div className="px-4 py-2 text-sm">
                      <span className="text-green-600 font-medium">LKR {formatAmount(getPaymentDetails(breakdownJob)?.paidAmount || 0)}</span>
                    </div>
                  </div>
                  
                  <div className="grid gap-0" style={{gridTemplateColumns: '1fr 1fr'}}>
                    <div className="px-4 py-2 text-sm">
                      <span className="text-gray-700">Remaining Amount</span>
                    </div>
                    <div className="px-4 py-2 text-sm">
                      <span className="text-orange-600 font-medium">LKR {formatAmount(getRemainingTransporterCost(breakdownJob))}</span>
                    </div>
                  </div>
                </div>
              </div>

              {getPaymentDetails(breakdownJob)?.paidAmount > 0 && (
                <div style={{ marginTop: '20px' }}>
                  <p className="font-bold text-gray-900 mb-3">Payment History</p>
                  <div className="space-y-3">
                    {getAllPaymentRecords(breakdownJob).map((payment, idx) => (
                      <div key={idx} className="bg-gray-50 border border-gray-200 rounded p-3">
                        <div className="flex justify-between mb-1 text-sm">
                          <span className="text-gray-600 font-semibold uppercase text-xs">DATE</span>
                          <span className="text-gray-900">{formatDateWithMonth(payment.paymentDate)}</span>
                        </div>
                        <div className="flex justify-between mb-1 text-sm">
                          <span className="text-gray-600 font-semibold uppercase text-xs">METHOD</span>
                          <span className="inline-block px-2 py-1 rounded text-xs font-medium" style={{
                            backgroundColor: payment.paymentMethod === 'Cash' ? '#dbeafe' : payment.paymentMethod === 'Cheque' ? '#fef3c7' : '#d1fae5',
                            color: payment.paymentMethod === 'Cash' ? '#0c4a6e' : payment.paymentMethod === 'Cheque' ? '#92400e' : '#065f46'
                          }}>
                            {payment.paymentMethod === 'Cash' && 'ðŸ’µ'}
                            {payment.paymentMethod === 'Cheque' && 'ðŸ“'}
                            {payment.paymentMethod === 'Bank Transfer' && 'ðŸ¦'}
                            {' '}{payment.paymentMethod || '-'}
                          </span>
                        </div>
                        <div className="flex justify-between mb-1 text-sm">
                          <span className="text-gray-600 font-semibold uppercase text-xs">REFERENCE</span>
                          <span className="text-gray-900">
                            {payment.paymentMethod === 'Cheque' && payment.chequeNumber ? `CHQ: ${payment.chequeNumber}` :
                             payment.paymentMethod === 'Bank Transfer' && payment.bankName ? payment.bankName :
                             payment.paymentMethod === 'Cash' ? 'Cash' : '-'}
                          </span>
                        </div>
                        <div className="flex justify-between mb-1 text-sm">
                          <span className="text-gray-600 font-semibold uppercase text-xs">AMOUNT</span>
                          <span className="text-gray-900 font-medium">LKR {formatAmount(payment.amount || 0)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 font-semibold uppercase text-xs">PAID BY</span>
                          <span className="text-gray-900">{payment.paidByName || '-'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-gray-200 px-6 py-4">
            <button className="w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium" onClick={() => setShowBreakdownModal(false)}>Close</button>
          </div>
        </div>
      </div>
    )}

      {/* View Transporter Details Modal */}
      {viewTransporterModal && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] px-[2.5vw] py-2">
          <div className="bg-white rounded-2xl shadow-2xl flex flex-col" style={{ width: '85vw', maxWidth: '1200px', height: '90vh' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-10 py-5 rounded-t-2xl shrink-0" style={{ background: 'linear-gradient(135deg,#1E3F63 0%,#2f5e8f 100%)' }}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                    <rect x="1" y="3" width="15" height="13"/>
                    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                    <circle cx="5.5" cy="18.5" r="2.5"/>
                    <circle cx="18.5" cy="18.5" r="2.5"/>
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Transporter Details</h2>
                  <p className="text-blue-200 text-xs mt-0.5">View complete transporter information</p>
                </div>
              </div>
              <button onClick={() => setViewTransporterModal(null)} className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 min-h-0 overflow-y-auto px-14 py-9">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                        <td className="px-4 py-3 text-gray-600 font-medium">Transporter ID</td>
                        <td className="px-4 py-3 text-gray-900 font-semibold">{viewTransporterModal.transporterId}</td>
                      </tr>
                      <tr className="border-b border-gray-100 hover:bg-gray-50 transition">
                        <td className="px-4 py-3 text-gray-600 font-medium">Name</td>
                        <td className="px-4 py-3 text-gray-900">{viewTransporterModal.name}</td>
                      </tr>
                      <tr className="border-b border-gray-100 hover:bg-gray-50 transition">
                        <td className="px-4 py-3 text-gray-600 font-medium">Main Phone</td>
                        <td className="px-4 py-3 text-gray-900">{viewTransporterModal.mainPhone || viewTransporterModal.phone}</td>
                      </tr>
                      <tr className="border-b border-gray-100 hover:bg-gray-50 transition">
                        <td className="px-4 py-3 text-gray-600 font-medium">Email</td>
                        <td className="px-4 py-3 text-gray-900">{viewTransporterModal.email || '-'}</td>
                      </tr>
                      <tr className="border-b border-gray-100 hover:bg-gray-50 transition">
                        <td className="px-4 py-3 text-gray-600 font-medium">Lorry Number</td>
                        <td className="px-4 py-3 text-gray-900">{viewTransporterModal.lorryNumber}</td>
                      </tr>
                      <tr className="border-b border-gray-100 hover:bg-gray-50 transition">
                        <td className="px-4 py-3 text-gray-600 font-medium">Registration Date</td>
                        <td className="px-4 py-3 text-gray-900">{viewTransporterModal.registrationDate ? formatDate(viewTransporterModal.registrationDate) : 'N/A'}</td>
                      </tr>
                      <tr className="border-b border-gray-100 hover:bg-gray-50 transition">
                        <td className="px-4 py-3 text-gray-600 font-medium">Type</td>
                        <td className="px-4 py-3 text-gray-900">{viewTransporterModal.transporterType || 'Non FCL'}</td>
                      </tr>
                      {viewTransporterModal.transporterType === 'FCL' && (
                        <>
                          <tr className="border-b border-gray-100 hover:bg-gray-50 transition">
                            <td className="px-4 py-3 text-gray-600 font-medium">Driver Name</td>
                            <td className="px-4 py-3 text-gray-900">{viewTransporterModal.driverName || '-'}</td>
                          </tr>
                          <tr className="border-b border-gray-100 hover:bg-gray-50 transition">
                            <td className="px-4 py-3 text-gray-600 font-medium">Size</td>
                            <td className="px-4 py-3 text-gray-900">{viewTransporterModal.size || '-'}</td>
                          </tr>
                        </>
                      )}
                      <tr className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3 text-gray-600 font-medium">Status</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${viewTransporterModal.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {viewTransporterModal.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Address Information */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#1E3F63" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                    <span className="text-xs font-bold text-[#1E3F63] uppercase tracking-wider">Address Information</span>
                  </div>
                  <div className="px-4 py-4">
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {viewTransporterModal.addressNumber}, {viewTransporterModal.addressStreet1}
                      {viewTransporterModal.addressStreet2 && <>, {viewTransporterModal.addressStreet2}</>}
                      <br/>{viewTransporterModal.addressCity}, {viewTransporterModal.addressDistrict}
                      <br/>{viewTransporterModal.addressCountry || 'Sri Lanka'}
                    </p>
                  </div>
                </div>

                {/* Contact Persons */}
                {viewTransporterModal.contactPersons && viewTransporterModal.contactPersons.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden lg:col-span-2">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50">
                      <svg viewBox="0 0 24 24" fill="none" stroke="#1E3F63" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                      </svg>
                      <span className="text-xs font-bold text-[#1E3F63] uppercase tracking-wider">Contact Persons</span>
                    </div>
                    <div className="px-4 py-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                      {viewTransporterModal.contactPersons.map((cp, idx) => (
                        <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                          <p className="font-semibold text-gray-900 text-sm">{cp.name}</p>
                          <p className="text-gray-600 text-sm mt-1 flex items-center gap-2">
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                            </svg>
                            {cp.phone}
                          </p>
                          {cp.email && (
                            <p className="text-gray-600 text-sm mt-1 flex items-center gap-2">
                              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                                <polyline points="22,6 12,13 2,6"/>
                              </svg>
                              {cp.email}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Assigned Jobs */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden lg:col-span-2">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
                    <div className="flex items-center gap-2">
                      <svg viewBox="0 0 24 24" fill="none" stroke="#1E3F63" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                        <polyline points="10 9 9 9 8 9"/>
                      </svg>
                      <span className="text-xs font-bold text-[#1E3F63] uppercase tracking-wider">Assigned Jobs</span>
                    </div>
                    <span className="text-xs text-gray-600">{getAssignedJobs(viewTransporterModal).length} job(s)</span>
                  </div>
                  <div className="px-4 py-4">
                    {getAssignedJobs(viewTransporterModal).length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" className="mx-auto mb-2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                        </svg>
                        <p className="text-sm">No jobs assigned to this transporter</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="px-3 py-2 text-left text-xs font-bold text-gray-700">Job ID</th>
                              <th className="px-3 py-2 text-left text-xs font-bold text-gray-700">Category</th>
                              <th className="px-3 py-2 text-left text-xs font-bold text-gray-700">Delivery Date</th>
                              <th className="px-3 py-2 text-left text-xs font-bold text-gray-700">Cost</th>
                              <th className="px-3 py-2 text-left text-xs font-bold text-gray-700">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {getAssignedJobs(viewTransporterModal).slice(0, 10).map(job => (
                              <tr key={job.jobId} className="hover:bg-gray-50">
                                <td className="px-3 py-2 text-gray-900 font-medium">{job.jobId}</td>
                                <td className="px-3 py-2 text-gray-600">{job.shipmentCategory || '-'}</td>
                                <td className="px-3 py-2 text-gray-600">{job.transportDeliveryDate ? formatDate(job.transportDeliveryDate) : '-'}</td>
                                <td className="px-3 py-2 text-gray-900">LKR {formatAmount(getTransporterCostAmount(job))}</td>
                                <td className="px-3 py-2">
                                  {isTransporterCostPaid(job) ? (
                                    <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">Paid</span>
                                  ) : (
                                    <span className="inline-block px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">Unpaid</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {getAssignedJobs(viewTransporterModal).length > 10 && (
                          <p className="text-xs text-gray-500 mt-2 text-center">Showing 10 of {getAssignedJobs(viewTransporterModal).length} jobs</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              {canManageTransporters && (
                <div className="mt-6 flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
                  <button 
                    onClick={() => {
                      setViewTransporterModal(null);
                      openEditModal(viewTransporterModal);
                    }} 
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    Edit Transporter
                  </button>
                  <button 
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to deactivate ${viewTransporterModal.name}?`)) {
                        handleDeactivate(viewTransporterModal.transporterId);
                        setViewTransporterModal(null);
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
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default Transporters;
