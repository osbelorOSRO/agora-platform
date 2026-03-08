type ConnectionState = string | undefined;

class RuntimeState {
  private connection: ConnectionState = undefined;
  private numero: string | null = null;
  private ultimaConexion: Date | null = null;
  private ultimoMensaje: Date | null = null;

  private mensajesRecibidos = 0;
  private mensajesEnviados = 0;
  private inicioBot = new Date();

  setConnection(connection: ConnectionState): void {
    this.connection = connection;
  }

  setNumero(numero: string | null): void {
    this.numero = numero;
  }

  markConexionOpen(): void {
    this.ultimaConexion = new Date();
  }

  markIncoming(): void {
    this.mensajesRecibidos += 1;
    this.ultimoMensaje = new Date();
  }

  markOutgoing(): void {
    this.mensajesEnviados += 1;
  }

  snapshotEstado() {
    return {
      conexion: this.connection,
      numero: this.numero,
      ultimaConexion: this.ultimaConexion,
      ultimoMensaje: this.ultimoMensaje,
    };
  }

  snapshotStats() {
    return {
      mensajesRecibidos: this.mensajesRecibidos,
      mensajesEnviados: this.mensajesEnviados,
      inicioBot: this.inicioBot,
      uptime: Date.now() - this.inicioBot.getTime(),
      ultimoMensaje: this.ultimoMensaje,
    };
  }
}

export const runtimeState = new RuntimeState();
