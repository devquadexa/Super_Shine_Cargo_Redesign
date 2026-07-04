/**
 * Auth Controller
 */
const tenantContext = require('../../infrastructure/tenancy/tenantContext');
const catalog = require('../../infrastructure/tenancy/catalog');

const MULTI_TENANT = process.env.MULTI_TENANT === 'true';

class AuthController {
  constructor(container) {
    this.authenticateUser = container.get('authenticateUser');
    this.userRepository = container.get('userRepository');
  }

  async login(req, res) {
    try {
      const { username, password } = req.body;

      let tenantId = null;
      if (MULTI_TENANT) {
        // Prefer the tenant resolved from subdomain / header / login slug.
        let tenant = req.tenant || tenantContext.getTenant();

        // Fallback: resolve tenant from the username directory when no slug or
        // subdomain was supplied (single-tenant-per-user is the common case).
        if (!tenant) {
          const matches = await catalog.findTenantsForUsername(username);
          if (matches.length === 1) {
            tenant = matches[0];
            tenantContext.setTenant(tenant);
          } else if (matches.length > 1) {
            return res.status(409).json({
              message: 'This username exists in multiple workspaces. Please specify a tenant.',
              tenants: matches.map(t => ({ slug: t.slug, name: t.name })),
            });
          }
        }

        if (!tenant) {
          return res.status(400).json({ message: 'Unable to determine tenant for this login.' });
        }
        tenantId = tenant.tenantId;
      }

      const result = await this.authenticateUser.execute(username, password, tenantId);
      res.json(result);
    } catch (error) {
      console.error('Login error:', error.message);
      res.status(401).json({ message: error.message });
    }
  }

  async getMe(req, res) {
    try {
      const user = await this.userRepository.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json(user.toSafeObject());
    } catch (error) {
      console.error('Get me error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  async getUsers(req, res) {
    try {
      const users = await this.userRepository.findAll();
      res.json(users.map(u => u.toSafeObject()));
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  async register(req, res) {
    try {
      const { username, password, fullName, email, role } = req.body;
      
      // Check if user already exists
      const existingUser = await this.userRepository.findByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: 'Username already exists' });
      }

      // Generate new user ID
      const userId = await this.userRepository.generateNextId();
      
      // Hash the password (temporary password provided by Super Admin)
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create user with temporary password flags
      const User = require('../../domain/entities/User');
      const newUser = new User({
        userId,
        username,
        password: hashedPassword,
        fullName,
        email,
        role: role || 'Waff Clerk',
        createdDate: new Date(),
        isActive: true,
        isTemporaryPassword: true,  // Mark as temporary password
        passwordResetRequired: true, // Require password reset on first login
        lastPasswordChange: new Date()
      });

      await this.userRepository.create(newUser);
      
      res.status(201).json({ 
        message: 'User created successfully. The user must reset their password on first login.',
        user: newUser.toSafeObject()
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ message: error.message || 'Error creating user' });
    }
  }
}

module.exports = AuthController;
