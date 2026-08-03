import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { SnsService } from 'utils/helper-modules/sns/sns.service';
import { StripeService } from 'utils/helper-modules/stripe/stripe.service';
import { WalletService } from './wallet/wallet.service';
import { BookingService } from 'apps/booking/src/booking.service';

@Injectable()
export class PaymentService {
  constructor(private readonly stripeService: StripeService,
    private readonly configService: ConfigService,
    private readonly snsService: SnsService,
    private readonly walletService: WalletService,
    private readonly bookingService: BookingService
  ) { }

  async handleWebhook(req: Request, res: Response) {
    try {
      // 1. Get the signature header and the raw request body buffer
      const sig = req.headers['stripe-signature'] as string;
      const rawBody = (req as any).rawBody;

      if (!rawBody) {
        throw new Error('Raw body not found. Make sure NestJS rawBody is enabled in main.ts.');
      }

      // 2. Verify it’s really from Stripe
      const event = this.stripeService.getClient().webhooks.constructEvent(
        rawBody,
        sig,
        this.configService.get<string>("STRIPE_WEBHOOK_SECRET")!
      );

      // 3. Handle the event
      switch (event.type) {
        case 'checkout.session.completed':
          const session = event.data.object;
          const metadata = session?.metadata;
          console.log(metadata);

          if (metadata?.wallet_id) {
            await this.walletService.dipositWallet({ wallet_id: metadata.wallet_id, amount: Number(metadata.amount) })
          }

          if (metadata?.userId && metadata?.trip_id && metadata.session_id) {
            await this.bookingService.placeBooking(metadata.userId, metadata.session_id, metadata.trip_id, metadata?.coupon, session.payment_intent as string)
          }

          break;

        // handle other events as needed (invoices, refunds, disputes, etc.)
        case 'account.updated':
          const account = event.data.object;
          await this.walletService.verifyConnectedAccount(account);
          break;
        default:
          console.log(`Unhandled event type ${event.type}`);
      }

      // 4. Respond to Stripe to acknowledge receipt (200 OK)
      res.status(200).send();
    } catch (err) {
      // 5. Log the error and return 400
      console.error('Webhook error:', err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
    }
  }


}
