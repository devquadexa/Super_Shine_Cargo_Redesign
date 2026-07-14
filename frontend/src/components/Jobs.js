import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { jobService } from '../api/services/jobService';
import { customerService } from '../api/services/customerService';
import { authService } from '../api/services/authService';
import { transporterService } from '../api/services/transporterService';
import apiClient from '../api/client';
import API_BASE from '../api/config';
import OfficePayItems from './OfficePayItems';
import AdvancePayment from './AdvancePayment';
import JobPettyCash from './JobPettyCash';
import JobInvoicingModal from './JobInvoicingModal';
import Pagination from './Pagination';

function Jobs() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [users, setUsers] = useState([]);
  const [transporters, setTransporters] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [jobPayments, setJobPayments] = useState({});
  const [viewJobModal, setViewJobModal] = useState(null); // job object being viewed
  const [officePayModal, setOfficePayModal] = useState(null);
  const [advancePayModal, setAdvancePayModal] = useState(null);
  const [invoicingModalJob, setInvoicingModalJob] = useState(null); // for JobInvoicingModal
  const [editingOfficePayItem, setEditingOfficePayItem] = useState(null); // {officePayItemId, description, actualCost, jobId}
  const [editingAdvancePayment, setEditingAdvancePayment] = useState(null); // {advancePaymentId, amount, paymentMadeDate, paymentType, checkNo, notes, jobId}
  const [formStep, setFormStep] = useState(1); // 1 = Job Details, 2 = Petty Cash
  // Petty cash assignments to create after job is saved (optional, array of {userId, amount})
  const [pcAssignments, setPcAssignments] = useState([]);
  const [pcFormRow, setPcFormRow] = useState({ userId: '', amount: '' });
  const [settlingAssignmentId, setSettlingAssignmentId] = useState(null); // Track which assignment is being settled
  const [settlementItemsModal, setSettlementItemsModal] = useState(null); // {pettyAssignmentId, userName}
  const [settleModal, setSettleModal] = useState(null); // {pettyAssignmentId, userName, assignedAmount}
  const [settleItems, setSettleItems] = useState([{ itemName: '', actualCost: '', hasBill: false }]);
  const [settleLoading, setSettleLoading] = useState(false);
  const [assignPcModal, setAssignPcModal] = useState(false); // Show assign petty cash modal
  const [assignPcForm, setAssignPcForm] = useState({ assignedTo: '', assignedAmount: '', notes: '' });
  const [assignPcLoading, setAssignPcLoading] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    customerId: '',
    blNumber: '',
    cusdecNumber: '',
    cusdecDate: '',
    openDate: '',
    shipmentCategory: '',
    chassisNumber: '',
    exporter: '',
    lcNumber: '',
    containerNumber: '',
    transporter: '',
    transportDeliveryDate: '',
    assignedTo: ''
  });
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(20);
  const [pettyCashAssignments, setPettyCashAssignments] = useState({}); // Track petty cash assignments by jobId
  const [invoicedJobIds, setInvoicedJobIds] = useState(new Set()); // Track jobs with invoices
  const [loadingPettyCash, setLoadingPettyCash] = useState(true); // Track loading state

  useEffect(() => {
    fetchJobs();
    fetchCustomers(); // All users need to see customer names
    fetchTransporters();
    fetchInvoicedJobs(); // Fetch jobs that already have invoices
    if (user?.role === 'Admin' || user?.role === 'Super Admin' || user?.role === 'Manager' || user?.role === 'Office Executive') {
      fetchUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (viewJobModal) {
      console.log('=== VIEW JOB MODAL DEBUG ===');
      console.log('viewJobModal:', viewJobModal);
      console.log('viewJobModal.assignments:', viewJobModal.assignments);
      console.log('viewJobModal.assignments length:', viewJobModal.assignments?.length);
      if (viewJobModal.assignments && viewJobModal.assignments.length > 0) {
        console.log('First assignment:', viewJobModal.assignments[0]);
      }
    }
  }, [viewJobModal]);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (showUserDropdown && !event.target.closest('.multi-select-dropdown')) {
        setShowUserDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserDropdown]);
  // Prevent body scroll when modal is open
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

  const fetchJobs = async () => {
    try {
      setLoadingPettyCash(true); // Set loading state
      const data = await jobService.getAll();
      console.log('Fetched jobs data:', data);
      console.log('First job details:', JSON.stringify(data[0], null, 2));
      console.log('First job assignments:', data[0]?.assignments);
      // Ensure all jobs have a status
      const jobsWithStatus = data.map(job => ({
        ...job,
        status: job.status || 'Open'
        // Don't override assignments - keep what came from backend
      }));
      console.log('Jobs with status:', jobsWithStatus);
      console.log('First job after mapping:', JSON.stringify(jobsWithStatus[0], null, 2));
      setJobs(jobsWithStatus);
      
      // Fetch petty cash assignments for all jobs
      await fetchAllPettyCashAssignments(jobsWithStatus);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      setLoadingPettyCash(false); // Reset loading state on error
    }
  };

  // Fetch all petty cash assignments to determine settlement status
  const fetchAllPettyCashAssignments = async (jobsList) => {
    try {
      const token = localStorage.getItem('token');
      const assignmentsMap = {};
      
      // Fetch petty cash assignments for each job
      await Promise.all(
        jobsList.map(async (job) => {
          try {
            const response = await fetch(`${API_BASE}/api/petty-cash-assignments/job/${job.jobId}/all`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            
            if (response.ok) {
              const assignments = await response.json();
              assignmentsMap[job.jobId] = Array.isArray(assignments) ? assignments : [];
            } else {
              assignmentsMap[job.jobId] = [];
            }
          } catch (error) {
            console.error(`Error fetching petty cash for job ${job.jobId}:`, error);
            assignmentsMap[job.jobId] = [];
          }
        })
      );
      
      setPettyCashAssignments(assignmentsMap);
      setLoadingPettyCash(false); // Data loaded successfully
    } catch (error) {
      console.error('Error fetching petty cash assignments:', error);
      setLoadingPettyCash(false); // Reset loading state on error
    }
  };

  // Fetch jobs that already have invoices
  const fetchInvoicedJobs = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/billing`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const bills = await response.json();
        const invoicedSet = new Set(bills.map(b => b.jobId));
        setInvoicedJobIds(invoicedSet);
      }
    } catch (error) {
      console.error('Error fetching invoiced jobs:', error);
    }
  };

  // Check if petty cash is fully settled for a job
  const isPettyCashFullySettled = (jobId) => {
    const assignments = pettyCashAssignments[jobId];
    
    // If no assignments exist, consider it as not having petty cash requirement
    if (!assignments || assignments.length === 0) {
      return true; // Allow invoice if no petty cash was assigned
    }
    
    // All assignments must be in a settled state
    const settledStatuses = [
      'Settled',
      'Settled/Approved',
      'Balance Returned',
      'Overdue Collected',
      'Settled / Balance Returned',
      'Settled / Over Due Collected',
      'Full Petty Cash Returned',
      'Closed'
    ];
    
    const allSettled = assignments.every(assignment => 
      settledStatuses.includes(assignment.status)
    );
    
    return allSettled;
  };

  // Check if manage invoice button should be enabled
  const canManageInvoice = (job) => {
    // Check if invoice already exists
    if (invoicedJobIds.has(job.jobId)) {
      return false;
    }
    
    // Check if petty cash is fully settled (including balance returned or overdue collected)
    if (!isPettyCashFullySettled(job.jobId)) {
      return false;
    }
    
    return true;
  };

  const getManageInvoiceTooltip = (job) => {
    if (invoicedJobIds.has(job.jobId)) {
      return 'Invoice already generated for this job';
    }
    
    if (!isPettyCashFullySettled(job.jobId)) {
      const assignments = pettyCashAssignments[job.jobId];
      if (assignments && assignments.length > 0) {
        const unsettled = assignments.filter(a => {
          const settledStatuses = [
            'Settled',
            'Settled/Approved',
            'Balance Returned',
            'Overdue Collected',
            'Settled / Balance Returned',
            'Settled / Over Due Collected',
            'Full Petty Cash Returned',
            'Closed'
          ];
          return !settledStatuses.includes(a.status);
        });
        
        if (unsettled.length > 0) {
          return `Petty cash must be fully settled first (${unsettled.length} pending)`;
        }
      }
    }
    
    return 'Manage Invoicing';
  };

  const getCustomerName = (customerId) => {
    const customer = customers.find(c => c.customerId === customerId);
    return customer ? customer.name : customerId;
  };

  const getUserFullName = (userId) => {
    if (!userId) return 'Unknown';
    const user = users.find(u => u.userId === userId);
    return user ? user.fullName : userId;
  };

  // Fetch office pay items + advance payments for a specific job (used in expanded row)
  const fetchJobPayments = async (jobId) => {
    try {
      const [officeRes, advanceRes] = await Promise.all([
        apiClient.get(`/office-pay-items/job/${jobId}`),
        apiClient.get(`/jobs/${jobId}/advance-payments`),
      ]);
      setJobPayments(prev => ({
        ...prev,
        [jobId]: {
          officeItems:     Array.isArray(officeRes.data)               ? officeRes.data               : [],
          advancePayments: Array.isArray(advanceRes.data?.data)        ? advanceRes.data.data         :
                           Array.isArray(advanceRes.data)              ? advanceRes.data              : [],
        }
      }));
    } catch (e) {
      console.error('Error fetching payment data for job', jobId, e);
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

  const fetchUsers = async () => {
    try {
      console.log('Fetching users... Current user role:', user?.role);
      const data = await authService.getUsers();
      console.log('Fetched users data:', data);
      const filteredUsers = data.filter(u => u.role === 'Waff Clerk' || u.role === 'Manager');
      console.log('Filtered users (role=Waff Clerk or Manager):', filteredUsers);
      setUsers(filteredUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      console.error('Error details:', error.response?.data || error.message);
      setMessage('Error loading users list. Please refresh the page.');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const fetchTransporters = async () => {
    try {
      const data = await transporterService.getAll();
      // Allow assigning only active transporters in new/edit job flow
      setTransporters(data.filter((transporter) => transporter.isActive));
    } catch (error) {
      console.error('Error fetching transporters:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Create the job first
      const jobResponse = await jobService.create(formData);
      const jobId = jobResponse.jobId;
      
      let assignmentMessage = '';
      
      // If users are selected, assign them to the job
      if (selectedUsers.length > 0) {
        try {
          const response = await apiClient.post(`/job-assignments/jobs/${jobId}/assign-users`, {
            userIds: selectedUsers,
            notes: 'Initial assignment from job creation'
          });
          
          if (response.data.success) {
            assignmentMessage = ` and assigned to ${selectedUsers.length} user${selectedUsers.length > 1 ? 's' : ''}`;
          } else {
            console.error('Assignment failed:', response.data);
            assignmentMessage = ' (Note: Job created but user assignment failed)';
          }
        } catch (assignmentError) {
          console.error('Failed to assign users to job:', assignmentError);
          console.error('Error response:', assignmentError.response?.data);
          assignmentMessage = ' (Note: Job created but user assignment failed)';
        }
      }
      
      const customerName = customers.find(c => c.customerId === formData.customerId)?.name || formData.customerId;
      
      // Optionally create petty cash assignments
      if (pcAssignments.length > 0) {
        for (const pc of pcAssignments) {
          try {
            await apiClient.post('/petty-cash-assignments', {
              jobId,
              assignedTo: pc.userId,
              assignedAmount: parseFloat(pc.amount),
              notes: 'Assigned during job creation',
            });
          } catch (pcErr) {
            console.error('Petty cash assignment error:', pcErr);
          }
        }
      }

      setMessage(`Job created successfully${assignmentMessage}!`);
      setFormData({ 
        customerId: '', 
        blNumber: '', 
        cusdecNumber: '', 
        cusdecDate: '',
        openDate: '', 
        shipmentCategory: '',
        chassisNumber: '',
        exporter: '',
        lcNumber: '',
        containerNumber: '',
        transporter: '',
        transportDeliveryDate: '',
        assignedTo: '' 
      });
      setSelectedUsers([]);
      setShowModal(false);
      setPcAssignments([]);
      setPcFormRow({ userId: '', amount: '' });
      fetchJobs();
      setTimeout(() => setMessage(''), 5000);
    } catch (error) {
      console.error('Job creation error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Error creating job';
      setMessage(`Error creating job: ${errorMessage}`);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  const handleUserSelection = (userId, isChecked) => {
    if (isChecked) {
      setSelectedUsers(prev => [...prev, userId]);
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    }
  };

  const toggleUserDropdown = () => {
    setShowUserDropdown(!showUserDropdown);
  };

  const getSelectedUserNames = () => {
    if (selectedUsers.length === 0) return 'Select Users';
    if (selectedUsers.length === 1) {
      const user = users.find(u => u.userId === selectedUsers[0]);
      return user ? user.fullName : 'Select Users';
    }
    return `${selectedUsers.length} users selected`;
  };

  const normalizeCusdecNumber = (value) => {
    const rawValue = (value || '').trim();
    if (!rawValue) return '';

    const cleaned = rawValue.replace(/^i\s*-\s*/i, '').trim();
    if (!cleaned) return '';

    return `I - ${cleaned}`;
  };

  const formatDateDDMMYYYY = (dateValue) => {
    if (!dateValue) return '';

    const normalized = String(dateValue).split('T')[0];
    const dateParts = normalized.split('-');
    if (dateParts.length === 3) {
      const [year, month, day] = dateParts;
      return `${day}/${month}/${year}`;
    }

    const parsed = new Date(dateValue);
    return Number.isNaN(parsed.getTime()) ? '' : parsed.toLocaleDateString('en-GB');
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

    const formattedDate = formatDateDDMMYYYY(cusdecDate);
    return formattedDate ? `${formattedNumber} of ${formattedDate}` : formattedNumber;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'cusdecNumber') {
      setFormData((prev) => ({ ...prev, cusdecNumber: normalizeCusdecNumber(value) }));
      return;
    }

    setFormData(prev => {
      if (name === 'shipmentCategory') {
        const isVehicleCategory = value === 'Vehicle - Personal' || value === 'Vehicle - Company';
        return {
          ...prev,
          shipmentCategory: value,
          chassisNumber: isVehicleCategory ? prev.chassisNumber : '',
          containerNumber: isVehicleCategory ? '' : prev.containerNumber // Clear container number for vehicle shipments
        };
      }
      return { ...prev, [name]: value };
    });
  };

  const updateStatus = async (jobId, status) => {
    try {
      console.log('updateStatus called - jobId:', jobId, 'status:', status);
      await jobService.updateStatus(jobId, status);
      fetchJobs();
      setMessage('Job status updated!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error updating status:', error);
      console.error('Error response:', error.response?.data);
      setMessage(`Error updating status: ${error.response?.data?.message || error.message}`);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  const getAvailableStatuses = (currentStatus) => {
    const statusMap = {
      'Open': ['In Progress', 'Canceled'],
      'In Progress': ['Pending Payment', 'Canceled'],
      'Pending Payment': ['Payment Collected', 'Overdue'],
      'Payment Collected': ['Completed'],
      'Overdue': ['Payment Collected'],
      'Completed': ['Completed'], // Final status
      'Canceled': ['Canceled'] // Final status
    };
    
    return statusMap[currentStatus] || ['Open'];
  };

  const assignJob = async (jobId, userId) => {
    try {
      await jobService.assignUser(jobId, userId);
      fetchJobs();
      setMessage('Job assigned successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error assigning job:', error);
    }
  };

  const handleSettleAssignment = async (assignment) => {
    const job = viewJobModal;
    let defaultItems = [{ itemName: '', actualCost: '', hasBill: false }];
    
    // Load templates based on job's shipment category
    if (job && job.shipmentCategory) {
      try {
        const response = await apiClient.get(`/pay-item-templates/category/${encodeURIComponent(job.shipmentCategory)}`);
        const templates = response.data;
        if (templates && templates.length > 0) {
          defaultItems = templates.map(template => ({
            itemName: template.itemName,
            actualCost: '',
            hasBill: false
          }));
        }
      } catch (error) {
        console.error('Error loading templates:', error);
      }
    }
    
    setSettleModal({
      pettyAssignmentId: assignment.pettyAssignmentId,
      userName: assignment.userName || assignment.waff_clerk_name || getUserFullName(assignment.userId),
      assignedAmount: parseFloat(assignment.assignedAmount || 0)
    });
    setSettleItems(defaultItems);
  };

  const handleSettleSubmit = async () => {
    const validItems = settleItems.filter(item => item.itemName && item.actualCost && parseFloat(item.actualCost) > 0);
    if (validItems.length === 0) {
      setMessage('Please add at least one settlement item with name and cost');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setSettleLoading(true);
    try {
      const response = await apiClient.post(`/petty-cash-assignments/${settleModal.pettyAssignmentId}/settle`, {
        items: validItems.map(item => ({
          itemName: item.itemName,
          actualCost: parseFloat(item.actualCost),
          hasBill: item.hasBill || false
        }))
      });

      setMessage('✅ Settlement submitted successfully!');
      setSettleModal(null);
      setSettleItems([{ itemName: '', actualCost: '', hasBill: false }]);
      fetchJobs();
      // Refresh view modal
      if (viewJobModal) {
        const data = await jobService.getAll();
        const updatedJob = data.find(j => j.jobId === viewJobModal.jobId);
        if (updatedJob) setViewJobModal(updatedJob);
      }
    } catch (error) {
      console.error('Error settling:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Error settling assignment';
      setMessage(`❌ ${errorMsg}`);
    } finally {
      setSettleLoading(false);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  const handleAssignPcSubmit = async () => {
    if (!assignPcForm.assignedTo) {
      setMessage('Please select a user to assign');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    if (!assignPcForm.assignedAmount || parseFloat(assignPcForm.assignedAmount) <= 0) {
      setMessage('Please enter a valid amount');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setAssignPcLoading(true);
    try {
      await apiClient.post('/petty-cash-assignments', {
        jobId: viewJobModal.jobId,
        assignedTo: assignPcForm.assignedTo,
        assignedAmount: parseFloat(assignPcForm.assignedAmount),
        notes: assignPcForm.notes || null
      });

      setMessage('✅ Petty cash assigned successfully!');
      setAssignPcModal(false);
      setAssignPcForm({ assignedTo: '', assignedAmount: '', notes: '' });
      fetchJobs();
      // Refresh view modal
      const data = await jobService.getAll();
      const updatedJob = data.find(j => j.jobId === viewJobModal.jobId);
      if (updatedJob) setViewJobModal(updatedJob);
    } catch (error) {
      console.error('Error assigning petty cash:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Error assigning petty cash';
      setMessage(`❌ ${errorMsg}`);
    } finally {
      setAssignPcLoading(false);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  const openEditModal = (job) => {
    setSelectedJob(job);
    setIsEditing(true);
    setFormData({
      customerId: job.customerId,
      blNumber: job.blNumber || '',
      cusdecNumber: normalizeCusdecNumber(job.cusdecNumber || ''),
      cusdecDate: job.cusdecDate ? job.cusdecDate.split('T')[0] : '',
      openDate: job.openDate ? job.openDate.split('T')[0] : '',
      shipmentCategory: job.shipmentCategory || '',
      chassisNumber: job.chassisNumber || '',
      exporter: job.exporter || '',
      lcNumber: job.lcNumber || '',
      containerNumber: job.containerNumber || '',
      transporter: job.transporter || '',
      transportDeliveryDate: job.transportDeliveryDate ? job.transportDeliveryDate.split('T')[0] : '',
      assignedTo: job.assignedTo || ''
    });
    // For editing, load existing assignments
    if (job.assignedUsers && job.assignedUsers.length > 0) {
      setSelectedUsers(job.assignedUsers.map(a => a.userId));
    } else if (job.assignedTo) {
      setSelectedUsers([job.assignedTo]);
    } else {
      setSelectedUsers([]);
    }
    setFormStep(1);
    setPcAssignments([]);
    setPcFormRow({ userId: '', amount: '' });
    setShowModal(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await jobService.update(selectedJob.jobId, formData);
      
      // Always synchronize assignments on edit, including clearing all assignees.
      try {
        const response = await apiClient.post(`/job-assignments/jobs/${selectedJob.jobId}/assign-users`, {
          userIds: selectedUsers,
          notes: 'Updated assignment from job edit'
        });
        
        if (!response.data.success) {
          console.error('Failed to update user assignments');
        }
      } catch (assignmentError) {
        console.error('Failed to update user assignments:', assignmentError);
      }
      
      setMessage('Job updated successfully!');
      setFormData({
        customerId: '',
        blNumber: '',
        cusdecNumber: '',
        cusdecDate: '',
        openDate: '',
        shipmentCategory: '',
        chassisNumber: '',
        exporter: '',
        lcNumber: '',
        containerNumber: '',
        transporter: '',
        transportDeliveryDate: '',
        assignedTo: ''
      });
      setSelectedUsers([]);
      setShowUserDropdown(false);
      setShowModal(false);
      setIsEditing(false);
      setSelectedJob(null);
      fetchJobs();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Job update error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Error updating job';
      setMessage(`Error updating job: ${errorMessage}`);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  const filteredJobs = jobs.filter(job => {
    const searchLower = searchTerm.toLowerCase();
    const jobId = (job.jobId || '').toLowerCase();
    const customerName = getCustomerName(job.customerId).toLowerCase();
    const category = (job.shipmentCategory || '').toLowerCase();
    const assignedUser = job.assignedTo ? getUserFullName(job.assignedTo).toLowerCase() : 'unassigned';
    const status = (job.status || 'open').toLowerCase();
    const openDate = job.openDate ? new Date(job.openDate).toLocaleDateString().toLowerCase() : '';
    
    // Status filter
    const statusMatch = statusFilter === 'All' || job.status === statusFilter;
    
    // Search filter
    const searchMatch = jobId.includes(searchLower) ||
           customerName.includes(searchLower) ||
           category.includes(searchLower) ||
           assignedUser.includes(searchLower) ||
           status.includes(searchLower) ||
           openDate.includes(searchLower);
    
    return statusMatch && searchMatch;
  }).sort((a, b) => {
    // Extract numeric part from job ID (e.g., "JOB0001" -> 1)
    const getJobNumber = (jobId) => {
      const match = (jobId || '').match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    };
    
    const numA = getJobNumber(a.jobId);
    const numB = getJobNumber(b.jobId);
    
    // Sort in descending order (newest jobs first)
    return numB - numA;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredJobs.length / recordsPerPage);
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = filteredJobs.slice(indexOfFirstRecord, indexOfLastRecord);

  // Reset to page 1 when search term or status filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handleRecordsPerPageChange = (newRecordsPerPage) => {
    setRecordsPerPage(newRecordsPerPage);
    setCurrentPage(1);
  };

  // Sub-component for settlement items modal (fetches data on mount)
  const SettlementItemsModalContent = ({ assignmentId, userName, onClose }) => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const fetchItems = async () => {
        try {
          const response = await apiClient.get(`/petty-cash-assignments/${assignmentId}/settlement-items`);
          setItems(Array.isArray(response.data) ? response.data : []);
        } catch (err) {
          console.error('Error fetching settlement items:', err);
        } finally {
          setLoading(false);
        }
      };
      fetchItems();
    }, [assignmentId]);

    const total = items.reduce((sum, item) => sum + (parseFloat(item.actualCost) || 0), 0);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10001] p-4">
        <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
          <div className="flex items-center justify-between p-5 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-900">Settlement Items - {userName}</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl font-bold">×</button>
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            {loading ? (
              <p className="text-blue-600 text-sm">Loading items...</p>
            ) : items.length === 0 ? (
              <p className="text-gray-500 text-sm italic text-center py-4">No settlement items found for this assignment.</p>
            ) : (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">Item Name</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">Cost (LKR)</th>
                      <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-600">Bill</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={item.settlementItemId || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-2.5 text-gray-900 font-medium">{item.itemName}</td>
                        <td className="px-4 py-2.5 text-right text-gray-900">{parseFloat(item.actualCost || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                        <td className="px-4 py-2.5 text-center">{item.hasBill ? '✅' : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 border-t-2 border-gray-300">
                      <td className="px-4 py-2.5 text-right font-bold text-gray-700">Total</td>
                      <td className="px-4 py-2.5 text-right font-bold text-gray-900">{total.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
          <div className="flex items-center justify-end px-5 py-4 border-t border-gray-200">
            <button onClick={onClose} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition font-medium text-sm">Close</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Job Management</h1>
          <p className="text-gray-600 mt-1">{user?.role === 'Waff Clerk' ? 'Your assigned jobs' : 'Manage all cargo jobs'}</p>
        </div>
        {(user?.role === 'Admin' || user?.role === 'Super Admin' || user?.role === 'Manager' || user?.role === 'Office Executive') && (
          <button onClick={() => setShowModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition">
            + New Job
          </button>
        )}
      </div>

      {message && <div className={`mb-6 p-4 rounded-lg border-l-4 ${message.includes('Error') ? 'bg-red-50 border-red-500 text-red-700' : 'bg-green-50 border-green-500 text-green-700'}`}>{message}</div>}

      <div className="bg-white rounded-xl border-2 border-gray-200 shadow-sm overflow-hidden">
        {/* ── Search + Status filter on one line ── */}
        <div className="px-5 py-4 border-b border-gray-200 flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input
              type="text"
              placeholder="Search by Job ID, Customer, Category, Assigned User, or Date..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none w-full text-sm"
            />
          </div>

          {/* Status filter */}
          <select
            id="statusFilter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm text-gray-700"
          >
            <option value="All">All Statuses</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Pending Payment">Pending Payment</option>
            <option value="Payment Collected">Payment Collected</option>
            <option value="Overdue">Overdue</option>
            <option value="Completed">Completed</option>
            <option value="Canceled">Canceled</option>
          </select>

          {/* Clear filters */}
          {(statusFilter !== 'All' || searchTerm) && (
            <button
              onClick={() => { setStatusFilter('All'); setSearchTerm(''); }}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition text-sm font-medium"
              title="Clear all filters"
            >
              Clear
            </button>
          )}
        </div>
        {filteredJobs.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-4">≡ƒôª</div>
            <p className="text-gray-600">{searchTerm ? 'No jobs found matching your search' : 'No jobs found'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Job ID / CUSDEC Number</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Customer</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Category</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Open Date</th>
                {user?.role !== 'Waff Clerk' && <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Assigned To</th>}
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentRecords.map(job => (
                <tr key={job.jobId} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 text-sm font-semibold text-blue-600">
                    {job.cusdecNumber && job.cusdecNumber.trim() ? (
                      <span>{job.jobId || '-'} / {formatCusdecNumberForDisplay(job.cusdecNumber)}</span>
                    ) : (
                      <span>{job.jobId || '-'}</span>
                    )}
                  </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{getCustomerName(job.customerId)}</td>
                    <td className="px-6 py-4 text-sm">
                      {job.shipmentCategory ? (
                        <span className="inline-block bg-purple-100 text-purple-800 text-xs font-semibold px-3 py-1 rounded-full">{job.shipmentCategory}</span>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{job.openDate ? new Date(job.openDate).toLocaleDateString() : '-'}</td>
                    {user?.role !== 'Waff Clerk' && (
                      <td className="px-6 py-4 text-sm">
                        <div className="flex flex-wrap gap-2">
                          {job.assignedUsers && job.assignedUsers.length > 0 ? (
                            <>
                              {job.assignedUsers.slice(0, 2).map((assignment, index) => (
                                <span key={assignment.userId || index} className="inline-block bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded">
                                  {assignment.userName || getUserFullName(assignment.userId)}
                                </span>
                              ))}
                              {job.assignedUsers.length > 2 && (
                                <span className="inline-block bg-gray-200 text-gray-800 text-xs font-semibold px-2 py-1 rounded">
                                  +{job.assignedUsers.length - 2} more
                                </span>
                              )}
                            </>
                          ) : job.assignedTo ? (
                            <span className="inline-block bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded">{getUserFullName(job.assignedTo)}</span>
                          ) : (
                            <span className="text-gray-500 text-sm italic">No Assigned Users</span>
                          )}
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4 text-sm">
                      <div className="relative inline-block">
                        <select 
                          className={`px-3 py-1 rounded-full text-xs font-semibold appearance-none pr-8 ${
                            job.status === 'Open' ? 'bg-yellow-100 text-yellow-800' :
                            job.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                            job.status === 'Pending Payment' ? 'bg-orange-100 text-orange-800' :
                            job.status === 'Payment Collected' ? 'bg-green-100 text-green-800' :
                            job.status === 'Overdue' ? 'bg-red-100 text-red-800' :
                            job.status === 'Completed' ? 'bg-gray-100 text-gray-800' :
                            'bg-red-100 text-red-800'
                          }`}
                          onChange={(e) => updateStatus(job.jobId, e.target.value)} 
                          value={job.status || 'Open'}
                          disabled={job.status === 'Completed' || job.status === 'Canceled'}
                        >
                          <option value={job.status || 'Open'}>{job.status || 'Open'}</option>
                          {getAvailableStatuses(job.status || 'Open').map(status => (
                            status !== (job.status || 'Open') && (
                              <option key={status} value={status}>{status.toUpperCase()}</option>
                            )
                          ))}
                        </select>
                        {job.status !== 'Completed' && job.status !== 'Canceled' && (
                          <svg className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none" width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        {(user?.role === 'Admin' || user?.role === 'Super Admin' || user?.role === 'Manager' || user?.role === 'Office Executive') && (
                          <>
<<<<<<< Updated upstream
                            <button
                              onClick={() => setInvoicingModalJob(job)}
                              disabled={job.pettyCashStatus !== 'Settled' && job.assignments && job.assignments.length > 0}
                              title={job.pettyCashStatus !== 'Settled' && job.assignments && job.assignments.length > 0 ? 'Petty cash must be settled first' : 'Manage Invoicing'}
                              className={`p-1.5 rounded-lg transition ${job.pettyCashStatus !== 'Settled' && job.assignments && job.assignments.length > 0 ? 'text-gray-400 cursor-not-allowed' : 'text-green-600 hover:bg-green-50'}`}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                              </svg>
                            </button>
=======
                            {loadingPettyCash ? (
                              <button
                                disabled
                                title="Loading petty cash data..."
                                className="p-1.5 rounded-lg text-gray-400 bg-gray-100 cursor-wait opacity-50"
                              >
                                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                                </svg>
                              </button>
                            ) : (
                              <button
                                onClick={() => canManageInvoice(job) && setInvoicingModalJob(job)}
                                title={getManageInvoiceTooltip(job)}
                                disabled={!canManageInvoice(job)}
                                className={`p-1.5 rounded-lg transition ${
                                  canManageInvoice(job)
                                    ? 'text-blue-600 hover:bg-blue-50 cursor-pointer'
                                    : 'text-gray-400 bg-gray-100 cursor-not-allowed opacity-50'
                                }`}
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                  <polyline points="14 2 14 8 20 8"></polyline>
                                  <line x1="16" y1="13" x2="8" y2="13"></line>
                                  <line x1="16" y1="17" x2="8" y2="17"></line>
                                  <polyline points="10 9 9 9 8 9"></polyline>
                                </svg>
                              </button>
                            )}
>>>>>>> Stashed changes
                            <button
                              onClick={() => openEditModal(job)}
                              title="Edit Job"
                              className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => {
                            setViewJobModal(job);
                            fetchJobPayments(job.jobId);
                          }}
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
                ))}
            </tbody>
          </table>
          </div>
        )}

        {filteredJobs.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalRecords={filteredJobs.length}
            recordsPerPage={recordsPerPage}
            onPageChange={handlePageChange}
            onRecordsPerPageChange={handleRecordsPerPageChange}
          />
        )}
      </div>

      


      {/* View Job Details Modal */}
      {viewJobModal && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] px-[2.5vw] py-2">
          <div className="bg-white rounded-2xl shadow-2xl flex flex-col" style={{ width: '95vw', height: '97vh' }}>

{/* Office Pay Items modal — rendered outside the table */}
      {officePayModal && (
        <OfficePayItems
          jobId={officePayModal}
          onUpdate={() => { 
            fetchJobs(); 
            fetchJobPayments(officePayModal);
            // Refresh the view modal data
            const updatedJob = jobs.find(j => j.jobId === viewJobModal?.jobId);
            if (updatedJob) setViewJobModal(updatedJob);
            setOfficePayModal(null);
            // Keep viewJobModal open
          }}
          forceOpen
        />
      )}

      {/* Advance Payment modal — rendered outside the table */}
      {advancePayModal && (
        <AdvancePayment
          job={advancePayModal}
          onUpdate={() => { 
            fetchJobs(); 
            fetchJobPayments(advancePayModal.jobId);
            // Refresh the view modal data
            const updatedJob = jobs.find(j => j.jobId === advancePayModal?.jobId);
            if (updatedJob) setViewJobModal(updatedJob);
            setAdvancePayModal(null);
            // Keep viewJobModal open
          }}
          forceOpen
        />
      )}

      {/* Edit Office Pay Item modal */}
      {editingOfficePayItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Edit Office Payment</h3>
              <button onClick={() => setEditingOfficePayItem(null)} className="text-gray-500 hover:text-gray-700 text-2xl font-bold">×</button>
            </div>
            <form onSubmit={async (e) => { e.preventDefault(); try { await apiClient.put(`/office-pay-items/${editingOfficePayItem.officePayItemId}`, { description: editingOfficePayItem.description, actualCost: parseFloat(editingOfficePayItem.actualCost) }); fetchJobs(); fetchJobPayments(editingOfficePayItem.jobId); setEditingOfficePayItem(null); } catch(err) { console.error('Update error:', err); } }} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-red-600">*</span></label>
                  <input type="text" value={editingOfficePayItem.description} onChange={(e) => setEditingOfficePayItem(prev => ({...prev, description: e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid (LKR) <span className="text-red-600">*</span></label>
                  <input type="number" step="0.01" min="0" value={editingOfficePayItem.actualCost} onChange={(e) => setEditingOfficePayItem(prev => ({...prev, actualCost: e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" required />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-4">
                <button type="button" onClick={() => setEditingOfficePayItem(null)} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition font-medium">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium">Update Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Advance Payment modal */}
      {editingAdvancePayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Edit Advance Payment</h3>
              <button onClick={() => setEditingAdvancePayment(null)} className="text-gray-500 hover:text-gray-700 text-2xl font-bold">×</button>
            </div>
            <form onSubmit={async (e) => { e.preventDefault(); try { await apiClient.put(`/jobs/${editingAdvancePayment.jobId}/advance-payments/${editingAdvancePayment.advancePaymentId}`, { amount: parseFloat(editingAdvancePayment.amount), paymentMadeDate: editingAdvancePayment.paymentMadeDate, paymentType: editingAdvancePayment.paymentType, checkNo: editingAdvancePayment.checkNo, notes: editingAdvancePayment.notes }); fetchJobs(); fetchJobPayments(editingAdvancePayment.jobId); setEditingAdvancePayment(null); } catch(err) { console.error('Update error:', err); } }} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (LKR) <span className="text-red-600">*</span></label>
                  <input type="number" step="0.01" min="0" value={editingAdvancePayment.amount} onChange={(e) => setEditingAdvancePayment(prev => ({...prev, amount: e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Made Date <span className="text-red-600">*</span></label>
                  <input type="date" value={editingAdvancePayment.paymentMadeDate} onChange={(e) => setEditingAdvancePayment(prev => ({...prev, paymentMadeDate: e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Type <span className="text-red-600">*</span></label>
                  <select value={editingAdvancePayment.paymentType} onChange={(e) => setEditingAdvancePayment(prev => ({...prev, paymentType: e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
                    <option value="cash">Cash</option>
                    <option value="check">Check</option>
                    <option value="bank_transfer">Bank Transfer</option>
                  </select>
                </div>
                {editingAdvancePayment.paymentType === 'check' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Check No.</label>
                    <input type="text" value={editingAdvancePayment.checkNo} onChange={(e) => setEditingAdvancePayment(prev => ({...prev, checkNo: e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <input type="text" value={editingAdvancePayment.notes} onChange={(e) => setEditingAdvancePayment(prev => ({...prev, notes: e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-4">
                <button type="button" onClick={() => setEditingAdvancePayment(null)} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition font-medium">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium">Update Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settlement Items Modal */}
      {settlementItemsModal && (
        <SettlementItemsModalContent
          assignmentId={settlementItemsModal.pettyAssignmentId}
          userName={settlementItemsModal.userName}
          onClose={() => setSettlementItemsModal(null)}
        />
      )}

      {/* Petty Cash Settlement Modal */}
      {settleModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[10000] px-4 py-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-green-600 to-green-700">
              <div>
                <h2 className="text-lg font-bold text-white">Settle Petty Cash</h2>
                <p className="text-green-100 text-xs mt-0.5">{settleModal.userName} — Assigned: LKR {settleModal.assignedAmount.toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
              </div>
              <button onClick={() => setSettleModal(null)} className="text-white hover:bg-green-500 rounded-lg p-2 transition">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <p className="text-sm text-gray-600 mb-4">Add the items that were paid from this petty cash assignment:</p>
              
              <div className="space-y-3">
                {settleItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={item.itemName}
                        onChange={(e) => {
                          const newItems = [...settleItems];
                          newItems[idx].itemName = e.target.value;
                          setSettleItems(newItems);
                        }}
                        placeholder="Item name (e.g. Port Charges)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                      />
                    </div>
                    <div className="w-32">
                      <input
                        type="number"
                        value={item.actualCost}
                        onChange={(e) => {
                          const newItems = [...settleItems];
                          newItems[idx].actualCost = e.target.value;
                          setSettleItems(newItems);
                        }}
                        placeholder="Cost"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                      />
                    </div>
                    <label className="flex items-center gap-1.5 text-xs text-gray-600 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={item.hasBill}
                        onChange={(e) => {
                          const newItems = [...settleItems];
                          newItems[idx].hasBill = e.target.checked;
                          setSettleItems(newItems);
                        }}
                        className="w-4 h-4"
                      />
                      Bill
                    </label>
                    {settleItems.length > 1 && (
                      <button
                        onClick={() => setSettleItems(settleItems.filter((_, i) => i !== idx))}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded transition"
                        title="Remove item"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={() => setSettleItems([...settleItems, { itemName: '', actualCost: '', hasBill: false }])}
                className="mt-3 px-4 py-2 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition"
              >
                + Add Item
              </button>

              {/* Total */}
              <div className="mt-4 p-3 bg-gray-100 rounded-lg flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-700">Total Spent:</span>
                <span className="text-lg font-bold text-gray-900">
                  LKR {settleItems.reduce((sum, item) => sum + (parseFloat(item.actualCost) || 0), 0).toLocaleString('en-US', {minimumFractionDigits: 2})}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button onClick={() => setSettleModal(null)} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition font-medium text-sm">Cancel</button>
              <button
                onClick={handleSettleSubmit}
                disabled={settleLoading}
                className="px-5 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition font-semibold text-sm"
              >
                {settleLoading ? 'Submitting...' : 'Submit Settlement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Petty Cash Modal */}
      {assignPcModal && viewJobModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[10001] px-4 py-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-purple-700 rounded-t-2xl">
              <div>
                <h2 className="text-lg font-bold text-white">Assign Petty Cash</h2>
                <p className="text-purple-100 text-xs mt-0.5">Job #{viewJobModal.jobId}</p>
              </div>
              <button onClick={() => setAssignPcModal(false)} className="text-white hover:bg-purple-500 rounded-lg p-2 transition">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign To <span className="text-red-600">*</span></label>
                <select
                  value={assignPcForm.assignedTo}
                  onChange={(e) => setAssignPcForm(prev => ({...prev, assignedTo: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                >
                  <option value="">Select Waff Clerk</option>
                  {users.filter(u => u.role === 'Waff Clerk' || u.role === 'Manager').map(u => (
                    <option key={u.userId} value={u.userId}>{u.fullName} ({u.role})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (LKR) <span className="text-red-600">*</span></label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={assignPcForm.assignedAmount}
                  onChange={(e) => setAssignPcForm(prev => ({...prev, assignedAmount: e.target.value}))}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                <textarea
                  value={assignPcForm.notes}
                  onChange={(e) => setAssignPcForm(prev => ({...prev, notes: e.target.value}))}
                  placeholder="Enter any notes..."
                  rows="2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
              <button onClick={() => setAssignPcModal(false)} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition font-medium text-sm">Cancel</button>
              <button
                onClick={handleAssignPcSubmit}
                disabled={assignPcLoading}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg transition font-semibold text-sm"
              >
                {assignPcLoading ? 'Assigning...' : 'Assign Petty Cash'}
              </button>
            </div>
          </div>
        </div>
      )}

            {/* Header */}
            <div className="flex items-center justify-between px-10 py-5 rounded-t-2xl shrink-0" style={{ background: 'linear-gradient(135deg,#1E3F63 0%,#2f5e8f 100%)' }}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Job Details</h2>
                  <p className="text-blue-200 text-xs mt-0.5">View complete job information</p>
                </div>
              </div>
              <button onClick={() => setViewJobModal(null)} className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 min-h-0 overflow-y-auto px-14 py-9">
              {/* ── Top: two info cards ── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">

                {/* Basic Information */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#1E3F63" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0">
                      <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>
                    </svg>
                    <span className="text-xs font-bold text-[#1E3F63] uppercase tracking-wider">Basic Information</span>
                  </div>
                  <table className="w-full text-sm border-collapse">
                    <tbody>
                      {[
                        ['Job ID',        viewJobModal.jobId],
                        ['Customer',      getCustomerName(viewJobModal.customerId)],
                        ['Customer ID',   viewJobModal.customerId],
                        ['Category',      viewJobModal.shipmentCategory || '-'],
                        ['Status',        null],
                        ['Assigned To',   null],
                        ['Created Date',  viewJobModal.createdDate ? new Date(viewJobModal.createdDate).toLocaleDateString() : '-'],
                      ].map(([label, val], i) => (
                        <tr key={label} className={i % 2 === 0 ? 'bg-white' : 'bg-[#f8fafc]'}>
                          <td className="px-4 py-3 w-40 text-gray-500 font-medium whitespace-nowrap border-b border-r border-gray-100">{label}</td>
                          <td className="px-4 py-3 text-gray-900 font-semibold border-b border-gray-100">
                            {label === 'Status' ? (
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                viewJobModal.status === 'Open'              ? 'bg-yellow-100 text-yellow-800' :
                                viewJobModal.status === 'In Progress'       ? 'bg-blue-100 text-blue-800' :
                                viewJobModal.status === 'Pending Payment'   ? 'bg-orange-100 text-orange-800' :
                                viewJobModal.status === 'Payment Collected' ? 'bg-green-100 text-green-800' :
                                viewJobModal.status === 'Overdue'           ? 'bg-red-100 text-red-800' :
                                viewJobModal.status === 'Completed'         ? 'bg-gray-100 text-gray-700' :
                                'bg-red-100 text-red-800'
                              }`}>{viewJobModal.status || 'Open'}</span>
                            ) : label === 'Assigned To' ? (
                              viewJobModal.assignedUsers && viewJobModal.assignedUsers.length > 0
                                ? <div className="flex flex-wrap gap-1.5">
                                    {viewJobModal.assignedUsers.map((a, idx) => (
                                      <span key={a.userId || idx} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#eef3f8] text-[#1E3F63] border border-[#c8d8e8]">
                                        {a.userName || getUserFullName(a.userId)}
                                      </span>
                                    ))}
                                  </div>
                                : <span className="text-gray-400">—</span>
                            ) : val}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Shipment Details */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#1E3F63" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0">
                      <path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>
                    </svg>
                    <span className="text-xs font-bold text-[#1E3F63] uppercase tracking-wider">Shipment Details</span>
                  </div>
                  <table className="w-full text-sm border-collapse">
                    <tbody>
                      {[
                        ['BL Number',           viewJobModal.blNumber || '-'],
                        ['CUSDEC Number',       formatCusdecWithDate(viewJobModal.cusdecNumber, viewJobModal.cusdecDate)],
                        ['Open Date',           viewJobModal.openDate ? new Date(viewJobModal.openDate).toLocaleDateString() : '-'],
                        ['LC/TT/DP/DA/NFE No.', viewJobModal.lcNumber || '-'],
                        ...( !(viewJobModal.shipmentCategory === 'Vehicle - Personal' || viewJobModal.shipmentCategory === 'Vehicle - Company')
                              ? [['Container Number', viewJobModal.containerNumber || '-']] : [] ),
                        ...( (viewJobModal.shipmentCategory === 'Vehicle - Personal' || viewJobModal.shipmentCategory === 'Vehicle - Company' || viewJobModal.chassisNumber)
                              ? [['Chassis Number', viewJobModal.chassisNumber || '-']] : [] ),
                        ['Exporter',            viewJobModal.exporter || '-'],
                        ['Transporter',         viewJobModal.transporter || '-'],
                        ['Transport Delivery',  viewJobModal.transportDeliveryDate ? new Date(viewJobModal.transportDeliveryDate).toLocaleDateString() : '-'],
                      ].map(([label, val], i) => (
                        <tr key={label} className={i % 2 === 0 ? 'bg-white' : 'bg-[#f8fafc]'}>
                          <td className="px-4 py-3 w-44 text-gray-500 font-medium whitespace-nowrap border-b border-r border-gray-100">{label}</td>
                          <td className="px-4 py-3 text-gray-900 font-semibold border-b border-gray-100">{val}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── Full-width Payment Details section ── */}
              {(() => {
                const pd = jobPayments[viewJobModal.jobId] || { officeItems: [], advancePayments: [] };
                const fmtLKR = (n) => 'LKR ' + parseFloat(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
                const fmtDT  = (d) => { if (!d) return '-'; const p = new Date(d); return Number.isNaN(p.getTime()) ? String(d) : p.toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}); };
                const officeTotal   = pd.officeItems.reduce((s,i) => s + parseFloat(i.actualCost||0), 0);
                const advanceTotal  = pd.advancePayments.reduce((s,p) => s + parseFloat(p.amount||0), 0);
                return (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-5">
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                      <div className="flex items-center gap-2">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#1E3F63" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 shrink-0">
                          <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                        </svg>
                        <span className="text-sm font-bold text-[#1E3F63] uppercase tracking-wider">Payment Details</span>
                      </div>
                      {/* Add buttons in header */}
                      {['Admin','Super Admin','Manager','Office Executive'].includes(user?.role) && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setOfficePayModal(viewJobModal.jobId)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#1E3F63] hover:bg-[#193552] transition"
                            title="Add office payment"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                            </svg>
                            Office Payment
                          </button>
                          <button
                            onClick={() => setAdvancePayModal(viewJobModal)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#15803d] bg-green-50 hover:bg-green-100 border border-green-200 transition"
                            title="Add advance payment"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                            </svg>
                            Advance Payment
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Office Pay Items sub-table */}
                    <div className="border-b border-gray-100">
                      <div className="px-5 py-2.5 bg-blue-50 border-b border-blue-200">
                        <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">① Office Pay Items</span>
                      </div>
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500">Description</th>
                            <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500">Amount</th>
                            <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500">Paid By</th>
                            <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500">Date</th>
                            {['Admin','Super Admin','Manager','Office Executive'].includes(user?.role) && (
                              <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500">Actions</th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {pd.officeItems.length === 0 ? (
                            <tr><td colSpan={5} className="px-5 py-3 text-gray-400 text-xs italic">No office payments yet</td></tr>
                          ) : pd.officeItems.map((item, i) => (
                            <tr key={item.officePayItemId||i} className={`border-b border-gray-50 ${i%2===0?'bg-white':'bg-[#f8fafc]'}`}>
                              <td className="px-5 py-3 text-gray-900 font-medium">{item.description||'-'}</td>
                              <td className="px-5 py-3 text-gray-900 font-semibold">{fmtLKR(item.actualCost)}</td>
                              <td className="px-5 py-3 text-gray-600">{item.paidByName||'-'}</td>
                              <td className="px-5 py-3 text-gray-600">{fmtDT(item.paymentDate)}</td>
                              {['Admin','Super Admin','Manager','Office Executive'].includes(user?.role) && (
                                <td className="px-5 py-3">
                                  <button
                                    onClick={() => setEditingOfficePayItem({ officePayItemId: item.officePayItemId, description: item.description || '', actualCost: String(item.actualCost || ''), jobId: viewJobModal.jobId })}
                                    className="p-1.5 rounded text-blue-600 hover:bg-blue-50 transition mr-1" title="Edit"
                                  >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                    </svg>
                                  </button>
                                  <button
                                    onClick={async () => { if (!window.confirm('Are you sure you want to delete this office pay item?')) return; try { await apiClient.delete(`/office-pay-items/${item.officePayItemId}`); fetchJobs(); fetchJobPayments(viewJobModal.jobId); } catch(err) { console.error('Delete error:', err); } }}
                                    className="p-1.5 rounded text-red-500 hover:bg-red-50 transition" title="Delete"
                                  >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                                      <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                    </svg>
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-blue-50 border-t border-blue-200">
                            <td colSpan={['Admin','Super Admin','Manager','Office Executive'].includes(user?.role) ? 4 : 3} className="px-5 py-2.5 text-right text-xs font-bold text-gray-600 uppercase tracking-wide">Total Office Payments</td>
                            <td className="px-5 py-2.5 text-blue-700 font-bold text-sm">{fmtLKR(officeTotal)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Advance Payments sub-table */}
                    <div>
                      <div className="px-5 py-2.5 bg-green-50 border-b border-green-200">
                        <span className="text-xs font-bold text-green-700 uppercase tracking-wider">② Advance Payments</span>
                      </div>
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500">Description</th>
                            <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500">Amount</th>
                            <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500">Paid By</th>
                            <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500">Date</th>
                            <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500">Notes</th>
                            {['Admin','Super Admin','Manager'].includes(user?.role) && (
                              <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500">Actions</th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {pd.advancePayments.length === 0 ? (
                            <tr><td colSpan={6} className="px-5 py-3 text-gray-400 text-xs italic">No advance payments yet</td></tr>
                          ) : pd.advancePayments.map((pmt, i) => {
                            const ptLabel = (pmt.paymentType||'').toLowerCase() === 'check'
                              ? `Advance Payment (Check #${pmt.checkNo||'-'})`
                              : `Advance Payment (${pmt.paymentType||'-'})`;
                            return (
                              <tr key={pmt.advancePaymentId||i} className={`border-b border-gray-50 ${i%2===0?'bg-white':'bg-[#f8fafc]'}`}>
                                <td className="px-5 py-3 text-gray-900 font-medium">{ptLabel}</td>
                                <td className="px-5 py-3 text-gray-900 font-semibold">{fmtLKR(pmt.amount)}</td>
                                <td className="px-5 py-3 text-gray-600">{pmt.recordedByName||pmt.recordedBy||'-'}</td>
                                <td className="px-5 py-3 text-gray-600">{fmtDT(pmt.paymentMadeDate)}</td>
                                <td className="px-5 py-3 text-gray-500 text-xs">{pmt.notes||'-'}</td>
                                {['Admin','Super Admin','Manager'].includes(user?.role) && (
                                  <td className="px-5 py-3">
                                    <button
                                      onClick={() => setEditingAdvancePayment({ advancePaymentId: pmt.advancePaymentId, amount: String(pmt.amount || ''), paymentMadeDate: pmt.paymentMadeDate ? new Date(pmt.paymentMadeDate).toISOString().split('T')[0] : '', paymentType: pmt.paymentType || 'cash', checkNo: pmt.checkNo || '', notes: pmt.notes || '', jobId: viewJobModal.jobId })}
                                      className={`p-1.5 rounded mr-1 transition ${pmt.isLegacy ? 'text-gray-300 cursor-not-allowed' : 'text-blue-600 hover:bg-blue-50'}`}
                                      title={pmt.isLegacy ? 'Legacy records cannot be edited' : 'Edit'}
                                      disabled={pmt.isLegacy}
                                    >
                                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                      </svg>
                                    </button>
                                    <button
                                      onClick={async () => { if (pmt.isLegacy || !pmt.advancePaymentId) return; if (!window.confirm('Are you sure you want to delete this advance payment?')) return; try { await apiClient.delete(`/jobs/${viewJobModal.jobId}/advance-payments/${pmt.advancePaymentId}`); fetchJobs(); fetchJobPayments(viewJobModal.jobId); } catch(err) { console.error('Delete error:', err); } }}
                                      className={`p-1.5 rounded transition ${pmt.isLegacy ? 'text-gray-300 cursor-not-allowed' : 'text-red-500 hover:bg-red-50'}`}
                                      title={pmt.isLegacy ? 'Legacy records cannot be deleted' : 'Delete'}
                                      disabled={pmt.isLegacy}
                                    >
                                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                                        <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                      </svg>
                                    </button>
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="bg-green-50 border-t border-green-200">
                            <td colSpan={['Admin','Super Admin','Manager'].includes(user?.role) ? 5 : 4} className="px-5 py-2.5 text-right text-xs font-bold text-gray-600 uppercase tracking-wide">Total Advance Payments</td>
                            <td className="px-5 py-2.5 text-green-700 font-bold text-sm">{fmtLKR(advanceTotal)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Petty Cash Assignments section */}
                    <div className="border-t border-gray-100">
                      <div className="px-5 py-2.5 bg-purple-50 border-b border-purple-200 flex items-center justify-between">
                        <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">③ Petty Cash Assignments</span>
                        {['Admin','Super Admin','Manager'].includes(user?.role) && (
                          <button
                            onClick={() => setAssignPcModal(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 transition"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                            </svg>
                            Assign Petty Cash
                          </button>
                        )}
                      </div>
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Waff Clerk</th>
                            <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Assigned Amount</th>
                            <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Settled Amount</th>
                            <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Balance / Return</th>
                            <th className="px-5 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase">Status</th>
                            {['Manager','Waff Clerk'].includes(user?.role) && (
                              <th className="px-5 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase">Actions</th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {viewJobModal.assignments && viewJobModal.assignments.length > 0 ? (
                            viewJobModal.assignments.map((a, i) => {
                              const assignedAmount = parseFloat(a.assignedAmount || 0);
                              const settledAmount = parseFloat(a.settledAmount || 0);
                              const balanceAmount = assignedAmount - settledAmount;
                              const isAssigned = a.status === 'Assigned';
                              return (
                                <tr key={a.pettyAssignmentId||i} className={`border-b border-gray-50 ${i%2===0?'bg-white':'bg-[#f8fafc]'}`}>
                                  <td className="px-5 py-3 text-gray-900 font-medium">{a.userName || a.waff_clerk_name || getUserFullName(a.userId)}</td>
                                  <td className="px-5 py-3 text-right text-[#1E3F63] font-bold">{assignedAmount.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
                                  <td className="px-5 py-3 text-right text-gray-600 font-medium">{settledAmount.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
                                  <td className={`px-5 py-3 text-right font-bold ${balanceAmount > 0 ? 'text-orange-600' : balanceAmount < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                                    {balanceAmount.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}
                                  </td>
                                  <td className="px-5 py-3 text-center">
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                                      a.status === 'Assigned' ? 'bg-blue-100 text-blue-800' :
                                      a.status === 'Settled' ? 'bg-green-100 text-green-800' :
                                      a.status === 'Settled / Balance Returned' ? 'bg-green-100 text-green-800' :
                                      a.status === 'Settled / Over Due Collected' ? 'bg-green-100 text-green-800' :
                                      a.status === 'Full Petty Cash Returned' ? 'bg-gray-100 text-gray-800' :
                                      a.status === 'Closed' ? 'bg-gray-100 text-gray-800' :
                                      'bg-yellow-100 text-yellow-800'
                                    }`}>
                                      {a.status || 'Assigned'}
                                    </span>
                                  </td>
                                  {['Manager','Waff Clerk'].includes(user?.role) && (
                                    <td className="px-5 py-3 text-center">
                                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                        {isAssigned && (
                                          <button
                                            onClick={() => handleSettleAssignment(a)}
                                            className="px-2.5 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition"
                                            title="Settle this assignment"
                                          >
                                            Settle
                                          </button>
                                        )}
                                        {a.status === 'Balance To Be Return' && (
                                          <button
                                            onClick={async () => {
                                              try {
                                                await apiClient.post('/cash-balance-settlements', {
                                                  settlementType: 'BALANCE_RETURN',
                                                  amount: Math.abs(balanceAmount),
                                                  notes: `Balance return for Job #${viewJobModal.jobId}`,
                                                  relatedAssignments: [a.pettyAssignmentId]
                                                });
                                                setMessage('✅ Balance return request submitted!');
                                                fetchJobs();
                                                setTimeout(() => setMessage(''), 3000);
                                              } catch (err) {
                                                setMessage(`❌ ${err.response?.data?.message || 'Error submitting balance return'}`);
                                                setTimeout(() => setMessage(''), 5000);
                                              }
                                            }}
                                            className="px-2.5 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-lg transition"
                                            title="Return balance to management"
                                          >
                                            Return Balance
                                          </button>
                                        )}
                                        {a.status === 'Over Due' && (
                                          <button
                                            onClick={async () => {
                                              try {
                                                await apiClient.post('/cash-balance-settlements', {
                                                  settlementType: 'OVERDUE_COLLECTION',
                                                  amount: Math.abs(balanceAmount),
                                                  notes: `Overdue collection for Job #${viewJobModal.jobId}`,
                                                  relatedAssignments: [a.pettyAssignmentId]
                                                });
                                                setMessage('✅ Overdue collection request submitted!');
                                                fetchJobs();
                                                setTimeout(() => setMessage(''), 3000);
                                              } catch (err) {
                                                setMessage(`❌ ${err.response?.data?.message || 'Error submitting overdue request'}`);
                                                setTimeout(() => setMessage(''), 5000);
                                              }
                                            }}
                                            className="px-2.5 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-lg transition"
                                            title="Collect overdue from management"
                                          >
                                            Collect Overdue
                                          </button>
                                        )}
                                        <button
                                          onClick={() => setSettlementItemsModal({pettyAssignmentId: a.pettyAssignmentId, userName: a.userName || getUserFullName(a.userId)})}
                                          className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition"
                                          title="View settlement items"
                                        >
                                          Items
                                        </button>
                                      </div>
                                    </td>
                                  )}
                                </tr>
                              );
                            })
                          ) : (
                            <tr><td colSpan={['Manager','Waff Clerk'].includes(user?.role) ? 6 : 5} className="px-5 py-3 text-gray-400 text-xs italic text-center">No petty cash assignments yet</td></tr>
                          )}
                        </tbody>
                        <tfoot>
                          <tr className="bg-purple-50 border-t-2 border-purple-200">
                            <td className="px-5 py-2.5 text-right text-xs font-bold text-purple-700 uppercase tracking-wide">Total</td>
                            <td className="px-5 py-2.5 text-right text-[#1E3F63] font-bold text-sm">
                              {(viewJobModal.assignments || []).reduce((sum,a)=>sum+parseFloat(a.assignedAmount||0),0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}
                            </td>
                            <td className="px-5 py-2.5 text-right text-gray-600 font-bold text-sm">
                              {(viewJobModal.assignments || []).reduce((sum,a)=>sum+parseFloat(a.settledAmount||0),0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}
                            </td>
                            <td className="px-5 py-2.5 text-right text-orange-600 font-bold text-sm">
                              {((viewJobModal.assignments || []).reduce((sum,a)=>sum+parseFloat(a.assignedAmount||0),0) - (viewJobModal.assignments || []).reduce((sum,a)=>sum+parseFloat(a.settledAmount||0),0)).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}
                            </td>
                            <td></td>
                            {['Manager','Waff Clerk'].includes(user?.role) && <td></td>}
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                );
              })()}



            </div>

            {/* Footer */}
            <div className="flex items-center justify-end px-10 py-5 border-t border-gray-200 bg-gray-50 rounded-b-2xl shrink-0 gap-3">
              <button type="button" onClick={() => setViewJobModal(null)} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 transition">Close</button>
            </div>

          </div>
        </div>
      , document.body)}

      {showModal && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] px-[2.5vw] py-2">
          <div className="bg-white rounded-2xl shadow-2xl flex flex-col" style={{ width: '95vw', height: '97vh' }}>

            {/* Header */}
            <div className="flex items-center justify-between px-10 py-5 rounded-t-2xl shrink-0" style={{ background: 'linear-gradient(135deg,#1E3F63 0%,#2f5e8f 100%)' }}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{isEditing ? 'Edit Job' : 'Create New Job'}</h2>
                  <p className="text-blue-200 text-xs mt-0.5">Super Shine Cargo Service</p>
                </div>
              </div>
              <button onClick={() => { setShowModal(false); setIsEditing(false); setSelectedJob(null); setSelectedUsers([]); setShowUserDropdown(false); setFormStep(1); setPcAssignments([]); setPcFormRow({ userId:'', amount:'' }); }} className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Step indicator */}
            {!isEditing && (
              <div className="flex items-center px-10 py-4 bg-gray-50 border-b border-gray-200 shrink-0">
                {[{n:1,label:'Job Details'},{n:2,label:'Petty Cash'}].map((s,i) => (
                  <React.Fragment key={s.n}>
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${formStep>s.n?'bg-[#15803d] border-[#15803d] text-white':formStep===s.n?'bg-[#1E3F63] border-[#1E3F63] text-white':'bg-white border-gray-300 text-gray-400'}`}>
                        {formStep>s.n?<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M20 6 9 17l-5-5"/></svg>:s.n}
                      </div>
                      <span className={`text-sm font-semibold ${formStep===s.n?'text-[#1E3F63]':formStep>s.n?'text-[#15803d]':'text-gray-400'}`}>{s.label}</span>
                    </div>
                    {i<1&&<div className={`flex-1 h-0.5 mx-4 rounded ${formStep>s.n?'bg-[#15803d]':'bg-gray-200'}`}/>}
                  </React.Fragment>
                ))}
              </div>
            )}

            {/* Body */}
            <div className="flex-1 min-h-0 overflow-y-auto px-14 py-9">
              {message && <div className={`mb-6 p-3 rounded-lg text-sm border-l-4 ${message.includes('Error')||message.includes('Please')?'bg-red-50 border-red-500 text-red-700':'bg-green-50 border-green-500 text-green-700'}`}>{message}</div>}
              {(() => {
                const inp = "w-full px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-[#1E3F63] focus:ring-2 focus:ring-[#1E3F63]/20 transition bg-white";
                const lbl = "block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2";
                const req = <span className="text-red-500 ml-0.5">*</span>;
                const SectionTitle = ({color, title}) => (
                  <div className="flex items-center gap-2.5 mb-7">
                    <div className="w-1 h-6 rounded-full" style={{background:color}}/>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-[#1E3F63]">{title}</h3>
                  </div>
                );

                if (isEditing || formStep === 1) return (
                  <div>
                    <SectionTitle color="#1E3F63" title="Basic Information" />
                    <div className="grid grid-cols-3 gap-10 mb-10">
                      <div>
                        <label className={lbl}>Customer {req}</label>
                        <select name="customerId" value={formData.customerId} onChange={handleChange} required disabled={isEditing} className={inp}>
                          <option value="">Select Customer</option>
                          {customers.map(c=><option key={c.customerId} value={c.customerId}>{c.customerId} — {c.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={lbl}>Open Date {req}</label>
                        <input type="date" name="openDate" value={formData.openDate} onChange={handleChange} required className={inp}/>
                      </div>
                      <div>
                        <label className={lbl}>Assign To Users</label>
                        <div className="relative multi-select-dropdown">
                          <button type="button" onClick={toggleUserDropdown} className={`${inp} flex items-center justify-between text-left`}>
                            <span className={selectedUsers.length===0?'text-gray-400':'text-gray-800'}>{getSelectedUserNames()}</span>
                            <svg className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${showUserDropdown?'rotate-180':''}`} viewBox="0 0 12 12" fill="none"><path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </button>
                          {showUserDropdown && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-52 overflow-y-auto">
                              {users.length===0?<div className="px-4 py-3 text-gray-400 text-sm">No users available</div>:users.map(u=>(
                                <label key={u.userId} className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#eef3f8] cursor-pointer transition">
                                  <input type="checkbox" checked={selectedUsers.includes(u.userId)} onChange={e=>handleUserSelection(u.userId,e.target.checked)} className="accent-[#1E3F63] w-4 h-4 cursor-pointer"/>
                                  <span className="text-sm text-gray-700">{u.fullName}</span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                        {selectedUsers.length>0&&(
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {selectedUsers.map(uid=>{const u=users.find(x=>x.userId===uid);return u?(<span key={uid} className="inline-flex items-center gap-1 bg-[#eef3f8] text-[#1E3F63] text-xs font-semibold px-2.5 py-1 rounded-full border border-[#c8d8e8]">{u.fullName}<button type="button" onClick={()=>handleUserSelection(uid,false)} className="ml-0.5 text-[#1E3F63]/60 hover:text-[#1E3F63]"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></span>):null;})}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="border-t border-gray-100 mb-10"/>

                    <SectionTitle color="#2f5e8f" title="Shipment Details" />
                    <div className="grid grid-cols-3 gap-10">
                      <div>
                        <label className={lbl}>Shipment Category {req}</label>
                        <select name="shipmentCategory" value={formData.shipmentCategory} onChange={handleChange} required className={inp}>
                          <option value="">Select Category</option>
                          <option value="LCL">LCL — Loose Cargo Load</option>
                          <option value="FCL">FCL — Full Container Load</option>
                          <option value="Air Freight">Air Freight</option>
                          <option value="BOI">BOI — Board of Investment</option>
                          <option value="Vehicle - Personal">Vehicle — Personal</option>
                          <option value="Vehicle - Company">Vehicle — Company</option>
                          <option value="TIEP">TIEP — Temp Importation</option>
                          {formData.shipmentCategory&&!['LCL','FCL','Air Freight','BOI','Vehicle - Personal','Vehicle - Company','TIEP'].includes(formData.shipmentCategory)&&<option value={formData.shipmentCategory}>{formData.shipmentCategory}</option>}
                        </select>
                      </div>
                      <div><label className={lbl}>BL Number</label><input type="text" name="blNumber" value={formData.blNumber} onChange={handleChange} placeholder="Bill of Lading Number" className={inp}/></div>
                      <div><label className={lbl}>CUSDEC Number</label><input type="text" name="cusdecNumber" value={formData.cusdecNumber} onChange={handleChange} placeholder="Customs Declaration Number" className={inp}/></div>
                      <div><label className={lbl}>CUSDEC Date</label><input type="date" name="cusdecDate" value={formData.cusdecDate} onChange={handleChange} className={inp}/></div>
                      <div><label className={lbl}>TT / LC / DA / DP / NFE No.</label><input type="text" name="lcNumber" value={formData.lcNumber} onChange={handleChange} placeholder="Finance reference number" className={inp}/></div>
                      {!(formData.shipmentCategory==='Vehicle - Personal'||formData.shipmentCategory==='Vehicle - Company')
                        ?<div><label className={lbl}>Container Number</label><input type="text" name="containerNumber" value={formData.containerNumber} onChange={handleChange} placeholder="Container Number" className={inp}/></div>
                        :<div><label className={lbl}>Chassis Number</label><input type="text" name="chassisNumber" value={formData.chassisNumber} onChange={handleChange} placeholder="Vehicle chassis number" className={inp}/></div>}
                      <div><label className={lbl}>Exporter</label><input type="text" name="exporter" value={formData.exporter} onChange={handleChange} placeholder="Exporter company / name" className={inp}/></div>
                      <div><label className={lbl}>Transporter</label>
                        <select name="transporter" value={formData.transporter} onChange={handleChange} className={inp}>
                          <option value="">Select Transporter</option>
                          {transporters.map(t=><option key={t.transporterId} value={t.name}>{t.name}</option>)}
                          {formData.transporter&&!transporters.some(t=>t.name===formData.transporter)&&<option value={formData.transporter}>{formData.transporter}</option>}
                        </select>
                      </div>
                      <div><label className={lbl}>Transport Delivery Date</label><input type="date" name="transportDeliveryDate" value={formData.transportDeliveryDate} onChange={handleChange} className={inp}/></div>
                    </div>
                  </div>
                );

                if (formStep === 2) return (
                  <div>
                    <div className="flex items-start justify-between mb-7">
                      <div>
                        <div className="flex items-center gap-2.5 mb-1">
                          <div className="w-1 h-6 rounded-full bg-[#0f766e]"/>
                          <h3 className="text-sm font-bold uppercase tracking-widest text-[#1E3F63]">Petty Cash Assignment</h3>
                        </div>
                        <p className="text-sm text-gray-500 ml-4">Optional — assign petty cash to staff now or skip and do it later.</p>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">Optional</span>
                    </div>
                    {['Admin','Super Admin','Manager'].includes(user?.role) && (
                      <div className="bg-[#f8fafc] border border-gray-200 rounded-xl p-7 mb-7">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-5">Add Assignment</p>
                        <div className="grid grid-cols-3 gap-10 items-end">
                          <div>
                            <label className={lbl}>Assign To</label>
                            <select value={pcFormRow.userId} onChange={e=>setPcFormRow(r=>({...r,userId:e.target.value}))} className={inp}>
                              <option value="">Select Staff Member</option>
                              {users.filter(u => u.role === 'Waff Clerk' && selectedUsers.includes(u.userId)).map(u=><option key={u.userId} value={u.userId}>{u.fullName} ({u.role})</option>)}
                            </select>
                          </div>
                          <div>
                            <label className={lbl}>Amount (LKR)</label>
                            <input type="number" min="0" step="0.01" placeholder="0.00" value={pcFormRow.amount} onChange={e=>setPcFormRow(r=>({...r,amount:e.target.value}))} className={inp}/>
                          </div>
                          <div>
                            <button type="button" onClick={()=>{if(!pcFormRow.userId||!pcFormRow.amount||parseFloat(pcFormRow.amount)<=0)return;setPcAssignments(a=>[...a,{userId:pcFormRow.userId,amount:pcFormRow.amount,userName:users.find(u=>u.userId===pcFormRow.userId)?.fullName||pcFormRow.userId}]);setPcFormRow({userId:'',amount:''});}} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-white bg-[#1E3F63] hover:bg-[#193552] transition">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Add
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    {pcAssignments.length>0?(
                      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                        <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
                          <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Assigned Staff</span>
                        </div>
                        <table className="w-full text-sm">
                          <thead><tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Waff Clerk Name</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Assigned Amount</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Settled Amount</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Balance / Return</th>
                            <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Actions</th>
                          </tr></thead>
                          <tbody>
                            {pcAssignments.map((a,i)=>{
                              const assignedAmount = parseFloat(a.amount || 0);
                              const settledAmount = 0; // Will be updated after job creation
                              const balanceAmount = assignedAmount - settledAmount;
                              return (
                                <tr key={i} className={`border-b border-gray-50 ${i%2===0?'bg-white':'bg-[#f8fafc]'}`}>
                                  <td className="px-6 py-3 text-gray-900 font-medium">{a.userName}</td>
                                  <td className="px-6 py-3 text-right text-[#1E3F63] font-bold">{assignedAmount.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
                                  <td className="px-6 py-3 text-right text-gray-600 font-medium">{settledAmount.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
                                  <td className={`px-6 py-3 text-right font-bold ${balanceAmount > 0 ? 'text-orange-600' : balanceAmount < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                                    {balanceAmount.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}
                                  </td>
                                  <td className="px-6 py-3 text-center"><button type="button" onClick={()=>setPcAssignments(arr=>arr.filter((_,j)=>j!==i))} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                                      <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                    </svg>
                                    Remove
                                  </button></td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot>
                            <tr className="bg-[#f0f4f8] border-t-2 border-gray-300">
                              <td className="px-6 py-3 text-right font-bold text-gray-600 uppercase text-xs tracking-wide">Total</td>
                              <td className="px-6 py-3 text-right text-[#1E3F63] font-bold text-sm">{pcAssignments.reduce((sum,a)=>sum+parseFloat(a.amount||0),0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
                              <td className="px-6 py-3 text-right text-gray-600 font-bold text-sm">0.00</td>
                              <td className="px-6 py-3 text-right text-orange-600 font-bold text-sm">{pcAssignments.reduce((sum,a)=>sum+parseFloat(a.amount||0),0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
                              <td/>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    ):(
                      <div className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-12 h-12 text-gray-300 mx-auto mb-3"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                        <p className="text-sm text-gray-500">No assignments yet. Add one above or skip to create the job.</p>
                      </div>
                    )}
                  </div>
                );

                return null;
              })()}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-10 py-5 border-t border-gray-200 bg-gray-50 rounded-b-2xl shrink-0">
              {!isEditing?<span className="text-xs text-gray-400">Step {formStep} of 2</span>:<span/>}
              <div className="flex items-center gap-3">
                <button type="button" onClick={()=>{setShowModal(false);setIsEditing(false);setSelectedJob(null);setSelectedUsers([]);setShowUserDropdown(false);setFormStep(1);setPcAssignments([]);setPcFormRow({userId:'',amount:''}); }} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 transition">Cancel</button>
                {!isEditing&&formStep===2&&<button type="button" onClick={()=>setFormStep(1)} className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-[#1E3F63] bg-[#eef3f8] hover:bg-[#dce8f4] border border-[#c8d8e8] transition"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><polyline points="15 18 9 12 15 6"/></svg>Back</button>}
                {!isEditing&&formStep===2&&<button type="button" onClick={handleSubmit} className="px-4 py-2.5 rounded-lg text-sm font-semibold text-[#0f766e] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition">Skip &amp; Create Job</button>}
                {!isEditing&&formStep===1&&<button type="button" onClick={()=>{if(!formData.customerId){setMessage('Please select a customer.');setTimeout(()=>setMessage(''),3000);return;}if(!formData.openDate){setMessage('Please select an open date.');setTimeout(()=>setMessage(''),3000);return;}if(!formData.shipmentCategory){setMessage('Please select a shipment category.');setTimeout(()=>setMessage(''),3000);return;}setFormStep(2);}} className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#1E3F63] hover:bg-[#193552] transition shadow-sm">Next<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><polyline points="9 18 15 12 9 6"/></svg></button>}
                {(isEditing||formStep===2)&&<button type="button" onClick={isEditing?handleUpdate:handleSubmit} className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold text-white bg-[#1E3F63] hover:bg-[#193552] transition shadow-sm"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M20 6 9 17l-5-5"/></svg>{isEditing?'Save Changes':'Create Job'}</button>}
              </div>
            </div>

          </div>
        </div>
      , document.body)}

      {/* Job Invoicing Modal - Rendered outside ViewJobModal portal */}
      {invoicingModalJob && (
        <JobInvoicingModal
          job={invoicingModalJob}
          isOpen={true}
          onClose={() => {
            setInvoicingModalJob(null);
            // Refresh jobs after invoicing operations
            fetchJobs();
            fetchInvoicedJobs(); // Refresh the invoiced jobs list
          }}
          onInvoiceCreated={(newBill) => {
            console.log('Invoice created:', newBill);
            fetchJobs();
            fetchInvoicedJobs(); // Refresh the invoiced jobs list
            fetchJobPayments(invoicingModalJob.jobId);
          }}
        />
      )}
    </div>
  );
}

export default Jobs;
