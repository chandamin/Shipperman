import { PrismaClient } from "@prisma/client";
import { authenticate } from "../shopify.server";

const prisma = new PrismaClient();

export const action = async ({ request }) => {
  const formData = new URLSearchParams(await request.text());
  const { session } = await authenticate.admin(request);
  const shopUrl = session.shop;

  const apiData = await prisma.apiData.findUnique({
    where: {
      shop_url: shopUrl,
    },
  });

  const apiKey = apiData?.api_key;
  const apiUrl = apiData?.stage_url;

  const page = parseInt(formData.get("page"), 10);
  const size = parseInt(formData.get("size"), 10);

  try {
    const response = await fetch(
      `${apiUrl}/plugin/orders?page=${page}&size=${size}&X-API-KEY=${apiKey}`,
      {
        method: "GET",
        headers: {
          "accept": "application/json",
          "X-API-KEY": apiKey,
        },
      }
    );

    const data = await response.json();
    if (!data || !data.data) {
      throw new Error("Invalid response data");
    }

    // Make sure to return data in the structure the loader expects
    return {
      data: data.data, // Ensure this is in the correct format
      page,
      size,
      message: "Success",
    };
  } catch (error) {
    console.error("Error fetching orders:", error);
    return {
      data: [],
      message: "No data found or failed to fetch data.",
    };
  }
};
