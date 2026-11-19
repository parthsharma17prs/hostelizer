import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      framework: 'NestJS',
      service: 'hostelizer-backend',
      timestamp: new Date().toISOString()
    };
  }

  @Get('api/v1')
  getApiV1() {
    return {
      success: true,
      data: {
        name: 'Hostelizer Partner Studio API v1',
        framework: 'NestJS',
        status: 'ACTIVE',
        version: '1.0.0',
        architecture: 'Modular NestJS Core'
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    };
  }
}
