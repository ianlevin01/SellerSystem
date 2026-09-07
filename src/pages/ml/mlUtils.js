// Funciones puras compartidas por los componentes de la sección Mercado Libre — separadas de
// mlShared.jsx/ImageOrderPicker.jsx porque el plugin de Fast Refresh de Vite no permite mezclar
// componentes con funciones sueltas en el mismo archivo (react-refresh/only-export-components).

// ML rechaza los atributos "number_unit" (LENGTH, WIDTH, HEIGHT, WEIGHT, MIN_RECOMMENDED_AGE,
// etc.) si el valor no trae una unidad ("50" no sirve, tiene que ser "50 cm") — como el
// vendedor solo tipea el número, se la agregamos automáticamente al armar el payload de
// publish(). Cada atributo tiene SU PROPIA unidad válida (cm, g, años...), que viaja desde ML
// en attr.defaultUnit (mlService.getCategoryAttributes) — este mapa es solo un respaldo por si
// ML no la informara para algún atributo puntual.
const NUMBER_UNIT_DEFAULTS = { LENGTH: "cm", WIDTH: "cm", HEIGHT: "cm", DEPTH: "cm", WEIGHT: "g" };

export function unitFor(attr) {
  return attr.defaultUnit || NUMBER_UNIT_DEFAULTS[attr.id] || "cm";
}

export function formatNumberUnitValue(attr, raw) {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return trimmed;
  if (/[a-zA-Zµ"]/.test(trimmed)) return trimmed; // ya trae una unidad tipeada
  return `${trimmed} ${unitFor(attr)}`;
}

// Un valor cargado en attrValues puede quedar inválido sin que se note en pantalla — por
// ejemplo, un <input type="number"> con un valor no numérico (una sugerencia de IA que no
// siguió la instrucción de omitir lo que no sabe) se pinta vacío en el navegador, pero React
// sigue teniendo ese valor viejo guardado hasta que algo lo pisa explícitamente. Se valida acá
// (mismo criterio que stripInvalidAttributeValues del lado del backend) antes de contarlo como
// "completo" — tanto para decidir qué mandarle a Mercado Libre como para el chequeo de
// "Faltan completar" de los atributos obligatorios.
export function isValidAttrValue(attr, rawValue) {
  const value = String(rawValue || "").trim();
  if (!value) return false;
  // "values" viene poblado en atributos que igual aceptan texto libre (ej. BRAND es "string"
  // con marcas comunes sugeridas, pero acepta cualquier texto — confirmado contra la API real:
  // su propio hint dice 'Genérica' como opción válida y no está en esa lista). Solo "list" es
  // un enum cerrado de verdad, donde SÍ hay que exigir un match exacto.
  if (attr.valueType === "list") return attr.values?.some(v => v.name === value) ?? false;
  if (attr.valueType === "number_unit") return /^\d/.test(value);
  return true;
}

// Imágenes del catálogo siempre cuentan (ya están subidas); las nuevas solo cuando terminaron
// de subirse con éxito (tienen .ref) — mientras suben o si fallaron, no cuentan todavía.
export function readyImageCount(imageOrder, newPictures) {
  return imageOrder.filter(item =>
    item.type === "existing" || newPictures.find(p => p.previewUrl === item.previewUrl)?.ref
  ).length;
}

// Umbral real de Mercado Libre Argentina a partir del cual el envío gratis deja de ser
// opcional y pasa a ser obligatorio para el vendedor (público en su centro de ayuda). Mercado
// Libre lo actualiza de tanto en tanto y no hay ningún endpoint que lo devuelva — no hay forma
// de leerlo de la API, así que este número hay que actualizarlo a mano cuando ML lo cambie.
// Compartido entre el wizard de publicación propia y el de catálogo (PriceStep.jsx) para que
// no queden dos copias del mismo número desincronizables.
export const FREE_SHIPPING_MANDATORY_THRESHOLD_MLA = 33000;
