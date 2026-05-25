const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const authRoutes           = require('./routes/authRoutes');
const especialidadesRoutes = require('./routes/especialidadesRoutes');
const citasRoutes          = require('./routes/citasRoutes');
const medicosRoutes        = require('./routes/medicosRoutes');
const historiasRoutes      = require('./routes/historiasRoutes');

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(express.json());

app.use('/auth',           authRoutes);
app.use('/especialidades', especialidadesRoutes);
app.use('/citas',          citasRoutes);
app.use('/medicos',        medicosRoutes);
app.use('/medico',         medicosRoutes);
app.use('/historias',      historiasRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor MELIKA corriendo en http://localhost:${PORT}`);
});