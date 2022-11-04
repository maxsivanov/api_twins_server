export interface AppError extends Error {
    status: number;
}

export function errorStatus(text: string, status = 400) {
    const err = new Error(text) as AppError;
    err.status = status;
    return err;
}
