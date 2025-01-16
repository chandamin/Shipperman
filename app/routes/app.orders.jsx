import { useState, useEffect } from "react";
import {
  useActionData,
  useFetcher,
  Form,
  useLoaderData,
} from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Button,
  DataTable,
  Frame,
  Banner,
} from "@shopify/polaris";
import { PlusIcon } from "@shopify/polaris-icons";
import OrderDetailModal from "./component/OrderDetailModal";
import { PrismaClient } from "@prisma/client";
import { authenticate } from "../shopify.server";


const prisma = new PrismaClient();

// Loader function to fetch initial data for orders
export const loader = async ({ request }) => {
  // Authenticate the admin session and retrieve the shop URL from the session
  const { session } = await authenticate.admin(request);
  const shopUrl = session.shop;

  // Fetch existing API key and stage URL for the shop from the database
  const existingData = await prisma.apiData.findUnique({
    where: {
      shop_url: shopUrl, // Look up the shop URL to fetch API data
    },
  });

  // Set default values for pagination (first page and 10 items per page)
  const page = 1;
  const size = 10;

  // Extract the API key and stage URL from the existing data
  const apiKey = existingData?.api_key;
  const apiUrl = existingData?.stage_url;

  try {
    // Send a GET request to the external API to fetch orders data
    const response = await fetch(
      `${apiUrl}/plugin/orders?page=${page}&size=${size}&X-API-KEY=${apiKey}`, // Build URL with pagination and API key
      {
        method: "GET", // Use GET method to retrieve data
        headers: {
          "accept": "application/json", // Expect JSON response
          "X-API-KEY": apiKey, // Include API key in the request header
        },
      }
    );

    // Check if the response is valid (HTTP status is OK)
    if (!response.ok) {
      throw new Error("Failed to fetch data"); // If the response is not OK, throw an error
    }

    // Attempt to parse the JSON response body
    const data = await response.json();

    // If the JSON data is invalid or does not have the expected structure, throw an error
    if (!data || !data.data) {
      throw new Error("Invalid response data");
    }

    // Return the data, along with the current page and size for pagination
    return {
      data: data.data || [],  // Ensure we return an empty array if no orders data is found
      page,                   // Include the current page number
      size,                   // Include the page size (number of items per page)
    };
  } catch (error) {
    // Catch any errors that occur during the fetch or data parsing process
    console.error("Error fetching orders data:", error);

    // Return a fallback object with an empty array for orders and an error message
    return {
      orders: [],  // Return an empty array for orders if an error occurs
      message: "No data found or failed to fetch data. Please check your API key and URL.", // Provide a helpful error message
    };
  }
};


export default function OrdersPage() {
  const { data, page: initialPage, size, message } = useLoaderData();

  if (message) {
    return (
      <Page title="Order Info" backAction={{ content: 'App', url: '/app/' }}>
        <Layout.Section>
          <Banner tone="critical" title="Error: No Data Found">
            <p>Please check the API key and URL.</p>
            <Button url="/app/key">API Settings</Button>
          </Banner>
        </Layout.Section>
      </Page>
    );
  }

  const fetcher = useFetcher();
  const [orders, setOrders] = useState(data || []);
  const [page, setPage] = useState(initialPage);
  const [isModalOpen, setModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    if (fetcher.data) {
      // Only update the orders when new data is returned by fetcher
      setOrders(fetcher.data.data || []);
    }
  }, [fetcher.data]);

  const handlePageChange = (newPage) => {
    // Update the page state
    setPage(newPage);
    fetcher.submit(
      { page: newPage.toString(), size: size.toString() },
      { method: "post", action: "/api/ordersAction" }
    );
  };

  const rows = orders.items.map((order) => [
    order.internalId,
    order.referenceId,
    order.recipient.name,
    order.status,
    order.items.length,
    order.items.reduce((total, item) => total + item.price, 0),
    new Date(order.dateCreated * 1000).toLocaleDateString("en-US"),
    new Date(order.dateCreated * 1000).toLocaleTimeString("en-US"),
    <Button onClick={() => handleViewClick(order)}>View</Button>,
  ]);

  const columns = [
    { id: "id", label: "Order ID" },
    { id: "reference", label: "Reference ID" },
    { id: "recipient", label: "Recipient Name" },
    { id: "status", label: "Status" },
    { id: "items", label: "Items" },
    { id: "price", label: "Total Cost" },
    { id: "date", label: "Date" },
    { id: "time", label: "Time" },
    { id: "view", label: "View" },
  ];

  const handleViewClick = (order) => {
    setSelectedOrder(order);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedOrder(null);
  };

  return (
    <Frame>
      <Page
        title="Order Info"
        backAction={{ content: "Back", url: "/app/" }}
        primaryAction={{
          content: "Add Order",
          icon: PlusIcon,
          url: "/app/add-order",
        }}
      >
        <Card sectioned>
          <DataTable
            columnContentTypes={columns.map((col) =>
              col.id === "dateCreated" ? "numeric" : "text"
            )}
            headings={columns.map((col) => col.label)}
            rows={rows}
          />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "16px" }}>
            <Button
              disabled={page <= 1}
              onClick={() => handlePageChange(page - 1)}
            >
              Previous
            </Button>
            <Button onClick={() => handlePageChange(page + 1)} disabled={orders.total <= (orders.page * orders.size) && true}>Next</Button>
          </div>
          <OrderDetailModal
            order={selectedOrder}
            isOpen={isModalOpen}
            onClose={handleModalClose}
          />
        </Card>
      </Page>
    </Frame>
  );
}
