export default async function handler(req, res) {
  const { orderId } = req.body;
  // Check local storage logic or call real PesaJet API
  // For now, return pending - admin will manually confirm after checking MTN
  return res.json({ status: 'pending', message: 'Check MTN MoMo manually, then click Manual Confirm' });
}
