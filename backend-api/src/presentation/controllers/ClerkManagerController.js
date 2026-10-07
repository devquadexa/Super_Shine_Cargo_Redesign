const mysqlDb = require('../../config/mysqlDatabase');

class ClerkManagerController {
  constructor(container) {
    this.container = container;
  }

  /**
   * Get all wharf clerks with their currently assigned manager and request threshold,
   * plus the list of all eligible managers/admins.
   */
  async getAll(req, res) {
    try {
      // 1. Fetch all wharf clerks with assigned manager and threshold info
      const clerksSql = `
        SELECT 
          u.userId,
          u.username,
          u.fullName,
          u.role,
          u.email,
          u.isActive,
          cma.managerId AS assignedManagerId,
          m.fullName AS assignedManagerName,
          m.role AS assignedManagerRole,
          cma.requestThreshold,
          cma.assignedDate
        FROM users u
        LEFT JOIN clerk_manager_assignments cma ON u.userId = cma.clerkId
        LEFT JOIN users m ON cma.managerId = m.userId
        WHERE u.role = 'Waff Clerk' AND u.isActive = 1
        ORDER BY u.fullName ASC
      `;
      const rows = await mysqlDb.query(clerksSql);
      const clerks = (rows || []).map(r => ({
        ...r,
        requestThreshold: (r.requestThreshold !== null && r.requestThreshold !== undefined)
          ? parseFloat(r.requestThreshold)
          : null
      }));

      // 2. Fetch all eligible managers (Manager, Admin, Super Admin)
      const managersSql = `
        SELECT 
          userId,
          username,
          fullName,
          role
        FROM users
        WHERE role IN ('Manager', 'Admin', 'Super Admin') AND isActive = 1
        ORDER BY FIELD(role, 'Manager', 'Admin', 'Super Admin'), fullName ASC
      `;
      const managers = await mysqlDb.query(managersSql);

      res.json({
        clerks: clerks || [],
        managers: managers || []
      });
    } catch (error) {
      console.error('Error fetching clerk-manager mappings:', error);
      res.status(500).json({ message: 'Error fetching clerk manager assignments', error: error.message });
    }
  }

  /**
   * Get the calling user's request threshold limit (used by wharf clerks on job & request modals)
   */
  async getMyThreshold(req, res) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.json({ requestThreshold: null });
      }

      const rows = await mysqlDb.query(
        'SELECT requestThreshold FROM clerk_manager_assignments WHERE clerkId = ? LIMIT 1',
        [userId]
      ).catch(() => []);

      const threshold = (rows && rows[0] && rows[0].requestThreshold !== null && rows[0].requestThreshold !== undefined)
        ? parseFloat(rows[0].requestThreshold)
        : null;

      res.json({ requestThreshold: threshold });
    } catch (error) {
      console.error('Error fetching user threshold:', error);
      res.status(500).json({ message: 'Error fetching threshold', error: error.message });
    }
  }

  /**
   * Assign or unassign a manager, and set/update request threshold for a specific wharf clerk
   */
  async update(req, res) {
    try {
      const { clerkId } = req.params;
      const { managerId, requestThreshold } = req.body;
      const updatedBy = req.user?.userId || null;

      // Validate clerk exists and is a Waff Clerk
      const checkClerk = await mysqlDb.query(
        'SELECT userId, fullName FROM users WHERE userId = ? AND role = "Waff Clerk"',
        [clerkId]
      );
      if (!checkClerk || checkClerk.length === 0) {
        return res.status(404).json({ message: 'Wharf clerk not found' });
      }

      // Parse request threshold
      let parsedThreshold = null;
      if (requestThreshold !== undefined && requestThreshold !== null && requestThreshold !== '') {
        const num = parseFloat(requestThreshold);
        if (!isNaN(num) && num > 0) {
          parsedThreshold = num;
        }
      }

      // Parse managerId
      let finalManagerId = null;
      if (managerId && String(managerId).trim()) {
        finalManagerId = String(managerId).trim();
        // Validate manager exists
        const checkManager = await mysqlDb.query(
          'SELECT userId, fullName, role FROM users WHERE userId = ? AND role IN ("Manager", "Admin", "Super Admin")',
          [finalManagerId]
        );
        if (!checkManager || checkManager.length === 0) {
          return res.status(404).json({ message: 'Selected manager not found' });
        }
      }

      if (!finalManagerId && parsedThreshold === null) {
        // Neither manager nor threshold set - remove record
        await mysqlDb.query('DELETE FROM clerk_manager_assignments WHERE clerkId = ?', [clerkId]);
        return res.json({ 
          success: true, 
          message: `Settings reset for ${checkClerk[0].fullName}. No limit and broadcast to any manager.` 
        });
      }

      // Insert or update mapping with requestThreshold
      const upsertSql = `
        INSERT INTO clerk_manager_assignments (clerkId, managerId, requestThreshold, updatedBy, assignedDate)
        VALUES (?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE 
          managerId = VALUES(managerId),
          requestThreshold = VALUES(requestThreshold),
          updatedBy = VALUES(updatedBy),
          assignedDate = NOW()
      `;
      await mysqlDb.query(upsertSql, [clerkId, finalManagerId, parsedThreshold, updatedBy]);

      res.json({
        success: true,
        message: `Rules updated for ${checkClerk[0].fullName}: Limit ${parsedThreshold ? `LKR ${parsedThreshold.toLocaleString()}` : 'Unlimited'}, Manager: ${finalManagerId ? 'Assigned' : 'Broadcast'}.`
      });
    } catch (error) {
      console.error('Error updating clerk-manager mapping:', error);
      res.status(500).json({ message: 'Error updating clerk manager assignment', error: error.message });
    }
  }

  /**
   * Batch update multiple clerk-manager assignments & thresholds at once
   */
  async updateBatch(req, res) {
    try {
      const { assignments } = req.body;
      if (!Array.isArray(assignments)) {
        return res.status(400).json({ message: 'Assignments must be an array' });
      }

      const updatedBy = req.user?.userId || null;

      for (const item of assignments) {
        const { clerkId, managerId, requestThreshold } = item;
        if (!clerkId) continue;

        let parsedThreshold = null;
        if (requestThreshold !== undefined && requestThreshold !== null && requestThreshold !== '') {
          const num = parseFloat(requestThreshold);
          if (!isNaN(num) && num > 0) {
            parsedThreshold = num;
          }
        }

        const finalManagerId = (managerId && String(managerId).trim()) ? String(managerId).trim() : null;

        if (!finalManagerId && parsedThreshold === null) {
          await mysqlDb.query('DELETE FROM clerk_manager_assignments WHERE clerkId = ?', [clerkId]);
        } else {
          const upsertSql = `
            INSERT INTO clerk_manager_assignments (clerkId, managerId, requestThreshold, updatedBy, assignedDate)
            VALUES (?, ?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE 
              managerId = VALUES(managerId),
              requestThreshold = VALUES(requestThreshold),
              updatedBy = VALUES(updatedBy),
              assignedDate = NOW()
          `;
          await mysqlDb.query(upsertSql, [clerkId, finalManagerId, parsedThreshold, updatedBy]);
        }
      }

      res.json({
        success: true,
        message: 'All clerk rules (manager routing & request thresholds) updated successfully.'
      });
    } catch (error) {
      console.error('Error batch updating clerk-manager mappings:', error);
      res.status(500).json({ message: 'Error batch updating assignments', error: error.message });
    }
  }
}

module.exports = ClerkManagerController;
