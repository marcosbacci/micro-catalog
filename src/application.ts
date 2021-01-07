import {BootMixin} from '@loopback/boot';
import {Application, ApplicationConfig} from '@loopback/core';
import { RestExplorerBindings } from '@loopback/rest-explorer';
import {RepositoryMixin} from '@loopback/repository';
import {ServiceMixin} from '@loopback/service-proxy';
import path from 'path';
import {MySequence} from './sequence';
import { RabbitmqServer } from './servers';
import { RestComponent, RestServer } from '@loopback/rest';
import { EntityComponent, RestExplorerComponent, ValidatorsComponent } from './components';

export class MicroCatalogApplication extends BootMixin(
  ServiceMixin(RepositoryMixin(Application)),
) {
  constructor(options: ApplicationConfig = {}) {
    super(options);

    options.rest.sequence = MySequence;
    this.component(RestComponent);
    const restServer = this.getSync<RestServer>('servers.RestServer');
    restServer.static('/', path.join(__dirname, '../public'));

    // Customize @loopback/rest-explorer configuration here
    this.bind(RestExplorerBindings.CONFIG).to({
      path: '/explorer',
    });
    this.component(RestExplorerComponent);
    this.component(ValidatorsComponent);
    this.component(EntityComponent);

    this.projectRoot = __dirname;
    // Customize @loopback/boot Booter Conventions here
    this.bootOptions = {
      controllers: {
        // Customize ControllerBooter Conventions here
        dirs: ['controllers'],
        extensions: ['.controller.js'],
        nested: true,
      },
    };

    this.servers([RabbitmqServer])
  }

  async boot() {
    await super.boot();

    // const categoryRepo = this.getSync('repositories.CategoryRepository');
    // // @ts-ignore
    // const category = await categoryRepo.find({where: {id: '3-cast'}});
    // // @ts-ignore
    // categoryRepo.updateById(category[0].id, {...category[0], name: "Infantil"});

    // const validator = this.getSync<ValidatorService>('services.ValidatorService');
    // try {
    //   await validator.validate(
    //     {
    //       data: {
    //         id: '1-cast'
    //       },
    //       entityClass: Category
    //     }
    //   )
    // } catch (error) {
    //   console.dir(error, {depth: 8});
    // }

    // try {
    //   await validator.validate(
    //     {
    //       data: {},
    //       entityClass: Genre
    //     }
    //   )
    // } catch (error) {
    //   console.dir(error, {depth: 8});
    // }
  }
}
