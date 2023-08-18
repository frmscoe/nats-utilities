import { NatsConnection, StringCodec, Subscription, connect } from 'nats';
import { config } from '../config';

export const natsServicePublish = async (natsConnection: NatsConnection, message: unknown, producerStreamName: string) => {
  const sc = StringCodec();
  const res = JSON.stringify(message);

  if (producerStreamName && natsConnection) {
    natsConnection.publish(producerStreamName, sc.encode(res));
  }
};

export const natsServiceSubscribe = async (consumerStreamName: string, functionName: string): Promise<any> => {
  const servUrl = config.serverUrl;
  const natsCon = await connect({
    servers: servUrl,
  });
  let subscription = natsCon.subscribe(consumerStreamName, { queue: `${functionName}` });
  return { natsCon, subscription };
};

export const onMessage = async (sub: Subscription) => {
  for await (const message of sub) {
    console.debug(`${Date.now().toLocaleString()} sid:[${message?.sid}] subject:[${message.subject}]: ${message.data.length}`);
    return message.json<string>();
  }
}
