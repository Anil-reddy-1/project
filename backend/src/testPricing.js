const productModel = require('./models/productModel');

(async () => {
  try {
    const res = await productModel.getAllPricingData({ page: NaN, limit: NaN });
    console.log("SUCCESS");
  } catch (err) {
    console.error("ERROR:", err);
  }
  process.exit(0);
})();
