import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

type PushDeliveryRequest = {
  deliveries: Array<{
    userId: string;
    title: string;
    body: string;
    url: string;
    tag?: string;
  }>;
};

type StoredSubscription = {
  id: string;
  user_id: string;
  endpoint: string;
  subscription: webpush.PushSubscription;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

const MAX_DELIVERIES_PER_REQUEST = 200;
const MAX_TITLE_LENGTH = 160;
const MAX_BODY_LENGTH = 1024;
const MAX_URL_LENGTH = 512;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

function requireEnv(name: string) {
  const value = Deno.env.get(name);

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();

  if (forwarded) {
    return forwarded;
  }

  return "unknown-client";
}

function isWithinRateLimit(clientKey: string) {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(clientKey);

  if (!bucket || bucket.resetAt <= now) {
    rateLimitBuckets.set(clientKey, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS
    });
    return true;
  }

  if (bucket.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  bucket.count += 1;
  return true;
}

function validateDeliveryPayload(deliveries: PushDeliveryRequest["deliveries"]) {
  if (!Array.isArray(deliveries)) {
    throw new Error("deliveries must be an array.");
  }

  if (deliveries.length > MAX_DELIVERIES_PER_REQUEST) {
    throw new Error(`deliveries may not exceed ${MAX_DELIVERIES_PER_REQUEST} entries per request.`);
  }

  deliveries.forEach((delivery, index) => {
    if (!delivery.userId?.trim()) {
      throw new Error(`deliveries[${index}].userId is required.`);
    }

    if (!delivery.title?.trim() || delivery.title.length > MAX_TITLE_LENGTH) {
      throw new Error(`deliveries[${index}].title must be between 1 and ${MAX_TITLE_LENGTH} characters.`);
    }

    if (!delivery.body?.trim() || delivery.body.length > MAX_BODY_LENGTH) {
      throw new Error(`deliveries[${index}].body must be between 1 and ${MAX_BODY_LENGTH} characters.`);
    }

    if (!delivery.url?.trim() || delivery.url.length > MAX_URL_LENGTH) {
      throw new Error(`deliveries[${index}].url must be between 1 and ${MAX_URL_LENGTH} characters.`);
    }
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const clientKey = getClientIp(request);

  if (!isWithinRateLimit(clientKey)) {
    return json({ error: "Too many requests. Please retry shortly." }, 429);
  }

  let deliverySecret = "";

  try {
    deliverySecret = requireEnv("PUSH_DELIVERY_SECRET");
  } catch (error) {
    return json(
      {
        error: error instanceof Error ? error.message : "Missing PUSH_DELIVERY_SECRET."
      },
      500
    );
  }

  if (request.headers.get("authorization") !== `Bearer ${deliverySecret}`) {
    return json({ error: "Unauthorized" }, 401);
  }

  try {
    const supabase = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"));

    webpush.setVapidDetails(
      requireEnv("VAPID_SUBJECT"),
      requireEnv("VAPID_PUBLIC_KEY"),
      requireEnv("VAPID_PRIVATE_KEY")
    );

    const payload = (await request.json()) as PushDeliveryRequest;
    const deliveries = payload.deliveries ?? [];
    validateDeliveryPayload(deliveries);

    if (deliveries.length === 0) {
      return json({ sent: 0, skipped: 0, errors: [] });
    }

    const userIds = [...new Set(deliveries.map((delivery) => delivery.userId))];
    const { data: subscriptions, error: subscriptionError } = await supabase
      .from("push_subscriptions")
      .select("id, user_id, endpoint, subscription")
      .in("user_id", userIds)
      .eq("is_active", true);

    if (subscriptionError) {
      throw subscriptionError;
    }

    const subscriptionsByUser = new Map<string, StoredSubscription[]>();

    for (const record of (subscriptions ?? []) as StoredSubscription[]) {
      const bucket = subscriptionsByUser.get(record.user_id) ?? [];
      bucket.push(record);
      subscriptionsByUser.set(record.user_id, bucket);
    }

    let sent = 0;
    let skipped = 0;
    const errors: Array<{ endpoint: string; message: string }> = [];

    for (const delivery of deliveries) {
      const targets = subscriptionsByUser.get(delivery.userId) ?? [];

      if (targets.length === 0) {
        skipped += 1;
        continue;
      }

      for (const target of targets) {
        try {
          await webpush.sendNotification(
            target.subscription,
            JSON.stringify({
              title: delivery.title,
              body: delivery.body,
              url: delivery.url,
              tag: delivery.tag ?? `famtastic-server-${delivery.userId}`
            })
          );
          sent += 1;
        } catch (error) {
          const statusCode =
            typeof error === "object" && error !== null && "statusCode" in error
              ? Number((error as { statusCode?: number }).statusCode)
              : null;

          if (statusCode === 404 || statusCode === 410) {
            await supabase
              .from("push_subscriptions")
              .update({
                is_active: false,
                last_seen_at: new Date().toISOString()
              })
              .eq("id", target.id);
          }

          errors.push({
            endpoint: target.endpoint,
            message: error instanceof Error ? error.message : "Unknown push delivery failure."
          });
        }
      }
    }

    return json({
      sent,
      skipped,
      errors
    });
  } catch (error) {
    return json(
      {
        error: error instanceof Error ? error.message : "Unable to deliver push reminders."
      },
      500
    );
  }
});
