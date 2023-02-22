import prisma from "@calcom/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    try {
      const {
        body: { email },
      } = req;

      const getUser = await prisma.user.findUnique({
        where: { email },
      });

      const getCredential = await prisma.credential.findFirst({
        where: { userId: getUser?.id },
      });

      if (getUser || getCredential) {
        return res.status(200).json({
          availability: getUser?.isAvailabilityDone,
          stripe: getCredential ? true : false,
        });
      }
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }
}
