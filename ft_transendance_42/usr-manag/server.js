import express from 'express';

const app = express();
const port = process.env.PORT || 4000;

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'usr-manag' });
});

app.listen(port, () => {
  console.log(`usr-manag listening on port ${port}`);
});


