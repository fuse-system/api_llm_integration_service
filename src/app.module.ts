import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { AppController } from './controllers/app.controller';
import { AppService } from './services/app.service';
// import { MongodbModule } from './config/mongodb.module';
import { HttpModule } from '@nestjs/axios';
import { AuthApiService } from './api-services/auth-api/auth-api.service';
import { CheckHeaderMiddleware } from './core/platform-key-middleware/check-header.middleware';
import { JwtStrategy } from './core/jwt-auth-guard/jwt.strategy';
import { RabbitMqConfigModule } from './config/rabbitmq-config.module';
import { GeminiController } from './controllers/gemini.controller';
import { GeminiAiService } from './services/gemini.service';
import { ClaudeAiService } from './services/claude.service';
import { ClaudeController } from './controllers/claude.controller';

@Module({
  imports: [HttpModule, RabbitMqConfigModule],
  controllers: [AppController, GeminiController, ClaudeController],
  providers: [
    AppService,
    AuthApiService,
    JwtStrategy,
    GeminiAiService,
    ClaudeAiService,
  ],
})
export class AppModule implements NestModule {
  // MiddlewareConsumer is used to configure the middleware vvv
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CheckHeaderMiddleware /* , otherMiddleWare */)
      .forRoutes(
        { path: '*', method: RequestMethod.ALL } /* OR AppController */,
      );
    /*  // to implement other middleware:
         consumer
              .apply(NewMiddleware)
              .forRoutes({ path: 'demo', method: RequestMethod.GET });*/
  }
}
