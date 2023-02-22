import { createPaymentLink } from "@calcom/app-store/stripepayment/lib/client";
import { sendAwaitingPaymentEmail } from "@calcom/emails";
import { getTranslation } from "@server/lib/i18n";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req?.body?.evt && req?.body?.evt?.organizer) {
    if (!req?.body?.evt?.organizer?.language?.translate) {
      req.body.evt.organizer.language.translate = await getTranslation(
        req.body.evt.organizer?.language?.locale ?? "en",
        "common"
      );

      req.body.evt.attendees[0].language.translate = await getTranslation(
        req.body.evt.organizer?.language?.locale ?? "en",
        "common"
      );

      const createMail = await sendAwaitingPaymentEmail({
        ...req.body.evt,
        paymentInfo: {
          link: createPaymentLink({
            paymentUid: req.body.uid,
            name: req.body.name,
            email: req.body.email,
            date: new Date(req.body.startTime).toISOString(),
          }),
        },
      });

      res.status(200).json(createMail);
    }
  }
}
