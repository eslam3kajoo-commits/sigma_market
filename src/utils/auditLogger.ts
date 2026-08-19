import { prisma } from './prisma';

export const auditLogger = {
  async log(action: string, performedBy: string, details: Record<string, any>, ipAddress?: string) {
    const sanitizedDetails = { ...details };
    delete sanitizedDetails.password;
    delete sanitizedDetails.token;
    delete sanitizedDetails.secret;

    const logPayload = {
      timestamp: new Date().toISOString(),
      action,
      performedBy,
      details: sanitizedDetails
    };

    console.log(`[AUDIT_LOG] ${JSON.stringify(logPayload)}`);

    try {
      await prisma.auditLog.create({
        data: {
          userId: (performedBy && performedBy !== 'SYSTEM') ? performedBy : undefined,
          action,
          ipAddress: ipAddress || '127.0.0.1',
          details: JSON.stringify(sanitizedDetails)
        }
      });
    } catch (err) {
      // Silent error handler for background audit log persistence
    }
  }
};
