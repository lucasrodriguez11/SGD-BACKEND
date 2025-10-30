//serverrrr

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import expedienteRoutes from './routes/expediente.js';
import movimientoRoutes from './routes/movimiento.js';

dotenv.config(); // Carga variables de entorno


const app = express();
// Conecta a MongoDB
connectDB();
// Middleware básico
app.use(cors());  // Permite peticiones CORS
app.use(express.json()); // Parsea JSON en el body




// Usar las rutas de expedientes
app.use('/expediente', expedienteRoutes);

// Usar las rutas de movimientos
app.use('/movimiento', movimientoRoutes);

// Puerto del servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`App escuchando puerto: ${PORT}`));