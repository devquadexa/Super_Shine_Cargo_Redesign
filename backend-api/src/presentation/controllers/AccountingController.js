/**
 * Accounting Controller
 * Handles accounting and financial reporting requests
 */
class AccountingController {
  constructor(container) {
    this.getAccountingDashboard = container.get('getAccountingDashboard');
  }

  async getDashboard(req, res) {
    try {
      const { fromDate, toDate } = req.query;
      const data = await this.getAccountingDashboard.execute({ fromDate, toDate });
      res.json(data);
    } catch (error) {
      console.error('❌ Get accounting dashboard error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
}

module.exports = AccountingController;
