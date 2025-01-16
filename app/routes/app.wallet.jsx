import { useLoaderData } from "@remix-run/react";
import { Page, Layout, Card, Text, Banner, Button } from "@shopify/polaris";
import { PrismaClient } from "@prisma/client";
import { authenticate } from "../shopify.server";

const prisma = new PrismaClient();
// Loader function to fetch wallet data using the API key and stage URL from the database
export const loader = async ({ request }) => {
    // Authenticate the admin session and retrieve the shop URL from the session
    const { session } = await authenticate.admin(request);
    const shopUrl = session.shop;

    // Fetch the existing API key and stage URL from the database based on the shop URL
    const existingData = await prisma.apiData.findUnique({
        where: {
            shop_url: shopUrl, // Search for the shop URL in the database
        },
    });

    // Extract the API key and stage URL from the existing data
    const apiKey = existingData?.api_key;
    const apiUrl = existingData?.stage_url;

    try {
        // Send a GET request to the API to fetch wallet data using the API key and stage URL
        const response = await fetch(
            `${apiUrl}/plugin/wallet?X-API-KEY=${apiKey}`, // URL includes the API key
            {
                method: "GET", // Use GET method
                headers: {
                    "accept": "application/json", // Expect JSON response
                    "X-API-KEY": apiKey, // Pass the API key in the header
                },
            }
        );

        // Check if the response is valid (HTTP status is OK)
        if (!response.ok) {
            throw new Error("Failed to fetch data"); // If not, throw an error
        }

        // Attempt to parse the JSON response
        const data = await response.json();

        // If the JSON response is invalid or lacks expected data, throw an error
        if (!data || !data.data) {
            throw new Error("Invalid response data");
        }

        // Return the parsed data if everything is valid
        return { data };
    } catch (error) {
        // Catch any errors that occur during the API request or JSON parsing
        console.error("Error fetching wallet data:", error);

        // Return a fallback object with a "no data found" message if an error occurs
        return { data: null, message: "No data found" };
    }
};


export default function WalletPage() {
    const { data, message } = useLoaderData();

    // Extract wallet data from the loader response
    const walletData = data?.data || {};

    // If there's no wallet data or there's an error message, show the error banner
    if (!walletData || message) {
        return (
            <Page title="Wallet Details" backAction={{ content: 'App', url: '/app/' }}>
                <Layout.Section>
                    <Banner tone="critical" title="Error: No Data Found">
                        <p>Please check the API key and URL.</p>
                        <Button url="/app/key">API Settings</Button>
                    </Banner>
                </Layout.Section>
            </Page>
        );
    }

    return (
        <Page title="Wallet Info" backAction={{ content: 'Back', url: '/app/' }}>
            <Layout>
                <Layout.Section>
                    <Card title="Wallet Information" sectioned>
                        <Text variant="bodyLg" fontWeight="bold">
                            Balance: {walletData.balance} {walletData.currency}
                        </Text>
                        <Text variant="bodyMd">Currency: {walletData.currency}</Text>
                        <Text variant="bodyMd">Last Updated: {new Date(data.date * 1000).toLocaleString()}</Text>
                    </Card>
                </Layout.Section>
            </Layout>
        </Page>
    );
}