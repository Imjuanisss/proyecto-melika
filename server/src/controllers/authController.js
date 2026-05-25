const pool   = require('../config/db');
const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');
 
async function register(req, res) {
    const { nombre, primer_apellido, email, password } = req.body;
 
    if (!nombre || !primer_apellido || !email || !password) {
        return res.status(400).json({ mensaje: 'Todos los campos son obligatorios.' });
    }
 
    try {
        // Verificar si el correo ya existe
        const existe = await pool.query(
            'SELECT id FROM usuarios WHERE email = $1',
            [email]
        );
 
        if (existe.rows.length > 0) {
            return res.status(409).json({ mensaje: 'Este correo ya está registrado.' });
        }
 
        // Hashear la contraseña con 10 rondas de bcrypt
        const hash = await bcrypt.hash(password, 10);
 
        // Crear el usuario con rol paciente
        const resultado = await pool.query(
            `INSERT INTO usuarios (nombre, primer_apellido, email, password_hash, rol, activo, verificado)
             VALUES ($1, $2, $3, $4, 'paciente', TRUE, TRUE)
             RETURNING id, nombre, primer_apellido, email, rol`,
            [nombre, primer_apellido, email, hash]
        );
 
        res.status(201).json({
            mensaje: 'Cuenta creada exitosamente.',
            usuario: resultado.rows[0],
        });
    } catch (error) {
        console.error('Error en register:', error.message);
        res.status(500).json({ mensaje: 'Error al crear la cuenta.' });
    }
}
 
async function login(req, res) {
    const { email, password } = req.body;
 
    if (!email || !password) {
        return res.status(400).json({ mensaje: 'Correo y contraseña son obligatorios.' });
    }
 
    try {
        // Buscar el usuario por correo
        const resultado = await pool.query(
            'SELECT * FROM usuarios WHERE email = $1',
            [email]
        );
 
        if (resultado.rows.length === 0) {
            return res.status(401).json({ mensaje: 'Correo o contraseña incorrectos.' });
        }
 
        const usuario = resultado.rows[0];
 
        // Comparar contraseña ingresada con el hash guardado
        const passwordValida = await bcrypt.compare(password, usuario.password_hash);
 
        if (!passwordValida) {
            return res.status(401).json({ mensaje: 'Correo o contraseña incorrectos.' });
        }
 
        if (!usuario.activo) {
            return res.status(403).json({ mensaje: 'Tu cuenta está desactivada. Contacta soporte.' });
        }
 
        // Generar JWT válido por 8 horas
        const token = jwt.sign(
            { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );
 
        res.json({
            token,
            usuario: {
                id:             usuario.id,
                nombre:         usuario.nombre,
                primer_apellido: usuario.primer_apellido,
                email:          usuario.email,
                rol:            usuario.rol,
            },
        });
    } catch (error) {
        console.error('Error en login:', error.message);
        res.status(500).json({ mensaje: 'Error al iniciar sesión.' });
    }
}
 
module.exports = { register, login };