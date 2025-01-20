import { useState, useEffect } from "react";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import {
  Page,
  Card,
  Button,
  BlockStack,
  TextField,
  DataTable,
  Banner,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
// Helper function to validate the API key on the server
async function validateApiKey(key) {
  try {
    // Send a GET request to the server to check the validity of the provided API key
    const response = await fetch(`https://stage.pratkabg.com/plugin/info?X-API-KEY=${key}`, {
      method: "GET",
      headers: {
        accept: "application/json", // Accept JSON response
        "X-API-KEY": key, // Pass the API key in the header
      },
    });

    // Parse the response data as JSON
    const data = await response.json();

    // Check if the API response is successful and contains a message
    if (data.status !== "success" || !data.message) {
      return { isValid: false, error: "Invalid API Key" }; // Return error if API key is invalid
    }

    // Return success with additional data if the API key is valid
    return { isValid: true, error: "", additionalData: data.data };
  } catch (error) {
    // Catch any errors during the validation process and return error
    return { isValid: false, error: "Error validating API Key" };
  }
}

// Loader function to fetch existing data and validate API key
export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request); // Authenticate admin
  const shopUrl = session.shop; // Get the shop URL from session

  // Fetch existing API data for the shop from the database
  const existingData = await prisma.apiData.findUnique({
    where: { shop_url: shopUrl },
  });

  // Initialize API validation as valid by default
  let apiValidation = { isValid: true, error: "" };

  // If an API key exists in the database, validate it
  if (existingData?.api_key) {
    apiValidation = await validateApiKey(existingData.api_key);
  }

  // Return existing data and API validation result
  return { existingData, apiValidation };
};

// Action function to handle API key submission and save data to the database
export const action = async ({ request }) => {
  // Parse form data from the request
  const formData = new URLSearchParams(await request.text());
  const { session } = await authenticate.admin(request); // Authenticate admin
  const shopUrl = session.shop; // Get the shop URL from session
  const apiKey = formData.get("apiKey"); // Get the API key from form data
  const stageUrl = "https://stage.pratkabg.com"; // Stage URL for the API

  // Validate the provided API key before saving
  const apiValidation = await validateApiKey(apiKey);

  // If the API key is not valid, return the validation error
  if (!apiValidation.isValid || apiValidation.error !== '') {
    return apiValidation;
  }

  // Fetch existing data from the database
  const existingData = await prisma.apiData.findUnique({
    where: { shop_url: shopUrl },
  });

  // Update the existing data or create a new entry in the database
  if (existingData) {
    await prisma.apiData.update({
      where: { shop_url: shopUrl },
      data: { api_key: apiKey, stage_url: stageUrl },
    });
  } else {
    await prisma.apiData.create({
      data: { shop_url: shopUrl, api_key: apiKey, stage_url: stageUrl },
    });
  }

  // Authenticate admin again to make a GraphQL request
  const { admin } = await authenticate.admin(request);

  // Make a GraphQL mutation to create a carrier service with the provided configuration
  const response = await admin.graphql(
    `#graphql
  mutation CarrierServiceCreate($input: DeliveryCarrierServiceCreateInput!) {
    carrierServiceCreate(input: $input) {
      carrierService {
        id
        name
        callbackUrl
        active
        supportsServiceDiscovery
      }
      userErrors {
        field
        message
      }
    }
  }`,
    {
      variables: {
        "input": {
          "name": process.env.CARRIER_SERVICE_NAME, // Carrier service name
          "callbackUrl": process.env.CARRIER_SERVICE_CALLBACK_URL, // Callback URL
          "supportsServiceDiscovery": process.env.CARRIER_SERVICE_SUPPORTS_DISCOVERY === 'true', // Whether service discovery is supported
          "active": process.env.CARRIER_SERVICE_ACTIVE === 'true', // Whether the service is active
        }
      },
    },
  );

  const data = await response.json();
  console.log("List of Errors while Creating Shipping Service: ", data.data.carrierServiceCreate.userErrors);



  // ===============================CREATE WEBHOOK TO HIT WHENEVER ORDER IS CREATED============
  const responseWebhook = await admin.graphql(
    `#graphql
    mutation WebhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $webhookSubscription: WebhookSubscriptionInput!) {
      webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
        webhookSubscription {
          id
          topic
          apiVersion {
            handle
          }
          format
          createdAt
        }
        userErrors {
          field
          message
        }
      }
    }`,
    {
      variables: {
        "topic": "ORDERS_CREATE",
        "webhookSubscription": {
          "callbackUrl": process.env.ORDER_CREATE_WEBHOOK,
          // "callbackUrl": "https://riverside-import-rugby-count.trycloudflare.com/app/test-api",
          "format": "JSON"
        }
      },
    },
  );
  
  const dataWebhook = await responseWebhook.json();
  console.log("Webhook Creation Error: ",dataWebhook.data.userErrors);

  return null; // Return null after the action is completed
};


export default function Index() {
  const loaderData = useLoaderData();
  const actionData = useActionData();
  console.log(actionData);
  // const fetcher = useFetcher();
  const [apiKey, setApiKey] = useState(loaderData?.existingData?.api_key || "");
  const [error, setError] = useState("");

  useEffect(() => {
    // Display error if action data exists
    if (actionData?.error) {
      setError(actionData.error);
    }
  }, [actionData]);

  const tableRows = loaderData?.existingData
    ? [
      [
        loaderData.existingData.shop_url,
        loaderData.existingData.api_key,
        loaderData.existingData.stage_url,
      ],
    ]
    : [];

  return (
    <Page title="Key Info" backAction={{ content: 'Back', url: '/app/' }}>
      <BlockStack gap={400}>
        {/* Form Section */}
        <Card sectioned>
          <Form method="POST">
            <BlockStack gap={300}>
              <TextField
                label="API Key"
                value={apiKey}
                onChange={(value) => setApiKey(value)}
                name="apiKey"
              />
              <Button submit variant="primary">Submit</Button>
            </BlockStack>
          </Form>
        </Card>

        {/* Existing Data Table */}
        <Card title="Existing Data" sectioned>
          {tableRows.length > 0 ? (
            <DataTable
              columnContentTypes={["text", "text", "text"]}
              headings={["Shop URL", "API Key", "Stage URL"]}
              rows={tableRows}
            />
          ) : (
            <p>No data found</p>
          )}
        </Card>

        {/* Error Banner */}
        {error && (
          <Banner tone="critical" title="Invalid API Key" onDismiss={() => setError(null)} />
        )}

      </BlockStack>
    </Page>
  );
}
