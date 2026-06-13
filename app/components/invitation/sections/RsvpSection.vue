<script setup lang="ts">
import { ref, inject } from 'vue'
defineProps<{ content: { title: string } }>()

const guestbook = inject<any>('guestbook', ref([]))
const guestName = inject<string>('guestName', '')
// slug + guest code are provided by InvitationRoot (sections stay decoupled from routing).
const slug = inject<string>('slug', '')
const guest = inject<string>('guestCode', '') || undefined

const name = ref(guestName || '')
const attendance = ref<'yes' | 'no' | 'maybe'>('yes')
const message = ref('')
const submitting = ref(false)
const done = ref(false)
const error = ref('')

async function submit() {
  if (!name.value.trim() || submitting.value) return
  submitting.value = true
  error.value = ''
  try {
    const res = await $fetch<{ ok: boolean; entry: { name: string; message: string; attendance: string } }>(`/api/invitations/${slug}/rsvp`, {
      method: 'POST',
      body: { name: name.value.trim(), attendance: attendance.value, message: message.value, guest },
    })
    if (res?.entry && (res.entry.message ?? '').trim()) guestbook.value.unshift(res.entry)
    done.value = true
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Gagal mengirim'
  } finally {
    submitting.value = false
  }
}
</script>
<template>
  <section class="px-6 py-12">
    <h2 class="text-center text-xl" style="font-family: var(--font-heading)">{{ content.title }}</h2>
    <p v-if="done" class="mx-auto mt-4 max-w-md text-center text-sm" style="color: var(--color-primary)">Terima kasih atas konfirmasi & doanya 🙏</p>
    <form v-else class="mx-auto mt-4 max-w-md space-y-3" @submit.prevent="submit">
      <input v-model="name" placeholder="Nama" class="w-full rounded border p-2" />
      <select v-model="attendance" class="w-full rounded border p-2">
        <option value="yes">Hadir</option>
        <option value="no">Tidak Hadir</option>
        <option value="maybe">Mungkin</option>
      </select>
      <textarea v-model="message" placeholder="Ucapan & Doa" class="w-full rounded border p-2" />
      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
      <button type="submit" :disabled="submitting" class="w-full rounded p-2 text-white" style="background: var(--color-primary)">{{ submitting ? 'Mengirim…' : 'Kirim' }}</button>
    </form>
  </section>
</template>
