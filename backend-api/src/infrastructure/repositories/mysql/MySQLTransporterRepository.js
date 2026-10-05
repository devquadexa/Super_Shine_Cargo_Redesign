const ITransporterRepository = require('../../../domain/repositories/ITransporterRepository');
const Transporter = require('../../../domain/entities/Transporter');
const BaseMySQLRepository = require('./BaseMySQLRepository');

class MySQLTransporterRepository extends BaseMySQLRepository {
  constructor(dbConnection) {
    super(dbConnection);
  }

  clearCache() {
    this._cache = null;
    this._cacheTime = 0;
  }

  async create(transporter) {
    await this.prisma.transporters.create({
      data: {
        transporterId: transporter.transporterId,
        name: transporter.name,
        phone: transporter.mainPhone || transporter.phone || '',
        email: transporter.email || null,
        address: transporter.getFormattedAddress ? transporter.getFormattedAddress() : transporter.address,
        vehicleNumber: transporter.vehicleNumber || null,
        notes: transporter.notes || null,
        createdDate: transporter.createdDate ? new Date(transporter.createdDate) : new Date(),
        isActive: transporter.isActive !== undefined ? Boolean(transporter.isActive) : true,
        registrationDate: transporter.registrationDate ? new Date(transporter.registrationDate) : null,
        addressNumber: transporter.addressNumber || null,
        addressStreet1: transporter.addressStreet1 || null,
        addressStreet2: transporter.addressStreet2 || null,
        addressDistrict: transporter.addressDistrict || null,
        addressCity: transporter.addressCity || null,
        addressCountry: transporter.addressCountry || 'Sri Lanka',
        contactPersonsJson: JSON.stringify(transporter.contactPersons || []),
        contactPerson: transporter.contactPerson || transporter.contactPersons?.[0]?.name || null,
        lorryNumber: transporter.lorryNumber || null,
        transporterType: transporter.transporterType || 'Non FCL',
        driverName: transporter.driverName || null,
        size: transporter.size || null
      }
    });
    this.clearCache();
    return transporter;
  }

  async findById(transporterId) {
    const row = await this.prisma.transporters.findUnique({ where: { transporterId } });
    return row ? this.mapToEntity(row) : null;
  }

  async findAll(filters = {}) {
    if (filters.name) {
      const rows = await this.prisma.transporters.findMany({
        where: { name: { contains: filters.name } },
        orderBy: { name: 'asc' }
      });
      return rows.map(row => this.mapToEntity(row));
    }

    const now = Date.now();
    if (this._cache && (now - this._cacheTime < 60000)) return this._cache;

    const rows = await this.prisma.transporters.findMany({ orderBy: { name: 'asc' } });
    const result = rows.map(row => this.mapToEntity(row));
    this._cache = result;
    this._cacheTime = now;
    return result;
  }

  async update(transporterId, transporter) {
    await this.prisma.transporters.update({
      where: { transporterId },
      data: {
        name: transporter.name,
        phone: transporter.mainPhone || transporter.phone || '',
        email: transporter.email || null,
        address: transporter.getFormattedAddress ? transporter.getFormattedAddress() : transporter.address,
        vehicleNumber: transporter.vehicleNumber || null,
        notes: transporter.notes || null,
        registrationDate: transporter.registrationDate ? new Date(transporter.registrationDate) : null,
        addressNumber: transporter.addressNumber || null,
        addressStreet1: transporter.addressStreet1 || null,
        addressStreet2: transporter.addressStreet2 || null,
        addressDistrict: transporter.addressDistrict || null,
        addressCity: transporter.addressCity || null,
        addressCountry: transporter.addressCountry || 'Sri Lanka',
        contactPersonsJson: JSON.stringify(transporter.contactPersons || []),
        contactPerson: transporter.contactPerson || transporter.contactPersons?.[0]?.name || null,
        lorryNumber: transporter.lorryNumber || null,
        transporterType: transporter.transporterType || 'Non FCL',
        driverName: transporter.driverName || null,
        size: transporter.size || null,
        isActive: transporter.isActive !== undefined ? Boolean(transporter.isActive) : true
      }
    });
    this.clearCache();
    return transporter;
  }

  async delete(transporterId) {
    await this.prisma.transporters.update({
      where: { transporterId },
      data: { isActive: false }
    });
    this.clearCache();
    return true;
  }

  async exists(transporterId) {
    const count = await this.prisma.transporters.count({ where: { transporterId } });
    return count > 0;
  }

  async findByEmail(email) {
    const row = await this.prisma.transporters.findFirst({ where: { email } });
    return row ? this.mapToEntity(row) : null;
  }

  async findByName(name) {
    const row = await this.prisma.transporters.findFirst({ where: { name } });
    return row ? this.mapToEntity(row) : null;
  }

  async generateNextId() {
    return this.generateNextFormattedId('transporters', 'transporterId', 'TR', 4);
  }

  mapToEntity(row) {
    let contactPersons = [];
    if (row.contactPersonsJson) {
      try {
        contactPersons = typeof row.contactPersonsJson === 'string'
          ? JSON.parse(row.contactPersonsJson)
          : row.contactPersonsJson;
      } catch {
        contactPersons = [];
      }
    }

    return new Transporter({
      transporterId: row.transporterId,
      name: row.name,
      mainPhone: row.phone,
      contactPerson: row.contactPerson,
      email: row.email,
      lorryNumber: row.lorryNumber,
      transporterType: row.transporterType || 'Non FCL',
      driverName: row.driverName,
      size: row.size,
      registrationDate: row.registrationDate,
      addressNumber: row.addressNumber,
      addressStreet1: row.addressStreet1,
      addressStreet2: row.addressStreet2,
      addressDistrict: row.addressDistrict,
      addressCity: row.addressCity,
      addressCountry: row.addressCountry,
      contactPersons,
      address: row.address,
      vehicleNumber: row.vehicleNumber,
      notes: row.notes,
      createdDate: row.createdDate,
      isActive: Boolean(row.isActive)
    });
  }
}

module.exports = MySQLTransporterRepository;
