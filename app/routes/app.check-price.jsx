// app/routes/index.jsx
import { json } from "@remix-run/node";
import { useActionData, useLoaderData, Form } from "@remix-run/react";
import {
    Page,
    Card,
    TextField,
    Button,
    BlockStack,
    Toast,
    Frame,
    DataTable,
    FormLayout,
    InlineGrid,
    Text,
    InlineStack,
    Box,
    Banner,
    Layout,
} from "@shopify/polaris";
import {
    DeleteIcon, PlusIcon
} from '@shopify/polaris-icons';

import { useState } from "react";

import { PrismaClient } from "@prisma/client";
import { authenticate } from "../shopify.server";

const prisma = new PrismaClient();

// Loader function to fetch API key and stage URL from the database
export const loader = async ({ request }) => {
    try {
        // Authenticate the admin session and retrieve the shop URL
        const { session } = await authenticate.admin(request);
        const shopUrl = session.shop;

        // Fetch the existing data (API key and stage URL) from the database based on the shop URL
        const existingData = await prisma.apiData.findUnique({
            where: {
                shop_url: shopUrl, // Search using the shop's URL
            },
        });

        // If no data is found, throw an error
        if (!existingData) {
            throw new Error("API key and stage URL not found for this shop.");
        }

        // Return the API key and stage URL found in the database
        return {
            apiKey: existingData.api_key, // Return the API key
            apiUrl: existingData.stage_url, // Return the stage URL
        };
    } catch (error) {
        // Catch and log any errors that occur during the execution of the loader function
        console.error("Error in loader:", error.message);

        // Return null values and the error message if something goes wrong
        return {
            apiKey: null, // No API key available
            apiUrl: null, // No stage URL available
            message: error.message || "An unexpected error occurred", // Return the error message
        };
    }
};

// Action function to handle the form submission and fetch price data from an external API
export const action = async ({ request }) => {
    // Parse the form data from the request
    const formData = await request.formData();
    const data = JSON.parse(formData.get("formData")); // Parse the 'formData' field to get the required data
    const apiUrl = formData.get("apiUrl"); // Get the API URL from the form data
    const apiKey = formData.get("apiKey"); // Get the API key from the form data

    try {
        // Send a POST request to the external API to check the price, passing the API key and data
        const response = await fetch(`${apiUrl}/plugin/orders/check-price?X-API-KEY=${apiKey}`, {
            method: "POST", // Use POST method
            headers: {
                "Content-Type": "application/json", // Send the content type as JSON
                "X-API-KEY": apiKey, // Include the API key in the request header
                "accept": "application/json", // Expect JSON response from the API
            },
            body: JSON.stringify(data), // Send the parsed data as the request body
        });

        // If the response is not OK, throw an error
        if (!response.ok) {
            throw new Error("Failed to fetch price from external API");
        }

        // Parse the response JSON to get the pricing data
        const responseData = await response.json();

        // Return the fetched pricing data along with a success message
        return json({
            message: "Pricing fetched successfully!", // Success message
            apiResponse: responseData, // The data received from the API
        });
    } catch (error) {
        // Catch any errors that occur during the API request
        console.error("Error fetching pricing:", error);

        // Return an error message and null API response if something goes wrong
        return json({
            message: "Error fetching pricing. Please try again later.", // Error message
            apiResponse: null, // No data from API
        });
    }
};


export default function Index() {
    const { apiUrl, apiKey, message } = useLoaderData();

    if (!apiUrl || !apiKey || message) {
        return (
            <Page title="Check Shipping Price" backAction={{ content: 'App', url: '/app/' }}>
                <Layout.Section>
                    <Banner tone="critical" title="Error: No Data Found">
                        <p>Please check the API key and URL.</p>
                        <Button url="/app/key">API Settings</Button>
                    </Banner>
                </Layout.Section>
            </Page>
        );
    }

    const actionData = useActionData();

    const [items, setItems] = useState([
        {
            id: 0,
            weight: "",
            name: "",
            sku: "",
            price: "",
            description: "",
            length: "",
            width: "",
            height: "",
        },
    ]);
    const [recipient, setRecipient] = useState({ countryCode: "" });
    const [currency, setCurrency] = useState("");
    const [toastVisible, setToastVisible] = useState(false);

    const handleAddItem = () => {
        setItems([
            ...items,
            {
                id: items.length,
                weight: "",
                name: "",
                sku: "",
                price: "",
                description: "",
                length: "",
                width: "",
                height: "",
            },
        ]);
    };

    const handleRemoveItem = (id) => {
        setItems(items.filter((item) => item.id !== id));
    };

    const handleChangeItem = (index, field, value) => {
        const updatedItems = [...items];
        updatedItems[index][field] = value;
        setItems(updatedItems);
    };

    const handleSubmit = () => {
        setToastVisible(true);
    };

    return (
        <Frame>
            <Page title="Check Shipping Price"
                backAction={{ content: 'Price', url: '/app/' }}>
                <InlineGrid columns={actionData?.apiResponse?.data ? 2 : 1} gap={300}>
                    <Card sectioned>
                        <Form method="post" onSubmit={handleSubmit}>
                            <BlockStack gap={300}>
                                <InlineGrid columns={2} gap={400}>
                                    <TextField
                                        placeholder="Currency"
                                        value={currency}
                                        onChange={(value) => setCurrency(value)}
                                        name="currency"
                                    // placeholder="Enter currency"
                                    />
                                    <TextField
                                        placeholder="Recipient Country Code"
                                        value={recipient.countryCode}
                                        onChange={(value) => setRecipient({ countryCode: value })}
                                        name="recipient[countryCode]"
                                    // placeholder="Enter country code"
                                    />
                                </InlineGrid>
                                <InlineStack>
                                    <Box width="92%">
                                        <Text variant="headingMd" as="h6">List of Items</Text>
                                    </Box>
                                    <Box width="3%">
                                        <Button onClick={handleAddItem} variant="primary" icon={PlusIcon} />
                                    </Box>
                                </InlineStack>
                                {items.map((item, index) => (
                                    <Card key={item.id} sectioned>
                                        <BlockStack gap={300}>
                                            <InlineStack>
                                                <Box width="96%">
                                                    <Text variant="headingMd" as="h6">Item Details</Text>
                                                </Box>
                                                <Box width="3%">
                                                    <Button onClick={() => handleRemoveItem(item.id)} icon={DeleteIcon} variant="primary" tone="critical" />
                                                </Box>
                                            </InlineStack>
                                            <InlineGrid columns={3} gap={400}>
                                                <TextField
                                                    placeholder="Name"
                                                    value={item.name}
                                                    onChange={(value) => handleChangeItem(index, "name", value)}
                                                />
                                                <TextField
                                                    placeholder="SKU"
                                                    value={item.sku}
                                                    onChange={(value) => handleChangeItem(index, "sku", value)}
                                                />
                                                <TextField
                                                    placeholder="Price"
                                                    type="number"
                                                    value={item.price}
                                                    onChange={(value) => handleChangeItem(index, "price", value)}
                                                />
                                            </InlineGrid>
                                            <FormLayout>
                                                <FormLayout.Group condensed>
                                                    <TextField
                                                        placeholder="Weight"
                                                        type="number"
                                                        value={item.weight}
                                                        onChange={(value) => handleChangeItem(index, "weight", value)}
                                                    />
                                                    <TextField
                                                        placeholder="Length"
                                                        type="number"
                                                        value={item.length}
                                                        onChange={(value) => handleChangeItem(index, "length", value)}
                                                    />
                                                    <TextField
                                                        placeholder="Width"
                                                        type="number"
                                                        value={item.width}
                                                        onChange={(value) => handleChangeItem(index, "width", value)}
                                                    />
                                                    <TextField
                                                        placeholder="Height"
                                                        type="number"
                                                        value={item.height}
                                                        onChange={(value) => handleChangeItem(index, "height", value)}
                                                    />
                                                </FormLayout.Group>
                                                <TextField
                                                    placeholder="Description"
                                                    value={item.description}
                                                    onChange={(value) => handleChangeItem(index, "description", value)}
                                                    multiline={4}
                                                />
                                            </FormLayout>
                                        </BlockStack>
                                    </Card>
                                ))}
                                <input
                                    type="hidden"
                                    name="formData"
                                    value={JSON.stringify({ items, recipient, currency })}
                                />
                                <input type="hidden" name="apiUrl" value={apiUrl} />
                                <input type="hidden" name="apiKey" value={apiKey} />
                                <Button submit variant="primary" tone="success">Submit</Button>
                            </BlockStack>
                        </Form>
                    </Card>

                    {actionData?.apiResponse?.data && (
                        <Box>
                            <Card>
                                <DataTable
                                    columnContentTypes={["text", "text", "text", "text"]}
                                    headings={["SR.No", "Price", "Weight", "Service Type"]}
                                    rows={actionData.apiResponse.data.items.map((item, index) => [
                                        index + 1,
                                        item.price,
                                        item.weight,
                                        item.service_type,
                                    ])}
                                />

                            </Card>
                        </Box>
                    )}
                </InlineGrid>
            </Page>
        </Frame>
    );
}