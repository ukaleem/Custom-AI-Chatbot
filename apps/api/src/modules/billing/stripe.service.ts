import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';

type StripeClient = InstanceType<typeof Stripe>;

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly client: StripeClient | null;

  constructor() {
    const key = process.env.STRIPE_SECRET_KEY;
    this.client = key ? new Stripe(key) : null;
    if (!this.client) {
      this.logger.warn('STRIPE_SECRET_KEY not set — Stripe features disabled, usage tracking still active');
    }
  }

  get isEnabled(): boolean {
    return !!this.client;
  }

  async createCustomer(email: string, name: string): Promise<string | null> {
    if (!this.client) return null;
    try {
      const customer = await this.client.customers.create({ email, name });
      return customer.id;
    } catch (err) {
      this.logger.error('Stripe createCustomer failed:', (err as Error).message);
      return null;
    }
  }

  async createSubscription(customerId: string, priceId: string): Promise<Record<string, unknown> | null> {
    if (!this.client) return null;
    try {
      const sub = await this.client.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
      });
      return sub as unknown as Record<string, unknown>;
    } catch (err) {
      this.logger.error('Stripe createSubscription failed:', (err as Error).message);
      return null;
    }
  }

  async updateSubscription(subscriptionId: string, newPriceId: string): Promise<Record<string, unknown> | null> {
    if (!this.client) return null;
    try {
      const sub = await this.client.subscriptions.retrieve(subscriptionId);
      const updated = await this.client.subscriptions.update(subscriptionId, {
        items: [{ id: sub.items.data[0].id, price: newPriceId }],
        proration_behavior: 'create_prorations',
      });
      return updated as unknown as Record<string, unknown>;
    } catch (err) {
      this.logger.error('Stripe updateSubscription failed:', (err as Error).message);
      return null;
    }
  }

  async cancelSubscription(subscriptionId: string): Promise<boolean> {
    if (!this.client) return false;
    try {
      await this.client.subscriptions.cancel(subscriptionId);
      return true;
    } catch (err) {
      this.logger.error('Stripe cancelSubscription failed:', (err as Error).message);
      return false;
    }
  }

  constructWebhookEvent(payload: Buffer, signature: string): Record<string, unknown> | null {
    if (!this.client) return null;
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) return null;
    try {
      const event = this.client.webhooks.constructEvent(payload, signature, secret);
      return event as unknown as Record<string, unknown>;
    } catch (err) {
      this.logger.error('Stripe webhook validation failed:', (err as Error).message);
      return null;
    }
  }
}
