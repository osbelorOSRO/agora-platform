import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { PrismaInstrumentation } from '@prisma/instrumentation';
import { NestInstrumentation } from '@opentelemetry/instrumentation-nestjs-core';
import { PinoInstrumentation } from '@opentelemetry/instrumentation-pino';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';

// Si OTEL_ENABLED=false o no está seteado, el SDK no arranca
if (process.env.OTEL_ENABLED !== 'true') {
  // eslint-disable-next-line no-console
  console.log('[tracing] OTEL_ENABLED != true — OpenTelemetry deshabilitado');
} else {
  const exporter = new OTLPTraceExporter({
    url:
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT ??
      'http://otel-collector:4318/v1/traces',
  });

  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME ?? 'api-backend-nest',
      [ATTR_SERVICE_VERSION]: process.env.npm_package_version ?? '3.0.0',
    }),
    spanProcessor: new BatchSpanProcessor(exporter),
    instrumentations: [
      getNodeAutoInstrumentations({
        // fs muy verboso — off
        '@opentelemetry/instrumentation-fs': { enabled: false },
        // dns resolutions son ruido en este contexto
        '@opentelemetry/instrumentation-dns': { enabled: false },
      }),
      new NestInstrumentation(),
      new PrismaInstrumentation(),
      new PinoInstrumentation(),
    ],
  });

  sdk.start();

  process.on('SIGTERM', () => {
    sdk
      .shutdown()
      .catch((err) => console.error('[tracing] Error al apagar SDK:', err))
      .finally(() => process.exit(0));
  });
}
