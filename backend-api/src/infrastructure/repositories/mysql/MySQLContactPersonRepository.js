const IContactPersonRepository = require('../../../domain/repositories/IContactPersonRepository');
const ContactPerson = require('../../../domain/entities/ContactPerson');
const BaseMySQLRepository = require('./BaseMySQLRepository');

class MySQLContactPersonRepository extends BaseMySQLRepository {
  constructor(dbConnection) {
    super(dbConnection);
  }

  async create(contactPerson) {
    const id = parseInt(contactPerson.contactPersonId, 10);
    await this.prisma.contactpersons.upsert({
      where: {
        customerId_contactPersonId: {
          customerId: contactPerson.customerId,
          contactPersonId: id
        }
      },
      update: {
        name: contactPerson.name,
        phone: contactPerson.phone,
        email: contactPerson.email,
        designation: contactPerson.designation
      },
      create: {
        contactPersonId: id,
        customerId: contactPerson.customerId,
        name: contactPerson.name,
        phone: contactPerson.phone,
        email: contactPerson.email,
        designation: contactPerson.designation
      }
    });
    return contactPerson;
  }

  async createMany(contactPersons) {
    if (!contactPersons || contactPersons.length === 0) return [];
    await this.prisma.contactpersons.createMany({
      data: contactPersons.map(cp => ({
        contactPersonId: parseInt(cp.contactPersonId, 10),
        customerId: cp.customerId,
        name: cp.name,
        phone: cp.phone,
        email: cp.email || null,
        designation: cp.designation || null
      }))
    });
    return contactPersons;
  }

  async findByCustomerId(customerId) {
    const rows = await this.prisma.contactpersons.findMany({
      where: { customerId },
      orderBy: { contactPersonId: 'asc' }
    });
    return rows.map(row => this.mapToEntity(row));
  }

  async deleteByCustomerId(customerId) {
    await this.prisma.contactpersons.deleteMany({
      where: { customerId }
    });
    return true;
  }

  mapToEntity(row) {
    return new ContactPerson({
      contactPersonId: row.contactPersonId,
      customerId: row.customerId,
      name: row.name,
      phone: row.phone,
      email: row.email,
      designation: row.designation
    });
  }

  formatId(id) {
    return String(id).padStart(6, '0');
  }
}

module.exports = MySQLContactPersonRepository;
