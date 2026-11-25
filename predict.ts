import { handlePredict, type ApiRequest, type ApiResponse } from './handlers.ts';

export default function handler(req: ApiRequest, res: ApiResponse) {
  return handlePredict(req, res);
}
