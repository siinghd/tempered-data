import { Request, Response, NextFunction } from 'express';

export const verifyRequestSignature = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const signature = req.headers['x-request-signature'];
  const timestamp = req.headers['x-request-timestamp'];

  if (!signature || !timestamp) {
    return res.status(401).json({ error: 'Missing security headers' });
  }

  const requestTime = parseInt(timestamp as string);
  if (Date.now() - requestTime > 5 * 60 * 1000) {
    return res.status(401).json({ error: 'Request expired' });
  }

  next();
};
