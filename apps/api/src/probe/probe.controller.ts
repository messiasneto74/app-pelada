import { Body, Controller, Post } from '@nestjs/common';
import { ProbeValidateDto } from './probe.dto';

@Controller('_probe')
export class ProbeController {
  @Post('validate')
  validate(@Body() body: ProbeValidateDto) {
    return { ok: true, name: body.name };
  }
}
