import { ref, inject } from 'vue'

export function useRsvpForm() {
  const guestbook = inject<any>('guestbook', ref([]))
  const guestName = inject<string>('guestName', '')
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

  return { name, attendance, message, submitting, done, error, submit }
}
