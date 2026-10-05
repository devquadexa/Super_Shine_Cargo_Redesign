const ICustomerRepository = require('../../../domain/repositories/ICustomerRepository');
const Customer = require('../../../domain/entities/Customer');
const ContactPerson = require('../../../domain/entities/ContactPerson');
const BaseMySQLRepository = require('./BaseMySQLRepository');

class MySQLCustomerRepository extends BaseMySQLRepository {
  constructor(dbConnection, contactPersonRepository, categoryRepository) {
    super(dbConnection);
    this.contactPersonRepository = contactPersonRepository;
    this.categoryRepository = categoryRepository;
  }

  async create(customer) {
    await this.prisma.customers.create({
      data: {
        customerId: customer.customerId,
        name: customer.name,
        mainPhone: customer.mainPhone,
        email: customer.email,
        addressNumber: customer.addressNumber,
        addressStreet1: customer.addressStreet1,
        addressStreet2: customer.addressStreet2,
        addressDistrict: customer.addressDistrict,
        addressCity: customer.addressCity,
        addressCountry: customer.addressCountry || 'Sri Lanka',
        officeAddressNumber: customer.officeAddressNumber,
        officeAddressStreet1: customer.officeAddressStreet1,
        officeAddressStreet2: customer.officeAddressStreet2,
        officeAddressDistrict: customer.officeAddressDistrict,
        officeAddressCity: customer.officeAddressCity,
        officeAddressCountry: customer.officeAddressCountry || 'Sri Lanka',
        isOfficeAddressSame: Boolean(customer.isOfficeAddressSame),
        website: customer.website || null,
        registrationDate: customer.registrationDate ? new Date(customer.registrationDate) : new Date(),
        creditPeriodDays: customer.creditPeriodDays || 30,
        isActive: customer.isActive !== undefined ? Boolean(customer.isActive) : true
      }
    });

    if (customer.contactPersons && customer.contactPersons.length > 0) {
      for (let i = 0; i < customer.contactPersons.length; i++) {
        const cp = customer.contactPersons[i];
        await this.contactPersonRepository.create(new ContactPerson({
          contactPersonId: i + 1,
          customerId: customer.customerId,
          name: cp.name,
          phone: cp.phone,
          email: cp.email || null,
          designation: cp.designation || null
        }));
      }
    }

    if (customer.categories && customer.categories.length > 0) {
      await this.categoryRepository.assignToCustomer(customer.customerId, customer.categories);
    }

    return customer;
  }

  async findById(customerId) {
    const row = await this.prisma.customers.findUnique({
      where: { customerId }
    });
    if (!row) return null;

    const customer = this.mapToEntity(row);
    if (this.contactPersonRepository) {
      customer.contactPersons = await this.contactPersonRepository.findByCustomerId(customerId);
    }
    if (this.categoryRepository) {
      customer.categories = await this.categoryRepository.findByCustomerId(customerId);
    }
    return customer;
  }

  async findAll(filters = {}) {
    const where = {};
    if (filters.name) {
      where.name = { contains: filters.name };
    }

    const rows = await this.prisma.customers.findMany({
      where,
      orderBy: { name: 'asc' }
    });

    const customers = [];
    for (const row of rows) {
      const customer = this.mapToEntity(row);
      if (this.contactPersonRepository) {
        customer.contactPersons = await this.contactPersonRepository.findByCustomerId(customer.customerId);
      }
      if (this.categoryRepository) {
        customer.categories = await this.categoryRepository.findByCustomerId(customer.customerId);
      }
      customers.push(customer);
    }
    return customers;
  }

  async update(customerId, customer) {
    await this.prisma.customers.update({
      where: { customerId },
      data: {
        name: customer.name,
        mainPhone: customer.mainPhone,
        email: customer.email,
        addressNumber: customer.addressNumber,
        addressStreet1: customer.addressStreet1,
        addressStreet2: customer.addressStreet2,
        addressDistrict: customer.addressDistrict,
        addressCity: customer.addressCity,
        addressCountry: customer.addressCountry || 'Sri Lanka',
        officeAddressNumber: customer.officeAddressNumber,
        officeAddressStreet1: customer.officeAddressStreet1,
        officeAddressStreet2: customer.officeAddressStreet2,
        officeAddressDistrict: customer.officeAddressDistrict,
        officeAddressCity: customer.officeAddressCity,
        officeAddressCountry: customer.officeAddressCountry || 'Sri Lanka',
        isOfficeAddressSame: Boolean(customer.isOfficeAddressSame),
        website: customer.website || null,
        creditPeriodDays: customer.creditPeriodDays || 30,
        isActive: customer.isActive !== undefined ? Boolean(customer.isActive) : true
      }
    });

    if (this.contactPersonRepository) {
      await this.contactPersonRepository.deleteByCustomerId(customerId);
      if (customer.contactPersons && customer.contactPersons.length > 0) {
        for (let i = 0; i < customer.contactPersons.length; i++) {
          const cp = customer.contactPersons[i];
          await this.contactPersonRepository.create(new ContactPerson({
            contactPersonId: i + 1,
            customerId,
            name: cp.name,
            phone: cp.phone,
            email: cp.email || null,
            designation: cp.designation || null
          }));
        }
      }
    }

    if (this.categoryRepository) {
      if (customer.categories && customer.categories.length > 0) {
        await this.categoryRepository.assignToCustomer(customerId, customer.categories);
      } else {
        await this.categoryRepository.removeFromCustomer(customerId);
      }
    }

    return customer;
  }

  async delete(customerId) {
    await this.prisma.customers.update({
      where: { customerId },
      data: { isActive: false }
    });
    return true;
  }

  async exists(customerId) {
    const count = await this.prisma.customers.count({
      where: { customerId }
    });
    return count > 0;
  }

  async findByEmail(email) {
    const row = await this.prisma.customers.findFirst({
      where: { email }
    });
    if (!row) return null;
    return this.mapToEntity(row);
  }

  async generateNextId() {
    return this.generateNextFormattedId('customers', 'customerId', 'CUST', 4);
  }

  mapToEntity(row) {
    return new Customer({
      customerId: row.customerId,
      name: row.name,
      mainPhone: row.mainPhone,
      email: row.email,
      addressNumber: row.addressNumber,
      addressStreet1: row.addressStreet1,
      addressStreet2: row.addressStreet2,
      addressDistrict: row.addressDistrict,
      addressCity: row.addressCity,
      addressCountry: row.addressCountry || 'Sri Lanka',
      officeAddressNumber: row.officeAddressNumber,
      officeAddressStreet1: row.officeAddressStreet1,
      officeAddressStreet2: row.officeAddressStreet2,
      officeAddressDistrict: row.officeAddressDistrict,
      officeAddressCity: row.officeAddressCity,
      officeAddressCountry: row.officeAddressCountry || 'Sri Lanka',
      isOfficeAddressSame: Boolean(row.isOfficeAddressSame),
      website: row.website,
      registrationDate: row.registrationDate,
      creditPeriodDays: row.creditPeriodDays !== undefined ? row.creditPeriodDays : 30,
      isActive: Boolean(row.isActive)
    });
  }
}

module.exports = MySQLCustomerRepository;
