// fyncol-server/index.ts
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.routes'; 
import userRoutes from './routes/user.routes'; 

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

app.use(cors()); 
app.use(express.json()); 

app.use('/api/auth', authRoutes); 
app.use('/api/users', userRoutes);

app.get('/', (req, res) => res.send('Fyncol API con Prisma 🚀 - Online'));

app.listen(port, () => {
  console.log(`🚀 Servidor corriendo en puerto ${port}`);
});