import "server-only";
import type Stripe from "stripe";
/** A paid older invoice is not proof that the current subscription period is paid. */
export function stripePaidPeriod(invoice: Stripe.Invoice | null, subscription: Stripe.Subscription) {
  if(!invoice||invoice.livemode!==false||invoice.status!=='paid'||subscription.items.data.length!==1)return false;
  const item=subscription.items.data[0],linked=invoice.parent?.subscription_details?.subscription;
  const subscriptionId=typeof linked==='string'?linked:linked?.id;
  if(subscriptionId!==subscription.id)return false;
  return invoice.lines.data.some(line=>{
    const price=line.pricing?.price_details?.price;
    const priceId=typeof price==='string'?price:price?.id;
    return priceId===item.price.id&&line.quantity===1&&line.period.start<=item.current_period_start&&line.period.end>=item.current_period_end;
  });
}
