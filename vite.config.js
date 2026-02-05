import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src')
        }
    },
    server: {
        proxy: {
            '/auth/graphql': 'http://127.0.0.1:4000',
            '/invoicing/graphql': 'http://127.0.0.1:4000',
            '/inventory/graphql': 'http://127.0.0.1:4000',
            '/wealth/graphql': 'http://127.0.0.1:4000',
            '/graphql': 'http://127.0.0.1:4000'
        }
    }
}); 
