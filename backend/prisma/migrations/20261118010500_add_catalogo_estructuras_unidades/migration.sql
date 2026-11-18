-- CreateTable
CREATE TABLE "catalogo_estructuras" (
    "id_estructura" SERIAL NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(50) NOT NULL,
    "descripcion" VARCHAR(250),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalogo_estructuras_pkey" PRIMARY KEY ("id_estructura")
);

-- CreateTable
CREATE TABLE "catalogo_unidades" (
    "id_unidad" SERIAL NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(50) NOT NULL,
    "simbolo" VARCHAR(20) NOT NULL,
    "magnitud" VARCHAR(30) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalogo_unidades_pkey" PRIMARY KEY ("id_unidad")
);

-- CreateIndex
CREATE UNIQUE INDEX "catalogo_estructuras_codigo_key" ON "catalogo_estructuras"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "catalogo_estructuras_nombre_key" ON "catalogo_estructuras"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "catalogo_unidades_codigo_key" ON "catalogo_unidades"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "catalogo_unidades_nombre_key" ON "catalogo_unidades"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "catalogo_unidades_simbolo_key" ON "catalogo_unidades"("simbolo");
