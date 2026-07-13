import type { Request } from 'express';

export const getParam = (req: Request, name: string): string => {
  const val = req.params[name];
  return Array.isArray(val) ? val[0] : val;
};
