import './Boton.css';

export default function Boton({
  children, variante = 'primary', size = 'md',
  onClick, type = 'button', disabled = false,
  cargando = false, fullWidth = false,
}) {
  return (
    <button
      type={type}
      className={`boton boton--${variante} boton--${size}${cargando ? ' boton--cargando' : ''}${fullWidth ? ' boton--full' : ''}`}
      onClick={onClick}
      disabled={disabled || cargando}
    >
      {cargando && <span className="boton__spinner" />}
      <span className={cargando ? 'boton__label--hidden' : ''}>{children}</span>
    </button>
  );
}