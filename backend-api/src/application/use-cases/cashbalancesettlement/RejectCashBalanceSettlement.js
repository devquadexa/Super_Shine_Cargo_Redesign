/**
 * Reject Cash Balance Settlement Use Case
 * Handles rejection of settlement requests by Management.
 */
class RejectCashBalanceSettlement {
  constructor(cashBalanceSettlementRepository, pettyCashAssignmentRepository) {
    this.cashBalanceSettlementRepository = cashBalanceSettlementRepository;
    this.pettyCashAssignmentRepository = pettyCashAssignmentRepository;
  }

  async execute(settlementId, managerId, managerName, managerNotes) {
    const settlement = await this.cashBalanceSettlementRepository.findById(settlementId);
    if (!settlement) throw new Error('Settlement not found');

    settlement.reject(managerId, managerName, managerNotes);

    // Update settlement + batch-revert related assignment statuses in parallel
    const [rejectedSettlement] = await Promise.all([
      this.cashBalanceSettlementRepository.update(settlementId, {
        status: settlement.status,
        managerId: settlement.managerId,
        managerName: settlement.managerName,
        managerNotes: settlement.managerNotes,
        updatedBy: settlement.updatedBy,
        updatedDate: settlement.updatedDate
      }),
      settlement.relatedAssignments && settlement.relatedAssignments.length > 0
        ? this.pettyCashAssignmentRepository.updateStatuses(settlement.relatedAssignments, 'Settled/Rejected')
        : Promise.resolve()
    ]);

    return rejectedSettlement;
  }
}

module.exports = RejectCashBalanceSettlement;