import { Request, Response, NextFunction } from 'express';
import { Logger } from '../logging/logger';

export function logRequest(req: Request, res: Response, next: NextFunction) {
  if (req.method === 'GET') {
    Logger.debug(`${req.method} ${req.url}`);
  } else {
    Logger.debug(`${req.method} ${req.url} ${JSON.stringify(req.body)}`);
  }
  next();
}
