import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { authenticate } from "../shopify.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  // Retrieve target countries from environment variables and split them into an array
  const targetCountries = process.env.TARGET_COUNTRIES
    ? process.env.TARGET_COUNTRIES.split(',').map(country => country)
    : [];

  // Fetch enabled status for each country
  const enabledCountries = [];
  for (const countryCode of targetCountries) {
    const marketResponse = await admin.graphql(
      `query {
        marketByGeography(countryCode: ${countryCode.toUpperCase()}) {
          enabled
        }
      }`
    );

    const marketData = await marketResponse.json();
    if (marketData?.data?.marketByGeography?.enabled) {
      enabledCountries.push(countryCode);
    }
  }

  // GraphQL query to fetch shop data
  const response = await admin.graphql(
    `query {
      shop {
        billingAddress {
          countryCodeV2
        }
      }
    }`
  );

  const data = await response.json(); 
  const countryCode = data?.data?.shop?.billingAddress?.countryCodeV2;
  const isTargetCountry = targetCountries.includes(countryCode);
  if (!isTargetCountry) {
    return {
      apiKey: process.env.SHOPIFY_API_KEY || "",
      enabledCountries,
      billingCountry: false
    };
  }

  return {
    apiKey: process.env.SHOPIFY_API_KEY || "",
    enabledCountries,
    billingCountry: true,
  };
  
};

export default function App() {
  const { apiKey, enabledCountries, billingCountry } = useLoaderData();
console.log("Billing:",billingCountry)
  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <NavMenu>
        <Link to="/app/" rel="home">
          Home
        </Link>
        {enabledCountries.length > 0 && billingCountry && (
          <>
          <Link to="/app/wallet">Wallet Info</Link>
          <Link to="/app/key">API Key Info</Link>
          <Link to="/app/orders">Orders</Link>
          <Link to="/app/check-price">Check Price</Link>
        </>)}

      </NavMenu>
      <Outlet />
    </AppProvider>
  );
}

// Shopify needs Remix to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
