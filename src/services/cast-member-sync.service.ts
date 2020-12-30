import {bind, /* inject, */ BindingScope} from '@loopback/core';
import { repository } from '@loopback/repository';
import { Message } from 'amqplib';
import { rabbitmqSubcribe } from '../decorators';
import { CastMemberRepository } from '../repositories';
import { ResponseEnum } from '../servers';
import { BaseModelSyncService } from './base-model-sync.service';

@bind({scope: BindingScope.SINGLETON})
export class CastMemberSyncService extends BaseModelSyncService {
  constructor(
    @repository(CastMemberRepository) private repo: CastMemberRepository,
  ) {
    super();
  }

  @rabbitmqSubcribe({
    exchange: 'amq.topic',
    queue: 'micro-catalog/sync-videos/cast_member',
    routingKey: 'model.cast_member.*'
  })
  async handler({data, message}: {data: any, message: Message}) {
    await this.sync({ repo: this.repo, data, message });
    return ResponseEnum.ACK;
  }
}
