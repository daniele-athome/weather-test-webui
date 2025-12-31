import { resolve } from 'path'

export default {
    base: './',
    root: resolve(__dirname),
    resolve: {
        alias: {
            '~bootstrap': resolve(__dirname, 'node_modules/bootstrap'),
            '~fontawesome': resolve(__dirname, 'node_modules/@fortawesome/fontawesome-free'),
        }
    },
    server: {
        port: 5173,
        hot: true
    },
}
