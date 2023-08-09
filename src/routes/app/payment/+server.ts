import { updateStripeInfo } from '$lib/server/stripe';

export async function POST(event) {
    const stripeEvent = await event.request.json();

    let customerId: string;
    let paymentStatus: string;

    let invoice: any;

    switch (stripeEvent.type) {
      case 'checkout.session.completed':
        const session = stripeEvent.data.object;
        const userId = session.metadata.userId;
        if (!userId) throw new Error("No userId");
        customerId = session.customer;
        paymentStatus = "active";
        await updateStripeInfo({customerId, paymentStatus}, userId);
        break;
      case 'invoice.paid':
        invoice = stripeEvent.data.object;
        customerId = invoice.customer;
        paymentStatus = "active";
        await updateStripeInfo({customerId, paymentStatus});
        break;
      case 'invoice.payment_failed':
        invoice = stripeEvent.data.object;
        customerId = invoice.customer;
        paymentStatus = "inactive";
        await updateStripeInfo({customerId, paymentStatus});
        break;
      case 'customer.subscription.deleted':
        let subscription = stripeEvent.data.object;
        customerId = subscription.customer;
        paymentStatus = "inactive";
        await updateStripeInfo({customerId, paymentStatus});
        break;
      default:
        // Unexpected event type
        break;
    }

	return new Response("{}");
}
