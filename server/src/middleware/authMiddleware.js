const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
    const header = req.headers['authorization'];

    if (!header) {
        return res.status(401).json({ mensaje: 'Acceso denegado. Token requerido.' });
    }

    const token = header.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.usuario = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ mensaje: 'Token inválido o expirado.' });
    }
}

function isAdmin(req, res, next) {
    if (req.usuario?.rol !== 'admin') {
        return res.status(403).json({ mensaje: 'Acceso restringido a administradores.' });
    }
    next();
}

function isMedico(req, res, next) {
    if (req.usuario?.rol !== 'medico') {
        return res.status(403).json({ mensaje: 'Acceso restringido a médicos.' });
    }
    next();
}

function isPaciente(req, res, next) {
    if (req.usuario?.rol !== 'paciente') {
        return res.status(403).json({ mensaje: 'Acceso restringido a pacientes.' });
    }
    next();
}

module.exports = { verifyToken, isAdmin, isMedico, isPaciente };