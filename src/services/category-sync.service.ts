import {bind, /* inject, */ BindingScope} from '@loopback/core';
import { repository } from '@loopback/repository';
import { Message } from 'amqplib';
import { rabbitmqSubcribe } from '../decorators';
import { CategoryRepository } from '../repositories';
import { ResponseEnum } from '../servers';
import { BaseModelSyncService } from './base-model-sync.service';

@bind({scope: BindingScope.SINGLETON})
export class CategorySyncService extends BaseModelSyncService {
  constructor(
    @repository(CategoryRepository) private repo: CategoryRepository,
  ) {
    super();
  }

  @rabbitmqSubcribe({
    exchange: 'amq.topic',
    queue: 'micro-catalog/sync-videos/category',
    routingKey: 'model.category.*'
  })
  async handler({data, message}: {data: any, message: Message}) {
    await this.sync({ repo: this.repo, data, message });
    return ResponseEnum.ACK;
  }
}
