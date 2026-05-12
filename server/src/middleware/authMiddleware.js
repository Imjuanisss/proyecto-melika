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
 
module.exports = { verifyToken };