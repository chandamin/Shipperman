// app/routes/api.key.jsx
import { json } from "@remix-run/node";
import { PrismaClient } from "@prisma/client";

// Initialize Prisma client
const prisma = new PrismaClient();

// Loader function to fetch API key and stage URL for a given shop
export const loader = async ({ request }) => {
  // Extract the 'shop' query parameter from the request URL
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  // Check if the 'shop' parameter is provided
  if (!shop) {
    return json(
      { error: "Missing 'shop' parameter in the request" },
      { status: 400 }
    );
  }

  // Query the ApiData model to fetch the corresponding API key and stage URL
  const apiData = await prisma.apiData.findUnique({
    where: {
      shop_url: shop,
    },
  });

  // If no data is found for the given shop, throw an error
  if (!apiData) {
    return json(
      { error: "API key and stage URL not found for this shop" },
      { status: 404 }
    );
  }

  // Return the api_key and stage_url in the response
  return json({
    apiKey: apiData.api_key,
    apiUrl: apiData.stage_url,
  });
};