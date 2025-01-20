import { authenticate } from "../shopify.server";
import { PrismaClient } from "@prisma/client";

// Initialize Prisma client
const prisma = new PrismaClient();


export const loader = async ({ request }) => {
  console.log("API HIT SUCESSFULLY ");

  return ("hello world");
};

export const action = async ({ request }) => {
  const requestBody = await request.json();
  if (requestBody.shipping_lines[0].source !== process.env.CARRIER_SERVICE_NAME) {
    return null;
  }
  const match = requestBody.order_status_url.match(/^https:\/\/([a-zA-Z0-9-]+\.myshopify\.com)/);
  const subdomain = match[1];

  // Fetch the existing data (API key and stage URL) from the database using the shop's URL
  const existingData = await prisma.apiData.findUnique({
    where: {
      shop_url: subdomain, // Search for the shop's URL in the database
    },
  });
  console.log(existingData);
  // If no data is found for the shop (i.e., no API key or stage URL), throw an error
  if (!existingData) {
    throw new Error("API key and stage URL not found for this shop.");
  }

  const apiKey = existingData.api_key;
  // Parse the JSON body

  // Map Shopify order data to the new API format
  const apiRequestBody = {
    items: requestBody.line_items.map(item => ({
      id: item.id, // or generate a unique ID if not available
      weight: (item.grams / 1000) || 1, // default to 0 if no weight data
      name: item.name || 'Unknown Item',
      sku: item.sku || 'Unknown SKU',
      price: parseFloat(item.price) || 0, // ensure price is a number
      description: item.title || 'No description',
      length: 0, // set default value if not available
      width: 0, // set default value if not available
      height: 0, // set default value if not available
    })),
    paymentType: 1, // Can set this to whatever payment type you'd like
    referenceId: generateReferenceId(), // Use order number or placeholder
    recipient: {
      name: requestBody.billing_address.name || 'Unknown Name',
      phone: requestBody.billing_address.phone || 'Unknown Phone',
      email: requestBody.email || 'Unknown Email',
      company: requestBody.billing_address.company || 'Unknown Company',
      companyVat: 'Unknown VAT', // Set default if not available
      countryCode: requestBody.billing_address.country_code || 'IT',
      country: requestBody.billing_address.country || 'Italy',
      state: requestBody.billing_address.province || 'Unknown State',
      city: requestBody.billing_address.city || 'Unknown City',
      zip: requestBody.billing_address.zip || '00000',
      address: requestBody.billing_address.address1 || 'Unknown Address',
      addressNumber: '', // Set default if no specific field is available
      buildingNumber: '', // Set default if no specific field is available
      entranceNumber: '', // Set default if no specific field is available
      floorNumber: '', // Set default if no specific field is available
      apartmentNumber: '', // Set default if no specific field is available
      deliveryNote: '' // Set default if no specific field is available
    }
  };

  // Send the POST request to the new API
  const apiResponse = await fetch(`https://stage.pratkabg.com/plugin/orders/create-order?X-API-KEY=${apiKey}`, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      "X-API-KEY": apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(apiRequestBody)
  });

  // Log response from the API
  const responseData = await apiResponse.json();
  console.log('API Response:', responseData);

  return new Response('Order Created Successfully', { status: 200 });
};


// Function to generate a random reference ID (e.g., for orders or transactions)
const generateReferenceId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';  // Allowed characters (uppercase letters and numbers)
  let referenceId = '';  // Initialize the reference ID as an empty string

  // Generate a 7-character random ID
  for (let i = 0; i < 7; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length); // Get a random index from the allowed characters
    referenceId += chars[randomIndex]; // Append the randomly selected character to the reference ID
  }

  // Return the generated reference ID
  return referenceId;
};