import { Injectable } from '@nestjs/common';
import { ProcesosMongoService } from '../mongodb/services/procesos.mongodb.service';
import { ProcesosPgService } from '../procesos_pg/procesos_pg.service';
import { CacheService } from '../cache/cache.service';

export type EstadoCliente = 'ACTIVO' | 'CERRADO' | 'INACTIVO';

@Injectable()
export class EstadoClienteService {
  private readonly VENTANA_DIAS = 7;

  constructor(
    private readonly procesosMongo: ProcesosMongoService,
    private readonly procesosPg: ProcesosPgService,
    private readonly cacheService: CacheService, // Inyectar cache service
  ) {}

  async mapearEstados(clienteIds: string[]): Promise<Record<string, EstadoCliente>> {
    if (!clienteIds?.length) return {};

    const cacheKey = `estadoClientes:${clienteIds.join(',')}`;
    const cached = await this.cacheService.get<Record<string, EstadoCliente>>(cacheKey);
    if (cached) {
      return cached;
    }

    const [abiertos, recientes] = await Promise.all([
      this.procesosPg.clientesConProcesoAbierto(clienteIds),
      this.procesosMongo.clientesConMensajesRecientes(clienteIds, this.VENTANA_DIAS),
    ]);

    const out: Record<string, EstadoCliente> = {};
    for (const id of clienteIds) {
      const hasOpen = abiertos.has(id);
      const hasRecent = recientes.has(id);
      const isInactive = !hasRecent;

      out[id] = hasOpen && !isInactive ? 'ACTIVO' : !hasOpen && hasRecent ? 'CERRADO' : 'INACTIVO';
    }

    await this.cacheService.set(cacheKey, out, 300); // Cachear 5 minutos

    return out;
  }
}
