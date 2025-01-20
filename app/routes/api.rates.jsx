import { json } from '@remix-run/node';
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const action = async ({ request }) => {

    const body = await request.json();

    const targetCountries = process.env.TARGET_COUNTRIES
        ? process.env.TARGET_COUNTRIES.split(',').map(country => country.toLowerCase())
        : [];

    const destinationCountry = body.rate.destination.country?.toLowerCase();

    if (!targetCountries.includes(destinationCountry)) {
        console.log("Destination country is: ", body.rate.destination.country, ", which is not in target countries. Returning null.");
        return null;
    }

    const headers = request.headers;
    const shopDomain = headers.get('X-Shopify-Shop-Domain') || new URL(headers.get('referer') || '').hostname || 'Unknown';

    const existingData = await prisma.apiData.findUnique({
        where: { shop_url: shopDomain },
    });
    const api_key = existingData.api_key

    // Initialize variables for timestamps (to simulate filenames)
    const timestamp = new Date().toISOString().replace(/[:.]/g, "_");

    // Initialize request data object
    const requestData = {
        request_method: request.method,
        timestamp,
        origin_url: shopDomain,
        data: null,
    };

    // Process POST request (e.g., from Shopify for shipping rate)
    if (request.method === 'POST') {
        if (body) {
            // Store the request data
            requestData.data = body;

            // Simulate storing the request data (like saving to a file)
            console.log(`Request Data Saved (${timestamp}):`, JSON.stringify(requestData, null, 2));

            // Modify data if necessary (e.g., replace province with city)
            if (body.rate?.destination?.province === null) {
                body.rate.destination.province = body.rate.destination.city;
            }

            if (!body.rate?.destination?.province && body.rate?.destination?.city) {
                body.rate.destination.province = body.rate.destination.city;
            }

            if (body.rate?.currency !== "EUR") {
                body.rate.currency = "EUR";
            }

            if (!body.rate?.origin?.province && body.rate?.origin?.city) {
                body.rate.origin.province = body.rate.origin.city;
            }

            // Default values for latitude and longitude if empty
            if (!body.rate?.destination?.latitude) {
                body.rate.destination.latitude = 0;
            }

            if (!body.rate?.destination?.longitude) {
                body.rate.destination.longitude = 0;
            }

            // Check if 'items' exist and if 'properties' is missing or not an array in any item
            if (Array.isArray(body?.rate?.items)) {
                body.rate.items.forEach((item, index) => {
                    // If 'properties' is missing or not an array, replace it with an empty array
                    if (!Array.isArray(item.properties)) {
                        console.log(`Item ${index} missing or invalid 'properties'. Adding empty array.`);
                        item.properties = []; // Ensure properties is an empty array
                    }
                });
            }


            // Prepare updated request data (after modifications)
            const updatedRequestData = {
                data: body,
            };

            // Simulate saving the updated data
            console.log(`Updated Request Data Saved (${timestamp}):`, JSON.stringify(updatedRequestData, null, 2));

            // Prepare data to send to external API
            const externalApiData = JSON.stringify({ data: body });

            // External API URL and Key
            const externalApiUrl = `https://stage.pratkabg.com/plugin/shopify/orders/check-price?X-API-KEY=${api_key}`;

            try {
                // Send data to external API using fetch
                const response = await fetch(externalApiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                    body: externalApiData,
                });

                const responseData = await response.json();
                responseData.rates.forEach(rate => {
                    rate.total_price = (parseFloat(rate.total_price) * 100).toFixed(2);
                });

                // Simulate saving the response (like saving to a file)
                console.log(`Response Data Saved (${timestamp}):`, JSON.stringify(responseData, null, 2));

                // Return the response to Shopify (as in PHP)
                return json(responseData);
            } catch (error) {
                console.error('Error with external API:', error);
                return json({ error: 'Error connecting to external API' }, { status: 500 });
            }
        } else {
            // If no data received, return an error response
            console.log('No data received in request');
            return json({ error: 'No data received in request' }, { status: 400 });
        }
    } else {
        // If the method is not POST, return a 405 Method Not Allowed
        console.log('Method Not Allowed');
        return json({ error: 'Method Not Allowed' }, { status: 405 });
    }
};
