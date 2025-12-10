import { NextFunction, Request, Response } from 'express';

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  console.log(err);

  return res.status(err?.status || 500).json({
    message: err?.message || 'Internal server error',
  });
};
