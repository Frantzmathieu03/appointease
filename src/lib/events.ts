import type { SupabaseClient } from "@supabase/supabase-js";
import type { CustomerEventType, EventActorType } from "./types";

/**
 * Append one row to the customer's timeline (public.customer_events,
 * migration 0010). Called from the same server action that performs the
 * thing being recorded, so the timeline is always complete.
 *
 * Never throws: a failed log write must not fail the booking / cancel /
 * message it describes. Before migration 0010 is applied the table does
 * not exist and this simply logs to the server console.
 */
export async function logCustomerEvent(
  client: SupabaseClient,
  event: {
    businessId: string;
    customerId: string;
    appointmentId?: string | null;
    type: CustomerEventType;
    actorType: EventActorType;
    actorId?: string | null;
    details?: Record<string, unknown>;
  }
): Promise<void> {
  try {
    const { error } = await client.from("customer_events").insert({
      business_id: event.businessId,
      customer_id: event.customerId,
      appointment_id: event.appointmentId ?? null,
      type: event.type,
      actor_type: event.actorType,
      actor_id: event.actorId ?? null,
      details: event.details ?? {},
    });
    if (error) console.error("logCustomerEvent failed:", event.type, error.message);
  } catch (err) {
    console.error("logCustomerEvent failed:", event.type, err);
  }
}
