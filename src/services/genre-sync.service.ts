import {bind, /* inject, */ BindingScope} from '@loopback/core';
import { repository } from '@loopback/repository';
import { Message } from 'amqplib';
import { rabbitmqSubcribe } from '../decorators';
import { GenreRepository } from '../repositories';

@bind({scope: BindingScope.TRANSIENT})
export class GenreSyncService {
  constructor(
    @repository(GenreRepository) private repo: GenreRepository,
  ) {}

  @rabbitmqSubcribe({
    exchange: 'amq.topic',
    queue: 'micro-catalog/sync-videos/genre',
    routingKey: 'model.genre.*'
  })
  async handler({data, message}: {data: any, message: Message}) {
    const action = message.fields.routingKey.split('.')[2];
    switch (action) {
      case 'created':
        await this.repo.create(data);
        break;
      case 'updated':
        await this.repo.updateById(data.id, data);
        break;
      case 'deleted':
        await this.repo.deleteById(data.id);
        break;
    }
  }
}
