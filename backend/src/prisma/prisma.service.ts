/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { INestApplication, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    super({
      log: [
        // { emit: 'event', level: 'query' }, // 👈 capture queries
        { emit: 'stdout', level: 'error' },
        // { emit: 'stdout', level: 'warn' },
      ],
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();

    // 👇 Listen to query events
    (this as any).$on('query', (e: any) => {
      console.log('--- Prisma Query ---');
      console.log('Query:', e.query);
      console.log('Params:', e.params);
      console.log('Duration:', e.duration + 'ms');
      console.log('---------------------');
    });
  }

  enableShutdownHooks(app: INestApplication): void {
    (this as any).$on('beforeExit', async () => {
      await app.close();
    });
  }
}
