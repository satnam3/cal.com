import prisma from "@calcom/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    try {
      const {
        body: { urlEmail, existsEmail },
      } = req;

      if (urlEmail !== existsEmail) {
        const getUser = await prisma.user.findUnique({
          where: { email: urlEmail },
        });

        if (getUser) {
          return res.status(200).json({
            message: false,
          });
        }
      } else {
        return res.status(200).json({
          message: true,
          link: "/event-types",
        });
      }
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }
}
