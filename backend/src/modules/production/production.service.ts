import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger
} from '@nestjs/common';
import { EstadoCiclo, EstadoNave, CategoriaInsumo } from '@prisma/client';
import { ServicioPrisma } from '../../common/prisma/prisma.service';
import { CrearCicloDto } from './dto/crear-ciclo.dto';
import { CrearNaveDto } from './dto/crear-nave.dto';

/**
 * Servicio de Negocio para el Módulo de Producción (HU01).
 * Gestiona la infraestructura de invernaderos (Naves) y los Ciclos de Cultivo en Supabase.
 */
@Injectable()
export class ProductionService {
  private readonly logger = new Logger(ProductionService.name);

  constructor(private readonly prisma: ServicioPrisma) {}

  /**
   * Obtiene todas las naves registradas en la base de datos de Supabase
   */
  async obtenerNaves() {
    return this.prisma.nave.findMany({
      orderBy: { idNave: 'asc' },
      include: {
        ciclosCultivo: {
          where: { estado: EstadoCiclo.ACTIVO },
          take: 1
        }
      }
    });
  }

  /**
   * Crea una nueva nave en la base de datos de Supabase
   */
  async crearNave(dto: CrearNaveDto) {
    const existe = await this.prisma.nave.findUnique({
      where: { codigoNave: dto.codigoNave }
    });

    if (existe) {
      throw new ConflictException(`Ya existe una nave registrada con el código ${dto.codigoNave}.`);
    }

    return this.prisma.nave.create({
      data: {
        codigoNave: dto.codigoNave,
        nombre: dto.nombre,
        superficieM2: dto.superficieM2,
        tipoEstructura: dto.tipoEstructura ?? 'Multitúnel',
        estado: EstadoNave.DISPONIBLE
      }
    });
  }

  /**
   * Obtiene todos los ciclos de cultivo registrados en la base de datos de Supabase
   */
  async obtenerCiclos() {
    return this.prisma.cicloCultivo.findMany({
      orderBy: { idCiclo: 'desc' },
      include: {
        nave: true
      }
    });
  }

  /**
   * Apertura un nuevo ciclo productivo en Supabase (HU01).
   * Aplica la regla de negocio que prohíbe múltiples ciclos activos en la misma nave.
   */
  async crearCiclo(dto: CrearCicloDto) {
    const idNave = Number(dto.idNave ?? dto.id_nave);
    if (!idNave || isNaN(idNave)) {
      throw new BadRequestException('El ID de la nave es obligatorio.');
    }

    const fechaInicioStr = dto.fechaInicio ?? dto.fecha_inicio ?? new Date().toISOString().split('T')[0];
    const fechaTerminoStr = dto.fechaTerminoEstimada ?? dto.fecha_termino_estimada;

    const nave = await this.prisma.nave.findUnique({
      where: { idNave }
    });

    if (!nave) {
      throw new NotFoundException(`La nave con ID #${idNave} no existe en la base de datos.`);
    }

    // Regla de Negocio: No se permite ciclo simultáneo en la misma nave
    const cicloActivoExistente = await this.prisma.cicloCultivo.findFirst({
      where: {
        idNave,
        estado: EstadoCiclo.ACTIVO
      }
    });

    if (cicloActivoExistente) {
      throw new BadRequestException(
        `La nave ${nave.codigoNave} (${nave.nombre}) ya cuenta con un ciclo ACTIVO (#${cicloActivoExistente.idCiclo}: ${cicloActivoExistente.variedad}). Debe finalizarlo antes de abrir uno nuevo.`
      );
    }

    // Creación transaccional: Inserta ciclo y actualiza nave a EN_CULTIVO
    return this.prisma.$transaction(async (tx) => {
      const nuevoCiclo = await tx.cicloCultivo.create({
        data: {
          idNave,
          temporada: dto.temporada,
          variedad: dto.variedad,
          fechaInicio: new Date(fechaInicioStr),
          fechaTerminoEstimada: fechaTerminoStr ? new Date(fechaTerminoStr) : null,
          estado: EstadoCiclo.ACTIVO,
          totalKgCosechados: 0,
          costoTotalAcumulado: 0,
          costoUnitarioKg: 0
        },
        include: {
          nave: true
        }
      });

      await tx.nave.update({
        where: { idNave },
        data: { estado: EstadoNave.EN_CULTIVO }
      });

      this.logger.log(`Nuevo ciclo #${nuevoCiclo.idCiclo} creado en nave ${nave.codigoNave} (Supabase).`);
      return nuevoCiclo;
    });
  }

  /**
   * Siembra controlada de las 4 Naves oficiales de Santa Laura Ltda. en Supabase si la tabla está vacía.
   */
  async sembrarNavesBase() {
    const totalNaves = await this.prisma.nave.count();

    if (totalNaves > 0) {
      const navesActuales = await this.prisma.nave.findMany({ orderBy: { idNave: 'asc' } });
      return {
        mensaje: `La tabla 'naves' ya contiene ${totalNaves} naves registradas en Supabase.`,
        naves: navesActuales,
        sembradas: 0
      };
    }

    // Insertar las 4 naves de Santa Laura Ltda.
    const navesBase = [
      {
        codigoNave: 'NAV-01',
        nombre: 'Nave 1 - Tomate Larga Vida (Especialidad)',
        superficieM2: 2500,
        tipoEstructura: 'Multitúnel Metal',
        estado: EstadoNave.DISPONIBLE
      },
      {
        codigoNave: 'NAV-02',
        nombre: 'Nave 2 - Pimiento Morrón (Complementaria)',
        superficieM2: 2000,
        tipoEstructura: 'Túnel Simple',
        estado: EstadoNave.DISPONIBLE
      },
      {
        codigoNave: 'NAV-03',
        nombre: 'Nave 3 - Almácigos y Propagación',
        superficieM2: 1200,
        tipoEstructura: 'Invernadero Climatizado',
        estado: EstadoNave.DISPONIBLE
      },
      {
        codigoNave: 'NAV-04',
        nombre: 'Nave 4 - Hortalizas Protegidas',
        superficieM2: 1800,
        tipoEstructura: 'Sombreadero Malla Raschel',
        estado: EstadoNave.DISPONIBLE
      }
    ];

    await this.prisma.nave.createMany({
      data: navesBase
    });

    // Insumos base si la tabla insumos está vacía
    const totalInsumos = await this.prisma.insumo.count();
    if (totalInsumos === 0) {
      await this.prisma.insumo.createMany({
        data: [
          {
            codigoInsumo: 'SEM-TOM-01',
            nombre: 'Semilla Tomate Larga Vida Híbrido',
            categoria: CategoriaInsumo.SEMILLA,
            unidadMedida: 'UNIDADES',
            stockActual: 5000,
            stockMinimoAlerta: 1000,
            costoUnitarioPromedio: 120,
            esMaterialVegetal: true
          },
          {
            codigoInsumo: 'SEM-PIM-01',
            nombre: 'Semilla Pimiento Cuadrado Rojo',
            categoria: CategoriaInsumo.SEMILLA,
            unidadMedida: 'UNIDADES',
            stockActual: 2000,
            stockMinimoAlerta: 500,
            costoUnitarioPromedio: 150,
            esMaterialVegetal: true
          }
        ]
      });
    }

    const navesCreadas = await this.prisma.nave.findMany({ orderBy: { idNave: 'asc' } });
    this.logger.log(`Se sembraron exitosamente 4 naves base de Santa Laura Ltda. en Supabase.`);

    return {
      mensaje: 'Las 4 naves base y el catálogo de semillas (SEM-TOM-01) fueron sembrados exitosamente en Supabase.',
      naves: navesCreadas,
      sembradas: 4
    };
  }
}
