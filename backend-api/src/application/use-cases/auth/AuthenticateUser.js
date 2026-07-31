/**
 * Authenticate User Use Case
 */
const jwt = require('jsonwebtoken');

class AuthenticateUser {
  constructor(userRepository, jwtSecret) {
    this.userRepository = userRepository;
    this.jwtSecret = jwtSecret;
  }

  async execute(username, password, tenantId = null) {
    // Authenticate through repository (runs against the tenant DB in context)
    const user = await this.userRepository.authenticate(username, password);
    
    if (!user) {
      throw new Error('Invalid credentials');
    }

    if (!user.isActive) {
      throw new Error('User account is inactive');
    }

    // Generate JWT token. In multi-tenant mode the tenant claim binds the token
    // to a single tenant database for every subsequent request.
    const payload = {
      userId: user.userId,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
    };
    if (tenantId) {
      payload.tenantId = tenantId;
    }

    const token = jwt.sign(
      payload,
      this.jwtSecret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    return {
      token,
      user: user.toSafeObject()
    };
  }
}

module.exports = AuthenticateUser;
