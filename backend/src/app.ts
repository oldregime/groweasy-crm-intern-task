import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import importRouter from './routes/import';
import leadsRouter from './routes/leads';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// Enable CORS for all requests, specifically allowing Next.js dev server
app.use(cors({
  origin: '*', // In production, replace with specific origins
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Api-Key', 'X-Provider'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root endpoint
app.get('/', (req, res) => {
  res.json({ message: 'GrowEasy CRM API is running successfully!', frontend: 'Access the dashboard at http://localhost:3000' });
});

// Health Check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Register API Routes
app.use('/api/import', importRouter);
app.use('/api/leads', leadsRouter);

// Start server
const server = app.listen(PORT, () => {
  console.log(`[SERVER] Express server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[SERVER] SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('[SERVER] Process terminated.');
  });
});

export default app;
export { app };
