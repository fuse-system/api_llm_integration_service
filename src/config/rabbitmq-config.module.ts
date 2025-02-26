import { Global, INestApplication, Module } from '@nestjs/common';
import {
  ClientProviderOptions,
  ClientsModule,
  MicroserviceOptions,
  Transport,
} from '@nestjs/microservices';

//  npm install @nestjs/microservices amqplib amqp-connection-manager
function registerMicroservice(
  ProviderName: string = 'RABBITMQ_SERVICE',
  rabbitmqQueueName: string,
): ClientProviderOptions {
  return {
    name: ProviderName,
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL],
      queue: rabbitmqQueueName,
      queueOptions: {
        durable: false,
      },
    },
  };
}

@Global()
@Module({
  imports: [
    ClientsModule.register([
      /*

      * add more Service Provider here to interact it in Services
      * inject it in the constructor like this:
      * @Inject('RABBITMQ_SERVICE') private readonly client: ClientProxy,
      * then you can emit event like this:
      * this.client.emit<any>('event-name', 'ay haga');
      */
      // registerMicroservice(
      //   'USER_PROFILE_MQ_SERVICE',
      //   'auth_service.to.user_profile_service',
      // ),
      // registerMicroservice('RABBITMQ_SERVICE2', 'fuse8'),
      registerMicroservice('LLM_QUEUE_SERVICE', 'llm_microMotion_queue'),
    ]),
  ],
  exports: [ClientsModule],
})
export class RabbitMqConfigModule {
  static async setup(app: INestApplication<any>) {
    const listenToMicroservice = (rabbitmqQueueName: string) => {
      app.connectMicroservice<MicroserviceOptions>({
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL],
          queue: rabbitmqQueueName,
          queueOptions: {
            durable: false,
          },
        },
      });
    };

    /*
     *  add more microservice Listener to listen to it from outside
     *  on starting of this app
     * you should add event listener in a controller to listen to this microservice
     * like this:
     * @EventPattern('event-name')
     * async handleEventName(data: any) {}
     * */
    // listenToMicroservice('fuse1');
    listenToMicroservice('llm_microMotion_queue');
    listenToMicroservice('audio_lens_queue');
    listenToMicroservice('CHECK_AUDIO_QUEUE');
    await app.startAllMicroservices();
  }
}
