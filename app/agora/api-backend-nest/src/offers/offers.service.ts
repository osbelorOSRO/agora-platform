import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma/prisma.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { UpdateOfferDto } from './dto/update-offer.dto';

type OfferRow = {
  codigo: string;
  nombre: string | null;
  precio_base: string | null;
  tipo: string | null;
  descripcion: string | null;
  lineas: number | null;
  excluye_alta: boolean | null;
  excluye_portabilidad_postpago: boolean | null;
  url_archivo: string | null;
  precio_normal: number | null;
  duracion_precio: string | null;
  gigas: number | null;
  minutos: string | null;
  tiene_redes_libres: boolean | null;
  roaming: string | null;
};

@Injectable()
export class OffersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<OfferRow[]> {
    return this.prisma.$queryRawUnsafe<OfferRow[]>(
      `SELECT codigo, nombre, precio_base::text, tipo, descripcion, lineas,
              excluye_alta, excluye_portabilidad_postpago, url_archivo, precio_normal,
              duracion_precio, gigas, minutos, tiene_redes_libres, roaming
       FROM precios_planes
       ORDER BY codigo ASC`,
    );
  }

  async findOne(codigo: string): Promise<OfferRow> {
    const rows = await this.prisma.$queryRawUnsafe<OfferRow[]>(
      `SELECT codigo, nombre, precio_base::text, tipo, descripcion, lineas,
              excluye_alta, excluye_portabilidad_postpago, url_archivo, precio_normal,
              duracion_precio, gigas, minutos, tiene_redes_libres, roaming
       FROM precios_planes WHERE codigo = $1 LIMIT 1`,
      codigo,
    );
    if (!rows[0]) throw new NotFoundException(`Oferta "${codigo}" no encontrada`);
    return rows[0];
  }

  async create(dto: CreateOfferDto): Promise<OfferRow> {
    const existing = await this.prisma.$queryRawUnsafe<OfferRow[]>(
      `SELECT codigo FROM precios_planes WHERE codigo = $1 LIMIT 1`,
      dto.codigo,
    );
    if (existing[0]) throw new ConflictException(`El código "${dto.codigo}" ya existe`);

    const rows = await this.prisma.$queryRawUnsafe<OfferRow[]>(
      `INSERT INTO precios_planes
         (codigo, nombre, precio_base, tipo, descripcion, lineas,
          excluye_alta, excluye_portabilidad_postpago, url_archivo, precio_normal,
          duracion_precio, gigas, minutos, tiene_redes_libres, roaming)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING codigo, nombre, precio_base::text, tipo, descripcion, lineas,
                 excluye_alta, excluye_portabilidad_postpago, url_archivo, precio_normal,
                 duracion_precio, gigas, minutos, tiene_redes_libres, roaming`,
      dto.codigo,
      dto.nombre ?? null,
      dto.precio_base ?? null,
      dto.tipo ?? null,
      dto.descripcion ?? null,
      dto.lineas ?? null,
      dto.excluye_alta ?? false,
      dto.excluye_portabilidad_postpago ?? false,
      dto.url_archivo ?? null,
      dto.precio_normal ?? null,
      dto.duracion_precio ?? null,
      dto.gigas ?? null,
      dto.minutos ?? null,
      dto.tiene_redes_libres ?? false,
      dto.roaming ?? null,
    );
    return rows[0];
  }

  async update(codigo: string, dto: UpdateOfferDto): Promise<OfferRow> {
    await this.findOne(codigo);

    const sets: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    const fields: Array<keyof UpdateOfferDto> = [
      'nombre', 'precio_base', 'tipo', 'descripcion', 'lineas',
      'excluye_alta', 'excluye_portabilidad_postpago', 'url_archivo', 'precio_normal',
      'duracion_precio', 'gigas', 'minutos', 'tiene_redes_libres', 'roaming',
    ];

    for (const field of fields) {
      if (field in dto) {
        sets.push(`${field} = $${idx}`);
        params.push((dto as any)[field] ?? null);
        idx++;
      }
    }

    if (sets.length === 0) return this.findOne(codigo);

    params.push(codigo);
    const rows = await this.prisma.$queryRawUnsafe<OfferRow[]>(
      `UPDATE precios_planes SET ${sets.join(', ')}
       WHERE codigo = $${idx}
       RETURNING codigo, nombre, precio_base::text, tipo, descripcion, lineas,
                 excluye_alta, excluye_portabilidad_postpago, url_archivo, precio_normal,
                 duracion_precio, gigas, minutos, tiene_redes_libres, roaming`,
      ...params,
    );
    return rows[0];
  }

  async remove(codigo: string): Promise<{ ok: boolean; codigo: string }> {
    await this.findOne(codigo);
    await this.prisma.$executeRawUnsafe(`DELETE FROM precios_planes WHERE codigo = $1`, codigo);
    return { ok: true, codigo };
  }
}
