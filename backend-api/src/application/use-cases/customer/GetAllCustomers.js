/**
 * Get All Customers Use Case
 */
class GetAllCustomers {
  constructor(customerRepository) {
    this.customerRepository = customerRepository;
  }

  async execute(filters = {}) {
    return await this.customerRepository.findAll(filters);
  }
}

module.exports = GetAllCustomers;
