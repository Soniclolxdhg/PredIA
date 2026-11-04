-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('ADMINISTRADOR', 'AGRONOMO', 'BODEGUERO', 'GERENTE');

-- CreateEnum
CREATE TYPE "EstadoNave" AS ENUM ('DISPONIBLE', 'EN_CULTIVO', 'MANTENCION');

-- CreateEnum
CREATE TYPE "EstadoCiclo" AS ENUM ('ACTIVO', 'FINALIZADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "TipoLabor" AS ENUM ('SIEMBRA', 'RIEGO', 'FERTILIZACION', 'FITOSANITARIO', 'COSECHA');

-- CreateEnum
CREATE TYPE "CategoriaInsumo" AS ENUM ('SEMILLA', 'ALMACIGO', 'FERTILIZANTE', 'DESINFECTANTE', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoMovimientoBodega" AS ENUM ('ENTRADA_COMPRA', 'SALIDA_LABOR', 'AJUSTE_MERMA');

-- CreateEnum
CREATE TYPE "ModalidadPago" AS ENUM ('DIARIO', 'SEMANAL', 'QUINCENAL', 'MENSUAL');

-- CreateEnum
CREATE TYPE "CargoTrabajador" AS ENUM ('OPERARIO_CAMPO', 'COSECHADOR', 'CHOFER', 'MECANICO');

-- CreateEnum
CREATE TYPE "EstadoPago" AS ENUM ('PENDIENTE', 'PAGADO', 'CONCILIADO');

-- CreateEnum
CREATE TYPE "CalidadGrado" AS ENUM ('PRIMERA', 'SEGUNDA', 'DESCARTE');

-- CreateEnum
CREATE TYPE "EstadoDespacho" AS ENUM ('PENDIENTE', 'DESPACHADO', 'ENTREGADO');

-- CreateEnum
CREATE TYPE "TipoAlerta" AS ENUM ('STOCK_MINIMO', 'HELADA');

-- CreateEnum
CREATE TYPE "EstadoAlerta" AS ENUM ('ABIERTA', 'ATENDIDA');

-- CreateEnum
CREATE TYPE "NivelRiesgoClimatico" AS ENUM ('BAJO', 'MEDIO', 'ALTO');

-- CreateTable
CREATE TABLE "usuarios" (
    "id_usuario" SERIAL NOT NULL,
    "nombre_completo" VARCHAR(100) NOT NULL,
    "rut" VARCHAR(12) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "hash_password" VARCHAR(255) NOT NULL,
    "rol" "RolUsuario" NOT NULL DEFAULT 'AGRONOMO',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id_usuario")
);

-- CreateTable
CREATE TABLE "auditorias" (
    "id_auditoria" BIGSERIAL NOT NULL,
    "id_usuario" INTEGER,
    "entidad" VARCHAR(40) NOT NULL,
    "id_registro" INTEGER NOT NULL,
    "accion" VARCHAR(10) NOT NULL,
    "valores_previos" JSONB,
    "fecha_evento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditorias_pkey" PRIMARY KEY ("id_auditoria")
);

-- CreateTable
CREATE TABLE "naves" (
    "id_nave" SERIAL NOT NULL,
    "codigo_nave" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(50) NOT NULL,
    "superficie_m2" DECIMAL(8,2) NOT NULL,
    "tipo_estructura" VARCHAR(50),
    "estado" "EstadoNave" NOT NULL DEFAULT 'DISPONIBLE',

    CONSTRAINT "naves_pkey" PRIMARY KEY ("id_nave")
);

-- CreateTable
CREATE TABLE "ciclos_cultivo" (
    "id_ciclo" SERIAL NOT NULL,
    "id_nave" INTEGER NOT NULL,
    "temporada" VARCHAR(20) NOT NULL,
    "variedad" VARCHAR(50) NOT NULL,
    "fecha_inicio" DATE NOT NULL,
    "fecha_termino_estimada" DATE,
    "fecha_cierre_real" DATE,
    "estado" "EstadoCiclo" NOT NULL DEFAULT 'ACTIVO',
    "total_kg_cosechados" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "costo_total_acumulado" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "costo_unitario_kg" DECIMAL(12,2) NOT NULL DEFAULT 0,

    CONSTRAINT "ciclos_cultivo_pkey" PRIMARY KEY ("id_ciclo")
);

-- CreateTable
CREATE TABLE "labores_agricolas" (
    "id_labor" SERIAL NOT NULL,
    "id_ciclo" INTEGER NOT NULL,
    "id_usuario_responsable" INTEGER NOT NULL,
    "tipo_labor" "TipoLabor" NOT NULL,
    "fecha_ejecucion" DATE NOT NULL,
    "horas_dedicadas" DECIMAL(5,2) NOT NULL,
    "observaciones_tecnicas" TEXT,
    "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "labores_agricolas_pkey" PRIMARY KEY ("id_labor")
);

-- CreateTable
CREATE TABLE "insumos" (
    "id_insumo" SERIAL NOT NULL,
    "codigo_insumo" VARCHAR(30) NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "categoria" "CategoriaInsumo" NOT NULL,
    "unidad_medida" VARCHAR(20) NOT NULL,
    "stock_actual" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "stock_minimo_alerta" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "costo_unitario_promedio" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "es_material_vegetal" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "insumos_pkey" PRIMARY KEY ("id_insumo")
);

-- CreateTable
CREATE TABLE "movimientos_bodega" (
    "id_movimiento" SERIAL NOT NULL,
    "id_insumo" INTEGER NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "id_labor" INTEGER,
    "tipo_movimiento" "TipoMovimientoBodega" NOT NULL,
    "fecha_movimiento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cantidad_nominal" DECIMAL(10,2) NOT NULL,
    "porcentaje_merma" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "cantidad_neta" DECIMAL(10,2) NOT NULL,
    "costo_unitario_compra" DECIMAL(12,2) NOT NULL,
    "monto_total_movimiento" DECIMAL(12,2) NOT NULL,
    "documento_referencia" VARCHAR(50),

    CONSTRAINT "movimientos_bodega_pkey" PRIMARY KEY ("id_movimiento")
);

-- CreateTable
CREATE TABLE "trabajadores" (
    "id_trabajador" SERIAL NOT NULL,
    "rut" VARCHAR(12) NOT NULL,
    "nombres" VARCHAR(60) NOT NULL,
    "apellidos" VARCHAR(60) NOT NULL,
    "cargo" "CargoTrabajador" NOT NULL,
    "modalidad_pago" "ModalidadPago" NOT NULL,
    "tarifa_base" DECIMAL(10,2) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "trabajadores_pkey" PRIMARY KEY ("id_trabajador")
);

-- CreateTable
CREATE TABLE "asistencias_jornal" (
    "id_asistencia" SERIAL NOT NULL,
    "id_trabajador" INTEGER NOT NULL,
    "id_ciclo" INTEGER NOT NULL,
    "id_labor" INTEGER,
    "fecha_jornada" DATE NOT NULL,
    "horas_trabajadas" DECIMAL(4,2) NOT NULL,
    "valor_hora_aplicado" DECIMAL(10,2) NOT NULL,
    "monto_devengado" DECIMAL(10,2) NOT NULL,
    "estado_pago" "EstadoPago" NOT NULL DEFAULT 'PENDIENTE',

    CONSTRAINT "asistencias_jornal_pkey" PRIMARY KEY ("id_asistencia")
);

-- CreateTable
CREATE TABLE "costos_indirectos" (
    "id_costo_indirecto" SERIAL NOT NULL,
    "id_ciclo" INTEGER NOT NULL,
    "tipo_gasto" VARCHAR(50) NOT NULL,
    "comprobante_factura" VARCHAR(50),
    "fecha_imputacion" DATE NOT NULL,
    "monto_total_prorrateado" DECIMAL(12,2) NOT NULL,
    "criterio_distribucion" VARCHAR(100) NOT NULL,
    "glosa_detalle" TEXT,

    CONSTRAINT "costos_indirectos_pkey" PRIMARY KEY ("id_costo_indirecto")
);

-- CreateTable
CREATE TABLE "cosechas" (
    "id_cosecha" SERIAL NOT NULL,
    "id_ciclo" INTEGER NOT NULL,
    "id_usuario_pesaje" INTEGER NOT NULL,
    "fecha_cosecha" DATE NOT NULL,
    "kilos_netos" DECIMAL(10,2) NOT NULL,
    "calidad_grado" "CalidadGrado" NOT NULL DEFAULT 'PRIMERA',
    "kilos_disponibles_venta" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "cosechas_pkey" PRIMARY KEY ("id_cosecha")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id_cliente" SERIAL NOT NULL,
    "rut_cliente" VARCHAR(12) NOT NULL,
    "razon_social" VARCHAR(120) NOT NULL,
    "contacto_nombre" VARCHAR(80),
    "telefono" VARCHAR(20),
    "email" VARCHAR(100),
    "direccion" VARCHAR(150),

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id_cliente")
);

-- CreateTable
CREATE TABLE "ventas" (
    "id_venta" SERIAL NOT NULL,
    "id_cliente" INTEGER NOT NULL,
    "id_cosecha" INTEGER,
    "id_usuario_vendedor" INTEGER NOT NULL,
    "numero_nota_venta" VARCHAR(30) NOT NULL,
    "fecha_venta" DATE NOT NULL,
    "kilos_vendidos" DECIMAL(10,2) NOT NULL,
    "precio_unitario_venta" DECIMAL(10,2) NOT NULL,
    "monto_total_ingreso" DECIMAL(12,2) NOT NULL,
    "costo_unitario_ciclo_ref" DECIMAL(12,2) NOT NULL,
    "margen_bruto_operativo" DECIMAL(12,2) NOT NULL,
    "estado_despacho" "EstadoDespacho" NOT NULL DEFAULT 'PENDIENTE',

    CONSTRAINT "ventas_pkey" PRIMARY KEY ("id_venta")
);

-- CreateTable
CREATE TABLE "detalles_venta" (
    "id_detalle" SERIAL NOT NULL,
    "id_venta" INTEGER NOT NULL,
    "id_cosecha" INTEGER NOT NULL,
    "kilos_vendidos" DECIMAL(10,2) NOT NULL,
    "precio_unitario_venta" DECIMAL(10,2) NOT NULL,
    "costo_unitario_ref" DECIMAL(12,2) NOT NULL,
    "es_costo_provisorio" BOOLEAN NOT NULL DEFAULT true,
    "margen_bruto" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "detalles_venta_pkey" PRIMARY KEY ("id_detalle")
);

-- CreateTable
CREATE TABLE "historico_clima" (
    "id_registro_clima" SERIAL NOT NULL,
    "fecha_pronostico" DATE NOT NULL,
    "temp_minima_c" DECIMAL(4,2) NOT NULL,
    "temp_maxima_c" DECIMAL(4,2) NOT NULL,
    "probabilidad_precipitacion_pct" DECIMAL(5,2) NOT NULL,
    "riesgo_helada" BOOLEAN NOT NULL DEFAULT false,
    "datos_meteorologicos_jsonb" JSONB NOT NULL,
    "fecha_sincronizacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historico_clima_pkey" PRIMARY KEY ("id_registro_clima")
);

-- CreateTable
CREATE TABLE "alertas" (
    "id_alerta" SERIAL NOT NULL,
    "tipo_alerta" "TipoAlerta" NOT NULL,
    "id_insumo" INTEGER,
    "id_registro_clima" INTEGER,
    "mensaje" VARCHAR(200) NOT NULL,
    "fecha_emision" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" "EstadoAlerta" NOT NULL DEFAULT 'ABIERTA',

    CONSTRAINT "alertas_pkey" PRIMARY KEY ("id_alerta")
);

-- CreateTable
CREATE TABLE "proyecciones_ciclo" (
    "id_proyeccion" SERIAL NOT NULL,
    "id_ciclo" INTEGER NOT NULL,
    "fecha_calculo" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rendimiento_kg_estimado" DECIMAL(10,2) NOT NULL,
    "costo_cierre_estimado" DECIMAL(12,2) NOT NULL,
    "nivel_riesgo_climatico" "NivelRiesgoClimatico" NOT NULL,
    "version_modelo" VARCHAR(20) NOT NULL,

    CONSTRAINT "proyecciones_ciclo_pkey" PRIMARY KEY ("id_proyeccion")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_rut_key" ON "usuarios"("rut");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "auditorias_id_usuario_idx" ON "auditorias"("id_usuario");

-- CreateIndex
CREATE INDEX "auditorias_entidad_idx" ON "auditorias"("entidad");

-- CreateIndex
CREATE INDEX "auditorias_fecha_evento_idx" ON "auditorias"("fecha_evento");

-- CreateIndex
CREATE UNIQUE INDEX "naves_codigo_nave_key" ON "naves"("codigo_nave");

-- CreateIndex
CREATE INDEX "ciclos_cultivo_id_nave_idx" ON "ciclos_cultivo"("id_nave");

-- CreateIndex
CREATE INDEX "ciclos_cultivo_estado_idx" ON "ciclos_cultivo"("estado");

-- CreateIndex
CREATE INDEX "labores_agricolas_id_ciclo_idx" ON "labores_agricolas"("id_ciclo");

-- CreateIndex
CREATE INDEX "labores_agricolas_id_usuario_responsable_idx" ON "labores_agricolas"("id_usuario_responsable");

-- CreateIndex
CREATE UNIQUE INDEX "insumos_codigo_insumo_key" ON "insumos"("codigo_insumo");

-- CreateIndex
CREATE INDEX "movimientos_bodega_id_insumo_idx" ON "movimientos_bodega"("id_insumo");

-- CreateIndex
CREATE INDEX "movimientos_bodega_id_usuario_idx" ON "movimientos_bodega"("id_usuario");

-- CreateIndex
CREATE INDEX "movimientos_bodega_id_labor_idx" ON "movimientos_bodega"("id_labor");

-- CreateIndex
CREATE UNIQUE INDEX "trabajadores_rut_key" ON "trabajadores"("rut");

-- CreateIndex
CREATE INDEX "asistencias_jornal_id_trabajador_idx" ON "asistencias_jornal"("id_trabajador");

-- CreateIndex
CREATE INDEX "asistencias_jornal_id_ciclo_idx" ON "asistencias_jornal"("id_ciclo");

-- CreateIndex
CREATE INDEX "costos_indirectos_id_ciclo_idx" ON "costos_indirectos"("id_ciclo");

-- CreateIndex
CREATE INDEX "cosechas_id_ciclo_idx" ON "cosechas"("id_ciclo");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_rut_cliente_key" ON "clientes"("rut_cliente");

-- CreateIndex
CREATE UNIQUE INDEX "ventas_numero_nota_venta_key" ON "ventas"("numero_nota_venta");

-- CreateIndex
CREATE INDEX "ventas_id_cliente_idx" ON "ventas"("id_cliente");

-- CreateIndex
CREATE INDEX "ventas_id_cosecha_idx" ON "ventas"("id_cosecha");

-- CreateIndex
CREATE INDEX "detalles_venta_id_venta_idx" ON "detalles_venta"("id_venta");

-- CreateIndex
CREATE INDEX "detalles_venta_id_cosecha_idx" ON "detalles_venta"("id_cosecha");

-- CreateIndex
CREATE UNIQUE INDEX "historico_clima_fecha_pronostico_key" ON "historico_clima"("fecha_pronostico");

-- CreateIndex
CREATE INDEX "historico_clima_fecha_pronostico_idx" ON "historico_clima"("fecha_pronostico");

-- CreateIndex
CREATE INDEX "alertas_id_insumo_idx" ON "alertas"("id_insumo");

-- CreateIndex
CREATE INDEX "alertas_id_registro_clima_idx" ON "alertas"("id_registro_clima");

-- CreateIndex
CREATE INDEX "proyecciones_ciclo_id_ciclo_idx" ON "proyecciones_ciclo"("id_ciclo");

-- AddForeignKey
ALTER TABLE "auditorias" ADD CONSTRAINT "auditorias_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ciclos_cultivo" ADD CONSTRAINT "ciclos_cultivo_id_nave_fkey" FOREIGN KEY ("id_nave") REFERENCES "naves"("id_nave") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "labores_agricolas" ADD CONSTRAINT "labores_agricolas_id_ciclo_fkey" FOREIGN KEY ("id_ciclo") REFERENCES "ciclos_cultivo"("id_ciclo") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "labores_agricolas" ADD CONSTRAINT "labores_agricolas_id_usuario_responsable_fkey" FOREIGN KEY ("id_usuario_responsable") REFERENCES "usuarios"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_bodega" ADD CONSTRAINT "movimientos_bodega_id_insumo_fkey" FOREIGN KEY ("id_insumo") REFERENCES "insumos"("id_insumo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_bodega" ADD CONSTRAINT "movimientos_bodega_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_bodega" ADD CONSTRAINT "movimientos_bodega_id_labor_fkey" FOREIGN KEY ("id_labor") REFERENCES "labores_agricolas"("id_labor") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asistencias_jornal" ADD CONSTRAINT "asistencias_jornal_id_trabajador_fkey" FOREIGN KEY ("id_trabajador") REFERENCES "trabajadores"("id_trabajador") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asistencias_jornal" ADD CONSTRAINT "asistencias_jornal_id_ciclo_fkey" FOREIGN KEY ("id_ciclo") REFERENCES "ciclos_cultivo"("id_ciclo") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asistencias_jornal" ADD CONSTRAINT "asistencias_jornal_id_labor_fkey" FOREIGN KEY ("id_labor") REFERENCES "labores_agricolas"("id_labor") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "costos_indirectos" ADD CONSTRAINT "costos_indirectos_id_ciclo_fkey" FOREIGN KEY ("id_ciclo") REFERENCES "ciclos_cultivo"("id_ciclo") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cosechas" ADD CONSTRAINT "cosechas_id_ciclo_fkey" FOREIGN KEY ("id_ciclo") REFERENCES "ciclos_cultivo"("id_ciclo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cosechas" ADD CONSTRAINT "cosechas_id_usuario_pesaje_fkey" FOREIGN KEY ("id_usuario_pesaje") REFERENCES "usuarios"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_id_cliente_fkey" FOREIGN KEY ("id_cliente") REFERENCES "clientes"("id_cliente") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_id_cosecha_fkey" FOREIGN KEY ("id_cosecha") REFERENCES "cosechas"("id_cosecha") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_id_usuario_vendedor_fkey" FOREIGN KEY ("id_usuario_vendedor") REFERENCES "usuarios"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalles_venta" ADD CONSTRAINT "detalles_venta_id_venta_fkey" FOREIGN KEY ("id_venta") REFERENCES "ventas"("id_venta") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalles_venta" ADD CONSTRAINT "detalles_venta_id_cosecha_fkey" FOREIGN KEY ("id_cosecha") REFERENCES "cosechas"("id_cosecha") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas" ADD CONSTRAINT "alertas_id_insumo_fkey" FOREIGN KEY ("id_insumo") REFERENCES "insumos"("id_insumo") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas" ADD CONSTRAINT "alertas_id_registro_clima_fkey" FOREIGN KEY ("id_registro_clima") REFERENCES "historico_clima"("id_registro_clima") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecciones_ciclo" ADD CONSTRAINT "proyecciones_ciclo_id_ciclo_fkey" FOREIGN KEY ("id_ciclo") REFERENCES "ciclos_cultivo"("id_ciclo") ON DELETE CASCADE ON UPDATE CASCADE;
