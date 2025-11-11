import { getFrontendMetrics, metricsContentType } from '@/lib/metrics';

export const runtime = 'nodejs';
export const revalidate = 0;

export async function GET() {
  const body = await getFrontendMetrics();

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': metricsContentType,
      'Cache-Control': 'no-store',
    },
  });
}
