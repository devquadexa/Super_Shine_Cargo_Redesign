const jwt = require('jsonwebtoken');
const tenantContext = require('../infrastructure/tenancy/tenantContext');
const catalog = require('../infrastructure/tenancy/catalog');

const MULTI_TENANT = process.env.MULTI_TENANT === 'true';
const JWT_SECRET = process.env.JWT_SECRET || 'super-shine-cargo-secret-key-2024';

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      throw new Error('No token provided');
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;

    // In multi-tenant mode the JWT tenant claim is authoritative: re-establish
    // the tenant context from it so all DB access targets the caller's database.
    if (MULTI_TENANT) {
      if (!decoded.tenantId) {
        return res.status(401).json({ message: 'Token missing tenant context. Please log in again.' });
      }
      const tenant = await catalog.getTenantById(decoded.tenantId);
      if (!tenant) {
        return res.status(401).json({ message: 'Tenant no longer active.' });
      }
      tenantContext.setTenant(tenant);
      req.tenant = tenant;
    }

    next();
  } catch (error) {
    res.status(401).json({ message: 'Please authenticate' });
  }
};

const checkRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    next();
  };
};

module.exports = { auth, checkRole, JWT_SECRET };
