
import { createError } from 'h3';

export class AppError extends Error {
    public readonly statusCode: number;
    public readonly statusMessage: string;
    public readonly data?: any;

    constructor(message: string, statusCode: number = 500, data?: any) {
        super(message);
        this.statusCode = statusCode;
        this.statusMessage = message;
        this.data = data;
        Object.setPrototypeOf(this, AppError.prototype);
    }

    /**
     * Converts to H3 compatible error
     */
    toH3Error() {
        return createError({
            statusCode: this.statusCode,
            statusMessage: this.statusMessage,
            data: this.data,
        });
    }

    static badRequest(message: string, data?: any) {
        return new AppError(message, 400, data);
    }

    static notFound(message: string = 'Resource not found') {
        return new AppError(message, 404);
    }

    static forbidden(message: string = 'Access denied') {
        return new AppError(message, 403);
    }

    static unauthorized(message: string = 'Unauthorized') {
        return new AppError(message, 401);
    }

    static internal(message: string = 'Internal server error') {
        return new AppError(message, 500);
    }
}
