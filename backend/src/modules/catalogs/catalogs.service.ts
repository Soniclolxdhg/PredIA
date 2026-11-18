import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ServicioPrisma } from '../../common/prisma/prisma.service';
import { CrearVariedadDto } from './dto/crear-variedad.dto';
import { ActualizarVariedadDto } from './dto/actualizar-variedad.dto';
import { CrearEstructuraDto } from './dto/crear-estructura.dto';
import { ActualizarEstructuraDto } from './dto/actualizar-estructura.dto';
import { CrearUnidadDto } from './dto/crear-unidad.dto';
import { ActualizarUnidadDto } from './dto/actualizar-unidad.dto';

@Injectable()
export class CatalogsService {
  private readonly registrador = new Logger(CatalogsService.name);

  constructor(private readonly prisma: ServicioPrisma) {}

  // ==========================================
  // 1. CATÁLOGO DE VARIEDADES AGRÍCOLAS
  // ==========================================

  async crearVariedad(dto: CrearVariedadDto) {
    const nombreLimpio = dto.nombre.trim();

    const existente = await this.prisma.catalogoVariedad.findFirst({
      where: {
        nombre: { equals: nombreLimpio, mode: 'insensitive' },
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

    return { ...variedad, ciclosEnUso: 0 };
  }

  async listarVariedades(soloActivas?: boolean, busqueda?: string) {
    const filtroTexto = busqueda?.trim()
      ? {
          OR: [
            { nombre: { contains: busqueda.trim(), mode: 'insensitive' as const } },
            { especie: { contains: busqueda.trim(), mode: 'insensitive' as const } },
          ],
        }
      : {};

    const variedades = await this.prisma.catalogoVariedad.findMany({
      where: {
        ...(soloActivas !== undefined ? { activo: soloActivas } : {}),
        ...filtroTexto,
      },
      orderBy: { nombre: 'asc' },
    });

    const ciclos = await this.prisma.cicloCultivo.findMany({
      select: { variedad: true },
    });

    return variedades.map((v) => {
      const ciclosEnUso = ciclos.filter(
        (c) => c.variedad.trim().toLowerCase() === v.nombre.trim().toLowerCase(),
      ).length;
      return { ...v, ciclosEnUso };
    });
  }

  async obtenerVariedadPorId(idVariedad: number) {
    const variedad = await this.prisma.catalogoVariedad.findUnique({
      where: { idVariedad },
    });

    if (!variedad) {
      throw new NotFoundException(`La variedad con ID ${idVariedad} no existe.`);
    }

    const ciclosEnUso = await this.prisma.cicloCultivo.count({
      where: { variedad: { equals: variedad.nombre, mode: 'insensitive' } },
    });

    return { ...variedad, ciclosEnUso };
  }

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
          nombre: { equals: dto.nombre.trim(), mode: 'insensitive' },
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

  async eliminarVariedad(idVariedad: number) {
    const variedad = await this.prisma.catalogoVariedad.findUnique({
      where: { idVariedad },
    });

    if (!variedad) {
      throw new NotFoundException(`La variedad con ID ${idVariedad} no existe.`);
    }

    const ciclosAsociados = await this.prisma.cicloCultivo.count({
      where: { variedad: { equals: variedad.nombre, mode: 'insensitive' } },
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

    await this.prisma.catalogoVariedad.delete({ where: { idVariedad } });

    return {
      eliminacionFisica: true,
      mensaje: `Variedad "${variedad.nombre}" eliminada correctamente.`,
    };
  }

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
        const nueva = await this.prisma.catalogoVariedad.create({ data: item });
        creadas.push(nueva);
      }
    }

    return {
      mensaje: `Carga inicial de variedades completada. Nuevas creadas: ${creadas.length}.`,
      creadas,
    };
  }

  // ==========================================
  // 2. CATÁLOGO DE TIPOS DE ESTRUCTURA DE NAVES
  // ==========================================

  async crearEstructura(dto: CrearEstructuraDto) {
    const nombreLimpio = dto.nombre.trim();

    let codigoLimpio = dto.codigo?.trim().toUpperCase();
    if (!codigoLimpio) {
      const total = await this.prisma.catalogoEstructura.count();
      codigoLimpio = `EST-${String(total + 1).padStart(2, '0')}`;
    }

    const existeNombre = await this.prisma.catalogoEstructura.findFirst({
      where: { nombre: { equals: nombreLimpio, mode: 'insensitive' } },
    });
    if (existeNombre) {
      throw new ConflictException(
        `Ya existe un tipo de estructura registrado con el nombre "${existeNombre.nombre}".`,
      );
    }

    const existeCodigo = await this.prisma.catalogoEstructura.findUnique({
      where: { codigo: codigoLimpio },
    });
    if (existeCodigo) {
      throw new ConflictException(
        `El código de estructura "${codigoLimpio}" ya está registrado.`,
      );
    }

    const estructura = await this.prisma.catalogoEstructura.create({
      data: {
        codigo: codigoLimpio,
        nombre: nombreLimpio,
        descripcion: dto.descripcion?.trim() || null,
        activo: dto.activo ?? true,
      },
    });

    this.registrador.log(
      `Tipo de estructura creado: ${estructura.codigo} - ${estructura.nombre}`,
    );

    return { ...estructura, navesEnUso: 0 };
  }

  async listarEstructuras(soloActivas?: boolean, busqueda?: string) {
    const filtroTexto = busqueda?.trim()
      ? {
          OR: [
            { codigo: { contains: busqueda.trim(), mode: 'insensitive' as const } },
            { nombre: { contains: busqueda.trim(), mode: 'insensitive' as const } },
            { descripcion: { contains: busqueda.trim(), mode: 'insensitive' as const } },
          ],
        }
      : {};

    const estructuras = await this.prisma.catalogoEstructura.findMany({
      where: {
        ...(soloActivas !== undefined ? { activo: soloActivas } : {}),
        ...filtroTexto,
      },
      orderBy: { codigo: 'asc' },
    });

    const naves = await this.prisma.nave.findMany({
      select: { tipoEstructura: true },
    });

    return estructuras.map((e) => {
      const navesEnUso = naves.filter(
        (n) =>
          n.tipoEstructura &&
          n.tipoEstructura.trim().toLowerCase() === e.nombre.trim().toLowerCase(),
      ).length;
      return { ...e, navesEnUso };
    });
  }

  async obtenerEstructuraPorId(idEstructura: number) {
    const estructura = await this.prisma.catalogoEstructura.findUnique({
      where: { idEstructura },
    });

    if (!estructura) {
      throw new NotFoundException(`El tipo de estructura con ID ${idEstructura} no existe.`);
    }

    const navesEnUso = await this.prisma.nave.count({
      where: { tipoEstructura: { equals: estructura.nombre, mode: 'insensitive' } },
    });

    return { ...estructura, navesEnUso };
  }

  async actualizarEstructura(idEstructura: number, dto: ActualizarEstructuraDto) {
    const estructura = await this.prisma.catalogoEstructura.findUnique({
      where: { idEstructura },
    });

    if (!estructura) {
      throw new NotFoundException(`El tipo de estructura con ID ${idEstructura} no existe.`);
    }

    if (dto.nombre && dto.nombre.trim().toLowerCase() !== estructura.nombre.toLowerCase()) {
      const dupNombre = await this.prisma.catalogoEstructura.findFirst({
        where: {
          nombre: { equals: dto.nombre.trim(), mode: 'insensitive' },
          NOT: { idEstructura },
        },
      });
      if (dupNombre) {
        throw new ConflictException(
          `El nombre "${dto.nombre.trim()}" ya pertenece a otro tipo de estructura.`,
        );
      }
    }

    if (dto.codigo && dto.codigo.trim().toUpperCase() !== estructura.codigo) {
      const dupCodigo = await this.prisma.catalogoEstructura.findUnique({
        where: { codigo: dto.codigo.trim().toUpperCase() },
      });
      if (dupCodigo && dupCodigo.idEstructura !== idEstructura) {
        throw new ConflictException(
          `El código "${dto.codigo.trim().toUpperCase()}" ya pertenece a otro tipo de estructura.`,
        );
      }
    }

    return this.prisma.catalogoEstructura.update({
      where: { idEstructura },
      data: {
        ...(dto.codigo ? { codigo: dto.codigo.trim().toUpperCase() } : {}),
        ...(dto.nombre ? { nombre: dto.nombre.trim() } : {}),
        ...(dto.descripcion !== undefined ? { descripcion: dto.descripcion?.trim() || null } : {}),
        ...(dto.activo !== undefined ? { activo: dto.activo } : {}),
      },
    });
  }

  async eliminarEstructura(idEstructura: number) {
    const estructura = await this.prisma.catalogoEstructura.findUnique({
      where: { idEstructura },
    });

    if (!estructura) {
      throw new NotFoundException(`El tipo de estructura con ID ${idEstructura} no existe.`);
    }

    const navesAsociadas = await this.prisma.nave.count({
      where: { tipoEstructura: { equals: estructura.nombre, mode: 'insensitive' } },
    });

    if (navesAsociadas > 0) {
      const desactivada = await this.prisma.catalogoEstructura.update({
        where: { idEstructura },
        data: { activo: false },
      });
      return {
        eliminacionFisica: false,
        mensaje: `El tipo de estructura "${estructura.nombre}" está en uso en ${navesAsociadas} nave(s), por lo que fue desactivado.`,
        estructura: desactivada,
      };
    }

    await this.prisma.catalogoEstructura.delete({ where: { idEstructura } });
    return {
      eliminacionFisica: true,
      mensaje: `Tipo de estructura "${estructura.nombre}" eliminado correctamente.`,
    };
  }

  async sembrarEstructurasBase() {
    const base = [
      {
        codigo: 'EST-01',
        nombre: 'Multitúnel Metal',
        descripcion: 'Estructura metálica galvanizada con cubierta de polietileno térmico.',
      },
      {
        codigo: 'EST-02',
        nombre: 'Túnel Simple',
        descripcion: 'Túnel semicircular individual para cultivos de temporada.',
      },
      {
        codigo: 'EST-03',
        nombre: 'Invernadero Climatizado',
        descripcion: 'Control computarizado de ventilación cenital y microclima.',
      },
      {
        codigo: 'EST-04',
        nombre: 'Sombreadero Malla Raschel',
        descripcion: 'Estructura de sombreo al 50-70% para control de radiación.',
      },
      {
        codigo: 'EST-05',
        nombre: 'Capilla Tradicional',
        descripcion: 'Diseño a dos aguas con ventilación lateral manual.',
      },
    ];

    const creadas = [];
    for (const item of base) {
      const existe = await this.prisma.catalogoEstructura.findFirst({
        where: {
          OR: [
            { codigo: item.codigo },
            { nombre: { equals: item.nombre, mode: 'insensitive' } },
          ],
        },
      });
      if (!existe) {
        creadas.push(await this.prisma.catalogoEstructura.create({ data: item }));
      }
    }

    return {
      mensaje: `Carga inicial de estructuras completada. Nuevas creadas: ${creadas.length}.`,
      creadas,
    };
  }

  // ==========================================
  // 3. CATÁLOGO DE UNIDADES DE MEDIDA
  // ==========================================

  async crearUnidad(dto: CrearUnidadDto) {
    const nombreLimpio = dto.nombre.trim();
    const simboloLimpio = dto.simbolo.trim();
    const magnitudLimpia = dto.magnitud.trim().toUpperCase();

    let codigoLimpio = dto.codigo?.trim().toUpperCase();
    if (!codigoLimpio) {
      const total = await this.prisma.catalogoUnidad.count();
      codigoLimpio = `MED-${String(total + 1).padStart(2, '0')}`;
    }

    const existe = await this.prisma.catalogoUnidad.findFirst({
      where: {
        OR: [
          { codigo: codigoLimpio },
          { nombre: { equals: nombreLimpio, mode: 'insensitive' } },
          { simbolo: { equals: simboloLimpio, mode: 'insensitive' } },
        ],
      },
    });

    if (existe) {
      throw new ConflictException(
        `Ya existe una unidad registrada con el mismo código, nombre o símbolo (${existe.codigo} - ${existe.nombre} / ${existe.simbolo}).`,
      );
    }

    const unidad = await this.prisma.catalogoUnidad.create({
      data: {
        codigo: codigoLimpio,
        nombre: nombreLimpio,
        simbolo: simboloLimpio,
        magnitud: magnitudLimpia,
        activo: dto.activo ?? true,
      },
    });

    this.registrador.log(
      `Unidad de medida creada: ${unidad.codigo} - ${unidad.nombre} (${unidad.simbolo})`,
    );

    return { ...unidad, insumosEnUso: 0 };
  }

  async listarUnidades(soloActivas?: boolean, busqueda?: string) {
    const filtroTexto = busqueda?.trim()
      ? {
          OR: [
            { codigo: { contains: busqueda.trim(), mode: 'insensitive' as const } },
            { nombre: { contains: busqueda.trim(), mode: 'insensitive' as const } },
            { simbolo: { contains: busqueda.trim(), mode: 'insensitive' as const } },
            { magnitud: { contains: busqueda.trim(), mode: 'insensitive' as const } },
          ],
        }
      : {};

    const unidades = await this.prisma.catalogoUnidad.findMany({
      where: {
        ...(soloActivas !== undefined ? { activo: soloActivas } : {}),
        ...filtroTexto,
      },
      orderBy: { codigo: 'asc' },
    });

    const insumos = await this.prisma.insumo.findMany({
      select: { unidadMedida: true },
    });

    return unidades.map((u) => {
      const insumosEnUso = insumos.filter((i) => {
        const um = i.unidadMedida.trim().toLowerCase();
        return (
          um === u.simbolo.trim().toLowerCase() ||
          um === u.nombre.trim().toLowerCase()
        );
      }).length;
      return { ...u, insumosEnUso };
    });
  }

  async obtenerUnidadPorId(idUnidad: number) {
    const unidad = await this.prisma.catalogoUnidad.findUnique({
      where: { idUnidad },
    });

    if (!unidad) {
      throw new NotFoundException(`La unidad de medida con ID ${idUnidad} no existe.`);
    }

    const insumosEnUso = await this.prisma.insumo.count({
      where: {
        OR: [
          { unidadMedida: { equals: unidad.simbolo, mode: 'insensitive' } },
          { unidadMedida: { equals: unidad.nombre, mode: 'insensitive' } },
        ],
      },
    });

    return { ...unidad, insumosEnUso };
  }

  async actualizarUnidad(idUnidad: number, dto: ActualizarUnidadDto) {
    const unidad = await this.prisma.catalogoUnidad.findUnique({
      where: { idUnidad },
    });

    if (!unidad) {
      throw new NotFoundException(`La unidad de medida con ID ${idUnidad} no existe.`);
    }

    if (dto.nombre && dto.nombre.trim().toLowerCase() !== unidad.nombre.toLowerCase()) {
      const dup = await this.prisma.catalogoUnidad.findFirst({
        where: { nombre: { equals: dto.nombre.trim(), mode: 'insensitive' }, NOT: { idUnidad } },
      });
      if (dup) {
        throw new ConflictException(`El nombre "${dto.nombre.trim()}" ya pertenece a otra unidad.`);
      }
    }

    if (dto.simbolo && dto.simbolo.trim().toLowerCase() !== unidad.simbolo.toLowerCase()) {
      const dup = await this.prisma.catalogoUnidad.findFirst({
        where: { simbolo: { equals: dto.simbolo.trim(), mode: 'insensitive' }, NOT: { idUnidad } },
      });
      if (dup) {
        throw new ConflictException(`El símbolo "${dto.simbolo.trim()}" ya pertenece a otra unidad.`);
      }
    }

    if (dto.codigo && dto.codigo.trim().toUpperCase() !== unidad.codigo) {
      const dup = await this.prisma.catalogoUnidad.findUnique({
        where: { codigo: dto.codigo.trim().toUpperCase() },
      });
      if (dup && dup.idUnidad !== idUnidad) {
        throw new ConflictException(`El código "${dto.codigo.trim().toUpperCase()}" ya pertenece a otra unidad.`);
      }
    }

    return this.prisma.catalogoUnidad.update({
      where: { idUnidad },
      data: {
        ...(dto.codigo ? { codigo: dto.codigo.trim().toUpperCase() } : {}),
        ...(dto.nombre ? { nombre: dto.nombre.trim() } : {}),
        ...(dto.simbolo ? { simbolo: dto.simbolo.trim() } : {}),
        ...(dto.magnitud ? { magnitud: dto.magnitud.trim().toUpperCase() } : {}),
        ...(dto.activo !== undefined ? { activo: dto.activo } : {}),
      },
    });
  }

  async eliminarUnidad(idUnidad: number) {
    const unidad = await this.prisma.catalogoUnidad.findUnique({
      where: { idUnidad },
    });

    if (!unidad) {
      throw new NotFoundException(`La unidad de medida con ID ${idUnidad} no existe.`);
    }

    const insumosAsociados = await this.prisma.insumo.count({
      where: {
        OR: [
          { unidadMedida: { equals: unidad.simbolo, mode: 'insensitive' } },
          { unidadMedida: { equals: unidad.nombre, mode: 'insensitive' } },
        ],
      },
    });

    if (insumosAsociados > 0) {
      const desactivada = await this.prisma.catalogoUnidad.update({
        where: { idUnidad },
        data: { activo: false },
      });
      return {
        eliminacionFisica: false,
        mensaje: `La unidad "${unidad.nombre}" se utiliza en ${insumosAsociados} insumo(s), por lo que fue desactivada.`,
        unidad: desactivada,
      };
    }

    await this.prisma.catalogoUnidad.delete({ where: { idUnidad } });
    return {
      eliminacionFisica: true,
      mensaje: `Unidad de medida "${unidad.nombre}" eliminada correctamente.`,
    };
  }

  async sembrarUnidadesBase() {
    const base = [
      { codigo: 'MED-01', nombre: 'Kilogramos', simbolo: 'Kg', magnitud: 'MASA' },
      { codigo: 'MED-02', nombre: 'Litros', simbolo: 'L', magnitud: 'VOLUMEN' },
      { codigo: 'MED-03', nombre: 'Gramos', simbolo: 'g', magnitud: 'MASA' },
      { codigo: 'MED-04', nombre: 'Mililitros', simbolo: 'mL', magnitud: 'VOLUMEN' },
      { codigo: 'MED-05', nombre: 'Unidades', simbolo: 'UNIDADES', magnitud: 'CANTIDAD' },
      { codigo: 'MED-06', nombre: 'Sacos', simbolo: 'SACOS', magnitud: 'EMPAQUE' },
      { codigo: 'MED-07', nombre: 'Bandejas', simbolo: 'BANDEJAS', magnitud: 'EMPAQUE' },
    ];

    const creadas = [];
    for (const item of base) {
      const existe = await this.prisma.catalogoUnidad.findFirst({
        where: {
          OR: [
            { codigo: item.codigo },
            { nombre: { equals: item.nombre, mode: 'insensitive' } },
            { simbolo: { equals: item.simbolo, mode: 'insensitive' } },
          ],
        },
      });
      if (!existe) {
        creadas.push(await this.prisma.catalogoUnidad.create({ data: item }));
      }
    }

    return {
      mensaje: `Carga inicial de unidades completada. Nuevas creadas: ${creadas.length}.`,
      creadas,
    };
  }
}
