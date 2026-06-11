<script setup lang="ts">
defineProps<{ content: { title: string } }>()
</script>
<template>
  <section class="px-6 py-12">
    <h2 class="text-center text-xl" style="font-family: var(--font-heading)">{{ content.title }}</h2>
    <form class="mx-auto mt-4 max-w-md space-y-3" @submit.prevent>
      <input placeholder="Nama" class="w-full rounded border p-2" />
      <select class="w-full rounded border p-2">
        <option value="yes">Hadir</option>
        <option value="no">Tidak Hadir</option>
        <option value="maybe">Mungkin</option>
      </select>
      <textarea placeholder="Ucapan & Doa" class="w-full rounded border p-2" />
      <button type="submit" class="w-full rounded p-2 text-white" style="background: var(--color-primary)" disabled>Kirim (segera hadir)</button>
    </form>
  </section>
</template>
