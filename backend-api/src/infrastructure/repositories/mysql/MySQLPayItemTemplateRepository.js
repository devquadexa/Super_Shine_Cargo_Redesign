const IPayItemTemplateRepository = require('../../../domain/repositories/IPayItemTemplateRepository');
const BaseMySQLRepository = require('./BaseMySQLRepository');

class MySQLPayItemTemplateRepository extends BaseMySQLRepository {
  constructor(dbConnection) {
    super(dbConnection);
  }

  async getByCategory(shipmentCategory) {
    let rows = await this.prisma.payitemtemplates.findMany({
      where: { shipmentCategory, isActive: true },
      orderBy: { itemOrder: 'asc' }
    });

    const isNewVehicleCategory = shipmentCategory === 'Vehicle - Personal' || shipmentCategory === 'Vehicle - Company';
    if (rows.length === 0 && isNewVehicleCategory) {
      rows = await this.prisma.payitemtemplates.findMany({
        where: { shipmentCategory: 'Vehicle', isActive: true },
        orderBy: { itemOrder: 'asc' }
      });
    }
    return rows;
  }

  async getAll() {
    const rows = await this.prisma.payitemtemplates.findMany({
      where: { isActive: true },
      orderBy: [
        { shipmentCategory: 'asc' },
        { itemOrder: 'asc' }
      ]
    });

    const grouped = {};
    rows.forEach(item => {
      if (!grouped[item.shipmentCategory]) grouped[item.shipmentCategory] = [];
      grouped[item.shipmentCategory].push(item);
    });
    return grouped;
  }

  async create(templateData) {
    let itemOrder = templateData.itemOrder;
    if (itemOrder === undefined || itemOrder === null) {
      const maxOrder = await this.prisma.payitemtemplates.aggregate({
        where: { shipmentCategory: templateData.shipmentCategory },
        _max: { itemOrder: true }
      });
      itemOrder = ((maxOrder._max && maxOrder._max.itemOrder) || 0) + 1;
    }

    return await this.prisma.payitemtemplates.create({
      data: {
        shipmentCategory: templateData.shipmentCategory,
        itemName: templateData.itemName,
        itemOrder,
        isActive: true,
        createdDate: new Date()
      }
    });
  }

  async update(templateId, templateData) {
    return await this.prisma.payitemtemplates.update({
      where: { templateId: parseInt(templateId, 10) },
      data: { itemName: templateData.itemName }
    });
  }

  async delete(templateId) {
    await this.prisma.payitemtemplates.update({
      where: { templateId: parseInt(templateId, 10) },
      data: { isActive: false }
    });
    return { success: true };
  }

  async reorder(shipmentCategory, items) {
    if (!items || items.length === 0) return { success: true };
    await this.prisma.$transaction(
      items.map((item, i) =>
        this.prisma.payitemtemplates.update({
          where: { templateId: parseInt(item.templateId, 10) },
          data: { itemOrder: i + 1 }
        })
      )
    );
    return { success: true };
  }
}

module.exports = MySQLPayItemTemplateRepository;
