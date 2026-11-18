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

/**
 * Money / confirm flows that should prefer FIFO (ordered, deduped).
 * Call sites can still pass isFifo explicitly; this list is documentation + helper.
 */
export const FIFO_EVENT_TYPES = new Set<string>([
  'wallet.created',
  'wallet.diposit',
  'wallet.add.payment',
  'add.balance',
  'transaction.created',
  'coupon.used',
]);

export function queueUrlEnvName(service: string, isFifo = false): string {
  return isFifo
    ? `${service.toUpperCase()}_SQS_FIFO_QUEUE_URL`
    : `${service.toUpperCase()}_SQS_QUEUE_URL`;
}

export function getQueueUrlForEvent(
  eventType: string,
  isFifo = false,
): string | undefined {
  const service = EVENT_SERVICE_MAP[eventType];
  if (!service) return undefined;

  if (isFifo) {
    return (
      process.env[queueUrlEnvName(service, true)] ??
      process.env.SQS_FIFO_QUEUE_URL
    );
  }

  // Production: per-service queue. Development: shared SQS_QUEUE_URL fallback.
  return process.env[queueUrlEnvName(service, false)] ?? process.env.SQS_QUEUE_URL;
}

export function isFifoEvent(eventType: string): boolean {
  return FIFO_EVENT_TYPES.has(eventType);
}
