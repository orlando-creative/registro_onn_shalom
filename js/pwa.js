let instalacionPendiente = null;

const navegacion = document.querySelector('.nav-enlaces');
if (navegacion) {
  const botonInstalar = document.createElement('button');
  botonInstalar.type = 'button';
  botonInstalar.className = 'btn btn-sm btn-secundario';
  botonInstalar.textContent = 'Instalar app';
  botonInstalar.addEventListener('click', async () => {
    if (!instalacionPendiente) {
      alert('Para instalar ONN, abra el menú del navegador y seleccione «Agregar a pantalla de inicio» o «Instalar aplicación».');
      return;
    }

    instalacionPendiente.prompt();
    await instalacionPendiente.userChoice;
    instalacionPendiente = null;
    botonInstalar.hidden = true;
  });
  navegacion.append(botonInstalar);

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    instalacionPendiente = event;
  });
  window.addEventListener('appinstalled', () => {
    botonInstalar.hidden = true;
    instalacionPendiente = null;
  });
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch((error) => {
    console.error('No se pudo registrar el service worker de ONN:', error);
  });
}
