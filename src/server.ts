import app from './app';
import { config } from './config';
import { prisma } from './utils/prisma';

const server = app.listen(config.port, () => {
  console.log(`==================================================`);
  console.log(`Smart Warranty Platform Server Running`);
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`URL:         http://localhost:${config.port}`);
  console.log(`==================================================`);
});

// Graceful shutdown handling
const gracefulShutdown = async () => {
  console.log('\nShutting down Smart Warranty Platform server...');
  server.close(async () => {
    await prisma.$disconnect();
    console.log('Database connection closed.');
    process.exit(0);
  });
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
