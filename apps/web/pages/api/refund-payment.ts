import { STRIPE_SECRET_KEY } from "@calcom/lib/constants";
import { getErrorFromUnknown } from "@calcom/lib/errors";
import prisma from "@calcom/prisma";
import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";

const stripePrivateKey: any = STRIPE_SECRET_KEY;
const stripe = new Stripe(stripePrivateKey, {
  apiVersion: "2020-08-27",
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    try {
      const refund = await stripe.refunds.create(
        {
          // amount: refundAmount,
          payment_intent: req.body.externalId,
          // refund_application_fee: true,
        },
        {
          stripeAccount: req.body.stripeAccount,
        }
      );

      if (!refund || refund.status === "failed") {
        return;
      }

      await prisma.payment.update({
        where: {
          id: req.body.paymentId,
        },
        data: {
          refunded: true,
        },
      });

      return res.status(200).json({
        message: "created",
      });
    } catch (error: any) {
      console.error(error);
      res.status(400).json({ message: error.message });
    }
  }
}
