import { BASE_URL, STRIPE_CLIENT_ID } from "@calcom/lib/constants";
import type { NextApiRequest, NextApiResponse } from "next";
import { stringify } from "querystring";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { name, email } = req.body.stripeData;

  const redirect_uri = encodeURI(
    BASE_URL + "/api/integrations/stripepayment/callback"
  );
  const stripeConnectParams = {
    client_id: STRIPE_CLIENT_ID,
    scope: "read_write",
    response_type: "code",
    "stripe_user[email]": email,
    "stripe_user[first_name]": name,
    /** We need this so E2E don't fail for international users */
    "stripe_user[country]": "US",
    // "stripe_user[country]": process.env.NEXT_PUBLIC_IS_E2E ? "US" : undefined,
    redirect_uri,
  };
  const query = stringify(stripeConnectParams);
  /**
   * Choose Express or Standard Stripe accounts
   * @url https://stripe.com/docs/connect/accounts
   */
  const url = `https://connect.stripe.com/express/oauth/authorize?${query}`;
  // const url = `https://connect.stripe.com/oauth/authorize?${query}`;

  res.status(200).json({ url });
}
