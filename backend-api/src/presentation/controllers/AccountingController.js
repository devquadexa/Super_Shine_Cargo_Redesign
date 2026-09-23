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
      console.log('📊 Getting accounting dashboard... User:', req.user?.username, 'Role:', req.user?.role, 'Filters:', { fromDate, toDate });
      const data = await this.getAccountingDashboard.execute({ fromDate, toDate });
      console.log('✅ Accounting dashboard data retrieved');
      res.json(data);
    } catch (error) {
      console.error('❌ Get accounting dashboard error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
}

module.exports = AccountingController;
