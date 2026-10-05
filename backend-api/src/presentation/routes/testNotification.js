/**
 * Test Notification Route
 * Simple endpoint to test if notification creation works
 */
const express = require('express');
const router = express.Router();

module.exports = (container) => {
  // Test endpoint to create a notification
  router.post('/test-create', async (req, res) => {
    try {
      const createNotification = container.get('createNotification');
      
      const testNotification = await createNotification.execute({
        userId: req.body.userId || 'USER0002',
        type: 'JOB_ASSIGNED',
        title: 'Test Notification',
        message: 'This is a test notification created via API',
        relatedId: 'TEST001',
        relatedType: 'TEST',
        metadata: {
          test: true,
          timestamp: new Date().toISOString()
        },
        createdBy: 'SYSTEM'
      });
      
      res.status(200).json({
        success: true,
        message: 'Test notification created successfully',
        notification: testNotification
      });
    } catch (error) {
      console.error('Error creating test notification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create test notification',
        error: error.message
      });
    }
  });
  
  // Test endpoint to check DI container
  router.get('/test-di', async (req, res) => {
    try {
      const createNotification = container.get('createNotification');
      const assignMultipleUsersToJob = container.get('assignMultipleUsersToJob');
      
      const result = {
        createNotification: {
          available: !!createNotification,
          type: typeof createNotification,
          hasExecute: typeof createNotification?.execute === 'function'
        },
        assignMultipleUsersToJob: {
          available: !!assignMultipleUsersToJob,
          type: typeof assignMultipleUsersToJob,
          hasExecute: typeof assignMultipleUsersToJob?.execute === 'function',
          hasCreateNotification: !!assignMultipleUsersToJob?.createNotification
        }
      };
      
      res.status(200).json({
        success: true,
        message: 'DI container check complete',
        result
      });
    } catch (error) {
      console.error('Error checking DI container:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check DI container',
        error: error.message
      });
    }
  });
  
  return router;
};
