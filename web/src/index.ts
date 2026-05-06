import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load the .env file we moved earlier!
dotenv.config({ path: './web/.env' }); 

const app = express();
const PORT = 3007; // MoMoA uses 3007, so we'll stick to it

app.use(cors());
app.use(express.json());

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'online', 
    agent: 'Novum Mechanistic Scientist',
    gemini_connected: !!process.env.GEMINI_API_KEY 
  });
});

app.listen(PORT, () => {
  console.log(`=================================`);
  console.log(`🧠 Novum Backend Awake on Port ${PORT}`);
  console.log(`=================================`);
});