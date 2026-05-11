import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OpenInferenceSimpleSpanProcessor, isOpenInferenceSpan } from "@arizeai/openinference-vercel";

let headers: Record<string, string> | undefined = undefined;
if (process.env.PHOENIX_CLIENT_HEADERS) {
  try {
    headers = JSON.parse(process.env.PHOENIX_CLIENT_HEADERS);
  } catch (e) {
    console.warn("Could not parse PHOENIX_CLIENT_HEADERS as JSON. Ignoring.");
  }
}

const exporter = new OTLPTraceExporter({
  url: process.env.PHOENIX_COLLECTOR_ENDPOINT || 'http://localhost:6006/v1/traces',
  headers: headers,
});

const processor = new OpenInferenceSimpleSpanProcessor({
  exporter,
  spanFilter: isOpenInferenceSpan,
});

export const sdk = new NodeSDK({
  spanProcessors: [processor]
});
