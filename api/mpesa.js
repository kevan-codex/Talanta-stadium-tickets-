const axios = require('axios');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') { return res.status(200).end(); }
  if (req.method !== 'POST') { return res.status(405).json({ success: false, message: 'Method Not Allowed' }); }

  try {
    const { phoneNumber, amount } = req.body;
    let formattedPhone = phoneNumber.toString().replace(/[^0-9]/g, '');
    if (formattedPhone.startsWith('0')) { formattedPhone = '254' + formattedPhone.substring(1); }

    const env = process.env.MPESA_ENV || 'sandbox';
    const BASE_URL = env === 'production' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke';

    const auth = Buffer.from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`).toString('base64');
    const tokenResponse = await axios.get(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { Authorization: `Basic ${auth}` }
    });
    const token = tokenResponse.data.access_token;

    const date = new Date();
    const timestamp = date.getFullYear().toString() + String(date.getMonth() + 1).padStart(2, '0') + String(date.getDate()).padStart(2, '0') + String(date.getHours()).padStart(2, '0') + String(date.getMinutes()).padStart(2, '0') + String(date.getSeconds()).padStart(2, '0');
    const password = Buffer.from(`${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`).toString('base64');

    const stkResponse = await axios.post(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, {
      BusinessShortCode: process.env.MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.round(amount),
      PartyA: formattedPhone,
      PartyB: "254723880119",
      PhoneNumber: formattedPhone,
      CallBackURL: "https://example.com/callback",
      AccountReference: 'BAYERN_AJAX',
      TransactionDesc: 'Match Ticket'
    }, { headers: { Authorization: `Bearer ${token}` } });

    if (stkResponse.data.ResponseCode === "0") {
      return res.status(200).json({ success: true, message: 'STK Push sent!' });
    } else {
      return res.status(400).json({ success: false, message: stkResponse.data.ResponseDescription });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
