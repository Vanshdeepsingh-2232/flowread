const buildFirebaseHost = () => {
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;

    if (!projectId) {
        return null;
    }

    return `${projectId}.firebaseapp.com`;
};

const pickForwardHeaders = (headers) => {
    const blocked = new Set(['host', 'connection', 'content-length']);
    const forwarded = {};

    Object.entries(headers || {}).forEach(([key, value]) => {
        if (blocked.has(key.toLowerCase())) {
            return;
        }

        if (value !== undefined) {
            forwarded[key] = value;
        }
    });

    return forwarded;
};

export default async function handler(req, res) {
    const host = buildFirebaseHost();
    const route = req.query?.route;
    const path = req.query?.path || '';

    if (!host) {
        res.status(500).json({ message: 'Missing FIREBASE_PROJECT_ID or VITE_FIREBASE_PROJECT_ID for auth proxy.' });
        return;
    }

    if (route !== 'auth' && route !== 'firebase') {
        res.status(400).json({ message: 'Invalid Firebase proxy route.' });
        return;
    }

    const pathSegments = Array.isArray(path) ? path.join('/') : path;
    const query = new URLSearchParams(req.query || {});
    query.delete('route');
    query.delete('path');

    const upstreamUrl = `https://${host}/__/${route}/${pathSegments}${query.toString() ? `?${query.toString()}` : ''}`;

    const requestOptions = {
        method: req.method,
        headers: pickForwardHeaders(req.headers)
    };

    if (req.method !== 'GET' && req.method !== 'HEAD') {
        requestOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
    }

    try {
        const upstreamResponse = await fetch(upstreamUrl, requestOptions);
        const responseText = await upstreamResponse.text();

        res.status(upstreamResponse.status);

        const contentType = upstreamResponse.headers.get('content-type');
        if (contentType) {
            res.setHeader('content-type', contentType);
        }

        const cacheControl = upstreamResponse.headers.get('cache-control');
        if (cacheControl) {
            res.setHeader('cache-control', cacheControl);
        }

        const setCookie = upstreamResponse.headers.get('set-cookie');
        if (setCookie) {
            res.setHeader('set-cookie', setCookie);
        }

        res.send(responseText);
    } catch (error) {
        res.status(502).json({
            message: 'Failed to reach Firebase auth helper endpoint.',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
