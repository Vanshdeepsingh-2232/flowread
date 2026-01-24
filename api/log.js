export default function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method === 'POST') {
        const { level, service, message, data, timestamp } = req.body;

        // Simple structured logging to stdout (Vercel captures this)
        const logEntry = JSON.stringify({
            severity: level,
            timestamp,
            service,
            message,
            data
        });

        // Use appropriate console method for Vercel logging levels
        if (level === 'ERROR') {
            console.error(logEntry);
        } else if (level === 'WARN') {
            console.warn(logEntry);
        } else {
            console.log(logEntry);
        }

        res.status(200).json({ status: 'ok' });
    } else {
        res.status(405).json({ message: 'Method Not Allowed' });
    }
}
