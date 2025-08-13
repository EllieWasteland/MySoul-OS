// netlify/functions/get-map-key.js
exports.handler = async function(event, context) {
  return {
    statusCode: 200,
    body: JSON.stringify({ apiKey: process.env.MAPTILER_API_KEY }),
  };
};
