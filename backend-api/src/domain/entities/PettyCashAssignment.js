class PettyCashAssignment {
  constructor({
    assignmentId,
    jobId,
    assignedTo,
    assignedBy,
    assignedAmount,
    assignedDate,
    status,
    settlementDate,
    actualSpent,
    balanceAmount,
    overAmount,
    notes,
    settlementItems,
    readOnlyPredefinedItems,
    shipmentCategory,
    customerId,
    assignedToName,
    assignedByName,
    groupId,
    approvedBy,
    approvedDate,
    rejectedBy,
    rejectedDate,
    rejectionReason,
    issuedBy,
    issuedDate,
    paymentMethod,
    referenceNumber,
    approvedByName,
    approvedByRole,
    rejectedByName,
    rejectedByRole,
    issuedByName,
    issuedByRole,
    assignedByRole,
    assignedManagerId,
    assignedManagerName,
    effectiveManagerId
  }) {
    this.assignmentId = assignmentId;
    this.jobId = jobId;
    this.assignedTo = assignedTo;
    this.assignedBy = assignedBy;
    this.assignedAmount = assignedAmount;
    this.assignedDate = assignedDate;
    this.status = status || 'Requested';
    this.settlementDate = settlementDate;
    this.actualSpent = actualSpent;
    this.balanceAmount = balanceAmount;
    this.overAmount = overAmount;
    this.notes = notes;
    this.approvedBy = approvedBy || null;
    this.approvedDate = approvedDate || null;
    this.rejectedBy = rejectedBy || null;
    this.rejectedDate = rejectedDate || null;
    this.rejectionReason = rejectionReason || null;
    this.issuedBy = issuedBy || null;
    this.issuedDate = issuedDate || null;
    this.paymentMethod = paymentMethod || null;
    this.referenceNumber = referenceNumber || null;
    this.approvedByName = approvedByName || null;
    this.approvedByRole = approvedByRole || null;
    this.rejectedByName = rejectedByName || null;
    this.rejectedByRole = rejectedByRole || null;
    this.issuedByName = issuedByName || null;
    this.issuedByRole = issuedByRole || null;
    this.assignedByRole = assignedByRole || null;
    this.assignedManagerId = assignedManagerId || null;
    this.assignedManagerName = assignedManagerName || null;
    this.effectiveManagerId = effectiveManagerId || null;
    this.settlementItems = (settlementItems || []).map(item => ({
      ...item,
      hasBill: item.hasBill === true || item.hasBill === 1 || item.hasBill === '1'
    }));
    this.readOnlyPredefinedItems = readOnlyPredefinedItems || [];
    this.shipmentCategory = shipmentCategory;
    this.customerId = customerId;
    this.assignedToName = assignedToName;
    this.assignedByName = assignedByName;
    this.groupId = groupId || `${jobId}_${assignedTo}`;
  }

  toJSON() {
    return {
      assignmentId: this.assignmentId,
      jobId: this.jobId,
      assignedTo: this.assignedTo,
      assignedBy: this.assignedBy,
      assignedAmount: this.assignedAmount,
      assignedDate: this.assignedDate,
      status: this.status,
      settlementDate: this.settlementDate,
      actualSpent: this.actualSpent,
      balanceAmount: this.balanceAmount,
      overAmount: this.overAmount,
      notes: this.notes,
      approvedBy: this.approvedBy,
      approvedDate: this.approvedDate,
      rejectedBy: this.rejectedBy,
      rejectedDate: this.rejectedDate,
      rejectionReason: this.rejectionReason,
      issuedBy: this.issuedBy,
      issuedDate: this.issuedDate,
      paymentMethod: this.paymentMethod,
      referenceNumber: this.referenceNumber,
      approvedByName: this.approvedByName,
      approvedByRole: this.approvedByRole,
      rejectedByName: this.rejectedByName,
      rejectedByRole: this.rejectedByRole,
      issuedByName: this.issuedByName,
      issuedByRole: this.issuedByRole,
      assignedByRole: this.assignedByRole,
      settlementItems: this.settlementItems,
      readOnlyPredefinedItems: this.readOnlyPredefinedItems,
      shipmentCategory: this.shipmentCategory,
      customerId: this.customerId,
      assignedToName: this.assignedToName,
      assignedByName: this.assignedByName,
      groupId: this.groupId,
      assignedManagerId: this.assignedManagerId,
      assignedManagerName: this.assignedManagerName,
      effectiveManagerId: this.effectiveManagerId
    };
  }
}

module.exports = PettyCashAssignment;
