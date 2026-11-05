import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EstadoCiclo, EstadoNave, CalidadGrado } from '@prisma/client';
import { ServicioPrisma } from '../../common/prisma/prisma.service';
import { CrearNaveDto } from './dto/crear-nave.dto';
import { ActualizarNaveDto } from './dto/actualizar-nave.dto';
import { CrearCicloDto } from './dto/crear-ciclo.dto';
import { CerrarCicloDto } from './dto/cerrar-ciclo.dto';
import { CrearLaborDto } from './dto/crear-labor.dto';
import { CrearCosechaDto } from './dto/crear-cosecha.dto';

@Injectable()
export class ProductionService {
  private readonly registrador = new Logger(ProductionService.name);

  constructor(private readonly prisma: ServicioPrisma) {}

  // ==========================================
  // 1. GESTIÓN DE NAVES / INVERNADEROS (HU01)
  // ==========================================

  async listarNaves() {
    return this.prisma.nave.findMany({
      orderBy: { codigoNave: 'asc' },
      include: {
        ciclosCultivo: {
          where: { estado: EstadoCiclo.ACTIVO },
          select: {
            idCiclo: true,
            temporada: true,
            variedad: true,
            fechaInicio: true,
            totalKgCosechados: true,
          },
        },
      },
    });
  }

  async obtenerNavePorId(idNave: number) {
    const nave = await this.prisma.nave.findUnique({
      where: { idNave },
      include: {
        ciclosCultivo: {
          orderBy: { fechaInicio: 'desc' },
        },
      },
    });

    if (!nave) {
      throw new NotFoundException(`La nave con ID ${idNave} no existe.`);
    }

    return nave;
  }

  async crearNave(dto: CrearNaveDto) {
    const naveExistente = await this.prisma.nave.findUnique({
      where: { codigoNave: dto.codigoNave },
    });

    if (naveExistente) {
      throw new ConflictException(`El código de nave '${dto.codigoNave}' ya se encuentra registrado.`);
    }

    return this.prisma.nave.create({
      data: {
        codigoNave: dto.codigoNave,
        nombre: dto.nombre,
        superficieM2: dto.superficieM2,
        tipoEstructura: dto.tipoEstructura,
        estado: dto.estado ?? EstadoNave.DISPONIBLE,
      },
    });
  }

  async actualizarNave(idNave: number, dto: ActualizarNaveDto) {
    await this.obtenerNavePorId(idNave);

    return this.prisma.nave.update({
      where: { idNave },
      data: {
        nombre: dto.nombre,
        superficieM2: dto.superficieM2,
        tipoEstructura: dto.tipoEstructura,
        estado: dto.estado,
      },
    });
  }

  // ==========================================
  // 2. CICLOS DE CULTIVO (HU01 - Sin Colisión)
  // ==========================================

  async listarCiclos(idNave?: number, estado?: EstadoCiclo) {
    return this.prisma.cicloCultivo.findMany({
      where: {
        ...(idNave ? { idNave } : {}),
        ...(estado ? { estado } : {}),
      },
      orderBy: { fechaInicio: 'desc' },
      include: {
        nave: {
          select: {
            idNave: true,
            codigoNave: true,
            nombre: true,
            superficieM2: true,
          },
        },
        _count: {
          select: {
            laboresAgricolas: true,
            cosechas: true,
          },
        },
      },
    });
  }

  async obtenerCicloPorId(idCiclo: number) {
    const ciclo = await this.prisma.cicloCultivo.findUnique({
      where: { idCiclo },
      include: {
        nave: true,
        laboresAgricolas: {
          orderBy: { fechaEjecucion: 'desc' },
          include: {
            usuarioResponsable: {
              select: {
                idUsuario: true,
                nombreCompleto: true,
                email: true,
                rol: true,
              },
            },
          },
        },
        cosechas: {
          orderBy: { fechaCosecha: 'desc' },
          include: {
            usuarioPesaje: {
              select: {
                idUsuario: true,
                nombreCompleto: true,
              },
            },
          },
        },
      },
    });

    if (!ciclo) {
      throw new NotFoundException(`El ciclo de cultivo con ID ${idCiclo} no fue encontrado.`);
    }

    return ciclo;
  }

  /**
   * Apertura de un ciclo de cultivo con validación de no solapamiento temporal
   */
  async crearCiclo(dto: CrearCicloDto) {
    const nave = await this.prisma.nave.findUnique({
      where: { idNave: dto.idNave },
      include: {
        ciclosCultivo: {
          where: { estado: EstadoCiclo.ACTIVO },
        },
      },
    });

    if (!nave) {
      throw new NotFoundException(`La nave con ID ${dto.idNave} no existe.`);
    }

    // Regla de Negocio Oficial: Evitar solapamientos de ciclos activos en la misma nave
    if (nave.ciclosCultivo.length > 0 || nave.estado === EstadoNave.EN_CULTIVO) {
      throw new ConflictException(
        `La nave '${nave.codigoNave}' ya tiene un ciclo de cultivo activo. Debe cerrar el ciclo en curso antes de iniciar uno nuevo.`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const nuevoCiclo = await tx.cicloCultivo.create({
        data: {
          idNave: dto.idNave,
          temporada: dto.temporada,
          variedad: dto.variedad,
          fechaInicio: new Date(dto.fechaInicio),
          fechaTerminoEstimada: dto.fechaTerminoEstimada ? new Date(dto.fechaTerminoEstimada) : null,
          estado: EstadoCiclo.ACTIVO,
        },
        include: {
          nave: true,
        },
      });

      // Actualizar estado de la nave a EN_CULTIVO
      await tx.nave.update({
        where: { idNave: dto.idNave },
        data: { estado: EstadoNave.EN_CULTIVO },
      });

      return nuevoCiclo;
    });
  }

  /**
   * Cierre formal de un ciclo de cultivo y cálculo automático de costo real $/Kg
   */
  async cerrarCiclo(idCiclo: number, dto: CerrarCicloDto) {
    const ciclo = await this.prisma.cicloCultivo.findUnique({
      where: { idCiclo },
    });

    if (!ciclo) {
      throw new NotFoundException(`El ciclo con ID ${idCiclo} no existe.`);
    }

    if (ciclo.estado !== EstadoCiclo.ACTIVO) {
      throw new BadRequestException(`El ciclo ya se encuentra en estado ${ciclo.estado}.`);
    }

    const totalKg = Number(ciclo.totalKgCosechados);
    const costoAcumulado = Number(ciclo.costoTotalAcumulado);
    const costoUnitarioKg = totalKg > 0 ? Number((costoAcumulado / totalKg).toFixed(2)) : 0;

    return this.prisma.$transaction(async (tx) => {
      const cicloCerrado = await tx.cicloCultivo.update({
        where: { idCiclo },
        data: {
          estado: EstadoCiclo.FINALIZADO,
          fechaCierreReal: dto.fechaCierreReal ? new Date(dto.fechaCierreReal) : new Date(),
          costoUnitarioKg,
        },
        include: {
          nave: true,
        },
      });

      // Liberar la nave a DISPONIBLE
      await tx.nave.update({
        where: { idNave: ciclo.idNave },
        data: { estado: EstadoNave.DISPONIBLE },
      });

      return cicloCerrado;
    });
  }

  // ==========================================
  // 3. LABORES AGRÍCOLAS EN TERRENO (HU02)
  // ==========================================

  async registrarLabor(idUsuarioResponsable: number, dto: CrearLaborDto) {
    const ciclo = await this.prisma.cicloCultivo.findUnique({
      where: { idCiclo: dto.idCiclo },
    });

    if (!ciclo) {
      throw new NotFoundException(`El ciclo de cultivo con ID ${dto.idCiclo} no existe.`);
    }

    if (ciclo.estado !== EstadoCiclo.ACTIVO) {
      throw new BadRequestException('No se pueden registrar labores en un ciclo finalizado o cancelado.');
    }

    return this.prisma.laborAgricola.create({
      data: {
        idCiclo: dto.idCiclo,
        idUsuarioResponsable,
        tipoLabor: dto.tipoLabor,
        fechaEjecucion: new Date(dto.fechaEjecucion),
        horasDedicadas: dto.horasDedicadas,
        observacionesTecnicas: dto.observacionesTecnicas,
      },
      include: {
        usuarioResponsable: {
          select: {
            idUsuario: true,
            nombreCompleto: true,
            email: true,
            rol: true,
          },
        },
        cicloCultivo: {
          select: {
            idCiclo: true,
            temporada: true,
            variedad: true,
          },
        },
      },
    });
  }

  async listarLaboresPorCiclo(idCiclo: number) {
    return this.prisma.laborAgricola.findMany({
      where: { idCiclo },
      orderBy: { fechaEjecucion: 'desc' },
      include: {
        usuarioResponsable: {
          select: {
            idUsuario: true,
            nombreCompleto: true,
            email: true,
            rol: true,
          },
        },
      },
    });
  }

  // ==========================================
  // 4. PESAJE DE COSECHA EN BÁSCULA (HU03)
  // ==========================================

  async registrarCosecha(idUsuarioPesaje: number, dto: CrearCosechaDto) {
    const ciclo = await this.prisma.cicloCultivo.findUnique({
      where: { idCiclo: dto.idCiclo },
    });

    if (!ciclo) {
      throw new NotFoundException(`El ciclo de cultivo con ID ${dto.idCiclo} no existe.`);
    }

    if (ciclo.estado !== EstadoCiclo.ACTIVO) {
      throw new BadRequestException('No se pueden registrar cosechas en un ciclo finalizado o cancelado.');
    }

    const calidad = dto.calidadGrado ?? CalidadGrado.PRIMERA;
    // Si es descarte, por regla de negocio los kilos disponibles para venta directa son 0
    const kilosDisponibles =
      dto.kilosDisponiblesVenta !== undefined
        ? dto.kilosDisponiblesVenta
        : calidad === CalidadGrado.DESCARTE
          ? 0
          : dto.kilosNetos;

    return this.prisma.$transaction(async (tx) => {
      // 1. Crear el lote de cosecha pesada
      const nuevaCosecha = await tx.cosecha.create({
        data: {
          idCiclo: dto.idCiclo,
          idUsuarioPesaje,
          fechaCosecha: new Date(dto.fechaCosecha),
          kilosNetos: dto.kilosNetos,
          calidadGrado: calidad,
          kilosDisponiblesVenta: kilosDisponibles,
        },
        include: {
          usuarioPesaje: {
            select: {
              idUsuario: true,
              nombreCompleto: true,
            },
          },
          cicloCultivo: {
            select: {
              idCiclo: true,
              variedad: true,
              temporada: true,
            },
          },
        },
      });

      // 2. Incrementar atómicamente el total de kilos cosechados en el ciclo
      await tx.cicloCultivo.update({
        where: { idCiclo: dto.idCiclo },
        data: {
          totalKgCosechados: {
            increment: dto.kilosNetos,
          },
        },
      });

      return nuevaCosecha;
    });
  }

  async listarCosechasPorCiclo(idCiclo: number) {
    return this.prisma.cosecha.findMany({
      where: { idCiclo },
      orderBy: { fechaCosecha: 'desc' },
      include: {
        usuarioPesaje: {
          select: {
            idUsuario: true,
            nombreCompleto: true,
          },
        },
      },
    });
  }

  async obtenerStockCosechasDisponibles() {
    return this.prisma.cosecha.findMany({
      where: {
        kilosDisponiblesVenta: {
          gt: 0,
        },
      },
      orderBy: { fechaCosecha: 'asc' },
      include: {
        cicloCultivo: {
          select: {
            idCiclo: true,
            variedad: true,
            temporada: true,
            nave: {
              select: {
                codigoNave: true,
                nombre: true,
              },
            },
          },
        },
      },
    });
  }
}

