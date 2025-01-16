import { List, Page, Text } from "@shopify/polaris"; // Import the necessary components
import { authenticate } from "../shopify.server";
import { useLoaderData } from "@remix-run/react";
import { PrismaClient } from "@prisma/client";

// Initialize Prisma client
const prisma = new PrismaClient();

// Helper function to validate the API key on the server and store data
async function connectApiKeywithStore(key, shop, storeData) {
  try {
    // Initialize headers for the API request
    const myHeaders = new Headers();
    myHeaders.append("accept", "application/json");
    myHeaders.append("X-API-KEY", key); // Include API Key in header
    myHeaders.append("Content-Type", "application/json"); // Set content type to JSON

    // Step 1: Connect the API Key with the store by sending a POST request
    const connectPayload = JSON.stringify({
      apiKey: key, // The API key to be connected
      store: shop, // Store URL or identifier
    });

    const connectOptions = {
      method: "POST", // POST method
      headers: myHeaders, // Include headers
      body: connectPayload, // Include the payload with the API key and store
      redirect: "follow", // Follow redirects if any
    };

    // Make the API call to connect the API Key with the store
    const connectResponse = await fetch(
      `https://stage.pratkabg.com/plugin/shopify?X-API-KEY=${key}`,
      connectOptions
    );
    const connectResult = await connectResponse.json(); // Parse the response JSON

    // Check if the connection was successful
    if (connectResult.status === "success") {
      console.log("API Key Connected:", connectResult);

      // Step 2: Send the store data to the server
      const storePayload = JSON.stringify({
        apiKey: key, // API key for authentication
        store: shop, // Store URL or identifier
        storeData, // Data related to the store to be sent
      });

      const storeOptions = {
        method: "POST", // POST method
        headers: myHeaders, // Include headers
        body: storePayload, // Include the store data payload
        redirect: "follow", // Follow redirects if any
      };

      // Make the API call to send the store data
      const storeResponse = await fetch(
        `https://stage.pratkabg.com/plugin/shopify/store?X-API-KEY=${key}`,
        storeOptions
      );
      const storeResult = await storeResponse.json(); // Parse the response JSON

      // Check if sending store data was successful
      if (storeResult.status === "success") {
        console.log("Store Data Sent:", storeResult);
        return { isValid: true, data: storeResult }; // Return success with data
      } else {
        console.error("Error Sending Store Data:", storeResult);
        return { isValid: false, error: storeResult.message }; // Return failure with error message
      }
    } else {
      console.error("Error Connecting API Key:", connectResult);
      return { isValid: false, error: connectResult.message }; // Return failure if API key connection failed
    }
  } catch (error) {
    console.error("Error:", error); // Log error if an exception occurs
    return { isValid: false, error: error.message }; // Return failure with error message
  }
}

// Loader function to fetch the necessary data and validate API key
export const loader = async ({ request }) => {
  // Authenticate the admin session
  const { admin, session } = await authenticate.admin(request);

  const shopUrl = session.shop; // Get the shop URL from the session

  // Retrieve target countries from environment variables and split them into an array
  const targetCountries = process.env.TARGET_COUNTRIES
    ? process.env.TARGET_COUNTRIES.split(',').map(country => country)
    : [];

  // Fetch enabled status for each target country
  const enabledCountries = [];
  for (const countryCode of targetCountries) {
    // GraphQL query to check if the country is enabled for the store
    const marketResponse = await admin.graphql(
      `query {
      marketByGeography(countryCode: ${countryCode.toUpperCase()}) {
        enabled
      }
    }`
    );

    const marketData = await marketResponse.json(); // Parse the response

    // If the country is enabled, add it to the enabledCountries array
    console.log(marketData.data.marketByGeography);
    if (marketData?.data?.marketByGeography?.enabled) {
      enabledCountries.push(countryCode);
    }
  }

  // Fetch existing API data for the store from the database
  const existingData = await prisma.apiData.findUnique({
    where: { shop_url: shopUrl },
  });

  // If no API key exists, return the enabled countries data
  if (!existingData || !existingData.api_key) {
    return {
      enabledCountries,
    };
  }

  const apiKey = existingData?.api_key || ""; // Retrieve the API key from existing data

  // GraphQL query to fetch shop data
  const response = await admin.graphql(
    `query {
      shop {
        id
        billingAddress {
          address1
          address2
          city
          province
          phone
          provinceCode
          country
        }
        name
        email
        primaryDomain {
          url
        }
        plan {
          displayName
        }
        shipsToCountries
        taxShipping
        taxesIncluded
        myshopifyDomain
        enabledPresentmentCurrencies
        timezoneAbbreviation
        setupRequired
        weightUnit
        ianaTimezone
        transactionalSmsDisabled
        marketingSmsConsentEnabledAtCheckout
      }
    }`
  );

  const data = await response.json(); // Parse the shop data response

  // Call the helper function to connect the API key with the store and send store data
  connectApiKeywithStore(apiKey, shopUrl, data.data.shop).then((result) => {
    // Log the result of the connection operation
    if (result.isValid) {
      console.log("Operation Successful:", result.data);
    } else {
      console.error("Operation Failed:", result.error);
    }
  });

  // Return the enabled countries data
  return {
    enabledCountries,
  };
};


export default function IndexPage() {
  const { enabledCountries } = useLoaderData();
  return (
    <Page title="App's Home Page (Instruction How to use App)">
      {enabledCountries.length <= 0 && (
        <>
          <Text variant="headingMd" as="h6">
            Shop/sender countries we currently support:
          </Text>
          <Text variant="headingXs" as="h6">
            We can only service these countries and cannot provide service to online shops which have storage located in any other country:
          </Text>
          <List type="bullet" gap="extraTight">
            <List.Item>Netherlands - Den Haag</List.Item>
            <List.Item>Germany - Cologne</List.Item>
            <List.Item>Spain - Madrid</List.Item>
            <List.Item>Italy - Milan</List.Item>
            <List.Item>Czech Republic - Prague</List.Item>
            <List.Item>Poland - Wroclaw</List.Item>
            <List.Item>Hungary - Budapest</List.Item>
          </List>
        </>
      )}
    </Page>
  );
}