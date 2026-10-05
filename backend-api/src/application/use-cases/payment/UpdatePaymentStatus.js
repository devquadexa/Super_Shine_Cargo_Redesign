/**
 * Update Payment Status Use Case
 * Updates the status of a payment (Pending -> Cleared/Bounced)
 */
class UpdatePaymentStatus {
  constructor(paymentRepository) {
    this.paymentRepository = paymentRepository;
  }

  async execute(paymentId, status) {
    // Validate status
    const validStatuses = ['Pending', 'Cleared', 'Bounced'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
    }
    
    // Update status
    const updated = await this.paymentRepository.updateStatus(paymentId, status, new Date());
    if (!updated) {
      throw new Error('Payment not found');
    }
    return updated;
  }
}

module.exports = UpdatePaymentStatus;
