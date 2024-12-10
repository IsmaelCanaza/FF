// Seleccionar botones y detalles
const btnMetropolitano = document.getElementById('btn-metropolitano');
const btnAlimentadores = document.getElementById('btn-alimentadores');
const infoMetropolitano = document.getElementById('info-metropolitano');
const infoAlimentadores = document.getElementById('info-alimentadores');

// Función para alternar visibilidad
function toggleDetails(button, details) {
  const isVisible = details.style.display === 'block';
  document.querySelectorAll('.details').forEach(el => el.style.display = 'none');
  details.style.display = isVisible ? 'none' : 'block';
}

// Eventos de clic
btnMetropolitano.addEventListener('click', () => toggleDetails(btnMetropolitano, infoMetropolitano));
btnAlimentadores.addEventListener('click', () => toggleDetails(btnAlimentadores, infoAlimentadores));
