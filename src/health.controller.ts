import { type Context, type Next } from 'koa';
import { loggerService } from '.';

export const healthCheck = async (ctx: Context, next: Next): Promise<Context> => {
  ctx.status = 200;
  ctx.body = { status: 'UP' };
  loggerService.log('Health Check Request Executed');
  await next();

  return ctx;
};
