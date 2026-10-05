/**
 * Create Cash Balance Settlement Use Case
 * Handles creation of settlement requests by Waff Clerks.
 */
const CashBalanceSettlement = require('../../../domain/entities/CashBalanceSettlement');

class CreateCashBalanceSettlement {
  constructor(cashBalanceSettlementRepository, pettyCashAssignmentRepository) {
    this.cashBalanceSettlementRepository = cashBalanceSettlementRepository;
    this.pettyCashAssignmentRepository = pettyCashAssignmentRepository;
  }

  async execute({ userId, userName, settlementType, amount, notes, relatedAssignments = [], createdBy }) {
    const settlementId = await this.cashBalanceSettlementRepository.generateNextId();

    const settlement = new CashBalanceSettlement({
      settlementId, userId, userName, settlementType, amount, notes,
      relatedAssignments, createdBy, status: 'PENDING'
    });

    const validation = settlement.validate();
    if (!validation.isValid) throw new Error(`Validation failed: ${validation.errors.join(', ')}`);

    const createdSettlement = await this.cashBalanceSettlementRepository.create(settlement);

    // Batch update all related assignment statuses in a single query
    if (relatedAssignments && relatedAssignments.length > 0) {
      const pendingStatus = settlementType === 'BALANCE_RETURN'
        ? 'Pending Approval / Balance'
        : 'Pending Approval / Over Due';

      await this.pettyCashAssignmentRepository.updateStatuses(relatedAssignments, pendingStatus);
    }

    return createdSettlement;
  }
}

module.exports = CreateCashBalanceSettlement;