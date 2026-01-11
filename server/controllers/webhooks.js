import { Webhook } from "svix";
import User from "../models/User.js";
import stripe from "stripe";
import { Purchase } from "../models/Purchase.js";
import Course from "../models/Course.js";



// API Controller Function to Manage Clerk User with database
export const clerkWebhooks = async (req, res) => {
  try {

    // Create a Svix instance with clerk webhook secret.
    const whook = new Webhook(process.env.CLERK_WEBHOOK_SECRET)

    // Verifying Headers
    await whook.verify(JSON.stringify(req.body), {
      "svix-id": req.headers["svix-id"],
      "svix-timestamp": req.headers["svix-timestamp"],
      "svix-signature": req.headers["svix-signature"]
    })

    // Getting Data from request body
    const { data, type } = req.body

    // Clerk sends metadata in snake_case; keeping a safe fallback for other shapes.
    const extractedRole =
      data?.public_metadata?.role ||
      data?.publicMetadata?.role ||
      'student'

    // Switch Cases for differernt Events
    switch (type) {
      case 'user.created': {

        const userData = {
          _id: data.id,
          email: data.email_addresses[0].email_address,
          name: data.first_name + " " + data.last_name,
          imageUrl: data.image_url,
          role: extractedRole,
        }

        // Upsert to avoid duplicate-key crash if user already exists (created by API fallback)
        await User.findByIdAndUpdate(
          data.id,
          userData,
          { upsert: true, new: true, setDefaultsOnInsert: true }
        )

        res.json({})
        break;
      }

      case 'user.updated': {
        const userData = {
          email: data.email_addresses[0].email_address,
          name: data.first_name + " " + data.last_name,
          imageUrl: data.image_url,
          role: extractedRole,
        }

        await User.findByIdAndUpdate(
          data.id,
          userData,
          { upsert: true, new: true, setDefaultsOnInsert: true }
        )

        res.json({})
        break;
      }

      case 'user.deleted': {
        await User.findByIdAndDelete(data.id)
        res.json({})
        break;
      }
      default:
        break;
    }

  } catch (error) {
    res.json({ success: false, message: error.message })
  }
}


// Stripe Gateway Initialize
const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY)


// Idempotently finalize a successful purchase:
// - mark Purchase completed
// - enroll the student in Course
// - add the Course into User.enrolledCourses
// Uses $addToSet to prevent duplicates if Stripe retries webhooks.
const finalizePurchaseAndEnrollment = async (purchaseId) => {
  if (!purchaseId) return

  const purchase = await Purchase.findById(purchaseId)
  if (!purchase) return

  // If already completed, keep it idempotent (Stripe may retry events).
  if (purchase.status !== 'completed') {
    purchase.status = 'completed'
    await purchase.save()
  }

  // Add student to course (idempotent)
  await Course.findByIdAndUpdate(
    purchase.courseId,
    { $addToSet: { enrolledStudents: purchase.userId } },
    { new: true }
  )

  // Add course to user (idempotent)
  await User.findByIdAndUpdate(
    purchase.userId,
    { $addToSet: { enrolledCourses: purchase.courseId } },
    { new: true }
  )
}


// Idempotently mark a purchase as failed
const failPurchase = async (purchaseId) => {
  if (!purchaseId) return

  const purchase = await Purchase.findById(purchaseId)
  if (!purchase) return

  if (purchase.status === 'completed') return
  if (purchase.status !== 'failed') {
    purchase.status = 'failed'
    await purchase.save()
  }
}


// Stripe Webhook
export const stripeWebhooks = async (request, response) => {

  const sig = request.headers['stripe-signature'];

  let event;

  try {

    event = stripeInstance.webhooks.constructEvent(request.body, sig, process.env.STRIPE_WEBHOOK_SECRET);

  } catch (err) {
    response.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  // Handle the event
  try {
    switch (event.type) {

      // Primary: Checkout Session paid
      case 'checkout.session.completed':

      // For async methods (e.g., SEPA), Stripe emits a follow-up success event.
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object;
        const purchaseId = session?.metadata?.purchaseId || session?.client_reference_id

        await finalizePurchaseAndEnrollment(purchaseId)
        break;
      }

      // Some dashboards/endpoints are configured for PaymentIntent events instead.
      // This will work if the PaymentIntent has metadata.purchaseId.
      case 'payment_intent.succeeded': {
        const intent = event.data.object
        const purchaseId = intent?.metadata?.purchaseId

        await finalizePurchaseAndEnrollment(purchaseId)
        break;
      }

      case 'checkout.session.expired':
      case 'checkout.session.async_payment_failed': {
        const session = event.data.object
        const purchaseId = session?.metadata?.purchaseId || session?.client_reference_id

        await failPurchase(purchaseId)
        break;
      }

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    // Return a response to acknowledge receipt of the event
    response.json({ received: true });
  } catch (err) {
    // Return 500 so Stripe retries the webhook.
    console.error('Stripe webhook processing error:', err)
    response.status(500).send('Webhook handler failed')
  }
}
