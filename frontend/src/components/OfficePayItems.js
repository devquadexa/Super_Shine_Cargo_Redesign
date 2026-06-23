import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { officePayItemService } from '../api/services/officePayItemService';

function OfficePayItems({ jobId, onUpdate, forceOpen }) {
  const { user } = useAuth();
  const [officePayItems, setOfficePayItems] = useState([]);
  const [showAddForm, setShowAddForm] = useState(forceOpen || false);
  const [showSlotsModal, setShowSlotsModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({
    description: '',
    actualCost: ''
  });

  useEffect(() => {
    if (jobId) {
      fetchOfficePayItems();
    }
  }, [jobId]);

  const fetchOfficePayItems = async () => {
    try {
      setLoading(true);
      const items = await officePayItemService.getByJobId(jobId);
      setOfficePayItems(items);
    } catch (error) {
      console.error('Error fetching office pay items:', error);
      setMessage('Error loading office pay items');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);

      const actualCost = parseFloat(formData.actualCost);
      if (!formData.actualCost || Number.isNaN(actualCost) || actualCost < 0) {
        setMessage('Please enter a valid Amount Paid');
        setTimeout(() => setMessage(''), 3000);
        return;
      }
      
      const payItemData = {
        jobId,
        description: formData.description,
        actualCost
      };

      if (editingId) {
        // Update logic would go here if backend supports it
        setMessage('Edit functionality coming soon');
      } else {
        await officePayItemService.create(payItemData);
        setMessage('Office pay item added successfully!');
      }
      
      handleCloseForm();
      await fetchOfficePayItems();
      if (onUpdate) onUpdate();
      
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error creating office pay item:', error);
      setMessage('Error adding office pay item');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.officePayItemId);
    setFormData({
      description: item.description,
      actualCost: item.actualCost
    });
    setShowAddForm(true);
  };

  const handleDelete = async (officePayItemId) => {
    if (!window.confirm('Are you sure you want to delete this office pay item?')) {
      return;
    }

    try {
      setLoading(true);
      await officePayItemService.delete(officePayItemId);
      
      setMessage('Office pay item deleted successfully!');
      await fetchOfficePayItems();
      if (onUpdate) onUpdate();
      
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error deleting office pay item:', error);
      setMessage('Error deleting office pay item');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseForm = () => {
    setShowAddForm(false);
    setEditingId(null);
    setFormData({ description: '', actualCost: '' });
    if (forceOpen && onUpdate) onUpdate();
  };

  const openAddPaymentModal = () => {
    // On mobile, show modal with slots; on desktop, show inline form
    if (window.innerWidth <= 768) {
      setShowSlotsModal(true);
    } else {
      setShowAddForm(true);
    }
  };

  const closePaymentModal = () => {
    setShowSlotsModal(false);
    handleCloseForm();
  };

  const sanitizeCurrencyInput = (value) => {
    if (!value) return '';

    // Remove everything except digits and decimal point
    let sanitized = value.replace(/[^\d.]/g, '');

    // Keep only one decimal point
    const parts = sanitized.split('.');
    if (parts.length > 2) {
      sanitized = `${parts[0]}.${parts.slice(1).join('')}`;
    }

    // Limit to 2 decimal places
    if (sanitized.includes('.')) {
      const [wholePart, decimalPart] = sanitized.split('.');
      sanitized = `${wholePart}.${decimalPart.slice(0, 2)}`;
    }

    return sanitized;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'actualCost') {
      setFormData({
        ...formData,
        actualCost: sanitizeCurrencyInput(value)
      });
      return;
    }

    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleAmountKeyDown = (e) => {
    const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', '.'];

    if (allowedKeys.includes(e.key)) {
      if (e.key === '.' && e.target.value.includes('.')) {
        e.preventDefault();
      }
      return;
    }

    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
    }
  };

  const handleAmountPaste = (e) => {
    const pastedText = e.clipboardData.getData('text');
    if (!/^\d+(\.\d{1,2})?$/.test(pastedText)) {
      e.preventDefault();
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return 'LKR 0.00';
    return `LKR ${parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Only show for Admin, Super Admin, Manager, and Office Executive
  if (!user || !['Admin', 'Super Admin', 'Manager', 'Office Executive'].includes(user.role)) {
    return null;
  }

  return (
    <div>
      <div className="font-semibold text-gray-900 mb-2 hidden">Office Pay Items</div>
      <p className="text-sm text-gray-600 mb-4 hidden">
        Record upfront payments made by office staff (e.g., DO charges, port fees)
      </p>

      {message && (
        <div className={`mb-4 p-4 rounded-lg border-l-4 ${message.includes('Error') ? 'bg-red-50 border-red-500 text-red-700' : 'bg-green-50 border-green-500 text-green-700'}`}>
          {message}
        </div>
      )}

      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-2xl w-full my-8">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
              <h3 className="text-lg font-bold text-gray-900">{editingId ? 'Edit Office Payment' : 'Add New Office Payment'}</h3>
              <button 
                onClick={handleCloseForm}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="e.g., DO Charges, Port Fees, Documentation"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="actualCost" className="block text-sm font-medium text-gray-700 mb-1">
                    Amount Paid (LKR) <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    id="actualCost"
                    name="actualCost"
                    value={formData.actualCost}
                    onChange={handleChange}
                    onKeyDown={handleAmountKeyDown}
                    onPaste={handleAmountPaste}
                    placeholder="0.00"
                    inputMode="decimal"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    required
                  />
                </div>
              </div>
            </form>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button 
                type="button"
                onClick={handleCloseForm}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-900 rounded-lg transition font-medium"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                onClick={handleSubmit}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium"
                disabled={loading}
              >
                {loading ? 'Processing...' : (editingId ? 'Update Payment' : 'Add Payment')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSlotsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-md w-full my-8">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
              <h3 className="text-lg font-bold text-gray-900">Add Office Payment</h3>
              <button className="text-gray-500 hover:text-gray-700 text-2xl font-bold" onClick={closePaymentModal}>×</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label htmlFor="description-modal" className="block text-sm font-medium text-gray-700 mb-1">
                  Description <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  id="description-modal"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="e.g., DO Charges, Port Fees, Documentation"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="actualCost-modal" className="block text-sm font-medium text-gray-700 mb-1">
                  Amount Paid (LKR) <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  id="actualCost-modal"
                  name="actualCost"
                  value={formData.actualCost}
                  onChange={handleChange}
                  onKeyDown={handleAmountKeyDown}
                  onPaste={handleAmountPaste}
                  placeholder="0.00"
                  inputMode="decimal"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                />
              </div>
            </form>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button 
                type="button"
                onClick={closePaymentModal}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-900 rounded-lg transition font-medium"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                onClick={handleSubmit}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium"
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Add Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div>
        {loading && officePayItems.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-block mb-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
            <p className="text-gray-600">Loading office pay items...</p>
          </div>
        ) : officePayItems.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-4">📦</div>
            <h4 className="font-semibold text-gray-900 mb-2">No Office Payments Yet</h4>
            <p className="text-gray-600 mb-6">Add upfront payments made by office staff for this job</p>
            <button 
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium"
              onClick={openAddPaymentModal}
              disabled={loading}
            >
              + Add Payment
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border-2 border-gray-200">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Office Pay Items</div>
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#1E3F63] hover:bg-[#193552] transition"
                onClick={openAddPaymentModal}
                disabled={loading}
                title="Add new office payment"
                aria-label="Add office payment"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Add
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Description</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actual Cost</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Paid By</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Payment Date</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {officePayItems.map((item) => (
                    <tr key={item.officePayItemId} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm text-gray-900">{item.description}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{formatCurrency(item.actualCost)}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{item.paidByName || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{formatDate(item.paymentDate)}</td>
                      <td className="px-6 py-4 text-sm flex gap-2">
                        <button
                          className="text-blue-600 hover:text-blue-800 transition p-1"
                          onClick={() => handleEdit(item)}
                          disabled={loading}
                          title="Edit payment"
                          aria-label="Edit payment"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                        </button>
                        <button
                          className="text-red-600 hover:text-red-800 transition p-1"
                          onClick={() => handleDelete(item.officePayItemId)}
                          disabled={loading}
                          title="Delete payment"
                          aria-label="Delete payment"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-end items-center">
                <span className="text-sm font-semibold text-gray-900 mr-4">Total Actual Cost:</span>
                <span className="text-lg font-bold text-gray-900">
                  {formatCurrency(officePayItems.reduce((sum, item) => sum + (item.actualCost || 0), 0))}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default OfficePayItems;
