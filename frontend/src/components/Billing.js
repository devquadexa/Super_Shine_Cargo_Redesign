import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { billingService } from '../api/services/billingService';
import { jobService } from '../api/services/jobService';
import { customerService } from '../api/services/customerService';
import { transporterService } from '../api/services/transporterService';
import { invoiceReviewService } from '../api/services/invoiceReviewService';
import API_BASE from '../api/config';
import apiClient from '../api/client';
import Pagination from './Pagination';
import ReviewInvoiceModal from './ReviewInvoiceModal';
import { formatDate, formatDateWithMonth, formatDateWithFullMonth } from '../utils/dateFormatter';


function Billing() {
  const { user } = useAuth();
  
  // Format number with thousand separators
  const formatAmount = (amount) => {
    return parseFloat(amount || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const isVehicleShipmentCategory = (category) => {
    return category === 'Vehicle - Personal' || category === 'Vehicle - Company' || category === 'Vehicle';
  };

  const getTransporterCostItem = () => {
    // Always build transporter cost description with place names
    const fromPlace = selectedJob?.exporter || 'placename';
    const toPlace = selectedJob?.transporter || 'placename';
    const description = `transporter cost (from ${fromPlace} to ${toPlace})`;
    
    return {
      name: description,
      actualCost: '',
      billingAmount: '',
      sameAmount: false,
      hasBill: false
    };
  };

  // Transform pay item description - only replace if it uses placeholder names
  const getDisplayDescription = (item, job = selectedJob) => {
    const description = item.description || item.name || '';
    const normalized = description.toLowerCase().trim();
    
    // If it's the old format transporter cost with NO custom places, add the actual place names
    if (normalized === 'transporter cost' && job) {
      const fromPlace = job.exporter || 'placename';
      const toPlace = job.transporter || 'placename';
      return `transporter cost (from ${fromPlace} to ${toPlace})`;
    }
    
    return description;
  };

  const getBlankPayItem = () => ({
    name: '',
    actualCost: '',
    billingAmount: '',
    sameAmount: false,
    hasBill: false
  });

  const hasTransporterCostItem = (items) => {
    return Array.isArray(items) && items.some(item => {
      const label = (item?.name || item?.description || '').toLowerCase().trim();
      // Only check for new format with place names
      return label.startsWith('transporter cost (from');
    });
  };

  const isTransporterCostLabel = (value) => {
    const normalized = String(value || '').toLowerCase().trim();
    // Only check for new format with place names
    return normalized.startsWith('transporter cost (from');
  };

  const mergeTransporterCostItems = (items) => {
    if (!Array.isArray(items) || items.length === 0) {
      return [];
    }

    const merged = [];
    let transporterAccumulator = null;

    items.forEach((item) => {
      const description = item.description || item.name || '';
      if (!isTransporterCostLabel(description)) {
        merged.push(item);
        return;
      }

      if (!transporterAccumulator) {
        transporterAccumulator = {
          ...item,
          description: description, // Keep the full description with place names
          amount: parseFloat(item.amount || item.actualCost || 0) || 0,
          actualCost: parseFloat(item.actualCost || item.amount || 0) || 0,
          billingAmount: parseFloat(item.billingAmount || item.amount || item.actualCost || 0) || 0
        };
        return;
      }

      transporterAccumulator.amount += parseFloat(item.amount || item.actualCost || 0) || 0;
      transporterAccumulator.actualCost += parseFloat(item.actualCost || item.amount || 0) || 0;
      transporterAccumulator.billingAmount += parseFloat(item.billingAmount || item.amount || item.actualCost || 0) || 0;
    });

    if (transporterAccumulator) {
      merged.push(transporterAccumulator);
    }

    return merged;
  };

  const ensureFclTransporterCost = (items, shipmentCategory) => {
    const normalizedItems = Array.isArray(items) ? [...items] : [];
    if (shipmentCategory !== 'FCL') return normalizedItems;

    const fclItems = normalizedItems.filter(item => {
      const label = (item?.name || item?.description || '').trim();
      const hasAmount = item?.actualCost || item?.billingAmount || item?.amount;
      return Boolean(label || hasAmount);
    });

    if (!hasTransporterCostItem(fclItems)) {
      fclItems.push(getTransporterCostItem());
    }

    return fclItems;
  };

  const getDefaultPayItemsForCategory = (shipmentCategory) => {
    return ensureFclTransporterCost([], shipmentCategory);
  };

  const getAssignedClerks = () => {
    if (!selectedJob || !selectedJob.assignedUsers) {
      return [];
    }
    return selectedJob.assignedUsers;
  };

  const formatCusdecNumberForDisplay = (value) => {
    const rawValue = (value || '').trim();
    if (!rawValue) return '';

    const cleaned = rawValue.replace(/^i\s*-\s*/i, '').trim();
    return cleaned ? `I-${cleaned}` : '';
  };

  const formatCusdecWithDate = (cusdecNumber, cusdecDate) => {
    const formattedNumber = formatCusdecNumberForDisplay(cusdecNumber);
    if (!formattedNumber) return '-';

    const formattedDate = formatDate(cusdecDate);
    return formattedDate ? `${formattedNumber} of ${formattedDate}` : formattedNumber;
  };

  const [bills, setBills] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [transporters, setTransporters] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [message, setMessage] = useState('');
  const [showPayItemsRow, setShowPayItemsRow] = useState(false);
  const [payItems, setPayItems] = useState([]);
  const [loadingSettlement, setLoadingSettlement] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const [expandedBillId, setExpandedBillId] = useState(null);
  const [printMode, setPrintMode] = useState('color');
  const [showPaymentBreakdownModal, setShowPaymentBreakdownModal] = useState(false);
  const [paymentBreakdownBill, setPaymentBreakdownBill] = useState(null);
  const [showNewInvoiceModal, setShowNewInvoiceModal] = useState(false);
  
  // New states for pay item editing
  const [editingPayItemIndex, setEditingPayItemIndex] = useState(null);
  const [editingBillingAmount, setEditingBillingAmount] = useState('');
  
  // Payment modal states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedBillForPayment, setSelectedBillForPayment] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [chequeNumber, setChequeNumber] = useState('');
  const [chequeDate, setChequeDate] = useState('');
  const [chequeAmount, setChequeAmount] = useState('');
  const [bankName, setBankName] = useState('Commercial Bank');
  const [chequeAutoFilled, setChequeAutoFilled] = useState(false);
  const [chequeAutoFillData, setChequeAutoFillData] = useState(null);
  const [chequeType, setChequeType] = useState('new'); // 'new' | 'existing'
  const [existingCheques, setExistingCheques] = useState([]);
  const [loadingExistingCheques, setLoadingExistingCheques] = useState(false);
  const [paymentMode, setPaymentMode] = useState('full'); // 'full' | 'partial'
  const [partialPaymentAmount, setPartialPaymentAmount] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(20);
  const [statusFilter, setStatusFilter] = useState('All');
  const [customerFilter, setCustomerFilter] = useState('All');
  const [showGeneratedInvoices, setShowGeneratedInvoices] = useState(true);
  const [showOldInvoices, setShowOldInvoices] = useState(false);
  
  // Old Invoices states
  const [oldInvoices, setOldInvoices] = useState([]);
  const [showOldInvoiceModal, setShowOldInvoiceModal] = useState(false);
  const [showOldPaymentModal, setShowOldPaymentModal] = useState(false);
  const [editingOldInvoice, setEditingOldInvoice] = useState(null);
  const [selectedOldInvoice, setSelectedOldInvoice] = useState(null);
  const [expandedOldInvoiceRow, setExpandedOldInvoiceRow] = useState(null);
  const [oldInvoiceFormData, setOldInvoiceFormData] = useState({
    customerId: '',
    cusdecNumber: '',
    cusdecDate: '',
    invoiceDate: '',
    invoiceNumberSuffix: '',
    totalAmount: '',
    settleDate: ''
  });
  const [oldInvoicePaymentData, setOldInvoicePaymentData] = useState({
    paymentAmount: '',
    paymentMethod: 'Cash',
    receivedDate: new Date().toISOString().split('T')[0],
    notes: '',
    chequeNumber: '',
    chequeDate: '',
    chequeAmount: '',
    bankName: ''
  });
  const [oldInvoiceFormErrors, setOldInvoiceFormErrors] = useState({});
  const [oldInvoiceSearchTerm, setOldInvoiceSearchTerm] = useState('');
  const [oldInvoiceFilterStatus, setOldInvoiceFilterStatus] = useState('All');
  
  // Review Invoice states
  const [showReviewInvoiceModal, setShowReviewInvoiceModal] = useState(false);
  const [reviewInvoiceLoading, setReviewInvoiceLoading] = useState(false);
  const [showJobInfoModal, setShowJobInfoModal] = useState(false);

  useEffect(() => {
    fetchBills();
    fetchJobs();
    fetchCustomers();
    fetchTransporters();
    fetchOldInvoices();
  }, []);

  const fetchBills = async () => {
    try {
      const data = await billingService.getBills();
      
      // Fetch payment records for each bill
      const billsWithPayments = await Promise.all(
        data.map(async (bill) => {
          try {
            const paymentRecords = await apiClient.get(`/payments/bill/${bill.billId}`);
            // Ensure paymentRecords is always an array
            const records = Array.isArray(paymentRecords.data) ? paymentRecords.data : [];
            return {
              ...bill,
              paymentRecords: records
            };
          } catch (error) {
            console.warn(`Could not fetch payment records for bill ${bill.billId}:`, error);
            // Always return an empty array, never undefined or null
            return {
              ...bill,
              paymentRecords: []
            };
          }
        })
      );
      
      setBills(billsWithPayments);
    } catch (error) {
      console.error('Error fetching bills:', error);
    }
  };

  const fetchJobs = async () => {
    try {
      const data = await jobService.getAll();
      setJobs(data);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const data = await customerService.getAll();
      setCustomers(data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchTransporters = async () => {
    try {
      const data = await transporterService.getAll();
      setTransporters(data);
    } catch (error) {
      console.error('Error fetching transporters:', error);
    }
  };

  const fetchOldInvoices = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/old-invoices`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch old invoices');
      }
      
      const data = await response.json();
      setOldInvoices(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching old invoices:', error);
      setOldInvoices([]);
    }
  };

  const handleTransporterChange = async (transporterId) => {
    if (!selectedJob || !transporterId) return;

    try {
      // Find the transporter name from the transporterId
      const selectedTransporter = transporters.find(t => t.transporterId == transporterId);
      if (!selectedTransporter) {
        setMessage('Transporter not found');
        return;
      }

      // Update job with new transporter name
      await jobService.update(selectedJob.jobId, {
        transporter: selectedTransporter.name
      });

      // Update selected job state
      setSelectedJob({
        ...selectedJob,
        transporter: selectedTransporter.name
      });

      setMessage('Transporter updated successfully!');
      setTimeout(() => setMessage(''), 3000);

      // Refresh jobs list
      fetchJobs();
    } catch (error) {
      console.error('Error updating transporter:', error);
      setMessage('Error updating transporter');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const openNewInvoiceModal = () => {
    setSelectedJob(null);
    setPayItems([]);
    setShowPayItemsRow(false);
    setShowNewInvoiceModal(true);
  };

  const closeNewInvoiceModal = () => {
    setShowNewInvoiceModal(false);
    setSelectedJob(null);
    setPayItems([]);
    setShowPayItemsRow(false);
  };

  const handleJobSelect = async (jobId) => {
    if (!jobId) {
      setSelectedJob(null);
      setPayItems([]);
      setShowPayItemsRow(false);
      return;
    }
    
    console.log('handleJobSelect - jobId:', jobId);
    
    // Fetch fresh job data
    try {
      const allJobs = await jobService.getAll();
      const job = allJobs.find(j => j.jobId === jobId);
      
      console.log('handleJobSelect - found job:', job);
      console.log('handleJobSelect - job pettyCashStatus:', job?.pettyCashStatus);
      
      setSelectedJob(job);
      setShowPayItemsRow(false);
      
      // Collect all pay items from different sources
      let allPayItems = [];
      
      // 1. Load Office Pay Items (upfront payments by office staff)
      try {
        const officePayItemsResponse = await fetch(`${API_BASE}/api/office-pay-items/job/${jobId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (officePayItemsResponse.ok) {
          const officePayItems = await officePayItemsResponse.json();
          console.log('Office pay items:', officePayItems);
          
          // Add office pay items to the list
          officePayItems.forEach(item => {
            allPayItems.push({
              name: item.description,
              actualCost: item.actualCost,
              billingAmount: item.billingAmount || '', // May already be set
              sameAmount: false,
              paidBy: item.paidBy,
              paidByName: item.paidByName,
              hasBill: item.hasBill || false,
              isOfficePayItem: true,
              officePayItemId: item.officePayItemId
            });
          });
        }
      } catch (error) {
        console.error('Error loading office pay items:', error);
      }
      
      // 2. Load Petty Cash Settlement Items (if settled)
      if (job?.pettyCashStatus === 'Settled') {
        console.log('Petty cash is settled, loading ALL settlement data...');
        setLoadingSettlement(true);
        try {
          // Fetch ALL assignments for this job
          const response = await fetch(`${API_BASE}/api/petty-cash-assignments/job/${jobId}/all`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          
          console.log('Settlement response status:', response.status);
          
          if (response.ok) {
            const assignments = await response.json();
            console.log('All assignments for job:', assignments);
            
            // Collect ALL settlement items from ALL assignments
            if (Array.isArray(assignments)) {
              assignments.forEach(assignment => {
                if (assignment.settlementItems && Array.isArray(assignment.settlementItems)) {
                  assignment.settlementItems.forEach(item => {
                    allPayItems.push({
                      name: item.itemName,
                      actualCost: item.actualCost,
                      billingAmount: '', // Leave empty for Admin/Manager to fill
                      sameAmount: false,
                      paidBy: item.paidBy || assignment.assignedTo,
                      paidByName: item.paidByName || assignment.assignedToName,
                      isCustomItem: item.isCustomItem,
                      hasBill: item.hasBill === true || item.hasBill === 1,
                      isPettyCashItem: true
                    });
                  });
                }
              });
            }
          } else {
            const errorText = await response.text();
            console.log('Failed to fetch settlements. Status:', response.status, 'Error:', errorText);
          }
        } catch (error) {
          console.error('Error loading settlement:', error);
        } finally {
          setLoadingSettlement(false);
        }
      }
      
      // 3. Smart UI Logic: Only show entry form if no pay items exist in the job
      const hasExistingPayItems = job.payItems && job.payItems.length > 0;

      if (hasExistingPayItems) {
        // Job has saved pay items ï¿½ merge any office pay items not already saved
        let mergedPayItems = [...job.payItems];
        const officeItemsFromApi = allPayItems.filter(item => item.isOfficePayItem);
        officeItemsFromApi.forEach(opi => {
          const alreadySaved = mergedPayItems.some(
            p => p.source === 'Office Payment' && p.description === opi.name
          );
          if (!alreadySaved) {
            mergedPayItems.push({
              description: opi.name,
              amount: parseFloat(opi.actualCost),
              actualCost: parseFloat(opi.actualCost),
              billingAmount: parseFloat(opi.billingAmount || opi.actualCost || 0),
              paidBy: opi.paidByName || opi.paidBy || 'Office',
              source: 'Office Payment',
              officePayItemId: opi.officePayItemId
            });
          }
        });
        mergedPayItems = ensureFclTransporterCost(mergedPayItems, job.shipmentCategory);
        setSelectedJob({ ...job, payItems: mergedPayItems });
        setShowPayItemsRow(false);
        setMessage(`✅ Job has ${mergedPayItems.length} pay items. Use "+ Add More Items" to add additional items.`);
        setTimeout(() => setMessage(''), 5000);
      } else if (allPayItems.length > 0) {
        const payItemsWithFclItem = ensureFclTransporterCost(allPayItems, job.shipmentCategory);
        setPayItems(payItemsWithFclItem);
        setShowPayItemsRow(true);
        
        const officeItemsCount = allPayItems.filter(item => item.isOfficePayItem).length;
        const pettyCashItemsCount = allPayItems.filter(item => item.isPettyCashItem).length;
        let message = `✅ Loaded ${allPayItems.length} items: `;
        if (officeItemsCount > 0) message += `${officeItemsCount} office payments`;
        if (pettyCashItemsCount > 0) {
          if (officeItemsCount > 0) message += `, `;
          message += `${pettyCashItemsCount} petty cash items`;
        }
        message += '. Please review billing amounts.';
        setMessage(message);
        setTimeout(() => setMessage(''), 5000);
      } else {
        // No existing pay items, no office/petty cash items ï¿½ show entry form or load templates
        if (job?.pettyCashStatus !== 'Settled') {
          setMessage('Petty cash must be settled before generating invoice');
          setTimeout(() => setMessage(''), 3000);
        } else {
          loadPayItemTemplates(job);
          return;
        }
        const defaultPayItems = getDefaultPayItemsForCategory(job?.shipmentCategory);
        setPayItems(defaultPayItems);
        setShowPayItemsRow(defaultPayItems.length > 0);
      }
    } catch (error) {
      console.error('Error fetching job:', error);
      setMessage('Error loading job details');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const loadPayItemTemplates = async (job) => {
    // Auto-load pay item templates based on shipment category
    if (job?.shipmentCategory && (!job.payItems || job.payItems.length === 0)) {
      console.log('Loading pay item templates for category:', job.shipmentCategory);
      try {
        const response = await fetch(`${API_BASE}/api/pay-item-templates/category/${encodeURIComponent(job.shipmentCategory)}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          const templates = await response.json();
          console.log('Loaded templates:', templates);
          
          if (templates && templates.length > 0) {
            // Convert templates to pay items format
            const loadedPayItems = templates.map(template => ({
              name: template.itemName,
              actualCost: '',
              billingAmount: '',
              sameAmount: false,
              hasBill: false
            }));

            const payItemsWithFclItem = ensureFclTransporterCost(loadedPayItems, job.shipmentCategory);
            
            setPayItems(payItemsWithFclItem);
            setShowPayItemsRow(true);
            setMessage(`Loaded ${payItemsWithFclItem.length} default pay items for ${job.shipmentCategory}`);
            setTimeout(() => setMessage(''), 3000);
          } else {
            const defaultPayItems = getDefaultPayItemsForCategory(job.shipmentCategory);
            setPayItems(defaultPayItems);
            setShowPayItemsRow(defaultPayItems.length > 0);
          }
        } else {
          const defaultPayItems = getDefaultPayItemsForCategory(job.shipmentCategory);
          setPayItems(defaultPayItems);
          setShowPayItemsRow(defaultPayItems.length > 0);
        }
      } catch (error) {
        console.error('Error loading pay item templates:', error);
        const defaultPayItems = getDefaultPayItemsForCategory(job.shipmentCategory);
        setPayItems(defaultPayItems);
        setShowPayItemsRow(defaultPayItems.length > 0);
      }
    } else {
      setPayItems(getDefaultPayItemsForCategory(job?.shipmentCategory));
    }
  };

  const addPayItemRow = () => {
    setPayItems([...payItems, getBlankPayItem()]);
  };

  const openPayItemsEditor = () => {
    setShowPayItemsRow(true);
    if (!Array.isArray(payItems) || payItems.length === 0) {
      setPayItems([getBlankPayItem()]);
    }
  };

  const addTransporterCostRow = () => {
    // Check if transporter cost already exists
    if (hasTransporterCostItem(payItems)) {
      setMessage('Transporter cost is already added. Use the existing row or remove it first.');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    setPayItems((prevPayItems) => [...prevPayItems, getTransporterCostItem()]);
    setShowPayItemsRow(true);
  };

  const addTransporterCostFromHeader = () => {
    // Check if transporter cost already exists
    if (hasTransporterCostItem(payItems)) {
      setMessage('Transporter cost is already added. Use the existing row or remove it first.');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    setShowPayItemsRow(true);
    setPayItems((prevPayItems) => [...prevPayItems, getTransporterCostItem()]);
  };

  const removePayItemRow = (index) => {
    const newPayItems = payItems.filter((_, i) => i !== index);
    setPayItems(newPayItems.length > 0 ? newPayItems : [getBlankPayItem()]);
  };

  const handlePayItemChange = (index, field, value) => {
    const newPayItems = [...payItems];
    newPayItems[index][field] = value;
    
    // If sameAmount checkbox is checked, copy actualCost to billingAmount
    if (field === 'sameAmount' && value) {
      newPayItems[index].billingAmount = newPayItems[index].actualCost;
    }
    
    // If actualCost changes and sameAmount is checked, update billingAmount
    if (field === 'actualCost' && newPayItems[index].sameAmount) {
      newPayItems[index].billingAmount = value;
    }
    
    setPayItems(newPayItems);
  };

  const savePayItems = async () => {
    // Validate pay items - must have name, actualCost, and billingAmount
    const validPayItems = payItems.filter(item => {
      return item.name && 
             (item.actualCost || item.actualCost === 0) && 
             (item.billingAmount || item.billingAmount === 0);
    });
    
    if (validPayItems.length === 0) {
      setMessage('Please fill in all required fields (Description, Actual Cost, Billing Amount) for at least one pay item');
      setTimeout(() => setMessage(''), 5000);
      return;
    }

    try {
      console.log('=== SAVE PAY ITEMS START ===');
      console.log('New pay items to save:', validPayItems);
      console.log('Existing job pay items:', selectedJob.payItems);
      
      // Separate office pay items, petty cash items, and custom pay items
      const officePayItems = validPayItems.filter(item => item.isOfficePayItem);
      const pettyCashItems = validPayItems.filter(item => item.isPettyCashItem);
      const customPayItems = validPayItems.filter(item => !item.isOfficePayItem && !item.isPettyCashItem);
      
      console.log('Office pay items to update:', officePayItems);
      console.log('Petty cash items to update:', pettyCashItems);
      console.log('Custom pay items to add:', customPayItems);
      
      // 1. Update billing amounts for office pay items
      for (const item of officePayItems) {
        if (item.officePayItemId) {
          try {
            const response = await fetch(`${API_BASE}/api/office-pay-items/${item.officePayItemId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              },
              body: JSON.stringify({
                billingAmount: parseFloat(item.billingAmount),
                hasBill: item.hasBill || false
              })
            });
            
            if (!response.ok) {
              throw new Error(`Failed to update office pay item: ${response.statusText}`);
            }
            
            console.log(`? Updated billing amount for office pay item ${item.officePayItemId}`);
          } catch (error) {
            console.error(`? Error updating office pay item ${item.officePayItemId}:`, error);
            throw error;
          }
        }
      }
      
      // 2. Update billing amounts for petty cash items (if needed)
      for (const item of pettyCashItems) {
        console.log(`Petty cash item: ${item.name} - Actual: ${item.actualCost}, Billing: ${item.billingAmount}`);
        // Petty cash items are typically read-only in the billing section
        // but we log them for reference
      }
      
      // 3. APPEND new pay items to existing ones instead of replacing
      // Get existing pay items from the job
      const existingPayItems = selectedJob.payItems || [];
      console.log('Existing pay items count:', existingPayItems.length);
      
      // Convert new pay items to the format expected by the job
      const newPayItemsData = validPayItems.map(item => ({
        description: item.name,
        amount: parseFloat(item.actualCost),
        actualCost: parseFloat(item.actualCost),
        billingAmount: parseFloat(item.billingAmount),
        paidBy: item.paidByName || item.paidBy || 'Office',
        source: item.isOfficePayItem ? 'Office Payment' : item.isPettyCashItem ? 'Petty Cash' : 'Custom'
      }));
      
      // Combine existing and new pay items
      const allPayItemsData = [...existingPayItems, ...newPayItemsData];

      const transporterCostCount = allPayItemsData.filter(item =>
        isTransporterCostLabel(item.description || item.name)
      ).length;

      let finalPayItemsData = allPayItemsData;
      if (transporterCostCount > 1) {
        const shouldMergeTransporterCost = window.confirm(
          'Transporter cost is already added.\n\nPress OK to merge with the existing transporter cost amount.\nPress Cancel to keep it as a separate line item.'
        );

        if (shouldMergeTransporterCost) {
          finalPayItemsData = mergeTransporterCostItems(allPayItemsData);
        }
      }
      
      console.log('New pay items to add:', newPayItemsData);
      console.log('Combined pay items (existing + new):', allPayItemsData);
      console.log('Final pay items to save:', finalPayItemsData);
      
      // Save combined pay items to the job
      await jobService.replacePayItems(selectedJob.jobId, finalPayItemsData);
      console.log('? All pay items saved successfully');

      const isAddingToExisting = existingPayItems.length > 0;
      const addedCount = newPayItemsData.length;
      const totalCount = finalPayItemsData.length;
      
      if (isAddingToExisting) {
        setMessage(`✅ Added ${addedCount} new pay item(s) successfully! Total: ${totalCount} items. Review below and generate invoice.`);
      } else {
        setMessage(`✅ ${addedCount} pay item(s) saved successfully! Review the details below and generate invoice.`);
      }
      
      setShowPayItemsRow(false);
      
      // Refresh jobs and selected job to show the saved pay items
      console.log('Refreshing jobs after save...');
      const updatedJobs = await jobService.getAll();
      const updatedJob = updatedJobs.find(j => j.jobId === selectedJob.jobId);
      
      if (updatedJob) {
        // Re-fetch office pay items and merge into the review table
        let mergedPayItems = [...(updatedJob.payItems || [])];
        try {
          const officeRes = await fetch(`${API_BASE}/api/office-pay-items/job/${selectedJob.jobId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });
          if (officeRes.ok) {
            const freshOfficeItems = await officeRes.json();
            // Add office pay items that are not already in the saved payItems
            freshOfficeItems.forEach(opi => {
              const alreadySaved = mergedPayItems.some(
                p => p.source === 'Office Payment' && p.description === opi.description
              );
              if (!alreadySaved) {
                mergedPayItems.push({
                  description: opi.description,
                  amount: parseFloat(opi.actualCost),
                  actualCost: parseFloat(opi.actualCost),
                  billingAmount: parseFloat(opi.billingAmount || opi.actualCost),
                  paidBy: opi.paidByName || opi.paidBy || 'Office',
                  source: 'Office Payment',
                  officePayItemId: opi.officePayItemId
                });
              }
            });
          }
        } catch (err) {
          console.error('Error re-fetching office pay items after save:', err);
        }
        setSelectedJob({ ...updatedJob, payItems: mergedPayItems });
        console.log('? Selected job updated with merged pay items:', mergedPayItems.length);
      } else {
        console.error('? Could not find updated job');
        setSelectedJob({
          ...selectedJob,
          payItems: allPayItemsData
        });
      }
      
      // Reset the pay items form
      setPayItems([]);
      
      setTimeout(() => setMessage(''), 5000);
      console.log('=== SAVE PAY ITEMS END ===');
    } catch (error) {
      console.error('Error saving pay items:', error);
      setMessage(`Error saving pay items: ${error.message}`);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  const calculateTotals = () => {
    if (!selectedJob || !selectedJob.payItems) {
      console.log('calculateTotals - No job or pay items');
      return { actualCost: 0, billingAmount: 0, profit: 0, grossTotal: 0, advancePayment: 0, netTotal: 0 };
    }
    
    console.log('calculateTotals - payItems:', selectedJob.payItems);
    
    const actualCost = selectedJob.payItems.reduce((sum, item) => {
      const value = parseFloat(item.actualCost) || parseFloat(item.amount) || 0;
      console.log(`calculateTotals - actualCost item: ${item.description}, value: ${value}`);
      return sum + value;
    }, 0);
    
    const billingAmount = selectedJob.payItems.reduce((sum, item) => {
      const value = parseFloat(item.billingAmount) || parseFloat(item.amount) || 0;
      console.log(`calculateTotals - billingAmount item: ${item.description}, value: ${value}`);
      return sum + value;
    }, 0);
    
    const profit = billingAmount - actualCost;
    const grossTotal = billingAmount; // Total before advance deduction
    const advancePayment = parseFloat(selectedJob.advancePayment) || 0;
    const netTotal = grossTotal - advancePayment; // Final amount after advance deduction
    
    console.log('calculateTotals - result:', { actualCost, billingAmount, profit, grossTotal, advancePayment, netTotal });
    console.log('calculateTotals - formatted result:', { 
      actualCost: formatAmount(actualCost), 
      billingAmount: formatAmount(billingAmount), 
      profit: formatAmount(profit),
      grossTotal: formatAmount(grossTotal),
      advancePayment: formatAmount(advancePayment),
      netTotal: formatAmount(netTotal)
    });
    
    return { actualCost, billingAmount, profit, grossTotal, advancePayment, netTotal };
  };

  // Calculate real-time totals from unsaved pay items (before saving)
  const calculateUnsavedTotals = () => {
    // For actual cost: include items that have a name and actual cost (regardless of billing amount)
    const itemsWithActualCost = payItems.filter(item => {
      return item.name && (item.actualCost || item.actualCost === 0 || item.actualCost === '0');
    });
    
    // For billing amount: include items that have a name and billing amount
    const itemsWithBillingAmount = payItems.filter(item => {
      return item.name && (item.billingAmount || item.billingAmount === 0 || item.billingAmount === '0');
    });
    
    // For profit calculation: only items with BOTH actual cost and billing amount
    const itemsWithBoth = payItems.filter(item => {
      return item.name && 
             (item.actualCost || item.actualCost === 0 || item.actualCost === '0') && 
             (item.billingAmount || item.billingAmount === 0 || item.billingAmount === '0');
    });
    
    const actualCost = itemsWithActualCost.reduce((sum, item) => {
      return sum + (parseFloat(item.actualCost) || 0);
    }, 0);
    
    const billingAmount = itemsWithBillingAmount.reduce((sum, item) => {
      return sum + (parseFloat(item.billingAmount) || 0);
    }, 0);
    
    const profit = billingAmount - actualCost;
    const profitMargin = actualCost > 0 ? ((profit / actualCost) * 100) : 0;
    
    return { 
      actualCost, 
      billingAmount, 
      profit, 
      profitMargin, 
      actualCostItemCount: itemsWithActualCost.length,
      billingAmountItemCount: itemsWithBillingAmount.length,
      profitItemCount: itemsWithBoth.length
    };
  };

  // Helper function to check if user can edit pay items
  const canEditPayItems = () => {
    return user?.role === 'Super Admin' || user?.role === 'Admin' || user?.role === 'Manager';
  };

  // Start inline editing for a pay item
  const startEditingPayItem = (index) => {
    if (!canEditPayItems()) {
      setMessage('⚠️ Only Super Admin, Admin, and Manager users can edit pay items. Please contact an administrator for changes.');
      setTimeout(() => setMessage(''), 5000);
      return;
    }
    
    const payItem = selectedJob.payItems[index];
    setEditingPayItemIndex(index);
    setEditingBillingAmount(payItem.billingAmount || payItem.amount || '');
  };

  // Cancel inline editing
  const cancelEditingPayItem = () => {
    setEditingPayItemIndex(null);
    setEditingBillingAmount('');
  };

  // Save inline edited pay item
  const saveInlineEditedPayItem = async () => {
    if (editingPayItemIndex === null) return;
    
    const newBillingAmount = parseFloat(editingBillingAmount);
    if (isNaN(newBillingAmount) || newBillingAmount < 0) {
      setMessage('❌ Please enter a valid billing amount');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    try {
      // Update the pay item in the selectedJob
      const updatedPayItems = [...selectedJob.payItems];
      updatedPayItems[editingPayItemIndex] = {
        ...updatedPayItems[editingPayItemIndex],
        billingAmount: newBillingAmount
      };

      // Save to backend
      await jobService.replacePayItems(selectedJob.jobId, updatedPayItems);
      
      // Update local state
      setSelectedJob({
        ...selectedJob,
        payItems: updatedPayItems
      });

      setMessage('✅ Pay item billing amount updated successfully');
      setEditingPayItemIndex(null);
      setEditingBillingAmount('');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error updating pay item:', error);
      setMessage('❌ Error updating pay item. Please try again.');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  // Remove a pay item
  const removePayItem = async (index) => {
    if (!canEditPayItems()) {
      setMessage('⚠️ Only Super Admin, Admin, and Manager users can remove pay items. Please contact an administrator for changes.');
      setTimeout(() => setMessage(''), 5000);
      return;
    }

    const payItem = selectedJob.payItems[index];
    const confirmMessage = `Are you sure you want to remove "${payItem.description}" from the invoice?\n\nThis action cannot be undone.`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      // Remove the pay item from the array
      const updatedPayItems = selectedJob.payItems.filter((_, i) => i !== index);

      // Save to backend
      await jobService.replacePayItems(selectedJob.jobId, updatedPayItems);
      
      // Update local state
      setSelectedJob({
        ...selectedJob,
        payItems: updatedPayItems
      });

      setMessage('✅ Pay item removed successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error removing pay item:', error);
      setMessage('❌ Error removing pay item. Please try again.');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const generateBill = async () => {
    console.log('=== GENERATE BILL START ===');
    console.log('generateBill - selectedJob:', selectedJob);
    
    if (!selectedJob) {
      setMessage('Please select a job first');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    
    // Validate required fields before generating invoice
    const missingFields = [];
    if (!selectedJob.blNumber || (typeof selectedJob.blNumber === 'string' && selectedJob.blNumber.trim() === '')) {
      missingFields.push('BL Number');
    }
    if (!selectedJob.cusdecNumber || (typeof selectedJob.cusdecNumber === 'string' && selectedJob.cusdecNumber.trim() === '')) {
      missingFields.push('CUSDEC Number');
    }
    if (!selectedJob.lcNumber || (typeof selectedJob.lcNumber === 'string' && selectedJob.lcNumber.trim() === '')) {
      missingFields.push('TT / LC / DA / DP / NFE Number');
    }
    // Container Number is only required for non-vehicle shipments
    if (
      !isVehicleShipmentCategory(selectedJob.shipmentCategory) &&
      (!selectedJob.containerNumber || (typeof selectedJob.containerNumber === 'string' && selectedJob.containerNumber.trim() === ''))
    ) {
      missingFields.push('Container Number');
    }
    if (
      isVehicleShipmentCategory(selectedJob.shipmentCategory) &&
      (!selectedJob.chassisNumber || (typeof selectedJob.chassisNumber === 'string' && selectedJob.chassisNumber.trim() === ''))
    ) {
      missingFields.push('Chassis Number');
    }
    
    // Transporter and Transport Delivery Date are required only for FCL jobs
    const isFclJob = selectedJob.shipmentCategory === 'FCL';
    if (isFclJob) {
      if (!selectedJob.transporter || (typeof selectedJob.transporter === 'string' && selectedJob.transporter.trim() === '')) {
        missingFields.push('Transporter');
      }
      if (!selectedJob.transportDeliveryDate || (typeof selectedJob.transportDeliveryDate === 'string' && selectedJob.transportDeliveryDate.trim() === '')) {
        missingFields.push('Transport Delivery Date');
      }
    }
    console.log('generateBill - missingFields:', missingFields);
    
    if (missingFields.length > 0) {
      const fieldsList = missingFields.join(', ');
      console.error('BLOCKING INVOICE GENERATION - Missing fields:', fieldsList);
      setValidationMessage(`Please edit the job and complete the following required fields:\n\n${missingFields.map(f => `ï¿½ ${f}`).join('\n')}`);
      setShowValidationModal(true);
      return; // STOP HERE - Do not proceed with invoice generation
    }
    
    console.log('generateBill - All required fields present, continuing...');
    
    // Check if petty cash is settled
    console.log('generateBill - pettyCashStatus:', selectedJob.pettyCashStatus);
    if (selectedJob.pettyCashStatus === 'Assigned') {
      setMessage('Cannot generate invoice: Petty cash must be settled first');
      setTimeout(() => setMessage(''), 5000);
      return;
    }
    
    console.log('generateBill - selectedJob.payItems:', selectedJob.payItems);
    console.log('generateBill - payItems length:', selectedJob.payItems?.length);
    console.log('generateBill - payItems type:', typeof selectedJob.payItems);
    console.log('generateBill - payItems is array:', Array.isArray(selectedJob.payItems));
    
    if (!selectedJob.payItems || selectedJob.payItems.length === 0) {
      setMessage('Please add pay items before generating invoice');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    try {
      console.log('generateBill - calling calculateTotals...');
      const totals = calculateTotals();
      console.log('generateBill - calculated totals:', totals);
      
      if (totals.actualCost === 0 && totals.billingAmount === 0) {
        console.error('ERROR: Totals are 0! Pay items:', selectedJob.payItems);
        setMessage('Error: Unable to calculate totals. Please refresh and try again.');
        setTimeout(() => setMessage(''), 3000);
        return;
      }
      
      const billData = {
        jobId: selectedJob.jobId,
        actualCost: totals.actualCost,
        billingAmount: totals.billingAmount,
        advancePayment: totals.advancePayment,
        grossTotal: totals.grossTotal,
        netTotal: totals.netTotal
      };
      console.log('generateBill - sending billData:', billData);
      
      const result = await billingService.createBill(billData);
      
      // Check if bill generation was blocked (paid/partially paid)
      if (result.blocked) {
        setMessage(`Cannot generate invoice: This job already has an invoice that is ${result.paymentStatus.toLowerCase()}. No changes were made.`);
        setTimeout(() => setMessage(''), 7000);
        console.log('=== GENERATE BILL BLOCKED ===', result.message);
        return;
      }
      
      // Update petty cash assignment status to Closed via direct API call (safety net)
      try {
        const assignmentsRes = await fetch(`${API_BASE}/api/petty-cash-assignments/job/${selectedJob.jobId}/all`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (assignmentsRes.ok) {
          const jobAssignments = await assignmentsRes.json();
          for (const a of jobAssignments) {
            await fetch(`${API_BASE}/api/petty-cash-assignments/${a.assignmentId}/close`, {
              method: 'PATCH',
              headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
          }
        }
      } catch (err) {
        console.warn('Could not close petty cash assignments from frontend:', err.message);
      }

      const customerName = customers.find(c => c.customerId === selectedJob.customerId)?.name || selectedJob.customerId;
      setMessage('Invoice generated successfully!');
      setSelectedJob(null);
      setShowNewInvoiceModal(false);
      fetchBills();
      setTimeout(() => setMessage(''), 3000);
      console.log('=== GENERATE BILL END ===');
    } catch (error) {
      console.error('Error generating invoice:', error);
      setMessage('Error generating invoice');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleReviewInvoiceSubmit = async (reviewData) => {
    setReviewInvoiceLoading(true);
    try {
      console.log('Sending review data:', reviewData);
      const response = await invoiceReviewService.sendReview(reviewData);
      console.log('Review sent successfully:', response);
      setMessage('Invoice review sent successfully');
      setTimeout(() => setMessage(''), 3000);
      setShowReviewInvoiceModal(false);
    } catch (error) {
      console.error('Error sending invoice review:', error);
      console.error('Error details:', error.response?.data || error.message);
      const errorMessage = error.response?.data?.message || error.message || 'Error sending invoice review';
      setMessage(errorMessage);
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setReviewInvoiceLoading(false);
    }
  };

  const getCustomerName = (customerId) => {
    const customer = customers.find(c => c.customerId === customerId);
    return customer ? customer.name : customerId;
  };

  const getCustomerDetails = (customerId) => {
    return customers.find(c => c.customerId === customerId);
  };

  const markAsPaid = async (billId) => {
    const bill = bills.find(b => b.billId === billId);
    setSelectedBillForPayment(bill);
    setShowPaymentModal(true);
    setPaymentMethod('Cash');
    setChequeNumber('');
    setChequeDate('');
    setChequeAmount('');
    setBankName('Commercial Bank');
    setChequeAutoFilled(false);
    setChequeAutoFillData(null);
    setChequeType('new');
    setExistingCheques([]);
    setPaymentMode('full');
    setPartialPaymentAmount('');
  };

  // Load existing cheques with balance for this customer
  const loadExistingCheques = async (customerId) => {
    if (!customerId) return;
    try {
      setLoadingExistingCheques(true);
      const res = await apiClient.get(`/payments/customer/${customerId}/cheques`);
      const data = res.data;
      // Guard: ensure it's always an array regardless of what backend returns
      setExistingCheques(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Could not load existing cheques:', err?.response?.status);
      setExistingCheques([]);
    } finally {
      setLoadingExistingCheques(false);
    }
  };

  // When user switches to "Existing" radio, load cheques for this customer
  const handleChequeTypeChange = (type) => {
    setChequeType(type);
    setChequeNumber('');
    setChequeDate('');
    setChequeAmount('');
    setChequeAutoFilled(false);
    setChequeAutoFillData(null);
    if (type === 'existing' && selectedBillForPayment) {
      loadExistingCheques(selectedBillForPayment.customerId);
    }
  };

  // When user picks an existing cheque from dropdown
  const handleExistingChequeSelect = (chequeNum) => {
    if (!chequeNum) {
      setChequeNumber('');
      setChequeDate('');
      setChequeAmount('');
      setChequeAutoFilled(false);
      return;
    }
    const found = existingCheques.find(c => c.chequeNumber === chequeNum);
    if (found) {
      setChequeNumber(found.chequeNumber);
      setChequeDate(found.chequeDate ? found.chequeDate.split('T')[0] : '');
      setChequeAmount(String(found.chequeAmount));
      setChequeAutoFilled(true);
    }
  };

  // Auto-fill cheque details when user finishes typing a cheque number
  const handleChequeNumberBlur = async (num) => {
    const trimmed = (num || '').trim();
    // Need at least 4 characters to be a valid cheque number
    if (!trimmed || trimmed.length < 4) {
      setChequeAutoFilled(false);
      setChequeAutoFillData(null);
      return;
    }
    try {
      const res = await apiClient.get(`/payments/cheque/${encodeURIComponent(trimmed)}`);
      const data = res.data;
      // Only auto-fill if the cheque has a valid amount (properly recorded cheque)
      if (data && data.chequeAmount > 0) {
        setChequeDate(data.chequeDate ? data.chequeDate.split('T')[0] : '');
        setChequeAmount(String(data.chequeAmount));
        setChequeAutoFilled(true);
        setChequeAutoFillData(data);
      } else {
        setChequeAutoFilled(false);
        setChequeAutoFillData(null);
      }
    } catch {
      // 404 = new cheque, user fills manually ï¿½ this is normal
      setChequeAutoFilled(false);
      setChequeAutoFillData(null);
    }
  };
  
  const submitPayment = async () => {
    if (!selectedBillForPayment) return;
    
    // Validate partial payment amount
    if (paymentMode === 'partial') {
      const amount = parseFloat(partialPaymentAmount);
      const remaining = parseFloat(selectedBillForPayment.remainingAmount) || 
                       parseFloat(selectedBillForPayment.netTotal) || 
                       parseFloat(selectedBillForPayment.total) || 
                       0;
      
      if (!amount || amount <= 0) {
        setMessage('❌ Please enter a valid payment amount');
        setTimeout(() => setMessage(''), 5000);
        return;
      }
      
      if (amount > remaining + 0.01) { // 0.01 tolerance for floating point
        setMessage(`❌ Payment amount (LKR ${formatAmount(amount)}) exceeds remaining balance (LKR ${formatAmount(remaining)})`);
        setTimeout(() => setMessage(''), 5000);
        return;
      }
    }
    
    // Validate based on payment method
    if (paymentMethod === 'Cheque') {
      if (!chequeNumber || !chequeDate || !chequeAmount) {
        setMessage('❌ Please fill in all cheque details (Number, Date, Amount)');
        setTimeout(() => setMessage(''), 5000);
        return;
      }
      
      const amount = parseFloat(chequeAmount);
      if (isNaN(amount) || amount <= 0) {
        setMessage('❌ Please enter a valid cheque amount');
        setTimeout(() => setMessage(''), 5000);
        return;
      }
    }
    
    if (paymentMethod === 'Bank Transfer') {
      if (!bankName) {
        setMessage('❌ Please select a bank');
        setTimeout(() => setMessage(''), 5000);
        return;
      }
    }
    
    try {
      const paymentDetails = {
        paymentMethod,
        paidDate: new Date().toISOString(),
        ...(paymentMethod === 'Cheque' && {
          chequeNumber,
          chequeDate,
          chequeAmount: parseFloat(chequeAmount)
        }),
        ...(paymentMethod === 'Bank Transfer' && {
          bankName
        })
      };
      
      if (paymentMode === 'partial') {
        // Call partial payment endpoint
        await apiClient.patch(`/billing/${selectedBillForPayment.billId}/partial-pay`, {
          paymentAmount: parseFloat(partialPaymentAmount),
          ...paymentDetails
        });
        
        const newRemaining = (parseFloat(selectedBillForPayment.remainingAmount || selectedBillForPayment.netTotal) - parseFloat(partialPaymentAmount));
        const newStatus = newRemaining <= 0.01 ? 'Paid' : 'Partially Paid';
        
        setMessage(`✅ Partial payment of LKR ${formatAmount(partialPaymentAmount)} recorded successfully. Invoice status: ${newStatus}`);
      } else {
        // Call full payment endpoint
        await billingService.markAsPaid(selectedBillForPayment.billId, paymentDetails);
        setMessage(`✅ Invoice ${selectedBillForPayment.invoiceNumber || selectedBillForPayment.billId} marked as paid via ${paymentMethod}`);
      }
      
      setShowPaymentModal(false);
      setSelectedBillForPayment(null);
      fetchBills();
      setTimeout(() => setMessage(''), 5000);
    } catch (error) {
      console.error('Error marking bill as paid:', error);
      setMessage(`❌ Error: ${error.response?.data?.message || error.message}`);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  const printBill = async (bill) => {
    try {
      console.log('printBill - bill object:', bill);
      console.log('printBill - bill.jobId:', bill.jobId);
      
      // Fetch complete job details including pay items
      const response = await fetch(`${API_BASE}/api/jobs/${bill.jobId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch job details');
      }
      
      const jobWithPayItems = await response.json();
      const customer = getCustomerDetails(bill.customerId);
      
      if (!jobWithPayItems || !customer) {
        setMessage('Unable to print invoice - missing data');
        setTimeout(() => setMessage(''), 3000);
        return;
      }

      console.log('printBill - complete job data:', jobWithPayItems);
      console.log('printBill - job.payItems:', jobWithPayItems.payItems);
      console.log('printBill - job.payItems type:', typeof jobWithPayItems.payItems);
      console.log('printBill - job.payItems length:', jobWithPayItems.payItems?.length);
      console.log('printBill - job.payItems is array:', Array.isArray(jobWithPayItems.payItems));
      console.log('printBill - job.advancePayment:', jobWithPayItems.advancePayment);
      
      // Additional debugging for pay items
      if (jobWithPayItems.payItems) {
        console.log('printBill - pay items detailed analysis:');
        if (typeof jobWithPayItems.payItems === 'string') {
          console.log('   Pay items is a string, attempting to parse...');
          try {
            const parsed = JSON.parse(jobWithPayItems.payItems);
            console.log('   Parsed pay items:', parsed);
            jobWithPayItems.payItems = parsed; // Replace with parsed version
          } catch (e) {
            console.log('   Failed to parse pay items string:', e.message);
          }
        } else if (Array.isArray(jobWithPayItems.payItems)) {
          console.log('   Pay items is an array with', jobWithPayItems.payItems.length, 'items:');
          jobWithPayItems.payItems.forEach((item, index) => {
            console.log(`   Item ${index + 1}:`, item);
          });
        } else {
          console.log('   Pay items is neither string nor array:', jobWithPayItems.payItems);
        }
      } else {
        console.log('printBill - No pay items found in job data');
      }
      
      console.log('printBill - bill data for comparison:', {
        billId: bill.billId,
        jobId: bill.jobId,
        billingAmount: bill.billingAmount,
        advancePayment: bill.advancePayment,
        grossTotal: bill.grossTotal,
        netTotal: bill.netTotal
      });

      const printWindow = window.open('', '', 'height=900,width=700');
      printWindow.document.write(generateBillHTML(bill, jobWithPayItems, customer, printMode));
      printWindow.document.close();
      printWindow.print();
    } catch (error) {
      console.error('Error printing bill:', error);
      setMessage('Error loading invoice data for printing');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const generateBillHTML = (bill, job, customer, mode = 'color') => {
    const isColorMode = mode === 'color';
    const billDate = formatDate(bill.billDate || bill.createdDate);
    const invoiceNumber = bill.invoiceNumber || bill.billId;
    const invoiceLogoUrl = `${window.location.origin}/logo2.png`;
    
    console.log('generateBillHTML - bill:', bill);
    console.log('generateBillHTML - job:', job);
    console.log('generateBillHTML - job.payItems:', job.payItems);
    console.log('generateBillHTML - job.advancePayment:', job.advancePayment);
    console.log('generateBillHTML - bill.advancePayment:', bill.advancePayment);
    console.log('generateBillHTML - customer:', customer);
    
    // Use job's advance payment if bill doesn't have it
    const advancePayment = parseFloat(bill.advancePayment || job.advancePayment || 0);
    const rawAdvancePaymentDate = bill.advancePaymentDate || bill.paymentMadeDate || job.advancePaymentDate || job.paymentMadeDate;
    const advancePaymentDateText = formatDate(rawAdvancePaymentDate);
    const advancePaymentLabel = `Advance payment (${advancePaymentDateText})`;
    const grossTotal = parseFloat(bill.grossTotal || bill.billingAmount || 0);
    const netTotal = grossTotal - advancePayment; // Always calculate, don't use bill.netTotal
    
    console.log('generateBillHTML - calculated values:', {
      advancePayment,
      grossTotal,
      netTotal,
      hasAdvance: advancePayment > 0,
      calculation: `${grossTotal} - ${advancePayment} = ${netTotal}`
    });
    
    // Handle pay items - they might be a string that needs parsing
    let payItemsArray = [];
    if (job.payItems) {
      if (typeof job.payItems === 'string') {
        try {
          payItemsArray = JSON.parse(job.payItems);
          console.log('generateBillHTML - parsed pay items from string:', payItemsArray);
        } catch (e) {
          console.log('generateBillHTML - failed to parse pay items string:', e.message);
          payItemsArray = [];
        }
      } else if (Array.isArray(job.payItems)) {
        payItemsArray = job.payItems;
        console.log('generateBillHTML - using pay items array:', payItemsArray);
      } else {
        console.log('generateBillHTML - pay items is neither string nor array:', job.payItems);
        payItemsArray = [];
      }
    } else {
      console.log('generateBillHTML - no pay items found in job');
      payItemsArray = [];
    }

    const printablePayItems = payItemsArray.map((item, index) => {
      let description = item.description || item.name || 'Service Charge';
      
      // Only transform if it actually contains placeholder names
      const normalized = description.toLowerCase().trim();
      if (normalized.startsWith('transporter cost') && (description.includes('placename') || (!description.includes('from') && !description.includes('to')))) {
        const fromPlace = job.exporter || 'placename';
        const toPlace = job.transporter || 'placename';
        description = `transporter cost (from ${fromPlace} to ${toPlace})`;
      }
      
      const amount = parseFloat(item.billingAmount || item.amount || 0) || 0;
      const payItemId = item.id || item.payItemId || item.officePayItemId || `PI${String(index + 1).padStart(3, '0')}`;

      return {
        description,
        amount,
        payItemId
      };
    });

    const payItemsPerPage = 22;
    const printablePayItemPages = [];
    
    // Create pages with exactly 22 rows each
    for (let index = 0; index < printablePayItems.length; index += payItemsPerPage) {
      const pageItems = printablePayItems.slice(index, index + payItemsPerPage);
      
      // Fill remaining rows with empty items to make exactly 22 rows
      while (pageItems.length < payItemsPerPage) {
        pageItems.push({
          payItemId: '',
          description: '',
          amount: null
        });
      }
      
      printablePayItemPages.push(pageItems);
    }

    if (printablePayItemPages.length === 0) {
      const defaultPage = [{ payItemId: 'PI001', description: 'Service Charges', amount: grossTotal }];
      // Fill remaining rows with empty items
      while (defaultPage.length < payItemsPerPage) {
        defaultPage.push({
          payItemId: '',
          description: '',
          amount: null
        });
      }
      printablePayItemPages.push(defaultPage);
    }

    const hasMultiplePages = printablePayItemPages.length > 1;

    // Add transporter cost for FCL shipments
    if (job.shipmentCategory === 'FCL') {
      const hasTransporterCost = payItemsArray.some(item => {
        const label = (item?.name || item?.description || '').toLowerCase().trim();
        // Check if any transporter cost exists (old or new format)
        return label.startsWith('transporter cost');
      });
      if (!hasTransporterCost) {
        // Always use new format with place names
        const fromPlace = job.exporter || 'placename';
        const toPlace = job.transporter || 'placename';
        const description = `transporter cost (from ${fromPlace} to ${toPlace})`;
        payItemsArray.push({
          name: description,
          description: description,
          billingAmount: 0,
          amount: 0
        });
      }
    }

    const isCompactItemsLayout = payItemsArray.length >= 20;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice - Super Shine Cargo Services</title>
        <style>
          :root {
            --theme-primary: ${isColorMode ? '#1a3e9a' : '#000000'};
            --theme-accent: ${isColorMode ? '#2f6bd6' : '#000000'};
            --theme-muted: ${isColorMode ? '#3f4f77' : '#333333'};
            --theme-soft: ${isColorMode ? '#e8f0ff' : '#ffffff'};
          }
          @page { 
            margin: ${isCompactItemsLayout ? '32mm 14mm 32mm 14mm' : '35mm 20mm 35mm 20mm'}; 
            size: A4;
          }
          * {
            margin: 0;
            padding: 0;
          }
          body {
            font-family: Arial, sans-serif;
            font-size: ${isCompactItemsLayout ? '9pt' : '10pt'};
            line-height: ${isCompactItemsLayout ? '1.22' : '1.3'};
            color: #111;
          }
          .invoice-page {
            font-size: 10pt;
            line-height: 1.3;
            color: #111;
            padding: 0;
            margin: 0;
            display: flex;
            flex-direction: column;
            position: relative;
          }
          .page-header {
            position: relative;
            margin-bottom: ${isCompactItemsLayout ? '8px' : '15px'};
            padding: ${isCompactItemsLayout ? '6px 8px 8px 8px' : '8px 10px 10px 10px'};
            margin-bottom: 15px;
            padding: 8px 10px 10px 10px;
            border-bottom: 2px solid var(--theme-primary);
            background: ${isColorMode ? 'linear-gradient(180deg, var(--theme-soft) 0%, #ffffff 100%)' : '#ffffff'};
            border-radius: 6px;
            display: grid;
            grid-template-columns: auto 1fr auto;
            align-items: center;
            gap: ${isCompactItemsLayout ? '10px' : '15px'};
          }
          .logo {
            width: ${isCompactItemsLayout ? '62px' : '72px'};
            height: ${isCompactItemsLayout ? '62px' : '72px'};
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
            flex-shrink: 0;
            overflow: hidden;
            background: #fff;
          }
          .logo img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            display: block;
          }
          .company-header {
            text-align: center;
            margin-bottom: 0;
          }
          .company-name {
            font-size: ${isCompactItemsLayout ? '12pt' : '13pt'};
            font-weight: bold;
            letter-spacing: 1px;
            margin-bottom: 3px;
            color: var(--theme-primary);
          }
          .company-tagline {
            font-size: ${isCompactItemsLayout ? '7.5pt' : '8pt'};
            margin: 1px 0;
            color: var(--theme-muted);
          }
          .invoice-header-right {
            text-align: right;
            font-size: ${isCompactItemsLayout ? '8.5pt' : '9pt'};
            line-height: 1.5;
            color: var(--theme-primary);
            font-weight: 600;
          }
          .invoice-header-right strong {
            display: block;
            font-size: ${isCompactItemsLayout ? '9pt' : '10pt'};
          }
          .recipient {
            margin: ${isCompactItemsLayout ? '2px 0 4px 0' : '3px 0 6px 0'};
            line-height: 1.4;
          }
          .recipient-line {
            margin: ${isCompactItemsLayout ? '0px 0' : '1px 0'};
            font-size: ${isCompactItemsLayout ? '8.5pt' : '9pt'};
          }
          .details-section {
            margin: ${isCompactItemsLayout ? '4px 0 4px 0' : '6px 0 5px 0'};
            padding-bottom: 4px;
            border-bottom: 1px solid var(--theme-primary);
          }
          .detail-row {
            display: flex;
            margin: ${isCompactItemsLayout ? '0.5px 0' : '1px 0'};
            font-size: ${isCompactItemsLayout ? '8.5pt' : '9pt'};
          }
          .detail-label {
            font-weight: bold;
            width: 185px;
            min-width: 185px;
            min-width: 145px;
            white-space: nowrap;
            word-break: keep-all;
            color: var(--theme-primary);
          }
          .detail-value {
            flex: 1;
            word-wrap: break-word;
            overflow-wrap: anywhere;
          }
          .items-section {
            margin: ${isCompactItemsLayout ? '2px 0 0 0' : '4px 0 0 0'};
            flex: 1;
          }
          .pay-items-page {
            width: 100%;
          }
          .pay-items-page:not(:last-child) {
            page-break-after: always;
            break-after: page;
          }
          .pay-items-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: ${isCompactItemsLayout ? '2px' : '4px'};
            font-size: ${isCompactItemsLayout ? '8pt' : '8.5pt'};
            border: 1px solid var(--theme-primary);
          }
          .pay-items-table th,
          .pay-items-table td {
            border: 1px solid #cfd7ea;
            padding: ${isCompactItemsLayout ? '2px 5px' : '3px 6px'};
            vertical-align: top;
          }
          .pay-items-table tbody td {
            line-height: 1.2;
            min-height: ${isCompactItemsLayout ? '16px' : '18px'};
          }
          .pay-items-table tbody tr {
            height: ${isCompactItemsLayout ? '16px' : '18px'};
          }
          .pay-items-table thead th {
            background: #e9efff;
            border-bottom: 2px solid var(--theme-primary);
            color: var(--theme-primary);
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.2px;
          }
          .pay-items-table .id-col {
            width: 90px;
            text-align: center;
            white-space: nowrap;
          }
          .pay-items-table .description-col {
            width: auto;
          }
          .pay-items-table .amount-col {
            width: 120px;
            text-align: right;
            white-space: nowrap;
          }
          .pay-items-table .pay-item-description {
            word-break: break-word;
            overflow-wrap: anywhere;
          }
          .invoice-summary {
            margin-top: ${isCompactItemsLayout ? '10px' : '14px'};
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 2rem;
          }
          .totals-box {
            flex-shrink: 0;
            border: 2px solid var(--theme-primary);
            padding: ${isCompactItemsLayout ? '6px 12px' : '8px 16px'};
            background: ${isColorMode ? 'linear-gradient(135deg, var(--theme-soft) 0%, #ffffff 100%)' : '#ffffff'};
            border-radius: 4px;
            min-width: 280px;
          }
          .totals-box .item-row {
            margin: ${isCompactItemsLayout ? '2px 0' : '3px 0'};
            padding: ${isCompactItemsLayout ? '1px 0' : '2px 0'};
          }
          .totals-box .item-row.subtotal {
            margin-top: ${isCompactItemsLayout ? '2px' : '3px'};
            padding-top: ${isCompactItemsLayout ? '2px' : '3px'};
          }
          .totals-box .item-row.total {
            margin-top: ${isCompactItemsLayout ? '3px' : '4px'};
            padding-top: ${isCompactItemsLayout ? '3px' : '4px'};
            padding-bottom: ${isCompactItemsLayout ? '2px' : '3px'};
          }
          .totals-section {
            position: relative;
            margin-top: ${isCompactItemsLayout ? '10px' : '14px'};
            background: #ffffff;
            padding-top: 4px;
            z-index: 2;
          }
          .item-row {
            display: flex;
            justify-content: space-between;
            margin: ${isCompactItemsLayout ? '0px 0' : '1px 0'};
            font-size: ${isCompactItemsLayout ? '8.5pt' : '9pt'};
            padding: ${isCompactItemsLayout ? '0px 0' : '0.5px 0'};
            border-bottom: 1px solid #e0e0e0;
            page-break-inside: avoid;
          }
          .item-row.subtotal {
            border-top: 1px solid var(--theme-primary);
            border-bottom: none;
            margin-top: ${isCompactItemsLayout ? '1px' : '2px'};
            padding-top: ${isCompactItemsLayout ? '1px' : '2px'};
            font-weight: normal;
          }
          .item-row.total {
            border-top: 2px solid var(--theme-primary);
            border-bottom: none;
            margin-top: ${isCompactItemsLayout ? '1px' : '2px'};
            padding-top: ${isCompactItemsLayout ? '2px' : '3px'};
            padding-bottom: ${isCompactItemsLayout ? '1px' : '2px'};
            font-weight: bold;
            font-size: 10pt;
            color: var(--theme-primary);
          }
          .signature-section {
            position: relative;
            margin-top: 0;
            margin-left: 0;
            text-align: left;
            background: #ffffff;
            z-index: 3;
            flex-shrink: 0;
          }
          .signature-space {
            border-bottom: 1px solid var(--theme-primary);
            width: 280px;
            margin: ${isCompactItemsLayout ? '0 0 2px 0' : '0 0 2px 0'};
            height: 40px;
          }
          .signature-label {
            font-size: ${isCompactItemsLayout ? '8pt' : '8.5pt'};
            font-weight: bold;
            margin-top: 2px;
            color: var(--theme-primary);
          }
          .footer {
            margin-top: auto;
            padding-top: ${isCompactItemsLayout ? '10px' : '16px'};
            padding-top: 16px;
            padding-bottom: 6px;
            border-top: 1px solid var(--theme-primary);
            background: ${isColorMode ? 'linear-gradient(180deg, #ffffff 0%, var(--theme-soft) 100%)' : '#ffffff'};
            text-align: center;
            font-size: 8pt;
            line-height: 1.3;
            color: var(--theme-accent);
          }
          .footer-line {
            margin: 2px 0;
          }
          @media print {
            body { margin: 0; padding: 0; }
            .no-print { display: none !important; }
            html, body, .invoice-page, .page-header, .footer {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
              forced-color-adjust: none !important;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              forced-color-adjust: none !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="invoice-page">
        <div style="font-size: 10pt; font-weight: bold; margin-bottom: 6px; margin-top: 0;">
          INV No: ${invoiceNumber}
          <div style="font-size: 9pt; font-weight: normal; margin-top: 2px;">
            Date: ${formatDate(bill.invoiceDate || bill.billDate || bill.createdDate)}
          </div>
        </div>

        <div class="recipient">
          <div class="recipient-line">The Director,</div>
          <div class="recipient-line"><strong>${customer.name}</strong></div>
          ${customer && (customer.addressNumber || customer.addressStreet1 || customer.addressCity) ? 
            `<div class="recipient-line">${customer.addressNumber || ''}, ${customer.addressStreet1 || ''}, ${customer.addressStreet2 ? customer.addressStreet2 + ', ' : ''}${customer.addressDistrict || ''}, ${customer.addressCity || ''}, ${customer.addressCountry || 'Sri Lanka'}</div>` 
            : ''}
        </div>

        <div class="details-section">
          <div class="detail-row">
            <div class="detail-label">Cusdec No</div>
            <div class="detail-value">: ${formatCusdecWithDate(job.cusdecNumber, job.cusdecDate)}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Exporter</div>
            <div class="detail-value">: ${job.exporter || '-'}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">TT / LC / DA / DP / NFE No</div>
            <div class="detail-value">: ${job.lcNumber || '-'}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Container No</div>
            <div class="detail-value">: ${job.containerNumber || '-'}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Shipment Category</div>
            <div class="detail-value">: ${job.shipmentCategory || '-'}</div>
          </div>
          ${isVehicleShipmentCategory(job.shipmentCategory) ? `
          <div class="detail-row">
            <div class="detail-label">Chassis No</div>
            <div class="detail-value">: ${job.chassisNumber || '-'}</div>
          </div>
          ` : ''}
        </div>

        <div class="items-section">
          ${printablePayItemPages.map((pageItems, pageIndex) => `
            <div class="pay-items-page">
              <table class="pay-items-table">
                <thead>
                  <tr>
                    <th class="id-col">ID</th>
                    <th class="description-col">DESCRIPTION</th>
                    <th class="amount-col">AMOUNT (LKR)</th>
                  </tr>
                </thead>
                <tbody>
                  ${pageItems.map(item => `
                    <tr>
                      <td class="id-col">${item.payItemId || ''}</td>
                      <td class="description-col"><span class="pay-item-description">${item.description || ''}</span></td>
                      <td class="amount-col">${item.amount !== null && item.amount !== undefined ? formatAmount(item.amount) : ''}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `).join('')}
        </div>

        <div class="invoice-summary">
          <div class="signature-section">
            <div class="signature-space"></div>
            <div class="signature-label">SUPER SHINE CARGO SERVICES<br>MANAGER</div>
          </div>

          <div class="totals-box">
            <div class="item-row subtotal">
              <div class="item-description">GROSS TOTAL</div>
              <div class="item-amount">${formatAmount(grossTotal)}</div>
            </div>
            
            ${advancePayment > 0 ? `
              <div class="item-row subtotal">
                <div class="item-description">${advancePaymentLabel}</div>
                <div class="item-amount">${formatAmount(advancePayment)}</div>
              </div>
            ` : ''}
            
            <div class="item-row total">
              <div class="item-description">Total Due Amount</div>
              <div class="item-amount">${formatAmount(advancePayment > 0 ? netTotal : grossTotal)}</div>
            </div>
          </div>
        </div>
        </div>
        </div>
      </body>
      </html>
    `;
  };

  if (user?.role === 'Waff Clerk') {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm p-8 max-w-md text-center">
          <div className="flex justify-center mb-4">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">Admin or Super Admin only</p>
        </div>
      </div>
    );
  }

  // Filter bills based on status and customer
  const filteredBills = bills.filter(bill => {
    const matchesStatus = statusFilter === 'All' || (bill.paymentStatus || 'Unpaid') === statusFilter;
    const matchesCustomer = customerFilter === 'All' || bill.customerId === customerFilter;
    return matchesStatus && matchesCustomer;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredBills.length / recordsPerPage);
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = filteredBills.slice(indexOfFirstRecord, indexOfLastRecord);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    setExpandedBillId(null);
  };

  const handleRecordsPerPageChange = (newRecordsPerPage) => {
    setRecordsPerPage(newRecordsPerPage);
    setCurrentPage(1);
    setExpandedBillId(null);
  };

  const renderGeneratedInvoiceActions = (bill) => (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={() => printBill(bill)}
        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
        title="Print Invoice"
        aria-label="Print Invoice"
      >
        Print
      </button>
      <button
        onClick={() => {
          setPaymentBreakdownBill(bill);
          setShowPaymentBreakdownModal(true);
        }}
        className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition"
        title="View Payment Breakdown"
        aria-label="View Payment Breakdown"
      >
        Breakdown
      </button>
      {(bill.paymentStatus === 'Unpaid' || bill.paymentStatus === 'Partially Paid') && (
        <button
          onClick={() => markAsPaid(bill.billId)}
          className={`px-3 py-2 text-white text-sm font-medium rounded-lg transition ${
            bill.paymentStatus === 'Partially Paid'
              ? 'bg-amber-600 hover:bg-amber-700'
              : 'bg-green-600 hover:bg-green-700'
          }`}
          title={bill.paymentStatus === 'Partially Paid' ? 'Pay Remaining' : 'Pay Invoice'}
          aria-label={bill.paymentStatus === 'Partially Paid' ? 'Pay Remaining' : 'Pay Invoice'}
        >
          {bill.paymentStatus === 'Partially Paid' ? 'Pay Remaining' : 'Pay Invoice'}
        </button>
      )}
      {bill.paymentStatus === 'Paid' && (
        <span className="paid-indicator" title="Paid" aria-label="Paid">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </span>
      )}
    </div>
  );

  const renderBillExpandedDetails = (bill) => (
    <div className="bill-details-expanded">
      <div className="details-grid">
        <div className="detail-card">
          <div className="detail-label">Actual Cost</div>
          <div className="detail-value">LKR {formatAmount(bill.actualCost)}</div>
        </div>
        <div className="detail-card">
          <div className="detail-label">Billing Amount</div>
          <div className="detail-value">LKR {formatAmount(bill.billingAmount)}</div>
        </div>
        <div className="detail-card">
          <div className="detail-label">Profit</div>
          <div className="detail-value">LKR {formatAmount(bill.profit)}</div>
        </div>
        {bill.paymentStatus === 'Partially Paid' && (
          <>
            <div className="detail-card detail-card--paid">
              <div className="detail-label">Amount Paid</div>
              <div className="detail-value detail-value--paid">LKR {formatAmount(bill.paidAmount || 0)}</div>
              <div className="detail-card-sub">
                {Math.round((parseFloat(bill.paidAmount || 0) / parseFloat(bill.netTotal || bill.total || 1)) * 100)}% of invoice settled
              </div>
            </div>
            <div className="detail-card detail-card--remaining">
              <div className="detail-label">Total Due</div>
              <div className="detail-value detail-value--remaining">LKR {formatAmount(bill.remainingAmount || 0)}</div>
              <div className="detail-card-sub">
                {Math.round((parseFloat(bill.remainingAmount || 0) / parseFloat(bill.netTotal || bill.total || 1)) * 100)}% outstanding
              </div>
            </div>
          </>
        )}
      </div>

      {(bill.paymentStatus === 'Partially Paid' || bill.paymentStatus === 'Paid') && (
        <div className="invoice-payment-tracking-section">
          <div className="invoice-payment-tracking-header">
            <span className="invoice-payment-tracking-title">Payment Tracking</span>
            <span className="invoice-payment-tracking-count">
              {Array.isArray(bill.paymentRecords) && bill.paymentRecords.length > 0
                ? `${bill.paymentRecords.length} payment record${bill.paymentRecords.length !== 1 ? 's' : ''}`
                : '1 payment record'}
            </span>
          </div>
          <div className="invoice-payment-tracking-table">
            <div className="invoice-payment-table-header">
              <div className="invoice-payment-header-cell invoice-payment-balance-col">Remaining Balance</div>
              <div className="invoice-payment-header-cell invoice-payment-date-col">Payment Date</div>
              <div className="invoice-payment-header-cell invoice-payment-method-col">Method</div>
              <div className="invoice-payment-header-cell invoice-payment-reference-col">Reference</div>
              <div className="invoice-payment-header-cell invoice-payment-amount-col">Amount Paid</div>
            </div>
            <div className="invoice-payment-table-body">
              {bill.paymentRecords && Array.isArray(bill.paymentRecords) && bill.paymentRecords.length > 0 ? (
                bill.paymentRecords.map((payment, idx) => {
                  const paidUpToThisPoint = bill.paymentRecords
                    .slice(0, idx + 1)
                    .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
                  const remainingAtThisPoint = (parseFloat(bill.netTotal || bill.total || 0)) - paidUpToThisPoint;

                  return (
                    <div key={idx} className="invoice-payment-table-row">
                      <div className="invoice-payment-table-cell invoice-payment-date-col"><span className="payment-num">{idx + 1}</span></div>
                      <div className="invoice-payment-table-cell invoice-payment-date-col">{formatDateWithMonth(payment.paymentDate)}</div>
                      <div className="invoice-payment-table-cell invoice-payment-method-col">
                        <span className={`invoice-payment-method-badge invoice-payment-method-${payment.paymentMethod?.toLowerCase().replace(' ', '-')}`}>
                          {payment.paymentMethod || '-'}
                        </span>
                      </div>
                      <div className="invoice-payment-table-cell invoice-payment-reference-col">
                        {payment.paymentMethod === 'Cheque' && payment.chequeNumber ? (
                          <span className="invoice-reference-text">CHQ: {payment.chequeNumber}</span>
                        ) : payment.paymentMethod === 'Bank Transfer' && payment.bankName ? (
                          <span className="invoice-reference-text">{payment.bankName}</span>
                        ) : payment.paymentMethod === 'Cash' ? (
                          <span className="invoice-reference-text">Cash</span>
                        ) : (
                          <span className="invoice-reference-empty">-</span>
                        )}
                      </div>
                      <div className="invoice-payment-table-cell invoice-payment-amount-col">
                        <span className="invoice-payment-amount-value">LKR {formatAmount(payment.amount || 0)}</span>
                      </div>
                      <div className="invoice-payment-table-cell invoice-payment-balance-col">
                        <span className="invoice-payment-balance-value">LKR {formatAmount(Math.max(0, remainingAtThisPoint))}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="invoice-payment-table-row">
                  <div className="invoice-payment-table-cell invoice-payment-date-col"><span className="invoice-payment-num">1</span></div>
                  <div className="invoice-payment-table-cell invoice-payment-date-col">{formatDateWithMonth(bill.paidDate)}</div>
                  <div className="invoice-payment-table-cell invoice-payment-method-col">
                    <span className={`invoice-payment-method-badge invoice-payment-method-${bill.paymentMethod?.toLowerCase().replace(' ', '-')}`}>
                      {bill.paymentMethod === 'Cash' && '💵'}
                      {bill.paymentMethod === 'Cheque' && '📄'}
                      {bill.paymentMethod === 'Bank Transfer' && '🏦'}
                      {' '}{bill.paymentMethod || '-'}
                    </span>
                  </div>
                  <div className="invoice-payment-table-cell invoice-payment-reference-col">
                    {bill.paymentMethod === 'Cheque' && bill.chequeNumber ? (
                      <span className="invoice-reference-text">CHQ: {bill.chequeNumber}</span>
                    ) : bill.paymentMethod === 'Bank Transfer' && bill.bankName ? (
                      <span className="invoice-reference-text">{bill.bankName}</span>
                    ) : bill.paymentMethod === 'Cash' ? (
                      <span className="invoice-reference-text">Cash</span>
                    ) : (
                      <span className="invoice-reference-empty">-</span>
                    )}
                  </div>
                  <div className="invoice-payment-table-cell invoice-payment-amount-col">
                    <span className="invoice-payment-amount-value">LKR {formatAmount(bill.paidAmount || 0)}</span>
                  </div>
                  <div className="invoice-payment-table-cell invoice-payment-balance-col">
                    <span className="invoice-payment-balance-value">LKR {formatAmount(bill.remainingAmount || 0)}</span>
                  </div>
                </div>
              )}
            </div>
            <div className="invoice-payment-total-row">
              <div className="invoice-payment-table-cell invoice-payment-date-col"></div>
              <div className="invoice-payment-table-cell invoice-payment-date-col"></div>
              <div className="invoice-payment-table-cell invoice-payment-method-col"></div>
              <div className="invoice-payment-table-cell invoice-payment-reference-col"><strong>Total</strong></div>
              <div className="invoice-payment-table-cell invoice-payment-amount-col"><strong>LKR {formatAmount(bill.paidAmount || 0)}</strong></div>
              <div className="invoice-payment-table-cell invoice-payment-balance-col"><strong>LKR {formatAmount(bill.remainingAmount || 0)}</strong></div>
            </div>
          </div>
        </div>
      )}

      {bill.paymentStatus === 'Paid' && bill.paymentMethod && (
        <div className="payment-details-section">
          <h4 className="payment-details-title">Payment Information</h4>
          <div className="payment-details-grid">
            <div className="payment-detail-card">
              <div className="payment-detail-label">Payment Method</div>
              <div className="payment-detail-value">
                <span className={`payment-method-badge payment-method-${bill.paymentMethod.toLowerCase().replace(' ', '-')}`}>
                  {bill.paymentMethod}
                </span>
              </div>
            </div>
            {bill.paidDate && (
              <div className="payment-detail-card">
                <div className="payment-detail-label">Payment Date</div>
                <div className="payment-detail-value">{formatDateWithFullMonth(bill.paidDate)}</div>
              </div>
            )}
            {bill.paymentMethod === 'Cheque' && (
              <>
                {bill.chequeNumber && (
                  <div className="payment-detail-card">
                    <div className="payment-detail-label">Cheque Number</div>
                    <div className="payment-detail-value cheque-number">{bill.chequeNumber}</div>
                  </div>
                )}
                {bill.chequeDate && (
                  <div className="payment-detail-card">
                    <div className="payment-detail-label">Cheque Date</div>
                    <div className="payment-detail-value">{formatDateWithFullMonth(bill.chequeDate)}</div>
                  </div>
                )}
                {bill.chequeAmount && (
                  <div className="payment-detail-card">
                    <div className="payment-detail-label">Cheque Amount</div>
                    <div className="payment-detail-value amount-highlight">LKR {formatAmount(bill.chequeAmount)}</div>
                  </div>
                )}
              </>
            )}
            {bill.paymentMethod === 'Bank Transfer' && bill.bankName && (
              <div className="payment-detail-card">
                <div className="payment-detail-label">Bank Name</div>
                <div className="payment-detail-value bank-name">{bill.bankName}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="billing-page">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Invoicing Management</h1>
          <p className="text-gray-600 mt-1">Generate invoices and track profitability</p>
        </div>
        <button
          onClick={openNewInvoiceModal}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1E3F63] hover:bg-[#16304d] text-white rounded-lg shadow-sm transition font-semibold text-sm shrink-0"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Invoice
        </button>
      </div>

      {message && <div className={`${message.includes('Error') || message.includes('Cannot') || message.includes('âŒ') ? 'bg-red-50 border border-red-200 text-red-800' : 'bg-green-50 border border-green-200 text-green-800'} px-4 py-3 rounded-lg mb-6`}>{message}</div>}

      {/* New Invoice Modal */}
      {showNewInvoiceModal && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] px-[2.5vw] py-4">
          <div className="bg-white rounded-2xl shadow-2xl flex flex-col" style={{ width: '92vw', maxWidth: '1500px', height: '92vh' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-10 py-5 rounded-t-2xl shrink-0" style={{ background: 'linear-gradient(135deg,#1E3F63 0%,#2f5e8f 100%)' }}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">New Invoice</h2>
                  <p className="text-blue-200 text-xs mt-0.5">Select a job and generate a customer invoice</p>
                </div>
              </div>
              <button onClick={closeNewInvoiceModal} className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 min-h-0 overflow-y-auto px-10 py-6">
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Select Job *</label>
            <div className="flex gap-2 items-center">
              <select 
                value={selectedJob?.jobId || ''} 
                onChange={(e) => handleJobSelect(e.target.value)}
                disabled={loadingSettlement}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
              >
                <option value="">-- Select a Job --</option>
                {jobs.map(job => (
                  <option key={job.jobId} value={job.jobId}>
                    {job.jobId} - {getCustomerName(job.customerId)} - {job.shipmentCategory}
                  </option>
                ))}
              </select>
            </div>
            {loadingSettlement && (
              <div className="mt-2 text-sm text-blue-700 italic">
                Loading petty cash settlement data...
              </div>
            )}
          </div>

          {selectedJob && (
            <div className="mb-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Job Information</h3>
                {(() => {
                  const chassisMissing = !selectedJob.chassisNumber || selectedJob.chassisNumber.trim() === '';
                  const chassisRequired = isVehicleShipmentCategory(selectedJob.shipmentCategory);
                  return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-gray-600 mb-1">Job ID:</span>
                    <span className="text-sm text-gray-900">{selectedJob.jobId}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-gray-600 mb-1">Customer:</span>
                    <span className="text-sm text-gray-900">{getCustomerName(selectedJob.customerId)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-gray-600 mb-1">Category:</span>
                    <span className="text-sm text-gray-900">
                      <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">{selectedJob.shipmentCategory}</span>
                    </span>
                  </div>
                  {chassisRequired && (
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-gray-600 mb-1">
                        Chassis Number: {chassisRequired && chassisMissing && <span className="text-red-600">*Required</span>}
                      </span>
                      <span className={`text-sm ${chassisRequired && chassisMissing ? 'text-red-600 font-semibold' : 'text-gray-900'}`}>
                        {selectedJob.chassisNumber || '-'}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-gray-600 mb-1">BL Number: {(!selectedJob.blNumber || selectedJob.blNumber.trim() === '') && <span className="text-red-600">*Required</span>}</span>
                    <span className={`text-sm ${(!selectedJob.blNumber || selectedJob.blNumber.trim() === '') ? 'text-red-600 font-semibold' : 'text-gray-900'}`}>
                      {selectedJob.blNumber || '-'}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-gray-600 mb-1">CUSDEC Number: {(!selectedJob.cusdecNumber || selectedJob.cusdecNumber.trim() === '') && <span className="text-red-600">*Required</span>}</span>
                    <span className={`text-sm ${(!selectedJob.cusdecNumber || selectedJob.cusdecNumber.trim() === '') ? 'text-red-600 font-semibold' : 'text-gray-900'}`}>
                      {formatCusdecWithDate(selectedJob.cusdecNumber, selectedJob.cusdecDate)}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-gray-600 mb-1">Exporter:</span>
                    <span className="text-sm text-gray-900">{selectedJob.exporter || '-'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-gray-600 mb-1">TT / LC / DA / DP / NFE Number: {(!selectedJob.lcNumber || selectedJob.lcNumber.trim() === '') && <span className="text-red-600">*Required</span>}</span>
                    <span className={`text-sm ${(!selectedJob.lcNumber || selectedJob.lcNumber.trim() === '') ? 'text-red-600 font-semibold' : 'text-gray-900'}`}>
                      {selectedJob.lcNumber || '-'}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-gray-600 mb-1">
                      Container Number: 
                      {!isVehicleShipmentCategory(selectedJob.shipmentCategory) && 
                       (!selectedJob.containerNumber || selectedJob.containerNumber.trim() === '') && 
                       <span className="text-red-600">*Required</span>}
                    </span>
                    <span className={`text-sm ${!isVehicleShipmentCategory(selectedJob.shipmentCategory) && (!selectedJob.containerNumber || selectedJob.containerNumber.trim() === '') ? 'text-red-600 font-semibold' : 'text-gray-900'}`}>
                      {selectedJob.containerNumber || '-'}
                    </span>
                  </div>
                  {selectedJob.hasOwnProperty('transporter') && (
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-gray-600 mb-1">
                        Transporter:
                        {selectedJob.shipmentCategory === 'FCL' && 
                         (!selectedJob.transporter || selectedJob.transporter.trim() === '') && 
                         <span className="text-red-600">*Required</span>}
                      </span>
                      <select 
                        className="max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                        value={transporters.find(t => t.name === selectedJob.transporter)?.transporterId || ''}
                        onChange={(e) => handleTransporterChange(e.target.value)}
                      >
                        <option value="">Select Transporter</option>
                        {transporters.map(transporter => (
                          <option key={transporter.transporterId} value={transporter.transporterId}>
                            {transporter.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-gray-600 mb-1">
                      Transport Delivery Date: 
                      {selectedJob.shipmentCategory === 'FCL' && 
                       (!selectedJob.transportDeliveryDate || (typeof selectedJob.transportDeliveryDate === 'string' && selectedJob.transportDeliveryDate.trim() === '')) && 
                       <span className="text-red-600">*Required</span>}
                    </span>
                    <span className={`text-sm ${selectedJob.shipmentCategory === 'FCL' && (!selectedJob.transportDeliveryDate || (typeof selectedJob.transportDeliveryDate === 'string' && selectedJob.transportDeliveryDate.trim() === '')) ? 'text-red-600 font-semibold' : 'text-gray-900'}`}>
                      {formatDate(selectedJob.transportDeliveryDate)}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-gray-600 mb-1">Status:</span>
                    <span className="text-sm text-gray-900">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${selectedJob.status === 'Open' ? 'bg-blue-100 text-blue-700' : selectedJob.status === 'Closed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                        {selectedJob.status}
                      </span>
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-gray-600 mb-1">Advance Payment:</span>
                    <span className={`text-sm font-semibold ${selectedJob.advancePayment > 0 ? 'text-green-600' : 'text-gray-900'}`}>
                      LKR {formatAmount(selectedJob.advancePayment || 0)}
                      {selectedJob.advancePayment > 0 && (
                        <span className="text-green-600 ml-1">Received</span>
                      )}
                    </span>
                  </div>
                </div>
                  );
                })()}
              </div>
            </div>
          )}

        {selectedJob && (
            <div className="mb-6">
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Pay Items</h3>
                  {!showPayItemsRow && selectedJob.payItems && selectedJob.payItems.length > 0 && (
                    <div className="flex gap-2">
                      <button 
                        onClick={addTransporterCostFromHeader} 
                        className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition"
                      >
                        + Transporter Cost
                      </button>
                      <button 
                        onClick={openPayItemsEditor} 
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
                      >
                        + Add More Items
                      </button>
                    </div>
                  )}
                  {!showPayItemsRow && (!selectedJob.payItems || selectedJob.payItems.length === 0) && (
                    <div className="flex gap-2">
                      <button 
                        onClick={addTransporterCostFromHeader} 
                        className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition"
                      >
                        + Transporter Cost
                      </button>
                      <button 
                        onClick={openPayItemsEditor} 
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
                      >
                        + Add Items
                      </button>
                    </div>
                  )}
                </div>

                {showPayItemsRow && (
                  <div className="p-6 space-y-4">
                    {selectedJob.payItems && selectedJob.payItems.length > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                        <span className="text-2xl flex-shrink-0">â„¹ï¸</span>
                        <div>
                          <strong className="text-blue-900 block">Adding Additional Items</strong>
                          <p className="text-sm text-blue-800 mt-1">You are adding new pay items to the existing {selectedJob.payItems.length} item(s). All items will be combined in the review table.</p>
                        </div>
                      </div>
                    )}
                    <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead className="bg-gray-100 border-b-2 border-gray-300">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">Pay Item Name</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">Actual Cost (LKR)</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">Paid By</th>
                          <th className="px-4 py-3 text-center font-semibold text-gray-700">Bill</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">Billing Amount (LKR)</th>
                          <th className="px-4 py-3 text-center font-semibold text-gray-700">Same Amount</th>
                          <th className="px-4 py-3 text-center font-semibold text-gray-700">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payItems.map((item, index) => (
                          <tr key={index} className="border-b border-gray-200 hover:bg-gray-50 transition">
                            <td className="px-4 py-3" data-label="Pay Item Name">
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={item.name}
                                  onChange={(e) => handlePayItemChange(index, 'name', e.target.value)}
                                  placeholder="e.g., SLPA Bill, Transport"
                                  className="flex-1 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                  disabled={item.paidByName}
                                />
                                {item.isOfficePayItem && (
                                  <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">Office Payment</span>
                                )}
                                {item.isPettyCashItem && (
                                  <span className="inline-block px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">Petty Cash</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3" data-label="Actual Cost (LKR)">
                              <input
                                type="number"
                                step="0.01"
                                value={item.actualCost}
                                onChange={(e) => handlePayItemChange(index, 'actualCost', e.target.value)}
                                placeholder="0.00"
                                className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                disabled={item.paidByName}
                              />
                            </td>
                            <td className="px-4 py-3" data-label="Paid By">
                              {item.paidByName ? (
                                <span className="text-gray-900 font-medium">{item.paidByName}</span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center" data-label="Bill">
                              <input
                                type="checkbox"
                                checked={item.hasBill || false}
                                onChange={(e) => handlePayItemChange(index, 'hasBill', e.target.checked)}
                                disabled={!canEditPayItems()}
                                title={item.hasBill ? "Bill/Receipt exists" : "No bill/receipt"}
                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-4 py-3" data-label="Billing Amount (LKR)">
                              <input
                                type="number"
                                step="0.01"
                                value={item.billingAmount}
                                onChange={(e) => handlePayItemChange(index, 'billingAmount', e.target.value)}
                                placeholder="0.00"
                                className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                disabled={item.sameAmount}
                              />
                            </td>
                            <td className="px-4 py-3 text-center" data-label="Same Amount">
                              <input
                                type="checkbox"
                                checked={item.sameAmount}
                                onChange={(e) => handlePayItemChange(index, 'sameAmount', e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-4 py-3 text-center" data-label="Action">
                              {payItems.length > 1 && !item.paidByName && !(selectedJob?.shipmentCategory === 'FCL' && isTransporterCostLabel(item.name)) && (
                                <button
                                  type="button"
                                  onClick={() => removePayItemRow(index)}
                                  className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition"
                                  title="Remove"
                                  aria-label="Remove"
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                      <div className="flex justify-between items-center px-4 py-3 bg-gray-50 border-t-2 border-gray-300 rounded-t">
                        <strong className="text-gray-900">Total</strong>
                        <div className="flex gap-8">
                          <div className="text-right"><strong className="text-gray-900">{formatAmount(calculateUnsavedTotals().actualCost)}</strong></div>
                          <div></div>
                          <div></div>
                          <div className="text-right"><strong className="text-gray-900">{formatAmount(calculateUnsavedTotals().billingAmount)}</strong></div>
                          <div></div>
                          <div></div>
                        </div>
                      </div>
                      <div className={`flex justify-between items-center px-4 py-3 rounded-b ${calculateUnsavedTotals().profit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                        <strong className={calculateUnsavedTotals().profit >= 0 ? 'text-green-900' : 'text-red-900'}>Profit Margin</strong>
                        <div className="flex gap-8">
                          <div></div>
                          <div></div>
                          <div></div>
                          <div className={`text-right font-semibold ${calculateUnsavedTotals().profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                            <strong>{formatAmount(calculateUnsavedTotals().profit)}</strong>
                            <span className="text-xs ml-1">({calculateUnsavedTotals().profitMargin.toFixed(2)}%)</span>
                          </div>
                          <div></div>
                          <div></div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-3 mt-6">
                      <div className="flex-1 flex gap-2">
                        {selectedJob?.shipmentCategory !== 'FCL' && !hasTransporterCostItem(payItems) && (
                          <button onClick={addTransporterCostRow} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium">
                            + Add Transporter Cost
                          </button>
                        )}
                        {!(payItems.length === 1 && isTransporterCostLabel(payItems[0]?.name || payItems[0]?.description)) && (
                          <button onClick={addPayItemRow} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition text-sm font-medium">
                            + Add Another Item
                          </button>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={savePayItems} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium">
                          Save Pay Items
                        </button>
                        <button 
                          onClick={() => {
                            setShowPayItemsRow(false);
                            setPayItems([]);
                          }} 
                          className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition text-sm font-medium"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {selectedJob.payItems && selectedJob.payItems.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">PAY ITEMS REVIEW</h4>
                        <p className="text-sm text-gray-600 mt-1">Review all pay items before generating invoice</p>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <colgroup>
                        {canEditPayItems() ? (
                          <>
                            <col style={{width: '45%'}} />
                            <col style={{width: '20%'}} />
                            <col style={{width: '20%'}} />
                            <col style={{width: '15%'}} />
                          </>
                        ) : (
                          <>
                            <col style={{width: '45%'}} />
                            <col style={{width: '27.5%'}} />
                            <col style={{width: '27.5%'}} />
                          </>
                        )}
                      </colgroup>
                      <thead className="bg-gray-100 border-b-2 border-gray-300 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">Description</th>
                          <th className="px-4 py-3 text-right font-semibold text-gray-700">Actual Cost (LKR)</th>
                          <th className="px-4 py-3 text-right font-semibold text-gray-700">Billing Amount (LKR)</th>
                          {canEditPayItems() && <th className="px-4 py-3 text-center font-semibold text-gray-700">Actions</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {selectedJob.payItems.map((item, idx) => {
                          const itemDescription = item.description || item.name || '';
                          let displayDescription = itemDescription;
                          
                          // Only transform if it actually contains placeholder names
                          const normalized = itemDescription.toLowerCase().trim();
                          if (normalized.startsWith('transporter cost') && (itemDescription.includes('placename') || (!itemDescription.includes('from') && !itemDescription.includes('to')))) {
                            const fromPlace = selectedJob.exporter || 'placename';
                            const toPlace = selectedJob.transporter || 'placename';
                            displayDescription = `transporter cost (from ${fromPlace} to ${toPlace})`;
                          }
                          
                          return (
                          <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50 transition">
                            <td className="px-4 py-3 text-gray-900" data-label="Description">{displayDescription}</td>
                            <td className="px-4 py-3 text-right text-gray-900" data-label="Actual Cost (LKR)">
                              {formatAmount(parseFloat(item.actualCost) || parseFloat(item.amount) || 0)}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-900" data-label="Billing Amount (LKR)">
                              {editingPayItemIndex === idx ? (
                                <input
                                  type="text"
                                  className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm text-right"
                                  value={editingBillingAmount}
                                  onChange={(e) => setEditingBillingAmount(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveInlineEditedPayItem();
                                    else if (e.key === 'Escape') cancelEditingPayItem();
                                  }}
                                  autoFocus
                                />
                              ) : (
                                formatAmount(parseFloat(item.billingAmount) || parseFloat(item.amount) || 0)
                              )}
                            </td>
                            {canEditPayItems() && (
                              <td className="px-4 py-3 text-center">
                                {editingPayItemIndex === idx ? (
                                  <div className="flex gap-2 justify-center">
                                    <button className="inline-flex items-center justify-center px-3 h-8 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition text-sm font-medium" onClick={saveInlineEditedPayItem} title="Save">Save</button>
                                    <button className="inline-flex items-center justify-center px-3 h-8 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition text-sm font-medium" onClick={cancelEditingPayItem} title="Cancel">Cancel</button>
                                  </div>
                                ) : (
                                  <div className="flex gap-2 justify-center">
                                    <button className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 transition" onClick={() => startEditingPayItem(idx)} title="Edit billing amount" aria-label="Edit billing amount">
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                    </button>
                                    <button className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition" onClick={() => removePayItem(idx)} title="Remove" aria-label="Remove">
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                                    </button>
                                  </div>
                                )}
                              </td>
                            )}
                          </tr>
                        );
                        })}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        {/* Total Row */}
                        <tr className="border-t-2 border-gray-300">
                          <td className="px-4 py-3 font-semibold text-gray-900"><strong>Total</strong></td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900"><strong>{formatAmount(calculateTotals().actualCost)}</strong></td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900"><strong>{formatAmount(calculateTotals().billingAmount)}</strong></td>
                          {canEditPayItems() && <td className="px-4 py-3 text-center"></td>}
                        </tr>
                        {/* Profit Margin Row */}
                        <tr className={`${calculateTotals().profit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                          <td className="px-4 py-3 font-semibold text-gray-900"><strong>PROFIT MARGIN</strong></td>
                          <td className="px-4 py-3 text-right"></td>
                          <td className={`px-4 py-3 text-right font-semibold ${calculateTotals().profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                            <strong>{formatAmount(calculateTotals().profit)}</strong>
                          </td>
                          {canEditPayItems() && <td className="px-4 py-3 text-center"></td>}
                        </tr>
                        {/* Invoice Summary Header */}
                        <tr className="bg-blue-100 border-t-2 border-gray-300">
                          <td className="px-4 py-3 font-bold text-blue-900" colSpan={canEditPayItems() ? 4 : 3}><strong>INVOICE SUMMARY</strong></td>
                        </tr>
                        {/* Gross Total */}
                        <tr className="bg-gray-50">
                          <td className="px-4 py-3 text-gray-700">Gross Total</td>
                          <td className="px-4 py-3 text-right"></td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900"><strong>{formatAmount(calculateTotals().grossTotal)}</strong></td>
                          {canEditPayItems() && <td className="px-4 py-3 text-center"></td>}
                        </tr>
                        {/* Advance Payment */}
                        {selectedJob.advancePayment > 0 && (
                          <tr className="bg-gray-50">
                            <td className="px-4 py-3 text-gray-700">Advance Payment</td>
                            <td className="px-4 py-3 text-right"></td>
                            <td className="px-4 py-3 text-right font-semibold text-red-600">
                              <strong>({formatAmount(calculateTotals().advancePayment)})</strong>
                            </td>
                            {canEditPayItems() && <td className="px-4 py-3 text-center"></td>}
                          </tr>
                        )}
                        {/* Net Total */}
                        <tr className="bg-indigo-50 border-t-2 border-indigo-300">
                          <td className="px-4 py-3 font-bold text-indigo-900"><strong>NET TOTAL (CUSTOMER PAYABLE)</strong></td>
                          <td className="px-4 py-3 text-right border-l-2 border-indigo-300"></td>
                          <td className="px-4 py-3 text-right font-bold text-indigo-900">
                            <strong className="text-lg">{formatAmount(calculateTotals().netTotal)}</strong>
                          </td>
                          {canEditPayItems() && <td className="px-4 py-3 text-center"></td>}
                        </tr>
                      </tfoot>
                    </table>
                    </div>

                    <div className="p-6 flex gap-3">
                      <button 
                        onClick={() => setShowReviewInvoiceModal(true)} 
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                        disabled={!selectedJob || !selectedJob.payItems || selectedJob.payItems.length === 0 || !getAssignedClerks().length}
                      >
                        Review Invoice
                      </button>
                      <button onClick={generateBill} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium">
                        Generate Invoice
                      </button>
                      {showValidationModal && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                          <div className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4">
                            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                              <h3 className="text-lg font-semibold text-gray-900">Cannot Generate Invoice</h3>
                              <button className="text-gray-500 hover:text-gray-700 text-2xl leading-none" onClick={() => setShowValidationModal(false)}>×</button>
                            </div>
                            <div className="px-6 py-4 text-gray-700">
                              <p style={{ whiteSpace: 'pre-line' }}>{validationMessage}</p>
                            </div>
                            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
                              <button onClick={() => setShowValidationModal(false)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium">
                                OK, I'll Update the Job
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {(!selectedJob.payItems || selectedJob.payItems.length === 0) && !showPayItemsRow && (
                  <p className="text-center text-gray-500 py-8">No pay items added yet. Click "Add Items" to start.</p>
                )}
              </div>
            </div>
          )}
            </div>
          </div>
        </div>,
        document.body
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowGeneratedInvoices(!showGeneratedInvoices)}
                className="flex items-center justify-center w-6 h-6 text-gray-600 hover:text-gray-900 transition"
                title={showGeneratedInvoices ? 'Collapse' : 'Expand'}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points={showGeneratedInvoices ? "18 15 12 9 6 15" : "6 9 12 15 18 9"} />
                </svg>
              </button>
              <h2 className="text-xl font-semibold text-gray-900">Generated Invoices ({filteredBills.length})</h2>
            </div>
            {(statusFilter !== 'All' || customerFilter !== 'All') && (
              <button
                onClick={() => {
                  setStatusFilter('All');
                  setCustomerFilter('All');
                  setCurrentPage(1);
                }}
                className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition border border-gray-300"
                title="Clear all filters"
              >
                Clear Filters
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm bg-white"
              >
                <option value="All">All Status</option>
                <option value="Paid">Paid</option>
                <option value="Partially Paid">Partially Paid</option>
                <option value="Unpaid">Unpaid</option>
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">Customer</label>
              <select
                value={customerFilter}
                onChange={(e) => {
                  setCustomerFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm bg-white"
              >
                <option value="All">All Customers</option>
                {customers.map(customer => (
                  <option key={customer.customerId} value={customer.customerId}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">Print Mode</label>
              <select
                value={printMode}
                onChange={(e) => setPrintMode(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm bg-white"
              >
                <option value="color">Color (Theme)</option>
                <option value="bw">Black & White</option>
              </select>
            </div>
          </div>
        </div>
        {showGeneratedInvoices && (
          <>
            {filteredBills.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="text-4xl mb-4 text-gray-300">
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="mx-auto"
                  >
                    <rect x="6" y="3" width="12" height="18" rx="2" ry="2" />
                    <line x1="9" y1="8" x2="15" y2="8" />
                    <line x1="9" y1="12" x2="15" y2="12" />
                    <line x1="9" y1="16" x2="13" y2="16" />
                  </svg>
                </div>
                <p className="text-gray-500">
                  {bills.length === 0
                    ? 'No invoices generated yet'
                    : 'No invoices match the selected filters'}
                </p>
              </div>
        ) : (
          <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-gray-100 border-b-2 border-gray-300">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Invoice No</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Job ID</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Customer</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Invoice Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Due Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentRecords.map(bill => (
                  <React.Fragment key={bill.billId}>
                    <tr className={`border-b border-gray-200 hover:bg-gray-50 transition ${bill.isOverdue ? 'bg-red-50' : ''} ${expandedBillId === bill.billId ? 'bg-blue-50' : ''}`.trim()}>
                      <td data-label="Invoice No" className="px-4 py-3"><strong className="text-gray-900">{bill.invoiceNumber || bill.billId}</strong></td>
                      <td data-label="Job ID" className="px-4 py-3 text-gray-900">{bill.jobId}</td>
                      <td data-label="Customer" className="px-4 py-3 text-gray-900">{getCustomerName(bill.customerId)}</td>
                      <td data-label="Invoice Date" className="px-4 py-3 text-gray-900">
                        {formatDate(bill.invoiceDate)}
                      </td>
                      <td data-label="Due Date" className="px-4 py-3">
                        {bill.dueDate ? (
                          <div className="flex items-center gap-2">
                            <span className={`font-medium ${bill.isOverdue ? 'text-red-600' : 'text-gray-900'}`}>{formatDate(bill.dueDate)}</span>
                            {bill.isOverdue && <span className="inline-block px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded font-semibold">OVERDUE</span>}
                          </div>
                        ) : <span className="text-gray-900">-</span>}
                      </td>
                      <td data-label="Status" className="px-4 py-3">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                          bill.paymentStatus === 'Paid' ? 'bg-green-100 text-green-800' :
                          bill.paymentStatus === 'Partially Paid' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {bill.paymentStatus || 'Unpaid'}
                        </span>
                      </td>
                      <td data-label="Actions" className="px-4 py-3">
                        {renderGeneratedInvoiceActions(bill)}
                      </td>
                    </tr>
                    {expandedBillId === bill.billId && (
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <td colSpan="7" className="px-4 py-4">
                          {renderBillExpandedDetails(bill)}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}

        {bills.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalRecords={bills.length}
            recordsPerPage={recordsPerPage}
            onPageChange={handlePageChange}
            onRecordsPerPageChange={handleRecordsPerPageChange}
          />
        )}
          </>
        )}
      </div>

      {/* -------------------------------------------------------
           RECORD PAYMENT MODAL  ï¿½  3-Row Professional Layout
           Row 1: Invoice details strip
           Row 2: Payment type (Full / Partial) + amount
           Row 3: Payment method + cheque / bank fields
      ------------------------------------------------------- */}
      {showPaymentModal && selectedBillForPayment && (
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
                  <span className="text-sm text-gray-600 block">Invoice&nbsp;#{selectedBillForPayment.invoiceNumber || selectedBillForPayment.billId}</span>
                </div>
              </div>
              <button className="text-gray-400 hover:text-gray-600 text-2xl" onClick={() => setShowPaymentModal(false)} aria-label="Close">&times;</button>
            </div>

            {/* ROW 1 - Bill details */}
            <div className="p-6">
            <div className="flex gap-4 flex-wrap mb-6 pb-6 border-b border-gray-200">
              <div className="flex-1 min-w-32">
                <span className="text-xs font-bold text-gray-600 uppercase">Customer</span>
                <span className="block text-gray-900">{getCustomerName(selectedBillForPayment.customerId)}</span>
              </div>
              <div className="flex-1 min-w-32">
                <span className="text-xs font-bold text-gray-600 uppercase">Invoice</span>
                <span className="block text-gray-900 font-mono">{selectedBillForPayment.invoiceNumber || selectedBillForPayment.billId}</span>
              </div>
              <div className="flex-1 min-w-32">
                <span className="text-xs font-bold text-gray-600 uppercase">Invoice Total</span>
                <span className="block text-lg font-bold text-gray-900">LKR {formatAmount(parseFloat(selectedBillForPayment.netTotal || selectedBillForPayment.total) || 0)}</span>
              </div>
              {parseFloat(selectedBillForPayment.paidAmount) > 0 && (
                <div className="flex-1 min-w-32">
                  <span className="text-xs font-bold text-gray-600 uppercase">Already Paid</span>
                  <span className="block text-lg font-bold text-green-600">LKR {formatAmount(parseFloat(selectedBillForPayment.paidAmount))}</span>
                </div>
              )}
              <div className="flex-1 min-w-32">
                <span className="text-xs font-bold text-gray-600 uppercase">Amount Due</span>
                <span className="block text-lg font-bold text-orange-600">
                  LKR {formatAmount(
                    parseFloat(selectedBillForPayment.remainingAmount) > 0
                      ? selectedBillForPayment.remainingAmount
                      : (parseFloat(selectedBillForPayment.netTotal || selectedBillForPayment.total) - parseFloat(selectedBillForPayment.paidAmount || 0))
                  )}
                </span>
              </div>
            </div>

            {/* ROW 2 - Payment type + amount */}
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
                      LKR {formatAmount(
                        parseFloat(selectedBillForPayment.remainingAmount) > 0
                          ? selectedBillForPayment.remainingAmount
                          : (parseFloat(selectedBillForPayment.netTotal || selectedBillForPayment.total) - parseFloat(selectedBillForPayment.paidAmount || 0))
                      )}
                    </div>
                    <span className="text-xs text-gray-600 inline-block px-2 py-1 bg-gray-100 rounded">{parseFloat(selectedBillForPayment.paidAmount) > 0 ? 'Remaining balance' : 'Full balance'}</span>
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
                        <span className="text-gray-600">Invoice Total</span>
                        <span className="text-gray-900">LKR {formatAmount(parseFloat(selectedBillForPayment.netTotal || selectedBillForPayment.total) || 0)}</span>
                      </div>
                      {parseFloat(selectedBillForPayment.paidAmount) > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Already Paid</span>
                          <span className="text-green-600">LKR {formatAmount(parseFloat(selectedBillForPayment.paidAmount))}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">This Payment</span>
                        <span className="text-blue-600">LKR {formatAmount(parseFloat(partialPaymentAmount) || 0)}</span>
                      </div>
                      <div className="border-t border-gray-200 pt-2 flex justify-between text-sm font-semibold">
                        <span className="text-gray-900">Remaining After</span>
                        <span className="text-gray-900">LKR {formatAmount(Math.max(0,
                          (parseFloat(selectedBillForPayment.remainingAmount) ||
                           parseFloat(selectedBillForPayment.netTotal || selectedBillForPayment.total) -
                           parseFloat(selectedBillForPayment.paidAmount || 0))
                          - (parseFloat(partialPaymentAmount) || 0)
                        ))}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>{/* end ROW 2 */}

            {/* ROW 3 - Payment method + details */}
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
                        setChequeAutoFilled(false);
                        setChequeAutoFillData(null);
                        setChequeType('new');
                        setExistingCheques([]);
                      }}
                    >
                      {m === 'Cash' && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/></svg>}
                      {m === 'Cheque' && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></svg>}
                      {m === 'Bank Transfer' && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
                      {m}
                    </button>
                  ))}
                </div>

                {/* Cash — no extra fields */}
                {paymentMethod === 'Cash' && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-sm text-green-800">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                    Cash payment — no additional details required.
                  </div>
                )}
              </div>
              {/* Right: cheque / bank fields */}
              <div>

                {/* Cheque */}
                {paymentMethod === 'Cheque' && (
                  <>
                    <p className="text-sm font-bold text-gray-700 mb-3">Cheque Details</p>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Cheque Number <span className="text-red-600">*</span></label>
                        <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          value={chequeNumber}
                          onChange={e => { setChequeNumber(e.target.value); setChequeAutoFilled(false); }}
                          onBlur={e => handleChequeNumberBlur && handleChequeNumberBlur(e.target.value)}
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

                {/* -- Bank Transfer -- */}
                {paymentMethod === 'Bank Transfer' && (
                  <>
                    <p className="text-sm font-semibold text-gray-900 mb-3">Transfer Details</p>
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

                {/* -- Cash placeholder -- */}
                {paymentMethod === 'Cash' && (
                  <div className="text-center py-6">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" className="mx-auto mb-2"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/></svg>
                    <p className="text-sm text-gray-600">No additional details needed for cash.</p>
                  </div>
                )}

              </div>{/* end pm-details-panel */}

            </div>{/* end ROW 3 */}
            </div>{/* end pm-body */}

            {/* -- Footer -- */}
            <div className="border-t border-gray-200 px-6 py-4 flex gap-3 justify-end">
              <button className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium" onClick={() => setShowPaymentModal(false)}>Cancel</button>
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2" onClick={submitPayment}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                Confirm Payment
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Review Invoice Modal */}
      <ReviewInvoiceModal
        show={showReviewInvoiceModal}
        onClose={() => setShowReviewInvoiceModal(false)}
        job={selectedJob}
        assignedClerks={getAssignedClerks()}
        onSubmit={handleReviewInvoiceSubmit}
        loading={reviewInvoiceLoading}
      />

      {/* OLD INVOICES SECTION */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => setShowOldInvoices(!showOldInvoices)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0',
                display: 'flex',
                alignItems: 'center',
                fontSize: '18px',
                color: '#374151'
              }}
              title={showOldInvoices ? 'Collapse' : 'Expand'}
            >
              {showOldInvoices ? '▲' : '▼'}
            </button>
            <h2>Old Invoice Management ({oldInvoices.length})</h2>
            {user && (user.role === 'Admin' || user.role === 'Super Admin' || user.role === 'Manager' || user.role === 'Office Executive') && (
              <button 
                className="btn btn-primary" 
                onClick={() => {
                  setEditingOldInvoice(null);
                  setOldInvoiceFormData({
                    customerId: '',
                    cusdecNumber: '',
                    cusdecDate: '',
                    invoiceDate: '',
                    invoiceNumberSuffix: '',
                    totalAmount: '',
                    settleDate: ''
                  });
                  setOldInvoiceFormErrors({});
                  setShowOldInvoiceModal(true);
                }}
                style={{ marginLeft: 'auto' }}
              >
                + Add Old Invoice
              </button>
            )}
          </div>
          {showOldInvoices && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: '#4b5563', fontWeight: 600 }}>Status</span>
                <select
                  value={oldInvoiceFilterStatus}
                  onChange={(e) => setOldInvoiceFilterStatus(e.target.value)}
                  className="form-control"
                  style={{ minWidth: '150px', padding: '6px 10px' }}
                >
                  <option value="All">All</option>
                  <option value="Pending">Pending</option>
                  <option value="Partially Paid">Partially Paid</option>
                  <option value="Fully Settled">Fully Settled</option>
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                <input
                  type="text"
                  placeholder="Search by invoice number, customer, or cusdec..."
                  value={oldInvoiceSearchTerm}
                  onChange={(e) => setOldInvoiceSearchTerm(e.target.value)}
                  className="form-control"
                  style={{ padding: '6px 10px' }}
                />
              </div>
            </div>
          )}
        </div>

        {showOldInvoices && (
          <>
            {oldInvoices.filter(invoice => {
              const matchesSearch = 
                invoice.invoiceNumber.toLowerCase().includes(oldInvoiceSearchTerm.toLowerCase()) ||
                invoice.customerName.toLowerCase().includes(oldInvoiceSearchTerm.toLowerCase()) ||
                (invoice.cusdecNumber && invoice.cusdecNumber.toLowerCase().includes(oldInvoiceSearchTerm.toLowerCase()));
              
              const matchesStatus = oldInvoiceFilterStatus === 'All' || invoice.status === oldInvoiceFilterStatus;
              
              return matchesSearch && matchesStatus;
            }).length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <rect x="3" y="5" width="18" height="14" rx="2" ry="2" />
                    <path d="M3 9h18" />
                    <path d="M7 3h10" />
                  </svg>
                </div>
                <p>
                  {oldInvoices.length === 0
                    ? 'No old invoices found'
                    : 'No old invoices match the selected filters'}
                </p>
              </div>
            ) : (
              <div className="billing-table-wrapper">
                <table className="billing-table">
                  <thead>
                    <tr>
                      <th>Invoice Number</th>
                      <th>Customer</th>
                      <th>Cusdec Number</th>
                      <th>Invoice Date</th>
                      <th>Total Amount</th>
                      <th>Amount Received</th>
                      <th>Balance</th>
                      <th>Status</th>
                      <th className="expand-header"></th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {oldInvoices.filter(invoice => {
                      const matchesSearch = 
                        invoice.invoiceNumber.toLowerCase().includes(oldInvoiceSearchTerm.toLowerCase()) ||
                        invoice.customerName.toLowerCase().includes(oldInvoiceSearchTerm.toLowerCase()) ||
                        (invoice.cusdecNumber && invoice.cusdecNumber.toLowerCase().includes(oldInvoiceSearchTerm.toLowerCase()));
                      
                      const matchesStatus = oldInvoiceFilterStatus === 'All' || invoice.status === oldInvoiceFilterStatus;
                      
                      return matchesSearch && matchesStatus;
                    }).map(invoice => (
                      <React.Fragment key={invoice.oldInvoiceId}>
                        <tr className={expandedOldInvoiceRow === invoice.oldInvoiceId ? 'expanded' : ''}>
                          <td data-label="Invoice Number"><strong>{invoice.invoiceNumber}</strong></td>
                          <td data-label="Customer">{invoice.customerName}</td>
                          <td data-label="Cusdec Number">{invoice.cusdecNumber || '-'}</td>
                          <td data-label="Invoice Date">{new Date(invoice.invoiceDate).toLocaleDateString('en-GB')}</td>
                          <td data-label="Total Amount" className="amount">LKR {formatAmount(invoice.totalAmount)}</td>
                          <td data-label="Amount Received" className="amount">LKR {formatAmount(invoice.amountReceived)}</td>
                          <td data-label="Balance" className="amount">LKR {formatAmount(invoice.balance)}</td>
                          <td data-label="Status">
                            <span className={`status-badge status-${invoice.status.toLowerCase().replace(' ', '-')}`}>
                              {invoice.status}
                            </span>
                          </td>
                          <td className="expand-column">
                            <button
                              className="expand-btn-middle"
                              onClick={() => setExpandedOldInvoiceRow(expandedOldInvoiceRow === invoice.oldInvoiceId ? null : invoice.oldInvoiceId)}
                              title={expandedOldInvoiceRow === invoice.oldInvoiceId ? "Hide details" : "View details"}
                            >
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points={expandedOldInvoiceRow === invoice.oldInvoiceId ? "18 15 12 9 6 15" : "6 9 12 15 18 9"}></polyline>
                              </svg>
                            </button>
                          </td>
                          <td data-label="Actions">
                            <div className="action-buttons">
                              {invoice.balance > 0 && user && (user.role === 'Admin' || user.role === 'Super Admin' || user.role === 'Manager' || user.role === 'Office Executive') && (
                                <button 
                                  className="btn btn-primary btn-small"
                                  onClick={() => {
                                    setSelectedOldInvoice(invoice);
                                    setOldInvoicePaymentData({
                                      paymentAmount: '',
                                      paymentMethod: 'Cash',
                                      receivedDate: new Date().toISOString().split('T')[0],
                                      notes: '',
                                      chequeNumber: '',
                                      chequeDate: '',
                                      chequeAmount: '',
                                      bankName: ''
                                    });
                                    setShowOldPaymentModal(true);
                                  }}
                                  title="Add Payment"
                                >
                                  + Payment
                                </button>
                              )}
                              {user && (user.role === 'Admin' || user.role === 'Super Admin' || user.role === 'Manager' || user.role === 'Office Executive') && (
                                <>
                                  <button 
                                    className="btn btn-secondary btn-small"
                                    onClick={() => {
                                      const invoiceParts = invoice.invoiceNumber.split(' - INV');
                                      const suffix = invoiceParts[1] || '';
                                      
                                      setEditingOldInvoice(invoice);
                                      setOldInvoiceFormData({
                                        customerId: invoice.customerId,
                                        cusdecNumber: invoice.cusdecNumber || '',
                                        cusdecDate: invoice.cusdecDate ? invoice.cusdecDate.split('T')[0] : '',
                                        invoiceDate: invoice.invoiceDate.split('T')[0],
                                        invoiceNumberSuffix: suffix,
                                        totalAmount: invoice.totalAmount,
                                        settleDate: invoice.settleDate ? invoice.settleDate.split('T')[0] : ''
                                      });
                                      setShowOldInvoiceModal(true);
                                    }}
                                    title="Edit"
                                  >
                                    Edit
                                  </button>
                                  <button 
                                    className="btn btn-danger btn-small"
                                    onClick={async () => {
                                      if (!window.confirm('Are you sure you want to delete this invoice?')) return;
                                      try {
                                        const response = await fetch(`${API_BASE}/api/old-invoices/${invoice.oldInvoiceId}`, {
                                          method: 'DELETE',
                                          headers: {
                                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                                          }
                                        });
                                        if (response.ok) {
                                          setMessage('Invoice deleted successfully');
                                          fetchOldInvoices();
                                        } else {
                                          setMessage('Failed to delete invoice');
                                        }
                                      } catch (error) {
                                        console.error('Error deleting invoice:', error);
                                        setMessage('Failed to delete invoice');
                                      }
                                    }}
                                    title="Delete"
                                  >
                                    Delete
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                        {expandedOldInvoiceRow === invoice.oldInvoiceId && (
                          <tr className="details-row">
                            <td colSpan="10">
                              <div className="bill-details-expanded">
                                <div className="details-grid">
                                  <div className="detail-card">
                                    <div className="detail-label">Customer ID</div>
                                    <div className="detail-value">{invoice.customerId}</div>
                                  </div>
                                  <div className="detail-card">
                                    <div className="detail-label">Cusdec Date</div>
                                    <div className="detail-value">{invoice.cusdecDate ? new Date(invoice.cusdecDate).toLocaleDateString('en-GB') : '-'}</div>
                                  </div>
                                  <div className="detail-card">
                                    <div className="detail-label">Settle Date</div>
                                    <div className="detail-value">{invoice.settleDate ? new Date(invoice.settleDate).toLocaleDateString('en-GB') : '-'}</div>
                                  </div>
                                  <div className="detail-card">
                                    <div className="detail-label">Created</div>
                                    <div className="detail-value">{invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString('en-GB') : '-'}</div>
                                  </div>
                                </div>

                                {invoice.payments && invoice.payments.length > 0 && (
                                  <div className="invoice-payment-tracking-section">
                                    <div className="invoice-payment-tracking-header">
                                      <span className="invoice-payment-tracking-title">Payment History</span>
                                      <span className="invoice-payment-tracking-count">{invoice.payments.length} payment record{invoice.payments.length !== 1 ? 's' : ''}</span>
                                    </div>
                                    
                                    <div className="invoice-payment-tracking-table">
                                      <div className="invoice-payment-table-header">
                                        <div className="invoice-payment-header-cell invoice-payment-date-col">#</div>
                                        <div className="invoice-payment-header-cell invoice-payment-date-col">Payment Date</div>
                                        <div className="invoice-payment-header-cell invoice-payment-method-col">Method</div>
                                        <div className="invoice-payment-header-cell invoice-payment-reference-col">Reference</div>
                                        <div className="invoice-payment-header-cell invoice-payment-amount-col">Amount Paid</div>
                                        {user && (user.role === 'Admin' || user.role === 'Super Admin' || user.role === 'Manager' || user.role === 'Office Executive') && (
                                          <div className="payment-header-cell payment-amount-col">Actions</div>
                                        )}
                                      </div>
                                      
                                      <div className="payment-table-body">
                                        {invoice.payments.map((payment, idx) => (
                                          <div key={idx} className="payment-table-row">
                                            <div className="invoice-payment-table-cell payment-date-col">
                                              <span className="invoice-payment-num">{idx + 1}</span>
                                            </div>
                                            <div className="invoice-payment-table-cell payment-date-col">
                                              {new Date(payment.receivedDate).toLocaleDateString('en-GB')}
                                            </div>
                                            <div className="invoice-payment-table-cell payment-method-col">
                                              <span className={`payment-method-badge payment-method-${payment.paymentMethod?.toLowerCase().replace(' ', '-')}`}>
                                                {payment.paymentMethod === 'Cash' && '💵'}
                                                {payment.paymentMethod === 'Cheque' && '📄'}
                                                {payment.paymentMethod === 'Bank Transfer' && '🏦'}
                                                {' '}{payment.paymentMethod || '-'}
                                              </span>
                                            </div>
                                            <div className="invoice-payment-table-cell payment-reference-col">
                                              {payment.paymentMethod === 'Cheque' && payment.chequeNumber ? (
                                                <span className="invoice-reference-text">CHQ: {payment.chequeNumber}</span>
                                              ) : payment.paymentMethod === 'Bank Transfer' && payment.bankName ? (
                                                <span className="invoice-reference-text">{payment.bankName}</span>
                                              ) : payment.paymentMethod === 'Cash' ? (
                                                <span className="invoice-reference-text">Cash</span>
                                              ) : (
                                                <span className="reference-empty">-</span>
                                              )}
                                            </div>
                                            <div className="invoice-payment-table-cell payment-amount-col">
                                              <span className="invoice-payment-amount-value">LKR {formatAmount(payment.paymentAmount || 0)}</span>
                                            </div>
                                            {user && (user.role === 'Admin' || user.role === 'Super Admin' || user.role === 'Manager' || user.role === 'Office Executive') && (
                                              <div className="invoice-payment-table-cell payment-amount-col">
                                                <button 
                                                  className="btn btn-danger btn-small"
                                                  onClick={async () => {
                                                    if (!window.confirm('Are you sure you want to delete this payment?')) return;
                                                    try {
                                                      const response = await fetch(`${API_BASE}/api/old-invoices/payments/${payment.paymentId}`, {
                                                        method: 'DELETE',
                                                        headers: {
                                                          'Authorization': `Bearer ${localStorage.getItem('token')}`
                                                        }
                                                      });
                                                      if (response.ok) {
                                                        setMessage('Payment deleted successfully');
                                                        fetchOldInvoices();
                                                      } else {
                                                        setMessage('Failed to delete payment');
                                                      }
                                                    } catch (error) {
                                                      console.error('Error deleting payment:', error);
                                                      setMessage('Failed to delete payment');
                                                    }
                                                  }}
                                                >
                                                  Delete
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* Old Invoice Add/Edit Modal */}
      {showOldInvoiceModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editingOldInvoice ? 'Edit Old Invoice' : 'Add Old Invoice'}</h2>
              <button 
                className="modal-close" 
                onClick={() => {
                  setShowOldInvoiceModal(false);
                  setEditingOldInvoice(null);
                  setOldInvoiceFormData({
                    customerId: '',
                    cusdecNumber: '',
                    cusdecDate: '',
                    invoiceDate: '',
                    invoiceNumberSuffix: '',
                    totalAmount: '',
                    settleDate: ''
                  });
                  setOldInvoiceFormErrors({});
                }}
              >
                ï¿½
              </button>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              
              const errors = {};
              if (!oldInvoiceFormData.customerId) errors.customerId = 'Customer is required';
              if (!oldInvoiceFormData.invoiceDate) errors.invoiceDate = 'Invoice date is required';
              if (!oldInvoiceFormData.invoiceNumberSuffix) errors.invoiceNumberSuffix = 'Invoice number suffix is required';
              if (!oldInvoiceFormData.totalAmount || parseFloat(oldInvoiceFormData.totalAmount) <= 0) {
                errors.totalAmount = 'Total amount must be greater than 0';
              }
              
              if (Object.keys(errors).length > 0) {
                setOldInvoiceFormErrors(errors);
                setMessage('Please fix the errors in the form');
                return;
              }

              try {
                const invoiceNumber = `${new Date(oldInvoiceFormData.invoiceDate).getFullYear()}/${String(new Date(oldInvoiceFormData.invoiceDate).getMonth() + 1).padStart(2, '0')} - INV${oldInvoiceFormData.invoiceNumberSuffix}`;
                const totalAmount = parseFloat(oldInvoiceFormData.totalAmount);
                const balance = totalAmount;
                
                const payload = {
                  customerId: oldInvoiceFormData.customerId,
                  cusdecNumber: oldInvoiceFormData.cusdecNumber || null,
                  cusdecDate: oldInvoiceFormData.cusdecDate || null,
                  invoiceDate: oldInvoiceFormData.invoiceDate,
                  invoiceNumber: invoiceNumber,
                  totalAmount: totalAmount,
                  amountReceived: 0,
                  balance: balance,
                  status: 'Pending',
                  settleDate: oldInvoiceFormData.settleDate || null,
                  daysAfterInvoice: null
                };

                const url = editingOldInvoice
                  ? `${API_BASE}/api/old-invoices/${editingOldInvoice.oldInvoiceId}`
                  : `${API_BASE}/api/old-invoices`;
                
                const method = editingOldInvoice ? 'PUT' : 'POST';

                const response = await fetch(url, {
                  method: method,
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                  },
                  body: JSON.stringify(payload)
                });

                if (response.ok) {
                  setMessage(editingOldInvoice ? 'Invoice updated successfully' : 'Invoice created successfully');
                  fetchOldInvoices();
                  setShowOldInvoiceModal(false);
                  setEditingOldInvoice(null);
                  setOldInvoiceFormData({
                    customerId: '',
                    cusdecNumber: '',
                    cusdecDate: '',
                    invoiceDate: '',
                    invoiceNumberSuffix: '',
                    totalAmount: '',
                    settleDate: ''
                  });
                  setOldInvoiceFormErrors({});
                } else {
                  const error = await response.json();
                  setMessage(error.message || 'Failed to save invoice');
                }
              } catch (error) {
                console.error('Error saving invoice:', error);
                setMessage('Failed to save invoice');
              }
            }} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Customer *</label>
                  <select
                    value={oldInvoiceFormData.customerId}
                    onChange={(e) => setOldInvoiceFormData({...oldInvoiceFormData, customerId: e.target.value})}
                    className={oldInvoiceFormErrors.customerId ? 'error' : ''}
                    required
                  >
                    <option value="">Select Customer</option>
                    {customers.map(customer => (
                      <option key={customer.customerId} value={customer.customerId}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                  {oldInvoiceFormErrors.customerId && <span className="error-text">{oldInvoiceFormErrors.customerId}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Cusdec Number</label>
                  <input
                    type="text"
                    value={oldInvoiceFormData.cusdecNumber}
                    onChange={(e) => setOldInvoiceFormData({...oldInvoiceFormData, cusdecNumber: e.target.value})}
                    placeholder="Enter cusdec number"
                  />
                </div>
                <div className="form-group">
                  <label>Cusdec Date</label>
                  <input
                    type="date"
                    value={oldInvoiceFormData.cusdecDate}
                    onChange={(e) => setOldInvoiceFormData({...oldInvoiceFormData, cusdecDate: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Invoice Date *</label>
                  <input
                    type="date"
                    value={oldInvoiceFormData.invoiceDate}
                    onChange={(e) => setOldInvoiceFormData({...oldInvoiceFormData, invoiceDate: e.target.value})}
                    className={oldInvoiceFormErrors.invoiceDate ? 'error' : ''}
                    required
                  />
                  {oldInvoiceFormErrors.invoiceDate && <span className="error-text">{oldInvoiceFormErrors.invoiceDate}</span>}
                </div>
                <div className="form-group">
                  <label>Invoice Number Suffix *</label>
                  <input
                    type="text"
                    value={oldInvoiceFormData.invoiceNumberSuffix}
                    onChange={(e) => setOldInvoiceFormData({...oldInvoiceFormData, invoiceNumberSuffix: e.target.value})}
                    placeholder="e.g., 11959"
                    className={oldInvoiceFormErrors.invoiceNumberSuffix ? 'error' : ''}
                    required
                  />
                  {oldInvoiceFormErrors.invoiceNumberSuffix && <span className="error-text">{oldInvoiceFormErrors.invoiceNumberSuffix}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Total Amount (LKR) *</label>
                  <input
                    type="text"
                    value={oldInvoiceFormData.totalAmount}
                    onChange={(e) => setOldInvoiceFormData({...oldInvoiceFormData, totalAmount: e.target.value.replace(/,/g, '')})}
                    placeholder="0.00"
                    className={oldInvoiceFormErrors.totalAmount ? 'error' : ''}
                    required
                  />
                  {oldInvoiceFormErrors.totalAmount && <span className="error-text">{oldInvoiceFormErrors.totalAmount}</span>}
                </div>
                <div className="form-group">
                  <label>Settle Date (if fully settled)</label>
                  <input
                    type="date"
                    value={oldInvoiceFormData.settleDate}
                    onChange={(e) => setOldInvoiceFormData({...oldInvoiceFormData, settleDate: e.target.value})}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => {
                  setShowOldInvoiceModal(false);
                  setEditingOldInvoice(null);
                  setOldInvoiceFormData({
                    customerId: '',
                    cusdecNumber: '',
                    cusdecDate: '',
                    invoiceDate: '',
                    invoiceNumberSuffix: '',
                    totalAmount: '',
                    settleDate: ''
                  });
                  setOldInvoiceFormErrors({});
                }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingOldInvoice ? 'Update Invoice' : 'Create Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Old Invoice Payment Modal */}
      {showOldPaymentModal && selectedOldInvoice && (
        <div className="modal-overlay">
          <div className="modal-content modal-small">
            <div className="modal-header">
              <h2>Add Payment</h2>
              <button 
                className="modal-close" 
                onClick={() => {
                  setShowOldPaymentModal(false);
                  setSelectedOldInvoice(null);
                  setOldInvoicePaymentData({
                    paymentAmount: '',
                    paymentMethod: 'Cash',
                    receivedDate: new Date().toISOString().split('T')[0],
                    notes: '',
                    chequeNumber: '',
                    chequeDate: '',
                    chequeAmount: '',
                    bankName: ''
                  });
                }}
              >
                ï¿½
              </button>
            </div>
            
            <div className="payment-info">
              <p><strong>Invoice:</strong> {selectedOldInvoice.invoiceNumber}</p>
              <p><strong>Customer:</strong> {selectedOldInvoice.customerName}</p>
              <p><strong>Balance:</strong> LKR {formatAmount(selectedOldInvoice.balance)}</p>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              
              if (!oldInvoicePaymentData.paymentAmount || parseFloat(oldInvoicePaymentData.paymentAmount) <= 0) {
                setMessage('Payment amount must be greater than 0');
                return;
              }

              if (oldInvoicePaymentData.paymentMethod === 'Cheque') {
                if (!oldInvoicePaymentData.chequeNumber) {
                  setMessage('Cheque number is required for cheque payments');
                  return;
                }
                if (!oldInvoicePaymentData.chequeDate) {
                  setMessage('Cheque date is required for cheque payments');
                  return;
                }
                if (!oldInvoicePaymentData.chequeAmount || parseFloat(oldInvoicePaymentData.chequeAmount) <= 0) {
                  setMessage('Cheque amount must be greater than 0');
                  return;
                }
              }

              if (oldInvoicePaymentData.paymentMethod === 'Bank Transfer') {
                if (!oldInvoicePaymentData.bankName) {
                  setMessage('Bank name is required for bank transfer payments');
                  return;
                }
              }

              try {
                const payload = {
                  paymentAmount: parseFloat(oldInvoicePaymentData.paymentAmount),
                  paymentMethod: oldInvoicePaymentData.paymentMethod,
                  receivedDate: oldInvoicePaymentData.receivedDate,
                  notes: oldInvoicePaymentData.notes
                };

                if (oldInvoicePaymentData.paymentMethod === 'Cheque') {
                  payload.chequeNumber = oldInvoicePaymentData.chequeNumber;
                  payload.chequeDate = oldInvoicePaymentData.chequeDate;
                  payload.chequeAmount = parseFloat(oldInvoicePaymentData.chequeAmount);
                }

                if (oldInvoicePaymentData.paymentMethod === 'Bank Transfer') {
                  payload.bankName = oldInvoicePaymentData.bankName;
                }

                const response = await fetch(`${API_BASE}/api/old-invoices/${selectedOldInvoice.oldInvoiceId}/payments`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                  },
                  body: JSON.stringify(payload)
                });

                if (response.ok) {
                  setMessage('Payment added successfully');
                  fetchOldInvoices();
                  setShowOldPaymentModal(false);
                  setSelectedOldInvoice(null);
                  setOldInvoicePaymentData({
                    paymentAmount: '',
                    paymentMethod: 'Cash',
                    receivedDate: new Date().toISOString().split('T')[0],
                    notes: '',
                    chequeNumber: '',
                    chequeDate: '',
                    chequeAmount: '',
                    bankName: ''
                  });
                } else {
                  const error = await response.json();
                  setMessage(error.message || 'Failed to add payment');
                }
              } catch (error) {
                console.error('Error adding payment:', error);
                setMessage('Failed to add payment');
              }
            }} className="modal-form">
              <div className="form-group">
                <label>Payment Amount (LKR) *</label>
                <input
                  type="text"
                  value={oldInvoicePaymentData.paymentAmount}
                  onChange={(e) => setOldInvoicePaymentData({...oldInvoicePaymentData, paymentAmount: e.target.value.replace(/,/g, '')})}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="form-group">
                <label>Payment Method *</label>
                <select
                  value={oldInvoicePaymentData.paymentMethod}
                  onChange={(e) => setOldInvoicePaymentData({...oldInvoicePaymentData, paymentMethod: e.target.value})}
                  required
                >
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>

              {oldInvoicePaymentData.paymentMethod === 'Cheque' && (
                <>
                  <div className="form-group">
                    <label>Cheque Number *</label>
                    <input
                      type="text"
                      value={oldInvoicePaymentData.chequeNumber}
                      onChange={(e) => setOldInvoicePaymentData({...oldInvoicePaymentData, chequeNumber: e.target.value})}
                      placeholder="Enter cheque number"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Cheque Date *</label>
                    <input
                      type="date"
                      value={oldInvoicePaymentData.chequeDate}
                      onChange={(e) => setOldInvoicePaymentData({...oldInvoicePaymentData, chequeDate: e.target.value})}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Cheque Amount (LKR) *</label>
                    <input
                      type="text"
                      value={oldInvoicePaymentData.chequeAmount}
                      onChange={(e) => setOldInvoicePaymentData({...oldInvoicePaymentData, chequeAmount: e.target.value.replace(/,/g, '')})}
                      placeholder="0.00"
                      required
                    />
                  </div>
                </>
              )}

              {oldInvoicePaymentData.paymentMethod === 'Bank Transfer' && (
                <div className="form-group">
                  <label>Bank Name *</label>
                  <select
                    value={oldInvoicePaymentData.bankName}
                    onChange={(e) => setOldInvoicePaymentData({...oldInvoicePaymentData, bankName: e.target.value})}
                    required
                  >
                    <option value="">Select Bank</option>
                    <option value="Commercial Bank">Commercial Bank</option>
                    <option value="Peoples Bank">Peoples Bank</option>
                    <option value="Bank of Ceylon">Bank of Ceylon</option>
                    <option value="Hatton National Bank">Hatton National Bank</option>
                    <option value="Sampath Bank">Sampath Bank</option>
                    <option value="Nations Trust Bank">Nations Trust Bank</option>
                    <option value="DFCC Bank">DFCC Bank</option>
                  </select>
                </div>
              )}

              <div className="form-group">
                <label>Received Date *</label>
                <input
                  type="date"
                  value={oldInvoicePaymentData.receivedDate}
                  onChange={(e) => setOldInvoicePaymentData({...oldInvoicePaymentData, receivedDate: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={oldInvoicePaymentData.notes}
                  onChange={(e) => setOldInvoicePaymentData({...oldInvoicePaymentData, notes: e.target.value})}
                  placeholder="Optional notes"
                  rows="3"
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => {
                  setShowOldPaymentModal(false);
                  setSelectedOldInvoice(null);
                  setOldInvoicePaymentData({
                    paymentAmount: '',
                    paymentMethod: 'Cash',
                    receivedDate: new Date().toISOString().split('T')[0],
                    notes: '',
                    chequeNumber: '',
                    chequeDate: '',
                    chequeAmount: '',
                    bankName: ''
                  });
                }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Add Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Job Information Modal for Mobile */}
      {showJobInfoModal && selectedJob && (
        <div className="modal-overlay">
          <div className="modal modal-large">
            <div className="modal-header">
              <h2>Job Information</h2>
              <button className="btn-close" onClick={() => setShowJobInfoModal(false)}>ï¿½</button>
            </div>
            <div className="job-info-modal-content">
              <div className="info-grid">
                <div className="info-section">
                  <h4 className="section-title">Basic Information</h4>
                  <div className="info-item">
                    <span className="info-label">Job ID:</span>
                    <span className="info-value">{selectedJob.jobId}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Customer:</span>
                    <span className="info-value">{getCustomerName(selectedJob.customerId)}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Category:</span>
                    <span className="info-value">{selectedJob.shipmentCategory}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Status:</span>
                    <span className={`status-badge status-${(selectedJob.status || 'Open').toLowerCase().replace(/\s+/g, '-')}`}>
                      {selectedJob.status || 'Open'}
                    </span>
                  </div>
                </div>

                <div className="info-section">
                  <h4 className="section-title">Shipment Details</h4>
                  <div className="info-item">
                    <span className="info-label">BL Number: {(!selectedJob.blNumber || selectedJob.blNumber.trim() === '') && <span className="required-badge">*Required</span>}</span>
                    <span className={`info-value ${!selectedJob.blNumber ? 'missing' : ''}`}>{selectedJob.blNumber || '-'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">CUSDEC Number: {(!selectedJob.cusdecNumber || selectedJob.cusdecNumber.trim() === '') && <span className="required-badge">*Required</span>}</span>
                    <span className={`info-value ${!selectedJob.cusdecNumber ? 'missing' : ''}`}>{formatCusdecWithDate(selectedJob.cusdecNumber, selectedJob.cusdecDate)}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">LC/TT Number: {(!selectedJob.lcNumber || selectedJob.lcNumber.trim() === '') && <span className="required-badge">*Required</span>}</span>
                    <span className={`info-value ${!selectedJob.lcNumber ? 'missing' : ''}`}>{selectedJob.lcNumber || '-'}</span>
                  </div>
                  {selectedJob.shipmentCategory && (selectedJob.shipmentCategory.includes('Vehicle')) && (
                    <div className="info-item">
                      <span className="info-label">Chassis Number: {(!selectedJob.chassisNumber || selectedJob.chassisNumber.trim() === '') && <span className="required-badge">*Required</span>}</span>
                      <span className={`info-value ${!selectedJob.chassisNumber ? 'missing' : ''}`}>{selectedJob.chassisNumber || '-'}</span>
                    </div>
                  )}
                  {selectedJob.shipmentCategory && !selectedJob.shipmentCategory.includes('Vehicle') && (
                    <div className="info-item">
                      <span className="info-label">Container Number: {(!selectedJob.containerNumber || selectedJob.containerNumber.trim() === '') && <span className="required-badge">*Required</span>}</span>
                      <span className={`info-value ${!selectedJob.containerNumber ? 'missing' : ''}`}>{selectedJob.containerNumber || '-'}</span>
                    </div>
                  )}
                </div>

                <div className="info-section">
                  <h4 className="section-title">Logistics</h4>
                  <div className="info-item">
                    <span className="info-label">Exporter:</span>
                    <span className="info-value">{selectedJob.exporter || '-'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Transporter:</span>
                    <select 
                      value={selectedJob.transporter || ''}
                      onChange={(e) => handleTransporterChange(e.target.value)}
                      className="transporter-select-modal"
                    >
                      <option value="">Select Transporter</option>
                      {transporters.map((transporter) => (
                        <option key={transporter.transporterId} value={transporter.name}>
                          {transporter.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Open Date:</span>
                    <span className="info-value">{selectedJob.openDate ? new Date(selectedJob.openDate).toLocaleDateString() : '-'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Delivery Date:</span>
                    <span className="info-value">{selectedJob.transportDeliveryDate ? new Date(selectedJob.transportDeliveryDate).toLocaleDateString() : '-'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPaymentBreakdownModal && paymentBreakdownBill && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={() => setShowPaymentBreakdownModal(false)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-4xl my-8" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 flex items-center justify-between px-8 py-6 border-b border-gray-200 bg-white rounded-t-xl">
              <h3 className="text-2xl font-bold text-gray-900">Payment Breakdown - Invoice {paymentBreakdownBill.invoiceNumber || paymentBreakdownBill.billId}</h3>
              <button 
                className="text-gray-500 hover:text-gray-700 text-3xl leading-none" 
                onClick={() => setShowPaymentBreakdownModal(false)}
              >
                ×
              </button>
            </div>
            <div className="p-8 space-y-8 max-h-[calc(100vh-200px)] overflow-y-auto">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="grid grid-cols-2 gap-6 pb-6 border-b border-blue-300">
                  <div>
                    <span className="font-semibold text-gray-600 text-sm block mb-1">Gross Total</span>
                    <span className="font-semibold text-gray-900 text-lg">LKR {formatAmount(paymentBreakdownBill.grossTotal || 0)}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-gray-600 text-sm block mb-1">Advance Payment</span>
                    <span className="font-semibold text-gray-900 text-lg">LKR ({formatAmount(paymentBreakdownBill.advancePayment || 0)})</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6 py-6 border-b border-blue-300">
                  <div>
                    <span className="font-bold text-blue-700 text-sm block mb-1">Net Total</span>
                    <span className="font-bold text-gray-900 text-2xl">LKR {formatAmount(paymentBreakdownBill.netTotal || paymentBreakdownBill.total || 0)}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-gray-600 text-sm block mb-1">Paid Amount</span>
                    <span className="font-semibold text-gray-900 text-lg">LKR {formatAmount(paymentBreakdownBill.paidAmount || 0)}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6 pt-6">
                  <div>
                    <span className="font-bold text-green-700 text-sm block mb-1">Remaining Balance</span>
                    <span className="font-bold text-green-700 text-2xl">LKR {formatAmount(paymentBreakdownBill.remainingAmount || 0)}</span>
                  </div>
                </div>
              </div>

              {(paymentBreakdownBill.paymentStatus === 'Partially Paid' || paymentBreakdownBill.paymentStatus === 'Paid') && paymentBreakdownBill.paymentRecords && paymentBreakdownBill.paymentRecords.length > 0 && (
                <div>
                  <h4 className="text-lg font-bold text-gray-900 uppercase tracking-wider mb-6">Payment History</h4>
                  <div className="border border-gray-300 rounded-lg overflow-hidden">
                    <div className="grid grid-cols-5 bg-gray-100 border-b-2 border-gray-300">
                      <div className="px-4 py-3 font-bold text-gray-700 text-xs uppercase tracking-wide border-r border-gray-300 text-center">#</div>
                      <div className="px-4 py-3 font-bold text-gray-700 text-xs uppercase tracking-wide border-r border-gray-300 text-center">DATE</div>
                      <div className="px-4 py-3 font-bold text-gray-700 text-xs uppercase tracking-wide border-r border-gray-300 text-center">METHOD</div>
                      <div className="px-4 py-3 font-bold text-gray-700 text-xs uppercase tracking-wide border-r border-gray-300">REFERENCE</div>
                      <div className="px-4 py-3 font-bold text-gray-700 text-xs uppercase tracking-wide text-right">AMOUNT</div>
                    </div>
                    {paymentBreakdownBill.paymentRecords.map((payment, idx) => (
                      <div key={idx} className="grid grid-cols-5 border-b border-gray-200 hover:bg-gray-50 transition">
                        <div className="px-4 py-3 text-sm text-gray-600 border-r border-gray-300 flex items-center justify-center font-medium">{idx + 1}</div>
                        <div className="px-4 py-3 text-sm text-gray-900 border-r border-gray-300 flex items-center justify-center">{formatDateWithMonth(payment.paymentDate)}</div>
                        <div className="px-4 py-3 text-sm border-r border-gray-300 flex items-center justify-center">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide whitespace-nowrap ${
                            payment.paymentMethod === 'Cheque' ? 'bg-yellow-100 text-yellow-800' : 
                            payment.paymentMethod === 'Cash' ? 'bg-green-100 text-green-800' : 
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {payment.paymentMethod || '-'}
                          </span>
                        </div>
                        <div className="px-4 py-3 text-sm text-gray-900 border-r border-gray-300 flex items-center">
                          {payment.paymentMethod === 'Cheque' && payment.chequeNumber ? `CHQ: ${payment.chequeNumber}` : payment.paymentMethod === 'Bank Transfer' && payment.bankName ? payment.bankName : '-'}
                        </div>
                        <div className="px-4 py-3 text-sm text-gray-900 flex items-center justify-end font-mono font-bold">LKR {formatAmount(payment.amount || 0)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Billing;

