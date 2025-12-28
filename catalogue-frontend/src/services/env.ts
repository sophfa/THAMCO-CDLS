type ApiUrlConfig = {
  dev?: string;
  test?: string;
  prod?: string;
};

export function resolveApiUrl({ dev, test, prod }: ApiUrlConfig): string {
  if (!import.meta.env.PROD) {
    return dev || "";
  }

  const deployEnv = import.meta.env.VITE_DEPLOY_ENV;
  if (deployEnv === "test") {
    return test || prod || dev || "";
  }

  return prod || test || dev || "";
}
