const express = require('express');
const cors    = require('cors');
require('dotenv').config();
 
const authRoutes          = require('./routes/authRoutes');
const especialidadesRoutes = require('./routes/especialidadesRoutes');
const citasRoutes         = require('./routes/citasRoutes');
const medicosRoutes = require('./routes/medicosRoutes');
 
const app = express();
 
app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(express.json());
 
app.use('/auth',           authRoutes);
app.use('/especialidades', especialidadesRoutes);
app.use('/citas',          citasRoutes);
app.use('/api/medicos', medicosRoutes);
 
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor MELIKA corriendo en http://localhost:${PORT}`);
});
 


app.listen(3001, () => {
    console.log('Servidor corriendo en puerto 3001');
});
