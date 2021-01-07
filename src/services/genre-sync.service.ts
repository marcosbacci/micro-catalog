import {bind, /* inject, */ BindingScope, service} from '@loopback/core';
import { repository } from '@loopback/repository';
import { Message } from 'amqplib';
import { rabbitmqSubcribe } from '../decorators';
import { CategoryRepository, GenreRepository } from '../repositories';
import { ResponseEnum } from '../servers';
import { BaseModelSyncService } from './base-model-sync.service';
import { ValidatorService } from './validator.service';

@bind({scope: BindingScope.SINGLETON})
export class GenreSyncService extends BaseModelSyncService {
  constructor(
    @repository(GenreRepository) private repo: GenreRepository,
    @repository(CategoryRepository) private categoryRepo: CategoryRepository,
    @service(ValidatorService) private validator: ValidatorService
  ) {
    super(validator);
  }

  @rabbitmqSubcribe({
    exchange: 'amq.topic',
    queue: 'micro-catalog/sync-videos/genre',
    routingKey: 'model.genre.*'
  })
  async handler({data, message}: {data: any, message: Message}) {
    await this.sync({ repo: this.repo, data, message });
    return ResponseEnum.ACK;
  }

  @rabbitmqSubcribe({
    exchange: 'amq.topic',
    queue: 'micro-catalog/sync-videos/genre_categories',
    routingKey: 'model.genre_categories.*'
  })
  async handlerCategories({data, message}: {data: any, message: Message}) {
    await this.syncRelation({
      id: data.id,
      repo: this.repo,
      relationName: "categories",
      relationIds: data.relation_ids,
      relationRepo: this.categoryRepo,
      message
    });
    return ResponseEnum.ACK;
  }
}
