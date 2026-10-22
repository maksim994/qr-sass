import articles from "./blog-openapi.json" with { type: "json" };
import qr from "./qr-openapi.json" with { type: "json" };
// Preserve every Article API operation and security scheme in the combined document.
export const publicOpenApi = {
  ...articles,
  info: { ...articles.info, title: "QR-S API", version: "1.5.0", description: `${articles.info.description} QR API v1: qrs_api_ ключи, scopes qr:read/qr:write/stats:read, Бесплатный/Про/Бизнес с общими лимитами QR кабинета. Создание динамических URL; текст, Wi-Fi, телефон в модуле создаются статически локально.` },
  tags: [...articles.tags, { name: "QR", description: "Динамические QR, изображения и агрегированная статистика" }],
  paths: { ...articles.paths, ...qr.paths },
  components: { ...articles.components,
    schemas: { ...articles.components.schemas, ...qr.components.schemas },
    securitySchemes: { ...articles.components.securitySchemes, ...qr.components.securitySchemes },
  },
};
