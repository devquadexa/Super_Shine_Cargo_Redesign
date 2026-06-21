import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { jobService } from '../api/services/jobService';
import { authService } from '../api/services/authService';
import { customerService } from '../api/services/customerService';
import { cashWithdrawalService } from '../api/services/cashWithdrawalService';
import CashWithdrawalModal from './CashWithdrawalModal';
import Pagination from './Pagination';
import API_BASE from '../api/config';

function PettyCash() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [invoicedJobIds, setInvoicedJobIds] = useState(new Set()); // Track jobs with invoices
  const [users, setUsers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [message, setMessage] = useState('');
  const [overallBalance, setOverallBalance] = useState(0);
  const [userBalances, setUserBalances] = useState({});
  const [userCarouselIndex, setUserCarouselIndex] = useState(0);
  const [jobAssignments, setJobAssignments] = useState({}); // Store job assignments
  
  // Search and Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(20);

  // Collapsible section states
  const [assignmentsCollapsed, setAssignmentsCollapsed] = useState(false);
  
  // Assignment Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignFormData, setAssignFormData] = useState({
    jobId: '',
    assignedTo: '',
    assignedAmount: '',
    notes: ''
  });

  // Settlement Modal
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [settlementItems, setSettlementItems] = useState([]);
  
  // Edit settlement item states
  const [editingSettlementItem, setEditingSettlementItem] = useState(null);
  const [editItemName, setEditItemName] = useState('');
  const [editActualCost, setEditActualCost] = useState('');
  const [canEditSettlement, setCanEditSettlement] = useState(false);

  // Edit Settlement Modal (new - for editing from main table)
  const [showEditSettlementModal, setShowEditSettlementModal] = useState(false);
  const [editSettlementItems, setEditSettlementItems] = useState([]);

  // Expandable rows state
  const [expandedRows, setExpandedRows] = useState(new Set());
  
  // Dropdown menu state
  const [activeDropdown, setActiveDropdown] = useState(null);

  // Inline edit state for settlement items in expanded rows
  const [inlineEditingItem, setInlineEditingItem] = useState(null); // { assignmentId, itemId }
  const [inlineEditName, setInlineEditName] = useState('');
  const [inlineEditCost, setInlineEditCost] = useState('');
  const [inlineAddingRow, setInlineAddingRow] = useState(null); // assignmentId
  const [inlineNewItem, setInlineNewItem] = useState({ itemName: '', actualCost: '', hasBill: false });

  // Cash Balance Settlement Modal
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [settlementFormData, setSettlementFormData] = useState({
    settlementType: '',
    amount: '',
    notes: ''
  });

  // Cash Withdrawal states
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [cashWithdrawals, setCashWithdrawals] = useState([]);
  const [withdrawalsCollapsed, setWithdrawalsCollapsed] = useState(false);
  const [withdrawalFilterMonth, setWithdrawalFilterMonth] = useState(new Date().getMonth() + 1);
  const [withdrawalFilterYear, setWithdrawalFilterYear] = useState(new Date().getFullYear());

  // User Petty Cash Summary filter
  const [userSummaryFilterMonth, setUserSummaryFilterMonth] = useState(new Date().getMonth() + 1);
  const [userSummaryFilterYear, setUserSummaryFilterYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchAssignments();
    fetchJobs();
    fetchCustomers();
    fetchInvoicedJobs();
    if (user?.role === 'Admin' || user?.role === 'Super Admin' || user?.role === 'Manager') {
      fetchUsers();
      fetchOverallBalance();
      fetchCashWithdrawals();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeDropdown && !event.target.closest('.actions-dropdown')) {
        setActiveDropdown(null);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [activeDropdown]);

  // Reset to page 1 when search term or status filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  // Refetch user balances when month or year filter changes
  useEffect(() => {
    if (user?.role === 'Admin' || user?.role === 'Super Admin') {
      fetchUserBalances(userSummaryFilterMonth, userSummaryFilterYear);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userSummaryFilterMonth, userSummaryFilterYear]);

  const fetchAssignments = async () => {
    try {
      // Use regular endpoint - the component already has grouping logic
      const endpoint = user?.role === 'Waff Clerk' 
        ? `${API_BASE}/api/petty-cash-assignments/my`
        : `${API_BASE}/api/petty-cash-assignments`;
      
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        console.error('Failed to fetch assignments:', response.status);
        setAssignments([]);
        return;
      }
      
      const data = await response.json();
      console.log('Fetched assignments:', data);
      if (Array.isArray(data)) {
        data.forEach(a => console.log(`  >> Assignment ${a.assignmentId}: status=${a.status}, groupId=${a.groupId}`));
      }
      
      // Ensure data is an array
      if (Array.isArray(data)) {
        setAssignments(data);
        
        // For admin/super admin, fetch user balances from dedicated endpoint
        if (user?.role === 'Admin' || user?.role === 'Super Admin') {
          fetchUserBalances();
        }
      } else {
        console.error('Assignments data is not an array:', data);
        setAssignments([]);
      }
    } catch (error) {
      console.error('Error fetching assignments:', error);
      setAssignments([]);
    }
  };

  const fetchUserBalances = async (month = userSummaryFilterMonth, year = userSummaryFilterYear) => {
    try {
      const response = await fetch(`${API_BASE}/api/petty-cash-assignments/user-balances?month=${month}&year=${year}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched user balances:', data);
        
        // Convert array to object keyed by userId
        const balancesMap = {};
        data.forEach(balance => {
          balancesMap[balance.userId] = balance;
        });
        setUserBalances(balancesMap);
      }
    } catch (error) {
      console.error('Error fetching user balances:', error);
    }
  };

  const fetchOverallBalance = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/petty-cash/balance`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setOverallBalance(data.balance || 0);
      }
    } catch (error) {
      console.error('Error fetching overall balance:', error);
    }
  };

  const fetchCashWithdrawals = async () => {
    try {
      const data = await cashWithdrawalService.getAll();
      setCashWithdrawals(data);
    } catch (error) {
      console.error('Error fetching cash withdrawals:', error);
    }
  };

  const getFilteredCashWithdrawals = () => {
    return cashWithdrawals.filter(withdrawal => {
      const withdrawalDate = new Date(withdrawal.withdrawalDate);
      const withdrawalMonth = withdrawalDate.getMonth() + 1;
      const withdrawalYear = withdrawalDate.getFullYear();
      
      return withdrawalMonth === withdrawalFilterMonth && withdrawalYear === withdrawalFilterYear;
    });
  };

  const handleWithdrawalSubmit = async (withdrawalData) => {
    try {
      await cashWithdrawalService.create(withdrawalData);
      setMessage('Cash withdrawal recorded successfully');
      setTimeout(() => setMessage(''), 3000);
      setShowWithdrawalModal(false);
      fetchCashWithdrawals();
      fetchOverallBalance();
    } catch (error) {
      console.error('Error creating cash withdrawal:', error);
      setMessage('Error recording cash withdrawal');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const fetchJobs = async () => {
    try {
      const data = await jobService.getAll();
      console.log('Fetched jobs:', data);
      console.log('Jobs with pettyCashStatus:', data.map(j => ({ 
        jobId: j.jobId, 
        pettyCashStatus: j.pettyCashStatus,
        assignedUsers: j.assignedUsers
      })));
      setJobs(data);
      
      // Build job assignments map from the assignedUsers in each job
      if (user?.role === 'Admin' || user?.role === 'Super Admin' || user?.role === 'Manager') {
        const assignmentsMap = {};
        data.forEach(job => {
          if (job.assignedUsers && job.assignedUsers.length > 0) {
            assignmentsMap[job.jobId] = job.assignedUsers;
          } else {
            assignmentsMap[job.jobId] = [];
          }
        });
        console.log('Job assignments map:', assignmentsMap);
        setJobAssignments(assignmentsMap);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await authService.getUsers();
      setUsers(data.filter(u => u.role === 'Waff Clerk' || u.role === 'Manager'));
    } catch (error) {
      console.error('Error fetching users:', error);
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
  
  // Check if invoice has been generated for a job
  const checkInvoiceGenerated = async (jobId) => {
    // First check the cached set
    if (invoicedJobIds.has(jobId)) return true;
    try {
      const response = await fetch(`${API_BASE}/api/billing`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const bills = await response.json();
        const jobBill = bills.find(bill => bill.jobId === jobId);
        return !!jobBill;
      }
      return false;
    } catch (error) {
      console.error('Error checking invoice:', error);
      return false;
    }
  };

  // Fetch all invoiced job IDs upfront so UI can hide edit buttons without async calls
  const fetchInvoicedJobs = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/billing`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const bills = await response.json();
        setInvoicedJobIds(new Set(bills.map(b => b.jobId)));
      }
    } catch (error) {
      console.error('Error fetching invoiced jobs:', error);
    }
  };

  const getCustomerName = (customerId) => {
    const customer = customers.find(c => c.customerId === customerId);
    return customer ? customer.name : customerId;
  };

  // Removed unused getUserName function

  const closedAssignmentStatuses = [
    'Settled',
    'Settled/Approved',
    'Settled/Rejected',
    'Settled / Balance Returned',
    'Settled / Over Due Collected',
    'Full Petty Cash Returned',
    'Balance Returned',
    'Overdue Collected',
    'Returned',
    'Paid'
  ];

  const isActiveAssignment = (assignment) => !closedAssignmentStatuses.includes(assignment.status);

  // Show all jobs that have assigned users and haven't been billed yet.
  // Availability for assignment is determined per-user by active (non-settled) petty cash entries.
  const getAvailableJobs = () => {
    console.log('=== getAvailableJobs ===');
    console.log('Total jobs:', jobs.length);
    console.log('jobAssignments:', jobAssignments);
    console.log('assignments (petty cash):', assignments.length);
    console.log('invoicedJobIds:', invoicedJobIds);
    
    const available = jobs.filter(job => {
      // Job must have assigned users
      if (!jobAssignments[job.jobId] || jobAssignments[job.jobId].length === 0) {
        console.log(`Job ${job.jobId}: FILTERED OUT - no assigned users`);
        return false;
      }

      // Job must not have a bill generated
      if (invoicedJobIds.has(job.jobId)) {
        console.log(`Job ${job.jobId}: FILTERED OUT - bill already generated`);
        return false;
      }

      console.log(`Job ${job.jobId}: INCLUDED - allowing multiple assignments per job`);
      return true;
    });

    console.log('Available jobs:', available.length);
    return available;
  };

  const getAvailableUsersForJob = (jobId) => {
    console.log('getAvailableUsersForJob called with jobId:', jobId);
    console.log('jobAssignments:', jobAssignments);
    console.log('users:', users);
    console.log('assignments:', assignments);
    
    if (!jobId || !jobAssignments[jobId]) {
      console.log('No job selected or no assignments found');
      return [];
    }
    
    // Get all users assigned to this job
    const assignedUserIds = jobAssignments[jobId].map(assignment => assignment.userId);
    console.log('Assigned user IDs for job:', assignedUserIds);

    // Allow multiple petty cash assignments to the same user for the same job.
    const availableUsers = users.filter(user => assignedUserIds.includes(user.userId));
    console.log('Available users (all users assigned to job):', availableUsers);
    
    return availableUsers;
  };

  const sanitizeCurrencyInput = (value) => {
    const cleaned = String(value || '').replace(/[^\d.]/g, '');
    const [integerPart, ...decimalParts] = cleaned.split('.');
    const normalizedInteger = integerPart.replace(/^0+(?=\d)/, '');
    const decimalPart = decimalParts.join('').slice(0, 2);

    if (cleaned.includes('.')) {
      return `${normalizedInteger || '0'}.${decimalPart}`;
    }

    return normalizedInteger;
  };

  const handleAssignedAmountChange = (e) => {
    const sanitizedAmount = sanitizeCurrencyInput(e.target.value);
    setAssignFormData({ ...assignFormData, assignedAmount: sanitizedAmount });
  };

  const handleAssignedAmountKeyDown = (e) => {
    const allowedControlKeys = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (allowedControlKeys.includes(e.key)) {
      return;
    }

    const isDigit = /^\d$/.test(e.key);
    const isDecimalPoint = e.key === '.';
    const hasDecimalPoint = String(assignFormData.assignedAmount || '').includes('.');

    if (!isDigit && !(isDecimalPoint && !hasDecimalPoint)) {
      e.preventDefault();
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    
    console.log('=== handleAssignSubmit START ===');
    console.log('Form data:', assignFormData);
    
    if (!assignFormData.jobId || !assignFormData.assignedTo || !assignFormData.assignedAmount) {
      console.log('Validation failed - missing required fields');
      setMessage('Please fill all required fields');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    const assignedAmountText = String(assignFormData.assignedAmount).trim();
    if (!/^\d+(\.\d{1,2})?$/.test(assignedAmountText)) {
      console.log('Validation failed - invalid amount format:', assignedAmountText);
      setMessage('Assigned amount must be a valid number');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    const assignedAmount = parseFloat(assignedAmountText);
    if (Number.isNaN(assignedAmount) || assignedAmount <= 0) {
      console.log('Validation failed - invalid amount value:', assignedAmount);
      setMessage('Assigned amount must be greater than 0');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    console.log('Validation passed, sending request with data:', {
      jobId: assignFormData.jobId,
      assignedTo: assignFormData.assignedTo,
      assignedAmount: assignedAmount,
      notes: assignFormData.notes
    });

    try {
      const requestPayload = {
        ...assignFormData,
        assignedAmount
      };
      console.log('Request payload:', requestPayload);
      console.log('API endpoint:', `${API_BASE}/api/petty-cash-assignments`);
      console.log('Token present:', !!localStorage.getItem('token'));
      
      const response = await fetch(`${API_BASE}/api/petty-cash-assignments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(requestPayload)
      });

      console.log('Response status:', response.status);
      console.log('Response OK:', response.ok);

      if (response.ok) {
        console.log('Success! Assignment created');
        setMessage('Petty cash assigned successfully!');
        setAssignFormData({ jobId: '', assignedTo: '', assignedAmount: '', notes: '' });
        
        // Fetch updated data before closing modal
        await fetchAssignments();
        await fetchJobs();
        
        // Close modal after data is refreshed
        setShowAssignModal(false);
        setTimeout(() => setMessage(''), 3000);
      } else {
        const error = await response.json();
        console.error('API error response:', error);
        setMessage(error.message || 'Error assigning petty cash');
        setTimeout(() => setMessage(''), 5000);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      console.error('Error details:', error.message);
      setMessage('Error assigning petty cash');
      setTimeout(() => setMessage(''), 3000);
    }
    console.log('=== handleAssignSubmit END ===');
  };

  const openSettleModal = async (assignment) => {
    console.log('Opening settle modal for assignment:', assignment);
    setSelectedAssignment(assignment);
    
    // Determine if settlement can be edited (before invoice generation)
    const canEdit = !invoicedJobIds.has(assignment.jobId) && 
                    (assignment.status === 'Settled' || 
                     assignment.status === 'Balance To Be Return' || 
                     assignment.status === 'Over Due');
    setCanEditSettlement(canEdit);
    console.log('Can edit settlement:', canEdit);
    
    // Load existing settlement items for THIS assignment
    let existingItems = [];
    try {
      const existingResponse = await fetch(
        `${API_BASE}/api/petty-cash-assignments/${assignment.assignmentId}/settlement-items`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      if (existingResponse.ok) {
        existingItems = await existingResponse.json();
        console.log('Existing settlement items for this assignment:', existingItems);
      }
    } catch (error) {
      console.error('Error loading existing settlement items:', error);
    }
    
    // Get read-only predefined items from the backend response
    let readOnlyPredefinedItems = [];
    try {
      const job = jobs.find(j => j.jobId === assignment.jobId);
      if (job) {
        const assignmentResponse = await fetch(
          `${API_BASE}/api/petty-cash-assignments/job/${assignment.jobId}?assignmentId=${assignment.assignmentId}`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
        
        if (assignmentResponse.ok) {
          const jobAssignment = await assignmentResponse.json();
          console.log('Job assignment:', jobAssignment);
          console.log('Read-only predefined items:', jobAssignment.readOnlyPredefinedItems);
          
          // Get read-only items from backend
          if (jobAssignment && jobAssignment.readOnlyPredefinedItems) {
            readOnlyPredefinedItems = jobAssignment.readOnlyPredefinedItems;
          }
        }
      }
    } catch (error) {
      console.error('Error loading job assignment:', error);
    }
    
    // Load pay item templates for this job's category
    try {
      const job = jobs.find(j => j.jobId === assignment.jobId);
      console.log('Found job:', job);
      console.log('Job shipment category:', job?.shipmentCategory);
      
      if (job && job.shipmentCategory) {
        console.log('Fetching templates for category:', job.shipmentCategory);
        const response = await fetch(
          `${API_BASE}/api/pay-item-templates/category/${encodeURIComponent(job.shipmentCategory)}`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
        
        console.log('Template response status:', response.status);
        
        if (response.ok) {
          const templates = await response.json();
          console.log('Loaded templates:', templates);
          
          if (templates && templates.length > 0) {
            // Convert templates to pay items format
            // Mark items as paid if they exist in readOnlyPredefinedItems
            const loadedPayItems = templates.map(template => {
              const existingItem = existingItems.find(ei => ei.itemName === template.itemName);
              const paidByOther = readOnlyPredefinedItems.find(si => si.itemName === template.itemName);
              
              if (existingItem) {
                // This Waff Clerk already paid for this item
                return {
                  itemName: template.itemName,
                  actualCost: existingItem.actualCost,
                  isCustomItem: false,
                  assignmentId: existingItem.assignmentId,
                  paidBy: existingItem.paidBy,
                  paidByName: existingItem.paidByName,
                  hasBill: existingItem.hasBill ? true : false,
                  alreadyPaid: true
                };
              } else if (paidByOther) {
                // Another Waff Clerk already paid for this item (read-only)
                return {
                  itemName: template.itemName,
                  actualCost: paidByOther.actualCost,
                  isCustomItem: false,
                  assignmentId: paidByOther.assignmentId,
                  paidBy: paidByOther.paidBy,
                  paidByName: paidByOther.paidByName,
                  hasBill: paidByOther.hasBill ? true : false,
                  alreadyPaid: true,
                  paidByOther: true
                };
              }
              return {
                itemName: template.itemName,
                actualCost: '',
                isCustomItem: false,
                hasBill: false,
                alreadyPaid: false
              };
            });
            
            // Add custom items from existing settlement
            const customItems = existingItems
              .filter(ei => ei.isCustomItem)
              .map(ei => ({
                itemName: ei.itemName,
                actualCost: ei.actualCost,
                isCustomItem: true,
                assignmentId: ei.assignmentId,
                paidBy: ei.paidBy,
                paidByName: ei.paidByName,
                hasBill: ei.hasBill ? true : false,
                alreadyPaid: true
              }));
            
            const finalPayItems = [...loadedPayItems, ...customItems];
            console.log('Final pay items:', finalPayItems);
            setSettlementItems(finalPayItems);
            setShowSettleModal(true);
            return;
          }
        }
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
    
    // Fallback: just show existing items
    setSettlementItems(existingItems);
    setShowSettleModal(true);
  };

  // Open Edit Settlement Modal (from main table action button)
  const openEditSettlementModal = async (assignment) => {
    console.log('Opening edit settlement modal for assignment:', assignment.assignmentId);
    setSelectedAssignment(assignment);
    
    // Load existing settlement items
    try {
      const response = await fetch(
        `${API_BASE}/api/petty-cash-assignments/${assignment.assignmentId}/settlement-items`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      if (response.ok) {
        const items = await response.json();
        console.log('Loaded settlement items for editing:', items);
        setEditSettlementItems(items);
        setShowEditSettlementModal(true);
      } else {
        setMessage('❌ Failed to load settlement items');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error loading settlement items:', error);
      setMessage('❌ Error loading settlement items');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleEditSettlementItemChange = (index, field, value) => {
    const newItems = editSettlementItems.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    );
    setEditSettlementItems(newItems);
  };

  const addNewSettlementItem = () => {
    setEditSettlementItems([...editSettlementItems, { 
      itemName: '', 
      actualCost: '', 
      isCustomItem: true, 
      hasBill: false,
      isNew: true // Mark as new item
    }]);
  };

  const removeEditSettlementItem = (index) => {
    if (editSettlementItems.length > 1) {
      setEditSettlementItems(editSettlementItems.filter((_, i) => i !== index));
    } else {
      setMessage('❌ Cannot remove the last item');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const saveAllSettlementChanges = async () => {
    try {
      // Validate all items
      const validItems = editSettlementItems.filter(item => 
        item.itemName && item.actualCost && parseFloat(item.actualCost) > 0
      );
      
      if (validItems.length === 0) {
        setMessage('❌ Please add at least one valid item');
        setTimeout(() => setMessage(''), 3000);
        return;
      }

      // Process each item
      for (const item of validItems) {
        if (item.isNew) {
          // Add new item via settle endpoint (append mode)
          await fetch(
            `${API_BASE}/api/petty-cash-assignments/${selectedAssignment.assignmentId}/settle`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              },
              body: JSON.stringify({
                items: [{
                  itemName: item.itemName,
                  actualCost: parseFloat(item.actualCost),
                  isCustomItem: true,
                  hasBill: item.hasBill ? true : false
                }]
              })
            }
          );
        } else if (item.settlementItemId) {
          // Update existing item
          await fetch(
            `${API_BASE}/api/petty-cash-assignments/${selectedAssignment.assignmentId}/settlement-items/${item.settlementItemId}`,
            {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              },
              body: JSON.stringify({
                itemName: item.itemName,
                actualCost: parseFloat(item.actualCost)
              })
            }
          );
        }
      }

      setMessage('✅ Settlement items updated successfully');
      setShowEditSettlementModal(false);
      setEditSettlementItems([]);
      setSelectedAssignment(null);
      fetchAssignments(); // Reload assignments
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error saving settlement changes:', error);
      setMessage('❌ Error saving changes');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const deleteEditSettlementItem = async (item) => {
    if (!item.settlementItemId) {
      // Just remove from list if it's a new unsaved item
      removeEditSettlementItem(editSettlementItems.indexOf(item));
      return;
    }

    if (!window.confirm(`Are you sure you want to delete "${item.itemName}"?\n\nThis action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE}/api/petty-cash-assignments/${selectedAssignment.assignmentId}/settlement-items/${item.settlementItemId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.ok) {
        setMessage('✅ Item deleted successfully');
        // Remove from local state
        setEditSettlementItems(editSettlementItems.filter(i => i.settlementItemId !== item.settlementItemId));
        setTimeout(() => setMessage(''), 3000);
      } else {
        const error = await response.json();
        setMessage(`❌ ${error.message || 'Error deleting item'}`);
        setTimeout(() => setMessage(''), 5000);
      }
    } catch (error) {
      console.error('Error deleting settlement item:', error);
      setMessage('❌ Error deleting item');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleSettlementItemChange = (index, field, value) => {
    const newItems = settlementItems.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    );
    setSettlementItems(newItems);
  };

  const addSettlementItem = () => {
    setSettlementItems([...settlementItems, { itemName: '', actualCost: '', isCustomItem: true, hasBill: false }]);
  };
  
  // Start editing a settlement item
  const startEditSettlementItem = (item) => {
    setEditingSettlementItem(item.settlementItemId);
    setEditItemName(item.itemName);
    setEditActualCost(item.actualCost.toString());
  };
  
  // Cancel editing
  const cancelEditSettlementItem = () => {
    setEditingSettlementItem(null);
    setEditItemName('');
    setEditActualCost('');
  };
  
  // Save edited settlement item
  const saveEditedSettlementItem = async () => {
    if (!editItemName || !editActualCost) {
      setMessage('❌ Please fill in all fields');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    
    const cost = parseFloat(editActualCost);
    if (isNaN(cost) || cost <= 0) {
      setMessage('❌ Please enter a valid amount');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    
    try {
      const response = await fetch(
        `${API_BASE}/api/petty-cash-assignments/${selectedAssignment.assignmentId}/settlement-items/${editingSettlementItem}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            itemName: editItemName,
            actualCost: cost
          })
        }
      );
      
      if (response.ok) {
        setMessage('✅ Settlement item updated successfully');
        
        // Reload settlement items
        const itemsResponse = await fetch(
          `${API_BASE}/api/petty-cash-assignments/${selectedAssignment.assignmentId}/settlement-items`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
        
        if (itemsResponse.ok) {
          const items = await itemsResponse.json();
          setSettlementItems(items);
          
          // Update selected assignment totals
          const assignmentsResponse = await fetch(
            user?.role === 'Waff Clerk' 
              ? `${API_BASE}/api/petty-cash-assignments/my`
              : `${API_BASE}/api/petty-cash-assignments`,
            {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            }
          );
          
          if (assignmentsResponse.ok) {
            const allAssignments = await assignmentsResponse.json();
            const updated = allAssignments.find(a => a.assignmentId === selectedAssignment.assignmentId);
            if (updated) {
              setSelectedAssignment(updated);
            }
          }
        }
        
        cancelEditSettlementItem();
        setTimeout(() => setMessage(''), 3000);
      } else {
        const error = await response.json();
        setMessage(`❌ ${error.message || 'Error updating settlement item'}`);
        setTimeout(() => setMessage(''), 5000);
      }
    } catch (error) {
      console.error('Error updating settlement item:', error);
      setMessage('❌ Error updating settlement item');
      setTimeout(() => setMessage(''), 3000);
    }
  };
  
  // Delete settlement item
  const deleteSettlementItem = async (item) => {
    if (!window.confirm(`Are you sure you want to delete "${item.itemName}"?\n\nThis action cannot be undone.`)) {
      return;
    }
    
    try {
      const response = await fetch(
        `${API_BASE}/api/petty-cash-assignments/${selectedAssignment.assignmentId}/settlement-items/${item.settlementItemId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      if (response.ok) {
        setMessage('✅ Settlement item deleted successfully');
        
        // Reload settlement items
        const itemsResponse = await fetch(
          `${API_BASE}/api/petty-cash-assignments/${selectedAssignment.assignmentId}/settlement-items`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
        
        if (itemsResponse.ok) {
          const items = await itemsResponse.json();
          setSettlementItems(items);
          
          // Update selected assignment totals
          const assignmentsResponse = await fetch(
            user?.role === 'Waff Clerk' 
              ? `${API_BASE}/api/petty-cash-assignments/my`
              : `${API_BASE}/api/petty-cash-assignments`,
            {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            }
          );
          
          if (assignmentsResponse.ok) {
            const allAssignments = await assignmentsResponse.json();
            const updated = allAssignments.find(a => a.assignmentId === selectedAssignment.assignmentId);
            if (updated) {
              setSelectedAssignment(updated);
            }
          }
        }
        
        setTimeout(() => setMessage(''), 3000);
      } else {
        const error = await response.json();
        setMessage(`❌ ${error.message || 'Error deleting settlement item'}`);
        setTimeout(() => setMessage(''), 5000);
      }
    } catch (error) {
      console.error('Error deleting settlement item:', error);
      setMessage('❌ Error deleting settlement item');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const removeSettlementItem = (index) => {
    if (settlementItems.length > 1) {
      setSettlementItems(settlementItems.filter((_, i) => i !== index));
    }
  };

  const calculateTotalSpent = () => {
    // Only count items that are NOT already paid (exclude read-only items from other clerks)
    return settlementItems.reduce((sum, item) => {
      if (item.alreadyPaid) {
        return sum; // Skip items already paid by this or other clerks
      }
      return sum + (parseFloat(item.actualCost) || 0);
    }, 0);
  };

  const handleSettleSubmit = async (e) => {
    e.preventDefault();
    
    /**
     * SETTLEMENT FLOW:
     * 1. NORMAL SCENARIO: Clerk enters item amounts -> validItems.length > 0
     *    - Settlement items are submitted to backend
     *    - Backend calculates actualSpent from items, determines status
     * 
     * 2. FULL RETURN SCENARIO: Clerk submits without entering amounts -> validItems.length === 0
     *    - User sees confirmation dialog explaining full return
     *    - If confirmed, empty items array is submitted
     *    - Backend receives no items, calculates actualSpent = 0
     *    - Backend sets status to 'Balance To Be Return' with full assigned amount
     *    - Clerk can request return of entire allocation (e.g., unable to complete job due to illness/leave)
     */
    const validItems = settlementItems.filter(item => 
      item.itemName && item.actualCost && parseFloat(item.actualCost) > 0 && !item.alreadyPaid
    );
    
    // If no items with amounts are entered, treat it as a full return request
    if (validItems.length === 0) {
      // Confirm with the user that they're returning the full assigned amount
      const confirmFullReturn = window.confirm(
        `You are submitting a full petty cash return request.\n\n` +
        `Assigned Amount: LKR ${formatAmount(selectedAssignment.assignedAmount)}\n` +
        `No items will be claimed as expenses.\n\n` +
        `This will be submitted for approval.\n\n` +
        `Continue with full return?`
      );
      
      if (!confirmFullReturn) {
        return;
      }
    }

    const itemsPayload = validItems.map(item => ({
      itemName: item.itemName,
      actualCost: parseFloat(item.actualCost),
      isCustomItem: item.isCustomItem,
      hasBill: item.hasBill ? true : false,
      paidBy: item.paidBy
    }));

    try {
      let url, body;

      if (selectedAssignment.isGroupedSettlement && selectedAssignment.groupAssignments?.length > 1) {
        // Use the group settle endpoint — settles ALL assignments in the group at once
        const groupId = selectedAssignment.groupAssignments[0].groupId
          || `${selectedAssignment.groupAssignments[0].jobId}_${selectedAssignment.groupAssignments[0].assignedTo}`;
        url = `${API_BASE}/api/petty-cash-assignments/group/${encodeURIComponent(groupId)}/settle`;
        body = JSON.stringify({ items: itemsPayload });
        console.log('GROUP SETTLE - URL:', url, 'groupId:', groupId);
      } else {
        // Single assignment settle
        url = `${API_BASE}/api/petty-cash-assignments/${selectedAssignment.assignmentId}/settle`;
        body = JSON.stringify({ items: itemsPayload });
        console.log('SINGLE SETTLE - URL:', url);
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body
      });

      console.log('Settle response status:', response.status);
      const responseData = await response.clone().json().catch(() => ({}));
      console.log('Settle response body:', responseData);

      if (response.ok) {
        setMessage('Petty cash settled successfully!');
        // Close modal and clear state first
        setShowSettleModal(false);
        setSelectedAssignment(null);
        setSettlementItems([]);
        
        // Refresh data from backend
        console.log('Settle successful - refreshing assignments and jobs...');
        await Promise.all([
          fetchAssignments(),
          fetchJobs()
        ]);
        console.log('Data refresh complete after settlement');
        
        setTimeout(() => setMessage(''), 3000);
      } else {
        const error = await response.json();
        setMessage(error.message || 'Error settling petty cash');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error settling petty cash:', error);
      setMessage('Error settling petty cash');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  // Open settlement modal for balance return or overdue collection
  const openSettlementModal = (assignment, settlementType) => {
    setSelectedAssignment(assignment);
    const amount = settlementType === 'BALANCE_RETURN' ? assignment.balanceAmount : assignment.overAmount;
    setSettlementFormData({
      settlementType,
      amount: amount.toString(),
      notes: `${settlementType === 'BALANCE_RETURN' ? 'Balance return' : 'Overdue collection'} for Assignment #${assignment.assignmentId} (${assignment.jobId})`
    });
    setShowSettlementModal(true);
  };

  // Handle settlement form submission
  const handleSettlementSubmit = async (e) => {
    e.preventDefault();
    
    if (!settlementFormData.settlementType || !settlementFormData.amount) {
      setMessage('Please fill in all required fields');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/cash-balance-settlements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          settlementType: settlementFormData.settlementType,
          amount: parseFloat(settlementFormData.amount),
          notes: settlementFormData.notes,
          relatedAssignments: selectedAssignment.groupAssignmentIds || [selectedAssignment.assignmentId]
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage('Settlement request created successfully');
        setShowSettlementModal(false);
        setSettlementFormData({ settlementType: '', amount: '', notes: '' });
        setSelectedAssignment(null);
        // Refresh assignments to update UI
        fetchAssignments();
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(data.message || 'Failed to create settlement request');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error creating settlement request:', error);
      setMessage('Error creating settlement request');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const formatAmount = (amount) => {
    return parseFloat(amount || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Assigned': return 'status-assigned';
      case 'Settled': return 'status-settled';
      case 'Balance To Be Return': return 'status-balance-to-return';
      case 'Over Due': return 'status-overdue';
      case 'Pending Approval / Balance': return 'status-pending-approval-balance';
      case 'Pending Approval / Over Due': return 'status-pending-approval-overdue';
      case 'Settled / Balance Returned': return 'status-settled-balance-returned';
      case 'Settled / Over Due Collected': return 'status-settled-overdue-collected';
      case 'Full Petty Cash Returned': return 'status-full-petty-cash-returned';
      case 'Closed': return 'status-closed';
      // Legacy statuses for backward compatibility
      case 'Settled/Approved': return 'status-approved';
      case 'Settled/Rejected': return 'status-rejected';
      case 'Returned': return 'status-returned';
      case 'Paid': return 'status-paid';
      case 'Pending Approval': return 'status-pending-approval';
      case 'Balance Returned': return 'status-balance-returned';
      case 'Overdue Collected': return 'status-overdue-collected';
      default: return 'status-assigned';
    }
  };

  const getStatusDisplay = (status) => {
    switch (status) {
      case 'Settled / Balance Returned': return 'Settled / BR';
      case 'Settled / Over Due Collected': return 'Settled / OC';
      default: return status;
    }
  };

  // Get filtered assignments count
  const getFilteredCount = () => {
    return assignments.filter(assignment => {
      // Status filter
      if (statusFilter !== 'all' && assignment.status !== statusFilter) {
        return false;
      }
      
      // Search filter
      if (searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase();
        const job = jobs.find(j => j.jobId === assignment.jobId);
        const customerName = job ? getCustomerName(job.customerId).toLowerCase() : '';
        const cusdecNumber = job?.cusdecNumber?.toLowerCase() || '';
        const jobId = assignment.jobId.toLowerCase();
        const assignedToName = (assignment.assignedToName || assignment.assignedTo || '').toLowerCase();
        
        const matchesSearch = 
          jobId.includes(searchLower) ||
          customerName.includes(searchLower) ||
          cusdecNumber.includes(searchLower) ||
          assignedToName.includes(searchLower);
        
        if (!matchesSearch) {
          return false;
        }
      }
      
      return true;
    }).length;
  };

  // Toggle row expansion
  const toggleRowExpansion = async (assignmentId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(assignmentId)) {
      newExpanded.delete(assignmentId);
    } else {
      newExpanded.add(assignmentId);
      
      // Load settlement items if not already loaded
      const assignment = assignments.find(a => a.assignmentId === assignmentId);
      if (assignment && (!assignment.settlementItems || assignment.settlementItems.length === 0)) {
        try {
          const response = await fetch(
            `${API_BASE}/api/petty-cash-assignments/${assignmentId}/settlement-items`,
            {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            }
          );
          
          if (response.ok) {
            const items = await response.json();
            // Update the assignment with settlement items
            setAssignments(assignments.map(a => 
              a.assignmentId === assignmentId ? { ...a, settlementItems: items } : a
            ));
          }
        } catch (error) {
          console.error('Error loading settlement items:', error);
        }
      }
    }
    setExpandedRows(newExpanded);
  };

  // Inline edit handlers for settlement items in expanded rows
  const startInlineEdit = (assignmentId, item) => {
    setInlineEditingItem({ assignmentId, itemId: item.settlementItemId });
    setInlineEditName(item.itemName);
    setInlineEditCost(item.actualCost.toString());
  };

  const cancelInlineEdit = () => {
    setInlineEditingItem(null);
    setInlineEditName('');
    setInlineEditCost('');
  };

  const saveInlineEdit = async (assignmentId) => {
    const cost = parseFloat(inlineEditCost);
    if (!inlineEditName.trim() || isNaN(cost) || cost <= 0) {
      setMessage('❌ Please enter a valid item name and cost');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    try {
      const response = await fetch(
        `${API_BASE}/api/petty-cash-assignments/${assignmentId}/settlement-items/${inlineEditingItem.itemId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
          body: JSON.stringify({ itemName: inlineEditName.trim(), actualCost: cost })
        }
      );
      if (response.ok) {
        cancelInlineEdit();
        await reloadAssignmentItems(assignmentId);
        setMessage('✅ Item updated');
        setTimeout(() => setMessage(''), 2000);
      } else {
        const err = await response.json();
        setMessage(`❌ ${err.message || 'Error updating item'}`);
        setTimeout(() => setMessage(''), 4000);
      }
    } catch {
      setMessage('❌ Error updating item');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const deleteInlineItem = async (assignmentId, item) => {
    if (!window.confirm(`Delete "${item.itemName}"?`)) return;
    try {
      const response = await fetch(
        `${API_BASE}/api/petty-cash-assignments/${assignmentId}/settlement-items/${item.settlementItemId}`,
        { method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }
      );
      if (response.ok) {
        await reloadAssignmentItems(assignmentId);
        setMessage('✅ Item deleted');
        setTimeout(() => setMessage(''), 2000);
      } else {
        const err = await response.json();
        setMessage(`❌ ${err.message || 'Error deleting item'}`);
        setTimeout(() => setMessage(''), 4000);
      }
    } catch {
      setMessage('❌ Error deleting item');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const saveInlineNewItem = async (assignmentId) => {
    const cost = parseFloat(inlineNewItem.actualCost);
    if (!inlineNewItem.itemName.trim() || isNaN(cost) || cost <= 0) {
      setMessage('❌ Please enter a valid item name and cost');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    try {
      const response = await fetch(
        `${API_BASE}/api/petty-cash-assignments/${assignmentId}/settle`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
          body: JSON.stringify({
            items: [{ itemName: inlineNewItem.itemName.trim(), actualCost: cost, isCustomItem: true, hasBill: inlineNewItem.hasBill }]
          })
        }
      );
      if (response.ok) {
        setInlineAddingRow(null);
        setInlineNewItem({ itemName: '', actualCost: '', hasBill: false });
        await reloadAssignmentItems(assignmentId);
        setMessage('✅ Item added');
        setTimeout(() => setMessage(''), 2000);
      } else {
        const err = await response.json();
        setMessage(`❌ ${err.message || 'Error adding item'}`);
        setTimeout(() => setMessage(''), 4000);
      }
    } catch {
      setMessage('❌ Error adding item');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const reloadAssignmentItems = async (assignmentId) => {
    const [itemsRes, assignmentsRes] = await Promise.all([
      fetch(`${API_BASE}/api/petty-cash-assignments/${assignmentId}/settlement-items`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      }),
      fetch(`${API_BASE}/api/petty-cash-assignments${user?.role === 'Waff Clerk' ? '/my' : ''}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
    ]);
    if (itemsRes.ok && assignmentsRes.ok) {
      const items = await itemsRes.json();
      const allAssignments = await assignmentsRes.json();
      setAssignments(allAssignments.map(a =>
        a.assignmentId === assignmentId ? { ...a, settlementItems: items } : a
      ));
    }
  };

  // Renders the expanded details row for a single assignment
  const renderExpandedDetails = (assignment) => (
    <tr className="bg-gray-50" key={`exp-${assignment.assignmentId}`}>
      <td colSpan="9" className="p-6">
        <div className="space-y-6">
          {/* Financial Summary Strip */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 bg-white p-4 rounded-lg border border-gray-200">
            <div>
              <span className="block text-xs font-medium text-gray-600 mb-1">Assigned Amount</span>
              <span className="block text-sm font-semibold text-gray-900">LKR {formatAmount(assignment.assignedAmount)}</span>
            </div>
            <div>
              <span className="block text-xs font-medium text-gray-600 mb-1">Actual Spent</span>
              <span className="block text-sm font-semibold text-gray-900">{assignment.actualSpent >= 0 ? `LKR ${formatAmount(assignment.actualSpent)}` : '—'}</span>
            </div>
            {assignment.balanceAmount > 0 && !['Balance Returned', 'Settled/Approved', 'Closed'].includes(assignment.status) && (
              <div>
                <span className="block text-xs font-medium text-gray-600 mb-1">Balance to Return</span>
                <span className="block text-sm font-semibold text-green-600">LKR {formatAmount(assignment.balanceAmount)}</span>
              </div>
            )}
            {assignment.overAmount > 0 && !['Overdue Collected', 'Settled/Approved', 'Closed'].includes(assignment.status) && (
              <div>
                <span className="block text-xs font-medium text-gray-600 mb-1">Over Amount</span>
                <span className="block text-sm font-semibold text-red-600">LKR {formatAmount(assignment.overAmount)}</span>
              </div>
            )}
            {(assignment.status === 'Balance Returned' || assignment.status === 'Closed' || (assignment.status === 'Settled/Approved' && assignment.balanceAmount > 0)) && assignment.balanceAmount > 0 && (
              <div>
                <span className="block text-xs font-medium text-gray-600 mb-1">Balance Returned</span>
                <span className="block text-sm font-semibold text-gray-900">LKR {formatAmount(assignment.balanceAmount)}</span>
              </div>
            )}
            {(assignment.status === 'Overdue Collected' || (assignment.status === 'Settled/Approved' && assignment.overAmount > 0)) && (
              <div>
                <span className="block text-xs font-medium text-gray-600 mb-1">Overdue Collected</span>
                <span className="block text-sm font-semibold text-gray-900">LKR {formatAmount(assignment.overAmount)}</span>
              </div>
            )}
          </div>

          {/* Settlement Items Table */}
          {assignment.settlementItems && assignment.settlementItems.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Settlement Items</h3>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">{assignment.settlementItems.length} item{assignment.settlementItems.length !== 1 ? 's' : ''}</span>
                  {(assignment.status === 'Settled' || assignment.status === 'Balance To Be Return' || assignment.status === 'Over Due') && (user?.role === 'Waff Clerk' || user?.role === 'Manager') && assignment.assignedTo === user?.userId && !invoicedJobIds.has(assignment.jobId) && (
                    <button onClick={() => {
                      setInlineAddingRow(assignment.assignmentId);
                      setInlineNewItem({ itemName: '', actualCost: '', hasBill: false });
                    }} className="inline-flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      Add New Pay Item
                    </button>
                  )}
                </div>
              </div>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                {(() => {
                  const canEditItems = (assignment.status === 'Settled' || assignment.status === 'Balance To Be Return' || assignment.status === 'Over Due') && (user?.role === 'Waff Clerk' || user?.role === 'Manager') && assignment.assignedTo === user?.userId && !invoicedJobIds.has(assignment.jobId);
                  return (
                    <>
                      <div className="bg-gray-100 border-b border-gray-200 grid gap-0" style={{gridTemplateColumns: canEditItems ? '2rem 1fr 6rem 5rem 8rem 5rem' : '2rem 1fr 6rem 5rem 8rem'}}>
                        <div className="px-3 py-3 text-xs font-semibold text-gray-700 text-center">#</div>
                        <div className="px-3 py-3 text-xs font-semibold text-gray-700">Item Name</div>
                        <div className="px-3 py-3 text-xs font-semibold text-gray-700">Type</div>
                        <div className="px-3 py-3 text-xs font-semibold text-gray-700">Bill</div>
                        <div className="px-3 py-3 text-xs font-semibold text-gray-700 text-right">Actual Cost</div>
                        {canEditItems && <div className="px-3 py-3 text-xs font-semibold text-gray-700">Actions</div>}
                      </div>
                      <div>
                        {assignment.settlementItems.map((item, idx) => {
                          const isEditing = inlineEditingItem?.assignmentId === assignment.assignmentId && inlineEditingItem?.itemId === item.settlementItemId;
                          return (
                            <div key={idx} className="grid gap-0 border-b border-gray-200 hover:bg-blue-50 transition" style={{gridTemplateColumns: (assignment.status === 'Settled' || assignment.status === 'Balance To Be Return' || assignment.status === 'Over Due') && (user?.role === 'Waff Clerk' || user?.role === 'Manager') && assignment.assignedTo === user?.userId && !invoicedJobIds.has(assignment.jobId) ? '2rem 1fr 6rem 5rem 8rem 5rem' : '2rem 1fr 6rem 5rem 8rem'}}>
                              <div className="px-3 py-3 flex items-center justify-center text-sm text-gray-600">{idx + 1}</div>
                              <div className="px-3 py-3 flex items-center">
                                {isEditing ? <input className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm" value={inlineEditName} onChange={e => setInlineEditName(e.target.value)} autoFocus /> : <span className="text-sm text-gray-900">{item.itemName}</span>}
                              </div>
                              <div className="px-3 py-3 flex items-center">
                                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${item.isCustomItem ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{item.isCustomItem ? 'Custom' : 'Template'}</span>
                              </div>
                              <div className="px-3 py-3 flex items-center">
                                {item.hasBill ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-medium"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>Bill</span>
                                ) : (
                                  <span className="text-xs text-gray-500">No Bill</span>
                                )}
                              </div>
                              <div className="px-3 py-3 flex items-center justify-end">
                                {isEditing ? (
                                  <input className="w-24 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm text-right" type="number" step="0.01" value={inlineEditCost} onChange={e => setInlineEditCost(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveInlineEdit(assignment.assignmentId); if (e.key === 'Escape') cancelInlineEdit(); }} />
                                ) : <span className="text-sm font-medium text-gray-900">LKR {formatAmount(item.actualCost)}</span>}
                              </div>
                              {((assignment.status === 'Settled' || assignment.status === 'Balance To Be Return' || assignment.status === 'Over Due') && (user?.role === 'Waff Clerk' || user?.role === 'Manager') && assignment.assignedTo === user?.userId && !invoicedJobIds.has(assignment.jobId)) && (
                                <div className="px-3 py-3 flex items-center justify-center">
                                  {isEditing ? (
                                    <div className="flex gap-2">
                                      <button onClick={() => saveInlineEdit(assignment.assignmentId)} title="Save" className="inline-flex items-center justify-center w-6 h-6 rounded bg-green-100 text-green-700 hover:bg-green-200 transition"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg></button>
                                      <button onClick={cancelInlineEdit} title="Cancel" className="inline-flex items-center justify-center w-6 h-6 rounded bg-red-100 text-red-700 hover:bg-red-200 transition"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                                    </div>
                                  ) : (
                                    <div className="flex gap-2">
                                      <button onClick={() => {
                                        if (invoicedJobIds.has(assignment.jobId)) { 
                                          setMessage('❌ Invoice already generated'); 
                                          setTimeout(() => setMessage(''), 3000); 
                                          return; 
                                        }
                                        startInlineEdit(assignment.assignmentId, item);
                                      }} title="Edit item" className="inline-flex items-center justify-center w-6 h-6 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                      </button>
                                      <button onClick={() => deleteInlineItem(assignment.assignmentId, item)} title="Delete item" className="inline-flex items-center justify-center w-6 h-6 rounded bg-red-100 text-red-700 hover:bg-red-200 transition">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {inlineAddingRow === assignment.assignmentId && (
                          <div className="grid gap-0 border-b border-gray-200 bg-green-50" style={{gridTemplateColumns: '2rem 1fr 6rem 5rem 8rem 5rem'}}>
                            <div className="px-3 py-3 flex items-center justify-center"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></div>
                            <div className="px-3 py-3"><input className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="Item name" value={inlineNewItem.itemName} onChange={e => setInlineNewItem({...inlineNewItem, itemName: e.target.value})} autoFocus /></div>
                            <div className="px-3 py-3 flex items-center"><span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">Custom</span></div>
                            <div className="px-3 py-3 flex items-center"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={inlineNewItem.hasBill} onChange={e => setInlineNewItem({...inlineNewItem, hasBill: e.target.checked})} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" /><span className="text-xs font-medium text-gray-700">Bill</span></label></div>
                            <div className="px-3 py-3"><input className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm text-right" type="number" step="0.01" placeholder="0.00" value={inlineNewItem.actualCost} onChange={e => setInlineNewItem({...inlineNewItem, actualCost: e.target.value})} onKeyDown={e => { if (e.key === 'Enter') saveInlineNewItem(assignment.assignmentId); if (e.key === 'Escape') { setInlineAddingRow(null); setInlineNewItem({ itemName: '', actualCost: '', hasBill: false }); } }} /></div>
                            <div className="px-3 py-3 flex items-center justify-center">
                              <div className="flex gap-2">
                                <button onClick={() => saveInlineNewItem(assignment.assignmentId)} title="Save new item" className="inline-flex items-center justify-center w-6 h-6 rounded bg-green-100 text-green-700 hover:bg-green-200 transition"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg></button>
                                <button onClick={() => { setInlineAddingRow(null); setInlineNewItem({ itemName: '', actualCost: '', hasBill: false }); }} title="Cancel" className="inline-flex items-center justify-center w-6 h-6 rounded bg-red-100 text-red-700 hover:bg-red-200 transition"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                              </div>
                            </div>
                          </div>
                        )}
                        <div className="grid gap-0 border-t-2 border-gray-300 bg-gray-100" style={{gridTemplateColumns: (assignment.status === 'Settled' && (user?.role === 'Waff Clerk' || user?.role === 'Manager') && assignment.assignedTo === user?.userId && !invoicedJobIds.has(assignment.jobId)) ? '2rem 1fr 6rem 5rem 8rem 5rem' : '2rem 1fr 6rem 5rem 8rem'}}>
                          <div className="px-3 py-3"></div>
                          <div className="px-3 py-3"><strong className="text-sm text-gray-900">Total</strong></div>
                          <div className="px-3 py-3"></div>
                          <div className="px-3 py-3"></div>
                          <div className="px-3 py-3 text-right"><strong className="text-sm text-gray-900">LKR {formatAmount(assignment.settlementItems.reduce((sum, i) => sum + parseFloat(i.actualCost || 0), 0))}</strong></div>
                          {(assignment.status === 'Settled' && (user?.role === 'Waff Clerk' || user?.role === 'Manager') && assignment.assignedTo === user?.userId && !invoicedJobIds.has(assignment.jobId)) && <div className="px-3 py-3"></div>}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {(!assignment.settlementItems || assignment.settlementItems.length === 0) && (
            <div className="flex flex-col items-center justify-center py-8 px-4 border border-gray-200 rounded-lg bg-gray-50">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" className="mb-3">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <p className="text-sm text-gray-600">No settlement items recorded</p>
            </div>
          )}
        </div>
      </td>
    </tr>
  );

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Petty Cash Management</h1>
          <p className="text-gray-600 mt-1">{user?.role === 'Waff Clerk' ? 'Your assigned petty cash' : 'Manage petty cash assignments'}</p>
        </div>
        {(user?.role === 'Admin' || user?.role === 'Super Admin' || user?.role === 'Manager') && (
          <button onClick={() => setShowAssignModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition">
            + Assign Petty Cash
          </button>
        )}
      </div>

      {/* User Balances Summary for Admin/Super Admin — carousel */}
      {(user?.role === 'Admin' || user?.role === 'Super Admin') && (() => {
        // Get all Waff Clerks
        const waffClerks = users.filter(u => u.role === 'Waff Clerk');
        
        // Merge with balance data - show all Waff Clerks with their balances or 0
        const balanceList = waffClerks.map(clerk => {
          const balance = userBalances[clerk.userId] || {
            userId: clerk.userId,
            userName: clerk.fullName || clerk.username,
            totalAssigned: 0,
            totalSpent: 0,
            totalBalance: 0,
            totalOver: 0,
            activeAssignments: 0,
            settledAssignments: 0,
            assignments: [],
          };
          return [clerk.userId, balance];
        });

        const CARDS_PER_VIEW = 4;
        const maxIndex = Math.max(0, balanceList.length - CARDS_PER_VIEW);
        const canPrev = userCarouselIndex > 0;
        const canNext = userCarouselIndex < maxIndex;
        const visible = balanceList.slice(userCarouselIndex, userCarouselIndex + CARDS_PER_VIEW);

        return (
          <div className="bg-white rounded-xl border-2 border-gray-200 shadow-sm overflow-hidden mb-6">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">User Petty Cash Summary</h2>
              <span className="text-xs text-gray-600">
                {balanceList.length > 0 
                  ? `Showing ${userCarouselIndex + 1}–${Math.min(userCarouselIndex + CARDS_PER_VIEW, balanceList.length)} of ${balanceList.length} users`
                  : 'No Waff Clerks available'}
              </span>
            </div>

            {/* Month and Year Filter */}
            <div className="flex gap-4 mb-6 items-center p-4 bg-gray-50">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                <select 
                  value={userSummaryFilterMonth} 
                  onChange={(e) => setUserSummaryFilterMonth(parseInt(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                >
                  <option value={1}>January</option>
                  <option value={2}>February</option>
                  <option value={3}>March</option>
                  <option value={4}>April</option>
                  <option value={5}>May</option>
                  <option value={6}>June</option>
                  <option value={7}>July</option>
                  <option value={8}>August</option>
                  <option value={9}>September</option>
                  <option value={10}>October</option>
                  <option value={11}>November</option>
                  <option value={12}>December</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                <select 
                  value={userSummaryFilterYear} 
                  onChange={(e) => setUserSummaryFilterYear(parseInt(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                >
                  {[2024, 2025, 2026].map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>

            {balanceList.length > 0 ? (
              <>
                <div className="relative px-6 py-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {visible.map(([userId, balance]) => (
                      <div key={userId} className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-4">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">{balance.userName.charAt(0).toUpperCase()}</div>
                          <div>
                            <h4 className="font-semibold text-sm text-gray-900">{balance.userName}</h4>
                            <p className="text-xs text-gray-600">{userId}</p>
                          </div>
                        </div>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total Assigned:</span>
                            <span className="font-semibold text-gray-900">LKR {formatAmount(balance.totalAssigned)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total Spent:</span>
                            <span className="font-semibold text-gray-900">LKR {formatAmount(balance.totalSpent)}</span>
                          </div>
                          <div className="border-t border-blue-200 pt-2">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Active:</span>
                              <span className="inline-block bg-blue-200 text-blue-800 px-2 py-0.5 rounded text-xs font-medium">{balance.activeAssignments}</span>
                            </div>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Settled:</span>
                            <span className="inline-block bg-green-200 text-green-800 px-2 py-0.5 rounded text-xs font-medium">{balance.settledAssignments}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Carousel arrows — always visible */}
                  <div className="flex items-center justify-between mt-4">
                    <button
                      className={`p-2 rounded-lg transition ${canPrev ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'bg-gray-50 text-gray-300 cursor-not-allowed'}`}
                      onClick={() => canPrev && setUserCarouselIndex(i => i - 1)}
                      title="Previous"
                      disabled={!canPrev}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="15 18 9 12 15 6"/>
                      </svg>
                    </button>
                    <div className="flex gap-1">
                      {Array.from({length: maxIndex + 1}).map((_, i) => (
                        <button
                          key={i}
                          className={`w-2 h-2 rounded-full transition ${i === userCarouselIndex ? 'bg-blue-600' : 'bg-gray-300 hover:bg-gray-400'}`}
                          onClick={() => setUserCarouselIndex(i)}
                          title={`Go to page ${i + 1}`}
                        />
                      ))}
                    </div>
                    <button
                      className={`p-2 rounded-lg transition ${canNext ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'bg-gray-50 text-gray-300 cursor-not-allowed'}`}
                      onClick={() => canNext && setUserCarouselIndex(i => i + 1)}
                      title="Next"
                      disabled={!canNext}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-6 text-center text-gray-600">
                <p>No Waff Clerks available</p>
              </div>
            )}
          </div>
        );
      })()}

      {/* User's Own Balance Summary */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg border-l-4 ${message.includes('Error') ? 'bg-red-50 border-red-500 text-red-700' : 'bg-green-50 border-green-500 text-green-700'}`}>
          {message}
        </div>
      )}

      {/* Cash Withdrawals Section */}
      {(user?.role === 'Admin' || user?.role === 'Super Admin') && (
        <div className="bg-white rounded-xl border-2 border-gray-200 shadow-sm overflow-hidden mb-6">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition" onClick={() => setWithdrawalsCollapsed(c => !c)}>
            <h2 className="text-xl font-bold text-gray-900">
              Cash Withdrawals / Deposits ({getFilteredCashWithdrawals().length})
            </h2>
            <div className="flex gap-3 items-center">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowWithdrawalModal(true);
                }} 
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition text-sm"
              >
                + Record Withdrawal / Deposit
              </button>
              <svg
                className={`w-5 h-5 text-gray-600 transition transform ${withdrawalsCollapsed ? '-rotate-180' : ''}`}
                viewBox="0 0 24 24"
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </div>

          {!withdrawalsCollapsed && (
            <div className="p-6">
              {/* Month and Year Filters */}
              <div className="flex gap-4 mb-6 items-center">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                  <select 
                    value={withdrawalFilterMonth} 
                    onChange={(e) => setWithdrawalFilterMonth(parseInt(e.target.value))}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                  >
                    <option value={1}>January</option>
                    <option value={2}>February</option>
                    <option value={3}>March</option>
                    <option value={4}>April</option>
                    <option value={5}>May</option>
                    <option value={6}>June</option>
                    <option value={7}>July</option>
                    <option value={8}>August</option>
                    <option value={9}>September</option>
                    <option value={10}>October</option>
                    <option value={11}>November</option>
                    <option value={12}>December</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                  <select 
                    value={withdrawalFilterYear} 
                    onChange={(e) => setWithdrawalFilterYear(parseInt(e.target.value))}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                  >
                    {[2024, 2025, 2026, 2027].map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>

              {getFilteredCashWithdrawals().length === 0 ? (
                <p className="text-center text-gray-600 py-8">
                  No cash withdrawals recorded for this period
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700 w-40">Withdrawal ID</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700 w-24">Type</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700 w-32">Date</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700 min-w-fit">Bank Name</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700 w-32">Amount</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700 w-40">Recorded By</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {getFilteredCashWithdrawals().map((withdrawal) => (
                        <tr key={withdrawal.withdrawalId} className="hover:bg-gray-50 transition">
                          <td className="px-4 py-3 text-sm font-semibold text-blue-600">{withdrawal.withdrawalId}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${withdrawal.transactionType === 'withdrawal' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                              {withdrawal.transactionType === 'withdrawal' ? 'Withdrawal' : 'Deposit'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{new Date(withdrawal.withdrawalDate).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{withdrawal.bankName}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900">LKR {formatAmount(withdrawal.amount)}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{withdrawal.createdByName || withdrawal.createdBy}</td>
                          <td className="px-4 py-3 text-sm" style={{ color: withdrawal.notes ? '#374151' : '#9ca3af' }}>
                            {withdrawal.notes || 'No notes'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Management Settlement Section */}
      {(user?.role === 'Admin' || user?.role === 'Super Admin' || user?.role === 'Manager') && (
        <ManagementSettlementSection user={user} />
      )}

      <div className="bg-white rounded-xl border-2 border-gray-200 shadow-sm overflow-hidden mb-6">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition" onClick={() => setAssignmentsCollapsed(c => !c)}>
          <h2 className="text-xl font-bold text-gray-900">
            Petty Cash Assignments 
            {(searchTerm || statusFilter !== 'all') ? (
              <span> ({getFilteredCount()} of {assignments.length})</span>
            ) : (
              <span> ({assignments.length})</span>
            )}
          </h2>
          <svg
            className={`w-5 h-5 text-gray-600 transition transform ${assignmentsCollapsed ? '-rotate-180' : ''}`}
            viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2.5"
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
        
        {/* Search and Filter Bar */}
        {!assignmentsCollapsed && <div className="p-4 bg-gray-50 border-b border-gray-200 flex gap-4 items-center">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-2.5 text-gray-400" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input
              type="text"
              placeholder="Search by ID, customer, or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
            />
            {searchTerm && (
              <button 
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 transition" 
                onClick={() => setSearchTerm('')}
                title="Clear search"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            )}
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="Assigned">Assigned</option>
            <option value="Settled">Settled</option>
            <option value="Balance To Be Return">Balance To Be Return</option>
            <option value="Over Due">Over Due</option>
            <option value="Pending Approval">Pending Approval</option>
            <option value="Pending Approval / Balance">Pending Approval / Balance</option>
            <option value="Pending Approval / Over Due">Pending Approval / Over Due</option>
            <option value="Balance Returned">Balance Returned</option>
            <option value="Overdue Collected">Overdue Collected</option>
            <option value="Settled / Balance Returned">Settled / Balance Returned</option>
            <option value="Settled / Over Due Collected">Settled / Over Due Collected</option>
            <option value="Settled/Approved">Settled/Approved</option>
            <option value="Settled/Rejected">Settled/Rejected</option>
            <option value="Closed">Closed</option>
          </select>
        </div>}
        
        {!assignmentsCollapsed && (assignments.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="mx-auto mb-4 text-gray-400" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
            <p className="text-gray-600">{user?.role === 'Waff Clerk' ? 'No petty cash assigned to you yet' : 'No petty cash assignments yet'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Assignment ID</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Job ID / CUSDEC Number</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 min-w-56">Customer</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Assigned To</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Total Assigned</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Total Settled</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Assigned Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {(() => {
                  // Group assignments by groupId
                  console.log('=== GROUPING DEBUG ===');
                  console.log('Total assignments:', assignments.length);
                  console.log('Assignments data:', assignments);
                  
                  // Filter assignments based on search term and status
                  const filteredAssignments = assignments.filter(assignment => {
                    // Status filter
                    if (statusFilter !== 'all' && assignment.status !== statusFilter) {
                      return false;
                    }
                    
                    // Search filter
                    if (searchTerm.trim()) {
                      const searchLower = searchTerm.toLowerCase();
                      const job = jobs.find(j => j.jobId === assignment.jobId);
                      const customerName = job ? getCustomerName(job.customerId).toLowerCase() : '';
                      const cusdecNumber = job?.cusdecNumber?.toLowerCase() || '';
                      const jobId = assignment.jobId.toLowerCase();
                      const assignedToName = (assignment.assignedToName || assignment.assignedTo || '').toLowerCase();
                      
                      const matchesSearch = 
                        jobId.includes(searchLower) ||
                        customerName.includes(searchLower) ||
                        cusdecNumber.includes(searchLower) ||
                        assignedToName.includes(searchLower);
                      
                      if (!matchesSearch) {
                        return false;
                      }
                    }
                    
                    return true;
                  });
                  
                  const groupMap = new Map();
                  filteredAssignments.forEach(a => {
                    const gid = a.groupId || `${a.jobId}_${a.assignedTo}`;
                    console.log(`Assignment ${a.assignmentId}: jobId=${a.jobId}, assignedTo=${a.assignedTo}, groupId=${a.groupId}, calculated=${gid}`);
                    if (!groupMap.has(gid)) groupMap.set(gid, []);
                    groupMap.get(gid).push(a);
                  });
                  const groups = Array.from(groupMap.entries());
                  
                  console.log('Total groups:', groups.length);
                  console.log('Groups:', groups.map(([gid, assigns]) => ({ groupId: gid, count: assigns.length, ids: assigns.map(a => a.assignmentId) })));
                  console.log('=== END DEBUG ===');
                  
                  // Show "no results" message if filtered list is empty
                  if (groups.length === 0) {
                    return (
                      <tr>
                        <td colSpan="9" style={{textAlign: 'center', padding: '2rem'}}>
                          <div className="empty-state">
                            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
                              <circle cx="11" cy="11" r="8"></circle>
                              <path d="m21 21-4.35-4.35"></path>
                            </svg>
                            <p style={{marginTop: '1rem', color: '#6b7280'}}>
                              {searchTerm || statusFilter !== 'all' 
                                ? 'No assignments match your search criteria' 
                                : 'No assignments found'}
                            </p>
                            {(searchTerm || statusFilter !== 'all') && (
                              <button 
                                className="btn btn-secondary" 
                                style={{marginTop: '1rem'}}
                                onClick={() => {
                                  setSearchTerm('');
                                  setStatusFilter('all');
                                }}
                              >
                                Clear Filters
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  // Pagination logic for groups
                  const totalPages = Math.ceil(groups.length / recordsPerPage);
                  const indexOfLastRecord = currentPage * recordsPerPage;
                  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
                  const currentGroups = groups.slice(indexOfFirstRecord, indexOfLastRecord);

                  return currentGroups.map(([groupId, groupAssignments]) => {
                    const first = groupAssignments[0];
                    const job = jobs.find(j => j.jobId === first.jobId);
                    const isGroupExpanded = expandedRows.has(groupId);
                    const isMulti = groupAssignments.length > 1;

                    // Group-level aggregates
                    const totalAssigned = groupAssignments.reduce((s, a) => s + parseFloat(a.assignedAmount || 0), 0);
                    
                    // Collect all settlement items across all assignments in the group
                    // To handle grouped assignments correctly, we pull items from all assignments but deduplicate them
                    console.log('--- Aggregating Items (GroupId:', groupId, ') ---');
                    const allSettlementItems = groupAssignments.flatMap((a) => {
                      const items = a.settlementItems || [];
                      return items.map(item => ({ ...item, assignmentId: a.assignmentId }));
                    }).reduce((acc, item) => {
                      // Check if item already exists in accumulator to avoid duplication
                      // Match by name and cost for a robust check
                      const exists = acc.some(i => i.itemName === item.itemName && parseFloat(i.actualCost) === parseFloat(item.actualCost));
                      if (!exists) {
                        acc.push(item);
                      }
                      return acc;
                    }, []);
                    console.log('Final Aggregated Items:', allSettlementItems);

                    const totalSpent = allSettlementItems.reduce((s, i) => s + parseFloat(i.actualCost || 0), 0);
                    const totalBalance = totalAssigned > totalSpent ? totalAssigned - totalSpent : 0;
                    const totalOver = totalSpent > totalAssigned ? totalSpent - totalAssigned : 0;
                    const allSettled = groupAssignments.every(a => [
                      'Settled',
                      'Balance To Be Return',
                      'Over Due',
                      'Pending Approval / Balance',
                      'Pending Approval / Over Due',
                      'Settled / Balance Returned',
                      'Settled / Over Due Collected',
                      'Settled/Approved',
                      'Settled/Rejected',
                      'Balance Returned',
                      'Overdue Collected',
                      'Closed',
                      'Full Petty Cash Returned'
                    ].includes(a.status));
                    const anyAssigned = groupAssignments.some(a => a.status === 'Assigned');
                    // Status priority: most advanced status wins for the group display
                    const statusPriority = [
                      'Assigned',
                      'Settled',
                      'Balance To Be Return',
                      'Over Due',
                      'Settled/Rejected',
                      'Pending Approval',
                      'Pending Approval / Balance',
                      'Pending Approval / Over Due',
                      'Balance Returned',
                      'Overdue Collected',
                      'Settled / Balance Returned',
                      'Settled / Over Due Collected',
                      'Settled/Approved',
                      'Closed'
                    ];
                    const groupStatus = isMulti
                      ? (() => {
                          if (anyAssigned) return 'Assigned';
                          // Check if any assignment is Closed (invoice generated - bill created)
                          const hasClosed = groupAssignments.some(a => a.status === 'Closed');
                          if (hasClosed) return 'Closed';
                          // Check if any assignment has a pending approval status
                          const hasPendingApproval = groupAssignments.some(a => 
                            a.status === 'Pending Approval / Balance' || 
                            a.status === 'Pending Approval / Over Due' ||
                            a.status === 'Pending Approval'
                          );
                          if (hasPendingApproval) {
                            // Return the specific pending approval status if found
                            const pendingAssignment = groupAssignments.find(a => 
                              a.status === 'Pending Approval / Balance' || 
                              a.status === 'Pending Approval / Over Due' ||
                              a.status === 'Pending Approval'
                            );
                            return pendingAssignment.status;
                          }
                          // Check if all assignments have the same approved status
                          const allBalanceReturned = groupAssignments.every(a => a.status === 'Settled / Balance Returned');
                          const allOverDueCollected = groupAssignments.every(a => a.status === 'Settled / Over Due Collected');
                          const allApproved = groupAssignments.every(a => a.status === 'Settled/Approved');
                          const allFullReturned = groupAssignments.every(a => a.status === 'Full Petty Cash Returned');
                          
                          if (allBalanceReturned) return 'Settled / Balance Returned';
                          if (allOverDueCollected) return 'Settled / Over Due Collected';
                          if (allApproved) return 'Settled/Approved';
                          if (allFullReturned) return 'Full Petty Cash Returned';
                          
                          // Determine status based on group totals, not individual statuses
                          if (totalBalance > 0) return 'Balance To Be Return';
                          if (totalOver > 0) return 'Over Due';
                          // If all settled and no balance/over, return 'Settled'
                          return 'Settled';
                        })()
                      : groupAssignments[0].status;

                    // Balance/Over buttons: only show for Waff Clerks (not Managers)
                    // Managers get automatic final status after settlement
                    const canReturnBalance = !anyAssigned && user?.role === 'Waff Clerk' && first.assignedTo === user?.userId
                      && (groupStatus === 'Settled' || groupStatus === 'Balance To Be Return' || groupStatus === 'Settled/Rejected')
                      && groupStatus !== 'Pending Approval / Balance'
                      && groupStatus !== 'Pending Approval / Over Due'
                      && groupStatus !== 'Pending Approval'
                      && groupStatus !== 'Closed'
                      && groupStatus !== 'Full Petty Cash Returned'
                      && groupStatus !== 'Settled / Balance Returned'
                      && groupStatus !== 'Settled / Over Due Collected'
                      && (isMulti ? totalBalance > 0 : first.balanceAmount > 0);
                    const canCollectOverdue = !anyAssigned && user?.role === 'Waff Clerk' && first.assignedTo === user?.userId
                      && (groupStatus === 'Settled' || groupStatus === 'Over Due' || groupStatus === 'Settled/Rejected')
                      && groupStatus !== 'Pending Approval / Balance'
                      && groupStatus !== 'Pending Approval / Over Due'
                      && groupStatus !== 'Pending Approval'
                      && groupStatus !== 'Closed'
                      && groupStatus !== 'Full Petty Cash Returned'
                      && groupStatus !== 'Settled / Balance Returned'
                      && groupStatus !== 'Settled / Over Due Collected'
                      && (isMulti ? totalOver > 0 : first.overAmount > 0);

                    return (
                      <React.Fragment key={groupId}>
                        {/* Group Header Row */}
                        <tr className="border-b border-gray-200 hover:bg-gray-50 transition">
                          <td data-label="Assignment ID" className="px-4 py-3">
                            {isMulti ? (
                              <strong className="text-gray-900 font-semibold">#{first.assignmentId}</strong>
                            ) : (
                              <strong className="text-gray-900 font-semibold">#{first.assignmentId}</strong>
                            )}
                          </td>
                          <td className="px-4 py-3" data-label="Job ID / CUSDEC">
                            {job && job.cusdecNumber ? (
                              <span className="text-gray-900">{first.jobId} / {job.cusdecNumber}</span>
                            ) : (
                              <span className="text-gray-900">{first.jobId}</span>
                            )}
                          </td>
                          <td className="px-4 py-3" data-label="Customer"><span className="text-gray-900">{job ? getCustomerName(job.customerId) : '-'}</span></td>
                          <td className="px-4 py-3" data-label="Assigned To">
                            <span className="text-gray-900">{first.assignedToName || first.assignedTo || '-'}</span>
                          </td>
                          <td className="px-4 py-3" data-label="Status">
                            <span className={`status-badge ${getStatusBadgeClass(groupStatus)}`}>
                              {getStatusDisplay(groupStatus)}
                            </span>
                          </td>
                          <td className="px-4 py-3" data-label="Total Assigned"><strong className="text-gray-900">LKR {formatAmount(totalAssigned)}</strong></td>
                          <td className="px-4 py-3" data-label="Total Settled"><strong className="text-gray-900">LKR {formatAmount(totalSpent)}</strong></td>
                          <td className="px-4 py-3" data-label="Assigned Date"><span className="text-gray-900">{new Date(first.assignedDate).toLocaleDateString()}</span></td>
                          <td className="px-4 py-3" data-label="Actions">
                            <div className="flex items-center gap-2">
                              {/* Unified action logic for both single and grouped assignments */}
                              {/* Show settle button if user is assigned to this petty cash (Waff Clerk or Manager) */}
                              {anyAssigned && (user?.role === 'Waff Clerk' || user?.role === 'Manager') && first.assignedTo === user?.userId && (
                                <button onClick={() => {
                                  const settlementAssignment = {
                                    ...first,
                                    assignedAmount: totalAssigned,
                                    isGroupedSettlement: isMulti,
                                    groupAssignments: groupAssignments
                                  };
                                  openSettleModal(settlementAssignment);
                                }} title="Settle petty cash" className="inline-flex items-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition">
                                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                                  Settle
                                </button>
                              )}
                              {canReturnBalance && (
                                <button onClick={() => {
                                  const assignmentForModal = isMulti
                                    ? { ...first, balanceAmount: totalBalance, overAmount: totalOver, groupAssignmentIds: groupAssignments.map(a => a.assignmentId) }
                                    : first;
                                  openSettlementModal(assignmentForModal, 'BALANCE_RETURN');
                                }} className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition">Return Balance</button>
                              )}
                              {canCollectOverdue && (
                                <button onClick={() => {
                                  const assignmentForModal = isMulti
                                    ? { ...first, balanceAmount: totalBalance, overAmount: totalOver, groupAssignmentIds: groupAssignments.map(a => a.assignmentId) }
                                    : first;
                                  openSettlementModal(assignmentForModal, 'OVERDUE_COLLECTION');
                                }} className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition">Collect Overdue</button>
                              )}
                              {/* Always show eye icon for viewing details */}
                              <button onClick={() => {
                                const newExpanded = new Set(expandedRows);
                                if (newExpanded.has(groupId)) newExpanded.delete(groupId);
                                else newExpanded.add(groupId);
                                setExpandedRows(newExpanded);
                              }} title={isGroupExpanded ? 'Hide Details' : 'View Details'} className="inline-flex items-center justify-center w-9 h-9 rounded-lg hover:bg-gray-200 transition text-gray-700">
                                {isGroupExpanded ? (
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                                ) : (
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Expanded: for multi-assignment groups, show sub-assignments in a professional table */}
                        {isGroupExpanded && isMulti && (
                          <tr className="border-b border-gray-200">
                            <td colSpan="9" className="p-0">
                              <div className="bg-gray-50 p-4">

                                {/* Sub-Assignments simple table: ID, Amount, Date only */}
                                <div className="mb-4">
                                  <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-base font-semibold text-gray-900">Sub-Assignments</h4>
                                    <span className="text-sm text-gray-600">{groupAssignments.length} assignments</span>
                                  </div>
                                  <table className="w-full border-collapse">
                                    <thead>
                                      <tr className="bg-gray-100 border-b border-gray-200">
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 w-1/3">Assignment ID</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 w-1/3">Assigned Amount</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 w-1/3">Assigned Date</th>
                                      </tr>
                                    </thead>
                                  <tbody>
                                    {groupAssignments.map((assignment, index) => {
                                      const subAssignmentId = `#${first.assignmentId}-${index + 1}`;
                                      return (
                                        <tr key={assignment.assignmentId} className="border-b border-gray-200 hover:bg-gray-100 transition">
                                          <td className="px-4 py-3"><strong className="text-gray-900 font-semibold">#{subAssignmentId}</strong></td>
                                          <td className="px-4 py-3"><strong className="text-gray-900 font-semibold">LKR {formatAmount(assignment.assignedAmount)}</strong></td>
                                          <td className="px-4 py-3 text-gray-900">{new Date(assignment.assignedDate).toLocaleDateString()}</td>
                                        </tr>
                                      );
                                    })}
                                    {/* Totals Row */}
                                    <tr className="bg-gray-100 border-t-2 border-gray-300">
                                      <td className="px-4 py-3"><strong className="text-gray-900 font-semibold">TOTAL</strong></td>
                                      <td className="px-4 py-3"><strong className="text-gray-900 font-semibold">LKR {formatAmount(totalAssigned)}</strong></td>
                                      <td></td>
                                    </tr>
                                  </tbody>
                                </table>
                                </div>

                                {/* Group Financial Summary — shown after settling */}
                                {(allSettled || allSettlementItems.length > 0) && (
                                  <div className="mt-6">
                                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 bg-white p-4 rounded-lg border border-gray-200">
                                      <div>
                                        <span className="block text-xs font-medium text-gray-600 mb-1">Total Assigned</span>
                                        <span className="block text-sm font-semibold text-gray-900">LKR {formatAmount(totalAssigned)}</span>
                                      </div>
                                      <div>
                                        <span className="block text-xs font-medium text-gray-600 mb-1">Total Spent</span>
                                        <span className="block text-sm font-semibold text-gray-900">{totalSpent > 0 ? `LKR ${formatAmount(totalSpent)}` : '—'}</span>
                                      </div>
                                      {/* Balance to Return — only before approval/close */}
                                      {totalBalance > 0 && ![
                                        'Balance Returned',
                                        'Settled / Balance Returned',
                                        'Pending Approval / Balance',
                                        'Settled/Approved',
                                        'Closed'
                                      ].includes(groupStatus) && (
                                        <div>
                                          <span className="block text-xs font-medium text-gray-600 mb-1">Balance to Return</span>
                                          <span className="block text-sm font-semibold text-green-600">LKR {formatAmount(totalBalance)}</span>
                                        </div>
                                      )}
                                      {/* Balance Returned — after approval or close */}
                                      {totalBalance > 0 && [
                                        'Balance Returned',
                                        'Settled / Balance Returned',
                                        'Settled/Approved',
                                        'Closed'
                                      ].includes(groupStatus) && (
                                        <div>
                                          <span className="block text-xs font-medium text-gray-600 mb-1">Balance Returned</span>
                                          <span className="block text-sm font-semibold text-gray-900">LKR {formatAmount(totalBalance)}</span>
                                        </div>
                                      )}
                                      {/* Over Amount — only before collection/close */}
                                      {totalOver > 0 && ![
                                        'Overdue Collected',
                                        'Settled / Over Due Collected',
                                        'Pending Approval / Over Due',
                                        'Settled/Approved',
                                        'Closed'
                                      ].includes(groupStatus) && (
                                        <div>
                                          <span className="block text-xs font-medium text-gray-600 mb-1">Over Amount</span>
                                          <span className="block text-sm font-semibold text-red-600">LKR {formatAmount(totalOver)}</span>
                                        </div>
                                      )}
                                      {/* Overdue Collected — after collection or close */}
                                      {totalOver > 0 && [
                                        'Overdue Collected',
                                        'Settled / Over Due Collected',
                                        'Settled/Approved',
                                        'Closed'
                                      ].includes(groupStatus) && (
                                        <div>
                                          <span className="block text-xs font-medium text-gray-600 mb-1">Overdue Collected</span>
                                          <span className="block text-sm font-semibold text-gray-900">LKR {formatAmount(totalOver)}</span>
                                        </div>
                                      )}
                                    </div>

                                    {/* Settlement Items across all assignments */}
                                    {allSettlementItems.length > 0 && (
                                      <div className="mt-4">
                                      <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-semibold text-gray-900">Settlement Items</h3>
                                        <div className="flex items-center gap-3">
                                          <span className="text-sm text-gray-600">{allSettlementItems.length} item{allSettlementItems.length !== 1 ? 's' : ''}</span>
                                          {(user?.role === 'Waff Clerk' || user?.role === 'Manager') && first.assignedTo === user?.userId && !invoicedJobIds.has(first.jobId) && (
                                            <button onClick={() => {
                                              setInlineAddingRow(first.assignmentId);
                                              setInlineNewItem({ itemName: '', actualCost: '', hasBill: false });
                                            }} className="inline-flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition">
                                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                              Add New Pay Item
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                                          {(() => {
                                            const canEdit = (user?.role === 'Waff Clerk' || user?.role === 'Manager') && first.assignedTo === user?.userId && !invoicedJobIds.has(first.jobId);
                                            return (
                                              <>
                                                <div className="bg-gray-100 border-b border-gray-200 grid gap-0" style={{gridTemplateColumns: canEdit ? '2rem 1fr 6rem 5rem 8rem 5rem' : '2rem 1fr 6rem 5rem 8rem'}}>
                                                  <div className="px-3 py-3 text-xs font-semibold text-gray-700 text-center">#</div>
                                                  <div className="px-3 py-3 text-xs font-semibold text-gray-700">Item Name</div>
                                                  <div className="px-3 py-3 text-xs font-semibold text-gray-700">Type</div>
                                                  <div className="px-3 py-3 text-xs font-semibold text-gray-700">Bill</div>
                                                  <div className="px-3 py-3 text-xs font-semibold text-gray-700 text-right">Actual Cost</div>
                                                  {canEdit && <div className="px-3 py-3 text-xs font-semibold text-gray-700">Actions</div>}
                                                </div>
                                                <div>
                                                  {allSettlementItems.map((item, idx) => {
                                                    const isEditing = inlineEditingItem?.assignmentId === item.assignmentId && inlineEditingItem?.itemId === item.settlementItemId;
                                                    return (
                                                      <div key={idx} className="grid gap-0 border-b border-gray-200 hover:bg-blue-50 transition" style={{gridTemplateColumns: canEdit ? '2rem 1fr 6rem 5rem 8rem 5rem' : '2rem 1fr 6rem 5rem 8rem'}}>
                                                        <div className="px-3 py-3 flex items-center justify-center text-sm text-gray-600">{idx + 1}</div>
                                                        <div className="px-3 py-3 flex items-center">
                                                          {isEditing ? <input className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm" value={inlineEditName} onChange={e => setInlineEditName(e.target.value)} autoFocus /> : <span className="text-sm text-gray-900">{item.itemName}</span>}
                                                        </div>
                                                        <div className="px-3 py-3 flex items-center">
                                                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${item.isCustomItem ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{item.isCustomItem ? 'Custom' : 'Template'}</span>
                                                        </div>
                                                        <div className="px-3 py-3 flex items-center">
                                                          {item.hasBill ? (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-medium"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>Bill</span>
                                                          ) : (
                                                            <span className="text-xs text-gray-500">No Bill</span>
                                                          )}
                                                        </div>
                                                        <div className="px-3 py-3 flex items-center justify-end">
                                                          {isEditing
                                                            ? <input className="w-24 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm text-right" type="number" step="0.01" value={inlineEditCost} onChange={e => setInlineEditCost(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveInlineEdit(item.assignmentId); if (e.key === 'Escape') cancelInlineEdit(); }} />
                                                            : <span className="text-sm font-medium text-gray-900">LKR {formatAmount(item.actualCost)}</span>}
                                                        </div>
                                                        {canEdit && (
                                                          <div className="px-3 py-3 flex items-center justify-center">
                                                            {isEditing ? (
                                                              <div className="flex gap-2">
                                                                <button onClick={() => saveInlineEdit(item.assignmentId)} title="Save" className="inline-flex items-center justify-center w-6 h-6 rounded bg-green-100 text-green-700 hover:bg-green-200 transition"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg></button>
                                                                <button onClick={cancelInlineEdit} title="Cancel" className="inline-flex items-center justify-center w-6 h-6 rounded bg-red-100 text-red-700 hover:bg-red-200 transition"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                                                              </div>
                                                            ) : (
                                                              <div className="flex gap-2">
                                                                <button onClick={() => {
                                                                  if (invoicedJobIds.has(first.jobId)) {
                                                                    setMessage('❌ Invoice already generated');
                                                                    setTimeout(() => setMessage(''), 3000);
                                                                    return;
                                                                  }
                                                                  startInlineEdit(item.assignmentId, item);
                                                                }} title="Edit item" className="inline-flex items-center justify-center w-6 h-6 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition">
                                                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                                                </button>
                                                                {item.isCustomItem && (
                                                                  <button onClick={() => deleteInlineItem(item.assignmentId, item)} title="Delete item" className="inline-flex items-center justify-center w-6 h-6 rounded bg-red-100 text-red-700 hover:bg-red-200 transition">
                                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                                                  </button>
                                                                )}
                                                              </div>
                                                            )}
                                                          </div>
                                                        )}
                                                      </div>
                                                    );
                                                  })}
                                                  {/* Inline add new item row */}
                                                  {inlineAddingRow === first.assignmentId && (
                                                    <div className="grid gap-0 border-b border-gray-200 bg-green-50" style={{gridTemplateColumns: '2rem 1fr 6rem 5rem 8rem 5rem'}}>
                                                      <div className="px-3 py-3 flex items-center justify-center"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></div>
                                                      <div className="px-3 py-3"><input className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="Item name" value={inlineNewItem.itemName} onChange={e => setInlineNewItem({...inlineNewItem, itemName: e.target.value})} autoFocus /></div>
                                                      <div className="px-3 py-3 flex items-center"><span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">Custom</span></div>
                                                      <div className="px-3 py-3 flex items-center"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={inlineNewItem.hasBill} onChange={e => setInlineNewItem({...inlineNewItem, hasBill: e.target.checked})} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" /><span className="text-xs font-medium text-gray-700">Bill</span></label></div>
                                                      <div className="px-3 py-3"><input className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm text-right" type="number" step="0.01" placeholder="0.00" value={inlineNewItem.actualCost} onChange={e => setInlineNewItem({...inlineNewItem, actualCost: e.target.value})} onKeyDown={e => { if (e.key === 'Enter') saveInlineNewItem(first.assignmentId); if (e.key === 'Escape') { setInlineAddingRow(null); setInlineNewItem({ itemName: '', actualCost: '', hasBill: false }); } }} /></div>
                                                      <div className="px-3 py-3 flex items-center justify-center">
                                                        <div className="flex gap-2">
                                                          <button onClick={() => saveInlineNewItem(first.assignmentId)} title="Save" className="inline-flex items-center justify-center w-6 h-6 rounded bg-green-100 text-green-700 hover:bg-green-200 transition"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg></button>
                                                          <button onClick={() => { setInlineAddingRow(null); setInlineNewItem({ itemName: '', actualCost: '', hasBill: false }); }} title="Cancel" className="inline-flex items-center justify-center w-6 h-6 rounded bg-red-100 text-red-700 hover:bg-red-200 transition"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                                                        </div>
                                                      </div>
                                                    </div>
                                                  )}
                                                  {/* Total row */}
                                                  <div className="grid gap-0 border-t-2 border-gray-300 bg-gray-100" style={{gridTemplateColumns: canEdit ? '2rem 1fr 6rem 5rem 8rem 5rem' : '2rem 1fr 6rem 5rem 8rem'}}>
                                                    <div className="px-3 py-3"></div>
                                                    <div className="px-3 py-3"><strong className="text-sm text-gray-900">Total</strong></div>
                                                    <div className="px-3 py-3"></div>
                                                    <div className="px-3 py-3"></div>
                                                    <div className="px-3 py-3 text-right"><strong className="text-sm text-gray-900">LKR {formatAmount(allSettlementItems.reduce((sum, i) => sum + parseFloat(i.actualCost || 0), 0))}</strong></div>
                                                    {canEdit && <div className="px-3 py-3"></div>}
                                                  </div>
                                                </div>
                                              </>
                                            );
                                          })()}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}

                              </div>
                            </td>
                          </tr>
                        )}

                        {/* Single assignment expanded details */}
                        {isGroupExpanded && !isMulti && renderExpandedDetails(first)}
                      </React.Fragment>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        ))}

        {!assignmentsCollapsed && assignments.length > 0 && (() => {
          // Calculate total groups for pagination
          const filteredAssignments = assignments.filter(assignment => {
            if (statusFilter !== 'all' && assignment.status !== statusFilter) {
              return false;
            }
            if (searchTerm.trim()) {
              const searchLower = searchTerm.toLowerCase();
              const job = jobs.find(j => j.jobId === assignment.jobId);
              const customerName = job ? getCustomerName(job.customerId).toLowerCase() : '';
              const cusdecNumber = job?.cusdecNumber?.toLowerCase() || '';
              const jobId = assignment.jobId.toLowerCase();
              const assignedToName = (assignment.assignedToName || assignment.assignedTo || '').toLowerCase();
              
              const matchesSearch = 
                jobId.includes(searchLower) ||
                customerName.includes(searchLower) ||
                cusdecNumber.includes(searchLower) ||
                assignedToName.includes(searchLower);
              
              if (!matchesSearch) {
                return false;
              }
            }
            return true;
          });
          
          const groupMap = new Map();
          filteredAssignments.forEach(a => {
            const gid = a.groupId || `${a.jobId}_${a.assignedTo}`;
            if (!groupMap.has(gid)) groupMap.set(gid, []);
            groupMap.get(gid).push(a);
          });
          const totalGroups = groupMap.size;
          const totalPages = Math.ceil(totalGroups / recordsPerPage);

          return totalGroups > 0 ? (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalRecords={totalGroups}
              recordsPerPage={recordsPerPage}
              onPageChange={(pageNumber) => {
                setCurrentPage(pageNumber);
                setExpandedRows(new Set());
              }}
              onRecordsPerPageChange={(newRecordsPerPage) => {
                setRecordsPerPage(newRecordsPerPage);
                setCurrentPage(1);
                setExpandedRows(new Set());
              }}
            />
          ) : null;
        })()}
      </div>
      {/* Assign Petty Cash Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-2xl w-full my-8">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-2xl font-bold text-gray-900">Assign Petty Cash</h2>
              <button onClick={() => setShowAssignModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl font-bold">×</button>
            </div>

            <form onSubmit={handleAssignSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Job <span className="text-red-600">*</span></label>
                <select
                  value={assignFormData.jobId}
                  onChange={(e) => setAssignFormData({ 
                    ...assignFormData, 
                    jobId: e.target.value,
                    assignedTo: '' // Reset user selection when job changes
                  })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="">-- Select Job --</option>
                  {getAvailableJobs().map(job => (
                    <option key={job.jobId} value={job.jobId}>
                      {job.jobId} - {getCustomerName(job.customerId)} - {job.shipmentCategory}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign To <span className="text-red-600">*</span></label>
                <select
                  value={assignFormData.assignedTo}
                  onChange={(e) => setAssignFormData({ ...assignFormData, assignedTo: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="">-- Select User --</option>
                  {getAvailableUsersForJob(assignFormData.jobId).map(u => (
                    <option key={u.userId} value={u.userId}>
                      {u.fullName}
                    </option>
                  ))}
                </select>
                {assignFormData.jobId && getAvailableUsersForJob(assignFormData.jobId).length === 0 && (
                  <p className="text-yellow-600 text-sm mt-1">No users are assigned to this job.</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (LKR) <span className="text-red-600">*</span></label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={assignFormData.assignedAmount}
                  onChange={handleAssignedAmountChange}
                  onKeyDown={handleAssignedAmountKeyDown}
                  onPaste={(e) => {
                    const pastedText = e.clipboardData.getData('text');
                    if (!/^\d+(\.\d{1,2})?$/.test(pastedText.trim())) {
                      e.preventDefault();
                    }
                  }}
                  placeholder="0.00"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={assignFormData.notes}
                  onChange={(e) => setAssignFormData({ ...assignFormData, notes: e.target.value })}
                  placeholder="Optional notes..."
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
                <button type="button" onClick={() => setShowAssignModal(false)} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition font-medium">
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium"
                >
                  Assign Petty Cash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settlement Modal */}
      {showSettleModal && selectedAssignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-4xl w-full my-8">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-2xl font-bold text-gray-900">{(selectedAssignment.status === 'Settled' || selectedAssignment.status === 'Pending Approval' || selectedAssignment.status === 'Settled/Approved' || selectedAssignment.status === 'Settled/Rejected' || selectedAssignment.status === 'Balance Returned' || selectedAssignment.status === 'Overdue Collected' || selectedAssignment.status === 'Full Petty Cash Returned') ? 'Settlement Details' : 'Settle Petty Cash'}</h2>
              <button className="text-gray-500 hover:text-gray-700 text-2xl font-bold" onClick={() => {
                setShowSettleModal(false);
                setSelectedAssignment(null);
                setSettlementItems([]);
              }}>×</button>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg">
              <div>
                <span className="block text-xs font-medium text-gray-600 mb-1">Job ID:</span>
                <span className="text-sm font-semibold text-gray-900">{selectedAssignment.jobId}</span>
              </div>
              <div>
                <span className="block text-xs font-medium text-gray-600 mb-1">Assigned Amount:</span>
                <span className="text-sm font-semibold text-gray-900">LKR {formatAmount(selectedAssignment.assignedAmount)}</span>
              </div>
              {(selectedAssignment.status === 'Settled' || selectedAssignment.status === 'Pending Approval' || selectedAssignment.status === 'Balance Returned' || selectedAssignment.status === 'Overdue Collected') && (
                <div>
                  <span className="block text-xs font-medium text-gray-600 mb-1">Actual Spent:</span>
                  <span className="text-sm font-semibold text-gray-900">LKR {formatAmount(selectedAssignment.actualSpent)}</span>
                </div>
              )}
              {selectedAssignment.balanceAmount > 0 && (
                <div>
                  <span className="block text-xs font-medium text-gray-600 mb-1">Balance to Return:</span>
                  <span className="text-sm font-semibold text-green-600">LKR {formatAmount(selectedAssignment.balanceAmount)}</span>
                </div>
              )}
              {selectedAssignment.overAmount > 0 && (
                <div>
                  <span className="block text-xs font-medium text-gray-600 mb-1">Over Amount:</span>
                  <span className="text-sm font-semibold text-red-600">LKR {formatAmount(selectedAssignment.overAmount)}</span>
                </div>
              )}
            </div>

            {(selectedAssignment.status === 'Settled' || 
              selectedAssignment.status === 'Balance To Be Return' || 
              selectedAssignment.status === 'Over Due' || 
              selectedAssignment.status === 'Pending Approval / Balance' || 
              selectedAssignment.status === 'Pending Approval / Over Due' || 
              selectedAssignment.status === 'Settled / Balance Returned' || 
              selectedAssignment.status === 'Settled / Over Due Collected' || 
              selectedAssignment.status === 'Pending Approval' || 
              selectedAssignment.status === 'Settled/Approved' || 
              selectedAssignment.status === 'Settled/Rejected' || 
              selectedAssignment.status === 'Balance Returned' || 
              selectedAssignment.status === 'Overdue Collected' ||
              selectedAssignment.status === 'Closed') ? (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Settlement Items {!canEditSettlement && '(Read-Only)'}</h3>
                {canEditSettlement && (
                  <p className="text-sm text-blue-700 mb-4 p-3 bg-blue-50 rounded-lg">✏️ You can edit or delete items below (invoice not yet generated)</p>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 border-b border-gray-200">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Item Name</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Actual Cost (LKR)</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Type</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Bill</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Paid By</th>
                        {canEditSettlement && <th className="px-3 py-2 text-left font-semibold text-gray-700">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {settlementItems.map((item, index) => (
                        <tr key={index} className={`hover:bg-gray-50 transition ${item.hasBill ? 'bg-amber-50' : ''}`}>
                          {editingSettlementItem === item.settlementItemId ? (
                            <>
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  value={editItemName}
                                  onChange={(e) => setEditItemName(e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                  placeholder="Item name"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={editActualCost}
                                  onChange={(e) => setEditActualCost(e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                  placeholder="0.00"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${item.isCustomItem ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                                  {item.isCustomItem ? 'Custom' : 'Template'}
                                </span>
                              </td>
                              <td className="px-3 py-2">
                                {item.hasBill ? (
                                  <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800 flex items-center gap-1">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                      <polyline points="20 6 9 17 4 12"/>
                                    </svg>
                                    Bill
                                  </span>
                                ) : (
                                  <span className="text-gray-500 text-xs">No Bill</span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-xs text-gray-700">{item.paidByName || 'Unknown'}</td>
                              <td className="px-3 py-2 flex gap-2">
                                <button onClick={saveEditedSettlementItem} className="inline-flex items-center justify-center w-6 h-6 rounded bg-green-100 text-green-700 hover:bg-green-200 transition" title="Save">
                                  ✓
                                </button>
                                <button onClick={cancelEditSettlementItem} className="inline-flex items-center justify-center w-6 h-6 rounded bg-red-100 text-red-700 hover:bg-red-200 transition" title="Cancel">
                                  ✗
                                </button>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-3 py-2 text-gray-900">{item.itemName}</td>
                              <td className="px-3 py-2 font-semibold text-gray-900">LKR {formatAmount(item.actualCost)}</td>
                              <td className="px-3 py-2">
                                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${item.isCustomItem ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                                  {item.isCustomItem ? 'Custom' : 'Template'}
                                </span>
                              </td>
                              <td className="px-3 py-2">
                                {item.hasBill ? (
                                  <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800 flex items-center gap-1">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                      <polyline points="20 6 9 17 4 12"/>
                                    </svg>
                                    Bill
                                  </span>
                                ) : (
                                  <span className="text-gray-500 text-xs">No Bill</span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-xs text-gray-700">{item.paidByName || 'Unknown'}</td>
                              {canEditSettlement && (
                                <td className="px-3 py-2 flex gap-2">
                                  <button onClick={() => startEditSettlementItem(item)} className="inline-flex items-center justify-center w-6 h-6 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition text-sm" title="Edit">
                                    ✏️
                                  </button>
                                  <button onClick={() => deleteSettlementItem(item)} className="inline-flex items-center justify-center w-6 h-6 rounded bg-red-100 text-red-700 hover:bg-red-200 transition text-sm" title="Delete">
                                    🗑️
                                  </button>
                                </td>
                              )}
                            </>
                          )}
                        </tr>
                      ))}
                      <tr className="bg-gray-100 border-t-2 border-gray-300">
                        <td className="px-3 py-2 font-semibold text-gray-900">Total</td>
                        <td className="px-3 py-2 font-semibold text-gray-900">LKR {formatAmount(selectedAssignment.actualSpent)}</td>
                        <td></td>
                        <td></td>
                        <td></td>
                        {canEditSettlement && <td></td>}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSettleSubmit} className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Settlement Items</h3>
                  <p className="text-sm text-gray-600 mb-4">Fill in only the items you paid for. Tick the "Bill" checkbox if you have a proof receipt for that item. Items already paid in other assignments are shown as read-only. You can also submit <strong>without entering any amounts</strong> to return the full petty cash allocation.</p>
                  <div className="space-y-3 mb-6">
                    {settlementItems.map((item, index) => (
                      <div key={index} className={`border rounded-lg p-4 ${item.alreadyPaid ? 'bg-gray-50 border-gray-300' : 'bg-white border-gray-200'} ${item.hasBill ? 'border-l-4 border-l-amber-400' : ''}`}>
                        <div className="flex justify-between items-start mb-3">
                          <div className="text-sm font-medium text-gray-700">Item {index + 1}</div>
                          {item.alreadyPaid && (
                            <span className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded">Read-Only (Already Paid)</span>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <input
                            type="text"
                            value={item.itemName}
                            onChange={(e) => handleSettlementItemChange(index, 'itemName', e.target.value)}
                            placeholder="Item name"
                            disabled={item.alreadyPaid}
                            className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm ${item.alreadyPaid ? 'bg-gray-100 text-gray-600 border-gray-300 cursor-not-allowed' : 'border-gray-300'}`}
                          />
                          <input
                            type="number"
                            step="0.01"
                            value={item.actualCost}
                            onChange={(e) => handleSettlementItemChange(index, 'actualCost', e.target.value)}
                            placeholder={item.alreadyPaid ? `Paid: ${item.actualCost}` : '0.00'}
                            disabled={item.alreadyPaid}
                            className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm ${item.alreadyPaid ? 'bg-gray-100 text-gray-600 border-gray-300 cursor-not-allowed' : 'border-gray-300'}`}
                          />
                        </div>
                        <div className="flex items-center gap-4 mt-3">
                          {/* Has Bill Checkbox */}
                          {!item.alreadyPaid && (
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!!item.hasBill}
                                onChange={(e) => handleSettlementItemChange(index, 'hasBill', e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                title="Check if you have a proof bill/receipt for this item"
                              />
                              <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                  <polyline points="14 2 14 8 20 8"></polyline>
                                </svg>
                                Bill
                              </span>
                            </label>
                          )}
                          {item.alreadyPaid && item.hasBill && (
                            <span className="inline-flex items-center gap-1 text-sm text-amber-700 bg-amber-50 px-2 py-1 rounded" title="This item has a proof bill">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                              </svg>
                              Bill
                            </span>
                          )}
                          {item.alreadyPaid && (
                            <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                              Paid by {item.paidByName || 'Unknown'}
                            </span>
                          )}
                          {!item.alreadyPaid && settlementItems.filter(i => !i.alreadyPaid).length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeSettlementItem(index)}
                              className="ml-auto inline-flex items-center justify-center w-7 h-7 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition"
                              title="Remove item"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                              </svg>
                            </button>
                          )}
                        </div>
                    </div>
                  ))}
                </div>

                    <button type="button" onClick={addSettlementItem} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium text-sm">
                      + Add Custom Item
                    </button>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Assigned Amount:</span>
                    <span className="text-sm font-semibold text-gray-900">LKR {formatAmount(selectedAssignment.assignedAmount)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Total Spent:</span>
                    <span className="text-sm font-semibold text-gray-900">LKR {formatAmount(calculateTotalSpent())}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
                    {calculateTotalSpent() < selectedAssignment.assignedAmount ? (
                      <>
                        <span className="text-sm font-medium text-gray-700">Balance to Return:</span>
                        <span className="text-sm font-semibold text-green-600">
                          LKR {formatAmount(selectedAssignment.assignedAmount - calculateTotalSpent())}
                        </span>
                      </>
                    ) : calculateTotalSpent() > selectedAssignment.assignedAmount ? (
                      <>
                        <span className="text-sm font-medium text-gray-700">Over Amount:</span>
                        <span className="text-sm font-semibold text-red-600">
                          LKR {formatAmount(calculateTotalSpent() - selectedAssignment.assignedAmount)}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-sm font-medium text-gray-700">Exact Match:</span>
                        <span className="text-sm font-semibold text-gray-900">LKR 0.00</span>
                      </>
                    )}
                  </div>
                  {settlementItems.filter(i => !i.alreadyPaid).length === 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded p-3 flex gap-2 mt-3">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 text-blue-700 mt-0.5">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="16" x2="12" y2="12"/>
                        <line x1="12" y1="8" x2="12.01" y2="8"/>
                      </svg>
                      <span className="text-xs text-blue-700"><strong>Full Return:</strong> Submitting without item amounts will return the entire LKR {formatAmount(selectedAssignment.assignedAmount)} and require approval.</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSettleModal(false);
                      setSelectedAssignment(null);
                      setSettlementItems([]);
                    }}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition font-medium"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition font-medium">Settle Petty Cash</button>
                </div>
              </form>
            )}
            </div>
          </div>
        </div>
      )}

      {/* Cash Balance Settlement Modal */}
      {showSettlementModal && selectedAssignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-2xl w-full my-8">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                {settlementFormData.settlementType === 'BALANCE_RETURN' ? 'Return Balance Cash' : 'Collect Overdue Cash'}
              </h2>
              <button
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                onClick={() => {
                  setShowSettlementModal(false);
                  setSelectedAssignment(null);
                  setSettlementFormData({ settlementType: '', amount: '', notes: '' });
                }}
              >
                ×
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">Assignment:</span>
                  <span className="text-sm text-gray-900">#{selectedAssignment.assignmentId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">Job ID:</span>
                  <span className="text-sm text-gray-900">{selectedAssignment.jobId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    {settlementFormData.settlementType === 'BALANCE_RETURN' ? 'Balance Amount:' : 'Overdue Amount:'}
                  </span>
                  <span className={`text-sm font-semibold ${settlementFormData.settlementType === 'BALANCE_RETURN' ? 'text-green-600' : 'text-red-600'}`}>
                    LKR {formatAmount(settlementFormData.amount)}
                  </span>
                </div>
              </div>

              <form onSubmit={handleSettlementSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Settlement Type</label>
                  <input
                    type="text"
                    value={settlementFormData.settlementType === 'BALANCE_RETURN' ? 'Return Balance to Management' : 'Collect Overdue from Management'}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (LKR)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={settlementFormData.amount}
                    onChange={(e) => setSettlementFormData({...settlementFormData, amount: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={settlementFormData.notes}
                    onChange={(e) => setSettlementFormData({...settlementFormData, notes: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    rows="3"
                    placeholder="Add any additional notes or details"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSettlementModal(false);
                      setSelectedAssignment(null);
                      setSettlementFormData({ settlementType: '', amount: '', notes: '' });
                    }}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition font-medium"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium">
                    {settlementFormData.settlementType === 'BALANCE_RETURN' ? 'Request Balance Return' : 'Request Overdue Collection'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Settlement Modal (from main table) */}
      {showEditSettlementModal && selectedAssignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-4xl w-full my-8">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                Edit Settlement Items
              </h2>
              <button className="text-gray-500 hover:text-gray-700 text-2xl font-bold" onClick={() => {
                setShowEditSettlementModal(false);
                setEditSettlementItems([]);
                setSelectedAssignment(null);
              }}>×</button>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
              <div className="settlement-info">
                <div className="settlement-info-grid">
                  <div className="settlement-info-item">
                    <span className="info-label">Assignment ID:</span>
                    <span className="info-value">#{selectedAssignment.assignmentId}</span>
                  </div>
                  <div className="settlement-info-item">
                    <span className="info-label">Job ID:</span>
                    <span className="info-value">{selectedAssignment.jobId}</span>
                  </div>
                  <div className="settlement-info-item">
                    <span className="info-label">Assigned Amount:</span>
                    <span className="info-value">LKR {formatAmount(selectedAssignment.assignedAmount)}</span>
                  </div>
                </div>
              </div>

              <div className="edit-settlement-form">
                <div className="form-header">
                  <h3>Settlement Items</h3>
                  <button 
                    type="button" 
                    onClick={addNewSettlementItem} 
                    className="btn btn-secondary btn-add-item"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginRight: '6px'}}>
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Add New Item
                  </button>
                </div>

                <div className="edit-settlement-items-list">
                  {editSettlementItems.map((item, index) => (
                    <div key={index} className={`edit-settlement-item-card ${item.isNew ? 'new-item' : ''}`}>
                      <div className="item-header">
                        <span className="item-number">#{index + 1}</span>
                        {item.isNew && <span className="new-badge">New</span>}
                        <button
                          type="button"
                          onClick={() => deleteEditSettlementItem(item)}
                          className="btn-delete-card"
                          title="Delete item"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                          </svg>
                        </button>
                      </div>
                      
                      <div className="item-fields">
                        <div className="form-group">
                          <label>Item Name <span className="required">*</span></label>
                          <input
                            type="text"
                            value={item.itemName}
                            onChange={(e) => handleEditSettlementItemChange(index, 'itemName', e.target.value)}
                            placeholder="Enter item name"
                            className="form-control"
                          />
                        </div>
                        
                        <div className="form-group">
                          <label>Actual Cost (LKR) <span className="required">*</span></label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.actualCost}
                            onChange={(e) => handleEditSettlementItemChange(index, 'actualCost', e.target.value)}
                            placeholder="0.00"
                            className="form-control"
                          />
                        </div>

                        {item.isNew && (
                          <div className="form-group checkbox-group">
                            <label className="checkbox-label">
                              <input
                                type="checkbox"
                                checked={!!item.hasBill}
                                onChange={(e) => handleEditSettlementItemChange(index, 'hasBill', e.target.checked)}
                              />
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                <line x1="16" y1="17" x2="8" y2="17"></line>
                              </svg>
                              Has Bill/Receipt
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="settlement-summary">
                  <div className="summary-row">
                    <span>Assigned Amount:</span>
                    <span>LKR {formatAmount(selectedAssignment.assignedAmount)}</span>
                  </div>
                  <div className="summary-row">
                    <span>Total Spent:</span>
                    <span>LKR {formatAmount(editSettlementItems.reduce((sum, item) => sum + (parseFloat(item.actualCost) || 0), 0))}</span>
                  </div>
                  <div className="summary-row total">
                    {editSettlementItems.reduce((sum, item) => sum + (parseFloat(item.actualCost) || 0), 0) < selectedAssignment.assignedAmount ? (
                      <>
                        <span>Balance to Return:</span>
                        <span className="balance-positive">
                          LKR {formatAmount(selectedAssignment.assignedAmount - editSettlementItems.reduce((sum, item) => sum + (parseFloat(item.actualCost) || 0), 0))}
                        </span>
                      </>
                    ) : editSettlementItems.reduce((sum, item) => sum + (parseFloat(item.actualCost) || 0), 0) > selectedAssignment.assignedAmount ? (
                      <>
                        <span>Over Amount:</span>
                        <span className="balance-negative">
                          LKR {formatAmount(editSettlementItems.reduce((sum, item) => sum + (parseFloat(item.actualCost) || 0), 0) - selectedAssignment.assignedAmount)}
                        </span>
                      </>
                    ) : (
                      <>
                        <span>Exact Match:</span>
                        <span>LKR 0.00</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditSettlementModal(false);
                      setEditSettlementItems([]);
                      setSelectedAssignment(null);
                    }}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    onClick={saveAllSettlementChanges} 
                    className="btn btn-success"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginRight: '6px'}}>
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Save All Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cash Withdrawal Modal */}
      <CashWithdrawalModal
        show={showWithdrawalModal}
        onClose={() => setShowWithdrawalModal(false)}
        onSubmit={handleWithdrawalSubmit}
      />
    </div>
  );
}

// Management Settlement Section Component
const ManagementSettlementSection = ({ user }) => {
  const [settlements, setSettlements] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [actionLoading, setActionLoading] = useState({});
  const [collapsed, setCollapsed] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(20);

  useEffect(() => {
    fetchSettlements();
  }, []);

  const fetchSettlements = async () => {
    setLoading(true);
    try {
      const endpoint = `${API_BASE}/api/cash-balance-settlements`;

      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSettlements(data.data || []);
      } else {
        setMessage('Failed to fetch settlements');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error fetching settlements:', error);
      setMessage('Error fetching settlements');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const pendingCount = settlements.filter(settlement => settlement.status === 'PENDING').length;
  const approvedCount = settlements.filter(settlement => settlement.status === 'APPROVED').length;
  const rejectedCount = settlements.filter(settlement => settlement.status === 'REJECTED').length;

  const filteredSettlements = settlements.filter(settlement => {
    if (activeTab === 'pending') return settlement.status === 'PENDING';
    if (activeTab === 'approved') return settlement.status === 'APPROVED';
    if (activeTab === 'rejected') return settlement.status === 'REJECTED';
    return true;
  });

  // Pagination logic
  const totalRecords = filteredSettlements.length;
  const totalPages = Math.ceil(totalRecords / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const paginatedSettlements = filteredSettlements.slice(startIndex, endIndex);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const handleRecordsPerPageChange = (newRecordsPerPage) => {
    setRecordsPerPage(newRecordsPerPage);
    setCurrentPage(1);
  };

  const handleApprove = async (settlementId, managerNotes = '') => {
    setActionLoading(prev => ({ ...prev, [settlementId]: 'approving' }));
    try {
      const response = await fetch(`${API_BASE}/api/cash-balance-settlements/${settlementId}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ managerNotes })
      });

      if (response.ok) {
        setMessage('Settlement approved successfully');
        fetchSettlements();
        setTimeout(() => setMessage(''), 3000);
      } else {
        const data = await response.json();
        setMessage(data.message || 'Failed to approve settlement');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error approving settlement:', error);
      setMessage('Error approving settlement');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setActionLoading(prev => ({ ...prev, [settlementId]: null }));
    }
  };

  const handleReject = async (settlementId, managerNotes) => {
    if (!managerNotes.trim()) {
      setMessage('Please provide a reason for rejection');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setActionLoading(prev => ({ ...prev, [settlementId]: 'rejecting' }));
    try {
      const response = await fetch(`${API_BASE}/api/cash-balance-settlements/${settlementId}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ managerNotes })
      });

      if (response.ok) {
        setMessage('Settlement rejected successfully');
        fetchSettlements();
        setTimeout(() => setMessage(''), 3000);
      } else {
        const data = await response.json();
        setMessage(data.message || 'Failed to reject settlement');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error rejecting settlement:', error);
      setMessage('Error rejecting settlement');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setActionLoading(prev => ({ ...prev, [settlementId]: null }));
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'PENDING': return 'status-pending';
      case 'APPROVED': return 'status-approved';
      case 'REJECTED': return 'status-rejected';
      default: return 'status-assigned';
    }
  };

  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 shadow-sm overflow-hidden mb-6">
      <div className="p-6 border-b border-gray-200 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition" onClick={() => setCollapsed(c => !c)}>
        <h2 className="text-xl font-bold text-gray-900">
          Cash Balance Settlement Management
        </h2>
        <svg
          className={`w-5 h-5 text-gray-600 transition transform ${collapsed ? '-rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2.5"
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>

      {!collapsed && (<>

      {message && (
        <div className={`mb-4 p-4 rounded-lg border-l-4 mx-6 mt-6 ${message.includes('Error') || message.includes('Failed') ? 'bg-red-50 border-red-500 text-red-700' : 'bg-green-50 border-green-500 text-green-700'}`}>
          {message}
        </div>
      )}

      <div className="flex gap-2 p-4 bg-gray-50 border-b border-gray-200 overflow-x-auto">
        <button 
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition font-medium text-sm whitespace-nowrap ${activeTab === 'pending' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
          onClick={() => { setActiveTab('pending'); setCurrentPage(1); }}
          title="View pending settlements"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          Pending ({pendingCount})
        </button>
        <button 
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition font-medium text-sm whitespace-nowrap ${activeTab === 'approved' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
          onClick={() => { setActiveTab('approved'); setCurrentPage(1); }}
          title="View approved settlements"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          Approved ({approvedCount})
        </button>
        <button 
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition font-medium text-sm whitespace-nowrap ${activeTab === 'rejected' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
          onClick={() => { setActiveTab('rejected'); setCurrentPage(1); }}
          title="View rejected settlements"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
          Rejected ({rejectedCount})
        </button>
        <button 
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition font-medium text-sm whitespace-nowrap ${activeTab === 'all' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
          onClick={() => { setActiveTab('all'); setCurrentPage(1); }}
          title="View all settlements"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 11l3 3L22 4"></path>
            <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          All Settlements
        </button>
      </div>

      <div className="p-6">
        {loading && <div className="text-center py-8 text-gray-600">Loading settlements...</div>}
        
        {!loading && filteredSettlements.length === 0 && (
          <div className="text-center py-12">
            <svg className="mx-auto mb-4 text-gray-400" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
            <p className="text-gray-600">No {activeTab} settlements found.</p>
          </div>
        )}

        {!loading && filteredSettlements.length > 0 && (
          <>
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Settlement ID</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Waff Clerk</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Job ID / Cusdec ID</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Type</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Amount</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Request Date</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedSettlements.map(settlement => (
                    <tr key={settlement.settlementId} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 text-gray-900 font-semibold">
                        {settlement.settlementId}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{settlement.userName}</td>
                      <td className="px-4 py-3 text-gray-700">
                        {settlement.jobId
                          ? `${settlement.jobId}${settlement.cusdecNumber ? ' / ' + settlement.cusdecNumber : ''}`
                          : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${settlement.settlementType === 'BALANCE_RETURN' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>
                          {settlement.settlementType === 'BALANCE_RETURN' ? 'Balance Return' : 'Overdue Collection'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-900 font-semibold">
                        LKR {settlement.amount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          settlement.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                          settlement.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {settlement.statusDisplay}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {new Date(settlement.requestDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {settlement.status === 'PENDING' && (
                            <>
                              <button
                                className="inline-flex items-center px-3 py-1 rounded-lg bg-green-600 hover:bg-green-700 text-white transition font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={() => handleApprove(settlement.settlementId)}
                                disabled={actionLoading[settlement.settlementId]}
                                title="Approve this settlement"
                              >
                                {actionLoading[settlement.settlementId] === 'approving' ? 'Approving...' : 'Approve'}
                              </button>
                              <button
                                className="inline-flex items-center px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white transition font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={() => {
                                  const notes = prompt('Please provide a reason for rejection:');
                                  if (notes) handleReject(settlement.settlementId, notes);
                                }}
                                disabled={actionLoading[settlement.settlementId]}
                                title="Reject this settlement"
                              >
                                {actionLoading[settlement.settlementId] === 'rejecting' ? 'Rejecting...' : 'Reject'}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination 
              currentPage={currentPage}
              totalPages={totalPages}
              totalRecords={totalRecords}
              recordsPerPage={recordsPerPage}
              onPageChange={handlePageChange}
              onRecordsPerPageChange={handleRecordsPerPageChange}
              recordsPerPageOptions={[20, 50, 100]}
            />
          </>
        )}
      </div>
      </>)}
    </div>
  );
};

export default PettyCash;


