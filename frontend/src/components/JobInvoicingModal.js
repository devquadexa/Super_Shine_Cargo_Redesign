import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { billingService } from '../api/services/billingService';
import { jobService } from '../api/services/jobService';
import { customerService } from '../api/services/customerService';
import { transporterService } from '../api/services/transporterService';
import { invoiceReviewService } from '../api/services/invoiceReviewService';
import API_BASE from '../api/config';
import apiClient from '../api/client';
import ReviewInvoiceModal from './ReviewInvoiceModal';
import { formatDate, formatDateWithMonth } from '../utils/dateFormatter';

/**
 * JobInvoicingModal - Comprehensive invoicing system integrated into job management
 * Handles: pay item management, invoice creation, payments, reviews
 */
function JobInvoicingModal({ job, isOpen, onClose, onInvoiceCreated }) {
  const { user } = useAuth();
  
  // Format helpers
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
    const fromPlace = job?.exporter || 'placename';
    const toPlace = job?.transporter || 'placename';
    const description = `transporter cost (from ${fromPlace} to ${toPlace})`;
    
    return {
      name: description,
      actualCost: '',
      billingAmount: '',
      sameAmount: false,
      hasBill: false
    };
  };

  const getDisplayDescription = (item) => {
    const description = item.description || item.name || '';
    const normalized = description.toLowerCase().trim();
    
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
    hasBill: false,
    isNewItem: true
  });

  const calculateTotals = () => {
    const totalActualCost = payItems.reduce((sum, item) => {
      return sum + (parseFloat(item.actualCost) || 0);
    }, 0);

    const totalBillingAmount = payItems.reduce((sum, item) => {
      return sum + (parseFloat(item.billingAmount) || 0);
    }, 0);

    const profit = totalBillingAmount - totalActualCost;

    return {
      totalActualCost,
      totalBillingAmount,
      profit
    };
  };

  const checkAllItemsHaveBillingAmounts = () => {
    // Check if all items have both actualCost AND billingAmount filled
    const allFilled = payItems.every(item => {
      const hasActualCost = item.actualCost && parseFloat(item.actualCost) > 0;
      const hasBillingAmount = item.billingAmount && parseFloat(item.billingAmount) > 0;
      return hasActualCost && hasBillingAmount;
    });
    setAllItemsHaveBillingAmounts(allFilled);
    return allFilled;
  };

  const handleAddPayItem = () => {
    const newPayItems = [...payItems, getBlankPayItem()];
    setPayItems(newPayItems);
  };

  const handleAddTransporterCost = () => {
    const fromPlace = job?.exporter || 'Origin';
    const toPlace = job?.importer || 'Destination';
    const description = `transporter cost (from ${fromPlace} to ${toPlace})`;
    
    const newPayItems = [...payItems, {
      name: description,
      actualCost: '',
      billingAmount: '',
      sameAmount: false,
      hasBill: false,
      isNewItem: true
    }];
    setPayItems(newPayItems);
  };

  const hasTransporterCostItem = (items) => {
    return Array.isArray(items) && items.some(item => {
      const label = (item?.name || item?.description || '').toLowerCase().trim();
      return label.startsWith('transporter cost (from');
    });
  };

  const isTransporterCostLabel = (value) => {
    const normalized = String(value || '').toLowerCase().trim();
    return normalized.startsWith('transporter cost (from');
  };

  // State management
  const [payItems, setPayItems] = useState([]);
  const [showPayItemsRow, setShowPayItemsRow] = useState(false);
  const [message, setMessage] = useState('');
  const [loadingSettlement, setLoadingSettlement] = useState(false);
  const [bills, setBills] = useState([]);
  const [expandedBillId, setExpandedBillId] = useState(null);
  const [payItemsSaved, setPayItemsSaved] = useState(false);
  const [allItemsHaveBillingAmounts, setAllItemsHaveBillingAmounts] = useState(false); // Track if all items have billing amounts
  
  // Payment modal states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedBillForPayment, setSelectedBillForPayment] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [chequeNumber, setChequeNumber] = useState('');
  const [chequeDate, setChequeDate] = useState('');
  const [chequeAmount, setChequeAmount] = useState('');
  const [bankName, setBankName] = useState('Commercial Bank');
  const [paymentMode, setPaymentMode] = useState('full');
  const [partialPaymentAmount, setPartialPaymentAmount] = useState('');
  
  // Review invoice modal
  const [showReviewInvoiceModal, setShowReviewInvoiceModal] = useState(false);
  const [reviewInvoiceLoading, setReviewInvoiceLoading] = useState(false);

  // Load bills and pay items when modal opens
  useEffect(() => {
    if (isOpen && job) {
      loadJobBills();
      loadPayItems();
    }
  }, [isOpen, job]);

  const loadJobBills = async () => {
    try {
      const data = await billingService.getBills();
      
      // Filter bills for this job
      const jobBills = data.filter(bill => bill.jobId === job.jobId);
      
      // Calculate total from job's pay items for fallback
      let jobPayItemsTotal = 0;
      if (job?.payItems) {
        const items = typeof job.payItems === 'string' ? JSON.parse(job.payItems) : (Array.isArray(job.payItems) ? job.payItems : []);
        jobPayItemsTotal = items.reduce((sum, item) => sum + (parseFloat(item.billingAmount) || parseFloat(item.amount) || 0), 0);
      }
      
      // Fetch payment records for each bill
      const billsWithPayments = await Promise.all(
        jobBills.map(async (bill) => {
          try {
            const paymentRecords = await apiClient.get(`/payments/bill/${bill.billId}`);
            const records = Array.isArray(paymentRecords.data) ? paymentRecords.data : [];
            
            // If bill amounts are 0, use calculated total from pay items
            let enrichedBill = { ...bill, paymentRecords: records };
            const billAmount = parseFloat(bill.netTotal) || parseFloat(bill.billingAmount) || parseFloat(bill.grossTotal) || 0;
            if (billAmount === 0 && jobPayItemsTotal > 0) {
              enrichedBill.netTotal = jobPayItemsTotal;
              enrichedBill.billingAmount = jobPayItemsTotal;
              enrichedBill.grossTotal = jobPayItemsTotal;
            }
            
            return enrichedBill;
          } catch (error) {
            return { ...bill, paymentRecords: [] };
          }
        })
      );
      
      setBills(billsWithPayments);
    } catch (error) {
      console.error('Error loading bills:', error);
    }
  };

  const loadPayItems = async () => {
    try {
      let allPayItems = [];
      
      // 1. First priority: Load from job.payItems (saved when invoice was created)
      if (job?.payItems && Array.isArray(job.payItems) && job.payItems.length > 0) {
        job.payItems.forEach(item => {
          allPayItems.push({
            name: item.description || item.name || '',
            actualCost: item.actualCost || item.amount || 0,
            billingAmount: item.billingAmount || 0,
            sameAmount: false,
            paidBy: item.paidBy || 'Office',
            paidByName: item.paidByName || item.paidBy || 'Office',
            hasBill: true,
            source: item.source || 'Unknown',
            isReadOnly: false
          });
        });
        setPayItemsSaved(true); // Mark as saved since loaded from job.payItems
      } else {
        // 2. Load from office pay items
        try {
          const officePayItemsResponse = await fetch(`${API_BASE}/api/office-pay-items/job/${job.jobId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });
          
          if (officePayItemsResponse.ok) {
            const officePayItems = await officePayItemsResponse.json();
            officePayItems.forEach(item => {
              allPayItems.push({
                name: item.description,
                actualCost: item.actualCost,
                billingAmount: item.billingAmount || 0,
                sameAmount: false,
                paidBy: item.paidBy,
                paidByName: item.paidByName,
                hasBill: item.hasBill || false,
                isOfficePayItem: true,
                officePayItemId: item.officePayItemId,
                isReadOnly: false
              });
            });
          }
        } catch (error) {
          console.error('Error loading office pay items:', error);
        }
        
        // 3. Load Petty Cash Settlement Items (if settled)
        if (job?.pettyCashStatus === 'Settled') {
          setLoadingSettlement(true);
          try {
            const response = await fetch(`${API_BASE}/api/petty-cash-assignments/job/${job.jobId}/all`, {
              headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            
            if (response.ok) {
              const assignments = await response.json();
              if (Array.isArray(assignments)) {
                assignments.forEach(assignment => {
                  if (assignment.settlementItems && Array.isArray(assignment.settlementItems)) {
                    assignment.settlementItems.forEach(item => {
                      allPayItems.push({
                        name: item.itemName,
                        actualCost: item.actualCost,
                        billingAmount: '',
                        sameAmount: false,
                        paidBy: item.paidBy || assignment.assignedTo,
                        paidByName: item.paidByName || assignment.assignedToName,
                        isCustomItem: item.isCustomItem,
                        hasBill: item.hasBill === true || item.hasBill === 1,
                        isPettyCashItem: true,
                        isReadOnly: false
                      });
                    });
                  }
                });
              }
            }
          } catch (error) {
            console.error('Error loading settlement:', error);
          } finally {
            setLoadingSettlement(false);
          }
        }
      }
      
      setPayItems(allPayItems);
      setShowPayItemsRow(allPayItems.length > 0);
      // Check if all loaded items have billing amounts
      if (allPayItems.length > 0) {
        setTimeout(() => checkAllItemsHaveBillingAmounts(), 0);
      }
    } catch (error) {
      console.error('Error loading pay items:', error);
      setMessage('Error loading pay items');
    }
  };

  const handlePayItemChange = (index, field, value) => {
    const newPayItems = [...payItems];
    newPayItems[index][field] = value;
    
    // Auto-fill billing amount if "same amount" is checked
    if (field === 'sameAmount' && value) {
      newPayItems[index].billingAmount = newPayItems[index].actualCost;
    }
    
    // Auto-fill billing amount when actual cost changes and "same amount" is checked
    if (field === 'actualCost' && newPayItems[index].sameAmount) {
      newPayItems[index].billingAmount = value;
    }
    
    setPayItems(newPayItems);
  };

  const savePayItems = async () => {
    // Validate job details BEFORE saving pay items
    const missingFields = [];
    
    if (!job.blNumber || (typeof job.blNumber === 'string' && job.blNumber.trim() === '')) {
      missingFields.push('BL Number');
    }
    
    if (!job.cusdecNumber || (typeof job.cusdecNumber === 'string' && job.cusdecNumber.trim() === '')) {
      missingFields.push('CUSDEC Number');
    }
    
    if (!job.lcNumber || (typeof job.lcNumber === 'string' && job.lcNumber.trim() === '')) {
      missingFields.push('TT / LC / DA / DP / NFE Number');
    }
    
    // Container Number is only required for non-vehicle shipments
    const isVehicleShipment = job.shipmentCategory === 'Vehicle - Personal' || job.shipmentCategory === 'Vehicle - Company' || job.shipmentCategory === 'Vehicle';
    if (
      !isVehicleShipment &&
      (!job.containerNumber || (typeof job.containerNumber === 'string' && job.containerNumber.trim() === ''))
    ) {
      missingFields.push('Container Number');
    }
    
    // Chassis Number is required for vehicle shipments
    if (
      isVehicleShipment &&
      (!job.chassisNumber || (typeof job.chassisNumber === 'string' && job.chassisNumber.trim() === ''))
    ) {
      missingFields.push('Chassis Number');
    }
    
    // Transporter and Transport Delivery Date are required for FCL jobs
    const isFclJob = job.shipmentCategory === 'FCL';
    if (isFclJob) {
      if (!job.transporter || (typeof job.transporter === 'string' && job.transporter.trim() === '')) {
        missingFields.push('Transporter');
      }
      if (!job.transportDeliveryDate || (typeof job.transportDeliveryDate === 'string' && job.transportDeliveryDate.trim() === '')) {
        missingFields.push('Transport Delivery Date');
      }
    }

    // If validation fails, show error message with missing fields
    if (missingFields.length > 0) {
      const fieldsList = missingFields.join('\n• ');
      setMessage(`❌ Cannot save pay items. Please complete the following required fields:\n• ${fieldsList}`);
      setTimeout(() => setMessage(''), 7000);
      return;
    }

    // Validate pay items
    const validPayItems = payItems.filter(item => {
      return item.name && 
             (item.actualCost || item.actualCost === 0) && 
             (item.billingAmount || item.billingAmount === 0);
    });
    
    if (validPayItems.length === 0) {
      setMessage('Please fill in all required fields for at least one pay item');
      setTimeout(() => setMessage(''), 5000);
      return;
    }

    try {
      // Update office pay items billing amounts
      const officePayItems = validPayItems.filter(item => item.isOfficePayItem);
      for (const item of officePayItems) {
        if (item.officePayItemId) {
          await fetch(`${API_BASE}/api/office-pay-items/${item.officePayItemId}`, {
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
        }
      }
      
      // Save pay items to job
      const newPayItemsData = validPayItems.map(item => ({
        description: item.name,
        amount: parseFloat(item.actualCost),
        actualCost: parseFloat(item.actualCost),
        billingAmount: parseFloat(item.billingAmount),
        paidBy: item.paidByName || item.paidBy || 'Office',
        source: item.isOfficePayItem ? 'Office Payment' : item.isPettyCashItem ? 'Petty Cash' : 'Custom'
      }));
      
      await jobService.replacePayItems(job.jobId, newPayItemsData);
      
      setPayItemsSaved(true); // Mark as saved after successful save
      setMessage(`✅ ${validPayItems.length} pay item(s) saved successfully!`);
      setShowPayItemsRow(false);
      
      // Refresh job data
      await loadJobBills();
      
      setTimeout(() => setMessage(''), 5000);
    } catch (error) {
      console.error('Error saving pay items:', error);
      setMessage('Error saving pay items');
      setTimeout(() => setMessage(''), 5000);
    }
  };

  const generateBill = async () => {
    // Validate job selection
    if (!job) {
      setMessage('Please select a job first.');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    // Validate pay items - use local state (payItems) since job prop may not be updated yet
    if (!payItems || payItems.length === 0) {
      setMessage('No pay items found. Please add pay items first.');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    // Validate required job fields (matching Billing.js validation)
    const missingFields = [];
    
    if (!job.blNumber || (typeof job.blNumber === 'string' && job.blNumber.trim() === '')) {
      missingFields.push('BL Number');
    }
    
    if (!job.cusdecNumber || (typeof job.cusdecNumber === 'string' && job.cusdecNumber.trim() === '')) {
      missingFields.push('CUSDEC Number');
    }
    
    if (!job.lcNumber || (typeof job.lcNumber === 'string' && job.lcNumber.trim() === '')) {
      missingFields.push('TT / LC / DA / DP / NFE Number');
    }
    
    // Container Number is only required for non-vehicle shipments
    const isVehicleShipment = job.shipmentCategory === 'Vehicle - Personal' || job.shipmentCategory === 'Vehicle - Company' || job.shipmentCategory === 'Vehicle';
    if (
      !isVehicleShipment &&
      (!job.containerNumber || (typeof job.containerNumber === 'string' && job.containerNumber.trim() === ''))
    ) {
      missingFields.push('Container Number');
    }
    
    // Chassis Number is required for vehicle shipments
    if (
      isVehicleShipment &&
      (!job.chassisNumber || (typeof job.chassisNumber === 'string' && job.chassisNumber.trim() === ''))
    ) {
      missingFields.push('Chassis Number');
    }
    
    // Transporter and Transport Delivery Date are required for FCL jobs
    const isFclJob = job.shipmentCategory === 'FCL';
    if (isFclJob) {
      if (!job.transporter || (typeof job.transporter === 'string' && job.transporter.trim() === '')) {
        missingFields.push('Transporter');
      }
      if (!job.transportDeliveryDate || (typeof job.transportDeliveryDate === 'string' && job.transportDeliveryDate.trim() === '')) {
        missingFields.push('Transport Delivery Date');
      }
    }

    // If validation fails, show error message with missing fields
    if (missingFields.length > 0) {
      const fieldsList = missingFields.join('\n• ');
      setMessage(`❌ Cannot generate invoice. Please complete the following required fields:\n• ${fieldsList}`);
      setTimeout(() => setMessage(''), 7000);
      return;
    }

    try {
      // Calculate totals from pay items
      const { totalActualCost, totalBillingAmount } = calculateTotals();
      
      if (totalActualCost === 0 && totalBillingAmount === 0) {
        setMessage('Error: Unable to calculate totals. Please ensure pay items have amounts filled in.');
        setTimeout(() => setMessage(''), 5000);
        return;
      }

      const billData = {
        jobId: job.jobId,
        customerId: job.customerId,
        actualCost: totalActualCost,
        billingAmount: totalBillingAmount,
        grossTotal: totalBillingAmount,
        netTotal: totalBillingAmount
      };
      
      const newBill = await billingService.createBill(billData);
      setMessage('✅ Invoice generated successfully!');
      
      await loadJobBills();
      onInvoiceCreated && onInvoiceCreated(newBill);
      
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error generating bill:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Error generating invoice';
      setMessage(`❌ ${errorMessage}`);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  const handleReviewInvoiceSubmit = async (reviewData) => {
    setReviewInvoiceLoading(true);
    try {
      const payload = {
        jobId: job.jobId,
        billId: reviewData.billId,
        reviewNotes: reviewData.notes,
        payItems: job.payItems || []
      };
      
      await invoiceReviewService.sendReview(payload);
      setMessage('✅ Invoice sent to clerk for review!');
      setShowReviewInvoiceModal(false);
      
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error sending review:', error);
      setMessage('Error sending invoice for review');
    } finally {
      setReviewInvoiceLoading(false);
    }
  };

  const submitPayment = async () => {
    if (!selectedBillForPayment) return;
    
    try {
      const { totalActualCost, totalBillingAmount } = calculateTotals();
      const invoiceTotal = totalBillingAmount || parseFloat(selectedBillForPayment.netTotal) || parseFloat(selectedBillForPayment.billingAmount) || parseFloat(selectedBillForPayment.grossTotal) || parseFloat(selectedBillForPayment.total) || 0;
      const paidAlready = parseFloat(selectedBillForPayment.paidAmount) || 0;
      const amountDue = invoiceTotal - paidAlready;

      // Always update the bill amounts before recording payment to ensure DB is in sync
      if (totalBillingAmount > 0) {
        const billUpdateData = {
          jobId: job.jobId,
          customerId: job.customerId,
          actualCost: totalActualCost,
          billingAmount: totalBillingAmount,
          grossTotal: totalBillingAmount,
          netTotal: totalBillingAmount
        };
        const updateResult = await billingService.createBill(billUpdateData);
        // If bill was blocked (already paid), skip the update
        if (updateResult && updateResult.blocked) {
          // Bill is already paid/partially paid via another path, proceed with payment
        }
      }

      const paymentData = {
        paymentMethod: paymentMethod,
        paymentDate: new Date().toISOString().split('T')[0],
        paidDate: new Date().toISOString().split('T')[0],
        notes: ''
      };
      
      if (paymentMethod === 'Cheque') {
        paymentData.chequeNumber = chequeNumber;
        paymentData.chequeDate = chequeDate;
        paymentData.chequeAmount = paymentMode === 'full' ? amountDue : parseFloat(partialPaymentAmount);
        paymentData.bankName = bankName;
      }
      
      if (paymentMethod === 'Bank Transfer') {
        paymentData.bankName = bankName;
      }
      
      if (paymentMode === 'full') {
        await billingService.markAsPaid(selectedBillForPayment.billId, paymentData);
        setMessage('✅ Invoice marked as paid!');
      } else {
        await billingService.applyPartialPayment(
          selectedBillForPayment.billId,
          parseFloat(partialPaymentAmount),
          paymentData
        );
        setMessage('✅ Partial payment recorded!');
      }
      
      setShowPaymentModal(false);
      resetPaymentForm();
      await loadJobBills();
      
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error recording payment:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Error recording payment';
      setMessage(`Error: ${errorMsg}`);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  const resetPaymentForm = () => {
    setPaymentMethod('Cash');
    setChequeNumber('');
    setChequeDate('');
    setChequeAmount('');
    setBankName('Commercial Bank');
    setPaymentMode('full');
    setPartialPaymentAmount('');
    setSelectedBillForPayment(null);
  };

  // Helper functions for printing
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

  const generateProfessionalBillHTML = (bill, job, customer, mode = 'color') => {
    const isColorMode = mode === 'color';
    const invoiceNumber = bill.invoiceNumber || bill.billId;
    // Use job's advance payment if bill doesn't have it
    const advancePayment = parseFloat(bill.advancePayment || job.advancePayment || 0);
    const rawAdvancePaymentDate = bill.advancePaymentDate || bill.paymentMadeDate || job.advancePaymentDate || job.paymentMadeDate;
    const advancePaymentDateText = formatDate(rawAdvancePaymentDate);
    const advancePaymentLabel = `Advance payment (${advancePaymentDateText})`;
    
    // Handle pay items - they might be a string that needs parsing
    let payItemsArray = [];
    if (job.payItems) {
      if (typeof job.payItems === 'string') {
        try {
          payItemsArray = JSON.parse(job.payItems);
        } catch (e) {
          payItemsArray = [];
        }
      } else if (Array.isArray(job.payItems)) {
        payItemsArray = job.payItems;
      } else {
        payItemsArray = [];
      }
    }

    // Calculate gross total from pay items if bill doesn't have it
    const calculatedGrossTotal = payItemsArray.reduce((sum, item) => {
      return sum + (parseFloat(item.billingAmount || item.amount || 0) || 0);
    }, 0);
    const grossTotal = parseFloat(bill.grossTotal || bill.billingAmount || 0) || calculatedGrossTotal;
    const netTotal = grossTotal - advancePayment;

    const printablePayItems = payItemsArray.map((item, index) => {
      let description = item.description || item.name || 'Service Charge';
      
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
        return label.startsWith('transporter cost');
      });
      if (!hasTransporterCost) {
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
            html, body, .invoice-page, .footer {
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
                        <td class="description-col"><span>${item.description || ''}</span></td>
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
                <div>GROSS TOTAL</div>
                <div>${formatAmount(grossTotal)}</div>
              </div>
              
              ${advancePayment > 0 ? `
                <div class="item-row subtotal">
                  <div>${advancePaymentLabel}</div>
                  <div>${formatAmount(advancePayment)}</div>
                </div>
              ` : ''}
              
              <div class="item-row total">
                <div>Total Due Amount</div>
                <div>${formatAmount(advancePayment > 0 ? netTotal : grossTotal)}</div>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const getCustomerDetails = (customerId) => {
    // Try to fetch from the customer list if available
    // For JobInvoicingModal, we can construct a basic customer object from job data
    if (job?.customerId === customerId) {
      return {
        customerId: job.customerId,
        name: job.customerName || 'Customer',
        addressNumber: job.addressNumber || '',
        addressStreet1: job.addressStreet1 || '',
        addressStreet2: job.addressStreet2 || '',
        addressDistrict: job.addressDistrict || '',
        addressCity: job.addressCity || '',
        addressCountry: job.addressCountry || 'Sri Lanka'
      };
    }
    return null;
  };

  const handlePrintInvoice = async (bill) => {
    try {
      setMessage('Loading invoice data for printing...');
      
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
      const customerData = getCustomerDetails(bill.customerId);
      
      if (!jobWithPayItems || !customerData) {
        setMessage('Unable to print invoice - missing job or customer data');
        setTimeout(() => setMessage(''), 3000);
        return;
      }
      
      // Generate and open print window
      const printWindow = window.open('', '', 'height=900,width=700');
      printWindow.document.write(generateProfessionalBillHTML(bill, jobWithPayItems, customerData, 'color'));
      printWindow.document.close();
      printWindow.print();
      
      setMessage('');
    } catch (error) {
      console.error('Error printing invoice:', error);
      setMessage('Error loading invoice data for printing');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  // Check if there are any paid invoices for this job
  const hasPaidInvoices = () => {
    return bills.some(bill => bill.paymentStatus === 'Paid');
  };

  const handleEditPayItems = () => {
    // This is no longer needed - editing is per-item now
  };

const handleDeleteItem = async (index) => {
    const itemName = payItems[index].name;
    if (!window.confirm(`Delete "${itemName}"?`)) {
      return;
    }

    try {
      const updatedItems = payItems.filter((_, i) => i !== index);
      
      if (updatedItems.length === 0) {
        // If no items left, save empty array
        await jobService.replacePayItems(job.jobId, []);
        setPayItems([]);
        setPayItemsSaved(false);
        setShowPayItemsRow(false);
        setMessage('✅ All items deleted!');
      } else {
        // Save remaining items
        const newPayItemsData = updatedItems.map(item => ({
          description: item.name,
          amount: parseFloat(item.actualCost),
          actualCost: parseFloat(item.actualCost),
          billingAmount: parseFloat(item.billingAmount),
          paidBy: item.paidByName || item.paidBy || 'Office',
          source: item.isOfficePayItem ? 'Office Payment' : item.isPettyCashItem ? 'Petty Cash' : 'Custom'
        }));
        
        await jobService.replacePayItems(job.jobId, newPayItemsData);
        setPayItems(updatedItems);
        setMessage(`✅ "${itemName}" deleted successfully!`);
      }
      
      setTimeout(() => setMessage(''), 3000);
      await loadJobBills();
      
      // Check if all remaining items have billing amounts
      setTimeout(() => checkAllItemsHaveBillingAmounts(), 100);
    } catch (error) {
      console.error('Error deleting item:', error);
      setMessage('Error deleting item');
      setTimeout(() => setMessage(''), 5000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[10000] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg w-[95vw] max-w-[1400px] h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 border-b border-blue-800 rounded-t-lg">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">
              Invoice Management - Job #{job?.jobId}
            </h2>
            <button
              onClick={onClose}
              className="text-white hover:bg-blue-800 rounded-lg p-2 transition"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <p className="text-blue-100 mt-2">
            Customer: <strong>{job?.customerName}</strong> | Status: <strong>{job?.status}</strong>
          </p>
        </div>

        {/* Messages */}
        {message && (
          <div className={`flex-shrink-0 p-4 mx-6 mt-4 rounded-lg ${
            message.includes('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message}
          </div>
        )}

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: Pay Items Management */}
          <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">
              Pay Items Management
            </h3>
            
            {loadingSettlement && <p className="text-blue-600">Loading pay items...</p>}
            
            {!loadingSettlement && payItems.length > 0 && (
                  <div className="mt-4">
                    {/* Add Buttons */}
                    <div className="mb-4 flex gap-2">
                      <button
                        onClick={handleAddPayItem}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="12" y1="5" x2="12" y2="19"></line>
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        Add Pay Item
                      </button>
                      <button
                        onClick={handleAddTransporterCost}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="1" y="3" width="15" height="13"></rect>
                          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                          <circle cx="5.5" cy="18.5" r="2.5"></circle>
                          <circle cx="18.5" cy="18.5" r="2.5"></circle>
                        </svg>
                        Add Transporter Cost
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-200">
                          <tr>
                            <th className="px-4 py-2 text-left">Description</th>
                            <th className="px-4 py-2 text-right">Actual Cost</th>
                            <th className="px-4 py-2 text-right">Billing Amount</th>
                            <th className="px-4 py-2 text-center">Same?</th>
                            <th className="px-4 py-2 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payItems.map((item, idx) => (
                            <tr key={idx} className="border-b hover:bg-gray-50">
                              <td className="px-4 py-2">
                                <input
                                  type="text"
                                  value={item.name}
                                  onChange={(e) => handlePayItemChange(idx, 'name', e.target.value)}
placeholder="Enter item name"
                                  className="w-full px-2 py-1 border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
/>
                              </td>
                              <td className="px-4 py-2 text-right">
                                <input
                                  type="number"
                                  value={item.actualCost}
                                  onChange={(e) => handlePayItemChange(idx, 'actualCost', e.target.value)}
placeholder="0"
                                  className="w-24 px-2 py-1 border border-gray-300 rounded text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
/>
                              </td>
                              <td className="px-4 py-2 text-right">
                                <input
                                  type="number"
                                  value={item.billingAmount}
                                  onChange={(e) => handlePayItemChange(idx, 'billingAmount', e.target.value)}
placeholder="0"
                                  className="w-24 px-2 py-1 border border-gray-300 rounded text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
/>
                              </td>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={item.sameAmount}
                                  onChange={(e) => handlePayItemChange(idx, 'sameAmount', e.target.checked)}
className="w-4 h-4"
                                />
                              </td>
                              <td className="px-4 py-2 text-center">
                                <button
                                  onClick={() => handleDeleteItem(idx)}
                                  title="Delete this item"
                                  className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                                >
                                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M3 6h18"></path>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                                    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                  </svg>
                                </button>
</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Totals Summary */}
                    {payItems.length > 0 && (() => {
                      const { totalActualCost, totalBillingAmount, profit } = calculateTotals();
                      const totalBillingFilled = totalBillingAmount > 0;
                      
                      return (
                        <>
                          <div className="mt-6 bg-white border border-gray-300 rounded-lg p-4">
                            <div className="grid grid-cols-3 gap-4 text-center">
                              <div className="border-r border-gray-300 pr-4">
                                <p className="text-sm text-gray-600 font-medium mb-1">Total Actual Cost</p>
                                <p className="text-2xl font-bold text-blue-600">
                                  LKR {formatAmount(totalActualCost)}
                                </p>
                              </div>
                              <div className="border-r border-gray-300 pr-4">
                                <p className="text-sm text-gray-600 font-medium mb-1">Total Billing Amount</p>
                                <p className="text-2xl font-bold text-green-600">
                                  LKR {formatAmount(totalBillingAmount)}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600 font-medium mb-1">Profit</p>
                                <p className={`text-2xl font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  LKR {formatAmount(profit)}
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          {/* Show Save Button if items are not saved yet */}
                          {!payItemsSaved && (
                            <div className="mt-4">
                              {!totalBillingFilled && (
                                <p className="text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3">
                                  ⚠️ Please fill in billing amounts for all items to proceed
                                </p>
                              )}
                              <button
                                onClick={savePayItems}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
                              >
                                💾 Save Pay Items with Billing Amounts
                              </button>
                            </div>
                          )}
                          
                          {/* Show Generate Invoice button when items are saved AND (no bill exists OR bill is unpaid with no payments) */}
                          {payItemsSaved && (bills.length === 0 || bills.every(b => b.paymentStatus === 'Unpaid' && !(parseFloat(b.paidAmount) > 0))) && (
                            <div className="mt-4 flex gap-2">
                              <button
                                onClick={generateBill}
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition flex items-center gap-2"
                              >
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                  <polyline points="14 2 14 8 20 8"></polyline>
                                  <line x1="16" y1="13" x2="8" y2="13"></line>
                                  <line x1="16" y1="17" x2="8" y2="17"></line>
                                  <polyline points="10 9 9 9 8 9"></polyline>
                                </svg>
                                {bills.length === 0 ? 'Generate Invoice' : 'Update Invoice'}
                              </button>
                            </div>
                          )}
                        </>
                      );
                    })()}
                    
{/* Show message when viewing already paid invoices */}
                    {hasPaidInvoices() && (
                      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-blue-700 text-sm">
                          ℹ️ This job has paid invoices. You are viewing pay items for reference. To create a new invoice, complete the pay items above.
                        </p>
                      </div>
                    )}
                  </div>
                )}
            
            {!loadingSettlement && payItems.length === 0 && (
              <div className="flex gap-2">
                <button
                  onClick={handleAddPayItem}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition flex items-center gap-2"
                >
                  âž• Add Pay Item
                </button>
                <button
                  onClick={handleAddTransporterCost}
                  className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition flex items-center gap-2"
                >
                  🚚 Add Transporter Cost
                </button>
              </div>
            )}
          </div>

          {/* Section 2: Generated Invoices */}
          <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">
              Generated Invoices ({bills.length})
            </h3>
            
            {bills.length === 0 ? (
              <p className="text-gray-600">No invoices generated yet.</p>
            ) : (
              <div className="space-y-2">
                {bills.map((bill) => (
                  <div key={bill.billId} className="border border-gray-300 rounded-lg p-4 bg-white">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold">Invoice #{bill.billId}</p>
                        <p className="text-gray-600 text-sm">
                          Status: <span className={`font-medium ${
                            bill.paymentStatus === 'Paid' ? 'text-green-600' : 
                            bill.paymentStatus === 'Partially Paid' ? 'text-orange-600' : 'text-red-600'
                          }`}>{bill.paymentStatus}</span>
                        </p>
                        <p className="text-gray-600 text-sm">Amount: LKR {formatAmount(bill.netTotal || bill.billingAmount || bill.grossTotal || bill.total)}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setExpandedBillId(expandedBillId === bill.billId ? null : bill.billId)}
                          className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                          </svg>
                          {expandedBillId === bill.billId ? 'Hide' : 'View'}
                        </button>
                        <button
                          onClick={() => handlePrintInvoice(bill)}
                          className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded flex items-center gap-1"
                          title="Print invoice"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="6 9 6 2 18 2 18 9"></polyline>
                            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                            <rect x="6" y="14" width="12" height="8"></rect>
                          </svg>
                          Print
                        </button>
                        {(bill.paymentStatus === 'Unpaid' || bill.paymentStatus === 'Partially Paid') && (
                          <button
                            onClick={() => {
                              setSelectedBillForPayment(bill);
                              setShowPaymentModal(true);
                            }}
                            className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center gap-1"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10"></circle>
                              <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                            Record Payment
                          </button>
                        )}
                        {(bill.paymentStatus === 'Unpaid' || bill.paymentStatus === 'Partially Paid') && (
                          <button
                            onClick={() => {
                              setSelectedBillForPayment(bill);
                              setShowReviewInvoiceModal(true);
                            }}
                            className="px-3 py-1 text-sm bg-orange-600 hover:bg-orange-700 text-white rounded flex items-center gap-1"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                              <polyline points="14 2 14 8 20 8"></polyline>
                              <path d="M12 11v6"></path>
                              <path d="M9 14l3 3 3-3"></path>
                            </svg>
                            Send for Review
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {expandedBillId === bill.billId && (
                      <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                        <p><strong>Actual Cost:</strong> LKR {formatAmount(bill.actualCost)}</p>
                        <p><strong>Billing Amount:</strong> LKR {formatAmount(bill.billingAmount)}</p>
                        <p><strong>Profit:</strong> LKR {formatAmount(bill.profit)}</p>
                        {bill.paymentStatus === 'Partially Paid' && (
                          <>
                            <p><strong>Amount Paid:</strong> LKR {formatAmount(bill.paidAmount || 0)}</p>
                            <p><strong>Remaining:</strong> LKR {formatAmount(bill.remainingAmount || 0)}</p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Payment Modal */}
        {showPaymentModal && selectedBillForPayment && (() => {
          const invoiceTotal = parseFloat(selectedBillForPayment.netTotal) || parseFloat(selectedBillForPayment.billingAmount) || parseFloat(selectedBillForPayment.grossTotal) || parseFloat(selectedBillForPayment.total) || 0;
          const paidAlready = parseFloat(selectedBillForPayment.paidAmount) || 0;
          const amountDue = invoiceTotal - paidAlready;
          const collectAmount = paymentMode === 'full' ? amountDue : (parseFloat(partialPaymentAmount) || 0);

          return (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[10001] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-gray-700">
                      <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Record Payment</h3>
                    <p className="text-sm text-gray-500">Invoice #{selectedBillForPayment.billId}</p>
                  </div>
                </div>
                <button onClick={() => { setShowPaymentModal(false); resetPaymentForm(); }} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 transition">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              {/* Info Bar */}
              <div className="grid grid-cols-4 gap-4 px-6 py-4 bg-gray-50 border-b border-gray-200">
                <div>
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Customer</p>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5">{job?.customerName || 'Customer'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Invoice</p>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5">{selectedBillForPayment.billId}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Invoice Total</p>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">LKR {formatAmount(invoiceTotal)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Amount Due</p>
                  <p className="text-sm font-bold text-orange-600 mt-0.5">LKR {formatAmount(amountDue)}</p>
                </div>
              </div>

              {/* Body */}
              <div className="px-6 py-5">
                <div className="grid grid-cols-2 gap-8">
                  {/* Left Column - Payment Type */}
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-3">Payment Type</p>
                    <div className="space-y-2">
                      <label className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${paymentMode === 'full' ? 'border-blue-600 bg-blue-50/50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <input type="radio" name="paymentMode" value="full" checked={paymentMode === 'full'} onChange={(e) => setPaymentMode(e.target.value)} className="mt-0.5 w-4 h-4 text-blue-600" />
                        <div>
                          <p className="text-sm font-semibold text-gray-900">Full Payment</p>
                          <p className="text-xs text-gray-500">Settle entire balance</p>
                        </div>
                      </label>
                      <label className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${paymentMode === 'partial' ? 'border-blue-600 bg-blue-50/50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <input type="radio" name="paymentMode" value="partial" checked={paymentMode === 'partial'} onChange={(e) => setPaymentMode(e.target.value)} className="mt-0.5 w-4 h-4 text-blue-600" />
                        <div>
                          <p className="text-sm font-semibold text-gray-900">Partial Payment</p>
                          <p className="text-xs text-gray-500">Pay a portion now</p>
                        </div>
                      </label>
                    </div>

                    {paymentMode === 'partial' && (
                      <div className="mt-3">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Payment Amount (LKR)</label>
                        <input
                          type="number"
                          value={partialPaymentAmount}
                          onChange={(e) => setPartialPaymentAmount(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          placeholder="0.00"
                          min="0.01"
                          max={amountDue}
                          step="0.01"
                        />
                      </div>
                    )}
                  </div>

                  {/* Right Column - Amount to Collect */}
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-3">Amount to Collect</p>
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <p className="text-3xl font-bold text-gray-900">LKR {formatAmount(collectAmount)}</p>
                      <p className="text-xs text-gray-500 mt-1">{paymentMode === 'full' ? 'Full balance' : 'Partial amount'}</p>
                    </div>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="mt-6 pt-5 border-t border-gray-200">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Payment Method</p>
                  <div className="flex gap-2">
                    {[
                      { value: 'Cash', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4"><rect x="1" y="4" width="22" height="16" rx="2"/><circle cx="12" cy="12" r="3"/></svg> },
                      { value: 'Cheque', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg> },
                      { value: 'Bank Transfer', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4"><path d="M12 2L2 7h20L12 2z"/><rect x="4" y="10" width="16" height="10"/><line x1="8" y1="10" x2="8" y2="20"/><line x1="16" y1="10" x2="16" y2="20"/></svg> }
                    ].map(method => (
                      <button
                        key={method.value}
                        onClick={() => setPaymentMethod(method.value)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition ${
                          paymentMethod === method.value 
                            ? 'border-gray-800 bg-white text-gray-900' 
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {method.icon}
                        {method.value}
                      </button>
                    ))}
                  </div>

                  {/* Cheque Details */}
                  {paymentMethod === 'Cheque' && (
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Cheque Number</label>
                        <input type="text" value={chequeNumber} onChange={(e) => setChequeNumber(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" placeholder="Enter cheque number" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Cheque Date</label>
                        <input type="date" value={chequeDate} onChange={(e) => setChequeDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Bank Name</label>
                        <select value={bankName} onChange={(e) => setBankName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
                          <option value="Commercial Bank">Commercial Bank</option>
                          <option value="Bank of Ceylon">Bank of Ceylon</option>
                          <option value="People's Bank">People's Bank</option>
                          <option value="Hatton National Bank">Hatton National Bank</option>
                          <option value="Sampath Bank">Sampath Bank</option>
                          <option value="Nations Trust Bank">Nations Trust Bank</option>
                          <option value="DFCC Bank">DFCC Bank</option>
                          <option value="Seylan Bank">Seylan Bank</option>
                          <option value="NDB Bank">NDB Bank</option>
                          <option value="Pan Asia Banking">Pan Asia Banking</option>
                          <option value="Union Bank">Union Bank</option>
                          <option value="Amana Bank">Amana Bank</option>
                          <option value="HSBC">HSBC</option>
                          <option value="Standard Chartered">Standard Chartered</option>
                          <option value="Cargills Bank">Cargills Bank</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Bank Transfer Details */}
                  {paymentMethod === 'Bank Transfer' && (
                    <div className="mt-4 space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Bank Name</label>
                        <select value={bankName} onChange={(e) => setBankName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
                          <option value="Commercial Bank">Commercial Bank</option>
                          <option value="Bank of Ceylon">Bank of Ceylon</option>
                          <option value="People's Bank">People's Bank</option>
                          <option value="Hatton National Bank">Hatton National Bank</option>
                          <option value="Sampath Bank">Sampath Bank</option>
                          <option value="Nations Trust Bank">Nations Trust Bank</option>
                          <option value="DFCC Bank">DFCC Bank</option>
                          <option value="Seylan Bank">Seylan Bank</option>
                          <option value="NDB Bank">NDB Bank</option>
                          <option value="Pan Asia Banking">Pan Asia Banking</option>
                          <option value="Union Bank">Union Bank</option>
                          <option value="Amana Bank">Amana Bank</option>
                          <option value="HSBC">HSBC</option>
                          <option value="Standard Chartered">Standard Chartered</option>
                          <option value="Cargills Bank">Cargills Bank</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-700 flex items-center gap-2">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                          Bank transfer recorded. Verify receipt before confirming.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Cash Info */}
                  {paymentMethod === 'Cash' && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-700 flex items-center gap-2">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><polyline points="20 6 9 17 4 12"/></svg>
                        Cash payment — no additional details required.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => { setShowPaymentModal(false); resetPaymentForm(); }}
                  className="px-5 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-medium text-sm transition"
                >
                  Cancel
                </button>
                <button
                  onClick={submitPayment}
                  disabled={paymentMode === 'partial' && (!partialPaymentAmount || parseFloat(partialPaymentAmount) <= 0)}
                  className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-semibold text-sm transition flex items-center gap-2"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><polyline points="20 6 9 17 4 12"/></svg>
                  Confirm Payment
                </button>
              </div>
            </div>
          </div>
          );
        })()}

        {/* Review Invoice Modal */}
        {showReviewInvoiceModal && selectedBillForPayment && (
          <ReviewInvoiceModal
            bill={selectedBillForPayment}
            job={job}
            isOpen={true}
            isLoading={reviewInvoiceLoading}
            onClose={() => {
              setShowReviewInvoiceModal(false);
              setSelectedBillForPayment(null);
            }}
            onSubmit={handleReviewInvoiceSubmit}
          />
        )}
      </div>
    </div>
  );
}

export default JobInvoicingModal;
