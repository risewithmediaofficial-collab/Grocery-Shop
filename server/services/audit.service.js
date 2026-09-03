const { AuditLog } = require('../models/System');

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
    // Log failure silently — audit errors must not interrupt the request flow
    console.error('Audit log error:', err.message);
  }
};
