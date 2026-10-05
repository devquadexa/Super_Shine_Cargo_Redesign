/**
 * Customer Controller
 * Handles HTTP requests and delegates to use cases
 * Part of the presentation layer
 */
class CustomerController {
  constructor(container) {
    this.createCustomer = container.get('createCustomer');
    this.getAllCustomers = container.get('getAllCustomers');
    this.updateCustomer = container.get('updateCustomer');
    this.deleteCustomer = container.get('deleteCustomer');
    this.customerRepository = container.get('customerRepository');
    this.categoryRepository = container.get('categoryRepository');
    this.jobRepository = container.get('jobRepository');
  }

  async create(req, res) {
    try {
      const customer = await this.createCustomer.execute(req.body);
      res.status(201).json(customer);
    } catch (error) {
      console.error('❌ Create customer error:', error.message);
      console.error('   Stack:', error.stack);
      res.status(400).json({ message: error.message });
    }
  }

  async getAll(req, res) {
    try {
      let customers = await this.getAllCustomers.execute(req.query);

      // Filter by user role - Waff Clerk only sees customers assigned to their jobs
      if (req.user?.role === 'Waff Clerk') {
        const jobs = await this.jobRepository.findByAssignedUser(req.user.userId);
        const assignedCustomerIds = new Set((jobs || []).map(j => j.customerId).filter(Boolean));
        customers = customers.filter(c => assignedCustomerIds.has(c.customerId));
      }

      res.json(customers);
    } catch (error) {
      console.error('❌ Get customers error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  async getById(req, res) {
    try {
      const customer = await this.customerRepository.findById(req.params.id);
      if (!customer) {
        return res.status(404).json({ message: 'Customer not found' });
      }

      if (req.user?.role === 'Waff Clerk') {
        const jobs = await this.jobRepository.findByAssignedUser(req.user.userId);
        const assignedCustomerIds = new Set((jobs || []).map(j => j.customerId).filter(Boolean));
        if (!assignedCustomerIds.has(customer.customerId)) {
          return res.status(403).json({ message: 'Access denied: Customer not assigned to you' });
        }
      }

      res.json(customer);
    } catch (error) {
      console.error('Get customer error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  async update(req, res) {
    try {
      const customer = await this.updateCustomer.execute(req.params.id, req.body);
      res.json(customer);
    } catch (error) {
      console.error('Update customer error:', error);
      res.status(400).json({ message: error.message });
    }
  }

  async delete(req, res) {
    try {
      const result = await this.deleteCustomer.execute(req.params.id);
      res.json(result);
    } catch (error) {
      console.error('Delete customer error:', error);
      res.status(400).json({ message: error.message });
    }
  }

  async getCategories(req, res) {
    try {
      const categories = await this.categoryRepository.findAll();
      res.json(categories);
    } catch (error) {
      console.error('Get categories error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
}

module.exports = CustomerController;
