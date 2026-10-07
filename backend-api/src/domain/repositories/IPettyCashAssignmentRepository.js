class IPettyCashAssignmentRepository {
  async create(assignmentData) {
    throw new Error('Method not implemented');
  }

  async getAll() {
    throw new Error('Method not implemented');
  }

  async getByUser(userId) {
    throw new Error('Method not implemented');
  }

  async getByJob(jobId) {
    throw new Error('Method not implemented');
  }

  async getById(assignmentId) {
    throw new Error('Method not implemented');
  }

  async settle(assignmentId, settlementData) {
    throw new Error('Method not implemented');
  }

  async updateStatus(assignmentId, status) {
    throw new Error('Method not implemented');
  }

  async returnBalance(assignmentId, returnData) {
    throw new Error('Method not implemented');
  }

  async requestPettyCash(requestData) {
    throw new Error('Method not implemented');
  }

  async approvePettyCash(assignmentId, approvalData) {
    throw new Error('Method not implemented');
  }

  async rejectPettyCash(assignmentId, rejectData) {
    throw new Error('Method not implemented');
  }

  async reRequestPettyCash(assignmentId, reRequestData) {
    throw new Error('Method not implemented');
  }

  async issuePettyCash(assignmentId, issueData) {
    throw new Error('Method not implemented');
  }

  async payOverAmount(assignmentId, paymentData) {
    throw new Error('Method not implemented');
  }
}

module.exports = IPettyCashAssignmentRepository;
