import {
  context,
  propagation,
  trace,
  SpanStatusCode,
} from '@opentelemetry/api';

export function injectOtelToJob(): Record<string, string> {
  const carrier: Record<string, string> = {};
  propagation.inject(context.active(), carrier);
  return carrier;
}

export async function withJobSpan<T>(
  otelCarrier: Record<string, string> | undefined,
  spanName: string,
  fn: () => Promise<T>,
): Promise<T> {
  const parentCtx = propagation.extract(context.active(), otelCarrier ?? {});
  const tracer = trace.getTracer('agora-bullmq');
  return context.with(parentCtx, async () => {
    const span = tracer.startSpan(spanName);
    return context.with(trace.setSpan(context.active(), span), async () => {
      try {
        const result = await fn();
        span.end();
        return result;
      } catch (err) {
        span.recordException(err as Error);
        span.setStatus({ code: SpanStatusCode.ERROR });
        span.end();
        throw err;
      }
    });
  });
}
