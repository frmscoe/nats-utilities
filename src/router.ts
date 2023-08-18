import Router from 'koa-router';
import { healthCheck } from './health.controller';
import { natsConsume, natsLoadTest, natsPublish } from './app.controller';


const router = new Router();

// health checks
router.get('/', healthCheck);
router.get('/health', healthCheck);

// execute the service Pain001
router.post('/natsPublish', natsPublish);
router.post('/natsLoadTest', natsLoadTest)
router.post('/natsConsume', natsConsume)

export default router;
