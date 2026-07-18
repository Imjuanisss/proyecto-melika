// server/src/server.js
// Ahora solo arranca el servidor. La app en sí vive en app.js
// y así Supertest puede importarla sin abrir un puerto real.

const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor MELIKA listo y escuchando en el puerto ${PORT}`);
});