/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_GOOGLE_API_KEY: string
    readonly VITE_GEMINI_API_KEY: string
    readonly VITE_FIREBASE_API_KEY: string
    readonly VITE_AI_PROVIDER: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
