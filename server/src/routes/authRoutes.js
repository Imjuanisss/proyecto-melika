const express = require('express');
const router  = express.Router();
const {
  register,
  login,
  verifyCode,
  reenviarCodigo,
  solicitarRecuperacion,
  cambiarPassword,
} = require('../controllers/authController');

router.post('/register',           register);
router.post('/login',              login);
router.get('/verify-code',         verifyCode);
router.post('/reenviar-codigo',    reenviarCodigo);
router.post('/recuperar-password', solicitarRecuperacion);
router.post('/nueva-password',     cambiarPassword);

module.exports = router;