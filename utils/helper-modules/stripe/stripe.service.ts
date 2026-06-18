import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Stripe } from 'stripe';
import StripeCl = require('stripe');

@Injectable()
export class StripeService {
    private stripe: Stripe
    constructor(private configService: ConfigService,
    ) {
        this.stripe = new StripeCl(this.configService.get('STRIPE_SECRET_KEY')!)
    }

    getClient() {
        return this.stripe
    }

}
