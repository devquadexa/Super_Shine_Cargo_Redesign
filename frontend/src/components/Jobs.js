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
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">All Jobs ({filteredJobs.length})</h2>
          <div className="relative flex-1 ml-4">
            <svg className="absolute left-3 top-3 text-gray-400" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input
              type="text"
              placeholder="Search by Job ID, Customer, Category, Assigned User, or Date..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none w-full"
            />
          </div>
        </div>
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-4">
            <label htmlFor="statusFilter" className="text-sm font-medium text-gray-700">Filter by Status:</label>
            <select
              id="statusFilter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
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
            {(statusFilter !== 'All' || searchTerm) && (
              <button
                onClick={() => {
                  setStatusFilter('All');
                  setSearchTerm('');
                }}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition text-sm font-medium"
                title="Clear all filters"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
        {filteredJobs.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-4">📦</div>
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
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Total Amount</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Paid Amount</th>
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
                      {job.billTotalAmount !== null && job.billTotalAmount !== undefined ? (
                        <span className="font-medium text-gray-900">LKR {parseFloat(job.billTotalAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {job.billTotalAmount !== null && job.billTotalAmount !== undefined ? (
                        <span className="font-medium text-gray-900">LKR {parseFloat(job.billPaidAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
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
                    <td className="px-6 py-4 text-sm flex gap-2">
                      {(user?.role === 'Admin' || user?.role === 'Super Admin' || user?.role === 'Manager' || user?.role === 'Office Executive') && (
                        <button
                          className="px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded transition text-xs font-medium"
                          onClick={() => openEditModal(job)}
                          title="Edit Job"
                        >
                          Edit
                        </button>
                      )}
                      <button
                        className="px-3 py-1 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded transition text-xs font-medium"
                        onClick={() => setExpandedRow(expandedRow === job.jobId ? null : job.jobId)}
                        title="View Details"
                      >
                        {expandedRow === job.jobId ? 'Hide' : 'View'}
                      </button>
                    </td>
                  </tr>
                  {expandedRow === job.jobId && (
                    <tr className="bg-gray-50">
                      <td colSpan={user?.role !== 'Waff Clerk' ? 9 : 8} className="px-6 py-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-3">Basic Information</h4>
                            <div className="space-y-2 text-sm">
                              <div>
                                <span className="font-medium text-gray-700">Job ID:</span>
                                <span className="text-gray-900"> {job.jobId}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">Customer:</span>
                                <span className="text-gray-900"> {getCustomerName(job.customerId)}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">Customer ID:</span>
                                <span className="text-gray-900"> {job.customerId}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">Shipment Category:</span>
                                <span className="text-gray-900"> {job.shipmentCategory || '-'}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">Status:</span>
                                <span className={`ml-2 inline-block px-2 py-1 rounded text-xs font-semibold ${
                                  job.status === 'Open' ? 'bg-yellow-100 text-yellow-800' :
                                  job.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                                  job.status === 'Pending Payment' ? 'bg-orange-100 text-orange-800' :
                                  job.status === 'Payment Collected' ? 'bg-green-100 text-green-800' :
                                  job.status === 'Overdue' ? 'bg-red-100 text-red-800' :
                                  job.status === 'Completed' ? 'bg-gray-100 text-gray-800' :
                                  'bg-red-100 text-red-800'
                                }`}>{job.status || 'Open'}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">Created Date:</span>
                                <span className="text-gray-900"> {job.createdDate ? new Date(job.createdDate).toLocaleDateString() : '-'}</span>
                              </div>
                            </div>
                          </div>

                          <div>
                            <h4 className="font-semibold text-gray-900 mb-3">Shipment Details</h4>
                            <div className="space-y-2 text-sm">
                              <div>
                                <span className="font-medium text-gray-700">BL Number:</span>
                                <span className="text-gray-900"> {job.blNumber || '-'}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">CUSDEC Number:</span>
                                <span className="text-gray-900"> {formatCusdecWithDate(job.cusdecNumber, job.cusdecDate)}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">Open Date:</span>
                                <span className="text-gray-900"> {job.openDate ? new Date(job.openDate).toLocaleDateString() : '-'}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">LC/TT/DP/DA/NFE Number:</span>
                                <span className="text-gray-900"> {job.lcNumber || '-'}</span>
                              </div>
                              {!(job.shipmentCategory === 'Vehicle - Personal' || job.shipmentCategory === 'Vehicle - Company') && (
                                <div>
                                  <span className="font-medium text-gray-700">Container Number:</span>
                                  <span className="text-gray-900"> {job.containerNumber || '-'}</span>
                                </div>
                              )}
                              {(job.shipmentCategory === 'Vehicle - Personal' || job.shipmentCategory === 'Vehicle - Company' || job.chassisNumber) && (
                                <div>
                                  <span className="font-medium text-gray-700">Chassis Number:</span>
                                  <span className="text-gray-900"> {job.chassisNumber || '-'}</span>
                                </div>
                              )}
                              <div>
                                <span className="font-medium text-gray-700">Exporter:</span>
                                <span className="text-gray-900"> {job.exporter || '-'}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">Transporter:</span>
                                <span className="text-gray-900"> {job.transporter || '-'}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">Transport Delivery Date:</span>
                                <span className="text-gray-900"> {job.transportDeliveryDate ? new Date(job.transportDeliveryDate).toLocaleDateString() : '-'}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {job.assignments && job.assignments.length > 0 && (
                          <div className="mt-6">
                            <h4 className="font-semibold text-gray-900 mb-3">Assigned To</h4>
                            <div className="flex flex-wrap gap-2">
                              {job.assignments.map((assignment, index) => (
                                <span key={assignment.userId || index} className="inline-block bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1 rounded-full">
                                  {assignment.userName || getUserFullName(assignment.userId)}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Office Pay Items Section */}
                        <div className="mt-8 pt-6 border-t border-gray-200">
                          <OfficePayItems 
                            jobId={job.jobId} 
                            onUpdate={fetchJobs}
                          />
                        </div>
                        
                        {/* Advance Payment Section */}
                        <div className="mt-8 pt-6 border-t border-gray-200">
                          <AdvancePayment 
                            job={job} 
                            onUpdate={fetchJobs}
                          />
                        </div>
                        
                        {/* Petty Cash Section */}
                        <div className="mt-8 pt-6 border-t border-gray-200">
                          <JobPettyCash
                            job={job}
                            users={users}
                            onUpdate={fetchJobs}
                          />
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
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-2xl font-bold text-gray-900">{isEditing ? 'Edit Job' : 'Create New Job'}</h2>
              <button onClick={() => { setShowModal(false); setIsEditing(false); setSelectedJob(null); setSelectedUsers([]); setShowUserDropdown(false); }} className="text-gray-500 hover:text-gray-700 text-2xl font-bold">×</button>
            </div>

            <form onSubmit={isEditing ? handleUpdate : handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Customer <span className="text-red-600">*</span></label>
                    <select name="customerId" value={formData.customerId} onChange={handleChange} required disabled={isEditing} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
                      <option value="">Select Customer</option>
                      {customers.map(c => (
                        <option key={c.customerId} value={c.customerId}>{c.customerId} - {c.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Open Date <span className="text-red-600">*</span></label>
                    <input type="date" name="openDate" value={formData.openDate} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assign To Users</label>
                  <div className="relative multi-select-dropdown">
                    <button
                      type="button"
                      onClick={toggleUserDropdown}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-left focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white flex items-center justify-between"
                    >
                      <span>{getSelectedUserNames()}</span>
                      <svg className={`w-4 h-4 transition-transform ${showUserDropdown ? 'rotate-180' : ''}`} width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    {showUserDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                        {users.length === 0 ? (
                          <div className="px-3 py-2 text-gray-500 text-sm">No users available</div>
                        ) : (
                          users.map(user => (
                            <label key={user.userId} className="px-3 py-2 hover:bg-blue-50 cursor-pointer flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={selectedUsers.includes(user.userId)}
                                onChange={(e) => handleUserSelection(user.userId, e.target.checked)}
                                className="cursor-pointer"
                              />
                              <span className="text-sm">{user.fullName}</span>
                            </label>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                  {selectedUsers.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedUsers.map(userId => {
                        const selectedUser = users.find(u => u.userId === userId);
                        return selectedUser ? (
                          <span key={userId} className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded">
                            {selectedUser.fullName}
                            <button
                              type="button"
                              className="text-blue-600 hover:text-blue-800 font-bold"
                              onClick={() => handleUserSelection(userId, false)}
                            >
                              ×
                            </button>
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Shipment Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Shipment Category <span className="text-red-600">*</span></label>
                    <select name="shipmentCategory" value={formData.shipmentCategory} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
                      <option value="">Select Category</option>
                      <option value="LCL">LCL - Loose Cargo Load</option>
                      <option value="FCL">FCL - Full Container Load</option>
                      <option value="Air Freight">Air Freight</option>
                      <option value="BOI">BOI - Board of Investment</option>
                      <option value="Vehicle - Personal">Vehicle - Personal</option>
                      <option value="Vehicle - Company">Vehicle - Company</option>
                      <option value="TIEP">TIEP - Temporary Importation for Export Processing</option>
                      {formData.shipmentCategory && !['LCL', 'FCL', 'Air Freight', 'BOI', 'Vehicle - Personal', 'Vehicle - Company', 'TIEP'].includes(formData.shipmentCategory) && (
                        <option value={formData.shipmentCategory}>{formData.shipmentCategory}</option>
                      )}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">BL Number</label>
                    <input type="text" name="blNumber" value={formData.blNumber} onChange={handleChange} placeholder="Bill of Lading Number" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CUSDEC Number</label>
                    <input type="text" name="cusdecNumber" value={formData.cusdecNumber} onChange={handleChange} placeholder="Customs Declaration Number" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CUSDEC Date</label>
                    <input type="date" name="cusdecDate" value={formData.cusdecDate} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
                  </div>

                  {(formData.shipmentCategory === 'Vehicle - Personal' || formData.shipmentCategory === 'Vehicle - Company') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Chassis Number</label>
                      <input type="text" name="chassisNumber" value={formData.chassisNumber} onChange={handleChange} placeholder="Vehicle chassis number" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">TT / LC / DA / DP / NFE Number</label>
                    <input type="text" name="lcNumber" value={formData.lcNumber} onChange={handleChange} placeholder="TT / LC / DA / DP / NFE Number" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
                  </div>
                  
                  {!(formData.shipmentCategory === 'Vehicle - Personal' || formData.shipmentCategory === 'Vehicle - Company') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Container Number</label>
                      <input type="text" name="containerNumber" value={formData.containerNumber} onChange={handleChange} placeholder="Container Number" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Exporter</label>
                    <input type="text" name="exporter" value={formData.exporter} onChange={handleChange} placeholder="Exporter name" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Transporter</label>
                    <select name="transporter" value={formData.transporter} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
                      <option value="">Select Transporter</option>
                      {transporters.map((transporter) => (
                        <option key={transporter.transporterId} value={transporter.name}>
                          {transporter.name}
                        </option>
                      ))}
                      {formData.transporter && !transporters.some((transporter) => transporter.name === formData.transporter) && (
                        <option value={formData.transporter}>{formData.transporter}</option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Transport Delivery Date</label>
                    <input type="date" name="transportDeliveryDate" value={formData.transportDeliveryDate} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
                  </div>
                </div>
              </div>
            </form>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button onClick={() => { setShowModal(false); setIsEditing(false); setSelectedJob(null); setSelectedUsers([]); setShowUserDropdown(false); }} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition font-medium">Cancel</button>
              <button type="button" onClick={isEditing ? handleUpdate : handleSubmit} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium">{isEditing ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Jobs;
