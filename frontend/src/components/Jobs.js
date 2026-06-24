import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { jobService } from '../api/services/jobService';
import { customerService } from '../api/services/customerService';
import { authService } from '../api/services/authService';
import { transporterService } from '../api/services/transporterService';
import apiClient from '../api/client';
import OfficePayItems from './OfficePayItems';
import AdvancePayment from './AdvancePayment';
import JobPettyCash from './JobPettyCash';
import Pagination from './Pagination';

function Jobs() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [users, setUsers] = useState([]);
  const [transporters, setTransporters] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);
  const [jobPayments, setJobPayments] = useState({});
  const [officePayModal, setOfficePayModal] = useState(null);
  const [advancePayModal, setAdvancePayModal] = useState(null);
  const [formStep, setFormStep] = useState(1); // 1 = Job Details, 2 = Petty Cash
  // Petty cash assignments to create after job is saved (optional, array of {userId, amount})
  const [pcAssignments, setPcAssignments] = useState([]);
  const [pcFormRow, setPcFormRow] = useState({ userId: '', amount: '' });
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

  useEffect(() => {
    fetchJobs();
    fetchCustomers(); // All users need to see customer names
    fetchTransporters();
    if (user?.role === 'Admin' || user?.role === 'Super Admin' || user?.role === 'Manager' || user?.role === 'Office Executive') {
      fetchUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

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
      const data = await jobService.getAll();
      console.log('Fetched jobs data:', data);
      console.log('First job details:', JSON.stringify(data[0], null, 2));
      console.log('First job billTotalAmount:', data[0]?.billTotalAmount);
      console.log('First job billPaidAmount:', data[0]?.billPaidAmount);
      // Ensure all jobs have a status
      const jobsWithStatus = data.map(job => ({
        ...job,
        status: job.status || 'Open',
        // Map assignedUsers to assignments for consistency
        assignments: job.assignedUsers || []
      }));
      console.log('Jobs with status:', jobsWithStatus);
      console.log('First job after mapping:', JSON.stringify(jobsWithStatus[0], null, 2));
      setJobs(jobsWithStatus);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
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
    if (job.assignments && job.assignments.length > 0) {
      setSelectedUsers(job.assignments.map(a => a.userId));
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
    setExpandedRow(null);
  };

  const handleRecordsPerPageChange = (newRecordsPerPage) => {
    setRecordsPerPage(newRecordsPerPage);
    setCurrentPage(1);
    setExpandedRow(null);
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
                <React.Fragment key={job.jobId}>
                  <tr className="hover:bg-gray-50 transition">
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
                          {job.assignments && job.assignments.length > 0 ? (
                            <>
                              {job.assignments.slice(0, 2).map((assignment, index) => (
                                <span key={assignment.userId || index} className="inline-block bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded">
                                  {assignment.userName || getUserFullName(assignment.userId)}
                                </span>
                              ))}
                              {job.assignments.length > 2 && (
                                <span className="inline-block bg-gray-200 text-gray-800 text-xs font-semibold px-2 py-1 rounded">
                                  +{job.assignments.length - 2} more
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
                        )}
                        <button
                          onClick={() => {
                            const next = expandedRow === job.jobId ? null : job.jobId;
                            setExpandedRow(next);
                            if (next) fetchJobPayments(next);
                          }}
                          title={expandedRow === job.jobId ? 'Hide Details' : 'View Details'}
                          className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 transition"
                        >
                          {expandedRow === job.jobId ? (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                              <line x1="1" y1="1" x2="23" y2="23"/>
                            </svg>
                          ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                              <circle cx="12" cy="12" r="3"/>
                            </svg>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedRow === job.jobId && (
                    <tr>
                      <td colSpan={user?.role !== 'Waff Clerk' ? 7 : 6} className="p-0 border-b border-gray-200">
                        <div className="bg-[#f8fafc] px-6 py-5">

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
                                    ['Job ID',        job.jobId],
                                    ['Customer',      getCustomerName(job.customerId)],
                                    ['Customer ID',   job.customerId],
                                    ['Category',      job.shipmentCategory || '-'],
                                    ['Status',        null],
                                    ['Assigned To',   null],
                                    ['Created Date',  job.createdDate ? new Date(job.createdDate).toLocaleDateString() : '-'],
                                  ].map(([label, val], i) => (
                                    <tr key={label} className={i % 2 === 0 ? 'bg-white' : 'bg-[#f8fafc]'}>
                                      <td className="px-4 py-3 w-40 text-gray-500 font-medium whitespace-nowrap border-b border-r border-gray-100">{label}</td>
                                      <td className="px-4 py-3 text-gray-900 font-semibold border-b border-gray-100">
                                        {label === 'Status' ? (
                                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                            job.status === 'Open'              ? 'bg-yellow-100 text-yellow-800' :
                                            job.status === 'In Progress'       ? 'bg-blue-100 text-blue-800' :
                                            job.status === 'Pending Payment'   ? 'bg-orange-100 text-orange-800' :
                                            job.status === 'Payment Collected' ? 'bg-green-100 text-green-800' :
                                            job.status === 'Overdue'           ? 'bg-red-100 text-red-800' :
                                            job.status === 'Completed'         ? 'bg-gray-100 text-gray-700' :
                                            'bg-red-100 text-red-800'
                                          }`}>{job.status || 'Open'}</span>
                                        ) : label === 'Assigned To' ? (
                                          job.assignments && job.assignments.length > 0
                                            ? <div className="flex flex-wrap gap-1.5">
                                                {job.assignments.map((a, idx) => (
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
                                    ['BL Number',           job.blNumber || '-'],
                                    ['CUSDEC Number',       formatCusdecWithDate(job.cusdecNumber, job.cusdecDate)],
                                    ['Open Date',           job.openDate ? new Date(job.openDate).toLocaleDateString() : '-'],
                                    ['LC/TT/DP/DA/NFE No.', job.lcNumber || '-'],
                                    ...( !(job.shipmentCategory === 'Vehicle - Personal' || job.shipmentCategory === 'Vehicle - Company')
                                          ? [['Container Number', job.containerNumber || '-']] : [] ),
                                    ...( (job.shipmentCategory === 'Vehicle - Personal' || job.shipmentCategory === 'Vehicle - Company' || job.chassisNumber)
                                          ? [['Chassis Number', job.chassisNumber || '-']] : [] ),
                                    ['Exporter',            job.exporter || '-'],
                                    ['Transporter',         job.transporter || '-'],
                                    ['Transport Delivery',  job.transportDeliveryDate ? new Date(job.transportDeliveryDate).toLocaleDateString() : '-'],
                                  ].map(([label, val], i) => (
                                    <tr key={label} className={i % 2 === 0 ? 'bg-white' : 'bg-[#f8fafc]'}>
                                      <td className="px-4 py-3 w-44 text-gray-500 font-medium whitespace-nowrap border-b border-r border-gray-100">{label}</td>
                                      <td className="px-4 py-3 text-gray-900 font-semibold border-b border-gray-100">{val}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Payment Details card removed — see full-width section below */}
                          </div>

                          {/* ── Full-width Payment Details section ── */}
                          {(() => {
                            const pd = jobPayments[job.jobId] || { officeItems: [], advancePayments: [] };
                            const fmtLKR = (n) => 'LKR ' + parseFloat(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
                            const fmtDT  = (d) => { if (!d) return '-'; const p = new Date(d); return Number.isNaN(p.getTime()) ? String(d) : p.toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}); };
                            const officeTotal   = pd.officeItems.reduce((s,i) => s + parseFloat(i.actualCost||0), 0);
                            const advanceTotal  = pd.advancePayments.reduce((s,p) => s + parseFloat(p.amount||0), 0);
                            return (                              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-5">
                                {/* Header */}
                                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
                                  <div className="flex items-center gap-2">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="#1E3F63" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0">
                                      <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                                    </svg>
                                    <span className="text-xs font-bold text-[#1E3F63] uppercase tracking-wider">Payment Details</span>
                                  </div>
                                  {/* Add buttons in header */}
                                  {['Admin','Super Admin','Manager','Office Executive'].includes(user?.role) && (
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => setOfficePayModal(job.jobId)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#1E3F63] hover:bg-[#193552] transition"
                                        title="Add office payment"
                                      >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                                          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                                        </svg>
                                        Office Payment
                                      </button>
                                      <button
                                        onClick={() => setAdvancePayModal(job)}
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
                                  <div className="px-5 py-2.5 bg-[#eef3f8] border-b border-[#c8d8e8]">
                                    <span className="text-xs font-bold text-[#1E3F63] uppercase tracking-wider">Office Pay Items</span>
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
                                                onClick={() => { const el = document.getElementById(`officepay-edit-btn-${item.officePayItemId}`); if (el) el.click(); }}
                                                className="p-1.5 rounded text-blue-600 hover:bg-blue-50 transition mr-1" title="Edit"
                                              >
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                                </svg>
                                              </button>
                                              <button
                                                onClick={() => { const el = document.getElementById(`officepay-del-btn-${item.officePayItemId}`); if (el) el.click(); }}
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
                                      <tr className="bg-[#f0f4f8]">
                                        <td colSpan={['Admin','Super Admin','Manager','Office Executive'].includes(user?.role) ? 4 : 3} className="px-5 py-2.5 text-right text-xs font-bold text-gray-600 uppercase tracking-wide">Total Office Payments</td>
                                        <td className="px-5 py-2.5 text-[#1E3F63] font-bold text-sm">{fmtLKR(officeTotal)}</td>
                                      </tr>
                                    </tfoot>
                                  </table>
                                </div>

                                {/* Advance Payments sub-table */}
                                <div>
                                  <div className="px-5 py-2.5 bg-[#f0fdf4] border-b border-[#bbf7d0]">
                                    <span className="text-xs font-bold text-[#15803d] uppercase tracking-wider">Advance Payments</span>
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
                                                  onClick={() => { const el = document.getElementById(`advpay-edit-btn-${pmt.advancePaymentId}`); if (el) el.click(); }}
                                                  className={`p-1.5 rounded mr-1 transition ${pmt.isLegacy ? 'text-gray-300 cursor-not-allowed' : 'text-blue-600 hover:bg-blue-50'}`}
                                                  title={pmt.isLegacy ? 'Legacy records cannot be edited' : 'Edit'}
                                                  disabled={pmt.isLegacy}
                                                >
                                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                                  </svg>
                                                </button>
                                                <button
                                                  onClick={() => { const el = document.getElementById(`advpay-del-btn-${pmt.advancePaymentId}`); if (el) el.click(); }}
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
                                      <tr className="bg-[#f0f4f8]">
                                        <td colSpan={['Admin','Super Admin','Manager'].includes(user?.role) ? 5 : 4} className="px-5 py-2.5 text-right text-xs font-bold text-gray-600 uppercase tracking-wide">Total Advance Payments</td>
                                        <td className="px-5 py-2.5 text-[#15803d] font-bold text-sm">{fmtLKR(advanceTotal)}</td>
                                      </tr>
                                    </tfoot>
                                  </table>
                                </div>

                                {/* Modal components rendered at the end of the payment card — controlled by lifted state */}
                                {officePayModal === job.jobId && (
                                  <OfficePayItems
                                    jobId={job.jobId}
                                    onUpdate={() => { fetchJobs(); fetchJobPayments(job.jobId); setOfficePayModal(null); }}
                                    forceOpen
                                  />
                                )}
                                {advancePayModal?.jobId === job.jobId && (
                                  <AdvancePayment
                                    job={advancePayModal}
                                    onUpdate={() => { fetchJobs(); fetchJobPayments(job.jobId); setAdvancePayModal(null); }}
                                    forceOpen
                                  />
                                )}
                              </div>
                            );
                          })()}

                          {/* Petty Cash section */}
                          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                            <JobPettyCash job={job} users={users} onUpdate={fetchJobs} />
                          </div>

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

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-4xl w-full my-8">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white rounded-t-xl z-10">
              <h2 className="text-2xl font-bold text-gray-900">{isEditing ? 'Edit Job' : 'Create New Job'}</h2>
              <button onClick={() => { setShowModal(false); setIsEditing(false); setSelectedJob(null); setSelectedUsers([]); setShowUserDropdown(false); setFormStep(1); setPcAssignments([]); setPcFormRow({ userId:'', amount:'' }); }} className="text-gray-500 hover:text-gray-700 text-2xl font-bold">×</button>
            </div>

            {/* ── Step indicator ── */}
            {!isEditing && (
              <div className="flex items-center gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200">
                {[{n:1,label:'Job Details'},{n:2,label:'Petty Cash'}].map((s,i) => (
                  <React.Fragment key={s.n}>
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${formStep>s.n?'bg-green-600 text-white':formStep===s.n?'bg-blue-600 text-white':'bg-gray-200 text-gray-500'}`}>
                        {formStep>s.n?'✓':s.n}
                      </div>
                      <span className={`text-sm font-medium ${formStep===s.n?'text-gray-900':formStep>s.n?'text-green-600':'text-gray-400'}`}>{s.label}</span>
                    </div>
                    {i<1&&<div className={`flex-1 h-0.5 rounded ${formStep>s.n?'bg-green-600':'bg-gray-200'}`}/>}
                  </React.Fragment>
                ))}
              </div>
            )}

            <form onSubmit={isEditing ? handleUpdate : handleSubmit} className="p-6 space-y-6 max-h-96 overflow-y-auto">
              {message && (
                <div className={`p-3 rounded-lg text-sm border-l-4 ${message.includes('Error')||message.includes('Please')?'bg-red-50 border-red-500 text-red-700':'bg-green-50 border-green-500 text-green-700'}`}>{message}</div>
              )}
              {(() => {
                /* ── STEP 1: Job Details (Basic + Shipment combined) ── */
                if (isEditing || formStep === 1) return (
                  <>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Customer <span className="text-red-600">*</span></label>
                          <select name="customerId" value={formData.customerId} onChange={handleChange} required disabled={isEditing} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
                            <option value="">Select Customer</option>
                            {customers.map(c=><option key={c.customerId} value={c.customerId}>{c.customerId} — {c.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Open Date <span className="text-red-600">*</span></label>
                          <input type="date" name="openDate" value={formData.openDate} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"/>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Assign To Users</label>
                          <div className="relative multi-select-dropdown">
                            <button type="button" onClick={toggleUserDropdown} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none flex items-center justify-between text-left">
                              <span className={selectedUsers.length===0?'text-gray-400':'text-gray-800'}>{getSelectedUserNames()}</span>
                              <svg className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${showUserDropdown?'rotate-180':''}`} viewBox="0 0 12 12" fill="none"><path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </button>
                            {showUserDropdown && (
                              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-52 overflow-y-auto">
                                {users.length===0?<div className="px-4 py-3 text-gray-400 text-sm">No users available</div>:users.map(u=>(
                                  <label key={u.userId} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer transition">
                                    <input type="checkbox" checked={selectedUsers.includes(u.userId)} onChange={e=>handleUserSelection(u.userId,e.target.checked)} className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"/>
                                    <span className="text-sm text-gray-700">{u.fullName}</span>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                          {selectedUsers.length>0&&(
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {selectedUsers.map(uid=>{const u=users.find(x=>x.userId===uid);return u?(<span key={uid} className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-1 rounded-full">{u.fullName}<button type="button" onClick={()=>handleUserSelection(uid,false)} className="text-blue-600 hover:text-blue-800 ml-0.5">×</button></span>):null;})}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Shipment Details</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Shipment Category <span className="text-red-600">*</span></label>
                          <select name="shipmentCategory" value={formData.shipmentCategory} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
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
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">BL Number</label>
                          <input type="text" name="blNumber" value={formData.blNumber} onChange={handleChange} placeholder="Bill of Lading Number" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"/>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">CUSDEC Number</label>
                          <input type="text" name="cusdecNumber" value={formData.cusdecNumber} onChange={handleChange} placeholder="Customs Declaration Number" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"/>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">CUSDEC Date</label>
                          <input type="date" name="cusdecDate" value={formData.cusdecDate} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"/>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">TT / LC / DA / DP / NFE No.</label>
                          <input type="text" name="lcNumber" value={formData.lcNumber} onChange={handleChange} placeholder="Finance reference number" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"/>
                        </div>
                        {!(formData.shipmentCategory==='Vehicle - Personal'||formData.shipmentCategory==='Vehicle - Company')
                          ? <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Container Number</label>
                              <input type="text" name="containerNumber" value={formData.containerNumber} onChange={handleChange} placeholder="Container Number" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"/>
                            </div>
                          : <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Chassis Number</label>
                              <input type="text" name="chassisNumber" value={formData.chassisNumber} onChange={handleChange} placeholder="Vehicle chassis number" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"/>
                            </div>
                        }
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Exporter</label>
                          <input type="text" name="exporter" value={formData.exporter} onChange={handleChange} placeholder="Exporter company / name" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"/>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Transporter</label>
                          <select name="transporter" value={formData.transporter} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
                            <option value="">Select Transporter</option>
                            {transporters.map(t=><option key={t.transporterId} value={t.name}>{t.name}</option>)}
                            {formData.transporter&&!transporters.some(t=>t.name===formData.transporter)&&<option value={formData.transporter}>{formData.transporter}</option>}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Transport Delivery Date</label>
                          <input type="date" name="transportDeliveryDate" value={formData.transportDeliveryDate} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"/>
                        </div>
                      </div>
                    </div>
                  </>
                );

                /* ── STEP 2: Petty Cash (optional) ── */
                if (formStep === 2) return (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Petty Cash Assignment</h3>
                    <p className="text-sm text-gray-500 mb-4">Optional — assign petty cash to staff now or skip and do it later.</p>

                    {/* Add assignment row */}
                    {['Admin','Super Admin','Manager'].includes(user?.role) && (
                      <div className="p-4 border border-gray-300 rounded-lg mb-4">
                        <h4 className="font-medium text-gray-900 mb-3">Add Assignment</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
                            <select value={pcFormRow.userId} onChange={e=>setPcFormRow(r=>({...r,userId:e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
                              <option value="">Select Staff Member</option>
                              {users.filter(u => selectedUsers.includes(u.userId)).map(u=><option key={u.userId} value={u.userId}>{u.fullName} ({u.role})</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (LKR)</label>
                            <input type="number" min="0" step="0.01" placeholder="0.00" value={pcFormRow.amount} onChange={e=>setPcFormRow(r=>({...r,amount:e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"/>
                          </div>
                          <div className="flex items-end">
                            <button
                              type="button"
                              onClick={() => {
                                if (!pcFormRow.userId || !pcFormRow.amount || parseFloat(pcFormRow.amount)<=0) return;
                                setPcAssignments(a=>[...a,{userId:pcFormRow.userId,amount:pcFormRow.amount,userName:users.find(u=>u.userId===pcFormRow.userId)?.fullName||pcFormRow.userId}]);
                                setPcFormRow({userId:'',amount:''});
                              }}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium text-sm"
                            >
                              + Add
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Assignments list */}
                    {pcAssignments.length > 0 ? (
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Staff Member</th>
                              <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Amount</th>
                              <th className="px-4 py-2 text-sm font-semibold text-gray-700">Remove</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {pcAssignments.map((a,i)=>(
                              <tr key={i} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-gray-900 font-medium">{a.userName}</td>
                                <td className="px-4 py-3 text-gray-900">LKR {parseFloat(a.amount).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
                                <td className="px-4 py-3 text-center">
                                  <button type="button" onClick={()=>setPcAssignments(arr=>arr.filter((_,j)=>j!==i))} className="text-red-600 hover:text-red-700 text-sm font-medium">Remove</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-gray-50 border-t border-gray-200">
                              <td className="px-4 py-2 text-right text-sm font-bold text-gray-700">Total</td>
                              <td className="px-4 py-2 text-sm font-bold text-gray-900">LKR {pcAssignments.reduce((s,a)=>s+parseFloat(a.amount||0),0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
                              <td/>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    ) : (
                      <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-lg">
                        <p className="text-gray-500 text-sm">No petty cash assignments added yet.</p>
                        <p className="text-gray-400 text-xs mt-1">You can skip this step and add assignments later.</p>
                      </div>
                    )}
                  </div>
                );

                return null;
              })()}
            </form>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              {!isEditing && formStep === 2 && (
                <button type="button" onClick={()=>setFormStep(1)} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition font-medium">Back</button>
              )}
              <button type="button" onClick={()=>{setShowModal(false);setIsEditing(false);setSelectedJob(null);setSelectedUsers([]);setShowUserDropdown(false);setFormStep(1);setPcAssignments([]);setPcFormRow({userId:'',amount:''}); }} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition font-medium">Cancel</button>
              {!isEditing && formStep === 1 && (
                <button type="button" onClick={()=>{if(!formData.customerId){setMessage('Please select a customer.');setTimeout(()=>setMessage(''),3000);return;}if(!formData.openDate){setMessage('Please select an open date.');setTimeout(()=>setMessage(''),3000);return;}if(!formData.shipmentCategory){setMessage('Please select a shipment category.');setTimeout(()=>setMessage(''),3000);return;}setFormStep(2);}} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium">Next</button>
              )}
              {!isEditing && formStep === 2 && (
                <button type="button" onClick={handleSubmit} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium">Create Job</button>
              )}
              {isEditing && (
                <button type="button" onClick={handleUpdate} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium">Update</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Jobs;
