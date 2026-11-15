import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EstadoDespacho, EstadoCiclo } from '@prisma/client';
import { ServicioPrisma } from '../../common/prisma/prisma.service';
import { CrearClienteDto } from './dto/crear-cliente.dto';
import { ActualizarClienteDto } from './dto/actualizar-cliente.dto';
import { EmitirNotaVentaDto } from './dto/emitir-nota-venta.dto';
import { ActualizarDespachoDto } from './dto/actualizar-despacho.dto';

@Injectable()
export class SalesService {
  private readonly registrador = new Logger(SalesService.name);

  constructor(private readonly prisma: ServicioPrisma) {}

  // ==========================================
  // 1. CATÁLOGO DE CLIENTES (HU08)
  // ==========================================

  /**
   * Crea un nuevo cliente en el directorio comercial verificando que el RUT no esté duplicado.
   */
  async crearCliente(dto: CrearClienteDto) {
    const rutLimpio = dto.rutCliente.trim();

    const existeRut = await this.prisma.cliente.findUnique({
      where: { rutCliente: rutLimpio },
    });

    if (existeRut) {
      throw new ConflictException(
        `Ya existe un cliente registrado con el RUT ${rutLimpio} (${existeRut.razonSocial}).`,
      );
    }

    const cliente = await this.prisma.cliente.create({
      data: {
        rutCliente: rutLimpio,
        razonSocial: dto.razonSocial.trim(),
        contactoNombre: dto.contactoNombre?.trim() || null,
        telefono: dto.telefono?.trim() || null,
        email: dto.email?.trim().toLowerCase() || null,
        direccion: dto.direccion?.trim() || null,
      },
    });

    this.registrador.log(
      `Cliente creado exitosamente: ID ${cliente.idCliente} - ${cliente.razonSocial} (${cliente.rutCliente})`,
    );

    return cliente;
  }

  /**
   * Lista todos los clientes con opción de búsqueda y resumen de compras.
   */
  async listarClientes(busqueda?: string) {
    const filtro = busqueda?.trim()
      ? {
          OR: [
            { rutCliente: { contains: busqueda.trim(), mode: 'insensitive' as const } },
            { razonSocial: { contains: busqueda.trim(), mode: 'insensitive' as const } },
            { contactoNombre: { contains: busqueda.trim(), mode: 'insensitive' as const } },
          ],
        }
      : {};

    const clientes = await this.prisma.cliente.findMany({
      where: filtro,
      orderBy: { razonSocial: 'asc' },
      include: {
        _count: {
          select: { ventas: true },
        },
      },
    });

    return clientes.map((c) => ({
      idCliente: c.idCliente,
      rutCliente: c.rutCliente,
      razonSocial: c.razonSocial,
      contactoNombre: c.contactoNombre,
      telefono: c.telefono,
      email: c.email,
      direccion: c.direccion,
      totalNotasVenta: c._count.ventas,
    }));
  }

  /**
   * Obtiene un cliente por su ID junto a sus últimas notas de venta asociadas.
   */
  async obtenerClientePorId(idCliente: number) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { idCliente },
      include: {
        ventas: {
          orderBy: { fechaVenta: 'desc' },
          take: 10,
          select: {
            idVenta: true,
            numeroNotaVenta: true,
            fechaVenta: true,
            kilosVendidos: true,
            precioUnitarioVenta: true,
            montoTotalIngreso: true,
            margenBrutoOperativo: true,
            estadoDespacho: true,
          },
        },
        _count: {
          select: { ventas: true },
        },
      },
    });

    if (!cliente) {
      throw new NotFoundException(`El cliente con ID ${idCliente} no existe.`);
    }

    return {
      idCliente: cliente.idCliente,
      rutCliente: cliente.rutCliente,
      razonSocial: cliente.razonSocial,
      contactoNombre: cliente.contactoNombre,
      telefono: cliente.telefono,
      email: cliente.email,
      direccion: cliente.direccion,
      totalNotasVenta: cliente._count.ventas,
      ultimasVentas: cliente.ventas.map((v) => ({
        ...v,
        kilosVendidos: Number(v.kilosVendidos),
        precioUnitarioVenta: Number(v.precioUnitarioVenta),
        montoTotalIngreso: Number(v.montoTotalIngreso),
        margenBrutoOperativo: Number(v.margenBrutoOperativo),
      })),
    };
  }

  /**
   * Actualiza los datos de un cliente verificando unicidad de RUT si cambia.
   */
  async actualizarCliente(idCliente: number, dto: ActualizarClienteDto) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { idCliente },
    });

    if (!cliente) {
      throw new NotFoundException(`El cliente con ID ${idCliente} no existe.`);
    }

    if (dto.rutCliente && dto.rutCliente.trim() !== cliente.rutCliente) {
      const existeRut = await this.prisma.cliente.findUnique({
        where: { rutCliente: dto.rutCliente.trim() },
      });

      if (existeRut && existeRut.idCliente !== idCliente) {
        throw new ConflictException(
          `El RUT ${dto.rutCliente.trim()} ya pertenece a otro cliente (${existeRut.razonSocial}).`,
        );
      }
    }

    const clienteActualizado = await this.prisma.cliente.update({
      where: { idCliente },
      data: {
        ...(dto.rutCliente ? { rutCliente: dto.rutCliente.trim() } : {}),
        ...(dto.razonSocial ? { razonSocial: dto.razonSocial.trim() } : {}),
        ...(dto.contactoNombre !== undefined ? { contactoNombre: dto.contactoNombre?.trim() || null } : {}),
        ...(dto.telefono !== undefined ? { telefono: dto.telefono?.trim() || null } : {}),
        ...(dto.email !== undefined ? { email: dto.email?.trim().toLowerCase() || null } : {}),
        ...(dto.direccion !== undefined ? { direccion: dto.direccion?.trim() || null } : {}),
      },
    });

    this.registrador.log(`Cliente ID ${idCliente} actualizado con éxito.`);
    return clienteActualizado;
  }

  /**
   * Elimina un cliente sólo si no registra ventas históricas.
   */
  async eliminarCliente(idCliente: number) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { idCliente },
    });

    if (!cliente) {
      throw new NotFoundException(`El cliente con ID ${idCliente} no existe.`);
    }

    const totalVentas = await this.prisma.venta.count({
      where: { idCliente },
    });

    if (totalVentas > 0) {
      throw new BadRequestException(
        `No es posible eliminar al cliente "${cliente.razonSocial}" porque registra ${totalVentas} nota(s) de venta emitidas.`,
      );
    }

    await this.prisma.cliente.delete({
      where: { idCliente },
    });

    this.registrador.log(`Cliente ID ${idCliente} (${cliente.razonSocial}) eliminado.`);
    return {
      mensaje: `Cliente con ID ${idCliente} (${cliente.razonSocial}) eliminado correctamente.`,
    };
  }

  // ==========================================
  // 2. STOCK DISPONIBLE PARA VENTA (HU10)
  // ==========================================

  /**
   * Consulta los lotes de cosecha con stock disponible para comercialización,
   * cruzando nave, variedad, fecha de cosecha y costo de referencia $/Kg del ciclo.
   */
  async obtenerStockDisponibleParaVenta() {
    const cosechas = await this.prisma.cosecha.findMany({
      where: {
        kilosDisponiblesVenta: {
          gt: 0,
        },
      },
      include: {
        cicloCultivo: {
          include: {
            nave: {
              select: {
                idNave: true,
                codigoNave: true,
                nombre: true,
              },
            },
          },
        },
      },
      orderBy: { fechaCosecha: 'asc' }, // FEFO / FIFO agronómico
    });

    return cosechas.map((c) => {
      const ciclo = c.cicloCultivo;
      let costoReferenciaKg = Number(ciclo.costoUnitarioKg);
      const esCostoProvisorio = ciclo.estado !== EstadoCiclo.FINALIZADO;

      if (costoReferenciaKg <= 0) {
        const totalKg = Number(ciclo.totalKgCosechados);
        const costoAcumulado = Number(ciclo.costoTotalAcumulado);
        if (totalKg > 0 && costoAcumulado > 0) {
          costoReferenciaKg = Math.round((costoAcumulado / totalKg) * 100) / 100;
        } else {
          costoReferenciaKg = 0;
        }
      }

      return {
        idCosecha: c.idCosecha,
        fechaCosecha: c.fechaCosecha,
        calidadGrado: c.calidadGrado,
        kilosNetosTotales: Number(c.kilosNetos),
        kilosDisponiblesVenta: Number(c.kilosDisponiblesVenta),
        nave: ciclo.nave,
        ciclo: {
          idCiclo: ciclo.idCiclo,
          temporada: ciclo.temporada,
          variedad: ciclo.variedad,
          estado: ciclo.estado,
          costoUnitarioKg: Number(ciclo.costoUnitarioKg),
        },
        costoReferenciaKg,
        esCostoProvisorio,
      };
    });
  }

  // ==========================================
  // 3. EMISIÓN DE NOTAS DE VENTA Y MARGEN BRUTO (HU10)
  // ==========================================

  /**
   * Emite una Nota de Venta:
   * 1. Verifica existencia de cliente.
   * 2. Valida disponibilidad estricta de stock en lote de cosecha (HU10).
   * 3. Determina costo unitario de referencia $/Kg (real o provisorio).
   * 4. Calcula Monto Ingreso, Costo Total y Margen Bruto Operativo ($ y %).
   * 5. En transacción atómica: descuenta stock en cosecha, crea Venta y DetalleVenta.
   */
  async emitirNotaVenta(idUsuarioVendedor: number, dto: EmitirNotaVentaDto) {
    // 1. Validar cliente
    const cliente = await this.prisma.cliente.findUnique({
      where: { idCliente: dto.idCliente },
    });

    if (!cliente) {
      throw new NotFoundException(`El cliente con ID ${dto.idCliente} no existe.`);
    }

    // 2. Validar lote de cosecha
    const cosecha = await this.prisma.cosecha.findUnique({
      where: { idCosecha: dto.idCosecha },
      include: {
        cicloCultivo: {
          include: {
            nave: {
              select: { codigoNave: true, nombre: true },
            },
          },
        },
      },
    });

    if (!cosecha) {
      throw new NotFoundException(`El lote de cosecha con ID ${dto.idCosecha} no existe.`);
    }

    // 3. Verificación de stock disponible (Regla de Negocio HU10)
    const stockDisponible = Number(cosecha.kilosDisponiblesVenta);
    if (dto.kilosVendidos > stockDisponible) {
      throw new BadRequestException(
        `Stock insuficiente en el lote #${dto.idCosecha} (${cosecha.cicloCultivo.variedad}). ` +
          `Disponible: ${stockDisponible.toFixed(2)} Kg, Solicitado: ${dto.kilosVendidos.toFixed(2)} Kg.`,
      );
    }

    // 4. Determinar costo unitario de referencia $/Kg
    const ciclo = cosecha.cicloCultivo;
    let costoUnitarioRef = Number(ciclo.costoUnitarioKg);
    const esCostoProvisorio = ciclo.estado !== EstadoCiclo.FINALIZADO;

    if (costoUnitarioRef <= 0) {
      const totalKg = Number(ciclo.totalKgCosechados);
      const costoAcumulado = Number(ciclo.costoTotalAcumulado);
      if (totalKg > 0 && costoAcumulado > 0) {
        costoUnitarioRef = Math.round((costoAcumulado / totalKg) * 100) / 100;
      } else {
        costoUnitarioRef = 0;
      }
    }

    // 5. Cálculos financieros y Margen Bruto Operativo
    const montoTotalIngreso = Math.round(dto.kilosVendidos * dto.precioUnitarioVenta * 100) / 100;
    const costoTotalVenta = Math.round(dto.kilosVendidos * costoUnitarioRef * 100) / 100;
    const margenBrutoOperativo = Math.round((montoTotalIngreso - costoTotalVenta) * 100) / 100;
    const porcentajeMargenBruto =
      montoTotalIngreso > 0
        ? Math.round((margenBrutoOperativo / montoTotalIngreso) * 10000) / 100
        : 0;

    // 6. Generar o validar número de nota de venta
    let numeroNotaVenta = dto.numeroNotaVenta?.trim();
    if (numeroNotaVenta) {
      const existeNV = await this.prisma.venta.findUnique({
        where: { numeroNotaVenta },
      });
      if (existeNV) {
        throw new ConflictException(
          `El número de nota de venta "${numeroNotaVenta}" ya está en uso.`,
        );
      }
    } else {
      const anioActual = new Date().getFullYear();
      const correlativo = (await this.prisma.venta.count()) + 1;
      numeroNotaVenta = `NV-${anioActual}-${String(correlativo).padStart(4, '0')}`;
    }

    const fechaVenta = dto.fechaVenta ? new Date(dto.fechaVenta) : new Date();

    // 7. Transacción Atómica
    const transaccion = await this.prisma.$transaction(async (tx) => {
      // a. Descontar stock disponible en lote de cosecha
      const cosechaActualizada = await tx.cosecha.update({
        where: { idCosecha: dto.idCosecha },
        data: {
          kilosDisponiblesVenta: {
            decrement: dto.kilosVendidos,
          },
        },
      });

      // b. Crear cabecera de Venta
      const nuevaVenta = await tx.venta.create({
        data: {
          idCliente: dto.idCliente,
          idCosecha: dto.idCosecha,
          idUsuarioVendedor,
          numeroNotaVenta,
          fechaVenta,
          kilosVendidos: dto.kilosVendidos,
          precioUnitarioVenta: dto.precioUnitarioVenta,
          montoTotalIngreso,
          costoUnitarioCicloRef: costoUnitarioRef,
          margenBrutoOperativo,
          estadoDespacho: dto.estadoDespacho ?? EstadoDespacho.PENDIENTE,
        },
      });

      // c. Crear línea en DetalleVenta
      const detalle = await tx.detalleVenta.create({
        data: {
          idVenta: nuevaVenta.idVenta,
          idCosecha: dto.idCosecha,
          kilosVendidos: dto.kilosVendidos,
          precioUnitarioVenta: dto.precioUnitarioVenta,
          costoUnitarioRef,
          esCostoProvisorio,
          margenBruto: margenBrutoOperativo,
        },
      });

      return {
        venta: nuevaVenta,
        detalle,
        stockRemanente: Number(cosechaActualizada.kilosDisponiblesVenta),
      };
    });

    this.registrador.log(
      `Nota de Venta emitida: ${numeroNotaVenta} | Cliente: ${cliente.razonSocial} | ` +
        `Kilos: ${dto.kilosVendidos} Kg | Total: $${montoTotalIngreso.toLocaleString('es-CL')} | ` +
        `Margen Bruto: $${margenBrutoOperativo.toLocaleString('es-CL')} (${porcentajeMargenBruto}%)`,
    );

    return {
      idVenta: transaccion.venta.idVenta,
      numeroNotaVenta: transaccion.venta.numeroNotaVenta,
      fechaVenta: transaccion.venta.fechaVenta,
      estadoDespacho: transaccion.venta.estadoDespacho,
      cliente: {
        idCliente: cliente.idCliente,
        rutCliente: cliente.rutCliente,
        razonSocial: cliente.razonSocial,
      },
      cosecha: {
        idCosecha: cosecha.idCosecha,
        variedad: ciclo.variedad,
        temporada: ciclo.temporada,
        nave: ciclo.nave.nombre,
        calidadGrado: cosecha.calidadGrado,
      },
      desgloseEconomico: {
        kilosVendidos: dto.kilosVendidos,
        precioUnitarioVenta: dto.precioUnitarioVenta,
        montoTotalIngreso,
        costoUnitarioCicloRef: costoUnitarioRef,
        costoTotalVenta,
        esCostoProvisorio,
        margenBrutoOperativo,
        porcentajeMargenBruto,
      },
      stockRemanenteLoteKg: transaccion.stockRemanente,
      detalle: transaccion.detalle,
    };
  }

  /**
   * Lista notas de venta con filtros y cálculos económicos.
   */
  async listarVentas(filtros?: {
    idCliente?: number;
    estadoDespacho?: EstadoDespacho;
    fechaDesde?: string;
    fechaHasta?: string;
  }) {
    const where: any = {};

    if (filtros?.idCliente) {
      where.idCliente = filtros.idCliente;
    }

    if (filtros?.estadoDespacho) {
      where.estadoDespacho = filtros.estadoDespacho;
    }

    if (filtros?.fechaDesde || filtros?.fechaHasta) {
      where.fechaVenta = {};
      if (filtros.fechaDesde) {
        where.fechaVenta.gte = new Date(filtros.fechaDesde);
      }
      if (filtros.fechaHasta) {
        where.fechaVenta.lte = new Date(filtros.fechaHasta);
      }
    }

    const ventas = await this.prisma.venta.findMany({
      where,
      orderBy: [{ fechaVenta: 'desc' }, { idVenta: 'desc' }],
      include: {
        cliente: {
          select: {
            idCliente: true,
            rutCliente: true,
            razonSocial: true,
            telefono: true,
          },
        },
        usuarioVendedor: {
          select: {
            idUsuario: true,
            nombreCompleto: true,
            email: true,
          },
        },
        cosecha: {
          select: {
            idCosecha: true,
            calidadGrado: true,
            fechaCosecha: true,
            cicloCultivo: {
              select: {
                idCiclo: true,
                variedad: true,
                temporada: true,
                nave: {
                  select: { codigoNave: true, nombre: true },
                },
              },
            },
          },
        },
      },
    });

    return ventas.map((v) => {
      const kilosVendidos = Number(v.kilosVendidos);
      const precioUnitario = Number(v.precioUnitarioVenta);
      const montoTotal = Number(v.montoTotalIngreso);
      const costoUnitarioRef = Number(v.costoUnitarioCicloRef);
      const costoTotal = Math.round(kilosVendidos * costoUnitarioRef * 100) / 100;
      const margenBruto = Number(v.margenBrutoOperativo);
      const porcentajeMargen =
        montoTotal > 0 ? Math.round((margenBruto / montoTotal) * 10000) / 100 : 0;

      return {
        idVenta: v.idVenta,
        numeroNotaVenta: v.numeroNotaVenta,
        fechaVenta: v.fechaVenta,
        estadoDespacho: v.estadoDespacho,
        cliente: v.cliente,
        vendedor: v.usuarioVendedor,
        loteCosecha: v.cosecha
          ? {
              idCosecha: v.cosecha.idCosecha,
              calidadGrado: v.cosecha.calidadGrado,
              variedad: v.cosecha.cicloCultivo.variedad,
              nave: v.cosecha.cicloCultivo.nave.nombre,
            }
          : null,
        kilosVendidos,
        precioUnitarioVenta: precioUnitario,
        montoTotalIngreso: montoTotal,
        costoUnitarioCicloRef: costoUnitarioRef,
        costoTotalVenta: costoTotal,
        margenBrutoOperativo: margenBruto,
        porcentajeMargenBruto: porcentajeMargen,
      };
    });
  }

  /**
   * Obtiene el detalle exhaustivo de una nota de venta por ID.
   */
  async obtenerVentaPorId(idVenta: number) {
    const venta = await this.prisma.venta.findUnique({
      where: { idVenta },
      include: {
        cliente: true,
        usuarioVendedor: {
          select: {
            idUsuario: true,
            nombreCompleto: true,
            email: true,
            rol: true,
          },
        },
        cosecha: {
          include: {
            cicloCultivo: {
              include: {
                nave: true,
              },
            },
          },
        },
        detallesVenta: true,
      },
    });

    if (!venta) {
      throw new NotFoundException(`La nota de venta con ID ${idVenta} no existe.`);
    }

    const kilosVendidos = Number(venta.kilosVendidos);
    const montoTotal = Number(venta.montoTotalIngreso);
    const margenBruto = Number(venta.margenBrutoOperativo);
    const costoUnitarioRef = Number(venta.costoUnitarioCicloRef);
    const costoTotal = Math.round(kilosVendidos * costoUnitarioRef * 100) / 100;
    const porcentajeMargen =
      montoTotal > 0 ? Math.round((margenBruto / montoTotal) * 10000) / 100 : 0;

    return {
      idVenta: venta.idVenta,
      numeroNotaVenta: venta.numeroNotaVenta,
      fechaVenta: venta.fechaVenta,
      estadoDespacho: venta.estadoDespacho,
      cliente: venta.cliente,
      vendedor: venta.usuarioVendedor,
      cosecha: venta.cosecha
        ? {
            idCosecha: venta.cosecha.idCosecha,
            fechaCosecha: venta.cosecha.fechaCosecha,
            calidadGrado: venta.cosecha.calidadGrado,
            kilosNetos: Number(venta.cosecha.kilosNetos),
            kilosDisponiblesVenta: Number(venta.cosecha.kilosDisponiblesVenta),
            nave: venta.cosecha.cicloCultivo.nave.nombre,
            variedad: venta.cosecha.cicloCultivo.variedad,
            temporada: venta.cosecha.cicloCultivo.temporada,
            estadoCiclo: venta.cosecha.cicloCultivo.estado,
          }
        : null,
      economicos: {
        kilosVendidos,
        precioUnitarioVenta: Number(venta.precioUnitarioVenta),
        montoTotalIngreso: montoTotal,
        costoUnitarioCicloRef: costoUnitarioRef,
        costoTotalVenta: costoTotal,
        margenBrutoOperativo: margenBruto,
        porcentajeMargenBruto: porcentajeMargen,
      },
      detalles: venta.detallesVenta.map((d) => ({
        idDetalle: d.idDetalle,
        idCosecha: d.idCosecha,
        kilosVendidos: Number(d.kilosVendidos),
        precioUnitarioVenta: Number(d.precioUnitarioVenta),
        costoUnitarioRef: Number(d.costoUnitarioRef),
        esCostoProvisorio: d.esCostoProvisorio,
        margenBruto: Number(d.margenBruto),
      })),
    };
  }

  /**
   * Actualiza el estado de despacho de una nota de venta (PENDIENTE -> DESPACHADO -> ENTREGADO).
   */
  async actualizarEstadoDespacho(idVenta: number, dto: ActualizarDespachoDto) {
    const venta = await this.prisma.venta.findUnique({
      where: { idVenta },
    });

    if (!venta) {
      throw new NotFoundException(`La nota de venta con ID ${idVenta} no existe.`);
    }

    const ventaActualizada = await this.prisma.venta.update({
      where: { idVenta },
      data: {
        estadoDespacho: dto.estadoDespacho,
      },
    });

    this.registrador.log(
      `Nota de Venta #${venta.numeroNotaVenta} actualizada a estado de despacho: ${dto.estadoDespacho}`,
    );

    return {
      idVenta: ventaActualizada.idVenta,
      numeroNotaVenta: ventaActualizada.numeroNotaVenta,
      estadoAnterior: venta.estadoDespacho,
      nuevoEstadoDespacho: ventaActualizada.estadoDespacho,
      mensaje: `Estado de despacho actualizado a ${dto.estadoDespacho}.`,
    };
  }

  // ==========================================
  // 4. MÉTRICAS Y KPIS DE RENTABILIDAD COMERCIAL
  // ==========================================

  /**
   * Genera el consolidado ejecutivo de ventas: ingresos totales, margen bruto global,
   * desglose por estado de despacho y ranking de clientes.
   */
  async obtenerMetricasVentas() {
    const ventas = await this.prisma.venta.findMany({
      include: {
        cliente: {
          select: { idCliente: true, razonSocial: true, rutCliente: true },
        },
      },
    });

    const totalVentas = ventas.length;
    let totalKilosVendidos = 0;
    let totalIngresos = 0;
    let totalMargenBruto = 0;

    const estados = {
      [EstadoDespacho.PENDIENTE]: 0,
      [EstadoDespacho.DESPACHADO]: 0,
      [EstadoDespacho.ENTREGADO]: 0,
    };

    const clientesMap = new Map<
      number,
      { idCliente: number; razonSocial: string; rutCliente: string; totalComprado: number; kilos: number; notasVenta: number }
    >();

    for (const v of ventas) {
      const kg = Number(v.kilosVendidos);
      const ingreso = Number(v.montoTotalIngreso);
      const margen = Number(v.margenBrutoOperativo);

      totalKilosVendidos += kg;
      totalIngresos += ingreso;
      totalMargenBruto += margen;

      estados[v.estadoDespacho] = (estados[v.estadoDespacho] || 0) + 1;

      const cli = v.cliente;
      if (cli) {
        const item = clientesMap.get(cli.idCliente) || {
          idCliente: cli.idCliente,
          razonSocial: cli.razonSocial,
          rutCliente: cli.rutCliente,
          totalComprado: 0,
          kilos: 0,
          notasVenta: 0,
        };
        item.totalComprado += ingreso;
        item.kilos += kg;
        item.notasVenta += 1;
        clientesMap.set(cli.idCliente, item);
      }
    }

    const margenBrutoPromedioPorcentaje =
      totalIngresos > 0
        ? Math.round((totalMargenBruto / totalIngresos) * 10000) / 100
        : 0;

    const topClientes = Array.from(clientesMap.values())
      .sort((a, b) => b.totalComprado - a.totalComprado)
      .slice(0, 5)
      .map((c) => ({
        ...c,
        totalComprado: Math.round(c.totalComprado * 100) / 100,
        kilos: Math.round(c.kilos * 100) / 100,
      }));

    return {
      resumenGlobal: {
        totalNotasVenta: totalVentas,
        totalKilosVendidos: Math.round(totalKilosVendidos * 100) / 100,
        totalIngresosCLP: Math.round(totalIngresos * 100) / 100,
        totalMargenBrutoCLP: Math.round(totalMargenBruto * 100) / 100,
        margenBrutoPromedioPorcentaje,
      },
      despachoPorEstado: estados,
      topClientes,
    };
  }
}
