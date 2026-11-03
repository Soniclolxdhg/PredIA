export const configuracionApp = () => ({
  puerto: parseInt(process.env.PORT || '3000', 10),
  urlBaseDatos: process.env.DATABASE_URL,
  jwt: {
    claveSecreta: process.env.JWT_SECRET || 'clave-secreta-predia-2026',
    expiracion: process.env.JWT_EXPIRATION || '24h',
  },
  clima: {
    urlBase: process.env.WEATHER_API_BASE_URL || 'https://api.open-meteo.com/v1',
  },
});
