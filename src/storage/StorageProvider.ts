/**
 * StorageProvider — abstração mínima de persistência chave-valor.
 * A UI nunca acessa `localStorage` diretamente: tudo passa por aqui
 * (via `boardStorage` + stores). Um backend futuro pode implementar
 * esta mesma interface sem tocar nos componentes.
 */
export interface StorageProvider {
  readKey(key: string): string | null;
  writeKey(key: string, value: string): void;
  removeKey(key: string): void;
}
