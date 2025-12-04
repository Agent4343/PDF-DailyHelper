const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  algolia: {
    appId: process.env.ALGOLIA_APP_ID, // INPUT_REQUIRED {insert your Algolia App ID here}
    apiKey: process.env.ALGOLIA_API_KEY, // INPUT_REQUIRED {insert your Algolia API Key here}
    indexName: 'pdf_content'
  }
};