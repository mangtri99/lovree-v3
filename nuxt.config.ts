// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxtjs/tailwindcss', '@nuxt/image', 'nuxt-auth-utils'],
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
