import React from 'react';
// Importamos los componentes de Swiper para React
import { Swiper, SwiperSlide } from 'swiper/react';
// Importamos los módulos extra que necesitamos (Autoplay y Paginación)
import { Autoplay, Pagination } from 'swiper/modules';

// Importamos los estilos CSS obligatorios de la librería
import 'swiper/css';
import 'swiper/css/pagination';

export default function SliderInicio() {
  return (
    <div className="slider-container" style={{ width: '100%' }}>
      <Swiper
        // Aquí le inyectamos los módulos
        modules={[Autoplay, Pagination]}
        spaceBetween={0} // Espacio entre imágenes
        slidesPerView={1} // Cuántas imágenes se ven a la vez
        pagination={{ clickable: true }} // Activa los punticos de abajo
        autoplay={{
          delay: 5000, // Tiempo en milisegundos (3000 = 3 segundos)
          disableOnInteraction: false, // Evita que se detenga si el usuario hace clic
        }}
        style={{ width: '100%', height: '100%' }}
      >
        {/* PRIMERA IMAGEN */}
        <SwiperSlide>
          <img 
            // Recuerda poner tus imágenes reales en la carpeta public
            src="/imagenes/clinica-fachada.jpg" 
            alt="Fachada de la clínica" 
            style={{ width: '100%', height: 'auto', objectFit: 'contain' }}
          />
        </SwiperSlide>

        {/* SEGUNDA IMAGEN */}
        <SwiperSlide>
          <img 
            src="/imagenes/consultorio.jpg" 
            alt="Consultorio médico" 
            style={{ width: '100%', height: 'auto', objectFit: 'contain' }}
          />
        </SwiperSlide>

        {/* TERCERA IMAGEN */}
        <SwiperSlide>
          <img 
            src="/imagenes/equipo-medico.jpg" 
            alt="Nuestro equipo" 
            style={{ width: '100%', height: 'auto', objectFit: 'contain' }}
          />
        </SwiperSlide>
      </Swiper>
    </div>
  );
}