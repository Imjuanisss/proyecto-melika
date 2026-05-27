require('dotenv').config();
const { Pool } = require('pg');
const bcrypt   = require('bcrypt');

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function crearAdmin() {
  const nombre          = 'Administrador';
  const primer_apellido = 'MELIKA';
  const email           = 'olartemejiajuanesteban@gmail.com';
  const password        = 'Admin';      

  try {
    const existe = await pool.query(
      'SELECT id FROM usuarios WHERE email = $1',
      [email]
    );

    if (existe.rows.length > 0) {
      console.log('  El admin ya existe. No se creó uno nuevo.');
      process.exit(0);
    }

    const hash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO usuarios
         (nombre, primer_apellido, email, password_hash, rol, activo, verificado)
       VALUES ($1, $2, $3, $4, 'admin', TRUE, TRUE)
       RETURNING id, email, rol`,
      [nombre, primer_apellido, email, hash]
    );

    console.log('Admin creado exitosamente:');
    console.log('   Email:    ', result.rows[0].email);
    console.log('   Rol:      ', result.rows[0].rol);
    console.log('   Password: ', password);
    console.log('     Cambia la contraseña después del primer login.');
  } catch (err) {
    console.error(' Error al crear admin:', err.message);
  } finally {
    await pool.end();
  }
}

crearAdmin();