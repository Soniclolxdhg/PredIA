import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  CategoriaInsumo,
  TipoMovimientoBodega,
  TipoAlerta,
  EstadoAlerta,
  EstadoCiclo,
} from '@prisma/client';
import { ServicioPrisma } from '../../common/prisma/prisma.service';
import { CrearInsumoDto } from './dto/crear-insumo.dto';
import { ActualizarInsumoDto } from './dto/actualizar-insumo.dto';
import { RegistrarMovimientoDto } from './dto/registrar-movimiento.dto';

@Injectable()
export class InventoryService {
  private readonly registrador = new Logger(InventoryService.name);

  constructor(private readonly prisma: ServicioPrisma) {}

  // ==========================================
  // 1. CATÁLOGO DE INSUMOS
  // ==========================================

  async listarInsumos(categoria?: CategoriaInsumo, soloStockBajo?: boolean) {
    const insumos = await this.prisma.insumo.findMany({
      where: {
        ...(categoria ? { categoria } : {}),
      },
      orderBy: { nombre: 'asc' },
      include: {
        alertas: {
          where: { estado: EstadoAlerta.ABIERTA },
          select: { idAlerta: true, mensaje: true, fechaEmision: true },
        },
        _count: {
          select: { movimientosBodega: true },
        },
      },
    });

    const resultado = insumos.map((insumo) => {
      const stockActual = Number(insumo.stockActual);
      const stockMinimo = Number(insumo.stockMinimoAlerta);
      const esStockCritico = stockActual <= stockMinimo;

      return {
        ...insumo,
        stockActual,
        stockMinimoAlerta: stockMinimo,
        costoUnitarioPromedio: Number(insumo.costoUnitarioPromedio),
        esStockCritico,
      };
    });

    if (soloStockBajo) {
      return resultado.filter((i) => i.esStockCritico);
    }

    return resultado;
  }

  async obtenerInsumoPorId(idInsumo: number) {
    const insumo = await this.prisma.insumo.findUnique({
      where: { idInsumo },
      include: {
        movimientosBodega: {
          take: 10,
          orderBy: { fechaMovimiento: 'desc' },
          include: {
            usuario: {
              select: { idUsuario: true, nombreCompleto: true, email: true },
            },
          },
        },
        alertas: {
          where: { estado: EstadoAlerta.ABIERTA },
          orderBy: { fechaEmision: 'desc' },
        },
      },
    });

    if (!insumo) {
      throw new NotFoundException(`El insumo con ID ${idInsumo} no existe.`);
    }

    const stockActual = Number(insumo.stockActual);
    const stockMinimo = Number(insumo.stockMinimoAlerta);

    return {
      ...insumo,
      stockActual,
      stockMinimoAlerta: stockMinimo,
      costoUnitarioPromedio: Number(insumo.costoUnitarioPromedio),
      esStockCritico: stockActual <= stockMinimo,
    };
  }

  async crearInsumo(dto: CrearInsumoDto) {
    const existente = await this.prisma.insumo.findUnique({
      where: { codigoInsumo: dto.codigoInsumo },
    });

    if (existente) {
      throw new ConflictException(
        `El código de insumo '${dto.codigoInsumo}' ya se encuentra registrado.`,
      );
    }

    const esMaterialVegetal =
      dto.esMaterialVegetal ??
      (dto.categoria === CategoriaInsumo.SEMILLA || dto.categoria === CategoriaInsumo.ALMACIGO);

    return this.prisma.insumo.create({
      data: {
        codigoInsumo: dto.codigoInsumo,
        nombre: dto.nombre,
        categoria: dto.categoria,
        unidadMedida: dto.unidadMedida,
        stockMinimoAlerta: dto.stockMinimoAlerta,
        stockActual: dto.stockInicial ?? 0,
        costoUnitarioPromedio: dto.costoUnitarioInicial ?? 0,
        esMaterialVegetal,
      },
    });
  }

  async actualizarInsumo(idInsumo: number, dto: ActualizarInsumoDto) {
    await this.obtenerInsumoPorId(idInsumo);

    return this.prisma.insumo.update({
      where: { idInsumo },
      data: {
        nombre: dto.nombre,
        categoria: dto.categoria,
        unidadMedida: dto.unidadMedida,
        stockMinimoAlerta: dto.stockMinimoAlerta,
        esMaterialVegetal: dto.esMaterialVegetal,
      },
    });
  }

  // ==========================================
  // 2. KARDEX Y CONTROL DE MERMAS (HU04 & HU05)
  // ==========================================

  /**
   * Registra un movimiento en Kardex con cálculo de Merma en material biológico,
   * actualización de Costo Promedio Ponderado (PMP) y disparo automático de alertas críticas.
   */
  async registrarMovimiento(idUsuario: number, dto: RegistrarMovimientoDto) {
    return this.prisma.$transaction(async (tx) => {
      const insumo = await tx.insumo.findUnique({
        where: { idInsumo: dto.idInsumo },
      });

      if (!insumo) {
        throw new NotFoundException(`El insumo con ID ${dto.idInsumo} no existe.`);
      }

      const cantidadNominal = dto.cantidadNominal;
      const porcentajeMerma = dto.porcentajeMerma ?? 0;
      let cantidadNeta = cantidadNominal;
      let costoUnitario = dto.costoUnitarioCompra ?? Number(insumo.costoUnitarioPromedio);
      let montoTotal = 0;
      let nuevoStock = Number(insumo.stockActual);
      let nuevoCostoPromedio = Number(insumo.costoUnitarioPromedio);

      const fechaMov = dto.fechaMovimiento ? new Date(dto.fechaMovimiento) : new Date();

      switch (dto.tipoMovimiento) {
        case TipoMovimientoBodega.ENTRADA_COMPRA: {
          // Fórmula oficial de merma biológica (semillas/almácigos)
          if (porcentajeMerma > 0) {
            cantidadNeta = Number((cantidadNominal * (1 - porcentajeMerma / 100)).toFixed(2));
          } else {
            cantidadNeta = cantidadNominal;
          }

          costoUnitario = dto.costoUnitarioCompra ?? Number(insumo.costoUnitarioPromedio);
          montoTotal = Number((cantidadNominal * costoUnitario).toFixed(2));

          // Recálculo de Costo Promedio Ponderado (PMP)
          const stockAnterior = Number(insumo.stockActual);
          const costoAnterior = Number(insumo.costoUnitarioPromedio);
          nuevoStock = Number((stockAnterior + cantidadNeta).toFixed(2));

          if (nuevoStock > 0) {
            nuevoCostoPromedio = Number(
              (((stockAnterior * costoAnterior) + montoTotal) / nuevoStock).toFixed(2),
            );
          } else {
            nuevoCostoPromedio = costoUnitario;
          }

          // Si el nuevo stock supera el mínimo de seguridad, atendemos alertas de quiebre previas
          if (nuevoStock > Number(insumo.stockMinimoAlerta)) {
            await tx.alerta.updateMany({
              where: {
                idInsumo: insumo.idInsumo,
                tipoAlerta: TipoAlerta.STOCK_MINIMO,
                estado: EstadoAlerta.ABIERTA,
              },
              data: { estado: EstadoAlerta.ATENDIDA },
            });
          }
          break;
        }

        case TipoMovimientoBodega.SALIDA_LABOR: {
          cantidadNeta = cantidadNominal;
          costoUnitario = Number(insumo.costoUnitarioPromedio);
          montoTotal = Number((cantidadNeta * costoUnitario).toFixed(2));

          // Validación estricta de stock disponible
          if (Number(insumo.stockActual) < cantidadNeta) {
            throw new BadRequestException(
              `Stock insuficiente para el insumo '${insumo.nombre}'. Disponible: ${insumo.stockActual} ${insumo.unidadMedida}, Solicitado: ${cantidadNeta}.`,
            );
          }

          // Validación de labor receptora si se provee
          if (dto.idLabor) {
            const labor = await tx.laborAgricola.findUnique({
              where: { idLabor: dto.idLabor },
              include: { cicloCultivo: true },
            });

            if (!labor) {
              throw new NotFoundException(`La labor agrícola con ID ${dto.idLabor} no existe.`);
            }

            if (labor.cicloCultivo.estado !== EstadoCiclo.ACTIVO) {
              throw new BadRequestException('No se puede imputar insumos a un ciclo no activo.');
            }
          }

          nuevoStock = Number((Number(insumo.stockActual) - cantidadNeta).toFixed(2));

          // Disparo automático de Alerta de Stock Crítico (HU05)
          await this.evaluarAlertaStockCritico(tx, insumo, nuevoStock);
          break;
        }

        case TipoMovimientoBodega.AJUSTE_MERMA: {
          cantidadNeta = cantidadNominal;
          costoUnitario = Number(insumo.costoUnitarioPromedio);
          montoTotal = Number((cantidadNeta * costoUnitario).toFixed(2));

          if (Number(insumo.stockActual) < cantidadNeta) {
            throw new BadRequestException(
              `No se puede ajustar una merma superior al stock actual (${insumo.stockActual} ${insumo.unidadMedida}).`,
            );
          }

          nuevoStock = Number((Number(insumo.stockActual) - cantidadNeta).toFixed(2));

          // Disparo automático de Alerta de Stock Crítico (HU05)
          await this.evaluarAlertaStockCritico(tx, insumo, nuevoStock);
          break;
        }
      }

      // Actualizar stock y costo promedio en el Insumo
      await tx.insumo.update({
        where: { idInsumo: insumo.idInsumo },
        data: {
          stockActual: nuevoStock,
          costoUnitarioPromedio: nuevoCostoPromedio,
        },
      });

      // Crear el registro inmutable en el Kardex (MovimientoBodega)
      const movimiento = await tx.movimientoBodega.create({
        data: {
          idInsumo: insumo.idInsumo,
          idUsuario,
          idLabor: dto.idLabor,
          tipoMovimiento: dto.tipoMovimiento,
          fechaMovimiento: fechaMov,
          cantidadNominal,
          porcentajeMerma,
          cantidadNeta,
          costoUnitarioCompra: costoUnitario,
          montoTotalMovimiento: montoTotal,
          documentoReferencia: dto.documentoReferencia,
        },
        include: {
          insumo: {
            select: {
              codigoInsumo: true,
              nombre: true,
              unidadMedida: true,
            },
          },
          usuario: {
            select: {
              idUsuario: true,
              nombreCompleto: true,
              email: true,
            },
          },
          laborAgricola: {
            select: {
              idLabor: true,
              tipoLabor: true,
              cicloCultivo: {
                select: {
                  idCiclo: true,
                  temporada: true,
                  variedad: true,
                },
              },
            },
          },
        },
      });

      return {
        mensaje: 'Movimiento de bodega registrado exitosamente',
        movimiento,
        stockResultante: nuevoStock,
        costoPromedioResultante: nuevoCostoPromedio,
      };
    });
  }

  private async evaluarAlertaStockCritico(
    tx: any,
    insumo: { idInsumo: number; codigoInsumo: string; nombre: string; unidadMedida: string; stockMinimoAlerta: any },
    nuevoStock: number,
  ) {
    const umbralMinimo = Number(insumo.stockMinimoAlerta);

    if (nuevoStock <= umbralMinimo) {
      const alertaExistente = await tx.alerta.findFirst({
        where: {
          idInsumo: insumo.idInsumo,
          tipoAlerta: TipoAlerta.STOCK_MINIMO,
          estado: EstadoAlerta.ABIERTA,
        },
      });

      if (!alertaExistente) {
        await tx.alerta.create({
          data: {
            tipoAlerta: TipoAlerta.STOCK_MINIMO,
            idInsumo: insumo.idInsumo,
            mensaje: `Stock crítico: El insumo '${insumo.nombre}' (${insumo.codigoInsumo}) alcanzó ${nuevoStock} ${insumo.unidadMedida} (Umbral mínimo de seguridad: ${umbralMinimo} ${insumo.unidadMedida}).`,
            estado: EstadoAlerta.ABIERTA,
          },
        });
        this.registrador.warn(
          `Alerta automática generada para el insumo ${insumo.codigoInsumo}: stock actual ${nuevoStock} <= mínimo ${umbralMinimo}`,
        );
      }
    }
  }

  // ==========================================
  // 3. CONSULTA DE KARDEX GLOBAL
  // ==========================================

  async consultarKardex(idInsumo?: number, tipoMovimiento?: TipoMovimientoBodega) {
    return this.prisma.movimientoBodega.findMany({
      where: {
        ...(idInsumo ? { idInsumo } : {}),
        ...(tipoMovimiento ? { tipoMovimiento } : {}),
      },
      orderBy: { fechaMovimiento: 'desc' },
      include: {
        insumo: {
          select: {
            idInsumo: true,
            codigoInsumo: true,
            nombre: true,
            unidadMedida: true,
            categoria: true,
          },
        },
        usuario: {
          select: {
            idUsuario: true,
            nombreCompleto: true,
            email: true,
          },
        },
        laborAgricola: {
          select: {
            idLabor: true,
            tipoLabor: true,
            fechaEjecucion: true,
            cicloCultivo: {
              select: {
                idCiclo: true,
                temporada: true,
                variedad: true,
              },
            },
          },
        },
      },
    });
  }

  // ==========================================
  // 4. ALERTAS VISUALES DE STOCK CRÍTICO (HU05)
  // ==========================================

  async listarAlertas(estado?: EstadoAlerta) {
    return this.prisma.alerta.findMany({
      where: {
        ...(estado ? { estado } : {}),
        tipoAlerta: TipoAlerta.STOCK_MINIMO,
      },
      orderBy: { fechaEmision: 'desc' },
      include: {
        insumo: {
          select: {
            idInsumo: true,
            codigoInsumo: true,
            nombre: true,
            unidadMedida: true,
            stockActual: true,
            stockMinimoAlerta: true,
          },
        },
      },
    });
  }

  async atenderAlerta(idAlerta: number) {
    const alerta = await this.prisma.alerta.findUnique({
      where: { idAlerta },
    });

    if (!alerta) {
      throw new NotFoundException(`La alerta con ID ${idAlerta} no existe.`);
    }

    return this.prisma.alerta.update({
      where: { idAlerta },
      data: { estado: EstadoAlerta.ATENDIDA },
    });
  }
}

