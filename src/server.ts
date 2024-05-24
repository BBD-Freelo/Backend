import { Application, Router, RequestHandler, IRouter, NextFunction  } from 'express';
import { controller } from './interfaces';
import { HttpMethods } from './types';
import { Logger } from "./logging/logger";

function isHttpMethod(method: string): method is HttpMethods {
  return (
    method === 'get' ||
    method === 'post' ||
    method === 'put' ||
    method === 'delete' ||
    method === 'patch' ||
    method === 'options' ||
    method === 'head'
  );
}

function errorWrapper(handler: RequestHandler): RequestHandler {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      Logger.error(errorMessage);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };
}
export function registerControllers(app: Application, controllers: controller[]) {
  controllers.forEach((controller) => {
    const router = Router();
    for (const [key, value] of Object.entries(controller.endpoints)) {
      const method: string = value.method;
      if (isHttpMethod(method)) {
        const wrappedHandler = errorWrapper(value.handler as RequestHandler);
        (router as IRouter)[method](key, wrappedHandler);
      } else {
        console.warn(`Invalid HTTP method: ${method}`);
      }
    }
    app.use(controller.endpoint, router);
  });
}
