const { AuditLog } = require('../models/System');

/**
 * Create an audit log entry for any important action
 */
exports.log = async ({ user, action, module, recordId, recordRef, oldValue, newValue, description, ipAddress }) => {
  try {
    await AuditLog.create({
      user: user?._id || user,
      userName: user?.name || 'System',
      action,
      module,
      recordId,
      recordRef,
      oldValue,
      newValue,
      description,
      ipAddress,
    });
  } catch (err) {
    // Non-blocking — audit log failure should not break the main operation
    console.error('Audit log error:', err.message);
  }
};
