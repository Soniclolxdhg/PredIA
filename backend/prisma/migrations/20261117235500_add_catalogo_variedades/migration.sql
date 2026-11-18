-- CreateTable
CREATE TABLE "catalogo_variedades" (
    "id_variedad" SERIAL NOT NULL,
    "nombre" VARCHAR(50) NOT NULL,
    "especie" VARCHAR(50),
    "descripcion" VARCHAR(200),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalogo_variedades_pkey" PRIMARY KEY ("id_variedad")
);

-- CreateIndex
CREATE UNIQUE INDEX "catalogo_variedades_nombre_key" ON "catalogo_variedades"("nombre");
