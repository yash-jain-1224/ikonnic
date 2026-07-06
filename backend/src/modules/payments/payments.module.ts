import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PhonePeService } from './phonepe.service';
import { StripeService } from './stripe.service';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, PhonePeService, StripeService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
