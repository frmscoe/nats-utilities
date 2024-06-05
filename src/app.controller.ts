// SPDX-License-Identifier: Apache-2.0

import { type Context } from 'koa';
import { config } from './config';
import { loggerService } from '.';
import { jetStreamConsume, jetStreamPublish, onJetStreamMessage } from './services/jetStreamService';
import { natsServiceSubscribe, natsServicePublish, onMessage } from './services/natsService';
import axios from 'axios';

export const tms = async (ctx: Context): Promise<unknown> => {
  const { body } = ctx.request;
  let responseHttp: any = {};
  try {
    const { transaction, endpoint, natsConsumer, functionName } = body as any;

    let returnMessage;
    let subscription;

    switch (config.startupType) {
      case 'jetstream':
        let consumer = await jetStreamConsume(natsConsumer, functionName);
        returnMessage = onJetStreamMessage(consumer);
        const httpReponseJetStream = await axios.post(endpoint, transaction);
        await returnMessage.then((message) => {
          returnMessage = message;
        });

        responseHttp.tmsResponse = httpReponseJetStream.data;
        responseHttp.edResponse = returnMessage;
        break;

      case 'nats':
        loggerService.log(`nats communication was triggered`);
        subscription = await natsServiceSubscribe(natsConsumer, functionName);
        loggerService.log(`Subscription to ${String(natsConsumer)} was done`);
        returnMessage = onMessage(subscription.subscription);
        const httpResponseNATS = await axios.post(endpoint, transaction);
        loggerService.log(`REST Publish to ${String(endpoint)} was done`);
        await returnMessage.then((message) => {
          returnMessage = message;
        });

        responseHttp.tmsResponse = httpResponseNATS.data;
        responseHttp.edResponse = returnMessage;
        break;
      default:
        break;
    }

    const resps = await axios.post(endpoint, transaction);
    ctx.body = responseHttp;
    ctx.status = resps.status;
  } catch (error) {
    loggerService.log(error as string);

    ctx.status = 500;
    ctx.body = {
      error,
    };
  }
  return ctx;
};

export const natsPublish = async (ctx: Context): Promise<any> => {
  try {
    const request = ctx.request.body ?? JSON.parse('');
    const natsDestination = request.destination;
    const natsConsumer = request.consumer;
    const functionName = request.functionName;

    loggerService.log(`${String(natsConsumer)} sub - ${String(natsDestination)} pub - ${String(functionName)} Function name`);

    let returnMessage;
    let subscription;
    let consumer;

    switch (config.startupType) {
      case 'jetstream':
        consumer = await jetStreamConsume(natsConsumer, functionName);
        returnMessage = onJetStreamMessage(consumer);
        await jetStreamPublish(request.message, natsDestination);
        await returnMessage.then((message) => {
          returnMessage = message;
        });
        break;

      case 'nats':
        loggerService.log(`nats communication was triggered`);
        subscription = await natsServiceSubscribe(natsConsumer, functionName);
        loggerService.log(`Subscription to ${String(natsConsumer)} was done`);
        returnMessage = onMessage(subscription.subscription);
        natsServicePublish(subscription.natsCon, request.message, natsDestination);
        loggerService.log(`Publish to ${String(natsDestination)} was done`);
        await returnMessage.then((message) => {
          returnMessage = message;
        });
        break;
      default:
        break;
    }

    ctx.status = 200;
    ctx.body = {
      message: 'Transaction is valid',
      data: returnMessage,
    };
  } catch (error) {
    loggerService.log(error as string);

    ctx.status = 500;
    ctx.body = {
      error,
    };
  }
  return ctx;
};
