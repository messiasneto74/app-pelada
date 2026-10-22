/** Corpo JSON padrão de erro HTTP (F0-3). */
export type ApiErrorBody = {
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
  timestamp: string;
};
