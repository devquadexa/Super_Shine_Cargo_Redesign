import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API_BASE from '../api/config';

function Settings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('payitems');
  const [templates, setTemplates] = useState({});
  const [selectedCategory, setSelectedCategory] = useState('LCL');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [newItemName, setNewItemName] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Expense Types state
  const [expenseTypes, setExpenseTypes] = useState({ General: [], Operational: [] });
  const [selectedExpenseCategory, setSelectedExpenseCategory] = useState('General');
  const [showAddExpenseTypeModal, setShowAddExpenseTypeModal] = useState(false);
  const [editingExpenseType, setEditingExpenseType] = useState(null);
  const [newExpenseType, setNewExpenseType] = useState({ typeName: '', description: '' });

  // Clerk Manager Routing state
  const [clerkMappings, setClerkMappings] = useState([]);
  const [availableManagers, setAvailableManagers] = useState([]);
  const [loadingClerkMappings, setLoadingClerkMappings] = useState(false);
  const [savingClerkId, setSavingClerkId] = useState(null);
  const [clerkSearchText, setClerkSearchText] = useState('');
  const [batchSaving, setBatchSaving] = useState(false);

  const defaultCategories = React.useMemo(() =>
    ['LCL', 'FCL', 'Air Freight', 'BOI', 'Vehicle - Personal', 'Vehicle - Company', 'TIEP'],
    []
  );

  const categories = React.useMemo(() =>
    [...new Set([...defaultCategories, ...Object.keys(templates || {})])],
    [defaultCategories, templates]
  );

  useEffect(() => {
    if (user?.role === 'Admin' || user?.role === 'Super Admin') {
      fetchTemplates();
      fetchExpenseTypes();
      fetchClerkMappings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (activeTab === 'clerkrouting' && (user?.role === 'Admin' || user?.role === 'Super Admin')) {
      fetchClerkMappings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (categories.length > 0 && !categories.includes(selectedCategory)) {
      setSelectedCategory(categories[0]);
    }
  }, [selectedCategory, categories]);

  const fetchTemplates = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/pay-item-templates/all`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      console.error('Error fetching templates:', error);
      setMessage('Error loading pay item templates');
      setMessageType('error');
    }
  };

  const fetchExpenseTypes = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/expense-types/all`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      setExpenseTypes(data || { General: [], Operational: [] });
    } catch (error) {
      console.error('Error fetching expense types:', error);
      setMessage('Error loading expense types');
      setMessageType('error');
    }
  };

  const fetchClerkMappings = async () => {
    setLoadingClerkMappings(true);
    try {
      const response = await fetch(`${API_BASE}/api/settings/clerk-managers`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setClerkMappings(data.clerks || []);
        setAvailableManagers(data.managers || []);
      } else {
        console.error('Failed to load clerk manager mappings');
      }
    } catch (error) {
      console.error('Error fetching clerk manager mappings:', error);
    } finally {
      setLoadingClerkMappings(false);
    }
  };

  const handleThresholdChange = (clerkId, value) => {
    setClerkMappings(prev => prev.map(c => {
      if (c.userId === clerkId) {
        return { ...c, requestThreshold: value };
      }
      return c;
    }));
  };

  const handleManagerChange = (clerkId, managerId) => {
    const foundMgr = availableManagers.find(m => m.userId === managerId);
    setClerkMappings(prev => prev.map(c => {
      if (c.userId === clerkId) {
        return {
          ...c,
          assignedManagerId: managerId || null,
          assignedManagerName: foundMgr ? foundMgr.fullName : null,
          assignedManagerRole: foundMgr ? foundMgr.role : null
        };
      }
      return c;
    }));
  };

  const handleSaveClerkRule = async (clerkId, managerId, requestThreshold) => {
    setSavingClerkId(clerkId);
    try {
      const numThreshold = (requestThreshold !== '' && requestThreshold !== null && requestThreshold !== undefined && !isNaN(Number(requestThreshold)))
        ? Number(requestThreshold)
        : null;

      const response = await fetch(`${API_BASE}/api/settings/clerk-managers/${clerkId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          managerId: managerId || null,
          requestThreshold: numThreshold
        })
      });
      const data = await response.json();
      if (response.ok) {
        const foundMgr = availableManagers.find(m => m.userId === managerId);
        setClerkMappings(prev => prev.map(c => {
          if (c.userId === clerkId) {
            return {
              ...c,
              assignedManagerId: managerId || null,
              assignedManagerName: foundMgr ? foundMgr.fullName : null,
              assignedManagerRole: foundMgr ? foundMgr.role : null,
              requestThreshold: numThreshold,
              assignedDate: (managerId || numThreshold) ? new Date().toISOString() : null
            };
          }
          return c;
        }));
        setMessage(data.message || 'Rules updated successfully!');
        setMessageType('success');
        setTimeout(() => setMessage(''), 3500);
      } else {
        setMessage(data.message || 'Error updating assignment');
        setMessageType('error');
        setTimeout(() => setMessage(''), 4000);
      }
    } catch (error) {
      console.error('Error updating clerk manager assignment:', error);
      setMessage('Error updating clerk rules');
      setMessageType('error');
      setTimeout(() => setMessage(''), 4000);
    } finally {
      setSavingClerkId(null);
    }
  };

  const handleSaveAllMappings = async () => {
    setBatchSaving(true);
    try {
      const assignments = clerkMappings.map(c => {
        const numThreshold = (c.requestThreshold !== '' && c.requestThreshold !== null && c.requestThreshold !== undefined && !isNaN(Number(c.requestThreshold)))
          ? Number(c.requestThreshold)
          : null;
        return {
          clerkId: c.userId,
          managerId: c.assignedManagerId || null,
          requestThreshold: numThreshold
        };
      });
      const response = await fetch(`${API_BASE}/api/settings/clerk-managers/batch`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ assignments })
      });
      const data = await response.json();
      if (response.ok) {
        setMessage('✓ All clerk routing & threshold rules saved successfully!');
        setMessageType('success');
        fetchClerkMappings();
        setTimeout(() => setMessage(''), 4000);
      } else {
        setMessage(data.message || 'Error saving all rules');
        setMessageType('error');
        setTimeout(() => setMessage(''), 4000);
      }
    } catch (error) {
      console.error('Error batch saving rules:', error);
      setMessage('Error saving clerk rules');
      setMessageType('error');
      setTimeout(() => setMessage(''), 4000);
    } finally {
      setBatchSaving(false);
    }
  };

  const handleAddItem = async () => {
    if (!newItemName.trim()) {
      setMessage('Please enter an item name');
      setMessageType('error');
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/api/pay-item-templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ shipmentCategory: selectedCategory, itemName: newItemName })
      });
      if (response.ok) {
        setMessage('Pay item added successfully!');
        setMessageType('success');
        setNewItemName('');
        setShowAddModal(false);
        fetchTemplates();
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Error adding pay item');
        setMessageType('error');
      }
    } catch (error) {
      console.error('Error adding item:', error);
      setMessage('Error adding pay item');
      setMessageType('error');
    }
  };

  const handleUpdateItem = async (templateId) => {
    if (!editingItem?.itemName.trim()) {
      setMessage('Please enter an item name');
      setMessageType('error');
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/api/pay-item-templates/${templateId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ itemName: editingItem.itemName })
      });
      if (response.ok) {
        setMessage('Pay item updated successfully!');
        setMessageType('success');
        setEditingItem(null);
        fetchTemplates();
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Error updating pay item');
        setMessageType('error');
      }
    } catch (error) {
      console.error('Error updating item:', error);
      setMessage('Error updating pay item');
      setMessageType('error');
    }
  };

  const handleDeleteItem = async (templateId) => {
    if (!window.confirm('Are you sure you want to delete this pay item?')) return;
    try {
      const response = await fetch(`${API_BASE}/api/pay-item-templates/${templateId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        setMessage('Pay item deleted successfully!');
        setMessageType('success');
        fetchTemplates();
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Error deleting pay item');
        setMessageType('error');
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      setMessage('Error deleting pay item');
      setMessageType('error');
    }
  };

  // Expense Types CRUD handlers
  const handleAddExpenseType = async () => {
    if (!newExpenseType.typeName.trim()) {
      setMessage('Please enter an expense type name');
      setMessageType('error');
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/api/expense-types`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          category: selectedExpenseCategory,
          typeName: newExpenseType.typeName.trim(),
          description: newExpenseType.description?.trim() || null
        })
      });
      if (response.ok) {
        setMessage('Expense type added successfully!');
        setMessageType('success');
        setNewExpenseType({ typeName: '', description: '' });
        setShowAddExpenseTypeModal(false);
        fetchExpenseTypes();
        setTimeout(() => setMessage(''), 3000);
      } else {
        const data = await response.json();
        setMessage(data.message || 'Error adding expense type');
        setMessageType('error');
      }
    } catch (error) {
      console.error('Error adding expense type:', error);
      setMessage('Error adding expense type');
      setMessageType('error');
    }
  };

  const handleUpdateExpenseType = async (typeId) => {
    if (!editingExpenseType?.typeName.trim()) {
      setMessage('Please enter an expense type name');
      setMessageType('error');
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/api/expense-types/${typeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          category: editingExpenseType.category || selectedExpenseCategory,
          typeName: editingExpenseType.typeName.trim(),
          description: editingExpenseType.description?.trim() || null
        })
      });
      if (response.ok) {
        setMessage('Expense type updated successfully!');
        setMessageType('success');
        setEditingExpenseType(null);
        fetchExpenseTypes();
        setTimeout(() => setMessage(''), 3000);
      } else {
        const data = await response.json();
        setMessage(data.message || 'Error updating expense type');
        setMessageType('error');
      }
    } catch (error) {
      console.error('Error updating expense type:', error);
      setMessage('Error updating expense type');
      setMessageType('error');
    }
  };

  const handleDeleteExpenseType = async (typeId) => {
    if (!window.confirm('Are you sure you want to delete this expense type?')) return;
    try {
      const response = await fetch(`${API_BASE}/api/expense-types/${typeId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        setMessage('Expense type deleted successfully!');
        setMessageType('success');
        fetchExpenseTypes();
        setTimeout(() => setMessage(''), 3000);
      } else {
        const data = await response.json();
        setMessage(data.message || 'Error deleting expense type');
        setMessageType('error');
      }
    } catch (error) {
      console.error('Error deleting expense type:', error);
      setMessage('Error deleting expense type');
      setMessageType('error');
    }
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

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Configure system settings and defaults</p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg font-medium flex items-center gap-3 ${
          messageType === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
          'bg-red-50 text-red-800 border border-red-200'
        }`}>
          <span className="text-lg">{messageType === 'success' ? '✓' : '✕'}</span>
          {message}
        </div>
      )}

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-56 shrink-0">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden divide-y divide-gray-100">
            <button
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition ${
                activeTab === 'payitems'
                  ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600'
                  : 'text-gray-700 hover:bg-gray-50 border-l-4 border-transparent'
              }`}
              onClick={() => setActiveTab('payitems')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6"></line>
                <line x1="8" y1="12" x2="21" y2="12"></line>
                <line x1="8" y1="18" x2="21" y2="18"></line>
                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                <line x1="3" y1="18" x2="3.01" y2="18"></line>
              </svg>
              Pay Items
            </button>
            <button
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition ${
                activeTab === 'expensetypes'
                  ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600'
                  : 'text-gray-700 hover:bg-gray-50 border-l-4 border-transparent'
              }`}
              onClick={() => setActiveTab('expensetypes')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                <line x1="2" y1="10" x2="22" y2="10"></line>
              </svg>
              Expense Types
            </button>
            <button
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition ${
                activeTab === 'clerkrouting'
                  ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600'
                  : 'text-gray-700 hover:bg-gray-50 border-l-4 border-transparent'
              }`}
              onClick={() => setActiveTab('clerkrouting')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              Petty Cash Routing & Limits
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'payitems' && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900">Default Pay Items by Shipment Category</h2>
                <p className="text-gray-600 mt-1 text-sm">Define default pay items that will be automatically loaded when creating invoices</p>
              </div>

              {/* Category Tabs */}
              <div className="flex flex-wrap gap-2 mb-6">
                {categories.map(category => (
                  <button
                    key={category}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                      selectedCategory === category
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category}
                    <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${
                      selectedCategory === category ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {templates[category]?.length || 0}
                    </span>
                  </button>
                ))}
              </div>

              {/* Pay Items List */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900">{selectedCategory} — Pay Items</h3>
                  <button
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition text-sm"
                    onClick={() => setShowAddModal(true)}
                  >
                    + Add Item
                  </button>
                </div>

                {templates[selectedCategory] && templates[selectedCategory].length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {templates[selectedCategory].map((item, index) => (
                      <div key={item.templateId} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50">
                        <span className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 text-xs font-bold flex items-center justify-center shrink-0">
                          {index + 1}
                        </span>
                        {editingItem?.templateId === item.templateId ? (
                          <div className="flex items-center gap-3 flex-1">
                            <input
                              type="text"
                              value={editingItem.itemName}
                              onChange={(e) => setEditingItem({ ...editingItem, itemName: e.target.value })}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                              autoFocus
                            />
                            <button
                              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
                              onClick={() => handleUpdateItem(item.templateId)}
                            >
                              Save
                            </button>
                            <button
                              className="px-3 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium transition"
                              onClick={() => setEditingItem(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="flex-1 text-sm text-gray-900">{item.itemName}</span>
                            <div className="flex items-center gap-2">
                              <button
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                onClick={() => setEditingItem(item)}
                                title="Edit"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                              </button>
                              <button
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                onClick={() => handleDeleteItem(item.templateId)}
                                title="Delete"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6"></polyline>
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                  <line x1="10" y1="11" x2="10" y2="17"></line>
                                  <line x1="14" y1="11" x2="14" y2="17"></line>
                                </svg>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center">
                    <div className="flex justify-center mb-4">
                      <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="8" y1="6" x2="21" y2="6"></line>
                        <line x1="8" y1="12" x2="21" y2="12"></line>
                        <line x1="8" y1="18" x2="21" y2="18"></line>
                        <line x1="3" y1="6" x2="3.01" y2="6"></line>
                        <line x1="3" y1="12" x2="3.01" y2="12"></line>
                        <line x1="3" y1="18" x2="3.01" y2="18"></line>
                      </svg>
                    </div>
                    <p className="text-gray-500 mb-4">No pay items defined for {selectedCategory}</p>
                    <button
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition text-sm"
                      onClick={() => setShowAddModal(true)}
                    >
                      Add First Item
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'expensetypes' && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900">Customizable Expense Types</h2>
                <p className="text-gray-600 mt-1 text-sm">
                  Define and customize expense types under General and Operational categories. These types are selectable when recording Other Expenses and viewing financial reports.
                </p>
              </div>

              {/* Expense Category Tabs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div
                  onClick={() => setSelectedExpenseCategory('General')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition flex items-center justify-between ${
                    selectedExpenseCategory === 'General'
                      ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      selectedExpenseCategory === 'General' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                    }`}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 21h18M3 7v14M21 7v14M6 7V3h12v4M10 11h4M10 15h4M10 19h4" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 text-base">General Expenses</h4>
                      <p className="text-xs text-gray-500">Office overhead, utilities, staff welfare, tea & refreshments</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    selectedExpenseCategory === 'General' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {expenseTypes.General?.length || 0} Types
                  </span>
                </div>

                <div
                  onClick={() => setSelectedExpenseCategory('Operational')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition flex items-center justify-between ${
                    selectedExpenseCategory === 'Operational'
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      selectedExpenseCategory === 'Operational' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'
                    }`}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="1" y="3" width="15" height="13"></rect>
                        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                        <circle cx="5.5" cy="18.5" r="2.5"></circle>
                        <circle cx="18.5" cy="18.5" r="2.5"></circle>
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 text-base">Operational Expenses</h4>
                      <p className="text-xs text-gray-500">Fuel, port charges, demurrages, clearance, transport & cargo handling</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    selectedExpenseCategory === 'Operational' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {expenseTypes.Operational?.length || 0} Types
                  </span>
                </div>
              </div>

              {/* Expense Types List Card */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {selectedExpenseCategory} Expense Types
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Items shown here appear as selectable options when recording {selectedExpenseCategory.toLowerCase()} expenses
                    </p>
                  </div>
                  <button
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition text-sm flex items-center gap-2 shadow-sm"
                    onClick={() => {
                      setNewExpenseType({ typeName: '', description: '' });
                      setShowAddExpenseTypeModal(true);
                    }}
                  >
                    <span>+</span> Add Expense Type
                  </button>
                </div>

                {expenseTypes[selectedExpenseCategory] && expenseTypes[selectedExpenseCategory].length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {expenseTypes[selectedExpenseCategory].map((item, index) => (
                      <div key={item.typeId} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition">
                        <span className="w-7 h-7 rounded-full bg-blue-50 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">
                          {index + 1}
                        </span>

                        {editingExpenseType?.typeId === item.typeId ? (
                          <div className="flex-1 flex flex-col md:flex-row items-center gap-3">
                            <input
                              type="text"
                              value={editingExpenseType.typeName}
                              onChange={(e) => setEditingExpenseType({ ...editingExpenseType, typeName: e.target.value })}
                              placeholder="Expense type name"
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                              autoFocus
                            />
                            <input
                              type="text"
                              value={editingExpenseType.description || ''}
                              onChange={(e) => setEditingExpenseType({ ...editingExpenseType, description: e.target.value })}
                              placeholder="Optional description / details"
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                            />
                            <div className="flex items-center gap-2">
                              <button
                                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
                                onClick={() => handleUpdateExpenseType(item.typeId)}
                              >
                                Save
                              </button>
                              <button
                                className="px-3 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium transition"
                                onClick={() => setEditingExpenseType(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-900">{item.typeName}</span>
                                <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                  item.category === 'Operational' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {item.category}
                                </span>
                              </div>
                              {item.description && (
                                <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                onClick={() => setEditingExpenseType(item)}
                                title="Edit Expense Type"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                              </button>
                              <button
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                onClick={() => handleDeleteExpenseType(item.typeId)}
                                title="Delete Expense Type"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6"></polyline>
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                  <line x1="10" y1="11" x2="10" y2="17"></line>
                                  <line x1="14" y1="11" x2="14" y2="17"></line>
                                </svg>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center">
                    <p className="text-gray-500 mb-4">No expense types defined for {selectedExpenseCategory}</p>
                    <button
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition text-sm"
                      onClick={() => {
                        setNewExpenseType({ typeName: '', description: '' });
                        setShowAddExpenseTypeModal(true);
                      }}
                    >
                      Add First Expense Type
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'clerkrouting' && (
            <div className="space-y-6">
              {/* Header with Title and Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <span>Wharf Clerk Routing & Threshold Limits</span>
                    <span className="px-2.5 py-0.5 text-xs font-semibold bg-indigo-100 text-indigo-800 rounded-full">
                      Customization
                    </span>
                  </h2>
                  <p className="text-gray-600 mt-1 text-sm">
                    Assign dedicated Managers and enforce Petty Cash Request Limits for each Wharf Clerk. Clerks cannot exceed their threshold, and requests route exclusively to their assigned manager.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={fetchClerkMappings}
                    disabled={loadingClerkMappings}
                    className="px-3.5 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-lg transition text-sm flex items-center gap-1.5 shadow-sm"
                    title="Refresh mappings"
                  >
                    <svg className={`w-4 h-4 ${loadingClerkMappings ? 'animate-spin text-blue-600' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 4 23 10 17 10"></polyline>
                      <polyline points="1 20 1 14 7 14"></polyline>
                      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                    </svg>
                    Refresh
                  </button>
                  <button
                    onClick={handleSaveAllMappings}
                    disabled={batchSaving || loadingClerkMappings}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition text-sm flex items-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    {batchSaving ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                          <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" />
                        </svg>
                        Saving All...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                          <polyline points="17 21 17 13 7 13 7 21"></polyline>
                          <polyline points="7 3 7 8 15 8"></polyline>
                        </svg>
                        Save All Rules
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl shrink-0">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                    </svg>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{clerkMappings.length}</div>
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Wharf Clerks</div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xl shrink-0">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                      <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-emerald-700">
                      {clerkMappings.filter(c => Boolean(c.assignedManagerId)).length}
                    </div>
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Directly Routed</div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xl shrink-0">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-700">
                      {clerkMappings.filter(c => c.requestThreshold !== null && c.requestThreshold !== undefined && Number(c.requestThreshold) > 0).length}
                    </div>
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">With Request Limit</div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xl shrink-0">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2 2 22 22 22 12 2"></polygon>
                      <line x1="12" y1="9" x2="12" y2="13"></line>
                      <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-amber-700">
                      {clerkMappings.filter(c => !c.assignedManagerId).length}
                    </div>
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Unassigned (Broadcast)</div>
                  </div>
                </div>
              </div>

              {/* Main Table Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Search & Filter Header */}
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="relative w-full sm:w-80">
                    <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <input
                      type="text"
                      placeholder="Search clerk name, username or ID..."
                      value={clerkSearchText}
                      onChange={(e) => setClerkSearchText(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div className="text-xs text-gray-500 flex items-center gap-1.5">
                    <span>💡 Tip:</span>
                    <span>Set a request limit in LKR to restrict maximum petty cash that can be requested at once. Leave empty for unlimited.</span>
                  </div>
                </div>

                {/* Table */}
                {loadingClerkMappings ? (
                  <div className="p-12 text-center text-gray-500">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-3"></div>
                    <p className="text-sm font-medium">Loading Wharf Clerk rules...</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-100 text-gray-600 uppercase text-xs font-semibold tracking-wider border-b border-gray-200">
                          <th className="px-6 py-3.5">Wharf Clerk</th>
                          <th className="px-6 py-3.5">Assigned Manager (Approver)</th>
                          <th className="px-6 py-3.5">Request Limit (LKR)</th>
                          <th className="px-6 py-3.5 text-center">Status & Rule Summary</th>
                          <th className="px-6 py-3.5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {(() => {
                          const filteredClerks = clerkMappings.filter(c => {
                            if (!clerkSearchText.trim()) return true;
                            const query = clerkSearchText.toLowerCase();
                            return (
                              (c.fullName && c.fullName.toLowerCase().includes(query)) ||
                              (c.username && c.username.toLowerCase().includes(query)) ||
                              (c.userId && c.userId.toLowerCase().includes(query)) ||
                              (c.assignedManagerName && c.assignedManagerName.toLowerCase().includes(query))
                            );
                          });

                          if (filteredClerks.length === 0) {
                            return (
                              <tr>
                                <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                  {clerkSearchText ? 'No wharf clerks match your search query.' : 'No active wharf clerks found in the system.'}
                                </td>
                              </tr>
                            );
                          }

                          return filteredClerks.map((clerk) => {
                            const isSaving = savingClerkId === clerk.userId;
                            const hasManager = Boolean(clerk.assignedManagerId);
                            const hasLimit = clerk.requestThreshold !== null && clerk.requestThreshold !== undefined && clerk.requestThreshold !== '' && Number(clerk.requestThreshold) > 0;

                            return (
                              <tr key={clerk.userId} className="hover:bg-indigo-50/30 transition group">
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-sm shrink-0">
                                      {clerk.fullName ? clerk.fullName.substring(0, 2).toUpperCase() : 'WC'}
                                    </div>
                                    <div>
                                      <div className="font-semibold text-gray-900 group-hover:text-indigo-900">
                                        {clerk.fullName || clerk.username}
                                      </div>
                                      <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                                        <span className="font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[11px]">
                                          {clerk.userId}
                                        </span>
                                        <span>@{clerk.username}</span>
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                <td className="px-6 py-4">
                                  <div className="max-w-xs">
                                    <select
                                      value={clerk.assignedManagerId || ''}
                                      onChange={(e) => handleManagerChange(clerk.userId, e.target.value)}
                                      disabled={isSaving}
                                      className={`w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500 transition font-medium ${
                                        hasManager 
                                          ? 'border-indigo-300 bg-indigo-50/50 text-indigo-950 font-semibold' 
                                          : 'border-gray-300 bg-white text-gray-700'
                                      }`}
                                    >
                                      <option value="">-- Broadcast to All Managers --</option>
                                      {availableManagers.map(mgr => (
                                        <option key={mgr.userId} value={mgr.userId}>
                                          {mgr.fullName} ({mgr.role})
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </td>

                                <td className="px-6 py-4">
                                  <div className="relative max-w-xs">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-xs font-semibold text-gray-400">
                                      LKR
                                    </div>
                                    <input
                                      type="number"
                                      min="0"
                                      step="500"
                                      value={clerk.requestThreshold !== null && clerk.requestThreshold !== undefined ? clerk.requestThreshold : ''}
                                      onChange={(e) => handleThresholdChange(clerk.userId, e.target.value)}
                                      placeholder="Unlimited (No Limit)"
                                      disabled={isSaving}
                                      className={`w-full pl-11 pr-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium transition ${
                                        hasLimit
                                          ? 'border-purple-300 bg-purple-50/40 text-purple-950 font-semibold'
                                          : 'border-gray-300 bg-white text-gray-700'
                                      }`}
                                    />
                                  </div>
                                </td>

                                <td className="px-6 py-4 text-center">
                                  <div className="flex flex-col items-center gap-1.5">
                                    {hasManager ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs">
                                        <svg className="w-3 h-3 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                          <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                        Routed to {clerk.assignedManagerName ? clerk.assignedManagerName.split(' ')[0] : clerk.assignedManagerId}
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                        Broadcast (Any Manager)
                                      </span>
                                    )}

                                    {hasLimit ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200 shadow-2xs">
                                        <svg className="w-3 h-3 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                        </svg>
                                        Max: LKR {Number(clerk.requestThreshold).toLocaleString()}
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] text-gray-400 bg-gray-50 border border-gray-100">
                                        No Limit (Unlimited)
                                      </span>
                                    )}
                                  </div>
                                </td>

                                <td className="px-6 py-4 text-right">
                                  <button
                                    onClick={() => handleSaveClerkRule(clerk.userId, clerk.assignedManagerId, clerk.requestThreshold)}
                                    disabled={isSaving}
                                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition disabled:opacity-50"
                                  >
                                    {isSaving ? 'Saving...' : 'Save'}
                                  </button>
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Informational Guidance Callout */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5 flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                  </svg>
                </div>
                <div className="space-y-1.5 text-sm text-indigo-900">
                  <h4 className="font-bold text-indigo-950">How Wharf Clerk Rules & Thresholds Work:</h4>
                  <ul className="list-disc list-inside space-y-1 text-indigo-800 text-xs">
                    <li>
                      <strong>Request Threshold Limit:</strong> Sets the maximum petty cash amount (LKR) that this clerk can request in a single request (or re-request). Requests exceeding this limit will be blocked. Leave empty for no limit.
                    </li>
                    <li>
                      <strong>Targeted Manager Routing:</strong> When configured, petty cash requests submitted by this clerk route directly and exclusively to the assigned manager's inbox and pending list.
                    </li>
                    <li>
                      <strong>Broadcast Fallback:</strong> If no manager is selected, requests are broadcast to all active Managers.
                    </li>
                    <li>
                      <strong>Supervisory Override:</strong> Admins and Super Admins can always view, audit, and approve requests at any time.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Pay Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Add Pay Item to {selectedCategory}</h2>
              <button className="text-gray-400 hover:text-gray-600 text-2xl leading-none" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Item Name</label>
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="Enter pay item name"
                  autoFocus
                  onKeyPress={(e) => { if (e.key === 'Enter') handleAddItem(); }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition font-medium text-sm"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition text-sm"
                  onClick={handleAddItem}
                >
                  Add Item
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Expense Type Modal */}
      {showAddExpenseTypeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Add Expense Type</h2>
              <button
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                onClick={() => setShowAddExpenseTypeModal(false)}
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expense Category <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className={`py-2 px-3 text-sm font-medium rounded-lg border transition ${
                      selectedExpenseCategory === 'General'
                        ? 'bg-blue-50 border-blue-600 text-blue-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedExpenseCategory('General')}
                  >
                    General
                  </button>
                  <button
                    type="button"
                    className={`py-2 px-3 text-sm font-medium rounded-lg border transition ${
                      selectedExpenseCategory === 'Operational'
                        ? 'bg-indigo-50 border-indigo-600 text-indigo-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedExpenseCategory('Operational')}
                  >
                    Operational
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newExpenseType.typeName}
                  onChange={(e) => setNewExpenseType({ ...newExpenseType, typeName: e.target.value })}
                  placeholder="e.g. Fuel, Port Demurrage, Office Stationery"
                  autoFocus
                  onKeyPress={(e) => { if (e.key === 'Enter') handleAddExpenseType(); }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description / Details (Optional)
                </label>
                <textarea
                  rows="2"
                  value={newExpenseType.description}
                  onChange={(e) => setNewExpenseType({ ...newExpenseType, description: e.target.value })}
                  placeholder="Additional context about this expense type"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition font-medium text-sm"
                  onClick={() => setShowAddExpenseTypeModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition text-sm"
                  onClick={handleAddExpenseType}
                >
                  Add Type
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Settings;
