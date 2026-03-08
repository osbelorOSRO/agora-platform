document.addEventListener('DOMContentLoaded', () => {
  const socket = io();
  console.log('🕹️ Dashboard Baileys - Versión Mejorada');
  
  let logs = [];
  
  // 📝 Sistema de logs
  function addLog(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    logs.unshift({ timestamp, message, type });
    if (logs.length > 20) logs.pop();
    
    const container = document.getElementById('logs-container');
    if (container) {
      container.innerHTML = logs.map(log => 
        `<div class="log-item log-${log.type}">
          <span class="log-time">${log.timestamp}</span>
          <span class="log-msg">${log.message}</span>
        </div>`
      ).join('');
    }
  }
  
  // 🔴🟢 ESTADO CONEXIÓN COMPLETO
  socket.on('estadoCompleto', (data) => {
    console.log('📊 Estado completo:', data);
    
    const statusEl = document.getElementById('status');
    const textoEl = document.getElementById('estado-text');
    const numeroEl = document.getElementById('numero-text');
    
    const esOnline = data.conexion === 'open';
    
    if (statusEl) {
      statusEl.className = `status ${esOnline ? 'online' : 'offline'}`;
    }
    
    if (textoEl) {
      textoEl.textContent = esOnline ? 'CONECTADO' : 'DESCONECTADO';
    }
    
    if (numeroEl) {
      if (esOnline && data.numero) {
        numeroEl.textContent = `+${data.numero}`;
      } else {
        numeroEl.textContent = 'Esperando conexión...';
      }
    }
    
    addLog(`Estado: ${esOnline ? 'CONECTADO' : 'DESCONECTADO'}`, esOnline ? 'success' : 'error');
  });
  
  // 📊 ESTADÍSTICAS
  socket.on('stats', (stats) => {
    console.log('📈 Stats:', stats);
    
    document.getElementById('stat-recibidos').textContent = stats.mensajesRecibidos || 0;
    document.getElementById('stat-enviados').textContent = stats.mensajesEnviados || 0;
    
    if (stats.uptime) {
      const uptime = Math.floor(stats.uptime / 1000 / 60);
      document.getElementById('stat-uptime').textContent = `${uptime}m`;
    }
    
    if (stats.ultimoMensaje) {
      const hace = Math.floor((Date.now() - new Date(stats.ultimoMensaje).getTime()) / 1000);
      document.getElementById('stat-ultimo').textContent = hace < 60 ? `${hace}s` : `${Math.floor(hace/60)}m`;
    }
  });
  
  // ⚙️ CONFIGURACIÓN
  socket.on('config', (config) => {
    console.log('⚙️ Config:', config);
    
    const toggleRead = document.getElementById('toggle-read');
    const toggleOnline = document.getElementById('toggle-online');
    
    if (toggleRead) toggleRead.checked = config.readReceipts || false;
    if (toggleOnline) toggleOnline.checked = config.showOnline || false;
    
    // Lista de bloqueados
    const listaDiv = document.getElementById('lista-bloqueados');
    if (listaDiv && config.blocks) {
      if (config.blocks.length === 0) {
        listaDiv.innerHTML = '<div class="empty-state">No hay números bloqueados</div>';
      } else {
        listaDiv.innerHTML = config.blocks.map(num => 
          `<div class="blocked-item">
            <span>${num}</span>
            <button class="btn-unblock" data-numero="${num}">Desbloquear</button>
          </div>`
        ).join('');
        
        // Event listeners para desbloquear
        document.querySelectorAll('.btn-unblock').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const numero = e.target.getAttribute('data-numero');
            socket.emit('desbloquear', numero);
          });
        });
      }
    }
  });
  
  // 📱 QR CODE
  socket.on('qrImage', (qrImageBase64) => {
    console.log('🖼️ QR imagen recibida');
    const qrDiv = document.getElementById('qr-display');
    if (qrDiv) {
      qrDiv.style.display = 'block';
      qrDiv.innerHTML = `
        <div class="qr-container">
          <h3>Escanea con WhatsApp</h3>
          <img src="${qrImageBase64}" class="qr-image" alt="QR Code">
          <p class="qr-instructions">WhatsApp > ⋮ > Dispositivos vinculados > Vincular dispositivo</p>
        </div>
      `;
      addLog('QR generado - escanea con WhatsApp', 'success');
    }
  });
  
  socket.on('qrData', (qr) => {
    console.log('✅ QR texto recibido');
    addLog('QR generado (modo texto)', 'info');
  });
  
  // 🔔 STATUS QR
  socket.on('qrStatus', (data) => {
    const statusMsg = document.getElementById('qr-status-msg');
    if (statusMsg) {
      statusMsg.textContent = data.message;
      statusMsg.className = `qr-status qr-status-${data.status}`;
      statusMsg.style.display = 'block';
      
      setTimeout(() => {
        statusMsg.style.display = 'none';
      }, 5000);
    }
    addLog(data.message, 'info');
  });
  
  // 🎮 BOTÓN GENERAR QR
  document.getElementById('btn-generar-qr')?.addEventListener('click', function() {
    this.disabled = true;
    this.textContent = 'Generando...';
    
    socket.emit('generateQR');
    addLog('Generando nuevo QR...', 'info');
    
    setTimeout(() => {
      this.disabled = false;
      // Restaurar el botón con icono Lucide
      const icon = document.createElement('i');
      icon.setAttribute('data-lucide', 'qr-code');
      icon.className = 'btn-icon';
      this.textContent = ' Generar QR';
      this.prepend(icon);
      lucide.createIcons();
    }, 3000);
  });
  
  // 🔓 LOGOUT
  document.getElementById('logout')?.addEventListener('click', function() {
    if (confirm('¿Cerrar sesión de WhatsApp?')) {
      this.disabled = true;
      this.textContent = 'Cerrando...';
      
      socket.emit('logout');
      addLog('Cerrando sesión...', 'warning');
      
      setTimeout(() => {
        this.disabled = false;
        // Restaurar el botón con icono Lucide
        const icon = document.createElement('i');
        icon.setAttribute('data-lucide', 'log-out');
        icon.className = 'btn-icon';
        this.textContent = ' Logout';
        this.prepend(icon);
        lucide.createIcons();
      }, 2000);
    }
  });
  
  // 🔄 RESTART
  document.getElementById('restart')?.addEventListener('click', function() {
    if (confirm('¿Reiniciar el bot?')) {
      this.disabled = true;
      this.textContent = 'Reiniciando...';
      
      socket.emit('restart');
      addLog('Reiniciando bot...', 'warning');
      
      setTimeout(() => {
        this.disabled = false;
        // Restaurar el botón con icono Lucide
        const icon = document.createElement('i');
        icon.setAttribute('data-lucide', 'refresh-cw');
        icon.className = 'btn-icon';
        this.textContent = ' Reiniciar';
        this.prepend(icon);
        lucide.createIcons();
      }, 3000);
    }
  });
  
 
  // 🚫 BLOQUEAR NÚMERO
  document.getElementById('btn-bloquear')?.addEventListener('click', () => {
    const input = document.getElementById('input-numero');
    const numero = input?.value.trim();
    
    if (numero && /^\d+$/.test(numero)) {
      socket.emit('bloquear', numero);
      input.value = '';
      addLog(`Bloqueado: ${numero}`, 'warning');
    } else {
      alert('Ingresa un número válido (solo dígitos)');
    }
  });
  
  // ✅ CONFIRMACIONES
  socket.on('bloqueado', (data) => {
    if (data.success) {
      addLog(`✅ Bloqueado: ${data.numero}`, 'success');
    }
  });
  
  socket.on('desbloqueado', (data) => {
    if (data.success) {
      addLog(`✅ Desbloqueado: ${data.numero}`, 'success');
    }
  });
  
  // 🔄 Actualizar stats cada 10s
  setInterval(() => {
    socket.emit('getStats');
  }, 10000);
  
  addLog('Dashboard iniciado correctamente', 'success');
  console.log('✅ Dashboard 100% funcional');
});