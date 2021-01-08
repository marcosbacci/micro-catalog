import { Binding, Context, inject } from "@loopback/context";
import { MetadataInspector } from "@loopback/metadata";
import { Application, CoreBindings, Server } from "@loopback/core"
import { AmqpConnectionManager, AmqpConnectionManagerOptions, ChannelWrapper, connect } from "amqp-connection-manager";
import { Channel, ConfirmChannel, Message, Options } from 'amqplib';
import { RabbitmqBindings } from "../keys";
import { RabbitmqSubcribeMetadata, RABBITMQ_SUBSCRIBE_DECORATOR } from "../decorators";

export enum ResponseEnum {
  ACK,
  REQUEUE,
  NACK
}

export interface RabbitmqConfig {
  uri: string;
  connOptions: AmqpConnectionManagerOptions;
  exchanges?: { name: string, type: string, options?: Options.AssertExchange}[];
  queues?: {
    name: string,
    options?: Options.AssertQueue,
    exchange?: { name: string, routingKey: string }
  }[];
  defaultHandlerError?: ResponseEnum;
}

export class RabbitmqServer extends Context implements Server {
  listening: boolean
  private _conn: AmqpConnectionManager;
  private _channelManager: ChannelWrapper;
  private maxAttempts = 3;
  //channel: Channel;

  constructor(
    @inject(CoreBindings.APPLICATION_INSTANCE) private app: Application,
    @inject(RabbitmqBindings.CONFIG) private config: RabbitmqConfig
  ) {
    super(app);
  }

  async start(): Promise<void> {
    this._conn = connect([this.config.uri], this.config.connOptions);
    this._channelManager = this.conn.createChannel();
    this.channelManager.on('connect', () => {
      this.listening = true;
      console.log("Conexão com Rabbitmq channel realizada com sucesso");
    });
    this.channelManager.on('error', (err, {name}) => {
      this.listening = false;
      console.log(`Falha com Rabbitmq channel - name: ${name} | error: ${err.message}`);
    });
    await this.setupExchanges();
    await this.setupQueues();
    await this.bindSubscribers();

    //this.boot();
  }

  private async setupExchanges() {
    return this.channelManager.addSetup(async (channel: ConfirmChannel) => {
      if (!this.config.exchanges) {
        return;
      }

      await Promise.all(this.config.exchanges.map((exchange) => (
        channel.assertExchange(exchange.name, exchange.type, exchange.options)
      )));
    });
  }

  private async setupQueues() {
    return this.channelManager.addSetup(async (channel: ConfirmChannel) => {
      if (!this.config.queues) {
        return;
      }

      await Promise.all(this.config.queues.map(async (queue) => {
        await channel.assertQueue(queue.name, queue.options);
        if (!queue.exchange) {
          return;
        }

        await channel.bindQueue(queue.name, queue.exchange.name, queue.exchange.routingKey);
      }));
    });
  }

  private async bindSubscribers() {
    this
      .getSubscribers()
      .map(async (item) => {
        await this.channelManager.addSetup(async (channel: ConfirmChannel) => {
          const {exchange, queue, routingKey, queueOptions} = item.metadata;
          const assertQueue = await channel.assertQueue(
            queue ?? '',
            queueOptions ?? undefined
          );

          const routingKeys = Array.isArray(routingKey) ? routingKey : [routingKey];

          await Promise.all(
            routingKeys.map((routKey) => channel.bindQueue(assertQueue.queue, exchange, routKey))
          );

          await this.consume({
            channel,
            queue: assertQueue.queue,
            method: item.method
          });
        });
      });
  }

  private getSubscribers(): {method: Function, metadata: RabbitmqSubcribeMetadata}[] {
    const bindings: Array<Readonly<Binding>> = this.find('services.*');

    return bindings.map(
      binding => {
        const metadata = MetadataInspector.getAllMethodMetadata<RabbitmqSubcribeMetadata>(
          RABBITMQ_SUBSCRIBE_DECORATOR, binding.valueConstructor?.prototype
        );
        if (!metadata) {
          return [];
        }
        const methods = [];
        for(const methodName in metadata) {
          if (!Object.prototype.hasOwnProperty.call(metadata, methodName)) {
            return;
          }
          const service = this.getSync(binding.key) as any;

          methods.push({
            method: service[methodName].bind(service),
            metadata: metadata[methodName]
          });
        }
        return methods;
      }
    ).reduce((collection: any, item: any) => {
      collection.push(...item);
      return collection;
    }, []);
  }

  private async consume({channel, queue, method}: {channel: ConfirmChannel, queue: string, method: Function}) {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    await channel.consume(queue, async message => {
      try {
        if (!message) {
          throw new Error('Received null message');
        }

        const content = message.content;
        if (content) {
          let data;
          try {
            data = JSON.parse(content.toString());
          } catch (e) {
            data = null;
          }

          const responseType = await method({data, message, channel});
          this.dispatchResponse(channel, message, responseType);
        }
      } catch (e) {
        console.error(e,
          {
            routingKey: message?.fields.routingKey,
            content: message?.content.toString()
          });
        if (!message) {
          return;
        }
        this.dispatchResponse(channel, message, this.config?.defaultHandlerError);
      }
    });
  }

  // async boot() {
  //   this.channel = this.conn.createChannel();
  //   const queue: Replies.AssertQueue = await this.channel.assertQueue('micro-catalog/sync-videos');
  //   const exchange: Replies.AssertExchange = await this.channel.assertExchange('amq.topic', 'topic');

  //   await this.channel.bindQueue(queue.queue, exchange.exchange, 'model.*.*');

  //   //channel.sendToQueue('firt-queue', Buffer.from('Hello world'));
  //   //await channel.publish('amq.direct', 'minha-routing-key', Buffer.from('Publicado por routing key'));

  //   this.channel.consume(queue.queue, message => {
  //     if (!message) {
  //       return;
  //     }
  //     const data = JSON.parse(message.content.toString());
  //     const [model, event] = message.fields.routingKey.split('.').slice(1);
  //     this
  //       .sync({model, event, data})
  //       .then(() => this.channel.ack(message))
  //       .catch(() => this.channel.reject(message, false));
  //   });
  // }

  // async sync({model, event, data}: {model: string, event: string, data: Category}) {
  //   if (model === 'category') {
  //     switch (event) {
  //       case 'created':
  //         await this.categoryRepo.create({
  //           ...data,
  //           created_at: new Date().toISOString(),
  //           updated_at: new Date().toISOString()
  //         });
  //         break;
  //       case 'updated':
  //         await this.categoryRepo.updateById(data.id, data);
  //         break;
  //       case 'deleted':
  //           await this.categoryRepo.deleteById(data.id);
  //           break;
  //     }
  //   }
  // }

  private dispatchResponse(channel: Channel, message: Message, responseType?: ResponseEnum) {
    switch (responseType) {
      case ResponseEnum.REQUEUE:
        channel.nack(message, false, true);
        break;
      case ResponseEnum.NACK:
        if (this.canDeadLetter({channel, message})) {
          console.log('Nack in message', { content: message.content.toString() });
          channel.nack(message, false, false)
        } else {
          channel.ack(message);
        }
        break;
      case ResponseEnum.ACK:
      default:
        channel.ack(message);
        break;
    }
  }

  private canDeadLetter({channel, message}: {channel: Channel, message: Message}) {
    if (message.properties.headers && 'x-death' in message.properties.headers) {
      const count = message.properties.headers['x-death']![0].count;
      if (count >= this.maxAttempts) {
        channel.ack(message);
        const queue = message.properties.headers['x-death']![0].queue;
        console.error(`Ack in ${queue} with error. Max attempts exceed: ${this.maxAttempts}`);
        return false;
      }
    }
    return true;
  }

  async stop(): Promise<void> {
    await this._conn.close();
    this.listening = false;
  }

  get conn(): AmqpConnectionManager {
    return this._conn;
  }

  get channelManager(): ChannelWrapper {
    return this._channelManager;
  }
}
