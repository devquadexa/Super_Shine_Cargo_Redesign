const ICustomerRepository = require('../../../domain/repositories/ICustomerRepository');
const Customer = require('../../../domain/entities/Customer');
const ContactPerson = require('../../../domain/entities/ContactPerson');
const Category = require('../../../domain/entities/Category');
const BaseMySQLRepository = require('./BaseMySQLRepository');

class MySQLCustomerRepository extends BaseMySQLRepository {
  constructor(dbConnection, contactPersonRepository, categoryRepository) {
    super(dbConnection);
    this.contactPersonRepository = contactPersonRepository;
    this.categoryRepository = categoryRepository;
  }

  _getStandardInclude() {
    return {
      contactpersons: {
        orderBy: { contactPersonId: 'asc' }
      },
      customercategories: {
        include: {
          categories: true
        }
      },
      customerdeliveryaddresses: {
        orderBy: { deliveryAddressId: 'asc' }
      }
    };
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
        creditPeriodDays: (customer.creditPeriodDays !== undefined && customer.creditPeriodDays !== null && customer.creditPeriodDays !== '')
          ? parseInt(customer.creditPeriodDays, 10) || 30
          : 30,
        isActive: customer.isActive !== undefined ? Boolean(customer.isActive) : true
      }
    });

    const childTasks = [];
    if (customer.contactPersons && customer.contactPersons.length > 0) {
      const contactPersonsToCreate = customer.contactPersons.map((cp, i) => new ContactPerson({
        contactPersonId: i + 1,
        customerId: customer.customerId,
        name: cp.name,
        phone: cp.phone,
        email: cp.email || null,
        designation: cp.designation || null
      }));
      if (typeof this.contactPersonRepository.createMany === 'function') {
        childTasks.push(this.contactPersonRepository.createMany(contactPersonsToCreate));
      } else {
        childTasks.push(Promise.all(contactPersonsToCreate.map(cp => this.contactPersonRepository.create(cp))));
      }
    }

    if (customer.categories && customer.categories.length > 0) {
      childTasks.push(this.categoryRepository.assignToCustomer(customer.customerId, customer.categories));
    }

    if (customer.deliveryAddresses && customer.deliveryAddresses.length > 0) {
      const placeholders = [];
      const values = [];
      for (let i = 0; i < customer.deliveryAddresses.length; i++) {
        const da = customer.deliveryAddresses[i];
        placeholders.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        values.push(
          customer.customerId,
          i + 1,
          da.label || `Delivery Address ${i + 1}`,
          da.addressNumber || null,
          da.addressStreet1 || null,
          da.addressStreet2 || null,
          da.addressCity || null,
          da.addressDistrict || null,
          da.addressCountry || 'Sri Lanka',
          da.isSameAsResidential ? 1 : 0
        );
      }
      childTasks.push(
        this.prisma.$executeRawUnsafe(
          `INSERT INTO customerdeliveryaddresses (customerId, deliveryAddressId, label, addressNumber, addressStreet1, addressStreet2, addressCity, addressDistrict, addressCountry, isSameAsResidential)
           VALUES ${placeholders.join(', ')}`,
          ...values
        ).catch(err => console.error('Error saving delivery addresses in create:', err))
      );
    }

    if (childTasks.length > 0) {
      await Promise.all(childTasks);
    }

    // Maintain in-memory cache directly
    if (this._cache) {
      this._cache.unshift(customer);
    }
    this.clearCache(false);
    return customer;
  }

  clearCache(clearMemoryCache = true) {
    if (clearMemoryCache) {
      this._cache = null;
      this._cacheTime = 0;
    }
    try {
      const container = require('../../di/container');
      const jobRepo = container.get('jobRepository');
      if (jobRepo && typeof jobRepo.clearCache === 'function') {
        jobRepo.clearCache();
      }
    } catch (e) {}
  }

  async findById(customerId) {
    if (this._cache) {
      const found = this._cache.find(c => c.customerId === customerId);
      if (found) return found;
    }
    const row = await this.prisma.customers.findUnique({
      where: { customerId },
      include: this._getStandardInclude()
    });
    if (!row) return null;
    return this.mapToEntity(row);
  }

  async findAll(filters = {}) {
    if (filters.name) {
      const rows = await this.prisma.customers.findMany({
        where: { name: { contains: filters.name } },
        include: this._getStandardInclude(),
        orderBy: { name: 'asc' }
      });
      return rows.map(row => this.mapToEntity(row));
    }

    const now = Date.now();
    if (this._cache && (now - this._cacheTime < 60000)) {
      return this._cache;
    }

    try {
      const mysqlDb = require('../../../config/mysqlDatabase');
      const sql = `
        SELECT 
          c.*,
          (SELECT JSON_ARRAYAGG(JSON_OBJECT(
            'contactPersonId', cp.contactPersonId,
            'name', cp.name,
            'phone', cp.phone,
            'email', cp.email,
            'designation', cp.designation
          )) FROM contactpersons cp WHERE cp.customerId = c.customerId) AS contactPersonsJson,
          (SELECT JSON_ARRAYAGG(JSON_OBJECT(
            'deliveryAddressId', da.deliveryAddressId,
            'label', da.label,
            'addressNumber', da.addressNumber,
            'addressStreet1', da.addressStreet1,
            'addressStreet2', da.addressStreet2,
            'addressCity', da.addressCity,
            'addressDistrict', da.addressDistrict,
            'addressCountry', da.addressCountry,
            'isSameAsResidential', da.isSameAsResidential
          )) FROM customerdeliveryaddresses da WHERE da.customerId = c.customerId) AS deliveryAddressesJson,
          (SELECT JSON_ARRAYAGG(JSON_OBJECT(
            'categoryId', cat.categoryId,
            'categoryName', cat.categoryName
          )) FROM customercategories cc JOIN categories cat ON cc.categoryId = cat.categoryId WHERE cc.customerId = c.customerId) AS categoriesJson
        FROM customers c
        ORDER BY c.name ASC
      `;
      const rows = await mysqlDb.query(sql);
      const result = rows.map(row => {
        let contactPersons = [];
        let categories = [];
        let deliveryAddresses = [];

        if (row.contactPersonsJson) {
          const parsed = typeof row.contactPersonsJson === 'string' ? JSON.parse(row.contactPersonsJson) : row.contactPersonsJson;
          if (Array.isArray(parsed)) {
            contactPersons = parsed.map(cp => new ContactPerson(cp));
          }
        }
        if (row.categoriesJson) {
          const parsed = typeof row.categoriesJson === 'string' ? JSON.parse(row.categoriesJson) : row.categoriesJson;
          if (Array.isArray(parsed)) {
            categories = parsed.map(c => new Category(c));
          }
        }
        if (row.deliveryAddressesJson) {
          const parsed = typeof row.deliveryAddressesJson === 'string' ? JSON.parse(row.deliveryAddressesJson) : row.deliveryAddressesJson;
          if (Array.isArray(parsed) && parsed.length > 0) {
            deliveryAddresses = parsed.map(r => ({
              ...r,
              isSameAsResidential: Boolean(r.isSameAsResidential)
            }));
          }
        }
        if (deliveryAddresses.length === 0 && (row.officeAddressStreet1 || row.addressStreet1)) {
          deliveryAddresses = [{
            deliveryAddressId: 1,
            customerId: row.customerId,
            label: 'Primary Delivery Address',
            addressNumber: row.officeAddressNumber || row.addressNumber,
            addressStreet1: row.officeAddressStreet1 || row.addressStreet1,
            addressStreet2: row.officeAddressStreet2 || row.addressStreet2,
            addressCity: row.officeAddressCity || row.addressCity,
            addressDistrict: row.officeAddressDistrict || row.addressDistrict,
            addressCountry: row.officeAddressCountry || row.addressCountry || 'Sri Lanka',
            isSameAsResidential: Boolean(row.isOfficeAddressSame)
          }];
        }

        return new Customer({
          ...row,
          isActive: Boolean(row.isActive),
          isOfficeAddressSame: Boolean(row.isOfficeAddressSame),
          contactPersons,
          categories,
          deliveryAddresses
        });
      });

      this._cache = result;
      this._cacheTime = now;
      return result;
    } catch (e) {
      console.warn('Fast customer query fallback to Prisma:', e.message);
      const rows = await this.prisma.customers.findMany({
        include: this._getStandardInclude(),
        orderBy: { name: 'asc' }
      });
      return rows.map(row => this.mapToEntity(row));
    }
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
        creditPeriodDays: (customer.creditPeriodDays !== undefined && customer.creditPeriodDays !== null && customer.creditPeriodDays !== '')
          ? parseInt(customer.creditPeriodDays, 10) || 30
          : 30,
        isActive: customer.isActive !== undefined ? Boolean(customer.isActive) : true
      }
    });

    const childTasks = [];

    if (this.contactPersonRepository) {
      childTasks.push((async () => {
        await this.contactPersonRepository.deleteByCustomerId(customerId);
        if (customer.contactPersons && customer.contactPersons.length > 0) {
          const contactPersonsToCreate = customer.contactPersons.map((cp, i) => new ContactPerson({
            contactPersonId: i + 1,
            customerId,
            name: cp.name,
            phone: cp.phone,
            email: cp.email || null,
            designation: cp.designation || null
          }));
          if (typeof this.contactPersonRepository.createMany === 'function') {
            await this.contactPersonRepository.createMany(contactPersonsToCreate);
          } else {
            await Promise.all(contactPersonsToCreate.map(cp => this.contactPersonRepository.create(cp)));
          }
        }
      })());
    }

    if (this.categoryRepository) {
      if (customer.categories && customer.categories.length > 0) {
        childTasks.push(this.categoryRepository.assignToCustomer(customerId, customer.categories));
      } else {
        childTasks.push(this.categoryRepository.removeFromCustomer(customerId));
      }
    }

    childTasks.push((async () => {
      try {
        await this.prisma.$executeRawUnsafe(
          `DELETE FROM customerdeliveryaddresses WHERE customerId = ?`,
          customerId
        );
        if (customer.deliveryAddresses && customer.deliveryAddresses.length > 0) {
          const placeholders = [];
          const values = [];
          for (let i = 0; i < customer.deliveryAddresses.length; i++) {
            const da = customer.deliveryAddresses[i];
            placeholders.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
            values.push(
              customerId,
              i + 1,
              da.label || `Delivery Address ${i + 1}`,
              da.addressNumber || null,
              da.addressStreet1 || null,
              da.addressStreet2 || null,
              da.addressCity || null,
              da.addressDistrict || null,
              da.addressCountry || 'Sri Lanka',
              da.isSameAsResidential ? 1 : 0
            );
          }
          await this.prisma.$executeRawUnsafe(
            `INSERT INTO customerdeliveryaddresses (customerId, deliveryAddressId, label, addressNumber, addressStreet1, addressStreet2, addressCity, addressDistrict, addressCountry, isSameAsResidential)
             VALUES ${placeholders.join(', ')}`,
            ...values
          );
        }
      } catch (err) {
        console.error('Error saving delivery addresses in update:', err);
      }
    })());

    await Promise.all(childTasks);

    if (this._cache) {
      const parsedDays = (customer.creditPeriodDays !== undefined && customer.creditPeriodDays !== null && customer.creditPeriodDays !== '') ? parseInt(customer.creditPeriodDays, 10) || 30 : 30;
      this._cache = this._cache.map(c => c.customerId === customerId ? new Customer({ ...c, ...customer, creditPeriodDays: parsedDays }) : c);
    }
    this.clearCache(false);
    return customer;
  }

  async delete(customerId) {
    await this.prisma.customers.update({
      where: { customerId },
      data: { isActive: false }
    });
    if (this._cache) {
      this._cache = this._cache.map(c => c.customerId === customerId ? { ...c, isActive: false } : c);
    }
    this.clearCache(false);
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
    let contactPersons = [];
    if (row.contactpersons && Array.isArray(row.contactpersons)) {
      contactPersons = row.contactpersons.map(cp => new ContactPerson({
        contactPersonId: cp.contactPersonId,
        customerId: cp.customerId,
        name: cp.name,
        phone: cp.phone,
        email: cp.email,
        designation: cp.designation
      }));
    }

    let categories = [];
    if (row.customercategories && Array.isArray(row.customercategories)) {
      categories = row.customercategories
        .map(rc => rc.categories)
        .filter(Boolean)
        .map(c => new Category({
          categoryId: c.categoryId,
          categoryName: c.categoryName
        }));
    }

    let deliveryAddresses = [];
    if (row.customerdeliveryaddresses && Array.isArray(row.customerdeliveryaddresses) && row.customerdeliveryaddresses.length > 0) {
      deliveryAddresses = row.customerdeliveryaddresses.map(r => ({
        deliveryAddressId: r.deliveryAddressId,
        customerId: r.customerId,
        label: r.label,
        addressNumber: r.addressNumber,
        addressStreet1: r.addressStreet1,
        addressStreet2: r.addressStreet2,
        addressCity: r.addressCity,
        addressDistrict: r.addressDistrict,
        addressCountry: r.addressCountry || 'Sri Lanka',
        isSameAsResidential: Boolean(r.isSameAsResidential)
      }));
    } else if (row.officeAddressStreet1 || row.addressStreet1) {
      deliveryAddresses = [{
        deliveryAddressId: 1,
        customerId: row.customerId,
        label: 'Primary Delivery Address',
        addressNumber: row.officeAddressNumber || row.addressNumber,
        addressStreet1: row.officeAddressStreet1 || row.addressStreet1,
        addressStreet2: row.officeAddressStreet2 || row.addressStreet2,
        addressCity: row.officeAddressCity || row.addressCity,
        addressDistrict: row.officeAddressDistrict || row.addressDistrict,
        addressCountry: row.officeAddressCountry || row.addressCountry || 'Sri Lanka',
        isSameAsResidential: Boolean(row.isOfficeAddressSame)
      }];
    }

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
      isActive: Boolean(row.isActive),
      contactPersons,
      categories,
      deliveryAddresses
    });
  }
}

module.exports = MySQLCustomerRepository;
