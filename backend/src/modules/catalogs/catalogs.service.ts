import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ServicioPrisma } from '../../common/prisma/prisma.service';
import { CrearVariedadDto } from './dto/crear-variedad.dto';
import { ActualizarVariedadDto } from './dto/actualizar-variedad.dto';

@Injectable()
export class CatalogsService {
  private readonly registrador = new Logger(CatalogsService.name);

  constructor(private readonly prisma: ServicioPrisma) {}

  /**
   * Crea una nueva variedad en el catálogo maestro verificando unicidad
   * insensible a mayúsculas/minúsculas (evita duplicados como "Tomate Cherry" vs "tomate cherry").
   */
  async crearVariedad(dto: CrearVariedadDto) {
    const nombreLimpio = dto.nombre.trim();

    const existente = await this.prisma.catalogoVariedad.findFirst({
      where: {
        nombre: {
          equals: nombreLimpio,
          mode: 'insensitive',
        },
      },
    });

    if (existente) {
      throw new ConflictException(
        `Ya existe una variedad registrada con el nombre "${existente.nombre}".`,
      );
    }

    const variedad = await this.prisma.catalogoVariedad.create({
      data: {
        nombre: nombreLimpio,
        especie: dto.especie?.trim() || null,
        descripcion: dto.descripcion?.trim() || null,
        activo: dto.activo ?? true,
      },
    });

    this.registrador.log(
      `Variedad creada en catálogo: ID ${variedad.idVariedad} - ${variedad.nombre}`,
    );

    return variedad;
  }

  /**
   * Lista todas las variedades registradas con filtros opcionales de estado y búsqueda.
   */
  async listarVariedades(soloActivas?: boolean, busqueda?: string) {
    const filtroTexto = busqueda?.trim()
      ? {
          OR: [
            { nombre: { contains: busqueda.trim(), mode: 'insensitive' as const } },
            { especie: { contains: busqueda.trim(), mode: 'insensitive' as const } },
          ],
        }
      : {};

    return this.prisma.catalogoVariedad.findMany({
      where: {
        ...(soloActivas !== undefined ? { activo: soloActivas } : {}),
        ...filtroTexto,
      },
      orderBy: { nombre: 'asc' },
    });
  }

  /**
   * Obtiene una variedad por su ID.
   */
  async obtenerVariedadPorId(idVariedad: number) {
    const variedad = await this.prisma.catalogoVariedad.findUnique({
      where: { idVariedad },
    });

    if (!variedad) {
      throw new NotFoundException(`La variedad con ID ${idVariedad} no existe.`);
    }

    return variedad;
  }

  /**
   * Actualiza los datos de una variedad existente.
   */
  async actualizarVariedad(idVariedad: number, dto: ActualizarVariedadDto) {
    const variedad = await this.prisma.catalogoVariedad.findUnique({
      where: { idVariedad },
    });

    if (!variedad) {
      throw new NotFoundException(`La variedad con ID ${idVariedad} no existe.`);
    }

    if (dto.nombre && dto.nombre.trim().toLowerCase() !== variedad.nombre.toLowerCase()) {
      const duplicada = await this.prisma.catalogoVariedad.findFirst({
        where: {
          nombre: {
            equals: dto.nombre.trim(),
            mode: 'insensitive',
          },
          NOT: { idVariedad },
        },
      });

      if (duplicada) {
        throw new ConflictException(
          `El nombre "${dto.nombre.trim()}" ya pertenece a otra variedad registrada (${duplicada.nombre}).`,
        );
      }
    }

    const actualizada = await this.prisma.catalogoVariedad.update({
      where: { idVariedad },
      data: {
        ...(dto.nombre ? { nombre: dto.nombre.trim() } : {}),
        ...(dto.especie !== undefined ? { especie: dto.especie?.trim() || null } : {}),
        ...(dto.descripcion !== undefined ? { descripcion: dto.descripcion?.trim() || null } : {}),
        ...(dto.activo !== undefined ? { activo: dto.activo } : {}),
      },
    });

    this.registrador.log(`Variedad ID ${idVariedad} (${actualizada.nombre}) actualizada.`);
    return actualizada;
  }

  /**
   * Elimina una variedad. Si ya fue utilizada en ciclos de cultivo históricos,
   * realiza baja lógica (activo = false) para proteger la trazabilidad.
   */
  async eliminarVariedad(idVariedad: number) {
    const variedad = await this.prisma.catalogoVariedad.findUnique({
      where: { idVariedad },
    });

    if (!variedad) {
      throw new NotFoundException(`La variedad con ID ${idVariedad} no existe.`);
    }

    const ciclosAsociados = await this.prisma.cicloCultivo.count({
      where: {
        variedad: {
          equals: variedad.nombre,
          mode: 'insensitive',
        },
      },
    });

    if (ciclosAsociados > 0) {
      const desactivada = await this.prisma.catalogoVariedad.update({
        where: { idVariedad },
        data: { activo: false },
      });

      return {
        eliminacionFisica: false,
        mensaje: `La variedad "${variedad.nombre}" se utiliza en ${ciclosAsociados} ciclo(s) histórico(s), por lo que fue desactivada en lugar de eliminada.`,
        variedad: desactivada,
      };
    }

    await this.prisma.catalogoVariedad.delete({
      where: { idVariedad },
    });

    return {
      eliminacionFisica: true,
      mensaje: `Variedad "${variedad.nombre}" eliminada correctamente.`,
    };
  }

  /**
   * Siembra las variedades hortícolas base de Santa Laura Ltda. si aún no existen.
   */
  async sembrarVariedadesBase() {
    const variedadesBase = [
      {
        nombre: 'Tomate Larga Vida',
        especie: 'Tomate',
        descripcion: 'Variedad estándar de alta vida poscosecha para cultivo bajo invernadero.',
      },
      {
        nombre: 'Tomate Cherry',
        especie: 'Tomate',
        descripcion: 'Tomate tipo cherry de calibre pequeño y alto grado Brix.',
      },
      {
        nombre: 'Tomate Limachino',
        especie: 'Tomate',
        descripcion: 'Variedad tradicional de la zona de Olmué/Limache de sabor intenso.',
      },
      {
        nombre: 'Pimiento',
        especie: 'Pimiento',
        descripcion: 'Hortaliza complementaria de rotación bajo nave.',
      },
    ];

    const creadas = [];

    for (const item of variedadesBase) {
      const existe = await this.prisma.catalogoVariedad.findFirst({
        where: { nombre: { equals: item.nombre, mode: 'insensitive' } },
      });

      if (!existe) {
        const nueva = await this.prisma.catalogoVariedad.create({
          data: item,
        });
        creadas.push(nueva);
      }
    }

    return {
      mensaje: `Proceso de carga inicial completado. Variedades nuevas creadas: ${creadas.length}.`,
      creadas,
    };
  }
}
