import {bind, /* inject, */ BindingScope, service} from '@loopback/core';
import { repository } from '@loopback/repository';
import { Message } from 'amqplib';
import { rabbitmqSubcribe } from '../decorators';
import { GenreRepository } from '../repositories';
import { ResponseEnum } from '../servers';
import { BaseModelSyncService } from './base-model-sync.service';
import { ValidatorService } from './validator.service';

@bind({scope: BindingScope.SINGLETON})
export class GenreSyncService extends BaseModelSyncService {
  constructor(
    @repository(GenreRepository) private repo: GenreRepository,
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
}
