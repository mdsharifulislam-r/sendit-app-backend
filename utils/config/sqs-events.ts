/** Maps SNS/SQS event types to the service that consumes them. */
export const EVENT_SERVICE_MAP: Record<string, string> = {
  'email.send': 'communication',
  'notification.send': 'communication',
  'chat.create': 'communication',
  'chat.report.create': 'communication',
  'wallet.created': 'payment',
  'wallet.diposit': 'payment',
  'wallet.add.payment': 'payment',
  'add.balance': 'payment',
  'transaction.created': 'payment',
  'coupon.used': 'payment',
  'audit.create': 'admin',
  'audit.log.create': 'admin',
  'risk.item.create': 'admin',
  'device.create': 'root',
  'referral.create': 'root',
  'review.calculate': 'trip',
  'qr.code.generate': 'booking',
};

export function queueUrlEnvName(service: string): string {
  return `${service.toUpperCase()}_SQS_QUEUE_URL`;
}

export function getQueueUrlForEvent(eventType: string): string | undefined {
  const service = EVENT_SERVICE_MAP[eventType];
  if (!service) return undefined;
  return process.env[queueUrlEnvName(service)];
}
