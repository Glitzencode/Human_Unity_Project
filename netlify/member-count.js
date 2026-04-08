exports.handler = async function(event, context) {
  const API_KEY = process.env.MAILCHIMP_API_KEY;
  const LIST_ID = process.env.MAILCHIMP_LIST_ID;
  const SERVER = process.env.MAILCHIMP_SERVER; // e.g. "us6"

  if (!API_KEY || !LIST_ID || !SERVER) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing environment variables' })
    };
  }

  try {
    const response = await fetch(
      `https://${SERVER}.api.mailchimp.com/3.0/lists/${LIST_ID}`,
      {
        headers: {
          'Authorization': `Basic ${Buffer.from(`anystring:${API_KEY}`).toString('base64')}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Mailchimp API error: ${response.status}`);
    }

    const data = await response.json();
    const count = data.stats.member_count;

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=60' // cache for 60 seconds
      },
      body: JSON.stringify({ count })
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
