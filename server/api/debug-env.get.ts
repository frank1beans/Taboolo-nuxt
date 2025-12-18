
export default defineEventHandler((_event) => {
    const config = useRuntimeConfig();
    return {
        pythonApiBaseUrl: config.pythonApiBaseUrl,
        publicApiBaseUrl: config.public?.apiBaseUrl,
    };
});
