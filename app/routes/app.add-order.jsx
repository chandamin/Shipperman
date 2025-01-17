// app/routes/create-order.jsx
import { json } from "@remix-run/node";
import { useActionData, useLoaderData, Form, redirect } from "@remix-run/react";
import {
    Page,
    Card,
    TextField,
    Button,
    BlockStack,
    Toast,
    Frame,
    Text,
    FormLayout,
    InlineGrid,
    Box,
    InlineStack
} from "@shopify/polaris";
import { PlusIcon, DeleteIcon } from '@shopify/polaris-icons';
import { useState } from "react";
import { PrismaClient } from "@prisma/client";
import { authenticate } from "../shopify.server";

const prisma = new PrismaClient();
// Loader function to fetch API key and stage URL from the database
export const loader = async ({ request }) => {
    // Authenticate the admin session and retrieve the shop URL
    const { session } = await authenticate.admin(request);
    const shopUrl = session.shop;

    // Fetch the existing data (API key and stage URL) from the database using the shop's URL
    const existingData = await prisma.apiData.findUnique({
        where: {
            shop_url: shopUrl, // Search for the shop's URL in the database
        },
    });

    // If no data is found for the shop (i.e., no API key or stage URL), throw an error
    if (!existingData) {
        throw new Error("API key and stage URL not found for this shop.");
    }

    // Return the API key and stage URL found in the database
    return {
        apiKey: existingData.api_key, // Return the API key
        apiUrl: existingData.stage_url, // Return the stage URL
    };
};

// Action function to create the order
export const action = async ({ request }) => {
    // Parse the form data from the request
    const formData = await request.formData();
    const data = JSON.parse(formData.get("formData")); // Parse the 'formData' field to get the necessary data
    const apiUrl = formData.get("apiUrl"); // Extract the API URL from the form data
    const apiKey = formData.get("apiKey"); // Extract the API key from the form data

    try {
        // Send a POST request to the external API to create an order
        const response = await fetch(`${apiUrl}/plugin/orders/create-order?X-API-KEY=${apiKey}`, {
            method: "POST", // Use POST method
            headers: {
                "Content-Type": "application/json", // Set content type as JSON
                "X-API-KEY": apiKey, // Include the API key in the request header
                "accept": "application/json", // Expect a JSON response
            },
            body: JSON.stringify(data), // Send the parsed data as the request body
        });

        // Parse the response JSON to get the result of the order creation
        const responseData = await response.json();

        // Redirect to the orders page after successful order creation
        return redirect('/app/orders');
    } catch (error) {
        // Log the error to the console if the order creation fails
        console.error("Error creating order:", error);

        // Return an error message and null API response if something goes wrong
        return json({
            message: "Error creating order. Please try again later.", // Error message
            apiResponse: null, // No data from API
        });
    }
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

export default function CreateOrder() {
    const { apiUrl, apiKey } = useLoaderData();
    const actionData = useActionData();

    const [items, setItems] = useState([
        {
            id: "",
            itemId: 0,
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
    const [recipient, setRecipient] = useState({
        name: "",
        phone: "",
        email: "",
        company: "",
        companyVat: "",
        countryCode: "BG", // Default to Bulgaria (BG)
        country: "",
        state: "",
        city: "",
        zip: "",
        address: "",
        addressNumber: "",
        buildingNumber: "",
        entranceNumber: "",
        floorNumber: "",
        apartmentNumber: "",
        deliveryNote: "",
    });
    const [referenceId, setReferenceId] = useState(generateReferenceId()); 
    const [paymentType, setPaymentType] = useState(1); 
    const [toastVisible, setToastVisible] = useState(false);

    const handleAddItem = () => {
        setItems([
            ...items,
            {
                id: "",
                itemId: items.length,
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


    const handleRemoveItem = (itemId) => {
        setItems(items.filter((item) => item.itemId !== itemId));
    };

    const handleChangeItem = (index, field, value) => {
        const updatedItems = [...items];
        updatedItems[index][field] = value;
        setItems(updatedItems);
    };

    const handleChangeRecipient = (field, value) => {
        setRecipient({
            ...recipient,
            [field]: value,
        });
    };

    const handleSubmit = () => {
        setToastVisible(true);
    };

    return (
        <Frame>
            <Page title="Create Order"
                backAction={{ content: 'Orders', url: '/app/' }}>
                <InlineGrid columns={actionData?.apiResponse ? 2 : 1} gap={300}>
                    <Card sectioned>
                        <Form method="post" onSubmit={handleSubmit}>
                            <BlockStack gap={300}>
                                <Text variant="headingMd" as="h6">Recipient Information</Text>
                                <InlineGrid columns={3} gap={400}>
                                    <TextField
                                        placeholder="Name"
                                        value={recipient.name}
                                        onChange={(value) => handleChangeRecipient('name', value)}
                                    />
                                    <TextField
                                        placeholder="Phone"
                                        value={recipient.phone}
                                        onChange={(value) => handleChangeRecipient('phone', value)}
                                    />
                                    <TextField
                                        placeholder="Email"
                                        value={recipient.email}
                                        onChange={(value) => handleChangeRecipient('email', value)}
                                    />
                                </InlineGrid>
                                <FormLayout>
                                    <FormLayout.Group condensed>
                                        <TextField
                                            placeholder="Company"
                                            value={recipient.company}
                                            onChange={(value) => handleChangeRecipient('company', value)}
                                        />
                                        <TextField
                                            placeholder="Company VAT"
                                            value={recipient.companyVat}
                                            onChange={(value) => handleChangeRecipient('companyVat', value)}
                                        />
                                        <TextField
                                            placeholder="Country"
                                            value={recipient.country}
                                            onChange={(value) => handleChangeRecipient('country', value)}
                                        />
                                        <TextField
                                            placeholder="State"
                                            value={recipient.state}
                                            onChange={(value) => handleChangeRecipient('state', value)}
                                        />
                                        <TextField
                                            placeholder="City"
                                            value={recipient.city}
                                            onChange={(value) => handleChangeRecipient('city', value)}
                                        />
                                        <TextField
                                            placeholder="Zip"
                                            value={recipient.zip}
                                            onChange={(value) => handleChangeRecipient('zip', value)}
                                        />
                                        <TextField
                                            placeholder="Address"
                                            value={recipient.address}
                                            onChange={(value) => handleChangeRecipient('address', value)}
                                        />
                                        <TextField
                                            placeholder="Address Number"
                                            value={recipient.addressNumber}
                                            onChange={(value) => handleChangeRecipient('addressNumber', value)}
                                        />
                                        <TextField
                                            placeholder="Building Number"
                                            value={recipient.buildingNumber}
                                            onChange={(value) => handleChangeRecipient('buildingNumber', value)}
                                        />
                                        <TextField
                                            placeholder="Entrance Number"
                                            value={recipient.entranceNumber}
                                            onChange={(value) => handleChangeRecipient('entranceNumber', value)}
                                        />
                                        <TextField
                                            placeholder="Floor Number"
                                            value={recipient.floorNumber}
                                            onChange={(value) => handleChangeRecipient('floorNumber', value)}
                                        />
                                        <TextField
                                            placeholder="Apartment Number"
                                            value={recipient.apartmentNumber}
                                            onChange={(value) => handleChangeRecipient('apartmentNumber', value)}
                                        />
                                        <TextField
                                            placeholder="Delivery Note"
                                            value={recipient.deliveryNote}
                                            onChange={(value) => handleChangeRecipient('deliveryNote', value)}
                                        />
                                    </FormLayout.Group>
                                </FormLayout>

                                <InlineStack>
                                    <Box width="92%">
                                        <Text variant="headingMd" as="h6">Order Items</Text>
                                    </Box>
                                    <Box width="3%">
                                        <Button onClick={handleAddItem} variant="primary" icon={PlusIcon} />
                                    </Box>
                                </InlineStack>
                                <InlineGrid columns={actionData?.apiResponse ? items.length <= 1 ? 1 : 2 : items.length <= 1 ? 1 : 2} gap={400}>
                                    {items.map((item, index) => (
                                        <Card key={item.itemId} sectioned>
                                            <BlockStack gap={300}>
                                                <InlineStack>
                                                    <Box width="96%">
                                                        <Text variant="headingMd" as="h6">Item Details</Text>
                                                    </Box>
                                                    <Box width="3%">
                                                        <Button onClick={() => handleRemoveItem(item.itemId)} icon={DeleteIcon} variant="primary" tone="critical" />
                                                    </Box>
                                                </InlineStack>
                                                <InlineGrid columns={3} gap={400}>
                                                    <TextField
                                                        placeholder="Item ID"
                                                        value={item.id}
                                                        onChange={(value) => handleChangeItem(index, "id", value)}
                                                    />
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
                                                </InlineGrid>
                                                <FormLayout>
                                                    <FormLayout.Group condensed>
                                                        <TextField
                                                            placeholder="Price"
                                                            type="number"
                                                            value={item.price}
                                                            onChange={(value) => handleChangeItem(index, "price", value)}
                                                        />
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
                                </InlineGrid>

                                <input
                                    type="hidden"
                                    name="formData"
                                    value={JSON.stringify({ items, recipient, referenceId, paymentType })}
                                />
                                <input type="hidden" name="apiUrl" value={apiUrl} />
                                <input type="hidden" name="apiKey" value={apiKey} />
                                <Button submit variant="primary" tone="success">Submit Order</Button>
                            </BlockStack>
                        </Form>
                    </Card>
                </InlineGrid>

                {actionData?.apiResponse && (
                    <Box>
                        <Toast content={actionData.message} onDismiss={() => setToastVisible(false)} />
                    </Box>
                )}
            </Page>
        </Frame>
    );
}
