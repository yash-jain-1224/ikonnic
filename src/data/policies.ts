export const policies = {
  "privacy-policy": {
    title: "Privacy Policy",
    intro: "This sample policy explains how a future Giftora service may handle information. It should be reviewed by qualified counsel before production use.",
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
      ["Customer-provided artwork", "Giftora cannot be responsible for spelling, crop, or image-quality issues that were visible and approved during customisation."],
      ["Cancellations", "Orders may be cancelled before production begins. Once a personalised item enters production, cancellation may no longer be possible."],
      ["Resolution timing", "Support reviews should be acknowledged quickly, with a proposed resolution and expected timeline shared in writing."],
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
