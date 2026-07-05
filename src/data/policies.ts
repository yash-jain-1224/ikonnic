export const policies = {
  "privacy-policy": {
    title: "Privacy Policy",
    intro: "This sample policy explains how a future Ikonnic service may handle information. It should be reviewed by qualified counsel before production use.",
    sections: [
      ["Information we collect", "We may collect account details, delivery information, order preferences, uploaded artwork, and basic usage information needed to operate the service."],
      ["How information is used", "Information may be used to prepare orders, provide support, improve the storefront, prevent misuse, and communicate service updates."],
      ["Uploads and personal media", "Customer uploads should be retained only for the period needed to provide the requested service, subject to a documented deletion schedule."],
      ["Your choices", "Customers should be able to request access, correction, or deletion where applicable and opt out of non-essential marketing."],
    ],
  },
  "refund-return-policy": {
    title: "Refund & Return Policy",
    intro: "Because personalised goods are made to order, returns require a clear and fair review process. This placeholder policy is not legal advice.",
    sections: [
      ["Damaged or incorrect items", "Contact support promptly with the order number and clear photos. Valid manufacturing or fulfilment issues may be reprinted or refunded."],
      ["Customer-provided artwork", "Ikonnic cannot be responsible for spelling, crop, or image-quality issues that were visible and approved during customisation."],
      ["Cancellations", "Orders may be cancelled before production begins. Once a personalised item enters production, cancellation may no longer be possible."],
      ["Resolution timing", "Support reviews should be acknowledged quickly, with a proposed resolution and expected timeline shared in writing."],
    ],
  },
  "shipping-policy": {
    title: "Shipping Policy",
    intro: "This placeholder shipping policy describes how Ikonnic orders are dispatched and delivered across India. Review carefully before production use.",
    sections: [
      ["Production time", "Personalised items are made to order. Most orders enter production within 24 hours of design approval and are dispatched within 2–4 business days."],
      ["Delivery time", "Delivery typically takes 4–7 business days after dispatch, depending on your pincode. Estimated delivery dates are shown at checkout after pincode verification."],
      ["Shipping charges", "Shipping is free on orders of ₹999 and above. Orders below that carry a flat ₹99 shipping fee, shown clearly in the order summary before payment."],
      ["Serviceability", "We ship across India through trusted courier partners. Enter your pincode on the product or checkout page to confirm serviceability and cash-on-delivery availability."],
      ["Tracking", "Every dispatched order receives a tracking number by email and SMS. You can also track your order any time from the Track Order page or your account."],
      ["Delays and damages", "If a shipment is delayed unusually long or arrives damaged, contact support with your order number and photos — we will arrange a replacement or refund per our Refund Policy."],
    ],
  },
  "terms-conditions": {
    title: "Terms & Conditions",
    intro: "These are plain-language placeholder terms for a demonstration storefront and must be replaced before commercial launch.",
    sections: [
      ["Using the service", "Users must provide accurate order and delivery information and must not upload unlawful, harmful, or infringing content."],
      ["Personalisation approval", "The customer is responsible for reviewing spelling, image placement, selected options, and quantities before placing an order."],
      ["Pricing and availability", "Prices, offers, production timing, and availability may change. Confirmed orders will use the summary shown at checkout."],
      ["Intellectual property", "Customers retain rights to their own uploads and grant only the limited permission needed to produce and support the requested order."],
    ],
  },
} as const;
