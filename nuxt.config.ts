// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/ui', '@nuxt/image', 'nuxt-auth-utils'],
  css: ['~/assets/css/main.css'],
  compatibilityDate: '2025-01-01',
  nitro: { preset: 'vercel' },
  runtimeConfig: {
    databaseUrl: '',
    r2: { accountId: '', accessKeyId: '', secretAccessKey: '', bucket: '', publicUrl: '' },
    oauth: { google: { clientId: '', clientSecret: '' } },
    session: { password: '' },
    public: {},
  },
})
