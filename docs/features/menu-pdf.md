# Menu PDF design

The owner menu PDF creator captures the selected available dishes on this device. Printing does not save changes to the live menu or call a new backend API.

Choose an A4/A3 poster or A4/A5 booklet. Both support an optional full-image cover; it is off by default to keep a short menu on one content page. The restaurant banner fills the cover and first content header using a centered crop. Restaurant logos are contained inside a contrasting frame so the full mark remains visible. Missing images leave readable styled text and an image warning.

Text appearance offers Modern (sans serif), Classic (serif), and Bold, with Standard or Large sizing. Fonts come from the device; no font service is contacted. Text size and style changes clear the old preview. Download and share use the exact generated preview pages.

Rows pair a strong dish name with a right-aligned price inside a warm shaded panel. Discounts retain the current price and a separate original-price line. Unknown prices remain “Price on request”. Descriptions, dietary labels, combo options, and print notes remain printable. Measured text bands determine pagination and drawing, so oversized names, prices, descriptions and individual combo choices continue across pages rather than overflowing. Larger text can increase page count. Missing dish photos reserve no empty image column.

Every page has a visible FlexiOrder emblem/wordmark and page number. Footer snapshot timestamps, raw QR URLs and duplicate contact details have been removed. Contacts remain in the first header and cover; metadata too long to fit safely is preserved in a paginated Restaurant details section. The PDF still uses raster artwork for device-native multilingual rendering; text is not selectable and font coverage depends on the device.

Validation: model normalization and measured pagination regression tests cover all four supported paper/layout combinations, long names and descriptions, large prices, oversized single combo strings, complete print notes, and unavailable photos. Real-browser visual and download checks complement these geometry tests.

PDF dietary labels show only Non-veg or Egg from the saved food type. Vegetarian dishes have no repeated label or reserved label row. The Non-veg and egg labels option controls both labels. Saved dish classifications are unchanged.
