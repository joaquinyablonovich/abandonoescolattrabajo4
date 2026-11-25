import type { ApiRequest, ApiResponse } from './handlers.ts';

export function callHandler(handler: (req: ApiRequest, res: ApiResponse) => void, body?: unknown, method = 'POST') {
  const output = { status: 200, body: null as any, headers: {} as Record<string, string> };
  const response: ApiResponse = {
    status(code) { output.status = code; return response; },
    json(payload) { output.body = payload; },
    setHeader(name, value) { output.headers[name] = value; },
  };
  handler({ method, body }, response);
  return output;
}
