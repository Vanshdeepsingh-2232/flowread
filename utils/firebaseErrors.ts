export const isPermissionDeniedError = (error: unknown): boolean => {
    const code = typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: unknown }).code)
        : '';

    const message = typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message?: unknown }).message)
        : '';

    return code === 'permission-denied'
        || code === 'firestore/permission-denied'
        || message.toLowerCase().includes('permission-denied')
        || message.toLowerCase().includes('insufficient permissions');
};
