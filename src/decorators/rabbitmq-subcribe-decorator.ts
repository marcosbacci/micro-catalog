import { MethodDecoratorFactory } from "@loopback/metadata";
import { Options } from "amqplib";

export interface RabbitmqSubcribeMetadata {
  exchange: string;
  routingKey: string | string[];
  queue?: string;
  queueOptions?: Options.AssertQueue;
}

export const RABBITMQ_SUBSCRIBE_DECORATOR = 'rabbitmq-subscribe-decorator';

export function rabbitmqSubcribe(spec: RabbitmqSubcribeMetadata): MethodDecorator {
  return MethodDecoratorFactory.createDecorator<RabbitmqSubcribeMetadata>(
    RABBITMQ_SUBSCRIBE_DECORATOR, spec
  );
}
