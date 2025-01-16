import { Modal, TextContainer, Text, Button, DataTable } from "@shopify/polaris";
import React from "react";
import {
  SaveIcon
} from '@shopify/polaris-icons';

const OrderDetailModal = ({ order, isOpen, onClose }) => {
  if (!order) return null;
console.log(order);
  const { recipient, items, dateCreated, status } = order;
  const formattedDate = new Date(dateCreated * 1000).toLocaleString();

  // Download Label PDF
  const downloadLabel = (labelData, filename) => {
    if (!labelData) {
      alert("Label Image is not available for download.");
      return;
    }
    const blob = new Blob([Uint8Array.from(atob(labelData), (c) => c.charCodeAt(0))], { type: "application/pdf" });
    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  // Prepare table rows from items data and calculate total price
  const rows = items.flatMap((item, itemIndex) =>
    item.items.map((subItem, subIndex) => [
      subItem.name,
      subItem.sku,
      subItem.description,
      `${subItem.weight} kg`,
      `${subItem.length} x ${subItem.width} x ${subItem.height}`,
      item.TrackingNumber ? (
        <Button
          onClick={() =>
            downloadLabel(item.LabelImage, `Label_${item.TrackingNumber}.pdf`)
          }
          variant="primary"
          tone="success"
          icon={SaveIcon}
        >
          Download
        </Button>
      ) : (
        "N/A"
      ),
      `$${subItem.price.toFixed(2)}`,
    ])
  );

  const totalPrice = items
    .flatMap((item) => item.items)
    .reduce((sum, subItem) => sum + subItem.price, 0);

  return (
    <Modal
      size="large"
      open={isOpen}
      onClose={onClose}
      title={`Order Details - ${order.internalId}`}
      primaryAction={{
        content: "Close",
        onAction: onClose,
      }}
    >
      <Modal.Section>
        <TextContainer>
          <Text variant="headingMd">Order Information</Text>
          <Text>Recipient: {recipient.name}</Text>
          <Text>Email: {recipient.email}</Text>
          <Text>Phone: {recipient.phone}</Text>
          <Text>Status: {status === 1 ? "Active" : "Inactive"}</Text>
          <Text>Created: {formattedDate}</Text>
        </TextContainer>
      </Modal.Section>

      <Modal.Section>
        <Text variant="headingMd">Items</Text>
        <DataTable
          showTotalsInFooter
          columnContentTypes={[
            "text",
            "text",
            "text",
            "text",
            "text",
            "text",
            "text",
          ]}
          headings={[
            "Item Name",
            "SKU",
            "Description",
            "Weight",
            "Dimensions",
            "Label",
            "Price",
          ]}
          rows={rows}
          totals={["", "", "", "", "", "" , `$${totalPrice.toFixed(2)}`]}
          totalsName={{
            singular: "Total Price",
            plural: "Total Price",
          }}
        />
      </Modal.Section>
    </Modal>
  );
};

export default OrderDetailModal;
